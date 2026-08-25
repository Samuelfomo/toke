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
    label: 'Synthèse de la période',
    description: 'Rapport court pour lecture direction, réunion ou partage rapide.',
    sections: [
      'executive_summary',
      'data_quality',
      'trend',
      'issues',
      'secondary_insights',
    ],
    tocWhenPageCountAtLeast: null,
    targetPageRange: { min: 2, max: 3 },
  },
  full_report: {
    mode: 'full_report',
    label: 'Rapport complet',
    description: 'Rapport de référence avec synthèse, évolution, anomalies et vue équipe.',
    sections: [
      'executive_summary',
      'data_quality',
      'trend',
      'issues',
      'team',
      'employee_details',
      'secondary_insights',
    ],
    tocWhenPageCountAtLeast: ATTENDANCE_PDF_PAGINATION_TARGETS.tocThresholdPages,
    targetPageRange: { min: 4, max: null },
  },
  current_analysis: {
    mode: 'current_analysis',
    label: 'Analyse en cours',
    description: 'Exporte le contexte de drill-down actuellement sélectionné dans le dashboard.',
    sections: ['executive_summary', 'data_quality', 'issues', 'team'],
    tocWhenPageCountAtLeast: null,
    targetPageRange: { min: 1, max: null },
  },
  issues_only: {
    mode: 'issues_only',
    label: 'Éléments à examiner',
    description: 'Rapport opérationnel dédié aux anomalies et aux occurrences concernées.',
    sections: ['executive_summary', 'data_quality', 'issues'],
    tocWhenPageCountAtLeast: null,
    targetPageRange: { min: 1, max: null },
  },
  employee_sheet: {
    mode: 'employee_sheet',
    label: "Fiche d'un employé",
    description: 'Fiche individuelle sur la période avec synthèse et détail journalier.',
    sections: ['executive_summary', 'data_quality', 'employee_details'],
    tocWhenPageCountAtLeast: null,
    targetPageRange: { min: 1, max: 3 },
  },
};

export function getAttendancePdfExportProfile(mode: AttendancePdfExportMode): AttendancePdfExportProfile {
  return ATTENDANCE_PDF_EXPORT_PROFILES[mode];
}
