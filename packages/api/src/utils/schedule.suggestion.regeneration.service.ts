import { Op, Transaction } from 'sequelize';

import { TableInitializer } from '../tenant/database/db.initializer.js';
import TenantManager from '../tenant/database/db.tenant-manager.js';

import { tableName } from './response.model.js';
import { solveConfiguredSuggestion, SuggestionGenerationError, } from './schedule.suggestion.generation.service.js';
import type { PlanningSolverLockedAssignment } from './solver/planning.solver.js';

type ScheduleValue = string | null;
type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

interface PlainSuggestion {
  id: number;
  guid: string;
  manager: number;
  config: number;
  period_from: string;
  period_to: string;
  conformity_score?: number | null;
  diagnostics?: Record<string, any> | null;
  status: 'draft' | 'approved' | 'rejected';
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
}

interface PlainItem {
  id: number;
  guid: string;
  user: number;
  schedule: Record<string, ScheduleValue>;
  reasons: Record<string, any>;
  updated_at?: Date | string | null;
}

interface PlainUser {
  id: number;
  guid: string;
  first_name?: string | null;
  last_name?: string | null;
}

interface PlainProfile {
  user: number;
  planning_mode: 'FIXED' | 'ROTATING' | 'EXCLUDED';
  fixed_session_template?: number | null;
  active: boolean;
}

interface PlainRequirement {
  id: number;
  guid: string;
  config: number;
  session_template: number;
  day_of_week: DayKey;
  service_type: 'STANDARD' | 'GUARD';
  active: boolean;
  deleted_at?: Date | null;
}

interface PlainTemplate {
  id: number;
  guid: string;
  name: string;
  definition: Record<string, any>;
  current?: boolean;
  deleted_at?: Date | null;
}

export interface SuggestionRegenerationIssue {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  suggested_actions?: string[];
}

export interface SuggestionRegenerationResult {
  suggestion_guid: string;
  locked_cell_count: number;
  regenerated_cell_count: number;
  employee_count: number;
  conformity_score: number;
  previous_conformity_score: number | null;
  solver: Record<string, any>;
  diagnostics: Record<string, any>;
  warnings: SuggestionRegenerationIssue[];
}

export class SuggestionRegenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SuggestionRegenerationError';
  }
}

const DAY_KEYS: DayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayKey(iso: string): DayKey {
  return DAY_KEYS[new Date(`${iso}T00:00:00.000Z`).getUTCDay()]!;
}

function timestamp(value: Date | string | null | undefined): number {
  if (!value) return 0;
  return new Date(value).getTime();
}

function displayName(user: PlainUser): string {
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.guid;
}

function blocker(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  suggested_actions?: string[],
): SuggestionRegenerationIssue {
  return { code, message, details, suggested_actions };
}

function isDirectManualLock(reason: any): boolean {
  if (!reason || reason.source !== 'MANUAL') return false;
  if (reason.manualLock === false || reason.manualDerived === true) return false;

  const factors = Array.isArray(reason.factors)
    ? reason.factors.map((value: unknown) => String(value))
    : [];

  // Compatibility with Lot 3 data created before explicit manualLock metadata.
  if (factors.some((value: string) => value.includes('Suite de garde retirée'))) {
    return false;
  }

  return true;
}

function requireModels() {
  const SuggestionModel = TableInitializer.getModel(tableName.SCHEDULE_SUGGESTION);
  const ItemModel = TableInitializer.getModel(tableName.SCHEDULE_SUGGESTION_ITEM);
  const UserModel = TableInitializer.getModel(tableName.USERS);
  const ProfileModel = TableInitializer.getModel(tableName.EMPLOYEE_PLANNING_PROFILE);
  const RequirementModel = TableInitializer.getModel(tableName.PLANNING_SUGGESTION_REQUIREMENT);
  const TemplateModel = TableInitializer.getModel(tableName.SESSION_TEMPLATES);
  const ConfigModel = TableInitializer.getModel(tableName.PLANNING_SUGGESTION_CONFIG);

  if (
    !SuggestionModel ||
    !ItemModel ||
    !UserModel ||
    !ProfileModel ||
    !RequirementModel ||
    !TemplateModel ||
    !ConfigModel
  ) {
    throw new SuggestionRegenerationError(
      'One or more planning models are not registered',
      'SUGGESTION_REGENERATION_MODEL_NOT_REGISTERED',
      500,
    );
  }

  return {
    SuggestionModel,
    ItemModel,
    UserModel,
    ProfileModel,
    RequirementModel,
    TemplateModel,
    ConfigModel,
  };
}

async function buildLockedAssignments(
  suggestion: PlainSuggestion,
  items: PlainItem[],
  usersById: Map<number, PlainUser>,
): Promise<{
  locks: PlanningSolverLockedAssignment[];
  preserved: Map<string, { schedule: ScheduleValue; reason: any }>;
  blockers: SuggestionRegenerationIssue[];
  warnings: SuggestionRegenerationIssue[];
}> {
  const { ProfileModel, RequirementModel, TemplateModel } = requireModels();

  const userIds = [...new Set(items.map((item) => item.user))];
  const profileInstances = await ProfileModel.findAll({
    where: {
      user: { [Op.in]: userIds },
      active: true,
      deleted_at: null,
    },
  });
  const profiles = new Map<number, PlainProfile>(
    profileInstances.map((instance: any) => {
      const row = instance.get({ plain: true }) as PlainProfile;
      return [row.user, row];
    }),
  );

  const requirementInstances = await RequirementModel.findAll({
    where: {
      config: suggestion.config,
      active: true,
      deleted_at: null,
    },
  });
  const requirements = requirementInstances.map(
    (instance: any) => instance.get({ plain: true }) as PlainRequirement,
  );
  const requirementByGuid = new Map<string, PlainRequirement>(
    requirements.map((entry): [string, PlainRequirement] => [entry.guid, entry]),
  );

  const directManualTemplateGuids = new Set<string>();
  for (const item of items) {
    for (const [iso, reason] of Object.entries(item.reasons ?? {})) {
      if (!isDirectManualLock(reason)) continue;
      const value = item.schedule?.[iso];
      if (typeof value === 'string' && value) directManualTemplateGuids.add(value);
    }
  }

  const templateInstances =
    directManualTemplateGuids.size > 0
      ? await TemplateModel.findAll({
          where: {
            guid: { [Op.in]: [...directManualTemplateGuids] },
            current: true,
            deleted_at: null,
          },
        })
      : [];
  const templatesByGuid = new Map<string, PlainTemplate>();
  templateInstances.forEach((instance: any) => {
    const row = instance.get({ plain: true }) as PlainTemplate;
    templatesByGuid.set(row.guid, row);
  });

  const locks: PlanningSolverLockedAssignment[] = [];
  const preserved = new Map<string, { schedule: ScheduleValue; reason: any }>();
  const blockers: SuggestionRegenerationIssue[] = [];
  const warnings: SuggestionRegenerationIssue[] = [];

  for (const item of items) {
    const user = usersById.get(item.user);
    const profile = profiles.get(item.user);

    for (const [iso, reason] of Object.entries(item.reasons ?? {})) {
      if (!isDirectManualLock(reason)) continue;
      if (iso < suggestion.period_from || iso > suggestion.period_to) continue;

      if (!user || !profile || profile.planning_mode === 'EXCLUDED') {
        blockers.push(
          blocker(
            'SUGGESTION_REGENERATION_LOCK_EMPLOYEE_INVALID',
            `Une décision manuelle ne peut plus être rattachée à un collaborateur planifiable (${item.guid}).`,
            { item_guid: item.guid, date: iso },
            ['Corriger le profil du collaborateur ou générer une nouvelle suggestion.'],
          ),
        );
        continue;
      }

      const templateGuid = item.schedule?.[iso] ?? null;
      const key = `${user.guid}:${iso}`;

      if (templateGuid === null) {
        locks.push({
          employeeGuid: user.guid,
          date: iso,
          templateGuid: null,
          requirementGuid: null,
          template: null,
        });
        preserved.set(key, { schedule: null, reason });
        continue;
      }

      const template = templatesByGuid.get(templateGuid);
      if (!template) {
        blockers.push(
          blocker(
            'SUGGESTION_REGENERATION_LOCK_TEMPLATE_NOT_FOUND',
            `Le service verrouillé de ${displayName(user)} le ${iso} n’est plus disponible ou n’est plus courant.`,
            { employee_guid: user.guid, date: iso, template_guid: templateGuid },
            ['Choisir à nouveau un service courant avant de régénérer.'],
          ),
        );
        continue;
      }

      const metadataRequirementGuid =
        typeof reason?.requirementGuid === 'string' && reason.requirementGuid.trim()
          ? reason.requirementGuid.trim()
          : null;

      let requirement: PlainRequirement | undefined;
      if (metadataRequirementGuid) {
        const candidate = requirementByGuid.get(metadataRequirementGuid);
        if (
          candidate &&
          candidate.day_of_week === dayKey(iso) &&
          candidate.session_template === template.id
        ) {
          requirement = candidate;
        }
      }

      const matchingRequirements = requirements.filter(
        (entry) => entry.day_of_week === dayKey(iso) && entry.session_template === template.id,
      );

      if (!requirement && matchingRequirements.length > 0) {
        requirement = matchingRequirements[0]!;
        if (matchingRequirements.length > 1) {
          warnings.push({
            code: 'SUGGESTION_REGENERATION_REQUIREMENT_AMBIGUOUS_WARNING',
            message: `Plusieurs besoins correspondent au service manuel de ${displayName(user)} le ${iso}. Toké conserve la décision du manager et utilise un besoin équivalent pour recalculer le reste.`,
            details: {
              employee_guid: user.guid,
              date: iso,
              template_guid: templateGuid,
              requirement_guids: matchingRequirements.map((entry) => entry.guid),
            },
          });
        }
      }

      // ROTATING + configured service: keep the manual assignment as a real
      // requirement lock. Eligibility policies are deliberately not allowed to
      // veto a manager override; the Python solver exempts this exact lock from
      // requirement eligibility while adapting all unlocked cells around it.
      if (profile.planning_mode === 'ROTATING' && requirement) {
        locks.push({
          employeeGuid: user.guid,
          date: iso,
          templateGuid,
          requirementGuid: requirement.guid,
        });
        preserved.set(key, { schedule: templateGuid, reason });
        continue;
      }

      // Any current service that is outside engine requirements (or a FIXED
      // employee temporarily working another service) remains authoritative.
      // The solver treats the employee as occupied on that date and therefore
      // cannot assign another generated service. The external service does not
      // pretend to satisfy an engine requirement that does not exist.
      locks.push({
        employeeGuid: user.guid,
        date: iso,
        templateGuid,
        requirementGuid: null,
        template: {
          guid: template.guid,
          name: template.name,
          definition: template.definition ?? {},
        },
      });
      preserved.set(key, { schedule: templateGuid, reason });

      warnings.push({
        code:
          profile.planning_mode === 'FIXED'
            ? 'SUGGESTION_REGENERATION_FIXED_MANAGER_OVERRIDE'
            : 'SUGGESTION_REGENERATION_EXTERNAL_SERVICE',
        message:
          profile.planning_mode === 'FIXED'
            ? `${displayName(user)} conserve le service décidé manuellement le ${iso}, même s’il diffère de son profil fixe.`
            : `Le service manuel de ${displayName(user)} le ${iso} n’appartient pas aux besoins du moteur. Il sera conservé comme occupation imposée.`,
        details: {
          employee_guid: user.guid,
          date: iso,
          template_guid: templateGuid,
          planning_mode: profile.planning_mode,
        },
        suggested_actions: [
          'Aucune correction n’est obligatoire si cette dérogation correspond à la situation réelle.',
          'Mettre à jour les règles du moteur uniquement si cette organisation devient habituelle.',
        ],
      });
    }
  }

  return { locks, preserved, blockers, warnings };
}

export async function regenerateScheduleSuggestion(
  suggestionGuid: string,
): Promise<SuggestionRegenerationResult> {
  const sequelize = TenantManager.getConnectionSync();
  const { SuggestionModel, ItemModel, UserModel, ConfigModel } = requireModels();

  const suggestionInstance = await SuggestionModel.findOne({
    where: { guid: suggestionGuid, deleted_at: null },
  });
  if (!suggestionInstance) {
    throw new SuggestionRegenerationError('Suggestion not found', 'SUGGESTION_NOT_FOUND', 404);
  }

  const suggestion = suggestionInstance.get({ plain: true }) as PlainSuggestion;
  if (suggestion.status !== 'draft') {
    throw new SuggestionRegenerationError(
      'Only a draft suggestion can be regenerated',
      'SUGGESTION_ALREADY_RESOLVED',
      409,
    );
  }

  const configInstance = await ConfigModel.findOne({
    where: { id: suggestion.config, deleted_at: null },
  });
  if (!configInstance) {
    throw new SuggestionRegenerationError(
      'The suggestion configuration no longer exists',
      'SUGGESTION_REGENERATION_CONFIG_NOT_FOUND',
      422,
      {
        suggested_actions: ['Générer une nouvelle suggestion avec la configuration active.'],
      },
    );
  }
  const config = configInstance.get({ plain: true }) as any;

  if (!config.active) {
    throw new SuggestionRegenerationError(
      'The suggestion configuration is no longer active',
      'SUGGESTION_REGENERATION_CONFIG_CHANGED',
      409,
      {
        suggested_actions: [
          'Générer une nouvelle suggestion avec la configuration actuellement active.',
        ],
      },
    );
  }

  const generationScope = suggestion.diagnostics?.generationScope ?? {};
  const storedConfigGuid = generationScope.configGuid ?? null;
  const storedConfigVersion = generationScope.configVersion ?? null;

  if (storedConfigGuid && storedConfigGuid !== config.guid) {
    throw new SuggestionRegenerationError(
      'The planning configuration no longer matches the generated draft',
      'SUGGESTION_REGENERATION_CONFIG_CHANGED',
      409,
    );
  }

  if (
    storedConfigVersion !== null &&
    storedConfigVersion !== undefined &&
    Number(storedConfigVersion) !== Number(config.version)
  ) {
    throw new SuggestionRegenerationError(
      'The planning configuration was modified after this suggestion was generated',
      'SUGGESTION_REGENERATION_CONFIG_CHANGED',
      409,
      {
        generated_version: Number(storedConfigVersion),
        current_version: Number(config.version),
        suggested_actions: [
          'Générer une nouvelle suggestion pour utiliser les nouvelles règles.',
          'Ne pas mélanger un ancien draft avec une configuration modifiée.',
        ],
      },
    );
  }

  if (
    (storedConfigVersion === null || storedConfigVersion === undefined) &&
    timestamp(config.updated_at) > timestamp(suggestion.created_at)
  ) {
    throw new SuggestionRegenerationError(
      'The planning configuration appears to have changed after this older suggestion was generated',
      'SUGGESTION_REGENERATION_CONFIG_CHANGED',
      409,
      {
        suggested_actions: ['Générer une nouvelle suggestion avec la configuration actuelle.'],
      },
    );
  }

  const itemInstances = await ItemModel.findAll({
    where: { suggestion: suggestion.id, deleted_at: null },
    order: [['id', 'ASC']],
  });
  if (itemInstances.length === 0) {
    throw new SuggestionRegenerationError(
      'The suggestion contains no employee item',
      'SUGGESTION_EMPTY',
      422,
    );
  }
  const items = itemInstances.map((instance: any) => instance.get({ plain: true }) as PlainItem);

  const userIds = [...new Set(items.map((item) => item.user))];
  const userInstances = await UserModel.findAll({
    where: { id: { [Op.in]: userIds } },
  });
  const usersById = new Map<number, PlainUser>(
    userInstances.map((instance: any) => {
      const row = instance.get({ plain: true }) as PlainUser;
      return [row.id, row];
    }),
  );
  if (usersById.size !== userIds.length) {
    throw new SuggestionRegenerationError(
      'One or more suggestion employees no longer exist',
      'SUGGESTION_REGENERATION_EMPLOYEE_NOT_FOUND',
      422,
    );
  }

  const managerInstance = await UserModel.findOne({
    where: { id: suggestion.manager },
  });
  const manager = managerInstance?.get({ plain: true }) as PlainUser | undefined;
  if (!manager?.guid) {
    throw new SuggestionRegenerationError(
      'Suggestion manager not found',
      'SUGGESTION_MANAGER_NOT_FOUND',
      404,
    );
  }

  const { locks, preserved, blockers, warnings } = await buildLockedAssignments(
    suggestion,
    items,
    usersById,
  );

  if (blockers.length > 0) {
    throw new SuggestionRegenerationError(
      blockers[0]?.message ?? 'A technical lock must be corrected before regeneration',
      'SUGGESTION_REGENERATION_PREFLIGHT_FAILED',
      422,
      {
        blockers,
        warnings,
        locked_cell_count: locks.length,
      },
    );
  }

  const excludedEmployeeGuids = Array.isArray(generationScope.temporaryExcludedEmployeeGuids)
    ? generationScope.temporaryExcludedEmployeeGuids.filter(
        (value: unknown): value is string => typeof value === 'string',
      )
    : [];

  const historyAdjustments = Array.isArray(generationScope.historyAdjustments)
    ? generationScope.historyAdjustments.filter(
        (value: any) =>
          value &&
          typeof value.date === 'string' &&
          typeof value.template_guid === 'string' &&
          Array.isArray(value.included_employee_guids),
      )
    : [];

  const initialSuggestionUpdatedAt = timestamp(suggestion.updated_at);
  const initialItemUpdatedAt = new Map(items.map((item) => [item.id, timestamp(item.updated_at)]));

  let solved;
  try {
    solved = await solveConfiguredSuggestion(
      manager.guid,
      suggestion.period_from,
      suggestion.period_to,
      excludedEmployeeGuids,
      locks,
      historyAdjustments,
    );
  } catch (error) {
    if (error instanceof SuggestionGenerationError) {
      throw new SuggestionRegenerationError(error.message, error.code, error.status, error.details);
    }
    throw error;
  }

  if (solved.config.getId() !== suggestion.config) {
    throw new SuggestionRegenerationError(
      'The active configuration changed during regeneration',
      'SUGGESTION_REGENERATION_CONFIG_CHANGED',
      409,
    );
  }

  const itemByUserGuid = new Map<string, PlainItem>();
  for (const item of items) {
    const user = usersById.get(item.user)!;
    itemByUserGuid.set(user.guid, item);
  }

  const updates = new Map<
    number,
    {
      schedule: Record<string, ScheduleValue>;
      reasons: Record<string, any>;
    }
  >();

  for (const employeeResult of solved.engineResult.items) {
    const item = itemByUserGuid.get(employeeResult.userGuid);
    if (!item) {
      throw new SuggestionRegenerationError(
        `Solver returned an unexpected employee ${employeeResult.userGuid}`,
        'SUGGESTION_REGENERATION_EMPLOYEE_SCOPE_CHANGED',
        409,
      );
    }

    const schedule = { ...(employeeResult.schedule as Record<string, ScheduleValue>) };
    const reasons = { ...(employeeResult.reasons as Record<string, any>) };

    for (const lock of locks) {
      if (lock.employeeGuid !== employeeResult.userGuid) continue;
      const preservedCell = preserved.get(`${lock.employeeGuid}:${lock.date}`);
      if (!preservedCell) continue;
      schedule[lock.date] = preservedCell.schedule;
      reasons[lock.date] = preservedCell.reason;
    }

    updates.set(item.id, { schedule, reasons });
  }

  if (updates.size !== items.length) {
    throw new SuggestionRegenerationError(
      'The employee scope changed since the original suggestion was generated',
      'SUGGESTION_REGENERATION_EMPLOYEE_SCOPE_CHANGED',
      409,
      {
        suggestion_employee_count: items.length,
        solver_employee_count: updates.size,
        suggested_actions: ['Générer une nouvelle suggestion avec l’équipe actuelle.'],
      },
    );
  }

  const previousDiagnostics = suggestion.diagnostics ?? {};
  const nextDiagnostics = {
    ...solved.persistedDiagnostics,
    ...(previousDiagnostics.lastManualBulkEdit
      ? { lastManualBulkEdit: previousDiagnostics.lastManualBulkEdit }
      : {}),
    regeneration: {
      at: new Date().toISOString(),
      mode: 'PRESERVE_MANUAL',
      lockedCellCount: locks.length,
      regeneratedCellCount:
        solved.engineResult.items.reduce(
          (total, item) => total + Object.keys(item.schedule ?? {}).length,
          0,
        ) - locks.length,
      previousConformityScore: suggestion.conformity_score ?? null,
      configGuid: solved.configGuid,
      configVersion: solved.configVersion,
      solverVersion: solved.solver.solverVersion,
      warningCount: warnings.length,
      warnings,
    },
  };

  await sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
    async (transaction) => {
      const currentSuggestionInstance = await SuggestionModel.findOne({
        where: { id: suggestion.id, deleted_at: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!currentSuggestionInstance) {
        throw new SuggestionRegenerationError(
          'Suggestion disappeared during regeneration',
          'SUGGESTION_NOT_FOUND',
          404,
        );
      }
      const currentSuggestion = currentSuggestionInstance.get({ plain: true }) as PlainSuggestion;

      if (currentSuggestion.status !== 'draft') {
        throw new SuggestionRegenerationError(
          'The suggestion was resolved while regeneration was running',
          'SUGGESTION_REGENERATION_STALE_DRAFT',
          409,
        );
      }

      if (timestamp(currentSuggestion.updated_at) !== initialSuggestionUpdatedAt) {
        throw new SuggestionRegenerationError(
          'The suggestion changed while regeneration was running',
          'SUGGESTION_REGENERATION_STALE_DRAFT',
          409,
          {
            suggested_actions: ['Recharger la suggestion puis relancer la régénération.'],
          },
        );
      }

      const currentItems = await ItemModel.findAll({
        where: { suggestion: suggestion.id, deleted_at: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
        order: [['id', 'ASC']],
      });

      if (currentItems.length !== items.length) {
        throw new SuggestionRegenerationError(
          'Suggestion items changed while regeneration was running',
          'SUGGESTION_REGENERATION_STALE_DRAFT',
          409,
        );
      }

      for (const currentItemInstance of currentItems) {
        const current = currentItemInstance.get({ plain: true }) as PlainItem;
        if (timestamp(current.updated_at) !== (initialItemUpdatedAt.get(current.id) ?? -1)) {
          throw new SuggestionRegenerationError(
            'A planning cell changed while regeneration was running',
            'SUGGESTION_REGENERATION_STALE_DRAFT',
            409,
            {
              item_guid: current.guid,
              suggested_actions: ['Recharger la suggestion puis relancer la régénération.'],
            },
          );
        }

        const update = updates.get(current.id);
        if (!update) {
          throw new SuggestionRegenerationError(
            'Missing regenerated item state',
            'SUGGESTION_REGENERATION_EMPLOYEE_SCOPE_CHANGED',
            409,
          );
        }

        await currentItemInstance.update(
          {
            schedule: update.schedule,
            reasons: update.reasons,
          },
          { transaction },
        );
      }

      await currentSuggestionInstance.update(
        {
          conformity_score: solved.engineResult.conformityScore,
          diagnostics: nextDiagnostics,
          engine_version: solved.solver.solverVersion,
        },
        { transaction },
      );
    },
  );

  const totalCells = solved.engineResult.items.reduce(
    (total, item) => total + Object.keys(item.schedule ?? {}).length,
    0,
  );

  return {
    suggestion_guid: suggestion.guid,
    locked_cell_count: locks.length,
    regenerated_cell_count: Math.max(0, totalCells - locks.length),
    employee_count: solved.employeeCount,
    conformity_score: solved.engineResult.conformityScore,
    previous_conformity_score: suggestion.conformity_score ?? null,
    solver: solved.solver as unknown as Record<string, any>,
    diagnostics: nextDiagnostics,
    warnings,
  };
}
