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


fixed = {
    "guid": "fixed-morning",
    "name": "Fixed Morning",
    "definition": definition("08:00", "16:00"),
}
morning = {
    "guid": "rotating-morning",
    "name": "Rotating Morning",
    "definition": definition("08:00", "16:00"),
}
late = {
    "guid": "late",
    "name": "Late",
    "definition": definition("10:30", "18:30"),
}
guard_start = {
    "guid": "guard-start",
    "name": "Guard Start",
    "definition": definition("16:00", "23:59"),
}
guard_end = {
    "guid": "guard-end",
    "name": "Guard End",
    "definition": definition("00:01", "08:00"),
}

employees = [
    {
        "guid": "fixed-1",
        "name": "Fixed employee",
        "code": "F1",
        "mode": "FIXED",
        "rotationOrder": 0,
        "maxWeeklyMinutes": None,
        "fixedTemplate": fixed,
        "fixedRestDayMode": "ROTATING",
    },
    *[
        {
            "guid": f"rotating-{index}",
            "name": f"Rotating {index}",
            "code": f"R{index}",
            "mode": "ROTATING",
            "rotationOrder": index,
            "maxWeeklyMinutes": None,
            "fixedTemplate": None,
            "fixedRestDayMode": "TEMPLATE",
        }
        for index in range(1, 6)
    ],
]

requirements = []
for day in DAYS:
    requirements.extend(
        [
            {
                "guid": f"guard-{day}",
                "dayOfWeek": day,
                "serviceType": "GUARD",
                "allocationMode": "EXACT",
                "minEmployees": 1,
                "targetEmployees": 1,
                "maxEmployees": 1,
                "priority": 10,
                "template": guard_start,
                "continuationTemplate": guard_end,
                "continuationDayOffset": 1,
                "creditedMinutes": 960,
            },
            {
                "guid": f"late-{day}",
                "dayOfWeek": day,
                "serviceType": "STANDARD",
                "allocationMode": "EXACT",
                "minEmployees": 1,
                "targetEmployees": 1,
                "maxEmployees": 1,
                "priority": 20,
                "template": late,
                "continuationTemplate": None,
                "continuationDayOffset": 0,
                "creditedMinutes": 480,
            },
            {
                "guid": f"morning-{day}",
                "dayOfWeek": day,
                "serviceType": "STANDARD",
                "allocationMode": "FILL_REMAINING",
                "minEmployees": 0,
                "targetEmployees": 0,
                "maxEmployees": None,
                "priority": 100,
                "template": morning,
                "continuationTemplate": None,
                "continuationDayOffset": 0,
                "creditedMinutes": 480,
            },
        ]
    )

request = PlanningSolverInput.model_validate(
    {
        "employees": employees,
        "requirements": requirements,
        "historicalAssignments": [],
        "periodFrom": "2026-08-03",
        "periodTo": "2026-08-16",
        "solverTimeoutSeconds": 30,
        "config": {
            "minRestDaysPerWeek": 1,
            "maxConsecutiveWorkDays": 6,
            "maxWeeklyMinutes": None,
            "minRestMinutesBetweenShifts": 660,
            "maxConsecutiveGuards": 1,
            "restAfterGuardRequired": True,
            "postGuardRestDays": 1,
            "maxRestingEmployeesPerDay": None,
            "fairnessWindowWeeks": 8,
            "strictCoverage": True,
        },
    }
)

response = solve_planning(request)
assert response.status in {"OPTIMAL", "FEASIBLE"}, response.model_dump()
assert response.result is not None
assert not response.result.diagnostics.violations

items = {item.userGuid: item for item in response.result.items}

# Exactly one guard per date and mandatory continuation + full rest day.
for iso in [
    "2026-08-03",
    "2026-08-04",
    "2026-08-05",
    "2026-08-06",
    "2026-08-07",
    "2026-08-08",
    "2026-08-09",
    "2026-08-10",
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
    "2026-08-14",
    "2026-08-15",
    "2026-08-16",
]:
    guards = [
        item
        for item in items.values()
        if item.schedule.get(iso) == "guard-start"
    ]
    assert len(guards) == 1, (iso, len(guards))

    employee_item = guards[0]
    from datetime import date, timedelta

    start = date.fromisoformat(iso)
    continuation = (start + timedelta(days=1)).isoformat()
    rest = (start + timedelta(days=2)).isoformat()

    assert employee_item.schedule.get(continuation) == "guard-end"
    assert employee_item.reasons[continuation].source == "GUARD_CONTINUATION"
    assert employee_item.schedule.get(rest) is None
    assert employee_item.reasons[rest].source == "POST_GUARD_REST"

# The fixed employee keeps 08h-16h but gets exactly one solved rest per week.
fixed_item = items["fixed-1"]
for week in [
    [f"2026-08-{day:02d}" for day in range(3, 10)],
    [f"2026-08-{day:02d}" for day in range(10, 17)],
]:
    rests = [iso for iso in week if fixed_item.schedule.get(iso) is None]
    assert len(rests) == 1, rests

print(
    {
        "status": response.status,
        "conformityScore": response.result.conformityScore,
        "coverageScore": response.result.diagnostics.coverageScore,
        "fairnessScore": response.result.diagnostics.fairnessScore,
    }
)
