import type {
  AttendanceEmployeeDayOverview,
  AttendanceOverview,
  AttendanceIssueOccurrence,
  BusinessDate,
} from '@/views/modules/attendance-statistics';

export const ATTENDANCE_EMPLOYEE_DAY_PAGE_SIZES = [14, 31, 62] as const;
export type AttendanceEmployeeDayPageSize = (typeof ATTENDANCE_EMPLOYEE_DAY_PAGE_SIZES)[number];

export type AttendanceVolumeLevel = 'standard' | 'large' | 'very_large';

export interface AttendanceVolumeProfile {
  level: AttendanceVolumeLevel;
  teamSize: number;
  periodDayCount: number;
  employeeDayRecordCount: number;
  detailedIssueOccurrenceCount: number;
  estimatedRenderedRecordCount: number;
  usesEmployeePagination: boolean;
  usesDayPagination: boolean;
  usesCompactChart: boolean;
  messages: string[];
}

export interface AttendanceEmployeeDayPageModel {
  rows: AttendanceEmployeeDayOverview[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  from: number;
  to: number;
}

export interface AttendanceDateNavigationItem {
  date: BusinessDate;
  dateLabel: string;
}

/**
 * Décrit uniquement le volume de rendu de la réponse déjà calculée par l'API.
 * Aucun statut, taux, compteur métier ou durée n'est recalculé ici.
 */
export function buildAttendanceVolumeProfile(overview: AttendanceOverview): AttendanceVolumeProfile {
  const employeeDayRecordCount = overview.employees.reduce(
    (sum, employee) => sum + employee.days.length,
    0,
  );
  const detailedIssueOccurrenceCount = overview.issues.reduce(
    (sum, issue) => sum + issue.occurrences.length,
    0,
  );
  const estimatedRenderedRecordCount =
    overview.daily.length + employeeDayRecordCount + detailedIssueOccurrenceCount;

  const veryLarge =
    overview.scope.teamSize >= 250 ||
    employeeDayRecordCount >= 50_000 ||
    estimatedRenderedRecordCount >= 60_000;
  const large =
    veryLarge ||
    overview.scope.teamSize >= 80 ||
    overview.period.dayCount >= 92 ||
    employeeDayRecordCount >= 10_000 ||
    estimatedRenderedRecordCount >= 12_000;

  const level: AttendanceVolumeLevel = veryLarge
    ? 'very_large'
    : large
      ? 'large'
      : 'standard';

  const messages: string[] = [];
  if (overview.scope.teamSize >= 80) {
    messages.push(`${overview.scope.teamSize} employés sont présents dans le périmètre chargé.`);
  }
  if (overview.period.dayCount >= 92) {
    messages.push(`La période contient ${overview.period.dayCount} jours.`);
  }
  if (employeeDayRecordCount >= 10_000) {
    messages.push(`${employeeDayRecordCount} lignes journalières individuelles sont disponibles.`);
  }
  if (veryLarge) {
    messages.push(
      "Le rendu reste paginé, mais la taille du payload dépend encore de l'endpoint d'overview global.",
    );
  }

  return {
    level,
    teamSize: overview.scope.teamSize,
    periodDayCount: overview.period.dayCount,
    employeeDayRecordCount,
    detailedIssueOccurrenceCount,
    estimatedRenderedRecordCount,
    usesEmployeePagination: overview.employees.length > 10,
    usesDayPagination: overview.employees.some((employee) => employee.days.length > 31),
    usesCompactChart: overview.daily.length > 31,
    messages,
  };
}

export function buildAttendanceEmployeeDayPage(input: {
  days: readonly AttendanceEmployeeDayOverview[];
  page: number;
  pageSize: number;
}): AttendanceEmployeeDayPageModel {
  const sortedDays = [...input.days].sort((left, right) => right.date.localeCompare(left.date));
  const pageSize = normalizeEmployeeDayPageSize(input.pageSize);
  const pageCount = Math.max(1, Math.ceil(sortedDays.length / pageSize));
  const page = clampInteger(input.page, 1, pageCount);
  const start = (page - 1) * pageSize;

  return {
    rows: sortedDays.slice(start, start + pageSize),
    total: sortedDays.length,
    page,
    pageSize,
    pageCount,
    from: sortedDays.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, sortedDays.length),
  };
}

export function findAttendanceEmployeeDayPage(
  days: readonly AttendanceEmployeeDayOverview[],
  focusDate: BusinessDate,
  pageSize: number,
): number {
  const sortedDays = [...days].sort((left, right) => right.date.localeCompare(left.date));
  const index = sortedDays.findIndex((day) => day.date === focusDate);
  if (index < 0) return 1;
  return Math.floor(index / normalizeEmployeeDayPageSize(pageSize)) + 1;
}

export function normalizeEmployeeDayPageSize(value: number): number {
  if (!Number.isFinite(value)) return 31;
  const normalized = Math.trunc(value);
  if (ATTENDANCE_EMPLOYEE_DAY_PAGE_SIZES.includes(normalized as AttendanceEmployeeDayPageSize)) {
    return normalized;
  }
  return 31;
}

/**
 * Limite la quantité de boutons de dates rendus simultanément.
 * Le sélecteur natif du composant conserve l'accès à toutes les dates.
 */
export function buildAttendanceDateNavigationWindow<T extends AttendanceDateNavigationItem>(input: {
  points: readonly T[];
  selectedDate: BusinessDate | null;
  maxVisible?: number;
}): T[] {
  const maxVisible = clampInteger(input.maxVisible ?? 15, 3, 31);
  if (input.points.length <= maxVisible) return [...input.points];

  const selectedIndex = Math.max(
    0,
    input.points.findIndex((point) => point.date === input.selectedDate),
  );
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(0, selectedIndex - half);
  start = Math.min(start, input.points.length - maxVisible);
  return input.points.slice(start, start + maxVisible);
}

export function getAttendanceDailyChartPointSpacing(pointCount: number): number {
  if (pointCount > 180) return 12;
  if (pointCount > 90) return 18;
  if (pointCount > 31) return 28;
  return 44;
}

export function getNextVisibleAttendanceOccurrenceCount(input: {
  occurrences: readonly AttendanceIssueOccurrence[];
  currentVisibleCount: number;
  step?: number;
}): number {
  const step = clampInteger(input.step ?? 10, 1, 50);
  return Math.min(
    input.occurrences.length,
    Math.max(0, Math.trunc(input.currentVisibleCount)) + step,
  );
}

function clampInteger(value: number, min: number, max: number): number {
  const normalized = Number.isFinite(value) ? Math.trunc(value) : min;
  return Math.min(max, Math.max(min, normalized));
}
