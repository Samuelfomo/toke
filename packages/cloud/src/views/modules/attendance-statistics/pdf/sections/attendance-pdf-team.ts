import { ATTENDANCE_PDF_TYPOGRAPHY } from '../config/attendance-pdf-layout.js';
import type { AttendancePdfTeamColumnKey } from '../config/attendance-pdf-team-columns.js';
import type { AttendancePdfEngine } from '../engine/attendance-pdf-engine.js';
import type { AttendancePdfTableColumn } from '../components/attendance-pdf-table.js';
import {
  buildAttendancePdfTeamModel,
  type AttendancePdfTeamModel,
  type AttendancePdfTeamRow,
} from './attendance-pdf-team.model.js';

function columnFor(key: AttendancePdfTeamColumnKey): AttendancePdfTableColumn<AttendancePdfTeamRow> {
  switch (key) {
    case 'employee':
      return { key, title: 'Employé', weight: 2.3, value: (row) => row.employeeName };
    case 'expected':
      return { key, title: 'Attendues', width: 19, align: 'right', value: (row) => String(row.expected) };
    case 'attended':
      return { key, title: 'Suivies', width: 18, align: 'right', value: (row) => String(row.attended) };
    case 'attendance_rate':
      return { key, title: 'Présence', width: 24, align: 'right', value: (row) => row.attendanceRate };
    case 'punctuality_rate':
      return { key, title: 'Ponctualité', width: 25, align: 'right', value: (row) => row.punctualityRate };
    case 'late':
      return { key, title: 'Retards', width: 17, align: 'right', value: (row) => String(row.late) };
    case 'absent':
      return { key, title: 'Absences', width: 19, align: 'right', value: (row) => String(row.absent) };
    case 'pending':
      return { key, title: 'En attente', width: 19, align: 'right', value: (row) => String(row.pending) };
    case 'undetermined':
      return { key, title: 'Indéterminé', width: 22, align: 'right', value: (row) => String(row.undetermined) };
    case 'rest_day':
      return { key, title: 'Repos', width: 16, align: 'right', value: (row) => String(row.restDay) };
    case 'net_duration':
      return { key, title: 'Durée nette', width: 27, align: 'right', value: (row) => row.netDuration };
    case 'issues':
      return { key, title: 'À examiner', width: 22, align: 'right', value: (row) => String(row.issues) };
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

  if (engine.pages.y > engine.pages.contentTop) engine.pages.addPage();
  engine.pages.markSectionStart('team');
  const startPage = engine.pages.currentPage;

  engine.primitives.drawSectionTitle(model.title, 1.5);
  engine.primitives.drawTextBlock(model.description, {
    fontSizePt: 8.3,
    color: engine.theme.colors.mutedText,
    spacingAfter: 1.5,
  });
  engine.primitives.drawTextBlock(
    `Niveau de présentation : ${model.presentationLabel} · ${model.displayedEmployeeCount} collaborateur${model.displayedEmployeeCount > 1 ? 's' : ''}${model.filteredByAnalysis ? ` sur ${model.totalTeamSize}` : ''}`,
    {
      fontSizePt: 8,
      fontStyle: 'bold',
      color: engine.theme.colors.accent,
      spacingAfter: model.analysisLabel ? 1 : 3,
    },
  );

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
    horizontalPadding: 1.2,
    verticalPadding: 1,
    repeatHeader: true,
    spacingAfter: 2.5,
    columns: model.columns.map(columnFor),
    rows: model.rows,
  });

  engine.primitives.drawTextBlock(
    "Lecture : les valeurs décrivent la présence enregistrée sur la période. Elles ne mesurent ni la productivité ni la qualité du travail du collaborateur.",
    {
      fontSizePt: 7.7,
      color: engine.theme.colors.mutedText,
      spacingAfter: 2,
    },
  );

  return { startPage, endPage: engine.pages.currentPage, model };
}
