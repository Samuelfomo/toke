import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  PAYMENT_METHOD_CODES,
  PAYMENT_METHOD_ERRORS,
  PaymentMethodValidationUtils,
  PM,
} from '@toke/shared';

import PaymentMethod from '../class/PaymentMethod.js';
import R from '../../tools/response.js';
import G from '../../tools/glossary.js';
import Ensure from '../../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';

const router = Router();

// region ROUTES D'EXPORT

/**
 * GET / - Exporter tous les moyens de paiement
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const paymentMethods = await PaymentMethod.exportable(paginationOptions);
    R.handleSuccess(res, { payment_methods: paymentMethods });
  } catch (error: any) {
    console.error('⚠️ Erreur export moyens de paiement:', error);
    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.PAGINATION_INVALID,
        message: PAYMENT_METHOD_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_METHOD_CODES.EXPORT_FAILED,
        message: PAYMENT_METHOD_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /revision - Récupérer uniquement la révision actuelle
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.PAYMENT_METHOD);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('⚠️ Erreur récupération révision:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: PAYMENT_METHOD_CODES.SEARCH_FAILED,
      message: 'Failed to get current revision',
    });
  }
});

/**
 * GET /active/:active - Lister les moyens de paiement par statut actif
 */
router.get('/active/:active', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { active } = req.params;
    const isActive = active.toLowerCase() === 'true';

    const paginationOptions = paginationSchema.parse(req.query);

    const methodsData = await PaymentMethod._listByActiveStatus(isActive, paginationOptions);
    if (!methodsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
      });
    }

    const paymentMethods = {
      active_status: isActive,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || methodsData.length,
        count: methodsData.length,
      },
      items: (await Promise.all(methodsData.map(async (method) => await method.toJSON()))) || [],
    };

    R.handleSuccess(res, { payment_methods: paymentMethods });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par statut actif:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.PAGINATION_INVALID,
        message: PAYMENT_METHOD_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_METHOD_CODES.SEARCH_FAILED,
        message: `Failed to search payment methods by active status: ${req.params.active}`,
      });
    }
  }
});

/**
 * GET /method-type/:method_type - Lister les moyens de paiement par type
 */
router.get('/method-type/:method_type', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { method_type } = req.params;
    const validMethodType = method_type.toUpperCase();

    const paginationOptions = paginationSchema.parse(req.query);

    const methodsData = await PaymentMethod._listByMethodType(validMethodType, paginationOptions);
    if (!methodsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
      });
    }

    const paymentMethods = {
      method_type: validMethodType,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || methodsData.length,
        count: methodsData.length,
      },
      items: (await Promise.all(methodsData.map(async (method) => await method.toJSON()))) || [],
    };

    R.handleSuccess(res, { payment_methods: paymentMethods });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par type de méthode:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.PAGINATION_INVALID,
        message: PAYMENT_METHOD_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_METHOD_CODES.SEARCH_FAILED,
        message: `Failed to search payment methods by method type: ${req.params.method_type}`,
      });
    }
  }
});

/**
 * GET /currency/:currency - Lister les moyens de paiement supportant une devise
 */
router.get('/currency/:currency', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { currency } = req.params;
    const validCurrency = currency.toUpperCase();

    if (!PaymentMethodValidationUtils.validateCurrencyCode(validCurrency)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.CURRENCY_CODE_INVALID,
        message: PAYMENT_METHOD_ERRORS.CURRENCY_CODE_INVALID,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const methodsData = await PaymentMethod._listBySupportedCurrency(
      validCurrency,
      paginationOptions,
    );
    if (!methodsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
      });
    }

    const paymentMethods = {
      supported_currency: validCurrency,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || methodsData.length,
        count: methodsData.length,
      },
      items: (await Promise.all(methodsData.map(async (method) => await method.toJSON()))) || [],
    };

    R.handleSuccess(res, { payment_methods: paymentMethods });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par devise:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.PAGINATION_INVALID,
        message: PAYMENT_METHOD_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_METHOD_CODES.SEARCH_FAILED,
        message: `Failed to search payment methods by currency: ${req.params.currency}`,
      });
    }
  }
});

/**
 * GET /amount/:amount - Lister les moyens de paiement disponibles pour un montant
 */
router.get('/amount/:amount', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const amount = parseFloat(req.params.amount);
    if (isNaN(amount) || amount < 0) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.VALIDATION_FAILED,
        message: 'Amount must be a positive number',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const methodsData = await PaymentMethod._listByAmountRange(amount, paginationOptions);
    if (!methodsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
      });
    }

    const paymentMethods = {
      amount_usd: amount,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || methodsData.length,
        count: methodsData.length,
      },
      items: (await Promise.all(methodsData.map(async (method) => await method.toJSON()))) || [],
    };

    R.handleSuccess(res, { payment_methods: paymentMethods });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par montant:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.PAGINATION_INVALID,
        message: PAYMENT_METHOD_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_METHOD_CODES.SEARCH_FAILED,
        message: `Failed to search payment methods by amount: ${req.params.amount}`,
      });
    }
  }
});

/**
 * GET /mobile - Lister les moyens de paiement mobile
 */
router.get('/mobile', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const allMethods = await PaymentMethod._list({}, paginationOptions);
    if (!allMethods) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
      });
    }

    const mobileMethods = allMethods.filter((method) => method.isMobilePayment());

    const paymentMethods = {
      payment_type: 'MOBILE',
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || mobileMethods.length,
        count: mobileMethods.length,
      },
      items: (await Promise.all(mobileMethods.map(async (method) => await method.toJSON()))) || [],
    };

    R.handleSuccess(res, { payment_methods: paymentMethods });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche moyens de paiement mobile:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.PAGINATION_INVALID,
        message: PAYMENT_METHOD_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_METHOD_CODES.SEARCH_FAILED,
        message: 'Failed to search mobile payment methods',
      });
    }
  }
});

/**
 * GET /card - Lister les moyens de paiement par carte
 */
router.get('/card', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const allMethods = await PaymentMethod._list({}, paginationOptions);
    if (!allMethods) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
      });
    }

    const cardMethods = allMethods.filter((method) => method.isCardPayment());

    const paymentMethods = {
      payment_type: 'CARD',
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || cardMethods.length,
        count: cardMethods.length,
      },
      items: (await Promise.all(cardMethods.map(async (method) => await method.toJSON()))) || [],
    };

    R.handleSuccess(res, { payment_methods: paymentMethods });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche moyens de paiement par carte:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.PAGINATION_INVALID,
        message: PAYMENT_METHOD_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_METHOD_CODES.SEARCH_FAILED,
        message: 'Failed to search card payment methods',
      });
    }
  }
});

/**
 * GET /bank-transfer - Lister les moyens de paiement par virement bancaire
 */
router.get('/bank-transfer', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const allMethods = await PaymentMethod._list({}, paginationOptions);
    if (!allMethods) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
      });
    }

    const bankTransferMethods = allMethods.filter((method) => method.isBankTransfer());

    const paymentMethods = {
      payment_type: 'BANK_TRANSFER',
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || bankTransferMethods.length,
        count: bankTransferMethods.length,
      },
      items:
        (await Promise.all(bankTransferMethods.map(async (method) => await method.toJSON()))) || [],
    };

    R.handleSuccess(res, { payment_methods: paymentMethods });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche virements bancaires:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.PAGINATION_INVALID,
        message: PAYMENT_METHOD_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_METHOD_CODES.SEARCH_FAILED,
        message: 'Failed to search bank transfer payment methods',
      });
    }
  }
});

// endregion

// region ROUTES CRUD

/**
 * POST / - Créer un nouveau moyen de paiement
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = PM.validatePaymentMethodCreation(req.body);

    const methodObj = new PaymentMethod()
      .setCode(validatedData.code)
      .setName(validatedData.name)
      .setMethodType(validatedData.method_type)
      .setSupportedCurrencies(validatedData.supported_currencies)
      .setActive(validatedData.active)
      .setProcessingFeeRate(validatedData.processing_fee_rate)
      .setMinAmountUsd(validatedData.min_amount_usd)
      .setMaxAmountUsd(validatedData.max_amount_usd);

    await methodObj.save();

    console.log(
      `✅ Moyen de paiement créé: ${validatedData.code} - ${validatedData.name} (GUID: ${methodObj.getGuid()})`,
    );
    return R.handleCreated(res, await methodObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur création moyen de paiement:', error.message);

    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.VALIDATION_FAILED,
        message: PAYMENT_METHOD_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: PAYMENT_METHOD_CODES.CODE_DUPLICATE,
        message: PAYMENT_METHOD_ERRORS.CODE_DUPLICATE,
      });
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * PUT /:guid - Modifier un moyen de paiement par GUID
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const validGuid = PM.validatePaymentMethodGuid(req.params.guid);

    // Charger par GUID
    const methodObj = await PaymentMethod._load(validGuid, true);
    if (!methodObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
      });
    }

    const validateData = PM.validatePaymentMethodUpdate(req.body);

    // Mise à jour des champs fournis
    if (validateData.code !== undefined) methodObj.setCode(validateData.code);
    if (validateData.name !== undefined) methodObj.setName(validateData.name);
    if (validateData.method_type !== undefined) methodObj.setMethodType(validateData.method_type);
    if (validateData.supported_currencies !== undefined)
      methodObj.setSupportedCurrencies(validateData.supported_currencies);
    if (validateData.active !== undefined) methodObj.setActive(validateData.active);
    if (validateData.processing_fee_rate !== undefined)
      methodObj.setProcessingFeeRate(validateData.processing_fee_rate);
    if (validateData.min_amount_usd !== undefined)
      methodObj.setMinAmountUsd(validateData.min_amount_usd);
    if (validateData.max_amount_usd !== undefined)
      methodObj.setMaxAmountUsd(validateData.max_amount_usd);

    await methodObj.save();

    console.log(`✅ Moyen de paiement modifié: GUID ${validGuid}`);
    R.handleSuccess(res, await methodObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur modification moyen de paiement:', error);

    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.INVALID_GUID,
        message: PAYMENT_METHOD_ERRORS.GUID_INVALID,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: PAYMENT_METHOD_CODES.CODE_DUPLICATE,
        message: PAYMENT_METHOD_ERRORS.CODE_DUPLICATE,
      });
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * DELETE /:guid - Supprimer un moyen de paiement par GUID
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const validGuid = PM.validatePaymentMethodGuid(req.params.guid);

    // Charger par GUID
    const method = await PaymentMethod._load(validGuid, true);
    if (!method) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
      });
    }

    const deleted = await method.delete();

    if (deleted) {
      console.log(
        `✅ Moyen de paiement supprimé: GUID ${validGuid} (${method.getCode()} - ${method.getName()})`,
      );
      R.handleSuccess(res, {
        message: 'Payment method deleted successfully',
        guid: validGuid,
        code: method.getCode(),
        name: method.getName(),
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, G.savedError);
    }
  } catch (error: any) {
    console.error('⚠️ Erreur suppression moyen de paiement:', error);

    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.INVALID_GUID,
        message: PAYMENT_METHOD_ERRORS.GUID_INVALID,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_METHOD_CODES.DELETE_FAILED,
        message: error.message,
      });
    }
  }
});

// endregion

// region ROUTES ACTIONS

/**
 * PATCH /:guid/activate - Activer un moyen de paiement
 */
router.patch('/:guid/activate', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = PM.validatePaymentMethodGuid(req.params.guid);

    const method = await PaymentMethod._load(validGuid, true);
    if (!method) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
      });
    }

    await method.activateMethod();
    console.log(`✅ Moyen de paiement activé: GUID ${validGuid}`);

    R.handleSuccess(res, await method.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur activation moyen de paiement:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: PAYMENT_METHOD_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /:guid/deactivate - Désactiver un moyen de paiement
 */
router.patch('/:guid/deactivate', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = PM.validatePaymentMethodGuid(req.params.guid);

    const method = await PaymentMethod._load(validGuid, true);
    if (!method) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
      });
    }

    await method.deactivateMethod();
    console.log(`✅ Moyen de paiement désactivé: GUID ${validGuid}`);

    R.handleSuccess(res, await method.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur désactivation moyen de paiement:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: PAYMENT_METHOD_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// endregion

// region ROUTES UTILITAIRES

/**
 * GET /list - Lister tous les moyens de paiement (pour admin)
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit, ...filterQuery } = req.query;
    const filters = PM.validatePaymentMethodFilters(filterQuery);
    const paginationOptions = paginationSchema.parse(req.query);

    const conditions: Record<string, any> = {};

    if (filters.code) conditions.code = filters.code;
    if (filters.name) conditions.name = filters.name;
    if (filters.method_type) conditions.method_type = filters.method_type;
    if (filters.active !== undefined) conditions.active = filters.active;

    const methodEntries = await PaymentMethod._list(conditions, paginationOptions);
    if (!methodEntries) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
      });
    }

    // Appliquer les filtres supplémentaires si nécessaire
    let filteredMethods = methodEntries;

    if (filters.supported_currency) {
      filteredMethods = filteredMethods.filter((method) =>
        method.supportsCurrency(filters.supported_currency!),
      );
    }

    if (filters.min_processing_fee_rate !== undefined) {
      filteredMethods = filteredMethods.filter(
        (method) => (method.getProcessingFeeRate() || 0) >= filters.min_processing_fee_rate!,
      );
    }

    if (filters.max_processing_fee_rate !== undefined) {
      filteredMethods = filteredMethods.filter(
        (method) => (method.getProcessingFeeRate() || 0) <= filters.max_processing_fee_rate!,
      );
    }

    const paymentMethods = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || filteredMethods.length,
        count: filteredMethods.length || 0,
      },
      items:
        (await Promise.all(filteredMethods.map(async (method) => await method.toJSON()))) || [],
    };

    R.handleSuccess(res, { payment_methods: paymentMethods });
  } catch (error: any) {
    console.error('⚠️ Erreur listing moyens de paiement:', error);
    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_METHOD_CODES.VALIDATION_FAILED,
        message: PAYMENT_METHOD_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_METHOD_CODES.LISTING_FAILED,
        message: PAYMENT_METHOD_ERRORS.EXPORT_FAILED,
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
    let method: PaymentMethod | null = null;

    // Essayer différentes méthodes de recherche selon le format
    if (/^\d+$/.test(identifier)) {
      const numericId = parseInt(identifier);

      // Essayer par ID d'abord
      method = await PaymentMethod._load(numericId);

      // Si pas trouvé, essayer par GUID
      if (!method) {
        method = await PaymentMethod._load(numericId, true);
      }
    } else {
      // Essayer par code
      method = await PaymentMethod._load(identifier, false, true);
    }

    if (!method) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: `Payment method with identifier '${identifier}' not found`,
      });
    }

    R.handleSuccess(res, await method.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur recherche moyen de paiement:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: PAYMENT_METHOD_CODES.SEARCH_FAILED,
      message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
    });
  }
});

export default router;
