import type { AttendancePdfEngineOptions } from '../engine/attendance-pdf-engine.js';
import { buildAttendancePdfExport, saveAttendancePdfExport, type AttendancePdfExportedReport } from '../report/attendance-pdf-export.js';
import type { AttendancePdfExportRequest } from '../types/attendance-pdf.types.js';
import type { JsPdfConstructorLike } from '../types/jspdf.types.js';

export type AttendanceJsPdfLoader = () => Promise<JsPdfConstructorLike>;

/**
 * Charge jsPDF uniquement au moment de l'export afin de ne pas alourdir le chargement
 * initial du dashboard. L'application hôte doit installer `jspdf` (peer dependency).
 */
export async function loadAttendanceJsPdfConstructor(): Promise<JsPdfConstructorLike> {
  const module = await import('jspdf');
  return module.jsPDF as unknown as JsPdfConstructorLike;
}

export async function downloadAttendancePdfExport(input: {
  request: AttendancePdfExportRequest;
  loader?: AttendanceJsPdfLoader;
  engineOptions?: AttendancePdfEngineOptions;
}): Promise<AttendancePdfExportedReport> {
  const JsPdfConstructor = await (input.loader ?? loadAttendanceJsPdfConstructor)();
  return saveAttendancePdfExport(JsPdfConstructor, input.request, input.engineOptions ?? {});
}


/**
 * Ouvre un aperçu dans un nouvel onglet. L'onglet est créé avant le chargement
 * asynchrone de jsPDF afin de rester dans le geste utilisateur et éviter le blocage popup.
 * Le téléchargement/impression sont ensuite laissés au lecteur PDF du navigateur.
 */
export async function previewAttendancePdfExport(input: {
  request: AttendancePdfExportRequest;
  loader?: AttendanceJsPdfLoader;
  engineOptions?: AttendancePdfEngineOptions;
}): Promise<AttendancePdfExportedReport> {
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    throw new Error("Impossible d'ouvrir l'aperçu PDF. Vérifiez que les pop-ups sont autorisées.");
  }

  previewWindow.opener = null;
  previewWindow.document.title = 'Préparation du PDF…';
  previewWindow.document.body.innerHTML =
    '<p style="font-family:Arial,sans-serif;padding:24px">Préparation du PDF…</p>';

  try {
    const JsPdfConstructor = await (input.loader ?? loadAttendanceJsPdfConstructor)();
    const report = buildAttendancePdfExport(
      JsPdfConstructor,
      input.request,
      input.engineOptions ?? {},
    );
    const blob = report.engine.toBlob();
    const previewUrl = URL.createObjectURL(blob);
    previewWindow.location.replace(previewUrl);
    // Le délai évite de révoquer l'URL avant que le viewer PDF n'ait fini son chargement.
    window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);
    return report;
  } catch (error) {
    previewWindow.close();
    throw error;
  }
}
