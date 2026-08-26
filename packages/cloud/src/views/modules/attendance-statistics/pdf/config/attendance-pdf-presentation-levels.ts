import type {
  AttendancePdfExportMode,
  AttendancePdfPresentationLevel,
  AttendancePdfPresentationProfile,
} from '../types/attendance-pdf.types.js';

export const ATTENDANCE_PDF_PRESENTATION_PROFILES: Record<
  AttendancePdfPresentationLevel,
  AttendancePdfPresentationProfile
> = {
  simplified: {
    level: 'simplified',
    label: 'Simplifié',
    description: "Expose les signaux essentiels sans dérouler les occurrences détaillées.",
    issueDetails: 'none',
    issueOccurrenceLimitPerType: 0,
  },
  optimized: {
    level: 'optimized',
    label: 'Optimisé',
    description: "Privilégie la décision : synthèse complète et échantillon exploitable des occurrences.",
    issueDetails: 'limited',
    issueOccurrenceLimitPerType: 5,
  },
  detailed: {
    level: 'detailed',
    label: 'Détaillé',
    description: "Expose tout le détail disponible dans le snapshot API, sans inventer les occurrences absentes.",
    issueDetails: 'all',
    issueOccurrenceLimitPerType: null,
  },
};

export const DEFAULT_ATTENDANCE_PDF_PRESENTATION_LEVEL_BY_MODE: Record<
  AttendancePdfExportMode,
  AttendancePdfPresentationLevel
> = {
  period_summary: 'optimized',
  full_report: 'optimized',
  current_analysis: 'optimized',
  issues_only: 'optimized',
  employee_sheet: 'optimized',
};

export function getAttendancePdfPresentationProfile(
  level: AttendancePdfPresentationLevel,
): AttendancePdfPresentationProfile {
  return ATTENDANCE_PDF_PRESENTATION_PROFILES[level];
}

export function resolveAttendancePdfPresentationLevel(input: {
  mode: AttendancePdfExportMode;
  requestedLevel?: AttendancePdfPresentationLevel;
}): AttendancePdfPresentationLevel {
  return input.requestedLevel ?? DEFAULT_ATTENDANCE_PDF_PRESENTATION_LEVEL_BY_MODE[input.mode];
}
