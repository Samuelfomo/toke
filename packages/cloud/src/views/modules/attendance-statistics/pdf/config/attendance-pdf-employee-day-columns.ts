import type { AttendancePdfPresentationLevel } from '../types/attendance-pdf.types.js';

export const ATTENDANCE_PDF_EMPLOYEE_DAY_COLUMN_KEYS = [
  'date',
  'status',
  'clock_in',
  'clock_out',
  'delay',
  'gross_duration',
  'pause_duration',
  'net_duration',
  'issues',
] as const;

export type AttendancePdfEmployeeDayColumnKey =
  (typeof ATTENDANCE_PDF_EMPLOYEE_DAY_COLUMN_KEYS)[number];

export const ATTENDANCE_PDF_EMPLOYEE_DAY_COLUMNS_BY_PRESENTATION: Record<
  AttendancePdfPresentationLevel,
  readonly AttendancePdfEmployeeDayColumnKey[]
> = {
  simplified: ['date', 'status', 'issues'],
  optimized: ['date', 'status', 'clock_in', 'clock_out', 'delay', 'net_duration', 'issues'],
  detailed: [
    'date',
    'status',
    'clock_in',
    'clock_out',
    'delay',
    'gross_duration',
    'pause_duration',
    'net_duration',
    'issues',
  ],
};
