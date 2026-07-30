// ─── reportUtils.ts ──────────────────────────────────────────────────────────
// Source de données partagée pour tous les exports (print, PDF serveur, Excel…)
// ─────────────────────────────────────────────────────────────────────────────

export interface PointageEntry {
    guid               : string
    pointage_type      : string
    pointage_status    : string
    clocked_at         : string
    server_received_at : string
    real_clocked_at    : string | null
    created_offline    : boolean
    coordinates        : string | null
    gps_accuracy       : number
    site_name          : string | null
    correction_reason  : string | null
    is_fallback_checkin: boolean
    image_url          : string | null
    user               : { guid: string; name: string } | null
    device             : { guid: string; name: string } | null
    site               : { guid: string; name: string } | null
    session            : { guid: string; duration: string } | null
    memo               : string | null
    device_info        : Record<string, any> | null
    ip_address         : string | null
    is_valid           : boolean
    requires_validation: boolean
    within_geofence    : boolean
    has_anomalies      : boolean
    fraud_score        : number
    updated_at         : string
}

export interface ReportFilters {
    startDate     : string
    endDate       : string
    nature        : string   // '' | 'standard' | 'libre' | 'fallback'
    type          : string   // '' | 'clock_in' | 'clock_out' | ...
    photo         : string   // '' | 'with' | 'without'
    status        : string   // '' | 'accepted' | 'pending' | 'rejected'
    employeeGuid  : string   // '' ou GUID
    employeeName  : string   // label pour affichage
    managerGuid   : string
    managerName   : string
    organizationName: string
}

export interface ReportStats {
    total    : number
    standard : number
    libre    : number
    fallback : number
    avecPhoto: number
    employes : number
    first    : string | null   // ISO clocked_at du premier pointage
    last     : string | null   // ISO clocked_at du dernier pointage
}

// ── Référence unique du rapport ───────────────────────────────────────────────
export function generateReportRef(): string {
    const now    = new Date()
    const date   = now.toISOString().slice(0, 10).replace(/-/g, '')
    const suffix = String(Math.floor(Math.random() * 999999)).padStart(6, '0')
    return `ATT-${date}-${suffix}`
}

// ── Nature d'un pointage ─────────────────────────────────────────────────────
export function getEntryNature(entry: PointageEntry): 'standard' | 'libre' | 'fallback' {
    if (entry.is_fallback_checkin) return 'fallback'
    if (entry.site?.guid)          return 'standard'
    return 'libre'
}

export function getNatureLabel(entry: PointageEntry): string {
    const n = getEntryNature(entry)
    if (n === 'standard') return 'Standard'
    if (n === 'fallback') return 'Terminal partagé'
    return 'Libre'
}

// ── Type de pointage ──────────────────────────────────────────────────────────
export function getTypeLabel(type: string): string {
    const map: Record<string, string> = {
        clock_in            : 'Entrée',
        clock_out           : 'Sortie',
        pause_start         : 'Début pause',
        pause_end           : 'Fin pause',
        external_mission    : 'Mission ext.',
        external_mission_end: 'Fin mission',
    }
    return map[type] || type
}

// ── Statut ────────────────────────────────────────────────────────────────────
export function getStatusLabel(status: string): string {
    if (status === 'accepted') return 'Validé'
    if (status === 'pending')  return 'En attente'
    if (status === 'rejected') return 'Rejeté'
    return status
}

// ── Source du pointage ────────────────────────────────────────────────────────
export function getSourceLabel(entry: PointageEntry): string {
    if (entry.is_fallback_checkin) return 'Terminal partagé'
    if (entry.created_offline)     return 'Mobile (hors ligne)'
    return 'Mobile'
}

// ── Formatage date / heure ────────────────────────────────────────────────────
export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    })
}

export function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit',
    })
}

export function formatDateTime(iso: string): string {
    return `${formatDate(iso)} à ${formatTime(iso)}`
}

// ── Calcul des stats ──────────────────────────────────────────────────────────
export function computeStats(entries: PointageEntry[]): ReportStats {
    const sorted   = [...entries].sort((a, b) => a.clocked_at.localeCompare(b.clocked_at))
    const standard = entries.filter(e => getEntryNature(e) === 'standard').length
    const libre    = entries.filter(e => getEntryNature(e) === 'libre').length
    const fallback = entries.filter(e => getEntryNature(e) === 'fallback').length
    const avecPhoto= entries.filter(e => !!e.image_url).length
    const employes = new Set(entries.map(e => e.user?.guid).filter(Boolean)).size
    return {
        total    : entries.length,
        standard,
        libre,
        fallback,
        avecPhoto,
        employes,
        first    : sorted[0]?.clocked_at ?? null,
        last     : sorted[sorted.length - 1]?.clocked_at ?? null,
    }
}

// ── Libellé des filtres actifs (pour affichage dans le rapport) ───────────────
export function buildActiveFiltersLabel(f: ReportFilters): string {
    const parts: string[] = []
    if (f.employeeName) parts.push(`Employé : ${f.employeeName}`)
    if (f.nature)       parts.push(`Nature : ${{ standard: 'Standard', libre: 'Libre', fallback: 'Terminal partagé' }[f.nature] ?? f.nature}`)
    if (f.type)         parts.push(`Type : ${getTypeLabel(f.type)}`)
    if (f.photo === 'with')    parts.push('Avec photo uniquement')
    if (f.photo === 'without') parts.push('Sans photo uniquement')
    if (f.status)       parts.push(`Statut : ${getStatusLabel(f.status)}`)
    return parts.length > 0 ? parts.join(' · ') : 'Aucun filtre supplémentaire'
}

// ── Construction de l'URL de la page print ───────────────────────────────────
export function buildPrintUrl(filters: ReportFilters): string {
    const params = new URLSearchParams()
    params.set('start',    filters.startDate)
    params.set('end',      filters.endDate)
    params.set('manager',  filters.managerGuid)
    if (filters.nature)       params.set('nature',   filters.nature)
    if (filters.type)         params.set('type',     filters.type)
    if (filters.photo)        params.set('photo',    filters.photo)
    if (filters.status)       params.set('status',   filters.status)
    if (filters.employeeGuid) params.set('employee', filters.employeeGuid)
    return `/pointages/print?${params.toString()}`
}