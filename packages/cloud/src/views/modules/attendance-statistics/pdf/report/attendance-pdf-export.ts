import type { AttendancePdfEngineOptions } from '../engine/attendance-pdf-engine.js';
import type { JsPdfConstructorLike } from '../types/jspdf.types.js';
import type { AttendancePdfExportRequest } from '../types/attendance-pdf.types.js';
import { createAttendancePdfReport, type AttendancePdfCreatedReport } from './attendance-pdf-report.js';

const MODE_SLUG: Record<AttendancePdfExportRequest['mode'], string> = {
  period_summary: 'synthese-periode',
  full_report: 'rapport-complet',
  current_analysis: 'analyse-en-cours',
  issues_only: 'elements-a-examiner',
  employee_sheet: 'fiche-employe',
};

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function buildAttendancePdfFilename(request: AttendancePdfExportRequest): string {
  const level = request.presentationLevel ?? 'default';
  const period = `${request.overview.period.startDate}_${request.overview.period.endDate}`;
  const parts = ['toke-presence', MODE_SLUG[request.mode], level, period];

  if (request.mode === 'employee_sheet') {
    const employee = request.overview.employees.find((item) => item.employeeGuid === request.employeeGuid);
    if (employee?.employeeName) parts.splice(2, 0, slugify(employee.employeeName));
  }
  if (request.mode === 'issues_only' && request.issue) parts.splice(2, 0, slugify(request.issue));

  return `${parts.filter(Boolean).join('-')}.pdf`;
}

export interface AttendancePdfExportedReport extends AttendancePdfCreatedReport {
  filename: string;
}

export function buildAttendancePdfExport(
  JsPdfConstructor: JsPdfConstructorLike,
  request: AttendancePdfExportRequest,
  options: AttendancePdfEngineOptions = {},
): AttendancePdfExportedReport {
  const report = createAttendancePdfReport(JsPdfConstructor, request, options);
  return {
    ...report,
    filename: buildAttendancePdfFilename(report.request),
  };
}

export function saveAttendancePdfExport(
  JsPdfConstructor: JsPdfConstructorLike,
  request: AttendancePdfExportRequest,
  options: AttendancePdfEngineOptions = {},
): AttendancePdfExportedReport {
  const report = buildAttendancePdfExport(JsPdfConstructor, request, options);
  report.engine.save(report.filename);
  return report;
}
