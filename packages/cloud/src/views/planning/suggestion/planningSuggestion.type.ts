export type PlanningMode = 'FIXED' | 'ROTATING' | 'EXCLUDED'
export type FixedRestDayMode = 'TEMPLATE' | 'ROTATING'
export type PlanningDayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
export type PlanningServiceType = 'STANDARD' | 'GUARD'
export type AllocationMode = 'EXACT' | 'RANGE' | 'FILL_REMAINING'
export type PlanningSolverType = 'GREEDY' | 'ORTOOLS'
export type SuggestionStatus = 'draft' | 'approved' | 'rejected'

export type SuggestionReasonSource =
    | 'FIXED'
    | 'GENERATED'
    | 'FILL_REMAINING'
    | 'GUARD_CONTINUATION'
    | 'POST_GUARD_REST'
    | 'REST'

export interface PlanningWorkBlock {
    work: [string, string]
    pause: [string, string] | null
    tolerance: number
}

export type PlanningDefinition = Partial<
    Record<PlanningDayKey, PlanningWorkBlock[] | null>
>

export interface PlanningTemplateMini {
    guid: string
    name: string
    definition: PlanningDefinition
    current?: boolean
    is_current?: boolean
}

export interface EmployeePlanningProfile {
    guid: string
    user: {
        guid: string
        name: string
        employee_code: string | null
    } | null
    planning_mode: PlanningMode
    fixed_session_template: PlanningTemplateMini | null
    fixed_rest_day_mode: FixedRestDayMode
    rotation_order: number | null
    max_weekly_minutes: number | null
    active: boolean
    created_at?: string
    updated_at?: string
}

export interface EmployeePlanningProfilePayload {
    user: string
    planning_mode: PlanningMode
    fixed_session_template: string | null
    fixed_rest_day_mode: FixedRestDayMode
    rotation_order: number | null
    max_weekly_minutes: number | null
    active: boolean
}

export interface EmployeePlanningProfileUpdatePayload {
    planning_mode: PlanningMode
    fixed_session_template: string | null
    fixed_rest_day_mode: FixedRestDayMode
    rotation_order: number | null
    max_weekly_minutes: number | null
    active: boolean
}

export interface PlanningSuggestionRules {
    min_rest_days_per_week: number
    max_consecutive_work_days: number
    max_weekly_minutes: number | null
    min_rest_minutes_between_shifts: number
    max_consecutive_guards: number
    rest_after_guard_required: boolean
    post_guard_rest_days: number
    max_resting_employees_per_day: number | null
    fairness_window_weeks: number
    strict_coverage: boolean
}

export interface PlanningSuggestionConfig {
    guid: string
    name: string
    version: number
    active: boolean
    rules: PlanningSuggestionRules
    solver: {
        type: PlanningSolverType
        timeout_seconds: number
        fallback_to_greedy: boolean
    }
    created_by: {
        guid: string
        name: string
    } | null
    created_at?: string
    updated_at?: string
}

export interface PlanningSuggestionConfigPayload {
    name: string
    active: boolean
    min_rest_days_per_week: number
    max_consecutive_work_days: number
    max_weekly_minutes: number | null
    min_rest_minutes_between_shifts: number
    max_consecutive_guards: number
    rest_after_guard_required: boolean
    post_guard_rest_days: number
    max_resting_employees_per_day: number | null
    fairness_window_weeks: number
    strict_coverage: boolean
    solver_type: PlanningSolverType
    solver_timeout_seconds: number
    fallback_to_greedy: boolean
}

export interface PlanningRequirement {
    guid: string
    config: {
        guid: string
        name: string
        version: number
    } | null
    session_template: PlanningTemplateMini | null
    continuation_template: PlanningTemplateMini | null
    continuation_day_offset: number
    day_of_week: PlanningDayKey
    service_type: PlanningServiceType
    allocation_mode: AllocationMode
    min_employees: number
    target_employees: number
    max_employees: number | null
    credited_minutes: number | null
    priority: number
    active: boolean
    created_at?: string
    updated_at?: string
}

export interface PlanningRequirementPayload {
    session_template: string
    continuation_template: string | null
    continuation_day_offset: number
    day_of_week: PlanningDayKey
    service_type: PlanningServiceType
    allocation_mode: AllocationMode
    min_employees: number
    target_employees: number
    max_employees: number | null
    credited_minutes: number | null
    priority: number
    active: boolean
}

export interface SuggestionDayReason {
    source?: SuggestionReasonSource
    factors: string[]
    confidence: number
    templateGuid: string | null
    templateName: string
}

export interface SuggestionEmployee {
    guid: string
    name: string
    employee_code: string | null
}

export interface ScheduleSuggestionItem {
    guid: string
    user: SuggestionEmployee
    schedule: Record<string, string | null>
    reasons: Record<string, SuggestionDayReason | null>
}

export interface SuggestionViolation {
    severity: 'HARD' | 'WARNING'
    code: string
    date?: string | null
    employeeGuid?: string | null
    requirementGuid?: string | null
    message: string
    details?: Record<string, unknown> | null
}

export interface SuggestionCoverage {
    date: string
    dayOfWeek: PlanningDayKey
    requirementGuid: string
    allocationMode: AllocationMode
    templateGuid: string
    templateName: string
    minimum: number
    target: number
    maximum: number | null
    assigned: number
    status: 'COVERED' | 'BELOW_TARGET' | 'BELOW_MINIMUM' | 'ABOVE_MAXIMUM'
}

export interface SuggestionDiagnostics {
    violations: SuggestionViolation[]
    coverage: SuggestionCoverage[]
    fairnessScore: number
    coverageScore: number
    solver?: {
        requestedSolver: PlanningSolverType
        usedSolver: PlanningSolverType
        fallbackUsed: boolean
        durationMs: number
        solverVersion: string
    }
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
    configuration: {
        guid: string
        name?: string
        version: number
    }
    approved_at: string | null
    rejected_at: string | null
    manager: {
        guid: string
        name: string
    }
    items: ScheduleSuggestionItem[]
    created_at?: string
}

export type ScheduleSuggestionListItem = Omit<ScheduleSuggestion, 'items'> & {
    items?: ScheduleSuggestionItem[]
}

export interface GenerateSuggestionPayload {
    period_from: string
    period_to: string
    employee_guids?: string[]
}

export interface PlanningReadinessItem {
    id: 'profiles' | 'configuration' | 'requirements' | 'manager'
    label: string
    description: string
    ready: boolean
    routeName: string
    actionLabel: string
}
