import { Request, Response, Router } from 'express';
import {
  ER,
  ERROR_CODES,
  EXCHANGE_RATE_ERRORS,
  ExchangeRateValidationUtils,
  HttpStatus,
  paginationSchema,
} from '@toke/shared';

import ExchangeRate from '../class/ExchangeRate.js';
import R from '../../tools/response.js';
import Ensure from '../../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName as TS } from '../../utils/response.model.js';

const router = Router();

// region ROUTES D'EXPORT

/**
 * GET / - Exporter tous les taux de change
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const exchangeRates = await ExchangeRate.exportable(paginationOptions);
    R.handleSuccess(res, { exchange_rates: exchangeRates });
  } catch (error: any) {
    console.error('❌ Erreur export taux de change:', error);
    if (error.issues) {
      // Erreur Zod
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.PAGINATION_INVALID,
        message: 'Invalid pagination parameters',
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ERROR_CODES.EXPORT_FAILED,
        message: EXCHANGE_RATE_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /revision - Récupérer uniquement la révision actuelle
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(TS.EXCHANGE_RATE);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Erreur récupération révision:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get current revision',
    });
  }
});

/**
 * GET /current/:status - Lister les taux par statut courant/historique
 */
router.get('/current/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const isCurrent = status.toLowerCase() === 'true' || status === '1';

    const paginationOptions = paginationSchema.parse(req.query);

    const exchangeRatesData = await ExchangeRate._listByCurrentStatus(isCurrent, paginationOptions);
    const exchange_rates = {
      current: isCurrent,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || exchangeRatesData?.length,
        count: exchangeRatesData?.length || 0,
      },
      items: exchangeRatesData?.map((rate) => rate.toJSON()) || [],
    };

    R.handleSuccess(res, { exchange_rates });
  } catch (error: any) {
    console.error('❌ Erreur recherche par statut courant:', error);
    if (error.issues) {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.PAGINATION_INVALID,
        message: 'Invalid pagination parameters',
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ERROR_CODES.SEARCH_FAILED,
        message: `Failed to search exchange rates by status: ${req.params.status}`,
      });
    }
  }
});

/**
 * GET /pair/:from_currency/:to_currency - Récupérer le taux pour une paire de devises
 */
router.get(
  '/pair/:from_currency/:to_currency',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { from_currency, to_currency } = req.params;

      // Validation avec utilitaires shared
      if (!ExchangeRateValidationUtils.validateFromCurrencyCode(from_currency)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ERROR_CODES.CURRENCY_CODE_INVALID,
          message: EXCHANGE_RATE_ERRORS.FROM_CURRENCY_CODE_INVALID,
        });
      }

      if (!ExchangeRateValidationUtils.validateToCurrencyCode(to_currency)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ERROR_CODES.CURRENCY_CODE_INVALID,
          message: EXCHANGE_RATE_ERRORS.TO_CURRENCY_CODE_INVALID,
        });
      }

      const fromCode = from_currency.toUpperCase();
      const toCode = to_currency.toUpperCase();

      if (!ExchangeRateValidationUtils.validateCurrencyPair(fromCode, toCode)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ERROR_CODES.SAME_CURRENCY_PAIR,
          message: EXCHANGE_RATE_ERRORS.SAME_CURRENCY_PAIR,
        });
      }

      const paginationOptions = paginationSchema.parse(req.query);
      const { current_only } = req.query;
      const isCurrentOnly = current_only === 'true' || current_only === '1';

      const conditions: Record<string, any> = {
        from_currency_code: fromCode,
        to_currency_code: toCode,
      };

      if (isCurrentOnly) {
        conditions.current = true;
      }

      const exchangeRatesData = await ExchangeRate._list(conditions, paginationOptions);
      const exchange_rates = {
        currency_pair: `${fromCode}/${toCode}`,
        current_only: isCurrentOnly,
        pagination: {
          offset: paginationOptions.offset || 0,
          limit: paginationOptions.limit || exchangeRatesData?.length,
          count: exchangeRatesData?.length || 0,
        },
        items: exchangeRatesData?.map((rate) => rate.toJSON()) || [],
      };

      R.handleSuccess(res, { exchange_rates });
    } catch (error: any) {
      console.error('❌ Erreur recherche par paire:', error);
      if (error.issues) {
        R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ERROR_CODES.PAGINATION_INVALID,
          message: 'Invalid pagination parameters',
          details: error.issues,
        });
      } else {
        R.handleError(res, HttpStatus.INTERNAL_ERROR, {
          code: ERROR_CODES.SEARCH_FAILED,
          message: `Failed to search exchange rates for pair: ${req.params.from_currency}/${req.params.to_currency}`,
        });
      }
    }
  },
);

/**
 * GET /currency/:currency_code - Récupérer tous les taux impliquant une devise ___
 */
router.get('/currency/:currency_code', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { currency_code } = req.params;
    const currencyCode = currency_code.toUpperCase();

    // Validation du code de devise
    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_currency_code',
        message: 'Currency code must be exactly 3 letters (ISO 4217)',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const { current_only } = req.query;
    const isCurrentOnly = current_only === 'true' || current_only === '1';

    const conditions: Record<string, any> = {
      $or: [{ from_currency_code: currencyCode }, { to_currency_code: currencyCode }],
    };

    if (isCurrentOnly) {
      conditions.current = true;
    }

    const exchangeRatesData = await ExchangeRate._list(conditions, paginationOptions);
    const exchange_rates = {
      currency_code: currencyCode,
      current_only: isCurrentOnly,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || exchangeRatesData?.length,
        count: exchangeRatesData?.length || 0,
      },
      items: exchangeRatesData?.map((rate) => rate.toJSON()) || [],
    };

    R.handleSuccess(res, { exchange_rates });
  } catch (error: any) {
    console.error('⌐ Erreur recherche par devise:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'currency_search_failed',
      message: `Failed to search exchange rates for currency: ${req.params.currency_code}`,
    });
  }
});

// endregion

// region ROUTES CRUD

/**
 * POST / - Créer un nouveau taux de change
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = ER.exchangeRateSchemas.validateExchangeRateCreation(req.body);

    const exchangeRateObj = new ExchangeRate()
      .setFromCurrencyCode(validatedData.from_currency_code)
      .setToCurrencyCode(validatedData.to_currency_code)
      .setExchangeRate(validatedData.exchange_rate)
      .setCreatedBy(validatedData.created_by);

    if (validatedData.current !== undefined) exchangeRateObj.setCurrent(validatedData.current);

    await exchangeRateObj.save();

    console.log(
      `✅ Taux de change créé: ${exchangeRateObj.getCurrencyPair()} - ${validatedData.exchange_rate} (GUID: ${exchangeRateObj.getGuid()})`,
    );
    R.handleCreated(res, exchangeRateObj.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur création taux de change:', error.message);

    if (error.issues) {
      // Erreur Zod
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Validation failed',
        details: error.issues,
      });
    } else if (error.message.includes('already exists')) {
      R.handleError(res, HttpStatus.CONFLICT, {
        code: ERROR_CODES.EXCHANGE_RATE_ALREADY_EXISTS,
        message: EXCHANGE_RATE_ERRORS.CURRENCY_PAIR_EXISTS,
      });
    } else if (error.message.includes('Validation failed')) {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      R.handleError(
        res,
        HttpStatus.INTERNAL_ERROR,
        {
          code: 'DEBUG_ERROR',
          message: error.message || error.toString(),
          details: {
            original_error: error,
            stack: error.stack,
          },
        },
        // R.handleError(res, HttpStatus.BAD_REQUEST, {
        //   code: ERROR_CODES.CREATION_FAILED,
        //   message: EXCHANGE_RATE_ERRORS.CREATION_FAILED,
        // }
      );
    }
  }
});

/**
 * PUT /:guid - Modifier un taux de change par GUID
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const validatedGuid = ER.exchangeRateSchemas.validateExchangeRateGuid(req.params.guid);

    // Charger par GUID
    const exchangeRate = await ExchangeRate._load(validatedGuid, true);
    if (!exchangeRate) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.EXCHANGE_RATE_NOT_FOUND,
        message: EXCHANGE_RATE_ERRORS.NOT_FOUND,
      });
    }

    // Validation des données avec schéma shared
    const validatedData = ER.exchangeRateSchemas.validateExchangeRateUpdate(req.body);

    // Mise à jour des champs fournis
    if (validatedData.from_currency_code !== undefined) {
      exchangeRate.setFromCurrencyCode(validatedData.from_currency_code);
    }
    if (validatedData.to_currency_code !== undefined) {
      exchangeRate.setToCurrencyCode(validatedData.to_currency_code);
    }
    if (validatedData.exchange_rate !== undefined) {
      exchangeRate.setExchangeRate(validatedData.exchange_rate);
    }
    if (validatedData.current !== undefined) {
      exchangeRate.setCurrent(validatedData.current);
    }
    if (validatedData.created_by !== undefined) {
      exchangeRate.setCreatedBy(validatedData.created_by);
    }

    await exchangeRate.save();

    console.log(`✅ Taux de change modifié: GUID ${validatedGuid}`);
    R.handleSuccess(res, exchangeRate.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur modification taux de change:', error);

    if (error.issues) {
      // Erreur Zod
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Validation failed',
        details: error.issues,
      });
    } else if (error.message.includes('Invalid GUID')) {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.INVALID_GUID,
        message: EXCHANGE_RATE_ERRORS.GUID_INVALID,
      });
    } else if (error.message.includes('already exists')) {
      R.handleError(res, HttpStatus.CONFLICT, {
        code: ERROR_CODES.EXCHANGE_RATE_ALREADY_EXISTS,
        message: EXCHANGE_RATE_ERRORS.CURRENCY_PAIR_EXISTS,
      });
    } else if (error.message.includes('Validation failed')) {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.UPDATE_FAILED,
        message: EXCHANGE_RATE_ERRORS.UPDATE_FAILED,
      });
    }
  }
});

/**
 * DELETE /:guid - Supprimer un taux de change par GUID
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    // Validation du GUID avec utilitaire shared
    if (!ExchangeRateValidationUtils.validateExchangeRateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.INVALID_GUID,
        message: EXCHANGE_RATE_ERRORS.GUID_INVALID,
      });
    }

    const guid = parseInt(req.params.guid, 10);

    // Charger par GUID
    const exchangeRate = await ExchangeRate._load(guid, true);
    if (!exchangeRate) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.EXCHANGE_RATE_NOT_FOUND,
        message: EXCHANGE_RATE_ERRORS.NOT_FOUND,
      });
    }

    const deleted = await exchangeRate.delete();

    if (deleted) {
      console.log(`✅ Taux de change supprimé: GUID ${guid} (${exchangeRate.getCurrencyPair()})`);
      R.handleSuccess(res, {
        message: 'Exchange rate deleted successfully',
        guid: guid,
        currency_pair: exchangeRate.getCurrencyPair(),
        exchange_rate: exchangeRate.getExchangeRate(),
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ERROR_CODES.DELETE_FAILED,
        message: EXCHANGE_RATE_ERRORS.DELETE_FAILED,
      });
    }
  } catch (error: any) {
    console.error('❌ Erreur suppression taux de change:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ERROR_CODES.DELETE_FAILED,
      message: EXCHANGE_RATE_ERRORS.DELETE_FAILED,
    });
  }
});

// endregion

// region ROUTES UTILITAIRES

/**
 * GET /list - Lister tous les taux de change (pour admin)
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    // Validation des filtres avec schéma shared
    const filters = ER.exchangeRateSchemas.validateExchangeRateFilters(req.query);
    const paginationOptions = paginationSchema.parse(req.query);

    // Conversion des filtres pour compatibilité
    const conditions: Record<string, any> = {};
    if (filters.from_currency_code) conditions.from_currency_code = filters.from_currency_code;
    if (filters.to_currency_code) conditions.to_currency_code = filters.to_currency_code;
    if (filters.current !== undefined) conditions.current = filters.current;
    if (filters.created_by) conditions.created_by = filters.created_by;

    const exchangeRateEntries = await ExchangeRate._list(conditions, paginationOptions);
    const exchange_rates = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || exchangeRateEntries?.length,
        count: exchangeRateEntries?.length || 0,
      },
      items: exchangeRateEntries?.map((rate) => rate.toJSON()) || [],
    };

    R.handleSuccess(res, { exchange_rates });
  } catch (error: any) {
    console.error('❌ Erreur listing taux de change:', error);

    if (error.issues) {
      // Erreur Zod
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
        message: EXCHANGE_RATE_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /convert/:amount/:from/:to - Convertir un montant entre deux devises
 */
router.get('/convert/:amount/:from/:to', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const conversionData = ER.exchangeRateSchemas.validateCurrencyConversion({
      amount: req.params.amount,
      from_currency: req.params.from,
      to_currency: req.params.to,
    });
    const { amount, from_currency: fromCode, to_currency: toCode } = conversionData;

    // Cas spécial: même devise
    if (fromCode === toCode) {
      return R.handleSuccess(res, {
        from_currency: fromCode,
        to_currency: toCode,
        original_amount: amount,
        converted_amount: amount,
        exchange_rate: 1,
        currency_pair: `${fromCode}/${toCode}`,
        conversion_note: 'Same currency conversion',
        conversion_timestamp: new Date().toISOString(),
      });
    }

    // Rechercher le taux courant
    const conditions = {
      from_currency_code: fromCode,
      to_currency_code: toCode,
      current: true,
    };

    const exchangeRates = await ExchangeRate._list(conditions, { limit: 1 });

    if (!exchangeRates || exchangeRates.length === 0) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.EXCHANGE_RATE_NOT_FOUND,
        message: `${EXCHANGE_RATE_ERRORS.RATE_NOT_AVAILABLE} ${fromCode}/${toCode}`,
      });
    }

    const rate = exchangeRates[0];
    const rawConvertedAmount = amount * (rate.getExchangeRate() || 0);
    const convertedAmount = ExchangeRateValidationUtils.roundConvertedAmount(rawConvertedAmount);

    R.handleSuccess(res, {
      from_currency: fromCode,
      to_currency: toCode,
      original_amount: amount,
      converted_amount: convertedAmount,
      exchange_rate: rate.getExchangeRate(),
      currency_pair: rate.getCurrencyPair(),
      rate_guid: rate.getGuid(),
      conversion_timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Erreur conversion:', error);

    if (error.issues) {
      // Erreur Zod
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Invalid conversion parameters',
        details: error.issues,
      });
    } else if (error.message.includes('Conversion validation failed')) {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ERROR_CODES.CONVERSION_FAILED,
        message: EXCHANGE_RATE_ERRORS.CONVERSION_FAILED,
      });
    }
  }
});

/**
 * GET /:identifier - Recherche intelligente par ID ou GUID
 */
router.get('/:identifier', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    let exchangeRate: ExchangeRate | null = null;

    // Essayer différentes méthodes de recherche selon le format
    if (/^\d+$/.test(identifier)) {
      const numericId = parseInt(identifier);

      // Essayer par ID d'abord
      exchangeRate = await ExchangeRate._load(numericId);

      // Si pas trouvé, essayer par GUID si c'est un GUID valide
      if (!exchangeRate && ExchangeRateValidationUtils.validateExchangeRateGuid(numericId)) {
        exchangeRate = await ExchangeRate._load(numericId, true);
      }
    }

    if (!exchangeRate) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.EXCHANGE_RATE_NOT_FOUND,
        message: `Exchange rate with identifier '${identifier}' not found`,
      });
    }

    R.handleSuccess(res, exchangeRate.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur recherche taux de change:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ERROR_CODES.SEARCH_FAILED,
      message: 'Failed to search exchange rate',
    });
  }
});

// endregion

export default router;
