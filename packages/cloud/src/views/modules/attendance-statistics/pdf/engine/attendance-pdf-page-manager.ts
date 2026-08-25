import {
  ATTENDANCE_PDF_CHROME,
  ATTENDANCE_PDF_MARGINS,
  ATTENDANCE_PDF_PAGE,
  ATTENDANCE_PDF_TYPOGRAPHY,
  getAttendancePdfContentBox,
} from '../config/attendance-pdf-layout.js';
import type { AttendancePdfReportContract, AttendancePdfSectionId } from '../types/attendance-pdf.types.js';
import type { JsPdfLike } from '../types/jspdf.types.js';
import type { AttendancePdfTheme } from '../theme/attendance-pdf-theme.js';

export interface AttendancePdfSpaceDecision {
  pageAdded: boolean;
  fitsOnFreshPage: boolean;
}

export interface AttendancePdfSectionPageIndex {
  section: AttendancePdfSectionId;
  page: number;
}

function setColor(
  setter: (r: number, g: number, b: number) => unknown,
  color: readonly [number, number, number],
): void {
  setter(color[0], color[1], color[2]);
}

export class AttendancePdfPageManager {
  private cursorY: number;
  private readonly contentBox = getAttendancePdfContentBox();
  private readonly sectionPages = new Map<AttendancePdfSectionId, number>();
  private chromeRendered = false;

  constructor(
    private readonly document: JsPdfLike,
    private readonly contract: AttendancePdfReportContract,
    private readonly theme: AttendancePdfTheme,
  ) {
    this.cursorY = this.contentBox.y;
  }

  get currentPage(): number {
    return this.document.getNumberOfPages();
  }

  get pageCount(): number {
    return this.document.getNumberOfPages();
  }

  get y(): number {
    return this.cursorY;
  }

  get contentTop(): number {
    return this.contentBox.y;
  }

  get contentBottom(): number {
    return this.contentBox.y + this.contentBox.height;
  }

  get contentLeft(): number {
    return this.contentBox.x;
  }

  get contentWidth(): number {
    return this.contentBox.width;
  }

  get remainingHeight(): number {
    return Math.max(0, this.contentBottom - this.cursorY);
  }

  setCursorY(y: number): void {
    if (y < this.contentTop || y > this.contentBottom) {
      throw new RangeError(`PDF cursor y=${y} is outside the printable content box.`);
    }
    this.cursorY = y;
  }

  moveCursor(delta: number): void {
    this.setCursorY(Math.min(this.contentBottom, this.cursorY + Math.max(0, delta)));
  }

  addPage(): void {
    this.document.addPage(ATTENDANCE_PDF_PAGE.format, ATTENDANCE_PDF_PAGE.orientation);
    this.cursorY = this.contentTop;
    this.chromeRendered = false;
  }

  ensureSpace(requiredHeight: number): AttendancePdfSpaceDecision {
    if (requiredHeight < 0) {
      throw new RangeError('requiredHeight must be greater than or equal to zero.');
    }

    const fitsOnFreshPage = requiredHeight <= this.contentBox.height;
    if (requiredHeight <= this.remainingHeight) {
      return { pageAdded: false, fitsOnFreshPage };
    }

    if (this.cursorY > this.contentTop) {
      this.addPage();
      return { pageAdded: true, fitsOnFreshPage };
    }

    return { pageAdded: false, fitsOnFreshPage };
  }

  markSectionStart(section: AttendancePdfSectionId): void {
    if (!this.sectionPages.has(section)) {
      this.sectionPages.set(section, this.currentPage);
    }
  }

  getSectionPageIndex(): AttendancePdfSectionPageIndex[] {
    return Array.from(this.sectionPages.entries()).map(([section, page]) => ({ section, page }));
  }

  /**
   * Le chrome est rendu après le contenu afin de connaître le nombre final de pages.
   * Cette méthode doit être appelée une seule fois juste avant l'output/save.
   */
  renderFinalChrome(): void {
    const totalPages = this.document.getNumberOfPages();
    const previousPage = totalPages;

    for (let page = 1; page <= totalPages; page += 1) {
      this.document.setPage(page);
      this.drawHeader();
      this.drawFooter(page, totalPages);
    }

    this.document.setPage(previousPage);
    this.chromeRendered = true;
  }

  get hasRenderedChrome(): boolean {
    return this.chromeRendered;
  }

  private drawHeader(): void {
    const { fontFamily, colors } = this.theme;
    const topY = ATTENDANCE_PDF_MARGINS.top + 3.4;
    const left = ATTENDANCE_PDF_MARGINS.left;
    const right = ATTENDANCE_PDF_PAGE.width - ATTENDANCE_PDF_MARGINS.right;

    this.document.setFont(fontFamily, 'bold').setFontSize(9.5);
    setColor(this.document.setTextColor.bind(this.document), colors.text);
    const tenant = this.contract.reportContext.tenantName;
    const title = tenant ? `${tenant} - Statistiques de presence` : 'Statistiques de presence';
    this.document.text(title, left, topY);

    const period = `${this.contract.reportContext.startDate} - ${this.contract.reportContext.endDate}`;
    this.document.setFont(fontFamily, 'normal').setFontSize(8);
    setColor(this.document.setTextColor.bind(this.document), colors.mutedText);
    this.document.text(period, right, topY, { align: 'right' });

    const contextParts: string[] = [];
    if (this.contract.reportContext.managerName) contextParts.push(this.contract.reportContext.managerName);
    if (this.contract.reportContext.siteName) contextParts.push(this.contract.reportContext.siteName);
    if (contextParts.length > 0) {
      this.document.text(contextParts.join(' | '), left, topY + 4.1);
    }

    setColor(this.document.setDrawColor.bind(this.document), colors.headerRule);
    this.document.setLineWidth(0.2);
    const ruleY = ATTENDANCE_PDF_MARGINS.top + ATTENDANCE_PDF_CHROME.headerHeight - 2.2;
    this.document.line(left, ruleY, right, ruleY);
  }

  private drawFooter(page: number, totalPages: number): void {
    const { fontFamily, colors } = this.theme;
    const left = ATTENDANCE_PDF_MARGINS.left;
    const right = ATTENDANCE_PDF_PAGE.width - ATTENDANCE_PDF_MARGINS.right;
    const footerTop = ATTENDANCE_PDF_PAGE.height - ATTENDANCE_PDF_MARGINS.bottom - ATTENDANCE_PDF_CHROME.footerHeight;
    const baseline = footerTop + 5.2;

    setColor(this.document.setDrawColor.bind(this.document), colors.headerRule);
    this.document.setLineWidth(0.2);
    this.document.line(left, footerTop + 0.8, right, footerTop + 0.8);

    this.document.setFont(fontFamily, 'normal').setFontSize(ATTENDANCE_PDF_TYPOGRAPHY.footerPt);
    setColor(this.document.setTextColor.bind(this.document), colors.mutedText);
    this.document.text('Rapport de presence', left, baseline);
    const generatedAtLabel = this.contract.request.presentationContext?.generatedAtLabel?.trim();
    if (generatedAtLabel) {
      this.document.text(`Genere le ${generatedAtLabel}`, ATTENDANCE_PDF_PAGE.width / 2, baseline, { align: 'center' });
    }
    this.document.text(`Page ${page} / ${totalPages}`, right, baseline, { align: 'right' });
  }
}
