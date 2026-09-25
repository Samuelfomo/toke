import type { AttendanceOverview } from '../types/attendance-statistics.types.js';
import { formatDurationMinutes } from './duration.js';
import { formatPercentage } from './percentage.js';

export const ATTENDANCE_KPI_IDS = [
  'attendance_rate',
  'punctuality_rate',
  'absences',
  'late_days',
  'issues',
  'adoption_rate',
  'net_duration',
] as const;

export type AttendanceKpiId = (typeof ATTENDANCE_KPI_IDS)[number];
export type AttendanceKpiTone = 'indigo' | 'sky' | 'rose' | 'amber' | 'orange' | 'slate';
export type AttendanceKpiIcon = 'attendance' | 'punctuality' | 'absence' | 'late' | 'issue' | 'adoption' | 'duration';

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
  const expectedDurationAvailable = summary.durations.daysWithKnownExpectedWorkDuration > 0;
  const absenceRateAvailable = summary.rates.absenceRate !== null;
  const lateRateAvailable = summary.rates.lateRate !== null;
  const issueRateAvailable = summary.rates.issueRate !== null;

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
          : `${summary.rates.attendedWorkingDays} rotation${plural(summary.rates.attendedWorkingDays)} couverte${plural(summary.rates.attendedWorkingDays)} sur ${summary.rates.employeeWorkingDaysExpected} rotation${plural(summary.rates.employeeWorkingDaysExpected)} de travail finalisée${plural(summary.rates.employeeWorkingDaysExpected)}`
        : operationalWorkingDays > 0
          ? `${observedPresence} présence${plural(observedPresence)} déjà observée${plural(observedPresence)}${pending > 0 ? ` et ${pending} situation${plural(pending)} encore en attente` : ''}. Le taux sera consolidé après finalisation.`
          : isSingleDay
            ? 'Aucune situation du jour n’est encore finalisée pour calculer ce taux.'
            : 'Aucune rotation de travail finalisée n’est actuellement éligible au calcul du taux.',
      detail: isSingleDay
        ? 'Le taux est calculé uniquement avec les collaborateurs dont la plage de travail prévue est terminée. Les situations encore en cours n’entrent pas encore dans le calcul.'
        : 'Le taux compare les rotations de travail finalisées couvertes par une présence aux rotations finalisées prises en compte. Les situations encore en cours restent visibles séparément.',
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
          : `${summary.rates.onTimeWorkingDays} arrivée${plural(summary.rates.onTimeWorkingDays)} à l’heure sur ${summary.rates.attendedWorkingDays} rotation${plural(summary.rates.attendedWorkingDays)} couverte${plural(summary.rates.attendedWorkingDays)}`
        : observedPresence > 0
          ? `${observedPresence} présence${plural(observedPresence)} déjà observée${plural(observedPresence)}, dont ${observedLate} retard${plural(observedLate)}. La ponctualité sera consolidée après finalisation.`
          : isSingleDay
            ? 'Aucune présence du jour n’est encore finalisée pour calculer la ponctualité.'
            : 'Aucune rotation couverte et finalisée n’est encore disponible pour calculer la ponctualité.',
      detail: isSingleDay
        ? 'La ponctualité est calculée uniquement sur les présences dont la plage de travail prévue est terminée. Les arrivées observées pendant une plage encore en cours restent hors du taux pour le moment.'
        : 'La ponctualité mesure la part des rotations couvertes dont l’arrivée respecte l’horaire prévu ou la tolérance autorisée.',
      tone: 'sky',
      icon: 'punctuality',
      available: punctualityRateAvailable,
    },

    {
      id: 'absences',
      label: 'Taux d’absence',
      value: formatPercentage(summary.rates.absenceRate),
      helper: summary.rates.absenceRate !== null
        ? `${summary.rates.absentWorkingDays} rotation${plural(summary.rates.absentWorkingDays)} non couverte${plural(summary.rates.absentWorkingDays)} sur ${summary.rates.employeeWorkingDaysExpected} rotation${plural(summary.rates.employeeWorkingDaysExpected)} finalisée${plural(summary.rates.employeeWorkingDaysExpected)}`
        : 'Aucune rotation de travail finalisée n’est actuellement éligible au calcul du taux d’absence.',
      detail:
        'Le taux d’absence correspond à la part des rotations de travail finalisées qui ne sont pas couvertes par une présence.',
      tone: 'rose',
      icon: 'absence',
      available: absenceRateAvailable,
    },

    {
      id: 'late_days',
      label: 'Taux de retard',
      value: formatPercentage(summary.rates.lateRate),
      helper: summary.rates.lateRate !== null
        ? `${summary.rates.lateWorkingDays} retard${plural(summary.rates.lateWorkingDays)} sur ${summary.rates.attendedWorkingDays} rotation${plural(summary.rates.attendedWorkingDays)} couverte${plural(summary.rates.attendedWorkingDays)}`
        : 'Aucune rotation couverte et finalisée n’est disponible pour calculer le taux de retard.',
      detail:
        'Le taux de retard correspond à la part des rotations couvertes dont l’arrivée dépasse l’horaire prévu après application de la tolérance autorisée.',
      tone: 'amber',
      icon: 'late',
      available: lateRateAvailable,
    },

    {
      id: 'issues',
      label: 'Journées à examiner',
      value: formatPercentage(summary.rates.issueRate),
      helper: summary.rates.issueRate !== null
        ? `${summary.rates.employeeDaysWithIssues} situation${plural(summary.rates.employeeDaysWithIssues)} avec au moins un élément à examiner sur ${summary.rates.employeeDaysAnalyzed} situation${plural(summary.rates.employeeDaysAnalyzed)} analysée${plural(summary.rates.employeeDaysAnalyzed)} pour l’ensemble de l’équipe`
        : 'Aucune situation n’est disponible pour calculer cette proportion.',
      detail:
        `${summary.issueCount} élément${plural(summary.issueCount)} à examiner au total. Une situation n’est comptée qu’une fois dans le pourcentage, même si plusieurs éléments y sont signalés.`,
      tone: 'orange',
      icon: 'issue',
      available: issueRateAvailable,
    },

    {
      id: 'adoption_rate',
      label: 'Adoption du pointage',
      value: 'N/D',
      helper: 'La règle métier de cet indicateur doit encore être validée avant calcul.',
      detail:
        'Aucun taux n’est calculé tant que les événements de pointage obligatoires et le traitement des sessions incomplètes ne sont pas définis.',
      tone: 'slate',
      icon: 'adoption',
      available: false,
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
        ? expectedDurationAvailable
          ? `sur ${formatDurationMinutes(summary.durations.expectedWorkMinutes, { emptyLabel: 'Non disponible' })} prévues sur la période`
          : `${summary.durations.daysWithKnownNetDuration} journée${plural(summary.durations.daysWithKnownNetDuration)} avec un temps de travail calculable`
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

export type AttendanceDecisionKpiId = 'attendance_rate' | 'punctuality_rate' | 'adoption_rate';
export type AttendanceDecisionKpiSegment = 'primary' | 'secondary';

export interface AttendanceDecisionKpiTrendPoint {
  date: string;
  primary: number;
  secondary: number;
}

export interface AttendanceDecisionKpiViewModel {
  id: AttendanceDecisionKpiId;
  eyebrow: string;
  title: string;
  primaryLabel: string;
  primaryRate: number | null;
  primaryCount: number | null;
  secondaryLabel: string;
  secondaryRate: number | null;
  secondaryCount: number | null;
  denominatorLabel: string;
  denominatorCount: number | null;
  explanation: string;
  attention: string | null;
  tone: 'indigo' | 'sky' | 'slate';
  available: boolean;
  trend: AttendanceDecisionKpiTrendPoint[];
}

/**
 * Vue décisionnelle des KPI. Les valeurs et compteurs proviennent exclusivement de l’API.
 * Le frontend ne fait ici que préparer leur présentation.
 */
export function buildPrimaryAttendanceKpis(
  overview: AttendanceOverview,
): AttendanceDecisionKpiViewModel[] {
  const { rates } = overview.summary;

  return [
    {
      id: 'attendance_rate',
      eyebrow: '01 — Couverture des rotations',
      title: 'Présence et absence',
      primaryLabel: 'Présence',
      primaryRate: rates.attendanceRate,
      primaryCount: rates.attendedWorkingDays,
      secondaryLabel: 'Absence',
      // secondaryLabel: 'Non couvertes',
      secondaryRate: rates.absenceRate,
      secondaryCount: rates.absentWorkingDays,
      denominatorLabel: 'rotations attendues',
      denominatorCount: rates.employeeWorkingDaysExpected,
      explanation:
        rates.attendanceRate === null
          ? 'Aucune rotation finalisée et éligible ne permet encore de consolider la présence.'
          : `Sur ${rates.employeeWorkingDaysExpected} rotation${plural(rates.employeeWorkingDaysExpected)} attendue${plural(rates.employeeWorkingDaysExpected)}, ${rates.attendedWorkingDays} ${rates.attendedWorkingDays === 1 ? 'a été couverte' : 'ont été couvertes'} et ${rates.absentWorkingDays} ${rates.absentWorkingDays === 1 ? 'ne l’a pas été' : 'ne l’ont pas été'}.`,
      attention:
        rates.absentWorkingDays > 0
          ? `${rates.absentWorkingDays} rotation${plural(rates.absentWorkingDays)} non couverte${plural(rates.absentWorkingDays)} à examiner.`
          : null,
      tone: 'indigo',
      available: rates.attendanceRate !== null && rates.absenceRate !== null,
      trend: overview.daily.map((day) => ({
        date: day.date,
        primary: day.rates.attendedWorkingDays,
        secondary: day.rates.absentWorkingDays,
      })),
    },
    {
      id: 'punctuality_rate',
      eyebrow: '02 — Respect des horaires',
      title: 'Ponctualité et retard',
      primaryLabel: 'À l’heure',
      primaryRate: rates.punctualityRate,
      primaryCount: rates.onTimeWorkingDays,
      secondaryLabel: 'Retard',
      secondaryRate: rates.lateRate,
      secondaryCount: rates.lateWorkingDays,
      denominatorLabel: 'rotations couvertes',
      denominatorCount: rates.attendedWorkingDays,
      explanation:
        rates.punctualityRate === null
          ? 'Aucune rotation couverte et finalisée ne permet encore de consolider la ponctualité.'
          : `Parmi les ${rates.attendedWorkingDays} rotation${plural(rates.attendedWorkingDays)} couverte${plural(rates.attendedWorkingDays)}, ${rates.onTimeWorkingDays} ${rates.onTimeWorkingDays === 1 ? 'a commencé' : 'ont commencé'} à l’heure, tolérance comprise, et ${rates.lateWorkingDays} en retard.`,
      attention:
        rates.lateWorkingDays > 0
          ? `${rates.lateWorkingDays} retard${plural(rates.lateWorkingDays)} à examiner.`
          : null,
      tone: 'sky',
      available: rates.punctualityRate !== null && rates.lateRate !== null,
      trend: overview.daily.map((day) => ({
        date: day.date,
        primary: day.rates.onTimeWorkingDays,
        secondary: day.rates.lateWorkingDays,
      })),
    },
    {
      id: 'adoption_rate',
      eyebrow: '03 — Utilisation du dispositif',
      title: 'Adoption du pointage',
      primaryLabel: 'Pointages effectués',
      primaryRate: null,
      primaryCount: null,
      secondaryLabel: 'Pointages manquants',
      secondaryRate: null,
      secondaryCount: null,
      denominatorLabel: 'base de calcul',
      denominatorCount: null,
      explanation:
        'La règle métier de l’adoption doit encore être validée : événements obligatoires, pauses et traitement des sessions incomplètes.',
      attention: null,
      tone: 'slate',
      available: false,
      trend: [],
    },
  ];
}

export function buildAttendanceDurationInsight(
  overview: AttendanceOverview,
): AttendanceKpiViewModel {
  const { durations } = overview.summary;
  const available = durations.daysWithKnownNetDuration > 0;
  const attributedKnown = durations.occurrencesWithKnownAttributedWorkDuration;
  const expectedKnown = durations.daysWithKnownExpectedWorkDuration;

  return {
    id: 'net_duration',
    label: 'Durée nette enregistrée',
    value: available
      ? formatDurationMinutes(durations.netMinutes, { emptyLabel: 'Non disponible' })
      : 'Non disponible',
    helper: available
      ? `${durations.daysWithKnownNetDuration} journée${plural(durations.daysWithKnownNetDuration)} avec une durée nette calculable`
      : 'Le temps de travail ne peut pas être calculé pour cette période',
    detail:
      attributedKnown > 0
        ? `${formatDurationMinutes(durations.attributedWorkMinutes, { emptyLabel: 'Non disponible' })} sont attribuables de façon fiable à ${attributedKnown} occurrence${plural(attributedKnown)} de planning. Le planning dispose d’une durée prévue sur ${expectedKnown} journée${plural(expectedKnown)} ; ces périmètres ne sont pas mis directement en ratio lorsqu’ils diffèrent.`
        : `Aucune durée enregistrée ne peut encore être attribuée de façon fiable à une occurrence de planning. Le planning dispose d’une durée prévue sur ${expectedKnown} journée${plural(expectedKnown)}.`,
    tone: 'slate',
    icon: 'duration',
    available,
  };
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

function plural(value: number): string {
  return value === 1 ? '' : 's';
}
