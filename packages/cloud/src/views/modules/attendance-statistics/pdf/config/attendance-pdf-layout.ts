import type { AttendancePdfLayoutBox } from '../types/attendance-pdf.types.js';

export const ATTENDANCE_PDF_PAGE = {
  format: 'a4',
  orientation: 'landscape',
  unit: 'mm',
  width: 297,
  height: 210,
} as const;

export const ATTENDANCE_PDF_MARGINS = {
  top: 12,
  right: 12,
  bottom: 12,
  left: 12,
} as const;

export const ATTENDANCE_PDF_CHROME = {
  headerHeight: 13,
  footerHeight: 8,
} as const;

/**
 * Règles typographiques minimales. Si une table ne tient pas, on pagine ou
 * on retire une colonne : on ne descend pas arbitrairement sous ces valeurs.
 */
export const ATTENDANCE_PDF_TYPOGRAPHY = {
  reportTitlePt: 19,
  sectionTitlePt: 14,
  kpiValuePt: 20,
  bodyPt: 9.5,
  tablePt: 8.5,
  footerPt: 7.5,
  minimumTablePt: 8,
} as const;

/**
 * Cibles UX. La pagination réelle du moteur 6.2 devra toujours être pilotée
 * par la hauteur restante et non par un nombre fixe de lignes.
 */
export const ATTENDANCE_PDF_PAGINATION_TARGETS = {
  mainKpisMax: 5,
  executiveAttentionItemsMax: 5,
  executiveQualityNotesMax: 5,
  trendDaysPerSegmentMax: 31,
  issueOccurrencesPerPage: { min: 8, target: 10, max: 12 },
  employeesPerPage: { min: 16, target: 18, max: 20 },
  employeeDaysPerPage: { min: 14, target: 15, max: 16 },
  tocThresholdPages: 6,
} as const;

export const ATTENDANCE_PDF_PAGINATION_STRATEGY = 'height_first' as const;

export function getAttendancePdfContentBox(): AttendancePdfLayoutBox {
  const x = ATTENDANCE_PDF_MARGINS.left;
  const y = ATTENDANCE_PDF_MARGINS.top + ATTENDANCE_PDF_CHROME.headerHeight;
  const width =
    ATTENDANCE_PDF_PAGE.width - ATTENDANCE_PDF_MARGINS.left - ATTENDANCE_PDF_MARGINS.right;
  const bottom =
    ATTENDANCE_PDF_PAGE.height -
    ATTENDANCE_PDF_MARGINS.bottom -
    ATTENDANCE_PDF_CHROME.footerHeight;

  return {
    x,
    y,
    width,
    height: bottom - y,
  };
}
