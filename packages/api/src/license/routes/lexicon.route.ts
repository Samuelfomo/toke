import { Request, Response, Router } from 'express';
import { HttpStatus, LEXICON_CODES, LEXICON_ERRORS, LexiconValidationUtils, LX } from '@toke/shared';

import Lexicon from '../class/Lexicon.js';
import R from '../../tools/response.js';
import Ensure from '../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';

const router = Router();

// region ROUTES D'EXPORT

/**
 * GET / - Exporter tous les lexiques (toutes langues)
 */
router.get(
  '/',
  Ensure.get(),
  // UserAuth.authenticate,
  async (_req: Request, res: Response) => {
    try {
      const exportData = await Lexicon.exportable();
      R.handleSuccess(res,  exportData);
    } catch (error: any) {
      console.error('❌ Erreur export complet:', error);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LEXICON_CODES.EXPORT_FAILED,
        message: LEXICON_ERRORS.EXPORT_FAILED,
      });
    }
  }
);

/**
 * GET /revision - Récupérer uniquement la révision actuelle
 */
router.get('/revision', Ensure.get(), async (req: Request, res: Response) => {
  try {
    // const instance = new Lexicon();
    // const revision = await (instance as any).getRevision(); // Accès à la méthode private
    const revision = await Revision.getRevision(tableName.LEXICON);
    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Erreur récupération révision:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: LEXICON_CODES.SEARCH_FAILED,
      message: 'Failed to get current revision',
    });
  }
});

/**
 * GET /list - Lister toutes les entrées (pour admin) // car : GET by lang intercepte les requêtes de cette route dur à sa position
 */
router.get(
  '/list',
  Ensure.get(),
  // UserAuth.authenticate,
  async (req: Request, res: Response) => {
    try {
      const { portable } = req.query;
      const conditions: Record<string, any> = {};

      if (portable !== undefined) {
        conditions.portable = portable === 'true';
      }

      const entries = await Lexicon._list(conditions);
      const lexicons = {
        count: entries?.length || 0,
        items: entries?.map((entry) => entry.toJSON()) || [],
      };

      R.handleSuccess(res, {
        lexicons,
      });
    } catch (error: any) {
      console.error('❌ Erreur listing lexique:', error);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LEXICON_CODES.LISTING_FAILED,
        message: LEXICON_ERRORS.NOT_FOUND,
      });
    }
  }
);

/**
 * GET /:lang - Exporter pour une langue spécifique
 */
router.get('/:lang', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { lang } = req.params;
    if (!(await LexiconValidationUtils.validateLanguageCode(lang))){
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LEXICON_CODES.LANGUAGE_CODE_INVALID,
        message: LEXICON_ERRORS.LANGUAGE_CODE_INVALID,
      })
    }

    const exportData = await Lexicon.exportable(lang);

    // Headers pour optimisation cache client
    res.setHeader('X-Lexicon-Revision', exportData.revision);
    res.setHeader('X-Language', lang);

    R.handleSuccess(res, exportData );
  } catch (error: any) {
    console.error('❌ Erreur export langue:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: LEXICON_CODES.EXPORT_FAILED,
      message: `Failed to export lexicon for language: ${req.params.lang}`,
    });
  }
});

// endregion

// region ROUTES CRUD

/**
 * POST / - Créer une nouvelle entrée lexique
 */
router.post(
  '/',
  Ensure.post(),
  // UserAuth.authenticate,
  async (req: Request, res: Response) => {
    try {

      const validatedData = LX.validateLexiconCreation(req.body);
      const lexicon = new Lexicon()
        .setReference(validatedData.reference)
        .setTranslation(validatedData.translation)
        .setPortable(validatedData.portable);

      await lexicon.save();

      console.log(`✅ Lexique créé: ${validatedData.reference} (GUID: ${lexicon.getGuid()})`);
      R.handleCreated(res, lexicon.toJSON());
    } catch (error: any) {
      console.error('❌ Erreur création lexique:', error);

      if (error.issues) { // Erreur Zod
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.VALIDATION_FAILED,
          message: 'Validation failed',
          details: error.issues,
        });
      } else if (error.message.includes('already exists')) {
        R.handleError(res, HttpStatus.CONFLICT, {
          code: LEXICON_CODES.LEXICON_ALREADY_EXISTS,
          message: LEXICON_ERRORS.REFERENCE_ALREADY_EXISTS,
        });
      } else if (error.message.includes('camelCase')) {
        R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.VALIDATION_FAILED,
          message: LEXICON_ERRORS.REFERENCE_REQUIRED
        });
      } else if (error.message.includes('French')) {
        R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.DEFAULT_LANGUAGE_MISSING,
          message: LEXICON_ERRORS.DEFAULT_LANGUAGE_REQUIRED
        });
      } else {
        R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.CREATION_FAILED,
          message: error.message,
        });
      }
    }
  }
);

/**
 * PUT / : guid - Modifier une entrée par GUID
 */
router.put(
  '/:guid',
  Ensure.put(),
  // UserAuth.authenticate,
  async (req: Request, res: Response) => {
    try {

     const valideGuid = LexiconValidationUtils.validateLexiconGuid(req.params.guid);
      if (!valideGuid){
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.INVALID_GUID,
          message: LEXICON_ERRORS.GUID_INVALID,
        })
      }

      const guid = parseInt(req.params.guid, 10);

      // Charger par GUID
      const lexicon = await Lexicon._load(guid, true);
      if (!lexicon) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: LEXICON_CODES.LEXICON_NOT_FOUND,
          message: LEXICON_ERRORS.NOT_FOUND,
        });
      }

      const validatedData = LX.validateLexiconUpdate(req.body);
      // Mise à jour des champs fournis
      if (validatedData.reference !== undefined) lexicon.setReference(validatedData.reference);
      if (validatedData.translation !== undefined) lexicon.setTranslation(validatedData.translation);
      if (validatedData.portable !== undefined) lexicon.setPortable(validatedData.portable);

      await lexicon.save();

      console.log(`✅ Lexique modifié: GUID ${guid}`);
      R.handleSuccess(res, lexicon.toJSON());
    } catch (error: any) {
      console.error('❌ Erreur modification lexique:', error);

      if (error.message.includes('already exists')) {
        R.handleError(res, HttpStatus.CONFLICT, {
          code: LEXICON_CODES.LEXICON_ALREADY_EXISTS,
          message: LEXICON_ERRORS.REFERENCE_ALREADY_EXISTS,
        });
      } else if (error.message.includes('camelCase')) {
        R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.VALIDATION_FAILED,
          message: LEXICON_ERRORS.REFERENCE_REQUIRED
        });
      } else if (error.message.includes('French')) {
        R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.DEFAULT_LANGUAGE_MISSING,
          message: LEXICON_ERRORS.DEFAULT_LANGUAGE_REQUIRED
        });
      } else {
        R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.UPDATE_FAILED,
          message: error.message,
        });
      }
    }
  }
);

/**
 * DELETE /:guid - Supprimer une entrée par GUID
 */
router.delete(
  '/:guid',
  Ensure.delete(),
  // UserAuth.authenticate,
  async (req: Request, res: Response) => {
    try {
      const validateGuid = LexiconValidationUtils.validateLexiconGuid(req.params.guid);
      if (!validateGuid){
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.INVALID_GUID,
          message: LEXICON_ERRORS.GUID_INVALID,
        })
      }

      const guid = parseInt(req.params.guid, 10);

      // Charger par GUID
      const lexicon = await Lexicon._load(guid, true);
      if (!lexicon) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: LEXICON_CODES.LEXICON_NOT_FOUND,
          message: LEXICON_ERRORS.NOT_FOUND,
        });
      }

      const deleted = await lexicon.delete();

      if (deleted) {
        console.log(`✅ Lexique supprimé: GUID ${guid}`);
        R.handleSuccess(res, {
          message: 'Lexicon entry deleted successfully',
          guid: guid,
        });
      } else {
        R.handleError(res, HttpStatus.INTERNAL_ERROR, {
          code: LEXICON_CODES.DELETE_FAILED,
          message: LEXICON_ERRORS.DELETE_FAILED,
        });
      }
    } catch (error: any) {
      console.error('❌ Erreur suppression lexique:', error);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LEXICON_CODES.DELETE_FAILED,
        message: error.message,
      });
    }
  }
);

// endregion

// region ROUTES UTILITAIRES

/**
 * GET /search/:reference - Rechercher par référence
 */
router.get(
  '/search/:reference',
  Ensure.get(),
  // ServerAuth.requirePermission(E.postLexicon),
  async (req: Request, res: Response) => {
    try {
      const validateRef = LexiconValidationUtils.validateReference(req.params.reference);
      if (!validateRef) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.REFERENCE_INVALID,
          message: LEXICON_ERRORS.REFERENCE_INVALID,
        })
      }
      const reference = req.params.reference;
      const lexicon = await Lexicon._load(reference, false, true);

      if (!lexicon) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: LEXICON_CODES.LEXICON_NOT_FOUND,
          message: LEXICON_ERRORS.NOT_FOUND,
        });
      }

      R.handleSuccess(res, lexicon.toJSON());
    } catch (error: any) {
      console.error('❌ Erreur recherche lexique:', error.message);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LEXICON_CODES.SEARCH_FAILED,
        message: `Failed to search lexicon entry ${error.message}`,
      });
    }
  }
);

/**
 * PATCH / : guid/translations - Mise à jour partielle des traductions
 */
router.patch(
  '/:guid/translations',
  Ensure.patch(),
  // UserAuth.authenticate,
  async (req: Request, res: Response) => {
    try {

      const validateGuid = LexiconValidationUtils.validateLexiconGuid(req.params.guid);
      if (!validateGuid) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.INVALID_GUID,
          message: LEXICON_ERRORS.REFERENCE_INVALID,
        })
      }

      const guid = parseInt(req.params.guid, 10);

      const lexicon = await Lexicon._load(guid, true);
      if (!lexicon) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: LEXICON_CODES.LEXICON_NOT_FOUND,
          message: LEXICON_ERRORS.NOT_FOUND,
        });
      }

      const validateTranslation = LexiconValidationUtils.validateTranslation(req.body);
      if (!validateTranslation) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.TRANSLATION_INVALID,
          message: LEXICON_ERRORS.TRANSLATION_INVALID,
        })
      }

      await lexicon.updatePartialTranslations(req.body);

      console.log(`✅ Traductions mises à jour: GUID ${guid}`);
      R.handleSuccess(res, lexicon.toJSON());
    } catch (error: any) {
      console.error('❌ Erreur mise à jour traductions:', error);

      if (error.message.includes('French')) {
        R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.DEFAULT_LANGUAGE_MISSING,
          message: LEXICON_ERRORS.DEFAULT_LANGUAGE_REQUIRED
        });
      } else {
        R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LEXICON_CODES.TRANSLATION_UPDATE_FAILED,
          message: error.message,
        });
      }
    }
  }
);

// endregion
export default router;
