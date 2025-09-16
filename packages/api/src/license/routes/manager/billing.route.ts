import { Request, Response, Router } from 'express';
import {
  EMPLOYEE_LICENSE_CODES,
  EMPLOYEE_LICENSE_DEFAULTS,
  EMPLOYEE_LICENSE_ERRORS,
  EmployeeLicenseValidationUtils,
  GLOBAL_LICENSE_CODES,
  GLOBAL_LICENSE_ERRORS,
  HttpStatus,
  paginationSchema,
  TENANT_CODES,
  TENANT_ERRORS,
  TenantValidationUtils,
} from '@toke/shared';

import GlobalLicense from '../../class/GlobalLicense.js';
import Tenant from '../../class/Tenant.js';
import R from '../../../tools/response.js';
import Ensure from '../../middle/ensured-routes.js';
import EmployeeLicense from '../../class/EmployeeLicense';
import LicenseAdjustment from '../../class/LicenseAdjustment';
import TaxRule from '../../class/TaxRule';
import ExchangeRate from '../../class/ExchangeRate';

const router = Router();

//🎫 Retrieve current global license information including status, period, and renewal date
router.get('/current-license/:tenant', Ensure.get(), async (req: Request, res: Response) => {
  try {
    // const validTenant = TenantValidationUtils.validateTenantGuid(req.params.tenant);
    if (!TenantValidationUtils.validateTenantGuid(req.params.tenant)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code:TENANT_CODES.INVALID_GUID,
        message: TENANT_ERRORS.GUID_INVALID,
      })
    }
    const tenant = parseInt(req.params.tenant, 10);
    const tenantObj = await Tenant._load(tenant, true);
    if (!tenantObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TENANT_CODES.TENANT_NOT_FOUND,
        message: TENANT_ERRORS.NOT_FOUND,
      })
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const licensesData = await GlobalLicense._listByTenant(tenantObj.getId()!, paginationOptions);
    if (!licensesData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      })
    }
    const licenses = {
      tenant,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || licensesData.length,
        count: licensesData.length,
      },
      items: await Promise.all(licensesData.map(async (license) => await license.toJSON())) || [],
    };

    R.handleSuccess(res, { licenses });
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
router.get('/billable-employees/:globalLicense', Ensure.get(), async (req: Request, res: Response) => {
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
      limit: limit ? Math.min(parseInt(limit as string), EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.MAX_LIMIT) : EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.LIMIT,
    };

    const employeeLicenses = await EmployeeLicense._listByGlobalLicense(globalLicenseModel.getId()!, paginationOptions);

    if (!employeeLicenses) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(
      employeeLicenses.map(async (license) => await license.toJSON())
    );

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
    });
  } catch (error: any) {
    console.error('❌ Error listing employee licenses by global license:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.LISTING_FAILED,
      message: 'Failed to list employee licenses',
      details: error.message,
    });
  }
});

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

    const activeLicense = globalLicenses.find(l => l.getLicenseStatus() === 'ACTIVE');
    if (!activeLicense) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'no_active_global_license',
        message: 'No active global license found for this tenant',
      });
    }

    // 4. Nombre d’employés facturables
    const billableCount = await EmployeeLicense._getBillableCountForLicense(activeLicense.getId()!);

    // 5. Coût de base
    const baseCostUSD = activeLicense.getBasePriceUsd()! * billableCount;

    // 6. Ajustements
    const pendingAdjustments = await LicenseAdjustment._listInvoicedNotPaidGlobalLicense(activeLicense.getId()!);
    // const adjustmentsUSD = pendingAdjustments?.length || 0;
    const adjustmentsUSD = pendingAdjustments?.reduce((total, adj) =>
      total + adj.getTotalAmountUsd()!, 0) || 0;
    // 7. Taxes
    const taxRules = await TaxRule._listByCountryCode(tenantCountryCode!);
    const taxAmountUSD = calculateTax(baseCostUSD + adjustmentsUSD, taxRules ?? []);

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
    const activeLicense = globalLicenses?.find(l => l.getLicenseStatus() === 'ACTIVE');

    if (!activeLicense) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'no_active_license',
        message: 'No active license found',
      });
    }

    // Calculer les coûts projetés pour la fin de période
    const currentBillableCount = await EmployeeLicense._getBillableCountForLicense(activeLicense.getId()!);
    const baseCostUSD = activeLicense.getBasePriceUsd()! * currentBillableCount;

    const pendingAdjustments = await LicenseAdjustment._listInvoicedNotPaidGlobalLicense(activeLicense.getId()!);
    const adjustmentsUSD = pendingAdjustments?.reduce((total, adj) => total + adj.getTotalAmountUsd()!, 0) || 0;

    const taxRules = await TaxRule._listByCountryCode(tenantObj.getCountryCode()!);
    const taxAmountUSD = calculateTax(baseCostUSD + adjustmentsUSD, taxRules ?? []);

    const projectedTotalUSD = baseCostUSD + adjustmentsUSD + taxAmountUSD;

    // Conversion devise
    const exchangeRate = await ExchangeRate.getCurrentRate('USD', tenantObj.getPrimaryCurrencyCode()!);
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
        tax_rules_applied: taxRules?.map(rule => ({
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

    const globalLicenses = await GlobalLicense._listByTenant(tenantObj.getId()!);
    const activeLicense = globalLicenses?.find(l => l.getLicenseStatus() === 'ACTIVE');

    if (!activeLicense) {
      return R.handleSuccess(res, { pending_adjustments: [] });
    }

    // Récupérer les ajustements en attente de paiement
    const pendingAdjustments = await LicenseAdjustment._listInvoicedNotPaidGlobalLicense(activeLicense.getId()!);

    if (!pendingAdjustments || pendingAdjustments.length === 0) {
      return R.handleSuccess(res, { pending_adjustments: [] });
    }

    const adjustmentsData = await Promise.all(
      pendingAdjustments.map(async (adjustment) => ({
        adjustment: adjustment.getGuid(),
        adjustment_date: adjustment.getAdjustmentDate(),
        employees_added: adjustment.getEmployeesAddedCount(),
        months_remaining: adjustment.getMonthsRemaining(),
        total_amount_usd: adjustment.getTotalAmountUsd(),
        total_amount_local: adjustment.getTotalAmountLocal(),
        currency: adjustment.getBillingCurrencyCode(),
        payment_status: adjustment.getPaymentStatus(),
        invoice_sent_at: adjustment.getInvoiceSentAt(),
      }))
    );

    return R.handleSuccess(res, {
      pending_adjustments: adjustmentsData,
      total_pending_usd: pendingAdjustments.reduce((total, adj) => total + adj.getTotalAmountUsd()!, 0),
    });

  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'pending_adjustments_failed',
      message: 'Failed to list pending adjustments',
      details: error.message,
    });
  }
});

// ✅ Approve and process automatic license adjustment for new employees
router.post('/adjustment/confirm', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { adjustment } = req.body;

    if (!adjustment) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'adjustment_required',
        message: 'adjustment is required',
      });
    }

    const adjustmentGuid = parseInt(adjustment);
    const adjustmentObj = await LicenseAdjustment._load(adjustmentGuid, true);

    if (!adjustmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'adjustment_not_found',
        message: 'License adjustment not found',
      });
    }

    // Vérifier que l'ajustement est en attente
    if (adjustmentObj.getPaymentStatus() !== 'PENDING') {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'adjustment_not_pending',
        message: 'Only pending adjustments can be confirmed',
      });
    }

    // Marquer comme confirmé et générer la facture
    adjustmentObj.setInvoiceSentAt(new Date());
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

// 📄 Get detailed information about specific license adjustment including calculation breakdown
router.get('/adjustment/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    const adjustmentGuid = parseInt(guid);

    const adjustment = await LicenseAdjustment._load(adjustmentGuid, true);
    if (!adjustment) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'adjustment_not_found',
        message: 'License adjustment not found',
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

// 📱 Start payment process using mobile money
router.post('/payment/initiate', /* logique */);

// ⏱️ Monitor payment status
router.get('/payment/:reference/status', /* logique */);

// 🔄 Retry failed payment
router.post('/payment/retry', /* logique */);

// 📚 Complete payment history
router.get('/payment-history/:tenant', /* logique */);

function calculateTax(amount: number, rules: TaxRule[]): number {
  return rules.reduce((total, rule) => {
    if (rule.isActive()) {
      return total + (amount * rule.getTaxRate()!);
    }
    return total;
  }, 0);
}


