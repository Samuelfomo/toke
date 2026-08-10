from __future__ import annotations

from app.schemas import PlanningSolverInput
from app.solver import solve_planning

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def definition(start: str, end: str):
    return {
        day: [
            {
                "work": [start, end],
                "pause": None,
                "tolerance": 0,
            }
        ]
        for day in DAYS
    }


def build_request() -> PlanningSolverInput:
    standard_template = {
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

        standard_count = 3 if day in {"Mon", "Thu", "Fri", "Sat", "Sun"} else 4
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
                "template": standard_template,
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
            "boundaryState": {
                "guardContinuations": [
                    {
                        "employeeGuid": "employee-7",
                        "guardDate": "2026-08-09",
                        "continuationDate": "2026-08-10",
                        "continuationTemplate": guard_end,
                        "creditedMinutes": 480,
                    }
                ]
            },
            "periodFrom": "2026-08-10",
            "periodTo": "2026-08-16",
            "solverTimeoutSeconds": 60,
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

items = {item.userGuid: item for item in response.result.items}
boundary_employee = items["employee-7"]
assert boundary_employee.schedule["2026-08-10"] == "guard-end"
assert boundary_employee.reasons["2026-08-10"].source == "GUARD_CONTINUATION"

leave_groups = response.result.diagnostics.weeklyLeaveGroups
assert len(leave_groups) == 1
assert "employee-7" in leave_groups[0].employeeGuids
assert "2026-08-10" not in leave_groups[0].leaveByEmployee["employee-7"]

print(
    {
        "status": response.status,
        "boundaryEmployee": "employee-7",
        "monday": boundary_employee.schedule["2026-08-10"],
        "leave": leave_groups[0].leaveByEmployee["employee-7"],
    }
)
