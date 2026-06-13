import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";

import {
    buildMemberRows, computeRotationKPIs,
    resolveFirstFullGroup,
    resolveRotationDayCell,
    RotationExportOptions
} from "./rotationAssignment.export";
import {buildPeriodDays, buildPeriodLabel, formatDatetimeFR, formatHours} from "./export.helpers";

import {getRotationTargetName} from "@/views/planning/rotation_assignment/type";

export function exportRotationPDF(options: RotationExportOptions): void {
    const { assignments, periodFrom, periodTo, generatedBy, tenantName } = options

    const members = buildMemberRows(assignments)
    const days    = buildPeriodDays(periodFrom, periodTo)
    const rg      = resolveFirstFullGroup(assignments)

    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const MARGIN  = 10
    const CONTENT = pageW - MARGIN * 2

    const C = {
        primary:  [0,   74,  173] as [number,number,number],
        primaryDk:[0,   52,  120] as [number,number,number],
        white:    [255, 255, 255] as [number,number,number],
        muted:    [107, 114, 128] as [number,number,number],
        line:     [229, 231, 235] as [number,number,number],
        rowAlt:   [249, 250, 251] as [number,number,number],
        dark:     [30,  30,  50]  as [number,number,number],
        // Couleurs templates (4 max comme dans le composant)
        t0: [237, 233, 254] as [number,number,number],  // violet-100
        t1: [204, 251, 241] as [number,number,number],  // teal-100
        t2: [219, 234, 254] as [number,number,number],  // blue-100
        t3: [254, 243, 199] as [number,number,number],  // amber-100
    }

    const TEMPLATE_BG = [C.t0, C.t1, C.t2, C.t3]

    function templateBg(position: number): [number,number,number] {
        return TEMPLATE_BG[position % 4]
    }

    // ── Bandeau en-tête ──────────────────────────────────────────────────────

    function drawHeader() {
        doc.setFillColor(...C.primaryDk)
        doc.rect(0, 0, pageW, 14, 'F')
        doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...C.white)
        doc.text('TimeFlow — Planning de Rotation', MARGIN, 9.5)
        if (tenantName) {
            doc.setFont('helvetica', 'normal').setFontSize(8)
            doc.text(tenantName, pageW - MARGIN, 9.5, { align: 'right' })
        }
        doc.setTextColor(...C.muted).setFontSize(7).setFont('helvetica', 'normal')
        const rgInfo = rg
            ? `${rg.name}  ·  Cycle : ${rg.cycle_length} ${rg.cycle_unit === 'day' ? 'jour(s)' : 'sem.'}  ·  Direction : ${rg.direction === 'forward' ? 'Avant' : 'Arrière'}`
            : 'Rotation'
        const periodStr = buildPeriodLabel(periodFrom, periodTo)
        doc.text(
            `${rgInfo}   ·   Période : ${periodStr}   ·   ${members.length} membre(s)   ·   Généré le ${new Date().toLocaleString('fr-FR')} par ${generatedBy}`,
            MARGIN, 19,
        )
    }

    function drawAllFooters() {
        const total = (doc as any).internal.getNumberOfPages()
        for (let i = 1; i <= total; i++) {
            doc.setPage(i)
            doc.setDrawColor(...C.line).setLineWidth(0.3)
            doc.line(MARGIN, pageH - 7, pageW - MARGIN, pageH - 7)
            doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...C.muted)
            doc.text(`TimeFlow   ·   Page ${i} / ${total}`, pageW / 2, pageH - 3.5, { align: 'center' })
        }
    }

    // ── Page 1 : Grille membres × jours ──────────────────────────────────────

    drawHeader()

    if (!rg || members.length === 0) {
        doc.setFont('helvetica', 'italic').setFontSize(9).setTextColor(...C.muted)
        doc.text('Aucune donnée à afficher.', MARGIN, 30)
    } else {
        // Colonnes fixes : Matricule | Nom
        // Colonnes jours : une par jour (template + horaires)
        const fixedW    = 18 + 42  // code + nom
        const dayW      = Math.max(20, Math.min(32, Math.floor((CONTENT - fixedW) / Math.max(days.length, 1))))
        const leftover  = CONTENT - fixedW - dayW * days.length
        const nameW     = 42 + leftover

        const head: string[] = ['Matricule', 'Nom', ...days.map((d) => d.label)]
        const body = members.map((m) => {
            const row: (string | { content: string; styles: object })[] = [
                m.code || '—',
                m.name,
            ]
            for (const d of days) {
                const cell = resolveRotationDayCell(rg, m.assignment, d)
                if (!cell.hasWork) {
                    row.push({ content: '—', styles: { textColor: C.line, halign: 'center' } })
                } else {
                    row.push({
                        content: `${cell.templateName}\n${cell.work}${cell.pause ? `\n↔ ${cell.pause}` : ''}`,
                        styles: {
                            fillColor: templateBg(cell.position),
                            textColor: C.dark,
                            halign:    'center',
                            fontSize:  6,
                        },
                    })
                }
            }
            return row
        })

        const colStyles: Record<number, object> = {
            0: { cellWidth: 18,    halign: 'center' },
            1: { cellWidth: nameW, overflow: 'ellipsize' },
        }
        for (let i = 0; i < days.length; i++) {
            colStyles[2 + i] = { cellWidth: dayW, halign: 'center' }
        }

        autoTable(doc, {
            startY:  22,
            margin:  { left: MARGIN, right: MARGIN },
            head:    [head],
            body,
            theme:   'grid',
            styles: {
                fontSize:    7,
                cellPadding: 1.5,
                font:        'helvetica',
                textColor:   C.dark,
                lineColor:   C.line,
                lineWidth:   0.2,
                minCellHeight: 10,
            },
            headStyles: {
                fillColor: C.primary,
                textColor: C.white,
                fontStyle: 'bold',
                fontSize:  6.5,
            },
            alternateRowStyles: { fillColor: C.rowAlt },
            columnStyles: colStyles,
            rowPageBreak: 'avoid',
            didDrawPage: () => { drawHeader() },
        })
    }

    // ── Page 2 : Assignations (audit) ────────────────────────────────────────

    doc.addPage()
    drawHeader()

    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...C.primary)
    doc.text('Historique des assignations', MARGIN, 24)

    autoTable(doc, {
        startY: 27,
        margin: { left: MARGIN, right: MARGIN },
        head:   [['Cible', 'Type', 'Rotation Group', 'Offset', 'Assignée par', 'Date d\'assignation', 'Statut']],
        body:   assignments.map((a) => [
            getRotationTargetName(a),
            a.family === 'group' ? 'Groupe' : 'Employé',
            a.rotation_group.name,
            String(a.offset),
            a.assigned_by.name,
            formatDatetimeFR(a.assigned_at),
            a.active ? 'Active' : 'Inactive',
        ]),
        theme:  'grid',
        styles: { fontSize: 7.5, cellPadding: 2, font: 'helvetica', textColor: C.dark, lineColor: C.line, lineWidth: 0.2 },
        headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: C.rowAlt },
        columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 40 },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 35 },
            5: { cellWidth: 35 },
            6: { cellWidth: 20, halign: 'center' },
        },
        didDrawPage: () => { drawHeader() },
    })

    // ── Page 3 : Récapitulatif ────────────────────────────────────────────────

    if (rg) {
        doc.addPage()
        drawHeader()

        const kpis = computeRotationKPIs(buildMemberRows(assignments), days, rg)

        doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...C.primary)
        doc.text('Récapitulatif de la période', MARGIN, 24)

        // Tableau KPIs
        autoTable(doc, {
            startY: 27,
            margin: { left: MARGIN, right: MARGIN },
            head:   [['Indicateur', 'Valeur']],
            body:   [
                ['Jours travaillés (au moins 1 shift)', String(kpis.workedDays)],
                ['Jours off (aucun shift)',              String(kpis.offDays)],
                ['Total jours analysés',                String(days.length)],
                ['Heures totales estimées (nettes)',    formatHours(kpis.estimatedTotalH)],
                ['Moyenne par jour travaillé',          formatHours(kpis.avgHPerDay)],
                ['Membres concernés',                   String(kpis.memberCount)],
            ],
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica', textColor: C.dark, lineColor: C.line, lineWidth: 0.2 },
            headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7.5 },
            columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40, halign: 'center' } },
        })

        // Tableau répartition templates
        const lastY = (doc as any).lastAutoTable.finalY + 8
        doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...C.primary)
        doc.text('Répartition par template', MARGIN, lastY)

        const distrib = Object.entries(kpis.templateDistrib)
        if (distrib.length > 0) {
            autoTable(doc, {
                startY: lastY + 3,
                margin: { left: MARGIN, right: MARGIN },
                head:   [['Template', 'Jours', '% de la période']],
                body:   distrib.map(([name, count]) => [
                    name, String(count), `${Math.round((count / (days.length || 1)) * 100)} %`,
                ]),
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica', textColor: C.dark, lineColor: C.line, lineWidth: 0.2 },
                headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7.5 },
                columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 30, halign: 'center' } },
            })
        }
    }

    // ── Pieds de page + ouverture ─────────────────────────────────────────────

    drawAllFooters()
    const blobUrl = doc.output('bloburl')
    window.open(blobUrl as unknown as string, '_blank')
}