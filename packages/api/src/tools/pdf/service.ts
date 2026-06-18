// // ─────────────────────────────────────────────────────────────────────────────
// // src/tenant/services/pdf.service.ts
// //
// // Génération de PDFs pour les assignments (schedule et rotation).
// // Utilise pdfkit — streaming direct vers la réponse Express.
// // ─────────────────────────────────────────────────────────────────────────────
//
// import PDFDocument from 'pdfkit';
// import { Response } from 'express';
//
// // ── Constantes de mise en page ────────────────────────────────────────────────
//
// const MARGIN = 50;
// const PAGE_W = 595.28; // A4 largeur en points
// const CONTENT_W = PAGE_W - MARGIN * 2;
//
// const COLOR_PRIMARY = '#1a1a2e';
// const COLOR_MUTED = '#6b7280';
// const COLOR_LINE = '#e5e7eb';
// const COLOR_BADGE_A = '#d1fae5'; // vert — actif
// const COLOR_BADGE_I = '#fee2e2'; // rouge — inactif
// const COLOR_BADGE_T = '#e0f2fe'; // bleu — neutre
//
// // ── Types internes ────────────────────────────────────────────────────────────
//
// interface ScheduleAssignmentPdfData {
//   guid: string;
//   family: 'user' | 'group';
//   start_date: string;
//   end_date?: string | null;
//   active: boolean;
//   reason?: string | null;
//   created_at?: Date | string;
//   tenant?: string;
//   related: {
//     name: string;
//     guid?: string;
//     employee_code?: string;
//     department?: string;
//     job_title?: string;
//   } | null;
//   session_template: {
//     name: string;
//     guid?: string;
//     version?: number;
//     definition?: Record<string, any>;
//     session_model?: { name?: string } | null;
//   } | null;
//   created_by: {
//     name: string;
//     guid?: string;
//   } | null;
// }
//
// interface RotationAssignmentPdfData {
//   guid: string;
//   family: 'user' | 'group';
//   offset: number;
//   assigned_at?: Date | string;
//   active: boolean;
//   tenant?: string;
//   related: {
//     name: string;
//     guid?: string;
//     employee_code?: string;
//   } | null;
//   assigned_by: {
//     name: string;
//     guid?: string;
//   } | null;
//   rotation_group: {
//     name: string;
//     guid?: string;
//     cycle_unit?: string;
//     templates?: Array<{
//       position: number;
//       session_template?: { name?: string };
//     }>;
//   } | null;
// }
//
// // ── Helpers de rendu ──────────────────────────────────────────────────────────
//
// const DAY_FR: Record<string, string> = {
//   Mon: 'Lundi',
//   Tue: 'Mardi',
//   Wed: 'Mercredi',
//   Thu: 'Jeudi',
//   Fri: 'Vendredi',
//   Sat: 'Samedi',
//   Sun: 'Dimanche',
// };
// const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
//
// function formatDate(d?: string | Date | null): string {
//   if (!d) return '—';
//   return new Date(d).toLocaleDateString('fr-FR', {
//     day: '2-digit',
//     month: '2-digit',
//     year: 'numeric',
//   });
// }
//
// function formatDatetime(d?: string | Date | null): string {
//   if (!d) return '—';
//   return new Date(d).toLocaleString('fr-FR', {
//     day: '2-digit',
//     month: '2-digit',
//     year: 'numeric',
//     hour: '2-digit',
//     minute: '2-digit',
//   });
// }
//
// /** Ligne horizontale de séparation */
// function drawDivider(doc: PDFKit.PDFDocument, y: number): void {
//   doc
//     .save()
//     .moveTo(MARGIN, y)
//     .lineTo(PAGE_W - MARGIN, y)
//     .strokeColor(COLOR_LINE)
//     .lineWidth(0.5)
//     .stroke()
//     .restore();
// }
//
// /** En-tête de section avec fond gris léger */
// function drawSectionHeader(doc: PDFKit.PDFDocument, title: string, y: number): number {
//   doc.save().rect(MARGIN, y, CONTENT_W, 20).fill('#f3f4f6').restore();
//
//   doc
//     .font('Helvetica-Bold')
//     .fontSize(9)
//     .fillColor(COLOR_PRIMARY)
//     .text(title.toUpperCase(), MARGIN + 8, y + 6, { width: CONTENT_W });
//
//   return y + 28;
// }
//
// /** Ligne clé / valeur */
// function drawRow(
//   doc: PDFKit.PDFDocument,
//   label: string,
//   value: string,
//   y: number,
//   opts: { valueColor?: string } = {},
// ): number {
//   const labelW = 160;
//   const valueX = MARGIN + labelW;
//   const valueW = CONTENT_W - labelW;
//
//   doc
//     .font('Helvetica')
//     .fontSize(9)
//     .fillColor(COLOR_MUTED)
//     .text(label, MARGIN, y, { width: labelW });
//
//   doc
//     .font('Helvetica')
//     .fontSize(9)
//     .fillColor(opts.valueColor ?? COLOR_PRIMARY)
//     .text(value || '—', valueX, y, { width: valueW });
//
//   // hauteur réelle du texte le plus haut
//   const h = Math.max(
//     doc.heightOfString(label, { width: labelW }),
//     doc.heightOfString(value || '—', { width: valueW }),
//   );
//   return y + h + 6;
// }
//
// /** Badge coloré (actif / inactif / texte neutre) */
// function drawBadge(doc: PDFKit.PDFDocument, text: string, x: number, y: number, bg: string): void {
//   const pad = 6;
//   doc.font('Helvetica-Bold').fontSize(8);
//   const w = doc.widthOfString(text) + pad * 2;
//   // const w = doc.widthOfString(text, { fontSize: 8 }) + pad * 2;
//   const h = 14;
//   doc
//     .save()
//     .roundedRect(x, y - 2, w, h, 3)
//     .fill(bg)
//     .restore();
//   doc
//     .font('Helvetica-Bold')
//     .fontSize(8)
//     .fillColor(COLOR_PRIMARY)
//     .text(text, x + pad, y + 1);
// }
//
// /** En-tête commun à tous les PDFs */
// function drawPageHeader(
//   doc: PDFKit.PDFDocument,
//   title: string,
//   subtitle: string,
//   tenant?: string,
// ): number {
//   let y = MARGIN;
//
//   // Titre principal
//   doc.font('Helvetica-Bold').fontSize(18).fillColor(COLOR_PRIMARY).text('TimeFlow', MARGIN, y);
//
//   // Tenant à droite
//   if (tenant) {
//     doc
//       .font('Helvetica')
//       .fontSize(9)
//       .fillColor(COLOR_MUTED)
//       .text(tenant, MARGIN, y + 4, { align: 'right', width: CONTENT_W });
//   }
//
//   y += 26;
//
//   doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR_PRIMARY).text(title, MARGIN, y);
//
//   y += 18;
//
//   doc.font('Helvetica').fontSize(9).fillColor(COLOR_MUTED).text(subtitle, MARGIN, y);
//
//   y += 16;
//
//   // Date d'export
//   doc
//     .font('Helvetica')
//     .fontSize(8)
//     .fillColor(COLOR_MUTED)
//     .text(`Généré le ${formatDatetime(new Date())}`, MARGIN, y);
//
//   y += 6;
//   drawDivider(doc, y + 6);
//
//   return y + 20;
// }
//
// // ─────────────────────────────────────────────────────────────────────────────
// // ── SCHEDULE ASSIGNMENT PDF ───────────────────────────────────────────────────
// // ─────────────────────────────────────────────────────────────────────────────
//
// export function generateScheduleAssignmentPdf(
//   data: ScheduleAssignmentPdfData,
//   res: Response,
// ): void {
//   const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
//
//   // Headers HTTP
//   res.setHeader('Content-Type', 'application/pdf');
//   res.setHeader(
//     'Content-Disposition',
//     `attachment; filename="schedule_assignment_${data.guid.slice(0, 8)}.pdf"`,
//   );
//   doc.pipe(res);
//
//   // ── En-tête ────────────────────────────────────────────────────────────────
//   const familyLabel = data.family === 'user' ? 'Employé' : 'Groupe';
//   const targetName = data.related?.name ?? '—';
//   let y = drawPageHeader(doc, 'Assignation Horaire', `${familyLabel} · ${targetName}`, data.tenant);
//
//   // ── Section 1 : Assignation ───────────────────────────────────────────────
//   y = drawSectionHeader(doc, "Informations de l'assignation", y);
//
//   const statusText = data.active ? 'Active' : 'Inactive';
//   const statusBg = data.active ? COLOR_BADGE_A : COLOR_BADGE_I;
//
//   // Statut en badge
//   doc
//     .font('Helvetica')
//     .fontSize(9)
//     .fillColor(COLOR_MUTED)
//     .text('Statut', MARGIN, y, { width: 160 });
//   drawBadge(doc, statusText, MARGIN + 160, y, statusBg);
//   y += 20;
//
//   y = drawRow(doc, 'Référence', data.guid, y);
//   y = drawRow(doc, 'Type de cible', data.family === 'user' ? 'Employé individuel' : 'Groupe', y);
//   y = drawRow(doc, 'Début', formatDate(data.start_date), y);
//   y = drawRow(doc, 'Fin', data.end_date ? formatDate(data.end_date) : 'Ouverte', y);
//
//   if (data.reason) {
//     y = drawRow(doc, 'Motif', data.reason, y);
//   }
//   if (data.created_at) {
//     y = drawRow(doc, 'Créée le', formatDatetime(data.created_at), y);
//   }
//
//   y += 8;
//   drawDivider(doc, y);
//   y += 12;
//
//   // ── Section 2 : Cible ─────────────────────────────────────────────────────
//   y = drawSectionHeader(doc, data.family === 'user' ? 'Employé concerné' : 'Groupe concerné', y);
//
//   if (data.related) {
//     y = drawRow(doc, 'Nom', data.related.name, y);
//     if (data.related.employee_code) {
//       y = drawRow(doc, 'Matricule', data.related.employee_code, y);
//     }
//     if (data.related.department) {
//       y = drawRow(doc, 'Département', data.related.department, y);
//     }
//     if (data.related.job_title) {
//       y = drawRow(doc, 'Poste', data.related.job_title, y);
//     }
//   } else {
//     y = drawRow(doc, 'Cible', '—', y);
//   }
//
//   y += 8;
//   drawDivider(doc, y);
//   y += 12;
//
//   // ── Section 3 : Template horaire ──────────────────────────────────────────
//   y = drawSectionHeader(doc, 'Template horaire appliqué', y);
//
//   if (data.session_template) {
//     const tpl = data.session_template;
//     y = drawRow(doc, 'Nom du template', tpl.name, y);
//     if (tpl.version !== undefined) {
//       y = drawRow(doc, 'Version', `v${tpl.version}`, y);
//     }
//     if (tpl.session_model?.name) {
//       y = drawRow(doc, 'Modèle de session', tpl.session_model.name, y);
//     }
//
//     // Définition par jour
//     if (tpl.definition && typeof tpl.definition === 'object') {
//       y += 6;
//       doc
//         .font('Helvetica-Bold')
//         .fontSize(9)
//         .fillColor(COLOR_MUTED)
//         .text('Horaires par jour :', MARGIN, y);
//       y += 14;
//
//       for (const dayKey of DAY_ORDER) {
//         const slots = tpl.definition[dayKey];
//         if (!slots || !Array.isArray(slots) || slots.length === 0) continue;
//
//         for (const slot of slots) {
//           const work = slot.work ? `${slot.work[0]} – ${slot.work[1]}` : null;
//           const pause = slot.pause ? `${slot.pause[0]} – ${slot.pause[1]}` : null;
//
//           if (!work) continue;
//
//           const dayFr = DAY_FR[dayKey] ?? dayKey;
//           const line = pause ? `${work}   (pause : ${pause})` : work;
//
//           doc
//             .font('Helvetica-Bold')
//             .fontSize(9)
//             .fillColor(COLOR_PRIMARY)
//             .text(dayFr, MARGIN + 8, y, { width: 90, continued: true });
//           doc
//             .font('Helvetica')
//             .fontSize(9)
//             .fillColor(COLOR_PRIMARY)
//             .text(line, { width: CONTENT_W - 98 });
//           y += 14;
//         }
//       }
//     }
//   } else {
//     y = drawRow(doc, 'Template', '—', y);
//   }
//
//   y += 8;
//   drawDivider(doc, y);
//   y += 12;
//
//   // ── Section 4 : Créé par ──────────────────────────────────────────────────
//   y = drawSectionHeader(doc, 'Créé par', y);
//
//   if (data.created_by) {
//     y = drawRow(doc, 'Responsable', data.created_by.name, y);
//   } else {
//     y = drawRow(doc, 'Responsable', '—', y);
//   }
//
//   // ── Pied de page ──────────────────────────────────────────────────────────
//   const pages = doc.bufferedPageRange();
//   for (let i = 0; i < pages.count; i++) {
//     doc.switchToPage(i);
//     doc
//       .font('Helvetica')
//       .fontSize(8)
//       .fillColor(COLOR_MUTED)
//       .text(`Page ${i + 1} / ${pages.count}  ·  TimeFlow`, MARGIN, doc.page.height - 30, {
//         align: 'center',
//         width: CONTENT_W,
//       });
//   }
//
//   doc.end();
// }
//
// // ─────────────────────────────────────────────────────────────────────────────
// // ── ROTATION ASSIGNMENT PDF ───────────────────────────────────────────────────
// // ─────────────────────────────────────────────────────────────────────────────
//
// export function generateRotationAssignmentPdf(
//   data: RotationAssignmentPdfData,
//   res: Response,
// ): void {
//   const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
//
//   res.setHeader('Content-Type', 'application/pdf');
//   res.setHeader(
//     'Content-Disposition',
//     `attachment; filename="rotation_assignment_${data.guid.slice(0, 8)}.pdf"`,
//   );
//   doc.pipe(res);
//
//   // ── En-tête ────────────────────────────────────────────────────────────────
//   const familyLabel = data.family === 'user' ? 'Employé' : 'Groupe';
//   const targetName = data.related?.name ?? '—';
//   const groupName = data.rotation_group?.name ?? '—';
//   let y = drawPageHeader(
//     doc,
//     'Assignation de Rotation',
//     `${familyLabel} · ${targetName}  →  Groupe : ${groupName}`,
//     data.tenant,
//   );
//
//   // ── Section 1 : Assignation ───────────────────────────────────────────────
//   y = drawSectionHeader(doc, "Informations de l'assignation", y);
//
//   const statusText = data.active ? 'Active' : 'Inactive';
//   const statusBg = data.active ? COLOR_BADGE_A : COLOR_BADGE_I;
//
//   doc
//     .font('Helvetica')
//     .fontSize(9)
//     .fillColor(COLOR_MUTED)
//     .text('Statut', MARGIN, y, { width: 160 });
//   drawBadge(doc, statusText, MARGIN + 160, y, statusBg);
//   y += 20;
//
//   y = drawRow(doc, 'Référence', data.guid, y);
//   y = drawRow(doc, 'Type de cible', data.family === 'user' ? 'Employé individuel' : 'Groupe', y);
//   y = drawRow(doc, 'Position dans le cycle', `${data.offset}`, y);
//   if (data.assigned_at) {
//     y = drawRow(doc, 'Assigné le', formatDatetime(data.assigned_at), y);
//   }
//
//   y += 8;
//   drawDivider(doc, y);
//   y += 12;
//
//   // ── Section 2 : Cible ─────────────────────────────────────────────────────
//   y = drawSectionHeader(doc, data.family === 'user' ? 'Employé concerné' : 'Groupe concerné', y);
//
//   if (data.related) {
//     y = drawRow(doc, 'Nom', data.related.name, y);
//     if (data.related.employee_code) {
//       y = drawRow(doc, 'Matricule', data.related.employee_code, y);
//     }
//   } else {
//     y = drawRow(doc, 'Cible', '—', y);
//   }
//
//   y += 8;
//   drawDivider(doc, y);
//   y += 12;
//
//   // ── Section 3 : Groupe de rotation ────────────────────────────────────────
//   y = drawSectionHeader(doc, 'Groupe de rotation', y);
//
//   if (data.rotation_group) {
//     const rg = data.rotation_group;
//     y = drawRow(doc, 'Nom du groupe', rg.name, y);
//     if (rg.cycle_unit) {
//       y = drawRow(doc, 'Unité de cycle', rg.cycle_unit, y);
//     }
//
//     // Templates du cycle
//     if (rg.templates && rg.templates.length > 0) {
//       y += 6;
//       doc
//         .font('Helvetica-Bold')
//         .fontSize(9)
//         .fillColor(COLOR_MUTED)
//         .text('Templates du cycle :', MARGIN, y);
//       y += 14;
//
//       for (const slot of rg.templates) {
//         const tplName = slot.session_template?.name ?? '—';
//         const isCurrent = slot.position === data.offset;
//
//         // Badge "Position courante"
//         if (isCurrent) {
//           drawBadge(doc, 'Position courante', MARGIN + 8, y - 1, COLOR_BADGE_T);
//           y += 16;
//         }
//
//         doc
//           .font('Helvetica-Bold')
//           .fontSize(9)
//           .fillColor(COLOR_PRIMARY)
//           .text(`Position ${slot.position}`, MARGIN + 8, y, { width: 90, continued: true });
//         doc
//           .font('Helvetica')
//           .fontSize(9)
//           .fillColor(COLOR_PRIMARY)
//           .text(tplName, { width: CONTENT_W - 98 });
//         y += 14;
//       }
//     }
//   } else {
//     y = drawRow(doc, 'Groupe', '—', y);
//   }
//
//   y += 8;
//   drawDivider(doc, y);
//   y += 12;
//
//   // ── Section 4 : Assigné par ───────────────────────────────────────────────
//   y = drawSectionHeader(doc, 'Assigné par', y);
//
//   if (data.assigned_by) {
//     y = drawRow(doc, 'Responsable', data.assigned_by.name, y);
//   } else {
//     y = drawRow(doc, 'Responsable', '—', y);
//   }
//
//   // ── Pied de page ──────────────────────────────────────────────────────────
//   const pages = doc.bufferedPageRange();
//   for (let i = 0; i < pages.count; i++) {
//     doc.switchToPage(i);
//     doc
//       .font('Helvetica')
//       .fontSize(8)
//       .fillColor(COLOR_MUTED)
//       .text(`Page ${i + 1} / ${pages.count}  ·  TimeFlow`, MARGIN, doc.page.height - 30, {
//         align: 'center',
//         width: CONTENT_W,
//       });
//   }
//
//   doc.end();
// }
