from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from math import floor

from ortools.sat.python import cp_model

from app.weekly_leave import selected_rotation_orders
from app.weekly_guard_pool import validate_weekly_guard_capacity

from app.schemas import (
    AllocationMode,
    CoverageResult,
    DayReason,
    EngineDiagnostics,
    EngineResult,
    EngineTemplate,
    GuardPoolResult,
    WeeklyLeaveGroupResult,
    EmployeeSuggestionResult,
    PlanningRequirementInput,
    PlanningSolverInput,
    PlanningViolation,
    SolverResponse,
    SolverStats,
)


DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


@dataclass(frozen=True)
class RequirementSlot:
    requirement: PlanningRequirementInput
    iso: str


def parse_iso(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def add_days(value: str, amount: int) -> str:
    return (parse_iso(value) + timedelta(days=amount)).isoformat()


def period_dates(start: str, end: str) -> list[str]:
    current = parse_iso(start)
    last = parse_iso(end)
    if current > last:
        raise ValueError("periodFrom must be <= periodTo")

    result: list[str] = []
    while current <= last:
        result.append(current.isoformat())
        current += timedelta(days=1)
    return result


def day_key(iso: str) -> str:
    return DAY_KEYS[parse_iso(iso).weekday()]


def is_weekend(iso: str) -> bool:
    return day_key(iso) in {"Sat", "Sun"}


def monday_of_week(iso: str) -> str:
    value = parse_iso(iso)
    return (value - timedelta(days=value.weekday())).isoformat()


def to_minutes(value: str) -> int:
    hours, minutes = value.split(":")
    return int(hours) * 60 + int(minutes)


def blocks_for(template: EngineTemplate, iso: str):
    return template.definition.get(day_key(iso)) or []


def template_has_work(template: EngineTemplate, iso: str) -> bool:
    return bool(blocks_for(template, iso))


def template_minutes(template: EngineTemplate, iso: str) -> int:
    total = 0
    for block in blocks_for(template, iso):
        start = to_minutes(block.work[0])
        end = to_minutes(block.work[1])
        if end <= start:
            end += 24 * 60
        duration = end - start

        if block.pause:
            pause_start = to_minutes(block.pause[0])
            pause_end = to_minutes(block.pause[1])
            if pause_end <= pause_start:
                pause_end += 24 * 60
            duration -= pause_end - pause_start

        total += max(0, duration)

    return total


def first_start(template: EngineTemplate, iso: str) -> int | None:
    blocks = blocks_for(template, iso)
    if not blocks:
        return None
    return min(to_minutes(block.work[0]) for block in blocks)


def last_end(template: EngineTemplate, iso: str) -> int | None:
    blocks = blocks_for(template, iso)
    if not blocks:
        return None

    values: list[int] = []
    for block in blocks:
        start = to_minutes(block.work[0])
        end = to_minutes(block.work[1])
        if end <= start:
            end += 24 * 60
        values.append(end)
    return max(values)


class OrToolsPlanner:
    def __init__(self, request: PlanningSolverInput):
        self.request = request
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()

        self.dates = period_dates(request.periodFrom, request.periodTo)
        self.included = [
            employee
            for employee in request.employees
            if employee.mode != "EXCLUDED"
        ]
        self.rotating = [
            employee
            for employee in self.included
            if employee.mode == "ROTATING"
        ]
        self.fixed = [
            employee
            for employee in self.included
            if employee.mode == "FIXED"
        ]
        self.team_weekly_leave_enabled = (
            request.config.weeklyLeavePolicy.mode == "TEAM_ROTATION"
        )
        self.eligible_weekly_leave_enabled = (
            request.config.weeklyLeavePolicy.mode == "PER_ELIGIBLE_EMPLOYEE"
        )
        self.weekly_guard_pool_enabled = (
            request.config.guardTeamPolicy.mode == "WEEKLY_POOL"
        )

        # In TEAM_ROTATION mode every included FIXED employee needs a work
        # variable so CP-SAT can remove exactly the selected weekly leave day.
        variable_fixed_guids = {
            employee.guid
            for employee in self.fixed
            if employee.fixedRestDayMode == "ROTATING"
            or self.team_weekly_leave_enabled
            or (
                self.eligible_weekly_leave_enabled
                and employee.mode in request.config.weeklyLeavePolicy.selector.planningModes
            )
        }
        self.fixed_rotating_rest = [
            employee
            for employee in self.fixed
            if employee.guid in variable_fixed_guids
        ]
        self.fixed_template_rest = [
            employee
            for employee in self.fixed
            if employee.guid not in variable_fixed_guids
        ]

        self.slots: list[RequirementSlot] = []
        for iso in self.dates:
            current_day = day_key(iso)
            for requirement in request.requirements:
                if requirement.dayOfWeek == current_day:
                    self.slots.append(RequirementSlot(requirement, iso))

        # x[(employee_guid, date, requirement_guid)] = selected requirement.
        self.x: dict[tuple[str, str, str], cp_model.IntVar] = {}
        self.fixed_work: dict[tuple[str, str], cp_model.IntVar] = {}

        # A weekly leave is a specific business event. It is not the same as
        # post-guard recovery, a template rest day or an unassigned day.
        self.weekly_leave: dict[tuple[str, str], cp_model.IntVar] = {}

        # Weekly guard pool membership is separate from daily guard starts.
        # A tenant may keep DAILY_FLEXIBLE, or restrict guard starts to a
        # stable set of ROTATING employees for each eligible week.
        self.weekly_guard_pool: dict[tuple[str, str], cp_model.IntVar] = {}

        # Work activity includes a normal assignment or guard continuation.
        self.work_day: dict[tuple[str, str], cp_model.IntVar] = {}
        self.guard_day: dict[tuple[str, str], cp_model.IntVar] = {}

        self.fixed_counts: dict[tuple[str, str], int] = defaultdict(int)
        self.history_shift_count: dict[str, int] = defaultdict(int)
        self.history_guard_count: dict[str, int] = defaultdict(int)
        self.history_weekend_count: dict[str, int] = defaultdict(int)
        self.history_minutes: dict[str, int] = defaultdict(int)
        self.history_template_count: dict[tuple[str, str], int] = defaultdict(int)

        self.under_target_vars: list[cp_model.IntVar] = []
        self.fill_vars: list[cp_model.IntVar] = []
        self.optional_leave_vars: list[cp_model.IntVar] = []
        self.guard_pool_balance_terms: list = []
        self.objective_terms: list = []

    def build(self) -> None:
        self._validate_templates()
        self._build_history()
        self._build_fixed_counts()
        self._build_variables()
        self._build_fixed_work_variables()
        self._apply_one_assignment_per_day()
        self._apply_guard_continuations()
        self._build_work_days()
        self._build_weekly_leave_variables()
        self._apply_guard_team_policy()
        self._apply_weekly_leave_policy()
        self._apply_requirement_eligibility()
        self._apply_coverage()
        self._apply_weekly_rest()
        self._apply_daily_rest_capacity()
        self._apply_max_consecutive_work_days()
        self._apply_weekly_minutes()
        self._apply_max_consecutive_guards()
        self._apply_rest_between_shifts()
        self._build_objective()

    def _validate_templates(self) -> None:
        self._validate_weekly_leave_policy()
        self._validate_guard_team_policy()
        self._validate_requirement_eligibility_policy()
        violations = []
        for slot in self.slots:
            requirement = slot.requirement
            if not template_has_work(requirement.template, slot.iso):
                violations.append(
                    f"{requirement.template.name} has no work block on {slot.iso}"
                )

            if requirement.serviceType == "GUARD":
                continuation_date = add_days(
                    slot.iso, requirement.continuationDayOffset
                )
                if not requirement.continuationTemplate or not template_has_work(
                    requirement.continuationTemplate, continuation_date
                ):
                    violations.append(
                        f"{requirement.template.name} has no valid continuation on "
                        f"{continuation_date}"
                    )

        for employee in self.fixed_template_rest:
            assert employee.fixedTemplate is not None
            for iso in self.dates:
                # A fixed template is allowed to define rest on some dates.
                _ = employee.fixedTemplate.definition.get(day_key(iso))

        if violations:
            raise ValueError("; ".join(violations))

    def _validate_requirement_eligibility_policy(self) -> None:
        guard_policy = self.request.config.guardTeamPolicy
        pool_enabled = guard_policy.mode == "WEEKLY_POOL"
        violations: list[str] = []

        for requirement in self.request.requirements:
            relation = requirement.eligibility.guardPoolRelation

            if relation != "ANY" and not pool_enabled:
                violations.append(
                    f"Requirement {requirement.guid} uses guard-pool relation "
                    f"{relation} while guardTeamPolicy.mode is DAILY_FLEXIBLE"
                )
                continue

            if not pool_enabled:
                continue

            if requirement.serviceType == "GUARD" and relation == "NON_MEMBER":
                violations.append(
                    f"Guard requirement {requirement.guid} targets NON_MEMBER, "
                    "but WEEKLY_POOL permits guard starts only for pool members"
                )

            if (
                guard_policy.memberServiceAccess == "GUARD_ONLY"
                and requirement.serviceType == "STANDARD"
                and relation == "MEMBER"
                and requirement.minEmployees > 0
            ):
                violations.append(
                    f"Standard requirement {requirement.guid} targets MEMBER, "
                    "but guardTeamPolicy.memberServiceAccess is GUARD_ONLY"
                )

        if violations:
            raise ValueError("; ".join(violations))

    def _validate_weekly_leave_policy(self) -> None:
        policy = self.request.config.weeklyLeavePolicy
        if policy.mode == "TEAM_ROTATION":
            if not self.included:
                raise ValueError("TEAM_ROTATION requires at least one included employee")

            missing_orders = [
                employee.name
                for employee in self.included
                if employee.rotationOrder is None
            ]
            if missing_orders:
                raise ValueError(
                    "TEAM_ROTATION requires rotationOrder for every included employee: "
                    + ", ".join(missing_orders)
                )

            orders = [employee.rotationOrder for employee in self.included]
            if len(set(orders)) != len(orders):
                raise ValueError(
                    "TEAM_ROTATION requires unique rotationOrder values"
                )

            if policy.employeesPerWeek > len(self.included):
                raise ValueError(
                    "weeklyLeavePolicy.employeesPerWeek cannot exceed included employees"
                )
            return

        if policy.mode != "PER_ELIGIBLE_EMPLOYEE":
            return

        if policy.selector.guardPoolRelation != "ANY":
            if self.request.config.guardTeamPolicy.mode != "WEEKLY_POOL":
                raise ValueError(
                    "A weekly leave selector based on guard pool membership requires WEEKLY_POOL"
                )

        selectable = [
            employee
            for employee in self.included
            if employee.mode in policy.selector.planningModes
        ]
        if not selectable:
            raise ValueError(
                "PER_ELIGIBLE_EMPLOYEE selector does not match any included employee"
            )

        if (
            policy.maxEmployeesPerDay is not None
            and policy.countMode == "EXACT"
        ):
            possible_days = len(policy.allowedDays) * policy.maxEmployeesPerDay
            eligible_count = len(selectable)
            relation = policy.selector.guardPoolRelation

            if relation in {"MEMBER", "NON_MEMBER"}:
                pool_size = self.request.config.guardTeamPolicy.employeesPerWeek
                selectable_rotating = sum(
                    1 for employee in selectable if employee.mode == "ROTATING"
                )
                selected_from_selector = min(pool_size, selectable_rotating)
                eligible_count = (
                    selected_from_selector
                    if relation == "MEMBER"
                    else len(selectable) - selected_from_selector
                )

            if eligible_count * policy.daysPerEmployee > possible_days:
                raise ValueError(
                    "weekly leave capacity is insufficient for the selected employees, "
                    "allowed days and maxEmployeesPerDay"
                )

        if policy.requireWorkOnOtherDays and "ROTATING" in policy.selector.planningModes:
            if not any(
                self._slot_matches_scope(slot, policy.serviceScope)
                for slot in self.slots
            ):
                raise ValueError(
                    "weekly leave service scope does not match any active requirement"
                )

    def _guard_pool_selected_employees(
        self,
        week_monday: str,
    ):
        policy = self.request.config.guardTeamPolicy
        if policy.selectionMode != "ROTATION_ORDER":
            return []

        selected_orders = set(
            selected_rotation_orders(
                [
                    employee.rotationOrder
                    for employee in self.rotating
                    if employee.rotationOrder is not None
                ],
                policy.employeesPerWeek,
                week_monday,
                policy.rotationAnchorDate or week_monday,
            )
        )
        return [
            employee
            for employee in self.rotating
            if employee.rotationOrder in selected_orders
        ]


    def _validate_guard_team_policy(self) -> None:
        policy = self.request.config.guardTeamPolicy
        if policy.mode != "WEEKLY_POOL":
            return

        if not self.rotating:
            raise ValueError(
                "WEEKLY_POOL requires at least one ROTATING employee"
            )

        if policy.employeesPerWeek > len(self.rotating):
            raise ValueError(
                "guardTeamPolicy.employeesPerWeek cannot exceed ROTATING employees"
            )

        if policy.selectionMode == "ROTATION_ORDER":
            missing_orders = [
                employee.name
                for employee in self.rotating
                if employee.rotationOrder is None
            ]
            if missing_orders:
                raise ValueError(
                    "WEEKLY_POOL with ROTATION_ORDER requires rotationOrder "
                    "for every ROTATING employee: "
                    + ", ".join(missing_orders)
                )

            orders = [
                employee.rotationOrder
                for employee in self.rotating
            ]
            if len(set(orders)) != len(orders):
                raise ValueError(
                    "WEEKLY_POOL with ROTATION_ORDER requires unique "
                    "rotationOrder values among ROTATING employees"
                )

        guard_slots = [
            slot
            for slot in self.slots
            if slot.requirement.serviceType == "GUARD"
        ]
        if not guard_slots:
            raise ValueError(
                "WEEKLY_POOL requires at least one GUARD coverage requirement"
            )

        # A guard start always blocks the continuation date. Full post-guard
        # rest days extend that cooldown. This preflight produces an explicit
        # configuration error instead of a generic CP-SAT infeasible result.
        minimum_start_gap_days = 2 + (
            self.request.config.postGuardRestDays
            if self.request.config.restAfterGuardRequired
            else 0
        )

        for week_monday, dates in self._week_groups().items():
            if policy.completeWeeksOnly and len(dates) != 7:
                continue

            week_guard_slots = [
                slot for slot in guard_slots if slot.iso in dates
            ]
            if not week_guard_slots:
                continue

            required_by_date: dict[str, int] = defaultdict(int)
            for slot in week_guard_slots:
                required_by_date[slot.iso] += slot.requirement.minEmployees

            validate_weekly_guard_capacity(
                required_by_date=dict(required_by_date),
                employees_per_week=policy.employeesPerWeek,
                minimum_start_gap_days=minimum_start_gap_days,
                week_monday=week_monday,
            )

    def _build_history(self) -> None:
        employee_guids = {employee.guid for employee in self.rotating}

        for assignment in self.request.historicalAssignments:
            if assignment.userGuid not in employee_guids:
                continue

            current = max(parse_iso(assignment.startDate), parse_iso(
                add_days(
                    self.request.periodFrom,
                    -(self.request.config.fairnessWindowWeeks * 7),
                )
            ))
            end = min(
                parse_iso(assignment.endDate),
                parse_iso(add_days(self.request.periodFrom, -1)),
            )

            template = EngineTemplate(
                guid=assignment.templateGuid,
                name=assignment.templateName,
                definition=assignment.definition,
            )

            while current <= end:
                iso = current.isoformat()
                if template_has_work(template, iso):
                    minutes = template_minutes(template, iso)
                    self.history_shift_count[assignment.userGuid] += 1
                    self.history_minutes[assignment.userGuid] += minutes
                    self.history_template_count[
                        (assignment.userGuid, assignment.templateGuid)
                    ] += 1
                    if assignment.serviceType == "GUARD":
                        self.history_guard_count[assignment.userGuid] += 1
                    if is_weekend(iso):
                        self.history_weekend_count[assignment.userGuid] += 1
                current += timedelta(days=1)

    def _build_fixed_counts(self) -> None:
        for employee in self.fixed_template_rest:
            assert employee.fixedTemplate is not None

            for iso in self.dates:
                if template_has_work(employee.fixedTemplate, iso):
                    self.fixed_counts[
                        (iso, employee.fixedTemplate.guid)
                    ] += 1

    def _build_variables(self) -> None:
        for employee in self.rotating:
            for slot in self.slots:
                key = (employee.guid, slot.iso, slot.requirement.guid)
                self.x[key] = self.model.NewBoolVar(
                    f"x_{employee.guid}_{slot.iso}_{slot.requirement.guid}"
                )

    def _build_fixed_work_variables(self) -> None:
        for employee in self.fixed_rotating_rest:
            assert employee.fixedTemplate is not None
            for iso in self.dates:
                variable = self.model.NewBoolVar(
                    f"fixed_work_{employee.guid}_{iso}"
                )
                self.fixed_work[(employee.guid, iso)] = variable
                if not template_has_work(employee.fixedTemplate, iso):
                    self.model.Add(variable == 0)

    def _fixed_work_term(self, employee, iso: str):
        variable = self.fixed_work.get((employee.guid, iso))
        if variable is not None:
            return variable
        assert employee.fixedTemplate is not None
        return 1 if template_has_work(employee.fixedTemplate, iso) else 0

    def _slot_var(self, employee_guid: str, slot: RequirementSlot):
        return self.x[(employee_guid, slot.iso, slot.requirement.guid)]

    def _daily_slots(self, iso: str) -> list[RequirementSlot]:
        return [slot for slot in self.slots if slot.iso == iso]

    def _guard_slots(self, iso: str) -> list[RequirementSlot]:
        return [
            slot
            for slot in self._daily_slots(iso)
            if slot.requirement.serviceType == "GUARD"
        ]

    def _apply_one_assignment_per_day(self) -> None:
        for employee in self.rotating:
            for iso in self.dates:
                variables = [
                    self._slot_var(employee.guid, slot)
                    for slot in self._daily_slots(iso)
                ]
                if variables:
                    self.model.Add(sum(variables) <= 1)

    def _apply_guard_continuations(self) -> None:
        # A continuation is worked from 00:00/00:01 to 08:00 and therefore
        # always blocks another ordinary assignment on the same calendar day.
        for employee in self.rotating:
            for slot in self.slots:
                if slot.requirement.serviceType != "GUARD":
                    continue

                guard_var = self._slot_var(employee.guid, slot)
                continuation_date = add_days(
                    slot.iso, slot.requirement.continuationDayOffset
                )

                if continuation_date not in self.dates:
                    continue

                next_day_variables = [
                    self._slot_var(employee.guid, next_slot)
                    for next_slot in self._daily_slots(continuation_date)
                ]

                if next_day_variables:
                    self.model.Add(sum(next_day_variables) == 0).OnlyEnforceIf(
                        guard_var
                    )

                if self.request.config.restAfterGuardRequired:
                    for offset in range(
                        1,
                        self.request.config.postGuardRestDays + 1,
                    ):
                        rest_date = add_days(continuation_date, offset)
                        if rest_date not in self.dates:
                            continue
                        rest_variables = [
                            self._slot_var(employee.guid, next_slot)
                            for next_slot in self._daily_slots(rest_date)
                        ]
                        if rest_variables:
                            self.model.Add(
                                sum(rest_variables) == 0
                            ).OnlyEnforceIf(guard_var)

    def _build_work_days(self) -> None:
        for employee in self.rotating:
            for iso in self.dates:
                current_assignments = [
                    self._slot_var(employee.guid, slot)
                    for slot in self._daily_slots(iso)
                ]

                previous_guard_vars = []
                previous_date = add_days(iso, -1)
                for slot in self._guard_slots(previous_date):
                    if slot.requirement.continuationDayOffset == 1:
                        previous_guard_vars.append(
                            self._slot_var(employee.guid, slot)
                        )

                active_terms = current_assignments + previous_guard_vars
                variable = self.model.NewBoolVar(
                    f"work_day_{employee.guid}_{iso}"
                )
                self.work_day[(employee.guid, iso)] = variable

                if not active_terms:
                    self.model.Add(variable == 0)
                else:
                    self.model.Add(variable == sum(active_terms))

                guard_terms = [
                    self._slot_var(employee.guid, slot)
                    for slot in self._guard_slots(iso)
                ]
                guard_variable = self.model.NewBoolVar(
                    f"guard_day_{employee.guid}_{iso}"
                )
                self.guard_day[(employee.guid, iso)] = guard_variable
                if guard_terms:
                    self.model.Add(guard_variable == sum(guard_terms))
                else:
                    self.model.Add(guard_variable == 0)

        for employee in self.fixed_rotating_rest:
            for iso in self.dates:
                variable = self.fixed_work[(employee.guid, iso)]
                self.work_day[(employee.guid, iso)] = variable
                guard_variable = self.model.NewBoolVar(
                    f"guard_day_{employee.guid}_{iso}"
                )
                self.guard_day[(employee.guid, iso)] = guard_variable
                self.model.Add(guard_variable == 0)

    def _build_weekly_leave_variables(self) -> None:
        policy = self.request.config.weeklyLeavePolicy
        if policy.mode not in {"TEAM_ROTATION", "PER_ELIGIBLE_EMPLOYEE"}:
            return

        allowed_days = set(policy.allowedDays)
        week_groups = self._week_groups()
        full_week_dates = {
            iso
            for dates in week_groups.values()
            if not policy.completeWeeksOnly or len(dates) == 7
            for iso in dates
        }

        for employee in self.included:
            for iso in self.dates:
                variable = self.model.NewBoolVar(
                    f"weekly_leave_{employee.guid}_{iso}"
                )
                self.weekly_leave[(employee.guid, iso)] = variable

                eligible_date = (
                    iso in full_week_dates
                    and day_key(iso) in allowed_days
                )

                if employee.mode == "FIXED":
                    assert employee.fixedTemplate is not None
                    eligible_date = eligible_date and template_has_work(
                        employee.fixedTemplate, iso
                    )

                if not eligible_date:
                    self.model.Add(variable == 0)

    def _rotation_selected_employees(
        self,
        week_monday: str,
    ):
        policy = self.request.config.weeklyLeavePolicy
        selected_orders = set(
            selected_rotation_orders(
                [
                    employee.rotationOrder
                    for employee in self.included
                    if employee.rotationOrder is not None
                ],
                policy.employeesPerWeek,
                week_monday,
                policy.rotationAnchorDate or week_monday,
            )
        )
        return [
            employee
            for employee in self.included
            if employee.rotationOrder in selected_orders
        ]

    def _pool_membership_term(self, employee, week_monday: str):
        variable = self.weekly_guard_pool.get((employee.guid, week_monday))
        if variable is not None:
            return variable
        return 0

    def _selector_eligibility_term(self, employee, week_monday: str, selector):
        if employee.mode not in selector.planningModes:
            return 0

        relation = selector.guardPoolRelation
        pool = self._pool_membership_term(employee, week_monday)
        if relation == "ANY":
            return 1
        if relation == "MEMBER":
            return pool
        if relation == "NON_MEMBER":
            return 1 - pool
        raise ValueError(f"Unsupported guard pool relation: {relation}")

    @staticmethod
    def _slot_matches_scope(slot: RequirementSlot, scope) -> bool:
        if scope.mode == "ANY":
            return True
        if scope.mode == "SERVICE_TYPE":
            return slot.requirement.serviceType in scope.serviceTypes
        if scope.mode == "TEMPLATE":
            return slot.requirement.template.guid in scope.templateGuids
        if scope.mode == "REQUIREMENT":
            return slot.requirement.guid in scope.requirementGuids
        return False

    def _scoped_work_terms(self, employee, iso: str, scope):
        if employee.mode == "ROTATING":
            slots = [
                slot
                for slot in self._daily_slots(iso)
                if self._slot_matches_scope(slot, scope)
            ]
            return [self._slot_var(employee.guid, slot) for slot in slots]

        assert employee.fixedTemplate is not None
        if scope.mode == "ANY":
            return [self._fixed_work_term(employee, iso)]
        if scope.mode == "TEMPLATE":
            if employee.fixedTemplate.guid in scope.templateGuids:
                return [self._fixed_work_term(employee, iso)]
            return []
        if scope.mode == "SERVICE_TYPE":
            # A fixed template has no intrinsic service type. It is considered
            # in scope when an active requirement references the same template
            # with a selected service type.
            matched = any(
                slot.iso == iso
                and slot.requirement.template.guid == employee.fixedTemplate.guid
                and slot.requirement.serviceType in scope.serviceTypes
                for slot in self.slots
            )
            return [self._fixed_work_term(employee, iso)] if matched else []
        if scope.mode == "REQUIREMENT":
            matched = any(
                slot.iso == iso
                and slot.requirement.guid in scope.requirementGuids
                and slot.requirement.template.guid == employee.fixedTemplate.guid
                for slot in self.slots
            )
            return [self._fixed_work_term(employee, iso)] if matched else []
        return []

    def _apply_weekly_leave_policy(self) -> None:
        policy = self.request.config.weeklyLeavePolicy
        if policy.mode not in {"TEAM_ROTATION", "PER_ELIGIBLE_EMPLOYEE"}:
            return

        # A business weekly leave always blocks work and cannot overlap a guard
        # continuation or a distinct post-guard recovery day.
        for employee in self.included:
            for iso in self.dates:
                leave = self.weekly_leave[(employee.guid, iso)]
                work = self.work_day.get((employee.guid, iso))
                if work is not None:
                    self.model.Add(leave + work <= 1)

                if employee.mode == "ROTATING":
                    previous_guard_terms = [
                        self._slot_var(employee.guid, slot)
                        for slot in self._guard_slots(add_days(iso, -1))
                        if slot.requirement.continuationDayOffset == 1
                    ]
                    if previous_guard_terms:
                        self.model.Add(leave + sum(previous_guard_terms) <= 1)

                    if (
                        self.request.config.restAfterGuardRequired
                        and not policy.postGuardRestCountsAsLeave
                    ):
                        for offset in range(
                            1, self.request.config.postGuardRestDays + 1
                        ):
                            guard_start_date = add_days(iso, -(1 + offset))
                            guard_terms = [
                                self._slot_var(employee.guid, slot)
                                for slot in self._guard_slots(guard_start_date)
                            ]
                            if guard_terms:
                                self.model.Add(leave + sum(guard_terms) <= 1)

        if policy.mode == "TEAM_ROTATION":
            for employee in self.fixed_rotating_rest:
                assert employee.fixedTemplate is not None
                for iso in self.dates:
                    if not template_has_work(employee.fixedTemplate, iso):
                        continue
                    self.model.Add(
                        self.fixed_work[(employee.guid, iso)]
                        + self.weekly_leave[(employee.guid, iso)]
                        == 1
                    )

            for week_monday, dates in self._week_groups().items():
                if policy.completeWeeksOnly and len(dates) != 7:
                    continue

                selected_guids = {
                    employee.guid
                    for employee in self._rotation_selected_employees(week_monday)
                }

                for employee in self.included:
                    terms = [
                        self.weekly_leave[(employee.guid, iso)]
                        for iso in dates
                    ]
                    self.model.Add(
                        sum(terms) == (1 if employee.guid in selected_guids else 0)
                    )

                self.model.Add(
                    sum(
                        self.weekly_leave[(employee.guid, iso)]
                        for employee in self.included
                        for iso in dates
                    )
                    == policy.employeesPerWeek
                )
            return

        # Generic leave policy: one rule applies independently to every employee
        # matched by planning mode and guard-pool membership.
        for week_monday, dates in self._week_groups().items():
            if policy.completeWeeksOnly and len(dates) != 7:
                continue

            for employee in self.included:
                eligible = self._selector_eligibility_term(
                    employee, week_monday, policy.selector
                )
                leave_terms = [
                    self.weekly_leave[(employee.guid, iso)] for iso in dates
                ]
                leave_sum = sum(leave_terms)

                # Non-eligible employees cannot receive this policy's leave.
                self.model.Add(leave_sum <= len(dates) * eligible)

                if policy.countMode == "EXACT":
                    self.model.Add(leave_sum == policy.daysPerEmployee * eligible)
                else:
                    self.model.Add(leave_sum >= policy.daysPerEmployee * eligible)
                    self.optional_leave_vars.extend(leave_terms)

                if policy.requireWorkOnOtherDays:
                    for iso in dates:
                        # A FIXED profile may already have a template-defined
                        # rest day. "Work on other days" only applies to dates
                        # where that fixed template normally contains work.
                        if (
                            employee.mode == "FIXED"
                            and employee.fixedTemplate is not None
                            and not template_has_work(employee.fixedTemplate, iso)
                        ):
                            continue

                        leave = self.weekly_leave[(employee.guid, iso)]
                        scoped_terms = self._scoped_work_terms(
                            employee, iso, policy.serviceScope
                        )
                        scoped_work = sum(scoped_terms) if scoped_terms else 0
                        self.model.Add(scoped_work + leave >= eligible)

                        if policy.serviceScope.exclusive:
                            if employee.mode == "ROTATING":
                                outside_terms = [
                                    self._slot_var(employee.guid, slot)
                                    for slot in self._daily_slots(iso)
                                    if not self._slot_matches_scope(
                                        slot, policy.serviceScope
                                    )
                                ]
                                for outside in outside_terms:
                                    self.model.Add(outside + eligible <= 1)

            if policy.maxEmployeesPerDay is not None:
                for iso in dates:
                    self.model.Add(
                        sum(
                            self.weekly_leave[(employee.guid, iso)]
                            for employee in self.included
                        )
                        <= policy.maxEmployeesPerDay
                    )

    def _apply_guard_team_policy(self) -> None:
        policy = self.request.config.guardTeamPolicy
        if policy.mode != "WEEKLY_POOL":
            return

        eligible_rotating = [
            employee
            for employee in self.rotating
            if employee.mode in policy.eligiblePlanningModes
        ]
        eligible_guids = {employee.guid for employee in eligible_rotating}
        active_weeks: list[tuple[str, list[str]]] = []

        for week_monday, dates in self._week_groups().items():
            if policy.completeWeeksOnly and len(dates) != 7:
                continue

            week_guard_slots = [
                slot
                for slot in self.slots
                if slot.iso in dates
                and slot.requirement.serviceType == "GUARD"
            ]
            if not week_guard_slots:
                continue
            active_weeks.append((week_monday, dates))

            selected_guids: set[str] = set()
            if policy.selectionMode == "ROTATION_ORDER":
                selected_guids = {
                    employee.guid
                    for employee in self._guard_pool_selected_employees(
                        week_monday
                    )
                }

            pool_terms = []
            for employee in self.rotating:
                pool = self.model.NewBoolVar(
                    f"guard_pool_{employee.guid}_{week_monday}"
                )
                self.weekly_guard_pool[(employee.guid, week_monday)] = pool

                if employee.guid not in eligible_guids:
                    self.model.Add(pool == 0)
                else:
                    pool_terms.append(pool)

                if policy.selectionMode == "ROTATION_ORDER":
                    self.model.Add(
                        pool == (1 if employee.guid in selected_guids else 0)
                    )

                employee_guard_terms = [
                    self._slot_var(employee.guid, slot)
                    for slot in week_guard_slots
                ]

                for guard_term in employee_guard_terms:
                    self.model.Add(guard_term <= pool)

                if policy.requireParticipation and employee.guid in eligible_guids:
                    self.model.Add(sum(employee_guard_terms) >= pool)

                if policy.memberServiceAccess == "GUARD_ONLY":
                    for iso in dates:
                        for slot in self._daily_slots(iso):
                            if slot.requirement.serviceType == "STANDARD":
                                self.model.Add(
                                    self._slot_var(employee.guid, slot) + pool <= 1
                                )

            self.model.Add(sum(pool_terms) == policy.employeesPerWeek)

        if not active_weeks:
            return

        membership_counts = []
        for employee in eligible_rotating:
            terms = [
                self.weekly_guard_pool[(employee.guid, week_monday)]
                for week_monday, _ in active_weeks
                if (employee.guid, week_monday) in self.weekly_guard_pool
            ]
            count = self.model.NewIntVar(
                0, len(active_weeks), f"guard_pool_count_{employee.guid}"
            )
            self.model.Add(count == sum(terms))
            membership_counts.append(count)

            maximum_consecutive = (
                policy.balance.maxConsecutiveMembershipWeeks
            )
            if maximum_consecutive is not None:
                size = maximum_consecutive + 1
                for index in range(0, len(terms) - size + 1):
                    self.model.Add(
                        sum(terms[index:index + size]) <= maximum_consecutive
                    )

        if membership_counts and policy.balance.mode in {"SOFT", "STRICT"}:
            maximum = self.model.NewIntVar(
                0, len(active_weeks), "max_guard_pool_memberships"
            )
            minimum = self.model.NewIntVar(
                0, len(active_weeks), "min_guard_pool_memberships"
            )
            self.model.AddMaxEquality(maximum, membership_counts)
            self.model.AddMinEquality(minimum, membership_counts)
            spread = maximum - minimum

            if policy.balance.mode == "STRICT":
                self.model.Add(
                    spread <= (policy.balance.maxMembershipSpread or 0)
                )
            else:
                self.guard_pool_balance_terms.append(250 * spread)

    def _apply_requirement_eligibility(self) -> None:
        for employee in self.rotating:
            for slot in self.slots:
                selector = slot.requirement.eligibility
                variable = self._slot_var(employee.guid, slot)

                if employee.mode not in selector.planningModes:
                    self.model.Add(variable == 0)
                    continue

                if selector.guardPoolRelation == "ANY":
                    continue

                week_monday = monday_of_week(slot.iso)
                pool = self.weekly_guard_pool.get((employee.guid, week_monday))

                if selector.guardPoolRelation == "MEMBER":
                    if pool is None:
                        self.model.Add(variable == 0)
                    else:
                        self.model.Add(variable <= pool)
                elif selector.guardPoolRelation == "NON_MEMBER" and pool is not None:
                    self.model.Add(variable + pool <= 1)

    def _apply_coverage(self) -> None:
        for slot in self.slots:
            requirement = slot.requirement
            variables = [
                self._slot_var(employee.guid, slot)
                for employee in self.rotating
            ]
            fixed_eligible = (
                "FIXED" in requirement.eligibility.planningModes
                and requirement.eligibility.guardPoolRelation != "MEMBER"
            )
            fixed_count = (
                self.fixed_counts[(slot.iso, requirement.template.guid)]
                if fixed_eligible
                else 0
            )
            variable_fixed_terms = [
                self.fixed_work[(employee.guid, slot.iso)]
                for employee in self.fixed_rotating_rest
                if fixed_eligible
                and employee.fixedTemplate is not None
                and employee.fixedTemplate.guid == requirement.template.guid
            ]
            total = sum(variables) + sum(variable_fixed_terms) + fixed_count

            if requirement.allocationMode == "EXACT":
                self.model.Add(total == requirement.targetEmployees)
                continue

            self.model.Add(total >= requirement.minEmployees)
            if requirement.maxEmployees is not None:
                self.model.Add(total <= requirement.maxEmployees)

            if requirement.allocationMode == "RANGE":
                under_target = self.model.NewIntVar(
                    0,
                    max(0, requirement.targetEmployees),
                    f"under_target_{slot.iso}_{requirement.guid}",
                )
                self.model.Add(
                    under_target
                    >= requirement.targetEmployees - total
                )
                self.under_target_vars.append(under_target)

            if requirement.allocationMode == "FILL_REMAINING":
                self.fill_vars.extend(variables)

    def _week_groups(self) -> dict[str, list[str]]:
        result: dict[str, list[str]] = defaultdict(list)
        for iso in self.dates:
            result[monday_of_week(iso)].append(iso)
        return result

    def _apply_weekly_rest(self) -> None:
        policy = self.request.config.weeklyLeavePolicy

        if policy.mode in {"NONE", "TEAM_ROTATION"}:
            return

        # Legacy policy: every employee receives the configured minimum.
        for employee in self.rotating:
            for _, dates in self._week_groups().items():
                if len(dates) < 7:
                    continue
                allowed_work_days = max(
                    0,
                    len(dates) - self.request.config.minRestDaysPerWeek,
                )
                self.model.Add(
                    sum(
                        self.work_day[(employee.guid, iso)]
                        for iso in dates
                    )
                    <= allowed_work_days
                )

        for employee in self.fixed_rotating_rest:
            assert employee.fixedTemplate is not None
            for _, dates in self._week_groups().items():
                if len(dates) < 7:
                    continue
                potential_dates = [
                    iso
                    for iso in dates
                    if template_has_work(employee.fixedTemplate, iso)
                ]
                required_rest = min(
                    self.request.config.minRestDaysPerWeek,
                    len(potential_dates),
                )
                required_work = len(potential_dates) - required_rest
                self.model.Add(
                    sum(
                        self.fixed_work[(employee.guid, iso)]
                        for iso in potential_dates
                    )
                    == required_work
                )

    def _apply_daily_rest_capacity(self) -> None:
        maximum = self.request.config.maxRestingEmployeesPerDay
        if maximum is None:
            return

        for iso in self.dates:
            resting_terms = []
            constant_resting = 0

            for employee in self.rotating + self.fixed_rotating_rest:
                resting = self.model.NewBoolVar(
                    f"resting_{employee.guid}_{iso}"
                )
                self.model.Add(
                    resting + self.work_day[(employee.guid, iso)] == 1
                )
                resting_terms.append(resting)

            for employee in self.fixed_template_rest:
                assert employee.fixedTemplate is not None
                if not template_has_work(employee.fixedTemplate, iso):
                    constant_resting += 1

            self.model.Add(
                sum(resting_terms) + constant_resting <= maximum
            )

    def _apply_max_consecutive_work_days(self) -> None:
        maximum = self.request.config.maxConsecutiveWorkDays
        if maximum is None:
            return

        size = maximum + 1
        if size > len(self.dates):
            return

        for employee in self.rotating + self.fixed_rotating_rest:
            for index in range(0, len(self.dates) - size + 1):
                window = self.dates[index : index + size]
                self.model.Add(
                    sum(
                        self.work_day[(employee.guid, iso)]
                        for iso in window
                    )
                    <= maximum
                )

    def _credited_minutes_by_date(
        self,
        slot: RequirementSlot,
    ) -> dict[str, int]:
        requirement = slot.requirement
        main_actual = template_minutes(requirement.template, slot.iso)

        if (
            requirement.serviceType != "GUARD"
            or requirement.continuationTemplate is None
        ):
            return {
                slot.iso: requirement.creditedMinutes or main_actual,
            }

        continuation_date = add_days(
            slot.iso,
            requirement.continuationDayOffset,
        )
        continuation_actual = template_minutes(
            requirement.continuationTemplate,
            continuation_date,
        )
        total_actual = main_actual + continuation_actual
        credited = requirement.creditedMinutes or total_actual

        if total_actual <= 0:
            return {slot.iso: credited, continuation_date: 0}

        main_credited = round(
            credited * (main_actual / total_actual)
        )
        return {
            slot.iso: main_credited,
            continuation_date: credited - main_credited,
        }

    def _slot_minutes_in_dates(
        self,
        slot: RequirementSlot,
        date_set: set[str],
    ) -> int:
        return sum(
            minutes
            for iso, minutes in self._credited_minutes_by_date(slot).items()
            if iso in date_set
        )

    def _apply_weekly_minutes(self) -> None:
        for employee in self.rotating:
            maximum = (
                employee.maxWeeklyMinutes
                if employee.maxWeeklyMinutes is not None
                else self.request.config.maxWeeklyMinutes
            )
            if maximum is None:
                continue

            for _, dates in self._week_groups().items():
                date_set = set(dates)
                terms = []

                for slot in self.slots:
                    minutes = self._slot_minutes_in_dates(
                        slot,
                        date_set,
                    )
                    if minutes <= 0:
                        continue

                    terms.append(
                        minutes
                        * self._slot_var(employee.guid, slot)
                    )

                if terms:
                    self.model.Add(sum(terms) <= maximum)

        for employee in self.fixed_rotating_rest:
            assert employee.fixedTemplate is not None
            maximum = (
                employee.maxWeeklyMinutes
                if employee.maxWeeklyMinutes is not None
                else self.request.config.maxWeeklyMinutes
            )
            if maximum is None:
                continue

            for _, dates in self._week_groups().items():
                terms = [
                    template_minutes(employee.fixedTemplate, iso)
                    * self.fixed_work[(employee.guid, iso)]
                    for iso in dates
                    if template_has_work(employee.fixedTemplate, iso)
                ]
                if terms:
                    self.model.Add(sum(terms) <= maximum)

    def _apply_max_consecutive_guards(self) -> None:
        size = self.request.config.maxConsecutiveGuards + 1
        if size > len(self.dates):
            return

        for employee in self.rotating:
            for index in range(0, len(self.dates) - size + 1):
                window = self.dates[index : index + size]
                self.model.Add(
                    sum(
                        self.guard_day[(employee.guid, iso)]
                        for iso in window
                    )
                    <= self.request.config.maxConsecutiveGuards
                )

    def _apply_rest_between_shifts(self) -> None:
        minimum = self.request.config.minRestMinutesBetweenShifts
        if minimum <= 0:
            return

        for employee in self.rotating:
            for index in range(len(self.dates) - 1):
                current_date = self.dates[index]
                next_date = self.dates[index + 1]

                for first_slot in self._daily_slots(current_date):
                    first_end = last_end(
                        first_slot.requirement.template, current_date
                    )
                    if first_end is None:
                        continue

                    # Guard continuation is handled separately and blocks next day.
                    if first_slot.requirement.serviceType == "GUARD":
                        continue

                    for second_slot in self._daily_slots(next_date):
                        second_start = first_start(
                            second_slot.requirement.template, next_date
                        )
                        if second_start is None:
                            continue

                        gap = (24 * 60 - first_end) + second_start
                        if gap < minimum:
                            self.model.Add(
                                self._slot_var(employee.guid, first_slot)
                                + self._slot_var(employee.guid, second_slot)
                                <= 1
                            )

    def _build_objective(self) -> None:
        # Hard coverage is already constrained. RANGE shortfalls remain costly.
        objective = []
        objective.extend(10_000 * variable for variable in self.under_target_vars)

        # FILL_REMAINING should use every employee still compatible with rest rules.
        objective.extend(-1_000 * variable for variable in self.fill_vars)

        # MINIMUM leave means "at least". Penalizing optional leave prevents CP-SAT
        # from creating arbitrary additional leave days.
        objective.extend(100 * variable for variable in self.optional_leave_vars)
        objective.extend(self.guard_pool_balance_terms)

        if self.rotating:
            maximum_historical_shifts = max(
                (
                    self.history_shift_count[
                        employee.guid
                    ]
                    for employee in self.rotating
                ),
                default=0,
            )
            maximum_historical_guards = max(
                (
                    self.history_guard_count[
                        employee.guid
                    ]
                    for employee in self.rotating
                ),
                default=0,
            )

            max_shifts = self.model.NewIntVar(
                0,
                len(self.dates)
                + maximum_historical_shifts,
                "max_planned_shifts",
            )
            min_shifts = self.model.NewIntVar(
                0,
                len(self.dates)
                + maximum_historical_shifts,
                "min_planned_shifts",
            )
            max_guards = self.model.NewIntVar(
                0,
                len(self.dates)
                + maximum_historical_guards,
                "max_planned_guards",
            )
            min_guards = self.model.NewIntVar(
                0,
                len(self.dates)
                + maximum_historical_guards,
                "min_planned_guards",
            )

            for employee in self.rotating:
                shifts = sum(
                    self.work_day[(employee.guid, iso)]
                    for iso in self.dates
                )
                guards = sum(
                    self.guard_day[(employee.guid, iso)]
                    for iso in self.dates
                )

                # Include historical loads so a heavily used employee is penalized.
                historical_shifts = self.history_shift_count[employee.guid]
                historical_guards = self.history_guard_count[employee.guid]

                self.model.Add(shifts + historical_shifts <= max_shifts)
                self.model.Add(shifts + historical_shifts >= min_shifts)
                self.model.Add(guards + historical_guards <= max_guards)
                self.model.Add(guards + historical_guards >= min_guards)

                for slot in self.slots:
                    history_cost = self.history_template_count[
                        (employee.guid, slot.requirement.template.guid)
                    ]
                    if history_cost:
                        objective.append(
                            history_cost
                            * 5
                            * self._slot_var(employee.guid, slot)
                        )

            objective.append(100 * (max_guards - min_guards))
            objective.append(10 * (max_shifts - min_shifts))

        self.model.Minimize(sum(objective) if objective else 0)

    def solve(self) -> SolverResponse:
        self.build()

        self.solver.parameters.max_time_in_seconds = max(
            1.0,
            float(self.request.solverTimeoutSeconds) - 1.0,
        )
        self.solver.parameters.num_search_workers = 8
        self.solver.parameters.random_seed = 42

        status = self.solver.Solve(self.model)
        status_name = self.solver.StatusName(status)
        stats = SolverStats(
            statusName=status_name,
            wallTimeSeconds=float(self.solver.WallTime()),
            numConflicts=int(self.solver.NumConflicts()),
            numBranches=int(self.solver.NumBranches()),
            numBooleans=int(self.solver.NumBooleans()),
        )

        if status == cp_model.INFEASIBLE:
            diagnostics = EngineDiagnostics(
                violations=[
                    PlanningViolation(
                        severity="HARD",
                        code="PLANNING_INFEASIBLE",
                        message="CP-SAT proved that no planning satisfies all hard constraints",
                    )
                ],
                coverage=[],
                guardPools=[],
                weeklyLeaveGroups=[],
                fairnessScore=0,
                coverageScore=0,
            )
            return SolverResponse(
                success=False,
                status="INFEASIBLE",
                solverStats=stats,
                diagnostics=diagnostics,
                message="No feasible planning satisfies every hard constraint",
            )

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return SolverResponse(
                success=False,
                status="UNKNOWN",
                solverStats=stats,
                message=f"CP-SAT stopped with status {status_name}",
            )

        result = self._build_result()
        return SolverResponse(
            success=True,
            status="OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE",
            solverStats=stats,
            result=result,
        )

    def _build_result(self) -> EngineResult:
        schedules: dict[str, dict[str, str | None]] = {}
        reasons: dict[str, dict[str, DayReason | None]] = {}

        for employee in self.request.employees:
            schedules[employee.guid] = {}
            reasons[employee.guid] = {}

        # Fixed profiles keep their shift; the rest day may be template-based or solved.
        for employee in self.fixed:
            assert employee.fixedTemplate is not None
            for iso in self.dates:
                leave_variable = self.weekly_leave.get((employee.guid, iso))
                is_weekly_leave = bool(
                    leave_variable is not None
                    and self.solver.Value(leave_variable)
                )
                variable = self.fixed_work.get((employee.guid, iso))
                works = (
                    bool(self.solver.Value(variable))
                    if variable is not None
                    else template_has_work(employee.fixedTemplate, iso)
                )

                if is_weekly_leave:
                    schedules[employee.guid][iso] = None
                    reasons[employee.guid][iso] = DayReason(
                        templateName="Congé hebdomadaire",
                        templateGuid=None,
                        confidence=100,
                        source="WEEKLY_LEAVE",
                        factors=[
                            "Congé attribué selon l’ordre de rotation de l’équipe",
                            "Jour autorisé par la politique de congé hebdomadaire",
                        ],
                    )
                elif works:
                    schedules[employee.guid][iso] = employee.fixedTemplate.guid
                    reasons[employee.guid][iso] = DayReason(
                        templateName=employee.fixedTemplate.name,
                        templateGuid=employee.fixedTemplate.guid,
                        confidence=100,
                        source="FIXED",
                        factors=[
                            "Horaire fixe défini dans le profil de l’employé"
                        ],
                    )
                else:
                    schedules[employee.guid][iso] = None
                    reasons[employee.guid][iso] = DayReason(
                        templateName="Repos du template",
                        templateGuid=None,
                        confidence=100,
                        source="TEMPLATE_REST",
                        factors=[
                            "Aucun bloc de travail n’est défini dans le template fixe pour cette date"
                        ],
                    )

        for employee in self.rotating:
            for iso in self.dates:
                if iso in schedules[employee.guid]:
                    continue

                selected = None
                for slot in self._daily_slots(iso):
                    if self.solver.Value(self._slot_var(employee.guid, slot)):
                        selected = slot
                        break

                if selected is None:
                    leave_variable = self.weekly_leave.get((employee.guid, iso))
                    is_weekly_leave = bool(
                        leave_variable is not None
                        and self.solver.Value(leave_variable)
                    )

                    schedules[employee.guid][iso] = None
                    if is_weekly_leave:
                        reasons[employee.guid][iso] = DayReason(
                            templateName="Congé hebdomadaire",
                            templateGuid=None,
                            confidence=100,
                            source="WEEKLY_LEAVE",
                            factors=[
                                "Congé attribué par la politique hebdomadaire active",
                                "Le périmètre, le nombre de jours et le service sont configurés par le tenant",
                            ],
                        )
                    else:
                        reasons[employee.guid][iso] = DayReason(
                            templateName="Non affecté",
                            templateGuid=None,
                            confidence=100,
                            source="UNASSIGNED",
                            factors=[
                                "Aucun service n’a été attribué sur cette date",
                                "Cette absence d’affectation n’est pas un congé hebdomadaire",
                            ],
                        )
                    continue

                requirement = selected.requirement
                source = (
                    "FILL_REMAINING"
                    if requirement.allocationMode == "FILL_REMAINING"
                    else "GENERATED"
                )
                schedules[employee.guid][iso] = requirement.template.guid
                reasons[employee.guid][iso] = DayReason(
                    templateName=requirement.template.name,
                    templateGuid=requirement.template.guid,
                    confidence=100,
                    source=source,
                    factors=[
                        f"Solution globale CP-SAT — mode {requirement.allocationMode}",
                        "Toutes les contraintes obligatoires ont été vérifiées simultanément",
                        *(
                            ["Employé sélectionné dans le pool hebdomadaire de garde"]
                            if requirement.serviceType == "GUARD"
                            and self.request.config.guardTeamPolicy.mode == "WEEKLY_POOL"
                            else []
                        ),
                    ],
                )

                if (
                    requirement.serviceType == "GUARD"
                    and requirement.continuationTemplate is not None
                ):
                    continuation_date = add_days(
                        iso, requirement.continuationDayOffset
                    )
                    schedules[employee.guid][
                        continuation_date
                    ] = requirement.continuationTemplate.guid
                    reasons[employee.guid][
                        continuation_date
                    ] = DayReason(
                        templateName=requirement.continuationTemplate.name,
                        templateGuid=requirement.continuationTemplate.guid,
                        confidence=100,
                        source="GUARD_CONTINUATION",
                        factors=[
                            f"Suite automatique de la garde commencée le {iso}",
                            "Aucun autre service autorisé pendant cette journée de continuation",
                        ],
                    )

                    if self.request.config.restAfterGuardRequired:
                        for offset in range(
                            1,
                            self.request.config.postGuardRestDays + 1,
                        ):
                            rest_date = add_days(continuation_date, offset)
                            schedules[employee.guid][rest_date] = None
                            reasons[employee.guid][rest_date] = DayReason(
                                templateName="Repos post-garde",
                                templateGuid=None,
                                confidence=100,
                                source="POST_GUARD_REST",
                                factors=[
                                    f"Repos complet après la garde commencée le {iso}",
                                    f"Jour {offset} sur {self.request.config.postGuardRestDays} de récupération post-garde",
                                ],
                            )

        coverage: list[CoverageResult] = []
        violations: list[PlanningViolation] = []

        for slot in self.slots:
            requirement = slot.requirement
            fixed_eligible = (
                "FIXED" in requirement.eligibility.planningModes
                and requirement.eligibility.guardPoolRelation != "MEMBER"
            )
            assigned = (
                self.fixed_counts[(slot.iso, requirement.template.guid)]
                if fixed_eligible
                else 0
            ) + sum(
                self.solver.Value(self._slot_var(employee.guid, slot))
                for employee in self.rotating
            ) + sum(
                self.solver.Value(
                    self.fixed_work[(employee.guid, slot.iso)]
                )
                for employee in self.fixed_rotating_rest
                if fixed_eligible
                and employee.fixedTemplate is not None
                and employee.fixedTemplate.guid == requirement.template.guid
            )

            status = "COVERED"
            if assigned < requirement.minEmployees:
                status = "BELOW_MINIMUM"
            elif assigned < requirement.targetEmployees:
                status = "BELOW_TARGET"
            elif (
                requirement.maxEmployees is not None
                and assigned > requirement.maxEmployees
            ):
                status = "ABOVE_MAXIMUM"

            coverage.append(
                CoverageResult(
                    date=slot.iso,
                    dayOfWeek=day_key(slot.iso),
                    requirementGuid=requirement.guid,
                    allocationMode=requirement.allocationMode,
                    templateGuid=requirement.template.guid,
                    templateName=requirement.template.name,
                    minimum=requirement.minEmployees,
                    target=requirement.targetEmployees,
                    maximum=requirement.maxEmployees,
                    assigned=assigned,
                    status=status,
                )
            )

        guard_pools: list[GuardPoolResult] = []
        if self.request.config.guardTeamPolicy.mode == "WEEKLY_POOL":
            policy = self.request.config.guardTeamPolicy
            for week_monday, dates in self._week_groups().items():
                selected = [
                    employee.guid
                    for employee in self.rotating
                    if (employee.guid, week_monday) in self.weekly_guard_pool
                    and self.solver.Value(
                        self.weekly_guard_pool[(employee.guid, week_monday)]
                    )
                ]
                if not selected:
                    continue
                guard_pools.append(
                    GuardPoolResult(
                        weekFrom=min(dates),
                        weekTo=max(dates),
                        employeeGuids=selected,
                        mode=policy.mode,
                        selectionMode=policy.selectionMode,
                    )
                )

        weekly_leave_groups: list[WeeklyLeaveGroupResult] = []
        leave_policy = self.request.config.weeklyLeavePolicy
        if leave_policy.mode in {"TEAM_ROTATION", "PER_ELIGIBLE_EMPLOYEE"}:
            for week_monday, dates in self._week_groups().items():
                if leave_policy.completeWeeksOnly and len(dates) != 7:
                    continue
                leave_by_employee: dict[str, list[str]] = {}
                for employee in self.included:
                    selected_dates = [
                        iso
                        for iso in dates
                        if (employee.guid, iso) in self.weekly_leave
                        and self.solver.Value(
                            self.weekly_leave[(employee.guid, iso)]
                        )
                    ]
                    if selected_dates:
                        leave_by_employee[employee.guid] = selected_dates

                if leave_by_employee:
                    weekly_leave_groups.append(
                        WeeklyLeaveGroupResult(
                            weekFrom=min(dates),
                            weekTo=max(dates),
                            employeeGuids=list(leave_by_employee.keys()),
                            leaveByEmployee=leave_by_employee,
                            mode=leave_policy.mode,
                            selector=leave_policy.selector,
                            serviceScope=leave_policy.serviceScope,
                        )
                    )

        coverage_score = self._coverage_score(coverage)
        fairness_score = self._fairness_score()
        conformity = round(coverage_score * 0.75 + fairness_score * 0.25)

        diagnostics = EngineDiagnostics(
            violations=violations,
            coverage=coverage,
            guardPools=guard_pools,
            weeklyLeaveGroups=weekly_leave_groups,
            fairnessScore=fairness_score,
            coverageScore=coverage_score,
        )

        return EngineResult(
            items=[
                EmployeeSuggestionResult(
                    userGuid=employee.guid,
                    schedule=schedules[employee.guid],
                    reasons=reasons[employee.guid],
                )
                for employee in self.request.employees
                if employee.mode != "EXCLUDED"
            ],
            conformityScore=conformity,
            diagnostics=diagnostics,
        )

    @staticmethod
    def _coverage_score(coverage: list[CoverageResult]) -> int:
        if not coverage:
            return 0
        total = 0.0
        for slot in coverage:
            if slot.target == 0:
                total += 1.0
            else:
                total += min(1.0, slot.assigned / slot.target)
        return round((total / len(coverage)) * 100)

    def _fairness_score(self) -> int:
        if len(self.rotating) <= 1:
            return 100

        loads = []
        for employee in self.rotating:
            shifts = sum(
                self.solver.Value(self.work_day[(employee.guid, iso)])
                for iso in self.dates
            )
            guards = sum(
                self.solver.Value(self.guard_day[(employee.guid, iso)])
                for iso in self.dates
            )
            weekends = sum(
                self.solver.Value(self.work_day[(employee.guid, iso)])
                for iso in self.dates
                if is_weekend(iso)
            )
            loads.append(shifts + guards * 2 + weekends)

        spread = max(loads) - min(loads)
        return max(0, round(100 - spread * 12.5))


def solve_planning(request: PlanningSolverInput) -> SolverResponse:
    return OrToolsPlanner(request).solve()



# from __future__ import annotations
#
# from collections import defaultdict
# from dataclasses import dataclass
# from datetime import date, datetime, timedelta
# from math import floor
#
# from ortools.sat.python import cp_model
#
# from app.weekly_leave import selected_rotation_orders
# from app.weekly_guard_pool import validate_weekly_guard_capacity
#
# from app.schemas import (
#     AllocationMode,
#     CoverageResult,
#     DayReason,
#     EngineDiagnostics,
#     EngineResult,
#     EngineTemplate,
#     GuardPoolResult,
#     WeeklyLeaveGroupResult,
#     EmployeeSuggestionResult,
#     PlanningRequirementInput,
#     PlanningSolverInput,
#     PlanningViolation,
#     SolverResponse,
# )
#
#
# DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
#
#
# @dataclass(frozen=True)
# class RequirementSlot:
#     requirement: PlanningRequirementInput
#     iso: str
#
#
# def parse_iso(value: str) -> date:
#     return datetime.strptime(value, "%Y-%m-%d").date()
#
#
# def add_days(value: str, amount: int) -> str:
#     return (parse_iso(value) + timedelta(days=amount)).isoformat()
#
#
# def period_dates(start: str, end: str) -> list[str]:
#     current = parse_iso(start)
#     last = parse_iso(end)
#     if current > last:
#         raise ValueError("periodFrom must be <= periodTo")
#
#     result: list[str] = []
#     while current <= last:
#         result.append(current.isoformat())
#         current += timedelta(days=1)
#     return result
#
#
# def day_key(iso: str) -> str:
#     return DAY_KEYS[parse_iso(iso).weekday()]
#
#
# def is_weekend(iso: str) -> bool:
#     return day_key(iso) in {"Sat", "Sun"}
#
#
# def monday_of_week(iso: str) -> str:
#     value = parse_iso(iso)
#     return (value - timedelta(days=value.weekday())).isoformat()
#
#
# def to_minutes(value: str) -> int:
#     hours, minutes = value.split(":")
#     return int(hours) * 60 + int(minutes)
#
#
# def blocks_for(template: EngineTemplate, iso: str):
#     return template.definition.get(day_key(iso)) or []
#
#
# def template_has_work(template: EngineTemplate, iso: str) -> bool:
#     return bool(blocks_for(template, iso))
#
#
# def template_minutes(template: EngineTemplate, iso: str) -> int:
#     total = 0
#     for block in blocks_for(template, iso):
#         start = to_minutes(block.work[0])
#         end = to_minutes(block.work[1])
#         if end <= start:
#             end += 24 * 60
#         duration = end - start
#
#         if block.pause:
#             pause_start = to_minutes(block.pause[0])
#             pause_end = to_minutes(block.pause[1])
#             if pause_end <= pause_start:
#                 pause_end += 24 * 60
#             duration -= pause_end - pause_start
#
#         total += max(0, duration)
#
#     return total
#
#
# def first_start(template: EngineTemplate, iso: str) -> int | None:
#     blocks = blocks_for(template, iso)
#     if not blocks:
#         return None
#     return min(to_minutes(block.work[0]) for block in blocks)
#
#
# def last_end(template: EngineTemplate, iso: str) -> int | None:
#     blocks = blocks_for(template, iso)
#     if not blocks:
#         return None
#
#     values: list[int] = []
#     for block in blocks:
#         start = to_minutes(block.work[0])
#         end = to_minutes(block.work[1])
#         if end <= start:
#             end += 24 * 60
#         values.append(end)
#     return max(values)
#
#
# class OrToolsPlanner:
#     def __init__(self, request: PlanningSolverInput):
#         self.request = request
#         self.model = cp_model.CpModel()
#         self.solver = cp_model.CpSolver()
#
#         self.dates = period_dates(request.periodFrom, request.periodTo)
#         self.included = [
#             employee
#             for employee in request.employees
#             if employee.mode != "EXCLUDED"
#         ]
#         self.rotating = [
#             employee
#             for employee in self.included
#             if employee.mode == "ROTATING"
#         ]
#         self.fixed = [
#             employee
#             for employee in self.included
#             if employee.mode == "FIXED"
#         ]
#         self.team_weekly_leave_enabled = (
#             request.config.weeklyLeavePolicy.mode == "TEAM_ROTATION"
#         )
#         self.eligible_weekly_leave_enabled = (
#             request.config.weeklyLeavePolicy.mode == "PER_ELIGIBLE_EMPLOYEE"
#         )
#         self.weekly_guard_pool_enabled = (
#             request.config.guardTeamPolicy.mode == "WEEKLY_POOL"
#         )
#
#         # In TEAM_ROTATION mode every included FIXED employee needs a work
#         # variable so CP-SAT can remove exactly the selected weekly leave day.
#         variable_fixed_guids = {
#             employee.guid
#             for employee in self.fixed
#             if employee.fixedRestDayMode == "ROTATING"
#             or self.team_weekly_leave_enabled
#             or (
#                 self.eligible_weekly_leave_enabled
#                 and employee.mode in request.config.weeklyLeavePolicy.selector.planningModes
#             )
#         }
#         self.fixed_rotating_rest = [
#             employee
#             for employee in self.fixed
#             if employee.guid in variable_fixed_guids
#         ]
#         self.fixed_template_rest = [
#             employee
#             for employee in self.fixed
#             if employee.guid not in variable_fixed_guids
#         ]
#
#         self.slots: list[RequirementSlot] = []
#         for iso in self.dates:
#             current_day = day_key(iso)
#             for requirement in request.requirements:
#                 if requirement.dayOfWeek == current_day:
#                     self.slots.append(RequirementSlot(requirement, iso))
#
#         # x[(employee_guid, date, requirement_guid)] = selected requirement.
#         self.x: dict[tuple[str, str, str], cp_model.IntVar] = {}
#         self.fixed_work: dict[tuple[str, str], cp_model.IntVar] = {}
#
#         # A weekly leave is a specific business event. It is not the same as
#         # post-guard recovery, a template rest day or an unassigned day.
#         self.weekly_leave: dict[tuple[str, str], cp_model.IntVar] = {}
#
#         # Weekly guard pool membership is separate from daily guard starts.
#         # A tenant may keep DAILY_FLEXIBLE, or restrict guard starts to a
#         # stable set of ROTATING employees for each eligible week.
#         self.weekly_guard_pool: dict[tuple[str, str], cp_model.IntVar] = {}
#
#         # Work activity includes a normal assignment or guard continuation.
#         self.work_day: dict[tuple[str, str], cp_model.IntVar] = {}
#         self.guard_day: dict[tuple[str, str], cp_model.IntVar] = {}
#
#         self.fixed_counts: dict[tuple[str, str], int] = defaultdict(int)
#         self.history_shift_count: dict[str, int] = defaultdict(int)
#         self.history_guard_count: dict[str, int] = defaultdict(int)
#         self.history_weekend_count: dict[str, int] = defaultdict(int)
#         self.history_minutes: dict[str, int] = defaultdict(int)
#         self.history_template_count: dict[tuple[str, str], int] = defaultdict(int)
#
#         self.under_target_vars: list[cp_model.IntVar] = []
#         self.fill_vars: list[cp_model.IntVar] = []
#         self.optional_leave_vars: list[cp_model.IntVar] = []
#         self.guard_pool_balance_terms: list = []
#         self.objective_terms: list = []
#
#     def build(self) -> None:
#         self._validate_templates()
#         self._build_history()
#         self._build_fixed_counts()
#         self._build_variables()
#         self._build_fixed_work_variables()
#         self._apply_one_assignment_per_day()
#         self._apply_guard_continuations()
#         self._build_work_days()
#         self._build_weekly_leave_variables()
#         self._apply_guard_team_policy()
#         self._apply_weekly_leave_policy()
#         self._apply_requirement_eligibility()
#         self._apply_coverage()
#         self._apply_weekly_rest()
#         self._apply_daily_rest_capacity()
#         self._apply_max_consecutive_work_days()
#         self._apply_weekly_minutes()
#         self._apply_max_consecutive_guards()
#         self._apply_rest_between_shifts()
#         self._build_objective()
#
#     def _validate_templates(self) -> None:
#         self._validate_weekly_leave_policy()
#         self._validate_guard_team_policy()
#         self._validate_requirement_eligibility_policy()
#         violations = []
#         for slot in self.slots:
#             requirement = slot.requirement
#             if not template_has_work(requirement.template, slot.iso):
#                 violations.append(
#                     f"{requirement.template.name} has no work block on {slot.iso}"
#                 )
#
#             if requirement.serviceType == "GUARD":
#                 continuation_date = add_days(
#                     slot.iso, requirement.continuationDayOffset
#                 )
#                 if not requirement.continuationTemplate or not template_has_work(
#                     requirement.continuationTemplate, continuation_date
#                 ):
#                     violations.append(
#                         f"{requirement.template.name} has no valid continuation on "
#                         f"{continuation_date}"
#                     )
#
#         for employee in self.fixed_template_rest:
#             assert employee.fixedTemplate is not None
#             for iso in self.dates:
#                 # A fixed template is allowed to define rest on some dates.
#                 _ = employee.fixedTemplate.definition.get(day_key(iso))
#
#         if violations:
#             raise ValueError("; ".join(violations))
#
#     def _validate_requirement_eligibility_policy(self) -> None:
#         guard_policy = self.request.config.guardTeamPolicy
#         pool_enabled = guard_policy.mode == "WEEKLY_POOL"
#         violations: list[str] = []
#
#         for requirement in self.request.requirements:
#             relation = requirement.eligibility.guardPoolRelation
#
#             if relation != "ANY" and not pool_enabled:
#                 violations.append(
#                     f"Requirement {requirement.guid} uses guard-pool relation "
#                     f"{relation} while guardTeamPolicy.mode is DAILY_FLEXIBLE"
#                 )
#                 continue
#
#             if not pool_enabled:
#                 continue
#
#             if requirement.serviceType == "GUARD" and relation == "NON_MEMBER":
#                 violations.append(
#                     f"Guard requirement {requirement.guid} targets NON_MEMBER, "
#                     "but WEEKLY_POOL permits guard starts only for pool members"
#                 )
#
#             if (
#                 guard_policy.memberServiceAccess == "GUARD_ONLY"
#                 and requirement.serviceType == "STANDARD"
#                 and relation == "MEMBER"
#                 and requirement.minEmployees > 0
#             ):
#                 violations.append(
#                     f"Standard requirement {requirement.guid} targets MEMBER, "
#                     "but guardTeamPolicy.memberServiceAccess is GUARD_ONLY"
#                 )
#
#         if violations:
#             raise ValueError("; ".join(violations))
#
#     def _validate_weekly_leave_policy(self) -> None:
#         policy = self.request.config.weeklyLeavePolicy
#         if policy.mode == "TEAM_ROTATION":
#             if not self.included:
#                 raise ValueError("TEAM_ROTATION requires at least one included employee")
#
#             missing_orders = [
#                 employee.name
#                 for employee in self.included
#                 if employee.rotationOrder is None
#             ]
#             if missing_orders:
#                 raise ValueError(
#                     "TEAM_ROTATION requires rotationOrder for every included employee: "
#                     + ", ".join(missing_orders)
#                 )
#
#             orders = [employee.rotationOrder for employee in self.included]
#             if len(set(orders)) != len(orders):
#                 raise ValueError(
#                     "TEAM_ROTATION requires unique rotationOrder values"
#                 )
#
#             if policy.employeesPerWeek > len(self.included):
#                 raise ValueError(
#                     "weeklyLeavePolicy.employeesPerWeek cannot exceed included employees"
#                 )
#             return
#
#         if policy.mode != "PER_ELIGIBLE_EMPLOYEE":
#             return
#
#         if policy.selector.guardPoolRelation != "ANY":
#             if self.request.config.guardTeamPolicy.mode != "WEEKLY_POOL":
#                 raise ValueError(
#                     "A weekly leave selector based on guard pool membership requires WEEKLY_POOL"
#                 )
#
#         selectable = [
#             employee
#             for employee in self.included
#             if employee.mode in policy.selector.planningModes
#         ]
#         if not selectable:
#             raise ValueError(
#                 "PER_ELIGIBLE_EMPLOYEE selector does not match any included employee"
#             )
#
#         if (
#             policy.maxEmployeesPerDay is not None
#             and policy.countMode == "EXACT"
#         ):
#             possible_days = len(policy.allowedDays) * policy.maxEmployeesPerDay
#             eligible_count = len(selectable)
#             relation = policy.selector.guardPoolRelation
#
#             if relation in {"MEMBER", "NON_MEMBER"}:
#                 pool_size = self.request.config.guardTeamPolicy.employeesPerWeek
#                 selectable_rotating = sum(
#                     1 for employee in selectable if employee.mode == "ROTATING"
#                 )
#                 selected_from_selector = min(pool_size, selectable_rotating)
#                 eligible_count = (
#                     selected_from_selector
#                     if relation == "MEMBER"
#                     else len(selectable) - selected_from_selector
#                 )
#
#             if eligible_count * policy.daysPerEmployee > possible_days:
#                 raise ValueError(
#                     "weekly leave capacity is insufficient for the selected employees, "
#                     "allowed days and maxEmployeesPerDay"
#                 )
#
#         if policy.requireWorkOnOtherDays and "ROTATING" in policy.selector.planningModes:
#             if not any(
#                 self._slot_matches_scope(slot, policy.serviceScope)
#                 for slot in self.slots
#             ):
#                 raise ValueError(
#                     "weekly leave service scope does not match any active requirement"
#                 )
#
#     def _guard_pool_selected_employees(
#         self,
#         week_monday: str,
#     ):
#         policy = self.request.config.guardTeamPolicy
#         if policy.selectionMode != "ROTATION_ORDER":
#             return []
#
#         selected_orders = set(
#             selected_rotation_orders(
#                 [
#                     employee.rotationOrder
#                     for employee in self.rotating
#                     if employee.rotationOrder is not None
#                 ],
#                 policy.employeesPerWeek,
#                 week_monday,
#                 policy.rotationAnchorDate or week_monday,
#             )
#         )
#         return [
#             employee
#             for employee in self.rotating
#             if employee.rotationOrder in selected_orders
#         ]
#
#
#     def _validate_guard_team_policy(self) -> None:
#         policy = self.request.config.guardTeamPolicy
#         if policy.mode != "WEEKLY_POOL":
#             return
#
#         if not self.rotating:
#             raise ValueError(
#                 "WEEKLY_POOL requires at least one ROTATING employee"
#             )
#
#         if policy.employeesPerWeek > len(self.rotating):
#             raise ValueError(
#                 "guardTeamPolicy.employeesPerWeek cannot exceed ROTATING employees"
#             )
#
#         if policy.selectionMode == "ROTATION_ORDER":
#             missing_orders = [
#                 employee.name
#                 for employee in self.rotating
#                 if employee.rotationOrder is None
#             ]
#             if missing_orders:
#                 raise ValueError(
#                     "WEEKLY_POOL with ROTATION_ORDER requires rotationOrder "
#                     "for every ROTATING employee: "
#                     + ", ".join(missing_orders)
#                 )
#
#             orders = [
#                 employee.rotationOrder
#                 for employee in self.rotating
#             ]
#             if len(set(orders)) != len(orders):
#                 raise ValueError(
#                     "WEEKLY_POOL with ROTATION_ORDER requires unique "
#                     "rotationOrder values among ROTATING employees"
#                 )
#
#         guard_slots = [
#             slot
#             for slot in self.slots
#             if slot.requirement.serviceType == "GUARD"
#         ]
#         if not guard_slots:
#             raise ValueError(
#                 "WEEKLY_POOL requires at least one GUARD coverage requirement"
#             )
#
#         # A guard start always blocks the continuation date. Full post-guard
#         # rest days extend that cooldown. This preflight produces an explicit
#         # configuration error instead of a generic CP-SAT infeasible result.
#         minimum_start_gap_days = 2 + (
#             self.request.config.postGuardRestDays
#             if self.request.config.restAfterGuardRequired
#             else 0
#         )
#
#         for week_monday, dates in self._week_groups().items():
#             if policy.completeWeeksOnly and len(dates) != 7:
#                 continue
#
#             week_guard_slots = [
#                 slot for slot in guard_slots if slot.iso in dates
#             ]
#             if not week_guard_slots:
#                 continue
#
#             required_by_date: dict[str, int] = defaultdict(int)
#             for slot in week_guard_slots:
#                 required_by_date[slot.iso] += slot.requirement.minEmployees
#
#             validate_weekly_guard_capacity(
#                 required_by_date=dict(required_by_date),
#                 employees_per_week=policy.employeesPerWeek,
#                 minimum_start_gap_days=minimum_start_gap_days,
#                 week_monday=week_monday,
#             )
#
#     def _build_history(self) -> None:
#         employee_guids = {employee.guid for employee in self.rotating}
#
#         for assignment in self.request.historicalAssignments:
#             if assignment.userGuid not in employee_guids:
#                 continue
#
#             current = max(parse_iso(assignment.startDate), parse_iso(
#                 add_days(
#                     self.request.periodFrom,
#                     -(self.request.config.fairnessWindowWeeks * 7),
#                 )
#             ))
#             end = min(
#                 parse_iso(assignment.endDate),
#                 parse_iso(add_days(self.request.periodFrom, -1)),
#             )
#
#             template = EngineTemplate(
#                 guid=assignment.templateGuid,
#                 name=assignment.templateName,
#                 definition=assignment.definition,
#             )
#
#             while current <= end:
#                 iso = current.isoformat()
#                 if template_has_work(template, iso):
#                     minutes = template_minutes(template, iso)
#                     self.history_shift_count[assignment.userGuid] += 1
#                     self.history_minutes[assignment.userGuid] += minutes
#                     self.history_template_count[
#                         (assignment.userGuid, assignment.templateGuid)
#                     ] += 1
#                     if assignment.serviceType == "GUARD":
#                         self.history_guard_count[assignment.userGuid] += 1
#                     if is_weekend(iso):
#                         self.history_weekend_count[assignment.userGuid] += 1
#                 current += timedelta(days=1)
#
#     def _build_fixed_counts(self) -> None:
#         for employee in self.fixed_template_rest:
#             assert employee.fixedTemplate is not None
#
#             for iso in self.dates:
#                 if template_has_work(employee.fixedTemplate, iso):
#                     self.fixed_counts[
#                         (iso, employee.fixedTemplate.guid)
#                     ] += 1
#
#     def _build_variables(self) -> None:
#         for employee in self.rotating:
#             for slot in self.slots:
#                 key = (employee.guid, slot.iso, slot.requirement.guid)
#                 self.x[key] = self.model.NewBoolVar(
#                     f"x_{employee.guid}_{slot.iso}_{slot.requirement.guid}"
#                 )
#
#     def _build_fixed_work_variables(self) -> None:
#         for employee in self.fixed_rotating_rest:
#             assert employee.fixedTemplate is not None
#             for iso in self.dates:
#                 variable = self.model.NewBoolVar(
#                     f"fixed_work_{employee.guid}_{iso}"
#                 )
#                 self.fixed_work[(employee.guid, iso)] = variable
#                 if not template_has_work(employee.fixedTemplate, iso):
#                     self.model.Add(variable == 0)
#
#     def _fixed_work_term(self, employee, iso: str):
#         variable = self.fixed_work.get((employee.guid, iso))
#         if variable is not None:
#             return variable
#         assert employee.fixedTemplate is not None
#         return 1 if template_has_work(employee.fixedTemplate, iso) else 0
#
#     def _slot_var(self, employee_guid: str, slot: RequirementSlot):
#         return self.x[(employee_guid, slot.iso, slot.requirement.guid)]
#
#     def _daily_slots(self, iso: str) -> list[RequirementSlot]:
#         return [slot for slot in self.slots if slot.iso == iso]
#
#     def _guard_slots(self, iso: str) -> list[RequirementSlot]:
#         return [
#             slot
#             for slot in self._daily_slots(iso)
#             if slot.requirement.serviceType == "GUARD"
#         ]
#
#     def _apply_one_assignment_per_day(self) -> None:
#         for employee in self.rotating:
#             for iso in self.dates:
#                 variables = [
#                     self._slot_var(employee.guid, slot)
#                     for slot in self._daily_slots(iso)
#                 ]
#                 if variables:
#                     self.model.Add(sum(variables) <= 1)
#
#     def _apply_guard_continuations(self) -> None:
#         # A continuation is worked from 00:00/00:01 to 08:00 and therefore
#         # always blocks another ordinary assignment on the same calendar day.
#         for employee in self.rotating:
#             for slot in self.slots:
#                 if slot.requirement.serviceType != "GUARD":
#                     continue
#
#                 guard_var = self._slot_var(employee.guid, slot)
#                 continuation_date = add_days(
#                     slot.iso, slot.requirement.continuationDayOffset
#                 )
#
#                 if continuation_date not in self.dates:
#                     continue
#
#                 next_day_variables = [
#                     self._slot_var(employee.guid, next_slot)
#                     for next_slot in self._daily_slots(continuation_date)
#                 ]
#
#                 if next_day_variables:
#                     self.model.Add(sum(next_day_variables) == 0).OnlyEnforceIf(
#                         guard_var
#                     )
#
#                 if self.request.config.restAfterGuardRequired:
#                     for offset in range(
#                         1,
#                         self.request.config.postGuardRestDays + 1,
#                     ):
#                         rest_date = add_days(continuation_date, offset)
#                         if rest_date not in self.dates:
#                             continue
#                         rest_variables = [
#                             self._slot_var(employee.guid, next_slot)
#                             for next_slot in self._daily_slots(rest_date)
#                         ]
#                         if rest_variables:
#                             self.model.Add(
#                                 sum(rest_variables) == 0
#                             ).OnlyEnforceIf(guard_var)
#
#     def _build_work_days(self) -> None:
#         for employee in self.rotating:
#             for iso in self.dates:
#                 current_assignments = [
#                     self._slot_var(employee.guid, slot)
#                     for slot in self._daily_slots(iso)
#                 ]
#
#                 previous_guard_vars = []
#                 previous_date = add_days(iso, -1)
#                 for slot in self._guard_slots(previous_date):
#                     if slot.requirement.continuationDayOffset == 1:
#                         previous_guard_vars.append(
#                             self._slot_var(employee.guid, slot)
#                         )
#
#                 active_terms = current_assignments + previous_guard_vars
#                 variable = self.model.NewBoolVar(
#                     f"work_day_{employee.guid}_{iso}"
#                 )
#                 self.work_day[(employee.guid, iso)] = variable
#
#                 if not active_terms:
#                     self.model.Add(variable == 0)
#                 else:
#                     self.model.Add(variable == sum(active_terms))
#
#                 guard_terms = [
#                     self._slot_var(employee.guid, slot)
#                     for slot in self._guard_slots(iso)
#                 ]
#                 guard_variable = self.model.NewBoolVar(
#                     f"guard_day_{employee.guid}_{iso}"
#                 )
#                 self.guard_day[(employee.guid, iso)] = guard_variable
#                 if guard_terms:
#                     self.model.Add(guard_variable == sum(guard_terms))
#                 else:
#                     self.model.Add(guard_variable == 0)
#
#         for employee in self.fixed_rotating_rest:
#             for iso in self.dates:
#                 variable = self.fixed_work[(employee.guid, iso)]
#                 self.work_day[(employee.guid, iso)] = variable
#                 guard_variable = self.model.NewBoolVar(
#                     f"guard_day_{employee.guid}_{iso}"
#                 )
#                 self.guard_day[(employee.guid, iso)] = guard_variable
#                 self.model.Add(guard_variable == 0)
#
#     def _build_weekly_leave_variables(self) -> None:
#         policy = self.request.config.weeklyLeavePolicy
#         if policy.mode not in {"TEAM_ROTATION", "PER_ELIGIBLE_EMPLOYEE"}:
#             return
#
#         allowed_days = set(policy.allowedDays)
#         week_groups = self._week_groups()
#         full_week_dates = {
#             iso
#             for dates in week_groups.values()
#             if not policy.completeWeeksOnly or len(dates) == 7
#             for iso in dates
#         }
#
#         for employee in self.included:
#             for iso in self.dates:
#                 variable = self.model.NewBoolVar(
#                     f"weekly_leave_{employee.guid}_{iso}"
#                 )
#                 self.weekly_leave[(employee.guid, iso)] = variable
#
#                 eligible_date = (
#                     iso in full_week_dates
#                     and day_key(iso) in allowed_days
#                 )
#
#                 if employee.mode == "FIXED":
#                     assert employee.fixedTemplate is not None
#                     eligible_date = eligible_date and template_has_work(
#                         employee.fixedTemplate, iso
#                     )
#
#                 if not eligible_date:
#                     self.model.Add(variable == 0)
#
#     def _rotation_selected_employees(
#         self,
#         week_monday: str,
#     ):
#         policy = self.request.config.weeklyLeavePolicy
#         selected_orders = set(
#             selected_rotation_orders(
#                 [
#                     employee.rotationOrder
#                     for employee in self.included
#                     if employee.rotationOrder is not None
#                 ],
#                 policy.employeesPerWeek,
#                 week_monday,
#                 policy.rotationAnchorDate or week_monday,
#             )
#         )
#         return [
#             employee
#             for employee in self.included
#             if employee.rotationOrder in selected_orders
#         ]
#
#     def _pool_membership_term(self, employee, week_monday: str):
#         variable = self.weekly_guard_pool.get((employee.guid, week_monday))
#         if variable is not None:
#             return variable
#         return 0
#
#     def _selector_eligibility_term(self, employee, week_monday: str, selector):
#         if employee.mode not in selector.planningModes:
#             return 0
#
#         relation = selector.guardPoolRelation
#         pool = self._pool_membership_term(employee, week_monday)
#         if relation == "ANY":
#             return 1
#         if relation == "MEMBER":
#             return pool
#         if relation == "NON_MEMBER":
#             return 1 - pool
#         raise ValueError(f"Unsupported guard pool relation: {relation}")
#
#     @staticmethod
#     def _slot_matches_scope(slot: RequirementSlot, scope) -> bool:
#         if scope.mode == "ANY":
#             return True
#         if scope.mode == "SERVICE_TYPE":
#             return slot.requirement.serviceType in scope.serviceTypes
#         if scope.mode == "TEMPLATE":
#             return slot.requirement.template.guid in scope.templateGuids
#         if scope.mode == "REQUIREMENT":
#             return slot.requirement.guid in scope.requirementGuids
#         return False
#
#     def _scoped_work_terms(self, employee, iso: str, scope):
#         if employee.mode == "ROTATING":
#             slots = [
#                 slot
#                 for slot in self._daily_slots(iso)
#                 if self._slot_matches_scope(slot, scope)
#             ]
#             return [self._slot_var(employee.guid, slot) for slot in slots]
#
#         assert employee.fixedTemplate is not None
#         if scope.mode == "ANY":
#             return [self._fixed_work_term(employee, iso)]
#         if scope.mode == "TEMPLATE":
#             if employee.fixedTemplate.guid in scope.templateGuids:
#                 return [self._fixed_work_term(employee, iso)]
#             return []
#         if scope.mode == "SERVICE_TYPE":
#             # A fixed template has no intrinsic service type. It is considered
#             # in scope when an active requirement references the same template
#             # with a selected service type.
#             matched = any(
#                 slot.iso == iso
#                 and slot.requirement.template.guid == employee.fixedTemplate.guid
#                 and slot.requirement.serviceType in scope.serviceTypes
#                 for slot in self.slots
#             )
#             return [self._fixed_work_term(employee, iso)] if matched else []
#         if scope.mode == "REQUIREMENT":
#             matched = any(
#                 slot.iso == iso
#                 and slot.requirement.guid in scope.requirementGuids
#                 and slot.requirement.template.guid == employee.fixedTemplate.guid
#                 for slot in self.slots
#             )
#             return [self._fixed_work_term(employee, iso)] if matched else []
#         return []
#
#     def _apply_weekly_leave_policy(self) -> None:
#         policy = self.request.config.weeklyLeavePolicy
#         if policy.mode not in {"TEAM_ROTATION", "PER_ELIGIBLE_EMPLOYEE"}:
#             return
#
#         # A business weekly leave always blocks work and cannot overlap a guard
#         # continuation or a distinct post-guard recovery day.
#         for employee in self.included:
#             for iso in self.dates:
#                 leave = self.weekly_leave[(employee.guid, iso)]
#                 work = self.work_day.get((employee.guid, iso))
#                 if work is not None:
#                     self.model.Add(leave + work <= 1)
#
#                 if employee.mode == "ROTATING":
#                     previous_guard_terms = [
#                         self._slot_var(employee.guid, slot)
#                         for slot in self._guard_slots(add_days(iso, -1))
#                         if slot.requirement.continuationDayOffset == 1
#                     ]
#                     if previous_guard_terms:
#                         self.model.Add(leave + sum(previous_guard_terms) <= 1)
#
#                     if (
#                         self.request.config.restAfterGuardRequired
#                         and not policy.postGuardRestCountsAsLeave
#                     ):
#                         for offset in range(
#                             1, self.request.config.postGuardRestDays + 1
#                         ):
#                             guard_start_date = add_days(iso, -(1 + offset))
#                             guard_terms = [
#                                 self._slot_var(employee.guid, slot)
#                                 for slot in self._guard_slots(guard_start_date)
#                             ]
#                             if guard_terms:
#                                 self.model.Add(leave + sum(guard_terms) <= 1)
#
#         if policy.mode == "TEAM_ROTATION":
#             for employee in self.fixed_rotating_rest:
#                 assert employee.fixedTemplate is not None
#                 for iso in self.dates:
#                     if not template_has_work(employee.fixedTemplate, iso):
#                         continue
#                     self.model.Add(
#                         self.fixed_work[(employee.guid, iso)]
#                         + self.weekly_leave[(employee.guid, iso)]
#                         == 1
#                     )
#
#             for week_monday, dates in self._week_groups().items():
#                 if policy.completeWeeksOnly and len(dates) != 7:
#                     continue
#
#                 selected_guids = {
#                     employee.guid
#                     for employee in self._rotation_selected_employees(week_monday)
#                 }
#
#                 for employee in self.included:
#                     terms = [
#                         self.weekly_leave[(employee.guid, iso)]
#                         for iso in dates
#                     ]
#                     self.model.Add(
#                         sum(terms) == (1 if employee.guid in selected_guids else 0)
#                     )
#
#                 self.model.Add(
#                     sum(
#                         self.weekly_leave[(employee.guid, iso)]
#                         for employee in self.included
#                         for iso in dates
#                     )
#                     == policy.employeesPerWeek
#                 )
#             return
#
#         # Generic leave policy: one rule applies independently to every employee
#         # matched by planning mode and guard-pool membership.
#         for week_monday, dates in self._week_groups().items():
#             if policy.completeWeeksOnly and len(dates) != 7:
#                 continue
#
#             for employee in self.included:
#                 eligible = self._selector_eligibility_term(
#                     employee, week_monday, policy.selector
#                 )
#                 leave_terms = [
#                     self.weekly_leave[(employee.guid, iso)] for iso in dates
#                 ]
#                 leave_sum = sum(leave_terms)
#
#                 # Non-eligible employees cannot receive this policy's leave.
#                 self.model.Add(leave_sum <= len(dates) * eligible)
#
#                 if policy.countMode == "EXACT":
#                     self.model.Add(leave_sum == policy.daysPerEmployee * eligible)
#                 else:
#                     self.model.Add(leave_sum >= policy.daysPerEmployee * eligible)
#                     self.optional_leave_vars.extend(leave_terms)
#
#                 if policy.requireWorkOnOtherDays:
#                     for iso in dates:
#                         # A FIXED profile may already have a template-defined
#                         # rest day. "Work on other days" only applies to dates
#                         # where that fixed template normally contains work.
#                         if (
#                             employee.mode == "FIXED"
#                             and employee.fixedTemplate is not None
#                             and not template_has_work(employee.fixedTemplate, iso)
#                         ):
#                             continue
#
#                         leave = self.weekly_leave[(employee.guid, iso)]
#                         scoped_terms = self._scoped_work_terms(
#                             employee, iso, policy.serviceScope
#                         )
#                         scoped_work = sum(scoped_terms) if scoped_terms else 0
#                         self.model.Add(scoped_work + leave >= eligible)
#
#                         if policy.serviceScope.exclusive:
#                             if employee.mode == "ROTATING":
#                                 outside_terms = [
#                                     self._slot_var(employee.guid, slot)
#                                     for slot in self._daily_slots(iso)
#                                     if not self._slot_matches_scope(
#                                         slot, policy.serviceScope
#                                     )
#                                 ]
#                                 for outside in outside_terms:
#                                     self.model.Add(outside + eligible <= 1)
#
#             if policy.maxEmployeesPerDay is not None:
#                 for iso in dates:
#                     self.model.Add(
#                         sum(
#                             self.weekly_leave[(employee.guid, iso)]
#                             for employee in self.included
#                         )
#                         <= policy.maxEmployeesPerDay
#                     )
#
#     def _apply_guard_team_policy(self) -> None:
#         policy = self.request.config.guardTeamPolicy
#         if policy.mode != "WEEKLY_POOL":
#             return
#
#         eligible_rotating = [
#             employee
#             for employee in self.rotating
#             if employee.mode in policy.eligiblePlanningModes
#         ]
#         eligible_guids = {employee.guid for employee in eligible_rotating}
#         active_weeks: list[tuple[str, list[str]]] = []
#
#         for week_monday, dates in self._week_groups().items():
#             if policy.completeWeeksOnly and len(dates) != 7:
#                 continue
#
#             week_guard_slots = [
#                 slot
#                 for slot in self.slots
#                 if slot.iso in dates
#                 and slot.requirement.serviceType == "GUARD"
#             ]
#             if not week_guard_slots:
#                 continue
#             active_weeks.append((week_monday, dates))
#
#             selected_guids: set[str] = set()
#             if policy.selectionMode == "ROTATION_ORDER":
#                 selected_guids = {
#                     employee.guid
#                     for employee in self._guard_pool_selected_employees(
#                         week_monday
#                     )
#                 }
#
#             pool_terms = []
#             for employee in self.rotating:
#                 pool = self.model.NewBoolVar(
#                     f"guard_pool_{employee.guid}_{week_monday}"
#                 )
#                 self.weekly_guard_pool[(employee.guid, week_monday)] = pool
#
#                 if employee.guid not in eligible_guids:
#                     self.model.Add(pool == 0)
#                 else:
#                     pool_terms.append(pool)
#
#                 if policy.selectionMode == "ROTATION_ORDER":
#                     self.model.Add(
#                         pool == (1 if employee.guid in selected_guids else 0)
#                     )
#
#                 employee_guard_terms = [
#                     self._slot_var(employee.guid, slot)
#                     for slot in week_guard_slots
#                 ]
#
#                 for guard_term in employee_guard_terms:
#                     self.model.Add(guard_term <= pool)
#
#                 if policy.requireParticipation and employee.guid in eligible_guids:
#                     self.model.Add(sum(employee_guard_terms) >= pool)
#
#                 if policy.memberServiceAccess == "GUARD_ONLY":
#                     for iso in dates:
#                         for slot in self._daily_slots(iso):
#                             if slot.requirement.serviceType == "STANDARD":
#                                 self.model.Add(
#                                     self._slot_var(employee.guid, slot) + pool <= 1
#                                 )
#
#             self.model.Add(sum(pool_terms) == policy.employeesPerWeek)
#
#         if not active_weeks:
#             return
#
#         membership_counts = []
#         for employee in eligible_rotating:
#             terms = [
#                 self.weekly_guard_pool[(employee.guid, week_monday)]
#                 for week_monday, _ in active_weeks
#                 if (employee.guid, week_monday) in self.weekly_guard_pool
#             ]
#             count = self.model.NewIntVar(
#                 0, len(active_weeks), f"guard_pool_count_{employee.guid}"
#             )
#             self.model.Add(count == sum(terms))
#             membership_counts.append(count)
#
#             maximum_consecutive = (
#                 policy.balance.maxConsecutiveMembershipWeeks
#             )
#             if maximum_consecutive is not None:
#                 size = maximum_consecutive + 1
#                 for index in range(0, len(terms) - size + 1):
#                     self.model.Add(
#                         sum(terms[index:index + size]) <= maximum_consecutive
#                     )
#
#         if membership_counts and policy.balance.mode in {"SOFT", "STRICT"}:
#             maximum = self.model.NewIntVar(
#                 0, len(active_weeks), "max_guard_pool_memberships"
#             )
#             minimum = self.model.NewIntVar(
#                 0, len(active_weeks), "min_guard_pool_memberships"
#             )
#             self.model.AddMaxEquality(maximum, membership_counts)
#             self.model.AddMinEquality(minimum, membership_counts)
#             spread = maximum - minimum
#
#             if policy.balance.mode == "STRICT":
#                 self.model.Add(
#                     spread <= (policy.balance.maxMembershipSpread or 0)
#                 )
#             else:
#                 self.guard_pool_balance_terms.append(250 * spread)
#
#     def _apply_requirement_eligibility(self) -> None:
#         for employee in self.rotating:
#             for slot in self.slots:
#                 selector = slot.requirement.eligibility
#                 variable = self._slot_var(employee.guid, slot)
#
#                 if employee.mode not in selector.planningModes:
#                     self.model.Add(variable == 0)
#                     continue
#
#                 if selector.guardPoolRelation == "ANY":
#                     continue
#
#                 week_monday = monday_of_week(slot.iso)
#                 pool = self.weekly_guard_pool.get((employee.guid, week_monday))
#
#                 if selector.guardPoolRelation == "MEMBER":
#                     if pool is None:
#                         self.model.Add(variable == 0)
#                     else:
#                         self.model.Add(variable <= pool)
#                 elif selector.guardPoolRelation == "NON_MEMBER" and pool is not None:
#                     self.model.Add(variable + pool <= 1)
#
#     def _apply_coverage(self) -> None:
#         for slot in self.slots:
#             requirement = slot.requirement
#             variables = [
#                 self._slot_var(employee.guid, slot)
#                 for employee in self.rotating
#             ]
#             fixed_eligible = (
#                 "FIXED" in requirement.eligibility.planningModes
#                 and requirement.eligibility.guardPoolRelation != "MEMBER"
#             )
#             fixed_count = (
#                 self.fixed_counts[(slot.iso, requirement.template.guid)]
#                 if fixed_eligible
#                 else 0
#             )
#             variable_fixed_terms = [
#                 self.fixed_work[(employee.guid, slot.iso)]
#                 for employee in self.fixed_rotating_rest
#                 if fixed_eligible
#                 and employee.fixedTemplate is not None
#                 and employee.fixedTemplate.guid == requirement.template.guid
#             ]
#             total = sum(variables) + sum(variable_fixed_terms) + fixed_count
#
#             if requirement.allocationMode == "EXACT":
#                 self.model.Add(total == requirement.targetEmployees)
#                 continue
#
#             self.model.Add(total >= requirement.minEmployees)
#             if requirement.maxEmployees is not None:
#                 self.model.Add(total <= requirement.maxEmployees)
#
#             if requirement.allocationMode == "RANGE":
#                 under_target = self.model.NewIntVar(
#                     0,
#                     max(0, requirement.targetEmployees),
#                     f"under_target_{slot.iso}_{requirement.guid}",
#                 )
#                 self.model.Add(
#                     under_target
#                     >= requirement.targetEmployees - total
#                 )
#                 self.under_target_vars.append(under_target)
#
#             if requirement.allocationMode == "FILL_REMAINING":
#                 self.fill_vars.extend(variables)
#
#     def _week_groups(self) -> dict[str, list[str]]:
#         result: dict[str, list[str]] = defaultdict(list)
#         for iso in self.dates:
#             result[monday_of_week(iso)].append(iso)
#         return result
#
#     def _apply_weekly_rest(self) -> None:
#         policy = self.request.config.weeklyLeavePolicy
#
#         if policy.mode in {"NONE", "TEAM_ROTATION"}:
#             return
#
#         # Legacy policy: every employee receives the configured minimum.
#         for employee in self.rotating:
#             for _, dates in self._week_groups().items():
#                 if len(dates) < 7:
#                     continue
#                 allowed_work_days = max(
#                     0,
#                     len(dates) - self.request.config.minRestDaysPerWeek,
#                 )
#                 self.model.Add(
#                     sum(
#                         self.work_day[(employee.guid, iso)]
#                         for iso in dates
#                     )
#                     <= allowed_work_days
#                 )
#
#         for employee in self.fixed_rotating_rest:
#             assert employee.fixedTemplate is not None
#             for _, dates in self._week_groups().items():
#                 if len(dates) < 7:
#                     continue
#                 potential_dates = [
#                     iso
#                     for iso in dates
#                     if template_has_work(employee.fixedTemplate, iso)
#                 ]
#                 required_rest = min(
#                     self.request.config.minRestDaysPerWeek,
#                     len(potential_dates),
#                 )
#                 required_work = len(potential_dates) - required_rest
#                 self.model.Add(
#                     sum(
#                         self.fixed_work[(employee.guid, iso)]
#                         for iso in potential_dates
#                     )
#                     == required_work
#                 )
#
#     def _apply_daily_rest_capacity(self) -> None:
#         maximum = self.request.config.maxRestingEmployeesPerDay
#         if maximum is None:
#             return
#
#         for iso in self.dates:
#             resting_terms = []
#             constant_resting = 0
#
#             for employee in self.rotating + self.fixed_rotating_rest:
#                 resting = self.model.NewBoolVar(
#                     f"resting_{employee.guid}_{iso}"
#                 )
#                 self.model.Add(
#                     resting + self.work_day[(employee.guid, iso)] == 1
#                 )
#                 resting_terms.append(resting)
#
#             for employee in self.fixed_template_rest:
#                 assert employee.fixedTemplate is not None
#                 if not template_has_work(employee.fixedTemplate, iso):
#                     constant_resting += 1
#
#             self.model.Add(
#                 sum(resting_terms) + constant_resting <= maximum
#             )
#
#     def _apply_max_consecutive_work_days(self) -> None:
#         maximum = self.request.config.maxConsecutiveWorkDays
#         if maximum is None:
#             return
#
#         size = maximum + 1
#         if size > len(self.dates):
#             return
#
#         for employee in self.rotating + self.fixed_rotating_rest:
#             for index in range(0, len(self.dates) - size + 1):
#                 window = self.dates[index : index + size]
#                 self.model.Add(
#                     sum(
#                         self.work_day[(employee.guid, iso)]
#                         for iso in window
#                     )
#                     <= maximum
#                 )
#
#     def _credited_minutes_by_date(
#         self,
#         slot: RequirementSlot,
#     ) -> dict[str, int]:
#         requirement = slot.requirement
#         main_actual = template_minutes(requirement.template, slot.iso)
#
#         if (
#             requirement.serviceType != "GUARD"
#             or requirement.continuationTemplate is None
#         ):
#             return {
#                 slot.iso: requirement.creditedMinutes or main_actual,
#             }
#
#         continuation_date = add_days(
#             slot.iso,
#             requirement.continuationDayOffset,
#         )
#         continuation_actual = template_minutes(
#             requirement.continuationTemplate,
#             continuation_date,
#         )
#         total_actual = main_actual + continuation_actual
#         credited = requirement.creditedMinutes or total_actual
#
#         if total_actual <= 0:
#             return {slot.iso: credited, continuation_date: 0}
#
#         main_credited = round(
#             credited * (main_actual / total_actual)
#         )
#         return {
#             slot.iso: main_credited,
#             continuation_date: credited - main_credited,
#         }
#
#     def _slot_minutes_in_dates(
#         self,
#         slot: RequirementSlot,
#         date_set: set[str],
#     ) -> int:
#         return sum(
#             minutes
#             for iso, minutes in self._credited_minutes_by_date(slot).items()
#             if iso in date_set
#         )
#
#     def _apply_weekly_minutes(self) -> None:
#         for employee in self.rotating:
#             maximum = (
#                 employee.maxWeeklyMinutes
#                 if employee.maxWeeklyMinutes is not None
#                 else self.request.config.maxWeeklyMinutes
#             )
#             if maximum is None:
#                 continue
#
#             for _, dates in self._week_groups().items():
#                 date_set = set(dates)
#                 terms = []
#
#                 for slot in self.slots:
#                     minutes = self._slot_minutes_in_dates(
#                         slot,
#                         date_set,
#                     )
#                     if minutes <= 0:
#                         continue
#
#                     terms.append(
#                         minutes
#                         * self._slot_var(employee.guid, slot)
#                     )
#
#                 if terms:
#                     self.model.Add(sum(terms) <= maximum)
#
#         for employee in self.fixed_rotating_rest:
#             assert employee.fixedTemplate is not None
#             maximum = (
#                 employee.maxWeeklyMinutes
#                 if employee.maxWeeklyMinutes is not None
#                 else self.request.config.maxWeeklyMinutes
#             )
#             if maximum is None:
#                 continue
#
#             for _, dates in self._week_groups().items():
#                 terms = [
#                     template_minutes(employee.fixedTemplate, iso)
#                     * self.fixed_work[(employee.guid, iso)]
#                     for iso in dates
#                     if template_has_work(employee.fixedTemplate, iso)
#                 ]
#                 if terms:
#                     self.model.Add(sum(terms) <= maximum)
#
#     def _apply_max_consecutive_guards(self) -> None:
#         size = self.request.config.maxConsecutiveGuards + 1
#         if size > len(self.dates):
#             return
#
#         for employee in self.rotating:
#             for index in range(0, len(self.dates) - size + 1):
#                 window = self.dates[index : index + size]
#                 self.model.Add(
#                     sum(
#                         self.guard_day[(employee.guid, iso)]
#                         for iso in window
#                     )
#                     <= self.request.config.maxConsecutiveGuards
#                 )
#
#     def _apply_rest_between_shifts(self) -> None:
#         minimum = self.request.config.minRestMinutesBetweenShifts
#         if minimum <= 0:
#             return
#
#         for employee in self.rotating:
#             for index in range(len(self.dates) - 1):
#                 current_date = self.dates[index]
#                 next_date = self.dates[index + 1]
#
#                 for first_slot in self._daily_slots(current_date):
#                     first_end = last_end(
#                         first_slot.requirement.template, current_date
#                     )
#                     if first_end is None:
#                         continue
#
#                     # Guard continuation is handled separately and blocks next day.
#                     if first_slot.requirement.serviceType == "GUARD":
#                         continue
#
#                     for second_slot in self._daily_slots(next_date):
#                         second_start = first_start(
#                             second_slot.requirement.template, next_date
#                         )
#                         if second_start is None:
#                             continue
#
#                         gap = (24 * 60 - first_end) + second_start
#                         if gap < minimum:
#                             self.model.Add(
#                                 self._slot_var(employee.guid, first_slot)
#                                 + self._slot_var(employee.guid, second_slot)
#                                 <= 1
#                             )
#
#     def _build_objective(self) -> None:
#         # Hard coverage is already constrained. RANGE shortfalls remain costly.
#         objective = []
#         objective.extend(10_000 * variable for variable in self.under_target_vars)
#
#         # FILL_REMAINING should use every employee still compatible with rest rules.
#         objective.extend(-1_000 * variable for variable in self.fill_vars)
#
#         # MINIMUM leave means "at least". Penalizing optional leave prevents CP-SAT
#         # from creating arbitrary additional leave days.
#         objective.extend(100 * variable for variable in self.optional_leave_vars)
#         objective.extend(self.guard_pool_balance_terms)
#
#         if self.rotating:
#             maximum_historical_shifts = max(
#                 (
#                     self.history_shift_count[
#                         employee.guid
#                     ]
#                     for employee in self.rotating
#                 ),
#                 default=0,
#             )
#             maximum_historical_guards = max(
#                 (
#                     self.history_guard_count[
#                         employee.guid
#                     ]
#                     for employee in self.rotating
#                 ),
#                 default=0,
#             )
#
#             max_shifts = self.model.NewIntVar(
#                 0,
#                 len(self.dates)
#                 + maximum_historical_shifts,
#                 "max_planned_shifts",
#             )
#             min_shifts = self.model.NewIntVar(
#                 0,
#                 len(self.dates)
#                 + maximum_historical_shifts,
#                 "min_planned_shifts",
#             )
#             max_guards = self.model.NewIntVar(
#                 0,
#                 len(self.dates)
#                 + maximum_historical_guards,
#                 "max_planned_guards",
#             )
#             min_guards = self.model.NewIntVar(
#                 0,
#                 len(self.dates)
#                 + maximum_historical_guards,
#                 "min_planned_guards",
#             )
#
#             for employee in self.rotating:
#                 shifts = sum(
#                     self.work_day[(employee.guid, iso)]
#                     for iso in self.dates
#                 )
#                 guards = sum(
#                     self.guard_day[(employee.guid, iso)]
#                     for iso in self.dates
#                 )
#
#                 # Include historical loads so a heavily used employee is penalized.
#                 historical_shifts = self.history_shift_count[employee.guid]
#                 historical_guards = self.history_guard_count[employee.guid]
#
#                 self.model.Add(shifts + historical_shifts <= max_shifts)
#                 self.model.Add(shifts + historical_shifts >= min_shifts)
#                 self.model.Add(guards + historical_guards <= max_guards)
#                 self.model.Add(guards + historical_guards >= min_guards)
#
#                 for slot in self.slots:
#                     history_cost = self.history_template_count[
#                         (employee.guid, slot.requirement.template.guid)
#                     ]
#                     if history_cost:
#                         objective.append(
#                             history_cost
#                             * 5
#                             * self._slot_var(employee.guid, slot)
#                         )
#
#             objective.append(100 * (max_guards - min_guards))
#             objective.append(10 * (max_shifts - min_shifts))
#
#         self.model.Minimize(sum(objective) if objective else 0)
#
#     def solve(self) -> SolverResponse:
#         self.build()
#
#         self.solver.parameters.max_time_in_seconds = max(
#             1.0,
#             float(self.request.solverTimeoutSeconds) - 1.0,
#         )
#         self.solver.parameters.num_search_workers = 8
#         self.solver.parameters.random_seed = 42
#
#         status = self.solver.Solve(self.model)
#         status_name = self.solver.StatusName(status)
#
#         if status == cp_model.INFEASIBLE:
#             diagnostics = EngineDiagnostics(
#                 violations=[
#                     PlanningViolation(
#                         severity="HARD",
#                         code="PLANNING_INFEASIBLE",
#                         message="CP-SAT proved that no planning satisfies all hard constraints",
#                     )
#                 ],
#                 coverage=[],
#                 guardPools=[],
#                 weeklyLeaveGroups=[],
#                 fairnessScore=0,
#                 coverageScore=0,
#             )
#             return SolverResponse(
#                 success=False,
#                 status="INFEASIBLE",
#                 diagnostics=diagnostics,
#                 message="No feasible planning satisfies every hard constraint",
#             )
#
#         if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
#             return SolverResponse(
#                 success=False,
#                 status="UNKNOWN",
#                 message=f"CP-SAT stopped with status {status_name}",
#             )
#
#         result = self._build_result()
#         return SolverResponse(
#             success=True,
#             status="OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE",
#             result=result,
#         )
#
#     def _build_result(self) -> EngineResult:
#         schedules: dict[str, dict[str, str | None]] = {}
#         reasons: dict[str, dict[str, DayReason | None]] = {}
#
#         for employee in self.request.employees:
#             schedules[employee.guid] = {}
#             reasons[employee.guid] = {}
#
#         # Fixed profiles keep their shift; the rest day may be template-based or solved.
#         for employee in self.fixed:
#             assert employee.fixedTemplate is not None
#             for iso in self.dates:
#                 leave_variable = self.weekly_leave.get((employee.guid, iso))
#                 is_weekly_leave = bool(
#                     leave_variable is not None
#                     and self.solver.Value(leave_variable)
#                 )
#                 variable = self.fixed_work.get((employee.guid, iso))
#                 works = (
#                     bool(self.solver.Value(variable))
#                     if variable is not None
#                     else template_has_work(employee.fixedTemplate, iso)
#                 )
#
#                 if is_weekly_leave:
#                     schedules[employee.guid][iso] = None
#                     reasons[employee.guid][iso] = DayReason(
#                         templateName="Congé hebdomadaire",
#                         templateGuid=None,
#                         confidence=100,
#                         source="WEEKLY_LEAVE",
#                         factors=[
#                             "Congé attribué selon l’ordre de rotation de l’équipe",
#                             "Jour autorisé par la politique de congé hebdomadaire",
#                         ],
#                     )
#                 elif works:
#                     schedules[employee.guid][iso] = employee.fixedTemplate.guid
#                     reasons[employee.guid][iso] = DayReason(
#                         templateName=employee.fixedTemplate.name,
#                         templateGuid=employee.fixedTemplate.guid,
#                         confidence=100,
#                         source="FIXED",
#                         factors=[
#                             "Horaire fixe défini dans le profil de l’employé"
#                         ],
#                     )
#                 else:
#                     schedules[employee.guid][iso] = None
#                     reasons[employee.guid][iso] = DayReason(
#                         templateName="Repos du template",
#                         templateGuid=None,
#                         confidence=100,
#                         source="TEMPLATE_REST",
#                         factors=[
#                             "Aucun bloc de travail n’est défini dans le template fixe pour cette date"
#                         ],
#                     )
#
#         for employee in self.rotating:
#             for iso in self.dates:
#                 if iso in schedules[employee.guid]:
#                     continue
#
#                 selected = None
#                 for slot in self._daily_slots(iso):
#                     if self.solver.Value(self._slot_var(employee.guid, slot)):
#                         selected = slot
#                         break
#
#                 if selected is None:
#                     leave_variable = self.weekly_leave.get((employee.guid, iso))
#                     is_weekly_leave = bool(
#                         leave_variable is not None
#                         and self.solver.Value(leave_variable)
#                     )
#
#                     schedules[employee.guid][iso] = None
#                     if is_weekly_leave:
#                         reasons[employee.guid][iso] = DayReason(
#                             templateName="Congé hebdomadaire",
#                             templateGuid=None,
#                             confidence=100,
#                             source="WEEKLY_LEAVE",
#                             factors=[
#                                 "Congé attribué par la politique hebdomadaire active",
#                                 "Le périmètre, le nombre de jours et le service sont configurés par le tenant",
#                             ],
#                         )
#                     else:
#                         reasons[employee.guid][iso] = DayReason(
#                             templateName="Non affecté",
#                             templateGuid=None,
#                             confidence=100,
#                             source="UNASSIGNED",
#                             factors=[
#                                 "Aucun service n’a été attribué sur cette date",
#                                 "Cette absence d’affectation n’est pas un congé hebdomadaire",
#                             ],
#                         )
#                     continue
#
#                 requirement = selected.requirement
#                 source = (
#                     "FILL_REMAINING"
#                     if requirement.allocationMode == "FILL_REMAINING"
#                     else "GENERATED"
#                 )
#                 schedules[employee.guid][iso] = requirement.template.guid
#                 reasons[employee.guid][iso] = DayReason(
#                     templateName=requirement.template.name,
#                     templateGuid=requirement.template.guid,
#                     confidence=100,
#                     source=source,
#                     factors=[
#                         f"Solution globale CP-SAT — mode {requirement.allocationMode}",
#                         "Toutes les contraintes obligatoires ont été vérifiées simultanément",
#                         *(
#                             ["Employé sélectionné dans le pool hebdomadaire de garde"]
#                             if requirement.serviceType == "GUARD"
#                             and self.request.config.guardTeamPolicy.mode == "WEEKLY_POOL"
#                             else []
#                         ),
#                     ],
#                 )
#
#                 if (
#                     requirement.serviceType == "GUARD"
#                     and requirement.continuationTemplate is not None
#                 ):
#                     continuation_date = add_days(
#                         iso, requirement.continuationDayOffset
#                     )
#                     schedules[employee.guid][
#                         continuation_date
#                     ] = requirement.continuationTemplate.guid
#                     reasons[employee.guid][
#                         continuation_date
#                     ] = DayReason(
#                         templateName=requirement.continuationTemplate.name,
#                         templateGuid=requirement.continuationTemplate.guid,
#                         confidence=100,
#                         source="GUARD_CONTINUATION",
#                         factors=[
#                             f"Suite automatique de la garde commencée le {iso}",
#                             "Aucun autre service autorisé pendant cette journée de continuation",
#                         ],
#                     )
#
#                     if self.request.config.restAfterGuardRequired:
#                         for offset in range(
#                             1,
#                             self.request.config.postGuardRestDays + 1,
#                         ):
#                             rest_date = add_days(continuation_date, offset)
#                             schedules[employee.guid][rest_date] = None
#                             reasons[employee.guid][rest_date] = DayReason(
#                                 templateName="Repos post-garde",
#                                 templateGuid=None,
#                                 confidence=100,
#                                 source="POST_GUARD_REST",
#                                 factors=[
#                                     f"Repos complet après la garde commencée le {iso}",
#                                     f"Jour {offset} sur {self.request.config.postGuardRestDays} de récupération post-garde",
#                                 ],
#                             )
#
#         coverage: list[CoverageResult] = []
#         violations: list[PlanningViolation] = []
#
#         for slot in self.slots:
#             requirement = slot.requirement
#             fixed_eligible = (
#                 "FIXED" in requirement.eligibility.planningModes
#                 and requirement.eligibility.guardPoolRelation != "MEMBER"
#             )
#             assigned = (
#                 self.fixed_counts[(slot.iso, requirement.template.guid)]
#                 if fixed_eligible
#                 else 0
#             ) + sum(
#                 self.solver.Value(self._slot_var(employee.guid, slot))
#                 for employee in self.rotating
#             ) + sum(
#                 self.solver.Value(
#                     self.fixed_work[(employee.guid, slot.iso)]
#                 )
#                 for employee in self.fixed_rotating_rest
#                 if fixed_eligible
#                 and employee.fixedTemplate is not None
#                 and employee.fixedTemplate.guid == requirement.template.guid
#             )
#
#             status = "COVERED"
#             if assigned < requirement.minEmployees:
#                 status = "BELOW_MINIMUM"
#             elif assigned < requirement.targetEmployees:
#                 status = "BELOW_TARGET"
#             elif (
#                 requirement.maxEmployees is not None
#                 and assigned > requirement.maxEmployees
#             ):
#                 status = "ABOVE_MAXIMUM"
#
#             coverage.append(
#                 CoverageResult(
#                     date=slot.iso,
#                     dayOfWeek=day_key(slot.iso),
#                     requirementGuid=requirement.guid,
#                     allocationMode=requirement.allocationMode,
#                     templateGuid=requirement.template.guid,
#                     templateName=requirement.template.name,
#                     minimum=requirement.minEmployees,
#                     target=requirement.targetEmployees,
#                     maximum=requirement.maxEmployees,
#                     assigned=assigned,
#                     status=status,
#                 )
#             )
#
#         guard_pools: list[GuardPoolResult] = []
#         if self.request.config.guardTeamPolicy.mode == "WEEKLY_POOL":
#             policy = self.request.config.guardTeamPolicy
#             for week_monday, dates in self._week_groups().items():
#                 selected = [
#                     employee.guid
#                     for employee in self.rotating
#                     if (employee.guid, week_monday) in self.weekly_guard_pool
#                     and self.solver.Value(
#                         self.weekly_guard_pool[(employee.guid, week_monday)]
#                     )
#                 ]
#                 if not selected:
#                     continue
#                 guard_pools.append(
#                     GuardPoolResult(
#                         weekFrom=min(dates),
#                         weekTo=max(dates),
#                         employeeGuids=selected,
#                         mode=policy.mode,
#                         selectionMode=policy.selectionMode,
#                     )
#                 )
#
#         weekly_leave_groups: list[WeeklyLeaveGroupResult] = []
#         leave_policy = self.request.config.weeklyLeavePolicy
#         if leave_policy.mode in {"TEAM_ROTATION", "PER_ELIGIBLE_EMPLOYEE"}:
#             for week_monday, dates in self._week_groups().items():
#                 if leave_policy.completeWeeksOnly and len(dates) != 7:
#                     continue
#                 leave_by_employee: dict[str, list[str]] = {}
#                 for employee in self.included:
#                     selected_dates = [
#                         iso
#                         for iso in dates
#                         if (employee.guid, iso) in self.weekly_leave
#                         and self.solver.Value(
#                             self.weekly_leave[(employee.guid, iso)]
#                         )
#                     ]
#                     if selected_dates:
#                         leave_by_employee[employee.guid] = selected_dates
#
#                 if leave_by_employee:
#                     weekly_leave_groups.append(
#                         WeeklyLeaveGroupResult(
#                             weekFrom=min(dates),
#                             weekTo=max(dates),
#                             employeeGuids=list(leave_by_employee.keys()),
#                             leaveByEmployee=leave_by_employee,
#                             mode=leave_policy.mode,
#                             selector=leave_policy.selector,
#                             serviceScope=leave_policy.serviceScope,
#                         )
#                     )
#
#         coverage_score = self._coverage_score(coverage)
#         fairness_score = self._fairness_score()
#         conformity = round(coverage_score * 0.75 + fairness_score * 0.25)
#
#         diagnostics = EngineDiagnostics(
#             violations=violations,
#             coverage=coverage,
#             guardPools=guard_pools,
#             weeklyLeaveGroups=weekly_leave_groups,
#             fairnessScore=fairness_score,
#             coverageScore=coverage_score,
#         )
#
#         return EngineResult(
#             items=[
#                 EmployeeSuggestionResult(
#                     userGuid=employee.guid,
#                     schedule=schedules[employee.guid],
#                     reasons=reasons[employee.guid],
#                 )
#                 for employee in self.request.employees
#                 if employee.mode != "EXCLUDED"
#             ],
#             conformityScore=conformity,
#             diagnostics=diagnostics,
#         )
#
#     @staticmethod
#     def _coverage_score(coverage: list[CoverageResult]) -> int:
#         if not coverage:
#             return 0
#         total = 0.0
#         for slot in coverage:
#             if slot.target == 0:
#                 total += 1.0
#             else:
#                 total += min(1.0, slot.assigned / slot.target)
#         return round((total / len(coverage)) * 100)
#
#     def _fairness_score(self) -> int:
#         if len(self.rotating) <= 1:
#             return 100
#
#         loads = []
#         for employee in self.rotating:
#             shifts = sum(
#                 self.solver.Value(self.work_day[(employee.guid, iso)])
#                 for iso in self.dates
#             )
#             guards = sum(
#                 self.solver.Value(self.guard_day[(employee.guid, iso)])
#                 for iso in self.dates
#             )
#             weekends = sum(
#                 self.solver.Value(self.work_day[(employee.guid, iso)])
#                 for iso in self.dates
#                 if is_weekend(iso)
#             )
#             loads.append(shifts + guards * 2 + weekends)
#
#         spread = max(loads) - min(loads)
#         return max(0, round(100 - spread * 12.5))
#
#
# def solve_planning(request: PlanningSolverInput) -> SolverResponse:
#     return OrToolsPlanner(request).solve()