import type { AttendanceStatus } from '../types/attendance-statistics.types.js';
import type { AttendanceKpiId } from './attendance-kpis.js';

export type AttendancePrimaryKpiId = Exclude<AttendanceKpiId, 'net_duration'>;

export type AttendanceDashboardAction =
  | {
      type: 'filter_employees';
      status: Extract<AttendanceStatus, 'ABSENT' | 'LATE'>;
      /** null = tous les statuts observés ; true/false = filtre exact sur day.rateEligible. */
      rateEligible: boolean | null;
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
      return {
        type: 'filter_employees',
        status: 'ABSENT',
        rateEligible: true,
        label: 'Voir les absences prises en compte',
      };
    case 'punctuality_rate':
      return {
        type: 'filter_employees',
        status: 'LATE',
        rateEligible: true,
        label: 'Voir les retards pris en compte',
      };
    case 'absences':
      return {
        type: 'filter_employees',
        status: 'ABSENT',
        rateEligible: true,
        label: 'Voir les employés absents',
      };
    case 'late_days':
      return {
        type: 'filter_employees',
        status: 'LATE',
        rateEligible: null,
        label: 'Voir tous les retards observés',
      };
    case 'issues':
      return { type: 'show_issues', label: 'Examiner les éléments' };
  }
}
