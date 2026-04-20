import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  SESSION_MODEL_CODES,
  SESSION_MODEL_ERRORS,
  SESSION_MODEL_MESSAGES,
  SessionModelValidationUtils,
  TimezoneConfigUtils,
  validateSessionModelCreation,
  validateSessionModelFilters,
  validateSessionModelUpdate,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import SessionModel from '../class/SessionModel.js';
import { TenantRevision } from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';
import { ValidationUtils } from '../../utils/view.validator.js';
import User from '../class/User.js';

const router = Router();

// ============================================
// ROUTES DE LISTAGE GÉNÉRAL
// ============================================

/**
 * GET /api/session-models
 * Liste tous les modèles de session avec pagination
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const models = await SessionModel.exportable(paginationData);

    return R.handleSuccess(res, {
      session_models: models,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_MODEL_CODES.PAGINATION_INVALID,
        message: SESSION_MODEL_ERRORS.PAGINATION_INVALID,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_MODEL_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/session-models/revision
 * Obtient la révision actuelle pour la synchronisation offline
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await TenantRevision.getRevision(tableName.SESSION_MODEL);

    R.handleSuccess(res, {
      revision,
      checked_at: TimezoneConfigUtils.getCurrentTime().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_MODEL_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/session-models/list
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

    const filters = validateSessionModelFilters(filtersQuery);
    const conditions: Record<string, any> = {};

    if (filters.name) {
      conditions.name = filters.name;
    }
    if (filters.pause_allowed !== undefined) {
      conditions.pause_allowed = filters.pause_allowed;
    }
    if (filters.rotation_allowed !== undefined) {
      conditions.rotation_allowed = filters.rotation_allowed;
    }
    if (filters.leave_allowed !== undefined) {
      conditions.leave_allowed = filters.leave_allowed;
    }
    if (filters.extra_allowed !== undefined) {
      conditions.extra_allowed = filters.extra_allowed;
    }
    if (filters.active !== undefined) {
      conditions.active = filters.active;
    }

    if (filters.created_by !== undefined) {
      const userObj = await User._load(filters.created_by, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: SESSION_MODEL_CODES.CREATED_BY_NOT_FOUND,
          message: SESSION_MODEL_ERRORS.CREATED_BY_NOT_FOUND,
        });
      }
      conditions.created_by = userObj.getId();
    }

    const modelList = await SessionModel._list(conditions, paginationOptions);
    const session_models = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || modelList?.length || 0,
        count: modelList?.length || 0,
      },
      items: modelList ? await Promise.all(modelList.map(async (m) => m.toJSON(views))) : [],
    };

    return R.handleSuccess(res, { session_models });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_MODEL_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/session-models/list/pause-allowed/:status
 * Liste les modèles avec ou sans pause
 */
router.get('/list/pause-allowed/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const { status } = req.params;
    const pauseAllowed = status === 'true' || status === '1';

    const modelList = await SessionModel._listPauseAllowed(pauseAllowed, paginationOptions);
    const session_models = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || modelList?.length || 0,
        count: modelList?.length || 0,
      },
      items: modelList ? await Promise.all(modelList.map(async (m) => m.toJSON(views))) : [],
    };

    return R.handleSuccess(res, { session_models });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_MODEL_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/session-models/list/rotation-allowed/:status
 * Liste les modèles avec ou sans rotation
 */
router.get('/list/rotation-allowed/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const { status } = req.params;
    const rotationAllowed = status === 'true' || status === '1';

    const modelList = await SessionModel._listRotationAllowed(rotationAllowed, paginationOptions);
    const session_models = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || modelList?.length || 0,
        count: modelList?.length || 0,
      },
      items: modelList ? await Promise.all(modelList.map(async (m) => m.toJSON(views))) : [],
    };

    return R.handleSuccess(res, { session_models });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_MODEL_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/session-models/list/early-leave-allowed/:status
 * Liste les modèles avec ou sans départ anticipé
 */
router.get(
  '/list/early-leave-allowed/:status',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const paginationOptions = paginationSchema.parse(req.query);
      const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

      const { status } = req.params;
      const earlyLeaveAllowed = status === 'true' || status === '1';

      const modelList = await SessionModel._listEarlyLeaveAllowed(
        earlyLeaveAllowed,
        paginationOptions,
      );
      const session_models = {
        pagination: {
          offset: paginationOptions.offset || 0,
          limit: paginationOptions.limit || modelList?.length || 0,
          count: modelList?.length || 0,
        },
        items: modelList ? await Promise.all(modelList.map(async (m) => m.toJSON(views))) : [],
      };

      return R.handleSuccess(res, { session_models });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SESSION_MODEL_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  },
);

// ============================================
// CRÉATION
// ============================================

/**
 * POST /api/session-models
 * Crée un nouveau modèle de session
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateSessionModelCreation(req.body);

    const userObj = await User._load(validatedData?.created_by, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_MODEL_CODES.CREATED_BY_NOT_FOUND,
        message: SESSION_MODEL_ERRORS.CREATED_BY_NOT_FOUND,
      });
    }

    const modelObj = new SessionModel()
      .setName(validatedData?.name)
      .setMaxWorkingTime(validatedData?.max_working_time)
      .setMinWorkingTime(validatedData?.min_working_time)
      .setNormalSessionTime(validatedData?.normal_session_time)
      .setPauseAllowed(validatedData?.pause_allowed)
      .setRotationAllowed(validatedData?.rotation_allowed)
      .setExtraAllowed(validatedData?.extra_allowed)
      .setWorkday(validatedData.workday)
      .setEarlyLeaveAllowed(validatedData?.leave_allowed)
      .setLeaveOptional(validatedData?.leave_is_optional)
      .setCreatedBy(userObj.getId()!);

    // Champs optionnels
    if (validatedData.pause_duration !== undefined) {
      modelObj.setPauseDuration(validatedData.pause_duration);
    }
    if (validatedData.allowed_tolerance !== undefined) {
      modelObj.setAllowedTolerance(validatedData.allowed_tolerance);
    }
    if (validatedData.pause_count !== undefined) {
      modelObj.setPauseCount(validatedData.pause_count);
    }
    if (validatedData.extra_max !== undefined) {
      modelObj.setExtraMax(validatedData.extra_max);
    }
    if (validatedData.leave_eligibility_after_session !== undefined) {
      modelObj.setLeaveEligibilityAfterSession(validatedData.leave_eligibility_after_session);
    }

    await modelObj.save();

    return R.handleCreated(res, {
      message: SESSION_MODEL_MESSAGES.CREATED_SUCCESSFULLY,
      session_model: await modelObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_MODEL_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// RÉCUPÉRATION PAR GUID
// ============================================

/**
 * GET /api/session-models/:guid
 * Récupère un modèle de session spécifique
 */
router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!SessionModelValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_MODEL_CODES.INVALID_GUID,
        message: SESSION_MODEL_ERRORS.GUID_INVALID,
      });
    }

    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const modelObj = await SessionModel._load(req.params.guid, true);
    if (!modelObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_MODEL_CODES.SESSION_MODEL_NOT_FOUND,
        message: SESSION_MODEL_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      session_model: await modelObj.toJSON(views),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_MODEL_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// MISE À JOUR
// ============================================

/**
 * PUT /api/session-models/:guid
 * Met à jour un modèle de session existant
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!SessionModelValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_MODEL_CODES.INVALID_GUID,
        message: SESSION_MODEL_ERRORS.GUID_INVALID,
      });
    }

    const modelObj = await SessionModel._load(guid, true);
    if (!modelObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_MODEL_CODES.SESSION_MODEL_NOT_FOUND,
        message: SESSION_MODEL_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateSessionModelUpdate(req.body);

    // Mise à jour des champs fournis
    if (validatedData.name !== undefined) {
      modelObj.setName(validatedData.name);
    }
    if (validatedData.workday !== undefined) {
      modelObj.setWorkday(validatedData.workday);
    }
    if (validatedData.max_working_time !== undefined) {
      modelObj.setMaxWorkingTime(validatedData.max_working_time);
    }
    if (validatedData.min_working_time !== undefined) {
      modelObj.setMinWorkingTime(validatedData.min_working_time);
    }
    if (validatedData.normal_session_time !== undefined) {
      modelObj.setNormalSessionTime(validatedData.normal_session_time);
    }
    if (validatedData.allowed_tolerance !== undefined) {
      modelObj.setAllowedTolerance(validatedData.allowed_tolerance);
    }
    if (validatedData.pause_allowed !== undefined) {
      modelObj.setPauseAllowed(validatedData.pause_allowed);
    }
    if (validatedData.pause_duration !== undefined) {
      modelObj.setPauseDuration(validatedData.pause_duration);
    }
    if (validatedData.pause_count !== undefined) {
      modelObj.setPauseCount(validatedData.pause_count);
    }
    if (validatedData.rotation_allowed !== undefined) {
      modelObj.setRotationAllowed(validatedData.rotation_allowed);
    }
    if (validatedData.extra_allowed !== undefined) {
      modelObj.setExtraAllowed(validatedData.extra_allowed);
    }
    if (validatedData.extra_max !== undefined) {
      modelObj.setExtraMax(validatedData.extra_max);
    }
    if (validatedData.leave_allowed !== undefined) {
      modelObj.setEarlyLeaveAllowed(validatedData.leave_allowed);
    }
    if (validatedData.leave_eligibility_after_session !== undefined) {
      modelObj.setLeaveEligibilityAfterSession(validatedData.leave_eligibility_after_session);
    }
    if (validatedData.leave_is_optional !== undefined) {
      modelObj.setLeaveOptional(validatedData.leave_is_optional);
    }

    await modelObj.save();

    return R.handleSuccess(res, {
      message: SESSION_MODEL_MESSAGES.UPDATED_SUCCESSFULLY,
      session_model: await modelObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_MODEL_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// SUPPRESSION
// ============================================

/**
 * DELETE /api/session-models/:guid
 * Supprime (soft delete) un modèle de session
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!SessionModelValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_MODEL_CODES.INVALID_GUID,
        message: SESSION_MODEL_ERRORS.GUID_INVALID,
      });
    }

    const modelObj = await SessionModel._load(req.params.guid, true);
    if (!modelObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_MODEL_CODES.SESSION_MODEL_NOT_FOUND,
        message: SESSION_MODEL_ERRORS.NOT_FOUND,
      });
    }

    await modelObj.delete();

    return R.handleSuccess(res, {
      message: SESSION_MODEL_MESSAGES.DELETED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_MODEL_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /api/session-models/:guid/restore
 * Restaure un modèle de session supprimé
 */
router.patch('/:guid/restore', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!SessionModelValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_MODEL_CODES.INVALID_GUID,
        message: SESSION_MODEL_ERRORS.GUID_INVALID,
      });
    }

    const modelObj = await SessionModel._load(req.params.guid, true);
    if (!modelObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_MODEL_CODES.SESSION_MODEL_NOT_FOUND,
        message: SESSION_MODEL_ERRORS.NOT_FOUND,
      });
    }

    await modelObj.restoreEntry();

    return R.handleSuccess(res, {
      message: SESSION_MODEL_MESSAGES.RESTORED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_MODEL_CODES.RESTORE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /api/session-models/:guid/activate
 * Active un modèle de session
 */
router.patch('/:guid/activate', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!SessionModelValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_MODEL_CODES.INVALID_GUID,
        message: SESSION_MODEL_ERRORS.GUID_INVALID,
      });
    }

    const modelObj = await SessionModel._load(req.params.guid, true);
    if (!modelObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_MODEL_CODES.SESSION_MODEL_NOT_FOUND,
        message: SESSION_MODEL_ERRORS.NOT_FOUND,
      });
    }

    modelObj.setActive(true);
    await modelObj.save();

    return R.handleSuccess(res, {
      message: SESSION_MODEL_MESSAGES.ACTIVATED_SUCCESSFULLY,
      session_model: await modelObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_MODEL_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /api/session-models/:guid/deactivate
 * Désactive un modèle de session
 */
router.patch('/:guid/deactivate', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!SessionModelValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_MODEL_CODES.INVALID_GUID,
        message: SESSION_MODEL_ERRORS.GUID_INVALID,
      });
    }

    const modelObj = await SessionModel._load(req.params.guid, true);
    if (!modelObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_MODEL_CODES.SESSION_MODEL_NOT_FOUND,
        message: SESSION_MODEL_ERRORS.NOT_FOUND,
      });
    }

    modelObj.setActive(false);
    await modelObj.save();

    return R.handleSuccess(res, {
      message: SESSION_MODEL_MESSAGES.DEACTIVATED_SUCCESSFULLY,
      session_model: await modelObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_MODEL_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// STATISTIQUES ET ANALYSES
// ============================================

/**
 * GET /api/session-models/:guid/statistics
 * Obtient les statistiques d'un modèle
 */
router.get('/:guid/statistics', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!SessionModelValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_MODEL_CODES.INVALID_GUID,
        message: SESSION_MODEL_ERRORS.GUID_INVALID,
      });
    }

    const modelObj = await SessionModel._load(req.params.guid, true);
    if (!modelObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SESSION_MODEL_CODES.SESSION_MODEL_NOT_FOUND,
        message: SESSION_MODEL_ERRORS.NOT_FOUND,
      });
    }

    const statistics = modelObj.getStatistics();

    return R.handleSuccess(res, { statistics });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SESSION_MODEL_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

export default router;
