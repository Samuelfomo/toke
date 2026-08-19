import type { BusinessDate } from '../types/attendance-statistics.types.js';
import type {
  AttendancePeriodPreset,
  AttendancePeriodRange,
} from '../types/attendance-statistics.ui.types.js';
import { isValidBusinessDate } from './business-date.js';

const DAY_MS = 86_400_000;

export function getAttendancePeriodForPreset(
  preset: AttendancePeriodPreset,
  businessToday: BusinessDate,
  currentCustomPeriod?: AttendancePeriodRange,
): AttendancePeriodRange {
  assertBusinessDate(businessToday);

  switch (preset) {
    case 'today':
      return { startDate: businessToday, endDate: businessToday };
    case 'current_week':
      return {
        startDate: addBusinessDays(businessToday, -(getIsoWeekday(businessToday) - 1)),
        endDate: businessToday,
      };
    case 'current_month':
      return { startDate: `${businessToday.slice(0, 7)}-01`, endDate: businessToday };
    case 'previous_month':
      return getPreviousMonthPeriod(businessToday);
    case 'custom':
      if (!currentCustomPeriod) {
        return { startDate: businessToday, endDate: businessToday };
      }
      assertBusinessDate(currentCustomPeriod.startDate);
      assertBusinessDate(currentCustomPeriod.endDate);
      return { ...currentCustomPeriod };
  }
}

export function getPreviousMonthPeriod(businessToday: BusinessDate): AttendancePeriodRange {
  assertBusinessDate(businessToday);
  const { year, month } = splitBusinessDate(businessToday);
  const previousMonthStart = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const startDate = buildBusinessDate(previousMonthStart.year, previousMonthStart.month, 1);
  const endDate = addBusinessDays(buildBusinessDate(year, month, 1), -1);
  return { startDate, endDate };
}

export function addBusinessDays(value: BusinessDate, days: number): BusinessDate {
  assertBusinessDate(value);
  const timestamp = toUtcTimestamp(value) + days * DAY_MS;
  return fromUtcTimestamp(timestamp);
}

export function getIsoWeekday(value: BusinessDate): number {
  assertBusinessDate(value);
  const weekday = new Date(toUtcTimestamp(value)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function describeAttendancePeriod(
  startDate: BusinessDate,
  endDate: BusinessDate,
  locale = 'fr-FR',
): string {
  assertBusinessDate(startDate);
  assertBusinessDate(endDate);

  const formatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  if (startDate === endDate) return formatter.format(new Date(toUtcTimestamp(startDate)));
  return `${formatter.format(new Date(toUtcTimestamp(startDate)))} – ${formatter.format(
    new Date(toUtcTimestamp(endDate)),
  )}`;
}

function assertBusinessDate(value: string): asserts value is BusinessDate {
  if (!isValidBusinessDate(value)) throw new Error(`Date métier invalide : ${value}`);
}

function splitBusinessDate(value: BusinessDate): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number);
  return { year: year!, month: month!, day: day! };
}

function buildBusinessDate(year: number, month: number, day: number): BusinessDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(
    2,
    '0',
  )}`;
}

function toUtcTimestamp(value: BusinessDate): number {
  const { year, month, day } = splitBusinessDate(value);
  return Date.UTC(year, month - 1, day);
}

function fromUtcTimestamp(timestamp: number): BusinessDate {
  const date = new Date(timestamp);
  return buildBusinessDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}
