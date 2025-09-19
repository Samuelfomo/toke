import { Request, Response, Router } from 'express';
import {
  BILLING_CYCLES,
  BillingCycle,
  GL,
  GLOBAL_LICENSE_CODES,
  GLOBAL_LICENSE_ERRORS,
  HttpStatus,
  LicenseStatus,
  paginationSchema,
  TENANT_CODES,
  TENANT_ERRORS,
  TenantValidationUtils,
  Type,
} from '@toke/shared';
import { Op } from 'sequelize';

import GlobalLicense from '../class/GlobalLicense.js';
import Tenant from '../class/Tenant.js';
import R from '../../tools/response.js';
import G from '../../tools/glossary.js';
import Ensure from '../../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';

const router = Router();

// region ROUTES D'EXPORT

/**
 * GET / - Exporter toutes les licences globales
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const licenses = await GlobalLicense.exportable(paginationOptions);
    R.handleSuccess(res, { licenses });
  } catch (error: any) {
    console.error('⚠️ Erreur export licences globales:', error);
    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.PAGINATION_INVALID,
        message: GLOBAL_LICENSE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: GLOBAL_LICENSE_CODES.EXPORT_FAILED,
        message: GLOBAL_LICENSE_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /revision - Récupérer uniquement la révision actuelle
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.GLOBAL_LICENSE);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('⚠️ Erreur récupération révision:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GLOBAL_LICENSE_CODES.SEARCH_FAILED,
      message: 'Failed to get current revision',
    });
  }
});

/**
 * GET /tenant/:tenant - Lister les licences par tenant
 */
router.get('/tenant/:tenant', Ensure.get(), async (req: Request, res: Response) => {
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

    const paginationOptions = paginationSchema.parse(req.query);

    const licensesData = await GlobalLicense._listByTenant(tenantObj.getId()!, paginationOptions);
    if (!licensesData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      });
    }
    const licenses = {
      tenant,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || licensesData.length,
        count: licensesData.length,
      },
      items: (await Promise.all(licensesData.map(async (license) => await license.toJSON()))) || [],
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

/**
 * GET /type/:license_type - Lister les licences par type
 */
router.get('/type/:license_type', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { license_type } = req.params;
    const validType = license_type.toUpperCase() as Type;

    if (!Object.values(Type).includes(validType)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.LICENSE_TYPE_INVALID,
        message: `Invalid license type. Must be one of: ${Object.values(Type).join(', ')}`,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const licensesData = await GlobalLicense._listByLicenseType(validType, paginationOptions);
    const licenses = {
      license_type: validType,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || licensesData?.length,
        count: licensesData?.length || 0,
      },
      items: licensesData?.map((license) => license.toJSON()) || [],
    };

    R.handleSuccess(res, { licenses });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par type:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.PAGINATION_INVALID,
        message: GLOBAL_LICENSE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: GLOBAL_LICENSE_CODES.SEARCH_FAILED,
        message: `Failed to search licenses by type: ${req.params.license_type}`,
      });
    }
  }
});

/**
 * GET /billing-cycle/:months - Lister les licences par cycle de facturation
 */
router.get('/billing-cycle/:months', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const months = parseInt(req.params.months, 10);

    if (isNaN(months) || !BILLING_CYCLES.includes(months as BillingCycle)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.BILLING_CYCLE_INVALID,
        message: `Invalid billing cycle. Must be one of: ${BILLING_CYCLES.join(', ')}`,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const licensesData = await GlobalLicense._listByBillingCycle(
      months as BillingCycle,
      paginationOptions,
    );
    const licenses = {
      billing_cycle_months: months,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || licensesData?.length,
        count: licensesData?.length || 0,
      },
      items: licensesData?.map((license) => license.toJSON()) || [],
    };

    R.handleSuccess(res, { licenses });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par cycle facturation:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.PAGINATION_INVALID,
        message: GLOBAL_LICENSE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: GLOBAL_LICENSE_CODES.SEARCH_FAILED,
        message: `Failed to search licenses by billing cycle: ${req.params.months}`,
      });
    }
  }
});

/**
 * GET /status/:status - Lister les licences par statut
 */
router.get('/status/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const validStatus = status.toUpperCase() as LicenseStatus;

    if (!Object.values(LicenseStatus).includes(validStatus)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.LICENSE_STATUS_INVALID,
        message: `Invalid license status. Must be one of: ${Object.values(LicenseStatus).join(', ')}`,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const licensesData = await GlobalLicense._listByStatus(validStatus, paginationOptions);
    const licenses = {
      license_status: validStatus,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || licensesData?.length,
        count: licensesData?.length || 0,
      },
      items: licensesData?.map((license) => license.toJSON()) || [],
    };

    R.handleSuccess(res, { licenses });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par statut:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.PAGINATION_INVALID,
        message: GLOBAL_LICENSE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: GLOBAL_LICENSE_CODES.SEARCH_FAILED,
        message: `Failed to search licenses by status: ${req.params.status}`,
      });
    }
  }
});

/**
 * GET /expiring/:days - Lister les licences expirant dans X jours
 */
router.get('/expiring/:days', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.params.days);
    if (isNaN(days) || days < 1) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.VALIDATION_FAILED,
        message: 'Days must be a positive number',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const licensesData = await GlobalLicense._listExpiringSoon(days, paginationOptions);
    const licenses = {
      expiring_in_days: days,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || licensesData?.length,
        count: licensesData?.length || 0,
      },
      items: licensesData?.map((license) => license.toJSON()) || [],
    };

    R.handleSuccess(res, { licenses });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche licences expirant:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.PAGINATION_INVALID,
        message: GLOBAL_LICENSE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: GLOBAL_LICENSE_CODES.SEARCH_FAILED,
        message: `Failed to search expiring licenses: ${req.params.days} days`,
      });
    }
  }
});

/**
 * GET /expired - Lister les licences expirées
 */
router.get('/expired', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const licensesData = await GlobalLicense._listExpired(paginationOptions);
    const licenses = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || licensesData?.length,
        count: licensesData?.length || 0,
      },
      items: licensesData?.map((license) => license.toJSON()) || [],
    };

    R.handleSuccess(res, { licenses });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche licences expirées:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.PAGINATION_INVALID,
        message: GLOBAL_LICENSE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: GLOBAL_LICENSE_CODES.SEARCH_FAILED,
        message: 'Failed to search expired licenses',
      });
    }
  }
});

// endregion

// region ROUTES CRUD

/**
 * POST / - Créer une nouvelle licence globale
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = GL.validateGlobalLicenseCreation(req.body);

    const tenantObj = await Tenant._load(validatedData.tenant, true);
    if (!tenantObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TENANT_CODES.TENANT_NOT_FOUND,
        message: TENANT_ERRORS.NOT_FOUND,
      });
    }

    const licenseObj = new GlobalLicense()
      .setTenant(tenantObj.getId()!)
      .setLicenseType(validatedData.license_type)
      .setBillingCycleMonths(validatedData.billing_cycle_months as BillingCycle)
      .setCurrentPeriodStart(validatedData.current_period_start)
      .setCurrentPeriodEnd(validatedData.current_period_end)
      .setNextRenewalDate(validatedData.next_renewal_date);

    if (validatedData.base_price_usd !== undefined)
      licenseObj.setBasePriceUsd(validatedData.base_price_usd);
    if (validatedData.minimum_seats !== undefined)
      licenseObj.setMinimumSeats(validatedData.minimum_seats);
    if (validatedData.total_seats_purchased !== undefined)
      licenseObj.setTotalSeatsPurchased(validatedData.total_seats_purchased);
    if (validatedData.license_status !== undefined)
      licenseObj.setLicenseStatus(validatedData.license_status as LicenseStatus);

    await licenseObj.save();

    console.log(
      `✅ Licence globale créée: Tenant ${validatedData.tenant} - ${validatedData.license_type} (GUID: ${licenseObj.getGuid()})`,
    );
    return R.handleCreated(res, await licenseObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur création licence globale:', error.message);

    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.VALIDATION_FAILED,
        message: GLOBAL_LICENSE_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * PUT /:guid - Modifier une licence globale par GUID
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const validGuid = GL.validateGlobalLicenseGuid(req.params.guid);

    // Charger par GUID
    const licenseObj = await GlobalLicense._load(validGuid, true);
    if (!licenseObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    const validateData = GL.validateGlobalLicenseUpdate(req.body);

    // Mise à jour des champs fournis
    if (validateData.tenant !== undefined) {
      const tenantObj = await Tenant._load(validateData.tenant, true);
      if (!tenantObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: TENANT_CODES.TENANT_NOT_FOUND,
          message: TENANT_ERRORS.NOT_FOUND,
        });
      }
      licenseObj.setTenant(tenantObj.getId()!);
    }
    if (validateData.license_type !== undefined)
      licenseObj.setLicenseType(validateData.license_type);
    if (validateData.billing_cycle_months !== undefined)
      licenseObj.setBillingCycleMonths(validateData.billing_cycle_months as BillingCycle);
    if (validateData.base_price_usd !== undefined)
      licenseObj.setBasePriceUsd(validateData.base_price_usd);
    if (validateData.minimum_seats !== undefined)
      licenseObj.setMinimumSeats(validateData.minimum_seats);
    if (validateData.current_period_start !== undefined)
      licenseObj.setCurrentPeriodStart(validateData.current_period_start);
    if (validateData.current_period_end !== undefined)
      licenseObj.setCurrentPeriodEnd(validateData.current_period_end);
    if (validateData.next_renewal_date !== undefined)
      licenseObj.setNextRenewalDate(validateData.next_renewal_date);
    if (validateData.total_seats_purchased !== undefined)
      licenseObj.setTotalSeatsPurchased(validateData.total_seats_purchased);
    if (validateData.license_status !== undefined)
      licenseObj.setLicenseStatus(validateData.license_status);

    await licenseObj.save();

    console.log(`✅ Licence globale modifiée: GUID ${validGuid}`);
    R.handleSuccess(res, await licenseObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur modification licence globale:', error);

    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.INVALID_GUID,
        message: GLOBAL_LICENSE_ERRORS.GUID_INVALID,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * DELETE /:guid - Supprimer une licence globale par GUID
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const validGuid = GL.validateGlobalLicenseGuid(req.params.guid);

    // Charger par GUID
    const license = await GlobalLicense._load(validGuid, true);
    if (!license) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    const deleted = await license.delete();

    if (deleted) {
      console.log(
        `✅ Licence globale supprimée: GUID ${validGuid} (${license.getLicenseType()} - Tenant ${license.getTenant()})`,
      );
      R.handleSuccess(res, {
        message: 'Global master deleted successfully',
        guid: validGuid,
        license_type: license.getLicenseType(),
        tenant: license.getTenant(),
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, G.savedError);
    }
  } catch (error: any) {
    console.error('⚠️ Erreur suppression licence globale:', error);

    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.INVALID_GUID,
        message: GLOBAL_LICENSE_ERRORS.GUID_INVALID,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: GLOBAL_LICENSE_CODES.DELETE_FAILED,
        message: error.message,
      });
    }
  }
});

// endregion

// region ROUTES UTILITAIRES

/**
 * GET /list - Lister toutes les licences globales (pour admin)
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters = GL.validateGlobalLicenseFilters(req.query);
    const paginationOptions = paginationSchema.parse(req.query);

    const conditions: Record<string, any> = {};

    if (filters.tenant) {
      const tenantObj = await Tenant._load(filters.tenant, true);
      if (!tenantObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: TENANT_CODES.TENANT_NOT_FOUND,
          message: TENANT_ERRORS.NOT_FOUND,
        });
      }
      conditions.tenant = tenantObj.getId()!;
    }
    if (filters.license_type) conditions.license_type = filters.license_type;
    if (filters.billing_cycle_months)
      conditions.billing_cycle_months = filters.billing_cycle_months;
    if (filters.license_status) conditions.license_status = filters.license_status;
    if (filters.minimum_seats !== undefined) conditions.minimum_seats = filters.minimum_seats;
    if (filters.base_price_usd !== undefined) {
      conditions.base_price_usd = { [Op.gte]: filters.base_price_usd };
    }

    const licenseEntries = await GlobalLicense._list(conditions, paginationOptions);
    if (!licenseEntries) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      });
    }
    const licenses = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || licenseEntries.length,
        count: licenseEntries.length || 0,
      },
      items:
        (await Promise.all(licenseEntries.map(async (license) => await license.toJSON()))) || [],
    };

    R.handleSuccess(res, { licenses });
  } catch (error: any) {
    console.error('⚠️ Erreur listing licences globales:', error);
    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.VALIDATION_FAILED,
        message: GLOBAL_LICENSE_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: GLOBAL_LICENSE_CODES.LISTING_FAILED,
        message: GLOBAL_LICENSE_ERRORS.EXPORT_FAILED,
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
    let license: GlobalLicense | null = null;

    // Essayer différentes méthodes de recherche selon le format
    if (/^\d+$/.test(identifier)) {
      const numericId = parseInt(identifier);

      // Essayer par ID d'abord
      license = await GlobalLicense._load(numericId);

      // Si pas trouvé, essayer par GUID
      if (!license) {
        license = await GlobalLicense._load(numericId, true);
      }
    }

    if (!license) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: `Global license with identifier '${identifier}' not found`,
      });
    }

    R.handleSuccess(res, license.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur recherche licence globale:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GLOBAL_LICENSE_CODES.SEARCH_FAILED,
      message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
    });
  }
});

// endregion

export default router;
