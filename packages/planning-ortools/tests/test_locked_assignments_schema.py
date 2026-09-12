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
        "boundaryState": {"guardContinuations": []},
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


def must_reject(locks):
    try:
        PlanningSolverInput.model_validate({**base_payload(), "lockedAssignments": locks})
    except ValidationError:
        return
    raise AssertionError("Payload should have been rejected")


# Configured requirement lock.
PlanningSolverInput.model_validate(
    {
        **base_payload(),
        "lockedAssignments": [
            {
                "employeeGuid": "e1",
                "date": "2026-09-01",
                "templateGuid": "morning",
                "requirementGuid": "req-tue",
            }
        ],
    }
)

# Manager service outside requirements: valid when its template snapshot exists.
PlanningSolverInput.model_validate(
    {
        **base_payload(),
        "lockedAssignments": [
            {
                "employeeGuid": "e1",
                "date": "2026-09-02",
                "templateGuid": "special",
                "requirementGuid": None,
                "template": template("special", "Service exceptionnel"),
            }
        ],
    }
)

must_reject(
    [
        {"employeeGuid": "e1", "date": "2026-09-01", "templateGuid": None},
        {"employeeGuid": "e1", "date": "2026-09-01", "templateGuid": None},
    ]
)
must_reject(
    [
        {
            "employeeGuid": "e1",
            "date": "2026-09-01",
            "templateGuid": "morning",
            "requirementGuid": None,
        }
    ]
)
must_reject(
    [
        {
            "employeeGuid": "e1",
            "date": "2026-09-01",
            "templateGuid": "morning",
            "requirementGuid": "unknown",
        }
    ]
)

print("lockedAssignments schema manager overrides: OK")
