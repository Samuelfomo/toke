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
    const templateIds: number[] = [];
    for (const templateGuid of validatedData.cycle_templates) {
      const template = await SessionTemplate._load(templateGuid, true);
      if (!template) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: ROTATION_GROUP_CODES.TEMPLATE_NOT_FOUND,
          message: `Template not found: ${templateGuid}`,
        });
      }
      templateIds.push(template.getId()!);
    }

    const tenant = req.tenant;

    const groupObj = new RotationGroup()
      .setTenant(tenant.config.reference)
      .setName(validatedData.name)
      .setCycleLength(validatedData.cycle_length)
      .setCycleUnit(validatedData.cycle_unit as CycleUnit)
      .setCycleTemplates(templateIds)
      .setStartDate(validatedData.start_date)
      .setActive(validatedData.active ?? ROTATION_GROUP_DEFAULTS.ACTIVE);

    await groupObj.save();

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

    if (validatedData.cycle_length !== undefined) {
      groupObj.setCycleLength(validatedData.cycle_length);
    }

    if (validatedData.cycle_unit !== undefined) {
      groupObj.setCycleUnit(validatedData.cycle_unit as CycleUnit);
    }

    if (validatedData.cycle_templates !== undefined) {
      const templateIds: number[] = [];
      for (const templateGuid of validatedData.cycle_templates) {
        const template = await SessionTemplate._load(templateGuid, true);
        if (!template) {
          return R.handleError(res, HttpStatus.NOT_FOUND, {
            code: ROTATION_GROUP_CODES.TEMPLATE_NOT_FOUND,
            message: `Template not found: ${templateGuid}`,
          });
        }
        templateIds.push(template.getId()!);
      }
      groupObj.setCycleTemplates(templateIds);
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

    const assignments = await RotationAssignment._listByRotationGroup(groupObj.getId()!);
    const templates = await groupObj.getSessionTemplates();

    const statistics = {
      rotation_group: await groupObj.toJSON(responseValue.MINIMAL),
      total_members: assignments?.length || 0,
      total_templates: templates.length,
      cycle_info: {
        length: groupObj.getCycleLength(),
        unit: groupObj.getCycleUnit(),
        cycles_elapsed: groupObj.getCyclesElapsed(),
        current_position: groupObj.getCurrentCyclePosition(),
      },
      is_active: groupObj.isActive(),
      is_future: groupObj.isInFuture(),
      templates: await Promise.all(templates.map(async (t) => t.toJSON(responseValue.MINIMAL))),
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

    const days = parseInt(req.query.days as string) || 14; // 14 jours par défaut
    const assignments = await RotationAssignment._listByRotationGroup(groupObj.getId()!);

    if (!assignments || assignments.length === 0) {
      return R.handleSuccess(res, {
        message: 'No members assigned to this rotation group',
        preview: [],
      });
    }

    const preview: any[] = [];
    const today = TimezoneConfigUtils.getCurrentTime();

    for (let i = 0; i < days; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);

      const dayPreview: any = {
        date: targetDate.toISOString().split('T')[0],
        assignments: [],
      };

      for (const assignment of assignments) {
        const templateId = await assignment.getTemplateForDate(targetDate);
        const template = templateId ? await SessionTemplate._load(templateId) : null;
        const user = await assignment.getUserObj();

        dayPreview.assignments.push({
          user: user ? await user.toJSON() : null,
          offset: assignment.getOffset(),
          template: template ? template.toJSON(responseValue.MINIMAL) : null,
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
