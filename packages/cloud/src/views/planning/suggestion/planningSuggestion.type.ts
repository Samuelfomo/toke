export type PlanningMode = 'FIXED' | 'ROTATING' | 'EXCLUDED'
export type FixedRestDayMode = 'TEMPLATE' | 'ROTATING'
export type PlanningDayKey =
    | 'Mon'
    | 'Tue'
    | 'Wed'
    | 'Thu'
    | 'Fri'
    | 'Sat'
    | 'Sun'

export type PlanningServiceType = 'STANDARD' | 'GUARD'
export type AllocationMode = 'EXACT' | 'RANGE' | 'FILL_REMAINING'
export type PlanningSolverType = 'GREEDY' | 'ORTOOLS'
export type SuggestionStatus = 'draft' | 'approved' | 'rejected'

export type WeeklyLeaveMode =
    | 'NONE'
    | 'PER_EMPLOYEE'
    | 'TEAM_ROTATION'
    | 'PER_ELIGIBLE_EMPLOYEE'


export type PolicyPlanningMode = Exclude<PlanningMode, 'EXCLUDED'>
export type GuardPoolRelation = 'ANY' | 'MEMBER' | 'NON_MEMBER'
export type WeeklyLeaveCountMode = 'MINIMUM' | 'EXACT'
export type ServiceScopeMode =
    | 'ANY'
    | 'SERVICE_TYPE'
    | 'TEMPLATE'
    | 'REQUIREMENT'
export type GuardMemberServiceAccess = 'ANY_SERVICE' | 'GUARD_ONLY'
export type MembershipBalanceMode = 'NONE' | 'SOFT' | 'STRICT'

export interface EmployeePolicySelector {
    planning_modes: PolicyPlanningMode[]
    guard_pool_relation: GuardPoolRelation
}

export interface PlanningServiceScope {
    mode: ServiceScopeMode
    service_types: PlanningServiceType[]
    template_guids: string[]
    requirement_guids: string[]
    exclusive: boolean
}

export type GuardTeamMode =
    | 'DAILY_FLEXIBLE'
    | 'WEEKLY_POOL'

export type GuardTeamSelectionMode =
    | 'ROTATION_ORDER'
    | 'OPTIMIZED'

export type SuggestionReasonSource =
    | 'FIXED'
    | 'GENERATED'
    | 'FILL_REMAINING'
    | 'GUARD_CONTINUATION'
    | 'POST_GUARD_REST'
    | 'WEEKLY_LEAVE'
    | 'TEMPLATE_REST'
    | 'UNASSIGNED'
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

export interface WeeklyLeavePolicy {
    mode: WeeklyLeaveMode
    employees_per_week: number
    allowed_days: PlanningDayKey[]
    rotation_anchor_date: string | null
    complete_weeks_only: boolean
    post_guard_rest_counts_as_leave: boolean
    selector: EmployeePolicySelector
    days_per_employee: number
    count_mode: WeeklyLeaveCountMode
    max_employees_per_day: number | null
    require_work_on_other_days: boolean
    service_scope: PlanningServiceScope
}

export interface GuardTeamPolicy {
    mode: GuardTeamMode
    employees_per_week: number
    selection_mode: GuardTeamSelectionMode
    rotation_anchor_date: string | null
    complete_weeks_only: boolean
    require_participation: boolean
    eligible_planning_modes: PolicyPlanningMode[]
    member_service_access: GuardMemberServiceAccess
    balance: {
        mode: MembershipBalanceMode
        max_membership_spread: number | null
        max_consecutive_membership_weeks: number | null
    }
}

export interface PlanningSuggestionRules {
    policy_schema_version?: number

    /** Utilisé uniquement lorsque weekly_leave_policy.mode = PER_EMPLOYEE. */
    min_rest_days_per_week: number

    /** null désactive la règle. */
    max_consecutive_work_days: number | null

    max_weekly_minutes: number | null
    min_rest_minutes_between_shifts: number
    max_consecutive_guards: number
    rest_after_guard_required: boolean
    post_guard_rest_days: number
    max_resting_employees_per_day: number | null
    weekly_leave_policy: WeeklyLeavePolicy
    guard_team_policy: GuardTeamPolicy
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
    max_consecutive_work_days: number | null
    max_weekly_minutes: number | null
    min_rest_minutes_between_shifts: number
    max_consecutive_guards: number
    rest_after_guard_required: boolean
    post_guard_rest_days: number
    max_resting_employees_per_day: number | null
    fairness_window_weeks: number
    strict_coverage: boolean

    weekly_leave_mode: WeeklyLeaveMode
    weekly_leave_employees_per_week: number
    weekly_leave_allowed_days: PlanningDayKey[]
    weekly_leave_rotation_anchor_date: string | null
    weekly_leave_complete_weeks_only: boolean
    post_guard_rest_counts_as_weekly_leave: boolean
    weekly_leave_selector: EmployeePolicySelector
    weekly_leave_days_per_employee: number
    weekly_leave_count_mode: WeeklyLeaveCountMode
    weekly_leave_max_employees_per_day: number | null
    weekly_leave_require_work_on_other_days: boolean
    weekly_leave_service_scope: PlanningServiceScope

    guard_team_mode: GuardTeamMode
    guard_team_employees_per_week: number
    guard_team_selection_mode: GuardTeamSelectionMode
    guard_team_rotation_anchor_date: string | null
    guard_team_complete_weeks_only: boolean
    guard_team_require_participation: boolean
    guard_team_eligible_planning_modes: PolicyPlanningMode[]
    guard_team_member_service_access: GuardMemberServiceAccess
    guard_team_balance_mode: MembershipBalanceMode
    guard_team_max_membership_spread: number | null
    guard_team_max_consecutive_membership_weeks: number | null

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
    eligibility_policy: EmployeePolicySelector
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
    eligibility_policy: EmployeePolicySelector
}

export interface SuggestionDayReason {
    source?: SuggestionReasonSource | 'MANUAL'
    factors: string[]
    confidence: number
    templateGuid: string | null
    templateName: string
    manualLock?: boolean
    manualDerived?: boolean
    manualOriginDate?: string | null
    requirementGuid?: string | null
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
    status:
        | 'COVERED'
        | 'BELOW_TARGET'
        | 'BELOW_MINIMUM'
        | 'ABOVE_MAXIMUM'
}

export interface SuggestionGuardPool {
    weekFrom: string
    weekTo: string
    employeeGuids: string[]
    mode: 'WEEKLY_POOL'
    selectionMode: GuardTeamSelectionMode
}


export interface SuggestionWeeklyLeaveGroup {
    weekFrom: string
    weekTo: string
    employeeGuids: string[]
    leaveByEmployee: Record<string, string[]>
    mode: WeeklyLeaveMode
    selector: {
        planningModes: PolicyPlanningMode[]
        guardPoolRelation: GuardPoolRelation
    }
    serviceScope: {
        mode: ServiceScopeMode
        serviceTypes: PlanningServiceType[]
        templateGuids: string[]
        requirementGuids: string[]
        exclusive: boolean
    }
}



export interface PlanningHistoryAdjustment {
    date: string
    template_guid: string
    included_employee_guids: string[]
}

export interface PlanningHistoryAnomaly {
    key: string
    code: 'HISTORY_DUPLICATE_EMPLOYEE_DAY' | 'HISTORY_COVERAGE_ABOVE_EXPECTATION' | 'HISTORY_COVERAGE_BELOW_EXPECTATION'
    severity: 'WARNING'
    date: string
    templateGuid: string | null
    templateName: string
    serviceType: 'STANDARD' | 'GUARD' | 'GUARD_CONTINUATION' | 'REST' | 'UNKNOWN'
    message: string
    observedCount: number
    expectedMin: number | null
    expectedTarget: number | null
    expectedMax: number | null
    employees: Array<{ guid: string; name: string }>
    affectsFairness: boolean
    selectedEmployeeGuids: string[]
    resolution: 'AUTO_ACCEPTED' | 'IGNORED_UNTIL_REVIEW' | 'MANAGER_ADJUSTED'
    suggestedActions: string[]
}

export interface PlanningHistoryReview {
    available: boolean
    historyFrom: string
    historyTo: string
    anomalies: PlanningHistoryAnomaly[]
    fairness: Array<{
        employeeGuid: string
        workedDays: number
        guardDays: number
        weekendWorkedDays: number
        workedMinutes: number
        restDays: number
        templateCounts: Record<string, number>
    }>
    boundaryGuardFacts: Array<{
        employeeGuid: string
        guardDate: string
        templateGuid: string
    }>
    summary: {
        employeeCount: number
        acceptedWorkRecords: number
        acceptedRestRecords: number
        ignoredAmbiguousRecords: number
        warningCount: number
        adjustedAnomalyCount: number
    }
    warning?: { code: string; message: string } | null
}

export interface SuggestionGenerationScope {
    teamEmployeeCount: number
    includedEmployeeCount: number
    temporaryExcludedEmployeeCount: number
    temporaryExcludedEmployeeGuids: string[]
    temporaryExcludedEmployees: Array<{
        guid: string
        name: string
    }>
    configGuid?: string | null
    configVersion?: number | null
    lockedAssignmentCount?: number
    historyAdjustments?: PlanningHistoryAdjustment[]
}


export interface SuggestionRollingHorizonChunk {
    index: number
    solveFrom: string
    solveTo: string
    commitFrom: string
    commitTo: string
    overlapFrom: string | null
    overlapTo: string | null
    lookaheadFrom: string | null
    lookaheadTo: string | null
    durationMs: number
    solverVersion: string
    committedDays: number
    lockedCarryCount: number
    managerLockCount: number
    boundaryContinuationCount: number
}

export interface SuggestionRollingHorizon {
    enabled: boolean
    thresholdDays: number
    commitDays: number
    overlapDays: number
    lookaheadDays: number
    totalSolveDays: number
    chunkCount: number
    totalSolverDurationMs: number
    chunks: SuggestionRollingHorizonChunk[]
}

export interface SuggestionDiagnostics {
    violations: SuggestionViolation[]
    coverage: SuggestionCoverage[]
    guardPools?: SuggestionGuardPool[]
    weeklyLeaveGroups?: SuggestionWeeklyLeaveGroup[]
    generationScope?: SuggestionGenerationScope
    historyReview?: PlanningHistoryReview & { boundaryRelaxedForFeasibility?: boolean }
    rollingHorizon?: SuggestionRollingHorizon
    lastManualBulkEdit?: {
        at: string
        action: 'ASSIGN_SERVICE' | 'REST'
        periodFrom: string
        periodTo: string
        dates?: string[]
        weekdays: PlanningDayKey[]
        templateGuid: string | null
        selectedItemCount: number
        affectedCellCount: number
        reason: string | null
    }
    regeneration?: {
        at: string
        mode: 'PRESERVE_MANUAL'
        lockedCellCount: number
        regeneratedCellCount: number
        previousConformityScore: number | null
        configGuid: string
        configVersion: number
        solverVersion: string
        warningCount?: number
        warnings?: Array<{
            code: string
            message: string
            details?: Record<string, unknown>
            suggested_actions?: string[]
        }>
    }
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
    /** Exclusion temporaire pour cette génération uniquement. */
    excluded_employee_guids?: string[]
    /** Corrections ponctuelles des anomalies historiques utilisées uniquement pour l'équité. */
    history_adjustments?: PlanningHistoryAdjustment[]
}

export interface PlanningReadinessItem {
    id:
        | 'profiles'
        | 'weekly_leave'
        | 'configuration'
        | 'requirements'
        | 'manager'
    label: string
    description: string
    ready: boolean
    routeName: string
    actionLabel: string
}
// ─────────────────────────────────────────────────────────────────────────────
// LOT 3 — modification en masse d'une suggestion
// ─────────────────────────────────────────────────────────────────────────────

export type SuggestionBulkEditAction = 'ASSIGN_SERVICE' | 'REST'

export interface SuggestionRegenerationResult {
    suggestion_guid: string
    locked_cell_count: number
    regenerated_cell_count: number
    employee_count: number
    conformity_score: number
    previous_conformity_score: number | null
    warnings?: Array<{
        code: string
        message: string
        details?: Record<string, unknown>
        suggested_actions?: string[]
    }>
}

export interface SuggestionBulkEditPayload {
    item_guids: string[]
    period_from: string
    period_to: string
    /** Dates explicites pour le mode « jours précis ». */
    dates?: string[]
    weekdays?: PlanningDayKey[]
    action: SuggestionBulkEditAction
    template_guid?: string | null
    reason?: string | null
}

export interface SuggestionBulkEditIssue {
    code: string
    message: string
    severity: 'BLOCKER' | 'WARNING'
    details?: Record<string, unknown>
    suggested_actions?: string[]
}

export interface SuggestionBulkEditChange {
    item_guid: string
    employee_guid: string
    employee_name: string
    date: string
    kind:
        | 'DIRECT'
        | 'GUARD_CONTINUATION'
        | 'POST_GUARD_REST'
        | 'GUARD_TAIL_CLEAR'
    before_template_guid: string | null
    after_template_guid: string | null
    after_label: string
}

export interface SuggestionBulkEditPreview {
    suggestion_guid: string
    affected_items: number
    affected_cells: number
    direct_dates: string[]
    changes: SuggestionBulkEditChange[]
    blockers: SuggestionBulkEditIssue[]
    warnings: SuggestionBulkEditIssue[]
    diagnostics: SuggestionDiagnostics
    conformity_score: number
    applied: boolean
}
