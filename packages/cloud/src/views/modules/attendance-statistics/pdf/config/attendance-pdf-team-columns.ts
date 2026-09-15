import type { AttendancePdfPresentationLevel } from '../types/attendance-pdf.types.js';

export const ATTENDANCE_PDF_TEAM_COLUMN_KEYS = [
  'employee',
  'expected',
  'attended',
  'attended_vs_expected',
  'attendance_rate',
  'punctuality_rate',
  'absence_rate',
  'late_rate',
  'late',
  'absent',
  'pending',
  'undetermined',
  'rest_day',
  'net_duration',
  'net_vs_expected',
  'issue_rate',
  'issues',
] as const;

export type AttendancePdfTeamColumnKey = (typeof ATTENDANCE_PDF_TEAM_COLUMN_KEYS)[number];

/**
 * Colonnes conservées pour les exports spécialisés qui utilisent encore un niveau
 * de présentation. Les rapports principaux utilisent désormais des colonnes métier
 * dédiées à leur destinataire.
 */
export const ATTENDANCE_PDF_TEAM_COLUMNS_BY_PRESENTATION: Record<
  AttendancePdfPresentationLevel,
  readonly AttendancePdfTeamColumnKey[]
> = {
  simplified: ['employee', 'attendance_rate', 'late_rate', 'attended_vs_expected', 'net_duration', 'issue_rate'],
  optimized: [
    'employee',
    'attendance_rate',
    'late_rate',
    'attended_vs_expected',
    'net_duration',
    'issue_rate',
    'issues',
  ],
  detailed: [
    'employee',
    'attendance_rate',
    'punctuality_rate',
    'absence_rate',
    'late_rate',
    'attended_vs_expected',
    'net_duration',
    'issue_rate',
    'issues',
  ],
};

/** Rapport Direction : lecture en quelques minutes, sans colonne redondante. */
export const ATTENDANCE_PDF_DIRECTION_TEAM_COLUMNS: readonly AttendancePdfTeamColumnKey[] = [
  'employee',
  'attendance_rate',
  'late_rate',
  'attended_vs_expected',
  'net_vs_expected',
  'issue_rate',
];

/** Rapport Pilotage : même lecture rapide, avec le volume d'éléments à examiner. */
export const ATTENDANCE_PDF_PILOTAGE_TEAM_COLUMNS: readonly AttendancePdfTeamColumnKey[] = [
  'employee',
  'attendance_rate',
  'late_rate',
  'attended_vs_expected',
  'net_vs_expected',
  'issue_rate',
  'issues',
];

/** Rapport RH : lecture enrichie, mais sans exposer les statuts techniques secondaires. */
export const ATTENDANCE_PDF_HR_TEAM_COLUMNS: readonly AttendancePdfTeamColumnKey[] = [
  'employee',
  'attendance_rate',
  'punctuality_rate',
  'absence_rate',
  'late_rate',
  'attended_vs_expected',
  'net_vs_expected',
  'issue_rate',
  'issues',
];
