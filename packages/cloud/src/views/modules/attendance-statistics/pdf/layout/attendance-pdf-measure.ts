import type { JsPdfLike } from '../types/jspdf.types.js';

const MM_PER_POINT = 25.4 / 72;

export function pointsToMillimeters(points: number): number {
  return points * MM_PER_POINT;
}

export function getPdfLineHeightMm(fontSizePt: number, lineHeightFactor: number = 1.2): number {
  return pointsToMillimeters(fontSizePt) * lineHeightFactor;
}

export function wrapPdfText(document: JsPdfLike, text: string, maxWidth: number): string[] {
  if (!text) return [''];
  if (maxWidth <= 0) return [text];
  const lines = document.splitTextToSize(text, maxWidth);
  return Array.isArray(lines) && lines.length > 0 ? lines : [text];
}

export function measurePdfTextBlockHeight(
  document: JsPdfLike,
  text: string,
  maxWidth: number,
  fontSizePt: number,
  lineHeightFactor: number = 1.2,
): number {
  return wrapPdfText(document, text, maxWidth).length * getPdfLineHeightMm(fontSizePt, lineHeightFactor);
}
