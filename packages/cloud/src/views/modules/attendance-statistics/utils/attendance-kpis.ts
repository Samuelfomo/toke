import type { AttendanceOverview } from '../types/attendance-statistics.types.js';

import { formatDurationMinutes } from './duration.js';
import { formatPercentage } from './percentage.js';

export const ATTENDANCE_KPI_IDS = [
  'attendance_rate',
  'punctuality_rate',
  'absences',
  'late_days',
  'issues',
  'net_duration',
] as const;

export type AttendanceKpiId = (typeof ATTENDANCE_KPI_IDS)[number];
export type AttendanceKpiTone = 'indigo' | 'sky' | 'rose' | 'amber' | 'orange' | 'slate';
export type AttendanceKpiIcon = 'attendance' | 'punctuality' | 'absence' | 'late' | 'issue' | 'duration';

export interface AttendanceKpiViewModel {
  id: AttendanceKpiId;
  label: string;
  value: string;
  helper: string;
  detail: string;
  tone: AttendanceKpiTone;
  icon: AttendanceKpiIcon;
  available: boolean;
}

/**
 * Prépare les indicateurs à afficher à partir des résultats déjà produits par l'API.
 *
 * Deux niveaux sont volontairement distingués :
 * - statusTotals = situation observée, y compris sur une journée encore en cours ;
 * - rates = données déjà éligibles/consolidées pour les taux.
 *
 * Aucun statut ni taux n'est recalculé ici.
 */
export function buildAttendanceKpis(overview: AttendanceOverview): AttendanceKpiViewModel[] {
  const { summary } = overview;

  const isSingleDay = overview.period.dayCount === 1;
  const attendanceRateAvailable = summary.rates.attendanceRate !== null;
  const punctualityRateAvailable = summary.rates.punctualityRate !== null;
  const netDurationAvailable = summary.durations.daysWithKnownNetDuration > 0;
  const absenceEmployeeRateAvailable = summary.employeeImpact.absenceEmployeeRate !== null;
  const lateEmployeeRateAvailable = summary.employeeImpact.lateEmployeeRate !== null;
  const issueEmployeeRateAvailable = summary.employeeImpact.issueEmployeeRate !== null;

  const observedOnTime = summary.statusTotals.PRESENT;
  const observedLate = summary.statusTotals.LATE;
  const observedPresence = observedOnTime + observedLate;
  const pending = summary.statusTotals.PENDING;
  const operationalWorkingDays =
    summary.statusTotals.PRESENT +
    summary.statusTotals.LATE +
    summary.statusTotals.ABSENT +
    summary.statusTotals.PENDING;

  const consolidatedLate = summary.rates.lateWorkingDays;
  const nonConsolidatedLate = Math.max(0, observedLate - consolidatedLate);
  const finalizedExpected = summary.rates.employeeWorkingDaysExpected;
  const finalizedPresence = summary.rates.attendedWorkingDays;
  const finalizedAbsence = Math.max(0, finalizedExpected - finalizedPresence);

  return [
    {
      id: 'attendance_rate',
      label: 'Taux de présence',
      value: formatPercentage(summary.rates.attendanceRate),
      helper: attendanceRateAvailable
        ? isSingleDay
          ? buildSingleDayAttendanceHelper(finalizedPresence, finalizedExpected, finalizedAbsence)
          : `${summary.rates.attendedWorkingDays} journée${plural(summary.rates.attendedWorkingDays)} avec présence sur ${summary.rates.employeeWorkingDaysExpected} journée${plural(summary.rates.employeeWorkingDaysExpected)} de travail finalisée${plural(summary.rates.employeeWorkingDaysExpected)} prise${plural(summary.rates.employeeWorkingDaysExpected)} en compte`
        : operationalWorkingDays > 0
          ? `${observedPresence} présence${plural(observedPresence)} déjà observée${plural(observedPresence)}${pending > 0 ? ` et ${pending} situation${plural(pending)} encore en attente` : ''}. Le taux sera consolidé après finalisation.`
          : isSingleDay
            ? 'Aucune situation du jour n’est encore finalisée pour calculer ce taux.'
            : 'Aucune journée finalisée n’est actuellement éligible au calcul du taux.',
      detail: isSingleDay
        ? 'Le taux est calculé uniquement avec les collaborateurs dont la plage de travail prévue est terminée. Les situations encore en cours n’entrent pas encore dans le calcul.'
        : 'Le taux utilise uniquement les journées de travail finalisées et éligibles. Les situations encore en cours restent visibles séparément.',
      tone: 'indigo',
      icon: 'attendance',
      available: attendanceRateAvailable,
    },

    {
      id: 'punctuality_rate',
      label: 'Ponctualité',
      value: formatPercentage(summary.rates.punctualityRate),
      helper: punctualityRateAvailable
        ? isSingleDay
          ? buildSingleDayPunctualityHelper(summary.rates.onTimeWorkingDays, finalizedPresence)
          : `${summary.rates.onTimeWorkingDays} journée${plural(summary.rates.onTimeWorkingDays)} à l’heure sur ${summary.rates.attendedWorkingDays} journée${plural(summary.rates.attendedWorkingDays)} finalisée${plural(summary.rates.attendedWorkingDays)} avec présence`
        : observedPresence > 0
          ? `${observedPresence} présence${plural(observedPresence)} déjà observée${plural(observedPresence)}, dont ${observedLate} retard${plural(observedLate)}. La ponctualité sera consolidée après finalisation.`
          : isSingleDay
            ? 'Aucune présence du jour n’est encore finalisée pour calculer la ponctualité.'
            : 'Aucune journée avec présence finalisée n’est encore disponible pour calculer la ponctualité.',
      detail: isSingleDay
        ? 'La ponctualité est calculée uniquement sur les présences dont la plage de travail prévue est terminée. Les arrivées observées pendant une plage encore en cours restent hors du taux pour le moment.'
        : 'La ponctualité consolidée est calculée uniquement sur les journées avec présence devenues éligibles au taux.',
      tone: 'sky',
      icon: 'punctuality',
      available: punctualityRateAvailable,
    },

    {
      id: 'absences',
      label: `Taux d'absence`,
      // label: 'Employés concernés par une absence',
      value: formatPercentage(summary.employeeImpact.absenceEmployeeRate),
      helper: buildEmployeeImpactHelper(
        summary.employeeImpact.employeesWithAbsence,
        overview.scope.teamSize,
        summary.statusTotals.ABSENT,
        'absence',
      ),
      detail:
        'Cet indicateur mesure la part des employés ayant au moins une absence confirmée sur la période. Un même employé n’est compté qu’une seule fois dans le pourcentage.',
      tone: 'rose',
      icon: 'absence',
      available: absenceEmployeeRateAvailable,
    },

    {
      id: 'late_days',
      label: 'Taux de retard',
      // label: 'Employés concernés par un retard',
      value: formatPercentage(summary.employeeImpact.lateEmployeeRate),
      helper: buildEmployeeImpactHelper(
        summary.employeeImpact.employeesWithLate,
        overview.scope.teamSize,
        observedLate,
        'late',
      ),
      detail:
        'Cet indicateur mesure la part des employés ayant au moins un retard observé sur la période. Le nombre de journées avec retard reste disponible comme information de détail.',
      tone: 'amber',
      icon: 'late',
      available: lateEmployeeRateAvailable,
    },

    {
      id: 'issues',
      label: `Taux d'anomalie`,
      // label: 'Employés avec des éléments à examiner',
      value: formatPercentage(summary.employeeImpact.issueEmployeeRate),
      helper: buildEmployeeImpactHelper(
        summary.employeeImpact.employeesWithIssues,
        overview.scope.teamSize,
        summary.issueCount,
        'issue',
      ),
      detail:
        'Cet indicateur mesure la part des employés ayant au moins une situation signalée à vérifier sur la période. Les occurrences restent accessibles dans le détail.',
      tone: 'orange',
      icon: 'issue',
      available: issueEmployeeRateAvailable,
    },

    {
      id: 'net_duration',
      label: 'Temps de travail enregistré',
      value: netDurationAvailable
        ? formatDurationMinutes(summary.durations.netMinutes, {
            emptyLabel: 'Non disponible',
          })
        : 'Non disponible',
      helper: netDurationAvailable
        ? `${summary.durations.daysWithKnownNetDuration} journée${plural(summary.durations.daysWithKnownNetDuration)} avec un temps de travail calculable`
        : 'Le temps de travail ne peut pas être calculé pour cette période',
      detail:
        summary.durations.daysWithMissingDuration > 0
          ? `${summary.durations.daysWithMissingDuration} journée${plural(summary.durations.daysWithMissingDuration)} avec des informations de pointage incomplètes.`
          : 'Toutes les journées concernées disposent des informations nécessaires au calcul du temps de travail.',
      tone: 'slate',
      icon: 'duration',
      available: netDurationAvailable,
    },
  ];
}

export function buildPrimaryAttendanceKpis(
  overview: AttendanceOverview,
): AttendanceKpiViewModel[] {
  return buildAttendanceKpis(overview).filter((card) => card.id !== 'net_duration');
}

export function buildAttendanceDurationInsight(
  overview: AttendanceOverview,
): AttendanceKpiViewModel {
  const duration = buildAttendanceKpis(overview).find((card) => card.id === 'net_duration');

  if (!duration) {
    throw new Error('Impossible de préparer les informations sur le temps de travail.');
  }

  return duration;
}

function buildSingleDayAttendanceHelper(
  attended: number,
  expected: number,
  absent: number,
): string {
  if (expected <= 0) {
    return 'Aucun collaborateur n’a encore une situation finalisée permettant de calculer ce taux.';
  }

  const expectedLabel = `${expected} collaborateur${plural(expected)} dont ${expected === 1 ? 'la plage de travail prévue est déjà terminée' : 'les plages de travail prévues sont déjà terminées'}`;
  const attendanceLabel = `${attended} ${attended === 1 ? 'a une présence enregistrée' : 'ont une présence enregistrée'}`;

  if (absent <= 0) {
    return `Parmi les ${expectedLabel}, ${attendanceLabel} et aucune absence n’est confirmée.`;
  }

  return `Parmi les ${expectedLabel}, ${attendanceLabel} et ${absent} ${absent === 1 ? 'est absent' : 'sont absents'}.`;
}

function buildSingleDayPunctualityHelper(onTime: number, attended: number): string {
  if (attended <= 0) {
    return 'Aucune présence finalisée n’est encore disponible pour mesurer la ponctualité.';
  }

  if (onTime === 0) {
    return `Parmi les ${attended} présence${plural(attended)} déjà finalisée${plural(attended)}, aucune arrivée n’a respecté l’horaire prévu ou la tolérance autorisée.`;
  }

  return `Parmi les ${attended} présence${plural(attended)} déjà finalisée${plural(attended)}, ${onTime} arrivée${plural(onTime)} ${onTime === 1 ? 'a' : 'ont'} respecté l’horaire prévu ou la tolérance autorisée.`;
}

function buildEmployeeImpactHelper(
  employeesConcerned: number,
  teamSize: number,
  occurrenceCount: number,
  kind: 'absence' | 'late' | 'issue',
): string {
  if (teamSize <= 0) {
    return 'Aucun employé dans le périmètre analysé.';
  }

  const employeePart = `${employeesConcerned} employé${plural(employeesConcerned)} sur ${teamSize} concerné${plural(employeesConcerned)}`;

  if (kind === 'absence') {
    return `${employeePart} · ${occurrenceCount} journée${plural(occurrenceCount)} d’absence confirmée${plural(occurrenceCount)}`;
  }

  if (kind === 'late') {
    return `${employeePart} · ${occurrenceCount} journée${plural(occurrenceCount)} avec retard`;
  }

  return `${employeePart} · ${occurrenceCount} élément${plural(occurrenceCount)} à examiner`;
}

function plural(value: number): string {
  return value === 1 ? '' : 's';
}
