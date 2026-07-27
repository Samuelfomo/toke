import { Op, Transaction } from 'sequelize';
import { SAFamily, TimezoneConfigUtils } from '@toke/shared';

import { TableInitializer } from '../tenant/database/db.initializer.js';
import TenantManager from '../tenant/database/db.tenant-manager.js';
import { tableName } from '../utils/response.model.js';

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
  createdCount: number;
  deactivatedCount: number;
  preservedFragmentCount: number;
  employeeCount: number;
}

export class SuggestionApprovalError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SuggestionApprovalError';
  }
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

    if (currentValue === undefined || value !== currentValue || !isConsecutive) {
      closeCurrent();
      currentValue = value;
      currentStart = iso;
    }

    previousDate = iso;
  }

  closeCurrent();
  return blocks;
}

function isAuthorizedGuardContinuation(item: any, iso: string, periodTo: string): boolean {
  const allowedDate = addDays(periodTo, 1);

  const schedule = item.schedule as Record<string, ScheduleValue>;

  const reasons = (item.reasons ?? {}) as Record<
    string,
    {
      source?: string;
      templateGuid?: string | null;
    } | null
  >;

  const reason = reasons[iso];

  return (
    iso === allowedDate &&
    schedule[iso] !== null &&
    schedule[iso] !== undefined &&
    reason?.source === 'GUARD_CONTINUATION' &&
    reason.templateGuid === schedule[iso]
  );
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

export async function approveScheduleSuggestion(
  suggestionGuid: string,
): Promise<SuggestionApprovalResult> {
  const sequelize = TenantManager.getConnectionSync();

  const SuggestionModel = TableInitializer.getModel(tableName.SCHEDULE_SUGGESTION);
  const ItemModel = TableInitializer.getModel(tableName.SCHEDULE_SUGGESTION_ITEM);
  const AssignmentModel = TableInitializer.getModel(tableName.SCHEDULE_ASSIGNMENTS);
  const SessionTemplateModel = TableInitializer.getModel(tableName.SESSION_TEMPLATES);
  const UserModel = TableInitializer.getModel(tableName.USERS);

  if (!SuggestionModel || !ItemModel || !AssignmentModel || !SessionTemplateModel || !UserModel) {
    throw new SuggestionApprovalError(
      'One or more required database models are not registered',
      'SUGGESTION_APPROVAL_MODEL_NOT_REGISTERED',
      500,
    );
  }

  return await sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
    async (transaction) => {
      const suggestionInstance = await SuggestionModel.findOne({
        where: { guid: suggestionGuid, deleted_at: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!suggestionInstance) {
        throw new SuggestionApprovalError('Suggestion not found', 'SUGGESTION_NOT_FOUND', 404);
      }

      const suggestion = suggestionInstance.get({ plain: true });

      if (suggestion.status !== 'draft') {
        throw new SuggestionApprovalError(
          'Only a draft suggestion can be approved',
          'SUGGESTION_ALREADY_RESOLVED',
          409,
        );
      }

      const periodFrom = suggestion.period_from as string;
      const periodTo = suggestion.period_to as string;
      const expectedDates = periodDates(periodFrom, periodTo);
      const expectedDateSet = new Set(expectedDates);

      const itemInstances = await ItemModel.findAll({
        where: { suggestion: suggestion.id, deleted_at: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
        order: [['id', 'ASC']],
      });

      if (itemInstances.length === 0) {
        throw new SuggestionApprovalError(
          'The suggestion contains no employee item',
          'SUGGESTION_EMPTY',
          422,
        );
      }

      const items = itemInstances.map((instance: any) => instance.get({ plain: true }));
      const userIds = [...new Set(items.map((item: any) => item.user))];

      const userInstances = await UserModel.findAll({
        where: { id: { [Op.in]: userIds } },
        transaction,
        lock: transaction.LOCK.SHARE,
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
          'One or more suggestion employees no longer exist',
          'SUGGESTION_EMPLOYEE_NOT_FOUND',
          422,
          { user_ids: missing },
        );
      }

      const referencedTemplateGuids = new Set<string>();

      for (const item of items) {
        const schedule = item.schedule as Record<string, ScheduleValue>;

        if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
          throw new SuggestionApprovalError(
            `Invalid schedule for suggestion item ${item.guid}`,
            'SUGGESTION_SCHEDULE_INVALID',
            422,
          );
        }

        const scheduleDates = Object.keys(schedule);

        const missingDates = expectedDates.filter((iso) => !(iso in schedule));

        const extraDates = scheduleDates.filter((iso) => !expectedDateSet.has(iso));

        const invalidExtraDates = extraDates.filter(
          (iso) => !isAuthorizedGuardContinuation(item, iso, periodTo),
        );

        if (missingDates.length > 0 || invalidExtraDates.length > 0) {
          throw new SuggestionApprovalError(
            `Suggestion item ${item.guid} does not correctly cover the suggestion period`,
            'SUGGESTION_SCHEDULE_PERIOD_MISMATCH',
            422,
            {
              item_guid: item.guid,
              missing_dates: missingDates,
              extra_dates: extraDates,
              invalid_extra_dates: invalidExtraDates,
              allowed_guard_continuation_date: addDays(periodTo, 1),
            },
          );
        }

        for (const value of Object.values(schedule)) {
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
              lock: transaction.LOCK.SHARE,
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
          'One or more session templates are unavailable or no longer current',
          'SUGGESTION_TEMPLATE_NOT_FOUND',
          422,
          { template_guids: missingTemplateGuids },
        );
      }

      await sequelize.query(
        `LOCK TABLE "${tableName.SCHEDULE_ASSIGNMENTS}" IN SHARE ROW EXCLUSIVE MODE`,
        { transaction },
      );

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
        reason: string;
      }): Promise<void> => {
        await AssignmentModel.create(
          {
            guid: makeNumericGuid(nextAssignmentId++),
            tenant: data.tenant,
            family: SAFamily.USER,
            related: data.related,
            session_template: data.snapshot,
            version: 1,
            start_date: data.from,
            end_date: data.to,
            created_by: data.createdBy,
            reason: data.reason,
            active: true,
          },
          { transaction },
        );
      };

      for (const item of items) {
        const user = usersById.get(item.user);
        const userGuid = user.guid as string;
        const schedule = item.schedule as Record<string, ScheduleValue>;

        const continuationDate = addDays(periodTo, 1);

        const hasGuardContinuation = isAuthorizedGuardContinuation(
          item,
          continuationDate,
          periodTo,
        );

        const itemDates = hasGuardContinuation
          ? [...expectedDates, continuationDate]
          : [...expectedDates];

        const itemPeriodTo = itemDates[itemDates.length - 1]!;

        const blocks = buildBlocks(schedule, itemDates);

        const existingInstances = await AssignmentModel.findAll({
          where: {
            family: SAFamily.USER,
            related: userGuid,
            active: true,
            deleted_at: null,
            start_date: { [Op.lte]: itemPeriodTo },
            [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: periodFrom } }],
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
          order: [['start_date', 'ASC']],
        });

        for (const existingInstance of existingInstances) {
          const existing = existingInstance.get({ plain: true });

          await existingInstance.update(
            {
              active: false,
              reason: [
                existing.reason,
                `Remplacé sur ${periodFrom} → ${itemPeriodTo} par la suggestion ${suggestionGuid}`,
              ]
                .filter(Boolean)
                .join(' | '),
            },
            { transaction },
          );
          deactivatedCount++;

          if (existing.start_date < periodFrom) {
            await insertAssignment({
              tenant: existing.tenant,
              related: existing.related,
              snapshot: existing.session_template,
              from: existing.start_date,
              to: addDays(periodFrom, -1),
              createdBy: suggestion.manager,
              reason: `Fragment antérieur conservé après approbation ${suggestionGuid}`,
            });
            preservedFragmentCount++;
          }

          if (existing.end_date === null || existing.end_date > itemPeriodTo) {
            await insertAssignment({
              tenant: existing.tenant,
              related: existing.related,
              snapshot: existing.session_template,
              from: addDays(itemPeriodTo, 1),
              to: existing.end_date,
              createdBy: suggestion.manager,
              reason: `Fragment postérieur conservé après approbation ${suggestionGuid}`,
            });
            preservedFragmentCount++;
          }
        }

        for (const block of blocks) {
          const snapshot =
            block.templateGuid === null
              ? makeRestSnapshot()
              : templatesByGuid.get(block.templateGuid);

          if (!snapshot) {
            throw new SuggestionApprovalError(
              `Template ${block.templateGuid} not found during approval`,
              'SUGGESTION_TEMPLATE_NOT_FOUND',
              422,
            );
          }

          if (block.templateGuid !== null && !hasWorkForEveryDate(snapshot, block.from, block.to)) {
            throw new SuggestionApprovalError(
              `Template ${snapshot.name} does not define work for every date in ${block.from} → ${block.to}`,
              'SUGGESTION_TEMPLATE_DAY_INVALID',
              422,
              {
                template_guid: snapshot.guid,
                period_from: block.from,
                period_to: block.to,
              },
            );
          }

          await insertAssignment({
            tenant: suggestion.tenant,
            related: userGuid,
            snapshot,
            from: block.from,
            to: block.to,
            createdBy: suggestion.manager,
            reason:
              block.templateGuid === null
                ? `Repos publié depuis suggestion ${suggestionGuid}`
                : `Planning publié depuis suggestion ${suggestionGuid}`,
          });
          createdCount++;
        }
      }

      await suggestionInstance.update(
        {
          status: 'approved',
          approved_at: TimezoneConfigUtils.getCurrentTime(),
        },
        { transaction },
      );

      return {
        suggestionGuid,
        createdCount,
        deactivatedCount,
        preservedFragmentCount,
        employeeCount: items.length,
      };
    },
  );
}
