import { Request, Response, Router } from 'express';
import { HttpStatus, } from '@toke/shared';

import Lexicon from '../class/Lexicon.js';
import R from '../../tools/response.js';
import G from '../../tools/glossary.js';
import Ensure from '../middle/ensured-routes.js';
import { iso639Codes } from '../database/data/lexicon.db.js';

const router = Router();

// region ROUTES D'EXPORT

/**
 * GET / - Exporter tous les lexiques (toutes langues)
 */
router.get(
  '/',
  Ensure.get(),
  // UserAuth.authenticate,
  async (req: Request, res: Response) => {
    try {
      const exportData = await Lexicon.exportable();
      R.handleSuccess(res, { available_language: iso639Codes, lexicons: exportData });
    } catch (error: any) {
      console.error('❌ Erreur export complet:', error);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'export_failed',
        message: 'Failed to export lexicon',
      });
    }
  }
);

/**
 * GET /revision - Récupérer uniquement la révision actuelle
 */
router.get('/revision', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const instance = new Lexicon();
    const revision = await (instance as any).getRevision(); // Accès à la méthode private

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Erreur récupération révision:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'revision_check_failed',
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
        available_language: iso639Codes,
        lexicons,
      });
    } catch (error: any) {
      console.error('❌ Erreur listing lexique:', error);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'listing_failed',
        message: 'Failed to list lexicon entries',
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

    // ✅ Validation manuelle du code langue
    if (!/^[a-z]{2}$/i.test(lang)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_language_code',
        message: 'Language code must be 2 letters (e.g., fr, en)',
      });
    }

    const exportData = await Lexicon.exportable(lang);

    // Headers pour optimisation cache client
    res.setHeader('X-Lexicon-Revision', exportData.revision);
    res.setHeader('X-Language', lang);

    R.handleSuccess(res, { available_language: iso639Codes, lexicons: exportData });
  } catch (error: any) {
    console.error('❌ Erreur export langue:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'export_language_failed',
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
      const { reference, translation, portable = true } = req.body;

      // Validation des champs requis
      if (!reference) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, G.referenceRequired);
      }

      if (!translation) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, G.translationRequired);
      }

      const lexicon = new Lexicon()
        .setReference(reference)
        .setTranslation(translation)
        .setPortable(portable);

      await lexicon.save();

      console.log(`✅ Lexique créé: ${reference} (GUID: ${lexicon.getGuid()})`);
      R.handleCreated(res, lexicon.toJSON());
    } catch (error: any) {
      console.error('❌ Erreur création lexique:', error);

      if (error.message.includes('already exists')) {
        R.handleError(res, HttpStatus.CONFLICT, G.referenceExists);
      } else if (error.message.includes('camelCase')) {
        R.handleError(res, HttpStatus.BAD_REQUEST, G.referenceRequired);
      } else if (error.message.includes('French')) {
        R.handleError(res, HttpStatus.BAD_REQUEST, G.frenchTranslationRequired);
      } else {
        R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'creation_failed',
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
      // ✅ Validation manuelle du GUID
      if (!/^\d+$/.test(req.params.guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, G.invalidGuid);
      }

      const guid = parseInt(req.params.guid);

      // Charger par GUID
      const lexicon = await Lexicon._load(guid, true);
      if (!lexicon) {
        return R.handleError(res, HttpStatus.NOT_FOUND, G.lexiconNotFound);
      }

      const { reference, translation, portable } = req.body;

      // Mise à jour des champs fournis
      if (reference !== undefined) lexicon.setReference(reference);
      if (translation !== undefined) lexicon.setTranslation(translation);
      if (portable !== undefined) lexicon.setPortable(portable);

      await lexicon.save();

      console.log(`✅ Lexique modifié: GUID ${guid}`);
      R.handleSuccess(res, lexicon.toJSON());
    } catch (error: any) {
      console.error('❌ Erreur modification lexique:', error);

      if (error.message.includes('already exists')) {
        R.handleError(res, HttpStatus.CONFLICT, G.referenceExists);
      } else if (error.message.includes('camelCase')) {
        R.handleError(res, HttpStatus.BAD_REQUEST, G.referenceRequired);
      } else if (error.message.includes('French')) {
        R.handleError(res, HttpStatus.BAD_REQUEST, G.frenchTranslationRequired);
      } else {
        R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'update_failed',
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
      // ✅ Validation manuelle du GUID
      if (!/^\d+$/.test(req.params.guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, G.invalidGuid);
      }

      const guid = parseInt(req.params.guid);

      // Charger par GUID
      const lexicon = await Lexicon._load(guid, true);
      if (!lexicon) {
        return R.handleError(res, HttpStatus.NOT_FOUND, G.lexiconNotFound);
      }

      const deleted = await lexicon.delete();

      if (deleted) {
        console.log(`✅ Lexique supprimé: GUID ${guid}`);
        R.handleSuccess(res, {
          message: 'Lexicon entry deleted successfully',
          guid: guid,
        });
      } else {
        R.handleError(res, HttpStatus.INTERNAL_ERROR, G.savedError);
      }
    } catch (error: any) {
      console.error('❌ Erreur suppression lexique:', error);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'deletion_failed',
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
      const { reference } = req.params;
      const lexicon = await Lexicon._load(reference, false, true);

      if (!lexicon) {
        return R.handleError(res, HttpStatus.NOT_FOUND, G.lexiconNotFound);
      }

      R.handleSuccess(res, lexicon.toJSON());
    } catch (error: any) {
      console.error('❌ Erreur recherche lexique:', error.message);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'search_failed',
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
      // ✅ Validation manuelle du GUID
      if (!/^\d+$/.test(req.params.guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, G.invalidGuid);
      }

      const guid = parseInt(req.params.guid);

      const lexicon = await Lexicon._load(guid, true);
      if (!lexicon) {
        return R.handleError(res, HttpStatus.NOT_FOUND, G.lexiconNotFound);
      }

      // Valider que req.body contient des traductions
      if (!req.body || typeof req.body !== 'object') {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'invalid_translations',
          message: 'Translations object is required',
        });
      }

      await lexicon.updatePartialTranslations(req.body);

      console.log(`✅ Traductions mises à jour: GUID ${guid}`);
      R.handleSuccess(res, lexicon.toJSON());
    } catch (error: any) {
      console.error('❌ Erreur mise à jour traductions:', error);

      if (error.message.includes('French')) {
        R.handleError(res, HttpStatus.BAD_REQUEST, G.frenchTranslationRequired);
      } else {
        R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'translation_update_failed',
          message: error.message,
        });
      }
    }
  }
);

// endregion
export default router;
