from app.schemas import PlanningSolverInput

request = PlanningSolverInput.model_validate(
    {
        "employees": [],
        "requirements": [],
        "historicalAssignments": [],
        "periodFrom": "2026-08-03",
        "periodTo": "2026-08-23",
        "requestedPeriodFrom": "2026-08-06",
        "requestedPeriodTo": "2026-08-20",
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
            "weeklyLeavePolicy": {
                "mode": "NONE",
                "employeesPerWeek": 1,
                "allowedDays": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                "rotationAnchorDate": None,
                "completeWeeksOnly": True,
                "postGuardRestCountsAsLeave": False,
            },
            "guardTeamPolicy": {
                "mode": "DAILY_FLEXIBLE",
                "employeesPerWeek": 1,
                "selectionMode": "ROTATION_ORDER",
                "rotationAnchorDate": None,
                "completeWeeksOnly": True,
                "requireParticipation": True,
                "eligiblePlanningModes": ["ROTATING"],
                "memberServiceAccess": "ANY_SERVICE",
                "balance": {
                    "mode": "NONE",
                    "maxMembershipSpread": None,
                    "maxConsecutiveMembershipWeeks": None,
                },
            },
        },
    }
)

assert request.periodFrom == "2026-08-03"
assert request.periodTo == "2026-08-23"
assert request.requestedPeriodFrom == "2026-08-06"
assert request.requestedPeriodTo == "2026-08-20"
print({"status": "ok", "requested": [request.requestedPeriodFrom, request.requestedPeriodTo]})
