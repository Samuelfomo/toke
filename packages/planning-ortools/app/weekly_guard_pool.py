# from __future__ import annotations
#
# from datetime import date
#
#
# def maximum_guard_starts_per_employee(
#     guard_dates: list[str],
#     minimum_start_gap_days: int,
# ) -> int:
#     """Maximum starts one employee can cover on the supplied dates.
#
#     All guard starts have the same duration/cooldown, therefore selecting the
#     earliest compatible date is an optimal interval-scheduling strategy.
#     """
#     if minimum_start_gap_days < 1:
#         raise ValueError("minimum_start_gap_days must be greater than 0")
#     if not guard_dates:
#         return 0
#
#     count = 0
#     last_selected: date | None = None
#     for iso in sorted(set(guard_dates)):
#         current = date.fromisoformat(iso)
#         if (
#             last_selected is None
#             or (current - last_selected).days >= minimum_start_gap_days
#         ):
#             count += 1
#             last_selected = current
#     return count
#
#
# def validate_weekly_guard_capacity(
#     *,
#     required_by_date: dict[str, int],
#     employees_per_week: int,
#     minimum_start_gap_days: int,
#     week_monday: str,
# ) -> None:
#     if employees_per_week < 1:
#         raise ValueError("employees_per_week must be greater than 0")
#     if not required_by_date:
#         return
#
#     maximum_daily_required = max(required_by_date.values(), default=0)
#     if maximum_daily_required > employees_per_week:
#         raise ValueError(
#             "WEEKLY_POOL is too small: "
#             f"{maximum_daily_required} guard employee(s) are required "
#             f"on one day of week {week_monday}, but the pool contains "
#             f"{employees_per_week}"
#         )
#
#     guard_dates = [
#         iso
#         for iso, required in required_by_date.items()
#         if required > 0
#     ]
#     maximum_starts = maximum_guard_starts_per_employee(
#         guard_dates,
#         minimum_start_gap_days,
#     )
#     total_required = sum(required_by_date.values())
#     total_capacity = employees_per_week * maximum_starts
#
#     if total_required > total_capacity:
#         raise ValueError(
#             "WEEKLY_POOL cannot cover the configured guards with the "
#             "current recovery rule: "
#             f"week {week_monday} requires {total_required} guard starts, "
#             f"but a pool of {employees_per_week} can provide at most "
#             f"{total_capacity} when guard starts must be separated by "
#             f"{minimum_start_gap_days} day(s). Reduce postGuardRestDays, "
#             "enlarge the pool, or reduce guard coverage."
#         )



from __future__ import annotations

from datetime import date


def maximum_guard_starts_per_employee(
    guard_dates: list[str],
    minimum_start_gap_days: int,
) -> int:
    """Maximum starts one employee can cover on the supplied dates.

    All guard starts have the same duration/cooldown, therefore selecting the
    earliest compatible date is an optimal interval-scheduling strategy.
    """
    if minimum_start_gap_days < 1:
        raise ValueError("minimum_start_gap_days must be greater than 0")
    if not guard_dates:
        return 0

    count = 0
    last_selected: date | None = None
    for iso in sorted(set(guard_dates)):
        current = date.fromisoformat(iso)
        if (
            last_selected is None
            or (current - last_selected).days >= minimum_start_gap_days
        ):
            count += 1
            last_selected = current
    return count


def validate_weekly_guard_capacity(
    *,
    required_by_date: dict[str, int],
    employees_per_week: int,
    minimum_start_gap_days: int,
    week_monday: str,
) -> None:
    if employees_per_week < 1:
        raise ValueError("employees_per_week must be greater than 0")
    if not required_by_date:
        return

    maximum_daily_required = max(required_by_date.values(), default=0)
    if maximum_daily_required > employees_per_week:
        raise ValueError(
            "WEEKLY_POOL is too small: "
            f"{maximum_daily_required} guard employee(s) are required "
            f"on one day of week {week_monday}, but the pool contains "
            f"{employees_per_week}"
        )

    guard_dates = [
        iso
        for iso, required in required_by_date.items()
        if required > 0
    ]
    maximum_starts = maximum_guard_starts_per_employee(
        guard_dates,
        minimum_start_gap_days,
    )
    total_required = sum(required_by_date.values())
    total_capacity = employees_per_week * maximum_starts

    if total_required > total_capacity:
        raise ValueError(
            "WEEKLY_POOL cannot cover the configured guards with the "
            "current recovery rule: "
            f"week {week_monday} requires {total_required} guard starts, "
            f"but a pool of {employees_per_week} can provide at most "
            f"{total_capacity} when guard starts must be separated by "
            f"{minimum_start_gap_days} day(s). Reduce postGuardRestDays, "
            "enlarge the pool, or reduce guard coverage."
        )