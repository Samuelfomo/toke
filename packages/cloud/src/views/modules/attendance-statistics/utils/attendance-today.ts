import type {
  AttendanceIssue,
  AttendanceOverview,
  AttendanceStatus,
  BusinessDate,
} from '../types/attendance-statistics.types.js';

export interface AttendanceTodayOperationalModel {
  date: BusinessDate;
  teamSize: number;
  scheduledWorkingEmployees: number;
  scheduledEmployeesWithActivity: number;
  employeesWithRecordedActivity: number;
  notSeenScheduledEmployees: number;
  onTimeObserved: number;
  lateObserved: number;
  confirmedAbsent: number;
  restDayEmployees: number;
  undeterminedEmployees: number;
  restDayWithPresenceEmployees: number;
  openSessionEmployees: number;
  issueCount: number;
}

const WORKING_DAY_OPERATIONAL_STATUSES = new Set<AttendanceStatus>([
  'PRESENT',
  'LATE',
  'ABSENT',
  'PENDING',
]);

export function isAttendanceTodayOnly(
  overview: AttendanceOverview,
  businessToday: BusinessDate,
): boolean {
  return overview.period.startDate === businessToday && overview.period.endDate === businessToday;
}

export function buildAttendanceTodayOperationalModel(
  overview: AttendanceOverview,
  businessToday: BusinessDate,
): AttendanceTodayOperationalModel | null {
  const day = overview.daily.find((item) => item.date === businessToday) ?? null;
  if (!day) return null;

  const employeesWithRecordedActivity = new Set<string>();
  const scheduledEmployeesWithActivity = new Set<string>();

  for (const employee of overview.employees) {
    const employeeDay = employee.days.find((item) => item.date === businessToday);
    if (!employeeDay) continue;

    if (employeeDay.firstClockIn) {
      employeesWithRecordedActivity.add(employee.employeeGuid);
      if (WORKING_DAY_OPERATIONAL_STATUSES.has(employeeDay.status)) {
        scheduledEmployeesWithActivity.add(employee.employeeGuid);
      }
    }
  }

  return {
    date: businessToday,
    teamSize: day.teamSize,
    scheduledWorkingEmployees:
      day.statusTotals.PRESENT +
      day.statusTotals.LATE +
      day.statusTotals.ABSENT +
      day.statusTotals.PENDING,
    scheduledEmployeesWithActivity: scheduledEmployeesWithActivity.size,
    employeesWithRecordedActivity: employeesWithRecordedActivity.size,
    notSeenScheduledEmployees: day.statusTotals.PENDING,
    onTimeObserved: day.statusTotals.PRESENT,
    lateObserved: day.statusTotals.LATE,
    confirmedAbsent: day.statusTotals.ABSENT,
    restDayEmployees: day.statusTotals.REST_DAY,
    undeterminedEmployees: day.statusTotals.UNDETERMINED,
    restDayWithPresenceEmployees: countDistinctIssueEmployees(
      overview,
      'PRESENCE_ON_REST_DAY',
      businessToday,
    ),
    openSessionEmployees: countDistinctIssueEmployees(overview, 'OPEN_SESSION', businessToday),
    issueCount: day.issueCount,
  };
}

function countDistinctIssueEmployees(
  overview: AttendanceOverview,
  issue: AttendanceIssue,
  date: BusinessDate,
): number {
  const summary = overview.issues.find((item) => item.issue === issue);
  if (!summary) return 0;

  return new Set(
    summary.occurrences
      .filter((occurrence) => occurrence.date === date)
      .map((occurrence) => occurrence.employeeGuid),
  ).size;
}
