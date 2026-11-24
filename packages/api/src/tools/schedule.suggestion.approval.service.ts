import { createHash } from 'node:crypto';
import { Op, Transaction, type Model } from 'sequelize';
import { SAFamily, TimezoneConfigUtils } from '@toke/shared';

import { TableInitializer } from '../tenant/database/db.initializer.js';
import TenantManager from '../tenant/database/db.tenant-manager.js';
import { tableName } from '../utils/response.model.js';
import { eligibilityForRequirement, restGapViolations } from '../utils/schedule.suggestion.bulk-edit.service.js';
import {
  SuggestionApprovalError,
  suggestionApplicationPeriod,
} from '../utils/schedule.suggestion.application-period.js';
export { SuggestionApprovalError } from '../utils/schedule.suggestion.application-period.js';

type ScheduleValue = string | null;

interface ScheduleBlock {
  templateGuid: string | null;
  from: string;
  to: string;
}

interface TemplateSnapshot {
  id: number;
  guid: string;
  name: string;
  definition: Record<string, any>;
  version: number;
  is_default: boolean;
  snapshot_date: string;
  session_model: number | null;
}

export interface SuggestionApprovalResult {
  suggestionGuid: string;
  effectiveFrom: string;
  effectiveTo: string;
  createdCount: number;
  deactivatedCount: number;
  preservedFragmentCount: number;
  employeeCount: number;
}

function addDays(iso: string, amount: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function periodDates(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

function dayKey(iso: string): string {
  const keys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return keys[new Date(`${iso}T00:00:00.000Z`).getUTCDay()]!;
}

function buildBlocks(
  schedule: Record<string, ScheduleValue>,
  expectedDates: string[],
  isolatedDates = new Set<string>(),
): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  let currentValue: ScheduleValue | undefined;
  let currentStart: string | null = null;
  let previousDate: string | null = null;

  const closeCurrent = (): void => {
    if (currentStart === null || previousDate === null || currentValue === undefined) return;
    blocks.push({
      templateGuid: currentValue,
      from: currentStart,
      to: previousDate,
    });
  };

  for (const iso of expectedDates) {
    const value = schedule[iso];

    if (value === undefined) {
      throw new SuggestionApprovalError(
        `Missing schedule value for ${iso}`,
        'SUGGESTION_SCHEDULE_INCOMPLETE',
        422,
        { date: iso },
      );
    }

    const isConsecutive = previousDate === null || addDays(previousDate, 1) === iso;

    if (currentValue === undefined || value !== currentValue || !isConsecutive || isolatedDates.has(iso) || (previousDate !== null && isolatedDates.has(previousDate))) {
      closeCurrent();
      currentValue = value;
      currentStart = iso;
    }

    previousDate = iso;
  }

  closeCurrent();
  return blocks;
}

interface ScheduleReason {
  source?: string;
  templateGuid?: string | null;
}

function getAuthorizedSpilloverDates(item: any, periodTo: string): string[] {
  const schedule = item.schedule as Record<string, ScheduleValue>;
  const reasons = (item.reasons ?? {}) as Record<string, ScheduleReason | null>;

  const dates: string[] = [];
  let previousReason = reasons[periodTo];
  let continuationAlreadySeen = previousReason?.source === 'GUARD_CONTINUATION';

  // Une garde peut se terminer dans la période ou à periodTo + 1.
  // Les repos post-garde doivent former une chaîne consécutive.
  for (let offset = 1; offset <= 32; offset++) {
    const iso = addDays(periodTo, offset);

    if (!(iso in schedule)) {
      break;
    }

    const reason = reasons[iso];
    const value = schedule[iso];

    const validContinuation =
      !continuationAlreadySeen &&
      offset === 1 &&
      value !== null &&
      value !== undefined &&
      reason?.source === 'GUARD_CONTINUATION' &&
      reason.templateGuid === value;

    const validPostGuardRest =
      value === null &&
      reason?.source === 'POST_GUARD_REST' &&
      (reason.templateGuid === null || reason.templateGuid === undefined) &&
      (previousReason?.source === 'GUARD_CONTINUATION' ||
        previousReason?.source === 'POST_GUARD_REST');

    if (!validContinuation && !validPostGuardRest) {
      break;
    }

    dates.push(iso);
    continuationAlreadySeen = continuationAlreadySeen || validContinuation;
    previousReason = reason;
  }

  return dates;
}

function makeRestSnapshot(): TemplateSnapshot {
  return {
    id: 0,
    guid: 'planned-rest',
    name: 'Repos planifié',
    definition: {
      Mon: [],
      Tue: [],
      Wed: [],
      Thu: [],
      Fri: [],
      Sat: [],
      Sun: [],
    },
    version: 1,
    is_default: false,
    snapshot_date: TimezoneConfigUtils.getCurrentTime().toISOString(),
    session_model: null,
  };
}

function makeTemplateSnapshot(template: any): TemplateSnapshot {
  return {
    id: template.id,
    guid: template.guid,
    name: template.name,
    definition: template.definition,
    version: template.version ?? 1,
    is_default: template.defaults ?? false,
    snapshot_date: TimezoneConfigUtils.getCurrentTime().toISOString(),
    session_model: template.session_model ?? null,
  };
}

function makeNumericGuid(nextId: number): string {
  const idPart = String(nextId);
  const totalLength = 16;
  const randomLength = totalLength - idPart.length - 1;

  if (randomLength < 1) {
    throw new Error('Unable to generate a 16-character schedule assignment GUID');
  }

  let prefix = '';
  for (let index = 0; index < randomLength; index++) {
    prefix += Math.floor(Math.random() * 10);
  }

  return `${prefix}0${idPart}`;
}

function hasWorkForEveryDate(snapshot: TemplateSnapshot, from: string, to: string): boolean {
  for (const iso of periodDates(from, to)) {
    const value = snapshot.definition?.[dayKey(iso)];
    if (!Array.isArray(value) || value.length === 0) return false;
  }
  return true;
}

function approvalModels() {
  const SuggestionModel = TableInitializer.getModel(tableName.SCHEDULE_SUGGESTION);
  const ItemModel = TableInitializer.getModel(tableName.SCHEDULE_SUGGESTION_ITEM);
  const AssignmentModel = TableInitializer.getModel(tableName.SCHEDULE_ASSIGNMENTS);
  const SessionTemplateModel = TableInitializer.getModel(tableName.SESSION_TEMPLATES);
  const UserModel = TableInitializer.getModel(tableName.USERS);
  const RequirementModel = TableInitializer.getModel(tableName.PLANNING_SUGGESTION_REQUIREMENT);
  const ProfileModel = TableInitializer.getModel(tableName.EMPLOYEE_PLANNING_PROFILE);
  const ConfigModel = TableInitializer.getModel(tableName.PLANNING_SUGGESTION_CONFIG);

  if (!SuggestionModel || !ItemModel || !AssignmentModel || !SessionTemplateModel || !UserModel || !RequirementModel || !ProfileModel || !ConfigModel) {
    throw new SuggestionApprovalError(
      'One or more required database models are not registered',
      'SUGGESTION_APPROVAL_MODEL_NOT_REGISTERED',
      500,
    );
  }

  return { SuggestionModel, ItemModel, AssignmentModel, SessionTemplateModel, UserModel, RequirementModel, ProfileModel, ConfigModel };
}

interface ApprovalAlert {
  severity: 'INFO' | 'WARNING' | 'BLOCKING';
  code: string;
  message: string;
  details?: unknown;
}

interface ApprovalActor { id: number; guid: string; kind: 'MANAGER_SESSION' | 'DELEGATED_INTEGRATOR'; timezone?: string }

interface ApprovalPlan {
  userGuid: string;
  userId: number;
  reasons: Record<string, ScheduleReason | null>;
  existingInstances: Model[];
  existingRows: Array<Record<string, any>>;
  blocks: Array<ScheduleBlock & { snapshot: TemplateSnapshot }>;
  appliedDates: string[];
  detachedContinuations: Model[];
  historicalCuts: Map<string, TemplateSnapshot>;
  historicalContinuationParent?: string;
  historicalGuardStarts: Array<{ instance: Model; continuationGuid: string }>;
  finalSchedule: Record<string, ScheduleValue | undefined>;
}

const isGuardTail = (source?: string) => source === 'GUARD_CONTINUATION' || source === 'POST_GUARD_REST';

function remainingAssignmentRanges(from: string, to: string | null, dates: string[]) {
  const ranges: Array<{ from: string; to: string | null }> = [];
  let start = from;
  for (const date of dates) {
    if (date < start || (to !== null && date > to)) continue;
    if (start < date) ranges.push({ from: start, to: addDays(date, -1) });
    start = addDays(date, 1);
  }
  if (to === null || start <= to) ranges.push({ from: start, to });
  return ranges;
}

function timeMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour! * 60 + minute!;
}

function workIntervals(snapshot: TemplateSnapshot | undefined, date: string, offset = 0) {
  const blocks = snapshot?.definition?.[dayKey(date)];
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap(block => {
    if (!Array.isArray(block?.work) || block.work.length !== 2 || block.work.some((value: unknown) => typeof value !== 'string')) return [];
    const start = timeMinutes(block.work[0]);
    const end = timeMinutes(block.work[1]);
    return [{ start: start + offset, end: end + offset + (end <= start ? 1440 : 0), hours: block.work as string[] }];
  });
}

function historicalSnapshotAtMidnight(snapshot: TemplateSnapshot, date: string): TemplateSnapshot {
  const day = dayKey(date);
  return {
    ...snapshot,
    definition: {
      ...snapshot.definition,
      [day]: snapshot.definition[day].map((block: any) => {
        if (timeMinutes(block.work[1]) > timeMinutes(block.work[0]) || block.work[1] === '00:00') return block;
        const clipped = { ...block, work: [block.work[0], '24:00'] };
        if (Array.isArray(block.pause)) {
          const start = timeMinutes(block.work[0]);
          const pauseStart = timeMinutes(block.pause[0]);
          const pauseEnd = timeMinutes(block.pause[1]);
          if (pauseStart < start) delete clipped.pause;
          else if (pauseEnd <= pauseStart) clipped.pause = [block.pause[0], '24:00'];
        }
        return clipped;
      }),
    },
  };
}

async function validateApproval(
  models: ReturnType<typeof approvalModels>,
  suggestionGuid: string,
  effectiveFrom: unknown,
  transaction: Transaction,
  forUpdate: boolean,
  now: Date,
  actor: ApprovalActor,
) {
  const { SuggestionModel, ItemModel, UserModel, SessionTemplateModel, AssignmentModel, RequirementModel, ProfileModel, ConfigModel } = models;
  const suggestionInstance = await SuggestionModel.findOne({
    where: { guid: suggestionGuid, deleted_at: null },
    transaction,
    ...(forUpdate ? { lock: transaction.LOCK.UPDATE } : {}),
  });

  if (!suggestionInstance || (actor.kind !== 'DELEGATED_INTEGRATOR' && suggestionInstance.get('manager') !== actor.id)) {
    throw new SuggestionApprovalError('Suggestion introuvable.', 'SUGGESTION_NOT_FOUND', 404);
  }

  const suggestion = suggestionInstance.get({ plain: true });

  if (suggestion.status !== 'draft') {
    throw new SuggestionApprovalError(
      'Seule une suggestion en brouillon peut être publiée.',
      'SUGGESTION_ALREADY_RESOLVED',
      409,
    );
  }

  const periodFrom = suggestion.period_from as string;
  const periodTo = suggestion.period_to as string;
  const applicationPeriod = suggestionApplicationPeriod(
    periodFrom,
    periodTo,
    effectiveFrom,
    now,
    actor.timezone ?? TimezoneConfigUtils.getTimezone(),
  );
  const expectedDates = periodDates(periodFrom, periodTo);
  const applicationDates = periodDates(applicationPeriod.from, applicationPeriod.to);
  const expectedDateSet = new Set(expectedDates);

  const itemInstances = await ItemModel.findAll({
    where: { suggestion: suggestion.id, deleted_at: null },
    transaction,
    ...(forUpdate ? { lock: transaction.LOCK.UPDATE } : {}),
    order: [['id', 'ASC']],
  });

  if (itemInstances.length === 0) {
    throw new SuggestionApprovalError(
      'La suggestion ne contient aucun planning collaborateur.',
      'SUGGESTION_EMPTY',
      422,
    );
  }

  const items = itemInstances.map((instance: any) => instance.get({ plain: true }));
  const userIds = [...new Set(items.map((item: any) => item.user))];
  if (userIds.length !== items.length) {
    throw new SuggestionApprovalError('La suggestion contient plusieurs plannings pour un même collaborateur.',
      'SUGGESTION_DUPLICATE_EMPLOYEE', 422);
  }

  const userInstances = await UserModel.findAll({
    where: { id: { [Op.in]: userIds } },
    transaction,
    ...(forUpdate ? { lock: transaction.LOCK.SHARE } : {}),
  });

  const usersById = new Map<number, any>(
    userInstances.map((instance: any) => {
      const user = instance.get({ plain: true });
      return [user.id, user];
    }),
  );

  if (usersById.size !== userIds.length) {
    const missing = userIds.filter((id) => !usersById.has(id));
    throw new SuggestionApprovalError(
      'Un ou plusieurs collaborateurs de la suggestion ne sont plus disponibles.',
      'SUGGESTION_EMPLOYEE_NOT_FOUND',
      422,
      { missing_employee_count: missing.length },
    );
  }

  const referencedTemplateGuids = new Set<string>();

  for (const item of items) {
    const schedule = item.schedule as Record<string, ScheduleValue>;

    if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
      throw new SuggestionApprovalError(
        `Le planning d’un collaborateur est invalide.`,
        'SUGGESTION_SCHEDULE_INVALID',
        422,
      );
    }

    const scheduleDates = Object.keys(schedule);
    const missingDates = expectedDates.filter((iso) => !(iso in schedule));
    const extraDates = scheduleDates.filter((iso) => !expectedDateSet.has(iso));
    const authorizedSpilloverDates = getAuthorizedSpilloverDates(item, periodTo);
    const authorizedSpilloverSet = new Set(authorizedSpilloverDates);
    const invalidExtraDates = extraDates.filter((iso) => !authorizedSpilloverSet.has(iso));

    if (missingDates.length > 0 || invalidExtraDates.length > 0) {
      throw new SuggestionApprovalError(
        `Le planning d’un collaborateur ne couvre pas correctement la période de la suggestion.`,
        'SUGGESTION_SCHEDULE_PERIOD_MISMATCH',
        422,
        {
          item_guid: item.guid,
          missing_dates: missingDates,
          extra_dates: extraDates,
          invalid_extra_dates: invalidExtraDates,
          authorized_spillover_dates: authorizedSpilloverDates,
        },
      );
    }

    for (const iso of [...applicationDates, ...authorizedSpilloverDates]) {
      const value = schedule[iso];
      if (value !== null) referencedTemplateGuids.add(value);
    }
  }

  const templateInstances =
    referencedTemplateGuids.size > 0
      ? await SessionTemplateModel.findAll({
          where: {
            guid: { [Op.in]: [...referencedTemplateGuids] },
            current: true,
            deleted_at: null,
          },
          transaction,
          ...(forUpdate ? { lock: transaction.LOCK.SHARE } : {}),
        })
      : [];

  const templatesByGuid = new Map<string, TemplateSnapshot>(
    templateInstances.map((instance: any) => {
      const template = instance.get({ plain: true });
      return [template.guid, makeTemplateSnapshot(template)];
    }),
  );

  const missingTemplateGuids = [...referencedTemplateGuids].filter(
    (guid) => !templatesByGuid.has(guid),
  );

  if (missingTemplateGuids.length > 0) {
    throw new SuggestionApprovalError(
      'Un ou plusieurs modèles horaires de la suggestion ne sont plus disponibles.',
      'SUGGESTION_TEMPLATE_NOT_FOUND',
      422,
      { template_guids: missingTemplateGuids },
    );
  }

  const alerts: ApprovalAlert[] = [];
  let boundaryUntil: string | undefined;
  let replacedAssignments = 0;
  let adjustedAssignments = 0;
  let truncatedOvernightAssignments = 0;
  let detachedGuardContinuations = 0;
  const plans: ApprovalPlan[] = [];
  for (const item of items) {
    const user = usersById.get(item.user);
    const userGuid = user.guid as string;
    const schedule = item.schedule as Record<string, ScheduleValue>;
    const spilloverDates = getAuthorizedSpilloverDates(item, periodTo);
    const itemDates = [...applicationDates, ...spilloverDates];
    const itemPeriodTo = itemDates[itemDates.length - 1]!;
    const reasons = (item.reasons ?? {}) as Record<string, ScheduleReason | null>;

    const nextDate = addDays(itemPeriodTo, 1);
    const nearbyInstances = await AssignmentModel.findAll({
      where: {
        family: SAFamily.USER,
        related: userGuid,
        active: true,
        deleted_at: null,
        start_date: { [Op.lte]: nextDate },
        [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: addDays(applicationPeriod.from, -1) } }],
      },
      transaction,
      ...(forUpdate ? { lock: transaction.LOCK.UPDATE } : {}),
      order: [['start_date', 'ASC']],
    });

    const existingRows = nearbyInstances.map(instance => instance.get({ plain: true }));
    const byGuid = new Map(existingRows.map(row => [row.guid, row]));
    const covers = (row: any, date: string) => row.start_date <= date && (row.end_date === null || row.end_date >= date);
    const affects = (row: any) => row.start_date <= itemPeriodTo &&
      (row.end_date === null || row.end_date >= applicationPeriod.from);
    const employeeName = [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined;
    const context = { item_guid: item.guid, employee_guid: userGuid, employee_name: employeeName };
    const guardDetails = (row: any) => row && ({
      guid: row.guid, date: row.start_date, end_date: row.end_date,
      template_name: row.session_template?.name,
      hours: workIntervals(row.session_template, row.start_date).map(interval => interval.hours),
    });
    const previousDate = addDays(applicationPeriod.from, -1);
    const historicalCuts = new Map<string, TemplateSnapshot>();
    for (const row of existingRows) {
      if (!covers(row, previousDate)) continue;
      const intervals = workIntervals(row.session_template, previousDate).filter(interval => interval.end > 1440);
      if (!intervals.length) continue;
      historicalCuts.set(row.guid, historicalSnapshotAtMidnight(row.session_template, previousDate));
      if (!boundaryUntil || applicationPeriod.from > boundaryUntil) boundaryUntil = applicationPeriod.from;
      alerts.push({
        severity: 'WARNING', code: 'SUGGESTION_OVERNIGHT_ASSIGNMENT_TRUNCATED',
        message: 'Le service publié qui traverse la prise d’effet sera arrêté à minuit. Le nouveau planning s’applique à partir de cette heure.',
        details: { ...context, date: applicationPeriod.from, action: 'PUBLISHED_GUARD',
          guard: { ...guardDetails(row), date: previousDate, hours: intervals.map(interval => interval.hours) },
          consequence: `La partie avant minuit le ${applicationPeriod.from.split('-').reverse().join('/')} est conservée.`,
        },
      });
    }

    const existingInstances = nearbyInstances.filter(instance => {
      const row = instance.get({ plain: true });
      return affects(row) || historicalCuts.has(row.guid);
    });
    const detachedContinuations: Model[] = [];
    let historicalContinuationParent: string | undefined;
    const historicalGuardStarts: ApprovalPlan['historicalGuardStarts'] = [];
    for (const instance of nearbyInstances) {
      const row = instance.get({ plain: true });
      if (!row.continuation_of_guid) continue;
      const parent = byGuid.get(row.continuation_of_guid);
      const continuationReplaced = affects(row);
      const parentReplaced = parent && affects(parent);
      if (!continuationReplaced && !parentReplaced) continue;
      const matchingHistoricalLink = continuationReplaced && row.start_date === applicationPeriod.from &&
        row.end_date === applicationPeriod.from && parent?.start_date === previousDate && parent.end_date === previousDate &&
        reasons[applicationPeriod.from]?.source === 'GUARD_CONTINUATION' &&
        reasons[applicationPeriod.from]?.templateGuid === schedule[applicationPeriod.from] &&
        schedule[applicationPeriod.from] != null &&
        row.session_template?.guid === schedule[applicationPeriod.from] &&
        workIntervals(parent.session_template, previousDate).length > 0 &&
        JSON.stringify(workIntervals(row.session_template, applicationPeriod.from)) ===
          JSON.stringify(workIntervals(templatesByGuid.get(schedule[applicationPeriod.from]!), applicationPeriod.from)) &&
        (schedule[previousDate] === undefined || schedule[previousDate] === parent.session_template?.guid);
      if (matchingHistoricalLink) historicalContinuationParent = parent.guid;
      else if (continuationReplaced && row.start_date === applicationPeriod.from && row.end_date === applicationPeriod.from &&
        parent?.start_date === previousDate && parent.end_date === previousDate) {
        const instance = nearbyInstances.find(candidate => candidate.get('guid') === parent.guid);
        if (instance) historicalGuardStarts.push({ instance, continuationGuid: row.guid });
      }
      if (!continuationReplaced && parentReplaced) detachedContinuations.push(instance);
      if (continuationReplaced && row.start_date === applicationPeriod.from && !matchingHistoricalLink &&
          (!boundaryUntil || row.start_date > boundaryUntil)) boundaryUntil = row.start_date;
      alerts.push({
        severity: 'WARNING', code: 'SUGGESTION_PUBLISHED_GUARD_IMPACT',
        message: matchingHistoricalLink
          ? 'La continuation future est remplacée par la suggestion et reste liée au début de garde historique.'
          : !continuationReplaced
            ? 'Le début de garde est remplacé. La continuation hors période reste en place et son lien est retiré.'
            : parentReplaced
              ? 'Le début de garde et la continuation publiés sont remplacés sur la période.'
              : parent
                ? 'La continuation publiée est remplacée. Le début de garde hors période reste en place.'
                : 'La continuation publiée est remplacée. Son début de garde n’a pas pu être vérifié.',
        details: { ...context, date: row.start_date, action: 'PUBLISHED_GUARD',
          guard: guardDetails(parent), continuation: guardDetails(row),
          impact: !continuationReplaced ? 'CONTINUATION_DETACHED' : 'REPLACED',
        },
      });
    }

    const appliedDates = itemDates;
    for (const date of appliedDates) {
      const source = reasons[date]?.source;
      const prior = addDays(date, -1);
      let hasStart = false;
      if (source === 'GUARD_CONTINUATION') {
        hasStart = reasons[date]?.templateGuid === schedule[date] && schedule[date] !== null &&
          (date === applicationPeriod.from ? Boolean(historicalContinuationParent)
            : Boolean(schedule[prior]) && !isGuardTail(reasons[prior]?.source));
      } else if (source === 'POST_GUARD_REST') {
        let start = prior;
        while (start >= applicationPeriod.from && isGuardTail(reasons[start]?.source)) {
          if (start === applicationPeriod.from && historicalContinuationParent) {
            hasStart = true;
            break;
          }
          start = addDays(start, -1);
        }
        hasStart ||= start >= applicationPeriod.from && Boolean(schedule[start]);
      }
      if (!isGuardTail(source) || hasStart) continue;
      if (date === applicationPeriod.from && (!boundaryUntil || date > boundaryUntil)) boundaryUntil = date;
      alerts.push({
        severity: 'WARNING', code: 'SUGGESTION_GUARD_CONTINUITY_WARNING',
        message: source === 'GUARD_CONTINUATION'
          ? 'La plage prévue sera publiée sans lien de garde, car aucun début compatible ne peut lui être associé.'
          : 'Le repos prévu sera publié même si le début de garde associé n’est pas appliqué.',
        details: { ...context, date, action: 'EDIT_ASSIGNMENT' },
      });
    }
    for (const date of appliedDates) {
      const published = existingRows.filter(row => covers(row, date));
      if (published.length < 2) continue;
      const intervals = published.flatMap(row => workIntervals(row.session_template, date))
        .sort((left, right) => left.start - right.start);
      if (!intervals.some((interval, index) => intervals.slice(0, index).some(other => other.end > interval.start))) continue;
      alerts.push({
        severity: 'WARNING', code: 'SUGGESTION_PUBLISHED_HOURS_OVERLAP',
        message: 'Des horaires déjà publiés se chevauchent. Ils seront remplacés sur cette journée.',
        details: { ...context, date, action: 'EDIT_ASSIGNMENT', hours: intervals.map(interval => interval.hours) },
      });
    }
    const isolatedDates = new Set<string>();
    for (const date of appliedDates) {
      if (reasons[date]?.source === 'GUARD_CONTINUATION') {
        isolatedDates.add(date);
        isolatedDates.add(addDays(date, -1));
      }
    }
    const blocks = buildBlocks(schedule, appliedDates, isolatedDates);
    for (const instance of existingInstances) {
      const existing = instance.get({ plain: true });
      if (remainingAssignmentRanges(existing.start_date, existing.end_date, appliedDates).length) adjustedAssignments++;
      else replacedAssignments++;
    }
    truncatedOvernightAssignments += historicalCuts.size;
    detachedGuardContinuations += detachedContinuations.length;
    const validatedBlocks = blocks.map((block) => {
      const snapshot =
        block.templateGuid === null
          ? makeRestSnapshot()
          : templatesByGuid.get(block.templateGuid);

      if (!snapshot) {
        throw new SuggestionApprovalError(
          'Un modèle horaire de la suggestion est introuvable.',
          'SUGGESTION_TEMPLATE_NOT_FOUND',
          422,
        );
      }

      if (block.templateGuid !== null && !hasWorkForEveryDate(snapshot, block.from, block.to)) {
        throw new SuggestionApprovalError(
          `Le modèle horaire « ${snapshot.name} » ne prévoit pas de travail à toutes les dates de cette affectation.`,
          'SUGGESTION_TEMPLATE_DAY_INVALID',
          422,
          {
            template_guid: snapshot.guid,
            period_from: block.from,
            period_to: block.to,
          },
        );
      }

      return { ...block, snapshot };
    });
    // Compare concrete time blocks on adjacent civil dates, including the
    // first unaffected day after the application.
    const after = addDays(itemPeriodTo, 1);
    const actualIntervals = new Map<string, ReturnType<typeof workIntervals>>();
    const dates = periodDates(previousDate, after);
    for (const date of dates) {
      const block = validatedBlocks.find(value => date >= value.from && date <= value.to);
      const snapshots = block ? [block.snapshot] : existingRows.filter(row => covers(row, date))
        .map(row => historicalCuts.get(row.guid) && date === previousDate ? historicalCuts.get(row.guid) : row.session_template);
      const intervals = snapshots.flatMap(snapshot => workIntervals(snapshot, date))
        .sort((left, right) => left.start - right.start);
      actualIntervals.set(date, intervals);
      if (date < applicationPeriod.from) continue;
      const priorIntervals = actualIntervals.get(addDays(date, -1)) ?? [];
      const overlap = intervals.some((interval, index) =>
        (date <= itemPeriodTo && intervals.slice(0, index).some(other => other.end > interval.start)) ||
        priorIntervals.some(other => other.end - 1440 > interval.start));
      if (overlap) {
        alerts.push({
          severity: 'WARNING', code: 'SUGGESTION_PUBLICATION_HOURS_OVERLAP',
          message: 'Les horaires se chevauchent. Les plages validées seront appliquées à leurs dates respectives.',
          details: { ...context, date: date <= itemPeriodTo ? date : itemPeriodTo, action: 'EDIT_ASSIGNMENT',
            consequence: `Chevauchement le ${date.split('-').reverse().join('/')}.`,
            hours: [...priorIntervals, ...intervals].map(interval => interval.hours),
          },
        });
      }
    }
    plans.push({
      userGuid, userId: item.user as number, reasons, existingInstances, existingRows, blocks: validatedBlocks,
      appliedDates, detachedContinuations, historicalCuts, historicalContinuationParent, historicalGuardStarts,
      finalSchedule: Object.fromEntries(itemDates.map(date => [date, schedule[date]])),
    });
  }

  const diagnostic = suggestion.diagnostics ?? {};
  const sharedLock = forUpdate ? { lock: transaction.LOCK.SHARE } : {};
  const configRow = suggestion.config
    ? await ConfigModel.findOne({ where: { id: suggestion.config, deleted_at: null }, transaction, ...sharedLock })
    : null;
  const minimumRestMinutes = Number(configRow?.get('min_rest_minutes_between_shifts') ?? 0);
  if (minimumRestMinutes > 0) {
    for (const plan of plans) {
      // Published snapshots can differ from the current version of the same template.
      const snapshots = new Map(plan.blocks.map(block => [block.snapshot.guid, block.snapshot]));
      const schedule: Record<string, ScheduleValue> = {};
      const reasons: Record<string, ScheduleReason | null> = {};
      const from = addDays(applicationPeriod.from, -1);
      const to = addDays(Object.keys(plan.finalSchedule).at(-1) ?? applicationPeriod.to, 1);
      for (const date of periodDates(from, to)) {
        if (plan.appliedDates.includes(date)) {
          schedule[date] = plan.finalSchedule[date] ?? null;
          reasons[date] = plan.reasons[date] ?? null;
          continue;
        }
        const retained = plan.existingRows.find(row => row.start_date <= date &&
          (row.end_date === null || row.end_date >= date));
        if (!retained?.session_template) continue;
        const key = 'published:' + retained.guid;
        snapshots.set(key, plan.historicalCuts.get(retained.guid) && date === from
          ? plan.historicalCuts.get(retained.guid)! : retained.session_template);
        schedule[date] = key;
        if (retained.continuation_of_guid && date === retained.start_date) reasons[date] = { source: 'GUARD_CONTINUATION' };
      }
      const employee = usersById.get(plan.userId);
      for (const gap of restGapViolations(schedule, reasons, snapshots, from, to, minimumRestMinutes)) {
        if (![gap.previousDate, gap.nextDate].some(date => plan.appliedDates.includes(date))) continue;
        const editDate = plan.appliedDates.includes(gap.nextDate) ? gap.nextDate : gap.previousDate;
        alerts.push({
          severity: 'WARNING', code: 'SUGGESTION_PUBLICATION_REST_WARNING',
          message: `Le repos entre le ${gap.previousDate.split('-').reverse().join('/')} et le ${gap.nextDate.split('-').reverse().join('/')} est de ${gap.gapMinutes} min pour un minimum de ${minimumRestMinutes} min.`,
          details: {
            action: 'EDIT_ASSIGNMENT', date: editDate, employee_guid: plan.userGuid,
            employee_name: [employee.first_name, employee.last_name].filter(Boolean).join(' '),
            item_guid: items.find(item => item.user === plan.userId)?.guid,
            consequence: 'Décalez un service ou ajoutez un repos si nécessaire.',
          },
        });
      }
    }
  }
  let coverage = Array.isArray(diagnostic.coverage) ? diagnostic.coverage : [];
  const liveCoverage = Boolean(suggestion.config);
  if (liveCoverage) {
    const requirements = (await RequirementModel.findAll({
      where: { config: suggestion.config, active: true, deleted_at: null },
      transaction, ...sharedLock, order: [['id', 'ASC']],
    })).map(instance => instance.get({ plain: true }));
    const profileRows = await ProfileModel.findAll({
      where: { user: { [Op.in]: userIds }, active: true, deleted_at: null }, transaction, ...sharedLock,
    });
    const profiles = new Map(profileRows.map(instance => {
      const profile = instance.get({ plain: true });
      return [profile.user, profile];
    }));
    const requiredTemplateIds = [...new Set(requirements.map(requirement => requirement.session_template))];
    const rows = requiredTemplateIds.length ? await SessionTemplateModel.findAll({
      where: { id: { [Op.in]: requiredTemplateIds }, current: true, deleted_at: null }, transaction, ...sharedLock,
    }) : [];
    const requiredTemplates = new Map(rows.map(instance => {
      const template = instance.get({ plain: true });
      return [template.id, template];
    }));
    coverage = requirements.flatMap(requirement => {
      const template = requiredTemplates.get(requirement.session_template);
      if (!template) {
        alerts.push({
          severity: 'WARNING', code: 'SUGGESTION_COVERAGE_UNVERIFIED',
          message: 'Le modèle associé à ce besoin est indisponible. Sa couverture n’a pas pu être vérifiée.',
          details: { requirement_guid: requirement.guid, action: 'COVERAGE' },
        });
        return [];
      }
      return applicationDates.filter(date => dayKey(date) === requirement.day_of_week).map(date => {
        const assigned = plans.filter(plan => plan.finalSchedule[date] === template.guid &&
          eligibilityForRequirement(requirement, profiles.get(plan.userId), diagnostic, plan.userGuid, date)).length;
        const target = Number(requirement.target_employees ?? requirement.min_employees ?? 0);
        const exact = requirement.allocation_mode === 'EXACT';
        const minimum = exact ? target : Number(requirement.min_employees ?? 0);
        const maximum = exact ? target : requirement.max_employees;
        const status = assigned < minimum ? 'BELOW_MINIMUM' : maximum != null && assigned > maximum ? 'ABOVE_MAXIMUM'
          : assigned < target ? 'BELOW_TARGET' : 'COVERED';
        return { date, assigned, minimum, target, maximum, status, templateName: template.name, requirementGuid: requirement.guid };
      });
    });
  }
  const violations = Array.isArray(diagnostic.violations) ? diagnostic.violations : [];
  const inPeriod = (date?: string) => !date || (date >= applicationPeriod.from && date <= applicationPeriod.to);
  const employeeDetails = (guid?: string) => {
    const item = items.find(entry => usersById.get(entry.user)?.guid === guid);
    const employee = item && usersById.get(item.user);
    return {
      item_guid: item?.guid, employee_guid: guid,
      employee_name: employee && [employee.first_name, employee.last_name].filter(Boolean).join(' '),
    };
  };
  for (const entry of coverage.filter((row: any) => inPeriod(row.date) &&
    ['BELOW_MINIMUM', 'BELOW_TARGET', 'ABOVE_MAXIMUM'].includes(row.status))) {
    alerts.push({
      severity: 'WARNING', code: 'SUGGESTION_COVERAGE_WARNING',
      message: `${entry.templateName ?? 'Service'} · ${entry.assigned} affectation(s), minimum ${entry.minimum}, cible ${entry.target}` +
        (entry.maximum != null ? `, maximum ${entry.maximum}.` : '.'),
      details: {
        date: entry.date, requirement_guid: entry.requirementGuid, action: 'COVERAGE',
        consequence: 'Le planning des collaborateurs concernés s’écarte du besoin enregistré pour cette date.',
      },
    });
  }
  const storedCoverageCodes = ['MIN_COVERAGE_NOT_REACHED', 'TARGET_COVERAGE_NOT_REACHED', 'MAX_COVERAGE_EXCEEDED'];
  for (const issue of violations.filter((row: any) => inPeriod(row.date) &&
    !(liveCoverage && storedCoverageCodes.includes(row.code)) &&
    !coverage.some((entry: any) => entry.date === row.date && entry.requirementGuid &&
      entry.requirementGuid === row.requirementGuid && ['BELOW_MINIMUM', 'BELOW_TARGET', 'ABOVE_MAXIMUM'].includes(entry.status)))) {
    const employee = employeeDetails(issue.employeeGuid);
    alerts.push({
      severity: issue.severity === 'INFO' ? 'INFO' : 'WARNING', code: issue.code,
      message: issue.message,
      details: { date: issue.date, ...employee, requirement_guid: issue.requirementGuid,
        action: issue.requirementGuid ? 'COVERAGE' : employee.item_guid && issue.date ? 'EDIT_ASSIGNMENT' : 'CONFIGURATION' },
    });
  }

  const impact = {
    replaced_assignments: replacedAssignments,
    adjusted_assignments: adjustedAssignments,
    preserved_employee_dates: 0,
    truncated_overnight_assignments: truncatedOvernightAssignments,
    detached_guard_continuations: detachedGuardContinuations,
  };
  // Include the actual write plan so an edit or a concurrent publication
  // invalidates acceptance even when the alert text would remain identical.
  const confirmationToken = alerts.some(alert => alert.severity === 'WARNING')
    ? createHash('sha256').update(JSON.stringify({
      suggestionGuid, applicationPeriod, timezone: actor.timezone ?? TimezoneConfigUtils.getTimezone(), alerts, impact,
      plans: plans.map(plan => ({
        user: plan.userGuid, reasons: plan.reasons, historicalContinuationParent: plan.historicalContinuationParent,
        historicalCuts: [...plan.historicalCuts], detach: plan.detachedContinuations.map(row => row.get('guid')),
        blocks: plan.blocks.map(({ snapshot: { snapshot_date: _date, ...snapshot }, ...block }) => ({ ...block, snapshot })),
        existing: [...plan.existingRows].sort((left, right) => String(left.guid).localeCompare(String(right.guid))),
      })),
    })).digest('hex')
    : undefined;
  return { suggestionInstance, suggestion, applicationPeriod, plans, alerts, impact, confirmationToken, boundaryUntil };
}

export async function previewScheduleSuggestionApproval(
  suggestionGuid: string,
  effectiveFrom: unknown,
  actor: ApprovalActor,
) {
  const sequelize = TenantManager.getConnectionSync();
  const models = approvalModels();
  return sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ, readOnly: true },
    async (transaction) => {
      await sequelize.query('SET TRANSACTION READ ONLY', { transaction });
      try {
        const now = new Date();
        const result = await validateApproval(models, suggestionGuid, effectiveFrom, transaction, false, now, actor);
        let candidate = result.boundaryUntil && addDays(result.boundaryUntil, 1);
        while (candidate && candidate <= result.applicationPeriod.to) {
          try {
            const alternative = await validateApproval(models, suggestionGuid, candidate, transaction, false, now, actor);
            if (!alternative.boundaryUntil) break;
            candidate = addDays(alternative.boundaryUntil, 1);
          } catch (error) {
            if (!(error instanceof SuggestionApprovalError) || error.status >= 500) throw error;
            candidate = addDays(candidate, 1);
          }
        }
        return {
          can_publish: true,
          effective_from: result.applicationPeriod.from,
          timezone: actor.timezone ?? TimezoneConfigUtils.getTimezone(),
          alerts: result.alerts,
          impact: result.impact,
          confirmation_token: result.confirmationToken,
          ...(candidate && candidate <= result.applicationPeriod.to && { earliest_valid_date: candidate }),
          suggested_actions: [],
        };
      } catch (error) {
        if (!(error instanceof SuggestionApprovalError) || error.status >= 500 || error.status === 404) throw error;
        return {
          can_publish: false,
          effective_from: typeof effectiveFrom === 'string' ? effectiveFrom : null,
          alerts: [{ severity: 'BLOCKING', code: error.code, message: error.message, details: error.details }],
          suggested_actions: error.code.startsWith('SUGGESTION_EFFECTIVE_FROM_')
            ? [{ code: 'CHOOSE_EFFECTIVE_FROM', message: 'Choisissez une date à partir de demain et comprise dans la suggestion.' }] : [],
        };
      }
    },
  );
}

export async function approveScheduleSuggestion(
  suggestionGuid: string,
  effectiveFrom?: unknown,
  actor?: ApprovalActor,
  confirmation?: { token?: unknown; reason?: unknown },
): Promise<SuggestionApprovalResult> {
  if (!actor) {
    throw new SuggestionApprovalError('Une session de responsable est requise.', 'SUGGESTION_APPROVAL_AUTH_REQUIRED', 401);
  }
  const sequelize = TenantManager.getConnectionSync();

  const models = approvalModels();
  const { AssignmentModel } = models;

  return await sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
    async (transaction) => {
      await sequelize.query(
        `LOCK TABLE "${tableName.SCHEDULE_ASSIGNMENTS}" IN SHARE ROW EXCLUSIVE MODE`,
        { transaction },
      );

      const { suggestionInstance, suggestion, applicationPeriod, plans, alerts, impact, confirmationToken } = await validateApproval(
        models, suggestionGuid, effectiveFrom, transaction, true, new Date(), actor,
      );
      if ((confirmationToken || confirmation?.token !== undefined) && confirmation?.token !== confirmationToken) {
        throw new SuggestionApprovalError('Les avertissements doivent être revérifiés et confirmés avant publication.',
          'SUGGESTION_APPROVAL_CONFIRMATION_REQUIRED', 409);
      }
      if (confirmation?.reason !== undefined && (typeof confirmation.reason !== 'string' || confirmation.reason.length > 1000)) {
        throw new SuggestionApprovalError('Le motif doit contenir au maximum 1 000 caractères.', 'SUGGESTION_APPROVAL_REASON_INVALID', 400);
      }
      const publishedAt = new Date();
      const maximumId = Number((await AssignmentModel.max('id', { transaction })) ?? 0);
      let nextAssignmentId = maximumId + 1;

      let createdCount = 0;
      let deactivatedCount = 0;
      let preservedFragmentCount = 0;

      const insertAssignment = async (data: {
        tenant: string;
        related: string;
        snapshot: TemplateSnapshot;
        from: string;
        to: string | null;
        createdBy: number;
        reason: string | null;
        createdAt?: Date;
        version?: number;
        continuationOfGuid?: string | null;
      }): Promise<string> => {
        const guid = makeNumericGuid(nextAssignmentId++);
        await AssignmentModel.create(
          {
            guid,
            tenant: data.tenant,
            family: SAFamily.USER,
            related: data.related,
            session_template: data.snapshot,
            continuation_of_guid: data.continuationOfGuid ?? null,
            version: data.version ?? 1,
            start_date: data.from,
            end_date: data.to,
            created_by: data.createdBy,
            reason: data.reason,
            ...(data.createdAt && { created_at: data.createdAt }),
            active: true,
          },
          { transaction },
        );
        return guid;
      };

      for (const { userGuid, appliedDates, reasons, existingInstances, blocks, detachedContinuations,
        historicalCuts, historicalContinuationParent, historicalGuardStarts } of plans) {
        const assignmentGuidByDate = new Map<string, string>();

        for (const continuation of detachedContinuations) {
          await continuation.update({ continuation_of_guid: null }, { transaction });
        }
        const previousDate = addDays(applicationPeriod.from, -1);
        for (const existingInstance of existingInstances) {
          const existing = existingInstance.get({ plain: true });
          const fragments = remainingAssignmentRanges(existing.start_date, existing.end_date, appliedDates);
          const prefix = fragments[0]?.from < applicationPeriod.from ? fragments.shift() : undefined;
          const cut = historicalCuts.get(existing.guid);
          const needsSplit = cut && prefix && prefix.from < previousDate;
          if (prefix) {
            await existingInstance.update({
              end_date: needsSplit ? addDays(previousDate, -1) : prefix.to,
              ...(cut && !needsSplit && { session_template: cut }),
            }, { transaction });
            preservedFragmentCount++;
            if (needsSplit) {
              await insertAssignment({
                tenant: existing.tenant, related: existing.related, snapshot: cut,
                from: previousDate, to: previousDate, createdBy: existing.created_by ?? actor.id,
                reason: existing.reason ?? null, createdAt: existing.created_at, version: existing.version,
              });
              preservedFragmentCount++;
            }
          } else {
            await existingInstance.update({
              active: false,
              reason: [existing.reason, `Remplacé par la suggestion ${suggestionGuid}`].filter(Boolean).join(' | '),
            }, { transaction });
            deactivatedCount++;
          }
          for (const fragment of fragments) {
            await insertAssignment({
              tenant: existing.tenant, related: existing.related, snapshot: existing.session_template,
              ...fragment, createdBy: existing.created_by ?? actor.id,
              reason: existing.reason ?? null, createdAt: existing.created_at, version: existing.version,
            });
            preservedFragmentCount++;
          }
        }

        for (const { instance, continuationGuid } of historicalGuardStarts) {
          const snapshot = instance.get('session_template') as TemplateSnapshot;
          await instance.update({
            session_template: {
              ...snapshot,
              publication_guard_start: { date: previousDate, former_continuation_guid: continuationGuid },
            },
          }, { transaction });
        }

        for (const block of blocks) {
          const { snapshot } = block;
          const continuationDate = addDays(block.from, -1);
          const explicitContinuation =
            block.from === block.to &&
            reasons[block.from]?.source === 'GUARD_CONTINUATION' &&
            reasons[block.from]?.templateGuid === block.templateGuid;
          const continuationOfGuid = explicitContinuation
            ? (block.from === applicationPeriod.from ? historicalContinuationParent ?? null
              : isGuardTail(reasons[continuationDate]?.source) ? null
                : assignmentGuidByDate.get(continuationDate) ?? null)
            : null;
          const guid = await insertAssignment({
            tenant: suggestion.tenant,
            related: userGuid,
            snapshot,
            from: block.from,
            to: block.to,
            createdBy: actor.id,
            continuationOfGuid,
            reason:
              block.templateGuid === null
                ? `Repos publié depuis suggestion ${suggestionGuid}`
                : `Planning publié depuis suggestion ${suggestionGuid}`,
          });
          if (block.from === block.to && block.templateGuid !== null) {
            assignmentGuidByDate.set(block.from, guid);
          }
          createdCount++;
        }
      }

      await suggestionInstance.update(
        {
          status: 'approved',
          approved_at: publishedAt,
          diagnostics: {
            ...(suggestion.diagnostics ?? {}),
            publication: {
              actor_guid: actor.guid, actor_kind: actor.kind, at: publishedAt.toISOString(), effective_from: applicationPeriod.from,
              effective_to: applicationPeriod.to, exceptional: Boolean(confirmationToken),
              reason: typeof confirmation?.reason === 'string' ? confirmation.reason.trim() || null : null,
              alerts, impact, timezone: actor.timezone ?? TimezoneConfigUtils.getTimezone(),
              created_count: createdCount, deactivated_count: deactivatedCount, preserved_fragment_count: preservedFragmentCount,
            },
          },
        },
        { transaction },
      );

      return {
        suggestionGuid,
        effectiveFrom: applicationPeriod.from,
        effectiveTo: applicationPeriod.to,
        createdCount,
        deactivatedCount,
        preservedFragmentCount,
        employeeCount: plans.length,
      };
    },
  );
}

// import { Op, Transaction } from 'sequelize';
// import { SAFamily, TimezoneConfigUtils } from '@toke/shared';
//
// import { TableInitializer } from '../tenant/database/db.initializer.js';
// import TenantManager from '../tenant/database/db.tenant-manager.js';
// import { tableName } from '../utils/response.model.js';
//
// type ScheduleValue = string | null;
//
// interface ScheduleBlock {
//   templateGuid: string | null;
//   from: string;
//   to: string;
// }
//
// interface TemplateSnapshot {
//   id: number;
//   guid: string;
//   name: string;
//   definition: Record<string, any>;
//   version: number;
//   is_default: boolean;
//   snapshot_date: string;
//   session_model: number | null;
// }
//
// export interface SuggestionApprovalResult {
//   suggestionGuid: string;
//   createdCount: number;
//   deactivatedCount: number;
//   preservedFragmentCount: number;
//   employeeCount: number;
// }
//
// export class SuggestionApprovalError extends Error {
//   constructor(
//     message: string,
//     public readonly code: string,
//     public readonly status: number,
//     public readonly details?: unknown,
//   ) {
//     super(message);
//     this.name = 'SuggestionApprovalError';
//   }
// }
//
// function addDays(iso: string, amount: number): string {
//   const date = new Date(`${iso}T00:00:00.000Z`);
//   date.setUTCDate(date.getUTCDate() + amount);
//   return date.toISOString().slice(0, 10);
// }
//
// function periodDates(from: string, to: string): string[] {
//   const dates: string[] = [];
//   for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
//     dates.push(cursor);
//   }
//   return dates;
// }
//
// function dayKey(iso: string): string {
//   const keys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//   return keys[new Date(`${iso}T00:00:00.000Z`).getUTCDay()]!;
// }
//
// function buildBlocks(
//   schedule: Record<string, ScheduleValue>,
//   expectedDates: string[],
// ): ScheduleBlock[] {
//   const blocks: ScheduleBlock[] = [];
//   let currentValue: ScheduleValue | undefined;
//   let currentStart: string | null = null;
//   let previousDate: string | null = null;
//
//   const closeCurrent = (): void => {
//     if (currentStart === null || previousDate === null || currentValue === undefined) return;
//     blocks.push({
//       templateGuid: currentValue,
//       from: currentStart,
//       to: previousDate,
//     });
//   };
//
//   for (const iso of expectedDates) {
//     const value = schedule[iso];
//
//     if (value === undefined) {
//       throw new SuggestionApprovalError(
//         `Missing schedule value for ${iso}`,
//         'SUGGESTION_SCHEDULE_INCOMPLETE',
//         422,
//         { date: iso },
//       );
//     }
//
//     const isConsecutive = previousDate === null || addDays(previousDate, 1) === iso;
//
//     if (currentValue === undefined || value !== currentValue || !isConsecutive) {
//       closeCurrent();
//       currentValue = value;
//       currentStart = iso;
//     }
//
//     previousDate = iso;
//   }
//
//   closeCurrent();
//   return blocks;
// }
//
// interface ScheduleReason {
//   source?: string;
//   templateGuid?: string | null;
// }
//
// function getAuthorizedSpilloverDates(item: any, periodTo: string): string[] {
//   const schedule = item.schedule as Record<string, ScheduleValue>;
//   const reasons = (item.reasons ?? {}) as Record<string, ScheduleReason | null>;
//
//   const dates: string[] = [];
//   let previousReason = reasons[periodTo];
//   let continuationAlreadySeen = previousReason?.source === 'GUARD_CONTINUATION';
//
//   // Une garde peut se terminer dans la période ou à periodTo + 1.
//   // Les repos post-garde doivent former une chaîne consécutive.
//   for (let offset = 1; offset <= 32; offset++) {
//     const iso = addDays(periodTo, offset);
//
//     if (!(iso in schedule)) {
//       break;
//     }
//
//     const reason = reasons[iso];
//     const value = schedule[iso];
//
//     const validContinuation =
//       !continuationAlreadySeen &&
//       offset === 1 &&
//       value !== null &&
//       value !== undefined &&
//       reason?.source === 'GUARD_CONTINUATION' &&
//       reason.templateGuid === value;
//
//     const validPostGuardRest =
//       value === null &&
//       reason?.source === 'POST_GUARD_REST' &&
//       (reason.templateGuid === null || reason.templateGuid === undefined) &&
//       (previousReason?.source === 'GUARD_CONTINUATION' ||
//         previousReason?.source === 'POST_GUARD_REST');
//
//     if (!validContinuation && !validPostGuardRest) {
//       break;
//     }
//
//     dates.push(iso);
//     continuationAlreadySeen = continuationAlreadySeen || validContinuation;
//     previousReason = reason;
//   }
//
//   return dates;
// }
//
// function makeRestSnapshot(): TemplateSnapshot {
//   return {
//     id: 0,
//     guid: 'planned-rest',
//     name: 'Repos planifié',
//     definition: {
//       Mon: [],
//       Tue: [],
//       Wed: [],
//       Thu: [],
//       Fri: [],
//       Sat: [],
//       Sun: [],
//     },
//     version: 1,
//     is_default: false,
//     snapshot_date: TimezoneConfigUtils.getCurrentTime().toISOString(),
//     session_model: null,
//   };
// }
//
// function makeTemplateSnapshot(template: any): TemplateSnapshot {
//   return {
//     id: template.id,
//     guid: template.guid,
//     name: template.name,
//     definition: template.definition,
//     version: template.version ?? 1,
//     is_default: template.defaults ?? false,
//     snapshot_date: TimezoneConfigUtils.getCurrentTime().toISOString(),
//     session_model: template.session_model ?? null,
//   };
// }
//
// function makeNumericGuid(nextId: number): string {
//   const idPart = String(nextId);
//   const totalLength = 16;
//   const randomLength = totalLength - idPart.length - 1;
//
//   if (randomLength < 1) {
//     throw new Error('Unable to generate a 16-character schedule assignment GUID');
//   }
//
//   let prefix = '';
//   for (let index = 0; index < randomLength; index++) {
//     prefix += Math.floor(Math.random() * 10);
//   }
//
//   return `${prefix}0${idPart}`;
// }
//
// function hasWorkForEveryDate(snapshot: TemplateSnapshot, from: string, to: string): boolean {
//   for (const iso of periodDates(from, to)) {
//     const value = snapshot.definition?.[dayKey(iso)];
//     if (!Array.isArray(value) || value.length === 0) return false;
//   }
//   return true;
// }
//
// export async function approveScheduleSuggestion(
//   suggestionGuid: string,
// ): Promise<SuggestionApprovalResult> {
//   const sequelize = TenantManager.getConnectionSync();
//
//   const SuggestionModel = TableInitializer.getModel(tableName.SCHEDULE_SUGGESTION);
//   const ItemModel = TableInitializer.getModel(tableName.SCHEDULE_SUGGESTION_ITEM);
//   const AssignmentModel = TableInitializer.getModel(tableName.SCHEDULE_ASSIGNMENTS);
//   const SessionTemplateModel = TableInitializer.getModel(tableName.SESSION_TEMPLATES);
//   const UserModel = TableInitializer.getModel(tableName.USERS);
//
//   if (!SuggestionModel || !ItemModel || !AssignmentModel || !SessionTemplateModel || !UserModel) {
//     throw new SuggestionApprovalError(
//       'One or more required database models are not registered',
//       'SUGGESTION_APPROVAL_MODEL_NOT_REGISTERED',
//       500,
//     );
//   }
//
//   return await sequelize.transaction(
//     { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
//     async (transaction) => {
//       const suggestionInstance = await SuggestionModel.findOne({
//         where: { guid: suggestionGuid, deleted_at: null },
//         transaction,
//         lock: transaction.LOCK.UPDATE,
//       });
//
//       if (!suggestionInstance) {
//         throw new SuggestionApprovalError('Suggestion not found', 'SUGGESTION_NOT_FOUND', 404);
//       }
//
//       const suggestion = suggestionInstance.get({ plain: true });
//
//       if (suggestion.status !== 'draft') {
//         throw new SuggestionApprovalError(
//           'Only a draft suggestion can be approved',
//           'SUGGESTION_ALREADY_RESOLVED',
//           409,
//         );
//       }
//
//       const periodFrom = suggestion.period_from as string;
//       const periodTo = suggestion.period_to as string;
//       const expectedDates = periodDates(periodFrom, periodTo);
//       const expectedDateSet = new Set(expectedDates);
//
//       const itemInstances = await ItemModel.findAll({
//         where: { suggestion: suggestion.id, deleted_at: null },
//         transaction,
//         lock: transaction.LOCK.UPDATE,
//         order: [['id', 'ASC']],
//       });
//
//       if (itemInstances.length === 0) {
//         throw new SuggestionApprovalError(
//           'The suggestion contains no employee item',
//           'SUGGESTION_EMPTY',
//           422,
//         );
//       }
//
//       const items = itemInstances.map((instance: any) => instance.get({ plain: true }));
//       const userIds = [...new Set(items.map((item: any) => item.user))];
//
//       const userInstances = await UserModel.findAll({
//         where: { id: { [Op.in]: userIds } },
//         transaction,
//         lock: transaction.LOCK.SHARE,
//       });
//
//       const usersById = new Map<number, any>(
//         userInstances.map((instance: any) => {
//           const user = instance.get({ plain: true });
//           return [user.id, user];
//         }),
//       );
//
//       if (usersById.size !== userIds.length) {
//         const missing = userIds.filter((id) => !usersById.has(id));
//         throw new SuggestionApprovalError(
//           'One or more suggestion employees no longer exist',
//           'SUGGESTION_EMPLOYEE_NOT_FOUND',
//           422,
//           { user_ids: missing },
//         );
//       }
//
//       const referencedTemplateGuids = new Set<string>();
//
//       for (const item of items) {
//         const schedule = item.schedule as Record<string, ScheduleValue>;
//
//         if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
//           throw new SuggestionApprovalError(
//             `Invalid schedule for suggestion item ${item.guid}`,
//             'SUGGESTION_SCHEDULE_INVALID',
//             422,
//           );
//         }
//
//         const scheduleDates = Object.keys(schedule);
//         const missingDates = expectedDates.filter((iso) => !(iso in schedule));
//         const extraDates = scheduleDates.filter((iso) => !expectedDateSet.has(iso));
//         const authorizedSpilloverDates = getAuthorizedSpilloverDates(item, periodTo);
//         const authorizedSpilloverSet = new Set(authorizedSpilloverDates);
//         const invalidExtraDates = extraDates.filter((iso) => !authorizedSpilloverSet.has(iso));
//
//         if (missingDates.length > 0 || invalidExtraDates.length > 0) {
//           throw new SuggestionApprovalError(
//             `Suggestion item ${item.guid} does not correctly cover the suggestion period`,
//             'SUGGESTION_SCHEDULE_PERIOD_MISMATCH',
//             422,
//             {
//               item_guid: item.guid,
//               missing_dates: missingDates,
//               extra_dates: extraDates,
//               invalid_extra_dates: invalidExtraDates,
//               authorized_spillover_dates: authorizedSpilloverDates,
//             },
//           );
//         }
//
//         for (const value of Object.values(schedule)) {
//           if (value !== null) referencedTemplateGuids.add(value);
//         }
//       }
//
//       const templateInstances =
//         referencedTemplateGuids.size > 0
//           ? await SessionTemplateModel.findAll({
//               where: {
//                 guid: { [Op.in]: [...referencedTemplateGuids] },
//                 current: true,
//                 deleted_at: null,
//               },
//               transaction,
//               lock: transaction.LOCK.SHARE,
//             })
//           : [];
//
//       const templatesByGuid = new Map<string, TemplateSnapshot>(
//         templateInstances.map((instance: any) => {
//           const template = instance.get({ plain: true });
//           return [template.guid, makeTemplateSnapshot(template)];
//         }),
//       );
//
//       const missingTemplateGuids = [...referencedTemplateGuids].filter(
//         (guid) => !templatesByGuid.has(guid),
//       );
//
//       if (missingTemplateGuids.length > 0) {
//         throw new SuggestionApprovalError(
//           'One or more session templates are unavailable or no longer current',
//           'SUGGESTION_TEMPLATE_NOT_FOUND',
//           422,
//           { template_guids: missingTemplateGuids },
//         );
//       }
//
//       await sequelize.query(
//         `LOCK TABLE "${tableName.SCHEDULE_ASSIGNMENTS}" IN SHARE ROW EXCLUSIVE MODE`,
//         { transaction },
//       );
//
//       const maximumId = Number((await AssignmentModel.max('id', { transaction })) ?? 0);
//       let nextAssignmentId = maximumId + 1;
//
//       let createdCount = 0;
//       let deactivatedCount = 0;
//       let preservedFragmentCount = 0;
//
//       const insertAssignment = async (data: {
//         tenant: string;
//         related: string;
//         snapshot: TemplateSnapshot;
//         from: string;
//         to: string | null;
//         createdBy: number;
//         reason: string;
//       }): Promise<void> => {
//         await AssignmentModel.create(
//           {
//             guid: makeNumericGuid(nextAssignmentId++),
//             tenant: data.tenant,
//             family: SAFamily.USER,
//             related: data.related,
//             session_template: data.snapshot,
//             version: 1,
//             start_date: data.from,
//             end_date: data.to,
//             created_by: data.createdBy,
//             reason: data.reason,
//             active: true,
//           },
//           { transaction },
//         );
//       };
//
//       for (const item of items) {
//         const user = usersById.get(item.user);
//         const userGuid = user.guid as string;
//         const schedule = item.schedule as Record<string, ScheduleValue>;
//         const spilloverDates = getAuthorizedSpilloverDates(item, periodTo);
//         const itemDates = [...expectedDates, ...spilloverDates];
//         const itemPeriodTo = itemDates[itemDates.length - 1]!;
//         const blocks = buildBlocks(schedule, itemDates);
//
//         const existingInstances = await AssignmentModel.findAll({
//           where: {
//             family: SAFamily.USER,
//             related: userGuid,
//             active: true,
//             deleted_at: null,
//             start_date: { [Op.lte]: itemPeriodTo },
//             [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: periodFrom } }],
//           },
//           transaction,
//           lock: transaction.LOCK.UPDATE,
//           order: [['start_date', 'ASC']],
//         });
//
//         for (const existingInstance of existingInstances) {
//           const existing = existingInstance.get({ plain: true });
//
//           await existingInstance.update(
//             {
//               active: false,
//               reason: [
//                 existing.reason,
//                 `Remplacé sur ${periodFrom} → ${itemPeriodTo} par la suggestion ${suggestionGuid}`,
//               ]
//                 .filter(Boolean)
//                 .join(' | '),
//             },
//             { transaction },
//           );
//           deactivatedCount++;
//
//           if (existing.start_date < periodFrom) {
//             await insertAssignment({
//               tenant: existing.tenant,
//               related: existing.related,
//               snapshot: existing.session_template,
//               from: existing.start_date,
//               to: addDays(periodFrom, -1),
//               createdBy: suggestion.manager,
//               reason: `Fragment antérieur conservé après approbation ${suggestionGuid}`,
//             });
//             preservedFragmentCount++;
//           }
//
//           if (existing.end_date === null || existing.end_date > itemPeriodTo) {
//             await insertAssignment({
//               tenant: existing.tenant,
//               related: existing.related,
//               snapshot: existing.session_template,
//               from: addDays(itemPeriodTo, 1),
//               to: existing.end_date,
//               createdBy: suggestion.manager,
//               reason: `Fragment postérieur conservé après approbation ${suggestionGuid}`,
//             });
//             preservedFragmentCount++;
//           }
//         }
//
//         for (const block of blocks) {
//           const snapshot =
//             block.templateGuid === null
//               ? makeRestSnapshot()
//               : templatesByGuid.get(block.templateGuid);
//
//           if (!snapshot) {
//             throw new SuggestionApprovalError(
//               `Template ${block.templateGuid} not found during approval`,
//               'SUGGESTION_TEMPLATE_NOT_FOUND',
//               422,
//             );
//           }
//
//           if (block.templateGuid !== null && !hasWorkForEveryDate(snapshot, block.from, block.to)) {
//             throw new SuggestionApprovalError(
//               `Template ${snapshot.name} does not define work for every date in ${block.from} → ${block.to}`,
//               'SUGGESTION_TEMPLATE_DAY_INVALID',
//               422,
//               {
//                 template_guid: snapshot.guid,
//                 period_from: block.from,
//                 period_to: block.to,
//               },
//             );
//           }
//
//           await insertAssignment({
//             tenant: suggestion.tenant,
//             related: userGuid,
//             snapshot,
//             from: block.from,
//             to: block.to,
//             createdBy: suggestion.manager,
//             reason:
//               block.templateGuid === null
//                 ? `Repos publié depuis suggestion ${suggestionGuid}`
//                 : `Planning publié depuis suggestion ${suggestionGuid}`,
//           });
//           createdCount++;
//         }
//       }
//
//       await suggestionInstance.update(
//         {
//           status: 'approved',
//           approved_at: TimezoneConfigUtils.getCurrentTime(),
//         },
//         { transaction },
//       );
//
//       return {
//         suggestionGuid,
//         createdCount,
//         deactivatedCount,
//         preservedFragmentCount,
//         employeeCount: items.length,
//       };
//     },
//   );
// }
