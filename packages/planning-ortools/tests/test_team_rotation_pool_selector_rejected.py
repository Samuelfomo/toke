from pydantic import ValidationError

from app.schemas import WeeklyLeavePolicy

try:
    WeeklyLeavePolicy.model_validate(
        {
            "mode": "TEAM_ROTATION",
            "employeesPerWeek": 4,
            "rotationAnchorDate": "2026-08-03",
            "allowedDays": ["Thu", "Fri", "Sat", "Sun"],
            "selector": {
                "planningModes": ["ROTATING"],
                "guardPoolRelation": "NON_MEMBER",
            },
        }
    )
except ValidationError as error:
    assert "PER_ELIGIBLE_EMPLOYEE" in str(error)
else:
    raise AssertionError(
        "TEAM_ROTATION with NON_MEMBER selector must be rejected because the selector is ignored by that mode"
    )

valid = WeeklyLeavePolicy.model_validate(
    {
        "mode": "PER_ELIGIBLE_EMPLOYEE",
        "allowedDays": ["Thu", "Fri", "Sat", "Sun"],
        "selector": {
            "planningModes": ["ROTATING"],
            "guardPoolRelation": "NON_MEMBER",
        },
        "daysPerEmployee": 1,
        "countMode": "EXACT",
    }
)
assert valid.selector.guardPoolRelation == "NON_MEMBER"
print({"status": "ok", "recommendedMode": valid.mode})
