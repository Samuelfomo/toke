import type { AttendanceStatus } from '../types/attendance-statistics.types.js';

export const ATTENDANCE_PRIMARY_KPI_IDS = [
  'attendance_rate',
  'punctuality_rate',
  'adoption_rate',
] as const;

export type AttendancePrimaryKpiId = (typeof ATTENDANCE_PRIMARY_KPI_IDS)[number];

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

export function isPrimaryAttendanceKpiId(id: string): id is AttendancePrimaryKpiId {
  return (ATTENDANCE_PRIMARY_KPI_IDS as readonly string[]).includes(id);
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
        label: 'Voir les rotations non couvertes',
      };
    case 'punctuality_rate':
      return {
        type: 'filter_employees',
        status: 'LATE',
        rateEligible: true,
        label: 'Voir les rotations commencées en retard',
      };
    case 'adoption_rate':
      return null;
  }
}
