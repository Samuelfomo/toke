import { ATTENDANCE_PDF_TYPOGRAPHY } from '../config/attendance-pdf-layout.js';
import { getPdfLineHeightMm, wrapPdfText } from '../layout/attendance-pdf-measure.js';
import type { AttendancePdfPageManager } from '../engine/attendance-pdf-page-manager.js';
import type { AttendancePdfTheme } from '../theme/attendance-pdf-theme.js';
import type { JsPdfLike, PdfTextAlign } from '../types/jspdf.types.js';

export interface AttendancePdfTableColumn<Row> {
  key: string;
  title: string;
  width?: number;
  weight?: number;
  align?: PdfTextAlign;
  value: (row: Row) => string;
}

export interface AttendancePdfTableOptions<Row> {
  columns: AttendancePdfTableColumn<Row>[];
  rows: Row[];
  fontSizePt?: number;
  headerFontSizePt?: number;
  horizontalPadding?: number;
  verticalPadding?: number;
  repeatHeader?: boolean;
  spacingAfter?: number;
}

export interface AttendancePdfTableResult {
  rowsRendered: number;
  pagesUsed: number;
  heightOnLastPage: number;
}

interface ResolvedColumn<Row> extends AttendancePdfTableColumn<Row> {
  resolvedWidth: number;
}

function applyColor(
  setter: (r: number, g: number, b: number) => unknown,
  color: readonly [number, number, number],
): void {
  setter(color[0], color[1], color[2]);
}

export class AttendancePdfTableRenderer {
  constructor(
    private readonly document: JsPdfLike,
    private readonly pages: AttendancePdfPageManager,
    private readonly theme: AttendancePdfTheme,
  ) {}

  draw<Row>(options: AttendancePdfTableOptions<Row>): AttendancePdfTableResult {
    if (options.columns.length === 0) {
      return { rowsRendered: 0, pagesUsed: 0, heightOnLastPage: 0 };
    }

    const startPage = this.pages.currentPage;
    const startY = this.pages.y;
    const fontSizePt = Math.max(
      options.fontSizePt ?? ATTENDANCE_PDF_TYPOGRAPHY.tablePt,
      ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
    );
    const headerFontSizePt = Math.max(
      options.headerFontSizePt ?? fontSizePt,
      ATTENDANCE_PDF_TYPOGRAPHY.minimumTablePt,
    );
    const horizontalPadding = options.horizontalPadding ?? 2;
    const verticalPadding = options.verticalPadding ?? 1.4;
    const repeatHeader = options.repeatHeader !== false;
    const columns = this.resolveColumns(options.columns);

    const headerHeight = this.measureRowHeight(
      columns.map((column) => column.title),
      columns,
      headerFontSizePt,
      horizontalPadding,
      verticalPadding,
    );

    const renderHeader = (): void => {
      const space = this.pages.ensureSpace(headerHeight);
      if (!space.fitsOnFreshPage) {
        throw new RangeError('Table header is taller than the printable page height.');
      }
      this.renderRow(
        columns.map((column) => column.title),
        columns,
        headerHeight,
        headerFontSizePt,
        horizontalPadding,
        verticalPadding,
        true,
      );
    };

    renderHeader();
    let rowsRendered = 0;

    for (const row of options.rows) {
      const values = columns.map((column) => column.value(row));
      const rowHeight = this.measureRowHeight(
        values,
        columns,
        fontSizePt,
        horizontalPadding,
        verticalPadding,
      );

      const printableHeight = this.pages.contentBottom - this.pages.contentTop;
      if (rowHeight > printableHeight) {
        throw new RangeError('A table row is taller than the complete printable page height.');
      }
      if (repeatHeader && rowHeight + headerHeight > printableHeight) {
        throw new RangeError('A table row cannot fit on a fresh page together with the repeated header.');
      }

      const decision = this.pages.ensureSpace(rowHeight);
      if (decision.pageAdded && repeatHeader) {
        renderHeader();
        const afterHeader = this.pages.ensureSpace(rowHeight);
        if (!afterHeader.fitsOnFreshPage || afterHeader.pageAdded) {
          throw new RangeError('Table row cannot fit below its repeated header on a fresh page.');
        }
      }

      this.renderRow(
        values,
        columns,
        rowHeight,
        fontSizePt,
        horizontalPadding,
        verticalPadding,
        false,
      );
      rowsRendered += 1;
    }

    const spacingAfter = options.spacingAfter ?? 0;
    if (spacingAfter > 0) {
      this.pages.ensureSpace(spacingAfter);
      this.pages.moveCursor(spacingAfter);
    }

    const pagesUsed = this.pages.currentPage - startPage + 1;
    const heightOnLastPage = this.pages.currentPage === startPage ? this.pages.y - startY : this.pages.y - this.pages.contentTop;
    return { rowsRendered, pagesUsed, heightOnLastPage };
  }

  private resolveColumns<Row>(columns: AttendancePdfTableColumn<Row>[]): ResolvedColumn<Row>[] {
    const totalWidth = this.pages.contentWidth;
    const fixedWidth = columns.reduce((sum, column) => sum + (column.width ?? 0), 0);
    if (fixedWidth > totalWidth) {
      throw new RangeError('Fixed table column widths exceed the printable content width.');
    }

    const flexible = columns.filter((column) => column.width === undefined);
    const remaining = totalWidth - fixedWidth;
    if (flexible.length > 0 && remaining <= 0) {
      throw new RangeError('Flexible table columns have no printable width remaining.');
    }
    const totalWeight = flexible.reduce((sum, column) => sum + (column.weight ?? 1), 0);

    return columns.map((column) => ({
      ...column,
      resolvedWidth:
        column.width ?? (totalWeight > 0 ? (remaining * (column.weight ?? 1)) / totalWeight : 0),
    }));
  }

  private measureRowHeight<Row>(
    values: string[],
    columns: ResolvedColumn<Row>[],
    fontSizePt: number,
    horizontalPadding: number,
    verticalPadding: number,
  ): number {
    const lineHeight = getPdfLineHeightMm(fontSizePt, 1.15);
    let maxLines = 1;
    values.forEach((value, index) => {
      const column = columns[index];
      if (!column) return;
      const textWidth = Math.max(1, column.resolvedWidth - horizontalPadding * 2);
      maxLines = Math.max(maxLines, wrapPdfText(this.document, value, textWidth).length);
    });
    return maxLines * lineHeight + verticalPadding * 2;
  }

  private renderRow<Row>(
    values: string[],
    columns: ResolvedColumn<Row>[],
    height: number,
    fontSizePt: number,
    horizontalPadding: number,
    verticalPadding: number,
    isHeader: boolean,
  ): void {
    const y = this.pages.y;
    let x = this.pages.contentLeft;
    const lineHeight = getPdfLineHeightMm(fontSizePt, 1.15);

    for (let index = 0; index < columns.length; index += 1) {
      const column = columns[index];
      if (!column) continue;
      const value = values[index] ?? '';
      const textWidth = Math.max(1, column.resolvedWidth - horizontalPadding * 2);
      const lines = wrapPdfText(this.document, value, textWidth);

      applyColor(
        this.document.setFillColor.bind(this.document),
        isHeader ? this.theme.colors.surfaceMuted : this.theme.colors.surface,
      );
      applyColor(this.document.setDrawColor.bind(this.document), this.theme.colors.border);
      this.document.setLineWidth(0.15);
      this.document.rect(x, y, column.resolvedWidth, height, 'FD');

      this.document
        .setFont(this.theme.fontFamily, isHeader ? 'bold' : 'normal')
        .setFontSize(fontSizePt);
      applyColor(this.document.setTextColor.bind(this.document), this.theme.colors.text);

      const align = column.align ?? 'left';
      const textX =
        align === 'right'
          ? x + column.resolvedWidth - horizontalPadding
          : align === 'center'
            ? x + column.resolvedWidth / 2
            : x + horizontalPadding;
      this.document.text(lines, textX, y + verticalPadding + lineHeight * 0.82, {
        align,
        maxWidth: textWidth,
      });
      x += column.resolvedWidth;
    }

    this.pages.moveCursor(height);
  }
}
