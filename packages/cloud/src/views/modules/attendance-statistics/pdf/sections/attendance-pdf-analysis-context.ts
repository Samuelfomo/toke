import type { AttendancePdfEngine } from '../engine/attendance-pdf-engine.js';
import {
  buildAttendancePdfAnalysisContextModel,
  type AttendancePdfAnalysisContextModel,
} from './attendance-pdf-analysis-context.model.js';

export interface AttendancePdfAnalysisContextResult {
  startPage: number;
  endPage: number;
  model: AttendancePdfAnalysisContextModel;
}

export function renderAttendancePdfAnalysisContext(
  engine: AttendancePdfEngine,
): AttendancePdfAnalysisContextResult {
  const model = buildAttendancePdfAnalysisContextModel(engine.contract);
  if (engine.pages.y > engine.pages.contentTop) engine.pages.addPage();
  engine.pages.markSectionStart('analysis_context');
  const startPage = engine.pages.currentPage;

  engine.primitives.drawSectionTitle(model.title, 1.5);
  engine.primitives.drawTextBlock(`${model.sourceLabel} · ${model.analysisLabel}`, {
    fontSizePt: 10,
    fontStyle: 'bold',
    color: engine.theme.colors.accent,
    spacingAfter: 3,
  });

  const filters = [
    model.dateLabel ? `Date : ${model.dateLabel}` : null,
    model.statusLabel ? `Statut : ${model.statusLabel}` : null,
    model.issueLabel ? `Élément : ${model.issueLabel}` : null,
    model.employeeLabel ? `Collaborateur : ${model.employeeLabel}` : null,
  ].filter((item): item is string => Boolean(item));

  engine.primitives.drawCard({
    title: 'Périmètre de cette analyse',
    value: `${model.employeeCount} collaborateur${model.employeeCount > 1 ? 's' : ''}`,
    body: filters.length > 0 ? filters.join(' · ') : 'Contexte courant du dashboard',
    height: 28,
  });

  engine.primitives.drawCard({
    title: model.qualityLabel,
    body: model.qualityMessage,
    height: 22,
  });

  engine.primitives.drawTextBlock(
    "Cette exportation conserve le contexte d'analyse sélectionné. Elle ne remplace pas les KPI globaux de la période et ne modifie aucune statistique calculée.",
    { fontSizePt: 7.8, color: engine.theme.colors.mutedText, spacingAfter: 2 },
  );

  return { startPage, endPage: engine.pages.currentPage, model };
}
