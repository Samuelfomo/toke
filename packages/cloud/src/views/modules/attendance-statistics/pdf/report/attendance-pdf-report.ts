import type { AttendancePdfEngineOptions } from '../engine/attendance-pdf-engine.js';
import { createAttendancePdfEngine, type AttendancePdfEngine } from '../engine/attendance-pdf-engine.js';
import type { JsPdfConstructorLike } from '../types/jspdf.types.js';
import type {
  AttendancePdfExportRequest,
  AttendancePdfRenderedSection,
  AttendancePdfReportRenderResult,
} from '../types/attendance-pdf.types.js';
import { renderAttendancePdfAnalysisContext } from '../sections/attendance-pdf-analysis-context.js';
import { renderAttendancePdfExecutiveSummary } from '../sections/attendance-pdf-executive-summary.js';
import { renderAttendancePdfTrend } from '../sections/attendance-pdf-trend.js';
import { renderAttendancePdfIssues } from '../sections/attendance-pdf-issues.js';
import { renderAttendancePdfTeam } from '../sections/attendance-pdf-team.js';
import { renderAttendancePdfEmployeeDetails } from '../sections/attendance-pdf-employee-detail.js';
import { buildAttendancePdfReportPlan, normalizeAttendancePdfExportRequest } from './attendance-pdf-report-plan.js';

function addRenderedSection(
  output: AttendancePdfRenderedSection[],
  section: AttendancePdfRenderedSection['section'],
  result: { startPage: number; endPage: number },
): void {
  output.push({ section, startPage: result.startPage, endPage: result.endPage });
}

/**
 * Assemble les sections déjà validées par les Lots 6.3 à 6.7.
 * Les sections non encore implémentées (sommaire, informations secondaires autonomes)
 * ne sont jamais simulées : elles restent hors du plan actif.
 */
export function renderAttendancePdfReport(engine: AttendancePdfEngine): AttendancePdfReportRenderResult {
  const plan = buildAttendancePdfReportPlan(engine.contract);
  const renderedSections: AttendancePdfRenderedSection[] = [];

  for (const planned of plan.sections) {
    switch (planned.section) {
      case 'analysis_context':
        addRenderedSection(renderedSections, planned.section, renderAttendancePdfAnalysisContext(engine));
        break;
      case 'executive_summary': {
        const result = renderAttendancePdfExecutiveSummary(engine);
        addRenderedSection(renderedSections, planned.section, { startPage: result.page, endPage: result.page });
        break;
      }
      case 'trend':
        addRenderedSection(renderedSections, planned.section, renderAttendancePdfTrend(engine));
        break;
      case 'issues':
        addRenderedSection(renderedSections, planned.section, renderAttendancePdfIssues(engine));
        break;
      case 'team':
        addRenderedSection(renderedSections, planned.section, renderAttendancePdfTeam(engine));
        break;
      case 'employee_details':
        addRenderedSection(renderedSections, planned.section, renderAttendancePdfEmployeeDetails(engine));
        break;
      case 'table_of_contents':
      case 'data_quality':
      case 'secondary_insights':
        throw new Error(`La section ${planned.section} ne doit pas être présente dans le plan actif du Lot 6.8.`);
    }
  }

  return {
    plan,
    renderedSections,
    pageCountBeforeFinalize: engine.pages.pageCount,
  };
}

export interface AttendancePdfCreatedReport extends AttendancePdfReportRenderResult {
  engine: AttendancePdfEngine;
  request: AttendancePdfExportRequest;
}

export function createAttendancePdfReport(
  JsPdfConstructor: JsPdfConstructorLike,
  request: AttendancePdfExportRequest,
  options: AttendancePdfEngineOptions = {},
): AttendancePdfCreatedReport {
  const normalizedRequest = normalizeAttendancePdfExportRequest(request);
  const engine = createAttendancePdfEngine(JsPdfConstructor, normalizedRequest, options);
  const result = renderAttendancePdfReport(engine);
  return { engine, request: normalizedRequest, ...result };
}
