"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDays = addDays;
exports.mondayOfWeek = mondayOfWeek;
exports.sundayOfWeek = sundayOfWeek;
exports.normalizePlanningHorizon = normalizePlanningHorizon;
exports.projectEngineResultToRequestedPeriod = projectEngineResultToRequestedPeriod;
function parseIso(iso) {
    return new Date(`${iso}T00:00:00.000Z`);
}
function addDays(iso, amount) {
    const date = parseIso(iso);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
}
function daysBetween(from, to) {
    return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / 86400000);
}
function mondayOfWeek(iso) {
    const date = parseIso(iso);
    const day = date.getUTCDay();
    const offset = day === 0 ? -6 : 1 - day;
    return addDays(iso, offset);
}
function sundayOfWeek(iso) {
    return addDays(mondayOfWeek(iso), 6);
}
function hasCompleteWeekPolicy(config) {
    const weeklyLeave = config.weeklyLeavePolicy;
    const guardTeam = config.guardTeamPolicy;
    const weeklyLeaveNeedsFullWeek = weeklyLeave.completeWeeksOnly &&
        ['TEAM_ROTATION', 'PER_ELIGIBLE_EMPLOYEE'].includes(weeklyLeave.mode);
    const guardPoolNeedsFullWeek = guardTeam.completeWeeksOnly && guardTeam.mode === 'WEEKLY_POOL';
    return weeklyLeaveNeedsFullWeek || guardPoolNeedsFullWeek;
}
/**
 * The manager may request any inclusive date range. Weekly policies are solved
 * on complete Monday-Sunday weeks, then the result is projected back to the
 * exact requested range.
 */
function normalizePlanningHorizon(requestedFrom, requestedTo, options) {
    const needsCompleteWeeks = hasCompleteWeekPolicy(options.config) ||
        options.config.minRestDaysPerWeek > 0 ||
        options.config.maxWeeklyMinutes !== null ||
        options.hasEmployeeWeeklyMinuteLimits === true;
    const solveFrom = needsCompleteWeeks
        ? mondayOfWeek(requestedFrom)
        : requestedFrom;
    const solveTo = needsCompleteWeeks
        ? sundayOfWeek(requestedTo)
        : requestedTo;
    return {
        requestedFrom,
        requestedTo,
        solveFrom,
        solveTo,
        expandedBeforeDays: daysBetween(solveFrom, requestedFrom),
        expandedAfterDays: daysBetween(requestedTo, solveTo),
        completeWeekExpansionApplied: solveFrom !== requestedFrom || solveTo !== requestedTo,
    };
}
function inRange(iso, from, to) {
    return iso >= from && iso <= to;
}
function causalGuardStart(reason) {
    var _a;
    if (!reason)
        return null;
    if (reason.source !== 'GUARD_CONTINUATION' &&
        reason.source !== 'POST_GUARD_REST') {
        return null;
    }
    for (const factor of (_a = reason.factors) !== null && _a !== void 0 ? _a : []) {
        const match = factor.match(/garde commenc(?:ée|é) le (\d{4}-\d{2}-\d{2})/i);
        if (match === null || match === void 0 ? void 0 : match[1])
            return match[1];
    }
    return null;
}
function shouldKeepProjectedDate(iso, reason, horizon) {
    if (inRange(iso, horizon.requestedFrom, horizon.requestedTo)) {
        return true;
    }
    // Preserve only the continuation/recovery caused by a guard that actually
    // starts inside the requested range. Context-only shifts in the padded suffix
    // must never leak into the persisted suggestion.
    const guardStart = causalGuardStart(reason);
    return (guardStart !== null &&
        inRange(guardStart, horizon.requestedFrom, horizon.requestedTo));
}
function coverageScore(result) {
    if (result.length === 0)
        return 0;
    const total = result.reduce((sum, slot) => {
        if (slot.target === 0)
            return sum + 1;
        return sum + Math.min(1, slot.assigned / slot.target);
    }, 0);
    return Math.round((total / result.length) * 100);
}
function intersects(fromA, toA, fromB, toB) {
    return fromA <= toB && toA >= fromB;
}
/**
 * Removes context-only prefix/suffix days from a full-week solver result while
 * keeping guard continuations and post-guard recovery caused by a visible guard.
 */
function projectEngineResultToRequestedPeriod(result, horizon) {
    const items = result.items.map((item) => {
        var _a, _b;
        const schedule = {};
        const reasons = {};
        const allDates = new Set([
            ...Object.keys(item.schedule),
            ...Object.keys(item.reasons),
        ]);
        for (const iso of [...allDates].sort()) {
            const reason = (_a = item.reasons[iso]) !== null && _a !== void 0 ? _a : null;
            if (!shouldKeepProjectedDate(iso, reason, horizon))
                continue;
            schedule[iso] = (_b = item.schedule[iso]) !== null && _b !== void 0 ? _b : null;
            reasons[iso] = reason;
        }
        return Object.assign(Object.assign({}, item), { schedule,
            reasons });
    });
    const coverage = result.diagnostics.coverage.filter((slot) => inRange(slot.date, horizon.requestedFrom, horizon.requestedTo));
    const weeklyLeaveGroups = result.diagnostics.weeklyLeaveGroups
        .filter((group) => intersects(group.weekFrom, group.weekTo, horizon.requestedFrom, horizon.requestedTo))
        .map((group) => {
        const leaveByEmployee = {};
        for (const [employeeGuid, dates] of Object.entries(group.leaveByEmployee)) {
            const visibleDates = dates.filter((iso) => inRange(iso, horizon.requestedFrom, horizon.requestedTo));
            if (visibleDates.length > 0) {
                leaveByEmployee[employeeGuid] = visibleDates;
            }
        }
        return Object.assign(Object.assign({}, group), { employeeGuids: Object.keys(leaveByEmployee), leaveByEmployee });
    })
        .filter((group) => group.employeeGuids.length > 0);
    const projectedCoverageScore = coverageScore(coverage);
    const fairnessScore = result.diagnostics.fairnessScore;
    return Object.assign(Object.assign({}, result), { items, conformityScore: Math.round(projectedCoverageScore * 0.75 + fairnessScore * 0.25), diagnostics: Object.assign(Object.assign({}, result.diagnostics), { violations: result.diagnostics.violations.filter((violation) => !violation.date ||
                inRange(violation.date, horizon.requestedFrom, horizon.requestedTo)), coverage, guardPools: result.diagnostics.guardPools.filter((pool) => intersects(pool.weekFrom, pool.weekTo, horizon.requestedFrom, horizon.requestedTo)), weeklyLeaveGroups, coverageScore: projectedCoverageScore, fairnessScore }) });
}
