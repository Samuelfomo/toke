import { Request, Response, Router } from 'express';
import {
  CycleUnit,
  HttpStatus,
  paginationSchema,
  ROTATION_GROUP_CODES,
  ROTATION_GROUP_DEFAULTS,
  ROTATION_GROUP_ERRORS,
  ROTATION_GROUP_MESSAGES,
  RotationGroupValidationUtils,
  TimezoneConfigUtils,
  USERS_CODES,
  validateReplaceCycleSlot,
  validateRotationGroupCreation,
  validateRotationGroupFilters,
  validateRotationGroupUpdate,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import RotationGroup from '../class/RotationGroups.js';
import SessionTemplate from '../class/SessionTemplates.js';
import RotationAssignment from '../class/RotationAssignments.js';
import { TenantRevision } from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';
import { ValidationUtils } from '../../utils/view.validator.js';
import User from '../class/User.js';
import RotationGroupTemplateLog from '../class/RotationGroupTemplateLog.js';

const router = Router();

// ============================================
// ROUTES DE LISTAGE GÉNÉRAL
// ============================================

/**
 * GET /api/rotation-groups
 * Liste tous les groupes de rotation
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const groups = await RotationGroup.exportable({}, paginationData);

    return R.handleSuccess(res, {
      rotation_groups: groups,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_GROUP_CODES.PAGINATION_INVALID,
        message: ROTATION_GROUP_ERRORS.PAGINATION_INVALID,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_GROUP_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/rotation-groups/revision
 * Obtient la révision actuelle
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await TenantRevision.getRevision(tableName.ROTATION_GROUPS);

    R.handleSuccess(res, {
      revision,
      checked_at: TimezoneConfigUtils.getCurrentTime().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_GROUP_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/rotation-groups/list
 * Liste avec filtres avancés
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const filtersQuery = { ...req.query };
    delete filtersQuery.offset;
    delete filtersQuery.limit;
    delete filtersQuery.view;

    const filters = validateRotationGroupFilters(filtersQuery);
    const conditions: Record<string, any> = {};

    if (filters.name) {
      conditions.name = filters.name;
    }

    if (filters.active !== undefined) {
      conditions.active = filters.active;
    }

    if (filters.cycle_unit) {
      conditions.cycle_unit = filters.cycle_unit;
    }

    const groupList = await RotationGroup._list(conditions, paginationOptions);
    const groups = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || groupList?.length || 0,
        count: groupList?.length || 0,
      },
      items: groupList ? await Promise.all(groupList.map(async (g) => await g.toJSON(views))) : [],
    };

    return R.handleSuccess(res, { rotation_groups: groups });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_GROUP_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// CRÉATION
// ============================================

/**
 * POST /api/rotation-groups
 * Crée un nouveau groupe de rotation
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateRotationGroupCreation(req.body);

    // Valider que tous les templates existent
    // const templateIds: number[] = [];
    for (const templateGuid of validatedData.cycle_templates) {
      const template = await SessionTemplate._load(templateGuid, true);
      if (!template) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: ROTATION_GROUP_CODES.TEMPLATE_NOT_FOUND,
          message: `Template not found: ${templateGuid}`,
        });
      }
      // templateIds.push(template.getId()!);
    }

    const tenant = req.tenant;

    const groupObj = new RotationGroup()
      .setTenant(tenant.config.reference)
      .setName(validatedData.name)
      .setCycleUnit(validatedData.cycle_unit as CycleUnit)
      .setDirection(validatedData.direction)
      .setAutoAdvance(validatedData.auto_advance)
      .setRotationStep(validatedData.rotation_step)
      // .setCycleTemplates(templateIds)
      .setStartDate(validatedData.start_date)
      .setActive(validatedData.active ?? ROTATION_GROUP_DEFAULTS.ACTIVE);

    await groupObj.save();

    await groupObj.initializeCycleFromGuids(validatedData.cycle_templates);

    return R.handleCreated(res, {
      message: ROTATION_GROUP_MESSAGES.CREATED_SUCCESSFULLY,
      rotation_group: await groupObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_GROUP_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// RÉCUPÉRATION PAR GUID
// ============================================

/**
 * GET /api/rotation-groups/:guid
 * Récupère un groupe de rotation spécifique
 */
router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!RotationGroupValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_GROUP_CODES.INVALID_GUID,
        message: ROTATION_GROUP_ERRORS.GUID_INVALID,
      });
    }

    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const groupObj = await RotationGroup._load(req.params.guid, true);
    if (!groupObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_GROUP_CODES.ROTATION_GROUP_NOT_FOUND,
        message: ROTATION_GROUP_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      rotation_group: await groupObj.toJSON(views),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_GROUP_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// MISE À JOUR
// ============================================

/**
 * put /api/rotation-groups/:guid
 * Met à jour un groupe de rotation
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    if (!RotationGroupValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_GROUP_CODES.INVALID_GUID,
        message: ROTATION_GROUP_ERRORS.GUID_INVALID,
      });
    }

    const groupObj = await RotationGroup._load(req.params.guid, true);
    if (!groupObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_GROUP_CODES.ROTATION_GROUP_NOT_FOUND,
        message: ROTATION_GROUP_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateRotationGroupUpdate(req.body);

    if (validatedData.name !== undefined) {
      groupObj.setName(validatedData.name);
    }

    if (validatedData.direction !== undefined) {
      groupObj.setDirection(validatedData.direction);
    }

    if (validatedData.auto_advance !== undefined) {
      groupObj.setAutoAdvance(validatedData.auto_advance);
    }

    if (validatedData.rotation_step !== undefined) {
      groupObj.setRotationStep(validatedData.rotation_step);
    }

    if (validatedData.cycle_unit !== undefined) {
      groupObj.setCycleUnit(validatedData.cycle_unit as CycleUnit);
    }

    if (validatedData.start_date !== undefined) {
      groupObj.setStartDate(validatedData.start_date);
    }

    if (validatedData.active !== undefined) {
      groupObj.setActive(validatedData.active);
    }

    await groupObj.save();

    return R.handleSuccess(res, {
      message: ROTATION_GROUP_MESSAGES.UPDATED_SUCCESSFULLY,
      rotation_group: await groupObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_GROUP_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// MISE À JOUR D'UN SLOT DU CYCLE
// ============================================

/**
 * PATCH /api/rotation-groups/:guid/cycle/:position
 * Remplace le template à une position donnée dans le cycle.
 * Crée automatiquement un log d'audit dans RotationGroupTemplateLog.
 *
 * Params :
 *   :guid     — GUID du RotationGroup
 *   :position — Index 0-based du slot à remplacer
 *
 * Body attendu :
 * {
 *   template_guid: string,   ← GUID du nouveau SessionTemplate
 *   reason?: string          ← Raison optionnelle (max 500 chars)
 * }
 *
 * Exemple : remplacer le template en position 2 du cycle
 *   PATCH /api/rotation-groups/abc-123/cycle/2
 *   { "template_guid": "xyz-789", "reason": "Mise à jour planning été" }
 */
router.patch('/:guid/cycle/:position', Ensure.put(), async (req: Request, res: Response) => {
  try {
    if (!RotationGroupValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_GROUP_CODES.INVALID_GUID,
        message: ROTATION_GROUP_ERRORS.GUID_INVALID,
      });
    }

    const position = parseInt(req.params.position, 10);
    if (isNaN(position) || position < 0) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_GROUP_CODES.VALIDATION_FAILED,
        message: 'position must be a non-negative integer',
      });
    }

    const groupObj = await RotationGroup._load(req.params.guid, true);
    if (!groupObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_GROUP_CODES.ROTATION_GROUP_NOT_FOUND,
        message: ROTATION_GROUP_ERRORS.NOT_FOUND,
      });
    }

    // Valide { template_guid, reason? } via le schema dédié
    const validatedData = validateReplaceCycleSlot({
      position,
      ...req.body,
    });

    // Vérifie l'existence du nouveau SessionTemplate
    const newTemplate = await SessionTemplate._load(validatedData.template_guid, true);
    if (!newTemplate) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_GROUP_CODES.TEMPLATE_NOT_FOUND,
        message: `SessionTemplate not found: ${validatedData.template_guid}`,
      });
    }

    // Récupère le manager depuis le contexte de la requête
    const { manager } = req.query;
    if (!manager) {
      return R.handleError(res, HttpStatus.UNAUTHORIZED, {
        code: ROTATION_GROUP_CODES.VALIDATION_FAILED,
        message: 'Authenticated user required to update a cycle slot',
      });
    }
    if (!RotationGroupValidationUtils.validateGuid(manager)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_GROUP_CODES.VALIDATION_FAILED,
        message: 'manager must be a valid GUID',
      });
    }

    const modifiedBy = await User._load(manager, true);
    if (!modifiedBy) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: `User manager not found`,
      });
    }

    // replaceCycleSlot() → updateSnapshot() + log automatique
    await groupObj.replaceCycleSlot(
      validatedData.position,
      validatedData.template_guid,
      modifiedBy.getId()!,
      validatedData.reason,
    );

    return R.handleSuccess(res, {
      message: ROTATION_GROUP_MESSAGES.UPDATED_SUCCESSFULLY,
      rotation_group: await groupObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_GROUP_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// HISTORIQUE DES MODIFICATIONS D'UN SLOT
// ============================================

/**
 * GET /api/rotation-groups/:guid/cycle/:position/logs
 * Retourne l'historique complet des modifications du template
 * à une position donnée dans le cycle.
 *
 * Utile pour auditer : qui a changé quoi, quand, et pourquoi.
 */
router.get('/:guid/cycle/:position/logs', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!RotationGroupValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_GROUP_CODES.INVALID_GUID,
        message: ROTATION_GROUP_ERRORS.GUID_INVALID,
      });
    }

    const position = parseInt(req.params.position, 10);
    if (isNaN(position) || position < 0) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_GROUP_CODES.VALIDATION_FAILED,
        message: 'position must be a non-negative integer',
      });
    }

    const groupObj = await RotationGroup._load(req.params.guid, true);
    if (!groupObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_GROUP_CODES.ROTATION_GROUP_NOT_FOUND,
        message: ROTATION_GROUP_ERRORS.NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    // Récupère le slot à cette position pour en extraire l'ID interne
    const slots = await groupObj.getCycleSlots();
    const slot = slots.find((s) => s.getPosition() === position);

    if (!slot) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_GROUP_CODES.TEMPLATE_NOT_FOUND,
        message: `No cycle slot found at position ${position}`,
      });
    }

    const logs = await RotationGroupTemplateLog._listByTemplate(slot.getId()!, paginationOptions);

    return R.handleSuccess(res, {
      rotation_group: await groupObj.toJSON(responseValue.MINIMAL),
      position,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || logs?.length || 0,
        count: logs?.length || 0,
      },
      logs: logs ? logs.map((log) => log.toJSON()) : [],
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_GROUP_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// SUPPRESSION
// ============================================

/**
 * DELETE /api/rotation-groups/:guid
 * Supprime un groupe de rotation
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!RotationGroupValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_GROUP_CODES.INVALID_GUID,
        message: ROTATION_GROUP_ERRORS.GUID_INVALID,
      });
    }

    const groupObj = await RotationGroup._load(req.params.guid, true);
    if (!groupObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_GROUP_CODES.ROTATION_GROUP_NOT_FOUND,
        message: ROTATION_GROUP_ERRORS.NOT_FOUND,
      });
    }

    // Vérifie qu'aucune assignation active ne dépend de ce groupe
    const activeAssignments = await RotationAssignment._listByRotationGroup(groupObj.getId()!);
    const hasActiveAssignments = activeAssignments?.some((a) => a.isActive?.());

    if (hasActiveAssignments) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: ROTATION_GROUP_CODES.CANNOT_DELETE_WITH_ASSIGNMENTS,
        message: ROTATION_GROUP_ERRORS.CANNOT_DELETE_WITH_ASSIGNMENTS,
      });
    }

    await groupObj.delete();

    return R.handleSuccess(res, {
      message: ROTATION_GROUP_MESSAGES.DELETED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_GROUP_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// MEMBRES DU GROUPE
// ============================================

/**
 * GET /api/rotation-groups/:guid/members
 * Liste tous les employés assignés à ce groupe
 */
router.get('/:guid/members', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!RotationGroupValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_GROUP_CODES.INVALID_GUID,
        message: ROTATION_GROUP_ERRORS.GUID_INVALID,
      });
    }

    const groupObj = await RotationGroup._load(req.params.guid, true);
    if (!groupObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_GROUP_CODES.ROTATION_GROUP_NOT_FOUND,
        message: ROTATION_GROUP_ERRORS.NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const assignments = await RotationAssignment._listByRotationGroup(
      groupObj.getId()!,
      paginationOptions,
    );

    const members = {
      rotation_group: await groupObj.toJSON(responseValue.MINIMAL),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || assignments?.length || 0,
        count: assignments?.length || 0,
      },
      members: assignments
        ? await Promise.all(assignments.map(async (a) => await a.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { members });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_GROUP_CODES.MEMBERS_LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// STATISTIQUES
// ============================================

/**
 * GET /api/rotation-groups/:guid/statistics
 * Obtient les statistiques d'un groupe de rotation
 */
router.get('/:guid/statistics', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!RotationGroupValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_GROUP_CODES.INVALID_GUID,
        message: ROTATION_GROUP_ERRORS.GUID_INVALID,
      });
    }

    const groupObj = await RotationGroup._load(req.params.guid, true);
    if (!groupObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_GROUP_CODES.ROTATION_GROUP_NOT_FOUND,
        message: ROTATION_GROUP_ERRORS.NOT_FOUND,
      });
    }

    // const assignments = await RotationAssignment._listByRotationGroup(groupObj.getId()!);
    // const templates = await groupObj.getSessionTemplates();
    const [assignments, slots] = await Promise.all([
      RotationAssignment._listByRotationGroup(groupObj.getId()!),
      groupObj.getCycleSlots(),
    ]);

    const statistics = {
      rotation_group: await groupObj.toJSON(responseValue.MINIMAL),
      total_members: assignments?.length || 0,
      total_templates: slots.length,
      cycle_info: {
        length: groupObj.getCycleLength(),
        unit: groupObj.getCycleUnit(),
        // cycles_elapsed: groupObj.getCyclesElapsed(),
        current_position: groupObj.getCurrentCyclePosition(),
      },
      is_active: groupObj.isActive(),
      is_future: groupObj.isInFuture(),
      templates: slots.map((slot) => slot.toJSON(responseValue.MINIMAL)),
    };

    return R.handleSuccess(res, { statistics });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_GROUP_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/rotation-groups/:guid/schedule-preview
 * Prévisualise le planning pour les X prochains jours
 */
router.get('/:guid/schedule-preview', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!RotationGroupValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_GROUP_CODES.INVALID_GUID,
        message: ROTATION_GROUP_ERRORS.GUID_INVALID,
      });
    }

    const groupObj = await RotationGroup._load(req.params.guid, true);
    if (!groupObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_GROUP_CODES.ROTATION_GROUP_NOT_FOUND,
        message: ROTATION_GROUP_ERRORS.NOT_FOUND,
      });
    }

    // const days = parseInt(req.query.days as string) || 14; // 14 jours par défaut
    const days = Math.min(parseInt(req.query.days as string) || 14, 90); // cap à 90
    const assignments = await RotationAssignment._listByRotationGroup(groupObj.getId()!);

    if (!assignments || assignments.length === 0) {
      return R.handleSuccess(res, {
        message: 'No members assigned to this rotation group',
        preview: [],
      });
    }

    const preview: any[] = [];
    // const today = TimezoneConfigUtils.getCurrentTime();

    for (let i = 0; i < days; i++) {
      // const targetDate = new Date(today);
      // targetDate.setDate(today.getDate() + i);

      const dayPreview: any = {
        // date: targetDate.toISOString().split('T')[0],
        assignments: [],
      };

      for (const assignment of assignments) {
        const snapshot = await groupObj.getSnapshotForDate(assignment.getOffset() ?? 0);

        const related = await assignment.getRelatedObj();
        const family = assignment.getFamily();

        dayPreview.assignments.push({
          related: related ? await related.toJSON() : null,
          family: family ? family : null,
          offset: assignment.getOffset(),
          template: snapshot ?? null,
        });
      }

      preview.push(dayPreview);
    }

    return R.handleSuccess(res, {
      rotation_group: await groupObj.toJSON(responseValue.MINIMAL),
      preview_days: days,
      preview,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_GROUP_CODES.PREVIEW_FAILED,
      message: error.message,
    });
  }
});

export default router;
