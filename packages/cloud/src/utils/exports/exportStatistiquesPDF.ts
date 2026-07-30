import jsPDF from 'jspdf'
import autoTable, { type CellDef, type RowInput } from 'jspdf-autotable'

import { buildPeriodLabel, formatDateFR } from './export.helpers'

import type {AbnormalSessionStatus, Summary, TransformedEmployee} from '@/utils/interfaces/stat.interface'

// ── Palette (identique aux autres exports du projet) ──────────────────────────

const C = {
    primary  : [0,   74,  173] as [number, number, number],
    primaryDk: [0,   52,  120] as [number, number, number],
    white    : [255, 255, 255] as [number, number, number],
    muted    : [107, 114, 128] as [number, number, number],
    line     : [229, 231, 235] as [number, number, number],
    rowAlt   : [249, 250, 251] as [number, number, number],
    dark     : [30,  30,  50]  as [number, number, number],
    // Statuts
    present  : [34,  197, 94]  as [number, number, number],   // emerald-500
    presentBg: [209, 250, 229] as [number, number, number],   // emerald-100
    late     : [245, 158, 11]  as [number, number, number],   // amber-500
    lateBg   : [254, 243, 199] as [number, number, number],   // amber-100
    absent   : [239, 68,  68]  as [number, number, number],   // red-500
    absentBg : [254, 226, 226] as [number, number, number],   // red-100
    anomaly  : [249, 115, 22]  as [number, number, number],   // orange-500
    anomalyBg: [255, 237, 213] as [number, number, number],   // orange-100
    offday   : [203, 213, 225] as [number, number, number],   // slate-300
    offdayBg : [241, 245, 249] as [number, number, number],   // slate-100
    // Accent synthèse
    gold     : [180, 130, 20]  as [number, number, number],
    goldBg   : [254, 249, 195] as [number, number, number],
}

// ── Constantes mise en page ────────────────────────────────────────────────────

const MARGIN      = 10
const HEADER_ZONE = 26   // mm — bandeau (14mm) + sous-titre (20mm) + filtres (23.5mm) + marge
const FOOTER_ZONE = 12   // mm
const GAP         = 8    // mm entre sections

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailyBreakdown {
    date            : string
    day_of_week     : string
    expected_count  : number
    present         : number
    late            : number
    absent          : number
    off_day         : number
    anomaly_off_day : number
}

export interface StatistiquesExportOptions {
    summary       : Summary
    employees     : TransformedEmployee[]
    dailyBreakdown: DailyBreakdown[]
    periodFrom    : string        // YYYY-MM-DD
    periodTo      : string        // YYYY-MM-DD
    generatedBy   : string        // nom du manager
    tenantName?   : string        // nom de l'organisation
}

// ── Helpers formatage ──────────────────────────────────────────────────────────

function fmtHours(total: number): string {
    const h = Math.floor(total)
    const m = Math.round((total - h) * 60)
    if (h === 0 && m === 0) return '0h 00m'
    if (m === 0) return `${h}h 00m`
    return `${h}h ${String(m).padStart(2, '0')}m`
}

function fmtRate(rate: number): string {
    return `${Math.round(rate)}%`
}

function fmtDelay(minutes: number): string {
    if (!minutes || minutes <= 0) return '—'
    if (minutes < 60) return `${Math.round(minutes)} min`
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function generateReportRef(): string {
    const now    = new Date()
    const date   = now.toISOString().slice(0, 10).replace(/-/g, '')
    const suffix = String(Math.floor(Math.random() * 999999)).padStart(6, '0')
    return `ATT-${date}-${suffix}`
}

function dayOfWeekFR(iso: string): string {
    return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' })
}

// ── Calculs synthèse ──────────────────────────────────────────────────────────

interface SyntheseDecisionnelle {
    bestPresence    : { name: string; rate: number } | null
    worstPresence   : { name: string; rate: number } | null
    mostLate        : { name: string; days: number } | null
    bestPunctuality : { name: string; rate: number } | null
    totalHours      : number
    bestDay         : { date: string; present: number; rate: number } | null
    worstDay        : { date: string; absent: number }  | null
    totalAnomalies  : number
    plannedEmployeesCount: number
}

function computeSynthese(
    employees     : TransformedEmployee[],
    dailyBreakdown: DailyBreakdown[],
    summary       : Summary,
): SyntheseDecisionnelle {
    const active = employees.filter(e => e.period_stats?.work_days_expected > 0)

    // Tri par taux de présence
    const byPresence = [...active].sort(
        (a, b) => (b.period_stats?.attendance_rate ?? 0) - (a.period_stats?.attendance_rate ?? 0)
    )

    // Tri par retards
    const byLate = [...active].sort(
        (a, b) => (b.period_stats?.late_days ?? 0) - (a.period_stats?.late_days ?? 0)
    )

    const employeesWithPresence = active.filter(
        e =>
            (e.period_stats?.present_days ?? 0) +
            (e.period_stats?.late_days ?? 0) > 0
    )

    // Tri par ponctualité
    const byPunctuality = [...employeesWithPresence].sort(
        (a, b) => (b.period_stats?.punctuality_rate ?? 0) - (a.period_stats?.punctuality_rate ?? 0)
    )

    // Meilleur / pire jour
    const workdays = dailyBreakdown.filter(d => d.expected_count > 0)

    const daysWithPresence = workdays.filter(d => (d.present + d.late) > 0)

    const bestDay = daysWithPresence.length > 0
        ? [...daysWithPresence].sort((a, b) => (b.present + b.late) - (a.present + a.late))[0]
        : null

    const worstDay = workdays.length > 0
        ? [...workdays].sort((a, b) => b.absent - a.absent)[0]
        : null

    return {
        bestPresence: byPresence[0] &&
            (byPresence[0].period_stats?.attendance_rate ?? 0) > 0
                ? { name: byPresence[0].name, rate: byPresence[0].period_stats?.attendance_rate ?? 0, }
                : null,
        worstPresence  : byPresence[byPresence.length - 1] && active.length > 1
            ? { name: byPresence[byPresence.length - 1].name, rate: byPresence[byPresence.length - 1].period_stats?.attendance_rate ?? 0 }
            : null,
        mostLate       : byLate[0] && (byLate[0].period_stats?.late_days ?? 0) > 0
            ? { name: byLate[0].name, days: byLate[0].period_stats?.late_days ?? 0 }
            : null,
        bestPunctuality: byPunctuality[0]
            ? { name: byPunctuality[0].name, rate: byPunctuality[0].period_stats?.punctuality_rate ?? 0 }
            : null,
        totalHours     : summary.total_work_hours ?? 0,
        bestDay        : bestDay
            ? {
                date   : bestDay.date,
                present: bestDay.present + bestDay.late,
                rate   : bestDay.expected_count > 0
                    ? Math.round(((bestDay.present + bestDay.late) / bestDay.expected_count) * 100)
                    : 0,
            }
            : null,
        worstDay       : worstDay && worstDay.absent > 0
            ? { date: worstDay.date, absent: worstDay.absent }
            : null,
        totalAnomalies : summary.total_anomaly_off_days ?? 0,
        plannedEmployeesCount: active.length,
    }
}

export function formatTimeISO(value?: string | null): string {
    if (!value) return '—'

    const match = value.match(/(?:T|^)(\d{2}):(\d{2})/)

    if (!match) return '—'

    return `${match[1]}:${match[2]}`
}

// ─────────────────────────────────────────────────────────────────────────────
// ── EXPORT PRINCIPAL ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export function exportStatistiquesPDF(options: StatistiquesExportOptions): void {
    const { summary, employees, dailyBreakdown, periodFrom, periodTo, generatedBy, tenantName } = options

    const reportRef   = generateReportRef()
    const generatedAt = new Date().toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })

    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()    // 297 mm
    const pageH = doc.internal.pageSize.getHeight()   // 210 mm
    const CONTENT = pageW - MARGIN * 2                // 277 mm

    // ── Taux calculés (mêmes formules que dashboardHero) ─────────────────────
    const totalPresent   = (summary.total_present_on_time ?? 0) + (summary.total_late_arrivals ?? 0)
    const hasPlannedPresence = totalPresent > 0
    const attendanceRate = summary.total_expected_workdays > 0
        ? Math.round((totalPresent / summary.total_expected_workdays) * 100)
        : 0
    const punctualityRate = hasPlannedPresence ? Math.round(((summary.total_present_on_time ?? 0) / totalPresent) * 100) : null

    // ── Synthèse décisionnelle ────────────────────────────────────────────────
    const synthese = computeSynthese(employees, dailyBreakdown, summary)

    // ── Employés triés par taux de présence décroissant ───────────────────────
    const sortedEmployees = [...employees]
        .filter(e => e.period_stats?.work_days_expected > 0)
        .sort((a, b) => (b.period_stats?.attendance_rate ?? 0) - (a.period_stats?.attendance_rate ?? 0))

    // ── Anomalies disponibles ─────────────────────────────────────────────────
    const anomalies = summary.unexpected_presence?.occurrences ?? []

    const totalAnomalies =
        summary.total_anomaly_off_days ?? anomalies.length

    const displayedAnomalies = anomalies.length

    const hasAnomalies = totalAnomalies > 0

    // ── Sessions anormales ─────────────────────────────────────────────────────
    const abnormalSessions =
        summary.session_analysis?.abnormal_sessions ?? []

    const tooShortCount = abnormalSessions.filter(
        session => session.status === 'too_short',
    ).length

    const tooLongCount = abnormalSessions.filter(
        session => session.status === 'too_long',
    ).length

    const incompleteCount = abnormalSessions.filter(
        session => session.status === 'incomplete',
    ).length

    const hasAbnormalSessions = abnormalSessions.length > 0

    // ═════════════════════════════════════════════════════════════════════════
    // ── FONCTIONS COMMUNES ────────────────────────────────────────────────────
    // ═════════════════════════════════════════════════════════════════════════

    // Bandeau en-tête — répété sur chaque page via didDrawPage
    function drawPageHeader() {
        doc.setFillColor(...C.primaryDk)
        doc.rect(0, 0, pageW, 14, 'F')

        doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...C.white)
        doc.text('Toke Attendance — Rapport de statistiques de presence', MARGIN, 9.5)

        if (tenantName) {
            doc.setFont('helvetica', 'normal').setFontSize(8)
            doc.text(tenantName, pageW - MARGIN, 9.5, { align: 'right' })
        }

        doc.setTextColor(...C.muted).setFontSize(7).setFont('helvetica', 'normal')
        const meta = [
            `Periode : ${buildPeriodLabel(periodFrom, periodTo)}`,
            `${summary.total_team_members} employe(s)`,
            `Ref : ${reportRef}`,
            `Genere le ${generatedAt} par ${generatedBy}`,
        ].join('   .   ')
        doc.text(meta, MARGIN, 20)
    }

    // Pied de page — injecté en post-processing sur toutes les pages
    function drawAllFooters() {
        const total = (doc as any).internal.getNumberOfPages()
        for (let i = 1; i <= total; i++) {
            doc.setPage(i)
            doc.setDrawColor(...C.line).setLineWidth(0.3)
            doc.line(MARGIN, pageH - 7, pageW - MARGIN, pageH - 7)
            doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...C.muted)
            doc.text(
                `Toke Attendance   .   ${reportRef}   .   Confidentiel - Usage interne   .   Page ${i} / ${total}`,
                pageW / 2, pageH - 3.5, { align: 'center' },
            )
        }
    }

    // Titre de section (x optionnel pour les colonnes côte à côte)
    function drawSectionTitle(label: string, y: number, x: number = MARGIN): void {
        doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...C.primary)
        doc.text(label, x, y)
    }

    // Cellule colorée selon statut
    function statusCell(value: string | number, type: 'present' | 'late' | 'absent' | 'anomaly' | 'offday' | 'neutral'): CellDef {
        const colors: Record<string, { bg: [number,number,number]; text: [number,number,number] }> = {
            present: { bg: C.presentBg, text: C.present },
            late    : { bg: C.lateBg,    text: C.late    },
            absent  : { bg: C.absentBg,  text: C.absent  },
            anomaly : { bg: C.anomalyBg, text: C.anomaly },
            offday  : { bg: C.offdayBg,  text: C.offday  },
            neutral : { bg: C.white,     text: C.dark    },
        }
        const { bg, text } = colors[type]
        return {
            content: String(value),
            styles : {
                fillColor : bg,
                textColor : text,
                fontStyle : type !== 'neutral' ? 'bold' : 'normal',
                halign    : 'center',
            },
        }
    }

    function getSessionStatusLabel(
        status: AbnormalSessionStatus,
    ): string {
        const labels: Record<AbnormalSessionStatus, string> = {
            too_short: 'Durée trop courte',
            too_long: 'Durée trop longue',
            incomplete: 'Session incomplète',
        }

        return labels[status]
    }

    function getSessionStatusType(
        status: AbnormalSessionStatus,
    ): 'late' | 'absent' | 'anomaly' {
        if (status === 'too_short') return 'late'
        if (status === 'too_long') return 'anomaly'
        return 'absent'
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ── PAGE 1 : VUE D'ENSEMBLE ───────────────────────────────────────────────
    // ═════════════════════════════════════════════════════════════════════════

    drawPageHeader()
    let curY = HEADER_ZONE

    // Ajouter le taux de présence actuelle de l’équipe
    const currentlyPresent = summary.team_coverage?.currently_present ?? 0
    const totalTeamMembers = summary.total_team_members ?? 0

    const currentTeamPresenceRate = totalTeamMembers > 0
        ? Math.round((currentlyPresent / totalTeamMembers) * 100)
        : 0

    // ── Section A : 6 KPI cards ───────────────────────────────────────────────

    drawSectionTitle('VUE D\'ENSEMBLE DE LA PERIODE', curY + 4)
    curY += 9

    const kpis: { label: string; value: string; sub: string; alert?: boolean }[] = [
        {
            label: 'Taux de presence',
            value: fmtRate(attendanceRate),
            sub  : `${totalPresent} / ${summary.total_expected_workdays} journ.`,
            alert: attendanceRate < 80,
        },
        {
            label: 'Ponctualite',
            value: punctualityRate !== null ? fmtRate(punctualityRate) : 'N/C',
            sub: punctualityRate !== null ? `Retard moy. : ${fmtDelay(summary.average_delay_minutes)}` : 'Aucune presence planifiee',
            alert: punctualityRate !== null && punctualityRate < 70,
        },
        {
            label: 'Absences',
            value: String(summary.total_absences ?? 0),
            sub  : `${summary.justification_status?.without_memo ?? 0} sans memo`,
            alert: (summary.total_absences ?? 0) > 0,
        },
        {
            label: 'Hors planning',
            value: String(summary.total_anomaly_off_days ?? 0),
            sub  : `${summary.unexpected_presence?.employees_concerned ?? 0} employe(s)`,
            alert: (summary.total_anomaly_off_days ?? 0) > 0,
        },
        {
            label: 'Couverture du planning',
            value: fmtRate(summary.team_coverage?.coverage_rate ?? 0),
            sub: `${summary.team_coverage?.currently_present ?? 0} présent(s) / ${
                summary.team_coverage?.expected_today ?? 0
            } attendu(s)`,
            alert: (summary.team_coverage?.coverage_rate ?? 0) < 100,
        },
        {
            label: 'Heures enregistrees',
            value: fmtHours(summary.total_work_hours ?? 0),
            sub: `${summary.session_analysis?.total_sessions ?? 0} session(s) · ` +
                `moy. ${fmtHours(
                    summary.session_analysis?.avg_duration_hours ?? 0
                )}`,
            alert: false,
        },
        {
            label: 'Equipe actuellement presente',
            value: fmtRate(currentTeamPresenceRate),
            sub: `${currentlyPresent} présent(s) / ${totalTeamMembers} employé(s)`,
            alert: currentTeamPresenceRate < 50,
        },
    ]

    const cardW = (CONTENT - 5 * 3) / 7
    const cardH = 22

    kpis.forEach((kpi, i) => {
        const x  = MARGIN + i * (cardW + 3)
        const bg = kpi.alert ? C.absentBg : C.offdayBg

        doc.setFillColor(...bg)
        doc.roundedRect(x, curY, cardW, cardH, 1.5, 1.5, 'F')
        doc.setDrawColor(...C.line).setLineWidth(0.25)
        doc.roundedRect(x, curY, cardW, cardH, 1.5, 1.5, 'S')

        // Label
        doc.setFont('helvetica', 'bold').setFontSize(5.5)
        doc.setTextColor(...C.muted)
        doc.text(kpi.label.toUpperCase(), x + cardW / 2, curY + 5, { align: 'center', maxWidth: cardW - 2 })

        // Valeur
        const isLongValue = kpi.value.length > 5
        doc.setFont('helvetica', 'bold').setFontSize(isLongValue ? 10 : 14)
        doc.setTextColor(kpi.alert ? C.absent[0] : C.dark[0], kpi.alert ? C.absent[1] : C.dark[1], kpi.alert ? C.absent[2] : C.dark[2])
        doc.text(kpi.value, x + cardW / 2, curY + 14, { align: 'center' })

        // Sous-label
        doc.setFont('helvetica', 'normal').setFontSize(5).setTextColor(...C.muted)
        doc.text(kpi.sub, x + cardW / 2, curY + 19.5, { align: 'center', maxWidth: cardW - 2 })
    })

    curY += cardH + GAP

    // ── Section B : Répartition statuts + Justifications (côte à côte) ────────

    const halfW = (CONTENT - GAP) / 2

    // Calcul des positions côte à côte — défini avant les titres
    const justY = curY + 6
    const justX = MARGIN + halfW + GAP


    // Add new Justifications (côté droit)
    const justif = summary.justification_status ?? {
        total_absences: 0,
        with_memo: 0,
        without_memo: 0,
        pending_validation: 0,
        approved: 0,
        rejected: 0,
    }

    const memoCountIsConsistent =
        (justif.with_memo ?? 0) + (justif.without_memo ?? 0)
        === (justif.total_absences ?? 0)

    const validationCountIsConsistent =
        (justif.pending_validation ?? 0)
        + (justif.approved ?? 0)
        + (justif.rejected ?? 0)
        <= (justif.with_memo ?? 0)

    const justificationDataIsReliable =
        memoCountIsConsistent && validationCountIsConsistent

    // Titres des deux sections (positionnés correctement gauche / droite)
    drawSectionTitle('REPARTITION DES STATUTS',    curY + 4, MARGIN)
    drawSectionTitle(
        justificationDataIsReliable
            ? 'JUSTIFICATIONS DES ABSENCES' : 'CONTROLE DES JUSTIFICATIONS',
        curY + 4, justX,
    )

    const repartitionBody: RowInput[] = [
        [
            { content: 'A l\'heure',    styles: { fillColor: C.presentBg, textColor: C.present, fontStyle: 'bold' } },
            { content: String(summary.total_present_on_time ?? 0), styles: { halign: 'center', fontStyle: 'bold', fillColor: C.presentBg, textColor: C.present } },
            { content: fmtRate(summary.total_expected_workdays > 0 ? Math.round(((summary.total_present_on_time ?? 0) / summary.total_expected_workdays) * 100) : 0), styles: { halign: 'center', fillColor: C.presentBg, textColor: C.present } },
        ],
        [
            { content: 'En retard',     styles: { fillColor: C.lateBg,    textColor: C.late,    fontStyle: 'bold' } },
            { content: String(summary.total_late_arrivals ?? 0),   styles: { halign: 'center', fontStyle: 'bold', fillColor: C.lateBg, textColor: C.late } },
            { content: fmtRate(summary.total_expected_workdays > 0 ? Math.round(((summary.total_late_arrivals ?? 0) / summary.total_expected_workdays) * 100) : 0),   styles: { halign: 'center', fillColor: C.lateBg, textColor: C.late } },
        ],
        [
            { content: 'Absents',       styles: { fillColor: C.absentBg,  textColor: C.absent,  fontStyle: 'bold' } },
            { content: String(summary.total_absences ?? 0),         styles: { halign: 'center', fontStyle: 'bold', fillColor: C.absentBg, textColor: C.absent } },
            { content: fmtRate(summary.total_expected_workdays > 0 ? Math.round(((summary.total_absences ?? 0) / summary.total_expected_workdays) * 100) : 0),         styles: { halign: 'center', fillColor: C.absentBg, textColor: C.absent } },
        ],
        [
            { content: 'Jour OFF',      styles: { fillColor: C.offdayBg,  textColor: C.offday               } },
            { content: String(summary.total_off_days ?? 0),          styles: { halign: 'center', fillColor: C.offdayBg, textColor: C.offday } },
            { content: '—',                                           styles: { halign: 'center', fillColor: C.offdayBg, textColor: C.offday } },
        ],
        [
            { content: 'Hors planning', styles: { fillColor: C.anomalyBg, textColor: C.anomaly, fontStyle: 'bold' } },
            { content: String(summary.total_anomaly_off_days ?? 0),  styles: { halign: 'center', fontStyle: 'bold', fillColor: C.anomalyBg, textColor: C.anomaly } },
            { content: fmtRate(summary.total_expected_workdays > 0 ? Math.round(((summary.total_anomaly_off_days ?? 0) / summary.total_expected_workdays) * 100) : 0),  styles: { halign: 'center', fillColor: C.anomalyBg, textColor: C.anomaly } },
        ],
    ]

    autoTable(doc, {
        startY        : curY + 6,
        margin        : { top: HEADER_ZONE, left: MARGIN, right: MARGIN + halfW + GAP, bottom: FOOTER_ZONE },
        head          : [['Statut', 'Nb journees', 'Part (%)']],
        body          : repartitionBody,
        theme         : 'grid',
        styles        : { fontSize: 8, cellPadding: 2.5, font: 'helvetica', textColor: C.dark, lineColor: C.line, lineWidth: 0.2 },
        headStyles    : { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles  : {
            0: { cellWidth: halfW * 0.45 },
            1: { cellWidth: halfW * 0.27, halign: 'center' },
            2: { cellWidth: halfW * 0.28, halign: 'center' },
        },
        didDrawPage: () => { drawPageHeader() },
    })

    // Justifications (côté droit)

    const justifBody: RowInput[] = justificationDataIsReliable
        ? [
            [{ content: 'Total absences' }, {content: String(justif.total_absences ?? 0), styles: { halign: 'center', fontStyle: 'bold' },},],
            [{ content: 'Avec mémo' }, {content: String(justif.with_memo ?? 0), styles: {halign: 'center', fillColor: C.presentBg, textColor: C.present, fontStyle: 'bold',},},],
            [{ content: 'Sans mémo' }, {content: String(justif.without_memo ?? 0), styles: {halign: 'center', fillColor: C.absentBg, textColor: C.absent, fontStyle: 'bold',},},],
            [{ content: 'En attente' }, {content: String(justif.pending_validation ?? 0), styles: {halign: 'center', fillColor: C.lateBg, textColor: C.late,},},],
            [{ content: 'Approuvées' }, {content: String(justif.approved ?? 0), styles: {halign: 'center', fillColor: C.presentBg, textColor: C.present,},},],
            [{ content: 'Rejetées' }, {content: String(justif.rejected ?? 0), styles: {halign: 'center', fillColor: C.absentBg, textColor: C.absent,},},],
        ]
        : [
            [{content: 'Données incohérentes', styles: {fontStyle: 'bold', textColor: C.absent, fillColor: C.absentBg,},}, {content: 'À vérifier', styles: {halign: 'center', fontStyle: 'bold', textColor: C.absent, fillColor: C.absentBg,},},],
            [{ content: 'Total absences' }, {content: String(justif.total_absences ?? 0), styles: { halign: 'center' },},],
            [{ content: 'Mémos retournés par l’API' }, {content: String(justif.with_memo ?? 0), styles: {halign: 'center', textColor: C.anomaly,},},],
        ]

    autoTable(doc, {
        startY       : justY,
        margin       : { top: HEADER_ZONE, left: justX, right: MARGIN, bottom: FOOTER_ZONE },
        head         : [['Indicateur', 'Valeur']],
        body         : justifBody,
        theme        : 'grid',
        styles       : { fontSize: 8, cellPadding: 2.5, font: 'helvetica', textColor: C.dark, lineColor: C.line, lineWidth: 0.2 },
        headStyles   : { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles : {
            0: { cellWidth: halfW * 0.65 },
            1: { cellWidth: halfW * 0.35, halign: 'center' },
        },
        didDrawPage: () => { drawPageHeader() },
    })

    // ═════════════════════════════════════════════════════════════════════════
    // ── PAGE 2 : TABLEAU PAR EMPLOYÉ ──────────────────────────────────────────
    // ═════════════════════════════════════════════════════════════════════════

    doc.addPage()
    drawPageHeader()
    curY = HEADER_ZONE

    drawSectionTitle(`DETAIL PAR EMPLOYE  (${sortedEmployees.length}) — trie par taux de presence decroissant`, curY + 5)
    curY += 9

    const empBody: RowInput[] = sortedEmployees.map(emp => {
        const ps       = emp.period_stats
        const rate     = ps?.attendance_rate ?? 0
        const rateType = rate >= 80 ? 'present' : rate >= 60 ? 'late' : 'absent'

        const row: CellDef[] = [
            { content: emp.name, styles: { fontStyle: 'bold', overflow: 'ellipsize' } },
            { content: String(ps?.work_days_expected ?? 0),                                     styles: { halign: 'center' } },
            statusCell(ps?.present_days ?? 0,      'present'),
            statusCell(ps?.late_days ?? 0,          (ps?.late_days ?? 0) > 0 ? 'late' : 'neutral'),
            statusCell(ps?.absent_days ?? 0,        (ps?.absent_days ?? 0) > 0 ? 'absent' : 'neutral'),
            statusCell(ps?.anomaly_off_days ?? 0,   (ps?.anomaly_off_days ?? 0) > 0 ? 'anomaly' : 'neutral'),
            { content: fmtHours(ps?.total_work_hours ?? 0),      styles: { halign: 'center' } },
            statusCell(fmtRate(rate), rateType),
            { content: fmtDelay(ps?.average_delay_minutes ?? 0), styles: { halign: 'center' } },
        ]
        return row
    })

    autoTable(doc, {
        startY       : curY,
        margin       : { top: HEADER_ZONE, left: MARGIN, right: MARGIN, bottom: FOOTER_ZONE },
        head         : [['Employe', 'J. planifies', 'Presents', 'Retards', 'Absences', 'Anomalies', 'Heures trav.', 'Taux pres.', 'Retard moy.']],
        body         : empBody,
        theme        : 'grid',
        styles       : { fontSize: 7.5, cellPadding: 2.2, font: 'helvetica', textColor: C.dark, lineColor: C.line, lineWidth: 0.2, overflow: 'ellipsize' },
        headStyles   : { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: C.rowAlt },
        columnStyles : {
            0: { cellWidth: 55 },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 22, halign: 'center' },
            6: { cellWidth: 30, halign: 'center' },
            7: { cellWidth: 24, halign: 'center' },
            8: { cellWidth: 28, halign: 'center' },
        },
        rowPageBreak: 'avoid',
        didDrawPage : () => { drawPageHeader() },
    })

    // ═════════════════════════════════════════════════════════════════════════
    // ── PAGE 3 : ÉVOLUTION QUOTIDIENNE ───────────────────────────────────────
    // ═════════════════════════════════════════════════════════════════════════

    doc.addPage()
    drawPageHeader()
    curY = HEADER_ZONE

    const plannedDays = dailyBreakdown.filter(d => d.expected_count > 0)

    drawSectionTitle(`EVOLUTION QUOTIDIENNE  (${plannedDays.length} jours avec planning)`, curY + 5)
    curY += 9

    const dailyBody: RowInput[] = plannedDays.map(d => {
        const dayPresent  = d.present + d.late
        const dayRate     = d.expected_count > 0
            ? Math.round((dayPresent / d.expected_count) * 100)
            : 0
        const rateType    = dayRate >= 80 ? 'present' : dayRate >= 60 ? 'late' : 'absent'

        const row: CellDef[] = [
            { content: formatDateFR(d.date),   styles: { halign: 'center' } },
            { content: dayOfWeekFR(d.date),    styles: { halign: 'center', textColor: C.muted } },
            { content: String(d.expected_count), styles: { halign: 'center' } },
            statusCell(dayPresent,               dayPresent > 0 ? 'present' : 'neutral'),
            statusCell(d.late,                   d.late > 0 ? 'late' : 'neutral'),
            statusCell(d.absent,                 d.absent > 0 ? 'absent' : 'neutral'),
            statusCell(d.anomaly_off_day,        d.anomaly_off_day > 0 ? 'anomaly' : 'neutral'),
            statusCell(d.off_day,                'offday'),
            statusCell(fmtRate(dayRate),         rateType),
        ]
        return row
    })

    autoTable(doc, {
        startY       : curY,
        margin       : { top: HEADER_ZONE, left: MARGIN, right: MARGIN, bottom: FOOTER_ZONE },
        head         : [['Date', 'Jour', 'Attendus', 'Presents', 'Retards', 'Absents', 'Anomalies', 'OFF', 'Taux']],
        body         : dailyBody,
        theme        : 'grid',
        styles       : { fontSize: 7.5, cellPadding: 2, font: 'helvetica', textColor: C.dark, lineColor: C.line, lineWidth: 0.2 },
        headStyles   : { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: C.rowAlt },
        columnStyles : {
            0: { cellWidth: 26, halign: 'center' },
            1: { cellWidth: 18, halign: 'center' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 22, halign: 'center' },
            6: { cellWidth: 22, halign: 'center' },
            7: { cellWidth: 18, halign: 'center' },
            8: { cellWidth: 22, halign: 'center' },
        },
        rowPageBreak: 'avoid',
        didDrawPage : () => { drawPageHeader() },
    })

    // ═════════════════════════════════════════════════════════════════════════
    // ── PAGE 4 : ANOMALIES DÉTAILLÉES (conditionnelle) ────────────────────────
    // ═════════════════════════════════════════════════════════════════════════


    if (hasAnomalies) {
        doc.addPage()
        drawPageHeader()
        curY = HEADER_ZONE

        drawSectionTitle(`ANOMALIES DETECTEES (${totalAnomalies} occurrence(s))`, curY + 5)
        curY += 9

        // Bandeau d'alerte
        doc.setFillColor(...C.anomalyBg)
        doc.roundedRect(MARGIN, curY, CONTENT, 10, 1.5, 1.5, 'F')
        doc.setDrawColor(...C.anomaly).setLineWidth(0.5)
        doc.roundedRect(MARGIN, curY, CONTENT, 10, 1.5, 1.5, 'S')
        doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...C.anomaly)

        const anomalyNotice =
            displayedAnomalies < totalAnomalies
                ? `! ${totalAnomalies} presence(s) hors planning detectee(s) — ` +
                `${displayedAnomalies} occurrence(s) affichee(s) — ` +
                `${summary.unexpected_presence?.employees_concerned ?? 0} employe(s) concerne(s)`
                : `! ${totalAnomalies} presence(s) hors planning detectee(s) — ` +
                `${summary.unexpected_presence?.employees_concerned ?? 0} employe(s) concerne(s)`
        doc.text(
            anomalyNotice,
            MARGIN + 4,
            curY + 6.5,
            { maxWidth: CONTENT - 8 },
        )
        curY += 14

        const anomalyBody: RowInput[] = anomalies.map(a => {
            const row: CellDef[] = [
                { content: a.employee_name ?? '—',                         styles: { fontStyle: 'bold' } },
                // { content: formatDateFR(a.date),                           styles: { halign: 'center' } },
                // { content: formatTimeISO(a.clock_in_time),                 styles: { halign: 'center', fillColor: C.anomalyBg, textColor: C.anomaly, fontStyle: 'bold' } },
                // { content: formatTimeISO(a.clock_out_time) ?? 'Non enr.',   styles: { halign: 'center' } },
                { content: a.clock_in_time ? `${formatDateFR(a.clock_in_time)} ${formatTimeISO(a.clock_in_time)}` : '—', styles: { halign: 'center' },},
                { content: a.clock_out_time ? `${formatDateFR(a.clock_out_time)} ${formatTimeISO(a.clock_out_time)}` : 'Non enr.', styles: { halign: 'center' },},
                { content: a.work_hours != null ? fmtHours(a.work_hours) : '—', styles: { halign: 'center' } },
                { content: 'Presence hors planning', styles: { fillColor: C.anomalyBg, textColor: C.anomaly, fontStyle: 'bold', halign: 'center' } },
            ]
            return row
        })

        autoTable(doc, {
            startY       : curY,
            margin       : { top: HEADER_ZONE, left: MARGIN, right: MARGIN, bottom: FOOTER_ZONE },
            head         : [['Employe', 'Entree', 'Sortie', 'Heures trav.', 'Statut']],
            body         : anomalyBody,
            theme        : 'grid',
            styles       : { fontSize: 8, cellPadding: 2.5, font: 'helvetica', textColor: C.dark, lineColor: C.line, lineWidth: 0.2 },
            headStyles   : { fillColor: [120, 53, 15] as [number,number,number], textColor: C.white, fontStyle: 'bold', fontSize: 7.5 },
            alternateRowStyles: { fillColor: C.rowAlt },
            columnStyles : {
                0: { cellWidth: 65 },
                1: { cellWidth: 40, halign: 'center' },
                2: { cellWidth: 40, halign: 'center' },
                3: { cellWidth: 30, halign: 'center' },
                4: { cellWidth: 65, halign: 'center' },
            },
            rowPageBreak: 'avoid',
            didDrawPage : () => { drawPageHeader() },
        })
    }

    // // ═════════════════════════════════════════════════════════════════════════
    // // ── PAGE : SESSIONS ANORMALES (conditionnelle) ───────────────────────────
    // // ═════════════════════════════════════════════════════════════════════════
    //
    // if (abnormalSessions.length > 0) {
    //     doc.addPage()
    //     drawPageHeader()
    //     curY = HEADER_ZONE
    //     drawSectionTitle(`SESSIONS A VERIFIER (${abnormalSessions.length})`, curY + 5,)
    //     curY += 9
    //     // Bandeau de synthèse
    //     doc.setFillColor(...C.anomalyBg)
    //     doc.roundedRect(MARGIN, curY, CONTENT, 10, 1.5, 1.5, 'F',)
    //
    //     doc.setDrawColor(...C.anomaly)
    //     doc.setLineWidth(0.5)
    //     doc.roundedRect(MARGIN, curY, CONTENT, 10, 1.5, 1.5, 'S',)
    //
    //     doc.setFont('helvetica', 'bold')
    //     doc.setFontSize(8)
    //     doc.setTextColor(...C.anomaly)
    //
    //     doc.text(`${tooLongCount} trop longue(s)   ·   ` + `${tooShortCount} trop courte(s)   ·   ` + `${incompleteCount} incomplete(s)`, MARGIN + 4, curY + 6.5,)
    //
    //     curY += 14
    //
    //     const employeeNames = new Map<string, string>(
    //         employees.map(employee => [
    //             employee.guid,
    //             employee.name,
    //         ]),
    //     )
    //
    //     const abnormalSessionBody: RowInput[] =
    //         abnormalSessions.map(session => {
    //             const employeeName =
    //                 employeeNames.get(session.employee_guid)
    //                 ?? session.employee_guid
    //
    //
    //             const statusType: | 'late' | 'anomaly' | 'absent' = session.status === 'too_short'
    //                     ? 'late' : session.status === 'too_long' ? 'anomaly' : 'absent'
    //
    //             return [
    //                 { content: employeeName, styles: {fontStyle: 'bold',},},
    //                 { content: formatDateFR(session.date), styles: {halign: 'center',},},
    //                 { content: session.status === 'incomplete' ? 'Non calculable' : fmtHours(session.duration_hours), styles: {halign: 'center',},},
    //                 statusCell(getSessionStatusLabel(session.status as AbnormalSessionStatus,), statusType,),
    //             ]
    //         })
    //
    //     autoTable(doc, {
    //         startY: curY,
    //         margin: { top: HEADER_ZONE, left: MARGIN, right: MARGIN, bottom: FOOTER_ZONE,},
    //         head: [['Employe', 'Date', 'Duree', 'Probleme detecte',]],
    //         body: abnormalSessionBody,
    //         theme: 'grid',
    //         styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica', textColor: C.dark, lineColor: C.line, lineWidth: 0.2,},
    //         headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7.5,},
    //         alternateRowStyles: { fillColor: C.rowAlt,},
    //         columnStyles: {
    //             0: { cellWidth: 90, },
    //             1: { cellWidth: 35, halign: 'center', },
    //             2: { cellWidth: 45, halign: 'center', },
    //             3: { cellWidth: 107, halign: 'center', },
    //         },
    //         rowPageBreak: 'avoid',
    //         didDrawPage: () => { drawPageHeader() },
    //     })
    // }

    // ═════════════════════════════════════════════════════════════════════════
    // ── DERNIÈRE PAGE : SYNTHÈSE DÉCISIONNELLE ───────────────────────────────
    // ═════════════════════════════════════════════════════════════════════════

    doc.addPage()
    drawPageHeader()
    curY = HEADER_ZONE

    drawSectionTitle('SYNTHESE DECISIONNELLE', curY + 5)
    curY += 11

    // Sous-titre explicatif
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...C.muted)
    doc.text('Points marquants de la periode — a destination du manager et des RH', MARGIN, curY)
    curY += 8

    // ── Indicateurs clés en grille (3 colonnes × 2 lignes) ───────────────────
    const indicateurs: { label: string; value: string; detail: string; alert: boolean }[] = [
        {
            label : 'Meilleur taux de presence',
            value : synthese.bestPresence ? `${synthese.bestPresence.name}` : '—',
            detail: synthese.bestPresence ? fmtRate(synthese.bestPresence.rate) : '—',
            alert : false,
        },
        {
            label: 'Taux de présence le plus bas',
            value: synthese.plannedEmployeesCount === 0 ? 'Aucun employé planifié' : synthese.plannedEmployeesCount === 1 ? 'Comparaison impossible' : synthese.worstPresence?.name ?? '—',
            detail: synthese.plannedEmployeesCount === 1 ? 'Un seul employé planifié' : synthese.worstPresence ? fmtRate(synthese.worstPresence.rate) : '—',
            alert: synthese.plannedEmployeesCount > 1 && (synthese.worstPresence?.rate ?? 100) < 60,
        },
        {
            label: 'Employé le plus ponctuel',
            value: synthese.bestPunctuality ? synthese.bestPunctuality.name : 'Non calculable',
            detail: synthese.bestPunctuality ? fmtRate(synthese.bestPunctuality.rate) : 'Aucune présence planifiée',
            alert: false,
        },
        {
            label : 'Employe avec le + de retards',
            value : synthese.mostLate ? `${synthese.mostLate.name}` : 'Aucun retard',
            detail: synthese.mostLate ? `${synthese.mostLate.days} jour(s)` : '—',
            alert : synthese.mostLate ? synthese.mostLate.days >= 3 : false,
        },
        {
            label: 'Meilleure journée de présence',
            value: synthese.bestDay ? formatDateFR(synthese.bestDay.date) : 'Aucune présence',
            detail: synthese.bestDay ? `${synthese.bestDay.present} présent(s) (${fmtRate(synthese.bestDay.rate)})` : 'Sur les jours planifiés',
            alert: false,
        },
        {
            label : 'Journee avec le + d\'absences',
            value : synthese.worstDay ? formatDateFR(synthese.worstDay.date) : 'Aucune absence',
            detail: synthese.worstDay ? `${synthese.worstDay.absent} absent(s)` : '—',
            alert : synthese.worstDay ? synthese.worstDay.absent >= 3 : false,
        },
    ]

    const indW = (CONTENT - 2 * GAP) / 3
    const indH = 24
    const indPerRow = 3

    indicateurs.forEach((ind, i) => {
        const col = i % indPerRow
        const row = Math.floor(i / indPerRow)
        const x   = MARGIN + col * (indW + GAP)
        const y   = curY + row * (indH + 4)
        const bg  = ind.alert ? C.absentBg : C.offdayBg
        const bd  = ind.alert ? C.absent   : C.line

        doc.setFillColor(...bg)
        doc.roundedRect(x, y, indW, indH, 2, 2, 'F')
        doc.setDrawColor(...bd).setLineWidth(ind.alert ? 0.5 : 0.25)
        doc.roundedRect(x, y, indW, indH, 2, 2, 'S')

        // Label
        doc.setFont('helvetica', 'bold').setFontSize(6).setTextColor(...C.muted)
        doc.text(ind.label.toUpperCase(), x + indW / 2, y + 5.5, { align: 'center', maxWidth: indW - 4 })

        // Valeur principale
        doc.setFont('helvetica', 'bold').setFontSize(8.5)
        doc.setTextColor(ind.alert ? C.absent[0] : C.dark[0], ind.alert ? C.absent[1] : C.dark[1], ind.alert ? C.absent[2] : C.dark[2])
        doc.text(ind.value, x + indW / 2, y + 14, { align: 'center', maxWidth: indW - 4 })

        // Détail
        doc.setFont('helvetica', 'normal').setFontSize(7)
        doc.setTextColor(ind.alert ? C.anomaly[0] : C.muted[0], ind.alert ? C.anomaly[1] : C.muted[1], ind.alert ? C.anomaly[2] : C.muted[2])
        doc.text(ind.detail, x + indW / 2, y + 20, { align: 'center', maxWidth: indW - 4 })
    })

    curY += 2 * (indH + 4) + GAP + 4

    // ── Encadré total heures + anomalies ──────────────────────────────────────
    const resumeItems: { label: string; value: string; color: [number,number,number] }[] = [
        { label: 'Total heures enregistrees', value: fmtHours(synthese.totalHours),    color: C.present },
        { label: 'Presences hors planning',   value: String(synthese.totalAnomalies),   color: synthese.totalAnomalies > 0 ? C.anomaly : C.present },
        { label: 'Sessions a verifier', value: String(abnormalSessions.length), color: abnormalSessions.length > 0 ? C.absent : C.present, },
        { label: 'Taux de presence global',   value: fmtRate(attendanceRate),           color: attendanceRate >= 80 ? C.present : C.absent },
        { label: 'Taux de ponctualite global',  value: punctualityRate !== null ? fmtRate(punctualityRate) : 'N/C', color: punctualityRate === null ? C.muted : punctualityRate >= 70 ? C.present : C.late, },
    ]

    const resumeW = (CONTENT - 3 * GAP) / 5
    resumeItems.forEach((item, i) => {
        const x  = MARGIN + i * (resumeW + GAP)
        doc.setFillColor(...C.rowAlt)
        doc.roundedRect(x, curY, resumeW, 20, 2, 2, 'F')
        doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(...C.muted)
        doc.text(item.label.toUpperCase(), x + resumeW / 2, curY + 6, { align: 'center', maxWidth: resumeW - 4 })
        doc.setFont('helvetica', 'bold').setFontSize(13)
        doc.setTextColor(...item.color)
        doc.text(item.value, x + resumeW / 2, curY + 15.5, { align: 'center' })
    })

    curY += 24

    // ── Signature ─────────────────────────────────────────────────────────────
    doc.setDrawColor(...C.line).setLineWidth(0.3)
    doc.line(MARGIN, curY + 4, pageW - MARGIN, curY + 4)
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...C.muted)
    doc.text(
        `Rapport genere automatiquement par Toke Attendance   .   ${reportRef}   .   ${generatedAt}   .   Par : ${generatedBy}`,
        pageW / 2, curY + 9, { align: 'center' },
    )

    // ═════════════════════════════════════════════════════════════════════════
    // ── PIEDS DE PAGE + OUVERTURE ─────────────────────────────────────────────
    // ═════════════════════════════════════════════════════════════════════════

    drawAllFooters()

    const blobUrl = doc.output('bloburl')
    window.open(blobUrl as unknown as string, '_blank')
}