import { ATTENDANCE_PDF_TYPOGRAPHY } from '../config/attendance-pdf-layout.js';
import type { AttendancePdfTeamColumnKey } from '../config/attendance-pdf-team-columns.js';
import type { AttendancePdfEngine } from '../engine/attendance-pdf-engine.js';
import type { AttendancePdfTableColumn } from '../components/attendance-pdf-table.js';

import {
    buildAttendancePdfTeamModel,
    type AttendancePdfTeamModel,
    type AttendancePdfTeamRow,
} from './attendance-pdf-team.model.js';

function columnFor(
    key: AttendancePdfTeamColumnKey,
    isSingleDay: boolean,
): AttendancePdfTableColumn<AttendancePdfTeamRow> {
    switch (key) {
        case 'employee':
            return { key, title: 'Employé', weight: 2.3, value: (row) => row.employeeName };
        case 'expected':
            return { key, title: isSingleDay ? 'Finalisés' : 'Jours fin.', width: 19, align: 'right', value: (row) => String(row.expected) };
        case 'attended':
            return { key, title: 'Présences', width: 18, align: 'right', value: (row) => String(row.attended) };
        case 'attended_vs_expected':
            return { key, title: 'Présence / prévu', width: 26, align: 'right', value: (row) => row.attendedVsExpected };
        case 'attendance_rate':
            return { key, title: 'Présence', width: 24, align: 'right', value: (row) => row.attendanceRate };
        case 'punctuality_rate':
            return { key, title: 'Ponctualité', width: 24, align: 'right', value: (row) => row.punctualityRate };
        case 'absence_rate':
            return { key, title: 'Absence', width: 21, align: 'right', value: (row) => row.absenceRate };
        case 'late_rate':
            return { key, title: 'Retard', width: 21, align: 'right', value: (row) => row.lateRate };
        case 'late':
            return { key, title: 'Retards obs.', width: 20, align: 'right', value: (row) => String(row.late) };
        case 'absent':
            return { key, title: 'Abs. conf.', width: 19, align: 'right', value: (row) => String(row.absent) };
        case 'pending':
            return { key, title: 'En attente', width: 19, align: 'right', value: (row) => String(row.pending) };
        case 'undetermined':
            return { key, title: 'Indéterminé', width: 22, align: 'right', value: (row) => String(row.undetermined) };
        case 'rest_day':
            return { key, title: 'Repos', width: 16, align: 'right', value: (row) => String(row.restDay) };
        case 'net_duration':
            return { key, title: 'Durée nette (h)', width: 24, align: 'right', value: (row) => row.netDuration };
        case 'expected_duration':
            return { key, title: 'Durée prévue (h)', width: 24, align: 'right', value: (row) => row.expectedDuration };
        case 'net_vs_expected':
            return { key, title: 'Durée nette / prévue (h)', width: 34, align: 'right', value: (row) => row.netVsExpected };
        case 'issue_rate':
            return { key, title: 'À examiner', width: 23, align: 'right', value: (row) => row.issueRate };
        case 'issues':
            return { key, title: 'Éléments', width: 20, align: 'right', value: (row) => String(row.issues) };
        case 'duration_delta':
            return { key, title: 'Écart (h) +/-', width: 30, align: 'right', value: (row) => row.durationDelta };
        case 'alerts':
            return { key, title: 'Alerte', width: 19, align: 'right', value: (row) => row.alerts };
    }
}

export interface AttendancePdfTeamResult {
    startPage: number;
    endPage: number;
    model: AttendancePdfTeamModel;
}

/**
 * Rend la vue équipe. La pagination reste height-first via le moteur de table 6.2.
 * Le renderer ne trie pas par performance et ne reconstruit aucune statistique.
 */
export function renderAttendancePdfTeam(engine: AttendancePdfEngine): AttendancePdfTeamResult {
    const model = buildAttendancePdfTeamModel(engine.contract);

    const isDirectionReport = engine.contract.request.mode === 'period_summary';

    // Le rapport Direction est volontairement composé comme une seule lecture continue :
    // synthèse globale puis tableau équipe. Les autres profils commencent leur vue équipe
    // sur une nouvelle page afin de préserver leur rythme de lecture.
    if (!isDirectionReport && engine.pages.y > engine.pages.contentTop) engine.pages.addPage();
    engine.pages.markSectionStart('team');
    const startPage = engine.pages.currentPage;

    engine.primitives.drawSectionTitle(model.title, isDirectionReport ? 1 : 1.5);

    if (!isDirectionReport) {
        engine.primitives.drawTextBlock(model.description, {
            fontSizePt: 8.3,
            color: engine.theme.colors.mutedText,
            spacingAfter: 1.5,
        });
        engine.primitives.drawTextBlock(
            `${model.showPresentationLabel ? `Niveau de présentation : ${model.presentationLabel} · ` : ''}${model.displayedEmployeeCount} collaborateur${model.displayedEmployeeCount > 1 ? 's' : ''}${model.filteredByAnalysis ? ` sur ${model.totalTeamSize}` : ''}`,
            {
                fontSizePt: 8,
                fontStyle: 'bold',
                color: engine.theme.colors.accent,
                spacingAfter: model.analysisLabel ? 1 : 3,
            },
        );
    }

    if (model.analysisLabel) {
        engine.primitives.drawTextBlock(`Contexte : ${model.analysisLabel}`, {
            fontSizePt: 8,
            color: engine.theme.colors.mutedText,
            spacingAfter: 3,
        });
    }

    if (model.empty) {
        engine.primitives.drawCard({
            title: 'Aucun collaborateur correspondant',
            body: "Le contexte d'analyse courant ne contient aucun collaborateur dans le snapshot fourni.",
            height: 24,
        });
        return { startPage, endPage: engine.pages.currentPage, model };
    }

    engine.table.draw({
        fontSizePt: ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
        headerFontSizePt: ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
        horizontalPadding: isDirectionReport ? 1 : 1.2,
        verticalPadding: isDirectionReport ? 0.75 : 1,
        repeatHeader: true,
        spacingAfter: isDirectionReport ? 1.5 : 2.5,
        columns: model.columns.map((key) => columnFor(key, model.isSingleDay)),
        rows: model.rows,
    });

    if (!['period_summary', 'full_report', 'hr_complete'].includes(engine.contract.request.mode)) {
        engine.primitives.drawTextBlock(
            model.isSingleDay
                ? "Lecture : les valeurs correspondent aux données disponibles pour la journée sélectionnée."
                : "Lecture : les valeurs correspondent aux données disponibles sur la période sélectionnée.",
            {
                fontSizePt: 7.7,
                color: engine.theme.colors.mutedText,
                spacingAfter: 2,
            },
        );
    }

    return { startPage, endPage: engine.pages.currentPage, model };
}


// import { ATTENDANCE_PDF_TYPOGRAPHY } from '../config/attendance-pdf-layout.js';
// import type { AttendancePdfTeamColumnKey } from '../config/attendance-pdf-team-columns.js';
// import type { AttendancePdfEngine } from '../engine/attendance-pdf-engine.js';
// import type { AttendancePdfTableColumn } from '../components/attendance-pdf-table.js';
// import {
//   buildAttendancePdfTeamModel,
//   type AttendancePdfTeamModel,
//   type AttendancePdfTeamRow,
// } from './attendance-pdf-team.model.js';
//
// function columnFor(
//   key: AttendancePdfTeamColumnKey,
//   isSingleDay: boolean,
// ): AttendancePdfTableColumn<AttendancePdfTeamRow> {
//   switch (key) {
//     case 'employee':
//       return { key, title: 'Employé', weight: 2.3, value: (row) => row.employeeName };
//     case 'expected':
//       return { key, title: isSingleDay ? 'Finalisés' : 'Jours fin.', width: 19, align: 'right', value: (row) => String(row.expected) };
//     case 'attended':
//       return { key, title: 'Présences', width: 18, align: 'right', value: (row) => String(row.attended) };
//     case 'attended_vs_expected':
//       return { key, title: 'Présence / prévu', width: 26, align: 'right', value: (row) => row.attendedVsExpected };
//     case 'attendance_rate':
//       return { key, title: 'Présence', width: 24, align: 'right', value: (row) => row.attendanceRate };
//     case 'punctuality_rate':
//       return { key, title: 'Ponctualité', width: 24, align: 'right', value: (row) => row.punctualityRate };
//     case 'absence_rate':
//       return { key, title: 'Absence', width: 21, align: 'right', value: (row) => row.absenceRate };
//     case 'late_rate':
//       return { key, title: 'Retard', width: 21, align: 'right', value: (row) => row.lateRate };
//     case 'late':
//       return { key, title: 'Retards obs.', width: 20, align: 'right', value: (row) => String(row.late) };
//     case 'absent':
//       return { key, title: 'Abs. conf.', width: 19, align: 'right', value: (row) => String(row.absent) };
//     case 'pending':
//       return { key, title: 'En attente', width: 19, align: 'right', value: (row) => String(row.pending) };
//     case 'undetermined':
//       return { key, title: 'Indéterminé', width: 22, align: 'right', value: (row) => String(row.undetermined) };
//     case 'rest_day':
//       return { key, title: 'Repos', width: 16, align: 'right', value: (row) => String(row.restDay) };
//     case 'net_duration':
//       return { key, title: 'Durée nette', width: 24, align: 'right', value: (row) => row.netDuration };
//     case 'expected_duration':
//       return { key, title: 'Durée prévue', width: 24, align: 'right', value: (row) => row.expectedDuration };
//     case 'net_vs_expected':
//       return { key, title: 'Durée nette / prévue', width: 34, align: 'right', value: (row) => row.netVsExpected };
//     case 'issue_rate':
//       return { key, title: 'À examiner', width: 23, align: 'right', value: (row) => row.issueRate };
//     case 'issues':
//       return { key, title: 'Éléments', width: 20, align: 'right', value: (row) => String(row.issues) };
//     case 'duration_delta':
//       return { key, title: 'Écart heures (+/-)', width: 30, align: 'right', value: (row) => row.durationDelta };
//     case 'alerts':
//       return { key, title: 'Alerte', width: 19, align: 'right', value: (row) => row.alerts };
//   }
// }
//
// export interface AttendancePdfTeamResult {
//   startPage: number;
//   endPage: number;
//   model: AttendancePdfTeamModel;
// }
//
// /**
//  * Rend la vue équipe. La pagination reste height-first via le moteur de table 6.2.
//  * Le renderer ne trie pas par performance et ne reconstruit aucune statistique.
//  */
// export function renderAttendancePdfTeam(engine: AttendancePdfEngine): AttendancePdfTeamResult {
//   const model = buildAttendancePdfTeamModel(engine.contract);
//
//   const isDirectionReport = engine.contract.request.mode === 'period_summary';
//
//   // Le rapport Direction est volontairement composé comme une seule lecture continue :
//   // synthèse globale puis tableau équipe. Les autres profils commencent leur vue équipe
//   // sur une nouvelle page afin de préserver leur rythme de lecture.
//   if (!isDirectionReport && engine.pages.y > engine.pages.contentTop) engine.pages.addPage();
//   engine.pages.markSectionStart('team');
//   const startPage = engine.pages.currentPage;
//
//   engine.primitives.drawSectionTitle(model.title, isDirectionReport ? 1 : 1.5);
//
//   if (!isDirectionReport) {
//     engine.primitives.drawTextBlock(model.description, {
//       fontSizePt: 8.3,
//       color: engine.theme.colors.mutedText,
//       spacingAfter: 1.5,
//     });
//     engine.primitives.drawTextBlock(
//       `${model.showPresentationLabel ? `Niveau de présentation : ${model.presentationLabel} · ` : ''}${model.displayedEmployeeCount} collaborateur${model.displayedEmployeeCount > 1 ? 's' : ''}${model.filteredByAnalysis ? ` sur ${model.totalTeamSize}` : ''}`,
//       {
//         fontSizePt: 8,
//         fontStyle: 'bold',
//         color: engine.theme.colors.accent,
//         spacingAfter: model.analysisLabel ? 1 : 3,
//       },
//     );
//   }
//
//   if (model.analysisLabel) {
//     engine.primitives.drawTextBlock(`Contexte : ${model.analysisLabel}`, {
//       fontSizePt: 8,
//       color: engine.theme.colors.mutedText,
//       spacingAfter: 3,
//     });
//   }
//
//   if (model.empty) {
//     engine.primitives.drawCard({
//       title: 'Aucun collaborateur correspondant',
//       body: "Le contexte d'analyse courant ne contient aucun collaborateur dans le snapshot fourni.",
//       height: 24,
//     });
//     return { startPage, endPage: engine.pages.currentPage, model };
//   }
//
//   engine.table.draw({
//     fontSizePt: ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
//     headerFontSizePt: ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
//     horizontalPadding: isDirectionReport ? 1 : 1.2,
//     verticalPadding: isDirectionReport ? 0.75 : 1,
//     repeatHeader: true,
//     spacingAfter: isDirectionReport ? 1.5 : 2.5,
//     columns: model.columns.map((key) => columnFor(key, model.isSingleDay)),
//     rows: model.rows,
//   });
//
//   if (!['period_summary', 'full_report', 'hr_complete'].includes(engine.contract.request.mode)) {
//     engine.primitives.drawTextBlock(
//       model.isSingleDay
//         ? "Lecture : les valeurs correspondent aux données disponibles pour la journée sélectionnée."
//         : "Lecture : les valeurs correspondent aux données disponibles sur la période sélectionnée.",
//       {
//         fontSizePt: 7.7,
//         color: engine.theme.colors.mutedText,
//         spacingAfter: 2,
//       },
//     );
//   }
//
//   return { startPage, endPage: engine.pages.currentPage, model };
// }
