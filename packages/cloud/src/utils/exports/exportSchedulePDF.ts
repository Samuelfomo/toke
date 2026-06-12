import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import {computeDayBlocks, getMemberBlockStatus, ScheduleExportOptions} from "./scheduleAssignment.export";
import {buildPeriodDays, buildPeriodLabel, JS_DAY_TO_KEY} from "./export.helpers";

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
    primary:   [0,   74,  173] as [number,number,number],  // #004aad
    primaryDk: [0,   52,  120] as [number,number,number],  // foncé pour bandeau
    white:     [255, 255, 255] as [number,number,number],
    muted:     [107, 114, 128] as [number,number,number],  // #6b7280
    line:      [229, 231, 235] as [number,number,number],  // #e5e7eb
    headerBg:  [239, 246, 255] as [number,number,number],  // bleu très clair
    rowAlt:    [249, 250, 251] as [number,number,number],
    workBg:    [209, 250, 229] as [number,number,number],  // #d1fae5 vert
    workText:  [6,   95,  70]  as [number,number,number],
    pauseBg:   [254, 243, 199] as [number,number,number],  // #fef3c7 ambre
    pauseText: [146, 64,  14]  as [number,number,number],
    weekendBg: [248, 250, 252] as [number,number,number],
    todayBg:   [239, 246, 255] as [number,number,number],
    todayBd:   [0,   74,  173] as [number,number,number],  // = primary
    dark:      [30,  30,  50]  as [number,number,number],
}

const DAY_FR_LONG: Record<string, string> = {
    Mon: 'Lundi', Tue: 'Mardi', Wed: 'Mercredi',
    Thu: 'Jeudi', Fri: 'Vendredi', Sat: 'Samedi', Sun: 'Dimanche',
}

// ── Estimation hauteur d'un tableau pour N lignes ─────────────────────────────
// autoTable head  ≈ 8mm, chaque row ≈ 6mm
function estimateTableHeight(rowCount: number): number {
    return 8 + rowCount * 6
}

// ── Hauteur de l'en-tête jour (bandeau + marge) ───────────────────────────────
const DAY_HEADER_H = 10   // mm
const GAP_BETWEEN  = 16    // mm espacement minimum entre deux jours
const HEADER_ZONE  = 22   // mm réservé en haut de chaque page (bandeau global)
const FOOTER_ZONE  = 20   // mm réservé en bas
const RECAP_MIN_H  = 20   // mm : si moins de place, nouvelle page pour le récap

// ─────────────────────────────────────────────────────────────────────────────
// ── EXPORT PDF ────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export function exportSchedulePDF(options: ScheduleExportOptions): void {
    const { members, periodFrom, periodTo, generatedBy, tenantName } = options

    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()    // 297 mm
    const pageH = doc.internal.pageSize.getHeight()   // 210 mm
    const MARGIN  = 10
    const CONTENT = pageW - MARGIN * 2

    const todayIso    = new Date().toISOString().split('T')[0]
    const usableH     = pageH - HEADER_ZONE - FOOTER_ZONE  // hauteur utile par page

    // ── Dessin bandeau global (répété à chaque nouvelle page) ─────────────────

    function drawPageHeader() {
        // Bandeau principal
        doc.setFillColor(...C.primaryDk)
        doc.rect(0, 0, pageW, 14, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(...C.white)
        doc.text('TimeFlow — Planning Standard', MARGIN, 9.5)

        if (tenantName) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.text(tenantName, pageW - MARGIN, 9.5, { align: 'right' })
        }

        // Sous-titre
        doc.setTextColor(...C.muted)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        const periodStr = buildPeriodLabel(periodFrom, periodTo)
        doc.text(
            `PROGRAMME DU : ${periodStr}   ·   ${members.length} employé(s)   ·   Généré le ${new Date().toLocaleString('fr-FR')} par ${generatedBy}`,
            MARGIN, 19,
        )
    }

    // ── En-tête d'un jour ─────────────────────────────────────────────────────

    function drawDayHeader(y: number, dayLabel: string, blockCount: number, isToday: boolean, isWeekend: boolean): void {
        const bg: [number,number,number] = isToday ? C.todayBg : isWeekend ? C.weekendBg : [255,255,255]
        doc.setFillColor(...bg)
        doc.roundedRect(MARGIN, y, CONTENT, DAY_HEADER_H - 2, 1.2, 1.2, 'F')

        if (isToday) {
            doc.setDrawColor(...C.primary)
            doc.setLineWidth(0.5)
            doc.roundedRect(MARGIN, y, CONTENT, DAY_HEADER_H - 2, 1.2, 1.2, 'S')
        } else {
            doc.setDrawColor(...C.line)
            doc.setLineWidth(0.3)
            doc.roundedRect(MARGIN, y, CONTENT, DAY_HEADER_H - 2, 1.2, 1.2, 'S')
        }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(...(isToday ? C.primary : C.dark))
        doc.text(dayLabel, MARGIN + 3, y + 5.4)

        if (isToday) {
            const tw = doc.getTextWidth(dayLabel)
            doc.setFillColor(...C.primary)
            doc.roundedRect(MARGIN + 3 + tw + 3, y + 2.5, 18, 4, 1, 1, 'F')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(6.5)
            doc.setTextColor(...C.white)
            doc.text("Aujourd'hui", MARGIN + 3 + tw + 3 + 9, y + 5.4, { align: 'center' })
        }

        if (blockCount > 0) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(...C.muted)
            doc.text(
                `${blockCount} bloc(s) · ${members.length} employé(s)`,
                pageW - MARGIN - 3, y + 5.4, { align: 'right' },
            )
        }
    }

    // ── Pied de page (injecté à la fin sur toutes les pages) ─────────────────

    function drawAllFooters() {
        const total = (doc as any).internal.getNumberOfPages()
        for (let i = 1; i <= total; i++) {
            doc.setPage(i)
            doc.setDrawColor(...C.line)
            doc.setLineWidth(0.3)
            doc.line(MARGIN, pageH - 7, pageW - MARGIN, pageH - 7)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(...C.muted)
            doc.text(`TimeFlow   ·   Page ${i} / ${total}`, pageW / 2, pageH - 3.5, { align: 'center' })
        }
    }

    // ── Colonnes tableau ──────────────────────────────────────────────────────

    function buildColumnStyles(blockCount: number): Record<number, object> {
        const fixedW   = 42 + 18 + 28
        const blockW   = Math.max(14, Math.min(22, Math.floor((CONTENT - fixedW) / Math.max(blockCount, 1))))
        const leftover = CONTENT - fixedW - blockW * blockCount
        const colStyles: Record<number, object> = {
            0: { cellWidth: 42 + leftover, overflow: 'ellipsize' },
            1: { cellWidth: 18, halign: 'center' },
            2: { cellWidth: 28, overflow: 'ellipsize' },
        }
        for (let i = 0; i < blockCount; i++) {
            colStyles[3 + i] = { cellWidth: blockW, halign: 'center' }
        }
        return colStyles
    }

    // ── Corps d'un tableau ────────────────────────────────────────────────────

    function buildTableBody(dayKey: string, blocks: { start: string; end: string; label: string }[]) {
        return members.map(m => {
            const row: (string | { content: string; styles: object })[] = [
                m.name,
                m.code || '—',
                m.groupName ?? 'Sans groupe',
            ]
            for (const b of blocks) {
                const status = getMemberBlockStatus(m, dayKey, b)
                if (status === 'work') {
                    row.push({ content: 'WORK', styles: { fillColor: C.workBg,  textColor: C.workText,  fontStyle: 'bold', halign: 'center' } })
                    // row.push({ content: '●', styles: { fillColor: C.workBg,  textColor: C.workText,  fontStyle: 'bold', halign: 'center' } })
                } else if (status === 'pause') {
                    row.push({ content: 'P', styles: { fillColor: C.pauseBg, textColor: C.pauseText, fontStyle: 'bold', halign: 'center' } })
                } else {
                    row.push({ content: '—', styles: { textColor: C.line, halign: 'center' } })
                }
            }
            return row
        })
    }

    // ── Boucle principale : jours en flux continu ─────────────────────────────

    drawPageHeader()
    let curY = HEADER_ZONE   // curseur Y courant sur la page

    const cursor  = new Date(periodFrom + 'T00:00:00')
    const endDate = new Date(periodTo   + 'T00:00:00')
    let   isFirst = true

    while (cursor <= endDate) {
        const iso    = cursor.toISOString().split('T')[0]
        const jsDay  = cursor.getDay()
        const dayKey = JS_DAY_TO_KEY[jsDay]
        const blocks = computeDayBlocks(members, dayKey)

        const isWeekend = jsDay === 0 || jsDay === 6
        const isToday   = iso === todayIso

        const dayName  = DAY_FR_LONG[dayKey] ?? dayKey
        const dateStr  = cursor.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const dayLabel = `${dayName} ${dateStr}`

        // Hauteur totale nécessaire pour ce jour
        const tableH = blocks.length === 0
            ? 8                                           // message "repos"
            : estimateTableHeight(members.length)
        const totalBlockH = (isFirst ? 0 : GAP_BETWEEN) + DAY_HEADER_H + tableH

        // Vérifier si ça rentre sur la page courante
        if (!isFirst && curY + totalBlockH > usableH + HEADER_ZONE - 4) {
            doc.addPage()
            drawPageHeader()
            curY = HEADER_ZONE
        }

        // Espacement entre jours
        if (!isFirst) curY += GAP_BETWEEN
        isFirst = false

        // En-tête du jour
        drawDayHeader(curY, dayLabel, blocks.length, isToday, isWeekend)
        curY += DAY_HEADER_H

        if (blocks.length === 0) {
            doc.setFont('helvetica', 'italic')
            doc.setFontSize(7.5)
            doc.setTextColor(...C.muted)
            doc.text('Aucun bloc horaire planifié — jour de repos.', MARGIN + 3, curY + 4)
            curY += 8
        } else {
            const head        = ['Employé', 'Matricule', 'Groupe', ...blocks.map(b => b.label)]
            const body        = buildTableBody(dayKey, blocks)
            const colStyles   = buildColumnStyles(blocks.length)

            autoTable(doc, {
                startY:  curY,
                margin:  { left: MARGIN, right: MARGIN },
                head:    [head],
                body,
                theme:   'grid',
                styles: {
                    fontSize:    7.5,
                    cellPadding: 2,
                    overflow:    'ellipsize',
                    font:        'helvetica',
                    textColor:   C.dark,
                    lineColor:   C.line,
                    lineWidth:   0.2,
                },
                headStyles: {
                    fillColor: C.primary,
                    textColor: C.white,
                    fontStyle: 'bold',
                    fontSize:  7,
                },
                alternateRowStyles: { fillColor: C.rowAlt },
                columnStyles: colStyles,
                rowPageBreak: 'avoid',
                didDrawPage: (_data: any) => {
                    // Si autoTable crée une nouvelle page, redessiner l'en-tête
                    drawPageHeader()
                    curY = HEADER_ZONE
                },
            })

            curY = (doc as any).lastAutoTable.finalY
        }

        cursor.setDate(cursor.getDate() + 1)
    }

    // ── Page récapitulatif ────────────────────────────────────────────────────

    if (members.length > 0) {
        const days      = buildPeriodDays(periodFrom, periodTo)
        const recapH    = estimateTableHeight(members.length) + 12
        const remaining = (usableH + HEADER_ZONE) - curY

        if (remaining < RECAP_MIN_H + recapH) {
            doc.addPage()
            drawPageHeader()
            curY = HEADER_ZONE
        } else {
            curY += GAP_BETWEEN * 2
        }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...C.primary)
        doc.text('Récapitulatif par employé', MARGIN, curY + 5)
        curY += 9

        const recapBody = members.map(m => {
            let worked = 0; let rest = 0
            for (const d of days) {
                const slots = m.schedule[d.dayKey]
                if (slots && slots.length > 0) worked++; else rest++
            }
            return [m.name, m.code || '—', m.groupName ?? 'Sans groupe', String(worked), String(rest)]
        })

        autoTable(doc, {
            startY: curY,
            margin: { left: MARGIN, right: MARGIN },
            head:   [['Employé', 'Matricule', 'Groupe', 'Jours travaillés', 'Jours de repos']],
            body:   recapBody,
            theme:  'grid',
            styles: {
                fontSize:    8,
                cellPadding: 2.5,
                font:        'helvetica',
                textColor:   C.dark,
                lineColor:   C.line,
                lineWidth:   0.2,
            },
            headStyles: {
                fillColor: C.primary,
                textColor: C.white,
                fontStyle: 'bold',
                fontSize:  8,
            },
            alternateRowStyles: { fillColor: C.rowAlt },
            columnStyles: {
                0: { cellWidth: 55 },
                1: { cellWidth: 28, halign: 'center' },
                2: { cellWidth: 40 },
                3: { cellWidth: 35, halign: 'center' },
                4: { cellWidth: 35, halign: 'center' },
            },
        })
    }

    // ── Pieds de page + ouverture ─────────────────────────────────────────────

    drawAllFooters()

    // Ouvrir dans un nouvel onglet — l'utilisateur choisit télécharger ou imprimer
    const blobUrl = doc.output('bloburl')
    window.open(blobUrl as unknown as string, '_blank')
}