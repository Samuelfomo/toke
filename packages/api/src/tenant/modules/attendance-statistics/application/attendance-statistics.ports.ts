import type {
  AttendanceDayActivityInput,
  AttendanceDaySchedule,
  BusinessDate,
  BusinessTime,
} from '../domain/attendance-day.types.js';
import type { AttendanceOverviewEmployeeIdentity } from './attendance-overview.types.js';

export interface ManagerTeamScope {
  managerId: number;
  managerGuid: string;
  employees: AttendanceOverviewEmployeeIdentity[];
}

export interface ResolvedAttendanceSite {
  id: number;
  guid: string;
}

export interface AttendanceBusinessNow {
  date: BusinessDate;
  time: BusinessTime;
  iso: string;
}

export interface AttendanceActivityQuery {
  employeeIds: readonly number[];
  startDate: BusinessDate;
  endDate: BusinessDate;
  siteId: number | null;
}

export interface AttendanceStatisticsPort {
  loadCurrentManagerTeam(managerGuid: string): Promise<ManagerTeamScope | null>;
  resolveSite(siteGuid: string): Promise<ResolvedAttendanceSite | null>;
  loadActivities(
    query: AttendanceActivityQuery,
  ): Promise<ReadonlyMap<string, AttendanceDayActivityInput>>;
  resolveSchedule(employeeId: number, date: BusinessDate): Promise<AttendanceDaySchedule>;
  getBusinessNow(): AttendanceBusinessNow;
}

export function attendanceActivityKey(employeeId: number, date: BusinessDate): string {
  return `${employeeId}:${date}`;
}
