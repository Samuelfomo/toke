// Merge these declarations into planningSuggestion.type.ts.

export type WeeklyLeaveMode =
    | 'NONE'
    | 'PER_EMPLOYEE'
    | 'TEAM_ROTATION'

export interface WeeklyLeavePolicy {
    mode: WeeklyLeaveMode
    employees_per_week: number
    allowed_days: PlanningDayKey[]
    rotation_anchor_date: string | null
    complete_weeks_only: boolean
    post_guard_rest_counts_as_leave: boolean
}

// Replace the two properties in PlanningSuggestionRules:
// max_consecutive_work_days becomes nullable and weekly_leave_policy is added.
export interface PlanningSuggestionRulesTeamLeavePatch {
    min_rest_days_per_week: number
    max_consecutive_work_days: number | null
    weekly_leave_policy: WeeklyLeavePolicy
}

// Add these fields to PlanningSuggestionConfigPayload.
export interface PlanningSuggestionConfigPayloadTeamLeavePatch {
    weekly_leave_mode: WeeklyLeaveMode
    weekly_leave_employees_per_week: number
    weekly_leave_allowed_days: PlanningDayKey[]
    weekly_leave_rotation_anchor_date: string | null
    weekly_leave_complete_weeks_only: boolean
    post_guard_rest_counts_as_weekly_leave: boolean

    // This property must now accept null.
    max_consecutive_work_days: number | null
}

// Extend SuggestionReasonSource.
export type TeamLeaveSuggestionReasonSource =
    | 'WEEKLY_LEAVE'
    | 'TEMPLATE_REST'
    | 'UNASSIGNED'
