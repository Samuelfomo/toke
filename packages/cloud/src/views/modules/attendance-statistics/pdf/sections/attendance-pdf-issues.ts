import { ATTENDANCE_PDF_TYPOGRAPHY } from '../config/attendance-pdf-layout.js';
import type { AttendancePdfEngine } from '../engine/attendance-pdf-engine.js';
import type { AttendancePdfIssueTypeModel } from './attendance-pdf-issues.model.js';
import {
  buildAttendancePdfIssuesModel,
  type AttendancePdfIssueFamilyModel,
  type AttendancePdfIssuesModel,
} from './attendance-pdf-issues.model.js';

function plural(value: number, singular: string, pluralValue = `${singular}s`): string {
  return value > 1 ? pluralValue : singular;
}

function drawFamilySummary(
  engine: AttendancePdfEngine,
  family: AttendancePdfIssueFamilyModel,
): void {
  engine.primitives.drawTextBlock(family.label, {
    fontSizePt: 11,
    fontStyle: 'bold',
    color: engine.theme.colors.text,
    spacingAfter: 1.5,
    keepTogether: true,
  });

  engine.primitives.drawTextBlock(
    `${family.occurrenceCount} ${plural(family.occurrenceCount, 'occurrence')} - ${family.issueTypeCount} ${plural(family.issueTypeCount, "type d'élément", "types d'éléments")}`,
    {
      fontSizePt: 8,
      color: engine.theme.colors.mutedText,
      spacingAfter: 1.5,
    },
  );

  engine.table.draw({
    fontSizePt: ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
    headerFontSizePt: ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
    horizontalPadding: 1.5,
    verticalPadding: 1,
    repeatHeader: true,
    spacingAfter: 3,
    columns: [
      { key: 'label', title: 'Élément', weight: 2.2, value: (row) => row.label },
      { key: 'count', title: 'Occurrences', width: 30, align: 'right', value: (row) => String(row.count) },
      { key: 'employees', title: 'Employés', width: 28, align: 'right', value: (row) => String(row.employeesConcerned) },
      { key: 'action', title: 'Action suggérée', weight: 1.5, value: (row) => row.actionLabel },
    ],
    rows: family.issueTypes,
  });
}

function drawIssueOccurrences(
  engine: AttendancePdfEngine,
  issueType: AttendancePdfIssueTypeModel,
): void {
  if (issueType.rows.length === 0) return;

  engine.primitives.drawTextBlock(`${issueType.label} - détail disponible`, {
    fontSizePt: 9.5,
    fontStyle: 'bold',
    spacingAfter: 1.3,
    keepTogether: true,
  });

  engine.table.draw({
    fontSizePt: ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
    headerFontSizePt: ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
    horizontalPadding: 1.3,
    verticalPadding: 1,
    repeatHeader: true,
    spacingAfter: 1.5,
    columns: [
      { key: 'employee', title: 'Employé', weight: 1.8, value: (row) => row.employeeName },
      { key: 'date', title: 'Date', width: 30, value: (row) => row.dateLabel },
      { key: 'status', title: 'Statut', width: 35, value: (row) => row.statusLabel },
      { key: 'source', title: 'Source à examiner', weight: 1.4, value: (row) => row.sourceLabel },
    ],
    rows: issueType.rows,
  });

  if (issueType.omittedByPresentationCount > 0) {
    engine.primitives.drawTextBlock(
      `${issueType.omittedByPresentationCount} ${plural(issueType.omittedByPresentationCount, 'occurrence détaillée')} supplémentaire${issueType.omittedByPresentationCount > 1 ? 's' : ''} masquée${issueType.omittedByPresentationCount > 1 ? 's' : ''} par le profil ${engine.contract.presentationProfile.label.toLowerCase()}. Utiliser le niveau détaillé pour les afficher.`,
      {
        fontSizePt: 7.8,
        color: engine.theme.colors.mutedText,
        spacingAfter: 1.5,
      },
    );
  }

  if (issueType.hiddenApiOccurrenceCount > 0) {
    engine.primitives.drawTextBlock(
      `${issueType.hiddenApiOccurrenceCount} ${plural(issueType.hiddenApiOccurrenceCount, 'occurrence')} comptée${issueType.hiddenApiOccurrenceCount > 1 ? 's' : ''} par l'API mais non incluse${issueType.hiddenApiOccurrenceCount > 1 ? 's' : ''} dans son détail. Le PDF ne peut pas inventer ces lignes.`,
      {
        fontSizePt: 7.8,
        color: engine.theme.colors.warning,
        spacingAfter: 2,
      },
    );
  }
}

export interface AttendancePdfIssuesResult {
  startPage: number;
  endPage: number;
  model: AttendancePdfIssuesModel;
}

/**
 * Rend les éléments à examiner, regroupés par famille opérationnelle.
 * Les occurrences détaillées dépendent uniquement du niveau de présentation.
 * Les références `sourceTarget` restent disponibles dans le modèle pour une future
 * redirection vers la page de pointages ; aucune route applicative n'est inventée ici.
 */
export function renderAttendancePdfIssues(engine: AttendancePdfEngine): AttendancePdfIssuesResult {
  const model = buildAttendancePdfIssuesModel(engine.contract);

  if (engine.pages.y > engine.pages.contentTop) engine.pages.addPage();
  engine.pages.markSectionStart('issues');
  const startPage = engine.pages.currentPage;

  engine.primitives.drawSectionTitle(model.title, 1.5);
  engine.primitives.drawTextBlock(model.description, {
    fontSizePt: 8.5,
    color: engine.theme.colors.mutedText,
    spacingAfter: 2,
  });
  engine.primitives.drawTextBlock(`Niveau de présentation : ${model.presentationLabel}`, {
    fontSizePt: 8,
    fontStyle: 'bold',
    color: engine.theme.colors.accent,
    spacingAfter: 3,
  });

  if (model.empty) {
    engine.primitives.drawCard({
      title: 'Aucun élément à examiner',
      body: "Le snapshot fourni ne contient aucun élément correspondant à ce périmètre.",
      height: 24,
    });
    return { startPage, endPage: engine.pages.currentPage, model };
  }

  for (const family of model.families) {
    drawFamilySummary(engine, family);

    if (engine.contract.presentationProfile.issueDetails !== 'none') {
      for (const issueType of family.issueTypes) {
        drawIssueOccurrences(engine, issueType);
      }
    }

    engine.primitives.drawDivider(1, 2.5);
  }

  if (model.totalHiddenApiOccurrenceCount > 0) {
    engine.primitives.drawTextBlock(
      `Couverture du détail API : ${model.totalDetailedOccurrenceCount} occurrence${model.totalDetailedOccurrenceCount > 1 ? 's' : ''} détaillée${model.totalDetailedOccurrenceCount > 1 ? 's' : ''} disponible${model.totalDetailedOccurrenceCount > 1 ? 's' : ''} pour ${model.totalOccurrenceCount} occurrence${model.totalOccurrenceCount > 1 ? 's' : ''} comptée${model.totalOccurrenceCount > 1 ? 's' : ''}.`,
      {
        fontSizePt: 8,
        color: engine.theme.colors.warning,
        spacingAfter: 2,
      },
    );
  }

  engine.primitives.drawTextBlock(
    "Traçabilité prévue : chaque ligne détaillée transporte l'employé, la date, le statut et le type d'élément nécessaires pour retrouver plus tard le pointage source dans l'interface. Le traitement/correction du pointage n'est pas implémenté dans ce lot.",
    {
      fontSizePt: 7.8,
      color: engine.theme.colors.mutedText,
      spacingAfter: 2,
    },
  );

  return { startPage, endPage: engine.pages.currentPage, model };
}
