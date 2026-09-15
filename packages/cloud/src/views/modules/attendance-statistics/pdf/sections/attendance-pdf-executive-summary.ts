import type { AttendancePdfEngine } from '../engine/attendance-pdf-engine.js';
import { ATTENDANCE_PDF_TYPOGRAPHY } from '../config/attendance-pdf-layout.js';
import type { AttendancePdfColor } from '../theme/attendance-pdf-theme.js';
import type { JsPdfLike } from '../types/jspdf.types.js';
import {
  buildAttendancePdfExecutiveSummaryModel,
  type AttendancePdfExecutiveKpi,
  type AttendancePdfExecutiveSummaryModel,
} from './attendance-pdf-executive-summary.model.js';

function setColor(
  setter: (r: number, g: number, b: number) => unknown,
  color: AttendancePdfColor,
): void {
  setter(color[0], color[1], color[2]);
}

function drawWrappedText(input: {
  document: JsPdfLike;
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  color: AttendancePdfColor;
  fontFamily: string;
  style?: 'normal' | 'bold';
  align?: 'left' | 'center' | 'right';
}): void {
  const {
    document,
    text,
    x,
    y,
    width,
    fontSize,
    color,
    fontFamily,
    style = 'normal',
    align = 'left',
  } = input;
  document.setFont(fontFamily, style).setFontSize(fontSize);
  setColor(document.setTextColor.bind(document), color);
  const lines = document.splitTextToSize(text, width);
  document.text(lines, x, y, { maxWidth: width, align });
}

function accentForKpi(engine: AttendancePdfEngine, kpi: AttendancePdfExecutiveKpi): AttendancePdfColor {
  switch (kpi.accent) {
    case 'danger':
      return engine.theme.colors.danger;
    case 'warning':
      return engine.theme.colors.warning;
    case 'success':
      return engine.theme.colors.success;
    case 'accent':
    default:
      return engine.theme.colors.accent;
  }
}

function drawQualityStrip(engine: AttendancePdfEngine, model: AttendancePdfExecutiveSummaryModel): number {
  const { document, pages, theme } = engine;
  const quality = model.quality;
  const height = quality.level === 'reliable' ? 12 : 19;
  pages.ensureSpace(height);
  const x = pages.contentLeft;
  const y = pages.y;
  const width = pages.contentWidth;
  const tone =
    quality.level === 'reliable'
      ? theme.colors.success
      : quality.level === 'warning'
        ? theme.colors.warning
        : theme.colors.danger;

  setColor(document.setFillColor.bind(document), theme.colors.surfaceMuted);
  setColor(document.setDrawColor.bind(document), tone);
  document.setLineWidth(0.5);
  document.roundedRect(x, y, width, height, 2, 2, 'FD');

  document.setFont(theme.fontFamily, 'bold').setFontSize(9.5);
  setColor(document.setTextColor.bind(document), tone);
  document.text(quality.label, x + 4, y + 5.2);

  document.setFont(theme.fontFamily, 'normal').setFontSize(8.2);
  setColor(document.setTextColor.bind(document), theme.colors.text);
  const message =
    quality.level === 'reliable'
      ? 'Le taux de présence peut être interprété sur ce périmètre.'
      : quality.message;
  document.text(document.splitTextToSize(message, width - 8), x + 4, y + 9.2, {
    maxWidth: width - 8,
  });

  if (quality.level !== 'reliable' && quality.signals.length > 0) {
    const signalText = quality.signals
      .slice(0, 5)
      .map((signal) => `${signal.label}: ${signal.value}`)
      .join(' · ');
    document.setFont(theme.fontFamily, 'bold').setFontSize(7.8);
    setColor(document.setTextColor.bind(document), theme.colors.mutedText);
    document.text(document.splitTextToSize(signalText, width - 8), x + 4, y + 15.1, {
      maxWidth: width - 8,
    });
  }

  pages.moveCursor(height + 4);
  return height + 4;
}

function drawKpiGrid(engine: AttendancePdfEngine, model: AttendancePdfExecutiveSummaryModel): number {
  const { document, pages, theme } = engine;
  const gap = 4;
  const cardHeight = 27;
  const rowGap = 4;
  const cardWidth = (pages.contentWidth - gap * 2) / 3;
  const secondRowWidth = (pages.contentWidth - gap) / 2;
  const totalHeight = cardHeight * 2 + rowGap;
  const decision = pages.ensureSpace(totalHeight);
  if (!decision.fitsOnFreshPage) throw new RangeError('Executive KPI grid is taller than a printable page.');

  const drawCard = (kpi: AttendancePdfExecutiveKpi, x: number, y: number, width: number): void => {
    setColor(document.setFillColor.bind(document), theme.colors.surface);
    setColor(document.setDrawColor.bind(document), theme.colors.border);
    document.setLineWidth(0.2);
    document.roundedRect(x, y, width, cardHeight, 2, 2, 'FD');

    const accent = accentForKpi(engine, kpi);
    setColor(document.setFillColor.bind(document), accent);
    document.rect(x, y, 1.8, cardHeight, 'F');

    document.setFont(theme.fontFamily, 'bold').setFontSize(8.5);
    setColor(document.setTextColor.bind(document), theme.colors.mutedText);
    document.text(kpi.label, x + 5, y + 6);

    document.setFont(theme.fontFamily, 'bold').setFontSize(ATTENDANCE_PDF_TYPOGRAPHY.kpiValuePt);
    setColor(document.setTextColor.bind(document), theme.colors.text);
    document.text(kpi.value, x + 5, y + 15.1);

    drawWrappedText({
      document,
      text: kpi.explanation,
      x: x + 5,
      y: y + 21.1,
      width: width - 10,
      fontSize: 7.7,
      color: theme.colors.mutedText,
      fontFamily: theme.fontFamily,
    });
  };

  model.kpis.slice(0, 3).forEach((kpi, index) => {
    drawCard(kpi, pages.contentLeft + index * (cardWidth + gap), pages.y, cardWidth);
  });
  model.kpis.slice(3, 5).forEach((kpi, index) => {
    drawCard(kpi, pages.contentLeft + index * (secondRowWidth + gap), pages.y + cardHeight + rowGap, secondRowWidth);
  });

  pages.moveCursor(totalHeight + 5);
  return totalHeight + 5;
}


function drawDirectionKpiGrid(engine: AttendancePdfEngine, model: AttendancePdfExecutiveSummaryModel): number {
  const { document, pages, theme } = engine;
  const gap = 3;
  const cardHeight = 23;
  const kpis = model.kpis.slice(0, 5);
  const cardWidth = (pages.contentWidth - gap * (kpis.length - 1)) / kpis.length;
  const decision = pages.ensureSpace(cardHeight);
  if (!decision.fitsOnFreshPage) throw new RangeError('Direction KPI grid is taller than a printable page.');

  kpis.forEach((kpi, index) => {
    const x = pages.contentLeft + index * (cardWidth + gap);
    const y = pages.y;

    setColor(document.setFillColor.bind(document), theme.colors.surface);
    setColor(document.setDrawColor.bind(document), theme.colors.border);
    document.setLineWidth(0.2);
    document.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    const accent = accentForKpi(engine, kpi);
    setColor(document.setFillColor.bind(document), accent);
    document.rect(x, y, 1.5, cardHeight, 'F');

    document.setFont(theme.fontFamily, 'bold').setFontSize(7.4);
    setColor(document.setTextColor.bind(document), theme.colors.mutedText);
    document.text(kpi.label, x + 4, y + 5.3, { maxWidth: cardWidth - 8 });

    document.setFont(theme.fontFamily, 'bold').setFontSize(16);
    setColor(document.setTextColor.bind(document), theme.colors.text);
    document.text(kpi.value, x + 4, y + 13.1);

    drawWrappedText({
      document,
      text: kpi.explanation,
      x: x + 4,
      y: y + 18.2,
      width: cardWidth - 8,
      fontSize: 6.4,
      color: theme.colors.mutedText,
      fontFamily: theme.fontFamily,
    });
  });

  pages.moveCursor(cardHeight + 4);
  return cardHeight + 4;
}

function drawBottomPanels(engine: AttendancePdfEngine, model: AttendancePdfExecutiveSummaryModel): number {
  const { document, pages, theme } = engine;
  const gap = 6;
  const panelWidth = (pages.contentWidth - gap) / 2;
  const height = 48;
  const decision = pages.ensureSpace(height);
  if (!decision.fitsOnFreshPage) throw new RangeError('Executive summary panels are taller than a printable page.');

  const y = pages.y;
  const leftX = pages.contentLeft;
  const rightX = leftX + panelWidth + gap;

  const panel = (x: number, title: string): void => {
    setColor(document.setFillColor.bind(document), theme.colors.surface);
    setColor(document.setDrawColor.bind(document), theme.colors.border);
    document.setLineWidth(0.2);
    document.roundedRect(x, y, panelWidth, height, 2, 2, 'FD');
    document.setFont(theme.fontFamily, 'bold').setFontSize(9.5);
    setColor(document.setTextColor.bind(document), theme.colors.text);
    document.text(title, x + 4, y + 6);
    setColor(document.setDrawColor.bind(document), theme.colors.headerRule);
    document.line(x + 4, y + 8.3, x + panelWidth - 4, y + 8.3);
  };

  panel(leftX, model.statusPanelTitle);
  panel(rightX, 'Principaux éléments à examiner');

  const eligible = model.statusRows.filter((row) => row.group === 'eligible');
  const excluded = model.statusRows.filter((row) => row.group === 'excluded');
  let rowY = y + 13;
  document.setFont(theme.fontFamily, 'bold').setFontSize(7.8);
  setColor(document.setTextColor.bind(document), theme.colors.mutedText);
  document.text(model.eligibleGroupLabel, leftX + 4, rowY);
  rowY += 4.8;

  const drawStatusRows = (rows: typeof model.statusRows): void => {
    for (const row of rows) {
      document.setFont(theme.fontFamily, 'normal').setFontSize(8);
      setColor(document.setTextColor.bind(document), theme.colors.text);
      document.text(row.label, leftX + 4, rowY);
      document.setFont(theme.fontFamily, 'bold');
      document.text(String(row.count), leftX + panelWidth - 4, rowY, { align: 'right' });
      rowY += 4.5;
    }
  };

  drawStatusRows(eligible);
  rowY += 1.3;
  document.setFont(theme.fontFamily, 'bold').setFontSize(7.8);
  setColor(document.setTextColor.bind(document), theme.colors.mutedText);
  document.text(model.excludedGroupLabel, leftX + 4, rowY);
  rowY += 4.8;
  drawStatusRows(excluded);

  if (model.attentionItems.length === 0) {
    document.setFont(theme.fontFamily, 'normal').setFontSize(8.5);
    setColor(document.setTextColor.bind(document), theme.colors.success);
    document.text(model.attentionEmptyLabel, rightX + 4, y + 15);
  } else {
    let attentionY = y + 14;
    model.attentionItems.forEach((item, index) => {
      const marker = `${index + 1}.`;
      document.setFont(theme.fontFamily, 'bold').setFontSize(8.2);
      setColor(document.setTextColor.bind(document), theme.colors.warning);
      document.text(marker, rightX + 4, attentionY);
      document.setFont(theme.fontFamily, 'normal').setFontSize(8.2);
      setColor(document.setTextColor.bind(document), theme.colors.text);
      document.text(item.label, rightX + 10, attentionY);
      document.setFont(theme.fontFamily, 'normal').setFontSize(7.2);
      setColor(document.setTextColor.bind(document), theme.colors.mutedText);
      document.text(
        `${item.employeesConcerned} collab.`,
        rightX + panelWidth - 14,
        attentionY,
        { align: 'right' },
      );
      document.setFont(theme.fontFamily, 'bold').setFontSize(8.2);
      setColor(document.setTextColor.bind(document), theme.colors.text);
      document.text(String(item.count), rightX + panelWidth - 4, attentionY, { align: 'right' });
      attentionY += 5.8;
    });
    if (model.hiddenAttentionTypeCount > 0) {
      document.setFont(theme.fontFamily, 'italic').setFontSize(7.4);
      setColor(document.setTextColor.bind(document), theme.colors.mutedText);
      document.text(
        `+ ${model.hiddenAttentionTypeCount} autre${model.hiddenAttentionTypeCount === 1 ? '' : 's'} type${model.hiddenAttentionTypeCount === 1 ? '' : 's'} détaillé${model.hiddenAttentionTypeCount === 1 ? '' : 's'} plus loin`,
        rightX + 4,
        y + height - 4,
      );
    }
  }

  pages.moveCursor(height);
  return height;
}

export interface AttendancePdfExecutiveSummaryResult {
  page: number;
  model: AttendancePdfExecutiveSummaryModel;
  heightUsed: number;
}

/**
 * Rend la première page métier du rapport.
 * Cette section ne calcule aucun statut, taux ou anomalie : elle présente les
 * agrégats déjà présents dans AttendanceOverview.
 */
export function renderAttendancePdfExecutiveSummary(
  engine: AttendancePdfEngine,
): AttendancePdfExecutiveSummaryResult {
  const model = buildAttendancePdfExecutiveSummaryModel(engine.contract.request.overview);
  engine.pages.markSectionStart('executive_summary');
  const startPage = engine.pages.currentPage;
  const startY = engine.pages.y;

  const compactDirectionSummary = engine.contract.request.mode === 'period_summary';

  engine.primitives.drawSectionTitle(model.title, compactDirectionSummary ? 1 : 1.5);
  engine.primitives.drawTextBlock(model.scopeLine, {
    fontSizePt: 8.5,
    color: engine.theme.colors.mutedText,
    spacingAfter: compactDirectionSummary ? 2 : 3,
  });

  // En Direction, la qualité n'occupe de place que lorsqu'elle change réellement
  // l'interprétation du rapport. Un état fiable n'a pas besoin d'un bandeau dédié.
  if (!compactDirectionSummary || model.quality.level !== 'reliable') {
    drawQualityStrip(engine, model);
  }

  if (compactDirectionSummary) {
    drawDirectionKpiGrid(engine, model);
  } else {
    drawKpiGrid(engine, model);
    drawBottomPanels(engine, model);
  }

  return {
    page: startPage,
    model,
    heightUsed:
      engine.pages.currentPage === startPage
        ? engine.pages.y - startY
        : engine.pages.contentBottom - startY,
  };
}
