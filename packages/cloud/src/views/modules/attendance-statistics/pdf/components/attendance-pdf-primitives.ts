import { ATTENDANCE_PDF_TYPOGRAPHY } from '../config/attendance-pdf-layout.js';
import { getPdfLineHeightMm, wrapPdfText } from '../layout/attendance-pdf-measure.js';
import type { AttendancePdfTheme } from '../theme/attendance-pdf-theme.js';
import type { JsPdfLike, PdfFontStyle, PdfTextAlign } from '../types/jspdf.types.js';
import type { AttendancePdfPageManager } from '../engine/attendance-pdf-page-manager.js';

function applyColor(
  setter: (r: number, g: number, b: number) => unknown,
  color: readonly [number, number, number],
): void {
  setter(color[0], color[1], color[2]);
}

export interface AttendancePdfTextBlockOptions {
  x?: number;
  maxWidth?: number;
  fontSizePt?: number;
  fontStyle?: PdfFontStyle;
  align?: PdfTextAlign;
  lineHeightFactor?: number;
  color?: readonly [number, number, number];
  spacingAfter?: number;
  keepTogether?: boolean;
}

export interface AttendancePdfCardOptions {
  title?: string;
  value?: string;
  body?: string;
  height?: number;
  padding?: number;
  borderRadius?: number;
  fillColor?: readonly [number, number, number];
  borderColor?: readonly [number, number, number];
}

export class AttendancePdfPrimitives {
  constructor(
    private readonly document: JsPdfLike,
    private readonly pages: AttendancePdfPageManager,
    private readonly theme: AttendancePdfTheme,
  ) {}

  drawSectionTitle(title: string, spacingAfter: number = 4): number {
    return this.drawTextBlock(title, {
      fontSizePt: ATTENDANCE_PDF_TYPOGRAPHY.sectionTitlePt,
      fontStyle: 'bold',
      color: this.theme.colors.text,
      lineHeightFactor: 1.1,
      spacingAfter,
      keepTogether: true,
    });
  }

  drawTextBlock(text: string, options: AttendancePdfTextBlockOptions = {}): number {
    const x = options.x ?? this.pages.contentLeft;
    const maxWidth = options.maxWidth ?? this.pages.contentWidth;
    const fontSizePt = options.fontSizePt ?? ATTENDANCE_PDF_TYPOGRAPHY.bodyPt;
    const fontStyle = options.fontStyle ?? 'normal';
    const lineHeightFactor = options.lineHeightFactor ?? 1.2;
    const spacingAfter = options.spacingAfter ?? 0;
    const lines = wrapPdfText(this.document, text, maxWidth);
    const lineHeight = getPdfLineHeightMm(fontSizePt, lineHeightFactor);
    const height = lines.length * lineHeight + spacingAfter;

    const space = this.pages.ensureSpace(height);
    if (!space.fitsOnFreshPage) {
      throw new RangeError('Text block is taller than the complete printable page height.');
    }

    this.document.setFont(this.theme.fontFamily, fontStyle).setFontSize(fontSizePt);
    applyColor(this.document.setTextColor.bind(this.document), options.color ?? this.theme.colors.text);

    const baseline = this.pages.y + lineHeight * 0.82;
    this.document.text(lines, x, baseline, {
      align: options.align ?? 'left',
      maxWidth,
    });
    this.pages.moveCursor(height);
    return height;
  }

  drawDivider(spacingBefore: number = 2, spacingAfter: number = 3): number {
    const height = spacingBefore + spacingAfter + 0.2;
    this.pages.ensureSpace(height);
    const y = this.pages.y + spacingBefore;
    applyColor(this.document.setDrawColor.bind(this.document), this.theme.colors.border);
    this.document.setLineWidth(0.2);
    this.document.line(this.pages.contentLeft, y, this.pages.contentLeft + this.pages.contentWidth, y);
    this.pages.moveCursor(height);
    return height;
  }

  drawCard(options: AttendancePdfCardOptions): number {
    const padding = options.padding ?? 4;
    const borderRadius = options.borderRadius ?? 2;
    const textWidth = this.pages.contentWidth - padding * 2;
    const titleLines = options.title ? wrapPdfText(this.document, options.title, textWidth) : [];
    const valueLines = options.value ? wrapPdfText(this.document, options.value, textWidth) : [];
    const bodyLines = options.body ? wrapPdfText(this.document, options.body, textWidth) : [];

    const titleHeight = titleLines.length * getPdfLineHeightMm(9, 1.15);
    const valueHeight = valueLines.length * getPdfLineHeightMm(16, 1.05);
    const bodyHeight = bodyLines.length * getPdfLineHeightMm(8.5, 1.2);
    const naturalHeight = padding * 2 + titleHeight + valueHeight + bodyHeight + (titleLines.length ? 1.5 : 0) + (valueLines.length ? 1.5 : 0);
    const height = options.height ?? Math.max(18, naturalHeight);

    const space = this.pages.ensureSpace(height);
    if (!space.fitsOnFreshPage) {
      throw new RangeError('Card is taller than the complete printable page height.');
    }

    const x = this.pages.contentLeft;
    const y = this.pages.y;
    applyColor(this.document.setFillColor.bind(this.document), options.fillColor ?? this.theme.colors.surfaceMuted);
    applyColor(this.document.setDrawColor.bind(this.document), options.borderColor ?? this.theme.colors.border);
    this.document.setLineWidth(0.2);
    this.document.roundedRect(x, y, this.pages.contentWidth, height, borderRadius, borderRadius, 'FD');

    let cursor = y + padding;
    if (titleLines.length > 0) {
      this.document.setFont(this.theme.fontFamily, 'bold').setFontSize(9);
      applyColor(this.document.setTextColor.bind(this.document), this.theme.colors.mutedText);
      const lineHeight = getPdfLineHeightMm(9, 1.15);
      this.document.text(titleLines, x + padding, cursor + lineHeight * 0.82);
      cursor += titleHeight + 1.5;
    }
    if (valueLines.length > 0) {
      this.document.setFont(this.theme.fontFamily, 'bold').setFontSize(16);
      applyColor(this.document.setTextColor.bind(this.document), this.theme.colors.text);
      const lineHeight = getPdfLineHeightMm(16, 1.05);
      this.document.text(valueLines, x + padding, cursor + lineHeight * 0.82);
      cursor += valueHeight + 1.5;
    }
    if (bodyLines.length > 0) {
      this.document.setFont(this.theme.fontFamily, 'normal').setFontSize(8.5);
      applyColor(this.document.setTextColor.bind(this.document), this.theme.colors.mutedText);
      const lineHeight = getPdfLineHeightMm(8.5, 1.2);
      this.document.text(bodyLines, x + padding, cursor + lineHeight * 0.82);
    }

    this.pages.moveCursor(height);
    return height;
  }
}
