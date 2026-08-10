import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  MemoStatus,
  SITES_ERRORS,
  TimezoneConfigUtils,
  USERS_CODES,
  USERS_ERRORS,
  UsersValidationUtils,
  WORK_SESSIONS_CODES,
  WORK_SESSIONS_ERRORS,
  WorkSessionsValidationUtils,
} from '@toke/shared';
import { Op } from 'sequelize';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import User from '../class/User.js';
import { responseValue } from '../../utils/response.model.js';
import OrgHierarchy from '../class/OrgHierarchy.js';
import WorkSessions from '../class/WorkSessions.js';
import Site from '../class/Site.js';
import ScheduleResolutionService from '../../tools/schedule.resolution.service.js';
import AnomalyDetectionService from '../../tools/anomaly.detection.service.js';
import Memos from '../class/Memos.js';
import { createAttendanceStatisticsController } from '../modules/attendance-statistics/http/attendance-statistics.controller.js';

import Statistique, { DayStatus } from './statistique.interface.js';

const router = Router();

const controller = createAttendanceStatisticsController();

/**
 * GET /attendance/statistics/overview
 *
 * Query :
 * - manager      : GUID obligatoire
 * - site         : GUID optionnel
 * - start_date   : YYYY-MM-DD, optionnel avec end_date
 * - end_date     : YYYY-MM-DD, optionnel avec start_date
 */
router.get('/overview', Ensure.get(), controller.overview);

/**
 * GET /api/users/attendance/stat
 *
 * Vue d'ensemble de la présence sur une période — v2.1
 *
 * CORRECTIONS v2.1 (anomaly_off_day) :
 *  6. La présence prime TOUJOURS sur le planning.
 *     is_work_day = false + session → 'anomaly_off_day' (jamais 'off-day' pur)
 *  7. Compteur anomaly_off_day dans daily_breakdown.
 *  8. KPI unexpected_presence dans summary (séparé de attendance_rate).
 *  9. allDayData enrichi de employee_name pour le KPI calcUnexpectedPresence.
 * 10. Employé individuel : anomaly_days comptabilisé dans period_stats.
 */
router.get('/attendance/stat', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, site, start_date, end_date, exclude } = req.query;

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 0 — PÉRIODE
    // ══════════════════════════════════════════════════════════════════════════

    let startOfPeriod: Date;
    let endOfPeriod: Date;

    if (typeof start_date === 'string' && UsersValidationUtils.isValidDate(start_date)) {
      startOfPeriod = new Date(start_date);
      startOfPeriod.setHours(0, 0, 0, 0);
    } else {
      startOfPeriod = TimezoneConfigUtils.getCurrentTime();
      startOfPeriod.setHours(0, 0, 0, 0);
    }

    if (typeof end_date === 'string' && UsersValidationUtils.isValidDate(end_date)) {
      endOfPeriod = new Date(end_date);
      endOfPeriod.setHours(23, 59, 59, 999);
    } else {
      endOfPeriod = new Date(startOfPeriod);
      endOfPeriod.setHours(23, 59, 59, 999);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 1 — SCOPE
    // ══════════════════════════════════════════════════════════════════════════

    if (!UsersValidationUtils.validateGuid(String(manager))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const managerObj = await User._load(String(manager), true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    const teamData = await OrgHierarchy.getAllTeamMembers(managerObj.getId()!);
    const teamMembers: number[] = teamData.all_employees_flat.map((u) => u.getId()!);

    // Map id → nom complet — utile pour UnexpectedPresence occurrences
    const employeeNameMap = new Map<number, string>();
    for (const u of teamData.all_employees_flat) {
      const name = `${u.getFirstName() ?? ''} ${u.getLastName() ?? ''}`.trim();
      employeeNameMap.set(u.getId()!, name);
    }

    let siteObj: Site | null = null;
    if (site) {
      if (!WorkSessionsValidationUtils.validateGuid(String(site))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: WORK_SESSIONS_CODES.INVALID_GUID,
          message: WORK_SESSIONS_ERRORS.GUID_INVALID,
        });
      }
      siteObj = await Site._load(String(site), true);
      if (!siteObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: WORK_SESSIONS_CODES.SITE_NOT_FOUND,
          message: SITES_ERRORS.NOT_FOUND,
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 2 — UNE SEULE REQUÊTE SESSIONS
    // ══════════════════════════════════════════════════════════════════════════

    const sessionConditions: Record<string, any> = {
      session_start_at: { [Op.between]: [startOfPeriod, endOfPeriod] },
    };
    if (teamMembers.length > 0) {
      sessionConditions.user = { [Op.in]: teamMembers };
    }
    if (siteObj) {
      sessionConditions.site = siteObj.getId();
    }

    const periodSessions = (await WorkSessions._list(sessionConditions)) ?? [];

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 3 — PRÉCHARGEMENT SCHEDULES (anti N+1)
    // ══════════════════════════════════════════════════════════════════════════

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const startDateCalc = new Date(startOfPeriod);
    startDateCalc.setHours(0, 0, 0, 0);
    const endDateCalc = new Date(endOfPeriod);
    endDateCalc.setHours(0, 0, 0, 0);
    const totalDays =
      Math.round((endDateCalc.getTime() - startDateCalc.getTime()) / MS_PER_DAY) + 1;

    const periodDates: Date[] = [];
    const cursor = new Date(startOfPeriod);
    cursor.setHours(12, 0, 0, 0);
    const periodEnd = new Date(endOfPeriod);
    periodEnd.setHours(12, 0, 0, 0);
    while (cursor <= periodEnd) {
      periodDates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    type ScheduleCache = Map<
      string,
      Awaited<ReturnType<typeof ScheduleResolutionService.getApplicableSchedule>>
    >;
    const scheduleCache = new Map<number, ScheduleCache>();

    await Promise.all(
      teamMembers.map(async (userId) => {
        const userCache: ScheduleCache = new Map();
        for (const d of periodDates) {
          const dateKey = d.toISOString().split('T')[0];
          const result = await ScheduleResolutionService.getApplicableSchedule(userId, d);
          userCache.set(dateKey, result);
        }
        scheduleCache.set(userId, userCache);
      }),
    );

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 4 — PRÉCHARGEMENT PAUSES
    // ══════════════════════════════════════════════════════════════════════════

    const sessionPauseMinutes = new Map<number, number>();
    await Promise.all(
      periodSessions.map(async (session) => {
        const pauseMin = await session.getTotalPauseTime();
        sessionPauseMinutes.set(session.getId()!, pauseMin);
      }),
    );

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 5 — DOUBLE BOUCLE JOUR × EMPLOYÉ
    //
    // RÈGLE CENTRALE (immuable) :
    //   La présence prime toujours sur le planning.
    //   if (session && !isWorkDay) → anomaly_off_day
    //   On ne doit JAMAIS ignorer une session existante.
    // ══════════════════════════════════════════════════════════════════════════

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyBreakdown: Array<any> = [];
    const dailyEmployeeData = new Map<string, Map<number, any>>();

    const allDayData: Array<{
      employee_guid: string;
      employee_name: string;
      date: string;
      status: DayStatus;
      clock_in_time: string | null;
      clock_out_time: string | null;
      work_hours: number | null;
      is_within_tolerance: boolean | null;
      delay_minutes: number | null;
    }> = [];

    for (const analysisDate of periodDates) {
      const dateKey = analysisDate.toISOString().split('T')[0];
      const dayStart = new Date(analysisDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(analysisDate);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = periodSessions.filter((s) => {
        const start = s.getSessionStartAt();
        return start && start >= dayStart && start <= dayEnd;
      });

      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      let offDayCount = 0;
      let anomalyOffCount = 0; // ← nouveau compteur

      const dayEmployeeAnalysis = new Map<number, any>();

      for (const userId of teamMembers) {
        const scheduleResult = scheduleCache.get(userId)?.get(dateKey);
        const expectedSchedule = scheduleResult?.applicable_schedule ?? null;
        const isWorkDay = expectedSchedule?.is_work_day ?? false;
        const userSession = daySessions.find((s) => s.getUser() === userId) ?? null;

        let status: DayStatus = 'absent';
        let delayMinutes = 0;
        let isWithinTolerance: boolean | null = null;
        let toleranceMinutes: number | null = null;
        let clockInTime: Date | null = null;
        let clockOutTime: Date | null = null;
        let workHours = 0;

        // ── RÈGLE PRIORITÉ : session avant planning ──────────────────────────
        if (userSession) {
          clockInTime = userSession.getSessionStartAt() ?? null;
          clockOutTime = userSession.getSessionEndAt() ?? null;

          const rawDuration = userSession.getTotalWorkDuration();
          if (rawDuration) {
            const matches = rawDuration.match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
            if (matches) {
              workHours = (parseInt(matches[1]) || 0) + (parseInt(matches[2]) || 0) / 60;
            }
          }

          if (!isWorkDay) {
            // ─── CAS CRITIQUE : présent un jour OFF ─────────────────────────
            status = 'anomaly_off_day';
            anomalyOffCount++;
            // Pas de calcul retard — il n'y a pas d'horaire prévu
            isWithinTolerance = null;
            toleranceMinutes = null;
          } else {
            // ─── Jour travaillé normal ───────────────────────────────────────
            if (expectedSchedule && expectedSchedule.expected_blocks.length > 0) {
              const firstBlock = expectedSchedule.expected_blocks[0];
              const expectedStartTime = firstBlock.work[0];
              toleranceMinutes = firstBlock.tolerance ?? 0;

              const clockedTime = AnomalyDetectionService.formatTime(clockInTime!);
              const clockedMin = ScheduleResolutionService.parseTimeToMinutes(clockedTime);
              const expectedMin = ScheduleResolutionService.parseTimeToMinutes(expectedStartTime);

              delayMinutes = clockedMin - expectedMin;
              isWithinTolerance = delayMinutes <= toleranceMinutes;

              if (delayMinutes > toleranceMinutes) {
                status = 'late';
                lateCount++;
              } else {
                status = 'present';
                presentCount++;
              }
            } else {
              status = 'present';
              isWithinTolerance = true;
              presentCount++;
            }
          }
        } else if (!isWorkDay) {
          // ─── Pas de session + jour OFF = off-day pur ──────────────────────
          status = 'off-day';
          offDayCount++;
        } else {
          // ─── Pas de session + jour travaillé = absent ─────────────────────
          status = 'absent';
          absentCount++;
        }

        const dayEntry = {
          status,
          clock_in_time: clockInTime ? clockInTime.toISOString() : null,
          clock_out_time: clockOutTime ? clockOutTime.toISOString() : null,
          expected_time: isWorkDay ? (expectedSchedule?.expected_blocks[0]?.work[0] ?? null) : null,
          delay_minutes: delayMinutes > 0 ? delayMinutes : null,
          tolerance_minutes: toleranceMinutes,
          work_hours: workHours > 0 ? workHours : null,
          is_within_tolerance: isWithinTolerance,
          date: dateKey,
        };
        dayEmployeeAnalysis.set(userId, dayEntry);

        const empName = employeeNameMap.get(userId) ?? '';
        const empGuid =
          teamData.all_employees_flat.find((u) => u.getId() === userId)?.getGuid() ?? '';

        allDayData.push({
          employee_guid: empGuid,
          employee_name: empName,
          date: dateKey,
          status,
          clock_in_time: dayEntry.clock_in_time,
          clock_out_time: dayEntry.clock_out_time,
          work_hours: workHours > 0 ? workHours : null,
          is_within_tolerance: isWithinTolerance,
          delay_minutes: delayMinutes > 0 ? delayMinutes : null,
        });
      }

      dailyEmployeeData.set(dateKey, dayEmployeeAnalysis);

      dailyBreakdown.push({
        date: dateKey,
        day_of_week: dayNames[analysisDate.getDay()],
        expected_count: teamMembers.length - offDayCount - anomalyOffCount,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        off_day: offDayCount,
        anomaly_off_day: anomalyOffCount, // ← visible dans le breakdown
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 6 — STATISTIQUES PAR EMPLOYÉ
    // ══════════════════════════════════════════════════════════════════════════

    const employeesData: Array<any> = [];

    for (const userId of teamMembers) {
      const employee = await User._load(userId);
      if (!employee) continue;

      let workDaysExpected = 0;
      let presentDays = 0;
      let lateDays = 0;
      let absentDays = 0;
      let offDays = 0;
      let anomalyDays = 0; // ← nouveau
      let totalDelayMinutes = 0;
      let maxDelayMinutes = 0;
      let totalWorkHours = 0;
      let totalPauseMinutes = 0;

      const userSessions = periodSessions.filter((s) => s.getUser() === userId);
      for (const session of userSessions) {
        totalPauseMinutes += sessionPauseMinutes.get(session.getId()!) ?? 0;
      }

      const dailyDetailsRaw: Array<any> = [];

      for (const [, dayData] of dailyEmployeeData.entries()) {
        const dayEntry = dayData.get(userId);
        if (!dayEntry) continue;

        const { status, delay_minutes } = dayEntry;

        if (status === 'present') {
          presentDays++;
          workDaysExpected++;
        } else if (status === 'late') {
          lateDays++;
          workDaysExpected++;
          if (delay_minutes) {
            totalDelayMinutes += delay_minutes;
            maxDelayMinutes = Math.max(maxDelayMinutes, delay_minutes);
          }
        } else if (status === 'absent') {
          absentDays++;
          workDaysExpected++;
        } else if (status === 'off-day') {
          offDays++;
        } else if (status === 'anomaly_off_day') {
          // Ne compte PAS dans workDaysExpected — pas un jour planifié
          anomalyDays++;
        }

        if (dayEntry.work_hours) totalWorkHours += dayEntry.work_hours;

        dailyDetailsRaw.push(Statistique.enrichDailyDetail(dayEntry));
      }

      const attendanceRate =
        workDaysExpected > 0 ? ((presentDays + lateDays) / workDaysExpected) * 100 : 0;

      const punctualityRate =
        presentDays + lateDays > 0 ? (presentDays / (presentDays + lateDays)) * 100 : 0;

      const averageDelayMinutes = lateDays > 0 ? totalDelayMinutes / lateDays : 0;

      const employeeData: any = {
        employee: await employee.toJSON(responseValue.MINIMAL),

        period_stats: {
          work_days_expected: workDaysExpected,
          present_days: presentDays,
          late_days: lateDays,
          absent_days: absentDays,
          off_days: offDays,
          anomaly_off_days: anomalyDays, // ← exposé
          total_delay_minutes: totalDelayMinutes,
          average_delay_minutes: parseFloat(averageDelayMinutes.toFixed(1)),
          max_delay_minutes: maxDelayMinutes,
          total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
          attendance_rate: parseFloat(attendanceRate.toFixed(2)),
          punctuality_rate: parseFloat(punctualityRate.toFixed(2)),
        },

        effective_presence: Statistique.calculateEffectivePresence(
          totalWorkHours,
          totalPauseMinutes > 0 ? totalPauseMinutes : null,
          presentDays,
          lateDays,
        ),
      };

      if (exclude !== 'daily_details') {
        employeeData.daily_details = dailyDetailsRaw;
      }

      employeesData.push(employeeData);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 7 — STATISTIQUES GLOBALES
    // ══════════════════════════════════════════════════════════════════════════

    let totalPresentOnTime = 0;
    let totalLateArrivals = 0;
    let totalAbsences = 0;
    let totalOffDays = 0;
    let totalAnomalyOffDays = 0;
    let totalDelayMinutes = 0;
    let totalWorkHours = 0;

    for (const emp of employeesData) {
      totalPresentOnTime += emp.period_stats.present_days;
      totalLateArrivals += emp.period_stats.late_days;
      totalAbsences += emp.period_stats.absent_days;
      totalOffDays += emp.period_stats.off_days;
      totalAnomalyOffDays += emp.period_stats.anomaly_off_days;
      totalDelayMinutes += emp.period_stats.total_delay_minutes;
      totalWorkHours += emp.period_stats.total_work_hours;
    }

    const totalExpectedWorkdays = employeesData.reduce(
      (sum, emp) => sum + emp.period_stats.work_days_expected,
      0,
    );

    const attendanceRate =
      totalExpectedWorkdays > 0
        ? ((totalPresentOnTime + totalLateArrivals) / totalExpectedWorkdays) * 100
        : 0;

    const punctualityRate =
      totalPresentOnTime + totalLateArrivals > 0
        ? (totalPresentOnTime / (totalPresentOnTime + totalLateArrivals)) * 100
        : 0;

    const averageDelayMinutes = totalLateArrivals > 0 ? totalDelayMinutes / totalLateArrivals : 0;

    const averageWorkHoursPerDay =
      totalPresentOnTime + totalLateArrivals > 0
        ? totalWorkHours / (totalPresentOnTime + totalLateArrivals)
        : 0;

    // ── Sessions actives en ce moment (depuis periodSessions, sans requête) ──

    const now = TimezoneConfigUtils.getCurrentTime();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todaySessions = periodSessions.filter((s) => {
      const start = s.getSessionStartAt();
      return start && start >= todayStart && s.isActive();
    });
    const currentlyActive = todaySessions.length;

    let currentlyOnPause = 0;
    for (const session of todaySessions) {
      const pauseStatus = await session.getPauseStatusDetailed();
      if (pauseStatus?.is_on_pause) currentlyOnPause++;
    }

    const todayKey = now.toISOString().split('T')[0];
    let expectedToday = 0;
    for (const userId of teamMembers) {
      const todaySchedule = scheduleCache.get(userId)?.get(todayKey);
      if (todaySchedule?.applicable_schedule?.is_work_day) expectedToday++;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 8 — KPIs ENRICHIS
    // ══════════════════════════════════════════════════════════════════════════

    const team_coverage = Statistique.calculateTeamCoverage(
      expectedToday,
      currentlyActive,
      currentlyOnPause,
    );
    const session_analysis = Statistique.analyzeSessionDurations(allDayData);
    const justification_status = await Statistique.analyzeJustifications(
      totalAbsences,
      teamMembers,
      startOfPeriod,
      endOfPeriod,
    );
    const schedule_compliance = Statistique.calculateScheduleCompliance(allDayData);

    // ── KPI 6 : présences hors planning ──────────────────────────────────────
    const unexpected_presence = Statistique.calculateUnexpectedPresence(
      allDayData,
      totalDays,
      teamMembers.length,
    );

    // ══════════════════════════════════════════════════════════════════════════
    // RÉPONSE FINALE
    // ══════════════════════════════════════════════════════════════════════════

    return R.handleSuccess(res, {
      message: 'Period attendance retrieved successfully',
      data: {
        period: {
          start: startOfPeriod.toISOString().split('T')[0],
          end: endOfPeriod.toISOString().split('T')[0],
          total_days: totalDays,
        },

        filters: {
          manager_guid: managerObj.getGuid() ?? null,
          site_guid: siteObj?.getGuid() ?? null,
        },

        summary: {
          total_team_members: teamMembers.length,
          total_present_on_time: totalPresentOnTime,
          total_late_arrivals: totalLateArrivals,
          total_absences: totalAbsences,
          total_off_days: totalOffDays,
          total_anomaly_off_days: totalAnomalyOffDays, // ← exposé au niveau global
          total_expected_workdays: totalExpectedWorkdays,
          attendance_rate: parseFloat(attendanceRate.toFixed(2)),
          punctuality_rate: parseFloat(punctualityRate.toFixed(2)),
          average_delay_minutes: parseFloat(averageDelayMinutes.toFixed(1)),
          total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
          average_work_hours_per_day: parseFloat(averageWorkHoursPerDay.toFixed(2)),
          currently_active: currentlyActive,
          currently_on_pause: currentlyOnPause,

          // KPIs enrichis
          team_coverage,
          session_analysis,
          justification_status,
          schedule_compliance,
          unexpected_presence, // ← KPI 6, séparé de attendance_rate
        },

        daily_breakdown: dailyBreakdown,
        employees: employeesData,
      },
    });
  } catch (error: any) {
    console.error('[Attendance Stat] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'attendance_period_failed',
      message: error.message || 'Failed to retrieve period attendance',
    });
  }
});

/**
 * GET /dashboard/manager-pulse
 *
 * 📱 Snapshot temps réel pour App Manager mobile — v2.1
 *
 * NOUVEAUTÉ v2.1 :
 *  KPI anomaly_off_day_today — Employés présents aujourd'hui alors qu'ils
 *  ne devraient pas travailler. Exposé avec liste nominative pour action
 *  immédiate du manager (appel, vérification).
 */

router.get('/dashboard/manager-pulse', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, site } = req.query;

    // ══════════════════════════════════════════════════════════════════════════
    // VALIDATION
    // ══════════════════════════════════════════════════════════════════════════

    if (!manager || !UsersValidationUtils.validateGuid(String(manager))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const managerObj = await User._load(String(manager), true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    const teamData = await OrgHierarchy.getAllTeamMembers(managerObj.getId()!);
    const teamMembers = teamData.all_employees_flat.map((u) => u.getId()!);

    if (teamMembers.length === 0) {
      return R.handleSuccess(res, {
        computed_at: TimezoneConfigUtils.getCurrentTime().toISOString(),
        scope: { manager_guid: managerObj.getGuid(), team_size: 0, site_guid: null },
        kpis: [],
        missing_today: [],
      });
    }

    let siteObj: Site | null = null;
    if (site) {
      if (!WorkSessionsValidationUtils.validateGuid(String(site))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: WORK_SESSIONS_CODES.INVALID_GUID,
          message: WORK_SESSIONS_ERRORS.GUID_INVALID,
        });
      }
      siteObj = await Site._load(String(site), true);
      if (!siteObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: WORK_SESSIONS_CODES.SITE_NOT_FOUND,
          message: SITES_ERRORS.NOT_FOUND,
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DONNÉES DU JOUR — 1 SEULE REQUÊTE SESSIONS
    // ══════════════════════════════════════════════════════════════════════════

    const now = TimezoneConfigUtils.getCurrentTime();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const sessionConditions: Record<string, any> = {
      user: { [Op.in]: teamMembers },
      session_end_at: null,
      session_start_at: { [Op.gte]: todayStart },
    };
    if (siteObj) sessionConditions.site = siteObj.getId();

    const activeSessions = (await WorkSessions._list(sessionConditions)) ?? [];
    const currentlyActive = activeSessions.filter((s) => s.isActive()).length;

    let currentlyOnPause = 0;
    for (const session of activeSessions) {
      const pauseStatus = await session.getPauseStatusDetailed();
      if (pauseStatus?.is_on_pause) currentlyOnPause++;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CLASSIFICATION : pour chaque employé, résoudre son statut du jour
    //
    // RÈGLE : session prime sur planning
    //   session + is_work_day = false → anomaly_off_day
    //   session + is_work_day = true  → present (ou late)
    //   no session + is_work_day = true  → missing
    //   no session + is_work_day = false → off-day (ignoré)
    // ══════════════════════════════════════════════════════════════════════════

    let expectedToday = 0;

    const missingToday: Array<{
      guid: string;
      name: string;
      phone: string;
      call_deep_link: string;
    }> = [];

    const anomalyToday: Array<{
      guid: string;
      name: string;
      phone: string;
      clock_in_time: string;
      call_deep_link: string;
    }> = [];

    for (const userId of teamMembers) {
      const scheduleResult = await ScheduleResolutionService.getApplicableSchedule(userId, now);
      const isWorkDay = scheduleResult.applicable_schedule?.is_work_day ?? false;
      const hasSession = activeSessions.some((s) => s.getUser() === userId);

      const employee = teamData.all_employees_flat.find((u) => u.getId() === userId);
      if (!employee) continue;

      const name = `${employee.getFirstName() ?? ''} ${employee.getLastName() ?? ''}`.trim();
      const phone = employee.getPhoneNumber() ?? '';
      const phoneClean = phone.replace(/\D/g, '');
      const callLink = `tel:${phoneClean}`;

      if (hasSession && !isWorkDay) {
        // ─── ANOMALIE : présent un jour OFF ──────────────────────────────────
        const session = activeSessions.find((s) => s.getUser() === userId);
        const clockIn = session?.getSessionStartAt()?.toISOString() ?? now.toISOString();

        anomalyToday.push({
          guid: employee.getGuid()!,
          name,
          phone,
          clock_in_time: clockIn,
          call_deep_link: callLink,
        });
      } else if (!hasSession && isWorkDay) {
        // ─── MANQUANT : attendu mais absent ──────────────────────────────────
        expectedToday++;

        missingToday.push({
          guid: employee.getGuid()!,
          name,
          phone,
          call_deep_link: callLink,
        });
      } else if (isWorkDay) {
        // ─── PRÉSENT un jour de travail normal ───────────────────────────────
        expectedToday++;
      }
      // off-day pur (no session + !isWorkDay) → ignoré silencieusement
    }

    const coverageRate =
      expectedToday > 0 ? parseFloat(((currentlyActive / expectedToday) * 100).toFixed(1)) : 0;

    // ══════════════════════════════════════════════════════════════════════════
    // KPI 1 — Couverture équipe
    // ══════════════════════════════════════════════════════════════════════════

    const kpi_team_coverage = {
      code: 'team_coverage',
      label: 'Équipe présente',
      value: currentlyActive,
      unit: 'count',
      status: coverageRate >= 90 ? 'ok' : coverageRate >= 70 ? 'warning' : 'critical',
      thresholds: { warning: 70, critical: 50, direction: 'higher_is_better' },
      context: `${currentlyActive} présents sur ${expectedToday} attendus (${coverageRate}%)`,
      action:
        missingToday.length > 0
          ? {
              type: 'drill_down',
              label: `Voir les ${missingToday.length} absents`,
              deep_link: `/manager/today/missing`,
              count: missingToday.length,
            }
          : null,
    };

    // ══════════════════════════════════════════════════════════════════════════
    // KPI 2 — Mémos en attente
    // ══════════════════════════════════════════════════════════════════════════

    const pendingMemos = await Memos._list({
      validator_id: managerObj.getId(),
      memo_status: MemoStatus.PENDING,
    });

    const pendingCount = pendingMemos?.length ?? 0;
    const oldestMemo = pendingMemos?.[0];
    const memoAgeHours = oldestMemo?.getCreatedAt()
      ? Math.floor((now.getTime() - oldestMemo.getCreatedAt()!.getTime()) / (1000 * 60 * 60))
      : 0;

    const kpi_pending_memos = {
      code: 'pending_memos',
      label: 'Mémos à valider',
      value: pendingCount,
      unit: 'count',
      status: pendingCount === 0 ? 'ok' : pendingCount <= 3 ? 'warning' : 'critical',
      thresholds: { warning: 3, critical: 5, direction: 'lower_is_better' },
      context:
        pendingCount === 0
          ? 'Aucun mémo en attente'
          : memoAgeHours < 24
            ? `${pendingCount} mémos — plus ancien: ${memoAgeHours}h`
            : `${pendingCount} mémos — plus ancien: ${Math.floor(memoAgeHours / 24)}j`,
      action:
        pendingCount > 0
          ? {
              type: 'validate',
              label: `Traiter ${pendingCount} mémo${pendingCount > 1 ? 's' : ''}`,
              deep_link: `/manager/memos/pending`,
              count: pendingCount,
            }
          : null,
    };

    // ══════════════════════════════════════════════════════════════════════════
    // KPI 3 — Présences hors planning AUJOURD'HUI (NOUVEAU)
    //
    // Spécifique au pulse : on signale les anomalies du jour courant
    // avec liste nominative pour action immédiate (appel, vérification).
    // ══════════════════════════════════════════════════════════════════════════

    const kpi_anomaly_today = {
      code: 'anomaly_off_day_today',
      label: 'Présences hors planning',
      value: anomalyToday.length,
      unit: 'count',
      status: anomalyToday.length === 0 ? 'ok' : anomalyToday.length <= 1 ? 'warning' : 'critical',
      thresholds: { ok: 0, warning: 1, direction: 'lower_is_better' },
      context:
        anomalyToday.length === 0
          ? 'Aucune présence hors planning'
          : `${anomalyToday.length} employé${anomalyToday.length > 1 ? 's' : ''} présent${anomalyToday.length > 1 ? 's' : ''} un jour non travaillé`,
      action:
        anomalyToday.length > 0
          ? {
              type: 'review',
              label: `Vérifier ${anomalyToday.length} présence${anomalyToday.length > 1 ? 's' : ''} anormale${anomalyToday.length > 1 ? 's' : ''}`,
              deep_link: `/manager/anomalies?date=today&type=off_day_presence`,
              count: anomalyToday.length,
            }
          : null,
    };

    // ══════════════════════════════════════════════════════════════════════════
    // KPI 4 — Alertes fraude (V2 placeholder)
    // ══════════════════════════════════════════════════════════════════════════

    const kpi_active_alerts = {
      code: 'active_alerts',
      label: 'Alertes actives',
      value: 0,
      unit: 'count',
      status: 'ok',
      thresholds: { warning: 0, critical: 1, direction: 'lower_is_better' },
      context: 'Aucune alerte fraude détectée',
      action: null,
    };

    // ══════════════════════════════════════════════════════════════════════════
    // RÉPONSE FINALE
    // ══════════════════════════════════════════════════════════════════════════

    return R.handleSuccess(res, {
      computed_at: now.toISOString(),

      scope: {
        manager_guid: managerObj.getGuid(),
        team_size: teamMembers.length,
        site_guid: siteObj?.getGuid() ?? null,
      },

      kpis: [
        kpi_team_coverage,
        kpi_pending_memos,
        kpi_anomaly_today, // ← KPI 3
        kpi_active_alerts,
      ],

      // Absents attendus (max 10)
      missing_today: missingToday.slice(0, 10),

      // Présences anormales (max 10, avec heure de pointage)
      anomalies_today: anomalyToday.slice(0, 10),
    });
  } catch (error: any) {
    console.error('[Manager Pulse] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'manager_pulse_failed',
      message: error.message || 'Failed to retrieve manager pulse',
    });
  }
});

/**
 * GET /dashboard/employee-stats/:guid
 *
 * 👤 Vue personnelle d'un employé — v2.1
 *
 * NOUVEAUTÉ v2.1 :
 *  anomaly_off_day détecté dans la boucle jour (présence prime sur planning).
 *  period_stats.anomaly_off_days exposé.
 *  KPI individuel anomaly_off_days dans le tableau kpis.
 */

router.get('/dashboard/employee-stats/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    const { period = '30d', start_date, end_date, requester } = req.query;

    // ══════════════════════════════════════════════════════════════════════════
    // 1. VALIDATION & CHARGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    if (!UsersValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const employeeObj = await User._load(guid, true);
    if (!employeeObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. CONTRÔLE D'ACCÈS
    // ══════════════════════════════════════════════════════════════════════════

    const requesterGuid = (req as any).user?.guid;

    if (requesterGuid === guid && requesterGuid) {
      // OK — employé voit ses propres stats
    } else if (requester) {
      const managerObj = await User._load(String(requester), true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.FORBIDDEN, {
          code: USERS_CODES.AUTHORIZATION_FAILED,
          message: 'Requester not found',
        });
      }
      const isInTeam = await OrgHierarchy.isUserInHierarchy(
        employeeObj.getId()!,
        managerObj.getId()!,
      );
      if (!isInTeam) {
        return R.handleError(res, HttpStatus.FORBIDDEN, {
          code: USERS_CODES.AUTHORIZATION_FAILED,
          message: 'Employee is not in your team',
        });
      }
    } else {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: USERS_CODES.AUTHORIZATION_FAILED,
        message: 'Insufficient permissions to view employee stats',
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. PÉRIODE
    // ══════════════════════════════════════════════════════════════════════════

    let startOfPeriod: Date;
    let endOfPeriod: Date;

    if (period === 'custom') {
      if (
        !start_date ||
        !end_date ||
        !UsersValidationUtils.isValidDate(String(start_date)) ||
        !UsersValidationUtils.isValidDate(String(end_date))
      ) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.VALIDATION_FAILED,
          message: 'Invalid custom date range',
        });
      }
      startOfPeriod = new Date(String(start_date));
      endOfPeriod = new Date(String(end_date));
    } else {
      const now = TimezoneConfigUtils.getCurrentTime();
      endOfPeriod = new Date(now);
      endOfPeriod.setHours(23, 59, 59, 999);
      startOfPeriod = new Date(now);
      if (period === '7d') startOfPeriod.setDate(startOfPeriod.getDate() - 7);
      else if (period === '90d') startOfPeriod.setDate(startOfPeriod.getDate() - 90);
      else startOfPeriod.setDate(startOfPeriod.getDate() - 30);
      startOfPeriod.setHours(0, 0, 0, 0);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 4. SESSIONS
    // ══════════════════════════════════════════════════════════════════════════

    const periodSessions = await WorkSessions._list({
      user: employeeObj.getId(),
      session_start_at: { [Op.between]: [startOfPeriod, endOfPeriod] },
    });

    // ══════════════════════════════════════════════════════════════════════════
    // 5. ASSIGNATION ACTUELLE
    // ══════════════════════════════════════════════════════════════════════════

    const assignmentType = await employeeObj.getCurrentAssignmentType();
    const activeSchedule = await employeeObj.getActiveScheduleAssignment();
    const activeRotation = await employeeObj.getActiveRotationAssignment();

    const assignmentInfo: any = {
      current_type: assignmentType,
      schedule_name: null,
      schedule_guid: null,
      rotation_group_name: null,
      rotation_group_guid: null,
    };

    if (activeSchedule) {
      const template = await activeSchedule.getSessionTemplate();
      assignmentInfo.schedule_name = template?.getName();
      assignmentInfo.schedule_guid = template?.getGuid();
    }
    if (activeRotation) {
      const rotGroup = await activeRotation.getRotationGroupObj();
      assignmentInfo.rotation_group_name = rotGroup?.getName();
      assignmentInfo.rotation_group_guid = rotGroup?.getGuid();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 6. BOUCLE JOUR PAR JOUR
    //
    // RÈGLE : session prime sur planning.
    //   session + !isWorkDay → anomaly_off_day
    //   session + isWorkDay  → present | late
    //   no session + isWorkDay  → absent
    //   no session + !isWorkDay → off-day
    // ══════════════════════════════════════════════════════════════════════════

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let workDaysExpected = 0;
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let offDays = 0;
    let anomalyDays = 0; // ← nouveau
    let totalDelayMinutes = 0;
    let maxDelayMinutes = 0;
    let totalWorkHours = 0;
    let totalPauseMinutes = 0;

    const dailyDetailsArray: Array<any> = [];

    const cursor = new Date(startOfPeriod);
    cursor.setHours(12, 0, 0, 0);
    const periodEnd = new Date(endOfPeriod);
    periodEnd.setHours(12, 0, 0, 0);

    while (cursor <= periodEnd) {
      const dateKey = cursor.toISOString().split('T')[0];
      const dayStart = new Date(cursor);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);

      const scheduleResult = await ScheduleResolutionService.getApplicableSchedule(
        employeeObj.getId()!,
        cursor,
      );
      const expectedSchedule = scheduleResult.applicable_schedule;
      const isWorkDay = expectedSchedule?.is_work_day ?? false;

      const daySession = periodSessions?.find((s) => {
        const start = s.getSessionStartAt();
        return start && start >= dayStart && start <= dayEnd;
      });

      let status: DayStatus = 'absent';
      let clockInTime: Date | null = null;
      let clockOutTime: Date | null = null;
      let delayMinutes = 0;
      let isWithinTolerance: boolean | null = null;
      let toleranceMinutes: number | null = null;
      let dayWorkHours = 0;
      let dayPauseMinutes = 0;

      if (daySession) {
        clockInTime = daySession.getSessionStartAt() ?? null;
        clockOutTime = daySession.getSessionEndAt() ?? null;

        const rawDuration = daySession.getTotalWorkDuration();
        if (rawDuration) {
          const matches = rawDuration.match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
          if (matches) {
            dayWorkHours = (parseInt(matches[1]) || 0) + (parseInt(matches[2]) || 0) / 60;
          }
        }

        dayPauseMinutes = await daySession.getTotalPauseTime();

        if (!isWorkDay) {
          // ─── ANOMALIE : présent un jour OFF ──────────────────────────────
          status = 'anomaly_off_day';
          anomalyDays++;
          // Pas de calcul retard — pas d'horaire prévu
          isWithinTolerance = null;
          toleranceMinutes = null;
        } else {
          // ─── Jour travaillé normal ────────────────────────────────────────
          workDaysExpected++;

          if (expectedSchedule && expectedSchedule.expected_blocks.length > 0) {
            const firstBlock = expectedSchedule.expected_blocks[0];
            const expectedStartTime = firstBlock.work[0];
            toleranceMinutes = firstBlock.tolerance ?? 0;

            const clockedTime = AnomalyDetectionService.formatTime(clockInTime!);
            const clockedMin = ScheduleResolutionService.parseTimeToMinutes(clockedTime);
            const expectedMin = ScheduleResolutionService.parseTimeToMinutes(expectedStartTime);

            delayMinutes = clockedMin - expectedMin;
            isWithinTolerance = delayMinutes <= toleranceMinutes;

            if (delayMinutes > toleranceMinutes) {
              status = 'late';
              lateDays++;
            } else {
              status = 'present';
              presentDays++;
            }
          } else {
            status = 'present';
            isWithinTolerance = true;
            presentDays++;
          }

          if (delayMinutes > 0) {
            totalDelayMinutes += delayMinutes;
            maxDelayMinutes = Math.max(maxDelayMinutes, delayMinutes);
          }
        }
      } else if (!isWorkDay) {
        status = 'off-day';
        offDays++;
      } else {
        status = 'absent';
        absentDays++;
        workDaysExpected++;
      }

      totalWorkHours += dayWorkHours;
      totalPauseMinutes += dayPauseMinutes;

      dailyDetailsArray.push({
        date: dateKey,
        day_of_week: dayNames[cursor.getDay()],
        status,
        clock_in_time: clockInTime ? clockInTime.toISOString() : null,
        clock_out_time: clockOutTime ? clockOutTime.toISOString() : null,
        expected_time: isWorkDay ? (expectedSchedule?.expected_blocks[0]?.work[0] ?? null) : null,
        delay_minutes: delayMinutes > 0 ? delayMinutes : null,
        tolerance_minutes: toleranceMinutes,
        work_hours: dayWorkHours > 0 ? dayWorkHours : null,
        pause_minutes: dayPauseMinutes > 0 ? dayPauseMinutes : null,
        is_within_tolerance: isWithinTolerance,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 7. CALCUL DES TAUX
    //
    // anomaly_off_days exclus de attendance_rate — pas un jour planifié.
    // ══════════════════════════════════════════════════════════════════════════

    const attendanceRate =
      workDaysExpected > 0 ? ((presentDays + lateDays) / workDaysExpected) * 100 : 0;

    const punctualityRate =
      presentDays + lateDays > 0 ? (presentDays / (presentDays + lateDays)) * 100 : 0;

    const absenteeismRate = workDaysExpected > 0 ? (absentDays / workDaysExpected) * 100 : 0;

    const averageDelayMinutes = lateDays > 0 ? totalDelayMinutes / lateDays : 0;

    // ══════════════════════════════════════════════════════════════════════════
    // 8. MÉMOS
    // ══════════════════════════════════════════════════════════════════════════

    const periodMemos = await Memos._list({
      target_user: employeeObj.getId(),
      incident_datetime: { [Op.between]: [startOfPeriod, endOfPeriod] },
    });

    const memosData = (periodMemos ?? []).map((memo) => ({
      date: memo.getIncidentDatetime()?.toISOString().split('T')[0],
      type: memo.getMemoType(),
      status: memo.getMemoStatus(),
      content: memo.getMemoContent() ?? null,
      created_at: memo.getCreatedAt()?.toISOString(),
      last_operation: memo.getUpdatedAt()?.toISOString() ?? null,
      guid: memo.getGuid(),
    }));

    // ══════════════════════════════════════════════════════════════════════════
    // 9. KPIs INDIVIDUELS
    // ══════════════════════════════════════════════════════════════════════════

    const kpis = [
      {
        code: 'attendance_rate',
        label: 'Taux de présence',
        value: parseFloat(attendanceRate.toFixed(2)),
        unit: 'percent',
        status: attendanceRate >= 95 ? 'ok' : attendanceRate >= 85 ? 'warning' : 'critical',
        thresholds: { ok: 95, warning: 85, direction: 'higher_is_better' },
        context: `${Math.round(attendanceRate)}% sur les jours planifiés`,
      },
      {
        code: 'punctuality_rate',
        label: 'Taux de ponctualité',
        value: parseFloat(punctualityRate.toFixed(2)),
        unit: 'percent',
        status: punctualityRate >= 90 ? 'ok' : punctualityRate >= 75 ? 'warning' : 'critical',
        thresholds: { ok: 90, warning: 75, direction: 'higher_is_better' },
        context: `${presentDays} jours à l'heure sur ${presentDays + lateDays} présences`,
      },
      {
        code: 'absenteeism_rate',
        label: "Taux d'absentéisme",
        value: parseFloat(absenteeismRate.toFixed(2)),
        unit: 'percent',
        status: absenteeismRate <= 5 ? 'ok' : absenteeismRate <= 10 ? 'warning' : 'critical',
        thresholds: { ok: 5, warning: 10, direction: 'lower_is_better' },
        context: `${absentDays} absences sur ${workDaysExpected} jours attendus`,
      },
      {
        code: 'avg_delay_minutes',
        label: 'Retard moyen',
        value: parseFloat(averageDelayMinutes.toFixed(1)),
        unit: 'minutes',
        status:
          averageDelayMinutes <= 5 ? 'ok' : averageDelayMinutes <= 15 ? 'warning' : 'critical',
        thresholds: { ok: 5, warning: 15, direction: 'lower_is_better' },
        context:
          lateDays > 0
            ? `${averageDelayMinutes.toFixed(1)} min de retard en moyenne (${lateDays} fois)`
            : 'Aucun retard',
      },
      {
        code: 'total_work_hours',
        label: 'Heures travaillées',
        value: parseFloat(totalWorkHours.toFixed(2)),
        unit: 'hours',
        status: 'info',
        thresholds: { direction: 'higher_is_better' },
        context: `${totalWorkHours.toFixed(1)}h total (jours planifiés + hors planning)`,
      },
      {
        code: 'net_work_ratio',
        label: 'Ratio travail net',
        value:
          totalPauseMinutes > 0 && totalWorkHours > 0
            ? parseFloat(
                (((totalWorkHours * 60 - totalPauseMinutes) / (totalWorkHours * 60)) * 100).toFixed(
                  1,
                ),
              )
            : 100,
        unit: 'percent',
        status: 'info',
        thresholds: { ok: 85, direction: 'higher_is_better' },
        context: `${totalPauseMinutes} min de pauses sur la période`,
      },
      {
        code: 'memo_count',
        label: 'Mémos soumis',
        value: periodMemos?.length ?? 0,
        unit: 'count',
        status: 'info',
        context: `${periodMemos?.length ?? 0} justificatifs sur la période`,
      },
      // ── KPI anomalie — séparé, actionnable ────────────────────────────────
      {
        code: 'anomaly_off_days',
        label: 'Présences hors planning',
        value: anomalyDays,
        unit: 'count',
        status: anomalyDays === 0 ? 'ok' : anomalyDays <= 1 ? 'warning' : 'critical',
        thresholds: { ok: 0, warning: 1, direction: 'lower_is_better' },
        context:
          anomalyDays === 0
            ? 'Aucune présence hors planning'
            : `${anomalyDays} jour${anomalyDays > 1 ? 's' : ''} travaillé${anomalyDays > 1 ? 's' : ''} hors planning`,
        action:
          anomalyDays > 0
            ? {
                type: 'review',
                label: 'Voir les détails dans daily_details (status: anomaly_off_day)',
                deep_link: `/employee/${guid}/anomalies`,
                count: anomalyDays,
              }
            : null,
      },
    ];

    // ══════════════════════════════════════════════════════════════════════════
    // RÉPONSE FINALE
    // ══════════════════════════════════════════════════════════════════════════

    return R.handleSuccess(res, {
      computed_at: TimezoneConfigUtils.getCurrentTime().toISOString(),

      employee: {
        guid: employeeObj.getGuid(),
        first_name: employeeObj.getFirstName(),
        last_name: employeeObj.getLastName(),
        employee_code: employeeObj.getEmployeeCode(),
        email: employeeObj.getEmail(),
        phone: employeeObj.getPhoneNumber(),
        avatar_url: employeeObj.getAvatarUrl(),
        department: employeeObj.getDepartment(),
        job_title: employeeObj.getJobTitle(),
      },

      period: {
        start: startOfPeriod.toISOString().split('T')[0],
        end: endOfPeriod.toISOString().split('T')[0],
        duration_days: dailyDetailsArray.length,
      },

      assignment_info: assignmentInfo,

      kpis,

      period_stats: {
        work_days_expected: workDaysExpected,
        present_days: presentDays,
        late_days: lateDays,
        absent_days: absentDays,
        off_days: offDays,
        anomaly_off_days: anomalyDays, // ← exposé
        total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
        total_pause_minutes: totalPauseMinutes,
        total_delay_minutes: totalDelayMinutes,
        max_delay_minutes: maxDelayMinutes,
        average_delay_minutes: parseFloat(averageDelayMinutes.toFixed(1)),
      },

      effective_presence: Statistique.calculateEffectivePresence(
        totalWorkHours,
        totalPauseMinutes > 0 ? totalPauseMinutes : null,
        presentDays,
        lateDays,
      ),

      daily_details: dailyDetailsArray, // contient les entrées status='anomaly_off_day'

      memos: memosData,
    });
  } catch (error: any) {
    console.error('[Employee Stats] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'employee_stats_failed',
      message: error.message || 'Failed to retrieve employee stats',
    });
  }
});

/**
 * GET /dashboard/hr-analytics
 *
 * 📈 Vue d'analyse RH périodique — Dashboard complet pour Direction/RH
 * Rétrocompatible avec `/attendance/stat` v2 (qui était trop surchargé)
 *
 * Cas d'usage :
 * - Rapport fin de mois (30j, 90j, custom)
 * - Analyse KPIs par manager/site
 * - Export données pour BI/Excel
 *
 * Paramètres :
 * - period=7d|30d|90d|custom (défaut: 30d)
 * - start_date/end_date si custom
 * - manager_guid, site_guid (filtrage)
 * - exclude=daily_details|employees|kpis_detail (optimisation payload)
 */

router.get('/dashboard/hr-analytics', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, site, period = '30d', start_date, end_date, exclude } = req.query;

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 0 — PÉRIODE
    // ══════════════════════════════════════════════════════════════════════════

    let startOfPeriod: Date;
    let endOfPeriod: Date;

    if (period === 'custom') {
      if (
        !start_date ||
        !end_date ||
        !UsersValidationUtils.isValidDate(String(start_date)) ||
        !UsersValidationUtils.isValidDate(String(end_date))
      ) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.VALIDATION_FAILED,
          message: 'Invalid custom date range',
        });
      }
      startOfPeriod = new Date(String(start_date));
      endOfPeriod = new Date(String(end_date));
    } else {
      const now = TimezoneConfigUtils.getCurrentTime();
      endOfPeriod = new Date(now);
      endOfPeriod.setHours(23, 59, 59, 999);

      startOfPeriod = new Date(now);

      if (period === '7d') {
        startOfPeriod.setDate(startOfPeriod.getDate() - 7);
      } else if (period === '90d') {
        startOfPeriod.setDate(startOfPeriod.getDate() - 90);
      } else {
        // 30d par défaut
        startOfPeriod.setDate(startOfPeriod.getDate() - 30);
      }

      startOfPeriod.setHours(0, 0, 0, 0);
    }

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const totalDays =
      Math.round((endOfPeriod.getTime() - startOfPeriod.getTime()) / MS_PER_DAY) + 1;

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 1 — SCOPE
    // ══════════════════════════════════════════════════════════════════════════

    let managerObj: any = null;
    let siteObj: any = null;
    let teamMembers: number[] = [];

    if (manager) {
      if (!UsersValidationUtils.validateGuid(String(manager))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.VALIDATION_FAILED,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      managerObj = await User._load(String(manager), true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.SUPERVISOR_NOT_FOUND,
          message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
        });
      }

      const teamData = await OrgHierarchy.getAllTeamMembers(managerObj.getId()!);
      teamMembers = teamData.all_employees_flat.map((u) => u.getId()!);
    } else {
      // Si aucun manager spécifié, on prend toute l'équipe du tenant
      // (à adapter selon votre contexte — peut être un filtre par Site Admin)
      const allUsers = await User._list({ deleted_at: null });
      teamMembers = (allUsers ?? []).map((u) => u.getId()!);
    }

    if (site) {
      if (!WorkSessionsValidationUtils.validateGuid(String(site))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: WORK_SESSIONS_CODES.INVALID_GUID,
          message: WORK_SESSIONS_ERRORS.GUID_INVALID,
        });
      }
      siteObj = await Site._load(String(site), true);
      if (!siteObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: WORK_SESSIONS_CODES.SITE_NOT_FOUND,
          message: SITES_ERRORS.NOT_FOUND,
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 2 — PRÉCHARGEMENT (identique à /attendance/stat)
    // ══════════════════════════════════════════════════════════════════════════

    // UNE SEULE requête pour toute la période
    const sessionConditions: Record<string, any> = {
      session_start_at: { [Op.between]: [startOfPeriod, endOfPeriod] },
    };
    if (teamMembers.length > 0) {
      sessionConditions.user = { [Op.in]: teamMembers };
    }
    if (siteObj) {
      sessionConditions.site = siteObj.getId();
    }

    const periodSessions = (await WorkSessions._list(sessionConditions)) ?? [];

    // Préchargement schedules par employé
    const periodDates: Date[] = [];
    const cursor = new Date(startOfPeriod);
    cursor.setHours(12, 0, 0, 0);
    const periodEnd = new Date(endOfPeriod);
    periodEnd.setHours(12, 0, 0, 0);
    while (cursor <= periodEnd) {
      periodDates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    type ScheduleCache = Map<
      string,
      Awaited<ReturnType<typeof ScheduleResolutionService.getApplicableSchedule>>
    >;
    const scheduleCache = new Map<number, ScheduleCache>();

    await Promise.all(
      teamMembers.map(async (userId) => {
        const userCache: ScheduleCache = new Map();
        for (const d of periodDates) {
          const dateKey = d.toISOString().split('T')[0];
          const result = await ScheduleResolutionService.getApplicableSchedule(userId, d);
          userCache.set(dateKey, result);
        }
        scheduleCache.set(userId, userCache);
      }),
    );

    // Préchargement pauses
    const sessionPauseMinutes = new Map<number, number>();
    await Promise.all(
      periodSessions.map(async (session) => {
        const pauseMin = await session.getTotalPauseTime();
        sessionPauseMinutes.set(session.getId()!, pauseMin);
      }),
    );

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 3 — DOUBLE BOUCLE JOUR × EMPLOYÉ (identique à /attendance/stat)
    // ══════════════════════════════════════════════════════════════════════════

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyBreakdown: Array<any> = [];
    const dailyEmployeeData = new Map<string, Map<number, any>>();
    const allDayData: Array<any> = [];

    for (const analysisDate of periodDates) {
      const dateKey = analysisDate.toISOString().split('T')[0];
      const dayStart = new Date(analysisDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(analysisDate);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = periodSessions.filter((s) => {
        const start = s.getSessionStartAt();
        return start && start >= dayStart && start <= dayEnd;
      });

      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      let offDayCount = 0;

      const dayEmployeeAnalysis = new Map<number, any>();

      for (const userId of teamMembers) {
        const scheduleResult = scheduleCache.get(userId)?.get(dateKey);
        const expectedSchedule = scheduleResult?.applicable_schedule ?? null;
        const isWorkDay = expectedSchedule?.is_work_day ?? false;

        const userSession = daySessions.find((s) => s.getUser() === userId) ?? null;

        let status: 'present' | 'late' | 'absent' | 'off-day' = 'absent';
        let delayMinutes = 0;
        let isWithinTolerance: boolean | null = null;
        let toleranceMinutes: number | null = null;
        let clockInTime: Date | null = null;
        let clockOutTime: Date | null = null;
        let workHours = 0;

        if (!isWorkDay) {
          status = 'off-day';
          offDayCount++;
        } else if (userSession) {
          clockInTime = userSession.getSessionStartAt() ?? null;
          clockOutTime = userSession.getSessionEndAt() ?? null;

          const rawDuration = userSession.getTotalWorkDuration();
          if (rawDuration) {
            const matches = rawDuration.match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
            if (matches) {
              workHours = (parseInt(matches[1]) || 0) + (parseInt(matches[2]) || 0) / 60;
            }
          }

          if (expectedSchedule && expectedSchedule.expected_blocks.length > 0) {
            const firstBlock = expectedSchedule.expected_blocks[0];
            const expectedStartTime = firstBlock.work[0];
            toleranceMinutes = firstBlock.tolerance ?? 0;

            const clockedTime = AnomalyDetectionService.formatTime(clockInTime!);
            const clockedMin = ScheduleResolutionService.parseTimeToMinutes(clockedTime);
            const expectedMin = ScheduleResolutionService.parseTimeToMinutes(expectedStartTime);

            delayMinutes = clockedMin - expectedMin;
            isWithinTolerance = delayMinutes <= toleranceMinutes;

            if (delayMinutes > toleranceMinutes) {
              status = 'late';
              lateCount++;
            } else {
              status = 'present';
              presentCount++;
            }
          } else {
            status = 'present';
            isWithinTolerance = true;
            presentCount++;
          }
        } else {
          status = 'absent';
          absentCount++;
        }

        const dayEntry = {
          status,
          clock_in_time: clockInTime ? clockInTime.toISOString() : null,
          clock_out_time: clockOutTime ? clockOutTime.toISOString() : null,
          expected_time: expectedSchedule?.expected_blocks[0]?.work[0] ?? null,
          delay_minutes: delayMinutes > 0 ? delayMinutes : null,
          tolerance_minutes: toleranceMinutes,
          work_hours: workHours > 0 ? workHours : null,
          is_within_tolerance: isWithinTolerance,
          date: dateKey,
        };
        dayEmployeeAnalysis.set(userId, dayEntry);

        const employee = teamMembers.find((u) => u === userId) ? await User._load(userId) : null;
        if (employee) {
          allDayData.push({
            employee_guid: employee.getGuid()!,
            date: dateKey,
            status,
            clock_in_time: dayEntry.clock_in_time,
            clock_out_time: dayEntry.clock_out_time,
            work_hours: workHours > 0 ? workHours : null,
            is_within_tolerance: isWithinTolerance,
            delay_minutes: delayMinutes > 0 ? delayMinutes : null,
          });
        }
      }

      dailyEmployeeData.set(dateKey, dayEmployeeAnalysis);

      dailyBreakdown.push({
        date: dateKey,
        day_of_week: dayNames[analysisDate.getDay()],
        expected_count: teamMembers.length - offDayCount,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        off_day: offDayCount,
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 4 — STATISTIQUES GLOBALES & EMPLOYÉ
    // ══════════════════════════════════════════════════════════════════════════

    let totalPresentOnTime = 0;
    let totalLateArrivals = 0;
    let totalAbsences = 0;
    let totalOffDays = 0;
    let totalDelayMinutes = 0;
    let totalWorkHours = 0;
    let totalPauseMinutes = 0;

    const employeesData: Array<any> = [];

    for (const userId of teamMembers) {
      const employee = await User._load(userId);
      if (!employee) continue;

      let workDaysExpected = 0;
      let presentDays = 0;
      let lateDays = 0;
      let absentDays = 0;
      let offDays = 0;
      let totalDelayMinutesEmp = 0;
      let maxDelayMinutesEmp = 0;
      let totalWorkHoursEmp = 0;
      let totalPauseMinutesEmp = 0;

      const userSessions = periodSessions.filter((s) => s.getUser() === userId);
      for (const session of userSessions) {
        totalPauseMinutesEmp += sessionPauseMinutes.get(session.getId()!) ?? 0;
      }

      const dailyDetailsRaw: Array<any> = [];

      for (const [dateKey, dayData] of dailyEmployeeData.entries()) {
        const dayEntry = dayData.get(userId);
        if (!dayEntry) continue;

        const { status, delay_minutes } = dayEntry;

        if (status === 'present') {
          presentDays++;
          workDaysExpected++;
        } else if (status === 'late') {
          lateDays++;
          workDaysExpected++;
          if (delay_minutes) {
            totalDelayMinutesEmp += delay_minutes;
            maxDelayMinutesEmp = Math.max(maxDelayMinutesEmp, delay_minutes);
          }
        } else if (status === 'absent') {
          absentDays++;
          workDaysExpected++;
        } else if (status === 'off-day') {
          offDays++;
        }

        if (dayEntry.work_hours) {
          totalWorkHoursEmp += dayEntry.work_hours;
        }

        dailyDetailsRaw.push(Statistique.enrichDailyDetail(dayEntry));
      }

      const attendanceRate =
        workDaysExpected > 0 ? ((presentDays + lateDays) / workDaysExpected) * 100 : 0;

      const punctualityRate =
        presentDays + lateDays > 0 ? (presentDays / (presentDays + lateDays)) * 100 : 0;

      const averageDelayMinutes = lateDays > 0 ? totalDelayMinutesEmp / lateDays : 0;

      const averageWorkHours =
        presentDays + lateDays > 0 ? totalWorkHoursEmp / (presentDays + lateDays) : 0;

      const employeeData: any = {
        employee: await employee.toJSON(responseValue.MINIMAL),

        period_stats: {
          work_days_expected: workDaysExpected,
          present_days: presentDays,
          late_days: lateDays,
          absent_days: absentDays,
          off_days: offDays,
          total_delay_minutes: totalDelayMinutesEmp,
          average_delay_minutes: parseFloat(averageDelayMinutes.toFixed(1)),
          max_delay_minutes: maxDelayMinutesEmp,
          total_work_hours: parseFloat(totalWorkHoursEmp.toFixed(2)),
          average_work_hours_per_day: parseFloat(averageWorkHours.toFixed(2)),
          attendance_rate: parseFloat(attendanceRate.toFixed(2)),
          punctuality_rate: parseFloat(punctualityRate.toFixed(2)),
        },

        effective_presence: Statistique.calculateEffectivePresence(
          totalWorkHoursEmp,
          totalPauseMinutesEmp > 0 ? totalPauseMinutesEmp : null,
          presentDays,
          lateDays,
        ),
      };

      // Inclure daily_details sauf si exclu
      if (exclude !== 'daily_details') {
        employeeData.daily_details = dailyDetailsRaw;
      }

      // Ajouter des KPIs individuels au format standard (format KPI chapitre 6)
      if (exclude !== 'kpis_detail') {
        employeeData.kpis_individual = [
          {
            code: 'attendance_rate',
            label: 'Taux de présence',
            value: parseFloat(attendanceRate.toFixed(2)),
            unit: 'percent',
            status: attendanceRate >= 95 ? 'ok' : attendanceRate >= 85 ? 'warning' : 'critical',
          },
          {
            code: 'punctuality_rate',
            label: 'Taux de ponctualité',
            value: parseFloat(punctualityRate.toFixed(2)),
            unit: 'percent',
            status: punctualityRate >= 90 ? 'ok' : punctualityRate >= 75 ? 'warning' : 'critical',
          },
          {
            code: 'avg_delay_minutes',
            label: 'Retard moyen',
            value: parseFloat(averageDelayMinutes.toFixed(1)),
            unit: 'minutes',
            status:
              averageDelayMinutes <= 5 ? 'ok' : averageDelayMinutes <= 15 ? 'warning' : 'critical',
          },
        ];
      }

      employeesData.push(employeeData);

      totalPresentOnTime += presentDays;
      totalLateArrivals += lateDays;
      totalAbsences += absentDays;
      totalOffDays += offDays;
      totalDelayMinutes += totalDelayMinutesEmp;
      totalWorkHours += totalWorkHoursEmp;
      totalPauseMinutes += totalPauseMinutesEmp;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 5 — KPIs GLOBAUX (format standard chapitre 6)
    // ══════════════════════════════════════════════════════════════════════════

    const totalExpectedWorkdays = employeesData.reduce(
      (sum, emp) => sum + emp.period_stats.work_days_expected,
      0,
    );

    const attendanceRate =
      totalExpectedWorkdays > 0
        ? ((totalPresentOnTime + totalLateArrivals) / totalExpectedWorkdays) * 100
        : 0;

    const absenteeismRate =
      totalExpectedWorkdays > 0 ? (totalAbsences / totalExpectedWorkdays) * 100 : 0;

    const punctualityRate =
      totalPresentOnTime + totalLateArrivals > 0
        ? (totalPresentOnTime / (totalPresentOnTime + totalLateArrivals)) * 100
        : 0;

    const averageDelayMinutes = totalLateArrivals > 0 ? totalDelayMinutes / totalLateArrivals : 0;

    const averageWorkHoursPerDay =
      totalPresentOnTime + totalLateArrivals > 0
        ? totalWorkHours / (totalPresentOnTime + totalLateArrivals)
        : 0;

    const netWorkRatio =
      totalPauseMinutes > 0 && totalWorkHours > 0
        ? parseFloat(
            (((totalWorkHours * 60 - totalPauseMinutes) / (totalWorkHours * 60)) * 100).toFixed(1),
          )
        : 100;

    // Sessions anomales
    const session_analysis = Statistique.analyzeSessionDurations(allDayData);

    // Conformité horaire
    const schedule_compliance = Statistique.calculateScheduleCompliance(allDayData);

    // Justifications
    const justification_status = await Statistique.analyzeJustifications(
      totalAbsences,
      teamMembers,
      startOfPeriod,
      endOfPeriod,
    );

    // Construire le tableau KPIs global
    const globalKpis = [
      {
        code: 'attendance_rate',
        label: 'Taux de présence',
        value: parseFloat(attendanceRate.toFixed(2)),
        unit: 'percent',
        status: attendanceRate >= 95 ? 'ok' : attendanceRate >= 85 ? 'warning' : 'critical',
        thresholds: { ok: 95, warning: 85, direction: 'higher_is_better' },
        context: `${Math.round(attendanceRate)}% de présence (${totalPresentOnTime + totalLateArrivals}/${totalExpectedWorkdays} jours)`,
      },
      {
        code: 'absenteeism_rate',
        label: "Taux d'absentéisme",
        value: parseFloat(absenteeismRate.toFixed(2)),
        unit: 'percent',
        status: absenteeismRate <= 5 ? 'ok' : absenteeismRate <= 10 ? 'warning' : 'critical',
        thresholds: { ok: 5, warning: 10, direction: 'lower_is_better' },
        context: `${totalAbsences} absences sur ${totalExpectedWorkdays} jours attendus`,
      },
      {
        code: 'anomaly_rate',
        label: "Taux d'anomalies",
        value: parseFloat(
          (
            (session_analysis.abnormal_sessions.length / session_analysis.total_sessions) *
            100
          ).toFixed(2),
        ),
        unit: 'percent',
        status: session_analysis.abnormal_sessions.length === 0 ? 'ok' : 'warning',
        thresholds: { ok: 0, warning: 5, direction: 'lower_is_better' },
        context: `${session_analysis.abnormal_sessions.length} sessions anomales détectées`,
      },
      {
        code: 'avg_validation_delay',
        label: 'Délai moyen de validation',
        value: parseFloat(averageDelayMinutes.toFixed(1)),
        unit: 'minutes',
        status:
          averageDelayMinutes <= 5 ? 'ok' : averageDelayMinutes <= 15 ? 'warning' : 'critical',
        thresholds: { ok: 5, warning: 15, direction: 'lower_is_better' },
        context: `${totalLateArrivals} arrivées tardives (moyenne ${averageDelayMinutes.toFixed(1)}min)`,
      },
      {
        code: 'punctuality_rate',
        label: 'Taux de ponctualité',
        value: parseFloat(punctualityRate.toFixed(2)),
        unit: 'percent',
        status: punctualityRate >= 90 ? 'ok' : punctualityRate >= 75 ? 'warning' : 'critical',
        thresholds: { ok: 90, warning: 75, direction: 'higher_is_better' },
        context: `${totalPresentOnTime} jours à l'heure sur ${totalPresentOnTime + totalLateArrivals} présences`,
      },
      {
        code: 'net_work_ratio',
        label: 'Ratio travail net',
        value: netWorkRatio,
        unit: 'percent',
        status: 'info',
        thresholds: { ok: 85, direction: 'higher_is_better' },
        context: `${(totalWorkHours * 60 - totalPauseMinutes).toFixed(0)}min net (${totalPauseMinutes}min pauses)`,
      },
      {
        code: 'avg_session_duration',
        label: 'Durée moyenne des sessions',
        value: session_analysis.avg_duration_hours,
        unit: 'hours',
        status: 'info',
        thresholds: { ok: 8, direction: 'higher_is_better' },
        context: `${session_analysis.total_sessions} sessions, moyenne ${session_analysis.avg_duration_hours}h`,
      },
      {
        code: 'memo_rejection_rate',
        label: 'Taux de rejet des mémos',
        value:
          justification_status.with_memo > 0
            ? (justification_status.rejected / justification_status.with_memo) * 100
            : 0,
        unit: 'percent',
        status: 'info',
        thresholds: { ok: 10, direction: 'lower_is_better' },
        context: `${justification_status.rejected}/${justification_status.with_memo} mémos rejetés`,
      },
      {
        code: 'pending_justifications',
        label: 'Justifications en attente',
        value: justification_status.pending_validation,
        unit: 'count',
        status:
          justification_status.pending_validation === 0
            ? 'ok'
            : justification_status.pending_validation <= 3
              ? 'warning'
              : 'critical',
        thresholds: { ok: 0, warning: 3, direction: 'lower_is_better' },
        context: `${justification_status.pending_validation} mémos non validés`,
      },
      {
        code: 'team_size',
        label: "Taille de l'équipe analysée",
        value: employeesData.length,
        unit: 'count',
        status: 'info',
        context: `${employeesData.length} employés sur la période`,
      },
    ];

    // ══════════════════════════════════════════════════════════════════════════
    // RÉPONSE FINALE
    // ══════════════════════════════════════════════════════════════════════════

    const responseData: any = {
      computed_at: TimezoneConfigUtils.getCurrentTime().toISOString(),

      period: {
        start: startOfPeriod.toISOString().split('T')[0],
        end: endOfPeriod.toISOString().split('T')[0],
        total_days: totalDays,
      },

      filters: {
        manager_guid: managerObj?.getGuid() ?? null,
        site_guid: siteObj?.getGuid() ?? null,
      },

      scope: {
        team_size: employeesData.length,
      },

      kpis: globalKpis,

      daily_breakdown: dailyBreakdown,
    };

    // Inclure employees sauf si exclu
    if (exclude !== 'employees') {
      responseData.employees = employeesData;
    }

    return R.handleSuccess(res, {
      message: 'HR analytics retrieved successfully',
      data: responseData,
    });
  } catch (error: any) {
    console.error('[HR Analytics] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'hr_analytics_failed',
      message: error.message || 'Failed to retrieve HR analytics',
    });
  }
});

export default router;
