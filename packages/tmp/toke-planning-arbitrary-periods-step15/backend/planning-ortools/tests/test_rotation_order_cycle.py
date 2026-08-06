from app.weekly_leave import selected_rotation_orders

orders = list(range(1, 14))
selected = []
for week in range(13):
    # 2026-08-03 is a Monday. Advancing the day by 7*week is enough here.
    from datetime import date, timedelta
    current = (date(2026, 8, 3) + timedelta(days=week * 7)).isoformat()
    result = selected_rotation_orders(
        orders,
        1,
        current,
        "2026-08-03",
    )
    assert len(result) == 1
    selected.extend(result)

assert selected == orders
assert selected_rotation_orders(
    orders,
    1,
    "2026-11-02",
    "2026-08-03",
) == [1]

print({"cycle": selected, "wrap": 1})
