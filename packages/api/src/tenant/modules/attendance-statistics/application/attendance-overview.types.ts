import type { AttendanceDay, BusinessDate } from '../domain/attendance-day.types.js';

export type OverviewAttendanceStatus = 'COMPUTABLE' | 'PARTIAL' | 'NOT_COMPUTABLE';

export type AttendanceUnavailabilityReason =
  | 'NO_EMPLOYEE_DAY'
  | 'INSUFFICIENT_SCHEDULE_DATA'
  | 'NO_FINALIZED_EXPECTED_WORK_DAY';

export type DataQualityStatus = 'RELIABLE' | 'PARTIAL' | 'INSUFFICIENT';

export type DurationCoverageStatus =
  | 'COMPLETE'
  | 'PARTIAL'
  | 'UNAVAILABLE'
  | 'NOT_APPLICABLE';

export type DataQualityReason =
  | 'NO_EMPLOYEE_DAY'
  | 'MISSING_SCHEDULE'
  | 'INVALID_SCHEDULE'
  | 'HISTORICAL_SCHEDULE_UNAVAILABLE'
  | 'AMBIGUOUS_SCHEDULE'
  | 'OPEN_SESSION'
  | 'INCOMPLETE_SESSION'
  | 'MISSING_DURATION';

export interface BuildAttendanceOverviewInput {
  period: {
    startDate: BusinessDate;
    endDate: BusinessDate;
  };
  managerGuid: string;
  generatedAt: string;
  businessTimezone: string;
  days: readonly AttendanceDay[];
}

/**
 * Contrat métier retourné dans `data` par
 * GET /attendance/statistics/overview.
 *
 * Les noms sont volontairement en snake_case : il s'agit du DTO HTTP, et non
 * du modèle interne de calcul.
 */
export interface AttendanceStatisticsOverview {
  period: {
    start_date: BusinessDate;
    end_date: BusinessDate;
    generated_at: string;
    business_timezone: string;
  };

  scope: {
    manager_guid: string;
    employees_evaluated: number;
    employee_days_evaluated: number;
  };

  attendance: {
    status: OverviewAttendanceStatus;
    unavailability_reason: AttendanceUnavailabilityReason | null;

    /** Dénominateur officiel des taux de présence et d'absence. */
    employee_working_days_expected: number;
    present_employee_days: number;
    late_employee_days: number;
    absent_employee_days: number;

    attendance_rate: number | null;
    absence_rate: number | null;
    punctuality_rate: number | null;

    total_delay_minutes: number;
    average_delay_minutes: number | null;
  };

  recorded_activity: {
    employees_with_activity: number;
    employee_days_with_activity: number;

    sessions: {
      total: number;
      open: number;
      incomplete: number;
    };

    /**
     * Sommes fondées uniquement sur les journées dont les durées sont
     * complètes. En couverture partielle, elles ne représentent donc pas le
     * total réel de toute la période.
     */
    durations: {
      known_gross_minutes: number | null;
      known_pause_minutes: number | null;
      known_net_minutes: number | null;
    };
  };

  signals: {
    presence_on_rest_day_employee_days: number;
    presence_without_schedule_employee_days: number;
  };

  data_quality: {
    status: DataQualityStatus;
    reasons: DataQualityReason[];

    schedule: {
      resolved_employee_days: number;
      unresolved_employee_days: number;
      missing_schedule_employee_days: number;
      invalid_schedule_employee_days: number;
      historical_schedule_unavailable_employee_days: number;
      ambiguous_schedule_employee_days: number;
      coverage_rate: number | null;
    };

    duration: {
      status: DurationCoverageStatus;
      employee_days_with_activity: number;
      complete_employee_days: number;
      incomplete_employee_days: number;
      coverage_rate: number | null;
    };
  };
}
