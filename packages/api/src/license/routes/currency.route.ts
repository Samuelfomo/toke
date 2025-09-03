import { Request, Response, Router } from 'express';
import {
  CURRENCY_ERRORS,
  currencySchemas,
  CurrencyValidationUtils,
  ERROR_CODES,
  HttpStatus,
  paginationSchema
} from '@toke/shared';

import Currency from '../class/Currency.js';
import R from '../../tools/response.js';
import Ensure from '../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName as TS } from '../../utils/response.model.js';


const router = Router();
  // validateCurrencyCreation,
  // validateCurrencyUpdate
  // CURRENCY_ERRORS,
  // currencyFiltersSchema,
  // ERROR_CODES,
  // HTTP_STATUS,

// region ROUTES D'EXPORT

/**
 * GET / - Exporter toutes les devises
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions =  paginationSchema.parse(req.query);

    const currencies = await Currency.exportable(paginationOptions);
    R.handleSuccess(res, { currencies });
  } catch (error: any) {
    console.error('⌐ Erreur export devises:', error);
    if (error.issues) { // Erreur Zod
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.PAGINATION_INVALID,
        message: 'Invalid pagination parameters',
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ERROR_CODES.EXPORT_FAILED,
        message: CURRENCY_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /revision - Récupérer uniquement la révision actuelle
 */
router.get('/revision', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(TS.CURRENCY);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('⌐ Erreur récupération révision:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get current revision',
    });
  }
});

/**
 * GET /active/:status - Lister les devises par statut actif/inactif
 */
router.get('/active/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const isActive = status.toLowerCase() === 'true' || status === '1';

    const paginationOptions = paginationSchema.parse(req.query);

    const currenciesData = await Currency._listByActiveStatus(isActive, paginationOptions);
    const currencies = {
      active: isActive,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || currenciesData?.length,
        count: currenciesData?.length || 0,
      },
      items: currenciesData?.map((currency) => currency.toJSON()) || [],
    };

    R.handleSuccess(res, { currencies });
  } catch (error: any) {
    console.error('⌐ Erreur recherche par statut:', error);
    if (error.issues) {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.PAGINATION_INVALID,
        message: 'Invalid pagination parameters',
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ERROR_CODES.SEARCH_FAILED,
        message: `Failed to search currencies by status: ${req.params.status}`,
      });
    }
  }
});

// endregion

// region ROUTES CRUD

/**
 * POST / - Créer une nouvelle devise
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = currencySchemas.validateCurrencyCreation(req.body);
    const currency = new Currency()
      .setCode(validatedData.code)
      .setName(validatedData.name)
      .setSymbol(validatedData.symbol)
      .setDecimalPlaces(validatedData.decimal_places);

    if (validatedData.active !== undefined) currency.setActive(validatedData.active);

    await currency.save();

    console.log(`✅ Devise créée: ${validatedData.code} - ${validatedData.name} (GUID: ${currency.getGuid()})`);
    R.handleCreated(res, currency.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur création devise:', error.message);

    // ✅ Gestion d'erreurs avec constantes shared
    if (error.issues) { // Erreur Zod
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Validation failed',
        details: error.issues,
      });
    } else if (error.message.includes('already exists')) {
      R.handleError(res, HttpStatus.CONFLICT, {
        code: ERROR_CODES.CURRENCY_ALREADY_EXISTS,
        message: CURRENCY_ERRORS.CODE_EXISTS,
      });
    } else if (error.message.includes('Validation failed')) {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.CREATION_FAILED,
        message: CURRENCY_ERRORS.CREATION_FAILED,
      });
    }
  }
});

/**
 * PUT /:guid - Modifier une devise par GUID
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {

    // ✅ Validation du GUID avec schéma shared
    const validatedGuid = currencySchemas.validateCurrencyGuid(req.params.guid);

    // Charger par GUID
    const currency = await Currency._load(validatedGuid, true);
    if (!currency) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.CURRENCY_NOT_FOUND,
        message: CURRENCY_ERRORS.NOT_FOUND,
      });
    }

    // ✅ Validation des données avec schéma shared
    const validatedData = currencySchemas.validateCurrencyUpdate(req.body);

    // Mise à jour des champs fournis
    if (validatedData.code !== undefined) currency.setCode(validatedData.code);
    if (validatedData.name !== undefined) currency.setName(validatedData.name);
    if (validatedData.symbol !== undefined) currency.setSymbol(validatedData.symbol);
    if (validatedData.decimal_places !== undefined) currency.setDecimalPlaces(validatedData.decimal_places);
    if (validatedData.active !== undefined) currency.setActive(validatedData.active);

    await currency.save();

    console.log(`✅ Devise modifiée: GUID ${validatedGuid}`);
    R.handleSuccess(res, currency.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur modification devise:', error);

    if (error.issues) { // Erreur Zod
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Validation failed',
        details: error.issues,
      });
    } else if (error.message.includes('Invalid GUID')) {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.INVALID_GUID,
        message: CURRENCY_ERRORS.GUID_INVALID,
      });
    } else if (error.message.includes('already exists')) {
      R.handleError(res, HttpStatus.CONFLICT, {
        code: ERROR_CODES.CURRENCY_ALREADY_EXISTS,
        message: CURRENCY_ERRORS.CODE_EXISTS,
      });
    } else if (error.message.includes('Validation failed')) {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.UPDATE_FAILED,
        message: CURRENCY_ERRORS.UPDATE_FAILED,
      });
    }
  }
});

/**
 * DELETE /:guid - Supprimer une devise par GUID
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    // ✅ Validation du GUID avec utilitaire shared
    if (!CurrencyValidationUtils.validateCurrencyGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.INVALID_GUID,
        message: CURRENCY_ERRORS.GUID_INVALID,
      });
    }

    const guid = parseInt(req.params.guid);

    // Charger par GUID
    const currency = await Currency._load(guid, true);
    if (!currency) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.CURRENCY_NOT_FOUND,
        message: CURRENCY_ERRORS.NOT_FOUND,
      });
    }

    const deleted = await currency.delete();

    if (deleted) {
      console.log(
        `✅ Devise supprimée: GUID ${guid} (${currency.getCode()} - ${currency.getName()})`,
      );
      R.handleSuccess(res, {
        message: 'Currency deleted successfully',
        guid: guid,
        code: currency.getCode(),
        name: currency.getName(),
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ERROR_CODES.DELETE_FAILED,
        message: CURRENCY_ERRORS.DELETE_FAILED,
      });
    }
  } catch (error: any) {
    console.error('⌐ Erreur suppression devise:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ERROR_CODES.DELETE_FAILED,
      message: CURRENCY_ERRORS.DELETE_FAILED,
    });
  }
});

// endregion

// region ROUTES UTILITAIRES

/**
 * GET /list - Lister toutes les devises (pour admin)
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {

    // ✅ Validation des filtres avec schéma shared
    const filters = currencySchemas.validateCurrencyFilters(req.query);
    const paginationOptions = paginationSchema.parse(req.query);

    // Conversion des filtres pour compatibilité
    const conditions: Record<string, any> = {};
    if (filters.is_active !== undefined) {
      conditions.active = filters.is_active;
    }

    const currencyEntries = await Currency._list(conditions, paginationOptions);
    const currencies = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || currencyEntries?.length,
        count: currencyEntries?.length || 0,
      },
      items: currencyEntries?.map((currency) => currency.toJSON()) || [],
    };

    R.handleSuccess(res, { currencies });
  } catch (error: any) {
    console.error('❌ Erreur listing devises:', error);

    if (error.issues) { // Erreur Zod
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Invalid filters or pagination parameters',
        details: error.issues,
      });
    } else if (error.message.includes('Invalid filters')) {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.FILTER_INVALID,
        message: error.message,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ERROR_CODES.LISTING_FAILED,
        message: CURRENCY_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /search/code/:code - Rechercher par code ISO 4217
 */
router.get('/search/code/:code', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    // ✅ Validation avec utilitaire shared
    if (!CurrencyValidationUtils.validateCurrencyCode(code)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.CURRENCY_CODE_INVALID,
        message: CURRENCY_ERRORS.CODE_INVALID,
      });
    }

    const currency = await Currency._load(code.toUpperCase(), false, true);
    if (!currency) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.CURRENCY_NOT_FOUND,
        message: `Currency with code '${code.toUpperCase()}' not found`,
      });
    }

    R.handleSuccess(res, currency.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur recherche par code:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ERROR_CODES.SEARCH_FAILED,
      message: 'Failed to search currency by code',
    });
  }
});

/**
 * GET /:identifier - Recherche intelligente par ID, GUID ou code ISO
 */
router.get('/:identifier', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    let currency: Currency | null = null;

    // Essayer différentes méthodes de recherche selon le format
    if (/^\d+$/.test(identifier)) {
      const numericId = parseInt(identifier);

      // Essayer par ID d'abord
      currency = await Currency._load(numericId);

      // Si pas trouvé, essayer par GUID
      if (!currency && CurrencyValidationUtils.validateCurrencyGuid(numericId)) {
        currency = await Currency._load(numericId, true);
      }
    } else if (CurrencyValidationUtils.validateCurrencyCode(identifier)) {
      // Recherche par code ISO 4217
      currency = await Currency._load(identifier.toUpperCase(), false, true);
    }

    if (!currency) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.CURRENCY_NOT_FOUND,
        message: `Currency with identifier '${identifier}' not found`,
      });
    }

    R.handleSuccess(res, currency.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur recherche devise:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ERROR_CODES.SEARCH_FAILED,
      message: 'Failed to search currency',
    });
  }
});

// endregion

export default router;
