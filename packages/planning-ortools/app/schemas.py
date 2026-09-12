from __future__ import annotations

from datetime import date, timedelta
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


DayKey = Literal["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
PlanningMode = Literal["FIXED", "ROTATING", "EXCLUDED"]
FixedRestDayMode = Literal["TEMPLATE", "ROTATING"]
ServiceType = Literal["STANDARD", "GUARD"]
AllocationMode = Literal["EXACT", "RANGE", "FILL_REMAINING"]
HistoricalServiceType = Literal["STANDARD", "GUARD", "GUARD_CONTINUATION"]
WeeklyLeaveMode = Literal[
    "NONE",
    "PER_EMPLOYEE",
    "TEAM_ROTATION",
    "PER_ELIGIBLE_EMPLOYEE",
]
WeeklyLeaveCountMode = Literal["MINIMUM", "EXACT"]
GuardPoolRelation = Literal["ANY", "MEMBER", "NON_MEMBER"]
ServiceScopeMode = Literal["ANY", "SERVICE_TYPE", "TEMPLATE", "REQUIREMENT"]
GuardTeamMode = Literal["DAILY_FLEXIBLE", "WEEKLY_POOL"]
GuardTeamSelectionMode = Literal["ROTATION_ORDER", "OPTIMIZED"]
GuardMemberServiceAccess = Literal["ANY_SERVICE", "GUARD_ONLY"]
MembershipBalanceMode = Literal["NONE", "SOFT", "STRICT"]


class WorkBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    work: tuple[str, str]
    pause: tuple[str, str] | None = None
    tolerance: int = Field(ge=0)


class EngineTemplate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    guid: str = Field(min_length=1)
    name: str = Field(min_length=1)
    definition: dict[DayKey, list[WorkBlock] | None] = Field(default_factory=dict)


class EmployeePolicySelector(BaseModel):
    model_config = ConfigDict(extra="forbid")

    planningModes: list[PlanningMode] = Field(default_factory=lambda: ["ROTATING"])
    guardPoolRelation: GuardPoolRelation = "ANY"

    @model_validator(mode="after")
    def validate_selector(self) -> "EmployeePolicySelector":
        if not self.planningModes:
            raise ValueError("selector.planningModes cannot be empty")
        if len(set(self.planningModes)) != len(self.planningModes):
            raise ValueError("selector.planningModes cannot contain duplicates")
        if "EXCLUDED" in self.planningModes:
            raise ValueError("EXCLUDED cannot be targeted by a planning policy")
        return self


class ServiceScope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: ServiceScopeMode = "ANY"
    serviceTypes: list[ServiceType] = Field(default_factory=list)
    templateGuids: list[str] = Field(default_factory=list)
    requirementGuids: list[str] = Field(default_factory=list)
    exclusive: bool = False

    @model_validator(mode="after")
    def validate_scope(self) -> "ServiceScope":
        if len(set(self.serviceTypes)) != len(self.serviceTypes):
            raise ValueError("serviceScope.serviceTypes cannot contain duplicates")
        if len(set(self.templateGuids)) != len(self.templateGuids):
            raise ValueError("serviceScope.templateGuids cannot contain duplicates")
        if len(set(self.requirementGuids)) != len(self.requirementGuids):
            raise ValueError("serviceScope.requirementGuids cannot contain duplicates")

        if self.mode == "SERVICE_TYPE" and not self.serviceTypes:
            raise ValueError("SERVICE_TYPE scope requires serviceTypes")
        if self.mode == "TEMPLATE" and not self.templateGuids:
            raise ValueError("TEMPLATE scope requires templateGuids")
        if self.mode == "REQUIREMENT" and not self.requirementGuids:
            raise ValueError("REQUIREMENT scope requires requirementGuids")
        return self


class PlanningEmployeeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    guid: str = Field(min_length=1)
    name: str = Field(min_length=1)
    code: str = ""
    mode: PlanningMode
    rotationOrder: int | None = Field(default=None, ge=1)
    maxWeeklyMinutes: int | None = Field(default=None, ge=1)
    fixedTemplate: EngineTemplate | None = None
    fixedRestDayMode: FixedRestDayMode = "TEMPLATE"

    @model_validator(mode="after")
    def validate_fixed_employee(self) -> "PlanningEmployeeInput":
        if self.mode == "FIXED" and self.fixedTemplate is None:
            raise ValueError("A FIXED employee requires fixedTemplate")
        if self.mode != "FIXED" and self.fixedRestDayMode != "TEMPLATE":
            raise ValueError(
                "fixedRestDayMode ROTATING is only valid for FIXED employees"
            )
        return self


class PlanningRequirementInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    guid: str = Field(min_length=1)
    dayOfWeek: DayKey
    serviceType: ServiceType
    allocationMode: AllocationMode
    minEmployees: int = Field(ge=0)
    targetEmployees: int = Field(ge=0)
    maxEmployees: int | None = Field(default=None, ge=0)
    priority: int = Field(ge=1)
    template: EngineTemplate
    continuationTemplate: EngineTemplate | None = None
    continuationDayOffset: int = Field(default=0, ge=0, le=1)
    creditedMinutes: int | None = Field(default=None, ge=1, le=10080)
    eligibility: EmployeePolicySelector = Field(
        default_factory=lambda: EmployeePolicySelector(
            planningModes=["FIXED", "ROTATING"],
            guardPoolRelation="ANY",
        )
    )

    @model_validator(mode="after")
    def validate_requirement(self) -> "PlanningRequirementInput":
        if self.targetEmployees < self.minEmployees:
            raise ValueError("targetEmployees must be >= minEmployees")

        if self.maxEmployees is not None and self.maxEmployees < self.targetEmployees:
            raise ValueError("maxEmployees must be >= targetEmployees")

        if self.allocationMode == "EXACT":
            if self.maxEmployees is None:
                raise ValueError("EXACT requires maxEmployees")
            if not (
                self.minEmployees
                == self.targetEmployees
                == self.maxEmployees
            ):
                raise ValueError(
                    "EXACT requires minEmployees = targetEmployees = maxEmployees"
                )

        if self.allocationMode == "FILL_REMAINING" and self.serviceType != "STANDARD":
            raise ValueError("FILL_REMAINING is only valid for STANDARD")

        if self.serviceType == "GUARD":
            if self.continuationTemplate is None:
                raise ValueError("GUARD requires continuationTemplate")
            if self.continuationDayOffset != 1:
                raise ValueError("GUARD requires continuationDayOffset = 1")
        else:
            if self.continuationTemplate is not None:
                raise ValueError("STANDARD cannot have continuationTemplate")
            if self.continuationDayOffset != 0:
                raise ValueError("STANDARD requires continuationDayOffset = 0")

        return self


class HistoricalAssignment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    userGuid: str
    startDate: str
    endDate: str
    templateGuid: str
    templateName: str
    definition: dict[DayKey, list[WorkBlock] | None]
    serviceType: HistoricalServiceType


class HistoricalFairnessBaseline(BaseModel):
    model_config = ConfigDict(extra="forbid")

    employeeGuid: str
    workedDays: int = Field(default=0, ge=0)
    guardDays: int = Field(default=0, ge=0)
    weekendWorkedDays: int = Field(default=0, ge=0)
    workedMinutes: int = Field(default=0, ge=0)
    restDays: int = Field(default=0, ge=0)
    templateCounts: dict[str, int] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_template_counts(self) -> "HistoricalFairnessBaseline":
        if any(value < 0 for value in self.templateCounts.values()):
            raise ValueError("historicalFairness.templateCounts cannot contain negative values")
        return self


class BoundaryGuardContinuation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    employeeGuid: str
    guardDate: str
    continuationDate: str
    continuationTemplate: EngineTemplate
    creditedMinutes: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_boundary(self) -> "BoundaryGuardContinuation":
        guard_date = date.fromisoformat(self.guardDate)
        continuation_date = date.fromisoformat(self.continuationDate)
        if continuation_date != guard_date + timedelta(days=1):
            raise ValueError(
                "boundary guard continuation must occur exactly one day after guardDate"
            )
        return self


class PlanningBoundaryState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    guardContinuations: list[BoundaryGuardContinuation] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_unique_continuations(self) -> "PlanningBoundaryState":
        keys = [
            (item.employeeGuid, item.continuationDate)
            for item in self.guardContinuations
        ]
        if len(keys) != len(set(keys)):
            raise ValueError(
                "boundaryState.guardContinuations contains duplicate employee/date entries"
            )
        return self


class WeeklyLeavePolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: WeeklyLeaveMode = "PER_EMPLOYEE"

    # Legacy TEAM_ROTATION quota.
    employeesPerWeek: int = Field(default=1, ge=1, le=1000)
    rotationAnchorDate: str | None = None

    # Generic PER_ELIGIBLE_EMPLOYEE policy.
    selector: EmployeePolicySelector = Field(default_factory=EmployeePolicySelector)
    daysPerEmployee: int = Field(default=1, ge=1, le=7)
    countMode: WeeklyLeaveCountMode = "EXACT"
    maxEmployeesPerDay: int | None = Field(default=None, ge=1, le=1000)
    requireWorkOnOtherDays: bool = False
    serviceScope: ServiceScope = Field(default_factory=ServiceScope)

    allowedDays: list[DayKey] = Field(
        default_factory=lambda: [
            "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
        ]
    )
    completeWeeksOnly: bool = True
    postGuardRestCountsAsLeave: bool = False

    @model_validator(mode="after")
    def validate_policy(self) -> "WeeklyLeavePolicy":
        if len(set(self.allowedDays)) != len(self.allowedDays):
            raise ValueError("weeklyLeavePolicy.allowedDays cannot contain duplicates")

        if self.mode in {"TEAM_ROTATION", "PER_ELIGIBLE_EMPLOYEE"}:
            if not self.allowedDays:
                raise ValueError(
                    f"{self.mode} requires at least one allowed weekly leave day"
                )

        if self.mode == "TEAM_ROTATION":
            if self.selector.guardPoolRelation != "ANY":
                raise ValueError(
                    "TEAM_ROTATION cannot use a guard-pool selector; use PER_ELIGIBLE_EMPLOYEE"
                )
            if not self.rotationAnchorDate:
                raise ValueError("TEAM_ROTATION requires rotationAnchorDate")
            try:
                date.fromisoformat(self.rotationAnchorDate)
            except ValueError as error:
                raise ValueError(
                    "weeklyLeavePolicy.rotationAnchorDate must be YYYY-MM-DD"
                ) from error

        if (
            self.mode == "PER_ELIGIBLE_EMPLOYEE"
            and self.countMode == "EXACT"
            and self.daysPerEmployee > len(self.allowedDays)
        ):
            raise ValueError(
                "daysPerEmployee cannot exceed allowedDays in EXACT mode"
            )

        return self


class GuardMembershipBalancePolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: MembershipBalanceMode = "NONE"
    maxMembershipSpread: int | None = Field(default=None, ge=0, le=52)
    maxConsecutiveMembershipWeeks: int | None = Field(default=None, ge=1, le=52)

    @model_validator(mode="after")
    def validate_balance(self) -> "GuardMembershipBalancePolicy":
        if self.mode == "STRICT" and self.maxMembershipSpread is None:
            raise ValueError("STRICT guard pool balance requires maxMembershipSpread")
        return self


class GuardTeamPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: GuardTeamMode = "DAILY_FLEXIBLE"
    employeesPerWeek: int = Field(default=1, ge=1, le=1000)
    selectionMode: GuardTeamSelectionMode = "ROTATION_ORDER"
    rotationAnchorDate: str | None = None
    completeWeeksOnly: bool = True
    requireParticipation: bool = True
    eligiblePlanningModes: list[PlanningMode] = Field(
        default_factory=lambda: ["ROTATING"]
    )
    memberServiceAccess: GuardMemberServiceAccess = "ANY_SERVICE"
    balance: GuardMembershipBalancePolicy = Field(
        default_factory=GuardMembershipBalancePolicy
    )

    @model_validator(mode="after")
    def validate_policy(self) -> "GuardTeamPolicy":
        if not self.eligiblePlanningModes:
            raise ValueError("guardTeamPolicy.eligiblePlanningModes cannot be empty")
        if len(set(self.eligiblePlanningModes)) != len(self.eligiblePlanningModes):
            raise ValueError(
                "guardTeamPolicy.eligiblePlanningModes cannot contain duplicates"
            )
        if "EXCLUDED" in self.eligiblePlanningModes:
            raise ValueError("EXCLUDED cannot be eligible for a guard pool")

        # Current dynamic-assignment engine creates guard variables for ROTATING
        # profiles. The field is versioned so future engines may support more modes.
        if self.mode == "WEEKLY_POOL" and "ROTATING" not in self.eligiblePlanningModes:
            raise ValueError(
                "WEEKLY_POOL currently requires ROTATING in eligiblePlanningModes"
            )

        if self.mode == "WEEKLY_POOL":
            if self.selectionMode == "ROTATION_ORDER":
                if not self.rotationAnchorDate:
                    raise ValueError(
                        "WEEKLY_POOL with ROTATION_ORDER requires rotationAnchorDate"
                    )
                try:
                    date.fromisoformat(self.rotationAnchorDate)
                except ValueError as error:
                    raise ValueError(
                        "guardTeamPolicy.rotationAnchorDate must be YYYY-MM-DD"
                    ) from error
        return self


class EngineConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    minRestDaysPerWeek: int = Field(ge=0, le=7)
    maxConsecutiveWorkDays: int | None = Field(default=None, ge=1, le=366)
    maxWeeklyMinutes: int | None = Field(default=None, ge=1)
    minRestMinutesBetweenShifts: int = Field(ge=0)
    maxConsecutiveGuards: int = Field(ge=0, le=31)
    restAfterGuardRequired: bool
    postGuardRestDays: int = Field(default=0, ge=0, le=31)
    maxRestingEmployeesPerDay: int | None = Field(default=None, ge=1)
    fairnessWindowWeeks: int = Field(ge=1, le=52)
    strictCoverage: bool
    weeklyLeavePolicy: WeeklyLeavePolicy = Field(default_factory=WeeklyLeavePolicy)
    guardTeamPolicy: GuardTeamPolicy = Field(default_factory=GuardTeamPolicy)
    # Step 17: keep physical/business constraints HARD while treating rotation
    # and guard-pool fairness as preferences. Set false only for legacy strict mode.
    resilientAssistantMode: bool = True


class PlanningLockedAssignment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    employeeGuid: str = Field(min_length=1)
    date: str
    templateGuid: str | None = None
    requirementGuid: str | None = None
    # For a manager service that is not represented by a configured
    # requirement. It is treated as an authoritative occupied day.
    template: EngineTemplate | None = None

    @model_validator(mode="after")
    def validate_locked_assignment(self) -> "PlanningLockedAssignment":
        try:
            date.fromisoformat(self.date)
        except ValueError as error:
            raise ValueError("lockedAssignments.date must be YYYY-MM-DD") from error

        if self.templateGuid is None:
            if self.requirementGuid is not None:
                raise ValueError("A locked rest cannot reference requirementGuid")
            if self.template is not None:
                raise ValueError("A locked rest cannot carry a template snapshot")
            return self

        if self.template is not None and self.template.guid != self.templateGuid:
            raise ValueError("lockedAssignments.template must match templateGuid")

        if self.requirementGuid is None and self.template is None:
            raise ValueError(
                "A manager service outside requirements requires a template snapshot"
            )

        return self


class PlanningSolverInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    employees: list[PlanningEmployeeInput]
    requirements: list[PlanningRequirementInput]
    # Raw assignments are retained for wire compatibility only. Lot 5.1 sends
    # aggregated historicalFairness so history can influence objectives without
    # becoming a hard feasibility constraint.
    historicalAssignments: list[HistoricalAssignment] = Field(default_factory=list)
    historicalFairness: list[HistoricalFairnessBaseline] = Field(default_factory=list)
    boundaryState: PlanningBoundaryState = Field(default_factory=PlanningBoundaryState)
    lockedAssignments: list[PlanningLockedAssignment] = Field(default_factory=list)
    periodFrom: str
    periodTo: str
    requestedPeriodFrom: str | None = None
    requestedPeriodTo: str | None = None
    config: EngineConfig
    solverTimeoutSeconds: int = Field(default=20, ge=1, le=300)


    @model_validator(mode="after")
    def validate_locked_assignments(self) -> "PlanningSolverInput":
        employee_by_guid = {employee.guid: employee for employee in self.employees}

        fairness_guids = [entry.employeeGuid for entry in self.historicalFairness]
        if len(fairness_guids) != len(set(fairness_guids)):
            raise ValueError("historicalFairness contains duplicate employeeGuid entries")
        unknown_fairness = [guid for guid in fairness_guids if guid not in employee_by_guid]
        if unknown_fairness:
            raise ValueError(
                f"historicalFairness references unknown employees: {unknown_fairness}"
            )
        requirement_by_guid = {requirement.guid: requirement for requirement in self.requirements}
        seen: set[tuple[str, str]] = set()

        period_from = date.fromisoformat(self.periodFrom)
        period_to = date.fromisoformat(self.periodTo)
        day_keys = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

        for lock in self.lockedAssignments:
            key = (lock.employeeGuid, lock.date)
            if key in seen:
                raise ValueError(
                    "lockedAssignments contains duplicate employee/date entries"
                )
            seen.add(key)

            employee = employee_by_guid.get(lock.employeeGuid)
            if employee is None or employee.mode == "EXCLUDED":
                raise ValueError(
                    f"Locked employee {lock.employeeGuid} is not planifiable"
                )

            lock_date = date.fromisoformat(lock.date)
            if lock_date < period_from or lock_date > period_to:
                raise ValueError(
                    "lockedAssignments dates must stay inside the technical solve horizon"
                )

            if lock.templateGuid is None:
                continue

            # A configured service lock may deliberately violate employee
            # eligibility: that is a manager override, not invalid solver input.
            if lock.requirementGuid:
                requirement = requirement_by_guid.get(lock.requirementGuid)
                if requirement is None:
                    raise ValueError(
                        f"Locked requirement {lock.requirementGuid} does not exist"
                    )
                if requirement.template.guid != lock.templateGuid:
                    raise ValueError(
                        "Locked templateGuid does not match requirement template"
                    )
                if requirement.dayOfWeek != day_keys[lock_date.weekday()]:
                    raise ValueError(
                        "Locked requirement does not apply on the locked date"
                    )
                continue

            # External manager service: it only needs to be a real work template
            # for that date. It occupies the employee but does not invent engine
            # coverage or eligibility semantics.
            assert lock.template is not None
            blocks = lock.template.definition.get(day_keys[lock_date.weekday()])
            if not blocks:
                raise ValueError(
                    f"Locked external template {lock.templateGuid} has no work block on {lock.date}"
                )

        return self


class DayReason(BaseModel):
    templateName: str
    templateGuid: str | None
    confidence: int
    factors: list[str]
    source: Literal[
        "FIXED",
        "GENERATED",
        "FILL_REMAINING",
        "GUARD_CONTINUATION",
        "POST_GUARD_REST",
        "WEEKLY_LEAVE",
        "TEMPLATE_REST",
        "UNASSIGNED",
        "REST",
    ]


class EmployeeSuggestionResult(BaseModel):
    userGuid: str
    schedule: dict[str, str | None]
    reasons: dict[str, DayReason | None]


class PlanningViolation(BaseModel):
    severity: Literal["HARD", "WARNING"]
    code: str
    date: str | None = None
    employeeGuid: str | None = None
    requirementGuid: str | None = None
    message: str
    details: dict | None = None


class CoverageResult(BaseModel):
    date: str
    dayOfWeek: DayKey
    requirementGuid: str
    allocationMode: AllocationMode
    templateGuid: str
    templateName: str
    minimum: int
    target: int
    maximum: int | None
    assigned: int
    status: Literal[
        "COVERED",
        "BELOW_TARGET",
        "BELOW_MINIMUM",
        "ABOVE_MAXIMUM",
    ]


class GuardPoolResult(BaseModel):
    weekFrom: str
    weekTo: str
    employeeGuids: list[str]
    mode: GuardTeamMode
    selectionMode: GuardTeamSelectionMode


class WeeklyLeaveGroupResult(BaseModel):
    weekFrom: str
    weekTo: str
    employeeGuids: list[str]
    leaveByEmployee: dict[str, list[str]]
    mode: WeeklyLeaveMode
    selector: EmployeePolicySelector
    serviceScope: ServiceScope


class EngineDiagnostics(BaseModel):
    violations: list[PlanningViolation]
    coverage: list[CoverageResult]
    guardPools: list[GuardPoolResult] = Field(default_factory=list)
    weeklyLeaveGroups: list[WeeklyLeaveGroupResult] = Field(default_factory=list)
    fairnessScore: int
    coverageScore: int
    relaxationsApplied: list[str] = Field(default_factory=list)


class EngineResult(BaseModel):
    items: list[EmployeeSuggestionResult]
    conformityScore: int
    diagnostics: EngineDiagnostics


class SolverStats(BaseModel):
    statusName: str
    wallTimeSeconds: float
    numConflicts: int
    numBranches: int
    numBooleans: int


class SolverResponse(BaseModel):
    success: bool
    status: Literal["OPTIMAL", "FEASIBLE", "INFEASIBLE", "UNKNOWN"]
    solverVersion: str = "ortools-cp-sat-v1.10-history-fairness"
    solverStats: SolverStats | None = None
    result: EngineResult | None = None
    diagnostics: EngineDiagnostics | None = None
    message: str | None = None


# from __future__ import annotations
#
# from datetime import date
# from typing import Literal
#
# from pydantic import BaseModel, ConfigDict, Field, model_validator
#
#
# DayKey = Literal["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
# PlanningMode = Literal["FIXED", "ROTATING", "EXCLUDED"]
# FixedRestDayMode = Literal["TEMPLATE", "ROTATING"]
# ServiceType = Literal["STANDARD", "GUARD"]
# AllocationMode = Literal["EXACT", "RANGE", "FILL_REMAINING"]
# HistoricalServiceType = Literal["STANDARD", "GUARD", "GUARD_CONTINUATION"]
# WeeklyLeaveMode = Literal[
#     "NONE",
#     "PER_EMPLOYEE",
#     "TEAM_ROTATION",
#     "PER_ELIGIBLE_EMPLOYEE",
# ]
# WeeklyLeaveCountMode = Literal["MINIMUM", "EXACT"]
# GuardPoolRelation = Literal["ANY", "MEMBER", "NON_MEMBER"]
# ServiceScopeMode = Literal["ANY", "SERVICE_TYPE", "TEMPLATE", "REQUIREMENT"]
# GuardTeamMode = Literal["DAILY_FLEXIBLE", "WEEKLY_POOL"]
# GuardTeamSelectionMode = Literal["ROTATION_ORDER", "OPTIMIZED"]
# GuardMemberServiceAccess = Literal["ANY_SERVICE", "GUARD_ONLY"]
# MembershipBalanceMode = Literal["NONE", "SOFT", "STRICT"]
#
#
# class WorkBlock(BaseModel):
#     model_config = ConfigDict(extra="forbid")
#
#     work: tuple[str, str]
#     pause: tuple[str, str] | None = None
#     tolerance: int = Field(ge=0)
#
#
# class EngineTemplate(BaseModel):
#     model_config = ConfigDict(extra="forbid")
#
#     guid: str = Field(min_length=1)
#     name: str = Field(min_length=1)
#     definition: dict[DayKey, list[WorkBlock] | None] = Field(default_factory=dict)
#
#
# class EmployeePolicySelector(BaseModel):
#     model_config = ConfigDict(extra="forbid")
#
#     planningModes: list[PlanningMode] = Field(default_factory=lambda: ["ROTATING"])
#     guardPoolRelation: GuardPoolRelation = "ANY"
#
#     @model_validator(mode="after")
#     def validate_selector(self) -> "EmployeePolicySelector":
#         if not self.planningModes:
#             raise ValueError("selector.planningModes cannot be empty")
#         if len(set(self.planningModes)) != len(self.planningModes):
#             raise ValueError("selector.planningModes cannot contain duplicates")
#         if "EXCLUDED" in self.planningModes:
#             raise ValueError("EXCLUDED cannot be targeted by a planning policy")
#         return self
#
#
# class ServiceScope(BaseModel):
#     model_config = ConfigDict(extra="forbid")
#
#     mode: ServiceScopeMode = "ANY"
#     serviceTypes: list[ServiceType] = Field(default_factory=list)
#     templateGuids: list[str] = Field(default_factory=list)
#     requirementGuids: list[str] = Field(default_factory=list)
#     exclusive: bool = False
#
#     @model_validator(mode="after")
#     def validate_scope(self) -> "ServiceScope":
#         if len(set(self.serviceTypes)) != len(self.serviceTypes):
#             raise ValueError("serviceScope.serviceTypes cannot contain duplicates")
#         if len(set(self.templateGuids)) != len(self.templateGuids):
#             raise ValueError("serviceScope.templateGuids cannot contain duplicates")
#         if len(set(self.requirementGuids)) != len(self.requirementGuids):
#             raise ValueError("serviceScope.requirementGuids cannot contain duplicates")
#
#         if self.mode == "SERVICE_TYPE" and not self.serviceTypes:
#             raise ValueError("SERVICE_TYPE scope requires serviceTypes")
#         if self.mode == "TEMPLATE" and not self.templateGuids:
#             raise ValueError("TEMPLATE scope requires templateGuids")
#         if self.mode == "REQUIREMENT" and not self.requirementGuids:
#             raise ValueError("REQUIREMENT scope requires requirementGuids")
#         return self
#
#
# class PlanningEmployeeInput(BaseModel):
#     model_config = ConfigDict(extra="forbid")
#
#     guid: str = Field(min_length=1)
#     name: str = Field(min_length=1)
#     code: str = ""
#     mode: PlanningMode
#     rotationOrder: int | None = Field(default=None, ge=1)
#     maxWeeklyMinutes: int | None = Field(default=None, ge=1)
#     fixedTemplate: EngineTemplate | None = None
#     fixedRestDayMode: FixedRestDayMode = "TEMPLATE"
#
#     @model_validator(mode="after")
#     def validate_fixed_employee(self) -> "PlanningEmployeeInput":
#         if self.mode == "FIXED" and self.fixedTemplate is None:
#             raise ValueError("A FIXED employee requires fixedTemplate")
#         if self.mode != "FIXED" and self.fixedRestDayMode != "TEMPLATE":
#             raise ValueError(
#                 "fixedRestDayMode ROTATING is only valid for FIXED employees"
#             )
#         return self
#
#
# class PlanningRequirementInput(BaseModel):
#     model_config = ConfigDict(extra="forbid")
#
#     guid: str = Field(min_length=1)
#     dayOfWeek: DayKey
#     serviceType: ServiceType
#     allocationMode: AllocationMode
#     minEmployees: int = Field(ge=0)
#     targetEmployees: int = Field(ge=0)
#     maxEmployees: int | None = Field(default=None, ge=0)
#     priority: int = Field(ge=1)
#     template: EngineTemplate
#     continuationTemplate: EngineTemplate | None = None
#     continuationDayOffset: int = Field(default=0, ge=0, le=1)
#     creditedMinutes: int | None = Field(default=None, ge=1, le=10080)
#     eligibility: EmployeePolicySelector = Field(
#         default_factory=lambda: EmployeePolicySelector(
#             planningModes=["FIXED", "ROTATING"],
#             guardPoolRelation="ANY",
#         )
#     )
#
#     @model_validator(mode="after")
#     def validate_requirement(self) -> "PlanningRequirementInput":
#         if self.targetEmployees < self.minEmployees:
#             raise ValueError("targetEmployees must be >= minEmployees")
#
#         if self.maxEmployees is not None and self.maxEmployees < self.targetEmployees:
#             raise ValueError("maxEmployees must be >= targetEmployees")
#
#         if self.allocationMode == "EXACT":
#             if self.maxEmployees is None:
#                 raise ValueError("EXACT requires maxEmployees")
#             if not (
#                 self.minEmployees
#                 == self.targetEmployees
#                 == self.maxEmployees
#             ):
#                 raise ValueError(
#                     "EXACT requires minEmployees = targetEmployees = maxEmployees"
#                 )
#
#         if self.allocationMode == "FILL_REMAINING" and self.serviceType != "STANDARD":
#             raise ValueError("FILL_REMAINING is only valid for STANDARD")
#
#         if self.serviceType == "GUARD":
#             if self.continuationTemplate is None:
#                 raise ValueError("GUARD requires continuationTemplate")
#             if self.continuationDayOffset != 1:
#                 raise ValueError("GUARD requires continuationDayOffset = 1")
#         else:
#             if self.continuationTemplate is not None:
#                 raise ValueError("STANDARD cannot have continuationTemplate")
#             if self.continuationDayOffset != 0:
#                 raise ValueError("STANDARD requires continuationDayOffset = 0")
#
#         return self
#
#
# class HistoricalAssignment(BaseModel):
#     model_config = ConfigDict(extra="forbid")
#
#     userGuid: str
#     startDate: str
#     endDate: str
#     templateGuid: str
#     templateName: str
#     definition: dict[DayKey, list[WorkBlock] | None]
#     serviceType: HistoricalServiceType
#
#
# class WeeklyLeavePolicy(BaseModel):
#     model_config = ConfigDict(extra="forbid")
#
#     mode: WeeklyLeaveMode = "PER_EMPLOYEE"
#
#     # Legacy TEAM_ROTATION quota.
#     employeesPerWeek: int = Field(default=1, ge=1, le=1000)
#     rotationAnchorDate: str | None = None
#
#     # Generic PER_ELIGIBLE_EMPLOYEE policy.
#     selector: EmployeePolicySelector = Field(default_factory=EmployeePolicySelector)
#     daysPerEmployee: int = Field(default=1, ge=1, le=7)
#     countMode: WeeklyLeaveCountMode = "EXACT"
#     maxEmployeesPerDay: int | None = Field(default=None, ge=1, le=1000)
#     requireWorkOnOtherDays: bool = False
#     serviceScope: ServiceScope = Field(default_factory=ServiceScope)
#
#     allowedDays: list[DayKey] = Field(
#         default_factory=lambda: [
#             "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
#         ]
#     )
#     completeWeeksOnly: bool = True
#     postGuardRestCountsAsLeave: bool = False
#
#     @model_validator(mode="after")
#     def validate_policy(self) -> "WeeklyLeavePolicy":
#         if len(set(self.allowedDays)) != len(self.allowedDays):
#             raise ValueError("weeklyLeavePolicy.allowedDays cannot contain duplicates")
#
#         if self.mode in {"TEAM_ROTATION", "PER_ELIGIBLE_EMPLOYEE"}:
#             if not self.allowedDays:
#                 raise ValueError(
#                     f"{self.mode} requires at least one allowed weekly leave day"
#                 )
#
#         if self.mode == "TEAM_ROTATION":
#             if not self.rotationAnchorDate:
#                 raise ValueError("TEAM_ROTATION requires rotationAnchorDate")
#             try:
#                 date.fromisoformat(self.rotationAnchorDate)
#             except ValueError as error:
#                 raise ValueError(
#                     "weeklyLeavePolicy.rotationAnchorDate must be YYYY-MM-DD"
#                 ) from error
#
#         if (
#             self.mode == "PER_ELIGIBLE_EMPLOYEE"
#             and self.countMode == "EXACT"
#             and self.daysPerEmployee > len(self.allowedDays)
#         ):
#             raise ValueError(
#                 "daysPerEmployee cannot exceed allowedDays in EXACT mode"
#             )
#
#         return self
#
#
# class GuardMembershipBalancePolicy(BaseModel):
#     model_config = ConfigDict(extra="forbid")
#
#     mode: MembershipBalanceMode = "NONE"
#     maxMembershipSpread: int | None = Field(default=None, ge=0, le=52)
#     maxConsecutiveMembershipWeeks: int | None = Field(default=None, ge=1, le=52)
#
#     @model_validator(mode="after")
#     def validate_balance(self) -> "GuardMembershipBalancePolicy":
#         if self.mode == "STRICT" and self.maxMembershipSpread is None:
#             raise ValueError("STRICT guard pool balance requires maxMembershipSpread")
#         return self
#
#
# class GuardTeamPolicy(BaseModel):
#     model_config = ConfigDict(extra="forbid")
#
#     mode: GuardTeamMode = "DAILY_FLEXIBLE"
#     employeesPerWeek: int = Field(default=1, ge=1, le=1000)
#     selectionMode: GuardTeamSelectionMode = "ROTATION_ORDER"
#     rotationAnchorDate: str | None = None
#     completeWeeksOnly: bool = True
#     requireParticipation: bool = True
#     eligiblePlanningModes: list[PlanningMode] = Field(
#         default_factory=lambda: ["ROTATING"]
#     )
#     memberServiceAccess: GuardMemberServiceAccess = "ANY_SERVICE"
#     balance: GuardMembershipBalancePolicy = Field(
#         default_factory=GuardMembershipBalancePolicy
#     )
#
#     @model_validator(mode="after")
#     def validate_policy(self) -> "GuardTeamPolicy":
#         if not self.eligiblePlanningModes:
#             raise ValueError("guardTeamPolicy.eligiblePlanningModes cannot be empty")
#         if len(set(self.eligiblePlanningModes)) != len(self.eligiblePlanningModes):
#             raise ValueError(
#                 "guardTeamPolicy.eligiblePlanningModes cannot contain duplicates"
#             )
#         if "EXCLUDED" in self.eligiblePlanningModes:
#             raise ValueError("EXCLUDED cannot be eligible for a guard pool")
#
#         # Current dynamic-assignment engine creates guard variables for ROTATING
#         # profiles. The field is versioned so future engines may support more modes.
#         if self.mode == "WEEKLY_POOL" and "ROTATING" not in self.eligiblePlanningModes:
#             raise ValueError(
#                 "WEEKLY_POOL currently requires ROTATING in eligiblePlanningModes"
#             )
#
#         if self.mode == "WEEKLY_POOL":
#             if self.selectionMode == "ROTATION_ORDER":
#                 if not self.rotationAnchorDate:
#                     raise ValueError(
#                         "WEEKLY_POOL with ROTATION_ORDER requires rotationAnchorDate"
#                     )
#                 try:
#                     date.fromisoformat(self.rotationAnchorDate)
#                 except ValueError as error:
#                     raise ValueError(
#                         "guardTeamPolicy.rotationAnchorDate must be YYYY-MM-DD"
#                     ) from error
#         return self
#
#
# class EngineConfig(BaseModel):
#     model_config = ConfigDict(extra="forbid")
#
#     minRestDaysPerWeek: int = Field(ge=0, le=7)
#     maxConsecutiveWorkDays: int | None = Field(default=None, ge=1, le=366)
#     maxWeeklyMinutes: int | None = Field(default=None, ge=1)
#     minRestMinutesBetweenShifts: int = Field(ge=0)
#     maxConsecutiveGuards: int = Field(ge=0, le=31)
#     restAfterGuardRequired: bool
#     postGuardRestDays: int = Field(default=0, ge=0, le=31)
#     maxRestingEmployeesPerDay: int | None = Field(default=None, ge=1)
#     fairnessWindowWeeks: int = Field(ge=1, le=52)
#     strictCoverage: bool
#     weeklyLeavePolicy: WeeklyLeavePolicy = Field(default_factory=WeeklyLeavePolicy)
#     guardTeamPolicy: GuardTeamPolicy = Field(default_factory=GuardTeamPolicy)
#
#
# class PlanningSolverInput(BaseModel):
#     model_config = ConfigDict(extra="forbid")
#
#     employees: list[PlanningEmployeeInput]
#     requirements: list[PlanningRequirementInput]
#     historicalAssignments: list[HistoricalAssignment]
#     periodFrom: str
#     periodTo: str
#     requestedPeriodFrom: str | None = None
#     requestedPeriodTo: str | None = None
#     config: EngineConfig
#     solverTimeoutSeconds: int = Field(default=20, ge=1, le=300)
#
#
# class DayReason(BaseModel):
#     templateName: str
#     templateGuid: str | None
#     confidence: int
#     factors: list[str]
#     source: Literal[
#         "FIXED",
#         "GENERATED",
#         "FILL_REMAINING",
#         "GUARD_CONTINUATION",
#         "POST_GUARD_REST",
#         "WEEKLY_LEAVE",
#         "TEMPLATE_REST",
#         "UNASSIGNED",
#         "REST",
#     ]
#
#
# class EmployeeSuggestionResult(BaseModel):
#     userGuid: str
#     schedule: dict[str, str | None]
#     reasons: dict[str, DayReason | None]
#
#
# class PlanningViolation(BaseModel):
#     severity: Literal["HARD", "WARNING"]
#     code: str
#     date: str | None = None
#     employeeGuid: str | None = None
#     requirementGuid: str | None = None
#     message: str
#     details: dict | None = None
#
#
# class CoverageResult(BaseModel):
#     date: str
#     dayOfWeek: DayKey
#     requirementGuid: str
#     allocationMode: AllocationMode
#     templateGuid: str
#     templateName: str
#     minimum: int
#     target: int
#     maximum: int | None
#     assigned: int
#     status: Literal[
#         "COVERED",
#         "BELOW_TARGET",
#         "BELOW_MINIMUM",
#         "ABOVE_MAXIMUM",
#     ]
#
#
# class GuardPoolResult(BaseModel):
#     weekFrom: str
#     weekTo: str
#     employeeGuids: list[str]
#     mode: GuardTeamMode
#     selectionMode: GuardTeamSelectionMode
#
#
# class WeeklyLeaveGroupResult(BaseModel):
#     weekFrom: str
#     weekTo: str
#     employeeGuids: list[str]
#     leaveByEmployee: dict[str, list[str]]
#     mode: WeeklyLeaveMode
#     selector: EmployeePolicySelector
#     serviceScope: ServiceScope
#
#
# class EngineDiagnostics(BaseModel):
#     violations: list[PlanningViolation]
#     coverage: list[CoverageResult]
#     guardPools: list[GuardPoolResult] = Field(default_factory=list)
#     weeklyLeaveGroups: list[WeeklyLeaveGroupResult] = Field(default_factory=list)
#     fairnessScore: int
#     coverageScore: int
#
#
# class EngineResult(BaseModel):
#     items: list[EmployeeSuggestionResult]
#     conformityScore: int
#     diagnostics: EngineDiagnostics
#
#
# class SolverStats(BaseModel):
#     statusName: str
#     wallTimeSeconds: float
#     numConflicts: int
#     numBranches: int
#     numBooleans: int
#
#
# class SolverResponse(BaseModel):
#     success: bool
#     status: Literal["OPTIMAL", "FEASIBLE", "INFEASIBLE", "UNKNOWN"]
#     solverVersion: str = "ortools-cp-sat-v1.5-arbitrary-horizon"
#     solverStats: SolverStats | None = None
#     result: EngineResult | None = None
#     diagnostics: EngineDiagnostics | None = None
#     message: str | None = None