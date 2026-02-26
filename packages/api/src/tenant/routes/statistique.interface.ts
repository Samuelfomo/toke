import { MemoStatus, MemoType, TimezoneConfigUtils } from '@toke/shared';
import { Op } from 'sequelize';

import Memos from '../class/Memos.js';

/**
 * À ajouter dans l'objet employeeData (ligne ~250)
 * Calcul du temps de présence effectif et des ratios
 */
export interface EffectivePresence {
  total_work_hours: number;
  total_pause_hours: number;
  avg_daily_hours: number;
  net_work_ratio: number;
}

/**
 * À ajouter dans l'objet summary (ligne ~350)
 * Montre combien d'employés présents vs attendu
 */
export interface TeamCoverage {
  timestamp: string;
  currently_present: number;
  currently_on_pause: number;
  expected_today: number;
  coverage_rate: number;
  missing_count: number;
}

/**
 * À ajouter dans l'objet summary (après team_coverage)
 * Détecte les sessions anormalement courtes ou longues
 */
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

/**
 * À ajouter dans l'objet summary (après session_analysis)
 * Compare absences avec mémos de justification
 */
export interface JustificationStatus {
  total_absences: number;
  with_memo: number;
  without_memo: number;
  pending_validation: number;
  approved: number;
  rejected: number;
}

/**
 * À ajouter:
 * 1. Dans daily_details: champ is_within_tolerance
 * 2. Dans summary: schedule_compliance
 */
export interface ScheduleCompliance {
  total_clocked: number;
  on_time: number;
  late: number;
  on_time_rate: number;
  avg_deviation_minutes: number;
}

export default class Statistique {
  static calculateEffectivePresence(
    totalWorkHours: number,
    totalPauseMinutes: number,
    presentDays: number,
    lateDays: number,
  ): EffectivePresence {
    const totalPauseHours = totalPauseMinutes / 60;
    const workingDays = presentDays + lateDays;

    return {
      total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
      total_pause_hours: parseFloat(totalPauseHours.toFixed(2)),
      avg_daily_hours: workingDays > 0 ? parseFloat((totalWorkHours / workingDays).toFixed(2)) : 0,
      net_work_ratio:
        workingDays > 0 ? parseFloat(((totalWorkHours / (workingDays * 8)) * 100).toFixed(1)) : 0,
    };
  }

  static async calculateTeamCoverage(
    employeesData: any[],
    currentlyActive: number,
    currentlyOnPause: number,
  ): Promise<TeamCoverage> {
    // Compter combien devrait être présent aujourd'hui
    const expectedToday = employeesData.filter(
      (emp) => emp.period_stats.work_days_expected > 0,
    ).length;

    const coverageRate =
      expectedToday > 0 ? parseFloat(((currentlyActive / expectedToday) * 100).toFixed(1)) : 0;

    const missingCount = Math.max(0, expectedToday - currentlyActive);

    return {
      timestamp: TimezoneConfigUtils.getCurrentTime().toISOString(),
      currently_present: currentlyActive,
      currently_on_pause: currentlyOnPause,
      expected_today: expectedToday,
      coverage_rate: coverageRate,
      missing_count: missingCount,
    };
  }

  static async analyzeSessionDurations(employeesData: any[]): Promise<SessionAnalysis> {
    const sessionAnalysis: SessionAnalysis = {
      total_sessions: 0,
      avg_duration_hours: 0,
      abnormal_sessions: [],
    };

    let totalDuration = 0;
    let completedSessionsCount = 0;

    for (const emp of employeesData) {
      for (const day of emp.daily_details || []) {
        // Compter toutes les sessions
        if (day.work_hours !== null && day.work_hours !== undefined) {
          sessionAnalysis.total_sessions++;
          totalDuration += day.work_hours;

          if (day.work_hours > 0) {
            completedSessionsCount++;

            // Détecter sessions trop courtes (<4h)
            if (day.work_hours < 4) {
              sessionAnalysis.abnormal_sessions.push({
                employee_guid: emp.employee.guid,
                date: day.date,
                duration_hours: day.work_hours,
                status: 'too_short',
              });
            }
            // Détecter sessions trop longues (>12h)
            else if (day.work_hours > 12) {
              sessionAnalysis.abnormal_sessions.push({
                employee_guid: emp.employee.guid,
                date: day.date,
                duration_hours: day.work_hours,
                status: 'too_long',
              });
            }
          }
        }
        // Détecter sessions non fermées (clock_in sans clock_out)
        else if (day.clock_in_time && !day.clock_out_time) {
          sessionAnalysis.abnormal_sessions.push({
            employee_guid: emp.employee.guid,
            date: day.date,
            duration_hours: 0,
            status: 'incomplete',
          });
        }
      }
    }

    // Calculer moyenne
    sessionAnalysis.avg_duration_hours =
      completedSessionsCount > 0
        ? parseFloat((totalDuration / completedSessionsCount).toFixed(2))
        : 0;

    return sessionAnalysis;
  }

  static async analyzeJustifications(
    totalAbsences: number,
    teamMembers: number[],
    startOfPeriod: Date,
    endOfPeriod: Date,
  ): Promise<JustificationStatus> {
    const justificationStatus: JustificationStatus = {
      total_absences: totalAbsences,
      with_memo: 0,
      without_memo: 0,
      pending_validation: 0,
      approved: 0,
      rejected: 0,
    };

    try {
      // Récupérer tous les mémos d'absence de la période
      const periodMemos = await Memos._list({
        target_user: { [Op.in]: teamMembers },
        incident_datetime: { [Op.between]: [startOfPeriod, endOfPeriod] },
        memo_type: MemoType.ABSENCE_JUSTIFICATION,
      });

      if (periodMemos && periodMemos.length > 0) {
        justificationStatus.with_memo = periodMemos.length;

        // Compter par statut
        for (const memo of periodMemos) {
          const status = memo.getMemoStatus();

          if (status === MemoStatus.PENDING) {
            justificationStatus.pending_validation++;
          } else if (status === MemoStatus.APPROVED) {
            justificationStatus.approved++;
          } else if (status === MemoStatus.REJECTED) {
            justificationStatus.rejected++;
          }
        }
      }

      // Calculer absences non justifiées
      justificationStatus.without_memo = totalAbsences - justificationStatus.with_memo;
    } catch (error) {
      console.error('Error analyzing justifications:', error);
    }

    return justificationStatus;
  }

  static calculateScheduleCompliance(employeesData: any[]): ScheduleCompliance {
    const scheduleCompliance: ScheduleCompliance = {
      total_clocked: 0,
      on_time: 0,
      late: 0,
      on_time_rate: 0,
      avg_deviation_minutes: 0,
    };

    let totalDeviation = 0;
    let deviationCount = 0;

    for (const emp of employeesData) {
      for (const day of emp.daily_details || []) {
        // Compter uniquement les jours où l'employé a pointé
        if (day.status === 'present' || day.status === 'late') {
          scheduleCompliance.total_clocked++;

          // Utiliser le champ is_within_tolerance
          if (day.is_within_tolerance === true) {
            scheduleCompliance.on_time++;
          } else if (day.is_within_tolerance === false) {
            scheduleCompliance.late++;
          }

          // Calculer déviation moyenne
          if (day.delay_minutes && day.delay_minutes > 0) {
            totalDeviation += day.delay_minutes;
            deviationCount++;
          }
        }
      }
    }

    // Calculer taux de ponctualité
    scheduleCompliance.on_time_rate =
      scheduleCompliance.total_clocked > 0
        ? parseFloat(
            ((scheduleCompliance.on_time / scheduleCompliance.total_clocked) * 100).toFixed(1),
          )
        : 0;

    // Calculer déviation moyenne
    scheduleCompliance.avg_deviation_minutes =
      deviationCount > 0 ? parseFloat((totalDeviation / deviationCount).toFixed(1)) : 0;

    return scheduleCompliance;
  }

  /**
   * À intégrer dans la boucle qui construit daily_details
   * Ajoute le champ is_within_tolerance
   */
  static enrichDailyDetail(employeeDayData: any, expectedSchedule: any): any {
    const { status, delay_minutes, work_hours, expected_time, ...rest } = employeeDayData;

    // Calculer conformité horaire
    let is_within_tolerance: boolean | null = null;

    if (status === 'present' || status === 'late') {
      const tolerance = expectedSchedule?.expected_blocks[0]?.tolerance || 0;
      is_within_tolerance = delay_minutes ? delay_minutes <= tolerance : true;
    }

    return {
      date: employeeDayData.date,
      status,
      ...rest,
      delay_minutes,
      work_hours,
      is_within_tolerance, // 🆕 Nouveau champ
    };
  }
}
