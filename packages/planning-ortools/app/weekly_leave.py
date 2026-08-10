# from __future__ import annotations
#
# from datetime import date, timedelta
#
#
# def monday_of(value: str) -> date:
#     current = date.fromisoformat(value)
#     return current - timedelta(days=current.weekday())
#
#
# def selected_rotation_orders(
#     rotation_orders: list[int],
#     employees_per_week: int,
#     week_monday: str,
#     rotation_anchor_date: str,
# ) -> list[int]:
#     if not rotation_orders:
#         raise ValueError("rotation_orders cannot be empty")
#     if employees_per_week < 1:
#         raise ValueError("employees_per_week must be greater than 0")
#     if employees_per_week > len(rotation_orders):
#         raise ValueError("employees_per_week cannot exceed rotation orders")
#     if len(set(rotation_orders)) != len(rotation_orders):
#         raise ValueError("rotation_orders must be unique")
#
#     ordered = sorted(rotation_orders)
#     anchor_monday = monday_of(rotation_anchor_date)
#     current_monday = monday_of(week_monday)
#     week_offset = (current_monday - anchor_monday).days // 7
#     start = (week_offset * employees_per_week) % len(ordered)
#
#     return [
#         ordered[(start + index) % len(ordered)]
#         for index in range(employees_per_week)
#     ]


from __future__ import annotations

from datetime import date, timedelta


def monday_of(value: str) -> date:
    current = date.fromisoformat(value)
    return current - timedelta(days=current.weekday())


def selected_rotation_orders(
    rotation_orders: list[int],
    employees_per_week: int,
    week_monday: str,
    rotation_anchor_date: str,
) -> list[int]:
    if not rotation_orders:
        raise ValueError("rotation_orders cannot be empty")
    if employees_per_week < 1:
        raise ValueError("employees_per_week must be greater than 0")
    if employees_per_week > len(rotation_orders):
        raise ValueError("employees_per_week cannot exceed rotation orders")
    if len(set(rotation_orders)) != len(rotation_orders):
        raise ValueError("rotation_orders must be unique")

    ordered = sorted(rotation_orders)
    anchor_monday = monday_of(rotation_anchor_date)
    current_monday = monday_of(week_monday)
    week_offset = (current_monday - anchor_monday).days // 7
    start = (week_offset * employees_per_week) % len(ordered)

    return [
        ordered[(start + index) % len(ordered)]
        for index in range(employees_per_week)
    ]