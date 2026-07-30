#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, timedelta
from pathlib import Path

GUARD_START = "8458796316720205"
GUARD_END = "1971539537938306"
ALL_DAYS = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}

def add_days(iso: str, days: int) -> str:
    return (date.fromisoformat(iso) + timedelta(days=days)).isoformat()

def fail(errors: list[str], message: str) -> None:
    errors.append(message)

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("response", help="Fichier JSON retourné par POST /generate")
    parser.add_argument("--employees", type=int, default=13)
    parser.add_argument("--requirements-per-day", type=int, default=4)
    args = parser.parse_args()

    payload = json.loads(Path(args.response).read_text(encoding="utf-8"))
    errors: list[str] = []

    if payload.get("success") is not True:
        fail(errors, "La génération n'a pas réussi.")
        data = {}
    else:
        data = payload.get("data") or {}

    suggestion = data.get("suggestion") or {}
    diagnostics = data.get("diagnostics") or suggestion.get("diagnostics") or {}
    solver = (suggestion.get("diagnostics") or {}).get("solver") or diagnostics.get("solver") or {}

    if solver.get("usedSolver") != "ORTOOLS":
        fail(errors, f"usedSolver attendu ORTOOLS, reçu {solver.get('usedSolver')!r}.")
    if solver.get("fallbackUsed") is not False:
        fail(errors, "Le fallback GREEDY ne doit pas être utilisé.")
    if diagnostics.get("coverageScore") != 100:
        fail(errors, f"coverageScore attendu 100, reçu {diagnostics.get('coverageScore')!r}.")
    if diagnostics.get("violations"):
        fail(errors, f"Des violations sont présentes: {diagnostics.get('violations')!r}.")

    items = suggestion.get("items") or []
    employee_count = data.get("employee_count", len(items))
    if employee_count != args.employees:
        fail(errors, f"employee_count attendu {args.employees}, reçu {employee_count}.")

    period_from = suggestion.get("period_from")
    period_to = suggestion.get("period_to")
    if not period_from or not period_to:
        fail(errors, "Période absente de la suggestion.")
        expected_dates = []
    else:
        current = date.fromisoformat(period_from)
        end = date.fromisoformat(period_to)
        expected_dates = []
        while current <= end:
            expected_dates.append(current.isoformat())
            current += timedelta(days=1)

    coverage = diagnostics.get("coverage") or []
    covered_days = {entry.get("dayOfWeek") for entry in coverage}
    if covered_days != ALL_DAYS:
        fail(errors, f"Jours de couverture incomplets: {sorted(x for x in covered_days if x)}.")

    expected_coverage_count = len(expected_dates) * args.requirements_per_day
    if len(coverage) != expected_coverage_count:
        fail(
            errors,
            f"{expected_coverage_count} diagnostics de couverture attendus "
            f"({len(expected_dates)} jours × {args.requirements_per_day}), reçus {len(coverage)}."
        )

    for entry in coverage:
        if entry.get("status") != "COVERED":
            fail(errors, f"Couverture non satisfaite: {entry}.")

    for item in items:
        schedule = item.get("schedule") or {}
        reasons = item.get("reasons") or {}
        user = (item.get("user") or {}).get("name") or (item.get("user") or {}).get("guid") or "?"
        missing = [iso for iso in expected_dates if iso not in schedule]
        if missing:
            fail(errors, f"{user}: dates manquantes dans schedule: {missing}.")

        guard_dates = [iso for iso, tpl in schedule.items() if tpl == GUARD_START]
        for guard_date in guard_dates:
            continuation = add_days(guard_date, 1)
            post_rest = add_days(guard_date, 2)

            if schedule.get(continuation) != GUARD_END:
                fail(errors, f"{user}: garde {guard_date} sans continuation correcte le {continuation}.")

            if post_rest in schedule and schedule.get(post_rest) is not None:
                fail(errors, f"{user}: garde {guard_date} sans repos post-garde le {post_rest}.")

            if post_rest in reasons:
                source = (reasons.get(post_rest) or {}).get("source")
                if source != "POST_GUARD_REST":
                    fail(errors, f"{user}: source attendue POST_GUARD_REST le {post_rest}, reçue {source!r}.")

            next_guard = add_days(guard_date, 1)
            if schedule.get(next_guard) == GUARD_START:
                fail(errors, f"{user}: gardes consécutives détectées les {guard_date} et {next_guard}.")

    fixed_items = [
        item for item in items
        if any((reason or {}).get("source") == "FIXED"
               for reason in (item.get("reasons") or {}).values())
    ]
    for item in fixed_items:
        schedule = item.get("schedule") or {}
        name = (item.get("user") or {}).get("name") or "FIXED"
        for week_start_index in range(0, len(expected_dates), 7):
            week = expected_dates[week_start_index:week_start_index + 7]
            if len(week) != 7:
                continue
            worked = sum(1 for iso in week if schedule.get(iso) is not None)
            if worked != 6:
                fail(errors, f"{name}: 6 jours travaillés attendus sur {week[0]}→{week[-1]}, reçus {worked}.")

    if errors:
        print("RECETTE ÉCHOUÉE")
        for error in errors:
            print(f"- {error}")
        return 1

    print("RECETTE VALIDÉE")
    print(f"- Employés: {employee_count}")
    print(f"- Période: {period_from} → {period_to}")
    print(f"- Couvertures: {len(coverage)}")
    print(f"- Solveur: {solver.get('usedSolver')} / fallback={solver.get('fallbackUsed')}")
    print("- Gardes, continuations et repos post-garde validés")
    return 0

if __name__ == "__main__":
    sys.exit(main())
