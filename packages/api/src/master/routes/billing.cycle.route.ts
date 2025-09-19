import { Request, Response, Router } from 'express';
import {
  BC,
  BILLING_CYCLE_CODES,
  BILLING_CYCLE_ERRORS,
  BillingCycleValidationUtils,
  BillingStatus,
  GLOBAL_LICENSE_CODES,
  GLOBAL_LICENSE_ERRORS,
  GlobalLicenseValidationUtils,
  HttpStatus,
  paginationSchema,
} from '@toke/shared';
import { Op } from 'sequelize';

import BillingCycle from '../class/BillingCycle.js';
import GlobalLicense from '../class/GlobalLicense.js';
import R from '../../tools/response.js';
import G from '../../tools/glossary.js';
import Ensure from '../../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';

const router = Router();

// region ROUTES D'EXPORT

/**
 * GET / - Exporter tous les cycles de facturation
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const cycles = await BillingCycle.exportable(paginationOptions);
    R.handleSuccess(res, { cycles });
  } catch (error: any) {
    console.error('⚠️ Erreur export cycles de facturation:', error);
    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.PAGINATION_INVALID,
        message: BILLING_CYCLE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: BILLING_CYCLE_CODES.EXPORT_FAILED,
        message: BILLING_CYCLE_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /revision - Récupérer uniquement la révision actuelle
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.BILLING_CYCLE);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('⚠️ Erreur récupération révision:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: BILLING_CYCLE_CODES.SEARCH_FAILED,
      message: 'Failed to get current revision',
    });
  }
});

/**
 * GET /global-master/:global_license - Lister les cycles par licence globale
 */
router.get('/global-license/:global_license', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!GlobalLicenseValidationUtils.validateGuid(req.params.global_license)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.INVALID_GUID,
        message: GLOBAL_LICENSE_ERRORS.GUID_INVALID,
      });
    }

    const globalLicense = parseInt(req.params.global_license, 10);
    const globalLicenseObj = await GlobalLicense._load(globalLicense, true);
    if (!globalLicenseObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const cyclesData = await BillingCycle._listByGlobalLicense(
      globalLicenseObj.getId()!,
      paginationOptions,
    );
    if (!cyclesData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: BILLING_CYCLE_CODES.BILLING_CYCLE_NOT_FOUND,
        message: BILLING_CYCLE_ERRORS.NOT_FOUND,
      });
    }

    const cycles = {
      global_license: globalLicense,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || cyclesData.length,
        count: cyclesData.length,
      },
      items: (await Promise.all(cyclesData.map(async (cycle) => await cycle.toJSON()))) || [],
    };

    R.handleSuccess(res, { cycles });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par licence globale:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.PAGINATION_INVALID,
        message: BILLING_CYCLE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: BILLING_CYCLE_CODES.SEARCH_FAILED,
        message: `Failed to search cycles by global license: ${req.params.global_license}`,
      });
    }
  }
});

/**
 * GET /status/:status - Lister les cycles par statut
 */
router.get('/status/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const validStatus = status.toUpperCase() as BillingStatus;

    if (!Object.values(BillingStatus).includes(validStatus)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.BILLING_STATUS_INVALID,
        message: `Invalid billing status. Must be one of: ${Object.values(BillingStatus).join(', ')}`,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const cyclesData = await BillingCycle._listByStatus(validStatus, paginationOptions);
    const cycles = {
      billing_status: validStatus,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || cyclesData?.length,
        count: cyclesData?.length || 0,
      },
      items: cyclesData
        ? await Promise.all(cyclesData.map(async (cycle) => await cycle.toJSON()))
        : [],
    };

    R.handleSuccess(res, { cycles });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par statut:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.PAGINATION_INVALID,
        message: BILLING_CYCLE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: BILLING_CYCLE_CODES.SEARCH_FAILED,
        message: `Failed to search cycles by status: ${req.params.status}`,
      });
    }
  }
});

/**
 * GET /currency/:currency_code - Lister les cycles par devise
 */
router.get('/currency/:currency_code', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { currency_code } = req.params;
    const validCurrency = currency_code.toUpperCase();

    const validateCurrency = BillingCycleValidationUtils.validateCurrencyCode(validCurrency);
    if (!validateCurrency) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.CURRENCY_CODE_INVALID,
        message: BILLING_CYCLE_ERRORS.BILLING_CURRENCY_CODE_INVALID,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const cyclesData = await BillingCycle._listByCurrency(validCurrency, paginationOptions);
    const cycles = {
      billing_currency_code: validCurrency,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || cyclesData?.length,
        count: cyclesData?.length || 0,
      },
      items: cyclesData
        ? await Promise.all(cyclesData.map(async (cycle) => await cycle.toJSON()))
        : [],
    };

    R.handleSuccess(res, { cycles });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par devise:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.PAGINATION_INVALID,
        message: BILLING_CYCLE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: BILLING_CYCLE_CODES.SEARCH_FAILED,
        message: `Failed to search cycles by currency: ${req.params.currency_code}`,
      });
    }
  }
});

/**
 * GET /overdue - Lister les cycles en retard
 */
router.get('/overdue', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const cyclesData = await BillingCycle._listOverdue(paginationOptions);
    const cycles = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || cyclesData?.length,
        count: cyclesData?.length || 0,
      },
      items: cyclesData
        ? await Promise.all(cyclesData.map(async (cycle) => await cycle.toJSON()))
        : [],
    };

    R.handleSuccess(res, { cycles });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche cycles en retard:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.PAGINATION_INVALID,
        message: BILLING_CYCLE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: BILLING_CYCLE_CODES.SEARCH_FAILED,
        message: 'Failed to search overdue cycles',
      });
    }
  }
});

/**
 * GET /due-soon/:days - Lister les cycles avec échéance proche
 */
router.get('/due-soon/:days', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.params.days);
    if (isNaN(days) || days < 1) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.VALIDATION_FAILED,
        message: 'Days must be a positive number',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const cyclesData = await BillingCycle._listDueSoon(days, paginationOptions);
    const cycles = {
      due_in_days: days,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || cyclesData?.length,
        count: cyclesData?.length || 0,
      },
      items: cyclesData
        ? await Promise.all(cyclesData.map(async (cycle) => await cycle.toJSON()))
        : [],
    };

    R.handleSuccess(res, { cycles });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche cycles échéance proche:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.PAGINATION_INVALID,
        message: BILLING_CYCLE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: BILLING_CYCLE_CODES.SEARCH_FAILED,
        message: `Failed to search cycles due soon: ${req.params.days} days`,
      });
    }
  }
});

/**
 * GET /pending-invoice - Lister les cycles en attente de facture
 */
router.get('/pending-invoice', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const cyclesData = await BillingCycle._listPendingInvoice(paginationOptions);
    const cycles = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || cyclesData?.length,
        count: cyclesData?.length || 0,
      },
      items: cyclesData
        ? await Promise.all(cyclesData.map(async (cycle) => await cycle.toJSON()))
        : [],
    };

    R.handleSuccess(res, { cycles });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche cycles en attente facture:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.PAGINATION_INVALID,
        message: BILLING_CYCLE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: BILLING_CYCLE_CODES.SEARCH_FAILED,
        message: 'Failed to search pending invoice cycles',
      });
    }
  }
});

/**
 * GET /completed - Lister les cycles terminés
 */
router.get('/completed', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const cyclesData = await BillingCycle._listCompleted(paginationOptions);
    const cycles = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || cyclesData?.length,
        count: cyclesData?.length || 0,
      },
      items: cyclesData
        ? await Promise.all(cyclesData.map(async (cycle) => await cycle.toJSON()))
        : [],
    };

    R.handleSuccess(res, { cycles });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche cycles terminés:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.PAGINATION_INVALID,
        message: BILLING_CYCLE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: BILLING_CYCLE_CODES.SEARCH_FAILED,
        message: 'Failed to search completed cycles',
      });
    }
  }
});

/**
 * GET /period - Lister les cycles par période
 */
router.get('/period', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.PERIOD_DATES_REQUIRED,
        message: 'Both start_date and end_date are required',
      });
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.INVALID_DATE_FORMAT,
        message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
      });
    }

    if (startDate >= endDate) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.DATE_LOGIC_INVALID,
        message: 'Start date must be before end date',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const cyclesData = await BillingCycle._listByPeriod(startDate, endDate, paginationOptions);
    const cycles = {
      period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || cyclesData?.length,
        count: cyclesData?.length || 0,
      },
      items: cyclesData
        ? await Promise.all(cyclesData.map(async (cycle) => await cycle.toJSON()))
        : [],
    };

    R.handleSuccess(res, { cycles });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par période:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.PAGINATION_INVALID,
        message: BILLING_CYCLE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: BILLING_CYCLE_CODES.SEARCH_FAILED,
        message: 'Failed to search cycles by period',
      });
    }
  }
});

// endregion

// region ROUTES CRUD

/**
 * POST / - Créer un nouveau cycle de facturation
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = BC.validateBillingCycleCreation(req.body);

    const globalLicenseObj = await GlobalLicense._load(validatedData.global_license, true);
    if (!globalLicenseObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    const cycleObj = new BillingCycle()
      .setGlobalLicense(globalLicenseObj.getId()!)
      .setPeriodStart(validatedData.period_start)
      .setPeriodEnd(validatedData.period_end)
      .setBaseEmployeeCount(validatedData.base_employee_count)
      .setFinalEmployeeCount(validatedData.final_employee_count)
      .setBaseAmountUsd(validatedData.base_amount_usd)
      .setBillingCurrencyCode(validatedData.billing_currency_code)
      .setExchangeRateUsed(validatedData.exchange_rate_used)
      .setBaseAmountLocal(validatedData.base_amount_local)
      .setPaymentDueDate(validatedData.payment_due_date);

    if (validatedData.adjustments_amount_usd !== undefined)
      cycleObj.setAdjustmentsAmountUsd(validatedData.adjustments_amount_usd);
    if (validatedData.tax_amount_usd !== undefined)
      cycleObj.setTaxAmountUsd(validatedData.tax_amount_usd);
    if (validatedData.adjustments_amount_local !== undefined)
      cycleObj.setAdjustmentsAmountLocal(validatedData.adjustments_amount_local);
    if (validatedData.tax_amount_local !== undefined)
      cycleObj.setTaxAmountLocal(validatedData.tax_amount_local);
    if (validatedData.tax_rules_applied !== undefined)
      cycleObj.setTaxRulesApplied(validatedData.tax_rules_applied);
    if (validatedData.billing_status !== undefined)
      cycleObj.setBillingStatus(validatedData.billing_status);
    if (validatedData.invoice_generated_at !== undefined)
      cycleObj.setInvoiceGeneratedAt(validatedData.invoice_generated_at);
    if (validatedData.payment_completed_at !== undefined)
      cycleObj.setPaymentCompletedAt(validatedData.payment_completed_at);

    await cycleObj.save();

    console.log(
      `✅ Cycle de facturation créé: License ${validatedData.global_license} - Période ${validatedData.period_start.toISOString().split('T')[0]} à ${validatedData.period_end.toISOString().split('T')[0]} (GUID: ${cycleObj.getGuid()})`,
    );
    return R.handleCreated(res, await cycleObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur création cycle de facturation:', error.message);

    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.VALIDATION_FAILED,
        message: BILLING_CYCLE_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      // return R.handleError(res, HttpStatus.BAD_REQUEST, {
      //   code: BILLING_CYCLE_CODES.CREATION_FAILED,
      //   message: error.message,
      // }
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'DEBUG_ERROR',
        message: error.message || error.toString(),
        details: {
          original_error: error,
          stack: error.stack,
        },
      });
    }
  }
});

/**
 * PUT /:guid - Modifier un cycle de facturation par GUID
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const validGuid = BC.validateBillingCycleGuid(req.params.guid);

    // Charger par GUID
    const cycleObj = await BillingCycle._load(validGuid, true);
    if (!cycleObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: BILLING_CYCLE_CODES.BILLING_CYCLE_NOT_FOUND,
        message: BILLING_CYCLE_ERRORS.NOT_FOUND,
      });
    }

    const validateData = BC.validateBillingCycleUpdate(req.body);

    // Mise à jour des champs fournis
    if (validateData.global_license !== undefined) {
      const globalLicenseObj = await GlobalLicense._load(validateData.global_license, true);
      if (!globalLicenseObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
          message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
        });
      }
      cycleObj.setGlobalLicense(globalLicenseObj.getId()!);
    }
    if (validateData.period_start !== undefined) cycleObj.setPeriodStart(validateData.period_start);
    if (validateData.period_end !== undefined) cycleObj.setPeriodEnd(validateData.period_end);
    if (validateData.base_employee_count !== undefined)
      cycleObj.setBaseEmployeeCount(validateData.base_employee_count);
    if (validateData.final_employee_count !== undefined)
      cycleObj.setFinalEmployeeCount(validateData.final_employee_count);
    if (validateData.base_amount_usd !== undefined)
      cycleObj.setBaseAmountUsd(validateData.base_amount_usd);
    if (validateData.adjustments_amount_usd !== undefined)
      cycleObj.setAdjustmentsAmountUsd(validateData.adjustments_amount_usd);
    if (validateData.tax_amount_usd !== undefined)
      cycleObj.setTaxAmountUsd(validateData.tax_amount_usd);
    if (validateData.billing_currency_code !== undefined)
      cycleObj.setBillingCurrencyCode(validateData.billing_currency_code);
    if (validateData.exchange_rate_used !== undefined)
      cycleObj.setExchangeRateUsed(validateData.exchange_rate_used);
    if (validateData.base_amount_local !== undefined)
      cycleObj.setBaseAmountLocal(validateData.base_amount_local);
    if (validateData.adjustments_amount_local !== undefined)
      cycleObj.setAdjustmentsAmountLocal(validateData.adjustments_amount_local);
    if (validateData.tax_amount_local !== undefined)
      cycleObj.setTaxAmountLocal(validateData.tax_amount_local);
    if (validateData.tax_rules_applied !== undefined)
      cycleObj.setTaxRulesApplied(validateData.tax_rules_applied);
    if (validateData.billing_status !== undefined)
      cycleObj.setBillingStatus(validateData.billing_status);
    if (validateData.payment_due_date !== undefined)
      cycleObj.setPaymentDueDate(validateData.payment_due_date);
    if (validateData.invoice_generated_at !== undefined)
      cycleObj.setInvoiceGeneratedAt(validateData.invoice_generated_at);
    if (validateData.payment_completed_at !== undefined)
      cycleObj.setPaymentCompletedAt(validateData.payment_completed_at);

    await cycleObj.save();

    console.log(`✅ Cycle de facturation modifié: GUID ${validGuid}`);
    R.handleSuccess(res, await cycleObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur modification cycle de facturation:', error);

    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.INVALID_GUID,
        message: BILLING_CYCLE_ERRORS.GUID_INVALID,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * DELETE /:guid - Supprimer un cycle de facturation par GUID
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const validGuid = BC.validateBillingCycleGuid(req.params.guid);

    // Charger par GUID
    const cycle = await BillingCycle._load(validGuid, true);
    if (!cycle) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: BILLING_CYCLE_CODES.BILLING_CYCLE_NOT_FOUND,
        message: BILLING_CYCLE_ERRORS.NOT_FOUND,
      });
    }

    const deleted = await cycle.delete();

    if (deleted) {
      console.log(
        `✅ Cycle de facturation supprimé: GUID ${validGuid} (${cycle.getBillingStatus()} - License ${cycle.getGlobalLicense()})`,
      );
      R.handleSuccess(res, {
        message: 'Billing cycle deleted successfully',
        guid: validGuid,
        billing_status: cycle.getBillingStatus(),
        global_license: cycle.getGlobalLicense(),
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, G.savedError);
    }
  } catch (error: any) {
    console.error('⚠️ Erreur suppression cycle de facturation:', error);

    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.INVALID_GUID,
        message: BILLING_CYCLE_ERRORS.GUID_INVALID,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: BILLING_CYCLE_CODES.DELETE_FAILED,
        message: error.message,
      });
    }
  }
});

// endregion

// region ROUTES ACTIONS

/**
 * PATCH /:guid/mark-invoiced - Marquer comme facturé
 */
router.patch('/:guid/mark-invoiced', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = BC.validateBillingCycleGuid(req.params.guid);

    const cycle = await BillingCycle._load(validGuid, true);
    if (!cycle) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: BILLING_CYCLE_CODES.BILLING_CYCLE_NOT_FOUND,
        message: BILLING_CYCLE_ERRORS.NOT_FOUND,
      });
    }

    await cycle.markAsInvoiced();
    console.log(`✅ Cycle marqué comme facturé: GUID ${validGuid}`);

    R.handleSuccess(res, await cycle.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur marquage facturé:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: BILLING_CYCLE_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /:guid/mark-paid - Marquer comme payé
 */
router.patch('/:guid/mark-paid', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = BC.validateBillingCycleGuid(req.params.guid);

    const cycle = await BillingCycle._load(validGuid, true);
    if (!cycle) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: BILLING_CYCLE_CODES.BILLING_CYCLE_NOT_FOUND,
        message: BILLING_CYCLE_ERRORS.NOT_FOUND,
      });
    }

    await cycle.markAsPaid();
    console.log(`✅ Cycle marqué comme payé: GUID ${validGuid}`);

    R.handleSuccess(res, await cycle.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur marquage payé:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: BILLING_CYCLE_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /:guid/mark-overdue - Marquer comme en retard
 */
router.patch('/:guid/mark-overdue', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = BC.validateBillingCycleGuid(req.params.guid);

    const cycle = await BillingCycle._load(validGuid, true);
    if (!cycle) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: BILLING_CYCLE_CODES.BILLING_CYCLE_NOT_FOUND,
        message: BILLING_CYCLE_ERRORS.NOT_FOUND,
      });
    }

    await cycle.markAsOverdue();
    console.log(`✅ Cycle marqué comme en retard: GUID ${validGuid}`);

    R.handleSuccess(res, await cycle.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur marquage en retard:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: BILLING_CYCLE_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /:guid/cancel - Annuler le cycle
 */
router.patch('/:guid/cancel', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = BC.validateBillingCycleGuid(req.params.guid);

    const cycle = await BillingCycle._load(validGuid, true);
    if (!cycle) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: BILLING_CYCLE_CODES.BILLING_CYCLE_NOT_FOUND,
        message: BILLING_CYCLE_ERRORS.NOT_FOUND,
      });
    }

    await cycle.cancel();
    console.log(`✅ Cycle annulé: GUID ${validGuid}`);

    R.handleSuccess(res, await cycle.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur annulation cycle:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: BILLING_CYCLE_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// endregion

// region ROUTES UTILITAIRES

/**
 * GET /list - Lister tous les cycles de facturation (pour admin)
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters = BC.validateBillingCycleFilters(req.query);
    const paginationOptions = paginationSchema.parse(req.query);

    const conditions: Record<string, any> = {};

    if (filters.global_license) {
      const globalLicenseObj = await GlobalLicense._load(filters.global_license, true);
      if (!globalLicenseObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
          message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
        });
      }
      conditions.global_license = globalLicenseObj.getId()!;
    }
    if (filters.billing_status) conditions.billing_status = filters.billing_status;
    if (filters.billing_currency_code)
      conditions.billing_currency_code = filters.billing_currency_code;
    if (filters.min_total_amount_usd !== undefined) {
      conditions.total_amount_usd = { [Op.gte]: filters.min_total_amount_usd };
    }
    if (filters.max_total_amount_usd !== undefined) {
      if (conditions.total_amount_usd) {
        conditions.total_amount_usd[Op.lte] = filters.max_total_amount_usd;
      } else {
        conditions.total_amount_usd = { [Op.lte]: filters.max_total_amount_usd };
      }
    }

    const cycleEntries = await BillingCycle._list(conditions, paginationOptions);
    if (!cycleEntries) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: BILLING_CYCLE_CODES.BILLING_CYCLE_NOT_FOUND,
        message: BILLING_CYCLE_ERRORS.NOT_FOUND,
      });
    }

    const cycles = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || cycleEntries.length,
        count: cycleEntries.length || 0,
      },
      items: (await Promise.all(cycleEntries.map(async (cycle) => await cycle.toJSON()))) || [],
    };

    R.handleSuccess(res, { cycles });
  } catch (error: any) {
    console.error('⚠️ Erreur listing cycles de facturation:', error);
    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: BILLING_CYCLE_CODES.VALIDATION_FAILED,
        message: BILLING_CYCLE_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: BILLING_CYCLE_CODES.LISTING_FAILED,
        message: BILLING_CYCLE_ERRORS.EXPORT_FAILED,
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
    let cycle: BillingCycle | null = null;

    // Essayer différentes méthodes de recherche selon le format
    if (/^\d+$/.test(identifier)) {
      const numericId = parseInt(identifier);

      // Essayer par ID d'abord
      cycle = await BillingCycle._load(numericId);

      // Si pas trouvé, essayer par GUID
      if (!cycle) {
        cycle = await BillingCycle._load(numericId, true);
      }
    }

    if (!cycle) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: BILLING_CYCLE_CODES.BILLING_CYCLE_NOT_FOUND,
        message: `Billing cycle with identifier '${identifier}' not found`,
      });
    }

    R.handleSuccess(res, await cycle.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur recherche cycle de facturation:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: BILLING_CYCLE_CODES.SEARCH_FAILED,
      message: BILLING_CYCLE_ERRORS.NOT_FOUND,
    });
  }
});

// endregion

export default router;
