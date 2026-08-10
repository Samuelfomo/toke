import type { BusinessDate } from '../domain/attendance-day.types.js';

export interface AttendanceOverviewQuery {
  managerGuid: string;
  siteGuid: string | null;
  startDate: BusinessDate;
  endDate: BusinessDate;
}

export interface AttendanceOverviewQueryError {
  code:
    | 'manager_required'
    | 'invalid_query_value'
    | 'date_pair_required'
    | 'invalid_date_format'
    | 'invalid_date_value'
    | 'invalid_date_range'
    | 'future_date_not_allowed'
    | 'period_too_large';
  message: string;
  field?: 'manager' | 'site' | 'start_date' | 'end_date';
}

export type AttendanceOverviewQueryResult =
  | { ok: true; value: AttendanceOverviewQuery }
  | { ok: false; error: AttendanceOverviewQueryError };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PERIOD_DAYS = 366;

export function parseAttendanceOverviewQuery(
  query: Record<string, unknown>,
  today: BusinessDate,
): AttendanceOverviewQueryResult {
  const manager = readSingleString(query.manager);
  if (manager.kind === 'invalid') {
    return fail('invalid_query_value', 'manager doit être une chaîne unique', 'manager');
  }
  if (manager.value === null || manager.value.length === 0) {
    return fail('manager_required', 'Le GUID du manager est obligatoire', 'manager');
  }

  const site = readSingleString(query.site);
  if (site.kind === 'invalid') {
    return fail('invalid_query_value', 'site doit être une chaîne unique', 'site');
  }

  const start = readSingleString(query.start_date);
  const end = readSingleString(query.end_date);
  if (start.kind === 'invalid') {
    return fail('invalid_query_value', 'start_date doit être une chaîne unique', 'start_date');
  }
  if (end.kind === 'invalid') {
    return fail('invalid_query_value', 'end_date doit être une chaîne unique', 'end_date');
  }

  const hasStart = start.value !== null && start.value !== '';
  const hasEnd = end.value !== null && end.value !== '';
  if (hasStart !== hasEnd) {
    return fail(
      'date_pair_required',
      'start_date et end_date doivent être fournis ensemble',
      hasStart ? 'end_date' : 'start_date',
    );
  }

  const startDate = hasStart ? start.value! : `${today.slice(0, 7)}-01`;
  const endDate = hasEnd ? end.value! : today;

  const startValidation = validateBusinessDate(startDate, 'start_date');
  if (!startValidation.ok) return startValidation;
  const endValidation = validateBusinessDate(endDate, 'end_date');
  if (!endValidation.ok) return endValidation;

  if (startDate > endDate) {
    return fail(
      'invalid_date_range',
      'start_date doit être antérieure ou égale à end_date',
      'start_date',
    );
  }

  if (endDate > today) {
    return fail(
      'future_date_not_allowed',
      'end_date ne peut pas être postérieure à la date métier courante',
      'end_date',
    );
  }

  const periodDays = differenceInDays(startDate, endDate) + 1;
  if (periodDays > MAX_PERIOD_DAYS) {
    return fail(
      'period_too_large',
      `La période ne peut pas dépasser ${MAX_PERIOD_DAYS} jours`,
      'end_date',
    );
  }

  return {
    ok: true,
    value: {
      managerGuid: manager.value,
      siteGuid: site.value && site.value.length > 0 ? site.value : null,
      startDate,
      endDate,
    },
  };
}

function validateBusinessDate(
  value: string,
  field: 'start_date' | 'end_date',
): AttendanceOverviewQueryResult | { ok: true } {
  if (!DATE_PATTERN.test(value)) {
    return fail(
      'invalid_date_format',
      `${field} doit respecter le format YYYY-MM-DD`,
      field,
    );
  }

  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year!, month! - 1, day!);
  const date = new Date(timestamp);
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day;

  if (!isValid) {
    return fail('invalid_date_value', `${field} n'est pas une date valide`, field);
  }

  return { ok: true };
}

function differenceInDays(startDate: string, endDate: string): number {
  return Math.round((toUtc(startDate) - toUtc(endDate)) / -86_400_000);
}

function toUtc(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

function readSingleString(value: unknown):
  | { kind: 'ok'; value: string | null }
  | { kind: 'invalid' } {
  if (value === undefined || value === null) return { kind: 'ok', value: null };
  if (typeof value !== 'string') return { kind: 'invalid' };
  return { kind: 'ok', value: value.trim() };
}

function fail(
  code: AttendanceOverviewQueryError['code'],
  message: string,
  field?: AttendanceOverviewQueryError['field'],
): { ok: false; error: AttendanceOverviewQueryError } {
  return {
    ok: false,
    error: field ? { code, message, field } : { code, message },
  };
}
