import type { AttendancePdfPresentationLevel } from '../types/attendance-pdf.types.js';

export const ATTENDANCE_PDF_TEAM_COLUMN_KEYS = [
  'employee',
  'expected',
  'attended',
  'attendance_rate',
  'punctuality_rate',
  'late',
  'absent',
  'pending',
  'undetermined',
  'rest_day',
  'net_duration',
  'issues',
] as const;

export type AttendancePdfTeamColumnKey = (typeof ATTENDANCE_PDF_TEAM_COLUMN_KEYS)[number];

/**
 * Les colonnes visibles dépendent du niveau de présentation, jamais d'un score de performance.
 * Le PDF conserve l'ordre alphabétique des collaborateurs pour éviter tout classement implicite.
 */
export const ATTENDANCE_PDF_TEAM_COLUMNS_BY_PRESENTATION: Record<
  AttendancePdfPresentationLevel,
  readonly AttendancePdfTeamColumnKey[]
> = {
  simplified: ['employee', 'attendance_rate', 'late', 'absent', 'issues'],
  optimized: [
    'employee',
    'expected',
    'attended',
    'attendance_rate',
    'punctuality_rate',
    'late',
    'absent',
    'issues',
  ],
  detailed: [
    'employee',
    'expected',
    'attended',
    'attendance_rate',
    'punctuality_rate',
    'late',
    'absent',
    'pending',
    'undetermined',
    'rest_day',
    'net_duration',
    'issues',
  ],
};


/**
 * Vue compacte dédiée au rapport complet simplifié orienté contrôle de paie.
 * Elle privilégie le volume de présence et la durée nette enregistrée sans exposer
 * le détail quotidien ni transformer cette durée en heures payables.
 */
export const ATTENDANCE_PDF_SIMPLIFIED_PAYROLL_TEAM_COLUMNS: readonly AttendancePdfTeamColumnKey[] = [
  'employee',
  'attendance_rate',
  'late',
  'absent',
  'net_duration',
  'issues',
];
