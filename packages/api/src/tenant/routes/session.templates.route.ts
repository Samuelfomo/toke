import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  SESSION_TEMPLATE_CODES,
  SESSION_TEMPLATE_ERRORS,
  SESSION_TEMPLATE_MESSAGES,
  SessionTemplateValidationUtils,
  VALID_DAYS,
  validateSessionTemplateCreation,
  validateSessionTemplateFilters,
  validateSessionTemplateUpdate,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import SessionTemplate from '../class/SessionTemplates.js';
import { TenantRevision } from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';
import { ValidationUtils } from '../../utils/view.validator.js';

const router = Router();

// ============================================
// ROUTES DE LISTAGE GÉNÉRAL
// ============================================

/**
 * GET /api/session-templates
 * Liste tous les modèles d'horaires avec pagination
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const templates = await SessionTemplate.exportable({}, paginationData);

    return R.handleSuccess(res, {
      templates,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_TEMPLATE_CODES.PAGINATION_INVALID,
        message: SESSION_TEMPLATE_ERRORS.PAGINATION_INVALID,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_TEMPLATE_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/session-templates/revision
 * Obtient la révision actuelle pour la synchronisation offline
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await TenantRevision.getRevision(tableName.SESSION_TEMPLATES);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_TEMPLATE_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/session-templates/list
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

    const filters = validateSessionTemplateFilters(filtersQuery);
    const conditions: Record<string, any> = {};

    if (filters.name) {
      conditions.name = filters.name;
    }

    if (filters.valid_at) {
      const validAtDate = new Date(filters.valid_at);
      const templateList = await SessionTemplate._listValidAt(validAtDate, paginationOptions);

      const templates = {
        pagination: {
          offset: paginationOptions.offset || 0,
          limit: paginationOptions.limit || templateList?.length || 0,
          count: templateList?.length || 0,
        },
        items: templateList
          ? await Promise.all(templateList.map(async (t) => await t.toJSON(views)))
          : [],
      };

      return R.handleSuccess(res, { templates });
    }

    const templateList = await SessionTemplate._list(conditions, paginationOptions);
    const templates = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || templateList?.length || 0,
        count: templateList?.length || 0,
      },
      items: templateList
        ? await Promise.all(templateList.map(async (t) => await t.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { templates });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_TEMPLATE_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// CRÉATION
// ============================================

/**
 * POST /api/session-templates
 * Crée un nouveau modèle d'horaire
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateSessionTemplateCreation(req.body);

    const templateObj = new SessionTemplate()
      .setTenant(validatedData.tenant)
      .setName(validatedData.name)
      .setDefinition(validatedData.definition)
      .setValidFrom(new Date(validatedData.valid_from));

    if (validatedData.valid_to) {
      templateObj.setValidTo(new Date(validatedData.valid_to));
    }

    await templateObj.save();

    return R.handleCreated(res, {
      message: SESSION_TEMPLATE_MESSAGES.CREATED_SUCCESSFULLY,
      template: await templateObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_TEMPLATE_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// RÉCUPÉRATION PAR GUID
// ============================================

/**
 * GET /api/session-templates/:guid
 * Récupère un modèle d'horaire spécifique
 */
router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!SessionTemplateValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_TEMPLATE_CODES.INVALID_GUID,
        message: SESSION_TEMPLATE_ERRORS.GUID_INVALID,
      });
    }

    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const templateObj = await SessionTemplate._load(req.params.guid, true);
    if (!templateObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_TEMPLATE_CODES.SESSION_TEMPLATE_NOT_FOUND,
        message: SESSION_TEMPLATE_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      template: await templateObj.toJSON(views),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_TEMPLATE_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// MISE À JOUR
// ============================================

/**
 * PATCH /api/session-templates/:guid
 * Met à jour un modèle d'horaire existant
 */
router.patch('/:guid', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!SessionTemplateValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_TEMPLATE_CODES.INVALID_GUID,
        message: SESSION_TEMPLATE_ERRORS.GUID_INVALID,
      });
    }

    const templateObj = await SessionTemplate._load(req.params.guid, true);
    if (!templateObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_TEMPLATE_CODES.SESSION_TEMPLATE_NOT_FOUND,
        message: SESSION_TEMPLATE_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateSessionTemplateUpdate(req.body);

    if (validatedData.name !== undefined) {
      templateObj.setName(validatedData.name);
    }

    if (validatedData.definition !== undefined) {
      templateObj.setDefinition(validatedData.definition);
    }

    if (validatedData.valid_from !== undefined) {
      templateObj.setValidFrom(new Date(validatedData.valid_from));
    }

    if (validatedData.valid_to !== undefined) {
      templateObj.setValidTo(validatedData.valid_to ? new Date(validatedData.valid_to) : null);
    }

    await templateObj.save();

    return R.handleSuccess(res, {
      message: SESSION_TEMPLATE_MESSAGES.UPDATED_SUCCESSFULLY,
      template: await templateObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_TEMPLATE_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// SUPPRESSION
// ============================================

/**
 * DELETE /api/session-templates/:guid
 * Supprime (soft delete) un modèle d'horaire
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!SessionTemplateValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_TEMPLATE_CODES.INVALID_GUID,
        message: SESSION_TEMPLATE_ERRORS.GUID_INVALID,
      });
    }

    const templateObj = await SessionTemplate._load(req.params.guid, true);
    if (!templateObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_TEMPLATE_CODES.SESSION_TEMPLATE_NOT_FOUND,
        message: SESSION_TEMPLATE_ERRORS.NOT_FOUND,
      });
    }

    await templateObj.delete();

    return R.handleSuccess(res, {
      message: SESSION_TEMPLATE_MESSAGES.DELETED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_TEMPLATE_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// STATISTIQUES ET ANALYSES
// ============================================

/**
 * GET /api/session-templates/:guid/statistics
 * Obtient les statistiques d'utilisation d'un modèle
 */
router.get('/:guid/statistics', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!SessionTemplateValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_TEMPLATE_CODES.INVALID_GUID,
        message: SESSION_TEMPLATE_ERRORS.GUID_INVALID,
      });
    }

    const templateObj = await SessionTemplate._load(req.params.guid, true);
    if (!templateObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_TEMPLATE_CODES.SESSION_TEMPLATE_NOT_FOUND,
        message: SESSION_TEMPLATE_ERRORS.NOT_FOUND,
      });
    }

    const statistics = {
      template: await templateObj.toJSON(responseValue.MINIMAL),
      working_days: templateObj.getDaysWithWork(),
      total_working_days: templateObj.getDaysWithWork().length,
      weekly_hours: templateObj.getWeeklyWorkHours(),
      is_expired: templateObj.hasExpired(),
      days_breakdown: {} as Record<string, any>,
    };

    // Détails par jour

    for (const day of VALID_DAYS) {
      if (templateObj.hasWorkOnDay(day)) {
        statistics.days_breakdown[day] = {
          blocks_count: templateObj.getTotalWorkBlocksForDay(day),
          work_hours: templateObj.getWorkHoursForDay(day),
        };
      }
    }

    return R.handleSuccess(res, { statistics });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_TEMPLATE_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

export default router;
