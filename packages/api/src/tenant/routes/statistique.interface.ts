import { MemoStatus, MemoType, TimezoneConfigUtils } from '@toke/shared';
import { Op } from 'sequelize';

import Memos from '../class/Memos.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPE CENTRAL — Statut d'un jour employé
//
// Règle de priorité (immuable) :
//   SESSION EXISTE ?
//   ├── OUI + is_work_day = true  → 'present' | 'late'
//   ├── OUI + is_work_day = false → 'anomaly_off_day'  ← jamais ignoré
//   └── NON + is_work_day = true  → 'absent'
//       NON + is_work_day = false → 'off-day'
// ─────────────────────────────────────────────────────────────────────────────
export type DayStatus = 'present' | 'late' | 'absent' | 'off-day' | 'anomaly_off_day';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface EffectivePresence {
  total_work_hours: number;
  total_pause_hours: number;
  avg_daily_hours: number;
  /**
   * Ratio heures nettes travaillées / (jours_présents × 8h contrat)
   * Retourne null si totalPauseMinutes non collecté — afficher "—" en frontend.
   */
  net_work_ratio: number | null;
}

export interface TeamCoverage {
  timestamp: string;
  currently_present: number;
  currently_on_pause: number;
  expected_today: number;
  coverage_rate: number;
  missing_count: number;
}

export interface SessionAnalysis {
  total_sessions: number;
  avg_duration_hours: number;
  abnormal_sessions: AbnormalSession[];
}

export interface AbnormalSession {
  employee_guid: string;
  date: string;
  duration_hours: number;
  status: 'incomplete' | 'too_short' | 'too_long';
}

export interface JustificationStatus {
  total_absences: number;
  with_memo: number;
  without_memo: number;
  pending_validation: number;
  approved: number;
  rejected: number;
}

export interface ScheduleCompliance {
  total_clocked: number;
  on_time: number;
  late: number;
  on_time_rate: number;
  avg_deviation_minutes: number;
}

/**
 * KPI dédié aux présences hors planning.
 *
 * Un employé présent un jour OFF n'est ni une bonne présence, ni une absence.
 * Ce n'est pas un edge case — c'est une anomalie métier critique :
 *   - Heures supplémentaires non planifiées
 *   - Erreur de planning
 *   - Fraude / pointage falsifié
 *
 * Ce KPI est SÉPARÉ de attendance_rate intentionnellement :
 *   → Ne pas polluer le taux de présence normal
 *   → Exposer une action concrète au manager (review)
 *
 * Seuils : ok = 0 | warning = 1-2 | critical = 3+
 */
export interface UnexpectedPresence {
  total_anomaly_off_days: number;
  /**
   * total_anomaly_off_days / (total_days × team_size) × 100
   * Proportion des jours-OFF où quelqu'un était quand même présent.
   */
  unexpected_presence_rate: number;
  employees_concerned: number;
  /** Détail par occurrence — max 50 pour ne pas exploser le payload */
  occurrences: UnexpectedPresenceOccurrence[];
  status: 'ok' | 'warning' | 'critical';
  action: {
    type: 'review';
    label: string;
    deep_link: string;
    count: number;
  } | null;
}

export interface UnexpectedPresenceOccurrence {
  employee_guid: string;
  employee_name: string;
  date: string;
  clock_in_time: string;
  clock_out_time: string | null;
  work_hours: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSE
// ─────────────────────────────────────────────────────────────────────────────

export default class Statistique {
  // ───────────────────────────────────────────────────────────────────────────
  // KPI 1 — Présence effective
  // ───────────────────────────────────────────────────────────────────────────

  static calculateEffectivePresence(
    totalWorkHours: number,
    totalPauseMinutes: number | null,
    presentDays: number,
    lateDays: number,
  ): EffectivePresence {
    const workingDays = presentDays + lateDays;

    let net_work_ratio: number | null = null;
    let total_pause_hours = 0;

    if (totalPauseMinutes !== null) {
      total_pause_hours = totalPauseMinutes / 60;
      const netWorkHours = Math.max(0, totalWorkHours - total_pause_hours);
      net_work_ratio =
        workingDays > 0 ? parseFloat(((netWorkHours / (workingDays * 8)) * 100).toFixed(1)) : null;
    }

    return {
      total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
      total_pause_hours: parseFloat(total_pause_hours.toFixed(2)),
      avg_daily_hours: workingDays > 0 ? parseFloat((totalWorkHours / workingDays).toFixed(2)) : 0,
      net_work_ratio,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // KPI 2 — Couverture équipe temps réel
  // ───────────────────────────────────────────────────────────────────────────

  static calculateTeamCoverage(
    expectedToday: number,
    currentlyActive: number,
    currentlyOnPause: number,
  ): TeamCoverage {
    const coverageRate =
      expectedToday > 0 ? parseFloat(((currentlyActive / expectedToday) * 100).toFixed(1)) : 0;

    return {
      timestamp: TimezoneConfigUtils.getCurrentTime().toISOString(),
      currently_present: currentlyActive,
      currently_on_pause: currentlyOnPause,
      expected_today: expectedToday,
      coverage_rate: coverageRate,
      missing_count: Math.max(0, expectedToday - currentlyActive),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // KPI 3 — Analyse durée des sessions
  //
  // Les anomaly_off_day sont INCLUS : ils représentent du travail réel,
  // même hors planning. Ne pas les analyser serait ignorer des données critiques.
  // ───────────────────────────────────────────────────────────────────────────

  static analyzeSessionDurations(
    allDayData: Array<{
      employee_guid: string;
      date: string;
      status: DayStatus;
      clock_in_time: string | null;
      clock_out_time: string | null;
      work_hours: number | null;
    }>,
  ): SessionAnalysis {
    const result: SessionAnalysis = {
      total_sessions: 0,
      avg_duration_hours: 0,
      abnormal_sessions: [],
    };

    let totalDuration = 0;
    let completedCount = 0;

    for (const day of allDayData) {
      // present, late ET anomaly_off_day ont une session réelle
      const hasSession =
        day.status === 'present' || day.status === 'late' || day.status === 'anomaly_off_day';

      if (!hasSession) continue;

      result.total_sessions++;

      if (day.work_hours !== null && day.work_hours > 0) {
        completedCount++;
        totalDuration += day.work_hours;

        if (day.work_hours < 4) {
          result.abnormal_sessions.push({
            employee_guid: day.employee_guid,
            date: day.date,
            duration_hours: day.work_hours,
            status: 'too_short',
          });
        } else if (day.work_hours > 12) {
          result.abnormal_sessions.push({
            employee_guid: day.employee_guid,
            date: day.date,
            duration_hours: day.work_hours,
            status: 'too_long',
          });
        }
      } else if (day.clock_in_time && !day.clock_out_time) {
        result.abnormal_sessions.push({
          employee_guid: day.employee_guid,
          date: day.date,
          duration_hours: 0,
          status: 'incomplete',
        });
      }
    }

    result.avg_duration_hours =
      completedCount > 0 ? parseFloat((totalDuration / completedCount).toFixed(2)) : 0;

    return result;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // KPI 4 — Statut des justifications
  // ───────────────────────────────────────────────────────────────────────────

  static async analyzeJustifications(
    totalAbsences: number,
    teamMembers: number[],
    startOfPeriod: Date,
    endOfPeriod: Date,
  ): Promise<JustificationStatus> {
    const result: JustificationStatus = {
      total_absences: totalAbsences,
      with_memo: 0,
      without_memo: totalAbsences,
      pending_validation: 0,
      approved: 0,
      rejected: 0,
    };

    if (teamMembers.length === 0 || totalAbsences === 0) return result;

    try {
      const periodMemos = await Memos._list({
        target_user: { [Op.in]: teamMembers },
        incident_datetime: { [Op.between]: [startOfPeriod, endOfPeriod] },
        memo_type: MemoType.ABSENCE_JUSTIFICATION,
      });

      if (periodMemos && periodMemos.length > 0) {
        result.with_memo = periodMemos.length;
        for (const memo of periodMemos) {
          const status = memo.getMemoStatus();
          if (status === MemoStatus.PENDING) result.pending_validation++;
          else if (status === MemoStatus.APPROVED) result.approved++;
          else if (status === MemoStatus.REJECTED) result.rejected++;
        }
      }

      result.without_memo = Math.max(0, totalAbsences - result.with_memo);
    } catch (error) {
      console.error('[Statistique] analyzeJustifications error:', error);
    }

    return result;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // KPI 5 — Conformité aux horaires
  //
  // Les anomaly_off_day sont EXCLUS : pas d'horaire prévu, donc le concept
  // de conformité ne s'applique pas. Ils ont leur propre KPI (#6).
  // ───────────────────────────────────────────────────────────────────────────

  static calculateScheduleCompliance(
    allDayData: Array<{
      status: DayStatus;
      is_within_tolerance: boolean | null;
      delay_minutes: number | null;
    }>,
  ): ScheduleCompliance {
    const result: ScheduleCompliance = {
      total_clocked: 0,
      on_time: 0,
      late: 0,
      on_time_rate: 0,
      avg_deviation_minutes: 0,
    };

    let totalDeviation = 0;
    let deviationCount = 0;

    for (const day of allDayData) {
      // anomaly_off_day exclu intentionnellement
      if (day.status !== 'present' && day.status !== 'late') continue;

      result.total_clocked++;

      if (day.is_within_tolerance === true) result.on_time++;
      else if (day.is_within_tolerance === false) result.late++;

      if (day.delay_minutes && day.delay_minutes > 0) {
        totalDeviation += day.delay_minutes;
        deviationCount++;
      }
    }

    result.on_time_rate =
      result.total_clocked > 0
        ? parseFloat(((result.on_time / result.total_clocked) * 100).toFixed(1))
        : 0;

    result.avg_deviation_minutes =
      deviationCount > 0 ? parseFloat((totalDeviation / deviationCount).toFixed(1)) : 0;

    return result;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // KPI 6 — Présences hors planning (NOUVEAU)
  //
  // Règle d'or : un KPI sans action = un slogan.
  // Ce KPI expose TOUJOURS une action concrète si total > 0.
  //
  // Seuils business :
  //   ok       → 0 occurrence  (planning correct)
  //   warning  → 1-2 (à surveiller — peut être légitime)
  //   critical → 3+  (pattern suspect — action requise)
  // ───────────────────────────────────────────────────────────────────────────

  static calculateUnexpectedPresence(
    allDayData: Array<{
      employee_guid: string;
      employee_name: string;
      date: string;
      status: DayStatus;
      clock_in_time: string | null;
      clock_out_time: string | null;
      work_hours: number | null;
    }>,
    totalDaysInPeriod: number,
    teamSize: number,
  ): UnexpectedPresence {
    const occurrences: UnexpectedPresenceOccurrence[] = [];
    const employeesSet = new Set<string>();

    for (const day of allDayData) {
      if (day.status !== 'anomaly_off_day') continue;
      if (!day.clock_in_time) continue;

      employeesSet.add(day.employee_guid);

      if (occurrences.length < 50) {
        occurrences.push({
          employee_guid: day.employee_guid,
          employee_name: day.employee_name,
          date: day.date,
          clock_in_time: day.clock_in_time,
          clock_out_time: day.clock_out_time,
          work_hours: day.work_hours,
        });
      }
    }

    const total = occurrences.length;
    const concerned = employeesSet.size;

    // Dénominateur : jours-OFF théoriques (total_days × team_size)
    const totalPossibleOffDays = totalDaysInPeriod * teamSize;
    const rate =
      totalPossibleOffDays > 0 ? parseFloat(((total / totalPossibleOffDays) * 100).toFixed(2)) : 0;

    const status: UnexpectedPresence['status'] =
      total === 0 ? 'ok' : total <= 2 ? 'warning' : 'critical';

    return {
      total_anomaly_off_days: total,
      unexpected_presence_rate: rate,
      employees_concerned: concerned,
      occurrences,
      status,
      action:
        total > 0
          ? {
              type: 'review',
              label: `Examiner ${total} présence${total > 1 ? 's' : ''} hors planning`,
              deep_link: `/manager/anomalies?type=off_day_presence`,
              count: total,
            }
          : null,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UTILITAIRE — Enrichissement d'un jour individuel
  // ───────────────────────────────────────────────────────────────────────────

  static enrichDailyDetail(employeeDayData: any): any {
    return {
      date: employeeDayData.date,
      status: employeeDayData.status,
      clock_in_time: employeeDayData.clock_in_time ?? null,
      clock_out_time: employeeDayData.clock_out_time ?? null,
      expected_time: employeeDayData.expected_time ?? null,
      delay_minutes: employeeDayData.delay_minutes ?? null,
      tolerance_minutes: employeeDayData.tolerance_minutes ?? null,
      work_hours: employeeDayData.work_hours ?? null,
      is_within_tolerance: employeeDayData.is_within_tolerance ?? null,
    };
  }
}
