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
            const header = ['Employé', 'Matricule', 'Groupe', ...blocks.map((b) => b.label)]
            rows.push(header)

            for (const m of members) {
                const row: (string | null)[] = [
                    m.name,
                    m.code || '—',
                    m.groupName ?? 'Sans groupe',
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
            const header = ['Employé', 'Matricule', 'Groupe', ...blocks.map((b) => b.label)]
            programmeData.push(header)

            for (const m of members) {
                const row: (string | null)[] = [
                    m.name,
                    m.code || '—',
                    m.groupName ?? 'Sans groupe',
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
    const progColWidths = [28, 14, 22, ...Array(maxBlocks).fill(16)]

    // ── Sheet 2 : Récapitulatif membres ──────────────────────────────────────
    const recapData: (string | number | null)[][] = []

    recapData.push([`Récapitulatif — ${buildPeriodLabel(periodFrom, periodTo)}`])
    recapData.push([])
    recapData.push(['Employé', 'Matricule', 'Groupe', 'Jours travaillés', 'Jours de repos'])

    const days = buildPeriodDays(periodFrom, periodTo)

    for (const m of members) {
        let worked = 0; let rest = 0
        for (const d of days) {
            const slots = m.schedule[d.dayKey]
            if (slots && slots.length > 0) worked++; else rest++
        }
        recapData.push([m.name, m.code || '—', m.groupName ?? 'Sans groupe', worked, rest])
    }

    const wb = buildWorkbook([
        { name: 'Programme',     data: programmeData, colWidths: progColWidths },
        { name: 'Récapitulatif', data: recapData,     colWidths: [28, 14, 22, 14, 14] },
    ])

    const name     = members[0]?.name ?? 'programme'
    const filename = buildFilename('programme_standard', name, periodFrom, periodTo, 'xlsx')
    downloadWorkbook(wb, filename)
}


// // ─────────────────────────────────────────────────────────────────────────────
// // utils/exports/scheduleAssignment.export.ts
// //
// // Génère les exports CSV et Excel pour le module Planning Standard.
// //
// // Deux feuilles produites :
// //   1. "Planning"   — grille membre × jour avec horaires
// //   2. "Récapitulatif" — KPIs et informations du template
// // ─────────────────────────────────────────────────────────────────────────────
//
// import {
//     downloadBlob,
//     rowsToCsvBlob,
//     downloadWorkbook,
//     buildWorkbook,
//     buildPeriodDays,
//     buildFilename,
//     formatDateFR,
//     formatHours,
//     timeToHours,
//     buildPeriodLabel,
//     type PeriodDay,
// } from './export.helpers'
//
// import {
//     getTargetName,
//     IScheduleAssignment,
//     ISessionTemplateDefinition,
//     ISessionTemplateInline, isGroupAssignment, isUserAssignment
// } from "@/views/planning/schedule_assignment/type";
//
//
// // ── Types internes ────────────────────────────────────────────────────────────
//
// export interface ScheduleExportOptions {
//     /** Affectations à exporter (déjà filtrées par le composant) */
//     assignments:  IScheduleAssignment[]
//     periodFrom:   string   // YYYY-MM-DD
//     periodTo:     string   // YYYY-MM-DD
//     /** Nom du manager / RH qui génère l'export */
//     generatedBy:  string
//     /** Nom du tenant */
//     tenantName?:  string
// }
//
// interface MemberRow {
//     guid:       string
//     name:       string
//     code:       string
//     assignment: IScheduleAssignment
// }
//
// // ── Résolution du template ────────────────────────────────────────────────────
//
// const DAY_ORDER = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as const
//
// function getTemplateForAssignment(a: IScheduleAssignment): ISessionTemplateInline | undefined {
//     // Le template complet est dans session_template
//     return a.session_template ?? undefined
// }
//
// interface DayCell {
//     work:  string   // "08:00 – 18:00" ou "—"
//     pause: string   // "12:00 – 13:00" ou ""
//     hasWork: boolean
// }
//
// function resolveDayCell(tpl: ISessionTemplateInline | undefined, dayKey: string): DayCell {
//     if (!tpl?.definition) return { work: '—', pause: '', hasWork: false }
//     const blocks = tpl.definition[dayKey as keyof ISessionTemplateDefinition]
//     if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
//         return { work: '—', pause: '', hasWork: false }
//     }
//     const b = blocks[0]
//     return {
//         work:    `${b.work[0]} – ${b.work[1]}`,
//         pause:   b.pause ? `${b.pause[0]} – ${b.pause[1]}` : '',
//         hasWork: true,
//     }
// }
//
// // ── Construction des lignes membres ──────────────────────────────────────────
//
// function buildMemberRows(assignments: IScheduleAssignment[]): MemberRow[] {
//     const rows: MemberRow[] = []
//     const seen = new Set<string>()
//
//     for (const a of assignments) {
//         if (isGroupAssignment(a)) {
//             for (const m of a.related.members.items) {
//                 if (!seen.has(m.user.guid)) {
//                     seen.add(m.user.guid)
//                     rows.push({
//                         guid:       m.user.guid,
//                         name:       `${m.user.first_name} ${m.user.last_name}`.trim(),
//                         code:       m.user.employee_code ?? '',
//                         assignment: a,
//                     })
//                 }
//             }
//         } else if (isUserAssignment(a)) {
//             if (!seen.has(a.related.guid)) {
//                 seen.add(a.related.guid)
//                 rows.push({
//                     guid:       a.related.guid,
//                     name:       `${a.related.first_name} ${a.related.last_name}`.trim(),
//                     code:       a.related.employee_code ?? '',
//                     assignment: a,
//                 })
//             }
//         }
//     }
//
//     return rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
// }
//
// // ── Calcul KPIs ───────────────────────────────────────────────────────────────
//
// interface ScheduleKPIs {
//     workedDays:   number
//     restDays:     number
//     totalWorkH:   number
//     totalPauseH:  number
//     netWorkH:     number
//     memberCount:  number
// }
//
// function computeKPIs(
//     members:    MemberRow[],
//     days:       PeriodDay[],
// ): ScheduleKPIs {
//     if (members.length === 0) {
//         return { workedDays: 0, restDays: 0, totalWorkH: 0, totalPauseH: 0, netWorkH: 0, memberCount: 0 }
//     }
//
//     // On prend le template du premier membre (homogène dans un groupe)
//     const tpl = getTemplateForAssignment(members[0].assignment)
//
//     let workedDays = 0
//     let workH      = 0
//     let pauseH     = 0
//
//     for (const d of days) {
//         const cell = resolveDayCell(tpl, d.dayKey)
//         if (cell.hasWork) {
//             workedDays++
//             const blocks = tpl?.definition?.[d.dayKey as keyof ISessionTemplateDefinition]
//             if (blocks && Array.isArray(blocks) && blocks.length > 0) {
//                 const b = blocks[0]
//                 workH  += timeToHours(b.work[1])  - timeToHours(b.work[0])
//                 if (b.pause) pauseH += timeToHours(b.pause[1]) - timeToHours(b.pause[0])
//             }
//         }
//     }
//
//     const restDays = days.length - workedDays
//     return {
//         workedDays,
//         restDays,
//         totalWorkH:  workH,
//         totalPauseH: pauseH,
//         netWorkH:    workH - pauseH,
//         memberCount: members.length,
//     }
// }
//
// // ─────────────────────────────────────────────────────────────────────────────
// // ── EXPORT CSV ───────────────────────────────────────────────────────────────
// // ─────────────────────────────────────────────────────────────────────────────
//
// export function exportScheduleCSV(options: ScheduleExportOptions): void {
//     const { assignments, periodFrom, periodTo, generatedBy, tenantName } = options
//     const days    = buildPeriodDays(periodFrom, periodTo)
//     const members = buildMemberRows(assignments)
//     const kpis    = computeKPIs(members, days)
//
//     const rows: (string | number | null)[][] = []
//
//     // ── Bloc méta ──
//     rows.push(['PLANNING STANDARD — TOKÉ'])
//     rows.push([tenantName ?? ''])
//     rows.push([`Période : ${buildPeriodLabel(periodFrom, periodTo)}`])
//     rows.push([`Généré le : ${new Date().toLocaleString('fr-FR')}   |   Par : ${generatedBy}`])
//     rows.push([])
//
//     // ── En-tête template (première assignment) ──
//     if (assignments.length > 0) {
//         const tpl = getTemplateForAssignment(assignments[0])
//         rows.push(['INFORMATIONS DU PLANNING'])
//         rows.push(['Template',         tpl?.name ?? '—'])
//         rows.push(['Modèle de session',tpl?.session_model?.name ?? '—'])
//         rows.push(['Horaires',         tpl ? getFirstWorkBlock(tpl) : '—'])
//         rows.push(['Pause',            tpl ? getFirstPauseBlock(tpl) : '—'])
//         rows.push(['Tolérance',        tpl ? getFirstTolerance(tpl) : '—'])
//         rows.push(['Jours travaillés', tpl ? getWorkDays(tpl) : '—'])
//         rows.push([])
//     }
//
//     // ── En-tête grille ──
//     const headerRow: string[] = ['Matricule', 'Nom complet', 'Département', 'Poste']
//     for (const d of days) {
//         headerRow.push(d.label)
//         headerRow.push('') // colonne pause (vide dans l'en-tête)
//     }
//     rows.push(headerRow)
//
//     // ── Sous-en-tête (Travail / Pause) ──
//     const subHeader: string[] = ['', '', '', '']
//     for (const _d of days) {
//         subHeader.push('Travail')
//         subHeader.push('Pause')
//     }
//     rows.push(subHeader)
//
//     // ── Lignes membres ──
//     for (const m of members) {
//         const tpl = getTemplateForAssignment(m.assignment)
//         const row: (string | null)[] = [
//             m.code,
//             m.name,
//             getDepartment(m.assignment) ?? '',
//             getJobTitle(m.assignment) ?? '',
//         ]
//         for (const d of days) {
//             const cell = resolveDayCell(tpl, d.dayKey)
//             row.push(cell.hasWork ? cell.work : '—')
//             row.push(cell.hasWork && cell.pause ? cell.pause : '')
//         }
//         rows.push(row)
//     }
//
//     // ── Bloc récapitulatif ──
//     rows.push([])
//     rows.push(['RÉCAPITULATIF PÉRIODE'])
//     rows.push(['Jours travaillés',  kpis.workedDays])
//     rows.push(['Jours de repos',    kpis.restDays])
//     rows.push(['Heures totales',    formatHours(kpis.totalWorkH)])
//     rows.push(['Heures de pause',   formatHours(kpis.totalPauseH)])
//     rows.push(['Heures nettes',     formatHours(kpis.netWorkH)])
//     rows.push(['Membres concernés', kpis.memberCount])
//
//     const blob     = rowsToCsvBlob(rows)
//     const name     = members[0]?.name ?? 'planning'
//     const filename = buildFilename('planning_standard', name, periodFrom, periodTo, 'csv')
//     downloadBlob(blob, filename)
// }
//
// // ─────────────────────────────────────────────────────────────────────────────
// // ── EXPORT EXCEL ─────────────────────────────────────────────────────────────
// // ─────────────────────────────────────────────────────────────────────────────
//
// export function exportScheduleExcel(options: ScheduleExportOptions): void {
//     const { assignments, periodFrom, periodTo, generatedBy, tenantName } = options
//     const days    = buildPeriodDays(periodFrom, periodTo)
//     const members = buildMemberRows(assignments)
//     const kpis    = computeKPIs(members, days)
//
//     // ── Sheet 1 : Planning (grille) ──────────────────────────────────────────
//     const planningData: (string | number | null)[][] = []
//
//     // Méta
//     planningData.push([`Planning Standard — ${tenantName ?? 'TOKÉ'}`])
//     planningData.push([`Période : ${buildPeriodLabel(periodFrom, periodTo)}`])
//     planningData.push([`Généré le ${new Date().toLocaleString('fr-FR')} par ${generatedBy}`])
//     planningData.push([])
//
//     // En-tête
//     const header: string[] = ['Matricule', 'Nom complet', 'Département', 'Poste']
//     const subHeader: string[] = ['', '', '', '']
//     for (const d of days) {
//         header.push(d.label)
//         header.push('')
//         subHeader.push('Travail')
//         subHeader.push('Pause')
//     }
//     planningData.push(header)
//     planningData.push(subHeader)
//
//     // Lignes
//     for (const m of members) {
//         const tpl = getTemplateForAssignment(m.assignment)
//         const row: (string | null)[] = [
//             m.code,
//             m.name,
//             getDepartment(m.assignment) ?? '',
//             getJobTitle(m.assignment) ?? '',
//         ]
//         for (const d of days) {
//             const cell = resolveDayCell(tpl, d.dayKey)
//             row.push(cell.hasWork ? cell.work : '—')
//             row.push(cell.hasWork && cell.pause ? cell.pause : '')
//         }
//         planningData.push(row)
//     }
//
//     // Largeurs colonnes : Matricule=12, Nom=25, Dép=18, Poste=18, puis 12+8 par jour
//     const planColWidths = [12, 25, 18, 18]
//     for (let i = 0; i < days.length; i++) { planColWidths.push(14, 14) }
//
//     // ── Sheet 2 : Récapitulatif ───────────────────────────────────────────────
//     const recapData: (string | number | null)[][] = []
//
//     recapData.push([`Récapitulatif — ${buildPeriodLabel(periodFrom, periodTo)}`])
//     recapData.push([])
//
//     // Infos template
//     if (assignments.length > 0) {
//         const tpl = getTemplateForAssignment(assignments[0])
//         recapData.push(['INFORMATIONS DU PLANNING APPLIQUÉ'])
//         recapData.push(['Template',          tpl?.name ?? '—'])
//         recapData.push(['Modèle de session', tpl?.session_model?.name ?? '—'])
//         recapData.push(['Horaires',          tpl ? getFirstWorkBlock(tpl) : '—'])
//         recapData.push(['Pause',             tpl ? getFirstPauseBlock(tpl) : '—'])
//         recapData.push(['Tolérance',         tpl ? getFirstTolerance(tpl) : '—'])
//         recapData.push(['Jours travaillés',  tpl ? getWorkDays(tpl) : '—'])
//         recapData.push(['Jours de repos',    tpl ? getRestDays(tpl) : '—'])
//         recapData.push([])
//     }
//
//     recapData.push(['RÉCAPITULATIF PÉRIODE'])
//     recapData.push(['Indicateur', 'Valeur'])
//     recapData.push(['Jours travaillés',   kpis.workedDays])
//     recapData.push(['Jours de repos',     kpis.restDays])
//     recapData.push(['Total jours',        days.length])
//     recapData.push(['Heures totales',     formatHours(kpis.totalWorkH)])
//     recapData.push(['Heures de pause',    formatHours(kpis.totalPauseH)])
//     recapData.push(['Heures nettes',      formatHours(kpis.netWorkH)])
//     recapData.push(['Membres concernés',  kpis.memberCount])
//     recapData.push([])
//
//     // ── Sheet 3 : Liste des affectations ─────────────────────────────────────
//     const assignData: (string | number | null)[][] = []
//     assignData.push(['LISTE DES AFFECTATIONS'])
//     assignData.push([])
//     assignData.push([
//         'Cible', 'Type', 'Matricule', 'Template',
//         'Début', 'Fin', 'Motif', 'Statut', 'Créée par',
//     ])
//     for (const a of assignments) {
//         assignData.push([
//             getTargetName(a),
//             a.family === 'group' ? 'Groupe' : 'Employé',
//             isUserAssignment(a) ? a.related.employee_code : '—',
//             a.session_template?.name ?? '—',
//             formatDateFR(a.start_date),
//             a.end_date ? formatDateFR(a.end_date) : 'Ouverte',
//             a.reason ?? '—',
//             a.active ? 'Active' : 'Inactive',
//             a.created_by?.name ?? '—',
//         ])
//     }
//
//     const wb = buildWorkbook([
//         { name: 'Planning',       data: planningData, colWidths: planColWidths },
//         { name: 'Récapitulatif',  data: recapData,    colWidths: [30, 20] },
//         { name: 'Affectations',   data: assignData,   colWidths: [25, 10, 12, 25, 12, 12, 25, 10, 20] },
//     ])
//
//     const name     = members[0]?.name ?? 'planning'
//     const filename = buildFilename('planning_standard', name, periodFrom, periodTo, 'xlsx')
//     downloadWorkbook(wb, filename)
// }
//
// // ── Helpers privés ────────────────────────────────────────────────────────────
//
// const DAY_FR: Record<string, string> = {
//     Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Jeu', Fri: 'Ven', Sat: 'Sam', Sun: 'Dim',
// }
//
// function getFirstWorkBlock(tpl: ISessionTemplateInline): string {
//     for (const d of DAY_ORDER) {
//         const b = tpl.definition?.[d]
//         if (b && Array.isArray(b) && b.length > 0) return `${b[0].work[0]} – ${b[0].work[1]}`
//     }
//     return '—'
// }
//
// function getFirstPauseBlock(tpl: ISessionTemplateInline): string {
//     for (const d of DAY_ORDER) {
//         const b = tpl.definition?.[d]
//         if (b && Array.isArray(b) && b.length > 0 && b[0].pause)
//             return `${b[0].pause[0]} – ${b[0].pause[1]}`
//     }
//     return '—'
// }
//
// function getFirstTolerance(tpl: ISessionTemplateInline): string {
//     for (const d of DAY_ORDER) {
//         const b = tpl.definition?.[d]
//         if (b && Array.isArray(b) && b.length > 0) return `${b[0].tolerance} min`
//     }
//     return '—'
// }
//
// function getWorkDays(tpl: ISessionTemplateInline): string {
//     return DAY_ORDER
//         .filter((d) => { const b = tpl.definition?.[d]; return b && Array.isArray(b) && b.length > 0 })
//         .map((d) => DAY_FR[d])
//         .join(' · ')
// }
//
// function getRestDays(tpl: ISessionTemplateInline): string {
//     return DAY_ORDER
//         .filter((d) => { const b = tpl.definition?.[d]; return !b || !Array.isArray(b) || b.length === 0 })
//         .map((d) => DAY_FR[d])
//         .join(' · ')
// }
//
// function getDepartment(a: IScheduleAssignment): string | null {
//     if (isUserAssignment(a)) return a.related.department ?? null
//     if (isGroupAssignment(a)) return null
//     return null
// }
//
// function getJobTitle(a: IScheduleAssignment): string | null {
//     if (isUserAssignment(a)) return a.related.job_title ?? null
//     return null
// }