import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  SESSION_TEMPLATE_CODES,
  SESSION_TEMPLATE_DEFAULTS,
  SESSION_TEMPLATE_ERRORS,
  SESSION_TEMPLATE_MESSAGES,
  SessionTemplateValidationUtils,
  TimezoneConfigUtils,
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
import SessionModel from '../class/SessionModel.js';

const router = Router();

// ─── Helper : validation croisée SessionModel ↔ SessionTemplate definition ──

function validateAgainstSessionModel(
  definition: Record<string, any>,
  forRotation: boolean,
  sessionModelObj: InstanceType<typeof SessionModel>,
): { valid: true } | { valid: false; code: string; message: string } {
  const workdays = sessionModelObj.getWorkday() ?? [];

  // 1. Les jours actifs du template doivent être dans les workdays du SessionModel
  const activeDays = Object.entries(definition)
    .filter(([, value]) => value !== null && Array.isArray(value) && value.length > 0)
    .map(([day]) => day);

  const forbiddenDays = activeDays.filter((day) => !workdays.includes(day));
  if (forbiddenDays.length > 0) {
    return {
      valid: false,
      code: SESSION_TEMPLATE_CODES.DEFINITION_INVALID,
      message: `The following days are not allowed by the session model workday policy: ${forbiddenDays.join(', ')}`,
    };
  }

  // 2. Si for_rotation=true, le SessionModel doit avoir rotation_allowed=true
  if (forRotation && !sessionModelObj.isRotationAllowed()) {
    return {
      valid: false,
      code: SESSION_TEMPLATE_CODES.SESSION_MODEL_CONFLICT,
      message: SESSION_TEMPLATE_ERRORS.SESSION_MODEL_ROTATION_NOT_ALLOWED,
    };
  }

  return { valid: true };
}

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
      checked_at: TimezoneConfigUtils.getCurrentTime().toISOString(),
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
    if (filters.session_model) {
      const sessionModelObj = await SessionModel._load(filters.session_model, true);
      if (!sessionModelObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: SESSION_TEMPLATE_CODES.SESSION_MODEL_NOT_FOUND,
          message: SESSION_TEMPLATE_ERRORS.SESSION_MODEL_NOT_FOUND,
        });
      }
      conditions.session_model = sessionModelObj.getId()!;
    }

    const templateList = await SessionTemplate._list(conditions, paginationOptions);
    const templates = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || templateList?.length || 0,
        count: templateList?.length || 0,
      },
      items: templateList ? await Promise.all(templateList.map(async (t) => t.toJSON(views))) : [],
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

router.get('/list/for-rotation/:rotation', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const { rotation } = req.params;
    let status: boolean = true;
    if (rotation) {
      if (typeof rotation !== 'boolean') {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: SESSION_TEMPLATE_CODES.VALIDATION_FAILED,
          message: 'Entries invalid',
        });
      }
      status = rotation;
    }

    const templateList = await SessionTemplate._listForRotation(status, paginationOptions);
    const templates = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || templateList?.length || 0,
        count: templateList?.length || 0,
      },
      items: templateList ? await Promise.all(templateList.map(async (t) => t.toJSON(views))) : [],
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
 * 📝 Create a new schedule template
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateSessionTemplateCreation(req.body);

    const sessionModelObj = await SessionModel._load(validatedData.session_model, true);
    if (!sessionModelObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_TEMPLATE_CODES.SESSION_MODEL_NOT_FOUND,
        message: SESSION_TEMPLATE_ERRORS.SESSION_MODEL_NOT_FOUND,
      });
    }

    // 🔧 AJOUT : Normaliser la définition AVANT de la passer au modèle
    const normalizedDefinition = SessionTemplateValidationUtils.normalizeDefinition(
      validatedData.definition,
    );

    // ─── Validation croisée SessionModel ↔ définition ────────────────────
    const check = validateAgainstSessionModel(
      normalizedDefinition,
      validatedData.for_rotation,
      sessionModelObj,
    );
    if (!check.valid) {
      return R.handleError(res, HttpStatus.UNPROCESSABLE_ENTITY, {
        code: check.code,
        message: check.message,
      });
    }

    const templateObj = new SessionTemplate()
      .setName(validatedData.name)
      .setDefinition(normalizedDefinition)
      .setDefaultSessionTemplate(validatedData.default)
      .setForRotation(validatedData.for_rotation)
      .setSessionModel(sessionModelObj.getId()!)
      .setCurrent(validatedData.current);

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

// 🔧 BONUS : Route pour créer une semaine fériée facilement
router.post('/holiday-week', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { name, valid_from, valid_to } = req.body;

    if (!name) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_TEMPLATE_CODES.NAME_REQUIRED,
        message: SESSION_TEMPLATE_ERRORS.NAME_REQUIRED,
      });
    }

    if (!SessionTemplateValidationUtils.validateName(name)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_TEMPLATE_CODES.NAME_INVALID,
        message: SESSION_TEMPLATE_ERRORS.NAME_INVALID,
      });
    }

    const holidayDefinition = SessionTemplateValidationUtils.createFullWeekHoliday();

    const templateObj = new SessionTemplate()
      .setName(name)
      .setDefinition(holidayDefinition)
      .setDefaultSessionTemplate(SESSION_TEMPLATE_DEFAULTS.IS_DEFAULT);

    await templateObj.save();

    return R.handleCreated(res, {
      message: SESSION_TEMPLATE_MESSAGES.CREATED_SUCCESSFULLY,
      template: await templateObj.toJSON(),
    });
  } catch (error: any) {
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
 * PUT /api/session-templates/:guid
 * Met à jour un modèle d'horaire existant
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!SessionTemplateValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_TEMPLATE_CODES.INVALID_GUID,
        message: SESSION_TEMPLATE_ERRORS.GUID_INVALID,
      });
    }

    const templateObj = await SessionTemplate._load(guid, true);
    if (!templateObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_TEMPLATE_CODES.SESSION_TEMPLATE_NOT_FOUND,
        message: SESSION_TEMPLATE_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateSessionTemplateUpdate(req.body);

    // ─── Validation croisée si definition ou for_rotation est modifiée ────
    const definitionChanged = validatedData.definition !== undefined;
    const rotationChanged = validatedData.for_rotation !== undefined;

    if (definitionChanged || rotationChanged) {
      // Charger le SessionModel associé au template actuel
      const sessionModelObj = await templateObj.getSessionModelObj();
      if (!sessionModelObj) {
        return R.handleError(res, HttpStatus.UNPROCESSABLE_ENTITY, {
          code: SESSION_TEMPLATE_CODES.SESSION_MODEL_NOT_FOUND,
          message: SESSION_TEMPLATE_ERRORS.SESSION_MODEL_NOT_FOUND,
        });
      }

      const definitionToCheck = definitionChanged
        ? SessionTemplateValidationUtils.normalizeDefinition(validatedData.definition!)
        : templateObj.getDefinition();

      const forRotationToCheck = rotationChanged
        ? validatedData.for_rotation!
        : templateObj.ForRotation();

      const check = validateAgainstSessionModel(
        definitionToCheck,
        forRotationToCheck,
        sessionModelObj,
      );
      if (!check.valid) {
        return R.handleError(res, HttpStatus.UNPROCESSABLE_ENTITY, {
          code: check.code,
          message: check.message,
        });
      }

      if (definitionChanged) {
        templateObj.setDefinition(definitionToCheck);
      }
    }

    if (validatedData.name !== undefined) {
      templateObj.setName(validatedData.name);
    }

    // if (validatedData.definition !== undefined) {
    //   templateObj.setDefinition(validatedData.definition);
    // }
    // 🔧 AJOUT : Normaliser si definition est fournie
    if (validatedData.definition !== undefined) {
      const normalizedDefinition = SessionTemplateValidationUtils.normalizeDefinition(
        validatedData.definition,
      );
      templateObj.setDefinition(normalizedDefinition);
    }

    if (validatedData.default !== undefined) {
      templateObj.setDefaultSessionTemplate(validatedData.default);
    }

    if (validatedData.for_rotation !== undefined) {
      templateObj.setForRotation(validatedData.for_rotation);
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

router.patch('/make-default/:guid', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!SessionTemplateValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_TEMPLATE_CODES.INVALID_GUID,
        message: SESSION_TEMPLATE_ERRORS.GUID_INVALID,
      });
    }

    const templateObj = await SessionTemplate._load(guid, true);
    if (!templateObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_TEMPLATE_CODES.SESSION_TEMPLATE_NOT_FOUND,
        message: SESSION_TEMPLATE_ERRORS.NOT_FOUND,
      });
    }

    await templateObj.setDefault();

    return R.handleSuccess(res, {
      message: SESSION_TEMPLATE_MESSAGES.UPDATED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_TEMPLATE_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

router.patch('/disable-default/:guid', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!SessionTemplateValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_TEMPLATE_CODES.INVALID_GUID,
        message: SESSION_TEMPLATE_ERRORS.GUID_INVALID,
      });
    }

    const templateObj = await SessionTemplate._load(guid, true);
    if (!templateObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_TEMPLATE_CODES.SESSION_TEMPLATE_NOT_FOUND,
        message: SESSION_TEMPLATE_ERRORS.NOT_FOUND,
      });
    }

    await templateObj.removeDefault();

    return R.handleSuccess(res, {
      message: SESSION_TEMPLATE_MESSAGES.UPDATED_SUCCESSFULLY,
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
