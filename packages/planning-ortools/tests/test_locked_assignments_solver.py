from app.schemas import PlanningSolverInput
from app.solver import solve_planning

DAYS = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"]


def template(guid="morning", name="Matin", start="08:00", end="16:00"):
    return {
        "guid": guid,
        "name": name,
        "definition": {
            day: [{"work": [start, end], "pause": None, "tolerance": 0}]
            for day in DAYS
        },
    }


requirements = [
    {
        "guid": f"req-{day}",
        "dayOfWeek": day,
        "serviceType": "STANDARD",
        "allocationMode": "EXACT",
        "minEmployees": 1,
        "targetEmployees": 1,
        "maxEmployees": 1,
        "priority": 10,
        "template": template(),
        "continuationTemplate": None,
        "continuationDayOffset": 0,
        "eligibility": {
            "planningModes": ["FIXED"] if day == "Tue" else ["ROTATING"],
            "guardPoolRelation": "ANY",
        },
    }
    for day in DAYS
]

request = PlanningSolverInput.model_validate(
    {
        "employees": [
            {"guid": "e1", "name": "Employé 1", "mode": "ROTATING"},
            {"guid": "e2", "name": "Employé 2", "mode": "ROTATING"},
        ],
        "requirements": requirements,
        "historicalAssignments": [],
        "boundaryState": {"guardContinuations": []},
        "lockedAssignments": [
            # Manager override of the engine population policy. This must remain
            # valid and count toward Tuesday coverage.
            {
                "employeeGuid": "e2",
                "date": "2026-09-01",
                "templateGuid": "morning",
                "requirementGuid": "req-Tue",
            },
            # Current template completely outside requirements. The employee is
            # occupied, but this service must not be invented as morning coverage.
            {
                "employeeGuid": "e1",
                "date": "2026-09-02",
                "templateGuid": "special",
                "requirementGuid": None,
                "template": template("special", "Service exceptionnel", "10:00", "18:00"),
            },
        ],
        "periodFrom": "2026-09-01",
        "periodTo": "2026-09-07",
        "requestedPeriodFrom": "2026-09-01",
        "requestedPeriodTo": "2026-09-07",
        "config": {
            "minRestDaysPerWeek": 0,
            "maxConsecutiveWorkDays": 7,
            "maxWeeklyMinutes": None,
            "minRestMinutesBetweenShifts": 0,
            "maxConsecutiveGuards": 1,
            "restAfterGuardRequired": False,
            "postGuardRestDays": 0,
            "maxRestingEmployeesPerDay": None,
            "fairnessWindowWeeks": 1,
            "strictCoverage": True,
            "weeklyLeavePolicy": {"mode": "NONE"},
            "guardTeamPolicy": {"mode": "DAILY_FLEXIBLE"},
        },
        "solverTimeoutSeconds": 30,
    }
)

response = solve_planning(request)
assert response.status in {"OPTIMAL", "FEASIBLE"}, response.model_dump()
assert response.result is not None
items = {item.userGuid: item for item in response.result.items}
assert items["e2"].schedule["2026-09-01"] == "morning"
# External service is preserved later by the API overlay; solver must not assign
# any generated requirement to that employee on the occupied day.
assert items["e1"].schedule["2026-09-02"] is None
assert items["e2"].schedule["2026-09-02"] == "morning"
print("lockedAssignments manager override solver: OK")
