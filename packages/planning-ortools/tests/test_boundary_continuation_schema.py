from app.schemas import PlanningSolverInput

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


request = PlanningSolverInput.model_validate(
    {
        "employees": [],
        "requirements": [],
        "historicalAssignments": [],
        "boundaryState": {
            "guardContinuations": [
                {
                    "employeeGuid": "employee-1",
                    "guardDate": "2026-08-09",
                    "continuationDate": "2026-08-10",
                    "continuationTemplate": {
                        "guid": "guard-end",
                        "name": "Guard continuation",
                        "definition": definition("00:00", "08:00"),
                    },
                    "creditedMinutes": 480,
                }
            ]
        },
        "periodFrom": "2026-08-10",
        "periodTo": "2026-08-16",
        "solverTimeoutSeconds": 20,
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
            "weeklyLeavePolicy": {"mode": "NONE"},
            "guardTeamPolicy": {"mode": "DAILY_FLEXIBLE"},
        },
    }
)

boundary = request.boundaryState.guardContinuations[0]
assert boundary.guardDate == "2026-08-09"
assert boundary.continuationDate == request.periodFrom
assert boundary.creditedMinutes == 480
print({"status": "ok", "boundary": boundary.model_dump()})
