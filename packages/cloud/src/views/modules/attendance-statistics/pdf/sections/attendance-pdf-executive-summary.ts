import type { AttendancePdfEngine } from '../engine/attendance-pdf-engine.js';
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

function pointOnRing(cx: number, cy: number, radius: number, angle: number): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
}

function drawRingArc(document: JsPdfLike, cx: number, cy: number, radius: number, from: number, to: number, color: AttendancePdfColor): void {
  setColor(document.setDrawColor.bind(document), color);
  document.setLineWidth(3.5);
  for (let angle = from; angle < to; angle += 2) {
    const [x1, y1] = pointOnRing(cx, cy, radius, angle);
    const [x2, y2] = pointOnRing(cx, cy, radius, Math.min(to, angle + 2));
    document.line(x1, y1, x2, y2);
  }
  document.setLineWidth(0.2);
}

function drawDirectionKpiGrid(engine: AttendancePdfEngine, model: AttendancePdfExecutiveSummaryModel): number {
  const { document, pages, theme } = engine;
  const gap = 4;
  const cardHeight = 55;
  const kpis = model.kpis.slice(0, 3);
  const cardWidth = (pages.contentWidth - gap * 2) / 3;
  const decision = pages.ensureSpace(cardHeight);
  if (!decision.fitsOnFreshPage) throw new RangeError('Direction KPI grid is taller than a printable page.');

  kpis.forEach((kpi, index) => {
    const x = pages.contentLeft + index * (cardWidth + gap);
    const y = pages.y;
    const centerX = x + cardWidth / 2;
    const centerY = y + 21;
    const radius = 12;
    const primaryColor: AttendancePdfColor = [22, 163, 74];
    const secondaryColor: AttendancePdfColor = [220, 38, 38];

    setColor(document.setFillColor.bind(document), theme.colors.surface);
    setColor(document.setDrawColor.bind(document), theme.colors.border);
    document.setLineWidth(0.2);
    document.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    document.setFont(theme.fontFamily, 'bold').setFontSize(9);
    setColor(document.setTextColor.bind(document), theme.colors.text);
    document.text(kpi.label, centerX, y + 5.5, { align: 'center' });

    const segments = kpi.segments;
    if (segments?.primaryRate !== null && segments?.primaryRate !== undefined && segments.secondaryRate !== null) {
      const firstAngle = Math.max(0, Math.min(360, segments.primaryRate * 3.6));
      if (firstAngle > 0) drawRingArc(document, centerX, centerY, radius, 0, firstAngle, primaryColor);
      if (firstAngle < 360) drawRingArc(document, centerX, centerY, radius, firstAngle, 360, secondaryColor);

      // Deux repères blancs sur le trait conservent les pourcentages lisibles,
      // y compris quand une composante occupe un arc très court.
      const drawRingPercentage = (value: number, angle: number, color: AttendancePdfColor): void => {
        const [labelX, labelY] = pointOnRing(centerX, centerY, radius, angle);
        const label = `${value.toFixed(1).replace('.0', '')}%`;
        document.setFont(theme.fontFamily, 'bold').setFontSize(6.3);
        const width = document.getTextWidth(label) + 2;
        setColor(document.setFillColor.bind(document), theme.colors.surface);
        document.rect(labelX - width / 2, labelY - 2.1, width, 4.1, 'F');
        setColor(document.setTextColor.bind(document), color);
        document.text(label, labelX, labelY + 0.6, { align: 'center' });
      };
      if (firstAngle > 0) drawRingPercentage(segments.primaryRate, firstAngle / 2, primaryColor);
      if (firstAngle < 360) drawRingPercentage(segments.secondaryRate, firstAngle + (360 - firstAngle) / 2, secondaryColor);

      document.setFont(theme.fontFamily, 'bold').setFontSize(11);
      setColor(document.setTextColor.bind(document), theme.colors.text);
      document.text(String(segments.primaryCount), centerX, centerY + 0.3, { align: 'center' });
      document.setFont(theme.fontFamily, 'normal').setFontSize(5.8);
      setColor(document.setTextColor.bind(document), theme.colors.mutedText);
      document.text(`sur ${segments.primaryCount + segments.secondaryCount}`, centerX, centerY + 3.5, { align: 'center' });
    } else {
      setColor(document.setDrawColor.bind(document), theme.colors.border);
      document.setLineWidth(2.5);
      document.circle(centerX, centerY, radius - 1.2, 'S');
      document.setFont(theme.fontFamily, 'bold').setFontSize(15);
      setColor(document.setTextColor.bind(document), theme.colors.mutedText);
      document.text('N/D', centerX, centerY + 1.8, { align: 'center' });
    }

    if (segments) {
      const legendY = y + 37;
      setColor(document.setFillColor.bind(document), primaryColor);
      document.circle(x + 5.5, legendY - 0.9, 1.3, 'F');
      document.setFont(theme.fontFamily, 'normal').setFontSize(7.5);
      setColor(document.setTextColor.bind(document), theme.colors.text);
      document.text(`${segments.primaryLabel} : ${segments.primaryCount}`, x + 8.3, legendY);
      setColor(document.setFillColor.bind(document), secondaryColor);
      document.circle(x + cardWidth / 2 + 3, legendY - 0.9, 1.3, 'F');
      document.text(`${segments.secondaryLabel} : ${segments.secondaryCount}`, x + cardWidth / 2 + 5.8, legendY);
    } else {
      document.setFont(theme.fontFamily, 'normal').setFontSize(7.5);
      setColor(document.setTextColor.bind(document), theme.colors.mutedText);
      document.text('Règle métier en attente', centerX, y + 37, { align: 'center' });
    }

    drawWrappedText({
      document,
      text: kpi.explanation,
      x: x + 4,
      y: y + 43,
      width: cardWidth - 8,
      fontSize: 7.4,
      color: theme.colors.mutedText,
      fontFamily: theme.fontFamily,
    });
  });

  pages.moveCursor(cardHeight + 3);
  return cardHeight + 3;
}


function drawOtherKpiGrid(engine: AttendancePdfEngine, model: AttendancePdfExecutiveSummaryModel): number {
  const { document, pages, theme } = engine;
  const gap = 4;
  const cardHeight = 55;
  const kpis = model.kpis.slice(0, 4);
  const cardWidth = (pages.contentWidth - gap * 3) / 4;
  const totalHeight = cardHeight;
  const decision = pages.ensureSpace(totalHeight);
  if (!decision.fitsOnFreshPage) throw new RangeError('Direction KPI grid is taller than a printable page.');

  kpis.forEach((kpi, index) => {
    const x = pages.contentLeft + index * (cardWidth + gap);
    const y = pages.y;
    const centerX = x + cardWidth / 2;
    const centerY = y + 20;
    const radius = 11;
    const primaryColor: AttendancePdfColor = [22, 163, 74];
    const secondaryColor: AttendancePdfColor = [220, 38, 38];

    setColor(document.setFillColor.bind(document), theme.colors.surface);
    setColor(document.setDrawColor.bind(document), theme.colors.border);
    document.setLineWidth(0.2);
    document.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    document.setFont(theme.fontFamily, 'bold').setFontSize(9);
    setColor(document.setTextColor.bind(document), theme.colors.text);
    document.text(kpi.label, centerX, y + 5.5, { align: 'center' });

    const segments = kpi.segments;
    if (segments?.primaryRate !== null && segments?.primaryRate !== undefined && segments.secondaryRate !== null) {
      const firstAngle = Math.max(0, Math.min(360, segments.primaryRate * 3.6));
      if (firstAngle > 0) drawRingArc(document, centerX, centerY, radius, 0, firstAngle, primaryColor);
      if (firstAngle < 360) drawRingArc(document, centerX, centerY, radius, firstAngle, 360, secondaryColor);

      // Deux repères blancs sur le trait conservent les pourcentages lisibles,
      // y compris quand une composante occupe un arc très court.
      const drawRingPercentage = (value: number, angle: number, color: AttendancePdfColor): void => {
        const [labelX, labelY] = pointOnRing(centerX, centerY, radius, angle);
        const label = `${value.toFixed(1).replace('.0', '')}%`;
        document.setFont(theme.fontFamily, 'bold').setFontSize(6.3);
        const width = document.getTextWidth(label) + 2;
        setColor(document.setFillColor.bind(document), theme.colors.surface);
        document.rect(labelX - width / 2, labelY - 2.1, width, 4.1, 'F');
        setColor(document.setTextColor.bind(document), color);
        document.text(label, labelX, labelY + 0.6, { align: 'center' });
      };
      if (firstAngle > 0) drawRingPercentage(segments.primaryRate, firstAngle / 2, primaryColor);
      if (firstAngle < 360) drawRingPercentage(segments.secondaryRate, firstAngle + (360 - firstAngle) / 2, secondaryColor);

      document.setFont(theme.fontFamily, 'bold').setFontSize(11);
      setColor(document.setTextColor.bind(document), theme.colors.text);
      document.text(String(segments.primaryCount), centerX, centerY + 0.3, { align: 'center' });
      document.setFont(theme.fontFamily, 'normal').setFontSize(5.8);
      setColor(document.setTextColor.bind(document), theme.colors.mutedText);
      document.text(`sur ${segments.primaryCount + segments.secondaryCount}`, centerX, centerY + 3.5, { align: 'center' });
    } else {
      setColor(document.setDrawColor.bind(document), theme.colors.border);
      document.setLineWidth(2.5);
      document.circle(centerX, centerY, radius - 1.2, 'S');
      document.setFont(theme.fontFamily, 'bold').setFontSize(15);
      setColor(document.setTextColor.bind(document), theme.colors.mutedText);
      document.text('N/D', centerX, centerY + 1.8, { align: 'center' });
    }

    if (segments) {
      const legendY = y + 37;
      setColor(document.setFillColor.bind(document), primaryColor);
      document.circle(x + 5.5, legendY - 0.9, 1.3, 'F');
      document.setFont(theme.fontFamily, 'normal').setFontSize(7.5);
      setColor(document.setTextColor.bind(document), theme.colors.text);
      document.text(`${segments.primaryLabel} : ${segments.primaryCount}`, x + 8.3, legendY);
      setColor(document.setFillColor.bind(document), secondaryColor);
      document.circle(x + cardWidth / 2 + 3, legendY - 0.9, 1.3, 'F');
      document.text(`${segments.secondaryLabel} : ${segments.secondaryCount}`, x + cardWidth / 2 + 5.8, legendY);
    } else {
      document.setFont(theme.fontFamily, 'normal').setFontSize(7.5);
      setColor(document.setTextColor.bind(document), theme.colors.mutedText);
      document.text('Données non disponibles', centerX, y + 37, { align: 'center' });
    }

    drawWrappedText({
      document,
      text: kpi.explanation,
      x: x + 4,
      y: y + 43,
      width: cardWidth - 8,
      fontSize: 6.8,
      color: theme.colors.mutedText,
      fontFamily: theme.fontFamily,
    });
  });

  pages.moveCursor(totalHeight + 3);
  return totalHeight + 3;
}


function drawDurationInsight(engine: AttendancePdfEngine, model: AttendancePdfExecutiveSummaryModel, compact: boolean): number {
  const { document, pages, theme } = engine;
  const insight = model.durationInsight;
  const height = compact ? 16 : 19;
  const decision = pages.ensureSpace(height);
  if (!decision.fitsOnFreshPage) throw new RangeError('Duration insight is taller than a printable page.');

  const x = pages.contentLeft;
  const y = pages.y;
  const width = pages.contentWidth;

  setColor(document.setFillColor.bind(document), theme.colors.surfaceMuted);
  setColor(document.setDrawColor.bind(document), theme.colors.border);
  document.setLineWidth(0.2);
  document.roundedRect(x, y, width, height, 2, 2, 'FD');

  document.setFont(theme.fontFamily, 'bold').setFontSize(compact ? 7.8 : 8.5);
  setColor(document.setTextColor.bind(document), theme.colors.mutedText);
  document.text(insight.label, x + 4, y + (compact ? 5 : 5.5));

  document.setFont(theme.fontFamily, 'bold').setFontSize(compact ? 12.5 : 14);
  setColor(document.setTextColor.bind(document), theme.colors.text);
  document.text(insight.value, x + 4, y + (compact ? 11.3 : 13));

  drawWrappedText({
    document,
    text: insight.helper,
    x: x + (compact ? 47 : 55),
    y: y + (compact ? 7.1 : 7.7),
    width: width - (compact ? 51 : 59),
    fontSize: compact ? 7 : 7.6,
    color: theme.colors.mutedText,
    fontFamily: theme.fontFamily,
  });

  if (!compact && insight.detail) {
    drawWrappedText({
      document,
      text: insight.detail,
      x: x + 55,
      y: y + 13.2,
      width: width - 59,
      fontSize: 6.8,
      color: theme.colors.mutedText,
      fontFamily: theme.fontFamily,
    });
  }

  pages.moveCursor(height + 4);
  return height + 4;
}

export interface AttendancePdfExecutiveSummaryResult {
  page: number;
  model: AttendancePdfExecutiveSummaryModel;
  heightUsed: number;
}

/**
 * Rend la première page métier du rapport.
 * Cette section ne calcule aucun statut, taux ou élément à examiner : elle présente les
 * agrégats déjà présents dans AttendanceOverview.
 */
export function renderAttendancePdfExecutiveSummary(
  engine: AttendancePdfEngine,
): AttendancePdfExecutiveSummaryResult {
  const model = buildAttendancePdfExecutiveSummaryModel(
    engine.contract.request.overview,
    engine.contract.request.mode,
  );
  engine.pages.markSectionStart('executive_summary');
  const startPage = engine.pages.currentPage;
  const startY = engine.pages.y;

  const compactDirectionSummary = engine.contract.request.mode === 'period_summary';

  if (!compactDirectionSummary) {
    engine.primitives.drawSectionTitle(model.title, 1.5);
    engine.primitives.drawTextBlock(model.scopeLine, {
      fontSizePt: 8.5,
      color: engine.theme.colors.mutedText,
      spacingAfter: 3,
    });
  }

  if (compactDirectionSummary) {
    drawDirectionKpiGrid(engine, model);
  } else {
    drawOtherKpiGrid(engine, model);
    drawDurationInsight(engine, model, true);
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
