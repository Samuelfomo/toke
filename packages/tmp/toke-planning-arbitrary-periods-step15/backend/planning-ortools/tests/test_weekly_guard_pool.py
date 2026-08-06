from __future__ import annotations

from collections import Counter

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


def build_request(post_guard_rest_days: int) -> PlanningSolverInput:
    guard_start = {
        "guid": "guard-start",
        "name": "Guard start",
        "definition": definition("16:00", "23:59"),
    }
    guard_end = {
        "guid": "guard-end",
        "name": "Guard end",
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

    requirements = [
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
        }
        for day in DAYS
    ]

    return PlanningSolverInput.model_validate(
        {
            "employees": employees,
            "requirements": requirements,
            "historicalAssignments": [],
            "periodFrom": "2026-08-03",
            "periodTo": "2026-08-09",
            "solverTimeoutSeconds": 30,
            "config": {
                "minRestDaysPerWeek": 0,
                "maxConsecutiveWorkDays": None,
                "maxWeeklyMinutes": None,
                "minRestMinutesBetweenShifts": 0,
                "maxConsecutiveGuards": 1,
                "restAfterGuardRequired": True,
                "postGuardRestDays": post_guard_rest_days,
                "maxRestingEmployeesPerDay": None,
                "fairnessWindowWeeks": 8,
                "strictCoverage": True,
                "weeklyLeavePolicy": {
                    "mode": "NONE",
                    "employeesPerWeek": 1,
                    "allowedDays": DAYS,
                    "rotationAnchorDate": None,
                    "completeWeeksOnly": True,
                    "postGuardRestCountsAsLeave": False,
                },
                "guardTeamPolicy": {
                    "mode": "WEEKLY_POOL",
                    "employeesPerWeek": 6,
                    "selectionMode": "ROTATION_ORDER",
                    "rotationAnchorDate": "2026-08-03",
                    "completeWeeksOnly": True,
                    "requireParticipation": True,
                },
            },
        }
    )


request = build_request(post_guard_rest_days=0)
response = solve_planning(request)
assert response.status in {"OPTIMAL", "FEASIBLE"}, response.model_dump()
assert response.result is not None

pools = response.result.diagnostics.guardPools
assert len(pools) == 1, pools
assert pools[0].employeeGuids == [
    "employee-1",
    "employee-2",
    "employee-3",
    "employee-4",
    "employee-5",
    "employee-6",
]

guard_count = Counter()
for item in response.result.items:
    for reason in item.reasons.values():
        if reason and reason.templateGuid == "guard-start":
            guard_count[item.userGuid] += 1

assert set(guard_count).issubset(set(pools[0].employeeGuids))
assert set(pools[0].employeeGuids).issubset(set(guard_count))
assert sum(guard_count.values()) == 21

try:
    solve_planning(build_request(post_guard_rest_days=1))
except ValueError as error:
    assert "WEEKLY_POOL cannot cover" in str(error)
else:
    raise AssertionError(
        "A six-person pool with one extra full post-guard rest day must be rejected"
    )

print(
    {
        "status": response.status,
        "weeklyPool": pools[0].employeeGuids,
        "guardStarts": sum(guard_count.values()),
    }
)
