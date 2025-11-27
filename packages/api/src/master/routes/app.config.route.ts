import { Request, Response, Router } from 'express';
import {
  AP,
  APP_CONFIG_CODES,
  APP_CONFIG_DEFAULTS,
  APP_CONFIG_ERRORS,
  HttpStatus,
  paginationSchema,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import AppConfig from '../class/AppConfig.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';

const router = Router();

// === ROUTES DE LISTAGE ===

/**
 * GET /app-config
 * Récupérer toutes les configurations d'application
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    // const conditions : Record<string, any> = {};
    // conditions.active = true
    const configEntries = await AppConfig._list(
      { ['active']: APP_CONFIG_DEFAULTS.ACTIVE },
      paginationData,
    );

    const appConfigs = {
      pagination: {
        offset: paginationData.offset || 0,
        limit: paginationData.limit || configEntries?.length || 0,
        count: configEntries?.length || 0,
      },
      items: configEntries?.map((config) => config.toJSON()) || [],
    };

    return R.handleSuccess(res, { appConfigs });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: APP_CONFIG_CODES.PAGINATION_INVALID,
        message: APP_CONFIG_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: APP_CONFIG_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * GET /app-config/revision
 * Récupérer la révision de la table app_config
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.APP_CONFIG);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: APP_CONFIG_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /app-config/list
 * Récupérer les configurations avec filtres
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit, ...filterQuery } = req.query;
    const filters = AP.validateAppConfigFilters(filterQuery);
    const paginationOptions = paginationSchema.parse(req.query);
    const conditions: Record<string, any> = {};

    if (filters.key) {
      conditions.key = filters.key;
    }
    if (filters.link) {
      conditions.link = filters.link;
    }
    if (filters.active !== undefined) {
      conditions.active = filters.active;
    }

    const configEntries = await AppConfig._list(conditions, paginationOptions);
    const appConfigs = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || configEntries?.length || 0,
        count: configEntries?.length || 0,
      },
      items: configEntries?.map((config) => config.toJSON()) || [],
    };

    return R.handleSuccess(res, { appConfigs });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: APP_CONFIG_CODES.PAGINATION_INVALID,
        message: APP_CONFIG_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: APP_CONFIG_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * GET /app-config/active/:status/list
 * Récupérer les configurations par statut actif
 */
router.get('/active/:status/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const isActive = status.toLowerCase() === 'true' || status === '1';
    const paginationOptions = paginationSchema.parse(req.query);

    const configEntries = await AppConfig._listByStatus(isActive, paginationOptions);
    const appConfigs = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || configEntries?.length || 0,
        count: configEntries?.length || 0,
      },
      items: configEntries?.map((config) => config.toJSON()) || [],
    };

    return R.handleSuccess(res, { appConfigs });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: APP_CONFIG_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === CRÉATION ===

/**
 * POST /app-config
 * Créer une nouvelle configuration d'application
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = AP.validateAppConfigCreation(req.body);

    // Vérifier si la clé existe déjà
    const existingConfig = await AppConfig._load(validatedData.key, true);
    if (existingConfig) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: APP_CONFIG_CODES.KEY_ALREADY_EXISTS,
        message: APP_CONFIG_ERRORS.KEY_ALREADY_EXISTS,
      });
    }

    const appConfig = new AppConfig()
      .setKey(validatedData.key)
      .setLink(validatedData.link)
      .setActive(validatedData.active);

    await appConfig.save();

    return R.handleCreated(res, {
      appConfig: appConfig.toJSON(),
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: APP_CONFIG_CODES.VALIDATION_FAILED,
        message: APP_CONFIG_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: APP_CONFIG_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

// === RÉCUPÉRATION PAR ID ===

/**
 * GET /app-config/:id
 * Récupérer une configuration par ID
 */
router.get('/:id', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const configId = AP.validateAppConfigId(Number(req.params.id));
    const appConfig = await AppConfig._load(configId);

    if (!appConfig) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: APP_CONFIG_CODES.CONFIG_NOT_FOUND,
        message: APP_CONFIG_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      appConfig: appConfig.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: APP_CONFIG_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /app-config/key/:key
 * Récupérer une configuration par clé
 */
router.get('/key/:key', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const appConfig = await AppConfig._load(key, true);

    if (!appConfig) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: APP_CONFIG_CODES.CONFIG_NOT_FOUND,
        message: APP_CONFIG_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, appConfig.toJSON());
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: APP_CONFIG_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// === MISE À JOUR ===

/**
 * PUT /app-config/:key
 * Mettre à jour une configuration
 */
router.put('/:key', Ensure.put(), async (req: Request, res: Response) => {
  try {
    // const configId = AP.validateAppConfigId(Number(req.params.key));
    const validatedData = AP.validateAppConfigUpdate(req.body);

    const appConfig = await AppConfig._load(req.params.key, true);
    if (!appConfig) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: APP_CONFIG_CODES.CONFIG_NOT_FOUND,
        message: APP_CONFIG_ERRORS.NOT_FOUND,
      });
    }

    // Vérifier si la nouvelle clé n'existe pas déjà
    if (validatedData.key && validatedData.key !== appConfig.getKey()) {
      const existingConfig = await AppConfig._load(validatedData.key, true);
      if (existingConfig && existingConfig.getId() !== appConfig.getId()) {
        return R.handleError(res, HttpStatus.CONFLICT, {
          code: APP_CONFIG_CODES.KEY_ALREADY_EXISTS,
          message: APP_CONFIG_ERRORS.KEY_ALREADY_EXISTS,
        });
      }
    }

    if (validatedData.key !== undefined) {
      appConfig.setKey(validatedData.key);
    }
    if (validatedData.link !== undefined) {
      appConfig.setLink(validatedData.link);
    }
    if (validatedData.active !== undefined) {
      appConfig.setActive(validatedData.active);
    }

    await appConfig.save();

    return R.handleSuccess(res, {
      appConfig: appConfig.toJSON(),
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: APP_CONFIG_CODES.VALIDATION_FAILED,
        message: APP_CONFIG_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: APP_CONFIG_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * PATCH /app-config/:id/status
 * Basculer le statut actif d'une configuration
 */
router.patch('/:key/status', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    // const configId = AP.validateAppConfigId(Number(req.params.id));

    const appConfig = await AppConfig._load(req.params.key, true);
    if (!appConfig) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: APP_CONFIG_CODES.CONFIG_NOT_FOUND,
        message: APP_CONFIG_ERRORS.NOT_FOUND,
      });
    }

    await appConfig.patchStatus();

    return R.handleSuccess(res, {
      appConfig: appConfig.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: APP_CONFIG_CODES.PATCH_STATUS_FAILED,
      message: error.message,
    });
  }
});

// === SUPPRESSION ===

/**
 * DELETE /app-config/:key
 * Supprimer une configuration
 */
router.delete('/:key', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    // const configId = AP.validateAppConfigId(Number(req.params.id));

    const appConfig = await AppConfig._load(req.params.key, true);
    if (!appConfig) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: APP_CONFIG_CODES.CONFIG_NOT_FOUND,
        message: APP_CONFIG_ERRORS.NOT_FOUND,
      });
    }

    const deleted = await appConfig.delete();
    if (!deleted) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: APP_CONFIG_CODES.DELETE_FAILED,
        message: APP_CONFIG_ERRORS.DELETE_FAILED,
      });
    }

    return R.handleSuccess(res, {
      message: 'Configuration deleted successfully',
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: APP_CONFIG_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

export default router;
