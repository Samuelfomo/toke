import type {
  AttendancePdfExportMode,
  AttendancePdfExportProfile,
} from '../types/attendance-pdf.types.js';
import { ATTENDANCE_PDF_PAGINATION_TARGETS } from './attendance-pdf-layout.js';

export const ATTENDANCE_PDF_EXPORT_PROFILES: Record<
  AttendancePdfExportMode,
  AttendancePdfExportProfile
> = {
  period_summary: {
    mode: 'period_summary',
    label: 'Rapport Direction',
    description: "Lecture décisionnelle courte : état global de l'équipe et situation de chaque collaborateur en quelques minutes.",
    sections: ['executive_summary', 'team'],
    tocWhenPageCountAtLeast: null,
    targetPageRange: { min: 1, max: 2 },
  },
  full_report: {
    mode: 'full_report',
    label: 'Rapport Pilotage',
    description: "Rapport manager : synthèse, vue équipe, évolution de la période et éléments à examiner.",
    sections: ['executive_summary', 'team', 'trend', 'issues'],
    tocWhenPageCountAtLeast: null,
    targetPageRange: { min: 2, max: 4 },
  },
  hr_complete: {
    mode: 'hr_complete',
    label: 'Rapport RH complet',
    description: "Rapport d'analyse RH : synthèse, équipe, évolution et éléments à examiner avec une profondeur supérieure au pilotage.",
    sections: ['executive_summary', 'team', 'trend', 'issues', 'employee_details'],
    tocWhenPageCountAtLeast: ATTENDANCE_PDF_PAGINATION_TARGETS.tocThresholdPages,
    targetPageRange: { min: 3, max: null },
  },
  current_analysis: {
    mode: 'current_analysis',
    label: 'Analyse en cours',
    description: 'Exporte le contexte de drill-down actuellement sélectionné dans le dashboard.',
    sections: ['analysis_context', 'team'],
    tocWhenPageCountAtLeast: null,
    targetPageRange: { min: 1, max: null },
  },
  issues_only: {
    mode: 'issues_only',
    label: 'Éléments à examiner',
    description: 'Rapport opérationnel dédié aux éléments à examiner et aux occurrences concernées.',
    sections: ['issues'],
    tocWhenPageCountAtLeast: null,
    targetPageRange: { min: 1, max: null },
  },
  employee_sheet: {
    mode: 'employee_sheet',
    label: 'Fiche employé / Investigation',
    description: "Analyse détaillée d'un collaborateur sur la période : statuts, horaires, retards, durées et éléments à examiner.",
    sections: ['employee_details'],
    tocWhenPageCountAtLeast: null,
    targetPageRange: { min: 1, max: null },
  },
};

export function getAttendancePdfExportProfile(mode: AttendancePdfExportMode): AttendancePdfExportProfile {
  return ATTENDANCE_PDF_EXPORT_PROFILES[mode];
}
