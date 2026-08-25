// ─────────────────────────────────────────────────────────────────────────────
// utils/exports/scheduleAssignment.simple.export.ts
//
// Exports simplifiés destinés à l'impression / affichage du planning.
// Présentation : Date | [Groupe] | heure de début 1 | heure de début 2 | ... | Repos
// Les heures de fin, pauses et indicateurs détaillés sont volontairement omis.
// Les employés sont affichés sous la forme : premier prénom complet + initiales suivantes
// (ex. Melanie Patricia NGAH → Melanie P. N.).
// ─────────────────────────────────────────────────────────────────────────────

import {
    buildFilename,
    buildPeriodLabel,
    buildWorkbook,
    downloadBlob,
    downloadWorkbook,
    rowsToCsvBlob,
} from './export.helpers'

import {
    formatEmployeeLegendName,
    OptimizedScheduleMember
} from "@/utils/exports/scheduleAssignment.optimized.export.js";

export interface SimplifiedScheduleExportOptions {
    members: OptimizedScheduleMember[]
    periodFrom: string
    periodTo: string
    generatedBy: string
    tenantName?: string
}

export interface SimplifiedWeek {
    from: string
    to: string
    dates: string[]
}

export interface SimplifiedScheduleMemberRef {
    guid: string
    name: string
}

export interface SimplifiedScheduleRow {
    iso: string
    dateLabel: string
    groupName: string | null
    namesByStart: Record<string, string[]>
    restNames: string[]
    /** Données supplémentaires utilisées uniquement par la vue interactive. */
    membersByStart: Record<string, SimplifiedScheduleMemberRef[]>
    restMembers: SimplifiedScheduleMemberRef[]
}

const DAY_FR_LONG = [
    'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi',
] as const

const NO_GROUP_KEY = '__NO_GROUP__'

function parseIsoUtc(iso: string): Date {
    const [year, month, day] = iso.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
}

function toIsoUtc(date: Date): string {
    return date.toISOString().slice(0, 10)
}

function addDays(iso: string, amount: number): string {
    const date = parseIsoUtc(iso)
    date.setUTCDate(date.getUTCDate() + amount)
    return toIsoUtc(date)
}

function buildMemberLabels(members: OptimizedScheduleMember[]): Map<string, string> {
    const labels = new Map<string, string>()

    for (const member of members) {
        labels.set(
            member.guid,
            formatEmployeeLegendName(member),
        )
    }

    return labels
}

export function formatCompactTime(value: string): string {
    const [hour = '00', minute = '00'] = value.split(':')
    return `${hour.padStart(2, '0')}h${minute.padStart(2, '0')}`
}

export function formatCompactDate(iso: string): string {
    const d = parseIsoUtc(iso)
    const dayName = DAY_FR_LONG[d.getUTCDay()]
    const date = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
    return `${dayName} ${date}`
}

export function listPeriodDates(periodFrom: string, periodTo: string): string[] {
    const result: string[] = []
    for (let iso = periodFrom; iso <= periodTo; iso = addDays(iso, 1)) {
        result.push(iso)
    }
    return result
}

/**
 * Découpe la période suivant les semaines civiles lundi → dimanche.
 * Une période partielle au début ou à la fin reste une semaine partielle.
 */
export function splitPeriodIntoWeeks(periodFrom: string, periodTo: string): SimplifiedWeek[] {
    const weeks: SimplifiedWeek[] = []
    let cursor = periodFrom

    while (cursor <= periodTo) {
        const date = parseIsoUtc(cursor)
        const jsDay = date.getUTCDay() // 0 dim ... 6 sam
        const daysUntilSunday = jsDay === 0 ? 0 : 7 - jsDay
        const naturalWeekEnd = addDays(cursor, daysUntilSunday)
        const weekEnd = naturalWeekEnd < periodTo ? naturalWeekEnd : periodTo
        const dates = listPeriodDates(cursor, weekEnd)
        weeks.push({ from: cursor, to: weekEnd, dates })
        cursor = addDays(weekEnd, 1)
    }

    return weeks
}

export function shouldShowGroupColumn(
    members: Pick<OptimizedScheduleMember, 'groupName'>[],
): boolean {
    const groups = new Set(
        members.map((member) => member.groupName?.trim() || NO_GROUP_KEY),
    )
    return groups.size > 1
}

function groupKey(member: Pick<OptimizedScheduleMember, 'groupName'>): string {
    return member.groupName?.trim() || NO_GROUP_KEY
}

function displayGroupName(key: string): string {
    return key === NO_GROUP_KEY ? 'Sans groupe' : key
}

export function collectStartTimes(
    members: OptimizedScheduleMember[],
    dates: string[],
): string[] {
    const starts = new Set<string>()

    for (const member of members) {
        for (const iso of dates) {
            for (const slot of member.scheduleByDate[iso] ?? []) {
                if (slot.work?.[0]) starts.add(slot.work[0])
            }
        }
    }

    return Array.from(starts).sort((a, b) => a.localeCompare(b))
}

/**
 * Construit la grille manuelle : une ligne par date.
 * Si plusieurs groupes sont réellement présents dans l'export, une ligne est
 * produite par date + groupe et la colonne Groupe devient visible.
 */
export function buildSimplifiedRows(
    members: OptimizedScheduleMember[],
    dates: string[],
    startTimes: string[],
): { showGroupColumn: boolean; rows: SimplifiedScheduleRow[] } {
    const showGroupColumn = shouldShowGroupColumn(members)
    const groups = showGroupColumn
        ? Array.from(new Set(members.map(groupKey))).sort((a, b) => displayGroupName(a).localeCompare(displayGroupName(b), 'fr'))
        : [NO_GROUP_KEY]
    const labelsByGuid = buildMemberLabels(members)

    const rows: SimplifiedScheduleRow[] = []

    for (const iso of dates) {
        for (const group of groups) {
            const namesByStart: Record<string, string[]> = Object.fromEntries(
                startTimes.map((start) => [start, []]),
            )
            const membersByStart: Record<string, SimplifiedScheduleMemberRef[]> = Object.fromEntries(
                startTimes.map((start) => [start, []]),
            )
            const restNames: string[] = []
            const restMembers: SimplifiedScheduleMemberRef[] = []

            for (const member of members) {
                if (showGroupColumn && groupKey(member) !== group) continue

                const label = labelsByGuid.get(member.guid) ?? member.name
                const startsForMember = new Set(
                    (member.scheduleByDate[iso] ?? [])
                        .map((slot) => slot.work?.[0])
                        .filter((start): start is string => Boolean(start)),
                )

                for (const start of startsForMember) {
                    if (!namesByStart[start]) namesByStart[start] = []
                    if (!membersByStart[start]) membersByStart[start] = []
                    namesByStart[start].push(label)
                    membersByStart[start].push({guid: member.guid, name: label})
                }

                if (member.restByDate?.[iso] === true) {
                    restNames.push(label)
                    restMembers.push({guid: member.guid, name: label})
                }
            }

            for (const names of Object.values(namesByStart)) {
                names.sort((a, b) => a.localeCompare(b, 'fr'))
            }
            for (const refs of Object.values(membersByStart)) {
                refs.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
            }
            restNames.sort((a, b) => a.localeCompare(b, 'fr'))
            restMembers.sort((a, b) => a.name.localeCompare(b.name, 'fr'))

            // Avec plusieurs groupes, on évite les lignes 100 % vides qui
            // augmenteraient inutilement le nombre de pages.
            if (showGroupColumn) {
                const hasAnyName = Object.values(namesByStart).some((names) => names.length > 0)
                    || restNames.length > 0
                if (!hasAnyName) continue
            }

            rows.push({
                iso,
                dateLabel: formatCompactDate(iso),
                groupName: showGroupColumn ? displayGroupName(group) : null,
                namesByStart,
                restNames,
                membersByStart,
                restMembers,
            })
        }
    }

    return { showGroupColumn, rows }
}

export function exportScheduleSimpleCSV(options: SimplifiedScheduleExportOptions): void {
    const { members, periodFrom, periodTo, generatedBy, tenantName } = options
    const dates = listPeriodDates(periodFrom, periodTo)
    const startTimes = collectStartTimes(members, dates)
    const { showGroupColumn, rows } = buildSimplifiedRows(members, dates, startTimes)

    const data: (string | number | null)[][] = []
    data.push([`PROGRAMME SIMPLIFIÉ — ${tenantName ?? ''}`])
    data.push([`Période : ${buildPeriodLabel(periodFrom, periodTo)}`])
    data.push([`Généré le : ${new Date().toLocaleString('fr-FR')} | Par : ${generatedBy}`])
    data.push([])

    data.push([
        'Date',
        ...(showGroupColumn ? ['Groupe'] : []),
        ...startTimes.map(formatCompactTime),
        'Repos',
    ])

    for (const row of rows) {
        data.push([
            row.dateLabel,
            ...(showGroupColumn ? [row.groupName ?? 'Sans groupe'] : []),
            ...startTimes.map((start) => row.namesByStart[start].join(', ')),
            row.restNames.join(', '),
        ])
    }

    const blob = rowsToCsvBlob(data)
    const filename = buildFilename('programme_simplifie', 'equipe', periodFrom, periodTo, 'csv')
    downloadBlob(blob, filename)
}

export function exportScheduleSimpleExcel(options: SimplifiedScheduleExportOptions): void {
    const { members, periodFrom, periodTo, generatedBy, tenantName } = options
    const weeks = splitPeriodIntoWeeks(periodFrom, periodTo)

    const sheets = weeks.map((week, index) => {
        const startTimes = collectStartTimes(members, week.dates)
        const { showGroupColumn, rows } = buildSimplifiedRows(members, week.dates, startTimes)
        const data: (string | number | null)[][] = []

        data.push([`PROGRAMME SIMPLIFIÉ — ${tenantName ?? ''}`])
        data.push([`Période : ${buildPeriodLabel(week.from, week.to)}`])
        data.push([`Généré le ${new Date().toLocaleString('fr-FR')} par ${generatedBy}`])
        data.push([])
        data.push([
            'Date',
            ...(showGroupColumn ? ['Groupe'] : []),
            ...startTimes.map(formatCompactTime),
            'Repos',
        ])

        for (const row of rows) {
            data.push([
                row.dateLabel,
                ...(showGroupColumn ? [row.groupName ?? 'Sans groupe'] : []),
                ...startTimes.map((start) => row.namesByStart[start].join('\n')),
                row.restNames.join('\n'),
            ])
        }

        const timeWidth = Math.max(22, Math.min(38, Math.floor(100 / Math.max(startTimes.length, 1))))
        const colWidths = [28, ...(showGroupColumn ? [22] : []), ...startTimes.map(() => timeWidth), 24]

        return {
            name: `Semaine ${index + 1}`,
            data,
            colWidths,
        }
    })

    const wb = buildWorkbook(sheets)
    const filename = buildFilename('programme_simplifie', 'equipe', periodFrom, periodTo, 'xlsx')
    downloadWorkbook(wb, filename)
}