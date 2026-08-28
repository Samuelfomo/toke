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
 * Prépare les indicateurs à afficher à partir des statistiques déjà calculées.
 * Aucun résultat métier n'est recalculé dans ce fichier.
 */
export function buildAttendanceKpis(overview: AttendanceOverview): AttendanceKpiViewModel[] {
    const { summary } = overview;

    const attendanceRateAvailable = summary.rates.attendanceRate !== null;
    const punctualityRateAvailable = summary.rates.punctualityRate !== null;
    const netDurationAvailable = summary.durations.daysWithKnownNetDuration > 0;

    return [
        {
            id: 'attendance_rate',
            label: 'Taux de présence',
            value: formatPercentage(summary.rates.attendanceRate),
            helper: attendanceRateAvailable
                ? `${summary.rates.attendedWorkingDays} journée${plural(summary.rates.attendedWorkingDays)} de présence sur ${summary.rates.employeeWorkingDaysExpected} journée${plural(summary.rates.employeeWorkingDaysExpected)} de travail prévue${plural(summary.rates.employeeWorkingDaysExpected)}`
                : 'Aucune journée de travail prévue sur cette période',
            detail:
                'Indique la part des journées de travail prévues pendant lesquelles une présence a été enregistrée, avec ou sans retard.',
            tone: 'indigo',
            icon: 'attendance',
            available: attendanceRateAvailable,
        },

        {
            id: 'punctuality_rate',
            label: 'Ponctualité',
            value: formatPercentage(summary.rates.punctualityRate),
            helper: punctualityRateAvailable
                ? `${summary.rates.onTimeWorkingDays} journée${plural(summary.rates.onTimeWorkingDays)} à l’heure sur ${summary.rates.attendedWorkingDays} journée${plural(summary.rates.attendedWorkingDays)} avec présence`
                : 'Aucune présence enregistrée permettant de mesurer la ponctualité',
            detail:
                'Indique la part des journées avec présence pour lesquelles l’arrivée a été enregistrée à l’heure.',
            tone: 'sky',
            icon: 'punctuality',
            available: punctualityRateAvailable,
        },

        {
            id: 'absences',
            label: 'Absences',
            value: formatCount(summary.statusTotals.ABSENT),
            helper:
                summary.statusTotals.ABSENT === 0
                    ? 'Aucune absence confirmée sur cette période'
                    : `${summary.statusTotals.ABSENT} journée${plural(summary.statusTotals.ABSENT)} d’absence confirmée${plural(summary.statusTotals.ABSENT)}`,
            detail:
                'Seules les journées de travail terminées et considérées comme absentes sont comptabilisées ici.',
            tone: 'rose',
            icon: 'absence',
            available: true,
        },

        {
            id: 'late_days',
            label: 'Retards',
            value: formatCount(summary.statusTotals.LATE),
            helper:
                summary.rates.lateWorkingDays === 0
                    ? 'Aucun retard enregistré sur cette période'
                    : `${summary.rates.lateWorkingDays} journée${plural(summary.rates.lateWorkingDays)} avec une arrivée après l’heure prévue`,
            detail:
                'Une arrivée en retard reste comptabilisée comme une présence.',
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
                    ? 'Aucun élément particulier à examiner sur cette période'
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
    return buildAttendanceKpis(overview).filter(
        (card) => card.id !== 'net_duration',
    );
}

export function buildAttendanceDurationInsight(
    overview: AttendanceOverview,
): AttendanceKpiViewModel {
    const duration = buildAttendanceKpis(overview).find(
        (card) => card.id === 'net_duration',
    );

    if (!duration) {
        throw new Error(
            'Impossible de préparer les informations sur le temps de travail.',
        );
    }

    return duration;
}

function formatCount(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
        maximumFractionDigits: 0,
    }).format(value);
}

function plural(value: number): string {
    return value === 1 ? '' : 's';
}


// import type { AttendanceOverview } from '../types/attendance-statistics.types.js';
// import { formatDurationMinutes } from './duration.js';
// import { formatPercentage } from './percentage.js';
//
// export const ATTENDANCE_KPI_IDS = [
//   'attendance_rate',
//   'punctuality_rate',
//   'absences',
//   'late_days',
//   'issues',
//   'net_duration',
// ] as const;
//
// export type AttendanceKpiId = (typeof ATTENDANCE_KPI_IDS)[number];
// export type AttendanceKpiTone = 'indigo' | 'sky' | 'rose' | 'amber' | 'orange' | 'slate';
// export type AttendanceKpiIcon = 'attendance' | 'punctuality' | 'absence' | 'late' | 'issue' | 'duration';
//
// export interface AttendanceKpiViewModel {
//   id: AttendanceKpiId;
//   label: string;
//   value: string;
//   helper: string;
//   detail: string;
//   tone: AttendanceKpiTone;
//   icon: AttendanceKpiIcon;
//   available: boolean;
// }
//
// /**
//  * Transforme uniquement les résultats déjà calculés par l'API en contenu d'affichage.
//  * Aucun statut, taux ou total métier n'est recalculé ici.
//  */
// export function buildAttendanceKpis(overview: AttendanceOverview): AttendanceKpiViewModel[] {
//   const { summary } = overview;
//   const attendanceRateAvailable = summary.rates.attendanceRate !== null;
//   const punctualityRateAvailable = summary.rates.punctualityRate !== null;
//   const netDurationAvailable = summary.durations.daysWithKnownNetDuration > 0;
//
//   return [
//     {
//       id: 'attendance_rate',
//       label: 'Taux de présence',
//       value: formatPercentage(summary.rates.attendanceRate),
//       helper: attendanceRateAvailable
//         ? `${summary.rates.attendedWorkingDays} journée${plural(summary.rates.attendedWorkingDays)} suivie${plural(summary.rates.attendedWorkingDays)} sur ${summary.rates.employeeWorkingDaysExpected} attendue${plural(summary.rates.employeeWorkingDaysExpected)}`
//         : 'Aucune journée éligible sur la période',
//       detail: 'Présences à l’heure et retards sur les journées de travail attendues.',
//       tone: 'indigo',
//       icon: 'attendance',
//       available: attendanceRateAvailable,
//     },
//     {
//       id: 'punctuality_rate',
//       label: 'Ponctualité',
//       value: formatPercentage(summary.rates.punctualityRate),
//       helper: punctualityRateAvailable
//         ? `${summary.rates.onTimeWorkingDays} journée${plural(summary.rates.onTimeWorkingDays)} à l’heure sur ${summary.rates.attendedWorkingDays} suivie${plural(summary.rates.attendedWorkingDays)}`
//         : 'Aucune présence éligible à la ponctualité',
//       detail: 'Mesurée uniquement sur les journées avec présence enregistrée.',
//       tone: 'sky',
//       icon: 'punctuality',
//       available: punctualityRateAvailable,
//     },
//     {
//       id: 'absences',
//       label: 'Absences finalisées',
//       value: formatCount(summary.statusTotals.ABSENT),
//       helper: `${summary.statusTotals.ABSENT} journée${plural(summary.statusTotals.ABSENT)} classée${plural(summary.statusTotals.ABSENT)} ABSENT`,
//       detail: 'Les journées PENDING, REST_DAY et UNDETERMINED sont exclues.',
//       tone: 'rose',
//       icon: 'absence',
//       available: true,
//     },
//     {
//       id: 'late_days',
//       label: 'Retards',
//       value: formatCount(summary.statusTotals.LATE),
//       helper: `${summary.rates.lateWorkingDays} journée${plural(summary.rates.lateWorkingDays)} au-delà de la tolérance`,
//       detail: 'Le retard reste une présence et compte dans le taux de présence.',
//       tone: 'amber',
//       icon: 'late',
//       available: true,
//     },
//     {
//       id: 'issues',
//       label: 'Éléments à examiner',
//       value: formatCount(summary.issueCount),
//       helper:
//         summary.issueCount === 0
//           ? 'Aucun signalement sur la période'
//           : `${summary.issueCount} signalement${plural(summary.issueCount)} retourné${plural(summary.issueCount)} par l’API`,
//       detail: 'Les actions détaillées seront présentées dans le panneau des anomalies.',
//       tone: 'orange',
//       icon: 'issue',
//       available: true,
//     },
//     {
//       id: 'net_duration',
//       label: 'Durée nette enregistrée',
//       value: netDurationAvailable
//         ? formatDurationMinutes(summary.durations.netMinutes, { emptyLabel: 'Non disponible' })
//         : 'Non disponible',
//       helper: netDurationAvailable
//         ? `${summary.durations.daysWithKnownNetDuration} journée${plural(summary.durations.daysWithKnownNetDuration)} avec durée nette connue`
//         : 'Aucune durée nette exploitable',
//       detail:
//         summary.durations.daysWithMissingDuration > 0
//           ? `${summary.durations.daysWithMissingDuration} journée${plural(summary.durations.daysWithMissingDuration)} avec durée manquante.`
//           : 'Aucune durée manquante signalée.',
//       tone: 'slate',
//       icon: 'duration',
//       available: netDurationAvailable,
//     },
//   ];
// }
//
// export function buildPrimaryAttendanceKpis(overview: AttendanceOverview): AttendanceKpiViewModel[] {
//   return buildAttendanceKpis(overview).filter((card) => card.id !== 'net_duration');
// }
//
// export function buildAttendanceDurationInsight(overview: AttendanceOverview): AttendanceKpiViewModel {
//   const duration = buildAttendanceKpis(overview).find((card) => card.id === 'net_duration');
//   if (!duration) throw new Error('Durée nette introuvable dans le modèle KPI');
//   return duration;
// }
//
// function formatCount(value: number): string {
//   return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
// }
//
// function plural(value: number): string {
//   return value === 1 ? '' : 's';
// }
