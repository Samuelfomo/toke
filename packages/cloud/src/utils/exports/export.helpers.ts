// ─────────────────────────────────────────────────────────────────────────────
// utils/exports/export.helpers.ts
// Fonctions utilitaires partagées entre tous les exports CSV / Excel
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from 'xlsx'

// ── Téléchargement ────────────────────────────────────────────────────────────

/**
 * Déclenche le téléchargement d'un Blob dans le navigateur.
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/**
 * Convertit un tableau de lignes (array of arrays) en blob CSV UTF-8 avec BOM.
 * Le BOM (0xEF 0xBB 0xBF) force Excel à ouvrir le fichier en UTF-8.
 */
export function rowsToCsvBlob(rows: (string | number | null | undefined)[][]): Blob {
    const escape = (v: string | number | null | undefined): string => {
        if (v === null || v === undefined) return ''
        const str = String(v)
        // Encapsuler si virgule, guillemet ou saut de ligne
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
        }
        return str
    }
    const csv  = rows.map((row) => row.map(escape).join(',')).join('\r\n')
    const bom  = '\uFEFF'
    return new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
}

// ── Formatage ─────────────────────────────────────────────────────────────────

export function formatDateFR(d?: string | null): string {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    })
}

export function formatDatetimeFR(d?: string | null): string {
    if (!d) return '—'
    return new Date(d).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

export function formatHours(totalH: number): string {
    if (isNaN(totalH) || totalH < 0) return '0h00'
    const hh = Math.floor(totalH)
    const mm  = Math.round((totalH - hh) * 60)
    return `${String(hh).padStart(2, '0')}h${String(mm).padStart(2, '0')}`
}

export function timeToHours(t: string): number {
    const [h, m] = t.split(':').map(Number)
    return h + (m ?? 0) / 60
}

export function buildPeriodLabel(from: string, to: string): string {
    return `${formatDateFR(from)} AU ${formatDateFR(to)}`
}

// ── Génération de la liste des jours d'une période ────────────────────────────

export interface PeriodDay {
    iso:       string   // YYYY-MM-DD
    label:     string   // ex: "Lun 22/04"
    labelFull: string   // ex: "Lundi 22/04/2026"
    jsDay:     number   // 0 = Dim … 6 = Sam
    dayKey:    string   // 'Mon' | 'Tue' | ...
    isWeekend: boolean
}

const DAY_FR_SHORT: Record<number, string> = { 0:'Dim', 1:'Lun', 2:'Mar', 3:'Mer', 4:'Jeu', 5:'Ven', 6:'Sam' }
const DAY_FR_LONG:  Record<number, string> = { 0:'Dimanche', 1:'Lundi', 2:'Mardi', 3:'Mercredi', 4:'Jeudi', 5:'Vendredi', 6:'Samedi' }
export const JS_DAY_TO_KEY: Record<number, string> = { 0:'Sun', 1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri', 6:'Sat' }

export function buildPeriodDays(from: string, to: string): PeriodDay[] {
    const days: PeriodDay[] = []
    const cursor = new Date(from)
    const end    = new Date(to)
    while (cursor <= end) {
        const iso   = cursor.toISOString().split('T')[0]
        const jsDay = cursor.getDay()
        const ddmm  = `${String(cursor.getDate()).padStart(2,'0')}/${String(cursor.getMonth()+1).padStart(2,'0')}`
        days.push({
            iso,
            label:     `${DAY_FR_SHORT[jsDay]} ${ddmm}`,
            labelFull: `${DAY_FR_LONG[jsDay]} ${ddmm}/${cursor.getFullYear()}`,
            jsDay,
            dayKey:    JS_DAY_TO_KEY[jsDay],
            isWeekend: jsDay === 0 || jsDay === 6,
        })
        cursor.setDate(cursor.getDate() + 1)
    }
    return days
}

// ── Styles XLSX ───────────────────────────────────────────────────────────────
// SheetJS Community Edition ne supporte pas les styles de cellules nativement.
// On utilise le format XLSX avec des utilitaires de base.
// Pour des styles avancés (couleurs, gras), il faudrait xlsx-style ou exceljs.

/**
 * Crée un workbook XLSX depuis un tableau de sheets.
 * Chaque sheet est { name, data } où data est un array of arrays.
 */
export interface SheetDef {
    name: string
    data: (string | number | null | undefined)[][]
    /** Largeurs de colonnes en caractères */
    colWidths?: number[]
}

export function buildWorkbook(sheets: SheetDef[]): XLSX.WorkBook {
    const wb = XLSX.utils.book_new()
    for (const sheet of sheets) {
        const ws = XLSX.utils.aoa_to_sheet(sheet.data)

        // Largeurs de colonnes
        if (sheet.colWidths?.length) {
            ws['!cols'] = sheet.colWidths.map((w) => ({ wch: w }))
        }

        // Figer la première ligne (en-tête)
        ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' }

        XLSX.utils.book_append_sheet(wb, ws, sheet.name)
    }
    return wb
}

/**
 * Déclenche le téléchargement d'un workbook XLSX.
 */
export function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
    XLSX.writeFile(wb, filename)
}

// ── Utilitaire nom de fichier ─────────────────────────────────────────────────

export function buildFilename(
    prefix: string,
    targetName: string,
    from: string,
    to: string,
    ext: 'csv' | 'xlsx'
): string {
    const slug = targetName
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // supprimer accents
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase()
    const dateRange = `${from.replace(/-/g, '')}_${to.replace(/-/g, '')}`
    return `${prefix}_${slug}_${dateRange}.${ext}`
}