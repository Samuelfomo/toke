from app.schemas import PlanningSolverInput
from app.solver import solve_planning


def template():
    definition = {}
    for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]:
        definition[day] = [{"work": ["08:00", "16:00"], "pause": None, "tolerance": 0}]
    return {"guid": "morning", "name": "Matin", "definition": definition}


requirements = []
for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]:
    requirements.append(
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
            "eligibility": {"planningModes": ["ROTATING"], "guardPoolRelation": "ANY"},
        }
    )

payload = {
    "employees": [
        {"guid": "e1", "name": "Très chargé", "mode": "ROTATING"},
        {"guid": "e2", "name": "Peu chargé", "mode": "ROTATING"},
    ],
    "requirements": requirements,
    "historicalAssignments": [],
    "historicalFairness": [
        {
            "employeeGuid": "e1",
            "workedDays": 18,
            "guardDays": 5,
            "weekendWorkedDays": 6,
            "workedMinutes": 18 * 480,
            "restDays": 2,
            "templateCounts": {"morning": 18},
        },
        {
            "employeeGuid": "e2",
            "workedDays": 8,
            "guardDays": 1,
            "weekendWorkedDays": 2,
            "workedMinutes": 8 * 480,
            "restDays": 12,
            "templateCounts": {"morning": 8},
        },
    ],
    "boundaryState": {"guardContinuations": []},
    "lockedAssignments": [],
    "periodFrom": "2026-09-14",
    "periodTo": "2026-09-20",
    "requestedPeriodFrom": "2026-09-14",
    "requestedPeriodTo": "2026-09-20",
    "config": {
        "minRestDaysPerWeek": 0,
        "maxConsecutiveWorkDays": 7,
        "maxWeeklyMinutes": None,
        "minRestMinutesBetweenShifts": 0,
        "maxConsecutiveGuards": 1,
        "restAfterGuardRequired": False,
        "postGuardRestDays": 0,
        "maxRestingEmployeesPerDay": None,
        "fairnessWindowWeeks": 4,
        "strictCoverage": True,
        "weeklyLeavePolicy": {"mode": "NONE"},
        "guardTeamPolicy": {"mode": "DAILY_FLEXIBLE"},
    },
    "solverTimeoutSeconds": 30,
}

response = solve_planning(PlanningSolverInput.model_validate(payload))
assert response.status in {"OPTIMAL", "FEASIBLE"}
result = response.result
counts = {
    item.userGuid: sum(1 for value in item.schedule.values() if value is not None)
    for item in result.items
}
assert counts["e2"] >= counts["e1"], counts
print("historicalFairness solver balancing: OK", counts)
