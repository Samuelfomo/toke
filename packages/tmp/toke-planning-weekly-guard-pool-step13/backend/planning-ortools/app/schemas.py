from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


DayKey = Literal["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
PlanningMode = Literal["FIXED", "ROTATING", "EXCLUDED"]
FixedRestDayMode = Literal["TEMPLATE", "ROTATING"]
ServiceType = Literal["STANDARD", "GUARD"]
AllocationMode = Literal["EXACT", "RANGE", "FILL_REMAINING"]
HistoricalServiceType = Literal[
    "STANDARD",
    "GUARD",
    "GUARD_CONTINUATION",
]
WeeklyLeaveMode = Literal["NONE", "PER_EMPLOYEE", "TEAM_ROTATION"]
GuardTeamMode = Literal["DAILY_FLEXIBLE", "WEEKLY_POOL"]
GuardTeamSelectionMode = Literal["ROTATION_ORDER", "OPTIMIZED"]


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


class WeeklyLeavePolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: WeeklyLeaveMode = "PER_EMPLOYEE"
    employeesPerWeek: int = Field(default=1, ge=1, le=1000)
    allowedDays: list[DayKey] = Field(
        default_factory=lambda: [
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
            "Sun",
        ]
    )
    rotationAnchorDate: str | None = None
    completeWeeksOnly: bool = True
    postGuardRestCountsAsLeave: bool = False

    @model_validator(mode="after")
    def validate_policy(self) -> "WeeklyLeavePolicy":
        if len(set(self.allowedDays)) != len(self.allowedDays):
            raise ValueError("weeklyLeavePolicy.allowedDays cannot contain duplicates")

        if self.mode == "TEAM_ROTATION":
            if not self.allowedDays:
                raise ValueError(
                    "TEAM_ROTATION requires at least one allowed weekly leave day"
                )
            if not self.rotationAnchorDate:
                raise ValueError(
                    "TEAM_ROTATION requires rotationAnchorDate"
                )
            try:
                date.fromisoformat(self.rotationAnchorDate)
            except ValueError as error:
                raise ValueError(
                    "weeklyLeavePolicy.rotationAnchorDate must be YYYY-MM-DD"
                ) from error

        return self


class GuardTeamPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: GuardTeamMode = "DAILY_FLEXIBLE"
    employeesPerWeek: int = Field(default=1, ge=1, le=1000)
    selectionMode: GuardTeamSelectionMode = "ROTATION_ORDER"
    rotationAnchorDate: str | None = None
    completeWeeksOnly: bool = True
    requireParticipation: bool = True

    @model_validator(mode="after")
    def validate_policy(self) -> "GuardTeamPolicy":
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


class PlanningSolverInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    employees: list[PlanningEmployeeInput]
    requirements: list[PlanningRequirementInput]
    historicalAssignments: list[HistoricalAssignment]
    periodFrom: str
    periodTo: str
    config: EngineConfig
    solverTimeoutSeconds: int = Field(default=20, ge=1, le=300)


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


class EngineDiagnostics(BaseModel):
    violations: list[PlanningViolation]
    coverage: list[CoverageResult]
    guardPools: list[GuardPoolResult] = Field(default_factory=list)
    fairnessScore: int
    coverageScore: int


class EngineResult(BaseModel):
    items: list[EmployeeSuggestionResult]
    conformityScore: int
    diagnostics: EngineDiagnostics


class SolverResponse(BaseModel):
    success: bool
    status: Literal["OPTIMAL", "FEASIBLE", "INFEASIBLE", "UNKNOWN"]
    solverVersion: str = "ortools-cp-sat-v1.3-weekly-guard-pool"
    result: EngineResult | None = None
    diagnostics: EngineDiagnostics | None = None
    message: str | None = None
