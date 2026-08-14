import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import {
    buildSimplifiedRows,
    collectStartTimes,
    formatCompactTime,
    splitPeriodIntoWeeks,
    type SimplifiedScheduleExportOptions,
} from './scheduleAssignment.simple.export'
import { buildPeriodLabel } from './export.helpers'

const C = {
    primary: [0, 74, 173] as [number, number, number],
    primaryDk: [0, 52, 120] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    dark: [30, 30, 50] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    line: [203, 213, 225] as [number, number, number],
    alt: [248, 250, 252] as [number, number, number],
}

/**
 * Version compacte destinée à l'affichage physique chez le client.
 * - une semaine civile par page ;
 * - seules les heures de début deviennent des colonnes ;
 * - les cellules contiennent des acronymes employés compacts ;
 * - une colonne Repos affiche uniquement les repos explicitement publiés ;
 * - aucune heure de fin, pause, KPI ou récapitulatif.
 */
export function exportScheduleSimplePDF(options: SimplifiedScheduleExportOptions): void {
    const { members, periodFrom, periodTo, generatedBy, tenantName } = options
    const weeks = splitPeriodIntoWeeks(periodFrom, periodTo)

    // Le format manuel du client est naturellement vertical. On bascule en
    // paysage uniquement si une semaine possède beaucoup d'heures de début.
    const maxStartColumns = Math.max(
        0,
        ...weeks.map((week) => collectStartTimes(members, week.dates).length),
    )
    const orientation = maxStartColumns > 4 ? 'landscape' : 'landscape' //'portrait'
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 9

    weeks.forEach((week, weekIndex) => {
        if (weekIndex > 0) doc.addPage()

        const startTimes = collectStartTimes(members, week.dates)
        const { showGroupColumn, rows } = buildSimplifiedRows(members, week.dates, startTimes)

        // En-tête sobre, pensé pour l'impression et l'affichage mural.
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.setTextColor(...C.primaryDk)
        doc.text('PROGRAMME DE TRAVAIL', pageW / 2, 12, { align: 'center' })

        doc.setFontSize(9.5)
        doc.setTextColor(...C.dark)
        doc.text(buildPeriodLabel(week.from, week.to).toUpperCase(), pageW / 2, 18, { align: 'center' })

        if (tenantName) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(...C.muted)
            doc.text(tenantName, pageW / 2, 23, { align: 'center' })
        }

        const head = [[
            'Date',
            ...(showGroupColumn ? ['Groupe'] : []),
            ...startTimes.map(formatCompactTime),
            'Repos',
        ]]

        const body = rows.map((row) => [
            row.dateLabel,
            ...(showGroupColumn ? [row.groupName ?? 'Sans groupe'] : []),
            ...startTimes.map((start) => row.namesByStart[start].join('\n')),
            row.restNames.join('\n'),
        ])

        const restWidth = 25
        const fixedWidth = 34 + (showGroupColumn ? 27 : 0) + restWidth
        const availableForTimes = pageW - margin * 2 - fixedWidth
        const timeWidth = startTimes.length > 0
            ? Math.max(25, availableForTimes / startTimes.length)
            : availableForTimes

        const columnStyles: Record<number, object> = {
            0: { cellWidth: 34, fontStyle: 'bold' },
        }
        let timeStartIndex = 1
        if (showGroupColumn) {
            columnStyles[1] = { cellWidth: 27, fontStyle: 'bold' }
            timeStartIndex = 2
        }
        startTimes.forEach((_, index) => {
            columnStyles[timeStartIndex + index] = { cellWidth: timeWidth }
        })
        columnStyles[timeStartIndex + startTimes.length] = { cellWidth: restWidth, fontStyle: 'bold' }

        autoTable(doc, {
            startY: 29,
            margin: { left: margin, right: margin, bottom: 14 },
            head,
            body,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 8.5,
                cellPadding: 2.1,
                valign: 'middle',
                textColor: C.dark,
                lineColor: C.line,
                lineWidth: 0.25,
                overflow: 'linebreak',
            },
            headStyles: {
                fillColor: C.primary,
                textColor: C.white,
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 8.5,
            },
            alternateRowStyles: { fillColor: C.alt },
            columnStyles,
            rowPageBreak: 'avoid',
            didDrawPage: () => {
                doc.setDrawColor(...C.line)
                doc.setLineWidth(0.2)
                doc.line(margin, pageH - 9, pageW - margin, pageH - 9)
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(6.5)
                doc.setTextColor(...C.muted)
                doc.text(
                    `TimeFlow · Planning simplifié · Généré par ${generatedBy}`,
                    margin,
                    pageH - 5,
                )
            },
        })
    })

    const total = (doc as any).internal.getNumberOfPages()
    for (let page = 1; page <= total; page++) {
        doc.setPage(page)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(...C.muted)
        doc.text(`Page ${page} / ${total}`, pageW - margin, pageH - 5, { align: 'right' })
    }

    const blobUrl = doc.output('bloburl')
    window.open(blobUrl as unknown as string, '_blank')
}
