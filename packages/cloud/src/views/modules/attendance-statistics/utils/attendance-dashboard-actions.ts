import type { AttendanceStatus } from '../types/attendance-statistics.types.js';
import type { AttendanceKpiId } from './attendance-kpis.js';

export type AttendancePrimaryKpiId = Exclude<AttendanceKpiId, 'net_duration'>;

export type AttendanceDashboardAction =
  | {
      type: 'filter_employees';
      status: Extract<AttendanceStatus, 'ABSENT' | 'LATE'>;
      label: string;
    }
  | {
      type: 'show_issues';
      label: string;
    }
  | {
      type: 'show_all_employees_with_issues';
      label: string;
    };

export function isPrimaryAttendanceKpiId(id: AttendanceKpiId): id is AttendancePrimaryKpiId {
  return id !== 'net_duration';
}

export function getAttendanceKpiPrimaryAction(
  id: AttendancePrimaryKpiId,
): AttendanceDashboardAction | null {
  switch (id) {
    case 'attendance_rate':
      return { type: 'filter_employees', status: 'ABSENT', label: 'Voir les absences' };
    case 'punctuality_rate':
      return { type: 'filter_employees', status: 'LATE', label: 'Voir les retards' };
    case 'absences':
      return { type: 'filter_employees', status: 'ABSENT', label: 'Voir les employés absents' };
    case 'late_days':
      return { type: 'filter_employees', status: 'LATE', label: 'Voir les employés en retard' };
    case 'issues':
      return { type: 'show_issues', label: 'Examiner les éléments' };
  }
}
