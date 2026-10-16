"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monthlySeatCount = monthlySeatCount;
/** Règle commune : une licence employé observée au moins une fois dans le cycle. */
function monthlySeatCount(minimum, employees) {
    if (!Number.isSafeInteger(minimum) || minimum < 5 || !Array.isArray(employees))
        throw new Error('Invalid monthly usage parameters');
    const seen = new Set();
    let count = 0;
    for (const employee of employees) {
        const guid = Number(employee.employee_license_guid);
        const days = Number(employee.active_days);
        if (!Number.isSafeInteger(guid) ||
            guid < 100000 ||
            guid > 999999 ||
            seen.has(guid) ||
            !Number.isSafeInteger(days) ||
            days < 0 ||
            days > 32)
            throw new Error('Invalid or duplicate employee usage');
        seen.add(guid);
        if (days > 0)
            count++;
    }
    return { count, seats: Math.max(minimum, count) };
}
