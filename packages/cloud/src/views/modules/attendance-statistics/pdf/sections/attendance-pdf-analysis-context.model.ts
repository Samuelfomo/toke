import { getAttendanceAnalysisEmployeeCount, getAttendanceAnalysisSourceLabel } from '../../utils/attendance-analysis-context.js';
import { buildAttendanceDataQualityPresentation } from '../../utils/attendance-data-quality.js';
import { ATTENDANCE_ISSUE_PRESENTATION, ATTENDANCE_STATUS_PRESENTATION } from '../../utils/attendance-status.js';
import { formatBusinessDate } from '../../utils/business-date.js';
import type { AttendancePdfReportContract } from '../types/attendance-pdf.types.js';

export interface AttendancePdfAnalysisContextModel {
  title: string;
  sourceLabel: string;
  analysisLabel: string;
  dateLabel: string | null;
  statusLabel: string | null;
  issueLabel: string | null;
  employeeLabel: string | null;
  employeeCount: number;
  qualityLabel: string;
  qualityMessage: string;
}

export function buildAttendancePdfAnalysisContextModel(
  contract: AttendancePdfReportContract,
): AttendancePdfAnalysisContextModel {
  if (contract.request.mode !== 'current_analysis') {
    throw new TypeError("Le contexte d'analyse PDF exige un export current_analysis.");
  }

  const context = contract.request.analysisContext;
  const quality = buildAttendanceDataQualityPresentation(contract.request.overview.dataQuality);
  return {
    title: 'Analyse en cours',
    sourceLabel: getAttendanceAnalysisSourceLabel(context.source),
    analysisLabel: context.label,
    dateLabel: context.date ? formatBusinessDate(context.date, 'fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null,
    statusLabel: context.status ? ATTENDANCE_STATUS_PRESENTATION[context.status].label : null,
    issueLabel: context.issue ? ATTENDANCE_ISSUE_PRESENTATION[context.issue].label : null,
    employeeLabel: context.employeeName,
    employeeCount: getAttendanceAnalysisEmployeeCount(contract.request.overview, context),
    qualityLabel:
      quality.level === 'reliable'
        ? 'Données fiables pour le taux de présence'
        : quality.level === 'warning'
          ? 'Données à surveiller'
          : 'Données non fiables pour le taux de présence',
    qualityMessage: quality.message,
  };
}
