import { createAttendanceDay } from '../domain/attendance-day.js';
import type {
  AttendanceDay,
  AttendanceDaySchedule,
  BusinessDate,
} from '../domain/attendance-day.types.js';
import {
  aggregateAttendanceActivities,
  attendanceEmployeeDateKey,
  emptyAttendanceActivity,
} from './attendance-activity.js';
import type {
  AttendanceEmployeeReference,
  AttendanceScheduleRecord,
  AttendanceScheduleRepository,
  AttendanceSessionRecord,
  AttendanceSessionRepository,
  BuildAttendanceDaysInput,
} from './attendance-day-service.types.js';
import {
  assertBusinessNow,
  enumerateBusinessDates,
  hasExpectedWorkDayEnded,
} from './business-calendar.js';

export class AttendanceDayServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttendanceDayServiceError';
  }
}

/**
 * Orchestre la construction d'une vérité unique par employé × journée.
 * Il ne connaît ni Express, ni Sequelize, ni le site de pointage.
 */
export class AttendanceDayService {
  constructor(
    private readonly sessionRepository: AttendanceSessionRepository,
    private readonly scheduleRepository: AttendanceScheduleRepository,
  ) {}

  async buildDays(input: BuildAttendanceDaysInput): Promise<readonly AttendanceDay[]> {
    validateInput(input);

    const employees = normalizeEmployees(input.employees);
    const dates = enumerateBusinessDates(input.period.startDate, input.period.endDate);
    if (employees.length === 0) return [];

    const employeeIds = employees.map((employee) => employee.id);
    const [sessions, schedules] = await Promise.all([
      this.sessionRepository.listForPeriod({
        employeeIds,
        period: input.period,
        businessTimezone: input.businessTimezone,
      }),
      this.scheduleRepository.resolveForPeriod({
        employees,
        dates,
        currentBusinessDate: input.now.date,
      }),
    ]);

    validateSessions(sessions, employeeIds, input.period.startDate, input.period.endDate);
    const scheduleByEmployeeDate = indexSchedules(
      schedules,
      employeeIds,
      input.period.startDate,
      input.period.endDate,
    );
    const activityByEmployeeDate = aggregateAttendanceActivities(sessions);
    const days: AttendanceDay[] = [];

    for (const date of dates) {
      for (const employee of employees) {
        const key = attendanceEmployeeDateKey(employee.id, date);
        const schedule =
          scheduleByEmployeeDate.get(key) ?? missingSchedule();
        const activity =
          activityByEmployeeDate.get(key) ?? emptyAttendanceActivity();

        days.push(
          createAttendanceDay({
            employeeId: employee.id,
            employeeGuid: employee.guid,
            date,
            schedule,
            activity,
            hasExpectedWorkDayEnded: hasExpectedWorkDayEnded(
              date,
              schedule,
              input.now,
            ),
          }),
        );
      }
    }

    return days;
  }
}

function validateInput(input: BuildAttendanceDaysInput): void {
  if (input.businessTimezone.trim().length === 0) {
    throw new AttendanceDayServiceError('businessTimezone est obligatoire');
  }
  assertBusinessNow(input.now);
  enumerateBusinessDates(input.period.startDate, input.period.endDate);
}

function normalizeEmployees(
  employees: readonly AttendanceEmployeeReference[],
): AttendanceEmployeeReference[] {
  const ids = new Set<number>();
  const guids = new Set<string>();

  return employees.map((employee) => {
    if (!Number.isInteger(employee.id) || employee.id <= 0) {
      throw new AttendanceDayServiceError('Chaque employé doit avoir un id positif');
    }

    const guid = employee.guid.trim();
    if (guid.length === 0) {
      throw new AttendanceDayServiceError(`Employé ${employee.id} : guid obligatoire`);
    }
    if (ids.has(employee.id)) {
      throw new AttendanceDayServiceError(`Employé dupliqué : ${employee.id}`);
    }
    if (guids.has(guid)) {
      throw new AttendanceDayServiceError(`GUID employé dupliqué : ${guid}`);
    }

    ids.add(employee.id);
    guids.add(guid);
    return { id: employee.id, guid };
  });
}

function validateSessions(
  sessions: readonly AttendanceSessionRecord[],
  employeeIds: readonly number[],
  startDate: BusinessDate,
  endDate: BusinessDate,
): void {
  const allowedEmployees = new Set(employeeIds);

  for (const session of sessions) {
    if (!allowedEmployees.has(session.employeeId)) {
      throw new AttendanceDayServiceError(
        `Session ${session.id} hors périmètre employé : ${session.employeeId}`,
      );
    }
    const date = session.startedAt.businessDate;
    if (date < startDate || date > endDate) {
      throw new AttendanceDayServiceError(
        `Session ${session.id} hors période métier : ${date}`,
      );
    }
  }
}

function indexSchedules(
  schedules: readonly AttendanceScheduleRecord[],
  employeeIds: readonly number[],
  startDate: BusinessDate,
  endDate: BusinessDate,
): ReadonlyMap<string, AttendanceDaySchedule> {
  const allowedEmployees = new Set(employeeIds);
  const indexed = new Map<string, AttendanceDaySchedule>();

  for (const record of schedules) {
    if (!allowedEmployees.has(record.employeeId)) {
      throw new AttendanceDayServiceError(
        `Planning hors périmètre employé : ${record.employeeId}`,
      );
    }
    if (record.date < startDate || record.date > endDate) {
      throw new AttendanceDayServiceError(
        `Planning hors période : ${record.employeeId} × ${record.date}`,
      );
    }

    const key = attendanceEmployeeDateKey(record.employeeId, record.date);
    if (indexed.has(key)) {
      throw new AttendanceDayServiceError(
        `Planning dupliqué : ${record.employeeId} × ${record.date}`,
      );
    }
    indexed.set(key, record.schedule);
  }

  return indexed;
}

function missingSchedule(): AttendanceDaySchedule {
  return {
    state: 'UNRESOLVED',
    source: null,
    expectedBlocks: [],
    issue: 'MISSING_SCHEDULE',
  };
}
