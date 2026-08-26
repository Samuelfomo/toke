import type {
  AttendanceDailyOverview,
  AttendanceOverview,
  BusinessDate,
} from '../../types/attendance-statistics.types.js';
import { buildAttendanceDailyTrendPoints } from '../../utils/attendance-visualizations.js';
import { formatBusinessDate } from '../../utils/business-date.js';
import { formatPercentage } from '../../utils/percentage.js';
import { formatDurationMinutes } from '../../utils/duration.js';
import { ATTENDANCE_PDF_PAGINATION_TARGETS } from '../config/attendance-pdf-layout.js';

export interface AttendancePdfTrendRow {
  date: BusinessDate;
  dateLabel: string;
  expected: number;
  attended: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number | null;
  attendanceRateLabel: string;
  punctualityRate: number | null;
  punctualityRateLabel: string;
  netDurationMinutes: number | null;
  netDurationLabel: string;
  issueCount: number;
}

export interface AttendancePdfTrendSegment {
  index: number;
  startDate: BusinessDate;
  endDate: BusinessDate;
  periodLabel: string;
  rows: AttendancePdfTrendRow[];
}

export interface AttendancePdfTrendModel {
  title: string;
  description: string;
  segments: AttendancePdfTrendSegment[];
  totalDays: number;
  maxDaysPerSegment: number;
}

function toRow(day: AttendanceDailyOverview): AttendancePdfTrendRow {
  return {
    date: day.date,
    dateLabel: formatBusinessDate(day.date, 'fr-FR', { day: '2-digit', month: 'short' }),
    expected: day.rates.employeeWorkingDaysExpected,
    attended: day.rates.attendedWorkingDays,
    present: day.statusTotals.PRESENT,
    late: day.statusTotals.LATE,
    absent: day.statusTotals.ABSENT,
    attendanceRate: day.rates.attendanceRate,
    attendanceRateLabel: formatPercentage(day.rates.attendanceRate, { maximumFractionDigits: 1 }),
    punctualityRate: day.rates.punctualityRate,
    punctualityRateLabel: formatPercentage(day.rates.punctualityRate, { maximumFractionDigits: 1 }),
    netDurationMinutes:
      day.durations && day.durations.daysWithKnownNetDuration > 0
        ? day.durations.netMinutes
        : null,
    netDurationLabel:
      day.durations && day.durations.daysWithKnownNetDuration > 0
        ? formatDurationMinutes(day.durations.netMinutes, { emptyLabel: 'Non disponible' })
        : 'Non disponible',
    issueCount: day.issueCount,
  };
}

function toPeriodLabel(startDate: BusinessDate, endDate: BusinessDate): string {
  const start = formatBusinessDate(startDate, 'fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const end = formatBusinessDate(endDate, 'fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return startDate === endDate ? start : `${start} - ${end}`;
}

/**
 * Segmente uniquement les données quotidiennes déjà retournées par l'API.
 * Aucun regroupement mensuel ni aucune nouvelle moyenne n'est calculé ici.
 */
export function buildAttendancePdfTrendModel(overview: AttendanceOverview): AttendancePdfTrendModel {
  const maxDays = ATTENDANCE_PDF_PAGINATION_TARGETS.trendDaysPerSegmentMax;
  const sortedDaily = [...overview.daily].sort((left, right) => left.date.localeCompare(right.date));

  // On réutilise le builder frontend pour garantir que les séries de tendance reposent
  // sur la même lecture de daily[]. Les valeurs ci-dessous restent celles de l'API.
  const points = buildAttendanceDailyTrendPoints(sortedDaily);
  const pointByDate = new Map(points.map((point) => [point.date, point]));
  const rows = sortedDaily.map((day) => {
    const row = toRow(day);
    const point = pointByDate.get(day.date);
    if (!point) return row;
    return {
      ...row,
      expected: point.expected,
      attended: point.attended,
      present: point.present,
      absent: point.absent,
      late: point.late,
      issueCount: point.issues,
      attendanceRate: point.attendanceRate,
      attendanceRateLabel: formatPercentage(point.attendanceRate, { maximumFractionDigits: 1 }),
      punctualityRate: point.punctualityRate,
      punctualityRateLabel: formatPercentage(point.punctualityRate, { maximumFractionDigits: 1 }),
    };
  });

  const segments: AttendancePdfTrendSegment[] = [];
  for (let offset = 0; offset < rows.length; offset += maxDays) {
    const segmentRows = rows.slice(offset, offset + maxDays);
    const first = segmentRows[0];
    const last = segmentRows[segmentRows.length - 1];
    if (!first || !last) continue;
    segments.push({
      index: segments.length,
      startDate: first.date,
      endDate: last.date,
      periodLabel: toPeriodLabel(first.date, last.date),
      rows: segmentRows,
    });
  }

  return {
    title: 'Évolution de la période',
    description:
      'Lecture quotidienne des journées attendues, journées suivies, absences et retards. Le tableau ajoute la durée nette enregistrée de chaque journée, fournie par l’API.',
    segments,
    totalDays: rows.length,
    maxDaysPerSegment: maxDays,
  };
}
