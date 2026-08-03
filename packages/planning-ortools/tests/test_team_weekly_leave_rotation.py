from __future__ import annotations

from collections import Counter
from datetime import date, timedelta

from app.schemas import PlanningSolverInput
from app.solver import solve_planning

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
ALLOWED = {"Wed", "Thu", "Fri", "Sat", "Sun"}


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


fixed_template = {
    "guid": "fixed-morning",
    "name": "Fixed Morning",
    "definition": definition("08:00", "16:00"),
}
rotating_template = {
    "guid": "rotating-morning",
    "name": "Rotating Morning",
    "definition": definition("08:00", "16:00"),
}

employees = [
    *[
        {
            "guid": f"employee-{index}",
            "name": f"Employee {index}",
            "code": f"E{index:02d}",
            "mode": "FIXED" if index <= 3 else "ROTATING",
            "rotationOrder": index,
            "maxWeeklyMinutes": None,
            "fixedTemplate": fixed_template if index <= 3 else None,
            # TEAM_ROTATION overrides the old per-fixed weekly rest behavior.
            "fixedRestDayMode": "TEMPLATE",
        }
        for index in range(1, 14)
    ]
]

requirements = [
    {
        "guid": f"morning-{day}",
        "dayOfWeek": day,
        "serviceType": "STANDARD",
        "allocationMode": "FILL_REMAINING",
        "minEmployees": 0,
        "targetEmployees": 0,
        "maxEmployees": None,
        "priority": 100,
        "template": rotating_template,
        "continuationTemplate": None,
        "continuationDayOffset": 0,
        "creditedMinutes": 480,
    }
    for day in DAYS
]

request = PlanningSolverInput.model_validate(
    {
        "employees": employees,
        "requirements": requirements,
        "historicalAssignments": [],
        "periodFrom": "2026-08-03",
        "periodTo": "2026-11-01",  # exactly 13 complete weeks
        "solverTimeoutSeconds": 30,
        "config": {
            "minRestDaysPerWeek": 0,
            "maxConsecutiveWorkDays": None,
            "maxWeeklyMinutes": None,
            "minRestMinutesBetweenShifts": 0,
            "maxConsecutiveGuards": 1,
            "restAfterGuardRequired": False,
            "postGuardRestDays": 0,
            "maxRestingEmployeesPerDay": None,
            "fairnessWindowWeeks": 13,
            "strictCoverage": True,
            "weeklyLeavePolicy": {
                "mode": "TEAM_ROTATION",
                "employeesPerWeek": 1,
                "allowedDays": ["Wed", "Thu", "Fri", "Sat", "Sun"],
                "rotationAnchorDate": "2026-08-03",
                "completeWeeksOnly": True,
                "postGuardRestCountsAsLeave": False,
            },
        },
    }
)

response = solve_planning(request)
assert response.status in {"OPTIMAL", "FEASIBLE"}, response.model_dump()
assert response.result is not None

items = {item.userGuid: item for item in response.result.items}
leave_count_by_employee: Counter[str] = Counter()

start = date.fromisoformat("2026-08-03")
for week_index in range(13):
    week_start = start + timedelta(days=week_index * 7)
    week_dates = [
        (week_start + timedelta(days=offset)).isoformat()
        for offset in range(7)
    ]

    weekly_leaves = []
    for employee_guid, item in items.items():
        for iso in week_dates:
            reason = item.reasons.get(iso)
            if reason and reason.source == "WEEKLY_LEAVE":
                weekly_leaves.append((employee_guid, iso))
                leave_count_by_employee[employee_guid] += 1

    assert len(weekly_leaves) == 1, (week_index, weekly_leaves)
    expected_employee = f"employee-{week_index + 1}"
    assert weekly_leaves[0][0] == expected_employee, weekly_leaves

    leave_day = date.fromisoformat(weekly_leaves[0][1])
    assert DAYS[leave_day.weekday()] in ALLOWED
    assert items[expected_employee].schedule[weekly_leaves[0][1]] is None

assert leave_count_by_employee == Counter(
    {f"employee-{index}": 1 for index in range(1, 14)}
)

# A fixed employee keeps the fixed template on every non-leave date.
fixed_item = items["employee-1"]
for iso, template_guid in fixed_item.schedule.items():
    reason = fixed_item.reasons[iso]
    if reason and reason.source == "WEEKLY_LEAVE":
        assert template_guid is None
    else:
        assert template_guid == "fixed-morning"

print(
    {
        "status": response.status,
        "weeks": 13,
        "weeklyLeaves": sum(leave_count_by_employee.values()),
        "employeesWithOneLeave": len(leave_count_by_employee),
    }
)
