from copy import deepcopy
from datetime import date
import unittest

from app.schemas import PlanningSolverInput
from app.solver import solve_planning

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def template(guid, start, end, days=DAYS):
    return {
        "guid": guid,
        "name": guid,
        "definition": {day: [{"work": [start, end], "tolerance": 0}] for day in days},
    }


LATE = template("late", "10:00", "18:00")
EARLY = template("morning", "08:00", "16:00")
OTHER = template("other", "08:00", "16:00")


def request(start="2026-12-28", end="2027-01-10", *, weekend="ALTERNATE_SAT_SUN"):
    return {
        "employees": [
            {"guid": "aicha", "name": "Aïcha KOTINE", "mode": "FIXED", "rotationOrder": 11,
             "fixedTemplate": LATE, "fixedRestDayMode": "ROTATING"},
            {"guid": "camille", "name": "Camille NJOLE TONGANBOU", "mode": "FIXED", "rotationOrder": 12,
             "fixedTemplate": EARLY, "fixedRestDayMode": "ROTATING"},
        ],
        "requirements": [],
        "periodFrom": start, "periodTo": end, "solverTimeoutSeconds": 5,
        "config": {
            "minRestDaysPerWeek": 1, "minRestMinutesBetweenShifts": 660,
            "maxConsecutiveGuards": 1, "restAfterGuardRequired": False, "fairnessWindowWeeks": 8,
            "strictCoverage": True, "weeklyLeavePolicy": {"mode": "PER_EMPLOYEE"},
        },
        "fixed_alternation_policy": {
            "contract_version": 1, "enabled": True, "employee_guids": ["aicha", "camille"],
            "template_guids": ["late", "morning"], "anchor_date": "2026-12-28",
            "shift_cadence_days": 1, "weekend_rest": weekend,
        },
    }


def requirement(guid, day, shift, count, mode="FIXED"):
    return {
        "guid": guid, "dayOfWeek": day, "serviceType": "STANDARD",
        "allocationMode": "EXACT", "minEmployees": count, "targetEmployees": count,
        "maxEmployees": count, "priority": 1, "template": shift,
        "eligibility": {"planningModes": [mode], "guardPoolRelation": "ANY"},
    }


def lock(employee, day, shift=None):
    return {"employeeGuid": employee, "date": day, "templateGuid": shift and shift["guid"], "template": shift}


class FixedAlternationTests(unittest.TestCase):
    def solve(self, payload):
        response = solve_planning(PlanningSolverInput.model_validate(payload))
        self.assertTrue(response.success, response.model_dump())
        return {item.userGuid: item.schedule for item in response.result.items}, response.result.diagnostics

    def assert_joint_phase(self, schedules):
        anchor = date(2026, 12, 28)
        for iso, first in schedules["aicha"].items():
            second = schedules["camille"][iso]
            if first and second:
                phase = (date.fromisoformat(iso) - anchor).days % 2
                self.assertEqual((first, second), ("late", "morning") if phase == 0 else ("morning", "late"), iso)

    def mandatory_request(self, start="2026-12-28", end="2027-01-24"):
        data = request(start, end)
        data["fixed_alternation_policy"]["contract_version"] = 2
        for employee in data["employees"]:
            employee["fixedRestDayMode"] = "TEMPLATE"
        return data

    def test_mandatory_four_weeks_with_other_fixed_employee(self):
        data = self.mandatory_request()
        data["employees"].append({
            "guid": "third", "name": "Third", "mode": "FIXED", "rotationOrder": 13,
            "fixedTemplate": OTHER, "fixedRestDayMode": "TEMPLATE",
        })
        schedules, diagnostics = self.solve(data)
        self.assert_joint_phase(schedules)
        self.assertEqual(diagnostics.fixedAlternationEvaluation.contractVersion, 2)
        self.assertEqual([day for day, shift in schedules["aicha"].items() if shift is None],
                         ["2027-01-02", "2027-01-10", "2027-01-16", "2027-01-24"])
        self.assertEqual([day for day, shift in schedules["camille"].items() if shift is None],
                         ["2027-01-03", "2027-01-09", "2027-01-17", "2027-01-23"])
        legacy = deepcopy(data)
        del legacy["fixed_alternation_policy"]
        legacy_schedules, _ = self.solve(legacy)
        self.assertEqual(schedules["third"], legacy_schedules["third"])

    def test_mandatory_partial_weeks_and_regeneration_locks(self):
        data = self.mandatory_request("2027-01-02", "2027-01-08")
        data["lockedAssignments"] = [
            lock("aicha", "2027-01-02"),
            lock("camille", "2027-01-04", LATE),
        ]
        schedules, _ = self.solve(data)
        self.assertEqual([day for day, shift in schedules["aicha"].items() if shift is None], ["2027-01-02"])
        self.assertEqual([day for day, shift in schedules["camille"].items() if shift is None], ["2027-01-03"])
        self.assertEqual(schedules["camille"]["2027-01-04"], "late")

    def test_mandatory_conflicts_are_explicit(self):
        for case in ["manual_work", "manual_rest", "coverage", "template", "consecutive_limit"]:
            with self.subTest(case=case):
                data = self.mandatory_request("2026-12-28", "2027-01-10")
                if case == "manual_work":
                    data["lockedAssignments"] = [lock("aicha", "2027-01-02", OTHER)]
                elif case == "manual_rest":
                    data["lockedAssignments"] = [lock("camille", "2027-01-04")]
                elif case == "coverage":
                    data["requirements"] = [requirement("two-saturday", "Sat", LATE, 2)]
                elif case == "template":
                    data["employees"][0]["fixedTemplate"] = template("late", "10:00", "18:00", DAYS[:-2])
                else:
                    data["config"]["maxConsecutiveWorkDays"] = 6
                    data["employees"][0]["fixedRestDayMode"] = "ROTATING"
                response = solve_planning(PlanningSolverInput.model_validate(data))
                self.assertEqual(response.status, "INFEASIBLE")
                conflict = next(v for v in response.diagnostics.violations
                                if v.code == "FIXED_ALTERNATION_WEEKEND_REST_CONFLICT")
                if case.startswith("manual") or case == "template":
                    reason = "LOCKED_ASSIGNMENT" if case.startswith("manual") else "TEMPLATE_REST"
                    self.assertIn(reason, {entry["reason"] for entry in conflict.details["conflicts"]})

    def test_daily_swap_distinct_rests_and_inversion_over_new_year(self):
        schedules, diagnostics = self.solve(request())
        self.assert_joint_phase(schedules)
        self.assertEqual(schedules["aicha"]["2026-12-28"], "late")
        self.assertEqual(schedules["aicha"]["2026-12-29"], "morning")
        self.assertEqual(schedules["aicha"]["2027-01-01"], "late")
        for employee, rests in [("aicha", ["2027-01-02", "2027-01-10"]), ("camille", ["2027-01-03", "2027-01-09"])]:
            self.assertEqual([day for day, shift in schedules[employee].items() if shift is None], rests)
        self.assertTrue(all(check.expected == check.actual for check in diagnostics.fixedAlternationEvaluation.checks))

    def test_midweek_negative_phase_and_template_defined_rest(self):
        data = request("2026-12-25", "2027-01-03")
        for employee in data["employees"]:
            employee["fixedRestDayMode"] = "TEMPLATE"
        data["employees"][0]["fixedTemplate"] = template("late", "10:00", "18:00", DAYS[:-2])
        schedules, diagnostics = self.solve(data)
        self.assertEqual(schedules["aicha"]["2026-12-25"], "morning")
        self.assertIsNone(schedules["aicha"]["2026-12-26"])
        self.assertIsNone(schedules["aicha"]["2027-01-03"])
        self.assertTrue(any(check.expected != check.actual for check in diagnostics.fixedAlternationEvaluation.checks))
        self.assert_joint_phase(schedules)

    def test_keep_profile_no_weekend_rest_invention(self):
        data = request("2026-12-28", "2027-01-03", weekend="KEEP_PROFILE")
        for employee in data["employees"]:
            employee["fixedRestDayMode"] = "TEMPLATE"
        schedules, diagnostics = self.solve(data)
        self.assertTrue(all(shift is not None for days in schedules.values() for shift in days.values()))
        self.assertTrue(all(check.kind == "SHIFT" for check in diagnostics.fixedAlternationEvaluation.checks))

    def test_manual_shift_and_rest_win_and_do_not_reset_phase(self):
        data = request()
        data["lockedAssignments"] = [
            lock("aicha", "2026-12-28", EARLY),
            lock("camille", "2026-12-30"),
        ]
        schedules, diagnostics = self.solve(data)
        self.assertEqual(schedules["aicha"]["2026-12-28"], "morning")
        self.assertEqual(schedules["camille"]["2026-12-28"], "late")
        self.assertIsNone(schedules["camille"]["2026-12-30"])
        self.assertEqual(schedules["aicha"]["2026-12-30"], "late")
        self.assertEqual(schedules["aicha"]["2026-12-31"], "morning")
        checks = diagnostics.fixedAlternationEvaluation.checks
        self.assertTrue(any(check.date == "2026-12-28" and check.lockedEmployeeGuids == ["aicha"] for check in checks))
        self.assertFalse(any(check.date == "2026-12-30" and check.kind == "SHIFT" for check in checks))

    def test_hard_coverage_uses_selected_template_even_if_preference_is_missed(self):
        data = request("2026-12-28", "2026-12-28")
        data["requirements"] = [requirement("late2", "Mon", LATE, 2)]
        schedules, diagnostics = self.solve(data)
        self.assertEqual([days["2026-12-28"] for days in schedules.values()], ["late", "late"])
        self.assertEqual(diagnostics.coverage[0].assigned, 2)
        check = diagnostics.fixedAlternationEvaluation.checks[0]
        self.assertNotEqual(check.expected, check.actual)

    def test_existing_range_target_precedes_alternation_objective(self):
        data = request("2026-12-28", "2026-12-28")
        target = requirement("range", "Mon", LATE, 2)
        target.update(allocationMode="RANGE", minEmployees=1)
        data["requirements"] = [target]
        schedules, diagnostics = self.solve(data)
        self.assertEqual([days["2026-12-28"] for days in schedules.values()], ["late", "late"])
        self.assertEqual(diagnostics.coverage[0].status, "COVERED")

    def test_explicit_leave_days_take_priority_over_weekend_preference(self):
        data = request("2026-12-28", "2027-01-03")
        data["config"]["weeklyLeavePolicy"] = {
            "mode": "PER_ELIGIBLE_EMPLOYEE",
            "selector": {"planningModes": ["FIXED"], "guardPoolRelation": "ANY"},
            "allowedDays": ["Sun"],
            "daysPerEmployee": 1,
            "requireWorkOnOtherDays": True,
        }
        schedules, diagnostics = self.solve(data)
        self.assertTrue(all(days["2027-01-02"] is not None for days in schedules.values()))
        self.assertTrue(all(days["2027-01-03"] is None for days in schedules.values()))
        self.assertTrue(any(check.kind == "WEEKEND_REST" and check.expected != check.actual
                            for check in diagnostics.fixedAlternationEvaluation.checks))

    def test_short_recovery_between_alternate_shifts_is_not_used(self):
        data = request("2026-12-28", "2026-12-29", weekend="KEEP_PROFILE")
        data["employees"][0]["fixedTemplate"] = template("late", "14:00", "23:00")
        data["employees"][1]["fixedTemplate"] = template("morning", "06:00", "14:00")
        for employee in data["employees"]:
            employee["fixedRestDayMode"] = "TEMPLATE"
        schedules, diagnostics = self.solve(data)
        for schedule in schedules.values():
            self.assertNotEqual((schedule["2026-12-28"], schedule["2026-12-29"]), ("late", "morning"))
        self.assertTrue(any(check.reason == "OTHER_SOLVER_PRIORITIES" for check in diagnostics.fixedAlternationEvaluation.checks))

    def test_contract_rejects_unrecognized_version_and_invalid_anchor(self):
        for changes in [{"contract_version": 3}, {"anchor_date": "2026-02-30"}, {"anchor_date": 1234}]:
            data = request()
            data["fixed_alternation_policy"].update(changes)
            with self.assertRaises(ValueError):
                PlanningSolverInput.model_validate(data)

    def test_no_policy_and_disabled_are_legacy_and_other_employees_unaltered(self):
        data = request()
        data["employees"] += [
            {"guid": "constant", "name": "Constant", "mode": "FIXED", "fixedTemplate": OTHER},
            {"guid": "rotating", "name": "Rotating", "mode": "ROTATING"},
        ]
        data["requirements"] = [requirement("other-monday", "Mon", OTHER, 1, "ROTATING")]
        active, _ = self.solve(data)
        disabled = deepcopy(data)
        disabled["fixed_alternation_policy"]["enabled"] = False
        disabled_schedule, diagnostics = self.solve(disabled)
        del disabled["fixed_alternation_policy"]
        legacy, _ = self.solve(disabled)
        self.assertEqual(disabled_schedule, legacy)
        self.assertNotIn("fixedAlternationEvaluation", diagnostics.model_dump())
        self.assertNotEqual(active["aicha"], legacy["aicha"])
        for guid in ["constant", "rotating"]:
            self.assertEqual(active[guid], legacy[guid])

    def test_rolling_overlap_locks_match_independent_period_phase(self):
        first, _ = self.solve(request("2026-12-21", "2027-01-03"))
        data = request("2026-12-28", "2027-01-10")
        shifts = {"late": LATE, "morning": EARLY, None: None}
        data["lockedAssignments"] = [
            lock(guid, iso, shifts[shift])
            for guid, days in first.items() for iso, shift in days.items() if iso >= "2026-12-28"
        ]
        second, _ = self.solve(data)
        full, _ = self.solve(request("2026-12-28", "2027-01-10"))
        self.assertEqual(full, second)
        self.assert_joint_phase(second)

    def test_actual_shift_lengths_limit_switches(self):
        data = request("2026-12-29", "2026-12-29")
        data["employees"][0]["fixedTemplate"] = template("late", "10:00", "14:00")
        data["employees"][0]["maxWeeklyMinutes"] = 240
        data["employees"][0]["fixedRestDayMode"] = "TEMPLATE"
        schedules, diagnostics = self.solve(data)
        self.assertEqual(schedules["aicha"]["2026-12-29"], "late")
        self.assertNotEqual(diagnostics.fixedAlternationEvaluation.checks[0].expected,
                            diagnostics.fixedAlternationEvaluation.checks[0].actual)


if __name__ == "__main__":
    unittest.main()
