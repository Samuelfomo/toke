export type SuggestionStatus =
    | 'draft'
    | 'approved'
    | 'rejected'

export type SuggestionReasonSource =
    | 'FIXED'
    | 'GENERATED'
    | 'FILL_REMAINING'
    | 'GUARD_CONTINUATION'
    | 'POST_GUARD_REST'
    | 'REST'

export type AllocationMode =
    | 'EXACT'
    | 'RANGE'
    | 'FILL_REMAINING'

export type CoverageStatus =
    | 'COVERED'
    | 'BELOW_TARGET'
    | 'BELOW_MINIMUM'
    | 'ABOVE_MAXIMUM'

export type DayOfWeek =
    | 'Mon'
    | 'Tue'
    | 'Wed'
    | 'Thu'
    | 'Fri'
    | 'Sat'
    | 'Sun'

export interface SuggestionUser {
    guid: string
    name: string
    employee_code: string
}

export interface SuggestionManager {
    guid: string
    name: string
}

export interface SuggestionConfiguration {
    guid: string
    name?: string
    version: number
}

export interface SuggestionDayReason {
    source: SuggestionReasonSource
    factors: string[]
    confidence: number
    templateGuid: string | null
    templateName: string
}

export interface ScheduleSuggestionItem {
    guid: string
    user: SuggestionUser

    /**
     * Clé : date ISO YYYY-MM-DD
     * Valeur : GUID du SessionTemplate ou null pour repos.
     */
    schedule: Record<string, string | null>

    reasons: Record<string, SuggestionDayReason | null>
}

export interface SuggestionCoverage {
    date: string
    dayOfWeek: DayOfWeek
    requirementGuid: string
    allocationMode: AllocationMode
    templateGuid: string
    templateName: string
    minimum: number
    target: number
    maximum: number | null
    assigned: number
    status: CoverageStatus
}

export interface SuggestionViolation {
    severity: 'HARD' | 'WARNING'
    code: string
    date: string | null
    employeeGuid: string | null
    requirementGuid: string | null
    message: string
    details: Record<string, unknown> | null
}

export interface SuggestionSolverDiagnostics {
    requestedSolver: 'GREEDY' | 'ORTOOLS'
    usedSolver: 'GREEDY' | 'ORTOOLS'
    fallbackUsed: boolean
    durationMs: number
    solverVersion: string
}

export interface SuggestionDiagnostics {
    violations: SuggestionViolation[]
    coverage: SuggestionCoverage[]
    fairnessScore: number
    coverageScore: number
    solver?: SuggestionSolverDiagnostics
}

export interface ScheduleSuggestion {
    guid: string
    period_from: string
    period_to: string
    status: SuggestionStatus

    conformity_score: number
    history_weeks: number
    engine_version: string

    diagnostics: SuggestionDiagnostics
    configuration: SuggestionConfiguration

    approved_at: string | null
    rejected_at: string | null

    manager: SuggestionManager
    items: ScheduleSuggestionItem[]
}

export interface GenerateSuggestionPayload {
    period_from: string
    period_to: string

    /**
     * Ne pas envoyer pour utiliser tout le périmètre du manager.
     */
    employee_guids?: string[]
}

export interface PatchSuggestionCellPayload {
    iso: string
    template_guid: string | null
}

export interface GenerateSuggestionData {
    suggestion: ScheduleSuggestion
    conformity_score: number
    planning_quality_score: number
    employee_count: number
    configuration: {
        guid: string
        version: number
    }
    diagnostics: SuggestionDiagnostics
}

export interface SuggestionPublicationResult {
    employee_count: number
    created_count: number
    deactivated_count: number
    preserved_fragment_count: number
}

export interface ApproveSuggestionData {
    message?: string
    suggestion: ScheduleSuggestion
    publication?: SuggestionPublicationResult

    // Compatibilité avec une éventuelle réponse non imbriquée
    created_count?: number
    deactivated_count?: number
    preserved_fragment_count?: number
    employee_count?: number
}

export interface SuggestionListData {
    suggestions: {
        count: number
        limit: number
        offset: number
        items: ScheduleSuggestion[]
    }
}

export interface ApiErrorPayload {
    code: string
    message: string
    details?: unknown
}

export interface ApiResponse<T> {
    success: boolean
    data: T
    error?: ApiErrorPayload
    timestamp?: string
}