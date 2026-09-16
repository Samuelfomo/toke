import { ATTENDANCE_PDF_TYPOGRAPHY } from '../config/attendance-pdf-layout.js';
import type { AttendancePdfEngine } from '../engine/attendance-pdf-engine.js';
import type { AttendancePdfExportMode } from '../types/attendance-pdf.types.js';

function setColor(
  setter: (r: number, g: number, b: number) => unknown,
  color: readonly [number, number, number],
): void {
  setter(color[0], color[1], color[2]);
}

function formatBusinessDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function getHeading(mode: AttendancePdfExportMode): { title: string; subtitle: string } {
  switch (mode) {
    case 'period_summary':
      return { title: 'SYNTHÈSE DÉCISIONNELLE', subtitle: 'Direction' };
    case 'full_report':
      return { title: 'RAPPORT DE STATISTIQUES DE POINTAGE', subtitle: 'Pilotage' };
    case 'hr_complete':
      return { title: 'RAPPORT DE STATISTIQUES DE POINTAGE', subtitle: 'Ressources humaines' };
    case 'issues_only':
      return { title: 'RAPPORT DES ALERTES DE POINTAGE', subtitle: 'Suivi opérationnel' };
    case 'employee_sheet':
      return { title: 'FICHE INDIVIDUELLE DE POINTAGE', subtitle: 'Investigation' };
    case 'current_analysis':
      return { title: 'ANALYSE DE POINTAGE', subtitle: 'Contexte sélectionné' };
  }
}

/**
 * En-tête documentaire de la première page.
 * Il s'agit du vrai titre administratif du document, distinct du petit chrome
 * de navigation répété sur chaque page.
 */
export function renderAttendancePdfReportHeading(engine: AttendancePdfEngine): void {
  const { document, contract, pages, theme } = engine;
  const { title, subtitle } = getHeading(contract.request.mode);
  const centerX = pages.contentLeft + pages.contentWidth / 2;

  pages.ensureSpace(28);

  const tenant = contract.reportContext.tenantName?.trim();
  if (tenant && contract.request.mode !== 'period_summary') {
    document.setFont(theme.fontFamily, 'bold').setFontSize(9);
    setColor(document.setTextColor.bind(document), theme.colors.mutedText);
    document.text(tenant.toUpperCase(), centerX, pages.y + 3, { align: 'center' });
    pages.moveCursor(5);
  }

  document.setFont(theme.fontFamily, 'bold').setFontSize(ATTENDANCE_PDF_TYPOGRAPHY.reportTitlePt);
  setColor(document.setTextColor.bind(document), theme.colors.text);
  document.text(title, centerX, pages.y + 6.2, { align: 'center' });
  pages.moveCursor(9);

  document.setFont(theme.fontFamily, 'bold').setFontSize(10.5);
  setColor(document.setTextColor.bind(document), theme.colors.accent);
  document.text(subtitle, centerX, pages.y + 3.7, { align: 'center' });
  pages.moveCursor(6);

  const teamSize = contract.request.overview.scope.teamSize;
  const teamLabel = `${teamSize} collaborateur${teamSize > 1 ? 's' : ''}`;
  const period = `Période du ${formatBusinessDate(contract.reportContext.startDate)} au ${formatBusinessDate(contract.reportContext.endDate)}${contract.request.mode === 'period_summary' ? ` · ${teamLabel}` : ''}`;
  document.setFont(theme.fontFamily, 'normal').setFontSize(9.5);
  setColor(document.setTextColor.bind(document), theme.colors.mutedText);
  document.text(period, centerX, pages.y + 3.4, { align: 'center' });
  pages.moveCursor(6);

  setColor(document.setDrawColor.bind(document), theme.colors.headerRule);
  document.setLineWidth(0.25);
  document.line(pages.contentLeft, pages.y, pages.contentLeft + pages.contentWidth, pages.y);
  pages.moveCursor(5);
}
