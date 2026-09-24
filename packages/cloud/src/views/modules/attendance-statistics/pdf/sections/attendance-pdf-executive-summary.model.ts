import { formatAttendancePdfDuration } from '../formatters/attendance-pdf-duration.js';
import type {
    AttendanceDataQualityLevel,
    AttendanceIssue,
    AttendanceOverview,
    AttendanceStatus,
} from '../../types/attendance-statistics.types.js';
import { buildAttendanceDataQualityPresentation } from '../../utils/attendance-data-quality.js';
import {
    buildAttendanceDurationInsight,
    buildPrimaryAttendanceKpis,
} from '../../utils/attendance-kpis.js';
import { sortAttendanceIssues } from '../../utils/attendance-issues.js';
import {
    ATTENDANCE_ISSUE_PRESENTATION,
    ATTENDANCE_STATUS_PRESENTATION,
} from '../../utils/attendance-status.js';
import { ATTENDANCE_PDF_PAGINATION_TARGETS } from '../config/attendance-pdf-layout.js';
import type { AttendancePdfExportMode } from '../types/attendance-pdf.types.js';

export interface AttendancePdfExecutiveKpi {
    id: 'attendance_rate' | 'punctuality_rate' | 'absences' | 'late_days' | 'issues' | 'alerts';
    label: string;
    value: string;
    explanation: string;
    accent: 'accent' | 'success' | 'danger' | 'warning';
}

export interface AttendancePdfExecutiveQuality {
    level: AttendanceDataQualityLevel;
    label: string;
    message: string;
    signals: Array<{ label: string; value: number }>;
}

export interface AttendancePdfExecutiveDurationInsight {
    label: string;
    value: string;
    helper: string;
    detail: string;
    available: boolean;
}

export interface AttendancePdfExecutiveStatusRow {
    status: AttendanceStatus;
    label: string;
    count: number;
    group: 'eligible' | 'excluded';
}

export interface AttendancePdfExecutiveAttentionItem {
    issue: AttendanceIssue;
    label: string;
    count: number;
    employeesConcerned: number;
}

export interface AttendancePdfExecutiveSummaryModel {
    title: string;
    scopeLine: string;
    isSingleDay: boolean;
    statusPanelTitle: string;
    eligibleGroupLabel: string;
    excludedGroupLabel: string;
    attentionEmptyLabel: string;
    quality: AttendancePdfExecutiveQuality;
    kpis: AttendancePdfExecutiveKpi[];
    durationInsight: AttendancePdfExecutiveDurationInsight;
    statusRows: AttendancePdfExecutiveStatusRow[];
    attentionItems: AttendancePdfExecutiveAttentionItem[];
    hiddenAttentionTypeCount: number;
}

function plural(value: number, singular: string, pluralValue: string = `${singular}s`): string {
    return value === 1 ? singular : pluralValue;
}

function buildDirectionKpis(overview: AttendanceOverview): AttendancePdfExecutiveKpi[] {
    const { rates } = overview.summary;
    const showLateRate = rates.lateRate !== null && rates.lateRate > 50;
    const punctualityOrLate: AttendancePdfExecutiveKpi = !showLateRate
        ? {
            id: 'punctuality_rate',
            label: 'Ponctualité',
            value: rates.punctualityRate === null ? '—' : `${rates.punctualityRate.toFixed(1).replace('.0', '')} %`,
            explanation: `${rates.onTimeWorkingDays} arrivées à l’heure sur ${rates.attendedWorkingDays} planifications couvertes`,
            accent: rates.punctualityRate !== null && rates.punctualityRate > 60 ? 'success' : 'warning',
        }
        : {
            id: 'late_days',
            label: 'Taux de retard',
            value: rates.lateRate === null ? '—' : `${rates.lateRate.toFixed(1).replace('.0', '')} %`,
            explanation: `${rates.lateWorkingDays} retards sur ${rates.attendedWorkingDays} planifications couvertes`,
            accent: 'warning',
        };

    return [
        {
            id: 'attendance_rate',
            label: 'Taux de présence',
            value: rates.attendanceRate === null ? '—' : `${rates.attendanceRate.toFixed(1).replace('.0', '')} %`,
            explanation: `${rates.attendedWorkingDays} planifications couvertes sur ${rates.employeeWorkingDaysExpected} planifications de travail finalisées`,
            accent:
                rates.attendanceRate === null
                    ? 'accent'
                    : rates.attendanceRate > 60
                        ? 'success'
                        : rates.absenceRate !== null && rates.absenceRate > 50
                            ? 'danger'
                            : 'warning',
        },
        punctualityOrLate,
        {
            id: 'absences',
            label: 'Taux d’absence',
            value: rates.absenceRate === null ? '—' : `${rates.absenceRate.toFixed(1).replace('.0', '')} %`,
            explanation: `${rates.absentWorkingDays} planifications non couvertes sur ${rates.employeeWorkingDaysExpected} finalisées`,
            accent: 'danger',
        },
        {
            id: 'alerts',
            label: 'Alerte',
            value: rates.issueRate === null ? '—' : `${rates.issueRate.toFixed(1).replace('.0', '')} %`,
            explanation: rates.issueRate === null
                ? 'Aucune base suffisante pour calculer le taux d’alerte'
                : `${rates.employeeDaysWithIssues} situations avec alerte sur ${rates.employeeDaysAnalyzed} situations analysées`,
            accent: rates.issueRate !== null && rates.issueRate > 0 ? 'warning' : 'success',
        },
    ];
}

function buildKpis(overview: AttendanceOverview): AttendancePdfExecutiveKpi[] {
    return buildPrimaryAttendanceKpis(overview).map((card) => {
        switch (card.id) {
            case 'attendance_rate':
                return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'accent' };
            case 'punctuality_rate':
                return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'success' };
            case 'absences':
                return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'danger' };
            case 'late_days':
                return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'warning' };
            case 'issues':
                return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'warning' };
            case 'net_duration':
                throw new Error('La durée nette ne fait pas partie des KPI décisionnels de la synthèse PDF.');
        }
    });
}

function buildStatusRows(overview: AttendanceOverview): AttendancePdfExecutiveStatusRow[] {
    const statuses = (Object.keys(ATTENDANCE_STATUS_PRESENTATION) as AttendanceStatus[]).sort(
        (left, right) =>
            ATTENDANCE_STATUS_PRESENTATION[left].order - ATTENDANCE_STATUS_PRESENTATION[right].order,
    );

    const allDays = overview.employees.flatMap((employee) => employee.days);

    // Fallback de compatibilité si un snapshot ancien ne transporte pas le détail journalier.
    if (allDays.length === 0) {
        return statuses.map((status) => ({
            status,
            label: ATTENDANCE_STATUS_PRESENTATION[status].label,
            count: overview.summary.statusTotals[status],
            group: ATTENDANCE_STATUS_PRESENTATION[status].rateCategory,
        }));
    }

    const rows: AttendancePdfExecutiveStatusRow[] = [];
    statuses.forEach((status) => {
        const eligibleCount = allDays.filter((day) => day.status === status && day.rateEligible).length;
        const excludedCount = allDays.filter((day) => day.status === status && !day.rateEligible).length;

        if (eligibleCount > 0) {
            rows.push({
                status,
                label: ATTENDANCE_STATUS_PRESENTATION[status].label,
                count: eligibleCount,
                group: 'eligible',
            });
        }
        if (excludedCount > 0) {
            rows.push({
                status,
                label: ATTENDANCE_STATUS_PRESENTATION[status].label,
                count: excludedCount,
                group: 'excluded',
            });
        }
    });
    return rows;
}

function formatBusinessDate(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function buildAttendancePdfExecutiveSummaryModel(
    overview: AttendanceOverview,
    mode?: AttendancePdfExportMode,
): AttendancePdfExecutiveSummaryModel {
    const isSingleDay = overview.period.dayCount === 1;
    const qualityPresentation = buildAttendanceDataQualityPresentation(overview.dataQuality);
    const nonZeroQualitySignals = qualityPresentation.metrics
        .filter((metric) => metric.value > 0)
        .map((metric) => ({ label: metric.label, value: metric.value }));

    const durationInsight = buildAttendanceDurationInsight(overview);
    const sortedIssues = sortAttendanceIssues(overview.issues);
    const attentionItems = sortedIssues
        .slice(0, ATTENDANCE_PDF_PAGINATION_TARGETS.executiveAttentionItemsMax)
        .map((summary) => ({
            issue: summary.issue,
            label: ATTENDANCE_ISSUE_PRESENTATION[summary.issue].label,
            count: summary.count,
            employeesConcerned: summary.employeesConcerned,
        }));

    return {
        title: 'Synthèse décisionnelle',
        scopeLine: isSingleDay
            ? `${overview.scope.teamSize} ${plural(overview.scope.teamSize, 'collaborateur', 'collaborateurs')} · situation du jour`
            : `${overview.scope.teamSize} ${plural(overview.scope.teamSize, 'collaborateur', 'collaborateurs')} · ${overview.period.dayCount} ${plural(overview.period.dayCount, 'jour', 'jours')} analysé${overview.period.dayCount === 1 ? '' : 's'}`,
        isSingleDay,
        statusPanelTitle: isSingleDay ? 'Répartition des situations du jour' : 'Répartition des journées de travail',
        eligibleGroupLabel: isSingleDay
            ? 'Situations finalisées · prises en compte'
            : 'Journées finalisées · prises en compte',
        excludedGroupLabel: isSingleDay
            ? 'Situations hors calcul ou encore en cours'
            : 'Journées hors calcul ou non encore finalisées',
        attentionEmptyLabel: isSingleDay
            ? 'Aucun élément à examiner aujourd’hui.'
            : 'Aucun élément à examiner sur la période.',
        quality: {
            level: qualityPresentation.level,
            label:
                mode === 'period_summary' && qualityPresentation.level !== 'reliable'
                    ? 'Anomalie détectée'
                    : qualityPresentation.level === 'reliable'
                        ? 'Qualité des données : fiable'
                        : qualityPresentation.level === 'warning'
                            ? 'Qualité des données : à surveiller'
                            : 'Qualité des données : non fiable',
            message: qualityPresentation.message,
            signals: nonZeroQualitySignals,
        },
        kpis: mode === 'period_summary' ? buildDirectionKpis(overview) : buildKpis(overview),
        durationInsight: {
            label: 'Durée nette enregistrée (h)',
            value: overview.summary.durations.daysWithKnownNetDuration > 0
                ? formatAttendancePdfDuration(overview.summary.durations.netMinutes, { emptyLabel: 'Non disponible' })
                : 'Non disponible',
            helper: overview.summary.durations.daysWithKnownExpectedWorkDuration > 0
                ? `sur ${formatAttendancePdfDuration(overview.summary.durations.expectedWorkMinutes, { emptyLabel: 'Non disponible' })} prévues sur la période`
                : durationInsight.helper,
            detail: durationInsight.detail,
            available: durationInsight.available,
        },
        statusRows: buildStatusRows(overview),
        attentionItems,
        hiddenAttentionTypeCount: Math.max(0, sortedIssues.length - attentionItems.length),
    };
}


// import type {
//   AttendanceDataQualityLevel,
//   AttendanceIssue,
//   AttendanceOverview,
//   AttendanceStatus,
// } from '../../types/attendance-statistics.types.js';
// import { buildAttendanceDataQualityPresentation } from '../../utils/attendance-data-quality.js';
// import {
//   buildAttendanceDurationInsight,
//   buildPrimaryAttendanceKpis,
// } from '../../utils/attendance-kpis.js';
// import { sortAttendanceIssues } from '../../utils/attendance-issues.js';
// import {
//   ATTENDANCE_ISSUE_PRESENTATION,
//   ATTENDANCE_STATUS_PRESENTATION,
// } from '../../utils/attendance-status.js';
// import { ATTENDANCE_PDF_PAGINATION_TARGETS } from '../config/attendance-pdf-layout.js';
// import type { AttendancePdfExportMode } from '../types/attendance-pdf.types.js';
//
// export interface AttendancePdfExecutiveKpi {
//   id: 'attendance_rate' | 'punctuality_rate' | 'absences' | 'late_days' | 'issues' | 'alerts';
//   label: string;
//   value: string;
//   explanation: string;
//   accent: 'accent' | 'success' | 'danger' | 'warning';
// }
//
// export interface AttendancePdfExecutiveQuality {
//   level: AttendanceDataQualityLevel;
//   label: string;
//   message: string;
//   signals: Array<{ label: string; value: number }>;
// }
//
// export interface AttendancePdfExecutiveDurationInsight {
//   label: string;
//   value: string;
//   helper: string;
//   detail: string;
//   available: boolean;
// }
//
// export interface AttendancePdfExecutiveStatusRow {
//   status: AttendanceStatus;
//   label: string;
//   count: number;
//   group: 'eligible' | 'excluded';
// }
//
// export interface AttendancePdfExecutiveAttentionItem {
//   issue: AttendanceIssue;
//   label: string;
//   count: number;
//   employeesConcerned: number;
// }
//
// export interface AttendancePdfExecutiveSummaryModel {
//   title: string;
//   scopeLine: string;
//   isSingleDay: boolean;
//   statusPanelTitle: string;
//   eligibleGroupLabel: string;
//   excludedGroupLabel: string;
//   attentionEmptyLabel: string;
//   quality: AttendancePdfExecutiveQuality;
//   kpis: AttendancePdfExecutiveKpi[];
//   durationInsight: AttendancePdfExecutiveDurationInsight;
//   statusRows: AttendancePdfExecutiveStatusRow[];
//   attentionItems: AttendancePdfExecutiveAttentionItem[];
//   hiddenAttentionTypeCount: number;
// }
//
// function plural(value: number, singular: string, pluralValue: string = `${singular}s`): string {
//   return value === 1 ? singular : pluralValue;
// }
//
// function buildDirectionKpis(overview: AttendanceOverview): AttendancePdfExecutiveKpi[] {
//   const { rates } = overview.summary;
//   const showLateRate = rates.lateRate !== null && rates.lateRate > 50;
//   const punctualityOrLate: AttendancePdfExecutiveKpi = !showLateRate
//     ? {
//         id: 'punctuality_rate',
//         label: 'Ponctualité',
//         value: rates.punctualityRate === null ? '—' : `${rates.punctualityRate.toFixed(1).replace('.0', '')} %`,
//         explanation: `${rates.onTimeWorkingDays} arrivées à l’heure sur ${rates.attendedWorkingDays} planifications couvertes`,
//         accent: rates.punctualityRate !== null && rates.punctualityRate > 60 ? 'success' : 'warning',
//       }
//     : {
//         id: 'late_days',
//         label: 'Taux de retard',
//         value: rates.lateRate === null ? '—' : `${rates.lateRate.toFixed(1).replace('.0', '')} %`,
//         explanation: `${rates.lateWorkingDays} retards sur ${rates.attendedWorkingDays} planifications couvertes`,
//         accent: 'warning',
//       };
//
//   return [
//     {
//       id: 'attendance_rate',
//       label: 'Taux de présence',
//       value: rates.attendanceRate === null ? '—' : `${rates.attendanceRate.toFixed(1).replace('.0', '')} %`,
//       explanation: `${rates.attendedWorkingDays} planifications couvertes sur ${rates.employeeWorkingDaysExpected} planifications de travail finalisées`,
//       accent:
//         rates.attendanceRate === null
//           ? 'accent'
//           : rates.attendanceRate > 60
//             ? 'success'
//             : rates.absenceRate !== null && rates.absenceRate > 50
//               ? 'danger'
//               : 'warning',
//     },
//     punctualityOrLate,
//     {
//       id: 'absences',
//       label: 'Taux d’absence',
//       value: rates.absenceRate === null ? '—' : `${rates.absenceRate.toFixed(1).replace('.0', '')} %`,
//       explanation: `${rates.absentWorkingDays} planifications non couvertes sur ${rates.employeeWorkingDaysExpected} finalisées`,
//       accent: 'danger',
//     },
//     {
//       id: 'alerts',
//       label: 'Alerte',
//       value: rates.issueRate === null ? '—' : `${rates.issueRate.toFixed(1).replace('.0', '')} %`,
//       explanation: rates.issueRate === null
//         ? 'Aucune base suffisante pour calculer le taux d’alerte'
//         : `${rates.employeeDaysWithIssues} situations avec alerte sur ${rates.employeeDaysAnalyzed} situations analysées`,
//       accent: rates.issueRate !== null && rates.issueRate > 0 ? 'warning' : 'success',
//     },
//   ];
// }
//
// function buildKpis(overview: AttendanceOverview): AttendancePdfExecutiveKpi[] {
//   return buildPrimaryAttendanceKpis(overview).map((card) => {
//     switch (card.id) {
//       case 'attendance_rate':
//         return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'accent' };
//       case 'punctuality_rate':
//         return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'success' };
//       case 'absences':
//         return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'danger' };
//       case 'late_days':
//         return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'warning' };
//       case 'issues':
//         return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'warning' };
//       case 'net_duration':
//         throw new Error('La durée nette ne fait pas partie des KPI décisionnels de la synthèse PDF.');
//     }
//   });
// }
//
// function buildStatusRows(overview: AttendanceOverview): AttendancePdfExecutiveStatusRow[] {
//   const statuses = (Object.keys(ATTENDANCE_STATUS_PRESENTATION) as AttendanceStatus[]).sort(
//     (left, right) =>
//       ATTENDANCE_STATUS_PRESENTATION[left].order - ATTENDANCE_STATUS_PRESENTATION[right].order,
//   );
//
//   const allDays = overview.employees.flatMap((employee) => employee.days);
//
//   // Fallback de compatibilité si un snapshot ancien ne transporte pas le détail journalier.
//   if (allDays.length === 0) {
//     return statuses.map((status) => ({
//       status,
//       label: ATTENDANCE_STATUS_PRESENTATION[status].label,
//       count: overview.summary.statusTotals[status],
//       group: ATTENDANCE_STATUS_PRESENTATION[status].rateCategory,
//     }));
//   }
//
//   const rows: AttendancePdfExecutiveStatusRow[] = [];
//   statuses.forEach((status) => {
//     const eligibleCount = allDays.filter((day) => day.status === status && day.rateEligible).length;
//     const excludedCount = allDays.filter((day) => day.status === status && !day.rateEligible).length;
//
//     if (eligibleCount > 0) {
//       rows.push({
//         status,
//         label: ATTENDANCE_STATUS_PRESENTATION[status].label,
//         count: eligibleCount,
//         group: 'eligible',
//       });
//     }
//     if (excludedCount > 0) {
//       rows.push({
//         status,
//         label: ATTENDANCE_STATUS_PRESENTATION[status].label,
//         count: excludedCount,
//         group: 'excluded',
//       });
//     }
//   });
//   return rows;
// }
//
// function formatBusinessDate(value: string): string {
//   const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
//   return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
// }
//
// export function buildAttendancePdfExecutiveSummaryModel(
//   overview: AttendanceOverview,
//   mode?: AttendancePdfExportMode,
// ): AttendancePdfExecutiveSummaryModel {
//   const isSingleDay = overview.period.dayCount === 1;
//   const qualityPresentation = buildAttendanceDataQualityPresentation(overview.dataQuality);
//   const nonZeroQualitySignals = qualityPresentation.metrics
//     .filter((metric) => metric.value > 0)
//     .map((metric) => ({ label: metric.label, value: metric.value }));
//
//   const durationInsight = buildAttendanceDurationInsight(overview);
//   const sortedIssues = sortAttendanceIssues(overview.issues);
//   const attentionItems = sortedIssues
//     .slice(0, ATTENDANCE_PDF_PAGINATION_TARGETS.executiveAttentionItemsMax)
//     .map((summary) => ({
//       issue: summary.issue,
//       label: ATTENDANCE_ISSUE_PRESENTATION[summary.issue].label,
//       count: summary.count,
//       employeesConcerned: summary.employeesConcerned,
//     }));
//
//   return {
//     title: 'Synthèse décisionnelle',
//     scopeLine: isSingleDay
//         ? `${overview.scope.teamSize} ${plural(overview.scope.teamSize, 'collaborateur', 'collaborateurs')} · situation du jour`
//         : `${overview.scope.teamSize} ${plural(overview.scope.teamSize, 'collaborateur', 'collaborateurs')} · ${overview.period.dayCount} ${plural(overview.period.dayCount, 'jour', 'jours')} analysé${overview.period.dayCount === 1 ? '' : 's'}`,
//     isSingleDay,
//     statusPanelTitle: isSingleDay ? 'Répartition des situations du jour' : 'Répartition des journées de travail',
//     eligibleGroupLabel: isSingleDay
//       ? 'Situations finalisées · prises en compte'
//       : 'Journées finalisées · prises en compte',
//     excludedGroupLabel: isSingleDay
//       ? 'Situations hors calcul ou encore en cours'
//       : 'Journées hors calcul ou non encore finalisées',
//     attentionEmptyLabel: isSingleDay
//       ? 'Aucun élément à examiner aujourd’hui.'
//       : 'Aucun élément à examiner sur la période.',
//     quality: {
//       level: qualityPresentation.level,
//       label:
//         mode === 'period_summary' && qualityPresentation.level !== 'reliable'
//           ? 'Anomalie détectée'
//           : qualityPresentation.level === 'reliable'
//             ? 'Qualité des données : fiable'
//             : qualityPresentation.level === 'warning'
//               ? 'Qualité des données : à surveiller'
//               : 'Qualité des données : non fiable',
//       message: qualityPresentation.message,
//       signals: nonZeroQualitySignals,
//     },
//     kpis: mode === 'period_summary' ? buildDirectionKpis(overview) : buildKpis(overview),
//     durationInsight: {
//       label: 'Durée nette enregistrée',
//       value: durationInsight.value,
//       helper: durationInsight.helper,
//       detail: durationInsight.detail,
//       available: durationInsight.available,
//     },
//     statusRows: buildStatusRows(overview),
//     attentionItems,
//     hiddenAttentionTypeCount: Math.max(0, sortedIssues.length - attentionItems.length),
//   };
// }
