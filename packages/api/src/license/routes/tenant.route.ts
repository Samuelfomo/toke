import { Request, Response, Router } from 'express';
import {
  GLOBAL_LICENSE_CODES,
  GLOBAL_LICENSE_ERRORS,
  HttpStatus,
  LicenseStatus,
  paginationSchema,
  Status,
  TENANT_CODES,
  TENANT_ERRORS,
  TenantValidationUtils,
  TN
} from '@toke/shared';

import Tenant from '../class/Tenant.js';
import R from '../../tools/response.js';
import G from '../../tools/glossary.js';
import Ensure from '../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';
import GenerateOtp from '../../utils/generate.otp.js';
import GlobalLicense from '../class/GlobalLicense.js';

const router = Router();

// region ROUTES D'EXPORT

/**
 * GET / - Exporter tous les tenants
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
    try {
        const paginationOptions = paginationSchema.parse(req.query)

        const tenants = await Tenant.exportable(paginationOptions);
        R.handleSuccess(res, {tenants});
    } catch (error: any) {
        console.error('⚠️ Erreur export tenants:', error);
        if (error.issues) { // Erreur Zod
            return R.handleError(res, HttpStatus.BAD_REQUEST, {
                code: TENANT_CODES.PAGINATION_INVALID,
                message: 'Invalid pagination parameters',
                details: error.issues,
            });
        } else {
            R.handleError(res, HttpStatus.INTERNAL_ERROR, {
                code: TENANT_CODES.EXPORT_FAILED,
                message: TENANT_ERRORS.EXPORT_FAILED,
            });
        }

    }
});

/**
 * GET /revision - Récupérer uniquement la révision actuelle
 */
router.get('/revision', Ensure.get(), async (req: Request, res: Response) => {
    try {
        const revision = await Revision.getRevision(tableName.TENANT);

        R.handleSuccess(res, {
            revision,
            checked_at: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('⚠️ Erreur récupération révision:', error);
        R.handleError(res, HttpStatus.INTERNAL_ERROR, {
            code: TENANT_CODES.SEARCH_FAILED,
            message: 'Failed to get current revision',
        });
    }
});

/**
 * GET /country/:country_code - Lister les tenants par code pays
 */
router.get('/country/:country_code', Ensure.get(), async (req: Request, res: Response) => {
    try {
        const {country_code} = req.params;
        const validCountryCode = TenantValidationUtils.normalizeCountryCode(country_code);

        const paginationOptions = paginationSchema.parse(req.query);

        const tenantsData = await Tenant._listByCountryCode(validCountryCode, paginationOptions);
        const tenants = {
            country_code: validCountryCode,
            pagination: {
                offset: paginationOptions.offset || 0,
                limit: paginationOptions.limit || tenantsData?.length,
                count: tenantsData?.length || 0,
            },
            items: tenantsData?.map((tenant) => tenant.toJSON()) || [],
        };

        R.handleSuccess(res, {tenants});
    } catch (error: any) {
        console.error('⚠️ Erreur recherche par code pays:', error);
        if (error.issues) {
            return R.handleError(res, HttpStatus.BAD_REQUEST, {
                code: TENANT_CODES.COUNTRY_CODE_INVALID,
                message: TENANT_ERRORS.COUNTRY_CODE_INVALID,
            })
        } else {
            R.handleError(res, HttpStatus.INTERNAL_ERROR, {
                code: TENANT_CODES.SEARCH_FAILED,
                message: `Failed to search tenants by country: ${req.params.country_code}`,
            });
        }
    }
});

/**
 * GET /currency/:currency_code - Lister les tenants par code devise
 */
router.get('/currency/:currency_code', Ensure.get(), async (req: Request, res: Response) => {
    try {
        const {currency_code} = req.params;
        const validCurrencyCode = TenantValidationUtils.normalizeCurrencyCode(currency_code);

        const paginationOptions = paginationSchema.parse(req.query);

        const tenantsData = await Tenant._listByCurrencyCode(validCurrencyCode, paginationOptions);
        const tenants = {
            currency_code: validCurrencyCode,
            pagination: {
                offset: paginationOptions.offset || 0,
                limit: paginationOptions.limit || tenantsData?.length,
                count: tenantsData?.length || 0,
            },
            items: tenantsData?.map((tenant) => tenant.toJSON()) || [],
        };

        R.handleSuccess(res, {tenants});
    } catch (error: any) {
        console.error('⚠️ Erreur recherche par devise:', error);
        if (error.issues) {
            return R.handleError(res, HttpStatus.BAD_REQUEST, {
                code: TENANT_CODES.PRIMARY_CURRENCY_CODE_INVALID,
                message: TENANT_ERRORS.PRIMARY_CURRENCY_CODE_INVALID,
            })
        } else {
            R.handleError(res, HttpStatus.INTERNAL_ERROR, {
                code: TENANT_CODES.SEARCH_FAILED,
                message: `Failed to search tenants by currency: ${req.params.currency_code}`,
            });
        }
    }
});

/**
 * GET /language/:language_code - Lister les tenants par code de langue
 */
router.get('/language/:language_code', Ensure.get(), async (req: Request, res: Response) => {
    try {
        const {language_code} = req.params;
        const lowerLanguageCode = TenantValidationUtils.normalizeLanguageCode(language_code);

        const paginationOptions = paginationSchema.parse(req.query);

        const tenantsData = await Tenant._listByLanguageCode(lowerLanguageCode, paginationOptions);
        const tenants = {
            language_code: lowerLanguageCode,
            pagination: {
                offset: paginationOptions.offset || 0,
                limit: paginationOptions.limit || tenantsData?.length,
                count: tenantsData?.length || 0,
            },
            items: tenantsData?.map((tenant) => tenant.toJSON()) || [],
        };

        R.handleSuccess(res, {tenants});
    } catch (error: any) {
        console.error('⚠️ Erreur recherche par langue:', error);
        if (error.issues) {
            return R.handleError(res, HttpStatus.BAD_REQUEST, {
                code: TENANT_CODES.PREFERRED_LANGUAGE_CODE_INVALID,
                message: TENANT_ERRORS.PREFERRED_LANGUAGE_CODE_INVALID,
            })
        } else {
            R.handleError(res, HttpStatus.INTERNAL_ERROR, {
                code: TENANT_CODES.SEARCH_FAILED,
                message: `Failed to search tenants by language: ${req.params.language_code}`,
            });
        }
    }
});

/**
 * GET /timezone/:timezone - Lister les tenants par fuseau horaire
 */
router.get('/timezone/:timezone', Ensure.get(), async (req: Request, res: Response) => {
    try {
        const {timezone} = req.params;

        // Décoder l'URL pour gérer les fuseaux comme "Europe/Paris"
        const decodedTimezone = decodeURIComponent(timezone);

        const paginationOptions = paginationSchema.parse(req.query);

        const tenantsData = await Tenant._listByTimezone(decodedTimezone, paginationOptions);
        const tenants = {
            timezone: decodedTimezone,
            pagination: {
                offset: paginationOptions.offset || 0,
                limit: paginationOptions.limit || tenantsData?.length,
                count: tenantsData?.length || 0,
            },
            items: tenantsData?.map((tenant) => tenant.toJSON()) || [],
        };

        R.handleSuccess(res, {tenants});
    } catch (error: any) {
        console.error('⚠️ Erreur recherche par timezone:', error);
        if (error.issues) {
            return R.handleError(res, HttpStatus.BAD_REQUEST, {
                code: TENANT_CODES.PAGINATION_INVALID,
                message: 'Invalid pagination parameters',
                details: error.issues,
            })
        }
        R.handleError(res, HttpStatus.INTERNAL_ERROR, {
            code: TENANT_CODES.SEARCH_FAILED,
            message: `Failed to search tenants by timezone: ${req.params.timezone}`,
        });
    }
});

/**
 * GET /tax-exempt/:status - Lister les tenants par exemption fiscale
 */
router.get('/tax-exempt/:status', Ensure.get(), async (req: Request, res: Response) => {
    try {
        const {status} = req.params;
        const isTaxExempt = status.toLowerCase() === 'true' || status === '1';

        const paginationOptions = paginationSchema.parse(req.query);

        const tenantsData = await Tenant._listByTaxExempt(isTaxExempt, paginationOptions);
        const tenants = {
            tax_exempt: isTaxExempt,
            pagination: {
                offset: paginationOptions.offset || 0,
                limit: paginationOptions.limit || tenantsData?.length,
                count: tenantsData?.length || 0,
            },
            items: tenantsData?.map((tenant) => tenant.toJSON()) || [],
        };

        R.handleSuccess(res, {tenants});
    } catch (error: any) {
        console.error('⚠️ Erreur recherche par exemption fiscale:', error);
        if (error.issues) {
            return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
                code: TENANT_CODES.PAGINATION_INVALID,
                message: 'Invalid pagination parameters',
                details: error.issues,
            })
        } else {
            return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
                code: TENANT_CODES.SEARCH_FAILED,
                message: `Failed to search tenants by tax exemption: ${req.params.status}`,
            });
        }

    }
});

/**
 * GET /status/:status - Lister les tenants par statut
 */
router.get('/status/:status', Ensure.get(), async (req: Request, res: Response) => {
    try {
        const {status} = req.params;

        // Validation du statut
        const validStatus = TenantValidationUtils.validateStatus(status);
        if (!validStatus) {
            return R.handleError(res, HttpStatus.BAD_REQUEST, {
                code: TENANT_CODES.STATUS_INVALID,
                message: TENANT_ERRORS.STATUS_INVALID,
            })
        }

        const paginationOptions = paginationSchema.parse(req.query);

        const tenantsData = await Tenant._listByStatus(status as Status, paginationOptions);
        const tenants = {
            status: status,
            pagination: {
                offset: paginationOptions.offset || 0,
                limit: paginationOptions.limit || tenantsData?.length,
                count: tenantsData?.length || 0,
            },
            items: tenantsData?.map((tenant) => tenant.toJSON()) || [],
        };

        R.handleSuccess(res, {tenants});
    } catch (error: any) {
        console.error('⚠️ Erreur recherche par statut:', error);
        if (error.issues) {
            return R.handleError(res, HttpStatus.BAD_REQUEST, {
                code: TENANT_CODES.STATUS_INVALID,
                message: 'Invalid pagination parameters',
                details: error.issues,
            })
        } else {
            R.handleError(res, HttpStatus.INTERNAL_ERROR, {
                code: TENANT_CODES.SEARCH_FAILED,
                message: `Failed to search tenants by status: ${req.params.status}`,
            });
        }
    }
});

// endregion

// region ROUTES CRUD

/**
 * POST / - Créer un nouveau tenant
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
    try {
        const validatedData = TN.validateTenantCreation(req.body);

        const tenantObj = new Tenant()
            .setName(validatedData.name)
            .setCountryCode(validatedData.country_code)
            .setPrimaryCurrencyCode(validatedData.primary_currency_code)
            .setBillingEmail(validatedData.billing_email)
            .setBillingAddress(validatedData.billing_address)
            .setEmployeeCount(validatedData.employee_count)

        if (validatedData.preferred_language_code) tenantObj.setPreferredLanguageCode(validatedData.preferred_language_code);
        if (validatedData.timezone) tenantObj.setTimezone(validatedData.timezone);
        if (validatedData.tax_number) tenantObj.setTaxNumber(validatedData.tax_number);
        // if (validatedData.tax_exempt !== undefined) tenantObj.setTaxExempt(validatedData.tax_exempt);
        // if (validatedData.billing_address) tenantObj.setBillingAddress(validatedData.billing_address);
        if (validatedData.billing_phone) tenantObj.setBillingPhone(validatedData.billing_phone);
        if (validatedData.short_name) tenantObj.setShortName(validatedData.short_name);
        if (validatedData.registration_number) tenantObj.setRegistrationNumber(validatedData.registration_number);

        await tenantObj.save();

        console.log(`✅ Tenant créé: ${validatedData.country_code} - ${validatedData.name} (GUID: ${tenantObj.getGuid()})`);
        return R.handleCreated(res, tenantObj.toJSON());
    } catch (error: any) {
        console.error('⚠️ Erreur création tenant:', error.message);

        if (error.issues) { // Erreur Zod
            return R.handleError(res, HttpStatus.BAD_REQUEST, {
                code: TENANT_CODES.VALIDATION_FAILED,
                message: 'Validation failed',
                details: error.issues,
            });
        } else if (error.message.includes('already exists')) {
            return R.handleError(res, HttpStatus.CONFLICT, {
                code: TENANT_CODES.TENANT_ALREADY_EXISTS,
                message: error.message,
            });
        } else if (error.message.includes('required')) {
            return R.handleError(res, HttpStatus.BAD_REQUEST, {
                code: TENANT_CODES.VALIDATION_FAILED,
                message: error.message,
            });
        } else {
            return R.handleError(res, HttpStatus.BAD_REQUEST, {
                code: TENANT_CODES.CREATION_FAILED,
                message: error.message,
            });
        }
    }
});

/**
 * PUT /:guid - Modifier un tenant par GUID
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
    try {
        // const validGuid = TenantValidationUtils.validateTenantGuid(req.params.guid);
        const validGuid = TN.validateTenantGuid(req.params.guid);

        // Charger par GUID
        const tenantObj = await Tenant._load(validGuid, true);
        if (!tenantObj) {
            return R.handleError(res, HttpStatus.NOT_FOUND, {
                code: TENANT_CODES.TENANT_NOT_FOUND,
                message: TENANT_ERRORS.NOT_FOUND,
            });
        }
        // const {
        //   name,
        //   country_code,
        //   primary_currency_code,
        //   preferred_language_code,
        //   timezone,
        //   tax_number,
        //   tax_exempt,
        //   billing_email,
        //   billing_address,
        //   billing_phone,
        // } = req.body;

        const validateData = TN.validateTenantUpdate(req.body);

        // Mise à jour des champs fournis
        if (validateData.name !== undefined) tenantObj.setName(validateData.name);
        if (validateData.short_name !== undefined) tenantObj.setShortName(validateData.short_name);
        if (validateData.country_code !== undefined) tenantObj.setCountryCode(validateData.country_code);
        if (validateData.primary_currency_code !== undefined) tenantObj.setPrimaryCurrencyCode(validateData.primary_currency_code);
        if (validateData.preferred_language_code !== undefined) tenantObj.setPreferredLanguageCode(validateData.preferred_language_code);
        if (validateData.timezone !== undefined) tenantObj.setTimezone(validateData.timezone);
        if (validateData.tax_number !== undefined) tenantObj.setTaxNumber(validateData.tax_number);
        if (validateData.tax_exempt !== undefined) tenantObj.setTaxExempt(validateData.tax_exempt);
        if (validateData.billing_email !== undefined) tenantObj.setBillingEmail(validateData.billing_email);
        if (validateData.billing_address !== undefined) tenantObj.setBillingAddress(validateData.billing_address);
        if (validateData.billing_phone !== undefined) tenantObj.setBillingPhone(validateData.billing_phone);
      if (validateData.registration_number !== undefined) tenantObj.setRegistrationNumber(validateData.registration_number);
      if (validateData.employee_count !== undefined) tenantObj.setEmployeeCount(validateData.employee_count);

        await tenantObj.save();

        console.log(`✅ Tenant modifié: GUID ${validGuid}`);
        R.handleSuccess(res, tenantObj.toJSON());
    } catch (error: any) {
        console.error('⚠️ Erreur modification tenant:', error);

        if (error.issues) {
          return R.handleError(res, HttpStatus.BAD_REQUEST, {
            code: TENANT_CODES.INVALID_GUID,
            message: TENANT_ERRORS.GUID_INVALID,
          })
        }
        else if (error.message.includes('already exists')) {
            return R.handleError(res, HttpStatus.CONFLICT, {
                code: TENANT_CODES.TENANT_ALREADY_EXISTS,
                message: error.message,
            });
        } else if (error.message.includes('required')) {
           return R.handleError(res, HttpStatus.BAD_REQUEST, {
                code: TENANT_CODES.VALIDATION_FAILED,
                message: error.message,
            });
        } else {
           return R.handleError(res, HttpStatus.BAD_REQUEST, {
                code: TENANT_CODES.UPDATE_FAILED,
                message: error.message,
            });
        }
    }
});

/**
 * PUT /:guid/database - Définir la configuration de base de données d'un tenant
 */
router.put('/:guid/database', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validGuid = TN.validateTenantGuid(req.params.guid);

    // Charger le tenant par GUID
    const tenantObj = await Tenant._load(validGuid, true);
    if (!tenantObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TENANT_CODES.TENANT_NOT_FOUND,
        message: TENANT_ERRORS.NOT_FOUND,
      });
    }

    const validGlobalLicense = await GlobalLicense._listByTenant(tenantObj.getId()!)

    if (!validGlobalLicense ||!validGlobalLicense.some(lic => lic.getLicenseStatus() === LicenseStatus.ACTIVE)
    ) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      })
    }

    const { subdomain, database_name, database_username, database_password } = req.body;

    // Validation des champs requis
    if (!subdomain || !database_name || !database_username || !database_password) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.VALIDATION_FAILED,
        message: 'All database configuration fields are required',
      });
    }

    // Validation avec les utilitaires existants
    if (!TenantValidationUtils.validateSubdomain(subdomain)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.SUBDOMAIN_INVALID,
        message: TENANT_ERRORS.SUBDOMAIN_INVALID,
      });
    }

    if (!TenantValidationUtils.validateDatabaseName(database_name)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.DATABASE_NAME_INVALID,
        message: TENANT_ERRORS.DATABASE_NAME_INVALID,
      });
    }

    if (!TenantValidationUtils.validateDatabaseUsername(database_username)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.DATABASE_USERNAME_INVALID,
        message: TENANT_ERRORS.DATABASE_USERNAME_INVALID,
      });
    }

    if (!TenantValidationUtils.validateDatabasePassword(database_password)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.DATABASE_PASSWORD_INVALID,
        message: TENANT_ERRORS.DATABASE_PASSWORD_INVALID,
      });
    }

    // Définir la configuration
    tenantObj.setDatabaseConfig(subdomain, database_name, database_username, database_password);
    await tenantObj.defineDatabaseConfig();

    console.log(`✅ Configuration DB définie pour tenant GUID: ${validGuid}`);

    return R.handleSuccess(res, {
      message: 'Database configuration defined successfully',
      tenant_guid: validGuid,
      subdomain: subdomain,
      database_name: database_name,
      database_username: database_username,
    });

  } catch (error: any) {
    console.error('⚠️ Erreur définition config DB:', error);

    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.INVALID_GUID,
        message: TENANT_ERRORS.GUID_INVALID,
      });
    } else if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: TENANT_CODES.SUBDOMAIN_INVALID,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TENANT_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * DELETE /:guid - Supprimer un tenant par GUID
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
    try {
      const validGuid = TN.validateTenantGuid(req.params.guid);

        // Charger par GUID
        const tenant = await Tenant._load(validGuid, true);
        if (!tenant) {
            return R.handleError(res, HttpStatus.NOT_FOUND, {
                code: TENANT_CODES.TENANT_NOT_FOUND,
                message: TENANT_ERRORS.NOT_FOUND,
            });
        }

        const deleted = await tenant.delete();

        if (deleted) {
            console.log(`✅ Tenant supprimé: GUID ${validGuid} (${tenant.getKey()} - ${tenant.getName()})`);
            R.handleSuccess(res, {
                message: 'Tenant deleted successfully',
                guid: validGuid,
                key: tenant.getKey(),
                name: tenant.getName(),
            });
        } else {
            R.handleError(res, HttpStatus.INTERNAL_ERROR, G.savedError);
        }
    } catch (error: any) {
      console.error('⚠️ Erreur suppression tenant:', error);

      if (error.issues) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: TENANT_CODES.INVALID_GUID,
          message: TENANT_ERRORS.GUID_INVALID,
        })
      }
      else {
        R.handleError(res, HttpStatus.INTERNAL_ERROR, {
          code: TENANT_CODES.DELETE_FAILED,
          message: error.message,
        });
      }
    }
});

// endregion

// region ROUTES UTILITAIRES

/**
 * GET /list - Lister tous les tenants (pour admin)
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
    try {
        const filters = TN.validateTenantFilters(req.query);
        const paginationOptions = paginationSchema.parse(req.query);

        const conditions: Record<string, any> = {};

        if (filters.country_code) {
            conditions.country_code = filters.country_code;
        }
        if (filters.primary_currency_code) {
            conditions.primary_currency_code = filters.primary_currency_code;
        }
        if (filters.preferred_language_code) {
            conditions.preferred_language_code = filters.preferred_language_code;
        }
        if (filters.timezone) {
            conditions.timezone = filters.timezone;
        }
        if (filters.tax_exempt !== undefined) {
            conditions.tax_exempt = filters.tax_exempt;
        }
        if (filters.status) {
            conditions.status = filters.status;
        }

        const tenantEntries = await Tenant._list(conditions, paginationOptions);
        const tenants = {
            pagination: {
                offset: paginationOptions.offset || 0,
                limit: paginationOptions.limit || tenantEntries?.length,
                count: tenantEntries?.length || 0,
            },
            items: tenantEntries?.map((tenant) => tenant.toJSON()) || [],
        };

        R.handleSuccess(res, {tenants});
    } catch (error: any) {
        console.error('⚠️ Erreur listing tenants:', error);
      if (error.issues) { // Erreur Zod
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: TENANT_CODES.VALIDATION_FAILED,
          message: 'Invalid filters or pagination parameters',
          details: error.issues,
        });
      } else {
        return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
          code: TENANT_CODES.LISTING_FAILED,
          message: TENANT_ERRORS.EXPORT_FAILED,
        });
      }
    }
});

/**
 * GET /search/key/:key - Rechercher par clé
 */
router.get('/search/key/:key', Ensure.get(), async (req: Request, res: Response) => {
    try {
        const {key} = req.params;

        if (!TenantValidationUtils.validateKey(key)) {
          return R.handleError(res, HttpStatus.BAD_REQUEST, {
            code: TENANT_CODES.KEY_INVALID,
            message: TENANT_ERRORS.KEY_INVALID,
          })
        }
        const tenant = await Tenant._load(key, false, true);

        if (!tenant) {
            return R.handleError(res, HttpStatus.NOT_FOUND, {
                code: TENANT_CODES.TENANT_NOT_FOUND,
                message: `Tenant with key '${key}' not found`,
            });
        }

        return R.handleSuccess(res, tenant.toJSON());
    } catch (error: any) {
        console.error('⚠️ Erreur recherche par clé:', error);
        return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
            code: TENANT_CODES.SEARCH_FAILED,
            message: `${TENANT_ERRORS.NOT_FOUND}: ${error.message}`,
        });
    }
});

/**
 * GET /search/subdomain/:subdomain - Rechercher par sous-domaine
 */
router.get('/search/subdomain/:subdomain', Ensure.get(), async (req: Request, res: Response) => {
    try {
        const {subdomain} = req.params;
        if (!TenantValidationUtils.validateSubdomain(subdomain)) {
          return R.handleError(res, HttpStatus.BAD_REQUEST, {
            code: TENANT_CODES.SUBDOMAIN_INVALID,
            message: TENANT_ERRORS.SUBDOMAIN_INVALID,
          })
        }
        const tenant = await Tenant._load(subdomain.toLowerCase(), false, false, true);
        if (!tenant) {
            return R.handleError(res, HttpStatus.NOT_FOUND, {
                code: TENANT_CODES.TENANT_NOT_FOUND,
                message: `Tenant with subdomain '${subdomain}' not found`,
            });
        }

        return R.handleSuccess(res, tenant.toJSON());
    } catch (error: any) {
        console.error('⚠️ Erreur recherche par sous-domaine:', error);
        R.handleError(res, HttpStatus.INTERNAL_ERROR, {
            code: TENANT_CODES.SEARCH_FAILED,
            message: `${TENANT_ERRORS.NOT_FOUND}: ${error.message}`,
        });
    }
});

/**
 * GET /:identifier - Recherche intelligente par ID, GUID, clé ou sous-domaine
 */
router.get('/:identifier', Ensure.get(), async (req: Request, res: Response) => {
    try {
        const {identifier} = req.params;
        let tenant: Tenant | null = null;

        // Essayer différentes méthodes de recherche selon le format
        if (/^\d+$/.test(identifier)) {
            const numericId = parseInt(identifier);

            // Essayer par ID d'abord
            tenant = await Tenant._load(numericId);

            // Si pas trouvé, essayer par GUID
            if (!tenant) {
                tenant = await Tenant._load(numericId, true);
            }
        } else {
            // Essayer par clé d'abord
            tenant = await Tenant._load(identifier, false, true);

            // Si pas trouvé, essayer par sous-domaine
            if (!tenant) {
                tenant = await Tenant._load(identifier.toLowerCase(), false, false, true);
            }
        }

        if (!tenant) {
            return R.handleError(res, HttpStatus.NOT_FOUND, {
                code: 'tenant_not_found',
                message: `Tenant with identifier '${identifier}' not found`,
            });
        }

        R.handleSuccess(res, tenant.toJSON());
    } catch (error: any) {
        console.error('⚠️ Erreur recherche tenant:', error);
        R.handleError(res, HttpStatus.INTERNAL_ERROR, {
            code: TENANT_CODES.SEARCH_FAILED,
            message: TENANT_ERRORS.NOT_FOUND,
        });
    }
});

// endregion

router.get('/otp/:phone', Ensure.get(), async (req: Request, res: Response) => {
    try {
        const {phone} = req.params;
        const validatePhone = TenantValidationUtils.validateBillingPhone(phone);
        if (!validatePhone){
          return R.handleError(res, HttpStatus.BAD_REQUEST, {
            code: TENANT_CODES.BILLING_PHONE_INVALID,
            message: TENANT_ERRORS.BILLING_PHONE_INVALID,
          })
        }
        const generateOtp = GenerateOtp.generateOTP(6);
        return R.handleSuccess(res, {otp: generateOtp});
    } catch (error: any){
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TENANT_CODES.CREATION_FAILED,
        message: error.message,
      })
    }
})

export default router;