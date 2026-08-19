export interface PlanningHorizon {
  requestedFrom: string;
  requestedTo: string;
  solveFrom: string;
  solveTo: string;
  expandedBeforeDays: number;
  expandedAfterDays: number;
  completeWeekExpansionApplied: boolean;
}

export interface PlanningHorizonConfig {
  minRestDaysPerWeek: number;
  maxWeeklyMinutes: number | null;
  weeklyLeavePolicy: {
    mode: string;
    completeWeeksOnly: boolean;
  };
  guardTeamPolicy: {
    mode: string;
    completeWeeksOnly: boolean;
  };
}

export interface PlanningHorizonOptions {
  config: PlanningHorizonConfig;
  hasEmployeeWeeklyMinuteLimits?: boolean;
}

interface ProjectableDayReason {
  source?: string;
  factors?: string[];
}

interface ProjectableCoverage {
  date: string;
  target: number;
  assigned: number;
}

interface ProjectableViolation {
  date?: string;
}

interface ProjectableGuardPool {
  weekFrom: string;
  weekTo: string;
}

interface ProjectableWeeklyLeaveGroup {
  weekFrom: string;
  weekTo: string;
  employeeGuids: string[];
  leaveByEmployee: Record<string, string[]>;
}

export interface ProjectableEngineResult {
  items: Array<{
    userGuid: string;
    schedule: Record<string, string | null>;
    reasons: Record<string, ProjectableDayReason | null>;
  }>;
  conformityScore: number;
  diagnostics: {
    violations: ProjectableViolation[];
    coverage: ProjectableCoverage[];
    guardPools: ProjectableGuardPool[];
    weeklyLeaveGroups: ProjectableWeeklyLeaveGroup[];
    fairnessScore: number;
    coverageScore: number;
  };
}

function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function addDays(iso: string, amount: number): string {
  const date = parseIso(iso);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / 86_400_000);
}

export function mondayOfWeek(iso: string): string {
  const date = parseIso(iso);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(iso, offset);
}

export function sundayOfWeek(iso: string): string {
  return addDays(mondayOfWeek(iso), 6);
}

function hasCompleteWeekPolicy(config: PlanningHorizonConfig): boolean {
  const weeklyLeave = config.weeklyLeavePolicy;
  const guardTeam = config.guardTeamPolicy;

  const weeklyLeaveNeedsFullWeek =
    weeklyLeave.completeWeeksOnly &&
    ['TEAM_ROTATION', 'PER_ELIGIBLE_EMPLOYEE'].includes(weeklyLeave.mode);

  const guardPoolNeedsFullWeek = guardTeam.completeWeeksOnly && guardTeam.mode === 'WEEKLY_POOL';

  return weeklyLeaveNeedsFullWeek || guardPoolNeedsFullWeek;
}

/**
 * The manager may request any inclusive date range. Weekly policies are solved
 * on complete Monday-Sunday weeks, then the result is projected back to the
 * exact requested range.
 */
export function normalizePlanningHorizon(
  requestedFrom: string,
  requestedTo: string,
  options: PlanningHorizonOptions,
): PlanningHorizon {
  const needsCompleteWeeks =
    hasCompleteWeekPolicy(options.config) ||
    options.config.minRestDaysPerWeek > 0 ||
    options.config.maxWeeklyMinutes !== null ||
    options.hasEmployeeWeeklyMinuteLimits === true;

  const solveFrom = needsCompleteWeeks ? mondayOfWeek(requestedFrom) : requestedFrom;
  const solveTo = needsCompleteWeeks ? sundayOfWeek(requestedTo) : requestedTo;

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

function inRange(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to;
}

function causalGuardStart(reason: ProjectableDayReason | null | undefined): string | null {
  if (!reason) return null;
  if (reason.source !== 'GUARD_CONTINUATION' && reason.source !== 'POST_GUARD_REST') {
    return null;
  }

  for (const factor of reason.factors ?? []) {
    const match = factor.match(/garde commenc(?:ée|é) le (\d{4}-\d{2}-\d{2})/i);
    if (match?.[1]) return match[1];
  }

  return null;
}

function shouldKeepProjectedDate(
  iso: string,
  reason: ProjectableDayReason | null | undefined,
  horizon: PlanningHorizon,
): boolean {
  if (inRange(iso, horizon.requestedFrom, horizon.requestedTo)) {
    return true;
  }

  // Preserve only the continuation/recovery caused by a guard that actually
  // starts inside the requested range. Context-only shifts in the padded suffix
  // must never leak into the persisted suggestion.
  const guardStart = causalGuardStart(reason);
  return guardStart !== null && inRange(guardStart, horizon.requestedFrom, horizon.requestedTo);
}

function coverageScore(result: ProjectableCoverage[]): number {
  if (result.length === 0) return 0;
  const total = result.reduce((sum, slot) => {
    if (slot.target === 0) return sum + 1;
    return sum + Math.min(1, slot.assigned / slot.target);
  }, 0);
  return Math.round((total / result.length) * 100);
}

function intersects(fromA: string, toA: string, fromB: string, toB: string): boolean {
  return fromA <= toB && toA >= fromB;
}

/**
 * Removes context-only prefix/suffix days from a full-week solver result while
 * keeping guard continuations and post-guard recovery caused by a visible guard.
 */
export function projectEngineResultToRequestedPeriod<T extends ProjectableEngineResult>(
  result: T,
  horizon: PlanningHorizon,
): T {
  const items = result.items.map((item) => {
    const schedule: Record<string, string | null> = {};
    const reasons: typeof item.reasons = {};

    const allDates = new Set([...Object.keys(item.schedule), ...Object.keys(item.reasons)]);

    for (const iso of [...allDates].sort()) {
      const reason = item.reasons[iso] ?? null;
      if (!shouldKeepProjectedDate(iso, reason, horizon)) continue;
      schedule[iso] = item.schedule[iso] ?? null;
      reasons[iso] = reason;
    }

    return {
      ...item,
      schedule,
      reasons,
    };
  });

  const coverage = result.diagnostics.coverage.filter((slot) =>
    inRange(slot.date, horizon.requestedFrom, horizon.requestedTo),
  );

  const weeklyLeaveGroups = result.diagnostics.weeklyLeaveGroups
    .filter((group) =>
      intersects(group.weekFrom, group.weekTo, horizon.requestedFrom, horizon.requestedTo),
    )
    .map((group) => {
      const leaveByEmployee: Record<string, string[]> = {};
      for (const [employeeGuid, dates] of Object.entries(group.leaveByEmployee)) {
        const visibleDates = dates.filter((iso) =>
          inRange(iso, horizon.requestedFrom, horizon.requestedTo),
        );
        if (visibleDates.length > 0) {
          leaveByEmployee[employeeGuid] = visibleDates;
        }
      }

      return {
        ...group,
        employeeGuids: Object.keys(leaveByEmployee),
        leaveByEmployee,
      };
    })
    .filter((group) => group.employeeGuids.length > 0);

  const projectedCoverageScore = coverageScore(coverage);
  const fairnessScore = result.diagnostics.fairnessScore;

  return {
    ...result,
    items,
    conformityScore: Math.round(projectedCoverageScore * 0.75 + fairnessScore * 0.25),
    diagnostics: {
      ...result.diagnostics,
      violations: result.diagnostics.violations.filter(
        (violation) =>
          !violation.date || inRange(violation.date, horizon.requestedFrom, horizon.requestedTo),
      ),
      coverage,
      guardPools: result.diagnostics.guardPools.filter((pool) =>
        intersects(pool.weekFrom, pool.weekTo, horizon.requestedFrom, horizon.requestedTo),
      ),
      weeklyLeaveGroups,
      coverageScore: projectedCoverageScore,
      fairnessScore,
    },
  } as T;
}



// export interface PlanningHorizon {
//   requestedFrom: string;
//   requestedTo: string;
//   solveFrom: string;
//   solveTo: string;
//   expandedBeforeDays: number;
//   expandedAfterDays: number;
//   completeWeekExpansionApplied: boolean;
// }
//
// export interface PlanningHorizonConfig {
//   minRestDaysPerWeek: number;
//   maxWeeklyMinutes: number | null;
//   weeklyLeavePolicy: {
//     mode: string;
//     completeWeeksOnly: boolean;
//   };
//   guardTeamPolicy: {
//     mode: string;
//     completeWeeksOnly: boolean;
//   };
// }
//
// export interface PlanningHorizonOptions {
//   config: PlanningHorizonConfig;
//   hasEmployeeWeeklyMinuteLimits?: boolean;
// }
//
// interface ProjectableDayReason {
//   source?: string;
//   factors?: string[];
// }
//
// interface ProjectableCoverage {
//   date: string;
//   target: number;
//   assigned: number;
// }
//
// interface ProjectableViolation {
//   date?: string;
// }
//
// interface ProjectableGuardPool {
//   weekFrom: string;
//   weekTo: string;
// }
//
// interface ProjectableWeeklyLeaveGroup {
//   weekFrom: string;
//   weekTo: string;
//   employeeGuids: string[];
//   leaveByEmployee: Record<string, string[]>;
// }
//
// export interface ProjectableEngineResult {
//   items: Array<{
//     userGuid: string;
//     schedule: Record<string, string | null>;
//     reasons: Record<string, ProjectableDayReason | null>;
//   }>;
//   conformityScore: number;
//   diagnostics: {
//     violations: ProjectableViolation[];
//     coverage: ProjectableCoverage[];
//     guardPools: ProjectableGuardPool[];
//     weeklyLeaveGroups: ProjectableWeeklyLeaveGroup[];
//     fairnessScore: number;
//     coverageScore: number;
//   };
// }
//
// function parseIso(iso: string): Date {
//   return new Date(`${iso}T00:00:00.000Z`);
// }
//
// export function addDays(iso: string, amount: number): string {
//   const date = parseIso(iso);
//   date.setUTCDate(date.getUTCDate() + amount);
//   return date.toISOString().slice(0, 10);
// }
//
// function daysBetween(from: string, to: string): number {
//   return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / 86_400_000);
// }
//
// export function mondayOfWeek(iso: string): string {
//   const date = parseIso(iso);
//   const day = date.getUTCDay();
//   const offset = day === 0 ? -6 : 1 - day;
//   return addDays(iso, offset);
// }
//
// export function sundayOfWeek(iso: string): string {
//   return addDays(mondayOfWeek(iso), 6);
// }
//
// function hasCompleteWeekPolicy(config: PlanningHorizonConfig): boolean {
//   const weeklyLeave = config.weeklyLeavePolicy;
//   const guardTeam = config.guardTeamPolicy;
//
//   const weeklyLeaveNeedsFullWeek =
//     weeklyLeave.completeWeeksOnly &&
//     ['TEAM_ROTATION', 'PER_ELIGIBLE_EMPLOYEE'].includes(weeklyLeave.mode);
//
//   const guardPoolNeedsFullWeek = guardTeam.completeWeeksOnly && guardTeam.mode === 'WEEKLY_POOL';
//
//   return weeklyLeaveNeedsFullWeek || guardPoolNeedsFullWeek;
// }
//
// /**
//  * The manager may request any inclusive date range. Weekly policies are solved
//  * on complete Monday-Sunday weeks, then the result is projected back to the
//  * exact requested range.
//  */
// export function normalizePlanningHorizon(
//   requestedFrom: string,
//   requestedTo: string,
//   options: PlanningHorizonOptions,
// ): PlanningHorizon {
//   const needsCompleteWeeks =
//     hasCompleteWeekPolicy(options.config) ||
//     options.config.minRestDaysPerWeek > 0 ||
//     options.config.maxWeeklyMinutes !== null ||
//     options.hasEmployeeWeeklyMinuteLimits === true;
//
//   const solveFrom = needsCompleteWeeks ? mondayOfWeek(requestedFrom) : requestedFrom;
//   const solveTo = needsCompleteWeeks ? sundayOfWeek(requestedTo) : requestedTo;
//
//   return {
//     requestedFrom,
//     requestedTo,
//     solveFrom,
//     solveTo,
//     expandedBeforeDays: daysBetween(solveFrom, requestedFrom),
//     expandedAfterDays: daysBetween(requestedTo, solveTo),
//     completeWeekExpansionApplied: solveFrom !== requestedFrom || solveTo !== requestedTo,
//   };
// }
//
// function inRange(iso: string, from: string, to: string): boolean {
//   return iso >= from && iso <= to;
// }
//
// function causalGuardStart(reason: ProjectableDayReason | null | undefined): string | null {
//   if (!reason) return null;
//   if (reason.source !== 'GUARD_CONTINUATION' && reason.source !== 'POST_GUARD_REST') {
//     return null;
//   }
//
//   for (const factor of reason.factors ?? []) {
//     const match = factor.match(/garde commenc(?:ée|é) le (\d{4}-\d{2}-\d{2})/i);
//     if (match?.[1]) return match[1];
//   }
//
//   return null;
// }
//
// function shouldKeepProjectedDate(
//   iso: string,
//   reason: ProjectableDayReason | null | undefined,
//   horizon: PlanningHorizon,
// ): boolean {
//   if (inRange(iso, horizon.requestedFrom, horizon.requestedTo)) {
//     return true;
//   }
//
//   // Preserve only the continuation/recovery caused by a guard that actually
//   // starts inside the requested range. Context-only shifts in the padded suffix
//   // must never leak into the persisted suggestion.
//   const guardStart = causalGuardStart(reason);
//   return guardStart !== null && inRange(guardStart, horizon.requestedFrom, horizon.requestedTo);
// }
//
// function coverageScore(result: ProjectableCoverage[]): number {
//   if (result.length === 0) return 0;
//   const total = result.reduce((sum, slot) => {
//     if (slot.target === 0) return sum + 1;
//     return sum + Math.min(1, slot.assigned / slot.target);
//   }, 0);
//   return Math.round((total / result.length) * 100);
// }
//
// function intersects(fromA: string, toA: string, fromB: string, toB: string): boolean {
//   return fromA <= toB && toA >= fromB;
// }
//
// /**
//  * Removes context-only prefix/suffix days from a full-week solver result while
//  * keeping guard continuations and post-guard recovery caused by a visible guard.
//  */
// export function projectEngineResultToRequestedPeriod<T extends ProjectableEngineResult>(
//   result: T,
//   horizon: PlanningHorizon,
// ): T {
//   const items = result.items.map((item) => {
//     const schedule: Record<string, string | null> = {};
//     const reasons: typeof item.reasons = {};
//
//     const allDates = new Set([...Object.keys(item.schedule), ...Object.keys(item.reasons)]);
//
//     for (const iso of [...allDates].sort()) {
//       const reason = item.reasons[iso] ?? null;
//       if (!shouldKeepProjectedDate(iso, reason, horizon)) continue;
//       schedule[iso] = item.schedule[iso] ?? null;
//       reasons[iso] = reason;
//     }
//
//     return {
//       ...item,
//       schedule,
//       reasons,
//     };
//   });
//
//   const coverage = result.diagnostics.coverage.filter((slot) =>
//     inRange(slot.date, horizon.requestedFrom, horizon.requestedTo),
//   );
//
//   const weeklyLeaveGroups = result.diagnostics.weeklyLeaveGroups
//     .filter((group) =>
//       intersects(group.weekFrom, group.weekTo, horizon.requestedFrom, horizon.requestedTo),
//     )
//     .map((group) => {
//       const leaveByEmployee: Record<string, string[]> = {};
//       for (const [employeeGuid, dates] of Object.entries(group.leaveByEmployee)) {
//         const visibleDates = dates.filter((iso) =>
//           inRange(iso, horizon.requestedFrom, horizon.requestedTo),
//         );
//         if (visibleDates.length > 0) {
//           leaveByEmployee[employeeGuid] = visibleDates;
//         }
//       }
//
//       return {
//         ...group,
//         employeeGuids: Object.keys(leaveByEmployee),
//         leaveByEmployee,
//       };
//     })
//     .filter((group) => group.employeeGuids.length > 0);
//
//   const projectedCoverageScore = coverageScore(coverage);
//   const fairnessScore = result.diagnostics.fairnessScore;
//
//   return {
//     ...result,
//     items,
//     conformityScore: Math.round(projectedCoverageScore * 0.75 + fairnessScore * 0.25),
//     diagnostics: {
//       ...result.diagnostics,
//       violations: result.diagnostics.violations.filter(
//         (violation) =>
//           !violation.date || inRange(violation.date, horizon.requestedFrom, horizon.requestedTo),
//       ),
//       coverage,
//       guardPools: result.diagnostics.guardPools.filter((pool) =>
//         intersects(pool.weekFrom, pool.weekTo, horizon.requestedFrom, horizon.requestedTo),
//       ),
//       weeklyLeaveGroups,
//       coverageScore: projectedCoverageScore,
//       fairnessScore,
//     },
//   } as T;
// }
