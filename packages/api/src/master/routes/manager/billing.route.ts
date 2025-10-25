import { Request, Response, Router } from 'express';
import {
  BILLING_CYCLE_CODES,
  BILLING_CYCLE_ERRORS,
  EMPLOYEE_LICENSE_CODES,
  EMPLOYEE_LICENSE_DEFAULTS,
  EMPLOYEE_LICENSE_ERRORS,
  EmployeeLicenseValidationUtils,
  GLOBAL_LICENSE_CODES,
  GLOBAL_LICENSE_ERRORS,
  HttpStatus,
  LICENSE_ADJUSTMENT_CODES,
  LICENSE_ADJUSTMENT_ERRORS,
  LicenseAdjustmentValidationUtils,
  LicenseStatus,
  paginationSchema,
  PAYMENT_METHOD_CODES,
  PAYMENT_METHOD_ERRORS,
  PAYMENT_TRANSACTION_CODES,
  PAYMENT_TRANSACTION_ERRORS,
  PaymentMethodValidationUtils,
  PaymentTransactionStatus,
  PaymentTransactionValidationUtils,
  PT,
  TENANT_CODES,
  TENANT_ERRORS,
  TenantValidationUtils,
} from '@toke/shared';

import GlobalLicense from '../../class/GlobalLicense.js';
import Tenant from '../../class/Tenant.js';
import R from '../../../tools/response.js';
import Ensure from '../../../middle/ensured-routes.js';
import EmployeeLicense from '../../class/EmployeeLicense.js';
import LicenseAdjustment from '../../class/LicenseAdjustment.js';
import TaxRule from '../../class/TaxRule.js';
import ExchangeRate from '../../class/ExchangeRate.js';
import PaymentTransaction from '../../class/PaymentTransaction.js';
import BillingCycle from '../../class/BillingCycle.js';
import PaymentMethod from '../../class/PaymentMethod.js';

const router = Router();

//🎫 Retrieve current global master information including status, period, and renewal date
router.get('/current-license/:tenant', Ensure.get(), async (req: Request, res: Response) => {
  try {
    // const validTenant = TenantValidationUtils.validateTenantGuid(req.params.tenant);
    if (!TenantValidationUtils.validateTenantGuid(req.params.tenant)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.INVALID_GUID,
        message: TENANT_ERRORS.GUID_INVALID,
      });
    }
    const tenant = parseInt(req.params.tenant, 10);
    const tenantObj = await Tenant._load(tenant, true);
    if (!tenantObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TENANT_CODES.TENANT_NOT_FOUND,
        message: TENANT_ERRORS.NOT_FOUND,
      });
    }

    const licensesData = await GlobalLicense._load(tenantObj.getId()!, false, true);
    if (!licensesData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    R.handleSuccess(res, await licensesData.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par tenant:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.PAGINATION_INVALID,
        message: GLOBAL_LICENSE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: GLOBAL_LICENSE_CODES.SEARCH_FAILED,
        message: `Failed to search licenses by tenant: ${req.params.tenant}`,
      });
    }
  }
});

// 💰 Get current count of billable employees based on anti-fraud rules and activity status
router.get(
  '/billable-employees/:globalLicense',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { globalLicense } = req.params;
      const { offset, limit } = req.query;

      const globalLicenseGuid = parseInt(globalLicense);
      if (!EmployeeLicenseValidationUtils.validateGlobalLicenseId(globalLicenseGuid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: EMPLOYEE_LICENSE_CODES.GLOBAL_LICENSE_INVALID,
          message: EMPLOYEE_LICENSE_ERRORS.GLOBAL_LICENSE_INVALID,
        });
      }

      const globalLicenseModel = await GlobalLicense._load(globalLicenseGuid, true);
      if (!globalLicenseModel) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
          message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
        });
      }

      const paginationOptions = {
        offset: offset ? parseInt(offset as string) : EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.OFFSET,
        limit: limit
          ? Math.min(parseInt(limit as string), EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.MAX_LIMIT)
          : EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.LIMIT,
      };

      const employeeLicenses = await EmployeeLicense._listByGlobalLicense(
        globalLicenseModel.getId()!,
        paginationOptions,
      );

      if (!employeeLicenses) {
        return R.handleSuccess(res, {
          items: [],
          pagination: paginationOptions,
          count: 0,
        });
      }

      const items = await Promise.all(
        employeeLicenses.map(async (license) => await license.toJSON()),
      );

      R.handleSuccess(res, {
        items,
        pagination: paginationOptions,
        count: items.length,
      });
    } catch (error: any) {
      console.error('❌ Error listing employee licenses by global master:', error);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: EMPLOYEE_LICENSE_CODES.LISTING_FAILED,
        message: 'Failed to list employee licenses',
        details: error.message,
      });
    }
  },
);

// ⚡ Calculate current period cost in real-time with tax calculation and currency conversion
router.get('/current-cost/:tenant', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { tenant } = req.params;
    const tenantGuid = parseInt(tenant);

    // 1. Vérif GUID tenant
    if (!TenantValidationUtils.validateTenantGuid(tenantGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.INVALID_GUID,
        message: TENANT_ERRORS.GUID_INVALID,
      });
    }

    // 2. Chargement tenant
    const tenantObj = await Tenant._load(tenantGuid, true);
    if (!tenantObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TENANT_CODES.TENANT_NOT_FOUND,
        message: TENANT_ERRORS.NOT_FOUND,
      });
    }

    const tenantId = tenantObj.getId()!;
    const tenantCurrency = tenantObj.getPrimaryCurrencyCode();
    const tenantCountryCode = tenantObj.getCountryCode();

    // 3. Filtrer licences globales actives
    const globalLicenses = await GlobalLicense._listByTenant(tenantId);
    if (!globalLicenses || globalLicenses.length === 0) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    const activeLicense = globalLicenses.find((l) => l.getLicenseStatus() === LicenseStatus.ACTIVE);
    if (!activeLicense) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'no_active_global_license',
        message: 'No active global master found for this tenant',
      });
    }

    // 4. Nombre d’employés facturables
    const billableCount = await EmployeeLicense._getBillableCountForLicense(activeLicense.getId()!);

    // 5. Coût de base
    const baseCostUSD = activeLicense.getBasePriceUsd()! * billableCount;

    // 6. Ajustements
    const pendingAdjustments = await LicenseAdjustment._listInvoicedNotPaidGlobalLicense(
      activeLicense.getId()!,
    );
    // const adjustmentsUSD = pendingAdjustments?.length || 0;
    const adjustmentsUSD =
      pendingAdjustments?.reduce((total, adj) => total + adj.getTotalAmountUsd()!, 0) || 0;

    // ✅ FIX: 7. Taxes - Charger les règles fiscales comme instances de classe
    const taxRulesData = await TaxRule._listByCountryCode(tenantCountryCode!);

    // ✅ Convertir en instances TaxRule si ce sont des objets plain
    let taxRules: TaxRule[] = [];
    if (taxRulesData && taxRulesData.length > 0) {
      // Si ce sont déjà des instances, les utiliser directement
      if (typeof taxRulesData[0].isActive === 'function') {
        taxRules = taxRulesData as TaxRule[];
      } else {
        // Sinon, les convertir en instances
        taxRules = taxRulesData.map((data: any) => TaxRule._toObject(data));
      }
    }

    // 7. Taxes
    // const taxRules = await TaxRule._listByCountryCode(tenantCountryCode!);
    const taxAmountUSD = calculateTax(baseCostUSD + adjustmentsUSD, taxRules);

    // 8. Conversion devise
    const exchangeRate = await ExchangeRate.getCurrentRate('USD', tenantCurrency!);
    const totalUSD = baseCostUSD + adjustmentsUSD + taxAmountUSD;
    const totalLocal = totalUSD * exchangeRate;

    // 9. Réponse
    return R.handleSuccess(res, {
      base_cost_usd: baseCostUSD,
      adjustments_usd: adjustmentsUSD,
      tax_amount_usd: taxAmountUSD,
      total_usd: totalUSD,
      exchange_rate: exchangeRate,
      total_local: totalLocal,
      currency: tenantCurrency,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GLOBAL_LICENSE_CODES.SEARCH_FAILED,
      message: 'Failed to calculate current cost',
      details: error.message,
    });
  }
});

// 📊 Preview final billing amount for current period with projections and breakdowns
router.get('/period-preview/:tenant', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { tenant } = req.params;
    const tenantGuid = parseInt(tenant);

    if (!TenantValidationUtils.validateTenantGuid(tenantGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.INVALID_GUID,
        message: TENANT_ERRORS.GUID_INVALID,
      });
    }

    const tenantObj = await Tenant._load(tenantGuid, true);
    if (!tenantObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TENANT_CODES.TENANT_NOT_FOUND,
        message: TENANT_ERRORS.NOT_FOUND,
      });
    }

    const globalLicenses = await GlobalLicense._listByTenant(tenantObj.getId()!);
    const activeLicense = globalLicenses?.find((l) => l.getLicenseStatus() === 'ACTIVE');

    if (!activeLicense) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'no_active_license',
        message: 'No active master found',
      });
    }

    // Calculer les coûts projetés pour la fin de période
    const currentBillableCount = await EmployeeLicense._getBillableCountForLicense(
      activeLicense.getId()!,
    );
    const baseCostUSD = activeLicense.getBasePriceUsd()! * currentBillableCount;

    const pendingAdjustments = await LicenseAdjustment._listInvoicedNotPaidGlobalLicense(
      activeLicense.getId()!,
    );
    const adjustmentsUSD =
      pendingAdjustments?.reduce((total, adj) => total + adj.getTotalAmountUsd()!, 0) || 0;

    // const taxRules = await TaxRule._listByCountryCode(tenantObj.getCountryCode()!);

    const taxRulesData = await TaxRule._listByCountryCode(tenantObj.getCountryCode()!);

    // ✅ Convertir en instances TaxRule si ce sont des objets plain
    let taxRules: TaxRule[] = [];
    if (taxRulesData && taxRulesData.length > 0) {
      // Si ce sont déjà des instances, les utiliser directement
      if (typeof taxRulesData[0].isActive === 'function') {
        taxRules = taxRulesData as TaxRule[];
      } else {
        // Sinon, les convertir en instances
        taxRules = taxRulesData.map((data: any) => TaxRule._toObject(data));
      }
    }

    const taxAmountUSD = calculateTax(baseCostUSD + adjustmentsUSD, taxRules);

    const projectedTotalUSD = baseCostUSD + adjustmentsUSD + taxAmountUSD;

    // Conversion devise
    const exchangeRate = await ExchangeRate.getCurrentRate(
      'USD',
      tenantObj.getPrimaryCurrencyCode()!,
    );
    const projectedTotalLocal = projectedTotalUSD * exchangeRate;

    return R.handleSuccess(res, {
      period: {
        start: activeLicense.getCurrentPeriodStart(),
        end: activeLicense.getCurrentPeriodEnd(),
      },
      current_billable_employees: currentBillableCount,
      projected_costs: {
        base_cost_usd: baseCostUSD,
        adjustments_usd: adjustmentsUSD,
        tax_amount_usd: taxAmountUSD,
        total_usd: projectedTotalUSD,
        exchange_rate: exchangeRate,
        total_local: projectedTotalLocal,
        currency: tenantObj.getPrimaryCurrencyCode(),
      },
      breakdown: {
        base_price_per_employee: activeLicense.getBasePriceUsd(),
        tax_rules_applied: taxRules?.map((rule) => ({
          tax_name: rule.getTaxName(),
          tax_rate: rule.getTaxRate(),
        })),
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'period_preview_failed',
      message: 'Failed to generate period preview',
      details: error.message,
    });
  }
});

// 📈 List automatic adjustments waiting for payment when employees added mid-period
router.get('/pending-adjustments/:tenant', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { tenant } = req.params;
    const tenantGuid = parseInt(tenant);

    if (!TenantValidationUtils.validateTenantGuid(tenantGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.INVALID_GUID,
        message: TENANT_ERRORS.GUID_INVALID,
      });
    }

    const tenantObj = await Tenant._load(tenantGuid, true);
    if (!tenantObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TENANT_CODES.TENANT_NOT_FOUND,
        message: TENANT_ERRORS.NOT_FOUND,
      });
    }

    const globalLicenses = await GlobalLicense._load(tenantObj.getId()!, false, true);
    if (!globalLicenses) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      });
    }
    // const activeLicense = globalLicenses?.find(l => l.getLicenseStatus() === LicenseStatus.ACTIVE);
    if (globalLicenses.getLicenseStatus() !== LicenseStatus.ACTIVE) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'not_active_license',
        message: 'active global master not found',
      });
    }

    // Récupérer les ajustements en attente de paiement
    const pendingAdjustments = await LicenseAdjustment._listInvoicedNotPaidGlobalLicense(
      globalLicenses.getId()!,
    );

    if (!pendingAdjustments || pendingAdjustments.length === 0) {
      return R.handleSuccess(res, { pending_adjustments: [] });
    }

    const adjustmentsData = await Promise.all(
      pendingAdjustments.map(async (adjustment) => await adjustment.toJSON()),
    );

    return R.handleSuccess(res, {
      pending_adjustments: adjustmentsData,
      total_pending_usd: pendingAdjustments.reduce(
        (total, adj) => total + adj.getTotalAmountUsd()!,
        0,
      ),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'pending_adjustments_failed',
      message: 'Failed to list pending adjustments',
      details: error.message,
    });
  }
});

// ✅ Approve and process automatic master adjustment for new employees
router.patch('/adjustment/confirm', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { adjustment } = req.body;

    if (!LicenseAdjustmentValidationUtils.validateGuid(adjustment)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.INVALID_GUID,
        message: `${LICENSE_ADJUSTMENT_ERRORS.GUID_INVALID} ${adjustment}`,
      });
    }

    const adjustmentGuid = parseInt(adjustment, 10);
    const adjustmentObj = await LicenseAdjustment._load(adjustmentGuid, true);

    if (!adjustmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    // Vérifier que l'ajustement est en attente
    if (adjustmentObj.getPaymentStatus() !== PaymentTransactionStatus.PENDING) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'adjustment_not_pending',
        message: 'Only pending adjustments can be confirmed',
      });
    }

    // Marquer comme confirmé et générer la facture
    adjustmentObj.setInvoiceSentAt(new Date());
    adjustmentObj.setPaymentStatus(PaymentTransactionStatus.COMPLETED);
    await adjustmentObj.save();

    return R.handleSuccess(res, {
      message: 'License adjustment confirmed and invoice generated',
      adjustment: await adjustmentObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'adjustment_confirm_failed',
      message: 'Failed to confirm adjustment',
      details: error.message,
    });
  }
});

// 📄 Get detailed information about specific master adjustment including calculation breakdown
router.get('/adjustment/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!LicenseAdjustmentValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: LICENSE_ADJUSTMENT_CODES.INVALID_GUID,
        message: LICENSE_ADJUSTMENT_ERRORS.GUID_INVALID,
      });
    }
    const adjustmentGuid = parseInt(guid, 10);

    const adjustment = await LicenseAdjustment._load(adjustmentGuid, true);
    if (!adjustment) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    const adjustmentDetails = await adjustment.toJSON();

    return R.handleSuccess(res, {
      adjustment: adjustmentDetails,
      calculation_breakdown: {
        base_calculation: `${adjustment.getEmployeesAddedCount()} employees × $${adjustment.getPricePerEmployeeUsd()} × ${adjustment.getMonthsRemaining()} months`,
        subtotal_usd: adjustment.getSubtotalUsd(),
        tax_amount_usd: adjustment.getTaxAmountUsd(),
        total_usd: adjustment.getTotalAmountUsd(),
        exchange_rate_used: adjustment.getExchangeRateUsed(),
        total_local: adjustment.getTotalAmountLocal(),
        currency: adjustment.getBillingCurrencyCode(),
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'adjustment_details_failed',
      message: 'Failed to get adjustment details',
      details: error.message,
    });
  }
});

// 📱 Start payment process using MTN MoMo or Orange Money for master fees
router.post('/payment/initiate', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = PT.validatePaymentTransactionCreation(req.body);

    const licenceAdjObj = await LicenseAdjustment._load(validatedData.adjustment, true);
    if (!licenceAdjObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    const billingObj = await BillingCycle._load(validatedData.billing_cycle, true);
    if (!billingObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: BILLING_CYCLE_CODES.BILLING_CYCLE_NOT_FOUND,
        message: BILLING_CYCLE_ERRORS.NOT_FOUND,
      });
    }

    const paymentMethodObj = await PaymentMethod._load(validatedData.payment_method, true);
    if (!paymentMethodObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
        message: PAYMENT_METHOD_ERRORS.NOT_FOUND,
      });
    }

    const transactionObj = PaymentTransaction.createNew({
      billing_cycle: billingObj.getId()!,
      adjustment: licenceAdjObj.getId()!,
      amount_usd: validatedData.amount_usd,
      amount_local: validatedData.amount_local!,
      currency_code: validatedData.currency_code,
      exchange_rate_used: validatedData.exchange_rate_used,
      payment_method: paymentMethodObj.getId()!,
      // payment_reference: validatedData.payment_reference,
    });

    if (validatedData.transaction_status) {
      transactionObj.setTransactionStatus(validatedData.transaction_status);
    }

    await transactionObj.save();

    console.log(
      `✅ Transaction de paiement créée: GUID ${transactionObj.getGuid()}, Référence: ${validatedData.payment_reference}`,
    );
    return R.handleCreated(res, await transactionObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur création transaction de paiement:', error.message);

    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: PAYMENT_TRANSACTION_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      // return R.handleError(res, HttpStatus.BAD_REQUEST, {
      //   code: PAYMENT_TRANSACTION_CODES.CREATION_FAILED,
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

// 🔍 Monitor real-time payment status with mobile money provider integration
router.get('/payment/:reference/status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;

    // // Extraire le GUID de la transaction depuis la référence
    // const transactionGuid = reference.split('_')[1];
    // if (!transactionGuid) {
    //     return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //         code: 'invalid_reference',
    //         message: 'Invalid payment reference format',
    //     });
    // }
    //
    // if (!PaymentTransactionValidationUtils.validateGuid(transactionGuid)) {
    //     return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //         code: PAYMENT_TRANSACTION_CODES.INVALID_GUID,
    //         message: PAYMENT_TRANSACTION_ERRORS.GUID_INVALID,
    //     })
    // }
    const validateReference = PaymentTransactionValidationUtils.validatePaymentReference(reference);
    if (!validateReference) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_REFERENCE_INVALID,
        message: PAYMENT_TRANSACTION_ERRORS.PAYMENT_REFERENCE_INVALID,
      });
    }

    const transaction = await PaymentTransaction._load(reference, false, true);
    if (!transaction) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    // TODO: Vérifier le statut auprès du provider mobile money
    // const providerStatus = await checkMobilePaymentStatus(reference);

    const transactionData = await transaction.toJSON();
    return R.handleSuccess(res, transactionData);

    // return R.handleSuccess(res, {
    //     transaction_status: transaction.getTransactionStatus(),
    //     amount_local: transaction.getAmountLocal(),
    //     currency: transaction.getCurrencyCode(),
    //     initiated_at: transaction.getInitiatedAt(),
    //     completed_at: transaction.getCompletedAt(),
    //     failed_at: transaction.getFailedAt(),
    //     failure_reason: transaction.getFailureReason(),
    //     transaction_details: transactionData,
    // });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'payment_status_check_failed',
      message: 'Failed to check payment status',
      details: error.message,
    });
  }
});

// 🔄 Retry payment process for failed transactions with different payment method if needed
router.post('/payment/retry', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { transaction, new_payment_method_code } = req.body;

    if (!PaymentTransactionValidationUtils.validatePaymentReference(transaction)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_REFERENCE_INVALID,
        message: PAYMENT_TRANSACTION_ERRORS.PAYMENT_REFERENCE_INVALID,
      });
    }

    if (new_payment_method_code) {
      const validate = PaymentMethodValidationUtils.validateCode(new_payment_method_code);
      if (!validate) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: PAYMENT_METHOD_CODES.CODE_INVALID,
          message: PAYMENT_METHOD_ERRORS.CODE_INVALID,
        });
      }
    }

    const originalTransaction = await PaymentTransaction._load(transaction, false, true);

    if (!originalTransaction) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: 'Original transaction not found',
      });
    }

    // Vérifier que la transaction peut être retentée
    if (
      originalTransaction.getTransactionStatus() !== PaymentTransactionStatus.FAILED &&
      originalTransaction.getTransactionStatus() !== PaymentTransactionStatus.CANCELLED
    ) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'transaction_not_retryable',
        message: 'Only failed transactions can be retried',
      });
    }

    // Créer une nouvelle transaction basée sur l'originale
    const newTransaction = new PaymentTransaction()
      .setAmountUsd(originalTransaction.getAmountUsd()!)
      .setAmountLocal(originalTransaction.getAmountLocal()!)
      .setCurrencyCode(originalTransaction.getCurrency()!)
      .setExchangeRate(originalTransaction.getExchangeRate()!)
      .setTransactionStatus(PaymentTransactionStatus.PENDING);

    if (originalTransaction.getBillingCycleId()) {
      newTransaction.setBillingCycle(originalTransaction.getBillingCycleId()!);
    }
    if (originalTransaction.getAdjustmentId()) {
      newTransaction.setAdjustment(originalTransaction.getAdjustmentId()!);
    }

    // Utiliser nouveau moyen de paiement si fourni
    if (new_payment_method_code) {
      const newPaymentMethod = await PaymentMethod._load(new_payment_method_code, false, true);
      if (!newPaymentMethod) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: PAYMENT_METHOD_CODES.PAYMENT_METHOD_NOT_FOUND,
          message: `New ${PAYMENT_METHOD_ERRORS.NOT_FOUND}`,
        });
      }
      newTransaction.setPaymentMethod(newPaymentMethod.getId()!);
    } else {
      newTransaction.setPaymentMethod(originalTransaction.getPaymentMethodId()!);
    }

    await newTransaction.save();

    // const newPaymentReference = `TOKE_${newTransaction.getGuid()}_${Date.now()}_RETRY`;

    // TODO: Réinitier le paiement mobile money
    // const retryPaymentResponse = await initiateMobilePayment({...});

    return R.handleCreated(res, await newTransaction.toJSON());
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'payment_retry_failed',
      message: 'Failed to retry payment',
      details: error.message,
    });
  }
});

// 📚 Complete history of all master payments with receipts and transaction details
router.get('/payment-history/:tenant', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { tenant } = req.params;
    const paginationOptions = paginationSchema.parse(req.query);

    if (!TenantValidationUtils.validateTenantGuid(tenant)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.INVALID_GUID,
        message: TENANT_ERRORS.GUID_INVALID,
      });
    }
    const tenantGuid = parseInt(tenant, 10);

    const tenantObj = await Tenant._load(tenantGuid, true);
    if (!tenantObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TENANT_CODES.TENANT_NOT_FOUND,
        message: TENANT_ERRORS.NOT_FOUND,
      });
    }

    // Récupérer toutes les licences globales
    const globalLicense = await GlobalLicense._load(tenantObj.getId()!, false, true);
    if (!globalLicense) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
      });
    }

    // Pour le moment, on prend la première licence globale
    const globalId = globalLicense.getId()!;

    // Récupérer tous les avenants pour cette licence globale
    const adjustmentObj = await LicenseAdjustment._listByGlobalLicense(globalId);
    const adjustmentIds = adjustmentObj?.map((adj) => adj.getId()) ?? [];
    if (adjustmentIds.length === 0) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: LICENSE_ADJUSTMENT_CODES.LICENSE_ADJUSTMENT_NOT_FOUND,
        message: LICENSE_ADJUSTMENT_ERRORS.NOT_FOUND,
      });
    }

    // Récupérer toutes les transactions pour tous les avenants en parallèle
    const transactionsArrays = await Promise.all(
      adjustmentIds.map(async (adjId) => {
        const rawTransactions = await PaymentTransaction._listByAdjustment(adjId!);
        if (!rawTransactions) {
          return [];
        }

        // Convertir directement en JSON
        return await Promise.all(
          rawTransactions
            .filter(Boolean) // Filtrer les valeurs nulles/undefined
            .map(async (transaction) => await transaction.toJSON()),
        );
      }),
    );

    // Aplatir le tableau
    const paymentHistory = transactionsArrays.flat();
    return R.handleSuccess(res, {
      payment_transactions: paymentHistory,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || paymentHistory.length,
        count: paymentHistory.length,
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'payment_history_failed',
      message: 'Failed to retrieve payment history',
      details: error.message,
    });
  }
});

/**
 * ✅ FIX: Calcule les taxes à partir d'instances TaxRule
 * @param amount - Montant avant taxes
 * @param rules - Instances de TaxRule (pas des objets plain)
 */
function calculateTax(amount: number, rules: TaxRule[]): number {
  if (!rules || rules.length === 0) return 0;
  return rules.reduce((total, rule) => {
    // ✅ Vérifier que c'est bien une instance avec la méthode isActive()
    if (typeof rule.isActive === 'function' && rule.isActive()) {
      // return total + amount * rule.getTaxRate()!;
      const rate = rule.getTaxRate();
      if (rate && rate > 0) {
        return total + amount * rate;
      }
    }
    return total;
  }, 0);
}

export default router;
