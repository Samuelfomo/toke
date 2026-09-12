import { Op, Transaction } from 'sequelize';

import { TableInitializer } from '../tenant/database/db.initializer.js';
import TenantManager from '../tenant/database/db.tenant-manager.js';

import { tableName } from './response.model.js';

type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
type BulkAction = 'ASSIGN_SERVICE' | 'REST';
type ScheduleValue = string | null;
type ChangeKind = 'DIRECT' | 'GUARD_CONTINUATION' | 'POST_GUARD_REST' | 'GUARD_TAIL_CLEAR';

export interface SuggestionBulkEditPayload {
  item_guids: string[];
  period_from: string;
  period_to: string;
  /** Optional explicit dates. When provided, they take precedence over weekdays. */
  dates?: string[];
  weekdays?: DayKey[];
  action: BulkAction;
  template_guid?: string | null;
  reason?: string | null;
}

export interface SuggestionBulkEditIssue {
  code: string;
  message: string;
  severity: 'BLOCKER' | 'WARNING';
  details?: Record<string, unknown>;
  suggested_actions?: string[];
}

export interface SuggestionBulkEditChange {
  item_guid: string;
  employee_guid: string;
  employee_name: string;
  date: string;
  kind: ChangeKind;
  before_template_guid: string | null;
  after_template_guid: string | null;
  after_label: string;
}

export interface SuggestionBulkEditResult {
  suggestion_guid: string;
  affected_items: number;
  affected_cells: number;
  direct_dates: string[];
  changes: SuggestionBulkEditChange[];
  blockers: SuggestionBulkEditIssue[];
  warnings: SuggestionBulkEditIssue[];
  diagnostics: Record<string, any>;
  conformity_score: number;
  applied: boolean;
}

export class SuggestionBulkEditError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SuggestionBulkEditError';
  }
}

interface PlainItem {
  id: number;
  guid: string;
  user: number;
  schedule: Record<string, ScheduleValue>;
  reasons: Record<string, any>;
}

interface PlainUser {
  id: number;
  guid: string;
  first_name?: string | null;
  last_name?: string | null;
  employee_code?: string | null;
}

interface PlainProfile {
  user: number;
  planning_mode: 'FIXED' | 'ROTATING' | 'EXCLUDED';
  fixed_session_template?: number | null;
  max_weekly_minutes?: number | null;
  active: boolean;
}

interface PlainRequirement {
  id: number;
  guid: string;
  config: number;
  session_template: number;
  continuation_template?: number | null;
  continuation_day_offset?: number;
  day_of_week: DayKey;
  service_type: 'STANDARD' | 'GUARD';
  allocation_mode: 'EXACT' | 'RANGE' | 'FILL_REMAINING';
  min_employees: number;
  target_employees: number;
  max_employees?: number | null;
  credited_minutes?: number | null;
  eligibility_policy?: {
    planning_modes?: Array<'FIXED' | 'ROTATING'>;
    guard_pool_relation?: 'ANY' | 'MEMBER' | 'NON_MEMBER';
  } | null;
}

interface PlainTemplate {
  id: number;
  guid: string;
  name: string;
  definition: Record<string, any>;
  current?: boolean;
  active?: boolean;
  deleted_at?: Date | null;
}

const DAY_KEYS: DayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VALID_WEEKDAYS = new Set<DayKey>(DAY_KEYS);
const COVERAGE_VIOLATION_CODES = new Set([
  'MIN_COVERAGE_NOT_REACHED',
  'TARGET_COVERAGE_NOT_REACHED',
  'MAX_COVERAGE_EXCEEDED',
]);

function isIso(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
  );
}

function addDays(iso: string, amount: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function dayKey(iso: string): DayKey {
  return DAY_KEYS[new Date(`${iso}T00:00:00.000Z`).getUTCDay()]!;
}

function periodDates(from: string, to: string): string[] {
  const result: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    result.push(cursor);
  }
  return result;
}

function templateHasWork(template: PlainTemplate, iso: string): boolean {
  const blocks = template.definition?.[dayKey(iso)];
  return Array.isArray(blocks) && blocks.length > 0;
}

function templateInterval(
  template: PlainTemplate,
  iso: string,
): { start: number; end: number } | null {
  const blocks = template.definition?.[dayKey(iso)];
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  const parse = (value: string): number => {
    const [hours, minutes] = String(value).split(':').map(Number);
    return (hours * 60 + (minutes ?? 0)) * 60_000;
  };

  const base = Date.parse(`${iso}T00:00:00.000Z`);
  let firstStart = Number.POSITIVE_INFINITY;
  let lastEnd = Number.NEGATIVE_INFINITY;

  for (const block of blocks) {
    if (!Array.isArray(block?.work) || block.work.length < 2) continue;
    const start = base + parse(block.work[0]);
    let end = base + parse(block.work[1]);
    if (end <= start) end += 24 * 60 * 60_000;
    firstStart = Math.min(firstStart, start);
    lastEnd = Math.max(lastEnd, end);
  }

  if (!Number.isFinite(firstStart) || !Number.isFinite(lastEnd)) return null;
  return { start: firstStart, end: lastEnd };
}

function maximumConsecutiveWorkDays(
  schedule: Record<string, ScheduleValue>,
  from: string,
  to: string,
): number {
  let best = 0;
  let current = 0;
  for (const iso of periodDates(from, to)) {
    if (schedule[iso]) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

function restGapViolations(
  schedule: Record<string, ScheduleValue>,
  reasons: Record<string, any>,
  templates: Map<string, PlainTemplate>,
  from: string,
  to: string,
  minimumRestMinutes: number,
): Array<{ previousDate: string; nextDate: string; gapMinutes: number }> {
  if (minimumRestMinutes <= 0) return [];
  const dates = periodDates(from, to);
  const result: Array<{ previousDate: string; nextDate: string; gapMinutes: number }> = [];

  for (let index = 0; index < dates.length - 1; index++) {
    const previousDate = dates[index]!;
    const nextDate = dates[index + 1]!;
    const previousGuid = schedule[previousDate];
    const nextGuid = schedule[nextDate];
    if (!previousGuid || !nextGuid) continue;

    // A continuation 00h-08h appartient à la même garde commencée la veille.
    // Le minimum de repos ne s'applique pas entre ces deux fragments techniques.
    if (reasons[nextDate]?.source === 'GUARD_CONTINUATION') continue;

    const previousTemplate = templates.get(previousGuid);
    const nextTemplate = templates.get(nextGuid);
    if (!previousTemplate || !nextTemplate) continue;

    const previousInterval = templateInterval(previousTemplate, previousDate);
    const nextInterval = templateInterval(nextTemplate, nextDate);
    if (!previousInterval || !nextInterval) continue;

    const gapMinutes = Math.floor((nextInterval.start - previousInterval.end) / 60_000);
    if (gapMinutes < minimumRestMinutes) {
      result.push({ previousDate, nextDate, gapMinutes });
    }
  }

  return result;
}

function displayName(user: PlainUser): string {
  const value = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return value || user.employee_code || user.guid;
}

function mondayOfWeek(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  const weekday = date.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function guardPoolMembership(
  diagnostics: Record<string, any>,
  employeeGuid: string,
  iso: string,
): boolean {
  const monday = mondayOfWeek(iso);
  const pools = Array.isArray(diagnostics?.guardPools) ? diagnostics.guardPools : [];
  const pool = pools.find((entry: any) => entry?.weekFrom === monday);
  return Array.isArray(pool?.employeeGuids) && pool.employeeGuids.includes(employeeGuid);
}

function eligibilityForRequirement(
  requirement: PlainRequirement,
  profile: PlainProfile | undefined,
  diagnostics: Record<string, any>,
  employeeGuid: string,
  iso: string,
): boolean {
  if (!profile || !profile.active || profile.planning_mode === 'EXCLUDED') return false;

  const policy = requirement.eligibility_policy ?? {};
  const planningModes = Array.isArray(policy.planning_modes)
    ? policy.planning_modes
    : ['FIXED', 'ROTATING'];

  if (!planningModes.includes(profile.planning_mode as 'FIXED' | 'ROTATING')) return false;

  const relation = policy.guard_pool_relation ?? 'ANY';
  if (relation === 'ANY') return true;

  const member = guardPoolMembership(diagnostics, employeeGuid, iso);
  return relation === 'MEMBER' ? member : !member;
}

function buildManualReason(
  template: PlainTemplate | null,
  payload: SuggestionBulkEditPayload,
  kind: ChangeKind,
  originDate?: string,
  requirementGuid?: string | null,
): Record<string, any> {
  const managerReason = payload.reason?.trim();

  if (kind === 'GUARD_CONTINUATION') {
    return {
      source: 'GUARD_CONTINUATION',
      templateGuid: template?.guid ?? null,
      templateName: template?.name ?? 'Suite de garde',
      confidence: 100,
      manualLock: false,
      manualDerived: true,
      manualOriginDate: originDate ?? null,
      factors: [
        `Suite automatique de la garde définie manuellement le ${originDate}`,
        'Ajustement manuel par le manager',
        ...(managerReason ? [`Motif : ${managerReason}`] : []),
      ],
    };
  }

  if (kind === 'POST_GUARD_REST') {
    return {
      source: 'POST_GUARD_REST',
      templateGuid: null,
      templateName: 'Repos post-garde',
      confidence: 100,
      manualLock: false,
      manualDerived: true,
      manualOriginDate: originDate ?? null,
      factors: [
        `Repos obligatoire après la garde définie manuellement le ${originDate}`,
        'Ajustement manuel par le manager',
        ...(managerReason ? [`Motif : ${managerReason}`] : []),
      ],
    };
  }

  if (kind === 'GUARD_TAIL_CLEAR') {
    return {
      source: 'MANUAL',
      templateGuid: null,
      templateName: 'Non affecté',
      confidence: 100,
      manualLock: false,
      manualDerived: true,
      manualOriginDate: originDate ?? null,
      factors: [
        'Suite de garde retirée après modification de la garde source',
        'Ajustement manuel par le manager',
        ...(managerReason ? [`Motif : ${managerReason}`] : []),
      ],
    };
  }

  if (!template) {
    return {
      source: 'MANUAL',
      templateGuid: null,
      templateName: 'Repos',
      confidence: 100,
      manualLock: true,
      requirementGuid: null,
      factors: [
        'Repos défini manuellement par le manager',
        ...(managerReason ? [`Motif : ${managerReason}`] : []),
      ],
    };
  }

  return {
    source: 'MANUAL',
    templateGuid: template.guid,
    templateName: template.name,
    confidence: 100,
    manualLock: true,
    requirementGuid: requirementGuid ?? null,
    factors: [
      'Affectation modifiée manuellement par le manager',
      ...(managerReason ? [`Motif : ${managerReason}`] : []),
    ],
  };
}

function coverageStatus(
  assigned: number,
  minimum: number,
  target: number,
  maximum: number | null,
): 'COVERED' | 'BELOW_TARGET' | 'BELOW_MINIMUM' | 'ABOVE_MAXIMUM' {
  if (assigned < minimum) return 'BELOW_MINIMUM';
  if (maximum !== null && assigned > maximum) return 'ABOVE_MAXIMUM';
  if (assigned < target) return 'BELOW_TARGET';
  return 'COVERED';
}

function isHardCoverageWorsened(
  beforeAssigned: number,
  afterAssigned: number,
  minimum: number,
  maximum: number | null,
): boolean {
  if (afterAssigned < minimum) {
    if (beforeAssigned >= minimum) return true;
    return afterAssigned < beforeAssigned;
  }

  if (maximum !== null && afterAssigned > maximum) {
    if (beforeAssigned <= maximum) return true;
    return afterAssigned > beforeAssigned;
  }

  return false;
}

function warning(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  suggested_actions?: string[],
): SuggestionBulkEditIssue {
  return { code, message, severity: 'WARNING', details, suggested_actions };
}

function blocker(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  suggested_actions?: string[],
): SuggestionBulkEditIssue {
  return { code, message, severity: 'BLOCKER', details, suggested_actions };
}

function validatePayload(payload: SuggestionBulkEditPayload): void {
  if (!payload || typeof payload !== 'object') {
    throw new SuggestionBulkEditError(
      'Invalid bulk edit payload',
      'SUGGESTION_BULK_EDIT_INVALID_PAYLOAD',
      400,
    );
  }

  if (!Array.isArray(payload.item_guids) || payload.item_guids.length === 0) {
    throw new SuggestionBulkEditError(
      'item_guids must contain at least one suggestion item GUID',
      'SUGGESTION_BULK_EDIT_ITEMS_REQUIRED',
      400,
    );
  }

  if (payload.item_guids.some((guid) => typeof guid !== 'string' || !guid.trim())) {
    throw new SuggestionBulkEditError(
      'Invalid item GUID',
      'SUGGESTION_BULK_EDIT_INVALID_ITEM_GUID',
      400,
    );
  }

  if (new Set(payload.item_guids).size !== payload.item_guids.length) {
    throw new SuggestionBulkEditError(
      'item_guids cannot contain duplicates',
      'SUGGESTION_BULK_EDIT_DUPLICATE_ITEM',
      400,
    );
  }

  if (
    !isIso(payload.period_from) ||
    !isIso(payload.period_to) ||
    payload.period_from > payload.period_to
  ) {
    throw new SuggestionBulkEditError(
      'period_from and period_to must be valid YYYY-MM-DD values and period_from <= period_to',
      'SUGGESTION_BULK_EDIT_INVALID_PERIOD',
      400,
    );
  }

  if (payload.dates !== undefined) {
    if (
      !Array.isArray(payload.dates) ||
      payload.dates.length === 0 ||
      payload.dates.some((value) => !isIso(value))
    ) {
      throw new SuggestionBulkEditError(
        'dates must contain one or more valid YYYY-MM-DD values',
        'SUGGESTION_BULK_EDIT_INVALID_DATES',
        400,
      );
    }

    if (new Set(payload.dates).size !== payload.dates.length) {
      throw new SuggestionBulkEditError(
        'dates cannot contain duplicates',
        'SUGGESTION_BULK_EDIT_DUPLICATE_DATE',
        400,
      );
    }
  }

  if (payload.weekdays !== undefined) {
    if (
      !Array.isArray(payload.weekdays) ||
      payload.weekdays.some((value) => !VALID_WEEKDAYS.has(value))
    ) {
      throw new SuggestionBulkEditError(
        'weekdays contains an invalid weekday',
        'SUGGESTION_BULK_EDIT_INVALID_WEEKDAY',
        400,
      );
    }
  }

  if (!['ASSIGN_SERVICE', 'REST'].includes(payload.action)) {
    throw new SuggestionBulkEditError(
      'Invalid bulk edit action',
      'SUGGESTION_BULK_EDIT_INVALID_ACTION',
      400,
    );
  }

  if (
    payload.action === 'ASSIGN_SERVICE' &&
    (!payload.template_guid || typeof payload.template_guid !== 'string')
  ) {
    throw new SuggestionBulkEditError(
      'template_guid is required for ASSIGN_SERVICE',
      'SUGGESTION_BULK_EDIT_TEMPLATE_REQUIRED',
      400,
    );
  }

  if (payload.action === 'REST' && payload.template_guid) {
    throw new SuggestionBulkEditError(
      'template_guid must be omitted for REST',
      'SUGGESTION_BULK_EDIT_TEMPLATE_NOT_ALLOWED',
      400,
    );
  }

  if (
    payload.reason !== undefined &&
    payload.reason !== null &&
    typeof payload.reason !== 'string'
  ) {
    throw new SuggestionBulkEditError(
      'reason must be a string',
      'SUGGESTION_BULK_EDIT_INVALID_REASON',
      400,
    );
  }
}

function requireModels() {
  const SuggestionModel = TableInitializer.getModel(tableName.SCHEDULE_SUGGESTION);
  const ItemModel = TableInitializer.getModel(tableName.SCHEDULE_SUGGESTION_ITEM);
  const RequirementModel = TableInitializer.getModel(tableName.PLANNING_SUGGESTION_REQUIREMENT);
  const TemplateModel = TableInitializer.getModel(tableName.SESSION_TEMPLATES);
  const ProfileModel = TableInitializer.getModel(tableName.EMPLOYEE_PLANNING_PROFILE);
  const ConfigModel = TableInitializer.getModel(tableName.PLANNING_SUGGESTION_CONFIG);
  const UserModel = TableInitializer.getModel(tableName.USERS);

  if (
    !SuggestionModel ||
    !ItemModel ||
    !RequirementModel ||
    !TemplateModel ||
    !ProfileModel ||
    !ConfigModel ||
    !UserModel
  ) {
    throw new SuggestionBulkEditError(
      'One or more planning models are not registered',
      'SUGGESTION_BULK_EDIT_MODEL_NOT_REGISTERED',
      500,
    );
  }

  return {
    SuggestionModel,
    ItemModel,
    RequirementModel,
    TemplateModel,
    ProfileModel,
    ConfigModel,
    UserModel,
  };
}

async function buildPlan(
  suggestionGuid: string,
  payload: SuggestionBulkEditPayload,
  transaction?: Transaction,
  lockForUpdate = false,
): Promise<{
  result: SuggestionBulkEditResult;
  itemUpdates: Map<
    number,
    { schedule: Record<string, ScheduleValue>; reasons: Record<string, any> }
  >;
  suggestionId: number;
}> {
  validatePayload(payload);

  const {
    SuggestionModel,
    ItemModel,
    RequirementModel,
    TemplateModel,
    ProfileModel,
    ConfigModel,
    UserModel,
  } = requireModels();

  const suggestionInstance = await SuggestionModel.findOne({
    where: { guid: suggestionGuid, deleted_at: null },
    transaction,
    ...(lockForUpdate && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });

  if (!suggestionInstance) {
    throw new SuggestionBulkEditError('Suggestion not found', 'SUGGESTION_NOT_FOUND', 404);
  }

  const suggestion = suggestionInstance.get({ plain: true });
  if (suggestion.status !== 'draft') {
    throw new SuggestionBulkEditError(
      'Only a draft suggestion can be modified',
      'SUGGESTION_ALREADY_RESOLVED',
      409,
    );
  }

  if (payload.period_from < suggestion.period_from || payload.period_to > suggestion.period_to) {
    throw new SuggestionBulkEditError(
      'The bulk edit period must stay inside the suggestion requested period',
      'SUGGESTION_BULK_EDIT_PERIOD_OUTSIDE_SUGGESTION',
      422,
      {
        suggestion_period_from: suggestion.period_from,
        suggestion_period_to: suggestion.period_to,
      },
    );
  }

  const weekdaySet = new Set(payload.weekdays ?? []);
  const explicitDates = payload.dates ? [...payload.dates].sort() : null;

  if (explicitDates?.some((iso) => iso < payload.period_from || iso > payload.period_to)) {
    throw new SuggestionBulkEditError(
      'Every explicit date must stay inside period_from and period_to',
      'SUGGESTION_BULK_EDIT_DATE_OUTSIDE_PAYLOAD_PERIOD',
      400,
      {
        period_from: payload.period_from,
        period_to: payload.period_to,
        dates: explicitDates,
      },
    );
  }

  if (explicitDates?.some((iso) => iso < suggestion.period_from || iso > suggestion.period_to)) {
    throw new SuggestionBulkEditError(
      'Every explicit date must stay inside the suggestion requested period',
      'SUGGESTION_BULK_EDIT_DATE_OUTSIDE_SUGGESTION',
      422,
      {
        suggestion_period_from: suggestion.period_from,
        suggestion_period_to: suggestion.period_to,
        dates: explicitDates,
      },
    );
  }

  const directDates =
    explicitDates ??
    periodDates(payload.period_from, payload.period_to).filter(
      (iso) => weekdaySet.size === 0 || weekdaySet.has(dayKey(iso)),
    );

  if (directDates.length === 0) {
    throw new SuggestionBulkEditError(
      'No date matches the selected period and weekdays',
      'SUGGESTION_BULK_EDIT_NO_MATCHING_DATE',
      422,
    );
  }

  const allItemInstances = await ItemModel.findAll({
    where: { suggestion: suggestion.id, deleted_at: null },
    transaction,
    ...(lockForUpdate && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    order: [['id', 'ASC']],
  });
  const allItems: PlainItem[] = allItemInstances.map((instance: any) =>
    instance.get({ plain: true }),
  );
  const allByGuid = new Map(allItems.map((item) => [item.guid, item]));

  const selectedItems: PlainItem[] = [];
  for (const guid of payload.item_guids) {
    const item = allByGuid.get(guid);
    if (!item) {
      throw new SuggestionBulkEditError(
        `Suggestion item ${guid} does not belong to this suggestion`,
        'SUGGESTION_ITEM_NOT_FOUND',
        404,
        { item_guid: guid },
      );
    }
    selectedItems.push(item);
  }

  const userIds = [...new Set(allItems.map((item) => item.user))];
  const userInstances = await UserModel.findAll({
    where: { id: { [Op.in]: userIds } },
    transaction,
    ...(transaction ? { lock: transaction.LOCK.SHARE } : {}),
  });
  const users = new Map<number, PlainUser>(
    userInstances.map((instance: any) => {
      const user = instance.get({ plain: true }) as PlainUser;
      return [user.id, user];
    }),
  );

  const profileInstances = await ProfileModel.findAll({
    where: { user: { [Op.in]: userIds }, active: true, deleted_at: null },
    transaction,
    ...(transaction ? { lock: transaction.LOCK.SHARE } : {}),
  });
  const profiles = new Map<number, PlainProfile>(
    profileInstances.map((instance: any) => {
      const profile = instance.get({ plain: true }) as PlainProfile;
      return [profile.user, profile];
    }),
  );

  const configInstance = suggestion.config
    ? await ConfigModel.findOne({ where: { id: suggestion.config, deleted_at: null }, transaction })
    : null;
  if (!configInstance) {
    throw new SuggestionBulkEditError(
      'The configuration used by this suggestion is unavailable',
      'SUGGESTION_BULK_EDIT_CONFIG_NOT_FOUND',
      422,
    );
  }
  const config = configInstance.get({ plain: true });

  const requirementInstances = await RequirementModel.findAll({
    where: { config: suggestion.config, active: true, deleted_at: null },
    transaction,
    ...(transaction ? { lock: transaction.LOCK.SHARE } : {}),
  });
  const requirements: PlainRequirement[] = requirementInstances.map((instance: any) =>
    instance.get({ plain: true }),
  );

  // Manual planning is a manager action, not a solver-only action.
  // Load every current session template so the manager is not limited to services
  // referenced by the active suggestion requirements.
  const templateInstances = await TemplateModel.findAll({
    where: { current: true, deleted_at: null },
    transaction,
    ...(transaction ? { lock: transaction.LOCK.SHARE } : {}),
  });
  const templatesById = new Map<number, PlainTemplate>();
  const templatesByGuid = new Map<string, PlainTemplate>();
  for (const instance of templateInstances as any[]) {
    const template = instance.get({ plain: true }) as PlainTemplate;
    templatesById.set(template.id, template);
    templatesByGuid.set(template.guid, template);
  }

  const diagnostics: Record<string, any> = suggestion.diagnostics ?? {};
  const blockers: SuggestionBulkEditIssue[] = [];
  const warnings: SuggestionBulkEditIssue[] = [];
  const changes: SuggestionBulkEditChange[] = [];

  const targetTemplate =
    payload.action === 'ASSIGN_SERVICE'
      ? (templatesByGuid.get(payload.template_guid!) ?? null)
      : null;

  if (payload.action === 'ASSIGN_SERVICE' && !targetTemplate) {
    throw new SuggestionBulkEditError(
      'The selected session template does not exist, is no longer current, or was deleted',
      'SUGGESTION_BULK_EDIT_TEMPLATE_NOT_FOUND',
      422,
      { template_guid: payload.template_guid },
    );
  }

  const simulated = new Map<
    number,
    { schedule: Record<string, ScheduleValue>; reasons: Record<string, any> }
  >();
  for (const item of allItems) {
    simulated.set(item.id, {
      schedule: { ...(item.schedule ?? {}) },
      reasons: { ...(item.reasons ?? {}) },
    });
  }

  const guardRequirementByDateAndItem = new Map<string, PlainRequirement>();

  const findRequirement = (
    item: PlainItem,
    iso: string,
    templateGuid: string,
  ): PlainRequirement | null => {
    const user = users.get(item.user);
    const profile = profiles.get(item.user);
    if (!user) return null;

    const allMatches = requirements.filter((requirement) => {
      if (requirement.day_of_week !== dayKey(iso)) return false;
      const template = templatesById.get(requirement.session_template);
      return Boolean(template && template.guid === templateGuid);
    });

    const eligibleMatches = profile
      ? allMatches.filter((requirement) =>
          eligibilityForRequirement(requirement, profile, diagnostics, user.guid, iso),
        )
      : [];

    if (allMatches.length === 0 && profile?.planning_mode === 'FIXED') {
      const fixedTemplate = profile.fixed_session_template
        ? templatesById.get(profile.fixed_session_template)
        : null;
      if (fixedTemplate?.guid === templateGuid) {
        return {
          id: -item.user,
          guid: `FIXED_PROFILE_${item.user}_${dayKey(iso)}`,
          config: suggestion.config,
          session_template: fixedTemplate.id,
          continuation_template: null,
          continuation_day_offset: 0,
          day_of_week: dayKey(iso),
          service_type: 'STANDARD',
          allocation_mode: 'RANGE',
          min_employees: 0,
          target_employees: 0,
          max_employees: null,
          eligibility_policy: {
            planning_modes: ['FIXED'],
            guard_pool_relation: 'ANY',
          },
        };
      }
    }

    if (allMatches.length === 0) return null;

    if (eligibleMatches.length === 0) {
      warnings.push(
        warning(
          'SUGGESTION_MANUAL_SERVICE_OUTSIDE_EMPLOYEE_POLICY',
          `${displayName(user)} ne correspond pas à la population prévue par le moteur pour ce service le ${iso}. La décision managériale reste applicable.`,
          {
            item_guid: item.guid,
            employee_guid: user.guid,
            date: iso,
            template_guid: templateGuid,
            requirement_guids: allMatches.map((entry) => entry.guid),
          },
          [
            'Vérifier que cette dérogation correspond bien à la situation réelle.',
            'Ajuster ensuite le profil ou les besoins du moteur si cette organisation devient habituelle.',
          ],
        ),
      );
    }

    const candidates = eligibleMatches.length > 0 ? eligibleMatches : allMatches;

    if (candidates.length > 1) {
      const signatures = new Set(
        candidates.map((entry) =>
          [
            entry.service_type,
            entry.continuation_template ?? null,
            entry.continuation_day_offset ?? 0,
          ].join(':'),
        ),
      );

      if (signatures.size > 1) {
        blockers.push(
          blocker(
            'SUGGESTION_MANUAL_SERVICE_TECHNICALLY_AMBIGUOUS',
            `Le service « ${templatesByGuid.get(templateGuid)?.name ?? templateGuid} » correspond à plusieurs définitions techniques incompatibles le ${iso}.`,
            {
              item_guid: item.guid,
              employee_guid: user.guid,
              date: iso,
              requirement_guids: candidates.map((entry) => entry.guid),
            },
            [
              'Corriger les besoins qui utilisent le même service avec des comportements de garde différents.',
            ],
          ),
        );
        return null;
      }

      warnings.push(
        warning(
          'SUGGESTION_MANUAL_REQUIREMENT_AMBIGUOUS',
          `Plusieurs besoins du moteur correspondent à ce service le ${iso}. Toké applique la décision manuelle et utilise une définition technique équivalente.`,
          {
            item_guid: item.guid,
            employee_guid: user.guid,
            date: iso,
            requirement_guids: candidates.map((entry) => entry.guid),
          },
        ),
      );
    }

    return candidates[0] ?? null;
  };

  const clearPreviousGuardTail = (item: PlainItem, iso: string): void => {
    const state = simulated.get(item.id)!;
    const currentGuid = state.schedule[iso];
    if (!currentGuid) return;

    const oldGuardRequirement = findRequirement(item, iso, currentGuid);
    if (!oldGuardRequirement || oldGuardRequirement.service_type !== 'GUARD') return;

    let cursor = addDays(iso, oldGuardRequirement.continuation_day_offset ?? 1);
    const continuationReason = state.reasons[cursor];
    if (continuationReason?.source === 'GUARD_CONTINUATION') {
      const before = state.schedule[cursor] ?? null;
      state.schedule[cursor] = null;
      state.reasons[cursor] = buildManualReason(null, payload, 'GUARD_TAIL_CLEAR', iso);
      const user = users.get(item.user)!;
      changes.push({
        item_guid: item.guid,
        employee_guid: user.guid,
        employee_name: displayName(user),
        date: cursor,
        kind: 'GUARD_TAIL_CLEAR',
        before_template_guid: before,
        after_template_guid: null,
        after_label: 'Non affecté',
      });

      for (let offset = 1; offset <= 32; offset++) {
        cursor = addDays(cursor, 1);
        if (state.reasons[cursor]?.source !== 'POST_GUARD_REST') break;
        const beforeRest = state.schedule[cursor] ?? null;
        state.schedule[cursor] = null;
        state.reasons[cursor] = buildManualReason(null, payload, 'GUARD_TAIL_CLEAR', iso);
        changes.push({
          item_guid: item.guid,
          employee_guid: user.guid,
          employee_name: displayName(user),
          date: cursor,
          kind: 'GUARD_TAIL_CLEAR',
          before_template_guid: beforeRest,
          after_template_guid: null,
          after_label: 'Non affecté',
        });
      }
    }
  };

  for (const item of selectedItems) {
    const user = users.get(item.user);
    const profile = profiles.get(item.user);

    if (!user) {
      blockers.push(
        blocker(
          'SUGGESTION_MANUAL_EMPLOYEE_NOT_FOUND',
          `Le collaborateur lié à l’item ${item.guid} n’existe plus.`,
          { item_guid: item.guid },
          ['Actualiser ou régénérer la suggestion avant de poursuivre.'],
        ),
      );
      continue;
    }

    if (!profile || !profile.active || profile.planning_mode === 'EXCLUDED') {
      warnings.push(
        warning(
          'SUGGESTION_MANUAL_EMPLOYEE_OUTSIDE_PLANNING_PROFILE',
          `${displayName(user)} n’a pas de profil planifiable actif selon le moteur. Le manager peut néanmoins définir son planning manuellement.`,
          {
            item_guid: item.guid,
            employee_guid: user.guid,
            planning_mode: profile?.planning_mode ?? null,
            profile_active: profile?.active ?? false,
          },
          [
            'Vérifier que cette décision correspond à la situation réelle de l’entreprise.',
            'Mettre à jour le profil si ce changement devient durable.',
          ],
        ),
      );
    }

    for (const iso of directDates) {
      const state = simulated.get(item.id)!;
      const before = state.schedule[iso] ?? null;

      if (payload.action === 'ASSIGN_SERVICE') {
        const blockerCountBeforeRequirement = blockers.length;
        const requirement = findRequirement(item, iso, targetTemplate!.guid);
        if (!requirement && blockers.length > blockerCountBeforeRequirement) {
          // Ambiguïté technique réelle : impossible de déterminer correctement
          // la sémantique (notamment une éventuelle continuation de garde).
          continue;
        }

        if (!requirement) {
          warnings.push(
            warning(
              'SUGGESTION_MANUAL_SERVICE_OUTSIDE_ENGINE_REQUIREMENTS',
              `Le service « ${targetTemplate!.name} » n’est pas prévu par les besoins du moteur pour le ${iso}. La décision managériale sera quand même appliquée.`,
              {
                item_guid: item.guid,
                employee_guid: user.guid,
                date: iso,
                template_guid: targetTemplate!.guid,
              },
              [
                'Vérifier que ce service correspond bien à l’organisation réelle.',
                'Créer ou ajuster un besoin de couverture si ce service doit devenir une règle régulière.',
              ],
            ),
          );
        }

        if (!templateHasWork(targetTemplate!, iso)) {
          blockers.push(
            blocker(
              'SUGGESTION_BULK_EDIT_TEMPLATE_DAY_INVALID',
              `Le service « ${targetTemplate!.name} » ne contient aucun horaire pour ${dayKey(iso)}.`,
              { date: iso, template_guid: targetTemplate!.guid },
              ['Corriger le modèle horaire ou choisir un autre service.'],
            ),
          );
          continue;
        }

        if (before !== targetTemplate!.guid) {
          clearPreviousGuardTail(item, iso);
          state.schedule[iso] = targetTemplate!.guid;
          state.reasons[iso] = buildManualReason(
            targetTemplate!,
            payload,
            'DIRECT',
            undefined,
            requirement?.guid ?? null,
          );
          changes.push({
            item_guid: item.guid,
            employee_guid: user.guid,
            employee_name: displayName(user),
            date: iso,
            kind: 'DIRECT',
            before_template_guid: before,
            after_template_guid: targetTemplate!.guid,
            after_label: targetTemplate!.name,
          });
        }

        if (requirement?.service_type === 'GUARD') {
          const key = `${item.id}:${iso}`;
          guardRequirementByDateAndItem.set(key, requirement);

          const continuationTemplate = requirement.continuation_template
            ? templatesById.get(requirement.continuation_template)
            : null;
          const continuationDate = addDays(iso, requirement.continuation_day_offset ?? 1);
          const postGuardRestDays = config.rest_after_guard_required
            ? Number(config.post_guard_rest_days ?? 1)
            : 0;
          const tailEnd = addDays(continuationDate, postGuardRestDays);
          const maximumRepresentableContinuationDate = addDays(suggestion.period_to, 1);

          // The storage/publication model can represent the technical continuation
          // on periodTo + 1. Anything beyond that is structurally impossible.
          if (continuationDate > maximumRepresentableContinuationDate) {
            blockers.push(
              blocker(
                'SUGGESTION_MANUAL_GUARD_CONTINUATION_OUTSIDE_MODEL',
                `La continuation technique de la garde du ${iso} tombe trop loin après la période de la suggestion.`,
                {
                  item_guid: item.guid,
                  employee_guid: user.guid,
                  guard_date: iso,
                  continuation_date: continuationDate,
                  maximum_representable_date: maximumRepresentableContinuationDate,
                },
                ['Choisir une autre date ou étendre la période de la suggestion.'],
              ),
            );
            continue;
          }

          if (tailEnd > suggestion.period_to) {
            warnings.push(
              warning(
                'SUGGESTION_MANUAL_GUARD_REST_OUTSIDE_PERIOD',
                `Une partie du repos post-garde attendu après la garde du ${iso} dépasse la période. Toké conserve la garde et sa continuation, mais ne forcera pas les jours situés hors période.`,
                {
                  item_guid: item.guid,
                  employee_guid: user.guid,
                  guard_date: iso,
                  continuation_date: continuationDate,
                  expected_tail_end: tailEnd,
                  suggestion_period_to: suggestion.period_to,
                },
                ['Tenir compte manuellement du repos après la fin de cette suggestion.'],
              ),
            );
          }

          if (!continuationTemplate || !templateHasWork(continuationTemplate, continuationDate)) {
            blockers.push(
              blocker(
                'SUGGESTION_BULK_EDIT_GUARD_CONTINUATION_INVALID',
                `La garde du ${iso} ne possède pas de continuation valide le ${continuationDate}.`,
                { requirement_guid: requirement.guid, guard_date: iso },
                ['Corriger le besoin de garde et son modèle de continuation.'],
              ),
            );
            continue;
          }

          if (directDates.includes(continuationDate) && payload.action === 'ASSIGN_SERVICE') {
            blockers.push(
              blocker(
                'SUGGESTION_BULK_EDIT_GUARD_SELECTION_OVERLAP',
                `La sélection demande aussi une affectation directe le ${continuationDate}, alors que cette journée est réservée à la continuation de la garde du ${iso}.`,
                { employee_guid: user.guid, guard_date: iso, continuation_date: continuationDate },
                ['Retirer ce jour de la sélection ou réduire la plage de modification.'],
              ),
            );
            continue;
          }

          const continuationBefore = state.schedule[continuationDate] ?? null;
          state.schedule[continuationDate] = continuationTemplate.guid;
          state.reasons[continuationDate] = buildManualReason(
            continuationTemplate,
            payload,
            'GUARD_CONTINUATION',
            iso,
          );
          if (continuationBefore !== continuationTemplate.guid) {
            changes.push({
              item_guid: item.guid,
              employee_guid: user.guid,
              employee_name: displayName(user),
              date: continuationDate,
              kind: 'GUARD_CONTINUATION',
              before_template_guid: continuationBefore,
              after_template_guid: continuationTemplate.guid,
              after_label: continuationTemplate.name,
            });
          }

          for (let offset = 1; offset <= postGuardRestDays; offset++) {
            const restDate = addDays(continuationDate, offset);
            if (restDate > suggestion.period_to) {
              continue;
            }

            if (directDates.includes(restDate)) {
              warnings.push(
                warning(
                  'SUGGESTION_MANUAL_GUARD_REST_OVERRIDDEN',
                  `Le ${restDate} fait normalement partie du repos post-garde après la garde du ${iso}, mais il est explicitement ciblé par la décision du manager. L’affectation manuelle est prioritaire.`,
                  { employee_guid: user.guid, guard_date: iso, rest_date: restDate },
                  ['Vérifier que cette dérogation est volontaire avant d’appliquer.'],
                ),
              );
              continue;
            }

            const restBefore = state.schedule[restDate] ?? null;
            const restReasonBefore = state.reasons[restDate];
            state.schedule[restDate] = null;
            state.reasons[restDate] = buildManualReason(null, payload, 'POST_GUARD_REST', iso);
            if (restBefore !== null || restReasonBefore?.source !== 'POST_GUARD_REST') {
              changes.push({
                item_guid: item.guid,
                employee_guid: user.guid,
                employee_name: displayName(user),
                date: restDate,
                kind: 'POST_GUARD_REST',
                before_template_guid: restBefore,
                after_template_guid: null,
                after_label: 'Repos post-garde',
              });
            }
          }
        }
      } else {
        if (before !== null || state.reasons[iso]?.source !== 'MANUAL') {
          clearPreviousGuardTail(item, iso);
          state.schedule[iso] = null;
          state.reasons[iso] = buildManualReason(null, payload, 'DIRECT');
          changes.push({
            item_guid: item.guid,
            employee_guid: user.guid,
            employee_name: displayName(user),
            date: iso,
            kind: 'DIRECT',
            before_template_guid: before,
            after_template_guid: null,
            after_label: 'Repos',
          });
        }
      }
    }
  }

  // Deterministic employee-level checks. We compare before/after so an old
  // problem does not prevent an incremental correction unless the manager makes
  // it worse.
  const maximumWorkDays =
    config.max_consecutive_work_days === null || config.max_consecutive_work_days === undefined
      ? null
      : Number(config.max_consecutive_work_days);
  const minimumRestMinutes = Number(config.min_rest_minutes_between_shifts ?? 0);

  for (const item of selectedItems) {
    const user = users.get(item.user);
    if (!user) continue;
    const state = simulated.get(item.id)!;

    if (maximumWorkDays !== null && maximumWorkDays > 0) {
      const beforeMaximum = maximumConsecutiveWorkDays(
        item.schedule ?? {},
        suggestion.period_from,
        suggestion.period_to,
      );
      const afterMaximum = maximumConsecutiveWorkDays(
        state.schedule,
        suggestion.period_from,
        suggestion.period_to,
      );

      if (afterMaximum > maximumWorkDays && afterMaximum > beforeMaximum) {
        warnings.push(
          warning(
            'SUGGESTION_MANUAL_MAX_CONSECUTIVE_WORK_DAYS',
            `La modification ferait travailler ${displayName(user)} ${afterMaximum} jours consécutifs, au-delà de la limite de ${maximumWorkDays}.`,
            {
              item_guid: item.guid,
              employee_guid: user.guid,
              before_maximum: beforeMaximum,
              after_maximum: afterMaximum,
              configured_maximum: maximumWorkDays,
            },
            ['Réduire la période de modification.', 'Ajouter un jour de repos dans la séquence.'],
          ),
        );
      }
    }

    if (minimumRestMinutes > 0) {
      const beforeViolations = restGapViolations(
        item.schedule ?? {},
        item.reasons ?? {},
        templatesByGuid,
        suggestion.period_from,
        suggestion.period_to,
        minimumRestMinutes,
      );
      const beforeKeys = new Set(
        beforeViolations.map((entry) => `${entry.previousDate}:${entry.nextDate}`),
      );
      const afterViolations = restGapViolations(
        state.schedule,
        state.reasons,
        templatesByGuid,
        suggestion.period_from,
        suggestion.period_to,
        minimumRestMinutes,
      );

      for (const violation of afterViolations) {
        const key = `${violation.previousDate}:${violation.nextDate}`;
        if (beforeKeys.has(key)) continue;
        warnings.push(
          warning(
            'SUGGESTION_MANUAL_MIN_REST_BETWEEN_SHIFTS',
            `La modification ne laisserait que ${violation.gapMinutes} min de repos à ${displayName(user)} entre le ${violation.previousDate} et le ${violation.nextDate}, au lieu de ${minimumRestMinutes} min.`,
            {
              item_guid: item.guid,
              employee_guid: user.guid,
              previous_date: violation.previousDate,
              next_date: violation.nextDate,
              gap_minutes: violation.gapMinutes,
              minimum_rest_minutes: minimumRestMinutes,
            },
            ['Choisir un autre service.', 'Ajouter un repos entre les deux services.'],
          ),
        );
      }
    }
  }

  // Recompute coverage against the complete simulated draft.
  // Coverage rules guide the manager but never veto a manual business decision.
  const impactedDates = new Set(changes.map((entry) => entry.date));
  const previousCoverage = Array.isArray(diagnostics.coverage) ? diagnostics.coverage : [];
  const requirementByGuid = new Map(requirements.map((entry) => [entry.guid, entry]));
  const coverage = previousCoverage.map((entry: any) => {
    const requirement = requirementByGuid.get(entry.requirementGuid);
    if (!requirement) return entry;
    const template = templatesById.get(requirement.session_template);
    if (!template) return entry;

    let assigned = 0;
    for (const item of allItems) {
      const user = users.get(item.user);
      const profile = profiles.get(item.user);
      if (
        !user ||
        !eligibilityForRequirement(requirement, profile, diagnostics, user.guid, entry.date)
      )
        continue;
      if (simulated.get(item.id)?.schedule?.[entry.date] === template.guid) assigned++;
    }

    const minimum = Number(entry.minimum ?? requirement.min_employees ?? 0);
    const target = Number(entry.target ?? requirement.target_employees ?? minimum);
    const maximum =
      entry.maximum === null || entry.maximum === undefined
        ? (requirement.max_employees ?? null)
        : Number(entry.maximum);
    let beforeAssigned = 0;
    for (const item of allItems) {
      const user = users.get(item.user);
      const profile = profiles.get(item.user);
      if (
        !user ||
        !eligibilityForRequirement(requirement, profile, diagnostics, user.guid, entry.date)
      )
        continue;
      if ((item.schedule ?? {})[entry.date] === template.guid) beforeAssigned++;
    }

    if (isHardCoverageWorsened(beforeAssigned, assigned, minimum, maximum)) {
      warnings.push(
        warning(
          assigned < minimum
            ? 'SUGGESTION_MANUAL_COVERAGE_BELOW_MINIMUM'
            : 'SUGGESTION_MANUAL_COVERAGE_ABOVE_MAXIMUM',
          assigned < minimum
            ? `La modification ferait passer « ${template.name} » sous son minimum le ${entry.date} (${assigned}/${minimum}).`
            : `La modification dépasserait le maximum de « ${template.name} » le ${entry.date} (${assigned}/${maximum}).`,
          {
            requirement_guid: requirement.guid,
            date: entry.date,
            before_assigned: beforeAssigned,
            after_assigned: assigned,
            minimum,
            maximum,
          },
          [
            'Modifier la sélection de collaborateurs.',
            'Choisir un autre service ou une autre période.',
            'Corriger le besoin de couverture si la règle métier a changé.',
          ],
        ),
      );
    } else if (assigned < minimum && impactedDates.has(entry.date)) {
      warnings.push(
        warning(
          'SUGGESTION_BULK_EDIT_EXISTING_COVERAGE_GAP',
          `Le minimum reste non atteint pour « ${template.name} » le ${entry.date} (${assigned}/${minimum}), mais cette modification ne dégrade pas la situation.`,
          { requirement_guid: requirement.guid, date: entry.date, assigned, minimum },
          ['Poursuivre les corrections avant publication.'],
        ),
      );
    } else if (maximum !== null && assigned > maximum && impactedDates.has(entry.date)) {
      warnings.push(
        warning(
          'SUGGESTION_BULK_EDIT_EXISTING_COVERAGE_EXCESS',
          `Le maximum reste dépassé pour « ${template.name} » le ${entry.date} (${assigned}/${maximum}), mais cette modification ne dégrade pas la situation.`,
          { requirement_guid: requirement.guid, date: entry.date, assigned, maximum },
          ['Poursuivre les corrections avant publication.'],
        ),
      );
    } else if (assigned < target && impactedDates.has(entry.date)) {
      warnings.push(
        warning(
          'SUGGESTION_BULK_EDIT_TARGET_NOT_REACHED',
          `La cible de « ${template.name} » n’est pas atteinte le ${entry.date} (${assigned}/${target}), sans passer sous le minimum.`,
          { requirement_guid: requirement.guid, date: entry.date, assigned, target },
        ),
      );
    }

    return {
      ...entry,
      assigned,
      status: coverageStatus(assigned, minimum, target, maximum),
    };
  });

  const coverageViolations: any[] = [];
  for (const entry of coverage) {
    if (entry.status === 'BELOW_MINIMUM') {
      coverageViolations.push({
        severity: 'WARNING',
        code: 'MIN_COVERAGE_NOT_REACHED',
        date: entry.date,
        requirementGuid: entry.requirementGuid,
        message: `Minimum de couverture non atteint pour ${entry.templateName}: ${entry.assigned}/${entry.minimum}.`,
      });
    } else if (entry.status === 'ABOVE_MAXIMUM') {
      coverageViolations.push({
        severity: 'WARNING',
        code: 'MAX_COVERAGE_EXCEEDED',
        date: entry.date,
        requirementGuid: entry.requirementGuid,
        message: `Maximum de couverture dépassé pour ${entry.templateName}: ${entry.assigned}/${entry.maximum}.`,
      });
    } else if (entry.status === 'BELOW_TARGET') {
      coverageViolations.push({
        severity: 'WARNING',
        code: 'TARGET_COVERAGE_NOT_REACHED',
        date: entry.date,
        requirementGuid: entry.requirementGuid,
        message: `Cible de couverture non atteinte pour ${entry.templateName}: ${entry.assigned}/${entry.target}.`,
      });
    }
  }

  const preservedViolations = Array.isArray(diagnostics.violations)
    ? diagnostics.violations.filter((entry: any) => !COVERAGE_VIOLATION_CODES.has(entry?.code))
    : [];
  const violations = [...preservedViolations, ...coverageViolations];

  const coverageScore =
    coverage.length === 0
      ? 0
      : Math.round(
          (coverage.reduce((sum: number, entry: any) => {
            const target = Number(entry.target ?? 0);
            return sum + (target === 0 ? 1 : Math.min(1, Number(entry.assigned ?? 0) / target));
          }, 0) /
            coverage.length) *
            100,
        );

  const guardTemplateGuids = new Set(
    requirements
      .filter((entry) => entry.service_type === 'GUARD')
      .map((entry) => templatesById.get(entry.session_template)?.guid)
      .filter(Boolean) as string[],
  );

  const rotatingLoads: number[] = [];
  for (const item of allItems) {
    const profile = profiles.get(item.user);
    if (profile?.planning_mode !== 'ROTATING') continue;
    const state = simulated.get(item.id)!;
    let shifts = 0;
    let guards = 0;
    let weekends = 0;
    for (const iso of periodDates(suggestion.period_from, suggestion.period_to)) {
      const value = state.schedule[iso];
      if (!value) continue;
      shifts++;
      if (guardTemplateGuids.has(value)) guards++;
      if (['Sat', 'Sun'].includes(dayKey(iso))) weekends++;
    }
    rotatingLoads.push(shifts + guards * 2 + weekends);
  }
  const fairnessScore =
    rotatingLoads.length <= 1
      ? 100
      : Math.max(
          0,
          Math.round(100 - (Math.max(...rotatingLoads) - Math.min(...rotatingLoads)) * 12.5),
        );

  const warningPenalty = Math.min(
    20,
    violations.filter((entry: any) => entry?.severity === 'WARNING').length * 2,
  );
  const conformityScore = Math.max(
    0,
    Math.round(coverageScore * 0.75 + fairnessScore * 0.25 - warningPenalty),
  );

  const nextDiagnostics = {
    ...diagnostics,
    coverage,
    violations,
    coverageScore,
    fairnessScore,
    lastManualBulkEdit: {
      at: new Date().toISOString(),
      action: payload.action,
      periodFrom: payload.period_from,
      periodTo: payload.period_to,
      dates: payload.dates ?? [],
      weekdays: payload.weekdays ?? [],
      templateGuid: payload.action === 'ASSIGN_SERVICE' ? payload.template_guid : null,
      selectedItemCount: selectedItems.length,
      affectedCellCount: changes.length,
      reason: payload.reason?.trim() || null,
    },
  };

  // De-duplicate identical issues generated through overlapping checks.
  const dedupeIssues = (items: SuggestionBulkEditIssue[]): SuggestionBulkEditIssue[] => {
    const seen = new Set<string>();
    return items.filter((entry) => {
      const key = `${entry.code}:${JSON.stringify(entry.details ?? {})}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const result: SuggestionBulkEditResult = {
    suggestion_guid: suggestionGuid,
    affected_items: new Set(changes.map((entry) => entry.item_guid)).size,
    affected_cells: changes.length,
    direct_dates: directDates,
    changes,
    blockers: dedupeIssues(blockers),
    warnings: dedupeIssues(warnings),
    diagnostics: nextDiagnostics,
    conformity_score: conformityScore,
    applied: false,
  };

  return {
    result,
    itemUpdates: simulated,
    suggestionId: suggestion.id,
  };
}

export async function previewScheduleSuggestionBulkEdit(
  suggestionGuid: string,
  payload: SuggestionBulkEditPayload,
): Promise<SuggestionBulkEditResult> {
  const plan = await buildPlan(suggestionGuid, payload);
  return plan.result;
}

export async function applyScheduleSuggestionBulkEdit(
  suggestionGuid: string,
  payload: SuggestionBulkEditPayload,
): Promise<SuggestionBulkEditResult> {
  const sequelize = TenantManager.getConnectionSync();
  const { SuggestionModel, ItemModel } = requireModels();

  return await sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
    async (transaction) => {
      const plan = await buildPlan(suggestionGuid, payload, transaction, true);

      if (plan.result.blockers.length > 0) {
        throw new SuggestionBulkEditError(
          plan.result.blockers[0]?.message ??
            'The manual edit contains a technical integrity conflict',
          'SUGGESTION_MANUAL_EDIT_TECHNICALLY_BLOCKED',
          422,
          {
            blockers: plan.result.blockers,
            warnings: plan.result.warnings,
            preview: plan.result,
          },
        );
      }

      const changedItemGuids = new Set(plan.result.changes.map((entry) => entry.item_guid));
      for (const [itemId, state] of plan.itemUpdates.entries()) {
        const plainItem = await ItemModel.findOne({
          where: { id: itemId, deleted_at: null },
          attributes: ['guid'],
          transaction,
        });
        if (!plainItem || !changedItemGuids.has(plainItem.get('guid') as string)) continue;

        await ItemModel.update(
          {
            schedule: state.schedule,
            reasons: state.reasons,
          },
          {
            where: { id: itemId, deleted_at: null },
            transaction,
          },
        );
      }

      await SuggestionModel.update(
        {
          diagnostics: plan.result.diagnostics,
          conformity_score: plan.result.conformity_score,
        },
        {
          where: { id: plan.suggestionId, status: 'draft', deleted_at: null },
          transaction,
        },
      );

      return {
        ...plan.result,
        applied: true,
      };
    },
  );
}

// import { Op, Transaction } from 'sequelize';
//
// import { TableInitializer } from '../tenant/database/db.initializer.js';
// import TenantManager from '../tenant/database/db.tenant-manager.js';
//
// import { tableName } from './response.model.js';
//
// type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
// type BulkAction = 'ASSIGN_SERVICE' | 'REST';
// type ScheduleValue = string | null;
// type ChangeKind = 'DIRECT' | 'GUARD_CONTINUATION' | 'POST_GUARD_REST' | 'GUARD_TAIL_CLEAR';
//
// export interface SuggestionBulkEditPayload {
//   item_guids: string[];
//   period_from: string;
//   period_to: string;
//   /** Optional explicit dates. When provided, they take precedence over weekdays. */
//   dates?: string[];
//   weekdays?: DayKey[];
//   action: BulkAction;
//   template_guid?: string | null;
//   reason?: string | null;
// }
//
// export interface SuggestionBulkEditIssue {
//   code: string;
//   message: string;
//   severity: 'BLOCKER' | 'WARNING';
//   details?: Record<string, unknown>;
//   suggested_actions?: string[];
// }
//
// export interface SuggestionBulkEditChange {
//   item_guid: string;
//   employee_guid: string;
//   employee_name: string;
//   date: string;
//   kind: ChangeKind;
//   before_template_guid: string | null;
//   after_template_guid: string | null;
//   after_label: string;
// }
//
// export interface SuggestionBulkEditResult {
//   suggestion_guid: string;
//   affected_items: number;
//   affected_cells: number;
//   direct_dates: string[];
//   changes: SuggestionBulkEditChange[];
//   blockers: SuggestionBulkEditIssue[];
//   warnings: SuggestionBulkEditIssue[];
//   diagnostics: Record<string, any>;
//   conformity_score: number;
//   applied: boolean;
// }
//
// export class SuggestionBulkEditError extends Error {
//   constructor(
//     message: string,
//     public readonly code: string,
//     public readonly status: number,
//     public readonly details?: unknown,
//   ) {
//     super(message);
//     this.name = 'SuggestionBulkEditError';
//   }
// }
//
// interface PlainItem {
//   id: number;
//   guid: string;
//   user: number;
//   schedule: Record<string, ScheduleValue>;
//   reasons: Record<string, any>;
// }
//
// interface PlainUser {
//   id: number;
//   guid: string;
//   first_name?: string | null;
//   last_name?: string | null;
//   employee_code?: string | null;
// }
//
// interface PlainProfile {
//   user: number;
//   planning_mode: 'FIXED' | 'ROTATING' | 'EXCLUDED';
//   fixed_session_template?: number | null;
//   max_weekly_minutes?: number | null;
//   active: boolean;
// }
//
// interface PlainRequirement {
//   id: number;
//   guid: string;
//   config: number;
//   session_template: number;
//   continuation_template?: number | null;
//   continuation_day_offset?: number;
//   day_of_week: DayKey;
//   service_type: 'STANDARD' | 'GUARD';
//   allocation_mode: 'EXACT' | 'RANGE' | 'FILL_REMAINING';
//   min_employees: number;
//   target_employees: number;
//   max_employees?: number | null;
//   credited_minutes?: number | null;
//   eligibility_policy?: {
//     planning_modes?: Array<'FIXED' | 'ROTATING'>;
//     guard_pool_relation?: 'ANY' | 'MEMBER' | 'NON_MEMBER';
//   } | null;
// }
//
// interface PlainTemplate {
//   id: number;
//   guid: string;
//   name: string;
//   definition: Record<string, any>;
//   current?: boolean;
//   active?: boolean;
//   deleted_at?: Date | null;
// }
//
// const DAY_KEYS: DayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// const VALID_WEEKDAYS = new Set<DayKey>(DAY_KEYS);
// const COVERAGE_VIOLATION_CODES = new Set([
//   'MIN_COVERAGE_NOT_REACHED',
//   'TARGET_COVERAGE_NOT_REACHED',
//   'MAX_COVERAGE_EXCEEDED',
// ]);
//
// function isIso(value: unknown): value is string {
//   return (
//     typeof value === 'string' &&
//     /^\d{4}-\d{2}-\d{2}$/.test(value) &&
//     !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
//   );
// }
//
// function addDays(iso: string, amount: number): string {
//   const date = new Date(`${iso}T00:00:00.000Z`);
//   date.setUTCDate(date.getUTCDate() + amount);
//   return date.toISOString().slice(0, 10);
// }
//
// function dayKey(iso: string): DayKey {
//   return DAY_KEYS[new Date(`${iso}T00:00:00.000Z`).getUTCDay()]!;
// }
//
// function periodDates(from: string, to: string): string[] {
//   const result: string[] = [];
//   for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
//     result.push(cursor);
//   }
//   return result;
// }
//
// function templateHasWork(template: PlainTemplate, iso: string): boolean {
//   const blocks = template.definition?.[dayKey(iso)];
//   return Array.isArray(blocks) && blocks.length > 0;
// }
//
// function templateInterval(
//   template: PlainTemplate,
//   iso: string,
// ): { start: number; end: number } | null {
//   const blocks = template.definition?.[dayKey(iso)];
//   if (!Array.isArray(blocks) || blocks.length === 0) return null;
//
//   const parse = (value: string): number => {
//     const [hours, minutes] = String(value).split(':').map(Number);
//     return (hours * 60 + (minutes ?? 0)) * 60_000;
//   };
//
//   const base = Date.parse(`${iso}T00:00:00.000Z`);
//   let firstStart = Number.POSITIVE_INFINITY;
//   let lastEnd = Number.NEGATIVE_INFINITY;
//
//   for (const block of blocks) {
//     if (!Array.isArray(block?.work) || block.work.length < 2) continue;
//     const start = base + parse(block.work[0]);
//     let end = base + parse(block.work[1]);
//     if (end <= start) end += 24 * 60 * 60_000;
//     firstStart = Math.min(firstStart, start);
//     lastEnd = Math.max(lastEnd, end);
//   }
//
//   if (!Number.isFinite(firstStart) || !Number.isFinite(lastEnd)) return null;
//   return { start: firstStart, end: lastEnd };
// }
//
// function maximumConsecutiveWorkDays(
//   schedule: Record<string, ScheduleValue>,
//   from: string,
//   to: string,
// ): number {
//   let best = 0;
//   let current = 0;
//   for (const iso of periodDates(from, to)) {
//     if (schedule[iso]) {
//       current++;
//       best = Math.max(best, current);
//     } else {
//       current = 0;
//     }
//   }
//   return best;
// }
//
// function restGapViolations(
//   schedule: Record<string, ScheduleValue>,
//   reasons: Record<string, any>,
//   templates: Map<string, PlainTemplate>,
//   from: string,
//   to: string,
//   minimumRestMinutes: number,
// ): Array<{ previousDate: string; nextDate: string; gapMinutes: number }> {
//   if (minimumRestMinutes <= 0) return [];
//   const dates = periodDates(from, to);
//   const result: Array<{ previousDate: string; nextDate: string; gapMinutes: number }> = [];
//
//   for (let index = 0; index < dates.length - 1; index++) {
//     const previousDate = dates[index]!;
//     const nextDate = dates[index + 1]!;
//     const previousGuid = schedule[previousDate];
//     const nextGuid = schedule[nextDate];
//     if (!previousGuid || !nextGuid) continue;
//
//     // A continuation 00h-08h appartient à la même garde commencée la veille.
//     // Le minimum de repos ne s'applique pas entre ces deux fragments techniques.
//     if (reasons[nextDate]?.source === 'GUARD_CONTINUATION') continue;
//
//     const previousTemplate = templates.get(previousGuid);
//     const nextTemplate = templates.get(nextGuid);
//     if (!previousTemplate || !nextTemplate) continue;
//
//     const previousInterval = templateInterval(previousTemplate, previousDate);
//     const nextInterval = templateInterval(nextTemplate, nextDate);
//     if (!previousInterval || !nextInterval) continue;
//
//     const gapMinutes = Math.floor((nextInterval.start - previousInterval.end) / 60_000);
//     if (gapMinutes < minimumRestMinutes) {
//       result.push({ previousDate, nextDate, gapMinutes });
//     }
//   }
//
//   return result;
// }
//
// function displayName(user: PlainUser): string {
//   const value = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
//   return value || user.employee_code || user.guid;
// }
//
// function mondayOfWeek(iso: string): string {
//   const date = new Date(`${iso}T00:00:00.000Z`);
//   const weekday = date.getUTCDay();
//   const delta = weekday === 0 ? -6 : 1 - weekday;
//   date.setUTCDate(date.getUTCDate() + delta);
//   return date.toISOString().slice(0, 10);
// }
//
// function guardPoolMembership(
//   diagnostics: Record<string, any>,
//   employeeGuid: string,
//   iso: string,
// ): boolean {
//   const monday = mondayOfWeek(iso);
//   const pools = Array.isArray(diagnostics?.guardPools) ? diagnostics.guardPools : [];
//   const pool = pools.find((entry: any) => entry?.weekFrom === monday);
//   return Array.isArray(pool?.employeeGuids) && pool.employeeGuids.includes(employeeGuid);
// }
//
// function eligibilityForRequirement(
//   requirement: PlainRequirement,
//   profile: PlainProfile | undefined,
//   diagnostics: Record<string, any>,
//   employeeGuid: string,
//   iso: string,
// ): boolean {
//   if (!profile || !profile.active || profile.planning_mode === 'EXCLUDED') return false;
//
//   const policy = requirement.eligibility_policy ?? {};
//   const planningModes = Array.isArray(policy.planning_modes)
//     ? policy.planning_modes
//     : ['FIXED', 'ROTATING'];
//
//   if (!planningModes.includes(profile.planning_mode as 'FIXED' | 'ROTATING')) return false;
//
//   const relation = policy.guard_pool_relation ?? 'ANY';
//   if (relation === 'ANY') return true;
//
//   const member = guardPoolMembership(diagnostics, employeeGuid, iso);
//   return relation === 'MEMBER' ? member : !member;
// }
//
// function buildManualReason(
//   template: PlainTemplate | null,
//   payload: SuggestionBulkEditPayload,
//   kind: ChangeKind,
//   originDate?: string,
// ): Record<string, any> {
//   const managerReason = payload.reason?.trim();
//
//   if (kind === 'GUARD_CONTINUATION') {
//     return {
//       source: 'GUARD_CONTINUATION',
//       templateGuid: template?.guid ?? null,
//       templateName: template?.name ?? 'Suite de garde',
//       confidence: 100,
//       factors: [
//         `Suite automatique de la garde définie manuellement le ${originDate}`,
//         'Modification en masse par le manager',
//         ...(managerReason ? [`Motif : ${managerReason}`] : []),
//       ],
//     };
//   }
//
//   if (kind === 'POST_GUARD_REST') {
//     return {
//       source: 'POST_GUARD_REST',
//       templateGuid: null,
//       templateName: 'Repos post-garde',
//       confidence: 100,
//       factors: [
//         `Repos obligatoire après la garde définie manuellement le ${originDate}`,
//         'Modification en masse par le manager',
//         ...(managerReason ? [`Motif : ${managerReason}`] : []),
//       ],
//     };
//   }
//
//   if (kind === 'GUARD_TAIL_CLEAR') {
//     return {
//       source: 'MANUAL',
//       templateGuid: null,
//       templateName: 'Non affecté',
//       confidence: 100,
//       factors: [
//         'Suite de garde retirée après modification de la garde source',
//         'Modification en masse par le manager',
//         ...(managerReason ? [`Motif : ${managerReason}`] : []),
//       ],
//     };
//   }
//
//   if (!template) {
//     return {
//       source: 'MANUAL',
//       templateGuid: null,
//       templateName: 'Repos',
//       confidence: 100,
//       factors: [
//         'Repos défini en masse par le manager',
//         ...(managerReason ? [`Motif : ${managerReason}`] : []),
//       ],
//     };
//   }
//
//   return {
//     source: 'MANUAL',
//     templateGuid: template.guid,
//     templateName: template.name,
//     confidence: 100,
//     factors: [
//       'Affectation modifiée en masse par le manager',
//       ...(managerReason ? [`Motif : ${managerReason}`] : []),
//     ],
//   };
// }
//
// function coverageStatus(
//   assigned: number,
//   minimum: number,
//   target: number,
//   maximum: number | null,
// ): 'COVERED' | 'BELOW_TARGET' | 'BELOW_MINIMUM' | 'ABOVE_MAXIMUM' {
//   if (assigned < minimum) return 'BELOW_MINIMUM';
//   if (maximum !== null && assigned > maximum) return 'ABOVE_MAXIMUM';
//   if (assigned < target) return 'BELOW_TARGET';
//   return 'COVERED';
// }
//
// function isHardCoverageWorsened(
//   beforeAssigned: number,
//   afterAssigned: number,
//   minimum: number,
//   maximum: number | null,
// ): boolean {
//   if (afterAssigned < minimum) {
//     if (beforeAssigned >= minimum) return true;
//     return afterAssigned < beforeAssigned;
//   }
//
//   if (maximum !== null && afterAssigned > maximum) {
//     if (beforeAssigned <= maximum) return true;
//     return afterAssigned > beforeAssigned;
//   }
//
//   return false;
// }
//
// function warning(
//   code: string,
//   message: string,
//   details?: Record<string, unknown>,
//   suggested_actions?: string[],
// ): SuggestionBulkEditIssue {
//   return { code, message, severity: 'WARNING', details, suggested_actions };
// }
//
// function blocker(
//   code: string,
//   message: string,
//   details?: Record<string, unknown>,
//   suggested_actions?: string[],
// ): SuggestionBulkEditIssue {
//   return { code, message, severity: 'BLOCKER', details, suggested_actions };
// }
//
// function validatePayload(payload: SuggestionBulkEditPayload): void {
//   if (!payload || typeof payload !== 'object') {
//     throw new SuggestionBulkEditError(
//       'Invalid bulk edit payload',
//       'SUGGESTION_BULK_EDIT_INVALID_PAYLOAD',
//       400,
//     );
//   }
//
//   if (!Array.isArray(payload.item_guids) || payload.item_guids.length === 0) {
//     throw new SuggestionBulkEditError(
//       'item_guids must contain at least one suggestion item GUID',
//       'SUGGESTION_BULK_EDIT_ITEMS_REQUIRED',
//       400,
//     );
//   }
//
//   if (payload.item_guids.some((guid) => typeof guid !== 'string' || !guid.trim())) {
//     throw new SuggestionBulkEditError(
//       'Invalid item GUID',
//       'SUGGESTION_BULK_EDIT_INVALID_ITEM_GUID',
//       400,
//     );
//   }
//
//   if (new Set(payload.item_guids).size !== payload.item_guids.length) {
//     throw new SuggestionBulkEditError(
//       'item_guids cannot contain duplicates',
//       'SUGGESTION_BULK_EDIT_DUPLICATE_ITEM',
//       400,
//     );
//   }
//
//   if (
//     !isIso(payload.period_from) ||
//     !isIso(payload.period_to) ||
//     payload.period_from > payload.period_to
//   ) {
//     throw new SuggestionBulkEditError(
//       'period_from and period_to must be valid YYYY-MM-DD values and period_from <= period_to',
//       'SUGGESTION_BULK_EDIT_INVALID_PERIOD',
//       400,
//     );
//   }
//
//   if (payload.dates !== undefined) {
//     if (
//       !Array.isArray(payload.dates) ||
//       payload.dates.length === 0 ||
//       payload.dates.some((value) => !isIso(value))
//     ) {
//       throw new SuggestionBulkEditError(
//         'dates must contain one or more valid YYYY-MM-DD values',
//         'SUGGESTION_BULK_EDIT_INVALID_DATES',
//         400,
//       );
//     }
//
//     if (new Set(payload.dates).size !== payload.dates.length) {
//       throw new SuggestionBulkEditError(
//         'dates cannot contain duplicates',
//         'SUGGESTION_BULK_EDIT_DUPLICATE_DATE',
//         400,
//       );
//     }
//   }
//
//   if (payload.weekdays !== undefined) {
//     if (
//       !Array.isArray(payload.weekdays) ||
//       payload.weekdays.some((value) => !VALID_WEEKDAYS.has(value))
//     ) {
//       throw new SuggestionBulkEditError(
//         'weekdays contains an invalid weekday',
//         'SUGGESTION_BULK_EDIT_INVALID_WEEKDAY',
//         400,
//       );
//     }
//   }
//
//   if (!['ASSIGN_SERVICE', 'REST'].includes(payload.action)) {
//     throw new SuggestionBulkEditError(
//       'Invalid bulk edit action',
//       'SUGGESTION_BULK_EDIT_INVALID_ACTION',
//       400,
//     );
//   }
//
//   if (
//     payload.action === 'ASSIGN_SERVICE' &&
//     (!payload.template_guid || typeof payload.template_guid !== 'string')
//   ) {
//     throw new SuggestionBulkEditError(
//       'template_guid is required for ASSIGN_SERVICE',
//       'SUGGESTION_BULK_EDIT_TEMPLATE_REQUIRED',
//       400,
//     );
//   }
//
//   if (payload.action === 'REST' && payload.template_guid) {
//     throw new SuggestionBulkEditError(
//       'template_guid must be omitted for REST',
//       'SUGGESTION_BULK_EDIT_TEMPLATE_NOT_ALLOWED',
//       400,
//     );
//   }
//
//   if (
//     payload.reason !== undefined &&
//     payload.reason !== null &&
//     typeof payload.reason !== 'string'
//   ) {
//     throw new SuggestionBulkEditError(
//       'reason must be a string',
//       'SUGGESTION_BULK_EDIT_INVALID_REASON',
//       400,
//     );
//   }
// }
//
// function requireModels() {
//   const SuggestionModel = TableInitializer.getModel(tableName.SCHEDULE_SUGGESTION);
//   const ItemModel = TableInitializer.getModel(tableName.SCHEDULE_SUGGESTION_ITEM);
//   const RequirementModel = TableInitializer.getModel(tableName.PLANNING_SUGGESTION_REQUIREMENT);
//   const TemplateModel = TableInitializer.getModel(tableName.SESSION_TEMPLATES);
//   const ProfileModel = TableInitializer.getModel(tableName.EMPLOYEE_PLANNING_PROFILE);
//   const ConfigModel = TableInitializer.getModel(tableName.PLANNING_SUGGESTION_CONFIG);
//   const UserModel = TableInitializer.getModel(tableName.USERS);
//
//   if (
//     !SuggestionModel ||
//     !ItemModel ||
//     !RequirementModel ||
//     !TemplateModel ||
//     !ProfileModel ||
//     !ConfigModel ||
//     !UserModel
//   ) {
//     throw new SuggestionBulkEditError(
//       'One or more planning models are not registered',
//       'SUGGESTION_BULK_EDIT_MODEL_NOT_REGISTERED',
//       500,
//     );
//   }
//
//   return {
//     SuggestionModel,
//     ItemModel,
//     RequirementModel,
//     TemplateModel,
//     ProfileModel,
//     ConfigModel,
//     UserModel,
//   };
// }
//
// async function buildPlan(
//   suggestionGuid: string,
//   payload: SuggestionBulkEditPayload,
//   transaction?: Transaction,
//   lockForUpdate = false,
// ): Promise<{
//   result: SuggestionBulkEditResult;
//   itemUpdates: Map<
//     number,
//     { schedule: Record<string, ScheduleValue>; reasons: Record<string, any> }
//   >;
//   suggestionId: number;
// }> {
//   validatePayload(payload);
//
//   const {
//     SuggestionModel,
//     ItemModel,
//     RequirementModel,
//     TemplateModel,
//     ProfileModel,
//     ConfigModel,
//     UserModel,
//   } = requireModels();
//
//   const suggestionInstance = await SuggestionModel.findOne({
//     where: { guid: suggestionGuid, deleted_at: null },
//     transaction,
//     ...(lockForUpdate && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
//   });
//
//   if (!suggestionInstance) {
//     throw new SuggestionBulkEditError('Suggestion not found', 'SUGGESTION_NOT_FOUND', 404);
//   }
//
//   const suggestion = suggestionInstance.get({ plain: true });
//   if (suggestion.status !== 'draft') {
//     throw new SuggestionBulkEditError(
//       'Only a draft suggestion can be modified',
//       'SUGGESTION_ALREADY_RESOLVED',
//       409,
//     );
//   }
//
//   if (payload.period_from < suggestion.period_from || payload.period_to > suggestion.period_to) {
//     throw new SuggestionBulkEditError(
//       'The bulk edit period must stay inside the suggestion requested period',
//       'SUGGESTION_BULK_EDIT_PERIOD_OUTSIDE_SUGGESTION',
//       422,
//       {
//         suggestion_period_from: suggestion.period_from,
//         suggestion_period_to: suggestion.period_to,
//       },
//     );
//   }
//
//   const weekdaySet = new Set(payload.weekdays ?? []);
//   const explicitDates = payload.dates ? [...payload.dates].sort() : null;
//
//   if (explicitDates?.some((iso) => iso < payload.period_from || iso > payload.period_to)) {
//     throw new SuggestionBulkEditError(
//       'Every explicit date must stay inside period_from and period_to',
//       'SUGGESTION_BULK_EDIT_DATE_OUTSIDE_PAYLOAD_PERIOD',
//       400,
//       {
//         period_from: payload.period_from,
//         period_to: payload.period_to,
//         dates: explicitDates,
//       },
//     );
//   }
//
//   if (explicitDates?.some((iso) => iso < suggestion.period_from || iso > suggestion.period_to)) {
//     throw new SuggestionBulkEditError(
//       'Every explicit date must stay inside the suggestion requested period',
//       'SUGGESTION_BULK_EDIT_DATE_OUTSIDE_SUGGESTION',
//       422,
//       {
//         suggestion_period_from: suggestion.period_from,
//         suggestion_period_to: suggestion.period_to,
//         dates: explicitDates,
//       },
//     );
//   }
//
//   const directDates =
//     explicitDates ??
//     periodDates(payload.period_from, payload.period_to).filter(
//       (iso) => weekdaySet.size === 0 || weekdaySet.has(dayKey(iso)),
//     );
//
//   if (directDates.length === 0) {
//     throw new SuggestionBulkEditError(
//       'No date matches the selected period and weekdays',
//       'SUGGESTION_BULK_EDIT_NO_MATCHING_DATE',
//       422,
//     );
//   }
//
//   const allItemInstances = await ItemModel.findAll({
//     where: { suggestion: suggestion.id, deleted_at: null },
//     transaction,
//     ...(lockForUpdate && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
//     order: [['id', 'ASC']],
//   });
//   const allItems: PlainItem[] = allItemInstances.map((instance: any) =>
//     instance.get({ plain: true }),
//   );
//   const allByGuid = new Map(allItems.map((item) => [item.guid, item]));
//
//   const selectedItems: PlainItem[] = [];
//   for (const guid of payload.item_guids) {
//     const item = allByGuid.get(guid);
//     if (!item) {
//       throw new SuggestionBulkEditError(
//         `Suggestion item ${guid} does not belong to this suggestion`,
//         'SUGGESTION_ITEM_NOT_FOUND',
//         404,
//         { item_guid: guid },
//       );
//     }
//     selectedItems.push(item);
//   }
//
//   const userIds = [...new Set(allItems.map((item) => item.user))];
//   const userInstances = await UserModel.findAll({
//     where: { id: { [Op.in]: userIds } },
//     transaction,
//     ...(transaction ? { lock: transaction.LOCK.SHARE } : {}),
//   });
//   const users = new Map<number, PlainUser>(
//     userInstances.map((instance: any) => {
//       const user = instance.get({ plain: true }) as PlainUser;
//       return [user.id, user];
//     }),
//   );
//
//   const profileInstances = await ProfileModel.findAll({
//     where: { user: { [Op.in]: userIds }, active: true, deleted_at: null },
//     transaction,
//     ...(transaction ? { lock: transaction.LOCK.SHARE } : {}),
//   });
//   const profiles = new Map<number, PlainProfile>(
//     profileInstances.map((instance: any) => {
//       const profile = instance.get({ plain: true }) as PlainProfile;
//       return [profile.user, profile];
//     }),
//   );
//
//   const configInstance = suggestion.config
//     ? await ConfigModel.findOne({ where: { id: suggestion.config, deleted_at: null }, transaction })
//     : null;
//   if (!configInstance) {
//     throw new SuggestionBulkEditError(
//       'The configuration used by this suggestion is unavailable',
//       'SUGGESTION_BULK_EDIT_CONFIG_NOT_FOUND',
//       422,
//     );
//   }
//   const config = configInstance.get({ plain: true });
//
//   const requirementInstances = await RequirementModel.findAll({
//     where: { config: suggestion.config, active: true, deleted_at: null },
//     transaction,
//     ...(transaction ? { lock: transaction.LOCK.SHARE } : {}),
//   });
//   const requirements: PlainRequirement[] = requirementInstances.map((instance: any) =>
//     instance.get({ plain: true }),
//   );
//
//   // Manual planning is a manager action, not a solver-only action.
//   // Load every current session template so the manager is not limited to services
//   // referenced by the active suggestion requirements.
//   const templateInstances = await TemplateModel.findAll({
//     where: { current: true, deleted_at: null },
//     transaction,
//     ...(transaction ? { lock: transaction.LOCK.SHARE } : {}),
//   });
//   const templatesById = new Map<number, PlainTemplate>();
//   const templatesByGuid = new Map<string, PlainTemplate>();
//   for (const instance of templateInstances as any[]) {
//     const template = instance.get({ plain: true }) as PlainTemplate;
//     templatesById.set(template.id, template);
//     templatesByGuid.set(template.guid, template);
//   }
//
//   const diagnostics: Record<string, any> = suggestion.diagnostics ?? {};
//   const blockers: SuggestionBulkEditIssue[] = [];
//   const warnings: SuggestionBulkEditIssue[] = [];
//   const changes: SuggestionBulkEditChange[] = [];
//
//   const targetTemplate =
//     payload.action === 'ASSIGN_SERVICE'
//       ? (templatesByGuid.get(payload.template_guid!) ?? null)
//       : null;
//
//   if (payload.action === 'ASSIGN_SERVICE' && !targetTemplate) {
//     throw new SuggestionBulkEditError(
//       'The selected session template does not exist, is no longer current, or was deleted',
//       'SUGGESTION_BULK_EDIT_TEMPLATE_NOT_FOUND',
//       422,
//       { template_guid: payload.template_guid },
//     );
//   }
//
//   const simulated = new Map<
//     number,
//     { schedule: Record<string, ScheduleValue>; reasons: Record<string, any> }
//   >();
//   for (const item of allItems) {
//     simulated.set(item.id, {
//       schedule: { ...(item.schedule ?? {}) },
//       reasons: { ...(item.reasons ?? {}) },
//     });
//   }
//
//   const guardRequirementByDateAndItem = new Map<string, PlainRequirement>();
//
//   const findRequirement = (
//     item: PlainItem,
//     iso: string,
//     templateGuid: string,
//   ): PlainRequirement | null => {
//     const user = users.get(item.user);
//     const profile = profiles.get(item.user);
//     if (!user) return null;
//
//     const allMatches = requirements.filter((requirement) => {
//       if (requirement.day_of_week !== dayKey(iso)) return false;
//       const template = templatesById.get(requirement.session_template);
//       return Boolean(template && template.guid === templateGuid);
//     });
//
//     const eligibleMatches = profile
//       ? allMatches.filter((requirement) =>
//           eligibilityForRequirement(requirement, profile, diagnostics, user.guid, iso),
//         )
//       : [];
//
//     if (allMatches.length === 0 && profile?.planning_mode === 'FIXED') {
//       const fixedTemplate = profile.fixed_session_template
//         ? templatesById.get(profile.fixed_session_template)
//         : null;
//       if (fixedTemplate?.guid === templateGuid) {
//         return {
//           id: -item.user,
//           guid: `FIXED_PROFILE_${item.user}_${dayKey(iso)}`,
//           config: suggestion.config,
//           session_template: fixedTemplate.id,
//           continuation_template: null,
//           continuation_day_offset: 0,
//           day_of_week: dayKey(iso),
//           service_type: 'STANDARD',
//           allocation_mode: 'RANGE',
//           min_employees: 0,
//           target_employees: 0,
//           max_employees: null,
//           eligibility_policy: {
//             planning_modes: ['FIXED'],
//             guard_pool_relation: 'ANY',
//           },
//         };
//       }
//     }
//
//     if (allMatches.length === 0) return null;
//
//     if (eligibleMatches.length === 0) {
//       warnings.push(
//         warning(
//           'SUGGESTION_MANUAL_SERVICE_OUTSIDE_EMPLOYEE_POLICY',
//           `${displayName(user)} ne correspond pas à la population prévue par le moteur pour ce service le ${iso}. La décision managériale reste applicable.`,
//           {
//             item_guid: item.guid,
//             employee_guid: user.guid,
//             date: iso,
//             template_guid: templateGuid,
//             requirement_guids: allMatches.map((entry) => entry.guid),
//           },
//           [
//             'Vérifier que cette dérogation correspond bien à la situation réelle.',
//             'Ajuster ensuite le profil ou les besoins du moteur si cette organisation devient habituelle.',
//           ],
//         ),
//       );
//     }
//
//     const candidates = eligibleMatches.length > 0 ? eligibleMatches : allMatches;
//
//     if (candidates.length > 1) {
//       const signatures = new Set(
//         candidates.map((entry) =>
//           [
//             entry.service_type,
//             entry.continuation_template ?? null,
//             entry.continuation_day_offset ?? 0,
//           ].join(':'),
//         ),
//       );
//
//       if (signatures.size > 1) {
//         blockers.push(
//           blocker(
//             'SUGGESTION_MANUAL_SERVICE_TECHNICALLY_AMBIGUOUS',
//             `Le service « ${templatesByGuid.get(templateGuid)?.name ?? templateGuid} » correspond à plusieurs définitions techniques incompatibles le ${iso}.`,
//             {
//               item_guid: item.guid,
//               employee_guid: user.guid,
//               date: iso,
//               requirement_guids: candidates.map((entry) => entry.guid),
//             },
//             [
//               'Corriger les besoins qui utilisent le même service avec des comportements de garde différents.',
//             ],
//           ),
//         );
//         return null;
//       }
//
//       warnings.push(
//         warning(
//           'SUGGESTION_MANUAL_REQUIREMENT_AMBIGUOUS',
//           `Plusieurs besoins du moteur correspondent à ce service le ${iso}. Toké applique la décision manuelle et utilise une définition technique équivalente.`,
//           {
//             item_guid: item.guid,
//             employee_guid: user.guid,
//             date: iso,
//             requirement_guids: candidates.map((entry) => entry.guid),
//           },
//         ),
//       );
//     }
//
//     return candidates[0] ?? null;
//   };
//
//   const clearPreviousGuardTail = (item: PlainItem, iso: string): void => {
//     const state = simulated.get(item.id)!;
//     const currentGuid = state.schedule[iso];
//     if (!currentGuid) return;
//
//     const oldGuardRequirement = findRequirement(item, iso, currentGuid);
//     if (!oldGuardRequirement || oldGuardRequirement.service_type !== 'GUARD') return;
//
//     let cursor = addDays(iso, oldGuardRequirement.continuation_day_offset ?? 1);
//     const continuationReason = state.reasons[cursor];
//     if (continuationReason?.source === 'GUARD_CONTINUATION') {
//       const before = state.schedule[cursor] ?? null;
//       state.schedule[cursor] = null;
//       state.reasons[cursor] = buildManualReason(null, payload, 'GUARD_TAIL_CLEAR', iso);
//       const user = users.get(item.user)!;
//       changes.push({
//         item_guid: item.guid,
//         employee_guid: user.guid,
//         employee_name: displayName(user),
//         date: cursor,
//         kind: 'GUARD_TAIL_CLEAR',
//         before_template_guid: before,
//         after_template_guid: null,
//         after_label: 'Non affecté',
//       });
//
//       for (let offset = 1; offset <= 32; offset++) {
//         cursor = addDays(cursor, 1);
//         if (state.reasons[cursor]?.source !== 'POST_GUARD_REST') break;
//         const beforeRest = state.schedule[cursor] ?? null;
//         state.schedule[cursor] = null;
//         state.reasons[cursor] = buildManualReason(null, payload, 'GUARD_TAIL_CLEAR', iso);
//         changes.push({
//           item_guid: item.guid,
//           employee_guid: user.guid,
//           employee_name: displayName(user),
//           date: cursor,
//           kind: 'GUARD_TAIL_CLEAR',
//           before_template_guid: beforeRest,
//           after_template_guid: null,
//           after_label: 'Non affecté',
//         });
//       }
//     }
//   };
//
//   for (const item of selectedItems) {
//     const user = users.get(item.user);
//     const profile = profiles.get(item.user);
//
//     if (!user) {
//       blockers.push(
//         blocker(
//           'SUGGESTION_MANUAL_EMPLOYEE_NOT_FOUND',
//           `Le collaborateur lié à l’item ${item.guid} n’existe plus.`,
//           { item_guid: item.guid },
//           ['Actualiser ou régénérer la suggestion avant de poursuivre.'],
//         ),
//       );
//       continue;
//     }
//
//     if (!profile || !profile.active || profile.planning_mode === 'EXCLUDED') {
//       warnings.push(
//         warning(
//           'SUGGESTION_MANUAL_EMPLOYEE_OUTSIDE_PLANNING_PROFILE',
//           `${displayName(user)} n’a pas de profil planifiable actif selon le moteur. Le manager peut néanmoins définir son planning manuellement.`,
//           {
//             item_guid: item.guid,
//             employee_guid: user.guid,
//             planning_mode: profile?.planning_mode ?? null,
//             profile_active: profile?.active ?? false,
//           },
//           [
//             'Vérifier que cette décision correspond à la situation réelle de l’entreprise.',
//             'Mettre à jour le profil si ce changement devient durable.',
//           ],
//         ),
//       );
//     }
//
//     for (const iso of directDates) {
//       const state = simulated.get(item.id)!;
//       const before = state.schedule[iso] ?? null;
//
//       if (payload.action === 'ASSIGN_SERVICE') {
//         const blockerCountBeforeRequirement = blockers.length;
//         const requirement = findRequirement(item, iso, targetTemplate!.guid);
//         if (!requirement && blockers.length > blockerCountBeforeRequirement) {
//           // Ambiguïté technique réelle : impossible de déterminer correctement
//           // la sémantique (notamment une éventuelle continuation de garde).
//           continue;
//         }
//
//         if (!requirement) {
//           warnings.push(
//             warning(
//               'SUGGESTION_MANUAL_SERVICE_OUTSIDE_ENGINE_REQUIREMENTS',
//               `Le service « ${targetTemplate!.name} » n’est pas prévu par les besoins du moteur pour le ${iso}. La décision managériale sera quand même appliquée.`,
//               {
//                 item_guid: item.guid,
//                 employee_guid: user.guid,
//                 date: iso,
//                 template_guid: targetTemplate!.guid,
//               },
//               [
//                 'Vérifier que ce service correspond bien à l’organisation réelle.',
//                 'Créer ou ajuster un besoin de couverture si ce service doit devenir une règle régulière.',
//               ],
//             ),
//           );
//         }
//
//         if (!templateHasWork(targetTemplate!, iso)) {
//           blockers.push(
//             blocker(
//               'SUGGESTION_BULK_EDIT_TEMPLATE_DAY_INVALID',
//               `Le service « ${targetTemplate!.name} » ne contient aucun horaire pour ${dayKey(iso)}.`,
//               { date: iso, template_guid: targetTemplate!.guid },
//               ['Corriger le modèle horaire ou choisir un autre service.'],
//             ),
//           );
//           continue;
//         }
//
//         if (before !== targetTemplate!.guid) {
//           clearPreviousGuardTail(item, iso);
//           state.schedule[iso] = targetTemplate!.guid;
//           state.reasons[iso] = buildManualReason(targetTemplate!, payload, 'DIRECT');
//           changes.push({
//             item_guid: item.guid,
//             employee_guid: user.guid,
//             employee_name: displayName(user),
//             date: iso,
//             kind: 'DIRECT',
//             before_template_guid: before,
//             after_template_guid: targetTemplate!.guid,
//             after_label: targetTemplate!.name,
//           });
//         }
//
//         if (requirement?.service_type === 'GUARD') {
//           const key = `${item.id}:${iso}`;
//           guardRequirementByDateAndItem.set(key, requirement);
//
//           const continuationTemplate = requirement.continuation_template
//             ? templatesById.get(requirement.continuation_template)
//             : null;
//           const continuationDate = addDays(iso, requirement.continuation_day_offset ?? 1);
//           const postGuardRestDays = config.rest_after_guard_required
//             ? Number(config.post_guard_rest_days ?? 1)
//             : 0;
//           const tailEnd = addDays(continuationDate, postGuardRestDays);
//           const maximumRepresentableContinuationDate = addDays(suggestion.period_to, 1);
//
//           // The storage/publication model can represent the technical continuation
//           // on periodTo + 1. Anything beyond that is structurally impossible.
//           if (continuationDate > maximumRepresentableContinuationDate) {
//             blockers.push(
//               blocker(
//                 'SUGGESTION_MANUAL_GUARD_CONTINUATION_OUTSIDE_MODEL',
//                 `La continuation technique de la garde du ${iso} tombe trop loin après la période de la suggestion.`,
//                 {
//                   item_guid: item.guid,
//                   employee_guid: user.guid,
//                   guard_date: iso,
//                   continuation_date: continuationDate,
//                   maximum_representable_date: maximumRepresentableContinuationDate,
//                 },
//                 ['Choisir une autre date ou étendre la période de la suggestion.'],
//               ),
//             );
//             continue;
//           }
//
//           if (tailEnd > suggestion.period_to) {
//             warnings.push(
//               warning(
//                 'SUGGESTION_MANUAL_GUARD_REST_OUTSIDE_PERIOD',
//                 `Une partie du repos post-garde attendu après la garde du ${iso} dépasse la période. Toké conserve la garde et sa continuation, mais ne forcera pas les jours situés hors période.`,
//                 {
//                   item_guid: item.guid,
//                   employee_guid: user.guid,
//                   guard_date: iso,
//                   continuation_date: continuationDate,
//                   expected_tail_end: tailEnd,
//                   suggestion_period_to: suggestion.period_to,
//                 },
//                 ['Tenir compte manuellement du repos après la fin de cette suggestion.'],
//               ),
//             );
//           }
//
//           if (!continuationTemplate || !templateHasWork(continuationTemplate, continuationDate)) {
//             blockers.push(
//               blocker(
//                 'SUGGESTION_BULK_EDIT_GUARD_CONTINUATION_INVALID',
//                 `La garde du ${iso} ne possède pas de continuation valide le ${continuationDate}.`,
//                 { requirement_guid: requirement.guid, guard_date: iso },
//                 ['Corriger le besoin de garde et son modèle de continuation.'],
//               ),
//             );
//             continue;
//           }
//
//           if (directDates.includes(continuationDate) && payload.action === 'ASSIGN_SERVICE') {
//             blockers.push(
//               blocker(
//                 'SUGGESTION_BULK_EDIT_GUARD_SELECTION_OVERLAP',
//                 `La sélection demande aussi une affectation directe le ${continuationDate}, alors que cette journée est réservée à la continuation de la garde du ${iso}.`,
//                 { employee_guid: user.guid, guard_date: iso, continuation_date: continuationDate },
//                 ['Retirer ce jour de la sélection ou réduire la plage de modification.'],
//               ),
//             );
//             continue;
//           }
//
//           const continuationBefore = state.schedule[continuationDate] ?? null;
//           state.schedule[continuationDate] = continuationTemplate.guid;
//           state.reasons[continuationDate] = buildManualReason(
//             continuationTemplate,
//             payload,
//             'GUARD_CONTINUATION',
//             iso,
//           );
//           if (continuationBefore !== continuationTemplate.guid) {
//             changes.push({
//               item_guid: item.guid,
//               employee_guid: user.guid,
//               employee_name: displayName(user),
//               date: continuationDate,
//               kind: 'GUARD_CONTINUATION',
//               before_template_guid: continuationBefore,
//               after_template_guid: continuationTemplate.guid,
//               after_label: continuationTemplate.name,
//             });
//           }
//
//           for (let offset = 1; offset <= postGuardRestDays; offset++) {
//             const restDate = addDays(continuationDate, offset);
//             if (restDate > suggestion.period_to) {
//               continue;
//             }
//
//             if (directDates.includes(restDate)) {
//               warnings.push(
//                 warning(
//                   'SUGGESTION_MANUAL_GUARD_REST_OVERRIDDEN',
//                   `Le ${restDate} fait normalement partie du repos post-garde après la garde du ${iso}, mais il est explicitement ciblé par la décision du manager. L’affectation manuelle est prioritaire.`,
//                   { employee_guid: user.guid, guard_date: iso, rest_date: restDate },
//                   ['Vérifier que cette dérogation est volontaire avant d’appliquer.'],
//                 ),
//               );
//               continue;
//             }
//
//             const restBefore = state.schedule[restDate] ?? null;
//             const restReasonBefore = state.reasons[restDate];
//             state.schedule[restDate] = null;
//             state.reasons[restDate] = buildManualReason(null, payload, 'POST_GUARD_REST', iso);
//             if (restBefore !== null || restReasonBefore?.source !== 'POST_GUARD_REST') {
//               changes.push({
//                 item_guid: item.guid,
//                 employee_guid: user.guid,
//                 employee_name: displayName(user),
//                 date: restDate,
//                 kind: 'POST_GUARD_REST',
//                 before_template_guid: restBefore,
//                 after_template_guid: null,
//                 after_label: 'Repos post-garde',
//               });
//             }
//           }
//         }
//       } else {
//         if (before !== null || state.reasons[iso]?.source !== 'MANUAL') {
//           clearPreviousGuardTail(item, iso);
//           state.schedule[iso] = null;
//           state.reasons[iso] = buildManualReason(null, payload, 'DIRECT');
//           changes.push({
//             item_guid: item.guid,
//             employee_guid: user.guid,
//             employee_name: displayName(user),
//             date: iso,
//             kind: 'DIRECT',
//             before_template_guid: before,
//             after_template_guid: null,
//             after_label: 'Repos',
//           });
//         }
//       }
//     }
//   }
//
//   // Deterministic employee-level checks. We compare before/after so an old
//   // problem does not prevent an incremental correction unless the manager makes
//   // it worse.
//   const maximumWorkDays =
//     config.max_consecutive_work_days === null || config.max_consecutive_work_days === undefined
//       ? null
//       : Number(config.max_consecutive_work_days);
//   const minimumRestMinutes = Number(config.min_rest_minutes_between_shifts ?? 0);
//
//   for (const item of selectedItems) {
//     const user = users.get(item.user);
//     if (!user) continue;
//     const state = simulated.get(item.id)!;
//
//     if (maximumWorkDays !== null && maximumWorkDays > 0) {
//       const beforeMaximum = maximumConsecutiveWorkDays(
//         item.schedule ?? {},
//         suggestion.period_from,
//         suggestion.period_to,
//       );
//       const afterMaximum = maximumConsecutiveWorkDays(
//         state.schedule,
//         suggestion.period_from,
//         suggestion.period_to,
//       );
//
//       if (afterMaximum > maximumWorkDays && afterMaximum > beforeMaximum) {
//         warnings.push(
//           warning(
//             'SUGGESTION_MANUAL_MAX_CONSECUTIVE_WORK_DAYS',
//             `La modification ferait travailler ${displayName(user)} ${afterMaximum} jours consécutifs, au-delà de la limite de ${maximumWorkDays}.`,
//             {
//               item_guid: item.guid,
//               employee_guid: user.guid,
//               before_maximum: beforeMaximum,
//               after_maximum: afterMaximum,
//               configured_maximum: maximumWorkDays,
//             },
//             ['Réduire la période de modification.', 'Ajouter un jour de repos dans la séquence.'],
//           ),
//         );
//       }
//     }
//
//     if (minimumRestMinutes > 0) {
//       const beforeViolations = restGapViolations(
//         item.schedule ?? {},
//         item.reasons ?? {},
//         templatesByGuid,
//         suggestion.period_from,
//         suggestion.period_to,
//         minimumRestMinutes,
//       );
//       const beforeKeys = new Set(
//         beforeViolations.map((entry) => `${entry.previousDate}:${entry.nextDate}`),
//       );
//       const afterViolations = restGapViolations(
//         state.schedule,
//         state.reasons,
//         templatesByGuid,
//         suggestion.period_from,
//         suggestion.period_to,
//         minimumRestMinutes,
//       );
//
//       for (const violation of afterViolations) {
//         const key = `${violation.previousDate}:${violation.nextDate}`;
//         if (beforeKeys.has(key)) continue;
//         warnings.push(
//           warning(
//             'SUGGESTION_MANUAL_MIN_REST_BETWEEN_SHIFTS',
//             `La modification ne laisserait que ${violation.gapMinutes} min de repos à ${displayName(user)} entre le ${violation.previousDate} et le ${violation.nextDate}, au lieu de ${minimumRestMinutes} min.`,
//             {
//               item_guid: item.guid,
//               employee_guid: user.guid,
//               previous_date: violation.previousDate,
//               next_date: violation.nextDate,
//               gap_minutes: violation.gapMinutes,
//               minimum_rest_minutes: minimumRestMinutes,
//             },
//             ['Choisir un autre service.', 'Ajouter un repos entre les deux services.'],
//           ),
//         );
//       }
//     }
//   }
//
//   // Recompute coverage against the complete simulated draft.
//   // Coverage rules guide the manager but never veto a manual business decision.
//   const impactedDates = new Set(changes.map((entry) => entry.date));
//   const previousCoverage = Array.isArray(diagnostics.coverage) ? diagnostics.coverage : [];
//   const requirementByGuid = new Map(requirements.map((entry) => [entry.guid, entry]));
//   const coverage = previousCoverage.map((entry: any) => {
//     const requirement = requirementByGuid.get(entry.requirementGuid);
//     if (!requirement) return entry;
//     const template = templatesById.get(requirement.session_template);
//     if (!template) return entry;
//
//     let assigned = 0;
//     for (const item of allItems) {
//       const user = users.get(item.user);
//       const profile = profiles.get(item.user);
//       if (
//         !user ||
//         !eligibilityForRequirement(requirement, profile, diagnostics, user.guid, entry.date)
//       )
//         continue;
//       if (simulated.get(item.id)?.schedule?.[entry.date] === template.guid) assigned++;
//     }
//
//     const minimum = Number(entry.minimum ?? requirement.min_employees ?? 0);
//     const target = Number(entry.target ?? requirement.target_employees ?? minimum);
//     const maximum =
//       entry.maximum === null || entry.maximum === undefined
//         ? (requirement.max_employees ?? null)
//         : Number(entry.maximum);
//     let beforeAssigned = 0;
//     for (const item of allItems) {
//       const user = users.get(item.user);
//       const profile = profiles.get(item.user);
//       if (
//         !user ||
//         !eligibilityForRequirement(requirement, profile, diagnostics, user.guid, entry.date)
//       )
//         continue;
//       if ((item.schedule ?? {})[entry.date] === template.guid) beforeAssigned++;
//     }
//
//     if (isHardCoverageWorsened(beforeAssigned, assigned, minimum, maximum)) {
//       warnings.push(
//         warning(
//           assigned < minimum
//             ? 'SUGGESTION_MANUAL_COVERAGE_BELOW_MINIMUM'
//             : 'SUGGESTION_MANUAL_COVERAGE_ABOVE_MAXIMUM',
//           assigned < minimum
//             ? `La modification ferait passer « ${template.name} » sous son minimum le ${entry.date} (${assigned}/${minimum}).`
//             : `La modification dépasserait le maximum de « ${template.name} » le ${entry.date} (${assigned}/${maximum}).`,
//           {
//             requirement_guid: requirement.guid,
//             date: entry.date,
//             before_assigned: beforeAssigned,
//             after_assigned: assigned,
//             minimum,
//             maximum,
//           },
//           [
//             'Modifier la sélection de collaborateurs.',
//             'Choisir un autre service ou une autre période.',
//             'Corriger le besoin de couverture si la règle métier a changé.',
//           ],
//         ),
//       );
//     } else if (assigned < minimum && impactedDates.has(entry.date)) {
//       warnings.push(
//         warning(
//           'SUGGESTION_BULK_EDIT_EXISTING_COVERAGE_GAP',
//           `Le minimum reste non atteint pour « ${template.name} » le ${entry.date} (${assigned}/${minimum}), mais cette modification ne dégrade pas la situation.`,
//           { requirement_guid: requirement.guid, date: entry.date, assigned, minimum },
//           ['Poursuivre les corrections avant publication.'],
//         ),
//       );
//     } else if (maximum !== null && assigned > maximum && impactedDates.has(entry.date)) {
//       warnings.push(
//         warning(
//           'SUGGESTION_BULK_EDIT_EXISTING_COVERAGE_EXCESS',
//           `Le maximum reste dépassé pour « ${template.name} » le ${entry.date} (${assigned}/${maximum}), mais cette modification ne dégrade pas la situation.`,
//           { requirement_guid: requirement.guid, date: entry.date, assigned, maximum },
//           ['Poursuivre les corrections avant publication.'],
//         ),
//       );
//     } else if (assigned < target && impactedDates.has(entry.date)) {
//       warnings.push(
//         warning(
//           'SUGGESTION_BULK_EDIT_TARGET_NOT_REACHED',
//           `La cible de « ${template.name} » n’est pas atteinte le ${entry.date} (${assigned}/${target}), sans passer sous le minimum.`,
//           { requirement_guid: requirement.guid, date: entry.date, assigned, target },
//         ),
//       );
//     }
//
//     return {
//       ...entry,
//       assigned,
//       status: coverageStatus(assigned, minimum, target, maximum),
//     };
//   });
//
//   const coverageViolations: any[] = [];
//   for (const entry of coverage) {
//     if (entry.status === 'BELOW_MINIMUM') {
//       coverageViolations.push({
//         severity: 'WARNING',
//         code: 'MIN_COVERAGE_NOT_REACHED',
//         date: entry.date,
//         requirementGuid: entry.requirementGuid,
//         message: `Minimum de couverture non atteint pour ${entry.templateName}: ${entry.assigned}/${entry.minimum}.`,
//       });
//     } else if (entry.status === 'ABOVE_MAXIMUM') {
//       coverageViolations.push({
//         severity: 'WARNING',
//         code: 'MAX_COVERAGE_EXCEEDED',
//         date: entry.date,
//         requirementGuid: entry.requirementGuid,
//         message: `Maximum de couverture dépassé pour ${entry.templateName}: ${entry.assigned}/${entry.maximum}.`,
//       });
//     } else if (entry.status === 'BELOW_TARGET') {
//       coverageViolations.push({
//         severity: 'WARNING',
//         code: 'TARGET_COVERAGE_NOT_REACHED',
//         date: entry.date,
//         requirementGuid: entry.requirementGuid,
//         message: `Cible de couverture non atteinte pour ${entry.templateName}: ${entry.assigned}/${entry.target}.`,
//       });
//     }
//   }
//
//   const preservedViolations = Array.isArray(diagnostics.violations)
//     ? diagnostics.violations.filter((entry: any) => !COVERAGE_VIOLATION_CODES.has(entry?.code))
//     : [];
//   const violations = [...preservedViolations, ...coverageViolations];
//
//   const coverageScore =
//     coverage.length === 0
//       ? 0
//       : Math.round(
//           (coverage.reduce((sum: number, entry: any) => {
//             const target = Number(entry.target ?? 0);
//             return sum + (target === 0 ? 1 : Math.min(1, Number(entry.assigned ?? 0) / target));
//           }, 0) /
//             coverage.length) *
//             100,
//         );
//
//   const guardTemplateGuids = new Set(
//     requirements
//       .filter((entry) => entry.service_type === 'GUARD')
//       .map((entry) => templatesById.get(entry.session_template)?.guid)
//       .filter(Boolean) as string[],
//   );
//
//   const rotatingLoads: number[] = [];
//   for (const item of allItems) {
//     const profile = profiles.get(item.user);
//     if (profile?.planning_mode !== 'ROTATING') continue;
//     const state = simulated.get(item.id)!;
//     let shifts = 0;
//     let guards = 0;
//     let weekends = 0;
//     for (const iso of periodDates(suggestion.period_from, suggestion.period_to)) {
//       const value = state.schedule[iso];
//       if (!value) continue;
//       shifts++;
//       if (guardTemplateGuids.has(value)) guards++;
//       if (['Sat', 'Sun'].includes(dayKey(iso))) weekends++;
//     }
//     rotatingLoads.push(shifts + guards * 2 + weekends);
//   }
//   const fairnessScore =
//     rotatingLoads.length <= 1
//       ? 100
//       : Math.max(
//           0,
//           Math.round(100 - (Math.max(...rotatingLoads) - Math.min(...rotatingLoads)) * 12.5),
//         );
//
//   const warningPenalty = Math.min(
//     20,
//     violations.filter((entry: any) => entry?.severity === 'WARNING').length * 2,
//   );
//   const conformityScore = Math.max(
//     0,
//     Math.round(coverageScore * 0.75 + fairnessScore * 0.25 - warningPenalty),
//   );
//
//   const nextDiagnostics = {
//     ...diagnostics,
//     coverage,
//     violations,
//     coverageScore,
//     fairnessScore,
//     lastManualBulkEdit: {
//       at: new Date().toISOString(),
//       action: payload.action,
//       periodFrom: payload.period_from,
//       periodTo: payload.period_to,
//       dates: payload.dates ?? [],
//       weekdays: payload.weekdays ?? [],
//       templateGuid: payload.action === 'ASSIGN_SERVICE' ? payload.template_guid : null,
//       selectedItemCount: selectedItems.length,
//       affectedCellCount: changes.length,
//       reason: payload.reason?.trim() || null,
//     },
//   };
//
//   // De-duplicate identical issues generated through overlapping checks.
//   const dedupeIssues = (items: SuggestionBulkEditIssue[]): SuggestionBulkEditIssue[] => {
//     const seen = new Set<string>();
//     return items.filter((entry) => {
//       const key = `${entry.code}:${JSON.stringify(entry.details ?? {})}`;
//       if (seen.has(key)) return false;
//       seen.add(key);
//       return true;
//     });
//   };
//
//   const result: SuggestionBulkEditResult = {
//     suggestion_guid: suggestionGuid,
//     affected_items: new Set(changes.map((entry) => entry.item_guid)).size,
//     affected_cells: changes.length,
//     direct_dates: directDates,
//     changes,
//     blockers: dedupeIssues(blockers),
//     warnings: dedupeIssues(warnings),
//     diagnostics: nextDiagnostics,
//     conformity_score: conformityScore,
//     applied: false,
//   };
//
//   return {
//     result,
//     itemUpdates: simulated,
//     suggestionId: suggestion.id,
//   };
// }
//
// export async function previewScheduleSuggestionBulkEdit(
//   suggestionGuid: string,
//   payload: SuggestionBulkEditPayload,
// ): Promise<SuggestionBulkEditResult> {
//   const plan = await buildPlan(suggestionGuid, payload);
//   return plan.result;
// }
//
// export async function applyScheduleSuggestionBulkEdit(
//   suggestionGuid: string,
//   payload: SuggestionBulkEditPayload,
// ): Promise<SuggestionBulkEditResult> {
//   const sequelize = TenantManager.getConnectionSync();
//   const { SuggestionModel, ItemModel } = requireModels();
//
//   return await sequelize.transaction(
//     { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
//     async (transaction) => {
//       const plan = await buildPlan(suggestionGuid, payload, transaction, true);
//
//       if (plan.result.blockers.length > 0) {
//         throw new SuggestionBulkEditError(
//           plan.result.blockers[0]?.message ??
//             'The manual edit contains a technical integrity conflict',
//           'SUGGESTION_MANUAL_EDIT_TECHNICALLY_BLOCKED',
//           422,
//           {
//             blockers: plan.result.blockers,
//             warnings: plan.result.warnings,
//             preview: plan.result,
//           },
//         );
//       }
//
//       const changedItemGuids = new Set(plan.result.changes.map((entry) => entry.item_guid));
//       for (const [itemId, state] of plan.itemUpdates.entries()) {
//         const plainItem = await ItemModel.findOne({
//           where: { id: itemId, deleted_at: null },
//           attributes: ['guid'],
//           transaction,
//         });
//         if (!plainItem || !changedItemGuids.has(plainItem.get('guid') as string)) continue;
//
//         await ItemModel.update(
//           {
//             schedule: state.schedule,
//             reasons: state.reasons,
//           },
//           {
//             where: { id: itemId, deleted_at: null },
//             transaction,
//           },
//         );
//       }
//
//       await SuggestionModel.update(
//         {
//           diagnostics: plan.result.diagnostics,
//           conformity_score: plan.result.conformity_score,
//         },
//         {
//           where: { id: plan.suggestionId, status: 'draft', deleted_at: null },
//           transaction,
//         },
//       );
//
//       return {
//         ...plan.result,
//         applied: true,
//       };
//     },
//   );
// }
