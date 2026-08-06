from __future__ import annotations

from collections import Counter, defaultdict

from app.schemas import PlanningSolverInput
from app.solver import solve_planning

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
ALLOWED_LEAVE_DAYS = {"Thu", "Fri", "Sat", "Sun"}


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


def build_request() -> PlanningSolverInput:
    fixed_template = {
        "guid": "fixed-morning",
        "name": "Fixed morning",
        "definition": definition("08:00", "16:00"),
    }
    standard_template = {
        "guid": "rotating-standard",
        "name": "Rotating standard",
        "definition": definition("08:00", "16:00"),
    }
    guard_start = {
        "guid": "guard-start",
        "name": "Guard start",
        "definition": definition("16:00", "23:59"),
    }
    guard_end = {
        "guid": "guard-end",
        "name": "Guard continuation",
        "definition": definition("00:00", "08:00"),
    }

    employees = [
        {
            "guid": f"fixed-{index}",
            "name": f"Fixed {index}",
            "code": f"F{index}",
            "mode": "FIXED",
            "rotationOrder": None,
            "maxWeeklyMinutes": None,
            "fixedTemplate": fixed_template,
            "fixedRestDayMode": "TEMPLATE",
        }
        for index in range(1, 4)
    ]
    employees.extend(
        {
            "guid": f"rotating-{index}",
            "name": f"Rotating {index}",
            "code": f"R{index:02d}",
            "mode": "ROTATING",
            "rotationOrder": index,
            "maxWeeklyMinutes": None,
            "fixedTemplate": None,
            "fixedRestDayMode": "TEMPLATE",
        }
        for index in range(1, 11)
    )

    requirements = []
    for day in DAYS:
        requirements.append(
            {
                "guid": f"guard-{day}",
                "dayOfWeek": day,
                "serviceType": "GUARD",
                "allocationMode": "EXACT",
                "minEmployees": 3,
                "targetEmployees": 3,
                "maxEmployees": 3,
                "priority": 10,
                "template": guard_start,
                "continuationTemplate": guard_end,
                "continuationDayOffset": 1,
                "creditedMinutes": 960,
                "eligibility": {
                    "planningModes": ["ROTATING"],
                    "guardPoolRelation": "MEMBER",
                },
            }
        )
        standard_count = 4 if day in {"Mon", "Tue", "Wed"} else 3
        requirements.append(
            {
                "guid": f"standard-{day}",
                "dayOfWeek": day,
                "serviceType": "STANDARD",
                "allocationMode": "EXACT",
                "minEmployees": standard_count,
                "targetEmployees": standard_count,
                "maxEmployees": standard_count,
                "priority": 20,
                "template": standard_template,
                "continuationTemplate": None,
                "continuationDayOffset": 0,
                "creditedMinutes": 480,
                "eligibility": {
                    "planningModes": ["ROTATING"],
                    "guardPoolRelation": "NON_MEMBER",
                },
            }
        )

    return PlanningSolverInput.model_validate(
        {
            "employees": employees,
            "requirements": requirements,
            "historicalAssignments": [],
            "periodFrom": "2026-08-03",
            "periodTo": "2026-08-30",
            "solverTimeoutSeconds": 60,
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
                        "mode": "SERVICE_TYPE",
                        "serviceTypes": ["STANDARD"],
                        "templateGuids": [],
                        "requirementGuids": [],
                        "exclusive": True,
                    },
                    "allowedDays": ["Thu", "Fri", "Sat", "Sun"],
                    "rotationAnchorDate": None,
                    "completeWeeksOnly": True,
                    "postGuardRestCountsAsLeave": False,
                },
                "guardTeamPolicy": {
                    "mode": "WEEKLY_POOL",
                    "employeesPerWeek": 6,
                    "selectionMode": "OPTIMIZED",
                    "rotationAnchorDate": "2026-08-03",
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
            },
        }
    )


request = build_request()
response = solve_planning(request)
assert response.status in {"OPTIMAL", "FEASIBLE"}, response.model_dump()
assert response.result is not None

items = {item.userGuid: item for item in response.result.items}
pools = response.result.diagnostics.guardPools
leave_groups = response.result.diagnostics.weeklyLeaveGroups

assert len(pools) == 4, pools
assert len(leave_groups) == 4, leave_groups

membership_count = Counter()
for pool in pools:
    members = set(pool.employeeGuids)
    assert len(members) == 6
    assert all(guid.startswith("rotating-") for guid in members)
    membership_count.update(members)

    group = next(group for group in leave_groups if group.weekFrom == pool.weekFrom)
    non_members = {
        f"rotating-{index}" for index in range(1, 11)
    } - members

    assert set(group.employeeGuids) == non_members
    assert len(non_members) == 4

    leaves_per_date = Counter()
    for employee_guid in non_members:
        leave_dates = group.leaveByEmployee[employee_guid]
        assert len(leave_dates) == 1
        leave_iso = leave_dates[0]
        leave_day = DAYS[__import__("datetime").date.fromisoformat(leave_iso).weekday()]
        assert leave_day in ALLOWED_LEAVE_DAYS
        leaves_per_date[leave_iso] += 1

        item = items[employee_guid]
        week_dates = [
            iso
            for iso in item.schedule
            if pool.weekFrom <= iso <= pool.weekTo
        ]
        standard_days = sum(
            1
            for iso in week_dates
            if item.schedule[iso] == "rotating-standard"
        )
        assert standard_days == 6, (employee_guid, pool.weekFrom, item.schedule)

    assert all(value == 1 for value in leaves_per_date.values())
    assert len(leaves_per_date) == 4

    for employee_guid in members:
        item = items[employee_guid]
        week_reasons = {
            iso: reason
            for iso, reason in item.reasons.items()
            if pool.weekFrom <= iso <= pool.weekTo
        }
        assert all(
            not reason or reason.source != "WEEKLY_LEAVE"
            for reason in week_reasons.values()
        )
        assert all(
            template_guid != "rotating-standard"
            for iso, template_guid in item.schedule.items()
            if pool.weekFrom <= iso <= pool.weekTo
        )

assert max(membership_count.values()) - min(membership_count.values()) <= 1

for employee_guid in [f"rotating-{index}" for index in range(1, 11)]:
    sequence = [employee_guid in set(pool.employeeGuids) for pool in pools]
    assert all(
        not all(sequence[index:index + 3])
        for index in range(len(sequence) - 2)
    )

print(
    {
        "status": response.status,
        "weeks": len(pools),
        "membershipCounts": dict(sorted(membership_count.items())),
        "coverageScore": response.result.diagnostics.coverageScore,
    }
)
