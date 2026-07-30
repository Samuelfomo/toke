import type {
    AllocationMode,
    PlanningDayKey,
    PlanningMode,
    SuggestionStatus,
} from './planningSuggestion.type'

export const DAY_ORDER: PlanningDayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const DAY_LABELS: Record<PlanningDayKey, string> = {
    Mon: 'Lundi',
    Tue: 'Mardi',
    Wed: 'Mercredi',
    Thu: 'Jeudi',
    Fri: 'Vendredi',
    Sat: 'Samedi',
    Sun: 'Dimanche',
}

export const MODE_LABELS: Record<PlanningMode, string> = {
    FIXED: 'Horaire fixe',
    ROTATING: 'Rotation automatique',
    EXCLUDED: 'Exclu de la génération',
}

export const ALLOCATION_LABELS: Record<AllocationMode, string> = {
    EXACT: 'Effectif exact',
    RANGE: 'Fourchette',
    FILL_REMAINING: 'Affecter les disponibles',
}

export const STATUS_LABELS: Record<SuggestionStatus, string> = {
    draft: 'Brouillon',
    approved: 'Approuvé',
    rejected: 'Rejeté',
}

export function formatDate(value?: string | null): string {
    if (!value) return '—'
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Africa/Douala',
    }).format(new Date(`${value}T12:00:00`))
}

export function formatMinutes(value?: number | null): string {
    if (value === null || value === undefined) return 'Aucune limite'
    const hours = Math.floor(value / 60)
    const minutes = value % 60
    if (!minutes) return `${hours} h`
    return `${hours} h ${String(minutes).padStart(2, '0')}`
}

export function responseData(response: any): any {
    return response?.data ?? {}
}

export function responseError(response: any, fallback: string): string {
    return response?.error?.message
        ?? response?.message
        ?? response?.response?.data?.error?.message
        ?? fallback
}
