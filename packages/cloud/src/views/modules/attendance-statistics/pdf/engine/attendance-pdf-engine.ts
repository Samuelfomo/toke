import { buildAttendancePdfReportContract } from '../contracts/attendance-pdf.contract.js';
import {
  ATTENDANCE_PDF_PAGE,
} from '../config/attendance-pdf-layout.js';
import { AttendancePdfPrimitives } from '../components/attendance-pdf-primitives.js';
import { AttendancePdfTableRenderer } from '../components/attendance-pdf-table.js';
import { DEFAULT_ATTENDANCE_PDF_THEME, type AttendancePdfTheme } from '../theme/attendance-pdf-theme.js';
import type { AttendancePdfExportRequest, AttendancePdfReportContract } from '../types/attendance-pdf.types.js';
import type { JsPdfConstructorLike, JsPdfLike } from '../types/jspdf.types.js';
import { AttendancePdfPageManager } from './attendance-pdf-page-manager.js';

export class AttendancePdfContractValidationError extends Error {
  constructor(readonly contract: AttendancePdfReportContract) {
    super(contract.validation.errors.map((error) => error.message).join(' | '));
    this.name = 'AttendancePdfContractValidationError';
  }
}

export interface AttendancePdfEngineOptions {
  theme?: AttendancePdfTheme;
}

export class AttendancePdfEngine {
  readonly pages: AttendancePdfPageManager;
  readonly primitives: AttendancePdfPrimitives;
  readonly table: AttendancePdfTableRenderer;
  private finalized = false;

  constructor(
    readonly document: JsPdfLike,
    readonly contract: AttendancePdfReportContract,
    readonly theme: AttendancePdfTheme,
  ) {
    this.pages = new AttendancePdfPageManager(document, contract, theme);
    this.primitives = new AttendancePdfPrimitives(document, this.pages, theme);
    this.table = new AttendancePdfTableRenderer(document, this.pages, theme);
  }

  finalize(): this {
    if (!this.finalized) {
      this.pages.renderFinalChrome();
      this.finalized = true;
    }
    return this;
  }

  toArrayBuffer(): ArrayBuffer {
    this.finalize();
    return this.document.output('arraybuffer');
  }

  toBlob(): Blob {
    this.finalize();
    return this.document.output('blob');
  }

  toDataUriString(): string {
    this.finalize();
    return this.document.output('datauristring');
  }

  save(filename: string): void {
    this.finalize();
    this.document.save(filename);
  }
}

export function createAttendancePdfEngine(
  JsPdfConstructor: JsPdfConstructorLike,
  request: AttendancePdfExportRequest,
  options: AttendancePdfEngineOptions = {},
): AttendancePdfEngine {
  const contract = buildAttendancePdfReportContract(request);
  if (!contract.validation.valid) {
    throw new AttendancePdfContractValidationError(contract);
  }

  const document = new JsPdfConstructor({
    orientation: ATTENDANCE_PDF_PAGE.orientation,
    unit: ATTENDANCE_PDF_PAGE.unit,
    format: ATTENDANCE_PDF_PAGE.format,
    compress: true,
    putOnlyUsedFonts: true,
  });

  return new AttendancePdfEngine(document, contract, options.theme ?? DEFAULT_ATTENDANCE_PDF_THEME);
}
