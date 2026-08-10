// import PlanningSuggestionConfigModel, {
//   PlanningEmployeePolicySelector,
//   PlanningGuardMemberServiceAccess,
//   PlanningGuardTeamMode,
//   PlanningGuardTeamSelectionMode,
//   PlanningMembershipBalanceMode,
//   PlanningPolicyMode,
//   PlanningServiceScopePolicy,
//   PlanningSolverType,
//   PlanningWeeklyLeaveCountMode,
//   PlanningWeeklyLeaveMode,
// } from '../model/PlanningSuggestionConfigModel.js';
//
// import User from './User.js';
//
// export default class PlanningSuggestionConfig extends PlanningSuggestionConfigModel {
//   private createdByObj?: User;
//
//   constructor() {
//     super();
//   }
//
//   static _load(
//     identifier: number | string,
//     byGuid: boolean = false,
//   ): Promise<PlanningSuggestionConfig | null> {
//     return new PlanningSuggestionConfig().load(identifier, byGuid);
//   }
//
//   static _loadActive(): Promise<PlanningSuggestionConfig | null> {
//     return new PlanningSuggestionConfig().loadActive();
//   }
//
//   static _list(
//     conditions: Record<string, any> = {},
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<PlanningSuggestionConfig[] | null> {
//     return new PlanningSuggestionConfig().list(conditions, paginationOptions);
//   }
//
//   getId(): number | undefined {
//     return this.id;
//   }
//
//   getGuid(): string | undefined {
//     return this.guid;
//   }
//
//   getName(): string | undefined {
//     return this.name;
//   }
//
//   getVersion(): number {
//     return this.version;
//   }
//
//   isActive(): boolean {
//     return this.active;
//   }
//
//   getMinRestDaysPerWeek(): number {
//     return this.min_rest_days_per_week;
//   }
//
//   getMaxConsecutiveWorkDays(): number | null | undefined {
//     return this.max_consecutive_work_days;
//   }
//
//   getMaxWeeklyMinutes(): number | null | undefined {
//     return this.max_weekly_minutes;
//   }
//
//   getMinRestMinutesBetweenShifts(): number {
//     return this.min_rest_minutes_between_shifts;
//   }
//
//   getMaxConsecutiveGuards(): number {
//     return this.max_consecutive_guards;
//   }
//
//   isRestAfterGuardRequired(): boolean {
//     return this.rest_after_guard_required;
//   }
//
//   getPostGuardRestDays(): number {
//     return this.post_guard_rest_days;
//   }
//
//   getMaxRestingEmployeesPerDay(): number | null | undefined {
//     return this.max_resting_employees_per_day;
//   }
//
//   getWeeklyLeaveMode(): PlanningWeeklyLeaveMode {
//     return this.weekly_leave_mode;
//   }
//
//   getWeeklyLeaveEmployeesPerWeek(): number {
//     return this.weekly_leave_employees_per_week;
//   }
//
//   getWeeklyLeaveAllowedDays(): string[] {
//     return [...this.weekly_leave_allowed_days];
//   }
//
//   getWeeklyLeaveRotationAnchorDate(): string | null | undefined {
//     return this.weekly_leave_rotation_anchor_date;
//   }
//
//   isWeeklyLeaveCompleteWeeksOnly(): boolean {
//     return this.weekly_leave_complete_weeks_only;
//   }
//
//   doesPostGuardRestCountAsWeeklyLeave(): boolean {
//     return this.post_guard_rest_counts_as_weekly_leave;
//   }
//
//   getPolicySchemaVersion(): number {
//     return this.policy_schema_version;
//   }
//   getWeeklyLeaveSelector(): PlanningEmployeePolicySelector {
//     return {
//       ...this.weekly_leave_selector,
//       planning_modes: [...this.weekly_leave_selector.planning_modes],
//     };
//   }
//   getWeeklyLeaveDaysPerEmployee(): number {
//     return this.weekly_leave_days_per_employee;
//   }
//   getWeeklyLeaveCountMode(): PlanningWeeklyLeaveCountMode {
//     return this.weekly_leave_count_mode;
//   }
//   getWeeklyLeaveMaxEmployeesPerDay(): number | null | undefined {
//     return this.weekly_leave_max_employees_per_day;
//   }
//   doesWeeklyLeaveRequireWorkOnOtherDays(): boolean {
//     return this.weekly_leave_require_work_on_other_days;
//   }
//   getWeeklyLeaveServiceScope(): PlanningServiceScopePolicy {
//     return {
//       ...this.weekly_leave_service_scope,
//       service_types: [...this.weekly_leave_service_scope.service_types],
//       template_guids: [...this.weekly_leave_service_scope.template_guids],
//       requirement_guids: [...this.weekly_leave_service_scope.requirement_guids],
//     };
//   }
//
//   getGuardTeamMode(): PlanningGuardTeamMode {
//     return this.guard_team_mode;
//   }
//
//   getGuardTeamEmployeesPerWeek(): number {
//     return this.guard_team_employees_per_week;
//   }
//
//   getGuardTeamSelectionMode(): PlanningGuardTeamSelectionMode {
//     return this.guard_team_selection_mode;
//   }
//
//   getGuardTeamRotationAnchorDate(): string | null | undefined {
//     return this.guard_team_rotation_anchor_date;
//   }
//
//   isGuardTeamCompleteWeeksOnly(): boolean {
//     return this.guard_team_complete_weeks_only;
//   }
//
//   doesGuardTeamRequireParticipation(): boolean {
//     return this.guard_team_require_participation;
//   }
//
//   getGuardTeamEligiblePlanningModes(): PlanningPolicyMode[] {
//     return [...this.guard_team_eligible_planning_modes];
//   }
//   getGuardTeamMemberServiceAccess(): PlanningGuardMemberServiceAccess {
//     return this.guard_team_member_service_access;
//   }
//   getGuardTeamBalanceMode(): PlanningMembershipBalanceMode {
//     return this.guard_team_balance_mode;
//   }
//   getGuardTeamMaxMembershipSpread(): number | null | undefined {
//     return this.guard_team_max_membership_spread;
//   }
//   getGuardTeamMaxConsecutiveMembershipWeeks(): number | null | undefined {
//     return this.guard_team_max_consecutive_membership_weeks;
//   }
//
//   getFairnessWindowWeeks(): number {
//     return this.fairness_window_weeks;
//   }
//
//   isStrictCoverage(): boolean {
//     return this.strict_coverage;
//   }
//
//   getSolverType(): PlanningSolverType {
//     return this.solver_type;
//   }
//
//   getSolverTimeoutSeconds(): number {
//     return this.solver_timeout_seconds;
//   }
//
//   shouldFallbackToGreedy(): boolean {
//     return this.fallback_to_greedy;
//   }
//
//   getCreatedBy(): number | undefined {
//     return this.created_by;
//   }
//
//   getCreatedAt(): Date | undefined {
//     return this.created_at;
//   }
//
//   getUpdatedAt(): Date | undefined {
//     return this.updated_at;
//   }
//
//   setName(value: string): this {
//     this.name = value;
//     return this;
//   }
//
//   setActive(value: boolean): this {
//     this.active = value;
//     return this;
//   }
//
//   setMinRestDaysPerWeek(value: number): this {
//     this.min_rest_days_per_week = value;
//     return this;
//   }
//
//   setMaxConsecutiveWorkDays(value: number | null): this {
//     this.max_consecutive_work_days = value;
//     return this;
//   }
//
//   setMaxWeeklyMinutes(value: number | null): this {
//     this.max_weekly_minutes = value;
//     return this;
//   }
//
//   setMinRestMinutesBetweenShifts(value: number): this {
//     this.min_rest_minutes_between_shifts = value;
//     return this;
//   }
//
//   setMaxConsecutiveGuards(value: number): this {
//     this.max_consecutive_guards = value;
//     return this;
//   }
//
//   setRestAfterGuardRequired(value: boolean): this {
//     this.rest_after_guard_required = value;
//     return this;
//   }
//
//   setPostGuardRestDays(value: number): this {
//     this.post_guard_rest_days = value;
//     return this;
//   }
//
//   setMaxRestingEmployeesPerDay(value: number | null): this {
//     this.max_resting_employees_per_day = value;
//     return this;
//   }
//
//   setWeeklyLeaveMode(value: PlanningWeeklyLeaveMode): this {
//     this.weekly_leave_mode = value;
//     return this;
//   }
//
//   setWeeklyLeaveEmployeesPerWeek(value: number): this {
//     this.weekly_leave_employees_per_week = value;
//     return this;
//   }
//
//   setWeeklyLeaveAllowedDays(value: string[]): this {
//     this.weekly_leave_allowed_days = [...value];
//     return this;
//   }
//
//   setWeeklyLeaveRotationAnchorDate(value: string | null): this {
//     this.weekly_leave_rotation_anchor_date = value;
//     return this;
//   }
//
//   setWeeklyLeaveCompleteWeeksOnly(value: boolean): this {
//     this.weekly_leave_complete_weeks_only = value;
//     return this;
//   }
//
//   setPostGuardRestCountsAsWeeklyLeave(value: boolean): this {
//     this.post_guard_rest_counts_as_weekly_leave = value;
//     return this;
//   }
//
//   setWeeklyLeaveSelector(value: PlanningEmployeePolicySelector): this {
//     this.weekly_leave_selector = { ...value, planning_modes: [...value.planning_modes] };
//     return this;
//   }
//   setWeeklyLeaveDaysPerEmployee(value: number): this {
//     this.weekly_leave_days_per_employee = value;
//     return this;
//   }
//   setWeeklyLeaveCountMode(value: PlanningWeeklyLeaveCountMode): this {
//     this.weekly_leave_count_mode = value;
//     return this;
//   }
//   setWeeklyLeaveMaxEmployeesPerDay(value: number | null): this {
//     this.weekly_leave_max_employees_per_day = value;
//     return this;
//   }
//   setWeeklyLeaveRequireWorkOnOtherDays(value: boolean): this {
//     this.weekly_leave_require_work_on_other_days = value;
//     return this;
//   }
//   setWeeklyLeaveServiceScope(value: PlanningServiceScopePolicy): this {
//     this.weekly_leave_service_scope = {
//       ...value,
//       service_types: [...value.service_types],
//       template_guids: [...value.template_guids],
//       requirement_guids: [...value.requirement_guids],
//     };
//     return this;
//   }
//
//   setGuardTeamMode(value: PlanningGuardTeamMode): this {
//     this.guard_team_mode = value;
//     return this;
//   }
//
//   setGuardTeamEmployeesPerWeek(value: number): this {
//     this.guard_team_employees_per_week = value;
//     return this;
//   }
//
//   setGuardTeamSelectionMode(value: PlanningGuardTeamSelectionMode): this {
//     this.guard_team_selection_mode = value;
//     return this;
//   }
//
//   setGuardTeamRotationAnchorDate(value: string | null): this {
//     this.guard_team_rotation_anchor_date = value;
//     return this;
//   }
//
//   setGuardTeamCompleteWeeksOnly(value: boolean): this {
//     this.guard_team_complete_weeks_only = value;
//     return this;
//   }
//
//   setGuardTeamRequireParticipation(value: boolean): this {
//     this.guard_team_require_participation = value;
//     return this;
//   }
//
//   setGuardTeamEligiblePlanningModes(value: PlanningPolicyMode[]): this {
//     this.guard_team_eligible_planning_modes = [...value];
//     return this;
//   }
//   setGuardTeamMemberServiceAccess(value: PlanningGuardMemberServiceAccess): this {
//     this.guard_team_member_service_access = value;
//     return this;
//   }
//   setGuardTeamBalanceMode(value: PlanningMembershipBalanceMode): this {
//     this.guard_team_balance_mode = value;
//     return this;
//   }
//   setGuardTeamMaxMembershipSpread(value: number | null): this {
//     this.guard_team_max_membership_spread = value;
//     return this;
//   }
//   setGuardTeamMaxConsecutiveMembershipWeeks(value: number | null): this {
//     this.guard_team_max_consecutive_membership_weeks = value;
//     return this;
//   }
//
//   setFairnessWindowWeeks(value: number): this {
//     this.fairness_window_weeks = value;
//     return this;
//   }
//
//   setStrictCoverage(value: boolean): this {
//     this.strict_coverage = value;
//     return this;
//   }
//
//   setSolverType(value: PlanningSolverType): this {
//     this.solver_type = value;
//     return this;
//   }
//
//   setSolverTimeoutSeconds(value: number): this {
//     this.solver_timeout_seconds = value;
//     return this;
//   }
//
//   setFallbackToGreedy(value: boolean): this {
//     this.fallback_to_greedy = value;
//     return this;
//   }
//
//   setCreatedBy(value: number): this {
//     this.created_by = value;
//     this.createdByObj = undefined;
//     return this;
//   }
//
//   isNew(): boolean {
//     return this.id === undefined;
//   }
//
//   async getCreatedByObj(): Promise<User | null> {
//     if (this.createdByObj) return this.createdByObj;
//     if (!this.created_by) return null;
//
//     const user = await User._load(this.created_by);
//     if (user) this.createdByObj = user;
//     return user;
//   }
//
//   async save(): Promise<void> {
//     if (this.isNew()) {
//       await this.create();
//     } else {
//       await this.update();
//     }
//   }
//
//   async activate(): Promise<void> {
//     await this.updateActive(true);
//   }
//
//   async deactivate(): Promise<void> {
//     await this.updateActive(false);
//   }
//
//   async softDelete(): Promise<boolean> {
//     if (!this.id) return false;
//     return await this.trash(this.id);
//   }
//
//   async toJSON(): Promise<object> {
//     const createdBy = await this.getCreatedByObj();
//
//     return {
//       guid: this.guid,
//       name: this.name,
//       version: this.version,
//       active: this.active,
//       rules: {
//         policy_schema_version: this.policy_schema_version,
//         min_rest_days_per_week: this.min_rest_days_per_week,
//         max_consecutive_work_days: this.max_consecutive_work_days,
//         max_weekly_minutes: this.max_weekly_minutes ?? null,
//         min_rest_minutes_between_shifts: this.min_rest_minutes_between_shifts,
//         max_consecutive_guards: this.max_consecutive_guards,
//         rest_after_guard_required: this.rest_after_guard_required,
//         post_guard_rest_days: this.post_guard_rest_days,
//         max_resting_employees_per_day: this.max_resting_employees_per_day ?? null,
//         weekly_leave_policy: {
//           mode: this.weekly_leave_mode,
//           employees_per_week: this.weekly_leave_employees_per_week,
//           allowed_days: this.weekly_leave_allowed_days,
//           rotation_anchor_date: this.weekly_leave_rotation_anchor_date ?? null,
//           complete_weeks_only: this.weekly_leave_complete_weeks_only,
//           post_guard_rest_counts_as_leave: this.post_guard_rest_counts_as_weekly_leave,
//           selector: this.getWeeklyLeaveSelector(),
//           days_per_employee: this.weekly_leave_days_per_employee,
//           count_mode: this.weekly_leave_count_mode,
//           max_employees_per_day: this.weekly_leave_max_employees_per_day ?? null,
//           require_work_on_other_days: this.weekly_leave_require_work_on_other_days,
//           service_scope: this.getWeeklyLeaveServiceScope(),
//         },
//         guard_team_policy: {
//           mode: this.guard_team_mode,
//           employees_per_week: this.guard_team_employees_per_week,
//           selection_mode: this.guard_team_selection_mode,
//           rotation_anchor_date: this.guard_team_rotation_anchor_date ?? null,
//           complete_weeks_only: this.guard_team_complete_weeks_only,
//           require_participation: this.guard_team_require_participation,
//           eligible_planning_modes: this.getGuardTeamEligiblePlanningModes(),
//           member_service_access: this.guard_team_member_service_access,
//           balance: {
//             mode: this.guard_team_balance_mode,
//             max_membership_spread: this.guard_team_max_membership_spread ?? null,
//             max_consecutive_membership_weeks:
//               this.guard_team_max_consecutive_membership_weeks ?? null,
//           },
//         },
//         fairness_window_weeks: this.fairness_window_weeks,
//         strict_coverage: this.strict_coverage,
//       },
//       solver: {
//         type: this.solver_type,
//         timeout_seconds: this.solver_timeout_seconds,
//         fallback_to_greedy: this.fallback_to_greedy,
//       },
//       created_by: createdBy
//         ? {
//             guid: createdBy.getGuid(),
//             name: createdBy.getFullName(),
//           }
//         : null,
//       created_at: this.created_at,
//       updated_at: this.updated_at,
//     };
//   }
//
//   hydrate(data: any): PlanningSuggestionConfig {
//     this.id = data.id;
//     this.guid = data.guid;
//     this.name = data.name;
//     this.version = data.version ?? 1;
//     this.active = data.active ?? false;
//     this.min_rest_days_per_week = data.min_rest_days_per_week ?? 1;
//     this.max_consecutive_work_days =
//       data.max_consecutive_work_days === undefined ? 6 : data.max_consecutive_work_days;
//     this.max_weekly_minutes = data.max_weekly_minutes ?? null;
//     this.min_rest_minutes_between_shifts = data.min_rest_minutes_between_shifts ?? 660;
//     this.max_consecutive_guards = data.max_consecutive_guards ?? 1;
//     this.rest_after_guard_required = data.rest_after_guard_required ?? true;
//     this.post_guard_rest_days = data.post_guard_rest_days ?? 0;
//     this.max_resting_employees_per_day = data.max_resting_employees_per_day ?? null;
//     this.weekly_leave_mode = data.weekly_leave_mode ?? 'PER_EMPLOYEE';
//     this.weekly_leave_employees_per_week = data.weekly_leave_employees_per_week ?? 1;
//     this.weekly_leave_allowed_days = Array.isArray(data.weekly_leave_allowed_days)
//       ? data.weekly_leave_allowed_days
//       : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
//     this.weekly_leave_rotation_anchor_date = data.weekly_leave_rotation_anchor_date ?? null;
//     this.weekly_leave_complete_weeks_only = data.weekly_leave_complete_weeks_only ?? true;
//     this.post_guard_rest_counts_as_weekly_leave =
//       data.post_guard_rest_counts_as_weekly_leave ?? false;
//     this.policy_schema_version = data.policy_schema_version ?? 2;
//     this.weekly_leave_selector = data.weekly_leave_selector ?? {
//       planning_modes: ['ROTATING'],
//       guard_pool_relation: 'ANY',
//     };
//     this.weekly_leave_days_per_employee = data.weekly_leave_days_per_employee ?? 1;
//     this.weekly_leave_count_mode = data.weekly_leave_count_mode ?? 'EXACT';
//     this.weekly_leave_max_employees_per_day = data.weekly_leave_max_employees_per_day ?? null;
//     this.weekly_leave_require_work_on_other_days =
//       data.weekly_leave_require_work_on_other_days ?? false;
//     this.weekly_leave_service_scope = data.weekly_leave_service_scope ?? {
//       mode: 'ANY',
//       service_types: [],
//       template_guids: [],
//       requirement_guids: [],
//       exclusive: false,
//     };
//     this.guard_team_mode = data.guard_team_mode ?? 'DAILY_FLEXIBLE';
//     this.guard_team_employees_per_week = data.guard_team_employees_per_week ?? 1;
//     this.guard_team_selection_mode = data.guard_team_selection_mode ?? 'ROTATION_ORDER';
//     this.guard_team_rotation_anchor_date = data.guard_team_rotation_anchor_date ?? null;
//     this.guard_team_complete_weeks_only = data.guard_team_complete_weeks_only ?? true;
//     this.guard_team_require_participation = data.guard_team_require_participation ?? true;
//     this.guard_team_eligible_planning_modes = data.guard_team_eligible_planning_modes ?? [
//       'ROTATING',
//     ];
//     this.guard_team_member_service_access = data.guard_team_member_service_access ?? 'ANY_SERVICE';
//     this.guard_team_balance_mode = data.guard_team_balance_mode ?? 'NONE';
//     this.guard_team_max_membership_spread = data.guard_team_max_membership_spread ?? null;
//     this.guard_team_max_consecutive_membership_weeks =
//       data.guard_team_max_consecutive_membership_weeks ?? null;
//     this.fairness_window_weeks = data.fairness_window_weeks ?? 8;
//     this.strict_coverage = data.strict_coverage ?? true;
//     this.solver_type = data.solver_type ?? 'GREEDY';
//     this.solver_timeout_seconds = data.solver_timeout_seconds ?? 20;
//     this.fallback_to_greedy = data.fallback_to_greedy ?? true;
//     this.created_by = data.created_by;
//     this.deleted_at = data.deleted_at ?? null;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//     return this;
//   }
//
//   private async load(
//     identifier: number | string,
//     byGuid: boolean,
//   ): Promise<PlanningSuggestionConfig | null> {
//     const data = byGuid
//       ? await this.findByGuid(String(identifier))
//       : await this.find(Number(identifier));
//
//     return data ? this.hydrate(data) : null;
//   }
//
//   private async loadActive(): Promise<PlanningSuggestionConfig | null> {
//     const data = await this.findActive();
//     return data ? this.hydrate(data) : null;
//   }
//
//   private async list(
//     conditions: Record<string, any>,
//     paginationOptions: { offset?: number; limit?: number },
//   ): Promise<PlanningSuggestionConfig[] | null> {
//     const dataset = await this.listAll(conditions, paginationOptions);
//     if (!dataset?.length) return null;
//     return dataset.map((data) => new PlanningSuggestionConfig().hydrate(data));
//   }
// }

import PlanningSuggestionConfigModel, {
  PlanningEmployeePolicySelector,
  PlanningGuardMemberServiceAccess,
  PlanningGuardTeamMode,
  PlanningGuardTeamSelectionMode,
  PlanningMembershipBalanceMode,
  PlanningPolicyMode,
  PlanningServiceScopePolicy,
  PlanningSolverType,
  PlanningWeeklyLeaveCountMode,
  PlanningWeeklyLeaveMode,
} from '../model/PlanningSuggestionConfigModel.js';

import User from './User.js';

export default class PlanningSuggestionConfig extends PlanningSuggestionConfigModel {
  private createdByObj?: User;

  constructor() {
    super();
  }

  static _load(
    identifier: number | string,
    byGuid: boolean = false,
  ): Promise<PlanningSuggestionConfig | null> {
    return new PlanningSuggestionConfig().load(identifier, byGuid);
  }

  static _loadActive(): Promise<PlanningSuggestionConfig | null> {
    return new PlanningSuggestionConfig().loadActive();
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PlanningSuggestionConfig[] | null> {
    return new PlanningSuggestionConfig().list(conditions, paginationOptions);
  }

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getName(): string | undefined {
    return this.name;
  }

  getVersion(): number {
    return this.version;
  }

  isActive(): boolean {
    return this.active;
  }

  getMinRestDaysPerWeek(): number {
    return this.min_rest_days_per_week;
  }

  getMaxConsecutiveWorkDays(): number | null | undefined {
    return this.max_consecutive_work_days;
  }

  getMaxWeeklyMinutes(): number | null | undefined {
    return this.max_weekly_minutes;
  }

  getMinRestMinutesBetweenShifts(): number {
    return this.min_rest_minutes_between_shifts;
  }

  getMaxConsecutiveGuards(): number {
    return this.max_consecutive_guards;
  }

  isRestAfterGuardRequired(): boolean {
    return this.rest_after_guard_required;
  }

  getPostGuardRestDays(): number {
    return this.post_guard_rest_days;
  }

  getMaxRestingEmployeesPerDay(): number | null | undefined {
    return this.max_resting_employees_per_day;
  }

  getWeeklyLeaveMode(): PlanningWeeklyLeaveMode {
    return this.weekly_leave_mode;
  }

  getWeeklyLeaveEmployeesPerWeek(): number {
    return this.weekly_leave_employees_per_week;
  }

  getWeeklyLeaveAllowedDays(): string[] {
    return [...this.weekly_leave_allowed_days];
  }

  getWeeklyLeaveRotationAnchorDate(): string | null | undefined {
    return this.weekly_leave_rotation_anchor_date;
  }

  isWeeklyLeaveCompleteWeeksOnly(): boolean {
    return this.weekly_leave_complete_weeks_only;
  }

  doesPostGuardRestCountAsWeeklyLeave(): boolean {
    return this.post_guard_rest_counts_as_weekly_leave;
  }

  getPolicySchemaVersion(): number {
    return this.policy_schema_version;
  }
  getWeeklyLeaveSelector(): PlanningEmployeePolicySelector {
    return {
      ...this.weekly_leave_selector,
      planning_modes: [...this.weekly_leave_selector.planning_modes],
    };
  }
  getWeeklyLeaveDaysPerEmployee(): number {
    return this.weekly_leave_days_per_employee;
  }
  getWeeklyLeaveCountMode(): PlanningWeeklyLeaveCountMode {
    return this.weekly_leave_count_mode;
  }
  getWeeklyLeaveMaxEmployeesPerDay(): number | null | undefined {
    return this.weekly_leave_max_employees_per_day;
  }
  doesWeeklyLeaveRequireWorkOnOtherDays(): boolean {
    return this.weekly_leave_require_work_on_other_days;
  }
  getWeeklyLeaveServiceScope(): PlanningServiceScopePolicy {
    return {
      ...this.weekly_leave_service_scope,
      service_types: [...this.weekly_leave_service_scope.service_types],
      template_guids: [...this.weekly_leave_service_scope.template_guids],
      requirement_guids: [...this.weekly_leave_service_scope.requirement_guids],
    };
  }

  getGuardTeamMode(): PlanningGuardTeamMode {
    return this.guard_team_mode;
  }

  getGuardTeamEmployeesPerWeek(): number {
    return this.guard_team_employees_per_week;
  }

  getGuardTeamSelectionMode(): PlanningGuardTeamSelectionMode {
    return this.guard_team_selection_mode;
  }

  getGuardTeamRotationAnchorDate(): string | null | undefined {
    return this.guard_team_rotation_anchor_date;
  }

  isGuardTeamCompleteWeeksOnly(): boolean {
    return this.guard_team_complete_weeks_only;
  }

  doesGuardTeamRequireParticipation(): boolean {
    return this.guard_team_require_participation;
  }

  getGuardTeamEligiblePlanningModes(): PlanningPolicyMode[] {
    return [...this.guard_team_eligible_planning_modes];
  }
  getGuardTeamMemberServiceAccess(): PlanningGuardMemberServiceAccess {
    return this.guard_team_member_service_access;
  }
  getGuardTeamBalanceMode(): PlanningMembershipBalanceMode {
    return this.guard_team_balance_mode;
  }
  getGuardTeamMaxMembershipSpread(): number | null | undefined {
    return this.guard_team_max_membership_spread;
  }
  getGuardTeamMaxConsecutiveMembershipWeeks(): number | null | undefined {
    return this.guard_team_max_consecutive_membership_weeks;
  }

  getFairnessWindowWeeks(): number {
    return this.fairness_window_weeks;
  }

  isStrictCoverage(): boolean {
    return this.strict_coverage;
  }

  getSolverType(): PlanningSolverType {
    return this.solver_type;
  }

  getSolverTimeoutSeconds(): number {
    return this.solver_timeout_seconds;
  }

  shouldFallbackToGreedy(): boolean {
    return this.fallback_to_greedy;
  }

  getCreatedBy(): number | undefined {
    return this.created_by;
  }

  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  getUpdatedAt(): Date | undefined {
    return this.updated_at;
  }

  setName(value: string): this {
    this.name = value;
    return this;
  }

  setActive(value: boolean): this {
    this.active = value;
    return this;
  }

  setMinRestDaysPerWeek(value: number): this {
    this.min_rest_days_per_week = value;
    return this;
  }

  setMaxConsecutiveWorkDays(value: number | null): this {
    this.max_consecutive_work_days = value;
    return this;
  }

  setMaxWeeklyMinutes(value: number | null): this {
    this.max_weekly_minutes = value;
    return this;
  }

  setMinRestMinutesBetweenShifts(value: number): this {
    this.min_rest_minutes_between_shifts = value;
    return this;
  }

  setMaxConsecutiveGuards(value: number): this {
    this.max_consecutive_guards = value;
    return this;
  }

  setRestAfterGuardRequired(value: boolean): this {
    this.rest_after_guard_required = value;
    return this;
  }

  setPostGuardRestDays(value: number): this {
    this.post_guard_rest_days = value;
    return this;
  }

  setMaxRestingEmployeesPerDay(value: number | null): this {
    this.max_resting_employees_per_day = value;
    return this;
  }

  setWeeklyLeaveMode(value: PlanningWeeklyLeaveMode): this {
    this.weekly_leave_mode = value;
    return this;
  }

  setWeeklyLeaveEmployeesPerWeek(value: number): this {
    this.weekly_leave_employees_per_week = value;
    return this;
  }

  setWeeklyLeaveAllowedDays(value: string[]): this {
    this.weekly_leave_allowed_days = [...value];
    return this;
  }

  setWeeklyLeaveRotationAnchorDate(value: string | null): this {
    this.weekly_leave_rotation_anchor_date = value;
    return this;
  }

  setWeeklyLeaveCompleteWeeksOnly(value: boolean): this {
    this.weekly_leave_complete_weeks_only = value;
    return this;
  }

  setPostGuardRestCountsAsWeeklyLeave(value: boolean): this {
    this.post_guard_rest_counts_as_weekly_leave = value;
    return this;
  }

  setWeeklyLeaveSelector(value: PlanningEmployeePolicySelector): this {
    this.weekly_leave_selector = { ...value, planning_modes: [...value.planning_modes] };
    return this;
  }
  setWeeklyLeaveDaysPerEmployee(value: number): this {
    this.weekly_leave_days_per_employee = value;
    return this;
  }
  setWeeklyLeaveCountMode(value: PlanningWeeklyLeaveCountMode): this {
    this.weekly_leave_count_mode = value;
    return this;
  }
  setWeeklyLeaveMaxEmployeesPerDay(value: number | null): this {
    this.weekly_leave_max_employees_per_day = value;
    return this;
  }
  setWeeklyLeaveRequireWorkOnOtherDays(value: boolean): this {
    this.weekly_leave_require_work_on_other_days = value;
    return this;
  }
  setWeeklyLeaveServiceScope(value: PlanningServiceScopePolicy): this {
    this.weekly_leave_service_scope = {
      ...value,
      service_types: [...value.service_types],
      template_guids: [...value.template_guids],
      requirement_guids: [...value.requirement_guids],
    };
    return this;
  }

  setGuardTeamMode(value: PlanningGuardTeamMode): this {
    this.guard_team_mode = value;
    return this;
  }

  setGuardTeamEmployeesPerWeek(value: number): this {
    this.guard_team_employees_per_week = value;
    return this;
  }

  setGuardTeamSelectionMode(value: PlanningGuardTeamSelectionMode): this {
    this.guard_team_selection_mode = value;
    return this;
  }

  setGuardTeamRotationAnchorDate(value: string | null): this {
    this.guard_team_rotation_anchor_date = value;
    return this;
  }

  setGuardTeamCompleteWeeksOnly(value: boolean): this {
    this.guard_team_complete_weeks_only = value;
    return this;
  }

  setGuardTeamRequireParticipation(value: boolean): this {
    this.guard_team_require_participation = value;
    return this;
  }

  setGuardTeamEligiblePlanningModes(value: PlanningPolicyMode[]): this {
    this.guard_team_eligible_planning_modes = [...value];
    return this;
  }
  setGuardTeamMemberServiceAccess(value: PlanningGuardMemberServiceAccess): this {
    this.guard_team_member_service_access = value;
    return this;
  }
  setGuardTeamBalanceMode(value: PlanningMembershipBalanceMode): this {
    this.guard_team_balance_mode = value;
    return this;
  }
  setGuardTeamMaxMembershipSpread(value: number | null): this {
    this.guard_team_max_membership_spread = value;
    return this;
  }
  setGuardTeamMaxConsecutiveMembershipWeeks(value: number | null): this {
    this.guard_team_max_consecutive_membership_weeks = value;
    return this;
  }

  setFairnessWindowWeeks(value: number): this {
    this.fairness_window_weeks = value;
    return this;
  }

  setStrictCoverage(value: boolean): this {
    this.strict_coverage = value;
    return this;
  }

  setSolverType(value: PlanningSolverType): this {
    this.solver_type = value;
    return this;
  }

  setSolverTimeoutSeconds(value: number): this {
    this.solver_timeout_seconds = value;
    return this;
  }

  setFallbackToGreedy(value: boolean): this {
    this.fallback_to_greedy = value;
    return this;
  }

  setCreatedBy(value: number): this {
    this.created_by = value;
    this.createdByObj = undefined;
    return this;
  }

  isNew(): boolean {
    return this.id === undefined;
  }

  async getCreatedByObj(): Promise<User | null> {
    if (this.createdByObj) return this.createdByObj;
    if (!this.created_by) return null;

    const user = await User._load(this.created_by);
    if (user) this.createdByObj = user;
    return user;
  }

  async save(): Promise<void> {
    if (this.isNew()) {
      await this.create();
    } else {
      await this.update();
    }
  }

  async activate(): Promise<void> {
    await this.updateActive(true);
  }

  async deactivate(): Promise<void> {
    await this.updateActive(false);
  }

  async softDelete(): Promise<boolean> {
    if (!this.id) return false;
    return await this.trash(this.id);
  }

  async toJSON(): Promise<object> {
    const createdBy = await this.getCreatedByObj();

    return {
      guid: this.guid,
      name: this.name,
      version: this.version,
      active: this.active,
      rules: {
        policy_schema_version: this.policy_schema_version,
        min_rest_days_per_week: this.min_rest_days_per_week,
        max_consecutive_work_days: this.max_consecutive_work_days,
        max_weekly_minutes: this.max_weekly_minutes ?? null,
        min_rest_minutes_between_shifts: this.min_rest_minutes_between_shifts,
        max_consecutive_guards: this.max_consecutive_guards,
        rest_after_guard_required: this.rest_after_guard_required,
        post_guard_rest_days: this.post_guard_rest_days,
        max_resting_employees_per_day: this.max_resting_employees_per_day ?? null,
        weekly_leave_policy: {
          mode: this.weekly_leave_mode,
          employees_per_week: this.weekly_leave_employees_per_week,
          allowed_days: this.weekly_leave_allowed_days,
          rotation_anchor_date: this.weekly_leave_rotation_anchor_date ?? null,
          complete_weeks_only: this.weekly_leave_complete_weeks_only,
          post_guard_rest_counts_as_leave: this.post_guard_rest_counts_as_weekly_leave,
          selector: this.getWeeklyLeaveSelector(),
          days_per_employee: this.weekly_leave_days_per_employee,
          count_mode: this.weekly_leave_count_mode,
          max_employees_per_day: this.weekly_leave_max_employees_per_day ?? null,
          require_work_on_other_days: this.weekly_leave_require_work_on_other_days,
          service_scope: this.getWeeklyLeaveServiceScope(),
        },
        guard_team_policy: {
          mode: this.guard_team_mode,
          employees_per_week: this.guard_team_employees_per_week,
          selection_mode: this.guard_team_selection_mode,
          rotation_anchor_date: this.guard_team_rotation_anchor_date ?? null,
          complete_weeks_only: this.guard_team_complete_weeks_only,
          require_participation: this.guard_team_require_participation,
          eligible_planning_modes: this.getGuardTeamEligiblePlanningModes(),
          member_service_access: this.guard_team_member_service_access,
          balance: {
            mode: this.guard_team_balance_mode,
            max_membership_spread: this.guard_team_max_membership_spread ?? null,
            max_consecutive_membership_weeks:
              this.guard_team_max_consecutive_membership_weeks ?? null,
          },
        },
        fairness_window_weeks: this.fairness_window_weeks,
        strict_coverage: this.strict_coverage,
      },
      solver: {
        type: this.solver_type,
        timeout_seconds: this.solver_timeout_seconds,
        fallback_to_greedy: this.fallback_to_greedy,
      },
      created_by: createdBy
        ? {
            guid: createdBy.getGuid(),
            name: createdBy.getFullName(),
          }
        : null,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  hydrate(data: any): PlanningSuggestionConfig {
    this.id = data.id;
    this.guid = data.guid;
    this.name = data.name;
    this.version = data.version ?? 1;
    this.active = data.active ?? false;
    this.min_rest_days_per_week = data.min_rest_days_per_week ?? 1;
    this.max_consecutive_work_days =
      data.max_consecutive_work_days === undefined ? 6 : data.max_consecutive_work_days;
    this.max_weekly_minutes = data.max_weekly_minutes ?? null;
    this.min_rest_minutes_between_shifts = data.min_rest_minutes_between_shifts ?? 660;
    this.max_consecutive_guards = data.max_consecutive_guards ?? 1;
    this.rest_after_guard_required = data.rest_after_guard_required ?? true;
    this.post_guard_rest_days = data.post_guard_rest_days ?? 0;
    this.max_resting_employees_per_day = data.max_resting_employees_per_day ?? null;
    this.weekly_leave_mode = data.weekly_leave_mode ?? 'PER_EMPLOYEE';
    this.weekly_leave_employees_per_week = data.weekly_leave_employees_per_week ?? 1;
    this.weekly_leave_allowed_days = Array.isArray(data.weekly_leave_allowed_days)
      ? data.weekly_leave_allowed_days
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    this.weekly_leave_rotation_anchor_date = data.weekly_leave_rotation_anchor_date ?? null;
    this.weekly_leave_complete_weeks_only = data.weekly_leave_complete_weeks_only ?? true;
    this.post_guard_rest_counts_as_weekly_leave =
      data.post_guard_rest_counts_as_weekly_leave ?? false;
    this.policy_schema_version = data.policy_schema_version ?? 2;
    this.weekly_leave_selector = data.weekly_leave_selector ?? {
      planning_modes: ['ROTATING'],
      guard_pool_relation: 'ANY',
    };
    this.weekly_leave_days_per_employee = data.weekly_leave_days_per_employee ?? 1;
    this.weekly_leave_count_mode = data.weekly_leave_count_mode ?? 'EXACT';
    this.weekly_leave_max_employees_per_day = data.weekly_leave_max_employees_per_day ?? null;
    this.weekly_leave_require_work_on_other_days =
      data.weekly_leave_require_work_on_other_days ?? false;
    this.weekly_leave_service_scope = data.weekly_leave_service_scope ?? {
      mode: 'ANY',
      service_types: [],
      template_guids: [],
      requirement_guids: [],
      exclusive: false,
    };
    this.guard_team_mode = data.guard_team_mode ?? 'DAILY_FLEXIBLE';
    this.guard_team_employees_per_week = data.guard_team_employees_per_week ?? 1;
    this.guard_team_selection_mode = data.guard_team_selection_mode ?? 'ROTATION_ORDER';
    this.guard_team_rotation_anchor_date = data.guard_team_rotation_anchor_date ?? null;
    this.guard_team_complete_weeks_only = data.guard_team_complete_weeks_only ?? true;
    this.guard_team_require_participation = data.guard_team_require_participation ?? true;
    this.guard_team_eligible_planning_modes = data.guard_team_eligible_planning_modes ?? [
      'ROTATING',
    ];
    this.guard_team_member_service_access = data.guard_team_member_service_access ?? 'ANY_SERVICE';
    this.guard_team_balance_mode = data.guard_team_balance_mode ?? 'NONE';
    this.guard_team_max_membership_spread = data.guard_team_max_membership_spread ?? null;
    this.guard_team_max_consecutive_membership_weeks =
      data.guard_team_max_consecutive_membership_weeks ?? null;
    this.fairness_window_weeks = data.fairness_window_weeks ?? 8;
    this.strict_coverage = data.strict_coverage ?? true;
    this.solver_type = data.solver_type ?? 'GREEDY';
    this.solver_timeout_seconds = data.solver_timeout_seconds ?? 20;
    this.fallback_to_greedy = data.fallback_to_greedy ?? true;
    this.created_by = data.created_by;
    this.deleted_at = data.deleted_at ?? null;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }

  private async load(
    identifier: number | string,
    byGuid: boolean,
  ): Promise<PlanningSuggestionConfig | null> {
    const data = byGuid
      ? await this.findByGuid(String(identifier))
      : await this.find(Number(identifier));

    return data ? this.hydrate(data) : null;
  }

  private async loadActive(): Promise<PlanningSuggestionConfig | null> {
    const data = await this.findActive();
    return data ? this.hydrate(data) : null;
  }

  private async list(
    conditions: Record<string, any>,
    paginationOptions: { offset?: number; limit?: number },
  ): Promise<PlanningSuggestionConfig[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset?.length) return null;
    return dataset.map((data) => new PlanningSuggestionConfig().hydrate(data));
  }
}
