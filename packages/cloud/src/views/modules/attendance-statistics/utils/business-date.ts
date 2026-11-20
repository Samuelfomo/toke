import type {
  AttendanceStatisticsFilters,
  AttendanceStatisticsValidationError,
  BusinessDate,
} from '../types/attendance-statistics.types.js';

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_ATTENDANCE_PERIOD_DAYS = 366;

export type AttendanceFiltersValidationResult =
  | { ok: true }
  | { ok: false; error: AttendanceStatisticsValidationError };

/**
 * Vérifie une date métier sans conversion UTC ni dépendance au fuseau du navigateur.
 */
export function isValidBusinessDate(value: string): value is BusinessDate {
  if (!BUSINESS_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year!, month! - 1, day!);
  const parsed = new Date(timestamp);

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

/**
 * Construit une date métier à partir d'une date locale choisie dans l'interface.
 * N'utilise volontairement pas toISOString(), afin d'éviter le décalage de journée.
 */
export function localDateToBusinessDate(date: Date): BusinessDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Crée une Date uniquement pour les composants de calendrier locaux.
 * Ne pas utiliser le résultat pour afficher une heure fournie par le serveur.
 */
export function businessDateToLocalDate(value: BusinessDate): Date {
  if (!isValidBusinessDate(value)) {
    throw new Error(`Date métier invalide : ${value}`);
  }
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

export function countBusinessDaysInclusive(startDate: BusinessDate, endDate: BusinessDate): number {
  if (!isValidBusinessDate(startDate) || !isValidBusinessDate(endDate)) {
    throw new Error('La période contient une date métier invalide');
  }
  return Math.round((toUtc(endDate) - toUtc(startDate)) / 86_400_000) + 1;
}

export function getBusinessMonthPeriod(today: BusinessDate): {
  startDate: BusinessDate;
  endDate: BusinessDate;
} {
  if (!isValidBusinessDate(today)) {
    throw new Error(`Date métier courante invalide : ${today}`);
  }
  return {
    startDate: `${today.slice(0, 7)}-01`,
    endDate: today,
  };
}

export function formatBusinessDate(
  value: BusinessDate,
  locale = 'fr-FR',
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  },
): string {
  const localDate = businessDateToLocalDate(value);
  return new Intl.DateTimeFormat(locale, options).format(localDate);
}

export function validateAttendanceStatisticsFilters(
  filters: AttendanceStatisticsFilters,
  businessToday?: BusinessDate,
): AttendanceFiltersValidationResult {
  if (!filters.managerGuid.trim()) {
    return fail('manager_required', 'Le GUID du manager est obligatoire', 'managerGuid');
  }

  const startValidation = validateDateField(filters.startDate, 'startDate');
  if (!startValidation.ok) return startValidation;

  const endValidation = validateDateField(filters.endDate, 'endDate');
  if (!endValidation.ok) return endValidation;

  if (filters.startDate > filters.endDate) {
    return fail(
      'invalid_date_range',
      'La date de début doit être antérieure ou égale à la date de fin',
      'startDate',
    );
  }

  if (businessToday !== undefined) {
    if (!isValidBusinessDate(businessToday)) {
      throw new Error(`Date métier courante invalide : ${businessToday}`);
    }
    if (filters.endDate > businessToday) {
      return fail(
        'future_date_not_allowed',
        'La date de fin ne peut pas être postérieure à la date métier courante',
        'endDate',
      );
    }
  }

  const periodDays = countBusinessDaysInclusive(filters.startDate, filters.endDate);
  if (periodDays > MAX_ATTENDANCE_PERIOD_DAYS) {
    return fail(
      'period_too_large',
      `La période ne peut pas dépasser ${MAX_ATTENDANCE_PERIOD_DAYS} jours`,
      'endDate',
    );
  }

  return { ok: true };
}

function validateDateField(
  value: string,
  field: 'startDate' | 'endDate',
): AttendanceFiltersValidationResult {
  if (!BUSINESS_DATE_PATTERN.test(value)) {
    return fail(
      'invalid_date_format',
      `${field === 'startDate' ? 'La date de début' : 'La date de fin'} doit respecter le format YYYY-MM-DD`,
      field,
    );
  }
  if (!isValidBusinessDate(value)) {
    return fail(
      'invalid_date_value',
      `${field === 'startDate' ? 'La date de début' : 'La date de fin'} n'est pas valide`,
      field,
    );
  }
  return { ok: true };
}

function fail(
  code: AttendanceStatisticsValidationError['code'],
  message: string,
  field?: AttendanceStatisticsValidationError['field'],
): AttendanceFiltersValidationResult {
  return {
    ok: false,
    error: field ? { code, message, field } : { code, message },
  };
}

function toUtc(value: BusinessDate): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!);
}
