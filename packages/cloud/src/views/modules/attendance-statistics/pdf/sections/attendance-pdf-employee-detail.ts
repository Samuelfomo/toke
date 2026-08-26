import { ATTENDANCE_PDF_TYPOGRAPHY } from '../config/attendance-pdf-layout.js';
import type { AttendancePdfEmployeeDayColumnKey } from '../config/attendance-pdf-employee-day-columns.js';
import type { AttendancePdfTableColumn } from '../components/attendance-pdf-table.js';
import type { AttendancePdfEngine } from '../engine/attendance-pdf-engine.js';
import {
  buildAttendancePdfEmployeeDetailsModel,
  type AttendancePdfEmployeeDayRow,
  type AttendancePdfEmployeeDetailsModel,
  type AttendancePdfEmployeeDetailModel,
} from './attendance-pdf-employee-detail.model.js';

function dayColumn(key: AttendancePdfEmployeeDayColumnKey): AttendancePdfTableColumn<AttendancePdfEmployeeDayRow> {
  switch (key) {
    case 'date': return { key, title: 'Date', width: 24, value: (row) => row.date };
    case 'status': return { key, title: 'Statut', weight: 1.7, value: (row) => row.status };
    case 'clock_in': return { key, title: 'Entrée', width: 18, align: 'center', value: (row) => row.clockIn };
    case 'clock_out': return { key, title: 'Sortie', width: 18, align: 'center', value: (row) => row.clockOut };
    case 'delay': return { key, title: 'Retard', width: 20, align: 'right', value: (row) => row.delay };
    case 'gross_duration': return { key, title: 'Brut', width: 22, align: 'right', value: (row) => row.grossDuration };
    case 'pause_duration': return { key, title: 'Pause', width: 22, align: 'right', value: (row) => row.pauseDuration };
    case 'net_duration': return { key, title: 'Net', width: 22, align: 'right', value: (row) => row.netDuration };
    case 'issues': return { key, title: 'À examiner', weight: 2.3, value: (row) => row.issues };
  }
}

function drawMetrics(engine: AttendancePdfEngine, employee: AttendancePdfEmployeeDetailModel): void {
  const left = engine.pages.contentLeft;
  const gap = 3;
  const width = (engine.pages.contentWidth - gap * 4) / 5;
  const cards = [
    ['Présence', employee.attendanceRate, `${employee.attendedDays} / ${employee.expectedDays} journées suivies`],
    ['Ponctualité', employee.punctualityRate, `${employee.lateDays} retard${employee.lateDays > 1 ? 's' : ''}`],
    ['Absences', String(employee.absentDays), 'journées finalisées'],
    ['En attente', String(employee.pendingDays), `${employee.undeterminedDays} indéterminée${employee.undeterminedDays > 1 ? 's' : ''}`],
    ['À examiner', String(employee.issueCount), `${employee.issueTypeCount} type${employee.issueTypeCount > 1 ? 's' : ''}`],
  ] as const;
  const height = 25;
  engine.pages.ensureSpace(height + 3);
  cards.forEach(([title, value, body], index) => {
    engine.primitives.drawCard({ title, value, body, x: left + index * (width + gap), width, height, moveCursor: false });
  });
  engine.pages.moveCursor(height + 3);
}

function drawSecondarySummary(engine: AttendancePdfEngine, employee: AttendancePdfEmployeeDetailModel): void {
  const details = [
    `Jours de repos : ${employee.restDays}`,
    `Durée nette enregistrée : ${employee.netDuration}`,
  ];
  if (employee.issueLabels.length > 0) details.push(`Types à examiner : ${employee.issueLabels.join(', ')}`);
  engine.primitives.drawTextBlock(details.join(' · '), {
    fontSizePt: 7.8,
    color: engine.theme.colors.mutedText,
    spacingAfter: 3,
  });
}

function renderOne(engine: AttendancePdfEngine, employee: AttendancePdfEmployeeDetailModel, isFirst: boolean): void {
  if (!isFirst || engine.pages.y > engine.pages.contentTop) engine.pages.addPage();
  if (isFirst) engine.pages.markSectionStart('employee_details');
  engine.primitives.drawSectionTitle(employee.employeeName, 1.5);
  engine.primitives.drawTextBlock(`Niveau de présentation : ${employee.presentationLabel}`, {
    fontSizePt: 8,
    fontStyle: 'bold',
    color: engine.theme.colors.accent,
    spacingAfter: 2,
  });
  drawMetrics(engine, employee);
  drawSecondarySummary(engine, employee);

  if (!employee.showDailyTable) {
    engine.primitives.drawCard({
      title: 'Lecture simplifiée',
      body: "Cette version s'arrête aux indicateurs personnels et aux éléments à examiner. Utiliser le niveau Optimisé ou Détaillé pour imprimer les journées de la période.",
      height: 24,
    });
    return;
  }

  engine.primitives.drawTextBlock('Détail journalier', {
    fontSizePt: 10,
    fontStyle: 'bold',
    spacingAfter: 1.5,
  });

  if (employee.days.length === 0) {
    engine.primitives.drawCard({ title: 'Aucune journée disponible', body: "Le snapshot ne contient aucun détail journalier pour ce collaborateur.", height: 22 });
    return;
  }

  engine.table.draw({
    fontSizePt: ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
    headerFontSizePt: ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
    horizontalPadding: 1.1,
    verticalPadding: 0.9,
    repeatHeader: true,
    spacingAfter: 2.5,
    columns: employee.columns.map(dayColumn),
    rows: employee.days,
  });

  engine.primitives.drawTextBlock(
    "Les heures affichées sont celles fournies par le serveur. Toké n'applique ici aucune reconversion de fuseau. Les éléments signalés restent à examiner ; leur correction future doit agir sur la donnée source puis provoquer un recalcul des statistiques.",
    { fontSizePt: 7.5, color: engine.theme.colors.mutedText, spacingAfter: 2 },
  );
}

export interface AttendancePdfEmployeeDetailsResult {
  startPage: number;
  endPage: number;
  model: AttendancePdfEmployeeDetailsModel;
}

export function renderAttendancePdfEmployeeDetails(engine: AttendancePdfEngine): AttendancePdfEmployeeDetailsResult {
  const model = buildAttendancePdfEmployeeDetailsModel(engine.contract);
  if (engine.pages.y > engine.pages.contentTop) engine.pages.addPage();
  const startPage = engine.pages.currentPage;

  if (model.employees.length === 0) {
    engine.pages.markSectionStart('employee_details');
    engine.primitives.drawSectionTitle(model.title, 1.5);
    engine.primitives.drawCard({ title: 'Aucun détail individuel à imprimer', body: model.emptyReason ?? 'Aucun collaborateur disponible.', height: 24 });
    return { startPage, endPage: engine.pages.currentPage, model };
  }

  model.employees.forEach((employee, index) => renderOne(engine, employee, index === 0));
  return { startPage, endPage: engine.pages.currentPage, model };
}
