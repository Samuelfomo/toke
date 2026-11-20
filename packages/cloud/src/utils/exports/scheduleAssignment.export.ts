// ─────────────────────────────────────────────────────────────────────────────
// utils/exports/scheduleAssignment.export.ts
//
// Exports CSV et Excel du planning standard.
// Structure : jour × blocs horaires (calculés par jour depuis les membres filtrés)
// ─────────────────────────────────────────────────────────────────────────────

import {
    downloadBlob,
    rowsToCsvBlob,
    downloadWorkbook,
    buildWorkbook,
    buildPeriodDays,
    buildFilename,
    formatDateFR,
    formatHours,
    timeToHours,
    buildPeriodLabel,
    type PeriodDay,
} from './export.helpers'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FlatMemberExport {
    guid:      string
    name:      string
    code:      string
    groupName: string | null
    schedule:  Record<string, { work: [string, string]; pause?: [string, string] }[]>
}

export interface ScheduleExportOptions {
    members:     FlatMemberExport[]
    periodFrom:  string   // YYYY-MM-DD
    periodTo:    string   // YYYY-MM-DD
    generatedBy: string
    tenantName?: string
}

/** Affiche Groupe uniquement si l'export mélange plusieurs groupes/catégories. */
export function shouldShowScheduleGroupColumn(
    members: Pick<FlatMemberExport, 'groupName'>[],
): boolean {
    const groups = new Set(
        members.map((member) => member.groupName?.trim() || '__NO_GROUP__'),
    )
    return groups.size > 1
}

// ── Helpers horaires ──────────────────────────────────────────────────────────

function timeToMin(t: string): number {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + (m ?? 0)
}
function minToTime(m: number): string {
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

interface TimeBlock { start: string; end: string; label: string }

export function computeDayBlocks(members: FlatMemberExport[], dayKey: string): TimeBlock[] {
    const points = new Set<number>()
    for (const m of members) {
        const slots = m.schedule[dayKey]
        if (!slots) continue
        for (const s of slots) {
            points.add(timeToMin(s.work[0]))
            points.add(timeToMin(s.work[1]))
            if (s.pause) {
                points.add(timeToMin(s.pause[0]))
                points.add(timeToMin(s.pause[1]))
            }
        }
    }
    const sorted = Array.from(points).sort((a, b) => a - b)
    return sorted.slice(0, -1).map((pt, i) => {
        const start = minToTime(pt)
        const end   = minToTime(sorted[i + 1])
        return { start, end, label: `${start} – ${end}` }
    })
}

export function getMemberBlockStatus(
    member: FlatMemberExport, dayKey: string, block: TimeBlock
): 'work' | 'pause' | 'absent' {
    const slots = member.schedule[dayKey]
    if (!slots) return 'absent'
    const bStart = timeToMin(block.start)
    const bEnd   = timeToMin(block.end)
    for (const s of slots) {
        const wStart = timeToMin(s.work[0])
        const wEnd   = timeToMin(s.work[1])
        if (wStart < bEnd && wEnd > bStart) {
            if (s.pause) {
                const pStart = timeToMin(s.pause[0])
                const pEnd   = timeToMin(s.pause[1])
                if (pStart < bEnd && pEnd > bStart) return 'pause'
            }
            return 'work'
        }
    }
    return 'absent'
}

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const JS_DAY_TO_KEY: Record<number, string> = {
    1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun',
}

// ─────────────────────────────────────────────────────────────────────────────
// ── EXPORT CSV ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export function exportScheduleCSV(options: ScheduleExportOptions): void {
    const { members, periodFrom, periodTo, generatedBy, tenantName } = options
    const showGroupColumn = shouldShowScheduleGroupColumn(members)

    const rows: (string | number | null)[][] = []

    // Méta
    rows.push([`PROGRAMME STANDARD — ${tenantName ?? ''}`])
    rows.push([`Période : ${buildPeriodLabel(periodFrom, periodTo)}`])
    rows.push([`Généré le : ${new Date().toLocaleString('fr-FR')}   |   Par : ${generatedBy}`])
    rows.push([])

    // Parcourir chaque jour
    const cursor = new Date(periodFrom + 'T00:00:00')
    const endDate = new Date(periodTo + 'T00:00:00')

    while (cursor <= endDate) {
        const iso     = cursor.toISOString().split('T')[0]
        const jsDay   = cursor.getDay()
        const dayKey  = JS_DAY_TO_KEY[jsDay]
        const blocks  = computeDayBlocks(members, dayKey)
        const dateStr = cursor.toLocaleDateString('fr-FR', {
            weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit',
        })

        rows.push([`── ${dateStr} ──`])

        if (blocks.length === 0) {
            rows.push(['Jour de repos / aucun bloc planifié'])
        } else {
            // En-tête : Employé | Groupe | bloc1 | bloc2 | ...
            const header = [
                'Employé', 'Matricule',
                ...(showGroupColumn ? ['Groupe'] : []),
                ...blocks.map((b) => b.label),
            ]
            rows.push(header)

            for (const m of members) {
                const row: (string | null)[] = [
                    m.name,
                    m.code || '—',
                    ...(showGroupColumn ? [m.groupName ?? 'Sans groupe'] : []),
                ]
                for (const b of blocks) {
                    const status = getMemberBlockStatus(m, dayKey, b)
                    row.push(status === 'work' ? '✓' : status === 'pause' ? 'Pause' : '—')
                }
                rows.push(row)
            }
        }
        rows.push([])

        cursor.setDate(cursor.getDate() + 1)
    }

    const blob     = rowsToCsvBlob(rows)
    const name     = members[0]?.name ?? 'programme'
    const filename = buildFilename('programme_standard', name, periodFrom, periodTo, 'csv')
    downloadBlob(blob, filename)
}

// ─────────────────────────────────────────────────────────────────────────────
// ── EXPORT EXCEL ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export function exportScheduleExcel(options: ScheduleExportOptions): void {
    const { members, periodFrom, periodTo, generatedBy, tenantName } = options
    const showGroupColumn = shouldShowScheduleGroupColumn(members)

    // ── Sheet 1 : Programme (jour × blocs) ───────────────────────────────────
    const programmeData: (string | number | null)[][] = []

    programmeData.push([`Programme Standard — ${tenantName ?? ''}`])
    programmeData.push([`Période : ${buildPeriodLabel(periodFrom, periodTo)}`])
    programmeData.push([`Généré le ${new Date().toLocaleString('fr-FR')} par ${generatedBy}`])
    programmeData.push([])

    const cursor  = new Date(periodFrom + 'T00:00:00')
    const endDate = new Date(periodTo + 'T00:00:00')

    while (cursor <= endDate) {
        const jsDay  = cursor.getDay()
        const dayKey = JS_DAY_TO_KEY[jsDay]
        const blocks = computeDayBlocks(members, dayKey)
        const dateStr = cursor.toLocaleDateString('fr-FR', {
            weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit',
        })

        programmeData.push([dateStr])

        if (blocks.length === 0) {
            programmeData.push(['Jour de repos'])
        } else {
            const header = [
                'Employé', 'Matricule',
                ...(showGroupColumn ? ['Groupe'] : []),
                ...blocks.map((b) => b.label),
            ]
            programmeData.push(header)

            for (const m of members) {
                const row: (string | null)[] = [
                    m.name,
                    m.code || '—',
                    ...(showGroupColumn ? [m.groupName ?? 'Sans groupe'] : []),
                ]
                for (const b of blocks) {
                    const status = getMemberBlockStatus(m, dayKey, b)
                    row.push(status === 'work' ? '✓' : status === 'pause' ? 'Pause' : '—')
                }
                programmeData.push(row)
            }
        }
        programmeData.push([])
        cursor.setDate(cursor.getDate() + 1)
    }

    // Largeurs : Employé=28, Matricule=14, Groupe=22, puis 16 par bloc
    const maxBlocks = 24 // borne haute raisonnable
    const progColWidths = [
        28, 14,
        ...(showGroupColumn ? [22] : []),
        ...Array(maxBlocks).fill(16),
    ]

    // ── Sheet 2 : Récapitulatif membres ──────────────────────────────────────
    const recapData: (string | number | null)[][] = []

    recapData.push([`Récapitulatif — ${buildPeriodLabel(periodFrom, periodTo)}`])
    recapData.push([])
    recapData.push([
        'Employé', 'Matricule',
        ...(showGroupColumn ? ['Groupe'] : []),
        'Jours travaillés', 'Jours de repos',
    ])

    const days = buildPeriodDays(periodFrom, periodTo)

    for (const m of members) {
        let worked = 0; let rest = 0
        for (const d of days) {
            const slots = m.schedule[d.dayKey]
            if (slots && slots.length > 0) worked++; else rest++
        }
        recapData.push([
            m.name, m.code || '—',
            ...(showGroupColumn ? [m.groupName ?? 'Sans groupe'] : []),
            worked, rest,
        ])
    }

    const wb = buildWorkbook([
        { name: 'Programme',     data: programmeData, colWidths: progColWidths },
        {
            name: 'Récapitulatif',
            data: recapData,
            colWidths: [28, 14, ...(showGroupColumn ? [22] : []), 14, 14],
        },
    ])

    const name     = members[0]?.name ?? 'programme'
    const filename = buildFilename('programme_standard', name, periodFrom, periodTo, 'xlsx')
    downloadWorkbook(wb, filename)
}