import { MemoStatus, MemoType, TimezoneConfigUtils } from '@toke/shared';
import { Op } from 'sequelize';

import Memos from '../class/Memos.js';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface EffectivePresence {
  total_work_hours: number;
  total_pause_hours: number;
  avg_daily_hours: number;
  /**
   * Ratio heures nettes travaillées / (jours_présents × 8h contrat)
   * Exprimé en %, ex: 94.5
   * REQUIERT totalPauseMinutes renseigné — sinon retourne null pour signaler
   * que la donnée est incomplète plutôt que de retourner 0 trompeur.
   */
  net_work_ratio: number | null;
}

export interface TeamCoverage {
  timestamp: string;
  currently_present: number;
  currently_on_pause: number;
  /** Employés attendus AUJOURD'HUI (jours de travail selon planning) */
  expected_today: number;
  /** currently_present / expected_today × 100 */
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

// ─────────────────────────────────────────────────────────────────────────────
// CLASSE
// ─────────────────────────────────────────────────────────────────────────────

export default class Statistique {
  // ───────────────────────────────────────────────────────────────────────────
  // KPI 1 — Présence effective
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Calcule la présence effective d'un employé sur la période.
   *
   * @param totalWorkHours    Heures brutes de travail (clock_in → clock_out)
   * @param totalPauseMinutes Temps de pause total en minutes.
   *                          Passer null si la donnée n'est pas disponible :
   *                          net_work_ratio sera null au lieu de 0.
   * @param presentDays       Jours présents à l'heure
   * @param lateDays          Jours présents en retard
   */
  static calculateEffectivePresence(
    totalWorkHours: number,
    totalPauseMinutes: number | null,
    presentDays: number,
    lateDays: number,
  ): EffectivePresence {
    const workingDays = presentDays + lateDays;

    // BUG CORRIGÉ : si totalPauseMinutes est null (non collecté), on ne ment
    // pas en retournant 0. On retourne null pour que le frontend affiche "—".
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

  /**
   * BUG CORRIGÉ : l'ancienne version comptait les employés avec
   * work_days_expected > 0 sur TOUTE la période, ce qui surestimait
   * expected_today (ex: un employé présent lundi mais absent vendredi était
   * quand même compté comme "attendu aujourd'hui").
   *
   * La nouvelle version reçoit directement expectedToday calculé dans la route
   * à partir du schedule du jour courant — source de vérité fiable.
   *
   * @param expectedToday     Nombre d'employés dont is_work_day = true AUJOURD'HUI
   * @param currentlyActive   Sessions actives (clock_out IS NULL) à l'instant T
   * @param currentlyOnPause  Parmi les actives, celles en pause
   */
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
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * BUG CORRIGÉ : l'ancienne version crashait silencieusement quand
   * emp.daily_details était undefined (cas exclude=daily_details).
   * On accepte maintenant un tableau de raw day-data pour éviter
   * cette dépendance fragile.
   *
   * @param allDayData  Tableau plat de { employee_guid, date, status,
   *                    clock_in_time, clock_out_time, work_hours }
   *                    Construit dans la route AVANT de tronquer daily_details.
   */
  static analyzeSessionDurations(
    allDayData: Array<{
      employee_guid: string;
      date: string;
      status: string;
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
      // On ne compte que les jours où l'employé était attendu et a pointé
      if (day.status !== 'present' && day.status !== 'late') continue;

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
        // Session ouverte — incomplète
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
      without_memo: totalAbsences, // valeur par défaut si requête échoue
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
      // On retourne le résultat partiel — ne pas faire crasher la route entière
    }

    return result;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // KPI 5 — Conformité aux horaires
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * BUG CORRIGÉ : même correction que analyzeSessionDurations —
   * on accepte le tableau plat au lieu de dépendre de emp.daily_details.
   */
  static calculateScheduleCompliance(
    allDayData: Array<{
      status: string;
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
  // UTILITAIRE — Enrichissement d'un jour individuel
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * BUG CORRIGÉ : la version précédente recalculait is_within_tolerance
   * depuis tolerance et delay_minutes qui étaient DÉJÀ disponibles dans
   * employeeDayData. On n'a pas besoin de re-passer expectedSchedule ici.
   *
   * Le seul ajout réel est de normaliser la structure de sortie.
   * Le calcul de is_within_tolerance doit être fait UNE SEULE FOIS
   * dans la boucle principale (voir la route corrigée).
   */
  static enrichDailyDetail(employeeDayData: any): any {
    const {
      status,
      delay_minutes,
      work_hours,
      expected_time,
      clock_in_time,
      clock_out_time,
      date,
      is_within_tolerance,
      tolerance_minutes,
    } = employeeDayData;

    return {
      date,
      status,
      clock_in_time: clock_in_time ?? null,
      clock_out_time: clock_out_time ?? null,
      expected_time: expected_time ?? null,
      delay_minutes: delay_minutes ?? null,
      tolerance_minutes: tolerance_minutes ?? null,
      work_hours: work_hours ?? null,
      is_within_tolerance: is_within_tolerance ?? null,
    };
  }
}

// import { MemoStatus, MemoType, TimezoneConfigUtils } from '@toke/shared';
// import { Op } from 'sequelize';
//
// import Memos from '../class/Memos.js';
//
// /**
//  * À ajouter dans l'objet employeeData (ligne ~250)
//  * Calcul du temps de présence effectif et des ratios
//  */
// export interface EffectivePresence {
//   total_work_hours: number;
//   total_pause_hours: number;
//   avg_daily_hours: number;
//   net_work_ratio: number;
// }
//
// /**
//  * À ajouter dans l'objet summary (ligne ~350)
//  * Montre combien d'employés présents vs attendu
//  */
// export interface TeamCoverage {
//   timestamp: string;
//   currently_present: number;
//   currently_on_pause: number;
//   expected_today: number;
//   coverage_rate: number;
//   missing_count: number;
// }
//
// /**
//  * À ajouter dans l'objet summary (après team_coverage)
//  * Détecte les sessions anormalement courtes ou longues
//  */
// export interface SessionAnalysis {
//   total_sessions: number;
//   avg_duration_hours: number;
//   abnormal_sessions: AbnormalSession[];
// }
//
// export interface AbnormalSession {
//   employee_guid: string;
//   date: string;
//   duration_hours: number;
//   status: 'incomplete' | 'too_short' | 'too_long';
// }
//
// /**
//  * À ajouter dans l'objet summary (après session_analysis)
//  * Compare absences avec mémos de justification
//  */
// export interface JustificationStatus {
//   total_absences: number;
//   with_memo: number;
//   without_memo: number;
//   pending_validation: number;
//   approved: number;
//   rejected: number;
// }
//
// /**
//  * À ajouter:
//  * 1. Dans daily_details: champ is_within_tolerance
//  * 2. Dans summary: schedule_compliance
//  */
// export interface ScheduleCompliance {
//   total_clocked: number;
//   on_time: number;
//   late: number;
//   on_time_rate: number;
//   avg_deviation_minutes: number;
// }
//
// export default class Statistique {
//   static calculateEffectivePresence(
//     totalWorkHours: number,
//     totalPauseMinutes: number,
//     presentDays: number,
//     lateDays: number,
//   ): EffectivePresence {
//     const totalPauseHours = totalPauseMinutes / 60;
//     const workingDays = presentDays + lateDays;
//
//     return {
//       total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
//       total_pause_hours: parseFloat(totalPauseHours.toFixed(2)),
//       avg_daily_hours: workingDays > 0 ? parseFloat((totalWorkHours / workingDays).toFixed(2)) : 0,
//       net_work_ratio:
//         workingDays > 0 ? parseFloat(((totalWorkHours / (workingDays * 8)) * 100).toFixed(1)) : 0,
//     };
//   }
//
//   static async calculateTeamCoverage(
//     employeesData: any[],
//     currentlyActive: number,
//     currentlyOnPause: number,
//   ): Promise<TeamCoverage> {
//     // Compter combien devrait être présent aujourd'hui
//     const expectedToday = employeesData.filter(
//       (emp) => emp.period_stats.work_days_expected > 0,
//     ).length;
//
//     const coverageRate =
//       expectedToday > 0 ? parseFloat(((currentlyActive / expectedToday) * 100).toFixed(1)) : 0;
//
//     const missingCount = Math.max(0, expectedToday - currentlyActive);
//
//     return {
//       timestamp: TimezoneConfigUtils.getCurrentTime().toISOString(),
//       currently_present: currentlyActive,
//       currently_on_pause: currentlyOnPause,
//       expected_today: expectedToday,
//       coverage_rate: coverageRate,
//       missing_count: missingCount,
//     };
//   }
//
//   static async analyzeSessionDurations(employeesData: any[]): Promise<SessionAnalysis> {
//     const sessionAnalysis: SessionAnalysis = {
//       total_sessions: 0,
//       avg_duration_hours: 0,
//       abnormal_sessions: [],
//     };
//
//     let totalDuration = 0;
//     let completedSessionsCount = 0;
//
//     for (const emp of employeesData) {
//       for (const day of emp.daily_details || []) {
//         // Compter toutes les sessions
//         if (day.work_hours !== null && day.work_hours !== undefined) {
//           sessionAnalysis.total_sessions++;
//           totalDuration += day.work_hours;
//
//           if (day.work_hours > 0) {
//             completedSessionsCount++;
//
//             // Détecter sessions trop courtes (<4h)
//             if (day.work_hours < 4) {
//               sessionAnalysis.abnormal_sessions.push({
//                 employee_guid: emp.employee.guid,
//                 date: day.date,
//                 duration_hours: day.work_hours,
//                 status: 'too_short',
//               });
//             }
//             // Détecter sessions trop longues (>12h)
//             else if (day.work_hours > 12) {
//               sessionAnalysis.abnormal_sessions.push({
//                 employee_guid: emp.employee.guid,
//                 date: day.date,
//                 duration_hours: day.work_hours,
//                 status: 'too_long',
//               });
//             }
//           }
//         }
//         // Détecter sessions non fermées (clock_in sans clock_out)
//         else if (day.clock_in_time && !day.clock_out_time) {
//           sessionAnalysis.abnormal_sessions.push({
//             employee_guid: emp.employee.guid,
//             date: day.date,
//             duration_hours: 0,
//             status: 'incomplete',
//           });
//         }
//       }
//     }
//
//     // Calculer moyenne
//     sessionAnalysis.avg_duration_hours =
//       completedSessionsCount > 0
//         ? parseFloat((totalDuration / completedSessionsCount).toFixed(2))
//         : 0;
//
//     return sessionAnalysis;
//   }
//
//   static async analyzeJustifications(
//     totalAbsences: number,
//     teamMembers: number[],
//     startOfPeriod: Date,
//     endOfPeriod: Date,
//   ): Promise<JustificationStatus> {
//     const justificationStatus: JustificationStatus = {
//       total_absences: totalAbsences,
//       with_memo: 0,
//       without_memo: 0,
//       pending_validation: 0,
//       approved: 0,
//       rejected: 0,
//     };
//
//     try {
//       // Récupérer tous les mémos d'absence de la période
//       const periodMemos = await Memos._list({
//         target_user: { [Op.in]: teamMembers },
//         incident_datetime: { [Op.between]: [startOfPeriod, endOfPeriod] },
//         memo_type: MemoType.ABSENCE_JUSTIFICATION,
//       });
//
//       if (periodMemos && periodMemos.length > 0) {
//         justificationStatus.with_memo = periodMemos.length;
//
//         // Compter par statut
//         for (const memo of periodMemos) {
//           const status = memo.getMemoStatus();
//
//           if (status === MemoStatus.PENDING) {
//             justificationStatus.pending_validation++;
//           } else if (status === MemoStatus.APPROVED) {
//             justificationStatus.approved++;
//           } else if (status === MemoStatus.REJECTED) {
//             justificationStatus.rejected++;
//           }
//         }
//       }
//
//       // Calculer absences non justifiées
//       justificationStatus.without_memo = totalAbsences - justificationStatus.with_memo;
//     } catch (error) {
//       console.error('Error analyzing justifications:', error);
//     }
//
//     return justificationStatus;
//   }
//
//   static calculateScheduleCompliance(employeesData: any[]): ScheduleCompliance {
//     const scheduleCompliance: ScheduleCompliance = {
//       total_clocked: 0,
//       on_time: 0,
//       late: 0,
//       on_time_rate: 0,
//       avg_deviation_minutes: 0,
//     };
//
//     let totalDeviation = 0;
//     let deviationCount = 0;
//
//     for (const emp of employeesData) {
//       for (const day of emp.daily_details || []) {
//         // Compter uniquement les jours où l'employé a pointé
//         if (day.status === 'present' || day.status === 'late') {
//           scheduleCompliance.total_clocked++;
//
//           // Utiliser le champ is_within_tolerance
//           if (day.is_within_tolerance === true) {
//             scheduleCompliance.on_time++;
//           } else if (day.is_within_tolerance === false) {
//             scheduleCompliance.late++;
//           }
//
//           // Calculer déviation moyenne
//           if (day.delay_minutes && day.delay_minutes > 0) {
//             totalDeviation += day.delay_minutes;
//             deviationCount++;
//           }
//         }
//       }
//     }
//
//     // Calculer taux de ponctualité
//     scheduleCompliance.on_time_rate =
//       scheduleCompliance.total_clocked > 0
//         ? parseFloat(
//             ((scheduleCompliance.on_time / scheduleCompliance.total_clocked) * 100).toFixed(1),
//           )
//         : 0;
//
//     // Calculer déviation moyenne
//     scheduleCompliance.avg_deviation_minutes =
//       deviationCount > 0 ? parseFloat((totalDeviation / deviationCount).toFixed(1)) : 0;
//
//     return scheduleCompliance;
//   }
//
//   /**
//    * À intégrer dans la boucle qui construit daily_details
//    * Ajoute le champ is_within_tolerance
//    */
//   static enrichDailyDetail(employeeDayData: any, expectedSchedule: any): any {
//     const { status, delay_minutes, work_hours, expected_time, ...rest } = employeeDayData;
//
//     // Calculer conformité horaire
//     let is_within_tolerance: boolean | null = null;
//
//     if (status === 'present' || status === 'late') {
//       const tolerance = expectedSchedule?.expected_blocks[0]?.tolerance || 0;
//       is_within_tolerance = delay_minutes ? delay_minutes <= tolerance : true;
//     }
//
//     return {
//       date: employeeDayData.date,
//       status,
//       ...rest,
//       delay_minutes,
//       work_hours,
//       is_within_tolerance, // 🆕 Nouveau champ
//     };
//   }
// }
