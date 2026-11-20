// ─────────────────────────────────────────────────────────────────────────────
// utils/exports/rotationAssignment.export.ts
//
// Génère les exports CSV et Excel pour le module Rotations.
//
// Trois feuilles produites :
//   1. "Calendrier"    — grille membre × jour avec le template actif par cellule
//   2. "Assignations"  — tableau d'audit (qui a assigné quoi à qui et quand)
//   3. "Récapitulatif" — KPIs de la période
// ─────────────────────────────────────────────────────────────────────────────

import {
    downloadBlob,
    rowsToCsvBlob,
    downloadWorkbook,
    buildWorkbook,
    buildPeriodDays,
    buildFilename,
    formatDateFR,
    formatDatetimeFR,
    formatHours,
    timeToHours,
    buildPeriodLabel,
    type PeriodDay,
} from './export.helpers'

import {
    getRotationTargetName,
    IRotationAssignment,
    IRotationGroupFull, IRotationTemplateSnapshot,
    isGroupRotationAssignment, isUserRotationAssignment,
    resolveRotationGroup, resolveTemplatePosition
} from "@/views/planning/rotation_assignment/type";


// ── Types internes ────────────────────────────────────────────────────────────

export interface RotationExportOptions {
    /** Assignations à exporter (déjà filtrées par le composant) */
    assignments:      IRotationAssignment[]
    periodFrom:       string   // YYYY-MM-DD
    periodTo:         string   // YYYY-MM-DD
    generatedBy:      string
    tenantName?:      string
}

interface MemberRow {
    guid:   string
    name:   string
    code:   string
    dept:   string
    active: boolean
    /** Assignation dont est issu ce membre */
    assignment: IRotationAssignment
}

// ── Résolution du groupe de rotation ─────────────────────────────────────────

/**
 * Cherche le premier rotation_group complet dans la liste des assignations.
 * Il est disponible uniquement sur les items family === 'group'.
 */
export function resolveFirstFullGroup(assignments: IRotationAssignment[]): IRotationGroupFull | null {
    for (const a of assignments) {
        const rg = resolveRotationGroup(a)
        if (rg) return rg
    }
    return null
}

// ── Construction des membres ──────────────────────────────────────────────────

export function buildMemberRows(assignments: IRotationAssignment[]): MemberRow[] {
    const rows: MemberRow[] = []
    const seen = new Set<string>()

    for (const a of assignments) {
        if (isGroupRotationAssignment(a)) {
            for (const m of a.related.members.items) {
                if (!seen.has(m.user.guid)) {
                    seen.add(m.user.guid)
                    rows.push({
                        guid:       m.user.guid,
                        name:       `${m.user.first_name} ${m.user.last_name}`.trim(),
                        code:       m.user.employee_code ?? '',
                        dept:       m.user.department ?? '',
                        active:     m.user.active,
                        assignment: a,
                    })
                }
            }
        } else if (isUserRotationAssignment(a)) {
            if (!seen.has(a.related.guid)) {
                seen.add(a.related.guid)
                rows.push({
                    guid:       a.related.guid,
                    name:       `${a.related.first_name} ${a.related.last_name}`.trim(),
                    code:       a.related.employee_code ?? '',
                    dept:       a.related.department ?? '',
                    active:     a.related.active,
                    assignment: a,
                })
            }
        }
    }

    return rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

// ── Résolution du template pour un jour donné ─────────────────────────────────

interface RotationDayCell {
    templateName: string
    work:         string
    pause:        string
    hasWork:      boolean
    /** position dans le cycle (0-based) */
    position:     number
}

export function resolveRotationDayCell(
    rg:         IRotationGroupFull,
    assignment: IRotationAssignment,
    day:        PeriodDay,
): RotationDayCell {
    const position = resolveTemplatePosition(
        rg.start_date,
        day.iso,
        assignment.offset,
        rg.cycle_length,
        rg.direction,
        rg.rotation_step,
    )

    const ct = rg.cycle_templates.find((t) => t.position === position)
    if (!ct) return { templateName: '—', work: '—', pause: '', hasWork: false, position }

    const blocks = ct.template_snapshot.definition[day.dayKey as keyof IRotationTemplateSnapshot['definition']]
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
        return { templateName: ct.template_snapshot.name, work: '—', pause: '', hasWork: false, position }
    }

    const b = blocks[0]
    return {
        templateName: ct.template_snapshot.name,
        work:         `${b.work[0]} – ${b.work[1]}`,
        pause:        b.pause ? `${b.pause[0]} – ${b.pause[1]}` : '',
        hasWork:      true,
        position,
    }
}

// ── Calcul KPIs ───────────────────────────────────────────────────────────────

interface RotationKPIs {
    workedDays:         number
    offDays:            number
    estimatedTotalH:    number
    avgHPerDay:         number
    memberCount:        number
    /** répartition : templateName → nombre de jours */
    templateDistrib:    Record<string, number>
}

export function computeRotationKPIs(
    members:     MemberRow[],
    days:        PeriodDay[],
    rg:          IRotationGroupFull | null,
): RotationKPIs {
    if (!rg || members.length === 0) {
        return { workedDays: 0, offDays: days.length, estimatedTotalH: 0, avgHPerDay: 0, memberCount: members.length, templateDistrib: {} }
    }

    const firstAssignment = members[0].assignment
    let workedDays = 0
    let totalH     = 0
    const distrib: Record<string, number> = {}

    for (const d of days) {
        const cell = resolveRotationDayCell(rg, firstAssignment, d)
        if (cell.hasWork) {
            workedDays++
            distrib[cell.templateName] = (distrib[cell.templateName] ?? 0) + 1
            // Calculer les heures du template actif
            const ct = rg.cycle_templates.find((t) => t.position === cell.position)
            if (ct) {
                const blocks = ct.template_snapshot.definition[d.dayKey as keyof IRotationTemplateSnapshot['definition']]
                if (blocks && Array.isArray(blocks) && blocks.length > 0) {
                    const b = blocks[0]
                    totalH += timeToHours(b.work[1]) - timeToHours(b.work[0])
                    if (b.pause) totalH -= timeToHours(b.pause[1]) - timeToHours(b.pause[0])
                }
            }
        }
    }

    return {
        workedDays,
        offDays:          days.length - workedDays,
        estimatedTotalH:  totalH,
        avgHPerDay:       workedDays > 0 ? totalH / workedDays : 0,
        memberCount:      members.length,
        templateDistrib:  distrib,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ── EXPORT CSV ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export function exportRotationCSV(options: RotationExportOptions): void {
    const { assignments, periodFrom, periodTo, generatedBy, tenantName } = options
    const days    = buildPeriodDays(periodFrom, periodTo)
    const members = buildMemberRows(assignments)
    const rg      = resolveFirstFullGroup(assignments)
    const kpis    = computeRotationKPIs(members, days, rg)

    const rows: (string | number | null)[][] = []

    // ── Méta ──
    rows.push(['EXPORT DES ROTATIONS — TOKÉ'])
    rows.push([tenantName ?? ''])
    rows.push([`Période : ${buildPeriodLabel(periodFrom, periodTo)}`])
    rows.push([`Généré le : ${new Date().toLocaleString('fr-FR')}   |   Par : ${generatedBy}`])
    rows.push([])

    // ── Infos groupe de rotation ──
    if (rg) {
        rows.push(['GROUPE DE ROTATION'])
        rows.push(['Nom',          rg.name])
        rows.push(['Cycle',        `${rg.cycle_length} ${rg.cycle_unit === 'day' ? 'jour(s)' : 'semaine(s)'}`])
        rows.push(['Direction',    rg.direction === 'forward' ? 'Avant (Forward)' : 'Arrière (Backward)'])
        rows.push(['Auto-avance',  rg.auto_advance ? 'Oui' : 'Non'])
        rows.push(['Rotation step',rg.rotation_step])
        rows.push(['Début',        formatDateFR(rg.start_date)])
        rows.push([])
        rows.push(['TEMPLATES DU CYCLE'])
        rows.push(['Position', 'Nom', 'Horaires', 'Pause', 'Tolérance'])
        for (const ct of rg.cycle_templates) {
            rows.push([
                ct.position + 1,
                ct.template_snapshot.name,
                getFirstWorkBlock(ct.template_snapshot),
                getFirstPauseBlock(ct.template_snapshot),
                getFirstTolerance(ct.template_snapshot),
            ])
        }
        rows.push([])
    }

    // ── Section 1 : Calendrier rotation (grille membre × jour) ──
    rows.push(['CALENDRIER DE ROTATION'])
    rows.push([])

    // En-tête
    const header: string[]    = ['Matricule', 'Nom', 'Département']
    const subHeader: string[] = ['', '', '']
    for (const d of days) {
        header.push(d.label)
        header.push('')
        subHeader.push('Template')
        subHeader.push('Horaires')
    }
    rows.push(header)
    rows.push(subHeader)

    // Lignes membres
    for (const m of members) {
        const row: (string | null)[] = [m.code, m.name, m.dept]
        for (const d of days) {
            if (rg) {
                const cell = resolveRotationDayCell(rg, m.assignment, d)
                row.push(cell.hasWork ? cell.templateName : '—')
                row.push(cell.hasWork ? cell.work : '')
            } else {
                row.push('—'); row.push('')
            }
        }
        rows.push(row)
    }

    rows.push([])

    // ── Section 2 : Tableau d'audit des assignations ──
    rows.push(['HISTORIQUE DES ASSIGNATIONS'])
    rows.push([])
    rows.push(['Cible', 'Type', 'Rotation Group', 'Offset', 'Assignée par', 'Date d\'assignation', 'Statut'])
    for (const a of assignments) {
        rows.push([
            getRotationTargetName(a),
            a.family === 'group' ? 'Groupe' : 'Employé',
            a.rotation_group.name,
            a.offset,
            a.assigned_by.name,
            formatDatetimeFR(a.assigned_at),
            a.active ? 'Active' : 'Inactive',
        ])
    }

    rows.push([])

    // ── Section 3 : Récapitulatif ──
    rows.push(['RÉCAPITULATIF PÉRIODE'])
    rows.push(['Jours travaillés (au moins 1 shift)', kpis.workedDays])
    rows.push(['Jours off (aucun shift)',              kpis.offDays])
    rows.push(['Heures totales (nettes, estimation)',  formatHours(kpis.estimatedTotalH)])
    rows.push(['Moyenne par jour',                     formatHours(kpis.avgHPerDay)])
    rows.push(['Membres concernés',                    kpis.memberCount])
    rows.push([])
    rows.push(['RÉPARTITION PAR TEMPLATE'])
    rows.push(['Template', 'Jours', '% de la période'])
    const totalDays = days.length || 1
    for (const [name, count] of Object.entries(kpis.templateDistrib)) {
        rows.push([name, count, `${Math.round((count / totalDays) * 100)} %`])
    }

    const blob     = rowsToCsvBlob(rows)
    const label    = rg?.name ?? (members[0]?.name ?? 'rotation')
    const filename = buildFilename('rotations', label, periodFrom, periodTo, 'csv')
    downloadBlob(blob, filename)
}

// ─────────────────────────────────────────────────────────────────────────────
// ── EXPORT EXCEL ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export function exportRotationExcel(options: RotationExportOptions): void {
    const { assignments, periodFrom, periodTo, generatedBy, tenantName } = options
    const days    = buildPeriodDays(periodFrom, periodTo)
    const members = buildMemberRows(assignments)
    const rg      = resolveFirstFullGroup(assignments)
    const kpis    = computeRotationKPIs(members, days, rg)

    // ── Sheet 1 : Calendrier ─────────────────────────────────────────────────
    const calData: (string | number | null)[][] = []

    calData.push([`Calendrier de Rotation — ${tenantName ?? 'TOKÉ'}`])
    calData.push([`Rotation : ${rg?.name ?? '—'}  ·  Cycle : ${rg ? `${rg.cycle_length} ${rg.cycle_unit === 'day' ? 'jour(s)' : 'semaine(s)'}` : '—'}  ·  Direction : ${rg?.direction === 'forward' ? 'Forward' : 'Backward'}`])
    calData.push([`Période : ${buildPeriodLabel(periodFrom, periodTo)}  ·  Généré le ${new Date().toLocaleString('fr-FR')} par ${generatedBy}`])
    calData.push([])

    // Offset info
    const firstAssignment = assignments[0]
    if (firstAssignment && rg) {
        const startTemplate = rg.cycle_templates.find((ct) => ct.position === firstAssignment.offset - 1)
        calData.push([`Offset appliqué : ${firstAssignment.offset} — Le cycle démarre au template : ${startTemplate?.template_snapshot.name ?? '?'}`])
        calData.push([])
    }

    // En-tête + sous-en-tête
    const header: string[]    = ['Matricule', 'Nom', 'Département', 'Poste']
    const subHeader: string[] = ['', '', '', '']
    for (const d of days) {
        header.push(d.label); header.push('')
        subHeader.push('Template'); subHeader.push('Horaires')
    }
    calData.push(header)
    calData.push(subHeader)

    // Lignes
    for (const m of members) {
        const row: (string | null)[] = [
            m.code, m.name, m.dept,
            isUserRotationAssignment(m.assignment) ? m.assignment.related.job_title ?? '' : '',
        ]
        for (const d of days) {
            if (rg) {
                const cell = resolveRotationDayCell(rg, m.assignment, d)
                row.push(cell.hasWork ? cell.templateName : '—')
                row.push(cell.hasWork ? cell.work : '')
            } else {
                row.push('—'); row.push('')
            }
        }
        calData.push(row)
    }

    const calColWidths = [12, 25, 18, 18]
    for (let i = 0; i < days.length; i++) calColWidths.push(22, 16)

    // ── Sheet 2 : Assignations (audit) ───────────────────────────────────────
    const auditData: (string | number | null)[][] = []

    auditData.push([`Historique des Assignations — ${tenantName ?? 'TOKÉ'}`])
    auditData.push([`Période : ${buildPeriodLabel(periodFrom, periodTo)}`])
    auditData.push([])
    auditData.push(['Cible', 'Type', 'Rotation Group', 'Offset', 'Template de départ', 'Assignée par', 'Date d\'assignation', 'Statut'])

    for (const a of assignments) {
        const startTpl = rg?.cycle_templates.find((ct) => ct.position === a.offset - 1)?.template_snapshot.name ?? '—'
        auditData.push([
            getRotationTargetName(a),
            a.family === 'group' ? 'Groupe' : 'Employé',
            a.rotation_group.name,
            a.offset,
            startTpl,
            a.assigned_by.name,
            formatDatetimeFR(a.assigned_at),
            a.active ? 'Active' : 'Inactive',
        ])
    }

    // ── Sheet 3 : Récapitulatif ───────────────────────────────────────────────
    const recapData: (string | number | null)[][] = []

    recapData.push([`Récapitulatif — ${buildPeriodLabel(periodFrom, periodTo)}`])
    recapData.push([])

    // Infos groupe
    if (rg) {
        recapData.push(['GROUPE DE ROTATION'])
        recapData.push(['Nom',           rg.name])
        recapData.push(['Cycle',         `${rg.cycle_length} ${rg.cycle_unit === 'day' ? 'jour(s)' : 'semaine(s)'}`])
        recapData.push(['Direction',     rg.direction === 'forward' ? 'Forward' : 'Backward'])
        recapData.push(['Auto-avance',   rg.auto_advance ? 'Oui' : 'Non'])
        recapData.push(['Rotation step', rg.rotation_step])
        recapData.push(['Démarré le',    formatDateFR(rg.start_date)])
        recapData.push([])
        recapData.push(['TEMPLATES DU CYCLE'])
        recapData.push(['Pos.', 'Nom', 'Horaires', 'Pause', 'Tolérance'])
        for (const ct of rg.cycle_templates) {
            recapData.push([
                ct.position + 1,
                ct.template_snapshot.name,
                getFirstWorkBlock(ct.template_snapshot),
                getFirstPauseBlock(ct.template_snapshot),
                getFirstTolerance(ct.template_snapshot),
            ])
        }
        recapData.push([])
    }

    recapData.push(['INDICATEURS DE PÉRIODE'])
    recapData.push(['Indicateur', 'Valeur'])
    recapData.push(['Jours travaillés (au moins 1 shift)', kpis.workedDays])
    recapData.push(['Jours off (aucun shift)',              kpis.offDays])
    recapData.push(['Total jours analysés',                days.length])
    recapData.push(['Heures totales estimées (nettes)',    formatHours(kpis.estimatedTotalH)])
    recapData.push(['Moyenne par jour travaillé',          formatHours(kpis.avgHPerDay)])
    recapData.push(['Membres concernés',                   kpis.memberCount])
    recapData.push([])
    recapData.push(['RÉPARTITION PAR TEMPLATE'])
    recapData.push(['Template', 'Nombre de jours', '% de la période'])
    const totalDays = days.length || 1
    for (const [name, count] of Object.entries(kpis.templateDistrib)) {
        recapData.push([name, count, `${Math.round((count / totalDays) * 100)} %`])
    }

    const wb = buildWorkbook([
        { name: 'Calendrier',    data: calData,   colWidths: calColWidths },
        { name: 'Assignations',  data: auditData, colWidths: [25, 10, 20, 8, 25, 20, 20, 10] },
        { name: 'Récapitulatif', data: recapData, colWidths: [35, 20, 15] },
    ])

    const label    = rg?.name ?? (members[0]?.name ?? 'rotation')
    const filename = buildFilename('rotations', label, periodFrom, periodTo, 'xlsx')
    downloadWorkbook(wb, filename)
}

// ── Helpers privés ────────────────────────────────────────────────────────────

const DAY_ORDER = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as const

function getFirstWorkBlock(tpl: IRotationTemplateSnapshot): string {
    for (const d of DAY_ORDER) {
        const b = tpl.definition?.[d]
        if (b && Array.isArray(b) && b.length > 0) return `${b[0].work[0]} – ${b[0].work[1]}`
    }
    return '—'
}

function getFirstPauseBlock(tpl: IRotationTemplateSnapshot): string {
    for (const d of DAY_ORDER) {
        const b = tpl.definition?.[d]
        if (b && Array.isArray(b) && b.length > 0 && b[0].pause)
            return `${b[0].pause[0]} – ${b[0].pause[1]}`
    }
    return '—'
}

function getFirstTolerance(tpl: IRotationTemplateSnapshot): string {
    for (const d of DAY_ORDER) {
        const b = tpl.definition?.[d]
        if (b && Array.isArray(b) && b.length > 0) return `${b[0].tolerance} min`
    }
    return '—'
}