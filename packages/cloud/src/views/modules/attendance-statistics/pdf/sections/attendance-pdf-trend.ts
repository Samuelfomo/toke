import type { AttendancePdfEngine } from '../engine/attendance-pdf-engine.js';
import { ATTENDANCE_PDF_TYPOGRAPHY } from '../config/attendance-pdf-layout.js';
import type { AttendancePdfColor } from '../theme/attendance-pdf-theme.js';
import type { JsPdfLike } from '../types/jspdf.types.js';
import {
  buildAttendancePdfTrendModel,
  type AttendancePdfTrendModel,
  type AttendancePdfTrendRow,
  type AttendancePdfTrendSegment,
} from './attendance-pdf-trend.model.js';

interface TrendSeriesDefinition {
  key: 'expected' | 'attended' | 'absent' | 'late';
  label: string;
  color: AttendancePdfColor;
  lineWidth: number;
  marker: 'outline' | 'filled';
}

function setColor(
  setter: (r: number, g: number, b: number) => unknown,
  color: AttendancePdfColor,
): void {
  setter(color[0], color[1], color[2]);
}

function seriesDefinitions(engine: AttendancePdfEngine): TrendSeriesDefinition[] {
  return [
    {
      key: 'expected',
      label: 'Journées attendues',
      color: engine.theme.colors.mutedText,
      lineWidth: 0.25,
      marker: 'outline',
    },
    {
      key: 'attended',
      label: 'Journées suivies',
      color: engine.theme.colors.accent,
      lineWidth: 0.6,
      marker: 'filled',
    },
    {
      key: 'absent',
      label: 'Absences',
      color: engine.theme.colors.danger,
      lineWidth: 0.45,
      marker: 'filled',
    },
    {
      key: 'late',
      label: 'Retards',
      color: engine.theme.colors.warning,
      lineWidth: 0.35,
      marker: 'outline',
    },
  ];
}

function maxObserved(rows: AttendancePdfTrendRow[]): number {
  return Math.max(
    1,
    ...rows.flatMap((row) => [row.expected, row.attended, row.absent, row.late]),
  );
}

function drawLegend(engine: AttendancePdfEngine, x: number, y: number): number {
  const { document, theme } = engine;
  let cursorX = x;
  const itemGap = 7;
  const lineWidth = 8;

  for (const series of seriesDefinitions(engine)) {
    setColor(document.setDrawColor.bind(document), series.color);
    document.setLineWidth(series.lineWidth);
    document.line(cursorX, y, cursorX + lineWidth, y);
    if (series.marker === 'filled') {
      setColor(document.setFillColor.bind(document), series.color);
      document.rect(cursorX + lineWidth / 2 - 0.7, y - 0.7, 1.4, 1.4, 'F');
    } else {
      document.rect(cursorX + lineWidth / 2 - 0.7, y - 0.7, 1.4, 1.4, 'S');
    }
    cursorX += lineWidth + 2;
    document.setFont(theme.fontFamily, 'normal').setFontSize(7.5);
    setColor(document.setTextColor.bind(document), theme.colors.text);
    document.text(series.label, cursorX, y + 1);
    cursorX += document.getTextWidth(series.label) + itemGap;
  }

  return 6;
}

function drawChart(engine: AttendancePdfEngine, segment: AttendancePdfTrendSegment): number {
  const { document, pages, theme } = engine;
  const chartHeight = 58;
  const titleSpace = 8;
  const legendSpace = 7;
  const totalHeight = titleSpace + chartHeight + legendSpace;
  const decision = pages.ensureSpace(totalHeight);
  if (!decision.fitsOnFreshPage) {
    throw new RangeError('Trend chart is taller than a complete printable page.');
  }

  const x = pages.contentLeft;
  const y = pages.y;
  const width = pages.contentWidth;
  const plotLeft = x + 14;
  const plotRight = x + width - 5;
  const plotTop = y + titleSpace + 4;
  const plotBottom = y + titleSpace + chartHeight - 9;
  const plotWidth = Math.max(1, plotRight - plotLeft);
  const plotHeight = Math.max(1, plotBottom - plotTop);
  const maxValue = maxObserved(segment.rows);
  const stepX = segment.rows.length > 1 ? plotWidth / (segment.rows.length - 1) : 0;

  document.setFont(theme.fontFamily, 'bold').setFontSize(9.5);
  setColor(document.setTextColor.bind(document), theme.colors.text);
  document.text(segment.periodLabel, x, y + 4.2);

  setColor(document.setFillColor.bind(document), theme.colors.surface);
  setColor(document.setDrawColor.bind(document), theme.colors.border);
  document.setLineWidth(0.2);
  document.roundedRect(x, y + titleSpace, width, chartHeight, 2, 2, 'FD');

  // Grille Y : uniquement des repères de lecture, aucun nouvel agrégat métier.
  const tickValues = Array.from(new Set([0, Math.round(maxValue / 2), maxValue])).sort((a, b) => a - b);
  for (const tick of tickValues) {
    const tickY = plotBottom - (tick / maxValue) * plotHeight;
    setColor(document.setDrawColor.bind(document), theme.colors.headerRule);
    document.setLineWidth(0.15);
    document.line(plotLeft, tickY, plotRight, tickY);
    document.setFont(theme.fontFamily, 'normal').setFontSize(7);
    setColor(document.setTextColor.bind(document), theme.colors.mutedText);
    document.text(String(tick), plotLeft - 2.5, tickY + 1, { align: 'right' });
  }

  const xLabelFrequency = Math.max(1, Math.ceil(segment.rows.length / 7));
  segment.rows.forEach((row, index) => {
    if (index % xLabelFrequency !== 0 && index !== segment.rows.length - 1) return;
    const pointX = plotLeft + index * stepX;
    document.setFont(theme.fontFamily, 'normal').setFontSize(6.8);
    setColor(document.setTextColor.bind(document), theme.colors.mutedText);
    document.text(row.dateLabel, pointX, plotBottom + 5, { align: 'center' });
  });

  for (const series of seriesDefinitions(engine)) {
    setColor(document.setDrawColor.bind(document), series.color);
    setColor(document.setFillColor.bind(document), series.color);
    document.setLineWidth(series.lineWidth);

    let previous: { x: number; y: number } | null = null;
    segment.rows.forEach((row, index) => {
      const value = row[series.key];
      const point = {
        x: plotLeft + index * stepX,
        y: plotBottom - (value / maxValue) * plotHeight,
      };
      if (previous) document.line(previous.x, previous.y, point.x, point.y);
      if (series.marker === 'filled') {
        document.rect(point.x - 0.55, point.y - 0.55, 1.1, 1.1, 'F');
      } else {
        document.rect(point.x - 0.55, point.y - 0.55, 1.1, 1.1, 'S');
      }
      previous = point;
    });
  }

  drawLegend(engine, plotLeft, y + titleSpace + chartHeight - 2.3);
  pages.moveCursor(totalHeight + 3);
  return totalHeight + 3;
}

function drawDailyTable(engine: AttendancePdfEngine, rows: AttendancePdfTrendRow[]): void {
  engine.table.draw({
    fontSizePt: ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
    headerFontSizePt: ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
    horizontalPadding: 1.3,
    verticalPadding: 1,
    repeatHeader: true,
    spacingAfter: 2,
    columns: [
      { key: 'date', title: 'Date', width: 25, value: (row) => row.dateLabel },
      { key: 'expected', title: 'Attendues', width: 25, align: 'right', value: (row) => String(row.expected) },
      { key: 'attended', title: 'Suivies', width: 24, align: 'right', value: (row) => String(row.attended) },
      { key: 'present', title: 'Présents', width: 23, align: 'right', value: (row) => String(row.present) },
      { key: 'late', title: 'Retards', width: 20, align: 'right', value: (row) => String(row.late) },
      { key: 'absent', title: 'Absences', width: 21, align: 'right', value: (row) => String(row.absent) },
      { key: 'attendanceRate', title: 'Présence', weight: 1, align: 'right', value: (row) => row.attendanceRateLabel },
      { key: 'punctualityRate', title: 'Ponctualité', weight: 1, align: 'right', value: (row) => row.punctualityRateLabel },
      { key: 'netDuration', title: 'Durée nette', width: 29, align: 'right', value: (row) => row.netDurationLabel },
      { key: 'issues', title: 'Alertes', width: 18, align: 'right', value: (row) => String(row.issueCount) },
    ],
    rows,
  });
}

function drawEmptyState(document: JsPdfLike, engine: AttendancePdfEngine): void {
  document.setFont(engine.theme.fontFamily, 'normal').setFontSize(9.5);
  setColor(document.setTextColor.bind(document), engine.theme.colors.mutedText);
  document.text('Aucune donnée quotidienne n’est disponible sur cette période.', engine.pages.contentLeft, engine.pages.y + 4);
  engine.pages.moveCursor(8);
}

export interface AttendancePdfTrendResult {
  startPage: number;
  endPage: number;
  model: AttendancePdfTrendModel;
  segmentStartPages: number[];
}

/**
 * Rend l'évolution quotidienne. Chaque segment contient au maximum 31 jours.
 * Les valeurs du graphique et du tableau sont strictement issues de overview.daily[].
 */
export function renderAttendancePdfTrend(engine: AttendancePdfEngine): AttendancePdfTrendResult {
  const model = buildAttendancePdfTrendModel(engine.contract.request.overview);

  // Une section graphique commence toujours sur une page fraîche : cela évite de
  // compresser arbitrairement le graphique sous la synthèse exécutive.
  if (engine.pages.y > engine.pages.contentTop) engine.pages.addPage();
  engine.pages.markSectionStart('trend');
  const startPage = engine.pages.currentPage;
  const segmentStartPages: number[] = [];

  engine.primitives.drawSectionTitle(model.title, 1.5);
  engine.primitives.drawTextBlock(model.description, {
    fontSizePt: 8.5,
    color: engine.theme.colors.mutedText,
    spacingAfter: 3,
  });

  if (model.segments.length === 0) {
    drawEmptyState(engine.document, engine);
    return { startPage, endPage: engine.pages.currentPage, model, segmentStartPages };
  }

  model.segments.forEach((segment, index) => {
    if (index > 0) {
      engine.pages.addPage();
      engine.primitives.drawSectionTitle(`${model.title} - suite`, 1.2);
    }
    segmentStartPages.push(engine.pages.currentPage);
    drawChart(engine, segment);
    drawDailyTable(engine, segment.rows);
  });

  return {
    startPage,
    endPage: engine.pages.currentPage,
    model,
    segmentStartPages,
  };
}
