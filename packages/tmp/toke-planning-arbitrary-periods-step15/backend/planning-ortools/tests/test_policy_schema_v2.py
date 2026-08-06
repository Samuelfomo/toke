from app.schemas import EngineConfig, PlanningRequirementInput

config = EngineConfig.model_validate(
    {
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
                "mode": "TEMPLATE",
                "serviceTypes": [],
                "templateGuids": ["standard-template"],
                "requirementGuids": [],
                "exclusive": True,
            },
            "allowedDays": ["Thu", "Fri", "Sat", "Sun"],
            "completeWeeksOnly": True,
            "postGuardRestCountsAsLeave": False,
        },
        "guardTeamPolicy": {
            "mode": "WEEKLY_POOL",
            "employeesPerWeek": 6,
            "selectionMode": "OPTIMIZED",
            "rotationAnchorDate": None,
            "completeWeeksOnly": True,
            "requireParticipation": True,
            "eligiblePlanningModes": ["ROTATING"],
            "memberServiceAccess": "GUARD_ONLY",
            "balance": {
                "mode": "STRICT",
                "maxMembershipSpread": 1,
                "maxConsecutiveMembershipWeeks": 2,
            },
        },
    }
)

requirement = PlanningRequirementInput.model_validate(
    {
        "guid": "standard-Mon",
        "dayOfWeek": "Mon",
        "serviceType": "STANDARD",
        "allocationMode": "EXACT",
        "minEmployees": 4,
        "targetEmployees": 4,
        "maxEmployees": 4,
        "priority": 10,
        "template": {
            "guid": "standard-template",
            "name": "Standard",
            "definition": {
                "Mon": [
                    {
                        "work": ["08:00", "16:00"],
                        "pause": None,
                        "tolerance": 0,
                    }
                ]
            },
        },
        "continuationTemplate": None,
        "continuationDayOffset": 0,
        "creditedMinutes": 480,
        "eligibility": {
            "planningModes": ["ROTATING"],
            "guardPoolRelation": "NON_MEMBER",
        },
    }
)

assert config.weeklyLeavePolicy.serviceScope.mode == "TEMPLATE"
assert config.guardTeamPolicy.balance.maxMembershipSpread == 1
assert requirement.eligibility.guardPoolRelation == "NON_MEMBER"
print({"schema": "v2", "status": "ok"})
