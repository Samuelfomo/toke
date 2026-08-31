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
      label: 'Absences confirmées',
      value: formatCount(summary.statusTotals.ABSENT),
      helper:
        summary.statusTotals.ABSENT === 0
          ? pending > 0
            ? `Aucune absence n’est encore confirmée. ${pending} situation${plural(pending)} reste${pending === 1 ? '' : 'nt'} en attente de finalisation.`
            : 'Aucune absence confirmée sur cette période.'
          : isSingleDay
            ? buildSingleDayAbsenceHelper(summary.statusTotals.ABSENT)
            : `${summary.statusTotals.ABSENT} journée${plural(summary.statusTotals.ABSENT)} d’absence confirmée${plural(summary.statusTotals.ABSENT)}`,
      detail:
        'Une absence est comptée uniquement lorsqu’une journée de travail valide est terminée et qu’aucune présence exploitable n’a été enregistrée.',
      tone: 'rose',
      icon: 'absence',
      available: true,
    },

    {
      id: 'late_days',
      label: 'Retards observés',
      value: formatCount(observedLate),
      helper: buildLateHelper(observedLate, consolidatedLate, nonConsolidatedLate, isSingleDay),
      detail: isSingleDay
        ? 'Le total comprend tous les retards déjà observés aujourd’hui. Seuls ceux dont la plage de travail prévue est terminée sont déjà intégrés au taux de ponctualité.'
        : 'Le total affiché correspond aux retards déjà observés. Les taux n’intègrent que les retards des journées devenues éligibles.',
      tone: 'amber',
      icon: 'late',
      available: true,
    },

    {
      id: 'issues',
      label: 'Éléments à examiner',
      value: formatCount(summary.issueCount),
      helper:
        summary.issueCount === 0
          ? isSingleDay
            ? 'Aucune situation particulière ne nécessite de vérification aujourd’hui.'
            : 'Aucun élément particulier à examiner sur cette période.'
          : isSingleDay
            ? `${summary.issueCount} situation${plural(summary.issueCount)} nécessite${summary.issueCount === 1 ? '' : 'nt'} une vérification dans les pointages, sessions ou plannings.`
            : `${summary.issueCount} élément${plural(summary.issueCount)} nécessite${summary.issueCount === 1 ? '' : 'nt'} votre attention`,
      detail:
        'Consultez ces éléments pour vérifier les situations qui peuvent nécessiter une analyse ou une correction.',
      tone: 'orange',
      icon: 'issue',
      available: true,
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

function buildLateHelper(
  observed: number,
  consolidated: number,
  pending: number,
  isSingleDay: boolean,
): string {
  if (observed === 0) {
    return isSingleDay ? 'Aucun retard observé aujourd’hui.' : 'Aucun retard observé sur cette période.';
  }

  if (!isSingleDay) {
    if (pending <= 0) {
      return `${observed} journée${plural(observed)} avec une arrivée après l’heure prévue.`;
    }

    if (consolidated === 0) {
      return `${observed} retard${plural(observed)} déjà observé${plural(observed)} sur ${observed === 1 ? 'une journée encore en cours' : 'des journées encore en cours'}.`;
    }

    return `${observed} retard${plural(observed)} observé${plural(observed)} : ${consolidated} consolidé${plural(consolidated)} et ${pending} encore en cours.`;
  }

  const subject = `${observed} collaborateur${plural(observed)} ${observed === 1 ? 'est arrivé' : 'sont arrivés'} en retard aujourd’hui`;

  if (pending <= 0) {
    return `${subject}. ${observed === 1 ? 'Sa situation est déjà finalisée et prise' : 'Toutes ces situations sont déjà finalisées et prises'} en compte dans la ponctualité.`;
  }

  if (consolidated === 0) {
    return `${subject}. ${observed === 1 ? 'Sa situation est encore en cours' : 'Ces situations sont encore en cours'} et ${observed === 1 ? 'ne modifie' : 'ne modifient'} pas encore le taux de ponctualité.`;
  }

  return `${subject} : ${consolidated} situation${plural(consolidated)} ${consolidated === 1 ? 'est déjà finalisée et prise' : 'sont déjà finalisées et prises'} en compte dans la ponctualité, ${pending} ${pending === 1 ? 'est encore en cours' : 'sont encore en cours'}.`;
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

function buildSingleDayAbsenceHelper(absent: number): string {
  if (absent === 1) {
    return '1 collaborateur n’a enregistré aucune présence alors que sa plage de travail prévue est terminée.';
  }

  return `${absent} collaborateurs n’ont enregistré aucune présence alors que leurs plages de travail prévues sont terminées.`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(value);
}

function plural(value: number): string {
  return value === 1 ? '' : 's';
}
