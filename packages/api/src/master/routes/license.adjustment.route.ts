import { Request, Response, Router } from 'express';
import {
  GLOBAL_LICENSE_CODES,
  GLOBAL_LICENSE_ERRORS,
  HttpStatus,
  LA,
  LICENSE_ADJUSTMENT_CODES,
  LICENSE_ADJUSTMENT_ERRORS,
  paginationSchema,
  PaymentTransactionStatus,
} from '@toke/shared';

import LicenseAdjustment from '../class/LicenseAdjustment.js';
import R from '../../tools/response.js';
import G from '../../tools/glossary.js';
import Ensure from '../../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';
import GlobalLicense from '../class/GlobalLicense.js';

const router = Router();

// region ROUTES D'EXPORT

/**
 * GET / - Exporter tous les avenants de licence
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const licenseAdjustments = await LicenseAdjustment.exportable(paginationOptions);
    R.handleSuccess(res, { license_adjustments: licenseAdjustments });
  } catch (error: any) {
    console.error('⚠️ Erreur export avenants de licence:', error);
    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.PAGINATION_INVALID,
        message: LICENSE_ADJUSTMENT_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LICENSE_ADJUSTMENT_CODES.EXPORT_FAILED,
        message: LICENSE_ADJUSTMENT_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /revision - Récupérer uniquement la révision actuelle
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.LICENSE_ADJUSTMENT);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('⚠️ Erreur récupération révision:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: LICENSE_ADJUSTMENT_CODES.SEARCH_FAILED,
      message: 'Failed to get current revision',
    });
  }
});

/**
 * GET /global-master/:global_license - Lister les avenants par licence globale
 */
router.get('/global-license/:global_license', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const globalLicense = parseInt(req.params.global_license);
    if (isNaN(globalLicense)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.VALIDATION_FAILED,
        message: 'Global master ID must be a number',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const adjustmentsData = await LicenseAdjustment._listByGlobalLicense(
      globalLicense,
      paginationOptions,
    );
    if (!adjustmentsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    const licenseAdjustments = {
      global_license: globalLicense,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || adjustmentsData.length,
        count: adjustmentsData.length,
      },
      items:
        (await Promise.all(adjustmentsData.map(async (adjustment) => await adjustment.toJSON()))) ||
        [],
    };

    R.handleSuccess(res, { license_adjustments: licenseAdjustments });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par licence globale:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.PAGINATION_INVALID,
        message: LICENSE_ADJUSTMENT_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LICENSE_ADJUSTMENT_CODES.SEARCH_FAILED,
        message: `Failed to search adjustments by global license: ${req.params.global_license}`,
      });
    }
  }
});

/**
 * GET /payment-status/:status - Lister les avenants par statut de paiement
 */
router.get('/payment-status/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const paymentStatus = status.toUpperCase() as PaymentTransactionStatus;

    if (!Object.values(PaymentTransactionStatus).includes(paymentStatus)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.VALIDATION_FAILED,
        message: `Invalid payment status: ${status}`,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const adjustmentsData = await LicenseAdjustment._listByPaymentStatus(
      paymentStatus,
      paginationOptions,
    );
    if (!adjustmentsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    const licenseAdjustments = {
      payment_status: paymentStatus,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || adjustmentsData.length,
        count: adjustmentsData.length,
      },
      items:
        (await Promise.all(adjustmentsData.map(async (adjustment) => await adjustment.toJSON()))) ||
        [],
    };

    R.handleSuccess(res, { license_adjustments: licenseAdjustments });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par statut de paiement:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.PAGINATION_INVALID,
        message: LICENSE_ADJUSTMENT_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LICENSE_ADJUSTMENT_CODES.SEARCH_FAILED,
        message: `Failed to search adjustments by payment status: ${req.params.status}`,
      });
    }
  }
});

/**
 * GET /currency/:currency - Lister les avenants par devise
 */
router.get('/currency/:currency', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { currency } = req.params;
    const validCurrency = currency.toUpperCase();

    const paginationOptions = paginationSchema.parse(req.query);

    const adjustmentsData = await LicenseAdjustment._listByCurrency(
      validCurrency,
      paginationOptions,
    );
    if (!adjustmentsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    const licenseAdjustments = {
      billing_currency: validCurrency,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || adjustmentsData.length,
        count: adjustmentsData.length,
      },
      items:
        (await Promise.all(adjustmentsData.map(async (adjustment) => await adjustment.toJSON()))) ||
        [],
    };

    R.handleSuccess(res, { license_adjustments: licenseAdjustments });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par devise:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.PAGINATION_INVALID,
        message: LICENSE_ADJUSTMENT_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LICENSE_ADJUSTMENT_CODES.SEARCH_FAILED,
        message: `Failed to search adjustments by currency: ${req.params.currency}`,
      });
    }
  }
});

/**
 * GET /pending - Lister les avenants en attente de paiement
 */
router.get('/pending', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const adjustmentsData = await LicenseAdjustment._listPendingPayment(paginationOptions);
    if (!adjustmentsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    const licenseAdjustments = {
      filter_type: 'PENDING_PAYMENT',
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || adjustmentsData.length,
        count: adjustmentsData.length,
      },
      items:
        (await Promise.all(adjustmentsData.map(async (adjustment) => await adjustment.toJSON()))) ||
        [],
    };

    R.handleSuccess(res, { license_adjustments: licenseAdjustments });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche avenants en attente:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.PAGINATION_INVALID,
        message: LICENSE_ADJUSTMENT_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LICENSE_ADJUSTMENT_CODES.SEARCH_FAILED,
        message: 'Failed to search pending adjustments',
      });
    }
  }
});

/**
 * GET /invoiced-not-paid - Lister les avenants facturés mais non payés
 */
router.get('/invoiced-not-paid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const adjustmentsData = await LicenseAdjustment._listInvoicedNotPaid(paginationOptions);
    if (!adjustmentsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    const licenseAdjustments = {
      filter_type: 'INVOICED_NOT_PAID',
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || adjustmentsData.length,
        count: adjustmentsData.length,
      },
      items:
        (await Promise.all(adjustmentsData.map(async (adjustment) => await adjustment.toJSON()))) ||
        [],
    };

    R.handleSuccess(res, { license_adjustments: licenseAdjustments });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche avenants facturés non payés:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.PAGINATION_INVALID,
        message: LICENSE_ADJUSTMENT_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LICENSE_ADJUSTMENT_CODES.SEARCH_FAILED,
        message: 'Failed to search invoiced not paid adjustments',
      });
    }
  }
});

/**
 * GET /date-range/created - Lister les avenants créés dans une période
 */
router.get('/date-range/created', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.VALIDATION_FAILED,
        message: 'start_date and end_date are required',
      });
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.VALIDATION_FAILED,
        message: 'Invalid date format',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const adjustmentsData = await LicenseAdjustment._listCreatedBetween(
      startDate,
      endDate,
      paginationOptions,
    );
    if (!adjustmentsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    const licenseAdjustments = {
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        type: 'created',
      },
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || adjustmentsData.length,
        count: adjustmentsData.length,
      },
      items:
        (await Promise.all(adjustmentsData.map(async (adjustment) => await adjustment.toJSON()))) ||
        [],
    };

    R.handleSuccess(res, { license_adjustments: licenseAdjustments });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par période de création:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.PAGINATION_INVALID,
        message: LICENSE_ADJUSTMENT_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LICENSE_ADJUSTMENT_CODES.SEARCH_FAILED,
        message: 'Failed to search adjustments by creation date range',
      });
    }
  }
});

/**
 * GET /date-range/paid - Lister les avenants payés dans une période
 */
router.get('/date-range/paid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.VALIDATION_FAILED,
        message: 'start_date and end_date are required',
      });
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.VALIDATION_FAILED,
        message: 'Invalid date format',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const adjustmentsData = await LicenseAdjustment._listPaidBetween(
      startDate,
      endDate,
      paginationOptions,
    );
    if (!adjustmentsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    const licenseAdjustments = {
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        type: 'paid',
      },
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || adjustmentsData.length,
        count: adjustmentsData.length,
      },
      items:
        (await Promise.all(adjustmentsData.map(async (adjustment) => await adjustment.toJSON()))) ||
        [],
    };

    R.handleSuccess(res, { license_adjustments: licenseAdjustments });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par période de paiement:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.PAGINATION_INVALID,
        message: LICENSE_ADJUSTMENT_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LICENSE_ADJUSTMENT_CODES.SEARCH_FAILED,
        message: 'Failed to search adjustments by payment date range',
      });
    }
  }
});

/**
 * GET /financial-stats - Obtenir les statistiques financières
 */
router.get('/financial-stats', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { currency_code } = req.query;

    const stats = await LicenseAdjustment._getFinancialStats(currency_code as string);

    R.handleSuccess(res, {
      financial_statistics: stats,
      currency_filter: currency_code || 'ALL',
    });
  } catch (error: any) {
    console.error('⚠️ Erreur récupération statistiques financières:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: LICENSE_ADJUSTMENT_CODES.SEARCH_FAILED,
      message: 'Failed to get financial statistics',
    });
  }
});

// endregion

// region ROUTES CRUD

/**
 * POST / - Créer un nouvel avenant de licence
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = LA.validateLicenseAdjustmentCreation(req.body);

    const globalLicenseObj = await GlobalLicense._load(validatedData.global_license, true);
    if (!globalLicenseObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    const adjustmentObj = new LicenseAdjustment()
      .setGlobalLicense(globalLicenseObj.getId()!)
      .setAdjustmentDate(validatedData.adjustment_date)
      .setEmployeesAddedCount(validatedData.employees_added_count)
      .setMonthsRemaining(validatedData.months_remaining)
      .setPricePerEmployeeUsd(validatedData.price_per_employee_usd)
      .setBillingCurrencyCode(validatedData.billing_currency_code)
      .setExchangeRateUsed(validatedData.exchange_rate_used)
      .setPaymentStatus(
        (validatedData.payment_status as PaymentTransactionStatus) ||
          PaymentTransactionStatus.PENDING,
      )
      .setPaymentDueImmediately(validatedData.payment_due_immediately || false);

    // Calcul automatique des montants si les règles fiscales sont fournies
    if (validatedData.tax_rules_applied) {
      adjustmentObj.calculateAmounts(validatedData.tax_rules_applied);
    }

    await adjustmentObj.save();

    console.log(`✅ Avenant de licence créé: GUID ${adjustmentObj.getGuid()}`);
    return R.handleCreated(res, await adjustmentObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur création avenant de licence:', error.message);

    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.VALIDATION_FAILED,
        message: LICENSE_ADJUSTMENT_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * PUT /:guid - Modifier un avenant de licence par GUID
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const validGuid = LA.validateLicenseAdjustmentGuid(req.params.guid);

    // Charger par GUID
    const adjustmentObj = await LicenseAdjustment._load(validGuid, true);
    if (!adjustmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    const validateData = LA.validateLicenseAdjustmentUpdate(req.body);

    // Mise à jour des champs fournis
    if (validateData.global_license !== undefined)
      adjustmentObj.setGlobalLicense(validateData.global_license);
    if (validateData.adjustment_date !== undefined)
      adjustmentObj.setAdjustmentDate(validateData.adjustment_date);
    if (validateData.employees_added_count !== undefined)
      adjustmentObj.setEmployeesAddedCount(validateData.employees_added_count);
    if (validateData.months_remaining !== undefined)
      adjustmentObj.setMonthsRemaining(validateData.months_remaining);
    if (validateData.price_per_employee_usd !== undefined)
      adjustmentObj.setPricePerEmployeeUsd(validateData.price_per_employee_usd);
    if (validateData.billing_currency_code !== undefined)
      adjustmentObj.setBillingCurrencyCode(validateData.billing_currency_code);
    if (validateData.exchange_rate_used !== undefined)
      adjustmentObj.setExchangeRateUsed(validateData.exchange_rate_used);
    if (validateData.payment_status !== undefined)
      adjustmentObj.setPaymentStatus(validateData.payment_status as PaymentTransactionStatus);
    if (validateData.payment_due_immediately !== undefined)
      adjustmentObj.setPaymentDueImmediately(validateData.payment_due_immediately);

    // Recalcul des montants si nécessaire
    if (
      validateData.tax_rules_applied ||
      validateData.employees_added_count !== undefined ||
      validateData.months_remaining !== undefined ||
      validateData.price_per_employee_usd !== undefined ||
      validateData.exchange_rate_used !== undefined
    ) {
      adjustmentObj.calculateAmounts(validateData.tax_rules_applied || []);
    }

    await adjustmentObj.save();

    console.log(`✅ Avenant de licence modifié: GUID ${validGuid}`);
    R.handleSuccess(res, await adjustmentObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur modification avenant de licence:', error);

    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.INVALID_GUID,
        message: LICENSE_ADJUSTMENT_ERRORS.GUID_INVALID,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * DELETE /:guid - Supprimer un avenant de licence par GUID
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const validGuid = LA.validateLicenseAdjustmentGuid(req.params.guid);

    // Charger par GUID
    const adjustment = await LicenseAdjustment._load(validGuid, true);
    if (!adjustment) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    const deleted = await adjustment.delete();

    if (deleted) {
      console.log(`✅ Avenant de licence supprimé: GUID ${validGuid}`);
      R.handleSuccess(res, {
        message: 'License adjustment deleted successfully',
        guid: validGuid,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, G.savedError);
    }
  } catch (error: any) {
    console.error('⚠️ Erreur suppression avenant de licence:', error);

    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.INVALID_GUID,
        message: LICENSE_ADJUSTMENT_ERRORS.GUID_INVALID,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LICENSE_ADJUSTMENT_CODES.DELETE_FAILED,
        message: error.message,
      });
    }
  }
});

// endregion

// region ROUTES ACTIONS

/**
 * PATCH /:guid/update-payment-status - Mettre à jour le statut de paiement
 */
router.patch(
  '/:guid/update-payment-status',
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const validGuid = LA.validateLicenseAdjustmentGuid(req.params.guid);
      const { payment_status, completed_at } = req.body;

      if (!payment_status || !Object.values(PaymentTransactionStatus).includes(payment_status)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: LICENSE_ADJUSTMENT_CODES.VALIDATION_FAILED,
          message: 'Valid payment_status is required',
        });
      }

      const adjustment = await LicenseAdjustment._load(validGuid, true);
      if (!adjustment) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
          message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
        });
      }

      const completedDate = completed_at ? new Date(completed_at) : undefined;
      await adjustment.updatePaymentStatusForThis(payment_status, completedDate);

      console.log(`✅ Statut de paiement mis à jour: GUID ${validGuid} -> ${payment_status}`);

      R.handleSuccess(res, await adjustment.toJSON());
    } catch (error: any) {
      console.error('⚠️ Erreur mise à jour statut de paiement:', error);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LICENSE_ADJUSTMENT_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  },
);

/**
 * PATCH /:guid/mark-invoice-sent - Marquer la facture comme envoyée
 */
router.patch('/:guid/mark-invoice-sent', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = LA.validateLicenseAdjustmentGuid(req.params.guid);
    const { sent_at } = req.body;

    const adjustment = await LicenseAdjustment._load(validGuid, true);
    if (!adjustment) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    const sentDate = sent_at ? new Date(sent_at) : undefined;
    await adjustment.markInvoiceSentForThis(sentDate);

    console.log(`✅ Facture marquée comme envoyée: GUID ${validGuid}`);

    R.handleSuccess(res, await adjustment.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur marquage envoi facture:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: LICENSE_ADJUSTMENT_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// endregion

// region ROUTES UTILITAIRES

/**
 * GET /list - Lister tous les avenants de licence (pour admin)
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters = LA.validateLicenseAdjustmentFilters(req.query);
    const paginationOptions = paginationSchema.parse(req.query);

    const conditions: Record<string, any> = {};

    if (filters.global_license) conditions.global_license = filters.global_license;
    if (filters.payment_status) conditions.payment_status = filters.payment_status;
    if (filters.billing_currency_code)
      conditions.billing_currency_code = filters.billing_currency_code;

    const adjustmentEntries = await LicenseAdjustment._list(conditions, paginationOptions);
    if (!adjustmentEntries) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }
    const licenseAdjustments = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || adjustmentEntries.length,
        count: adjustmentEntries.length || 0,
      },
      items:
        (await Promise.all(
          adjustmentEntries.map(async (adjustment) => await adjustment.toJSON()),
        )) || [],
    };

    R.handleSuccess(res, { license_adjustments: licenseAdjustments });
  } catch (error: any) {
    console.error('⚠️ Erreur listing avenants de licence:', error);
    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.VALIDATION_FAILED,
        message: LICENSE_ADJUSTMENT_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: LICENSE_ADJUSTMENT_CODES.LISTING_FAILED,
        message: LICENSE_ADJUSTMENT_ERRORS.EXPORT_FAILED,
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
    let adjustment: LicenseAdjustment | null = null;

    // Essayer différentes méthodes de recherche selon le format
    if (/^\d+$/.test(identifier)) {
      const numericId = parseInt(identifier);

      // Essayer par ID d'abord
      adjustment = await LicenseAdjustment._load(numericId);

      // Si pas trouvé, essayer par GUID
      if (!adjustment) {
        adjustment = await LicenseAdjustment._load(numericId, true);
      }
    }

    if (!adjustment) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: `License adjustment with identifier '${identifier}' not found`,
      });
    }

    R.handleSuccess(res, await adjustment.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur recherche avenant de licence:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: LICENSE_ADJUSTMENT_CODES.SEARCH_FAILED,
      message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
    });
  }
});

// endregion

export default router;
