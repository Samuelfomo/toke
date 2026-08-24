import jsPDF from 'jspdf'

import {
    buildEmployeeCodes,
    buildOptimizedDays,
    DEFAULT_OPTIMIZED_MONTHS_PER_PAGE,
    formatEmployeeLegendName,
    formatMonthTitle,
    monthEndIso,
    monthStartIso,
    optimizedMonthPageLayout,
    splitPeriodIntoMonthPages,
    type OptimizedMonth,
    type OptimizedMonthsPerPage,
    type OptimizedPdfMode,
    type OptimizedScheduleExportOptions,
    type OptimizedShiftKind,
} from './scheduleAssignment.optimized.export'
import { buildPeriodLabel } from './export.helpers'
import { employeeColorRgb, employeeColorText } from '@/utils/employeeColor'

type RGB = [number, number, number]

const C = {
    primary: [15, 76, 129] as RGB,
    dark: [30, 41, 59] as RGB,
    muted: [100, 116, 139] as RGB,
    line: [203, 213, 225] as RGB,
    faint: [248, 250, 252] as RGB,
    out: [241, 245, 249] as RGB,
    white: [255, 255, 255] as RGB,
    morning: [37, 99, 235] as RGB,
    morningBg: [219, 234, 254] as RGB,
    mid: [217, 119, 6] as RGB,
    midBg: [254, 243, 199] as RGB,
    guard: [225, 29, 72] as RGB,
    guardBg: [255, 228, 230] as RGB,
    rest: [100, 116, 139] as RGB,
    restBg: [241, 245, 249] as RGB,
    other: [124, 58, 237] as RGB,
    otherBg: [237, 233, 254] as RGB,
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const

function colorForKind(kind: OptimizedShiftKind): RGB {
    switch (kind) {
        case 'morning': return C.morning
        case 'mid': return C.mid
        case 'guard': return C.guard
        case 'rest': return C.rest
        default: return C.other
    }
}

function backgroundForKind(kind: OptimizedShiftKind): RGB {
    switch (kind) {
        case 'morning': return C.morningBg
        case 'mid': return C.midBg
        case 'guard': return C.guardBg
        case 'rest': return C.restBg
        default: return C.otherBg
    }
}

function drawEmployeeAvatar(
    doc: jsPDF,
    x: number,
    y: number,
    code: string,
    employeeColor: string | null,
    kind: OptimizedShiftKind,
    pdfMode: OptimizedPdfMode,
    diameter = 2.35,
): void {
    const radius = diameter / 2
    const centerX = x + radius
    const centerY = y + radius

    // Deux lectures possibles du même planning :
    // - personnalisé : le rond identifie durablement l'employé via employee_color ;
    // - généralisé  : le rond identifie le service via sa couleur historique.
    const isPersonalized = pdfMode === 'personalized'
    const fillRgb = isPersonalized
        ? (employeeColorRgb(employeeColor) ?? C.rest)
        : backgroundForKind(kind)
    const borderRgb = isPersonalized
        ? (employeeColorRgb(employeeColor) ?? C.rest)
        : colorForKind(kind)
    const textRgb = isPersonalized
        ? (employeeColorRgb(employeeColorText(employeeColor)) ?? C.white)
        : colorForKind(kind)

    doc.setFillColor(...fillRgb)
    doc.setDrawColor(...borderRgb)
    doc.setLineWidth(Math.max(0.10, Math.min(0.16, diameter * 0.08)))
    doc.circle(centerX, centerY, radius, 'FD')

    doc.setFont('helvetica', 'bold')
    let fontSize = Math.max(1.45, Math.min(
        code.length > 2 ? diameter * 1.20 : diameter * 1.48,
        code.length > 2 ? 2.35 : 2.75,
    ))
    doc.setFontSize(fontSize)

    const maxTextWidth = diameter * 0.62
    const measuredWidth = doc.getTextWidth(code)
    if (measuredWidth > maxTextWidth && measuredWidth > 0) {
        fontSize = Math.max(1.30, fontSize * (maxTextWidth / measuredWidth))
        doc.setFontSize(fontSize)
    }

    const textHeight = doc.getTextDimensions(code).h
    doc.setTextColor(...textRgb)
    doc.text(code, centerX, centerY + textHeight * 0.30, { align: 'center' })
}

function isoForDay(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function mondayIndex(date: Date): number {
    return (date.getUTCDay() + 6) % 7
}

function daysInMonth(month: OptimizedMonth): number {
    return new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate()
}

function clampIso(iso: string, min: string, max: string): string {
    if (iso < min) return min
    if (iso > max) return max
    return iso
}

function monthContentScale(monthsPerPage: OptimizedMonthsPerPage): number {
    switch (monthsPerPage) {
        case 1: return 1.55
        case 2: return 1.35
        case 3: return 1.18
        default: return 1
    }
}

function drawMonth(
    doc: jsPDF,
    month: OptimizedMonth,
    x: number,
    y: number,
    width: number,
    height: number,
    periodFrom: string,
    periodTo: string,
    dayData: ReturnType<typeof buildOptimizedDays>,
    pdfMode: OptimizedPdfMode,
    monthsPerPage: OptimizedMonthsPerPage,
): void {
    const contentScale = monthContentScale(monthsPerPage)
    const titleH = 6 * contentScale
    const weekdayH = 4.5 * contentScale
    const gridY = y + titleH + weekdayH
    const gridH = height - titleH - weekdayH
    const cellW = width / 7
    const cellH = gridH / 6

    // Cadre et titre du mois
    doc.setDrawColor(...C.line)
    doc.setLineWidth(0.22)
    doc.setFillColor(...C.white)
    doc.roundedRect(x, y, width, height, 1.2, 1.2, 'FD')

    doc.setFillColor(...C.primary)
    doc.roundedRect(x, y, width, titleH, 1.2, 1.2, 'F')
    doc.rect(x, y + titleH - 1.3, width, 1.3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7 * contentScale)
    doc.setTextColor(...C.white)
    doc.text(formatMonthTitle(month).toUpperCase(), x + width / 2, y + 4.1 * contentScale, { align: 'center' })

    // Jours de semaine
    doc.setFillColor(...C.faint)
    doc.rect(x, y + titleH, width, weekdayH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(4.5 * contentScale)
    doc.setTextColor(...C.muted)
    WEEKDAYS.forEach((label, index) => {
        doc.text(label, x + cellW * index + cellW / 2, y + titleH + 3.1 * contentScale, { align: 'center' })
    })

    const first = new Date(Date.UTC(month.year, month.month, 1))
    const offset = mondayIndex(first)
    const count = daysInMonth(month)
    const monthFrom = monthStartIso(month)
    const monthTo = monthEndIso(month)
    const activeFrom = clampIso(monthFrom, periodFrom, periodTo)
    const activeTo = clampIso(monthTo, periodFrom, periodTo)

    for (let cell = 0; cell < 42; cell++) {
        const row = Math.floor(cell / 7)
        const col = cell % 7
        const cx = x + col * cellW
        const cy = gridY + row * cellH
        const day = cell - offset + 1
        const inMonth = day >= 1 && day <= count

        doc.setDrawColor(...C.line)
        doc.setLineWidth(0.14)

        if (!inMonth) {
            doc.setFillColor(...C.out)
            doc.rect(cx, cy, cellW, cellH, 'FD')
            continue
        }

        const iso = isoForDay(month.year, month.month, day)
        const inPeriod = iso >= activeFrom && iso <= activeTo && iso >= periodFrom && iso <= periodTo
        doc.setFillColor(...(inPeriod ? C.white : C.out))
        doc.rect(cx, cy, cellW, cellH, 'FD')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(4.5 * contentScale)
        doc.setTextColor(...(inPeriod ? C.dark : C.muted))
        doc.text(String(day), cx + 0.8 * contentScale, cy + 3.0 * contentScale)

        if (!inPeriod) continue

        const lines = dayData.get(iso)?.lines ?? []
        if (lines.length === 0) continue

        // Dans une page de 6 mois, une cellule journalière fait environ 10 mm.
        // L'ancien rendu utilisait un avatar fixe de 2.35 mm et un pas de 2.6 mm :
        // seule la première ligne (souvent 08h00) pouvait tenir.
        //
        // On répartit maintenant dynamiquement l'espace vertical disponible entre
        // toutes les lignes du jour : 08h00, 10h30, 16h00, repos, etc.
        const contentTop = cy + 3.45 * contentScale
        const contentBottom = cy + cellH - 0.35 * contentScale
        const availableH = Math.max(0.1, contentBottom - contentTop)
        const rowH = availableH / lines.length

        // Les avatars se réduisent seulement lorsque plusieurs services sont présents.
        // 1 ligne  -> avatar confortable
        // 4 lignes -> avatar compact mais toutes les informations restent visibles
        // Respiration visuelle : on réserve une petite marge verticale autour
        // de chaque avatar et une vraie séparation horizontale entre employés.
        const avatarD = Math.max(1.00 * contentScale, Math.min(1.68 * contentScale, rowH - 0.28 * contentScale))
        const avatarGap = Math.max(0.22 * contentScale, Math.min(0.30 * contentScale, avatarD * 0.20))
        const labelWidth = 2.15 * contentScale
        const avatarStartX = cx + labelWidth + 0.52 * contentScale
        const availableAvatarW = cellW - labelWidth - 1.02 * contentScale
        const maxAvatarsPerLine = Math.max(
            1,
            Math.floor((availableAvatarW + avatarGap) / (avatarD + avatarGap)),
        )
        const labelFontSize = (lines.length >= 4 ? 2.25 : lines.length === 3 ? 2.5 : 2.8) * contentScale

        lines.forEach((line, lineIndex) => {
            const lineTop = contentTop + lineIndex * rowH
            const lineY = lineTop + Math.max(0, (rowH - avatarD) / 2)
            const baselineY = lineY + avatarD * 0.68

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(labelFontSize)
            doc.setTextColor(...colorForKind(line.kind))
            doc.text(line.label, cx + 0.45 * contentScale, baselineY)

            const visibleEmployees = line.employees.slice(0, maxAvatarsPerLine)
            visibleEmployees.forEach((employee, index) => {
                drawEmployeeAvatar(
                    doc,
                    avatarStartX + index * (avatarD + avatarGap),
                    lineY,
                    employee.code,
                    employee.employeeColor,
                    line.kind,
                    pdfMode,
                    avatarD,
                )
            })

            const remaining = line.employees.length - visibleEmployees.length
            if (remaining > 0) {
                const suffixX = avatarStartX + visibleEmployees.length * (avatarD + avatarGap) + 0.10
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(Math.max(1.7, labelFontSize - 0.2))
                doc.setTextColor(...colorForKind(line.kind))
                doc.text(
                    `+${remaining}`,
                    Math.min(suffixX + 0.1, cx + cellW - 0.35),
                    baselineY,
                    { align: 'right' },
                )
            }
        })
    }
}

function drawShiftLegend(doc: jsPDF, x: number, y: number): number {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(...C.dark)
    doc.text('LÉGENDE HORAIRES', x, y)

    const entries: Array<{ kind: OptimizedShiftKind; label: string }> = [
        { kind: 'morning', label: '08 = prise de service 08h00' },
        { kind: 'mid', label: '10½ = prise de service 10h30' },
        { kind: 'guard', label: '16 = garde à partir de 16h00' },
        { kind: 'rest', label: 'R = repos planifié' },
        { kind: 'other', label: 'Autre horaire = heure affichée' },
    ]

    entries.forEach((entry, index) => {
        const ey = y + 4 + index * 3.7
        doc.setFillColor(...backgroundForKind(entry.kind))
        doc.setDrawColor(...colorForKind(entry.kind))
        doc.setLineWidth(0.15)
        doc.roundedRect(x, ey - 1.45, 2.6, 1.7, 0.35, 0.35, 'FD')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(4.8)
        doc.setTextColor(...C.dark)
        doc.text(entry.label, x + 3.6, ey)
    })

    return y + 4 + entries.length * 3.7
}

function drawEmployeeLegend(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    members: OptimizedScheduleExportOptions['members'],
    codesByGuid: Map<string, string>,
    pdfMode: OptimizedPdfMode,
): void {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(...C.dark)
    doc.text('LÉGENDE EMPLOYÉS', x, y)

    const groups = new Set(members.map((member) => member.groupName?.trim()).filter(Boolean))
    const showGroup = groups.size > 1
    const sorted = [...members].sort((a, b) => {
        const ca = codesByGuid.get(a.guid) ?? ''
        const cb = codesByGuid.get(b.guid) ?? ''
        return ca.localeCompare(cb, 'fr')
    })

    const columns = sorted.length > 24 ? 5 : sorted.length > 16 ? 4 : 3
    const rows = Math.ceil(sorted.length / columns)
    const colW = width / columns
    const rowH = rows > 7 ? 2.7 : 3.15
    const fontSize = rows > 7 ? 4.0 : 4.35

    sorted.forEach((member, index) => {
        const col = Math.floor(index / rows)
        const row = index % rows
        const code = codesByGuid.get(member.guid) ?? '—'
        const group = showGroup && member.groupName ? ` · ${member.groupName}` : ''
        const text = `${formatEmployeeLegendName(member)}${group}`
        const itemX = x + col * colW
        const itemY = y + 4 + row * rowH

        if (pdfMode === 'personalized') {
            drawEmployeeAvatar(
                doc,
                itemX + 0.05,
                itemY - 1.9,
                code,
                member.employeeColor,
                'other',
                'personalized',
                2.4,
            )
        } else {
            // Dans le PDF généralisé, la légende employé reste neutre :
            // aucune couleur ne doit laisser croire qu'elle appartient à l'employé.
            const diameter = 2.4
            const radius = diameter / 2
            const centerX = itemX + 0.05 + radius
            const centerY = itemY - 1.9 + radius

            doc.setFillColor(...C.white)
            doc.setDrawColor(...C.primary)
            doc.setLineWidth(0.13)
            doc.circle(centerX, centerY, radius, 'FD')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(code.length > 2 ? 2.15 : 2.55)
            doc.setTextColor(...C.primary)
            doc.text(code, centerX, centerY + 0.42, { align: 'center' })
        }

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(fontSize)
        doc.setTextColor(...C.dark)
        const clipped = doc.splitTextToSize(text, colW - 5)[0] ?? text
        doc.text(clipped, itemX + 3.5, itemY)
    })
}

/**
 * Planning longue période : 1, 2, 3, 4 ou 6 mini-calendriers par page A4 paysage.
 * Les exports standard et simplifié restent totalement indépendants.
 */
export function exportScheduleOptimizedPDF(options: OptimizedScheduleExportOptions): void {
    const { members, periodFrom, periodTo, generatedBy, tenantName } = options
    const pdfMode: OptimizedPdfMode = options.pdfMode ?? 'personalized'
    const monthsPerPage = options.monthsPerPage ?? DEFAULT_OPTIMIZED_MONTHS_PER_PAGE
    const pageLayout = optimizedMonthPageLayout(monthsPerPage)
    const pages = splitPeriodIntoMonthPages(periodFrom, periodTo, monthsPerPage)
    const codesByGuid = buildEmployeeCodes(members)
    const dayData = buildOptimizedDays(members, periodFrom, periodTo, codesByGuid)

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()

    const marginX = 6
    const topY = 23
    const monthGapX = 3
    const monthGapY = 4
    const legendY = 169
    const footerY = pageH - 5
    const availableW = pageW - marginX * 2
    const monthW = (availableW - monthGapX * (pageLayout.columns - 1)) / pageLayout.columns
    const monthH = (legendY - topY - monthGapY * (pageLayout.rows - 1) - 2) / pageLayout.rows

    pages.forEach((page, pageIndex) => {
        if (pageIndex > 0) doc.addPage()

        // En-tête
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11.5)
        doc.setTextColor(...C.primary)
        doc.text('PLANNING OPTIMISÉ', marginX, 9)

        doc.setFontSize(7)
        doc.setTextColor(...C.dark)
        doc.text(buildPeriodLabel(page.from, page.to), marginX, 14)

        if (tenantName) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(6)
            doc.setTextColor(...C.muted)
            doc.text(tenantName, marginX, 18)
        }

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(5.2)
        doc.setTextColor(...C.muted)
        const modeLabel = pdfMode === 'personalized'
            ? 'PDF personnalisé · couleurs = employés'
            : 'PDF généralisé · couleurs = services'

        doc.text(
            `${modeLabel} · ${monthsPerPage} mois/page · 00h00 masqué : continuité technique de la garde commencée à 16h00`,
            pageW - marginX,
            14,
            { align: 'right' },
        )

        page.months.forEach((month, index) => {
            const row = Math.floor(index / pageLayout.columns)
            const col = index % pageLayout.columns
            drawMonth(
                doc,
                month,
                marginX + col * (monthW + monthGapX),
                topY + row * (monthH + monthGapY),
                monthW,
                monthH,
                periodFrom,
                periodTo,
                dayData,
                pdfMode,
                monthsPerPage,
            )
        })

        // Légendes : couleur + codes employés
        doc.setDrawColor(...C.line)
        doc.setLineWidth(0.2)
        doc.line(marginX, legendY - 1.5, pageW - marginX, legendY - 1.5)

        const shiftLegendW = 78
        drawShiftLegend(doc, marginX, legendY + 2)
        drawEmployeeLegend(
            doc,
            marginX + shiftLegendW,
            legendY + 2,
            pageW - marginX * 2 - shiftLegendW,
            members,
            codesByGuid,
            pdfMode,
        )

        doc.setDrawColor(...C.line)
        doc.line(marginX, pageH - 9, pageW - marginX, pageH - 9)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(4.8)
        doc.setTextColor(...C.muted)
        doc.text(`TimeFlow · Planning optimisé · Généré par ${generatedBy}`, marginX, footerY)
    })

    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(4.8)
        doc.setTextColor(...C.muted)
        doc.text(`Page ${page} / ${totalPages}`, pageW - marginX, footerY, { align: 'right' })
    }

    const blobUrl = doc.output('bloburl')
    window.open(blobUrl as unknown as string, '_blank')
}


// import jsPDF from 'jspdf'
//
// import {
//     buildEmployeeCodes,
//     buildOptimizedDays,
//     formatEmployeeLegendName,
//     formatMonthTitle,
//     monthEndIso,
//     monthStartIso,
//     splitPeriodIntoMonthPages,
//     type OptimizedMonth,
//     type OptimizedPdfMode,
//     type OptimizedScheduleExportOptions,
//     type OptimizedShiftKind,
// } from './scheduleAssignment.optimized.export'
// import { buildPeriodLabel } from './export.helpers'
//
// import { employeeColorRgb, employeeColorText } from '@/utils/employeeColor'
//
// type RGB = [number, number, number]
//
// const C = {
//     primary: [15, 76, 129] as RGB,
//     dark: [30, 41, 59] as RGB,
//     muted: [100, 116, 139] as RGB,
//     line: [203, 213, 225] as RGB,
//     faint: [248, 250, 252] as RGB,
//     out: [241, 245, 249] as RGB,
//     white: [255, 255, 255] as RGB,
//     morning: [37, 99, 235] as RGB,
//     morningBg: [219, 234, 254] as RGB,
//     mid: [217, 119, 6] as RGB,
//     midBg: [254, 243, 199] as RGB,
//     guard: [225, 29, 72] as RGB,
//     guardBg: [255, 228, 230] as RGB,
//     rest: [100, 116, 139] as RGB,
//     restBg: [241, 245, 249] as RGB,
//     other: [124, 58, 237] as RGB,
//     otherBg: [237, 233, 254] as RGB,
// }
//
// const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const
//
// function colorForKind(kind: OptimizedShiftKind): RGB {
//     switch (kind) {
//         case 'morning': return C.morning
//         case 'mid': return C.mid
//         case 'guard': return C.guard
//         case 'rest': return C.rest
//         default: return C.other
//     }
// }
//
// function backgroundForKind(kind: OptimizedShiftKind): RGB {
//     switch (kind) {
//         case 'morning': return C.morningBg
//         case 'mid': return C.midBg
//         case 'guard': return C.guardBg
//         case 'rest': return C.restBg
//         default: return C.otherBg
//     }
// }
//
// function drawEmployeeAvatar(
//     doc: jsPDF,
//     x: number,
//     y: number,
//     code: string,
//     employeeColor: string | null,
//     kind: OptimizedShiftKind,
//     pdfMode: OptimizedPdfMode,
//     diameter = 2.35,
// ): void {
//     const radius = diameter / 2
//     const centerX = x + radius
//     const centerY = y + radius
//
//     // Deux lectures possibles du même planning :
//     // - personnalisé : le rond identifie durablement l'employé via employee_color ;
//     // - généralisé  : le rond identifie le service via sa couleur historique.
//     const isPersonalized = pdfMode === 'personalized'
//     const fillRgb = isPersonalized
//         ? (employeeColorRgb(employeeColor) ?? C.rest)
//         : backgroundForKind(kind)
//     const borderRgb = isPersonalized
//         ? (employeeColorRgb(employeeColor) ?? C.rest)
//         : colorForKind(kind)
//     const textRgb = isPersonalized
//         ? (employeeColorRgb(employeeColorText(employeeColor)) ?? C.white)
//         : colorForKind(kind)
//
//     doc.setFillColor(...fillRgb)
//     doc.setDrawColor(...borderRgb)
//     doc.setLineWidth(Math.max(0.10, Math.min(0.16, diameter * 0.08)))
//     doc.circle(centerX, centerY, radius, 'FD')
//
//     doc.setFont('helvetica', 'bold')
//     let fontSize = Math.max(1.45, Math.min(
//         code.length > 2 ? diameter * 1.20 : diameter * 1.48,
//         code.length > 2 ? 2.35 : 2.75,
//     ))
//     doc.setFontSize(fontSize)
//
//     const maxTextWidth = diameter * 0.62
//     const measuredWidth = doc.getTextWidth(code)
//     if (measuredWidth > maxTextWidth && measuredWidth > 0) {
//         fontSize = Math.max(1.30, fontSize * (maxTextWidth / measuredWidth))
//         doc.setFontSize(fontSize)
//     }
//
//     const textHeight = doc.getTextDimensions(code).h
//     doc.setTextColor(...textRgb)
//     doc.text(code, centerX, centerY + textHeight * 0.30, { align: 'center' })
// }
//
// function isoForDay(year: number, month: number, day: number): string {
//     return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
// }
//
// function mondayIndex(date: Date): number {
//     return (date.getUTCDay() + 6) % 7
// }
//
// function daysInMonth(month: OptimizedMonth): number {
//     return new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate()
// }
//
// function clampIso(iso: string, min: string, max: string): string {
//     if (iso < min) return min
//     if (iso > max) return max
//     return iso
// }
//
// function drawMonth(
//     doc: jsPDF,
//     month: OptimizedMonth,
//     x: number,
//     y: number,
//     width: number,
//     height: number,
//     periodFrom: string,
//     periodTo: string,
//     dayData: ReturnType<typeof buildOptimizedDays>,
//     pdfMode: OptimizedPdfMode,
// ): void {
//     const titleH = 6
//     const weekdayH = 4.5
//     const gridY = y + titleH + weekdayH
//     const gridH = height - titleH - weekdayH
//     const cellW = width / 7
//     const cellH = gridH / 6
//
//     // Cadre et titre du mois
//     doc.setDrawColor(...C.line)
//     doc.setLineWidth(0.22)
//     doc.setFillColor(...C.white)
//     doc.roundedRect(x, y, width, height, 1.2, 1.2, 'FD')
//
//     doc.setFillColor(...C.primary)
//     doc.roundedRect(x, y, width, titleH, 1.2, 1.2, 'F')
//     doc.rect(x, y + titleH - 1.3, width, 1.3, 'F')
//     doc.setFont('helvetica', 'bold')
//     doc.setFontSize(7)
//     doc.setTextColor(...C.white)
//     doc.text(formatMonthTitle(month).toUpperCase(), x + width / 2, y + 4.1, { align: 'center' })
//
//     // Jours de semaine
//     doc.setFillColor(...C.faint)
//     doc.rect(x, y + titleH, width, weekdayH, 'F')
//     doc.setFont('helvetica', 'bold')
//     doc.setFontSize(4.5)
//     doc.setTextColor(...C.muted)
//     WEEKDAYS.forEach((label, index) => {
//         doc.text(label, x + cellW * index + cellW / 2, y + titleH + 3.1, { align: 'center' })
//     })
//
//     const first = new Date(Date.UTC(month.year, month.month, 1))
//     const offset = mondayIndex(first)
//     const count = daysInMonth(month)
//     const monthFrom = monthStartIso(month)
//     const monthTo = monthEndIso(month)
//     const activeFrom = clampIso(monthFrom, periodFrom, periodTo)
//     const activeTo = clampIso(monthTo, periodFrom, periodTo)
//
//     for (let cell = 0; cell < 42; cell++) {
//         const row = Math.floor(cell / 7)
//         const col = cell % 7
//         const cx = x + col * cellW
//         const cy = gridY + row * cellH
//         const day = cell - offset + 1
//         const inMonth = day >= 1 && day <= count
//
//         doc.setDrawColor(...C.line)
//         doc.setLineWidth(0.14)
//
//         if (!inMonth) {
//             doc.setFillColor(...C.out)
//             doc.rect(cx, cy, cellW, cellH, 'FD')
//             continue
//         }
//
//         const iso = isoForDay(month.year, month.month, day)
//         const inPeriod = iso >= activeFrom && iso <= activeTo && iso >= periodFrom && iso <= periodTo
//         doc.setFillColor(...(inPeriod ? C.white : C.out))
//         doc.rect(cx, cy, cellW, cellH, 'FD')
//
//         doc.setFont('helvetica', 'bold')
//         doc.setFontSize(4.5)
//         doc.setTextColor(...(inPeriod ? C.dark : C.muted))
//         doc.text(String(day), cx + 0.8, cy + 3.0)
//
//         if (!inPeriod) continue
//
//         const lines = dayData.get(iso)?.lines ?? []
//         if (lines.length === 0) continue
//
//         // Dans une page de 6 mois, une cellule journalière fait environ 10 mm.
//         // L'ancien rendu utilisait un avatar fixe de 2.35 mm et un pas de 2.6 mm :
//         // seule la première ligne (souvent 08h00) pouvait tenir.
//         //
//         // On répartit maintenant dynamiquement l'espace vertical disponible entre
//         // toutes les lignes du jour : 08h00, 10h30, 16h00, repos, etc.
//         const contentTop = cy + 3.45
//         const contentBottom = cy + cellH - 0.35
//         const availableH = Math.max(0.1, contentBottom - contentTop)
//         const rowH = availableH / lines.length
//
//         // Les avatars se réduisent seulement lorsque plusieurs services sont présents.
//         // 1 ligne  -> avatar confortable
//         // 4 lignes -> avatar compact mais toutes les informations restent visibles
//         // Respiration visuelle : on réserve une petite marge verticale autour
//         // de chaque avatar et une vraie séparation horizontale entre employés.
//         const avatarD = Math.max(1.00, Math.min(1.68, rowH - 0.28))
//         const avatarGap = Math.max(0.22, Math.min(0.30, avatarD * 0.20))
//         const labelWidth = 2.15
//         const avatarStartX = cx + labelWidth + 0.52
//         const availableAvatarW = cellW - labelWidth - 1.02
//         const maxAvatarsPerLine = Math.max(
//             1,
//             Math.floor((availableAvatarW + avatarGap) / (avatarD + avatarGap)),
//         )
//         const labelFontSize = lines.length >= 4 ? 2.25 : lines.length === 3 ? 2.5 : 2.8
//
//         lines.forEach((line, lineIndex) => {
//             const lineTop = contentTop + lineIndex * rowH
//             const lineY = lineTop + Math.max(0, (rowH - avatarD) / 2)
//             const baselineY = lineY + avatarD * 0.68
//
//             doc.setFont('helvetica', 'bold')
//             doc.setFontSize(labelFontSize)
//             doc.setTextColor(...colorForKind(line.kind))
//             doc.text(line.label, cx + 0.45, baselineY)
//
//             const visibleEmployees = line.employees.slice(0, maxAvatarsPerLine)
//             visibleEmployees.forEach((employee, index) => {
//                 drawEmployeeAvatar(
//                     doc,
//                     avatarStartX + index * (avatarD + avatarGap),
//                     lineY,
//                     employee.code,
//                     employee.employeeColor,
//                     line.kind,
//                     pdfMode,
//                     avatarD,
//                 )
//             })
//
//             const remaining = line.employees.length - visibleEmployees.length
//             if (remaining > 0) {
//                 const suffixX = avatarStartX + visibleEmployees.length * (avatarD + avatarGap) + 0.10
//                 doc.setFont('helvetica', 'bold')
//                 doc.setFontSize(Math.max(1.7, labelFontSize - 0.2))
//                 doc.setTextColor(...colorForKind(line.kind))
//                 doc.text(
//                     `+${remaining}`,
//                     Math.min(suffixX + 0.1, cx + cellW - 0.35),
//                     baselineY,
//                     { align: 'right' },
//                 )
//             }
//         })
//     }
// }
//
// function drawShiftLegend(doc: jsPDF, x: number, y: number): number {
//     doc.setFont('helvetica', 'bold')
//     doc.setFontSize(5.5)
//     doc.setTextColor(...C.dark)
//     doc.text('LÉGENDE HORAIRES', x, y)
//
//     const entries: Array<{ kind: OptimizedShiftKind; label: string }> = [
//         { kind: 'morning', label: '08 = prise de service 08h00' },
//         { kind: 'mid', label: '10½ = prise de service 10h30' },
//         { kind: 'guard', label: '16 = garde à partir de 16h00' },
//         { kind: 'rest', label: 'R = repos planifié' },
//         { kind: 'other', label: 'Autre horaire = heure affichée' },
//     ]
//
//     entries.forEach((entry, index) => {
//         const ey = y + 4 + index * 3.7
//         doc.setFillColor(...backgroundForKind(entry.kind))
//         doc.setDrawColor(...colorForKind(entry.kind))
//         doc.setLineWidth(0.15)
//         doc.roundedRect(x, ey - 1.45, 2.6, 1.7, 0.35, 0.35, 'FD')
//         doc.setFont('helvetica', 'normal')
//         doc.setFontSize(4.8)
//         doc.setTextColor(...C.dark)
//         doc.text(entry.label, x + 3.6, ey)
//     })
//
//     return y + 4 + entries.length * 3.7
// }
//
// function drawEmployeeLegend(
//     doc: jsPDF,
//     x: number,
//     y: number,
//     width: number,
//     members: OptimizedScheduleExportOptions['members'],
//     codesByGuid: Map<string, string>,
//     pdfMode: OptimizedPdfMode,
// ): void {
//     doc.setFont('helvetica', 'bold')
//     doc.setFontSize(5.5)
//     doc.setTextColor(...C.dark)
//     doc.text('LÉGENDE EMPLOYÉS', x, y)
//
//     const groups = new Set(members.map((member) => member.groupName?.trim()).filter(Boolean))
//     const showGroup = groups.size > 1
//     const sorted = [...members].sort((a, b) => {
//         const ca = codesByGuid.get(a.guid) ?? ''
//         const cb = codesByGuid.get(b.guid) ?? ''
//         return ca.localeCompare(cb, 'fr')
//     })
//
//     const columns = sorted.length > 24 ? 5 : sorted.length > 16 ? 4 : 3
//     const rows = Math.ceil(sorted.length / columns)
//     const colW = width / columns
//     const rowH = rows > 7 ? 2.7 : 3.15
//     const fontSize = rows > 7 ? 4.0 : 4.35
//
//     sorted.forEach((member, index) => {
//         const col = Math.floor(index / rows)
//         const row = index % rows
//         const code = codesByGuid.get(member.guid) ?? '—'
//         const group = showGroup && member.groupName ? ` · ${member.groupName}` : ''
//         const text = `${formatEmployeeLegendName(member)}${group}`
//         const itemX = x + col * colW
//         const itemY = y + 4 + row * rowH
//
//         if (pdfMode === 'personalized') {
//             drawEmployeeAvatar(
//                 doc,
//                 itemX + 0.05,
//                 itemY - 1.9,
//                 code,
//                 member.employeeColor,
//                 'other',
//                 'personalized',
//                 2.4,
//             )
//         } else {
//             // Dans le PDF généralisé, la légende employé reste neutre :
//             // aucune couleur ne doit laisser croire qu'elle appartient à l'employé.
//             const diameter = 2.4
//             const radius = diameter / 2
//             const centerX = itemX + 0.05 + radius
//             const centerY = itemY - 1.9 + radius
//
//             doc.setFillColor(...C.white)
//             doc.setDrawColor(...C.primary)
//             doc.setLineWidth(0.13)
//             doc.circle(centerX, centerY, radius, 'FD')
//             doc.setFont('helvetica', 'bold')
//             doc.setFontSize(code.length > 2 ? 2.15 : 2.55)
//             doc.setTextColor(...C.primary)
//             doc.text(code, centerX, centerY + 0.42, { align: 'center' })
//         }
//
//         doc.setFont('helvetica', 'normal')
//         doc.setFontSize(fontSize)
//         doc.setTextColor(...C.dark)
//         const clipped = doc.splitTextToSize(text, colW - 5)[0] ?? text
//         doc.text(clipped, itemX + 3.5, itemY)
//     })
// }
//
// /**
//  * Planning longue période : 6 mini-calendriers maximum par page A4 paysage.
//  * Les exports standard et simplifié restent totalement indépendants.
//  */
// export function exportScheduleOptimizedPDF(options: OptimizedScheduleExportOptions): void {
//     const { members, periodFrom, periodTo, generatedBy, tenantName } = options
//     const pdfMode: OptimizedPdfMode = options.pdfMode ?? 'personalized'
//     const pages = splitPeriodIntoMonthPages(periodFrom, periodTo)
//     const codesByGuid = buildEmployeeCodes(members)
//     const dayData = buildOptimizedDays(members, periodFrom, periodTo, codesByGuid)
//
//     const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
//     const pageW = doc.internal.pageSize.getWidth()
//     const pageH = doc.internal.pageSize.getHeight()
//
//     const marginX = 6
//     const topY = 23
//     const monthGapX = 3
//     const monthGapY = 4
//     const legendY = 169
//     const footerY = pageH - 5
//     const availableW = pageW - marginX * 2
//     const monthW = (availableW - monthGapX * 2) / 3
//     const monthH = (legendY - topY - monthGapY - 2) / 2
//
//     pages.forEach((page, pageIndex) => {
//         if (pageIndex > 0) doc.addPage()
//
//         // En-tête
//         doc.setFont('helvetica', 'bold')
//         doc.setFontSize(11.5)
//         doc.setTextColor(...C.primary)
//         doc.text('PLANNING OPTIMISÉ', marginX, 9)
//
//         doc.setFontSize(7)
//         doc.setTextColor(...C.dark)
//         doc.text(buildPeriodLabel(page.from, page.to), marginX, 14)
//
//         if (tenantName) {
//             doc.setFont('helvetica', 'normal')
//             doc.setFontSize(6)
//             doc.setTextColor(...C.muted)
//             doc.text(tenantName, marginX, 18)
//         }
//
//         doc.setFont('helvetica', 'normal')
//         doc.setFontSize(5.2)
//         doc.setTextColor(...C.muted)
//         const modeLabel = pdfMode === 'personalized'
//             ? 'PDF personnalisé · couleurs = employés'
//             : 'PDF généralisé · couleurs = services'
//
//         doc.text(
//             `${modeLabel} · 00h00 masqué : continuité technique de la garde commencée à 16h00`,
//             pageW - marginX,
//             14,
//             { align: 'right' },
//         )
//
//         page.months.forEach((month, index) => {
//             const row = Math.floor(index / 3)
//             const col = index % 3
//             drawMonth(
//                 doc,
//                 month,
//                 marginX + col * (monthW + monthGapX),
//                 topY + row * (monthH + monthGapY),
//                 monthW,
//                 monthH,
//                 periodFrom,
//                 periodTo,
//                 dayData,
//                 pdfMode,
//             )
//         })
//
//         // Légendes : couleur + codes employés
//         doc.setDrawColor(...C.line)
//         doc.setLineWidth(0.2)
//         doc.line(marginX, legendY - 1.5, pageW - marginX, legendY - 1.5)
//
//         const shiftLegendW = 78
//         drawShiftLegend(doc, marginX, legendY + 2)
//         drawEmployeeLegend(
//             doc,
//             marginX + shiftLegendW,
//             legendY + 2,
//             pageW - marginX * 2 - shiftLegendW,
//             members,
//             codesByGuid,
//             pdfMode,
//         )
//
//         doc.setDrawColor(...C.line)
//         doc.line(marginX, pageH - 9, pageW - marginX, pageH - 9)
//         doc.setFont('helvetica', 'normal')
//         doc.setFontSize(4.8)
//         doc.setTextColor(...C.muted)
//         doc.text(`TimeFlow · Planning optimisé · Généré par ${generatedBy}`, marginX, footerY)
//     })
//
//     const totalPages = (doc as any).internal.getNumberOfPages()
//     for (let page = 1; page <= totalPages; page++) {
//         doc.setPage(page)
//         doc.setFont('helvetica', 'normal')
//         doc.setFontSize(4.8)
//         doc.setTextColor(...C.muted)
//         doc.text(`Page ${page} / ${totalPages}`, pageW - marginX, footerY, { align: 'right' })
//     }
//
//     const blobUrl = doc.output('bloburl')
//     window.open(blobUrl as unknown as string, '_blank')
// }
