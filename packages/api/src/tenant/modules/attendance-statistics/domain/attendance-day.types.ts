export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'REST_DAY'
  | 'UNDETERMINED'
  | 'PENDING';

export type ScheduleState = 'WORK_DAY' | 'REST_DAY' | 'UNRESOLVED';

export type ScheduleSource = 'DIRECT' | 'ROTATION' | 'DEFAULT' | 'EXCEPTION';

export type ScheduleResolutionIssue =
  | 'MISSING_SCHEDULE'
  | 'INVALID_SCHEDULE'
  | 'HISTORICAL_SCHEDULE_UNAVAILABLE'
  | 'AMBIGUOUS_SCHEDULE';

export type AttendanceIssue =
  | 'PRESENCE_ON_REST_DAY'
  | 'PRESENCE_WITHOUT_SCHEDULE'
  | ScheduleResolutionIssue
  | 'OPEN_SESSION'
  | 'INCOMPLETE_SESSION'
  | 'MISSING_DURATION';

/**
 * Date métier. La valeur reste une chaîne et n'est pas reconvertie en UTC.
 * Le service appelant doit fournir le format YYYY-MM-DD.
 */
export type BusinessDate = string;

/**
 * Heure métier au format HH:mm ou HH:mm:ss.
 * La classification travaille à la minute et ignore les secondes.
 */
export type BusinessTime = string;

export interface ExpectedWorkBlock {
  startTime: BusinessTime;
  endTime: BusinessTime;
  toleranceMinutes: number;
}

export interface WorkDaySchedule {
  state: 'WORK_DAY';
  source: ScheduleSource;
  expectedBlocks: readonly ExpectedWorkBlock[];
}

export interface RestDaySchedule {
  state: 'REST_DAY';
  source: ScheduleSource;
  expectedBlocks: readonly [];
}

export interface UnresolvedSchedule {
  state: 'UNRESOLVED';
  source: ScheduleSource | null;
  expectedBlocks: readonly [];
  issue: ScheduleResolutionIssue;
}

export type AttendanceDaySchedule =
  | WorkDaySchedule
  | RestDaySchedule
  | UnresolvedSchedule;

/**
 * Activité déjà agrégée pour un seul couple employé × journée métier.
 * incompleteSessionCount exclut les sessions OPEN afin de ne pas les compter deux fois.
 */
export interface AttendanceDayActivityInput {
  sessionCount: number;
  openSessionCount: number;
  incompleteSessionCount: number;
  firstClockIn: BusinessTime | null;
  lastClockOut: BusinessTime | null;
  grossMinutes: number | null;
  pauseMinutes: number | null;
}

export interface AttendanceDayActivity extends AttendanceDayActivityInput {
  hasActivity: boolean;
  netMinutes: number | null;
}

export interface AttendanceDayResult {
  status: AttendanceStatus;
  delayMinutes: number | null;

  /**
   * Indique si cette journée entre dans le dénominateur
   * employee_working_days_expected.
   */
  rateEligible: boolean;
}

export interface AttendanceDay {
  employeeId: number;
  employeeGuid: string;
  date: BusinessDate;
  schedule: AttendanceDaySchedule;
  activity: AttendanceDayActivity;
  result: AttendanceDayResult;
  issues: AttendanceIssue[];
}

export interface CreateAttendanceDayInput {
  employeeId: number;
  employeeGuid: string;
  date: BusinessDate;
  schedule: AttendanceDaySchedule;
  activity: AttendanceDayActivityInput;

  /**
   * Doit être calculé dans le fuseau métier à partir de la fin du dernier
   * bloc attendu. La fonction de classification ne manipule aucun Date.
   */
  hasExpectedWorkDayEnded: boolean;
}
