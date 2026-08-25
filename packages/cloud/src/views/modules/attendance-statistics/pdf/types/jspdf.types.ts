/**
 * Contrat structurel minimal utilisé par le moteur PDF.
 *
 * Le module ne dépend pas des types internes de jsPDF : le véritable constructeur
 * `jsPDF` est injecté par l'application hôte. Cela rend le moteur testable et évite
 * de coupler les règles de pagination à une version particulière de la librairie.
 */
export type PdfTextAlign = 'left' | 'center' | 'right';
export type PdfFontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic';
export type PdfRectStyle = 'S' | 'F' | 'FD' | 'DF';

export interface JsPdfTextOptions {
  align?: PdfTextAlign;
  baseline?: 'alphabetic' | 'top' | 'middle' | 'bottom';
  maxWidth?: number;
}

export interface JsPdfConstructorOptions {
  orientation: 'landscape';
  unit: 'mm';
  format: 'a4';
  compress?: boolean;
  putOnlyUsedFonts?: boolean;
}

export interface JsPdfPageSizeLike {
  getWidth(): number;
  getHeight(): number;
}

export interface JsPdfLike {
  readonly internal: {
    pageSize: JsPdfPageSizeLike;
  };

  addPage(format?: 'a4', orientation?: 'landscape'): this;
  setPage(pageNumber: number): this;
  getNumberOfPages(): number;

  setFont(fontName: string, fontStyle?: PdfFontStyle): this;
  setFontSize(size: number): this;
  setTextColor(r: number, g: number, b: number): this;
  setDrawColor(r: number, g: number, b: number): this;
  setFillColor(r: number, g: number, b: number): this;
  setLineWidth(width: number): this;

  text(text: string | string[], x: number, y: number, options?: JsPdfTextOptions): this;
  line(x1: number, y1: number, x2: number, y2: number): this;
  rect(x: number, y: number, width: number, height: number, style?: PdfRectStyle): this;
  roundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radiusX: number,
    radiusY: number,
    style?: PdfRectStyle,
  ): this;

  splitTextToSize(text: string, maxWidth: number): string[];
  getTextWidth(text: string): number;

  output(type: 'arraybuffer'): ArrayBuffer;
  output(type: 'blob'): Blob;
  output(type: 'datauristring'): string;
  save(filename: string): void;
}

export interface JsPdfConstructorLike {
  new (options: JsPdfConstructorOptions): JsPdfLike;
}
