import { randomBytes, randomUUID } from 'crypto';

import { Op, Transaction } from 'sequelize';
import { SAFamily, TimezoneConfigUtils } from '@toke/shared';

import { TableInitializer } from '../tenant/database/db.initializer.js';
import TenantManager from '../tenant/database/db.tenant-manager.js';
import { tableName } from '../utils/response.model.js';

type TemplatePlain = {
  id: number | null;
  guid: string;
  name: string;
  definition: Record<string, any>;
  session_model?: number | null;
  version?: number | null;
  defaults?: boolean;
  current?: boolean;
  deleted_at?: Date | null;
};

type AssignmentPlain = {
  id: number;
  guid: string;
  tenant: string;
  family: SAFamily;
  related: string;
  session_template: Record<string, any>;
  version: number;
  start_date: string;
  end_date: string | null;
  created_by: number;
  reason: string | null;
  active: boolean;
  deleted_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
};

export type AdjustmentServiceKind = 'rest' | 'template' | 'guard';

export interface AdjustmentServiceComponent {
  template_guid: string;
  date_offset: 0 | 1;
  role: 'service' | 'guard_start' | 'guard_continuation';
}

export interface AdjustmentServiceOption {
  key: string;
  kind: AdjustmentServiceKind;
  label: string;
  source_name?: string;
  start_time: string | null;
  end_time: string | null;
  spans_next_day: boolean;
  components: AdjustmentServiceComponent[];
}

export interface ApplyDayAdjustmentInput {
  tenantReference: string;
  managerId: number;
  managerGuid: string;
  employeeGuid: string;
  date: string;
  serviceKey: string;
  reason?: string | null;
}

export interface ApplyDayAdjustmentResult {
  operation_id: string;
  service: AdjustmentServiceOption;
  created: Array<{
    guid: string;
    date: string;
    component: string;
  }>;
  deactivated: string[];
  preserved_fragments: Array<{
    source_guid: string;
    action: 'truncated_before' | 'shifted_after' | 'split';
    fragment_guid?: string;
  }>;
}

export class ScheduleAdjustmentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ScheduleAdjustmentError';
  }
}

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function addDays(iso: string, amount: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function dayKey(iso: string): (typeof DAY_KEYS)[number] {
  return DAY_KEYS[new Date(`${iso}T00:00:00.000Z`).getUTCDay()]!;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1]!.padStart(2, '0')}:${match[2]}`;
}

function timeToMinutes(value: string | null): number | null {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function blocksForDate(template: TemplatePlain, iso: string): any[] {
  const value = template.definition?.[dayKey(iso)];
  return Array.isArray(value) ? value : [];
}

function blocksForSnapshotDate(snapshot: any, iso: string): any[] {
  const value = snapshot?.definition?.[dayKey(iso)];
  return Array.isArray(value) ? value : [];
}

function rangeForBlocks(blocks: any[]): { start: string; end: string } | null {
  if (!blocks.length) return null;

  const ranges = blocks
    .map((block) => ({
      start: normalizeTime(block?.work?.[0]),
      end: normalizeTime(block?.work?.[1]),
    }))
    .filter((range) => Boolean(range.start && range.end)) as Array<{ start: string; end: string }>;

  if (!ranges.length) return null;

  ranges.sort((a, b) => a.start.localeCompare(b.start));
  return {
    start: ranges[0]!.start,
    end: ranges[ranges.length - 1]!.end,
  };
}

function isGuardStart(range: { start: string; end: string }): boolean {
  const start = timeToMinutes(range.start);
  const end = timeToMinutes(range.end);
  if (start === null || end === null) return false;

  return start >= 12 * 60 && end >= 23 * 60 + 50;
}

function isGuardContinuation(range: { start: string; end: string }): boolean {
  const start = timeToMinutes(range.start);
  const end = timeToMinutes(range.end);
  if (start === null || end === null) return false;

  return start <= 5 && end > 0 && end <= 12 * 60;
}

function businessLabel(template: TemplatePlain, range: { start: string; end: string }): string {
  if (range.start === '08:00' && range.end === '16:00') return 'Matin';
  if (range.start === '10:30' && range.end === '18:30') return 'Journée 10h30';
  return template.name;
}

function cloneBlocks(blocks: any[]): any[] {
  return JSON.parse(JSON.stringify(blocks ?? []));
}

function sortBlocks(blocks: any[]): any[] {
  return cloneBlocks(blocks).sort((a, b) => {
    const startA = normalizeTime(a?.work?.[0]) ?? '99:99';
    const startB = normalizeTime(b?.work?.[0]) ?? '99:99';
    return startA.localeCompare(startB);
  });
}

function singleDayDefinition(iso: string, blocks: any[]): Record<string, any[]> {
  const definition = Object.fromEntries(DAY_KEYS.map((key) => [key, []])) as Record<string, any[]>;
  definition[dayKey(iso)] = sortBlocks(blocks);
  return definition;
}

function snapshotFromTemplateForDate(
  template: TemplatePlain,
  iso: string,
  adjustment: Record<string, any>,
  prefixBlocks: any[] = [],
): Record<string, any> {
  const serviceBlocks = blocksForDate(template, iso);
  return {
    id: template.id,
    guid: template.guid,
    name: template.name,
    definition: singleDayDefinition(iso, [...prefixBlocks, ...serviceBlocks]),
    version: template.version ?? 1,
    is_default: Boolean(template.defaults),
    snapshot_date: TimezoneConfigUtils.getCurrentTime().toISOString(),
    session_model: template.session_model ?? null,
    adjustment,
  };
}

function plannedRestSnapshot(
  iso: string,
  adjustment: Record<string, any>,
  continuationBlocks: any[] = [],
): Record<string, any> {
  const hasContinuation = continuationBlocks.length > 0;
  return {
    id: null,
    guid: hasContinuation ? 'planned-rest-with-guard-continuation' : 'planned-rest',
    name: hasContinuation ? 'Repos après continuité de garde' : 'Repos',
    definition: singleDayDefinition(iso, continuationBlocks),
    version: 1,
    is_default: false,
    snapshot_date: TimezoneConfigUtils.getCurrentTime().toISOString(),
    session_model: null,
    adjustment,
  };
}

async function loadCurrentTemplates(transaction?: Transaction): Promise<TemplatePlain[]> {
  const TemplateModel = TableInitializer.getModel(tableName.SESSION_TEMPLATES);
  if (!TemplateModel) {
    throw new ScheduleAdjustmentError(
      'Session template model is not registered',
      'SCHEDULE_ADJUSTMENT_TEMPLATE_MODEL_MISSING',
      500,
    );
  }

  const instances = await TemplateModel.findAll({
    where: {
      deleted_at: null,
      current: true,
    },
    order: [['name', 'ASC']],
    transaction,
  });

  return instances.map((instance: any) => instance.get({ plain: true }) as TemplatePlain);
}

function buildServiceCatalogFromTemplates(
  templates: TemplatePlain[],
  date: string,
): AdjustmentServiceOption[] {
  const nextDate = addDays(date, 1);

  const todayViews = templates
    .map((template) => {
      const range = rangeForBlocks(blocksForDate(template, date));
      return range ? { template, range } : null;
    })
    .filter(Boolean) as Array<{ template: TemplatePlain; range: { start: string; end: string } }>;

  const nextViews = templates
    .map((template) => {
      const range = rangeForBlocks(blocksForDate(template, nextDate));
      return range ? { template, range } : null;
    })
    .filter(Boolean) as Array<{ template: TemplatePlain; range: { start: string; end: string } }>;

  const guardStarts = todayViews.filter((view) => isGuardStart(view.range));
  const guardContinuations = nextViews.filter((view) => isGuardContinuation(view.range));

  const pairedStartGuids = new Set<string>();
  const options: AdjustmentServiceOption[] = [
    {
      key: 'rest',
      kind: 'rest',
      label: 'Repos',
      start_time: null,
      end_time: null,
      spans_next_day: false,
      components: [],
    },
  ];

  for (const start of guardStarts) {
    const continuation = [...guardContinuations].sort((a, b) =>
      b.range.end.localeCompare(a.range.end),
    )[0];

    if (!continuation) continue;

    pairedStartGuids.add(start.template.guid);

    options.push({
      key: `guard:${start.template.guid}:${continuation.template.guid}`,
      kind: 'guard',
      label: 'Garde',
      source_name: `${start.template.name} + ${continuation.template.name}`,
      start_time: start.range.start,
      end_time: continuation.range.end,
      spans_next_day: true,
      components: [
        {
          template_guid: start.template.guid,
          date_offset: 0,
          role: 'guard_start',
        },
        {
          template_guid: continuation.template.guid,
          date_offset: 1,
          role: 'guard_continuation',
        },
      ],
    });
  }

  for (const view of todayViews) {
    if (isGuardContinuation(view.range)) continue;
    if (pairedStartGuids.has(view.template.guid)) continue;

    options.push({
      key: `template:${view.template.guid}`,
      kind: 'template',
      label: businessLabel(view.template, view.range),
      source_name: view.template.name,
      start_time: view.range.start,
      end_time: view.range.end,
      spans_next_day: false,
      components: [
        {
          template_guid: view.template.guid,
          date_offset: 0,
          role: 'service',
        },
      ],
    });
  }

  return options.sort((a, b) => {
    if (a.kind === 'rest') return -1;
    if (b.kind === 'rest') return 1;

    const startA = a.start_time ?? '99:99';
    const startB = b.start_time ?? '99:99';
    const byTime = startA.localeCompare(startB);
    if (byTime !== 0) return byTime;
    return a.label.localeCompare(b.label, 'fr');
  });
}

export async function listScheduleAdjustmentServices(
  date: string,
): Promise<AdjustmentServiceOption[]> {
  const templates = await loadCurrentTemplates();
  return buildServiceCatalogFromTemplates(templates, date);
}

async function generateAssignmentGuid(model: any, transaction: Transaction): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const raw = BigInt(`0x${randomBytes(8).toString('hex')}`);
    const value = 1_000_000_000_000_000n + (raw % 9_000_000_000_000_000n);
    const guid = value.toString();

    const exists = await model.findOne({
      where: { guid },
      attributes: ['id'],
      transaction,
    });

    if (!exists) return guid;
  }

  throw new ScheduleAdjustmentError(
    'Unable to generate assignment GUID',
    'SCHEDULE_ADJUSTMENT_GUID_GENERATION_FAILED',
    500,
  );
}

function manualAdjustmentMeta(snapshot: any): any | null {
  const meta = snapshot?.adjustment;
  return meta && meta.manual_override === true ? meta : null;
}

function assignmentOverlaps(data: AssignmentPlain, from: string, to: string): boolean {
  return data.start_date <= to && (data.end_date === null || data.end_date >= from);
}

async function createAssignmentClone(
  AssignmentModel: any,
  source: AssignmentPlain,
  startDate: string,
  endDate: string | null,
  transaction: Transaction,
): Promise<string> {
  const guid = await generateAssignmentGuid(AssignmentModel, transaction);

  await AssignmentModel.create(
    {
      guid,
      tenant: source.tenant,
      family: source.family,
      related: source.related,
      session_template: source.session_template,
      version: source.version,
      start_date: startDate,
      end_date: endDate,
      created_by: source.created_by,
      reason: source.reason,
      active: true,
      deleted_at: null,
    },
    { transaction },
  );

  return guid;
}

/**
 * Libère une plage de dates pour un override USER tout en respectant la
 * contrainte PostgreSQL exclude_overlapping_active_schedule_assignments.
 *
 * On ne modifie jamais le modèle horaire métier : uniquement les bornes de la
 * ligne existante. Si la date se trouve au milieu d'une affectation directe,
 * la partie après l'ajustement est clonée afin de préserver le planning.
 */
async function carveAssignmentPeriod(
  AssignmentModel: any,
  instance: any,
  data: AssignmentPlain,
  from: string,
  to: string,
  transaction: Transaction,
): Promise<{
  deactivated?: string;
  preserved?: {
    source_guid: string;
    action: 'truncated_before' | 'shifted_after' | 'split';
    fragment_guid?: string;
  };
}> {
  if (!assignmentOverlaps(data, from, to)) return {};

  const before = addDays(from, -1);
  const after = addDays(to, 1);
  const hasBefore = data.start_date < from;
  const hasAfter = data.end_date === null || data.end_date > to;

  if (hasBefore && hasAfter) {
    // 1) Raccourcir d'abord la ligne existante : cela libère immédiatement la
    //    plage avant de créer le fragment de droite sous la contrainte EXCLUDE.
    await instance.update({ end_date: before }, { transaction });

    const fragmentGuid = await createAssignmentClone(
      AssignmentModel,
      data,
      after,
      data.end_date,
      transaction,
    );

    return {
      preserved: {
        source_guid: data.guid,
        action: 'split',
        fragment_guid: fragmentGuid,
      },
    };
  }

  if (hasBefore) {
    await instance.update({ end_date: before }, { transaction });

    return {
      preserved: {
        source_guid: data.guid,
        action: 'truncated_before',
      },
    };
  }

  if (hasAfter) {
    await instance.update({ start_date: after }, { transaction });

    return {
      preserved: {
        source_guid: data.guid,
        action: 'shifted_after',
      },
    };
  }

  await instance.update(
    {
      active: false,
      reason: data.reason || 'Remplacé par un ajustement ponctuel du planning',
    },
    { transaction },
  );

  return { deactivated: data.guid };
}

function isExclusionConstraintError(error: any): boolean {
  return (
    error?.name === 'SequelizeExclusionConstraintError' ||
    error?.original?.code === '23P01' ||
    error?.parent?.code === '23P01'
  );
}

export async function applyScheduleDayAdjustment(
  input: ApplyDayAdjustmentInput,
): Promise<ApplyDayAdjustmentResult> {
  const today = TimezoneConfigUtils.getCurrentTime().toISOString().slice(0, 10);
  if (input.date < today) {
    throw new ScheduleAdjustmentError(
      'A past day cannot be adjusted from the planning assignment view',
      'SCHEDULE_ADJUSTMENT_PAST_DATE',
      422,
    );
  }

  const sequelize = TenantManager.getConnectionSync();
  const AssignmentModel = TableInitializer.getModel(tableName.SCHEDULE_ASSIGNMENTS);

  if (!AssignmentModel) {
    throw new ScheduleAdjustmentError(
      'Schedule assignment model is not registered',
      'SCHEDULE_ADJUSTMENT_MODEL_MISSING',
      500,
    );
  }

  try {
    return await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (transaction) => {
        const templates = await loadCurrentTemplates(transaction);
        const catalog = buildServiceCatalogFromTemplates(templates, input.date);
        const selected = catalog.find((service) => service.key === input.serviceKey);

        if (!selected) {
          throw new ScheduleAdjustmentError(
            'Selected service is no longer available',
            'SCHEDULE_ADJUSTMENT_SERVICE_NOT_AVAILABLE',
            409,
          );
        }

        const templateByGuid = new Map(
          templates.map((template) => [template.guid, template] as const),
        );
        const nextDate = addDays(input.date, 1);
        const targetEnd = selected.kind === 'guard' ? nextDate : input.date;
        const lookupEnd = nextDate;
        const operationId = randomUUID();
        const nowIso = TimezoneConfigUtils.getCurrentTime().toISOString();

        // Charger toutes les affectations USER susceptibles d'entrer en conflit
        // avec l'ajustement ou avec la continuité d'une garde existante.
        const currentUserAssignments = await AssignmentModel.findAll({
          where: {
            family: SAFamily.USER,
            related: input.employeeGuid,
            active: true,
            deleted_at: null,
            start_date: { [Op.lte]: lookupEnd },
            [Op.or]: [{ end_date: { [Op.gte]: input.date } }, { end_date: { [Op.is]: null } }],
          },
          order: [
            ['start_date', 'ASC'],
            ['id', 'ASC'],
          ],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        const activeRows = currentUserAssignments.map((instance: any) => ({
          instance,
          data: instance.get({ plain: true }) as AssignmentPlain,
        }));

        // Si la date possède déjà une garde commencée la veille, sa continuité
        // 00h→08h fait partie du jour précédent. On la conserve en la fusionnant
        // au nouvel override quotidien afin de rester compatible avec la contrainte
        // qui n'autorise qu'une affectation USER active par date.
        const inheritedContinuation = activeRows
          .filter(({ data }) => assignmentOverlaps(data, input.date, input.date))
          .filter(({ data }) => {
            const meta = manualAdjustmentMeta(data.session_template);
            return meta?.component === 'guard_continuation' && meta?.service_date !== input.date;
          })
          .sort((a, b) => {
            const aCreated = new Date(a.data.created_at ?? 0).getTime();
            const bCreated = new Date(b.data.created_at ?? 0).getTime();
            return bCreated - aCreated;
          })[0];

        const inheritedContinuationBlocks = inheritedContinuation
          ? blocksForSnapshotDate(inheritedContinuation.data.session_template, input.date)
          : [];

        const inheritedContinuationMeta = inheritedContinuation
          ? manualAdjustmentMeta(inheritedContinuation.data.session_template)
          : null;

        // Identifier l'ancien override dont le service démarrait exactement ce
        // jour. S'il s'agissait d'une garde, sa continuation J+1 doit également
        // être supprimée avant d'appliquer le nouveau choix.
        const baseOverridesForDay = activeRows.filter(({ data }) => {
          const meta = manualAdjustmentMeta(data.session_template);
          return meta?.service_date === input.date && meta?.component !== 'guard_continuation';
        });

        const replacedOperationIds = new Set(
          baseOverridesForDay
            .map(({ data }) => manualAdjustmentMeta(data.session_template)?.operation_id)
            .filter(Boolean),
        );

        const oldOperationRows = activeRows.filter(({ data }) => {
          const meta = manualAdjustmentMeta(data.session_template);
          return Boolean(meta?.operation_id && replacedOperationIds.has(meta.operation_id));
        });

        const oldOperationIds = new Set(oldOperationRows.map(({ data }) => data.id));
        const deactivated: string[] = [];
        const preservedFragments: ApplyDayAdjustmentResult['preserved_fragments'] = [];

        // Désactiver d'abord l'ancien override du même jour et ses composants.
        for (const { instance, data } of oldOperationRows) {
          await instance.update(
            {
              active: false,
              reason:
                input.reason?.trim() || data.reason || 'Remplacé par un nouvel ajustement ponctuel',
            },
            { transaction },
          );
          deactivated.push(data.guid);
        }

        // Libérer ensuite la plage cible dans les affectations USER normales ou
        // dans les autres overrides. Les affectations GROUP ne sont jamais touchées.
        for (const row of activeRows) {
          if (oldOperationIds.has(row.data.id)) continue;
          if (!assignmentOverlaps(row.data, input.date, targetEnd)) continue;

          const result = await carveAssignmentPeriod(
            AssignmentModel,
            row.instance,
            row.data,
            input.date,
            targetEnd,
            transaction,
          );

          if (result.deactivated) deactivated.push(result.deactivated);
          if (result.preserved) preservedFragments.push(result.preserved);
        }

        const created: ApplyDayAdjustmentResult['created'] = [];

        const createOverride = async (
          serviceDate: string,
          component: 'service' | 'guard_start' | 'guard_continuation',
          snapshot: Record<string, any>,
        ) => {
          const guid = await generateAssignmentGuid(AssignmentModel, transaction);

          await AssignmentModel.create(
            {
              guid,
              tenant: input.tenantReference,
              family: SAFamily.USER,
              related: input.employeeGuid,
              session_template: snapshot,
              version: 1,
              start_date: serviceDate,
              end_date: serviceDate,
              created_by: input.managerId,
              reason: input.reason?.trim() || 'Ajustement ponctuel du planning',
              active: true,
              deleted_at: null,
            },
            { transaction },
          );

          created.push({
            guid,
            date: serviceDate,
            component,
          });
        };

        const continuationInfo =
          inheritedContinuationBlocks.length > 0
            ? {
                inherited_guard_continuation: true,
                inherited_from_operation_id: inheritedContinuationMeta?.operation_id ?? null,
                inherited_from_service_date: inheritedContinuationMeta?.service_date ?? null,
              }
            : {};

        if (selected.kind === 'rest') {
          const adjustment = {
            manual_override: true,
            source: 'manager_day_adjustment',
            operation_id: operationId,
            service_key: selected.key,
            service_label: selected.label,
            service_date: input.date,
            component: 'service',
            spans_next_day: false,
            ...continuationInfo,
            modified_by: input.managerGuid,
            created_at: nowIso,
          };

          await createOverride(
            input.date,
            'service',
            plannedRestSnapshot(input.date, adjustment, inheritedContinuationBlocks),
          );
        } else if (selected.kind === 'template') {
          const component = selected.components[0];
          const template = component ? templateByGuid.get(component.template_guid) : undefined;

          if (!template) {
            throw new ScheduleAdjustmentError(
              'Selected template is no longer available',
              'SCHEDULE_ADJUSTMENT_TEMPLATE_NOT_AVAILABLE',
              409,
            );
          }

          const adjustment = {
            manual_override: true,
            source: 'manager_day_adjustment',
            operation_id: operationId,
            service_key: selected.key,
            service_label: selected.label,
            service_date: input.date,
            component: 'service',
            spans_next_day: false,
            source_template_guid: template.guid,
            ...continuationInfo,
            modified_by: input.managerGuid,
            created_at: nowIso,
          };

          await createOverride(
            input.date,
            'service',
            snapshotFromTemplateForDate(
              template,
              input.date,
              adjustment,
              inheritedContinuationBlocks,
            ),
          );
        } else {
          const startComponent = selected.components.find(
            (component) => component.role === 'guard_start',
          );
          const continuationComponent = selected.components.find(
            (component) => component.role === 'guard_continuation',
          );

          const startTemplate = startComponent
            ? templateByGuid.get(startComponent.template_guid)
            : undefined;
          const continuationTemplate = continuationComponent
            ? templateByGuid.get(continuationComponent.template_guid)
            : undefined;

          if (!startTemplate || !continuationTemplate) {
            throw new ScheduleAdjustmentError(
              'Guard templates are no longer available',
              'SCHEDULE_ADJUSTMENT_GUARD_TEMPLATE_NOT_AVAILABLE',
              409,
            );
          }

          const common = {
            manual_override: true,
            source: 'manager_day_adjustment',
            operation_id: operationId,
            service_key: selected.key,
            service_label: selected.label,
            service_date: input.date,
            spans_next_day: true,
            modified_by: input.managerGuid,
            created_at: nowIso,
          };

          await createOverride(
            input.date,
            'guard_start',
            snapshotFromTemplateForDate(
              startTemplate,
              input.date,
              {
                ...common,
                component: 'guard_start',
                source_template_guid: startTemplate.guid,
                ...continuationInfo,
              },
              inheritedContinuationBlocks,
            ),
          );

          await createOverride(
            nextDate,
            'guard_continuation',
            snapshotFromTemplateForDate(continuationTemplate, nextDate, {
              ...common,
              component: 'guard_continuation',
              source_template_guid: continuationTemplate.guid,
              continuation_of_date: input.date,
            }),
          );
        }

        return {
          operation_id: operationId,
          service: selected,
          created,
          deactivated,
          preserved_fragments: preservedFragments,
        };
      },
    );
  } catch (error: any) {
    if (error instanceof ScheduleAdjustmentError) throw error;

    if (isExclusionConstraintError(error)) {
      throw new ScheduleAdjustmentError(
        'The schedule could not be adjusted because an active individual assignment still overlaps the selected day',
        'SCHEDULE_ADJUSTMENT_PERIOD_CONFLICT',
        409,
        {
          constraint:
            error?.constraint ??
            error?.original?.constraint ??
            error?.parent?.constraint ??
            'exclude_overlapping_active_schedule_assignments',
        },
      );
    }

    throw error;
  }
}
