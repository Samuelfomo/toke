import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  LANGUAGE_CODES,
  LANGUAGE_ERRORS,
  LanguageValidationUtils,
  LS,
  paginationSchema,
} from '@toke/shared';

import Language from '../class/Language.js';
import R from '../../tools/response.js';
import G from '../../tools/glossary.js';
import Ensure from '../../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';

const router = Router();

// region ROUTES D'EXPORT

/**
 * GET / - Exporter toutes les langues
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const languages = await Language.exportable(paginationOptions);
    return R.handleSuccess(res, { languages });
  } catch (error: any) {
    console.error('⚠️ Erreur export langues:', error);
    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.PAGINATION_INVALID,
        message: 'Invalid pagination parameters',
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LANGUAGE_CODES.EXPORT_FAILED,
        message: LANGUAGE_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /revision - Récupérer uniquement la révision actuelle
 */
router.get('/revision', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.LANGUAGE);

    return R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('⚠️ Erreur récupération révision:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: LANGUAGE_CODES.SEARCH_FAILED,
      message: 'Failed to get current revision',
    });
  }
});

/**
 * GET /active/:status - Lister les langues par statut actif/inactif
 */
router.get('/active/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const isActive = status.toLowerCase() === 'true' || status === '1';

    const paginationOptions = paginationSchema.parse(req.query);

    const languagesData = await Language._listByActiveStatus(isActive, paginationOptions);
    const languages = {
      active: isActive,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || languagesData?.length,
        count: languagesData?.length || 0,
      },
      items: languagesData?.map((language) => language.toJSON()) || [],
    };

    return R.handleSuccess(res, { languages });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par statut:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.PAGINATION_INVALID,
        message: 'Invalid pagination parameters',
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LANGUAGE_CODES.STATUS_SEARCH_FAILED,
        message: `Failed to search languages by status: ${req.params.status}`,
      });
    }
  }
});

// endregion

// region ROUTES CRUD

/**
 * POST / - Créer une nouvelle langue
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = LS.validateLanguageCreation(req.body);

    const languageObj = new Language()
      .setCode(validatedData.code)
      .setNameEn(validatedData.name_en)
      .setLocalName(validatedData.name_local);

    if (validatedData.active !== undefined) languageObj.setActive(validatedData.active);

    await languageObj.save();

    console.log(
      `✅ Langue créée: ${validatedData.code} - ${validatedData.name_en} (GUID: ${languageObj.getGuid()})`,
    );
    return R.handleCreated(res, languageObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur création langue:', error.message);

    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.VALIDATION_FAILED,
        message: 'Validation failed',
        details: error.issues,
      });
    } else if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: LANGUAGE_CODES.LANGUAGE_ALREADY_EXISTS,
        message: LANGUAGE_ERRORS.CODE_ALREADY_EXISTS,
      });
    } else if (error.message.includes('Validation failed')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.CREATION_FAILED,
        message: LANGUAGE_ERRORS.CREATION_FAILED,
      });
    }
  }
});

/**
 * PUT /:guid - Modifier une langue par GUID
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const validatedGuid = LS.validateLanguageGuid(req.params.guid);

    // Charger par GUID
    const language = await Language._load(validatedGuid, true);
    if (!language) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LANGUAGE_CODES.LANGUAGE_NOT_FOUND,
        message: LANGUAGE_ERRORS.NOT_FOUND,
      });
    }

    // Validation des données avec schéma shared
    const validatedData = LS.validateLanguageUpdate(req.body);

    // Mise à jour des champs fournis
    if (validatedData.code !== undefined) {
      language.setCode(validatedData.code);
    }
    if (validatedData.name_en !== undefined) {
      language.setNameEn(validatedData.name_en);
    }
    if (validatedData.name_local !== undefined) {
      language.setLocalName(validatedData.name_local);
    }
    if (validatedData.active !== undefined) {
      language.setActive(validatedData.active);
    }

    await language.save();

    console.log(`✅ Langue modifiée: GUID ${validatedGuid}`);
    return R.handleSuccess(res, language.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur modification langue:', error);

    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.VALIDATION_FAILED,
        message: 'Validation failed',
        details: error.issues,
      });
    } else if (error.message.includes('Invalid GUID')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.INVALID_GUID,
        message: LANGUAGE_ERRORS.GUID_INVALID,
      });
    } else if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: LANGUAGE_CODES.LANGUAGE_ALREADY_EXISTS,
        message: LANGUAGE_ERRORS.CODE_ALREADY_EXISTS,
      });
    } else if (error.message.includes('Validation failed')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.UPDATE_FAILED,
        message: LANGUAGE_ERRORS.UPDATE_FAILED,
      });
    }
  }
});

/**
 * DELETE /:guid - Supprimer une langue par GUID
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    // Validation du GUID avec utilitaire shared
    if (!LanguageValidationUtils.validateLanguageGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.INVALID_GUID,
        message: LANGUAGE_ERRORS.GUID_INVALID,
      });
    }

    const guid = parseInt(req.params.guid, 10);

    // Charger par GUID
    const language = await Language._load(guid, true);
    if (!language) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LANGUAGE_CODES.LANGUAGE_NOT_FOUND,
        message: LANGUAGE_ERRORS.NOT_FOUND,
      });
    }

    const deleted = await language.delete();

    if (deleted) {
      console.log(
        `✅ Langue supprimée: GUID ${guid} (${language.getCode()} - ${language.getNameEn()})`,
      );
      return R.handleSuccess(res, {
        message: 'Language deleted successfully',
        guid: guid,
        code: language.getCode(),
        name_en: language.getNameEn(),
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, G.savedError);
    }
  } catch (error: any) {
    console.error('⚠️ Erreur suppression langue:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: LANGUAGE_CODES.DELETE_FAILED,
      message: LANGUAGE_ERRORS.DELETE_FAILED,
    });
  }
});

// endregion

// region ROUTES UTILITAIRES

/**
 * GET /list - Lister toutes les langues (pour admin)
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit, ...filterQuery } = req.query;
    const filters = LS.validateLanguageFilters(filterQuery);
    const paginationOptions = paginationSchema.parse(req.query);

    const conditions: Record<string, any> = {};

    if (filters.active !== undefined) conditions.active = filters.active;

    const languageEntries = await Language._list(conditions, paginationOptions);
    const languages = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || languageEntries?.length,
        count: languageEntries?.length || 0,
      },
      items: languageEntries?.map((language) => language.toJSON()) || [],
    };

    return R.handleSuccess(res, { languages });
  } catch (error: any) {
    console.error('⚠️ Erreur listing langues:', error);

    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.VALIDATION_FAILED,
        message: 'Invalid filters or pagination parameters',
        details: error.issues,
      });
    } else if (error.message.includes('Invalid filters')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.FILTER_INVALID,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LANGUAGE_CODES.LISTING_FAILED,
        message: LANGUAGE_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /search/code/:code - Rechercher par code ISO 639-1
 */
router.get('/search/code/:code', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    // Validation avec utilitaire shared
    if (!LanguageValidationUtils.validateCode(code)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.CODE_INVALID,
        message: LANGUAGE_ERRORS.CODE_INVALID,
      });
    }
    const normalizedCode = LanguageValidationUtils.normalizeLanguageCode(code);
    const language = await Language._load(normalizedCode, false, true);

    if (!language) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LANGUAGE_CODES.LANGUAGE_NOT_FOUND,
        message: `Language with code '${normalizedCode}' not found`,
      });
    }

    return R.handleSuccess(res, language.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par code:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: LANGUAGE_CODES.SEARCH_FAILED,
      message: 'Failed to search language by code',
    });
  }
});

/**
 * GET /:identifier - Recherche intelligente par ID, GUID ou code ISO
 */
router.get('/:identifier', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    let language: Language | null = null;

    // Utiliser l'utilitaire pour identifier le type
    try {
      const { type, value } = LanguageValidationUtils.extractLanguageIdentifier(identifier);

      if (type === 'numeric') {
        const numericId = parseInt(value);
        // Essayer par ID d'abord
        language = await Language._load(numericId);
        // Si pas trouvé, essayer par GUID si c'est un GUID valide
        if (!language && LanguageValidationUtils.validateLanguageGuid(numericId)) {
          language = await Language._load(numericId, true);
        }
      } else if (type === 'code') {
        // Recherche par code ISO 639-1
        language = await Language._load(value, false, true);
      }
    } catch (identifierError: any) {
      console.error('⚠️ Erreur recherche langue:', identifierError);
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LANGUAGE_CODES.CODE_INVALID,
        message: `Invalid identifier format: ${identifier}`,
      });
    }

    if (!language) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LANGUAGE_CODES.LANGUAGE_NOT_FOUND,
        message: `Language with identifier '${identifier}' not found`,
      });
    }

    return R.handleSuccess(res, language.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur recherche langue:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: LANGUAGE_CODES.SEARCH_FAILED,
      message: 'Failed to search language',
    });
  }
});

// endregion

export default router;
