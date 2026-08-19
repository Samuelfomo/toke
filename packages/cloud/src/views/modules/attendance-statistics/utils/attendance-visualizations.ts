import type {
  AttendanceDailyOverview,
  AttendanceOverview,
  AttendanceStatus,
} from '../types/attendance-statistics.types.js';
import { ATTENDANCE_STATUS_PRESENTATION } from './attendance-status.js';
import { formatBusinessDate } from './business-date.js';
import { getAttendanceDailyChartPointSpacing } from './attendance-volume.js';

export type AttendanceStatusDistributionGroupId = 'rate_eligible' | 'rate_excluded';

export interface AttendanceStatusDistributionItem {
  status: AttendanceStatus;
  label: string;
  description: string;
  count: number;
  visualSharePercent: number;
  tone: 'positive' | 'warning' | 'danger' | 'neutral' | 'info';
}

export interface AttendanceStatusDistributionGroup {
  id: AttendanceStatusDistributionGroupId;
  label: string;
  description: string;
  total: number;
  items: AttendanceStatusDistributionItem[];
}

export const ATTENDANCE_DAILY_TREND_SERIES = [
  'expected',
  'attended',
  'absent',
  'late',
] as const;

export type AttendanceDailyTrendSeriesId = (typeof ATTENDANCE_DAILY_TREND_SERIES)[number];

export interface AttendanceDailyTrendPoint {
  date: string;
  dateLabel: string;
  expected: number;
  attended: number;
  absent: number;
  late: number;
  issues: number;
}

export interface AttendanceDailyTrendSeries {
  id: AttendanceDailyTrendSeriesId;
  label: string;
  tone: 'slate' | 'indigo' | 'rose' | 'amber';
  dashed: boolean;
  points: string;
  values: Array<{ date: string; x: number; y: number; value: number }>;
}

export interface AttendanceDailyTrendTick {
  value: number;
  y: number;
}

export interface AttendanceDailyChartModel {
  width: number;
  height: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  maxValue: number;
  points: AttendanceDailyTrendPoint[];
  series: AttendanceDailyTrendSeries[];
  yTicks: AttendanceDailyTrendTick[];
  xLabels: Array<{ date: string; label: string; x: number }>;
}

const ELIGIBLE_STATUSES: readonly AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT'];
const EXCLUDED_STATUSES: readonly AttendanceStatus[] = ['PENDING', 'REST_DAY', 'UNDETERMINED'];

/**
 * Regroupe les totaux déjà calculés par l'API selon leur éligibilité au taux.
 * visualSharePercent sert uniquement à dimensionner une barre dans son propre groupe.
 */
export function buildAttendanceStatusDistribution(
  overview: AttendanceOverview,
): AttendanceStatusDistributionGroup[] {
  return [
    buildDistributionGroup(
      'rate_eligible',
      'Journées éligibles au taux',
      'Présences, retards et absences finalisées composant le dénominateur métier.',
      ELIGIBLE_STATUSES,
      overview,
    ),
    buildDistributionGroup(
      'rate_excluded',
      'Journées non éligibles',
      'Journées en attente, de repos ou indéterminées, présentées séparément.',
      EXCLUDED_STATUSES,
      overview,
    ),
  ];
}

/**
 * Extrait les séries quotidiennes directement depuis daily[].
 * Aucun taux ou statut n'est reclassé dans cette fonction.
 */
export function buildAttendanceDailyTrendPoints(
  daily: readonly AttendanceDailyOverview[],
): AttendanceDailyTrendPoint[] {
  return [...daily]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((day) => ({
      date: day.date,
      dateLabel: formatBusinessDate(day.date, 'fr-FR', {
        day: '2-digit',
        month: 'short',
      }),
      expected: day.rates.employeeWorkingDaysExpected,
      attended: day.rates.attendedWorkingDays,
      absent: day.statusTotals.ABSENT,
      late: day.statusTotals.LATE,
      issues: day.issueCount,
    }));
}

/**
 * Construit uniquement la géométrie SVG de la courbe.
 * Les valeurs métier restent celles retournées dans daily[].
 */
export function buildAttendanceDailyChartModel(
  daily: readonly AttendanceDailyOverview[],
): AttendanceDailyChartModel {
  const points = buildAttendanceDailyTrendPoints(daily);
  const pointSpacing = getAttendanceDailyChartPointSpacing(points.length);
  const width = Math.max(760, Math.min(4800, 92 + Math.max(0, points.length - 1) * pointSpacing));
  const height = 260;
  const plotLeft = 52;
  const plotRight = width - 24;
  const plotTop = 22;
  const plotBottom = 204;
  const plotWidth = Math.max(1, plotRight - plotLeft);
  const plotHeight = plotBottom - plotTop;

  const maxObserved = Math.max(
    0,
    ...points.flatMap((point) => [point.expected, point.attended, point.absent, point.late]),
  );
  const maxValue = Math.max(1, maxObserved);
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  const seriesDefinitions: ReadonlyArray<{
    id: AttendanceDailyTrendSeriesId;
    label: string;
    tone: AttendanceDailyTrendSeries['tone'];
    dashed: boolean;
  }> = [
    { id: 'expected', label: 'Journées attendues', tone: 'slate', dashed: true },
    { id: 'attended', label: 'Journées suivies', tone: 'indigo', dashed: false },
    { id: 'absent', label: 'Absences', tone: 'rose', dashed: false },
    { id: 'late', label: 'Retards', tone: 'amber', dashed: false },
  ];

  const series = seriesDefinitions.map((definition) => {
    const values = points.map((point, index) => {
      const value = point[definition.id];
      return {
        date: point.date,
        x: plotLeft + index * stepX,
        y: plotBottom - (value / maxValue) * plotHeight,
        value,
      };
    });

    return {
      ...definition,
      values,
      points: values.map((value) => `${round(value.x)},${round(value.y)}`).join(' '),
    };
  });

  const yTickValues = uniqueSortedNumbers([
    0,
    Math.round(maxValue * 0.25),
    Math.round(maxValue * 0.5),
    Math.round(maxValue * 0.75),
    maxValue,
  ]);

  const yTicks = yTickValues.map((value) => ({
    value,
    y: plotBottom - (value / maxValue) * plotHeight,
  }));

  const labelFrequency = Math.max(1, Math.ceil(points.length / 12));
  const xLabels = points
    .map((point, index) => ({
      date: point.date,
      label: point.dateLabel,
      x: plotLeft + index * stepX,
      index,
    }))
    .filter(({ index }) => index % labelFrequency === 0 || index === points.length - 1)
    .map(({ date, label, x }) => ({ date, label, x }));

  return {
    width,
    height,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    maxValue,
    points,
    series,
    yTicks,
    xLabels,
  };
}

export function findAttendanceDailyOverview(
  daily: readonly AttendanceDailyOverview[],
  date: string | null,
): AttendanceDailyOverview | null {
  if (daily.length === 0) return null;
  if (date) {
    const found = daily.find((day) => day.date === date);
    if (found) return found;
  }
  return daily[daily.length - 1] ?? null;
}

function buildDistributionGroup(
  id: AttendanceStatusDistributionGroupId,
  label: string,
  description: string,
  statuses: readonly AttendanceStatus[],
  overview: AttendanceOverview,
): AttendanceStatusDistributionGroup {
  const total = statuses.reduce((sum, status) => sum + overview.summary.statusTotals[status], 0);
  const items = statuses
    .map((status) => {
      const presentation = ATTENDANCE_STATUS_PRESENTATION[status];
      const count = overview.summary.statusTotals[status];
      return {
        status,
        label: presentation.label,
        description: presentation.description,
        count,
        visualSharePercent: total > 0 ? round((count / total) * 100) : 0,
        tone: presentation.tone,
        order: presentation.order,
      };
    })
    .sort((left, right) => left.order - right.order)
    .map(({ order: _order, ...item }) => item);

  return { id, label, description, total, items };
}

function uniqueSortedNumbers(values: readonly number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
