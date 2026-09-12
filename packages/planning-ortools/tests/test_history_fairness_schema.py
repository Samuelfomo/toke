from pydantic import ValidationError

from app.schemas import PlanningSolverInput


def template(guid="morning", name="Matin"):
    return {
        "guid": guid,
        "name": name,
        "definition": {
            "Tue": [{"work": ["08:00", "16:00"], "pause": None, "tolerance": 0}],
            "Wed": [{"work": ["08:00", "16:00"], "pause": None, "tolerance": 0}],
        },
    }


def base_payload():
    return {
        "employees": [
            {"guid": "e1", "name": "Employé 1", "mode": "ROTATING"},
            {"guid": "e2", "name": "Employé 2", "mode": "ROTATING"},
        ],
        "requirements": [
            {
                "guid": "req-tue",
                "dayOfWeek": "Tue",
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
                    "planningModes": ["ROTATING"],
                    "guardPoolRelation": "ANY",
                },
            }
        ],
        "historicalAssignments": [],
        "historicalFairness": [
            {
                "employeeGuid": "e1",
                "workedDays": 11,
                "guardDays": 4,
                "weekendWorkedDays": 3,
                "workedMinutes": 6400,
                "restDays": 3,
                "templateCounts": {"morning": 7, "guard": 4},
            },
            {
                "employeeGuid": "e2",
                "workedDays": 8,
                "guardDays": 1,
                "weekendWorkedDays": 1,
                "workedMinutes": 4100,
                "restDays": 6,
                "templateCounts": {"morning": 7, "guard": 1},
            },
        ],
        "boundaryState": {"guardContinuations": []},
        "lockedAssignments": [],
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


parsed = PlanningSolverInput.model_validate(base_payload())
assert len(parsed.historicalFairness) == 2
assert parsed.historicalFairness[0].workedMinutes == 6400

# Duplicate fairness baseline for the same employee is invalid protocol input.
try:
    payload = base_payload()
    payload["historicalFairness"] = [
        payload["historicalFairness"][0],
        payload["historicalFairness"][0],
    ]
    PlanningSolverInput.model_validate(payload)
except ValidationError:
    pass
else:
    raise AssertionError("Duplicate historicalFairness employee must be rejected")

# Historical counters must never be negative.
try:
    payload = base_payload()
    payload["historicalFairness"][0]["guardDays"] = -1
    PlanningSolverInput.model_validate(payload)
except ValidationError:
    pass
else:
    raise AssertionError("Negative historical fairness counter must be rejected")

print("historicalFairness schema: OK")
