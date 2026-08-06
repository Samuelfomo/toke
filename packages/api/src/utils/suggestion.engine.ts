// ─────────────────────────────────────────────────────────────────────────────
// suggestion.engine.ts — V2.4 politiques génériques par population et service
//
// Le moteur ne déduit plus la couverture depuis l'historique.
// Sources de vérité :
//   1. configuration active ;
//   2. besoins de couverture par jour et SessionTemplate ;
//   3. profils FIXED / ROTATING / EXCLUDED.
//
// L'historique ne sert qu'à l'équité à long terme.
// Aucune dépendance Express, Sequelize ou classe métier.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export type DayKey = (typeof DAY_KEYS)[number];
export type PlanningMode = 'FIXED' | 'ROTATING' | 'EXCLUDED';
export type FixedRestDayMode = 'TEMPLATE' | 'ROTATING';
export type PlanningServiceType = 'STANDARD' | 'GUARD';
export type PlanningAllocationMode =
  | 'EXACT'
  | 'RANGE'
  | 'FILL_REMAINING';
export type HistoricalServiceType =
  | PlanningServiceType
  | 'GUARD_CONTINUATION';
export type ViolationSeverity = 'HARD' | 'WARNING';

export interface WorkBlock {
  work: [string, string];
  pause?: [string, string] | null;
  tolerance: number;
}

export type SessionDefinition = Partial<Record<DayKey, WorkBlock[] | null>>;

export type WeeklyLeaveMode =
  | 'NONE'
  | 'PER_EMPLOYEE'
  | 'TEAM_ROTATION'
  | 'PER_ELIGIBLE_EMPLOYEE';


export type WeeklyLeaveCountMode = 'MINIMUM' | 'EXACT';
export type GuardPoolRelation = 'ANY' | 'MEMBER' | 'NON_MEMBER';
export type ServiceScopeMode =
  | 'ANY'
  | 'SERVICE_TYPE'
  | 'TEMPLATE'
  | 'REQUIREMENT';
export type GuardMemberServiceAccess = 'ANY_SERVICE' | 'GUARD_ONLY';
export type MembershipBalanceMode = 'NONE' | 'SOFT' | 'STRICT';

export interface EmployeePolicySelector {
  planningModes: PlanningMode[];
  guardPoolRelation: GuardPoolRelation;
}

export interface ServiceScope {
  mode: ServiceScopeMode;
  serviceTypes: PlanningServiceType[];
  templateGuids: string[];
  requirementGuids: string[];
  exclusive: boolean;
}

export interface GuardMembershipBalancePolicy {
  mode: MembershipBalanceMode;
  maxMembershipSpread: number | null;
  maxConsecutiveMembershipWeeks: number | null;
}

export type GuardTeamMode =
  | 'DAILY_FLEXIBLE'
  | 'WEEKLY_POOL';

export type GuardTeamSelectionMode =
  | 'ROTATION_ORDER'
  | 'OPTIMIZED';

export interface GuardTeamPolicy {
  mode: GuardTeamMode;
  employeesPerWeek: number;
  selectionMode: GuardTeamSelectionMode;
  rotationAnchorDate: string | null;
  completeWeeksOnly: boolean;
  requireParticipation: boolean;
  eligiblePlanningModes: PlanningMode[];
  memberServiceAccess: GuardMemberServiceAccess;
  balance: GuardMembershipBalancePolicy;
}

export interface WeeklyLeavePolicy {
  mode: WeeklyLeaveMode;
  employeesPerWeek: number;
  allowedDays: DayKey[];
  rotationAnchorDate: string | null;
  completeWeeksOnly: boolean;
  postGuardRestCountsAsLeave: boolean;
  selector: EmployeePolicySelector;
  daysPerEmployee: number;
  countMode: WeeklyLeaveCountMode;
  maxEmployeesPerDay: number | null;
  requireWorkOnOtherDays: boolean;
  serviceScope: ServiceScope;
}

export interface EngineConfig {
  minRestDaysPerWeek: number;
  maxConsecutiveWorkDays: number | null;
  maxWeeklyMinutes: number | null;
  minRestMinutesBetweenShifts: number;
  maxConsecutiveGuards: number;
  restAfterGuardRequired: boolean;
  postGuardRestDays: number;
  maxRestingEmployeesPerDay: number | null;
  fairnessWindowWeeks: number;
  strictCoverage: boolean;
  weeklyLeavePolicy: WeeklyLeavePolicy;
  guardTeamPolicy: GuardTeamPolicy;
}

export interface EngineTemplate {
  guid: string;
  name: string;
  definition: SessionDefinition;
}

export interface PlanningRequirementInput {
  guid: string;
  dayOfWeek: DayKey;
  serviceType: PlanningServiceType;
  minEmployees: number;
  targetEmployees: number;
  maxEmployees: number | null;
  priority: number;
  allocationMode: PlanningAllocationMode;
  template: EngineTemplate;
  continuationTemplate: EngineTemplate | null;
  continuationDayOffset: number;
  creditedMinutes: number | null;
  eligibility: EmployeePolicySelector;
}

export interface PlanningEmployeeInput {
  guid: string;
  name: string;
  code: string;
  mode: PlanningMode;
  rotationOrder: number | null;
  maxWeeklyMinutes: number | null;
  fixedTemplate: EngineTemplate | null;
  fixedRestDayMode: FixedRestDayMode;
}

export interface HistoricalAssignment {
  userGuid: string;
  startDate: string;
  endDate: string;
  templateGuid: string;
  templateName: string;
  definition: SessionDefinition;
  serviceType?: HistoricalServiceType;
}

export interface DayReason {
  templateName: string;
  templateGuid: string | null;
  confidence: number;
  factors: string[];
  source?:
    | 'FIXED'
    | 'GENERATED'
    | 'FILL_REMAINING'
    | 'GUARD_CONTINUATION'
    | 'POST_GUARD_REST'
    | 'WEEKLY_LEAVE'
    | 'TEMPLATE_REST'
    | 'UNASSIGNED'
    | 'REST';
}

export interface EmployeeSuggestionResult {
  userGuid: string;
  schedule: Record<string, string | null>;
  reasons: Record<string, DayReason | null>;
}

export interface PlanningViolation {
  severity: ViolationSeverity;
  code:
    | 'INVALID_REQUIREMENT_TEMPLATE'
    | 'INVALID_GUARD_CONTINUATION'
    | 'INVALID_ALLOCATION_CONFIGURATION'
    | 'FIXED_EMPLOYEE_CONSTRAINT'
    | 'MIN_COVERAGE_NOT_REACHED'
    | 'TARGET_COVERAGE_NOT_REACHED'
    | 'MAX_COVERAGE_EXCEEDED'
    | 'NO_ROTATING_EMPLOYEES'
    | 'UNCONFIGURED_EMPLOYEE'
    | 'DAILY_REST_CAP_EXCEEDED';
  date?: string;
  employeeGuid?: string;
  requirementGuid?: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface CoverageResult {
  date: string;
  dayOfWeek: DayKey;
  requirementGuid: string;
  allocationMode: PlanningAllocationMode;
  templateGuid: string;
  templateName: string;
  minimum: number;
  target: number;
  maximum: number | null;
  assigned: number;
  status: 'COVERED' | 'BELOW_TARGET' | 'BELOW_MINIMUM' | 'ABOVE_MAXIMUM';
}

export interface GuardPoolResult {
  weekFrom: string;
  weekTo: string;
  employeeGuids: string[];
  mode: GuardTeamMode;
  selectionMode: GuardTeamSelectionMode;
}

export interface WeeklyLeaveGroupResult {
  weekFrom: string;
  weekTo: string;
  employeeGuids: string[];
  leaveByEmployee: Record<string, string[]>;
  mode: WeeklyLeaveMode;
  selector: EmployeePolicySelector;
  serviceScope: ServiceScope;
}

export interface EngineDiagnostics {
  violations: PlanningViolation[];
  coverage: CoverageResult[];
  guardPools: GuardPoolResult[];
  weeklyLeaveGroups: WeeklyLeaveGroupResult[];
  fairnessScore: number;
  coverageScore: number;
}

export interface EngineResult {
  items: EmployeeSuggestionResult[];

  /**
   * Conservé pour compatibilité avec ScheduleSuggestion.conformity_score.
   * En V2, ce score mesure la qualité du planning, pas la conformité historique.
   */
  conformityScore: number;

  diagnostics: EngineDiagnostics;
}

export class PlanningInfeasibleError extends Error {
  public readonly code = 'PLANNING_SUGGESTION_INFEASIBLE';

  constructor(
    message: string,
    public readonly diagnostics: EngineDiagnostics,
  ) {
    super(message);
    this.name = 'PlanningInfeasibleError';
  }
}

interface DateInterval {
  start: number;
  end: number;
}

interface EmployeeFairnessStats {
  shifts: number;
  guards: number;
  weekends: number;
  workedMinutes: number;
  byTemplate: Map<string, number>;
  lastTemplateDate: Map<string, string>;
}

interface EmployeeState {
  workDates: Set<string>;
  guardDates: Set<string>;
  forcedRestDates: Set<string>;
  intervals: DateInterval[];
  minutesByWeek: Map<string, number>;
  plannedShifts: number;
  plannedGuards: number;
  plannedWeekends: number;
  plannedMinutes: number;
  plannedByTemplate: Map<string, number>;
}

interface CandidateEvaluation {
  eligible: boolean;
  blockers: string[];
  fairnessScore: number;
  factors: string[];
}

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function addDays(iso: string, amount: number): string {
  const date = parseDate(iso);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function periodDates(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

function isoToDayKey(iso: string): DayKey {
  const map: DayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return map[parseDate(iso).getUTCDay()]!;
}

function isWeekend(iso: string): boolean {
  const day = isoToDayKey(iso);
  return day === 'Sat' || day === 'Sun';
}

function mondayOfWeek(iso: string): string {
  const day = parseDate(iso).getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(iso, offset);
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours! * 60 + minutes!;
}

function dayBlocks(template: EngineTemplate, iso: string): WorkBlock[] {
  const value = template.definition[isoToDayKey(iso)];
  return Array.isArray(value) ? value : [];
}

function templateHasWork(template: EngineTemplate, iso: string): boolean {
  return dayBlocks(template, iso).length > 0;
}

function blockDurationMinutes(block: WorkBlock): number {
  const start = toMinutes(block.work[0]);
  let end = toMinutes(block.work[1]);

  // Prépare le moteur aux blocs traversant minuit.
  if (end <= start) end += 24 * 60;

  let total = end - start;

  if (block.pause) {
    const pauseStart = toMinutes(block.pause[0]);
    let pauseEnd = toMinutes(block.pause[1]);
    if (pauseEnd <= pauseStart) pauseEnd += 24 * 60;
    total -= pauseEnd - pauseStart;
  }

  return Math.max(0, total);
}

function templateMinutes(template: EngineTemplate, iso: string): number {
  return dayBlocks(template, iso).reduce(
    (total, block) => total + blockDurationMinutes(block),
    0,
  );
}

function requirementMinutesByDate(
  requirement: PlanningRequirementInput,
  iso: string,
): Map<string, number> {
  const result = new Map<string, number>();
  const mainActual = templateMinutes(requirement.template, iso);

  if (
    requirement.serviceType !== 'GUARD' ||
    !requirement.continuationTemplate
  ) {
    result.set(
      iso,
      requirement.creditedMinutes ?? mainActual,
    );
    return result;
  }

  const continuationDate = addDays(
    iso,
    requirement.continuationDayOffset,
  );
  const continuationActual = templateMinutes(
    requirement.continuationTemplate,
    continuationDate,
  );
  const totalActual = mainActual + continuationActual;
  const credited = requirement.creditedMinutes ?? totalActual;

  if (totalActual <= 0) {
    result.set(iso, credited);
    result.set(continuationDate, 0);
    return result;
  }

  const mainCredited = Math.round(
    credited * (mainActual / totalActual),
  );

  result.set(iso, mainCredited);
  result.set(
    continuationDate,
    credited - mainCredited,
  );
  return result;
}

function weekDates(dates: string[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const iso of dates) {
    const week = mondayOfWeek(iso);
    const current = result.get(week) ?? [];
    current.push(iso);
    result.set(week, current);
  }
  return result;
}

function templateIntervals(template: EngineTemplate, iso: string): DateInterval[] {
  const base = parseDate(iso).getTime();

  return dayBlocks(template, iso)
    .map((block) => {
      const startMinutes = toMinutes(block.work[0]);
      let endMinutes = toMinutes(block.work[1]);

      if (endMinutes <= startMinutes) endMinutes += 24 * 60;

      return {
        start: base + startMinutes * 60_000,
        end: base + endMinutes * 60_000,
      };
    })
    .sort((a, b) => a.start - b.start);
}

function activeHistoricalAssignment(
  assignments: HistoricalAssignment[],
  userGuid: string,
  iso: string,
): HistoricalAssignment | null {
  const candidates = assignments
    .filter(
      (assignment) =>
        assignment.userGuid === userGuid &&
        assignment.startDate <= iso &&
        assignment.endDate >= iso,
    )
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  return candidates[0] ?? null;
}

function createEmptyState(): EmployeeState {
  return {
    workDates: new Set(),
    guardDates: new Set(),
    forcedRestDates: new Set(),
    intervals: [],
    minutesByWeek: new Map(),
    plannedShifts: 0,
    plannedGuards: 0,
    plannedWeekends: 0,
    plannedMinutes: 0,
    plannedByTemplate: new Map(),
  };
}

function createFairnessStats(): EmployeeFairnessStats {
  return {
    shifts: 0,
    guards: 0,
    weekends: 0,
    workedMinutes: 0,
    byTemplate: new Map(),
    lastTemplateDate: new Map(),
  };
}

function buildHistoricalState(
  employees: PlanningEmployeeInput[],
  assignments: HistoricalAssignment[],
  periodFrom: string,
  fairnessWindowWeeks: number,
): {
  fairness: Map<string, EmployeeFairnessStats>;
  states: Map<string, EmployeeState>;
} {
  const fairness = new Map<string, EmployeeFairnessStats>();
  const states = new Map<string, EmployeeState>();

  for (const employee of employees) {
    fairness.set(employee.guid, createFairnessStats());
    states.set(employee.guid, createEmptyState());
  }

  const from = addDays(periodFrom, -(fairnessWindowWeeks * 7));
  const to = addDays(periodFrom, -1);

  for (const iso of periodDates(from, to)) {
    for (const employee of employees) {
      const assignment = activeHistoricalAssignment(assignments, employee.guid, iso);
      if (!assignment) continue;

      const template: EngineTemplate = {
        guid: assignment.templateGuid,
        name: assignment.templateName,
        definition: assignment.definition,
      };

      if (!templateHasWork(template, iso)) continue;

      const stats = fairness.get(employee.guid)!;
      const state = states.get(employee.guid)!;
      const minutes = templateMinutes(template, iso);

      stats.workedMinutes += minutes;
      state.intervals.push(
        ...templateIntervals(template, iso),
      );
      state.minutesByWeek.set(
        mondayOfWeek(iso),
        (state.minutesByWeek.get(
          mondayOfWeek(iso),
        ) ?? 0) + minutes,
      );

      if (
        assignment.serviceType ===
        'GUARD_CONTINUATION'
      ) {
        state.forcedRestDates.add(iso);
        continue;
      }

      stats.shifts++;
      stats.byTemplate.set(
        template.guid,
        (stats.byTemplate.get(template.guid) ?? 0) + 1,
      );
      stats.lastTemplateDate.set(
        template.guid,
        iso,
      );

      if (isWeekend(iso)) {
        stats.weekends++;
      }

      if (assignment.serviceType === 'GUARD') {
        stats.guards++;
        state.guardDates.add(iso);
      }

      state.workDates.add(iso);
    }
  }

  return { fairness, states };
}

function countConsecutiveBefore(dates: Set<string>, iso: string): number {
  let count = 0;
  let cursor = addDays(iso, -1);

  while (dates.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }

  return count;
}

function countConsecutiveAfter(dates: Set<string>, iso: string): number {
  let count = 0;
  let cursor = addDays(iso, 1);

  while (dates.has(cursor)) {
    count++;
    cursor = addDays(cursor, 1);
  }

  return count;
}

function hasEnoughRestBetweenIntervals(
  existing: DateInterval[],
  candidate: DateInterval[],
  minimumRestMinutes: number,
): boolean {
  const minimumGap = minimumRestMinutes * 60_000;

  for (const candidateInterval of candidate) {
    for (const existingInterval of existing) {
      const overlaps =
        candidateInterval.start < existingInterval.end &&
        existingInterval.start < candidateInterval.end;

      if (overlaps) return false;

      const candidateAfterExisting =
        candidateInterval.start >= existingInterval.end &&
        candidateInterval.start - existingInterval.end < minimumGap;

      const existingAfterCandidate =
        existingInterval.start >= candidateInterval.end &&
        existingInterval.start - candidateInterval.end < minimumGap;

      if (candidateAfterExisting || existingAfterCandidate) return false;
    }
  }

  return true;
}

function allocationConfigurationError(
  requirement: PlanningRequirementInput,
): string | null {
  if (
    requirement.targetEmployees <
    requirement.minEmployees
  ) {
    return 'targetEmployees must be greater than or equal to minEmployees';
  }

  if (
    requirement.maxEmployees !== null &&
    requirement.maxEmployees <
    requirement.targetEmployees
  ) {
    return 'maxEmployees must be greater than or equal to targetEmployees';
  }

  if (requirement.allocationMode === 'EXACT') {
    if (requirement.maxEmployees === null) {
      return 'EXACT requires maxEmployees';
    }

    if (
      requirement.minEmployees !==
      requirement.targetEmployees ||
      requirement.targetEmployees !==
      requirement.maxEmployees
    ) {
      return 'EXACT requires minEmployees, targetEmployees and maxEmployees to be equal';
    }
  }

  if (
    requirement.allocationMode ===
    'FILL_REMAINING' &&
    requirement.serviceType !== 'STANDARD'
  ) {
    return 'FILL_REMAINING is only allowed for a STANDARD service';
  }

  return null;
}

function evaluateCandidate(
  employee: PlanningEmployeeInput,
  state: EmployeeState,
  historical: EmployeeFairnessStats,
  requirement: PlanningRequirementInput,
  iso: string,
  config: EngineConfig,
): CandidateEvaluation {
  const blockers: string[] = [];
  const template = requirement.template;
  const continuationDate =
    requirement.serviceType === 'GUARD'
      ? addDays(iso, requirement.continuationDayOffset)
      : null;
  const continuationTemplate =
    requirement.serviceType === 'GUARD'
      ? requirement.continuationTemplate
      : null;

  const maximumWorkedDaysInWeek =
    config.weeklyLeavePolicy.mode === 'PER_EMPLOYEE'
      ? 7 - config.minRestDaysPerWeek
      : 7;
  const maxWeeklyMinutes =
    employee.maxWeeklyMinutes ?? config.maxWeeklyMinutes;

  if (state.workDates.has(iso)) {
    blockers.push('Déjà affecté à un service ce jour');
  }

  if (state.forcedRestDates.has(iso)) {
    blockers.push('Repos ou récupération obligatoire ce jour');
  }

  if (!templateHasWork(template, iso)) {
    blockers.push(
      'Le template principal ne contient aucun bloc de travail pour ce jour',
    );
  }

  if (requirement.serviceType === 'GUARD') {
    if (!continuationTemplate || continuationDate === null) {
      blockers.push(
        'La garde ne possède aucun template de continuation',
      );
    } else {
      if (requirement.continuationDayOffset !== 1) {
        blockers.push(
          'Le décalage de continuation de garde doit être égal à 1',
        );
      }

      if (
        !templateHasWork(
          continuationTemplate,
          continuationDate,
        )
      ) {
        blockers.push(
          'Le template de continuation ne contient aucun bloc de travail pour le lendemain',
        );
      }

      if (
        state.workDates.has(continuationDate) ||
        state.forcedRestDates.has(continuationDate)
      ) {
        blockers.push(
          'Le lendemain est déjà occupé ou réservé au repos',
        );
      }

      if (config.restAfterGuardRequired) {
        for (
          let offset = 1;
          offset <= config.postGuardRestDays;
          offset++
        ) {
          const restDate = addDays(
            continuationDate,
            offset,
          );
          if (
            state.workDates.has(restDate) ||
            state.forcedRestDates.has(restDate)
          ) {
            blockers.push(
              `Le repos post-garde du ${restDate} est déjà occupé`,
            );
          }
        }
      }
    }
  }

  const primaryWeek = mondayOfWeek(iso);
  const workDaysInPrimaryWeek = [
    ...state.workDates,
  ].filter(
    (date) => mondayOfWeek(date) === primaryWeek,
  ).length;

  if (
    config.weeklyLeavePolicy.mode === 'PER_EMPLOYEE' &&
    workDaysInPrimaryWeek + 1 >
    maximumWorkedDaysInWeek
  ) {
    blockers.push(
      `Minimum de ${config.minRestDaysPerWeek} jour(s) de repos hebdomadaire`,
    );
  }

  const consecutiveWorkDays =
    countConsecutiveBefore(state.workDates, iso) +
    1 +
    countConsecutiveAfter(state.workDates, iso);

  if (
    config.maxConsecutiveWorkDays !== null &&
    consecutiveWorkDays >
    config.maxConsecutiveWorkDays
  ) {
    blockers.push(
      `Maximum de ${config.maxConsecutiveWorkDays} jour(s) consécutif(s)`,
    );
  }

  const candidateMinutesByWeek =
    new Map<string, number>();

  const addCandidateMinutes = (
    date: string,
    candidateTemplate: EngineTemplate,
  ): void => {
    const week = mondayOfWeek(date);
    candidateMinutesByWeek.set(
      week,
      (candidateMinutesByWeek.get(week) ?? 0) +
      templateMinutes(candidateTemplate, date),
    );
  };

  for (const [date, minutes] of
    requirementMinutesByDate(requirement, iso)) {
    const week = mondayOfWeek(date);
    candidateMinutesByWeek.set(
      week,
      (candidateMinutesByWeek.get(week) ?? 0) + minutes,
    );
  }

  if (maxWeeklyMinutes !== null) {
    for (const [
      week,
      candidateMinutes,
    ] of candidateMinutesByWeek.entries()) {
      if (
        (state.minutesByWeek.get(week) ?? 0) +
        candidateMinutes >
        maxWeeklyMinutes
      ) {
        blockers.push(
          `Durée hebdomadaire maximale de ${maxWeeklyMinutes} minutes`,
        );
        break;
      }
    }
  }

  const candidateIntervals = [
    ...templateIntervals(template, iso),
    ...(continuationTemplate &&
    continuationDate !== null
      ? templateIntervals(
        continuationTemplate,
        continuationDate,
      )
      : []),
  ];

  if (
    !hasEnoughRestBetweenIntervals(
      state.intervals,
      candidateIntervals,
      config.minRestMinutesBetweenShifts,
    )
  ) {
    blockers.push(
      `Repos minimum de ${config.minRestMinutesBetweenShifts} minutes entre services`,
    );
  }

  if (
    requirement.serviceType === 'GUARD' &&
    countConsecutiveBefore(
      state.guardDates,
      iso,
    ) +
    1 >
    config.maxConsecutiveGuards
  ) {
    blockers.push(
      `Maximum de ${config.maxConsecutiveGuards} garde(s) consécutive(s)`,
    );
  }

  // La continuation et les jours de repos post-garde sont déjà
  // représentés dans forcedRestDates. Aucun comportement métier caché ici.

  const historicalTemplateCount =
    historical.byTemplate.get(template.guid) ?? 0;
  const plannedTemplateCount =
    state.plannedByTemplate.get(template.guid) ?? 0;

  const guardLoad =
    requirement.serviceType === 'GUARD'
      ? (historical.guards +
        state.plannedGuards) *
      120
      : 0;

  const weekendLoad = isWeekend(iso)
    ? (historical.weekends +
      state.plannedWeekends) *
    60
    : 0;

  const fairnessScore =
    (historicalTemplateCount +
      plannedTemplateCount) *
    100 +
    guardLoad +
    weekendLoad +
    (historical.shifts +
      state.plannedShifts) *
    10 +
    (historical.workedMinutes +
      state.plannedMinutes) /
    480 +
    (employee.rotationOrder ?? 0) / 10_000;

  const lastDate =
    historical.lastTemplateDate.get(template.guid);

  const factors =
    requirement.allocationMode ===
    'FILL_REMAINING'
      ? [
        'Mode FILL_REMAINING : affectation au service principal après les besoins prioritaires',
        `Créneau déjà effectué ${historicalTemplateCount + plannedTemplateCount} fois dans la fenêtre d’équité`,
        lastDate
          ? `Dernière affectation à ce créneau : ${lastDate}`
          : 'Aucune affectation récente à ce créneau',
      ]
      : [
        `Besoin configuré : minimum ${requirement.minEmployees}, cible ${requirement.targetEmployees}`,
        `Créneau déjà effectué ${historicalTemplateCount + plannedTemplateCount} fois dans la fenêtre d’équité`,
        lastDate
          ? `Dernière affectation à ce créneau : ${lastDate}`
          : 'Aucune affectation récente à ce créneau',
      ];

  if (
    requirement.serviceType === 'GUARD' &&
    continuationDate
  ) {
    factors.push(
      `Continuation automatique réservée le ${continuationDate}`,
    );
    factors.push(
      `Gardes comptabilisées : ${historical.guards + state.plannedGuards}`,
    );
  }

  if (isWeekend(iso)) {
    factors.push(
      `Week-ends comptabilisés : ${historical.weekends + state.plannedWeekends}`,
    );
  }

  return {
    eligible: blockers.length === 0,
    blockers,
    fairnessScore,
    factors,
  };
}

function applyAssignment(
  state: EmployeeState,
  template: EngineTemplate,
  serviceType: PlanningServiceType,
  iso: string,
  creditedMinutes?: number | null,
): void {
  const minutes =
    creditedMinutes ?? templateMinutes(template, iso);
  const week = mondayOfWeek(iso);

  state.workDates.add(iso);
  state.intervals.push(
    ...templateIntervals(template, iso),
  );
  state.minutesByWeek.set(
    week,
    (state.minutesByWeek.get(week) ?? 0) +
    minutes,
  );
  state.plannedShifts++;
  state.plannedMinutes += minutes;
  state.plannedByTemplate.set(
    template.guid,
    (state.plannedByTemplate.get(
      template.guid,
    ) ?? 0) + 1,
  );

  if (isWeekend(iso)) {
    state.plannedWeekends++;
  }

  if (serviceType === 'GUARD') {
    state.guardDates.add(iso);
    state.plannedGuards++;
  }
}

function applyGuardContinuation(
  state: EmployeeState,
  template: EngineTemplate,
  iso: string,
  creditedMinutes?: number | null,
): void {
  const minutes =
    creditedMinutes ?? templateMinutes(template, iso);
  const week = mondayOfWeek(iso);

  state.forcedRestDates.add(iso);
  state.intervals.push(
    ...templateIntervals(template, iso),
  );
  state.minutesByWeek.set(
    week,
    (state.minutesByWeek.get(week) ?? 0) +
    minutes,
  );
  state.plannedMinutes += minutes;
}

function countAssignedToRequirement(
  employees: PlanningEmployeeInput[],
  schedules: Map<
    string,
    Record<string, string | null>
  >,
  reasons: Map<
    string,
    Record<string, DayReason | null>
  >,
  iso: string,
  requirement: PlanningRequirementInput,
): number {
  return employees.filter((employee) => {
    if (
      schedules.get(employee.guid)?.[iso] !==
      requirement.template.guid
    ) {
      return false;
    }

    if (
      requirement.serviceType !== 'GUARD'
    ) {
      return true;
    }

    return (
      reasons.get(employee.guid)?.[iso]
        ?.source === 'GENERATED'
    );
  }).length;
}

function fairnessQuality(
  rotatingEmployees: PlanningEmployeeInput[],
  states: Map<string, EmployeeState>,
): number {
  if (rotatingEmployees.length <= 1) return 100;

  const loads = rotatingEmployees.map((employee) => {
    const state = states.get(employee.guid)!;
    return (
      state.plannedShifts +
      state.plannedGuards * 2 +
      state.plannedWeekends
    );
  });

  const spread = Math.max(...loads) - Math.min(...loads);
  return Math.max(0, Math.round(100 - spread * 12.5));
}

function coverageQuality(coverage: CoverageResult[]): number {
  if (coverage.length === 0) return 0;

  const total = coverage.reduce((sum, slot) => {
    if (slot.target === 0) return sum + 1;
    return sum + Math.min(1, slot.assigned / slot.target);
  }, 0);

  return Math.round((total / coverage.length) * 100);
}


function chooseFixedRotatingRestDates(
  employee: PlanningEmployeeInput,
  dates: string[],
  config: EngineConfig,
  restCounts: Map<string, number>,
): Set<string> {
  const result = new Set<string>();
  if (
    config.weeklyLeavePolicy.mode !== 'PER_EMPLOYEE' ||
    employee.fixedRestDayMode !== 'ROTATING' ||
    !employee.fixedTemplate ||
    config.minRestDaysPerWeek <= 0
  ) {
    return result;
  }

  const employeeSeed = [
    ...employee.guid,
  ].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  for (const [week, datesInWeek] of weekDates(dates)) {
    const candidates = datesInWeek.filter((iso) =>
      templateHasWork(employee.fixedTemplate!, iso),
    );
    const required = Math.min(
      config.minRestDaysPerWeek,
      candidates.length,
    );

    const weekSeed = Number(week.replaceAll('-', '')) +
      employeeSeed + (employee.rotationOrder ?? 0);

    candidates.sort((a, b) => {
      const countDiff =
        (restCounts.get(a) ?? 0) -
        (restCounts.get(b) ?? 0);
      if (countDiff !== 0) return countDiff;

      const aRank =
        (parseDate(a).getUTCDay() + weekSeed) % 7;
      const bRank =
        (parseDate(b).getUTCDay() + weekSeed) % 7;
      return aRank - bRank || a.localeCompare(b);
    });

    let selectedThisWeek = 0;
    for (const iso of candidates) {
      if (selectedThisWeek >= required) break;
      const maximum = config.maxRestingEmployeesPerDay;
      if (
        maximum !== null &&
        (restCounts.get(iso) ?? 0) >= maximum
      ) {
        continue;
      }
      result.add(iso);
      selectedThisWeek++;
      restCounts.set(iso, (restCounts.get(iso) ?? 0) + 1);
    }
  }

  return result;
}

export function generateSuggestion(
  employees: PlanningEmployeeInput[],
  requirements: PlanningRequirementInput[],
  historicalAssignments: HistoricalAssignment[],
  periodFrom: string,
  periodTo: string,
  config: EngineConfig,
): EngineResult {
  const dates = periodDates(periodFrom, periodTo);
  const violations: PlanningViolation[] = [];
  const coverage: CoverageResult[] = [];

  const includedEmployees = employees.filter(
    (employee) => employee.mode !== 'EXCLUDED',
  );
  const rotatingEmployees = includedEmployees.filter(
    (employee) => employee.mode === 'ROTATING',
  );
  const fixedEmployees = includedEmployees.filter(
    (employee) => employee.mode === 'FIXED',
  );

  const { fairness, states } = buildHistoricalState(
    includedEmployees,
    historicalAssignments,
    periodFrom,
    config.fairnessWindowWeeks,
  );

  const schedules = new Map<string, Record<string, string | null>>();
  const reasons = new Map<string, Record<string, DayReason | null>>();
  const restCounts = new Map<string, number>();

  for (const employee of includedEmployees) {
    schedules.set(employee.guid, {});
    reasons.set(employee.guid, {});
  }

  for (const employee of fixedEmployees) {
    if (
      employee.fixedRestDayMode !== 'TEMPLATE' ||
      !employee.fixedTemplate
    ) {
      continue;
    }

    for (const iso of dates) {
      if (!templateHasWork(employee.fixedTemplate, iso)) {
        restCounts.set(iso, (restCounts.get(iso) ?? 0) + 1);
      }
    }
  }

  // ── Passe 1 : planning fixe ───────────────────────────────────────────────
  for (const employee of fixedEmployees) {
    if (!employee.fixedTemplate) {
      violations.push({
        severity: 'HARD',
        code: 'FIXED_EMPLOYEE_CONSTRAINT',
        employeeGuid: employee.guid,
        message: `L’employé fixe ${employee.name} ne possède aucun template fixe`,
      });
      continue;
    }

    const rotatingRestDates =
      chooseFixedRotatingRestDates(
        employee,
        dates,
        config,
        restCounts,
      );

    for (const iso of dates) {
      const template = employee.fixedTemplate;

      if (
        !templateHasWork(template, iso) ||
        rotatingRestDates.has(iso)
      ) {
        schedules.get(employee.guid)![iso] = null;
        reasons.get(employee.guid)![iso] = {
          templateGuid: null,
          templateName: 'Repos',
          confidence: 100,
          source: 'FIXED',
          factors: [
            rotatingRestDates.has(iso)
              ? 'Jour de repos choisi équitablement pour cet horaire fixe'
              : 'Repos défini par le template fixe de l’employé',
          ],
        };
        continue;
      }

      // const evaluation = evaluateCandidate(
      //   employee,
      //   states.get(employee.guid)!,
      //   fairness.get(employee.guid)!,
      //   {
      //     guid: `fixed:${employee.guid}:${iso}`,
      //     dayOfWeek: isoToDayKey(iso),
      //     serviceType: 'STANDARD',
      //     minEmployees: 0,
      //     targetEmployees: 0,
      //     maxEmployees: null,
      //     priority: 0,
      //     allocationMode: 'RANGE',
      //     template,
      //     continuationTemplate: null,
      //     continuationDayOffset: 0,
      //     creditedMinutes: null,
      //   },
      //   iso,
      //   config,
      // );

      const evaluation = evaluateCandidate(
        employee,
        states.get(employee.guid)!,
        fairness.get(employee.guid)!,
        {
          guid: `fixed:${employee.guid}:${iso}`,
          dayOfWeek: isoToDayKey(iso),
          serviceType: 'STANDARD',
          minEmployees: 0,
          targetEmployees: 0,
          maxEmployees: null,
          priority: 0,
          allocationMode: 'RANGE',
          template,
          continuationTemplate: null,
          continuationDayOffset: 0,
          creditedMinutes: null,

          eligibility: {
            planningModes: ['FIXED'],
            guardPoolRelation: 'ANY',
          },
        },
        iso,
        config,
      );

      if (!evaluation.eligible) {
        violations.push({
          severity: 'HARD',
          code: 'FIXED_EMPLOYEE_CONSTRAINT',
          date: iso,
          employeeGuid: employee.guid,
          message: `Le planning fixe de ${employee.name} viole la configuration`,
          details: { blockers: evaluation.blockers },
        });
      }

      schedules.get(employee.guid)![iso] = template.guid;
      reasons.get(employee.guid)![iso] = {
        templateGuid: template.guid,
        templateName: template.name,
        confidence: 100,
        source: 'FIXED',
        factors: [
          'Planning fixe défini dans le profil de l’employé',
          ...evaluation.blockers.map((blocker) => `Attention : ${blocker}`),
        ],
      };

      applyAssignment(
        states.get(employee.guid)!,
        template,
        'STANDARD',
        iso,
      );
    }
  }

  // ── Passe 2 : besoins configurés et rotation ──────────────────────────────
  for (const iso of dates) {
    const dayOfWeek = isoToDayKey(iso);

    const dailyRequirements = requirements
      .filter((requirement) => requirement.dayOfWeek === dayOfWeek)
      .sort(
        (a, b) =>
          Number(
            a.allocationMode ===
            'FILL_REMAINING',
          ) -
          Number(
            b.allocationMode ===
            'FILL_REMAINING',
          ) ||
          a.priority - b.priority ||
          Number(b.serviceType === 'GUARD') -
          Number(a.serviceType === 'GUARD'),
      );

    for (const requirement of dailyRequirements) {
      const allocationError =
        allocationConfigurationError(requirement);

      if (allocationError) {
        violations.push({
          severity: 'HARD',
          code:
            'INVALID_ALLOCATION_CONFIGURATION',
          date: iso,
          requirementGuid: requirement.guid,
          message:
            `Configuration d’allocation invalide pour ${requirement.template.name}: ${allocationError}`,
          details: {
            allocationMode:
            requirement.allocationMode,
            minimum:
            requirement.minEmployees,
            target:
            requirement.targetEmployees,
            maximum:
            requirement.maxEmployees,
          },
        });
        continue;
      }

      if (
        requirement.serviceType === 'GUARD' &&
        (
          !requirement.continuationTemplate ||
          requirement.continuationDayOffset !== 1
        )
      ) {
        violations.push({
          severity: 'HARD',
          code: 'INVALID_GUARD_CONTINUATION',
          date: iso,
          requirementGuid: requirement.guid,
          message:
            `La garde ${requirement.template.name} ne possède pas une continuation valide au jour suivant`,
        });
        continue;
      }

      if (!templateHasWork(requirement.template, iso)) {
        violations.push({
          severity: 'HARD',
          code: 'INVALID_REQUIREMENT_TEMPLATE',
          date: iso,
          requirementGuid: requirement.guid,
          message: `Le template ${requirement.template.name} ne contient aucun horaire de travail pour ${dayOfWeek}`,
        });
        continue;
      }

      let assigned =
        countAssignedToRequirement(
          includedEmployees,
          schedules,
          reasons,
          iso,
          requirement,
        );

      const targetNeeded = Math.max(
        0,
        requirement.targetEmployees - assigned,
      );

      if (
        targetNeeded > 0 &&
        rotatingEmployees.length === 0
      ) {
        violations.push({
          severity:
            assigned < requirement.minEmployees ? 'HARD' : 'WARNING',
          code: 'NO_ROTATING_EMPLOYEES',
          date: iso,
          requirementGuid: requirement.guid,
          message: `Aucun employé rotatif disponible pour compléter ${requirement.template.name}`,
        });
      }

      const ranked = rotatingEmployees
        .filter(
          (employee) =>
            schedules.get(employee.guid)?.[iso] === undefined,
        )
        .map((employee) => ({
          employee,
          evaluation: evaluateCandidate(
            employee,
            states.get(employee.guid)!,
            fairness.get(employee.guid)!,
            requirement,
            iso,
            config,
          ),
        }))
        .filter((candidate) => candidate.evaluation.eligible)
        .sort(
          (a, b) =>
            a.evaluation.fairnessScore -
            b.evaluation.fairnessScore ||
            a.employee.guid.localeCompare(b.employee.guid),
        );

      const selectionCount =
        requirement.allocationMode ===
        'FILL_REMAINING'
          ? requirement.maxEmployees === null
            ? ranked.length
            : Math.max(
              0,
              Math.min(
                ranked.length,
                requirement.maxEmployees -
                assigned,
              ),
            )
          : Math.min(
            ranked.length,
            targetNeeded,
          );

      for (
        const candidate of ranked.slice(
        0,
        selectionCount,
      )
        ) {
        const { employee, evaluation } = candidate;

        schedules.get(employee.guid)![iso] =
          requirement.template.guid;
        reasons.get(employee.guid)![iso] = {
          templateGuid: requirement.template.guid,
          templateName: requirement.template.name,
          confidence: 90,
          source:
            requirement.allocationMode ===
            'FILL_REMAINING'
              ? 'FILL_REMAINING'
              : 'GENERATED',
          factors: [
            ...evaluation.factors,
            requirement.allocationMode ===
            'FILL_REMAINING'
              ? 'Employé encore disponible après les gardes et créneaux prioritaires'
              : 'Toutes les contraintes obligatoires ont été vérifiées',
          ],
        };

        const creditedByDate =
          requirementMinutesByDate(requirement, iso);

        applyAssignment(
          states.get(employee.guid)!,
          requirement.template,
          requirement.serviceType,
          iso,
          creditedByDate.get(iso),
        );

        if (
          requirement.serviceType === 'GUARD' &&
          requirement.continuationTemplate
        ) {
          const continuationDate = addDays(
            iso,
            requirement.continuationDayOffset,
          );

          schedules.get(employee.guid)![
            continuationDate
            ] = requirement.continuationTemplate.guid;

          reasons.get(employee.guid)![
            continuationDate
            ] = {
            templateGuid:
            requirement.continuationTemplate.guid,
            templateName:
            requirement.continuationTemplate.name,
            confidence: 100,
            source: 'GUARD_CONTINUATION',
            factors: [
              `Suite automatique de la garde commencée le ${iso}`,
              'Aucun autre service autorisé pendant cette journée de récupération',
            ],
          };

          applyGuardContinuation(
            states.get(employee.guid)!,
            requirement.continuationTemplate,
            continuationDate,
            creditedByDate.get(continuationDate),
          );

          if (config.restAfterGuardRequired) {
            for (
              let offset = 1;
              offset <= config.postGuardRestDays;
              offset++
            ) {
              const postGuardRestDate = addDays(
                continuationDate,
                offset,
              );

              states.get(employee.guid)!.forcedRestDates.add(
                postGuardRestDate,
              );

              schedules.get(employee.guid)![
                postGuardRestDate
                ] = null;
              reasons.get(employee.guid)![
                postGuardRestDate
                ] = {
                templateGuid: null,
                templateName: 'Repos post-garde',
                confidence: 100,
                source: 'POST_GUARD_REST',
                factors: [
                  `Repos complet obligatoire après la garde commencée le ${iso}`,
                  `Jour ${offset} sur ${config.postGuardRestDays} de récupération post-garde`,
                ],
              };

              if (dates.includes(postGuardRestDate)) {
                restCounts.set(
                  postGuardRestDate,
                  (restCounts.get(postGuardRestDate) ?? 0) + 1,
                );
              }
            }
          }
        }
      }

      assigned =
        countAssignedToRequirement(
          includedEmployees,
          schedules,
          reasons,
          iso,
          requirement,
        );

      let status: CoverageResult['status'] = 'COVERED';

      if (assigned < requirement.minEmployees) {
        status = 'BELOW_MINIMUM';
        violations.push({
          severity: 'HARD',
          code: 'MIN_COVERAGE_NOT_REACHED',
          date: iso,
          requirementGuid: requirement.guid,
          message: `Couverture minimale non atteinte pour ${requirement.template.name}`,
          details: {
            minimum: requirement.minEmployees,
            target: requirement.targetEmployees,
            assigned,
          },
        });
      } else if (assigned < requirement.targetEmployees) {
        status = 'BELOW_TARGET';
        violations.push({
          severity: 'WARNING',
          code: 'TARGET_COVERAGE_NOT_REACHED',
          date: iso,
          requirementGuid: requirement.guid,
          message: `Couverture cible non atteinte pour ${requirement.template.name}`,
          details: {
            target: requirement.targetEmployees,
            assigned,
          },
        });
      }

      if (
        requirement.maxEmployees !== null &&
        assigned > requirement.maxEmployees
      ) {
        status = 'ABOVE_MAXIMUM';
        violations.push({
          severity: 'HARD',
          code: 'MAX_COVERAGE_EXCEEDED',
          date: iso,
          requirementGuid: requirement.guid,
          message: `Couverture maximale dépassée pour ${requirement.template.name}`,
          details: {
            maximum: requirement.maxEmployees,
            assigned,
          },
        });
      }

      coverage.push({
        date: iso,
        dayOfWeek,
        requirementGuid: requirement.guid,
        allocationMode:
        requirement.allocationMode,
        templateGuid: requirement.template.guid,
        templateName: requirement.template.name,
        minimum: requirement.minEmployees,
        target: requirement.targetEmployees,
        maximum: requirement.maxEmployees,
        assigned,
        status,
      });
    }
  }

  // ── Passe 3 : repos explicite pour les rotatifs non affectés ──────────────
  for (const employee of rotatingEmployees) {
    for (const iso of dates) {
      if (schedules.get(employee.guid)![iso] !== undefined) continue;

      const forced = states.get(employee.guid)!.forcedRestDates.has(iso);

      schedules.get(employee.guid)![iso] = null;
      reasons.get(employee.guid)![iso] = {
        templateGuid: null,
        templateName: 'Repos',
        confidence: 100,
        source: forced ? 'POST_GUARD_REST' : 'UNASSIGNED',
        factors: [
          forced
            ? 'Repos obligatoire après une garde ou une récupération'
            : 'Aucun besoin de couverture restant compatible avec les contraintes',
        ],
      };
      restCounts.set(iso, (restCounts.get(iso) ?? 0) + 1);
    }
  }

  const fairnessScore = fairnessQuality(rotatingEmployees, states);
  if (config.maxRestingEmployeesPerDay !== null) {
    for (const iso of dates) {
      const resting = includedEmployees.filter(
        (employee) =>
          schedules.get(employee.guid)?.[iso] === null,
      ).length;

      if (resting > config.maxRestingEmployeesPerDay) {
        violations.push({
          severity: 'HARD',
          code: 'DAILY_REST_CAP_EXCEEDED',
          date: iso,
          message:
            `Maximum quotidien de ${config.maxRestingEmployeesPerDay} employé(s) au repos dépassé`,
          details: {
            maximum: config.maxRestingEmployeesPerDay,
            resting,
          },
        });
      }
    }
  }

  const coverageScore = coverageQuality(coverage);

  const diagnostics: EngineDiagnostics = {
    violations,
    coverage,
    guardPools: [],
    weeklyLeaveGroups: [],
    fairnessScore,
    coverageScore,
  };

  const hardViolations = violations.filter(
    (violation) => violation.severity === 'HARD',
  );

  const blockingViolations = hardViolations.filter(
    (violation) =>
      violation.code !== 'MIN_COVERAGE_NOT_REACHED' ||
      config.strictCoverage,
  );

  if (blockingViolations.length > 0) {
    throw new PlanningInfeasibleError(
      `Aucune solution valide : ${blockingViolations.length} contrainte(s) obligatoire(s) non satisfaite(s)`,
      diagnostics,
    );
  }

  const warningPenalty = Math.min(
    20,
    violations.filter((violation) => violation.severity === 'WARNING')
      .length * 2,
  );

  const conformityScore = Math.max(
    0,
    Math.round(coverageScore * 0.75 + fairnessScore * 0.25 - warningPenalty),
  );

  return {
    items: includedEmployees.map((employee) => ({
      userGuid: employee.guid,
      schedule: schedules.get(employee.guid) ?? {},
      reasons: reasons.get(employee.guid) ?? {},
    })),
    conformityScore,
    diagnostics,
  };
}


// // ─────────────────────────────────────────────────────────────────────────────
// // suggestion.engine.ts — V2.4 politiques génériques par population et service
// //
// // Le moteur ne déduit plus la couverture depuis l'historique.
// // Sources de vérité :
// //   1. configuration active ;
// //   2. besoins de couverture par jour et SessionTemplate ;
// //   3. profils FIXED / ROTATING / EXCLUDED.
// //
// // L'historique ne sert qu'à l'équité à long terme.
// // Aucune dépendance Express, Sequelize ou classe métier.
// // ─────────────────────────────────────────────────────────────────────────────
//
// const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
//
// export type DayKey = (typeof DAY_KEYS)[number];
// export type PlanningMode = 'FIXED' | 'ROTATING' | 'EXCLUDED';
// export type FixedRestDayMode = 'TEMPLATE' | 'ROTATING';
// export type PlanningServiceType = 'STANDARD' | 'GUARD';
// export type PlanningAllocationMode =
//   | 'EXACT'
//   | 'RANGE'
//   | 'FILL_REMAINING';
// export type HistoricalServiceType =
//   | PlanningServiceType
//   | 'GUARD_CONTINUATION';
// export type ViolationSeverity = 'HARD' | 'WARNING';
//
// export interface WorkBlock {
//   work: [string, string];
//   pause?: [string, string] | null;
//   tolerance: number;
// }
//
// export type SessionDefinition = Partial<Record<DayKey, WorkBlock[] | null>>;
//
// export type WeeklyLeaveMode =
//   | 'NONE'
//   | 'PER_EMPLOYEE'
//   | 'TEAM_ROTATION'
//   | 'PER_ELIGIBLE_EMPLOYEE';
//
//
// export type WeeklyLeaveCountMode = 'MINIMUM' | 'EXACT';
// export type GuardPoolRelation = 'ANY' | 'MEMBER' | 'NON_MEMBER';
// export type ServiceScopeMode =
//   | 'ANY'
//   | 'SERVICE_TYPE'
//   | 'TEMPLATE'
//   | 'REQUIREMENT';
// export type GuardMemberServiceAccess = 'ANY_SERVICE' | 'GUARD_ONLY';
// export type MembershipBalanceMode = 'NONE' | 'SOFT' | 'STRICT';
//
// export interface EmployeePolicySelector {
//   planningModes: PlanningMode[];
//   guardPoolRelation: GuardPoolRelation;
// }
//
// export interface ServiceScope {
//   mode: ServiceScopeMode;
//   serviceTypes: PlanningServiceType[];
//   templateGuids: string[];
//   requirementGuids: string[];
//   exclusive: boolean;
// }
//
// export interface GuardMembershipBalancePolicy {
//   mode: MembershipBalanceMode;
//   maxMembershipSpread: number | null;
//   maxConsecutiveMembershipWeeks: number | null;
// }
//
// export type GuardTeamMode =
//   | 'DAILY_FLEXIBLE'
//   | 'WEEKLY_POOL';
//
// export type GuardTeamSelectionMode =
//   | 'ROTATION_ORDER'
//   | 'OPTIMIZED';
//
// export interface GuardTeamPolicy {
//   mode: GuardTeamMode;
//   employeesPerWeek: number;
//   selectionMode: GuardTeamSelectionMode;
//   rotationAnchorDate: string | null;
//   completeWeeksOnly: boolean;
//   requireParticipation: boolean;
//   eligiblePlanningModes: PlanningMode[];
//   memberServiceAccess: GuardMemberServiceAccess;
//   balance: GuardMembershipBalancePolicy;
// }
//
// export interface WeeklyLeavePolicy {
//   mode: WeeklyLeaveMode;
//   employeesPerWeek: number;
//   allowedDays: DayKey[];
//   rotationAnchorDate: string | null;
//   completeWeeksOnly: boolean;
//   postGuardRestCountsAsLeave: boolean;
//   selector: EmployeePolicySelector;
//   daysPerEmployee: number;
//   countMode: WeeklyLeaveCountMode;
//   maxEmployeesPerDay: number | null;
//   requireWorkOnOtherDays: boolean;
//   serviceScope: ServiceScope;
// }
//
// export interface EngineConfig {
//   minRestDaysPerWeek: number;
//   maxConsecutiveWorkDays: number | null;
//   maxWeeklyMinutes: number | null;
//   minRestMinutesBetweenShifts: number;
//   maxConsecutiveGuards: number;
//   restAfterGuardRequired: boolean;
//   postGuardRestDays: number;
//   maxRestingEmployeesPerDay: number | null;
//   fairnessWindowWeeks: number;
//   strictCoverage: boolean;
//   weeklyLeavePolicy: WeeklyLeavePolicy;
//   guardTeamPolicy: GuardTeamPolicy;
// }
//
// export interface EngineTemplate {
//   guid: string;
//   name: string;
//   definition: SessionDefinition;
// }
//
// export interface PlanningRequirementInput {
//   guid: string;
//   dayOfWeek: DayKey;
//   serviceType: PlanningServiceType;
//   minEmployees: number;
//   targetEmployees: number;
//   maxEmployees: number | null;
//   priority: number;
//   allocationMode: PlanningAllocationMode;
//   template: EngineTemplate;
//   continuationTemplate: EngineTemplate | null;
//   continuationDayOffset: number;
//   creditedMinutes: number | null;
//   eligibility: EmployeePolicySelector;
// }
//
// export interface PlanningEmployeeInput {
//   guid: string;
//   name: string;
//   code: string;
//   mode: PlanningMode;
//   rotationOrder: number | null;
//   maxWeeklyMinutes: number | null;
//   fixedTemplate: EngineTemplate | null;
//   fixedRestDayMode: FixedRestDayMode;
// }
//
// export interface HistoricalAssignment {
//   userGuid: string;
//   startDate: string;
//   endDate: string;
//   templateGuid: string;
//   templateName: string;
//   definition: SessionDefinition;
//   serviceType?: HistoricalServiceType;
// }
//
// export interface DayReason {
//   templateName: string;
//   templateGuid: string | null;
//   confidence: number;
//   factors: string[];
//   source?:
//     | 'FIXED'
//     | 'GENERATED'
//     | 'FILL_REMAINING'
//     | 'GUARD_CONTINUATION'
//     | 'POST_GUARD_REST'
//     | 'WEEKLY_LEAVE'
//     | 'TEMPLATE_REST'
//     | 'UNASSIGNED'
//     | 'REST';
// }
//
// export interface EmployeeSuggestionResult {
//   userGuid: string;
//   schedule: Record<string, string | null>;
//   reasons: Record<string, DayReason | null>;
// }
//
// export interface PlanningViolation {
//   severity: ViolationSeverity;
//   code:
//     | 'INVALID_REQUIREMENT_TEMPLATE'
//     | 'INVALID_GUARD_CONTINUATION'
//     | 'INVALID_ALLOCATION_CONFIGURATION'
//     | 'FIXED_EMPLOYEE_CONSTRAINT'
//     | 'MIN_COVERAGE_NOT_REACHED'
//     | 'TARGET_COVERAGE_NOT_REACHED'
//     | 'MAX_COVERAGE_EXCEEDED'
//     | 'NO_ROTATING_EMPLOYEES'
//     | 'UNCONFIGURED_EMPLOYEE'
//     | 'DAILY_REST_CAP_EXCEEDED';
//   date?: string;
//   employeeGuid?: string;
//   requirementGuid?: string;
//   message: string;
//   details?: Record<string, unknown>;
// }
//
// export interface CoverageResult {
//   date: string;
//   dayOfWeek: DayKey;
//   requirementGuid: string;
//   allocationMode: PlanningAllocationMode;
//   templateGuid: string;
//   templateName: string;
//   minimum: number;
//   target: number;
//   maximum: number | null;
//   assigned: number;
//   status: 'COVERED' | 'BELOW_TARGET' | 'BELOW_MINIMUM' | 'ABOVE_MAXIMUM';
// }
//
// export interface GuardPoolResult {
//   weekFrom: string;
//   weekTo: string;
//   employeeGuids: string[];
//   mode: GuardTeamMode;
//   selectionMode: GuardTeamSelectionMode;
// }
//
// export interface WeeklyLeaveGroupResult {
//   weekFrom: string;
//   weekTo: string;
//   employeeGuids: string[];
//   leaveByEmployee: Record<string, string[]>;
//   mode: WeeklyLeaveMode;
//   selector: EmployeePolicySelector;
//   serviceScope: ServiceScope;
// }
//
// export interface EngineDiagnostics {
//   violations: PlanningViolation[];
//   coverage: CoverageResult[];
//   guardPools: GuardPoolResult[];
//   weeklyLeaveGroups: WeeklyLeaveGroupResult[];
//   fairnessScore: number;
//   coverageScore: number;
// }
//
// export interface EngineResult {
//   items: EmployeeSuggestionResult[];
//
//   /**
//    * Conservé pour compatibilité avec ScheduleSuggestion.conformity_score.
//    * En V2, ce score mesure la qualité du planning, pas la conformité historique.
//    */
//   conformityScore: number;
//
//   diagnostics: EngineDiagnostics;
// }
//
// export class PlanningInfeasibleError extends Error {
//   public readonly code = 'PLANNING_SUGGESTION_INFEASIBLE';
//
//   constructor(
//     message: string,
//     public readonly diagnostics: EngineDiagnostics,
//   ) {
//     super(message);
//     this.name = 'PlanningInfeasibleError';
//   }
// }
//
// interface DateInterval {
//   start: number;
//   end: number;
// }
//
// interface EmployeeFairnessStats {
//   shifts: number;
//   guards: number;
//   weekends: number;
//   workedMinutes: number;
//   byTemplate: Map<string, number>;
//   lastTemplateDate: Map<string, string>;
// }
//
// interface EmployeeState {
//   workDates: Set<string>;
//   guardDates: Set<string>;
//   forcedRestDates: Set<string>;
//   intervals: DateInterval[];
//   minutesByWeek: Map<string, number>;
//   plannedShifts: number;
//   plannedGuards: number;
//   plannedWeekends: number;
//   plannedMinutes: number;
//   plannedByTemplate: Map<string, number>;
// }
//
// interface CandidateEvaluation {
//   eligible: boolean;
//   blockers: string[];
//   fairnessScore: number;
//   factors: string[];
// }
//
// function parseDate(iso: string): Date {
//   return new Date(`${iso}T00:00:00.000Z`);
// }
//
// function addDays(iso: string, amount: number): string {
//   const date = parseDate(iso);
//   date.setUTCDate(date.getUTCDate() + amount);
//   return date.toISOString().slice(0, 10);
// }
//
// function periodDates(from: string, to: string): string[] {
//   const dates: string[] = [];
//   for (let date = from; date <= to; date = addDays(date, 1)) {
//     dates.push(date);
//   }
//   return dates;
// }
//
// function isoToDayKey(iso: string): DayKey {
//   const map: DayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//   return map[parseDate(iso).getUTCDay()]!;
// }
//
// function isWeekend(iso: string): boolean {
//   const day = isoToDayKey(iso);
//   return day === 'Sat' || day === 'Sun';
// }
//
// function mondayOfWeek(iso: string): string {
//   const day = parseDate(iso).getUTCDay();
//   const offset = day === 0 ? -6 : 1 - day;
//   return addDays(iso, offset);
// }
//
// function toMinutes(time: string): number {
//   const [hours, minutes] = time.split(':').map(Number);
//   return hours! * 60 + minutes!;
// }
//
// function dayBlocks(template: EngineTemplate, iso: string): WorkBlock[] {
//   const value = template.definition[isoToDayKey(iso)];
//   return Array.isArray(value) ? value : [];
// }
//
// function templateHasWork(template: EngineTemplate, iso: string): boolean {
//   return dayBlocks(template, iso).length > 0;
// }
//
// function blockDurationMinutes(block: WorkBlock): number {
//   const start = toMinutes(block.work[0]);
//   let end = toMinutes(block.work[1]);
//
//   // Prépare le moteur aux blocs traversant minuit.
//   if (end <= start) end += 24 * 60;
//
//   let total = end - start;
//
//   if (block.pause) {
//     const pauseStart = toMinutes(block.pause[0]);
//     let pauseEnd = toMinutes(block.pause[1]);
//     if (pauseEnd <= pauseStart) pauseEnd += 24 * 60;
//     total -= pauseEnd - pauseStart;
//   }
//
//   return Math.max(0, total);
// }
//
// function templateMinutes(template: EngineTemplate, iso: string): number {
//   return dayBlocks(template, iso).reduce(
//     (total, block) => total + blockDurationMinutes(block),
//     0,
//   );
// }
//
// function requirementMinutesByDate(
//   requirement: PlanningRequirementInput,
//   iso: string,
// ): Map<string, number> {
//   const result = new Map<string, number>();
//   const mainActual = templateMinutes(requirement.template, iso);
//
//   if (
//     requirement.serviceType !== 'GUARD' ||
//     !requirement.continuationTemplate
//   ) {
//     result.set(
//       iso,
//       requirement.creditedMinutes ?? mainActual,
//     );
//     return result;
//   }
//
//   const continuationDate = addDays(
//     iso,
//     requirement.continuationDayOffset,
//   );
//   const continuationActual = templateMinutes(
//     requirement.continuationTemplate,
//     continuationDate,
//   );
//   const totalActual = mainActual + continuationActual;
//   const credited = requirement.creditedMinutes ?? totalActual;
//
//   if (totalActual <= 0) {
//     result.set(iso, credited);
//     result.set(continuationDate, 0);
//     return result;
//   }
//
//   const mainCredited = Math.round(
//     credited * (mainActual / totalActual),
//   );
//
//   result.set(iso, mainCredited);
//   result.set(
//     continuationDate,
//     credited - mainCredited,
//   );
//   return result;
// }
//
// function weekDates(dates: string[]): Map<string, string[]> {
//   const result = new Map<string, string[]>();
//   for (const iso of dates) {
//     const week = mondayOfWeek(iso);
//     const current = result.get(week) ?? [];
//     current.push(iso);
//     result.set(week, current);
//   }
//   return result;
// }
//
// function templateIntervals(template: EngineTemplate, iso: string): DateInterval[] {
//   const base = parseDate(iso).getTime();
//
//   return dayBlocks(template, iso)
//     .map((block) => {
//       const startMinutes = toMinutes(block.work[0]);
//       let endMinutes = toMinutes(block.work[1]);
//
//       if (endMinutes <= startMinutes) endMinutes += 24 * 60;
//
//       return {
//         start: base + startMinutes * 60_000,
//         end: base + endMinutes * 60_000,
//       };
//     })
//     .sort((a, b) => a.start - b.start);
// }
//
// function activeHistoricalAssignment(
//   assignments: HistoricalAssignment[],
//   userGuid: string,
//   iso: string,
// ): HistoricalAssignment | null {
//   const candidates = assignments
//     .filter(
//       (assignment) =>
//         assignment.userGuid === userGuid &&
//         assignment.startDate <= iso &&
//         assignment.endDate >= iso,
//     )
//     .sort((a, b) => b.startDate.localeCompare(a.startDate));
//
//   return candidates[0] ?? null;
// }
//
// function createEmptyState(): EmployeeState {
//   return {
//     workDates: new Set(),
//     guardDates: new Set(),
//     forcedRestDates: new Set(),
//     intervals: [],
//     minutesByWeek: new Map(),
//     plannedShifts: 0,
//     plannedGuards: 0,
//     plannedWeekends: 0,
//     plannedMinutes: 0,
//     plannedByTemplate: new Map(),
//   };
// }
//
// function createFairnessStats(): EmployeeFairnessStats {
//   return {
//     shifts: 0,
//     guards: 0,
//     weekends: 0,
//     workedMinutes: 0,
//     byTemplate: new Map(),
//     lastTemplateDate: new Map(),
//   };
// }
//
// function buildHistoricalState(
//   employees: PlanningEmployeeInput[],
//   assignments: HistoricalAssignment[],
//   periodFrom: string,
//   fairnessWindowWeeks: number,
// ): {
//   fairness: Map<string, EmployeeFairnessStats>;
//   states: Map<string, EmployeeState>;
// } {
//   const fairness = new Map<string, EmployeeFairnessStats>();
//   const states = new Map<string, EmployeeState>();
//
//   for (const employee of employees) {
//     fairness.set(employee.guid, createFairnessStats());
//     states.set(employee.guid, createEmptyState());
//   }
//
//   const from = addDays(periodFrom, -(fairnessWindowWeeks * 7));
//   const to = addDays(periodFrom, -1);
//
//   for (const iso of periodDates(from, to)) {
//     for (const employee of employees) {
//       const assignment = activeHistoricalAssignment(assignments, employee.guid, iso);
//       if (!assignment) continue;
//
//       const template: EngineTemplate = {
//         guid: assignment.templateGuid,
//         name: assignment.templateName,
//         definition: assignment.definition,
//       };
//
//       if (!templateHasWork(template, iso)) continue;
//
//       const stats = fairness.get(employee.guid)!;
//       const state = states.get(employee.guid)!;
//       const minutes = templateMinutes(template, iso);
//
//       stats.workedMinutes += minutes;
//       state.intervals.push(
//         ...templateIntervals(template, iso),
//       );
//       state.minutesByWeek.set(
//         mondayOfWeek(iso),
//         (state.minutesByWeek.get(
//           mondayOfWeek(iso),
//         ) ?? 0) + minutes,
//       );
//
//       if (
//         assignment.serviceType ===
//         'GUARD_CONTINUATION'
//       ) {
//         state.forcedRestDates.add(iso);
//         continue;
//       }
//
//       stats.shifts++;
//       stats.byTemplate.set(
//         template.guid,
//         (stats.byTemplate.get(template.guid) ?? 0) + 1,
//       );
//       stats.lastTemplateDate.set(
//         template.guid,
//         iso,
//       );
//
//       if (isWeekend(iso)) {
//         stats.weekends++;
//       }
//
//       if (assignment.serviceType === 'GUARD') {
//         stats.guards++;
//         state.guardDates.add(iso);
//       }
//
//       state.workDates.add(iso);
//     }
//   }
//
//   return { fairness, states };
// }
//
// function countConsecutiveBefore(dates: Set<string>, iso: string): number {
//   let count = 0;
//   let cursor = addDays(iso, -1);
//
//   while (dates.has(cursor)) {
//     count++;
//     cursor = addDays(cursor, -1);
//   }
//
//   return count;
// }
//
// function countConsecutiveAfter(dates: Set<string>, iso: string): number {
//   let count = 0;
//   let cursor = addDays(iso, 1);
//
//   while (dates.has(cursor)) {
//     count++;
//     cursor = addDays(cursor, 1);
//   }
//
//   return count;
// }
//
// function hasEnoughRestBetweenIntervals(
//   existing: DateInterval[],
//   candidate: DateInterval[],
//   minimumRestMinutes: number,
// ): boolean {
//   const minimumGap = minimumRestMinutes * 60_000;
//
//   for (const candidateInterval of candidate) {
//     for (const existingInterval of existing) {
//       const overlaps =
//         candidateInterval.start < existingInterval.end &&
//         existingInterval.start < candidateInterval.end;
//
//       if (overlaps) return false;
//
//       const candidateAfterExisting =
//         candidateInterval.start >= existingInterval.end &&
//         candidateInterval.start - existingInterval.end < minimumGap;
//
//       const existingAfterCandidate =
//         existingInterval.start >= candidateInterval.end &&
//         existingInterval.start - candidateInterval.end < minimumGap;
//
//       if (candidateAfterExisting || existingAfterCandidate) return false;
//     }
//   }
//
//   return true;
// }
//
// function allocationConfigurationError(
//   requirement: PlanningRequirementInput,
// ): string | null {
//   if (
//     requirement.targetEmployees <
//     requirement.minEmployees
//   ) {
//     return 'targetEmployees must be greater than or equal to minEmployees';
//   }
//
//   if (
//     requirement.maxEmployees !== null &&
//     requirement.maxEmployees <
//     requirement.targetEmployees
//   ) {
//     return 'maxEmployees must be greater than or equal to targetEmployees';
//   }
//
//   if (requirement.allocationMode === 'EXACT') {
//     if (requirement.maxEmployees === null) {
//       return 'EXACT requires maxEmployees';
//     }
//
//     if (
//       requirement.minEmployees !==
//       requirement.targetEmployees ||
//       requirement.targetEmployees !==
//       requirement.maxEmployees
//     ) {
//       return 'EXACT requires minEmployees, targetEmployees and maxEmployees to be equal';
//     }
//   }
//
//   if (
//     requirement.allocationMode ===
//     'FILL_REMAINING' &&
//     requirement.serviceType !== 'STANDARD'
//   ) {
//     return 'FILL_REMAINING is only allowed for a STANDARD service';
//   }
//
//   return null;
// }
//
// function evaluateCandidate(
//   employee: PlanningEmployeeInput,
//   state: EmployeeState,
//   historical: EmployeeFairnessStats,
//   requirement: PlanningRequirementInput,
//   iso: string,
//   config: EngineConfig,
// ): CandidateEvaluation {
//   const blockers: string[] = [];
//   const template = requirement.template;
//   const continuationDate =
//     requirement.serviceType === 'GUARD'
//       ? addDays(iso, requirement.continuationDayOffset)
//       : null;
//   const continuationTemplate =
//     requirement.serviceType === 'GUARD'
//       ? requirement.continuationTemplate
//       : null;
//
//   const maximumWorkedDaysInWeek =
//     config.weeklyLeavePolicy.mode === 'PER_EMPLOYEE'
//       ? 7 - config.minRestDaysPerWeek
//       : 7;
//   const maxWeeklyMinutes =
//     employee.maxWeeklyMinutes ?? config.maxWeeklyMinutes;
//
//   if (state.workDates.has(iso)) {
//     blockers.push('Déjà affecté à un service ce jour');
//   }
//
//   if (state.forcedRestDates.has(iso)) {
//     blockers.push('Repos ou récupération obligatoire ce jour');
//   }
//
//   if (!templateHasWork(template, iso)) {
//     blockers.push(
//       'Le template principal ne contient aucun bloc de travail pour ce jour',
//     );
//   }
//
//   if (requirement.serviceType === 'GUARD') {
//     if (!continuationTemplate || continuationDate === null) {
//       blockers.push(
//         'La garde ne possède aucun template de continuation',
//       );
//     } else {
//       if (requirement.continuationDayOffset !== 1) {
//         blockers.push(
//           'Le décalage de continuation de garde doit être égal à 1',
//         );
//       }
//
//       if (
//         !templateHasWork(
//           continuationTemplate,
//           continuationDate,
//         )
//       ) {
//         blockers.push(
//           'Le template de continuation ne contient aucun bloc de travail pour le lendemain',
//         );
//       }
//
//       if (
//         state.workDates.has(continuationDate) ||
//         state.forcedRestDates.has(continuationDate)
//       ) {
//         blockers.push(
//           'Le lendemain est déjà occupé ou réservé au repos',
//         );
//       }
//
//       if (config.restAfterGuardRequired) {
//         for (
//           let offset = 1;
//           offset <= config.postGuardRestDays;
//           offset++
//         ) {
//           const restDate = addDays(
//             continuationDate,
//             offset,
//           );
//           if (
//             state.workDates.has(restDate) ||
//             state.forcedRestDates.has(restDate)
//           ) {
//             blockers.push(
//               `Le repos post-garde du ${restDate} est déjà occupé`,
//             );
//           }
//         }
//       }
//     }
//   }
//
//   const primaryWeek = mondayOfWeek(iso);
//   const workDaysInPrimaryWeek = [
//     ...state.workDates,
//   ].filter(
//     (date) => mondayOfWeek(date) === primaryWeek,
//   ).length;
//
//   if (
//     config.weeklyLeavePolicy.mode === 'PER_EMPLOYEE' &&
//     workDaysInPrimaryWeek + 1 >
//     maximumWorkedDaysInWeek
//   ) {
//     blockers.push(
//       `Minimum de ${config.minRestDaysPerWeek} jour(s) de repos hebdomadaire`,
//     );
//   }
//
//   const consecutiveWorkDays =
//     countConsecutiveBefore(state.workDates, iso) +
//     1 +
//     countConsecutiveAfter(state.workDates, iso);
//
//   if (
//     config.maxConsecutiveWorkDays !== null &&
//     consecutiveWorkDays >
//     config.maxConsecutiveWorkDays
//   ) {
//     blockers.push(
//       `Maximum de ${config.maxConsecutiveWorkDays} jour(s) consécutif(s)`,
//     );
//   }
//
//   const candidateMinutesByWeek =
//     new Map<string, number>();
//
//   const addCandidateMinutes = (
//     date: string,
//     candidateTemplate: EngineTemplate,
//   ): void => {
//     const week = mondayOfWeek(date);
//     candidateMinutesByWeek.set(
//       week,
//       (candidateMinutesByWeek.get(week) ?? 0) +
//       templateMinutes(candidateTemplate, date),
//     );
//   };
//
//   for (const [date, minutes] of
//     requirementMinutesByDate(requirement, iso)) {
//     const week = mondayOfWeek(date);
//     candidateMinutesByWeek.set(
//       week,
//       (candidateMinutesByWeek.get(week) ?? 0) + minutes,
//     );
//   }
//
//   if (maxWeeklyMinutes !== null) {
//     for (const [
//       week,
//       candidateMinutes,
//     ] of candidateMinutesByWeek.entries()) {
//       if (
//         (state.minutesByWeek.get(week) ?? 0) +
//         candidateMinutes >
//         maxWeeklyMinutes
//       ) {
//         blockers.push(
//           `Durée hebdomadaire maximale de ${maxWeeklyMinutes} minutes`,
//         );
//         break;
//       }
//     }
//   }
//
//   const candidateIntervals = [
//     ...templateIntervals(template, iso),
//     ...(continuationTemplate &&
//     continuationDate !== null
//       ? templateIntervals(
//         continuationTemplate,
//         continuationDate,
//       )
//       : []),
//   ];
//
//   if (
//     !hasEnoughRestBetweenIntervals(
//       state.intervals,
//       candidateIntervals,
//       config.minRestMinutesBetweenShifts,
//     )
//   ) {
//     blockers.push(
//       `Repos minimum de ${config.minRestMinutesBetweenShifts} minutes entre services`,
//     );
//   }
//
//   if (
//     requirement.serviceType === 'GUARD' &&
//     countConsecutiveBefore(
//       state.guardDates,
//       iso,
//     ) +
//     1 >
//     config.maxConsecutiveGuards
//   ) {
//     blockers.push(
//       `Maximum de ${config.maxConsecutiveGuards} garde(s) consécutive(s)`,
//     );
//   }
//
//   // La continuation et les jours de repos post-garde sont déjà
//   // représentés dans forcedRestDates. Aucun comportement métier caché ici.
//
//   const historicalTemplateCount =
//     historical.byTemplate.get(template.guid) ?? 0;
//   const plannedTemplateCount =
//     state.plannedByTemplate.get(template.guid) ?? 0;
//
//   const guardLoad =
//     requirement.serviceType === 'GUARD'
//       ? (historical.guards +
//         state.plannedGuards) *
//       120
//       : 0;
//
//   const weekendLoad = isWeekend(iso)
//     ? (historical.weekends +
//       state.plannedWeekends) *
//     60
//     : 0;
//
//   const fairnessScore =
//     (historicalTemplateCount +
//       plannedTemplateCount) *
//     100 +
//     guardLoad +
//     weekendLoad +
//     (historical.shifts +
//       state.plannedShifts) *
//     10 +
//     (historical.workedMinutes +
//       state.plannedMinutes) /
//     480 +
//     (employee.rotationOrder ?? 0) / 10_000;
//
//   const lastDate =
//     historical.lastTemplateDate.get(template.guid);
//
//   const factors =
//     requirement.allocationMode ===
//     'FILL_REMAINING'
//       ? [
//         'Mode FILL_REMAINING : affectation au service principal après les besoins prioritaires',
//         `Créneau déjà effectué ${historicalTemplateCount + plannedTemplateCount} fois dans la fenêtre d’équité`,
//         lastDate
//           ? `Dernière affectation à ce créneau : ${lastDate}`
//           : 'Aucune affectation récente à ce créneau',
//       ]
//       : [
//         `Besoin configuré : minimum ${requirement.minEmployees}, cible ${requirement.targetEmployees}`,
//         `Créneau déjà effectué ${historicalTemplateCount + plannedTemplateCount} fois dans la fenêtre d’équité`,
//         lastDate
//           ? `Dernière affectation à ce créneau : ${lastDate}`
//           : 'Aucune affectation récente à ce créneau',
//       ];
//
//   if (
//     requirement.serviceType === 'GUARD' &&
//     continuationDate
//   ) {
//     factors.push(
//       `Continuation automatique réservée le ${continuationDate}`,
//     );
//     factors.push(
//       `Gardes comptabilisées : ${historical.guards + state.plannedGuards}`,
//     );
//   }
//
//   if (isWeekend(iso)) {
//     factors.push(
//       `Week-ends comptabilisés : ${historical.weekends + state.plannedWeekends}`,
//     );
//   }
//
//   return {
//     eligible: blockers.length === 0,
//     blockers,
//     fairnessScore,
//     factors,
//   };
// }
//
// function applyAssignment(
//   state: EmployeeState,
//   template: EngineTemplate,
//   serviceType: PlanningServiceType,
//   iso: string,
//   creditedMinutes?: number | null,
// ): void {
//   const minutes =
//     creditedMinutes ?? templateMinutes(template, iso);
//   const week = mondayOfWeek(iso);
//
//   state.workDates.add(iso);
//   state.intervals.push(
//     ...templateIntervals(template, iso),
//   );
//   state.minutesByWeek.set(
//     week,
//     (state.minutesByWeek.get(week) ?? 0) +
//     minutes,
//   );
//   state.plannedShifts++;
//   state.plannedMinutes += minutes;
//   state.plannedByTemplate.set(
//     template.guid,
//     (state.plannedByTemplate.get(
//       template.guid,
//     ) ?? 0) + 1,
//   );
//
//   if (isWeekend(iso)) {
//     state.plannedWeekends++;
//   }
//
//   if (serviceType === 'GUARD') {
//     state.guardDates.add(iso);
//     state.plannedGuards++;
//   }
// }
//
// function applyGuardContinuation(
//   state: EmployeeState,
//   template: EngineTemplate,
//   iso: string,
//   creditedMinutes?: number | null,
// ): void {
//   const minutes =
//     creditedMinutes ?? templateMinutes(template, iso);
//   const week = mondayOfWeek(iso);
//
//   state.forcedRestDates.add(iso);
//   state.intervals.push(
//     ...templateIntervals(template, iso),
//   );
//   state.minutesByWeek.set(
//     week,
//     (state.minutesByWeek.get(week) ?? 0) +
//     minutes,
//   );
//   state.plannedMinutes += minutes;
// }
//
// function countAssignedToRequirement(
//   employees: PlanningEmployeeInput[],
//   schedules: Map<
//     string,
//     Record<string, string | null>
//   >,
//   reasons: Map<
//     string,
//     Record<string, DayReason | null>
//   >,
//   iso: string,
//   requirement: PlanningRequirementInput,
// ): number {
//   return employees.filter((employee) => {
//     if (
//       schedules.get(employee.guid)?.[iso] !==
//       requirement.template.guid
//     ) {
//       return false;
//     }
//
//     if (
//       requirement.serviceType !== 'GUARD'
//     ) {
//       return true;
//     }
//
//     return (
//       reasons.get(employee.guid)?.[iso]
//         ?.source === 'GENERATED'
//     );
//   }).length;
// }
//
// function fairnessQuality(
//   rotatingEmployees: PlanningEmployeeInput[],
//   states: Map<string, EmployeeState>,
// ): number {
//   if (rotatingEmployees.length <= 1) return 100;
//
//   const loads = rotatingEmployees.map((employee) => {
//     const state = states.get(employee.guid)!;
//     return (
//       state.plannedShifts +
//       state.plannedGuards * 2 +
//       state.plannedWeekends
//     );
//   });
//
//   const spread = Math.max(...loads) - Math.min(...loads);
//   return Math.max(0, Math.round(100 - spread * 12.5));
// }
//
// function coverageQuality(coverage: CoverageResult[]): number {
//   if (coverage.length === 0) return 0;
//
//   const total = coverage.reduce((sum, slot) => {
//     if (slot.target === 0) return sum + 1;
//     return sum + Math.min(1, slot.assigned / slot.target);
//   }, 0);
//
//   return Math.round((total / coverage.length) * 100);
// }
//
//
// function chooseFixedRotatingRestDates(
//   employee: PlanningEmployeeInput,
//   dates: string[],
//   config: EngineConfig,
//   restCounts: Map<string, number>,
// ): Set<string> {
//   const result = new Set<string>();
//   if (
//     config.weeklyLeavePolicy.mode !== 'PER_EMPLOYEE' ||
//     employee.fixedRestDayMode !== 'ROTATING' ||
//     !employee.fixedTemplate ||
//     config.minRestDaysPerWeek <= 0
//   ) {
//     return result;
//   }
//
//   const employeeSeed = [
//     ...employee.guid,
//   ].reduce((sum, char) => sum + char.charCodeAt(0), 0);
//
//   for (const [week, datesInWeek] of weekDates(dates)) {
//     const candidates = datesInWeek.filter((iso) =>
//       templateHasWork(employee.fixedTemplate!, iso),
//     );
//     const required = Math.min(
//       config.minRestDaysPerWeek,
//       candidates.length,
//     );
//
//     const weekSeed = Number(week.replaceAll('-', '')) +
//       employeeSeed + (employee.rotationOrder ?? 0);
//
//     candidates.sort((a, b) => {
//       const countDiff =
//         (restCounts.get(a) ?? 0) -
//         (restCounts.get(b) ?? 0);
//       if (countDiff !== 0) return countDiff;
//
//       const aRank =
//         (parseDate(a).getUTCDay() + weekSeed) % 7;
//       const bRank =
//         (parseDate(b).getUTCDay() + weekSeed) % 7;
//       return aRank - bRank || a.localeCompare(b);
//     });
//
//     let selectedThisWeek = 0;
//     for (const iso of candidates) {
//       if (selectedThisWeek >= required) break;
//       const maximum = config.maxRestingEmployeesPerDay;
//       if (
//         maximum !== null &&
//         (restCounts.get(iso) ?? 0) >= maximum
//       ) {
//         continue;
//       }
//       result.add(iso);
//       selectedThisWeek++;
//       restCounts.set(iso, (restCounts.get(iso) ?? 0) + 1);
//     }
//   }
//
//   return result;
// }
//
// export function generateSuggestion(
//   employees: PlanningEmployeeInput[],
//   requirements: PlanningRequirementInput[],
//   historicalAssignments: HistoricalAssignment[],
//   periodFrom: string,
//   periodTo: string,
//   config: EngineConfig,
// ): EngineResult {
//   const dates = periodDates(periodFrom, periodTo);
//   const violations: PlanningViolation[] = [];
//   const coverage: CoverageResult[] = [];
//
//   const includedEmployees = employees.filter(
//     (employee) => employee.mode !== 'EXCLUDED',
//   );
//   const rotatingEmployees = includedEmployees.filter(
//     (employee) => employee.mode === 'ROTATING',
//   );
//   const fixedEmployees = includedEmployees.filter(
//     (employee) => employee.mode === 'FIXED',
//   );
//
//   const { fairness, states } = buildHistoricalState(
//     includedEmployees,
//     historicalAssignments,
//     periodFrom,
//     config.fairnessWindowWeeks,
//   );
//
//   const schedules = new Map<string, Record<string, string | null>>();
//   const reasons = new Map<string, Record<string, DayReason | null>>();
//   const restCounts = new Map<string, number>();
//
//   for (const employee of includedEmployees) {
//     schedules.set(employee.guid, {});
//     reasons.set(employee.guid, {});
//   }
//
//   for (const employee of fixedEmployees) {
//     if (
//       employee.fixedRestDayMode !== 'TEMPLATE' ||
//       !employee.fixedTemplate
//     ) {
//       continue;
//     }
//
//     for (const iso of dates) {
//       if (!templateHasWork(employee.fixedTemplate, iso)) {
//         restCounts.set(iso, (restCounts.get(iso) ?? 0) + 1);
//       }
//     }
//   }
//
//   // ── Passe 1 : planning fixe ───────────────────────────────────────────────
//   for (const employee of fixedEmployees) {
//     if (!employee.fixedTemplate) {
//       violations.push({
//         severity: 'HARD',
//         code: 'FIXED_EMPLOYEE_CONSTRAINT',
//         employeeGuid: employee.guid,
//         message: `L’employé fixe ${employee.name} ne possède aucun template fixe`,
//       });
//       continue;
//     }
//
//     const rotatingRestDates =
//       chooseFixedRotatingRestDates(
//         employee,
//         dates,
//         config,
//         restCounts,
//       );
//
//     for (const iso of dates) {
//       const template = employee.fixedTemplate;
//
//       if (
//         !templateHasWork(template, iso) ||
//         rotatingRestDates.has(iso)
//       ) {
//         schedules.get(employee.guid)![iso] = null;
//         reasons.get(employee.guid)![iso] = {
//           templateGuid: null,
//           templateName: 'Repos',
//           confidence: 100,
//           source: 'FIXED',
//           factors: [
//             rotatingRestDates.has(iso)
//               ? 'Jour de repos choisi équitablement pour cet horaire fixe'
//               : 'Repos défini par le template fixe de l’employé',
//           ],
//         };
//         continue;
//       }
//
//       // const evaluation = evaluateCandidate(
//       //   employee,
//       //   states.get(employee.guid)!,
//       //   fairness.get(employee.guid)!,
//       //   {
//       //     guid: `fixed:${employee.guid}:${iso}`,
//       //     dayOfWeek: isoToDayKey(iso),
//       //     serviceType: 'STANDARD',
//       //     minEmployees: 0,
//       //     targetEmployees: 0,
//       //     maxEmployees: null,
//       //     priority: 0,
//       //     allocationMode: 'RANGE',
//       //     template,
//       //     continuationTemplate: null,
//       //     continuationDayOffset: 0,
//       //     creditedMinutes: null,
//       //   },
//       //   iso,
//       //   config,
//       // );
//
//       const evaluation = evaluateCandidate(
//         employee,
//         states.get(employee.guid)!,
//         fairness.get(employee.guid)!,
//         {
//           guid: `fixed:${employee.guid}:${iso}`,
//           dayOfWeek: isoToDayKey(iso),
//           serviceType: 'STANDARD',
//           minEmployees: 0,
//           targetEmployees: 0,
//           maxEmployees: null,
//           priority: 0,
//           allocationMode: 'RANGE',
//           template,
//           continuationTemplate: null,
//           continuationDayOffset: 0,
//           creditedMinutes: null,
//
//           eligibility: {
//             planningModes: ['FIXED'],
//             guardPoolRelation: 'ANY',
//           },
//         },
//         iso,
//         config,
//       );
//
//       if (!evaluation.eligible) {
//         violations.push({
//           severity: 'HARD',
//           code: 'FIXED_EMPLOYEE_CONSTRAINT',
//           date: iso,
//           employeeGuid: employee.guid,
//           message: `Le planning fixe de ${employee.name} viole la configuration`,
//           details: { blockers: evaluation.blockers },
//         });
//       }
//
//       schedules.get(employee.guid)![iso] = template.guid;
//       reasons.get(employee.guid)![iso] = {
//         templateGuid: template.guid,
//         templateName: template.name,
//         confidence: 100,
//         source: 'FIXED',
//         factors: [
//           'Planning fixe défini dans le profil de l’employé',
//           ...evaluation.blockers.map((blocker) => `Attention : ${blocker}`),
//         ],
//       };
//
//       applyAssignment(
//         states.get(employee.guid)!,
//         template,
//         'STANDARD',
//         iso,
//       );
//     }
//   }
//
//   // ── Passe 2 : besoins configurés et rotation ──────────────────────────────
//   for (const iso of dates) {
//     const dayOfWeek = isoToDayKey(iso);
//
//     const dailyRequirements = requirements
//       .filter((requirement) => requirement.dayOfWeek === dayOfWeek)
//       .sort(
//         (a, b) =>
//           Number(
//             a.allocationMode ===
//             'FILL_REMAINING',
//           ) -
//           Number(
//             b.allocationMode ===
//             'FILL_REMAINING',
//           ) ||
//           a.priority - b.priority ||
//           Number(b.serviceType === 'GUARD') -
//           Number(a.serviceType === 'GUARD'),
//       );
//
//     for (const requirement of dailyRequirements) {
//       const allocationError =
//         allocationConfigurationError(requirement);
//
//       if (allocationError) {
//         violations.push({
//           severity: 'HARD',
//           code:
//             'INVALID_ALLOCATION_CONFIGURATION',
//           date: iso,
//           requirementGuid: requirement.guid,
//           message:
//             `Configuration d’allocation invalide pour ${requirement.template.name}: ${allocationError}`,
//           details: {
//             allocationMode:
//             requirement.allocationMode,
//             minimum:
//             requirement.minEmployees,
//             target:
//             requirement.targetEmployees,
//             maximum:
//             requirement.maxEmployees,
//           },
//         });
//         continue;
//       }
//
//       if (
//         requirement.serviceType === 'GUARD' &&
//         (
//           !requirement.continuationTemplate ||
//           requirement.continuationDayOffset !== 1
//         )
//       ) {
//         violations.push({
//           severity: 'HARD',
//           code: 'INVALID_GUARD_CONTINUATION',
//           date: iso,
//           requirementGuid: requirement.guid,
//           message:
//             `La garde ${requirement.template.name} ne possède pas une continuation valide au jour suivant`,
//         });
//         continue;
//       }
//
//       if (!templateHasWork(requirement.template, iso)) {
//         violations.push({
//           severity: 'HARD',
//           code: 'INVALID_REQUIREMENT_TEMPLATE',
//           date: iso,
//           requirementGuid: requirement.guid,
//           message: `Le template ${requirement.template.name} ne contient aucun horaire de travail pour ${dayOfWeek}`,
//         });
//         continue;
//       }
//
//       let assigned =
//         countAssignedToRequirement(
//           includedEmployees,
//           schedules,
//           reasons,
//           iso,
//           requirement,
//         );
//
//       const targetNeeded = Math.max(
//         0,
//         requirement.targetEmployees - assigned,
//       );
//
//       if (
//         targetNeeded > 0 &&
//         rotatingEmployees.length === 0
//       ) {
//         violations.push({
//           severity:
//             assigned < requirement.minEmployees ? 'HARD' : 'WARNING',
//           code: 'NO_ROTATING_EMPLOYEES',
//           date: iso,
//           requirementGuid: requirement.guid,
//           message: `Aucun employé rotatif disponible pour compléter ${requirement.template.name}`,
//         });
//       }
//
//       const ranked = rotatingEmployees
//         .filter(
//           (employee) =>
//             schedules.get(employee.guid)?.[iso] === undefined,
//         )
//         .map((employee) => ({
//           employee,
//           evaluation: evaluateCandidate(
//             employee,
//             states.get(employee.guid)!,
//             fairness.get(employee.guid)!,
//             requirement,
//             iso,
//             config,
//           ),
//         }))
//         .filter((candidate) => candidate.evaluation.eligible)
//         .sort(
//           (a, b) =>
//             a.evaluation.fairnessScore -
//             b.evaluation.fairnessScore ||
//             a.employee.guid.localeCompare(b.employee.guid),
//         );
//
//       const selectionCount =
//         requirement.allocationMode ===
//         'FILL_REMAINING'
//           ? requirement.maxEmployees === null
//             ? ranked.length
//             : Math.max(
//               0,
//               Math.min(
//                 ranked.length,
//                 requirement.maxEmployees -
//                 assigned,
//               ),
//             )
//           : Math.min(
//             ranked.length,
//             targetNeeded,
//           );
//
//       for (
//         const candidate of ranked.slice(
//         0,
//         selectionCount,
//       )
//         ) {
//         const { employee, evaluation } = candidate;
//
//         schedules.get(employee.guid)![iso] =
//           requirement.template.guid;
//         reasons.get(employee.guid)![iso] = {
//           templateGuid: requirement.template.guid,
//           templateName: requirement.template.name,
//           confidence: 90,
//           source:
//             requirement.allocationMode ===
//             'FILL_REMAINING'
//               ? 'FILL_REMAINING'
//               : 'GENERATED',
//           factors: [
//             ...evaluation.factors,
//             requirement.allocationMode ===
//             'FILL_REMAINING'
//               ? 'Employé encore disponible après les gardes et créneaux prioritaires'
//               : 'Toutes les contraintes obligatoires ont été vérifiées',
//           ],
//         };
//
//         const creditedByDate =
//           requirementMinutesByDate(requirement, iso);
//
//         applyAssignment(
//           states.get(employee.guid)!,
//           requirement.template,
//           requirement.serviceType,
//           iso,
//           creditedByDate.get(iso),
//         );
//
//         if (
//           requirement.serviceType === 'GUARD' &&
//           requirement.continuationTemplate
//         ) {
//           const continuationDate = addDays(
//             iso,
//             requirement.continuationDayOffset,
//           );
//
//           schedules.get(employee.guid)![
//             continuationDate
//             ] = requirement.continuationTemplate.guid;
//
//           reasons.get(employee.guid)![
//             continuationDate
//             ] = {
//             templateGuid:
//             requirement.continuationTemplate.guid,
//             templateName:
//             requirement.continuationTemplate.name,
//             confidence: 100,
//             source: 'GUARD_CONTINUATION',
//             factors: [
//               `Suite automatique de la garde commencée le ${iso}`,
//               'Aucun autre service autorisé pendant cette journée de récupération',
//             ],
//           };
//
//           applyGuardContinuation(
//             states.get(employee.guid)!,
//             requirement.continuationTemplate,
//             continuationDate,
//             creditedByDate.get(continuationDate),
//           );
//
//           if (config.restAfterGuardRequired) {
//             for (
//               let offset = 1;
//               offset <= config.postGuardRestDays;
//               offset++
//             ) {
//               const postGuardRestDate = addDays(
//                 continuationDate,
//                 offset,
//               );
//
//               states.get(employee.guid)!.forcedRestDates.add(
//                 postGuardRestDate,
//               );
//
//               schedules.get(employee.guid)![
//                 postGuardRestDate
//                 ] = null;
//               reasons.get(employee.guid)![
//                 postGuardRestDate
//                 ] = {
//                 templateGuid: null,
//                 templateName: 'Repos post-garde',
//                 confidence: 100,
//                 source: 'POST_GUARD_REST',
//                 factors: [
//                   `Repos complet obligatoire après la garde commencée le ${iso}`,
//                   `Jour ${offset} sur ${config.postGuardRestDays} de récupération post-garde`,
//                 ],
//               };
//
//               if (dates.includes(postGuardRestDate)) {
//                 restCounts.set(
//                   postGuardRestDate,
//                   (restCounts.get(postGuardRestDate) ?? 0) + 1,
//                 );
//               }
//             }
//           }
//         }
//       }
//
//       assigned =
//         countAssignedToRequirement(
//           includedEmployees,
//           schedules,
//           reasons,
//           iso,
//           requirement,
//         );
//
//       let status: CoverageResult['status'] = 'COVERED';
//
//       if (assigned < requirement.minEmployees) {
//         status = 'BELOW_MINIMUM';
//         violations.push({
//           severity: 'HARD',
//           code: 'MIN_COVERAGE_NOT_REACHED',
//           date: iso,
//           requirementGuid: requirement.guid,
//           message: `Couverture minimale non atteinte pour ${requirement.template.name}`,
//           details: {
//             minimum: requirement.minEmployees,
//             target: requirement.targetEmployees,
//             assigned,
//           },
//         });
//       } else if (assigned < requirement.targetEmployees) {
//         status = 'BELOW_TARGET';
//         violations.push({
//           severity: 'WARNING',
//           code: 'TARGET_COVERAGE_NOT_REACHED',
//           date: iso,
//           requirementGuid: requirement.guid,
//           message: `Couverture cible non atteinte pour ${requirement.template.name}`,
//           details: {
//             target: requirement.targetEmployees,
//             assigned,
//           },
//         });
//       }
//
//       if (
//         requirement.maxEmployees !== null &&
//         assigned > requirement.maxEmployees
//       ) {
//         status = 'ABOVE_MAXIMUM';
//         violations.push({
//           severity: 'HARD',
//           code: 'MAX_COVERAGE_EXCEEDED',
//           date: iso,
//           requirementGuid: requirement.guid,
//           message: `Couverture maximale dépassée pour ${requirement.template.name}`,
//           details: {
//             maximum: requirement.maxEmployees,
//             assigned,
//           },
//         });
//       }
//
//       coverage.push({
//         date: iso,
//         dayOfWeek,
//         requirementGuid: requirement.guid,
//         allocationMode:
//         requirement.allocationMode,
//         templateGuid: requirement.template.guid,
//         templateName: requirement.template.name,
//         minimum: requirement.minEmployees,
//         target: requirement.targetEmployees,
//         maximum: requirement.maxEmployees,
//         assigned,
//         status,
//       });
//     }
//   }
//
//   // ── Passe 3 : repos explicite pour les rotatifs non affectés ──────────────
//   for (const employee of rotatingEmployees) {
//     for (const iso of dates) {
//       if (schedules.get(employee.guid)![iso] !== undefined) continue;
//
//       const forced = states.get(employee.guid)!.forcedRestDates.has(iso);
//
//       schedules.get(employee.guid)![iso] = null;
//       reasons.get(employee.guid)![iso] = {
//         templateGuid: null,
//         templateName: 'Repos',
//         confidence: 100,
//         source: forced ? 'POST_GUARD_REST' : 'UNASSIGNED',
//         factors: [
//           forced
//             ? 'Repos obligatoire après une garde ou une récupération'
//             : 'Aucun besoin de couverture restant compatible avec les contraintes',
//         ],
//       };
//       restCounts.set(iso, (restCounts.get(iso) ?? 0) + 1);
//     }
//   }
//
//   const fairnessScore = fairnessQuality(rotatingEmployees, states);
//   if (config.maxRestingEmployeesPerDay !== null) {
//     for (const iso of dates) {
//       const resting = includedEmployees.filter(
//         (employee) =>
//           schedules.get(employee.guid)?.[iso] === null,
//       ).length;
//
//       if (resting > config.maxRestingEmployeesPerDay) {
//         violations.push({
//           severity: 'HARD',
//           code: 'DAILY_REST_CAP_EXCEEDED',
//           date: iso,
//           message:
//             `Maximum quotidien de ${config.maxRestingEmployeesPerDay} employé(s) au repos dépassé`,
//           details: {
//             maximum: config.maxRestingEmployeesPerDay,
//             resting,
//           },
//         });
//       }
//     }
//   }
//
//   const coverageScore = coverageQuality(coverage);
//
//   const diagnostics: EngineDiagnostics = {
//     violations,
//     coverage,
//     guardPools: [],
//     weeklyLeaveGroups: [],
//     fairnessScore,
//     coverageScore,
//   };
//
//   const hardViolations = violations.filter(
//     (violation) => violation.severity === 'HARD',
//   );
//
//   const blockingViolations = hardViolations.filter(
//     (violation) =>
//       violation.code !== 'MIN_COVERAGE_NOT_REACHED' ||
//       config.strictCoverage,
//   );
//
//   if (blockingViolations.length > 0) {
//     throw new PlanningInfeasibleError(
//       `Aucune solution valide : ${blockingViolations.length} contrainte(s) obligatoire(s) non satisfaite(s)`,
//       diagnostics,
//     );
//   }
//
//   const warningPenalty = Math.min(
//     20,
//     violations.filter((violation) => violation.severity === 'WARNING')
//       .length * 2,
//   );
//
//   const conformityScore = Math.max(
//     0,
//     Math.round(coverageScore * 0.75 + fairnessScore * 0.25 - warningPenalty),
//   );
//
//   return {
//     items: includedEmployees.map((employee) => ({
//       userGuid: employee.guid,
//       schedule: schedules.get(employee.guid) ?? {},
//       reasons: reasons.get(employee.guid) ?? {},
//     })),
//     conformityScore,
//     diagnostics,
//   };
// }