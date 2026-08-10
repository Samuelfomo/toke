"""Eight-week regression for cross-week guard continuity.

This scenario uses a deterministic weekly pool. Two members are retained from
one week to the next; one Sunday guard may therefore leave the pool and finish
its continuation on Monday. Monday standard coverage is intentionally three,
so that the three other NON_MEMBER employees cover the daytime requirement.

Run inside packages/planning-ortools/.venv with PYTHONPATH set to the package.
"""

from __future__ import annotations

from app.schemas import PlanningSolverInput
from app.solver import solve_planning

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def definition(start: str, end: str):
    return {
        day: [{"work": [start, end], "pause": None, "tolerance": 0}]
        for day in DAYS
    }


def build_request() -> PlanningSolverInput:
    standard = {
        "guid": "standard",
        "name": "Standard",
        "definition": definition("08:00", "16:00"),
    }
    guard_start = {
        "guid": "guard-start",
        "name": "Guard start",
        "definition": definition("16:00", "23:59"),
    }
    guard_end = {
        "guid": "guard-end",
        "name": "Guard continuation",
        "definition": definition("00:00", "08:00"),
    }

    employees = [
        {
            "guid": f"employee-{index}",
            "name": f"Employee {index}",
            "code": f"E{index:02d}",
            "mode": "ROTATING",
            "rotationOrder": index,
            "maxWeeklyMinutes": None,
            "fixedTemplate": None,
            "fixedRestDayMode": "TEMPLATE",
        }
        for index in range(1, 11)
    ]

    requirements = []
    for day in DAYS:
        requirements.append(
            {
                "guid": f"guard-{day}",
                "dayOfWeek": day,
                "serviceType": "GUARD",
                "allocationMode": "EXACT",
                "minEmployees": 3,
                "targetEmployees": 3,
                "maxEmployees": 3,
                "priority": 10,
                "template": guard_start,
                "continuationTemplate": guard_end,
                "continuationDayOffset": 1,
                "creditedMinutes": 960,
                "eligibility": {
                    "planningModes": ["ROTATING"],
                    "guardPoolRelation": "MEMBER",
                },
            }
        )

        # Monday accepts one outgoing Sunday guard as a continuation workday.
        standard_count = 4 if day in {"Tue", "Wed"} else 3
        requirements.append(
            {
                "guid": f"standard-{day}",
                "dayOfWeek": day,
                "serviceType": "STANDARD",
                "allocationMode": "EXACT",
                "minEmployees": standard_count,
                "targetEmployees": standard_count,
                "maxEmployees": standard_count,
                "priority": 20,
                "template": standard,
                "continuationTemplate": None,
                "continuationDayOffset": 0,
                "creditedMinutes": 480,
                "eligibility": {
                    "planningModes": ["ROTATING"],
                    "guardPoolRelation": "NON_MEMBER",
                },
            }
        )

    return PlanningSolverInput.model_validate(
        {
            "employees": employees,
            "requirements": requirements,
            "historicalAssignments": [],
            "boundaryState": {"guardContinuations": []},
            "periodFrom": "2026-08-10",
            "periodTo": "2026-10-04",
            "solverTimeoutSeconds": 120,
            "config": {
                "minRestDaysPerWeek": 0,
                "maxConsecutiveWorkDays": None,
                "maxWeeklyMinutes": None,
                "minRestMinutesBetweenShifts": 660,
                "maxConsecutiveGuards": 1,
                "restAfterGuardRequired": True,
                "postGuardRestDays": 0,
                "maxRestingEmployeesPerDay": None,
                "fairnessWindowWeeks": 12,
                "strictCoverage": True,
                "weeklyLeavePolicy": {
                    "mode": "PER_ELIGIBLE_EMPLOYEE",
                    "employeesPerWeek": 1,
                    "selector": {
                        "planningModes": ["ROTATING"],
                        "guardPoolRelation": "NON_MEMBER",
                    },
                    "daysPerEmployee": 1,
                    "countMode": "EXACT",
                    "maxEmployeesPerDay": 1,
                    "requireWorkOnOtherDays": True,
                    "serviceScope": {
                        "mode": "SERVICE_TYPE",
                        "serviceTypes": ["STANDARD"],
                        "templateGuids": [],
                        "requirementGuids": [],
                        "exclusive": True,
                    },
                    "allowedDays": ["Thu", "Fri", "Sat", "Sun"],
                    "rotationAnchorDate": None,
                    "completeWeeksOnly": True,
                    "postGuardRestCountsAsLeave": False,
                },
                "guardTeamPolicy": {
                    "mode": "WEEKLY_POOL",
                    "employeesPerWeek": 6,
                    "selectionMode": "ROTATION_ORDER",
                    "rotationAnchorDate": "2026-08-10",
                    "completeWeeksOnly": True,
                    "requireParticipation": True,
                    "eligiblePlanningModes": ["ROTATING"],
                    "memberServiceAccess": "GUARD_ONLY",
                    "balance": {
                        "mode": "NONE",
                        "maxMembershipSpread": None,
                        "maxConsecutiveMembershipWeeks": None,
                    },
                },
            },
        }
    )


response = solve_planning(build_request())
assert response.status in {"OPTIMAL", "FEASIBLE"}, response.model_dump()
assert response.result is not None
assert len(response.result.diagnostics.guardPools) == 8
assert len(response.result.diagnostics.weeklyLeaveGroups) == 8
assert response.result.diagnostics.coverageScore == 100

print(
    {
        "status": response.status,
        "weeks": 8,
        "coverageScore": response.result.diagnostics.coverageScore,
    }
)
