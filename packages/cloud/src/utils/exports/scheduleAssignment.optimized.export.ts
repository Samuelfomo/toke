// ─────────────────────────────────────────────────────────────────────────────
// utils/exports/scheduleAssignment.optimized.export.ts
//
// Préparation des données pour le planning optimisé longue période.
// - nombre de mois/page configurable (1, 2, 3, 4 ou 6 ; défaut 6) ;
// - codes employés courts et uniques ;
// - 00h00 ignoré car il correspond à la continuité technique de la garde ;
// - catégories visuelles : 08h00, 10h30, garde 16h00, repos, autre horaire.
// ─────────────────────────────────────────────────────────────────────────────

export interface OptimizedScheduleSlot {
    work: [string, string]
    pause?: [string, string]
}

export interface OptimizedScheduleMember {
    guid: string
    name: string
    code: string
    employeeColor: string | null
    groupName: string | null
    firstName?: string
    lastName?: string
    scheduleByDate: Record<string, OptimizedScheduleSlot[]>
    restByDate?: Record<string, boolean>
}

export type OptimizedPdfMode = 'personalized' | 'generalized'

export type OptimizedMonthsPerPage = 1 | 2 | 3 | 4 | 6

export const DEFAULT_OPTIMIZED_MONTHS_PER_PAGE: OptimizedMonthsPerPage = 6

export interface OptimizedScheduleExportOptions {
    members: OptimizedScheduleMember[]
    periodFrom: string
    periodTo: string
    generatedBy: string
    tenantName?: string
    /**
     * personalized : le rond porte employee_color (identité employé).
     * generalized  : le rond porte la couleur du service (08h / 10h30 / 16h / repos).
     */
    pdfMode?: OptimizedPdfMode
    /** Nombre maximal de calendriers mensuels affichés sur une page optimisée. */
    monthsPerPage?: OptimizedMonthsPerPage
}

export type OptimizedShiftKind = 'morning' | 'mid' | 'guard' | 'rest' | 'other'

export interface OptimizedEmployeeMarker {
    guid: string
    code: string
    employeeColor: string | null
}

export interface OptimizedLine {
    kind: OptimizedShiftKind
    label: string
    employees: OptimizedEmployeeMarker[]
    /** Compatibilité temporaire avec l'ancien rendu. */
    codes: string[]
}

export interface OptimizedDayData {
    iso: string
    lines: OptimizedLine[]
}

export interface OptimizedMonth {
    year: number
    month: number // 0 → 11
    key: string
}

export interface OptimizedMonthPage {
    months: OptimizedMonth[]
    from: string
    to: string
}

const MONTH_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const

export function parseIsoUtc(iso: string): Date {
    const [year, month, day] = iso.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
}

export function toIsoUtc(date: Date): string {
    return date.toISOString().slice(0, 10)
}

export function normalizeTime(value?: string | null): string {
    if (!value) return ''
    const match = value.trim().match(/^(\d{1,2}):(\d{2})/)
    if (!match) return value.trim()
    return `${match[1].padStart(2, '0')}:${match[2]}`
}

export function isTechnicalMidnightStart(value?: string | null): boolean {
    return normalizeTime(value) === '00:00'
}

export function formatEmployeeLegendName(member: OptimizedScheduleMember): string {
    const firstName = member.firstName?.trim().split(/\s+/)[0] || ''
    const lastName = member.lastName?.trim().split(/\s+/)[0] || ''
    const displayName = [firstName, lastName]
        .filter(Boolean)
        .join(' ')
    return displayName ? displayName.toLocaleUpperCase('fr-FR') : '_'
}

function employeeWords(member: OptimizedScheduleMember): string[] {
    const explicit = [member.firstName?.trim(), member.lastName?.trim()]
        .filter(Boolean)
        .join(' ')
        .trim()
    return (explicit || member.name || '')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(Boolean)
}

function baseEmployeeCode(member: OptimizedScheduleMember): string {
    const words = employeeWords(member)
    if (words.length === 0) return 'EM'

    const first = words[0]
        .charAt(0)
        .toLocaleUpperCase('fr-FR')

    if (words.length >= 2) {
        const last = words[words.length - 1]
            .charAt(0)
            .toLocaleUpperCase('fr-FR')
        return `${first}${last}`
    }

    const compact = words[0]
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()

    return compact.slice(0, 2) || first || 'E'
}

/**
 * Produit des codes très courts et uniques pour les mini-avatars du planning optimisé.
 * Exemple : Aïcha KOTTINE → AK, Melanie Patricia NGAH → MN, Jeanne YAMENI FOYANG → JF.
 * Un suffixe numérique est ajouté uniquement en cas de collision.
 */
export function buildEmployeeCodes(
    members: OptimizedScheduleMember[],
): Map<string, string> {
    const result = new Map<string, string>()
    const used = new Map<string, number>()

    const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    for (const member of sorted) {
        const base = baseEmployeeCode(member)
        const occurrence = (used.get(base) ?? 0) + 1
        used.set(base, occurrence)
        result.set(member.guid, occurrence === 1 ? base : `${base}${occurrence}`)
    }

    return result
}

export function listMonths(periodFrom: string, periodTo: string): OptimizedMonth[] {
    const start = parseIsoUtc(periodFrom)
    const end = parseIsoUtc(periodTo)
    const result: OptimizedMonth[] = []

    let year = start.getUTCFullYear()
    let month = start.getUTCMonth()
    const endYear = end.getUTCFullYear()
    const endMonth = end.getUTCMonth()

    while (year < endYear || (year === endYear && month <= endMonth)) {
        result.push({
            year,
            month,
            key: `${year}-${String(month + 1).padStart(2, '0')}`,
        })
        month++
        if (month > 11) {
            month = 0
            year++
        }
    }

    return result
}

export function monthStartIso(month: OptimizedMonth): string {
    return `${month.year}-${String(month.month + 1).padStart(2, '0')}-01`
}

export function monthEndIso(month: OptimizedMonth): string {
    const last = new Date(Date.UTC(month.year, month.month + 1, 0))
    return toIsoUtc(last)
}

export interface OptimizedMonthPageLayout {
    columns: 1 | 2 | 3
    rows: 1 | 2
}

export function normalizeOptimizedMonthsPerPage(value: unknown): OptimizedMonthsPerPage {
    const parsed = Number(value)
    return ([1, 2, 3, 4, 6] as const).includes(parsed as OptimizedMonthsPerPage)
        ? parsed as OptimizedMonthsPerPage
        : DEFAULT_OPTIMIZED_MONTHS_PER_PAGE
}

/**
 * Grille automatique utilisée par l'aperçu/PDF.
 * Le manager choisit seulement le nombre de mois : Toké choisit la grille.
 */
export function optimizedMonthPageLayout(
    value: OptimizedMonthsPerPage = DEFAULT_OPTIMIZED_MONTHS_PER_PAGE,
): OptimizedMonthPageLayout {
    const monthsPerPage = normalizeOptimizedMonthsPerPage(value)
    switch (monthsPerPage) {
        case 1: return { columns: 1, rows: 1 }
        case 2: return { columns: 2, rows: 1 }
        case 3: return { columns: 3, rows: 1 }
        case 4: return { columns: 2, rows: 2 }
        default: return { columns: 3, rows: 2 }
    }
}

/** Découpe la période selon le nombre de mois choisi. 6 reste la valeur par défaut. */
export function splitPeriodIntoMonthPages(
    periodFrom: string,
    periodTo: string,
    value: OptimizedMonthsPerPage = DEFAULT_OPTIMIZED_MONTHS_PER_PAGE,
): OptimizedMonthPage[] {
    const monthsPerPage = normalizeOptimizedMonthsPerPage(value)
    const months = listMonths(periodFrom, periodTo)
    const pages: OptimizedMonthPage[] = []

    for (let index = 0; index < months.length; index += monthsPerPage) {
        const pageMonths = months.slice(index, index + monthsPerPage)
        const first = pageMonths[0]
        const last = pageMonths[pageMonths.length - 1]
        if (!first || !last) continue

        pages.push({
            months: pageMonths,
            from: index === 0 ? periodFrom : monthStartIso(first),
            to: index + monthsPerPage >= months.length ? periodTo : monthEndIso(last),
        })
    }

    return pages
}

export function formatMonthTitle(month: OptimizedMonth): string {
    return `${MONTH_FR[month.month]} ${month.year}`
}

function lineLabelForStart(start: string): { kind: OptimizedShiftKind; label: string } {
    switch (normalizeTime(start)) {
        case '08:00': return { kind: 'morning', label: '08' }
        case '10:30': return { kind: 'mid', label: '10½' }
        case '16:00': return { kind: 'guard', label: '16' }
        default: {
            const normalized = normalizeTime(start)
            const [h = normalized, m = '00'] = normalized.split(':')
            return {
                kind: 'other',
                label: m === '00' ? h : `${h}h${m}`,
            }
        }
    }
}

/**
 * Résout le contenu de chaque date à partir du planning exact par date.
 * 00h00 est volontairement exclu du planning optimisé : ce n'est pas une
 * nouvelle prise de service mais la continuation de la garde de 16h00.
 */
export function buildOptimizedDays(
    members: OptimizedScheduleMember[],
    periodFrom: string,
    periodTo: string,
    codesByGuid: Map<string, string> = buildEmployeeCodes(members),
): Map<string, OptimizedDayData> {
    const result = new Map<string, OptimizedDayData>()

    for (let cursor = parseIsoUtc(periodFrom); cursor <= parseIsoUtc(periodTo); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        const iso = toIsoUtc(cursor)
        const byStart = new Map<string, OptimizedEmployeeMarker[]>()
        const restEmployees: OptimizedEmployeeMarker[] = []

        for (const member of members) {
            const marker: OptimizedEmployeeMarker = {
                guid: member.guid,
                code: codesByGuid.get(member.guid) ?? '—',
                employeeColor: member.employeeColor ?? null,
            }

            if (member.restByDate?.[iso] === true) {
                restEmployees.push(marker)
                continue
            }

            const starts = new Set(
                (member.scheduleByDate[iso] ?? [])
                    .map((slot) => normalizeTime(slot.work?.[0]))
                    .filter((start) => Boolean(start) && !isTechnicalMidnightStart(start)),
            )

            for (const start of starts) {
                const list = byStart.get(start) ?? []
                list.push(marker)
                byStart.set(start, list)
            }
        }

        const orderedStarts = [...byStart.keys()].sort((a, b) => a.localeCompare(b))
        const lines: OptimizedLine[] = orderedStarts.map((start) => {
            const meta = lineLabelForStart(start)
            const employees = [...(byStart.get(start) ?? [])]
                .sort((a, b) => a.code.localeCompare(b.code, 'fr'))

            return {
                ...meta,
                employees,
                codes: employees.map((employee) => employee.code),
            }
        })

        if (restEmployees.length > 0) {
            const employees = restEmployees
                .sort((a, b) => a.code.localeCompare(b.code, 'fr'))

            lines.push({
                kind: 'rest',
                label: 'R',
                employees,
                codes: employees.map((employee) => employee.code),
            })
        }

        result.set(iso, { iso, lines })
    }

    return result
}


// // ─────────────────────────────────────────────────────────────────────────────
// // utils/exports/scheduleAssignment.optimized.export.ts
// //
// // Préparation des données pour le planning optimisé longue période.
// // - jusqu'à 6 mois par page PDF ;
// // - codes employés courts et uniques ;
// // - 00h00 ignoré car il correspond à la continuité technique de la garde ;
// // - catégories visuelles : 08h00, 10h30, garde 16h00, repos, autre horaire.
// // ─────────────────────────────────────────────────────────────────────────────
//
// export interface OptimizedScheduleSlot {
//     work: [string, string]
//     pause?: [string, string]
// }
//
// export interface OptimizedScheduleMember {
//     guid: string
//     name: string
//     code: string
//     employeeColor: string | null
//     groupName: string | null
//     firstName?: string
//     lastName?: string
//     scheduleByDate: Record<string, OptimizedScheduleSlot[]>
//     restByDate?: Record<string, boolean>
// }
//
// export type OptimizedPdfMode = 'personalized' | 'generalized'
//
// export interface OptimizedScheduleExportOptions {
//     members: OptimizedScheduleMember[]
//     periodFrom: string
//     periodTo: string
//     generatedBy: string
//     tenantName?: string
//     /**
//      * personalized : le rond porte employee_color (identité employé).
//      * generalized  : le rond porte la couleur du service (08h / 10h30 / 16h / repos).
//      */
//     pdfMode?: OptimizedPdfMode
// }
//
// export type OptimizedShiftKind = 'morning' | 'mid' | 'guard' | 'rest' | 'other'
//
// export interface OptimizedEmployeeMarker {
//     guid: string
//     code: string
//     employeeColor: string | null
// }
//
// export interface OptimizedLine {
//     kind: OptimizedShiftKind
//     label: string
//     employees: OptimizedEmployeeMarker[]
//     /** Compatibilité temporaire avec l'ancien rendu. */
//     codes: string[]
// }
//
// export interface OptimizedDayData {
//     iso: string
//     lines: OptimizedLine[]
// }
//
// export interface OptimizedMonth {
//     year: number
//     month: number // 0 → 11
//     key: string
// }
//
// export interface OptimizedMonthPage {
//     months: OptimizedMonth[]
//     from: string
//     to: string
// }
//
// const MONTH_FR = [
//     'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
//     'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
// ] as const
//
// export function parseIsoUtc(iso: string): Date {
//     const [year, month, day] = iso.split('-').map(Number)
//     return new Date(Date.UTC(year, month - 1, day))
// }
//
// export function toIsoUtc(date: Date): string {
//     return date.toISOString().slice(0, 10)
// }
//
// export function normalizeTime(value?: string | null): string {
//     if (!value) return ''
//     const match = value.trim().match(/^(\d{1,2}):(\d{2})/)
//     if (!match) return value.trim()
//     return `${match[1].padStart(2, '0')}:${match[2]}`
// }
//
// export function isTechnicalMidnightStart(value?: string | null): boolean {
//     return normalizeTime(value) === '00:00'
// }
//
// // export function formatEmployeeLegendName(member: OptimizedScheduleMember): string {
// //     const explicit = [member.firstName?.trim(), member.lastName?.trim()]
// //         .filter(Boolean)
// //         .join(' ')
// //         .trim()
// //     const fullName = explicit || member.name?.trim() || ''
// //     const parts = fullName.split(/\s+/).filter(Boolean)
// //
// //     if (parts.length === 0) return '—'
// //     if (parts.length === 1) return parts[0].toLocaleUpperCase('fr-FR')
// //
// //     return `${parts[0]} ${parts.slice(1)
// //         .map((part) => `${part.charAt(0)}.`)
// //         .join(' ')}`
// //         .toLocaleUpperCase('fr-FR')
// // }
//
// export function formatEmployeeLegendName(member: OptimizedScheduleMember): string {
//     const firstName = member.firstName?.trim().split(/\s+/)[0] || ''
//     const lastName = member.lastName?.trim().split(/\s+/)[0] || ''
//     const displayName = [firstName, lastName]
//         .filter(Boolean)
//         .join(' ')
//     return displayName ? displayName.toLocaleUpperCase('fr-FR') : '_'
// }
//
// function employeeWords(member: OptimizedScheduleMember): string[] {
//     const explicit = [member.firstName?.trim(), member.lastName?.trim()]
//         .filter(Boolean)
//         .join(' ')
//         .trim()
//     return (explicit || member.name || '')
//         .split(/\s+/)
//         .map((word) => word.trim())
//         .filter(Boolean)
// }
//
// function baseEmployeeCode(member: OptimizedScheduleMember): string {
//     const words = employeeWords(member)
//     if (words.length === 0) return 'EM'
//
//     const first = words[0]
//         .charAt(0)
//         .toLocaleUpperCase('fr-FR')
//
//     if (words.length >= 2) {
//         const last = words[words.length - 1]
//             .charAt(0)
//             .toLocaleUpperCase('fr-FR')
//         return `${first}${last}`
//     }
//
//     const compact = words[0]
//         .normalize('NFD')
//         .replace(/[\u0300-\u036f]/g, '')
//         .replace(/[^a-zA-Z0-9]/g, '')
//         .toUpperCase()
//
//     return compact.slice(0, 2) || first || 'E'
// }
//
// /**
//  * Produit des codes très courts et uniques pour les mini-avatars du planning optimisé.
//  * Exemple : Aïcha KOTTINE → AK, Melanie Patricia NGAH → MN, Jeanne YAMENI FOYANG → JF.
//  * Un suffixe numérique est ajouté uniquement en cas de collision.
//  */
// export function buildEmployeeCodes(
//     members: OptimizedScheduleMember[],
// ): Map<string, string> {
//     const result = new Map<string, string>()
//     const used = new Map<string, number>()
//
//     const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
//     for (const member of sorted) {
//         const base = baseEmployeeCode(member)
//         const occurrence = (used.get(base) ?? 0) + 1
//         used.set(base, occurrence)
//         result.set(member.guid, occurrence === 1 ? base : `${base}${occurrence}`)
//     }
//
//     return result
// }
//
// export function listMonths(periodFrom: string, periodTo: string): OptimizedMonth[] {
//     const start = parseIsoUtc(periodFrom)
//     const end = parseIsoUtc(periodTo)
//     const result: OptimizedMonth[] = []
//
//     let year = start.getUTCFullYear()
//     let month = start.getUTCMonth()
//     const endYear = end.getUTCFullYear()
//     const endMonth = end.getUTCMonth()
//
//     while (year < endYear || (year === endYear && month <= endMonth)) {
//         result.push({
//             year,
//             month,
//             key: `${year}-${String(month + 1).padStart(2, '0')}`,
//         })
//         month++
//         if (month > 11) {
//             month = 0
//             year++
//         }
//     }
//
//     return result
// }
//
// export function monthStartIso(month: OptimizedMonth): string {
//     return `${month.year}-${String(month.month + 1).padStart(2, '0')}-01`
// }
//
// export function monthEndIso(month: OptimizedMonth): string {
//     const last = new Date(Date.UTC(month.year, month.month + 1, 0))
//     return toIsoUtc(last)
// }
//
// /** Découpe la période en pages de 6 mois maximum. */
// export function splitPeriodIntoMonthPages(
//     periodFrom: string,
//     periodTo: string,
// ): OptimizedMonthPage[] {
//     const months = listMonths(periodFrom, periodTo)
//     const pages: OptimizedMonthPage[] = []
//
//     for (let index = 0; index < months.length; index += 6) {
//         const pageMonths = months.slice(index, index + 6)
//         const first = pageMonths[0]
//         const last = pageMonths[pageMonths.length - 1]
//         if (!first || !last) continue
//
//         pages.push({
//             months: pageMonths,
//             from: index === 0 ? periodFrom : monthStartIso(first),
//             to: index + 6 >= months.length ? periodTo : monthEndIso(last),
//         })
//     }
//
//     return pages
// }
//
// export function formatMonthTitle(month: OptimizedMonth): string {
//     return `${MONTH_FR[month.month]} ${month.year}`
// }
//
// function lineLabelForStart(start: string): { kind: OptimizedShiftKind; label: string } {
//     switch (normalizeTime(start)) {
//         case '08:00': return { kind: 'morning', label: '08' }
//         case '10:30': return { kind: 'mid', label: '10½' }
//         case '16:00': return { kind: 'guard', label: '16' }
//         default: {
//             const normalized = normalizeTime(start)
//             const [h = normalized, m = '00'] = normalized.split(':')
//             return {
//                 kind: 'other',
//                 label: m === '00' ? h : `${h}h${m}`,
//             }
//         }
//     }
// }
//
// /**
//  * Résout le contenu de chaque date à partir du planning exact par date.
//  * 00h00 est volontairement exclu du planning optimisé : ce n'est pas une
//  * nouvelle prise de service mais la continuation de la garde de 16h00.
//  */
// export function buildOptimizedDays(
//     members: OptimizedScheduleMember[],
//     periodFrom: string,
//     periodTo: string,
//     codesByGuid: Map<string, string> = buildEmployeeCodes(members),
// ): Map<string, OptimizedDayData> {
//     const result = new Map<string, OptimizedDayData>()
//
//     for (let cursor = parseIsoUtc(periodFrom); cursor <= parseIsoUtc(periodTo); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
//         const iso = toIsoUtc(cursor)
//         const byStart = new Map<string, OptimizedEmployeeMarker[]>()
//         const restEmployees: OptimizedEmployeeMarker[] = []
//
//         for (const member of members) {
//             const marker: OptimizedEmployeeMarker = {
//                 guid: member.guid,
//                 code: codesByGuid.get(member.guid) ?? '—',
//                 employeeColor: member.employeeColor ?? null,
//             }
//
//             if (member.restByDate?.[iso] === true) {
//                 restEmployees.push(marker)
//                 continue
//             }
//
//             const starts = new Set(
//                 (member.scheduleByDate[iso] ?? [])
//                     .map((slot) => normalizeTime(slot.work?.[0]))
//                     .filter((start) => Boolean(start) && !isTechnicalMidnightStart(start)),
//             )
//
//             for (const start of starts) {
//                 const list = byStart.get(start) ?? []
//                 list.push(marker)
//                 byStart.set(start, list)
//             }
//         }
//
//         const orderedStarts = [...byStart.keys()].sort((a, b) => a.localeCompare(b))
//         const lines: OptimizedLine[] = orderedStarts.map((start) => {
//             const meta = lineLabelForStart(start)
//             const employees = [...(byStart.get(start) ?? [])]
//                 .sort((a, b) => a.code.localeCompare(b.code, 'fr'))
//
//             return {
//                 ...meta,
//                 employees,
//                 codes: employees.map((employee) => employee.code),
//             }
//         })
//
//         if (restEmployees.length > 0) {
//             const employees = restEmployees
//                 .sort((a, b) => a.code.localeCompare(b.code, 'fr'))
//
//             lines.push({
//                 kind: 'rest',
//                 label: 'R',
//                 employees,
//                 codes: employees.map((employee) => employee.code),
//             })
//         }
//
//         result.set(iso, { iso, lines })
//     }
//
//     return result
// }