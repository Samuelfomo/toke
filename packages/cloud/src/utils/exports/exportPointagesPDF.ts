import jsPDF from 'jspdf'
import autoTable, { type CellDef, type RowInput } from 'jspdf-autotable'

import { buildPeriodLabel, formatDateFR, formatDatetimeFR } from './export.helpers'

// ── Palette (identique aux autres exports) ────────────────────────────────────

const C = {
    primary:   [0,   74,  173] as [number, number, number],   // #004aad
    primaryDk: [0,   52,  120] as [number, number, number],   // bandeau foncé
    white:     [255, 255, 255] as [number, number, number],
    muted:     [107, 114, 128] as [number, number, number],   // #6b7280
    line:      [229, 231, 235] as [number, number, number],   // #e5e7eb
    rowAlt:    [249, 250, 251] as [number, number, number],
    dark:      [30,  30,  50]  as [number, number, number],
    // Natures de pointage
    stdBg:     [219, 234, 254] as [number, number, number],   // blue-100
    stdText:   [30,  64,  175] as [number, number, number],   // blue-800
    libreBg:   [237, 233, 254] as [number, number, number],   // violet-100
    libreText: [91,  33,  182] as [number, number, number],   // violet-800
    fallBg:    [254, 243, 199] as [number, number, number],   // amber-100
    fallText:  [146, 64,  14]  as [number, number, number],   // amber-800
    // Stats cards
    greenBg:   [209, 250, 229] as [number, number, number],   // emerald-100
    greenText: [6,   95,  70]  as [number, number, number],
    grayBg:    [241, 245, 249] as [number, number, number],   // slate-100
}

// ── Constantes de mise en page ────────────────────────────────────────────────

const MARGIN      = 10
const HEADER_ZONE = 24   // mm réservé en haut
const FOOTER_ZONE = 12   // mm réservé en bas
const GAP_SECTION = 8    // mm entre sections

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PointageEntryExport {
    guid               : string
    pointage_type      : string
    pointage_status    : string
    clocked_at         : string
    is_fallback_checkin: boolean
    image_url          : string | null
    coordinates        : string | null
    created_offline    : boolean
    user               : { guid: string; name: string } | null
    site               : { guid: string; name: string } | null
    device             : { guid: string; name: string } | null
}

export interface PointagesExportOptions {
    entries        : PointageEntryExport[]
    periodFrom     : string   // YYYY-MM-DD
    periodTo       : string   // YYYY-MM-DD
    generatedBy    : string   // nom du manager
    tenantName?    : string   // nom de l'organisation
    reportRef      : string   // ATT-YYYYMMDD-XXXXXX
    // Filtres actifs (pour affichage dans le bandeau)
    activeFilters? : string   // ex: "Nature : Standard · Avec photo"
}

// ── Helpers métier ────────────────────────────────────────────────────────────

function getEntryNature(e: PointageEntryExport): 'standard' | 'libre' | 'fallback' {
    if (e.is_fallback_checkin) return 'fallback'
    if (e.site?.guid)          return 'standard'
    return 'libre'
}

function getNatureLabel(e: PointageEntryExport): string {
    const n = getEntryNature(e)
    if (n === 'standard') return 'Standard'
    if (n === 'fallback') return 'Partagé'
    return 'Libre'
}

function getTypeLabel(type: string): string {
    const map: Record<string, string> = {
        clock_in            : 'Entrée',
        clock_out           : 'Sortie',
        pause_start         : 'Début pause',
        pause_end           : 'Fin pause',
        external_mission    : 'Mission ext.',
        external_mission_end: 'Fin mission',
        waypoint            : 'Point de passage',
    }
    return map[type] ?? type
}

function getSourceLabel(e: PointageEntryExport): string {
    if (e.is_fallback_checkin) return 'Terminal partagé'
    if (e.created_offline)     return 'Mobile (hors ligne)'
    return 'Mobile'
}

function formatTime(iso: string): string {
    return iso.substring(11, 16)
}

function generateReportRef(): string {
    const now    = new Date()
    const date   = now.toISOString().slice(0, 10).replace(/-/g, '')
    const suffix = String(Math.floor(Math.random() * 999999)).padStart(6, '0')
    return `ATT-${date}-${suffix}`
}

// ── Calcul des statistiques ───────────────────────────────────────────────────

interface ReportStats {
    total    : number
    standard : number
    libre    : number
    fallback : number
    employes : number
    first    : string | null
    last     : string | null
}

function computeStats(entries: PointageEntryExport[]): ReportStats {
    const sorted   = [...entries].sort((a, b) => a.clocked_at.localeCompare(b.clocked_at))
    const standard = entries.filter(e => getEntryNature(e) === 'standard').length
    const libre    = entries.filter(e => getEntryNature(e) === 'libre').length
    const fallback = entries.filter(e => getEntryNature(e) === 'fallback').length
    const employes = new Set(entries.map(e => e.user?.guid).filter(Boolean)).size
    return {
        total: entries.length, standard, libre, fallback, employes,
        first: sorted[0]?.clocked_at ?? null,
        last : sorted[sorted.length - 1]?.clocked_at ?? null,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ── EXPORT PRINCIPAL ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export function exportPointagesPDF(options: PointagesExportOptions): void {
    const {
        entries, periodFrom, periodTo,
        generatedBy, tenantName,
        activeFilters,
    } = options

    // Référence unique (générée ici si non fournie)
    const reportRef = options.reportRef || generateReportRef()

    const stats = computeStats(entries)

    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()    // 297 mm
    const pageH = doc.internal.pageSize.getHeight()   // 210 mm
    const CONTENT = pageW - MARGIN * 2

    const generatedAt = new Date().toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })

    // ── Bandeau en-tête (répété sur chaque nouvelle page) ─────────────────────

    function drawPageHeader() {
        // Bandeau principal foncé
        doc.setFillColor(...C.primaryDk)
        doc.rect(0, 0, pageW, 14, 'F')

        // Titre gauche
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(...C.white)
        doc.text('Toke Attendance — Rapport de pointages', MARGIN, 9.5)

        // Organisation + référence droite
        if (tenantName) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.text(tenantName, pageW - MARGIN, 9.5, { align: 'right' })
        }

        // Sous-titre : période · employés · référence · généré par
        doc.setTextColor(...C.muted)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        const periodStr = buildPeriodLabel(periodFrom, periodTo)
        const parts = [
            `Période : ${periodStr}`,
            `${stats.total} pointage(s)`,
            `${stats.employes} employé(s)`,
            `Réf : ${reportRef}`,
            `Généré le ${generatedAt} par ${generatedBy}`,
        ]
        doc.text(parts.join('   ·   '), MARGIN, 20)

        // Filtres actifs (si présents)
        if (activeFilters && activeFilters !== 'Aucun filtre supplémentaire') {
            doc.setFontSize(6.5)
            doc.setTextColor(150, 150, 180)
            doc.text(`Filtres : ${activeFilters}`, MARGIN, 23.5)
        }
    }

    // ── Pied de page (injecté en post-processing sur toutes les pages) ────────

    function drawAllFooters() {
        const total = (doc as any).internal.getNumberOfPages()
        for (let i = 1; i <= total; i++) {
            doc.setPage(i)
            doc.setDrawColor(...C.line)
            doc.setLineWidth(0.3)
            doc.line(MARGIN, pageH - 7, pageW - MARGIN, pageH - 7)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(6.5)
            doc.setTextColor(...C.muted)
            doc.text(
                `Toke Attendance   ·   ${reportRef}   ·   Confidentiel — Usage interne   ·   Page ${i} / ${total}`,
                pageW / 2, pageH - 3.5, { align: 'center' },
            )
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── PAGE 1 : EN-TÊTE + SYNTHÈSE ──────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    drawPageHeader()
    let curY = HEADER_ZONE + 2

    // ── Bloc synthèse ─────────────────────────────────────────────────────────
    const periodStr = buildPeriodLabel(periodFrom, periodTo)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...C.dark)
    doc.text(`SYNTHÈSE DE LA PÉRIODE DU ${periodStr}`, MARGIN, curY + 5)
    curY += 14

    // 7 cartes de stats disposées en ligne
    const cardW   = (CONTENT - 7 * 3) / 7   // 7 cartes, 3mm de gap
    const cardH   = 18
    const cardY   = curY

    const cards: { label: string; value: string; sub?: string; bg: [number,number,number]; textColor: [number,number,number] }[] = [
        { label: 'Total pointages',    value: String(stats.total),     sub: 'période complète',  bg: C.grayBg,  textColor: C.dark },
        { label: 'Standard',           value: String(stats.standard),  sub: 'site connu',        bg: C.stdBg,   textColor: C.stdText },
        { label: 'Libre',              value: String(stats.libre),     sub: 'hors site configuré',      bg: C.libreBg, textColor: C.libreText },
        { label: 'Terminal partagé',   value: String(stats.fallback),  sub: 'appareil partagé',  bg: C.fallBg,  textColor: C.fallText },
        { label: 'Employés uniques',   value: String(stats.employes),  sub: 'ayant pointé',      bg: C.grayBg,  textColor: C.dark },
        { label: 'Premier pointage',   value: stats.first ? formatTime(stats.first)  : '—', sub: stats.first ? formatDateFR(stats.first)  : '—', bg: C.grayBg, textColor: C.dark },
        { label: 'Dernier pointage',   value: stats.last  ? formatTime(stats.last)   : '—', sub: stats.last  ? formatDateFR(stats.last)   : '—', bg: C.grayBg, textColor: C.dark },
    ]

    cards.forEach((card, i) => {
        const x = MARGIN + i * (cardW + 3)

        // Fond carte
        doc.setFillColor(...card.bg)
        doc.roundedRect(x, cardY, cardW, cardH, 1.5, 1.5, 'F')

        // Bordure légère
        doc.setDrawColor(...C.line)
        doc.setLineWidth(0.25)
        doc.roundedRect(x, cardY, cardW, cardH, 1.5, 1.5, 'S')

        // Label
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(5.5)
        doc.setTextColor(...C.muted)
        doc.text(card.label.toUpperCase(), x + cardW / 2, cardY + 4.5, { align: 'center', maxWidth: cardW - 2 })

        // Valeur principale
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(card.value.length > 5 ? 9 : 13)
        doc.setTextColor(...card.textColor)
        doc.text(card.value, x + cardW / 2, cardY + 11, { align: 'center' })

        // Sous-label
        if (card.sub) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(5)
            doc.setTextColor(...C.muted)
            doc.text(card.sub, x + cardW / 2, cardY + 15.5, { align: 'center', maxWidth: cardW - 2 })
        }
    })

    curY = cardY + cardH + GAP_SECTION


    const groupedEntries = new Map<string, {
        employeeGuid: string
        employeeName: string
        entries: PointageEntryExport[]
    }>()

    for (const entry of entries) {
        const employeeGuid = entry.user?.guid ?? 'unknown'
        const employeeName = entry.user?.name ?? 'Employé inconnu'

        const existing = groupedEntries.get(employeeGuid)

        if (existing) {
            existing.entries.push(entry)
        } else {
            groupedEntries.set(employeeGuid, {
                employeeGuid,
                employeeName,
                entries: [entry],
            })
        }
    }

    const employeeGroups = [...groupedEntries.values()]
        .sort((a, b) =>
            a.employeeName.localeCompare(b.employeeName, 'fr', {
                sensitivity: 'base',
            })
        )

    // ─────────────────────────────────────────────────────────────────────────
    // ── TABLEAU PRINCIPAL DES POINTAGES ──────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...C.dark)
    // doc.text(`DÉTAIL DES POINTAGES  (${entries.length})`, MARGIN, curY + 5)
    doc.text(`DÉTAIL DES POINTAGES PAR EMPLOYÉ (${employeeGroups.length})`, MARGIN, curY + 5 )
    curY += 8

    if (entries.length === 0) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(...C.muted)
        doc.text('Aucun pointage ne correspond aux critères sélectionnés.', pageW - MARGIN, curY + 6)
    } else {
        // // Tri chronologique pour le PDF
        // const sorted = [...entries].sort(
        //     (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime()
        // )
        //
        // // Corps du tableau
        // const body: RowInput[] = sorted.map(entry => {
        //     const nature = getEntryNature(entry)
        //     const natureBg   = nature === 'standard' ? C.stdBg   : nature === 'fallback' ? C.fallBg   : C.libreBg
        //     const natureText = nature === 'standard' ? C.stdText : nature === 'fallback' ? C.fallText : C.libreText
        //     const row: CellDef[] = [
        //         { content: formatDateFR(entry.clocked_at) },
        //         { content: formatTime(entry.clocked_at) },
        //         { content: entry.user?.name ?? '\u2014' },
        //         { content: getNatureLabel(entry), styles: { fillColor: natureBg, textColor: natureText, fontStyle: 'bold', halign: 'center', fontSize: 6.5 } },
        //         { content: getTypeLabel(entry.pointage_type) },
        //         { content: entry.site?.name ?? (entry.coordinates ? 'GPS' : '\u2014') },
        //         { content: getSourceLabel(entry) },
        //     ]
        //     return row
        // })
        //
        // // Largeurs des colonnes (total = CONTENT ≈ 277mm en landscape A4)
        // const colStyles: Record<number, object> = {
        //     0: { cellWidth: 24, halign: 'center' },   // Date
        //     1: { cellWidth: 16, halign: 'center' },   // Heure
        //     2: { cellWidth: 55, overflow: 'ellipsize' }, // Employé
        //     3: { cellWidth: 26, halign: 'center' },   // Nature
        //     4: { cellWidth: 28 },                      // Type
        //     5: { cellWidth: 55, overflow: 'ellipsize' }, // Site
        //     6: { cellWidth: 42 },                      // Source
        // }
        //
        // autoTable(doc, {
        //     startY : curY,
        //     margin : { top: HEADER_ZONE, left: MARGIN, right: MARGIN, bottom: FOOTER_ZONE },
        //     head   : [['Date', 'Heure', 'Employé', 'Nature', 'Type', 'Site / Lieu', 'Source']],
        //     body,
        //     theme  : 'grid',
        //     styles : {
        //         fontSize   : 7.5,
        //         cellPadding: 2.2,
        //         overflow   : 'ellipsize',
        //         font       : 'helvetica',
        //         textColor  : C.dark,
        //         lineColor  : C.line,
        //         lineWidth  : 0.2,
        //     },
        //     headStyles: {
        //         fillColor: C.primary,
        //         textColor: C.white,
        //         fontStyle: 'bold',
        //         fontSize : 7,
        //     },
        //     alternateRowStyles: { fillColor: C.rowAlt },
        //     columnStyles: colStyles,
        //     rowPageBreak: 'avoid',
        //     // ── Répéter le bandeau si autoTable crée de nouvelles pages ──────
        //     didDrawPage: (data: any) => {
        //         drawPageHeader()
        //         // S'assurer que le contenu commence sous le bandeau sur les pages suivantes
        //         if (data.pageNumber > 1) {
        //             data.settings.startY = HEADER_ZONE
        //         }
        //     },
        // })
        //
        // curY = (doc as any).lastAutoTable.finalY

        for (const group of employeeGroups) {
            const employeeEntries = [...group.entries].sort(
                (a, b) =>
                    new Date(a.clocked_at).getTime()
                    - new Date(b.clocked_at).getTime()
            )

            const standardCount = employeeEntries.filter(
                entry => getEntryNature(entry) === 'standard'
            ).length

            const libreCount = employeeEntries.filter(
                entry => getEntryNature(entry) === 'libre'
            ).length

            const fallbackCount = employeeEntries.filter(
                entry => getEntryNature(entry) === 'fallback'
            ).length

            const firstEntry = employeeEntries[0]
            const lastEntry = employeeEntries[employeeEntries.length - 1]

            // Nouvelle page si l’espace restant est insuffisant
            if (curY > pageH - FOOTER_ZONE - 45) {
                doc.addPage()
                drawPageHeader()
                curY = HEADER_ZONE + 2
            }

            // Titre employé
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            doc.setTextColor(...C.primary)

            doc.text(
                group.employeeName.toUpperCase(),
                MARGIN,
                curY + 5,
            )

            curY += 8

            // Résumé de la section
            const employeeSummary = [
                `${employeeEntries.length} pointage(s)`,
                `${standardCount} standard`,
                `${libreCount} libre(s)`,
                `${fallbackCount} partagé(s)`,
                firstEntry
                    ? `Premier : ${formatDateFR(firstEntry.clocked_at)} ${formatTime(firstEntry.clocked_at)}`
                    : null,
                lastEntry
                    ? `Dernier : ${formatDateFR(lastEntry.clocked_at)} ${formatTime(lastEntry.clocked_at)}`
                    : null,
            ]
                .filter(Boolean)
                .join('  ·  ')

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(6.5)
            doc.setTextColor(...C.muted)

            doc.text(
                employeeSummary,
                MARGIN,
                curY + 3,
                {
                    maxWidth: CONTENT,
                }
            )

            curY += 7

            const employeeBody: RowInput[] = employeeEntries.map(entry => {
                const nature = getEntryNature(entry)

                const natureBg =
                    nature === 'standard'
                        ? C.stdBg
                        : nature === 'fallback'
                            ? C.fallBg
                            : C.libreBg

                const natureText =
                    nature === 'standard'
                        ? C.stdText
                        : nature === 'fallback'
                            ? C.fallText
                            : C.libreText

                return [
                    {
                        content: formatDateFR(entry.clocked_at),
                        styles: { halign: 'center' },
                    },
                    {
                        content: formatTime(entry.clocked_at),
                        styles: { halign: 'center' },
                    },
                    {
                        content: getNatureLabel(entry),
                        styles: {
                            fillColor: natureBg,
                            textColor: natureText,
                            fontStyle: 'bold',
                            halign: 'center',
                            fontSize: 6.5,
                        },
                    },
                    {
                        content: getTypeLabel(entry.pointage_type),
                    },
                    {
                        content:
                            entry.site?.name
                            ?? (entry.coordinates ? 'GPS' : '—'),
                    },
                    {
                        content: getSourceLabel(entry),
                    },
                ]
            })

            autoTable(doc, {
                startY: curY,

                margin: {
                    top: HEADER_ZONE,
                    left: MARGIN,
                    right: MARGIN,
                    bottom: FOOTER_ZONE,
                },

                head: [[
                    'Date',
                    'Heure',
                    'Nature',
                    'Type',
                    'Site / Lieu',
                    'Source',
                ]],

                body: employeeBody,

                theme: 'grid',

                styles: {
                    fontSize: 7.5,
                    cellPadding: 2.2,
                    overflow: 'ellipsize',
                    font: 'helvetica',
                    textColor: C.dark,
                    lineColor: C.line,
                    lineWidth: 0.2,
                },

                headStyles: {
                    fillColor: C.primary,
                    textColor: C.white,
                    fontStyle: 'bold',
                    fontSize: 7,
                },

                alternateRowStyles: {
                    fillColor: C.rowAlt,
                },

                columnStyles: {
                    0: {
                        cellWidth: 28,
                        halign: 'center',
                    },
                    1: {
                        cellWidth: 18,
                        halign: 'center',
                    },
                    2: {
                        cellWidth: 30,
                        halign: 'center',
                    },
                    3: {
                        cellWidth: 32,
                    },
                    4: {
                        cellWidth: 95,
                        overflow: 'ellipsize',
                    },
                    5: {
                        cellWidth: 74,
                    },
                },

                rowPageBreak: 'avoid',

                didDrawPage: () => {
                    drawPageHeader()
                },
            })

            curY = (doc as any).lastAutoTable.finalY + GAP_SECTION
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── PAGE RÉCAPITULATIF PAR EMPLOYÉ ───────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    if (stats.employes > 0) {
        doc.addPage()
        drawPageHeader()
        curY = HEADER_ZONE + 2

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10.5)
        doc.setTextColor(...C.dark)
        doc.text('RÉCAPITULATIF PAR EMPLOYÉ', MARGIN, curY + 5)
        curY += 9

        // Grouper par employé
        const byEmployee = new Map<string, {
            name    : string
            total   : number
            standard: number
            libre   : number
            fallback: number
            first   : string
            last    : string
        }>()

        for (const e of entries) {
            const guid = e.user?.guid ?? 'inconnu'
            const name = e.user?.name ?? 'Inconnu'
            if (!byEmployee.has(guid)) {
                byEmployee.set(guid, { name, total: 0, standard: 0, libre: 0, fallback: 0, first: e.clocked_at, last: e.clocked_at })
            }
            const emp = byEmployee.get(guid)!
            emp.total++
            const n = getEntryNature(e)
            if (n === 'standard') emp.standard++
            if (n === 'libre')    emp.libre++
            if (n === 'fallback') emp.fallback++
            if (e.clocked_at < emp.first) emp.first = e.clocked_at
            if (e.clocked_at > emp.last)  emp.last  = e.clocked_at
        }

        const recapBody: RowInput[] = Array.from(byEmployee.values())
            .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
            .map(emp => {
                const row: CellDef[] = [
                    { content: emp.name },
                    { content: String(emp.total),    styles: { halign: 'center', fontStyle: 'bold' } },
                    { content: String(emp.standard),  styles: { halign: 'center', fillColor: C.stdBg,   textColor: C.stdText } },
                    { content: String(emp.libre),     styles: { halign: 'center', fillColor: C.libreBg, textColor: C.libreText } },
                    { content: String(emp.fallback),  styles: { halign: 'center', fillColor: C.fallBg,  textColor: C.fallText } },
                    { content: formatDatetimeFR(emp.first) },
                    { content: formatDatetimeFR(emp.last)  },
                ]
                return row
            })

        autoTable(doc, {
            startY: curY,
            margin: { top: HEADER_ZONE, left: MARGIN, right: MARGIN, bottom: FOOTER_ZONE },
            head  : [['Employé', 'Total', 'Standard', 'Libre', 'Partagé', 'Premier pointage', 'Dernier pointage']],
            body  : recapBody,
            theme : 'grid',
            styles: {
                fontSize   : 8,
                cellPadding: 2.5,
                font       : 'helvetica',
                textColor  : C.dark,
                lineColor  : C.line,
                lineWidth  : 0.2,
            },
            headStyles: {
                fillColor: C.primary,
                textColor: C.white,
                fontStyle: 'bold',
                fontSize : 7.5,
            },
            alternateRowStyles: { fillColor: C.rowAlt },
            columnStyles: {
                0: { cellWidth: 60, overflow: 'ellipsize' },
                1: { cellWidth: 25, halign: 'center' },
                2: { cellWidth: 30, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 30, halign: 'center' },
                5: { cellWidth: 30, halign: 'center' },
                6: { cellWidth: 50 },
                7: { cellWidth: 50 },
            },
            didDrawPage: (data: any) => {
                drawPageHeader()
                if (data.pageNumber > 1) {
                    data.settings.startY = HEADER_ZONE
                }
            },
        })
    }

    // ── Pieds de page + ouverture dans un nouvel onglet ───────────────────────

    drawAllFooters()

    const blobUrl = doc.output('bloburl')
    window.open(blobUrl as unknown as string, '_blank')
}