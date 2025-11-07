import { Request, Response, Router } from 'express';
import {
  COUNTRY_ERRORS,
  CountryValidationUtils,
  GLOBAL_LICENSE_CODES,
  GLOBAL_LICENSE_ERRORS,
  HttpStatus,
  LicenseStatus,
  paginationSchema,
  Status,
  TENANT_CODES,
  TENANT_ERRORS,
  TenantValidationUtils,
  TN,
} from '@toke/shared';

import Tenant from '../class/Tenant.js';
import R from '../../tools/response.js';
import G from '../../tools/glossary.js';
import Ensure from '../../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';
import GlobalLicense from '../class/GlobalLicense.js';
import TenantConfig from '../../utils/generate.tenant.config.js';
import ManageTenantDatabase from '../../utils/generate.database.js';
import TenantCacheService from '../../tools/tenant-cache.service.js';
import TenantManager from '../../tenant/database/db.tenant-manager.js';
import { TableInitializer } from '../../tenant/database/db.initializer.js';
import Country from '../class/Country.js';
import TenantOtpManager from '../../tools/tenant.otp.manager.js';
import OTPCacheService from '../../tools/otp-cache.service.js';
import WapService from '../../tools/send.otp.service.js';
import EmailSender from '../../tools/send.email.service.js';
import { Contact } from '../class/Contact.js';
import CountryPhoneValidation from '../../tools/country.phone.validation.js';

const otpManager = new TenantOtpManager();

const router = Router();

// region ROUTES D'EXPORT

/**
 * GET / - Exporter tous les tenants
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const tenants = await Tenant.exportable(paginationOptions);
    R.handleSuccess(res, { tenants });
  } catch (error: any) {
    console.error('⚠️ Erreur export tenants:', error);
    if (error.issues) {
      // Erreur Zod
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
    const { country_code } = req.params;
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

    R.handleSuccess(res, { tenants });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par code pays:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.COUNTRY_CODE_INVALID,
        message: TENANT_ERRORS.COUNTRY_CODE_INVALID,
      });
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
    const { currency_code } = req.params;
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

    R.handleSuccess(res, { tenants });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par devise:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.PRIMARY_CURRENCY_CODE_INVALID,
        message: TENANT_ERRORS.PRIMARY_CURRENCY_CODE_INVALID,
      });
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
    const { language_code } = req.params;
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

    R.handleSuccess(res, { tenants });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par langue:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.PREFERRED_LANGUAGE_CODE_INVALID,
        message: TENANT_ERRORS.PREFERRED_LANGUAGE_CODE_INVALID,
      });
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
    const { timezone } = req.params;

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

    R.handleSuccess(res, { tenants });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par timezone:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.PAGINATION_INVALID,
        message: 'Invalid pagination parameters',
        details: error.issues,
      });
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
    const { status } = req.params;
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

    R.handleSuccess(res, { tenants });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par exemption fiscale:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TENANT_CODES.PAGINATION_INVALID,
        message: 'Invalid pagination parameters',
        details: error.issues,
      });
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
    const { status } = req.params;

    // Validation du statut
    const validStatus = TenantValidationUtils.validateStatus(status);
    if (!validStatus) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.STATUS_INVALID,
        message: TENANT_ERRORS.STATUS_INVALID,
      });
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

    R.handleSuccess(res, { tenants });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par statut:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.STATUS_INVALID,
        message: 'Invalid pagination parameters',
        details: error.issues,
      });
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

    // // Normalisation du code pays
    // const countryCode = validatedData.country_code?.toUpperCase();
    //
    // // Vérifie que le code pays existe bien dans libphonenumber-js
    // const isCountryValid = countryCode && getCountries().includes(countryCode as CountryCode);
    //
    // if (
    //   validatedData.billing_phone &&
    //   (!isCountryValid ||
    //     !isValidPhoneNumber(validatedData.billing_phone, countryCode as CountryCode))
    // ) {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: TENANT_CODES.BILLING_PHONE_INVALID,
    //     message: TENANT_ERRORS.BILLING_PHONE_INVALID,
    //   });
    // }

    if (
      validatedData.billing_phone &&
      !CountryPhoneValidation.validatePhoneNumber(
        validatedData.billing_phone,
        validatedData.country_code,
      )
    ) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.BILLING_PHONE_INVALID,
        message: TENANT_ERRORS.BILLING_PHONE_INVALID,
      });
    }
    const tenantObj = new Tenant()
      .setName(validatedData.name)
      .setCountryCode(validatedData.country_code)
      .setPrimaryCurrencyCode(validatedData.primary_currency_code)
      .setBillingEmail(validatedData.billing_email)
      .setBillingAddress(validatedData.billing_address)
      .setEmployeeCount(validatedData.employee_count)
      .setTaxNumber(validatedData.tax_number);

    if (validatedData.preferred_language_code)
      tenantObj.setPreferredLanguageCode(validatedData.preferred_language_code);
    if (validatedData.timezone) tenantObj.setTimezone(validatedData.timezone);
    // if (validatedData.tax_number) tenantObj.setTaxNumber(validatedData.tax_number);
    // if (validatedData.tax_exempt !== undefined) tenantObj.setTaxExempt(validatedData.tax_exempt);
    // if (validatedData.billing_address) tenantObj.setBillingAddress(validatedData.billing_address);
    if (validatedData.billing_phone) tenantObj.setBillingPhone(validatedData.billing_phone);
    if (validatedData.short_name) tenantObj.setShortName(validatedData.short_name);
    if (validatedData.registration_number)
      tenantObj.setRegistrationNumber(validatedData.registration_number);

    await tenantObj.save();
    try {
      await EmailSender.licensePayment(
        tenantObj.getName()!,
        tenantObj.getBillingEmail()!,
        tenantObj.getGuid()!.toString(),
      );
    } catch (err) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'EMAIL_SENDING_FAILED',
        message: (err as Error).message,
      });
    }

    console.log(
      `✅ Tenant créé: ${validatedData.country_code} - ${validatedData.name} (GUID: ${tenantObj.getGuid()})`,
    );
    return R.handleCreated(res, tenantObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur création tenant:', error.message);

    if (error.issues) {
      // Erreur Zod
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
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
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
    const validateData = TN.validateTenantUpdate(req.body);

    // Mise à jour des champs fournis
    if (validateData.name !== undefined) tenantObj.setName(validateData.name);
    if (validateData.short_name !== undefined) tenantObj.setShortName(validateData.short_name);
    if (validateData.country_code !== undefined)
      tenantObj.setCountryCode(validateData.country_code);
    if (validateData.primary_currency_code !== undefined)
      tenantObj.setPrimaryCurrencyCode(validateData.primary_currency_code);
    if (validateData.preferred_language_code !== undefined)
      tenantObj.setPreferredLanguageCode(validateData.preferred_language_code);
    if (validateData.timezone !== undefined) tenantObj.setTimezone(validateData.timezone);
    if (validateData.tax_number !== undefined) tenantObj.setTaxNumber(validateData.tax_number);
    if (validateData.tax_exempt !== undefined) tenantObj.setTaxExempt(validateData.tax_exempt);
    if (validateData.billing_email !== undefined)
      tenantObj.setBillingEmail(validateData.billing_email);
    if (validateData.billing_address !== undefined)
      tenantObj.setBillingAddress(validateData.billing_address);
    if (validateData.billing_phone !== undefined)
      tenantObj.setBillingPhone(validateData.billing_phone);
    if (validateData.registration_number !== undefined)
      tenantObj.setRegistrationNumber(validateData.registration_number);
    if (validateData.employee_count !== undefined)
      tenantObj.setEmployeeCount(validateData.employee_count);

    await tenantObj.save();

    console.log(`✅ Tenant modifié: GUID ${validGuid}`);
    R.handleSuccess(res, tenantObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur modification tenant:', error);

    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.INVALID_GUID,
        message: TENANT_ERRORS.GUID_INVALID,
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
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TENANT_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * PATCH /:guid/database - Définir la configuration de base de données d'un tenant
 */
router.patch('/:guid/database', Ensure.patch(), async (req: Request, res: Response) => {
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

    const validGlobalLicense = await GlobalLicense._load(tenantObj.getId()!, false, true);

    if (!validGlobalLicense || validGlobalLicense.getLicenseStatus() !== LicenseStatus.ACTIVE) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    const tenantConfig = await TenantConfig.generateTenantConfig(
      tenantObj.getName()!,
      tenantObj.getGuid()!,
    );

    // Définir la configuration
    tenantObj.setDatabaseConfig(
      tenantConfig.database_name,
      tenantConfig.database_username,
      tenantConfig.database_password,
    );
    await tenantObj.defineDatabaseConfig();

    const createDb = await ManageTenantDatabase.createDatabase(
      tenantObj.getDatabaseName()!,
      tenantObj.getDatabaseUsername()!,
      tenantObj.getDatabasePassword()!,
    );
    if (!createDb.success) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'db_creation_failed',
        message: createDb.error, // 💡 renvoie l’erreur PostgreSQL réelle
      });
    }

    console.log(`✅ Configuration DB définie pour tenant GUID: ${validGuid}`);

    return R.handleSuccess(res, {
      message: 'Database configuration defined successfully',
      tenant_guid: validGuid,
      // database_name: tenantConfig.database_name,
      // database_username: tenantConfig.database_username,
      // database_password: tenantConfig.database_password,
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

router.patch('/:guid/subdomain', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = TN.validateTenantGuid(req.params.guid);

    const tenantObj = await Tenant._load(validGuid, true);
    if (!tenantObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TENANT_CODES.TENANT_NOT_FOUND,
        message: TENANT_ERRORS.NOT_FOUND,
      });
    }
    if (!tenantObj.getDatabaseName()) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TENANT_CODES.DATABASE_CONFIG_NOT_FOUND,
        message: TENANT_ERRORS.DATABASE_CONFIG_NOT_FOUND,
      });
    }

    const { subdomain } = req.body;

    // Validation avec les utilitaires existants
    if (!TenantValidationUtils.validateSubdomain(subdomain)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.SUBDOMAIN_INVALID,
        message: TENANT_ERRORS.SUBDOMAIN_INVALID,
      });
    }

    tenantObj.setSubdomain(subdomain);

    await tenantObj.defineDbSubdomain();

    await TenantCacheService.setTenantConfig(tenantObj.getSubdomain()!, {
      host: process.env.DB_HOST || tenantObj.getSubdomain()!,
      port: parseInt(process.env.DB_PORT ? process.env.DB_PORT : '5432'),
      username: tenantObj.getDatabaseUsername()!,
      password: tenantObj.getDatabasePassword()!,
      database: tenantObj.getDatabaseName()!,
      active: tenantObj.isActive(),
      reference: tenantObj.getGuid()!.toString(),
      name: tenantObj.getName()!,
      address: tenantObj.getBillingAddress()!,
      country: tenantObj.getCountryCode()!,
      email: tenantObj.getBillingEmail()!,
      phone: tenantObj.getBillingPhone()!,
    });

    // 3. Récupérer la configuration du tenant depuis le cache
    const tenantConfig = await TenantCacheService.getTenantConfig(subdomain);
    if (!tenantConfig) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'tenant_not_found',
        message: `Tenant parameter system not found`,
      });
    }

    // 4. Définir le tenant actuel dans TenantManager
    TenantManager.setCurrentTenant(subdomain);
    // await ManageTenantDatabase.initializeDatabase()

    // 5. Initialiser la connexion DB pour ce tenant
    const connection = await TenantManager.getConnectionForTenant(subdomain, {
      host: tenantConfig.host,
      port: tenantConfig.port,
      username: tenantConfig.username,
      password: tenantConfig.password,
      database: tenantConfig.database,
    });

    // 2. Initialiser toutes les tables (statique)
    await TableInitializer.initialize(connection);

    return R.handleSuccess(res, {
      message: 'Tenant subdomain has been set successfully',
      tenant_guid: validGuid,
      // subdomain: tenantObj.getSubdomain()!,
      // database_name: tenantObj.getDatabaseName()!,
      // database_username: tenantObj.getDatabaseUsername()!,
      // database_password: tenantObj.getDatabasePassword()!,
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
        details: error,
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
      console.log(
        `✅ Tenant supprimé: GUID ${validGuid} (${tenant.getKey()} - ${tenant.getName()})`,
      );
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
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TENANT_CODES.DELETE_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/:guid/check', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!TenantValidationUtils.validateTenantGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.INVALID_GUID,
        message: TENANT_ERRORS.GUID_INVALID,
      });
    }
    const tenant = await Tenant._load(parseInt(guid, 10), true);
    if (!tenant) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TENANT_CODES.TENANT_NOT_FOUND,
        message: TENANT_ERRORS.NOT_FOUND,
      });
    }
    if (!tenant.getSubdomain() || !tenant.getDatabaseName()) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TENANT_CODES.DATABASE_CONFIG_NOT_FOUND,
        message: TENANT_ERRORS.DATABASE_CONFIG_NOT_FOUND,
      });
    }
    return R.handleSuccess(res, {
      message: `System tenant ${tenant.getName()} is active`,
      tenant: tenant.toJSON(),
      subdomain: tenant.getSubdomain(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TENANT_CODES.SEARCH_FAILED,
      message: `${TENANT_ERRORS.NOT_FOUND}: ${error.message}`,
    });
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

    R.handleSuccess(res, { tenants });
  } catch (error: any) {
    console.error('⚠️ Erreur listing tenants:', error);
    if (error.issues) {
      // Erreur Zod
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
    const { key } = req.params;

    if (!TenantValidationUtils.validateKey(key)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.KEY_INVALID,
        message: TENANT_ERRORS.KEY_INVALID,
      });
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
    const { subdomain } = req.params;
    if (!TenantValidationUtils.validateSubdomain(subdomain)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.SUBDOMAIN_INVALID,
        message: TENANT_ERRORS.SUBDOMAIN_INVALID,
      });
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
    const { identifier } = req.params;
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

// router.post('/otp', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     const { phone, country } = req.body;
//     const validatePhone = TenantValidationUtils.validateBillingPhone(phone);
//     const validateCountry = CountryValidationUtils.validateIsoCode(country);
//     if (!validateCountry) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: 'invalid_country',
//         message: COUNTRY_ERRORS.CODE_INVALID,
//       });
//     }
//
//     const countryObj = await Country._load(country, false, true);
//     if (!countryObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: 'country_not_found',
//         message: COUNTRY_ERRORS.NOT_FOUND,
//       });
//     }
//
//     if (!validatePhone) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: TENANT_CODES.BILLING_PHONE_INVALID,
//         message: TENANT_ERRORS.BILLING_PHONE_INVALID,
//       });
//     }
//     const generateOtp = await otpManager.generateAndStoreOTP(phone);
//     if (!generateOtp) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: 'OTP_generator_failed',
//         message: 'An error has occurred during otp generation',
//       });
//     }
//     const result = await WapService.sendOtp(generateOtp, phone, country);
//     if (result.status !== HttpStatus.CREATED) {
//       await otpManager.deleteOTP(generateOtp);
//
//       return R.handleError(res, result.status, result.response);
//     }
//
//     return R.handleNoContent(res);
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: TENANT_CODES.CREATION_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// /**
//  * PATCH / - Vérifier l'OTP généré
//  */
// router.patch('/verify-otp', Ensure.patch(), async (req: Request, res: Response) => {
//   try {
//     const { otp, phone } = req.body;
//     if (!otp) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: 'invalid_otp',
//         message: 'OTP must be a valid string',
//       });
//     }
//     // Utiliser le service d'authentification
//     const result = await otpManager.verifyOTP(otp.toString());
//
//     if (!result) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: 'otp_verification_failed',
//         message: 'otp verification failed',
//       });
//     }
//
//     if (result.phone !== phone) {
//       return R.handleError(res, HttpStatus.FORBIDDEN, {
//         code: 'verification_failed',
//         message: 'tenant otp verification failed',
//       });
//     }
//
//     return R.handleSuccess(res, {
//       message: 'Tenant otp verification successfully ',
//       tenant: result.phone,
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: 'internal_server_error',
//       message: error.message,
//     });
//   }
// });

/**
 * POST /otp - Générer et envoyer un OTP
 */
router.post('/otp', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { phone, country, email } = req.body;

    if (!phone && !email) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.VALIDATION_FAILED,
        message: 'Entries are required',
      });
    }

    // Validation du téléphone
    if (phone) {
      // Validation du pays
      const validateCountry = CountryValidationUtils.validateIsoCode(country);
      if (!validateCountry) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'invalid_country',
          message: COUNTRY_ERRORS.CODE_INVALID,
        });
      }

      const countryObj = await Country._load(country, false, true);
      if (!countryObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: 'country_not_found',
          message: COUNTRY_ERRORS.NOT_FOUND,
        });
      }

      const validatePhone = TenantValidationUtils.validateBillingPhone(phone);
      if (!validatePhone) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: TENANT_CODES.BILLING_PHONE_INVALID,
          message: TENANT_ERRORS.BILLING_PHONE_INVALID,
        });
      }
    }

    if (email) {
      const validateEmail = TenantValidationUtils.validateBillingEmail(email);
      if (!validateEmail) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: TENANT_CODES.BILLING_EMAIL_INVALID,
          message: TENANT_ERRORS.BILLING_EMAIL_INVALID,
        });
      }
    }

    const value = phone || email;

    // Générer l'OTP
    const generateOtp = await OTPCacheService.generateAndStoreOTP(value);
    if (!generateOtp) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'OTP_generator_failed',
        message: 'An error has occurred during otp generation',
      });
    }

    let verify: boolean | undefined = undefined;

    // Envoyer l'OTP via WhatsApp
    if (phone && country) {
      if (!CountryPhoneValidation.validatePhoneNumber(phone, country)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'invalid_phone_number',
          message: 'The phone number must comply with the valid phone number format.',
        });
      }

      const contactObj = await Contact._load(value, false, true);

      if (!contactObj) {
        // Numéro inconnu : on envoie l’OTP
        verify = false;
        const result = await WapService.sendOtp(generateOtp, phone, country);
        if (result.status !== HttpStatus.SUCCESS) {
          await OTPCacheService.deleteOTP(generateOtp);
          return R.handleError(res, result.status, result.response);
        }
      } else {
        // Numéro déjà existant → ne pas envoyer l’OTP
        verify = true;
      }
    } else if (email) {
      try {
        await EmailSender.sender(generateOtp, email);
      } catch (err) {
        await OTPCacheService.deleteOTP(generateOtp);
        return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
          code: 'EMAIL_SENDING_FAILED',
          message: (err as Error).message,
        });
      }
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'entries_are_required',
        message: 'failed to send otp: entries are required',
      });
    }

    // === RÉPONSE ===
    const response: any = {
      message: 'OTP successfully sent',
      // reference: phone || email,
    };

    if (phone) {
      response.verify = verify;
      response.phone = phone;
    } else {
      response.email = email;
    }

    return R.handleSuccess(res, response);
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TENANT_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /verify-otp - Vérifier l'OTP généré
 */
router.patch('/verify-otp', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { otp, phone, email } = req.body;

    // Validation de l'OTP
    if (!otp) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_otp',
        message: 'OTP must be a valid string',
      });
    }

    // Vérifie qu'au moins une entrée (phone ou email) est fournie
    if (!phone && !email) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'missing_reference',
        message: 'Either phone or email is required for verification',
      });
    }

    // Vérifier l'OTP
    const result = await OTPCacheService.verifyOTP(otp.toString());

    if (!result) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'otp_verification_failed',
        message:
          'OTP verification failed. OTP may be invalid, expired, or maximum attempts reached.',
      });
    }

    // Vérifie la correspondance du téléphone ou de l'email
    const reference = phone || email;

    // Vérifier que le téléphone correspond
    if (result.phone !== reference) {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: 'verification_failed',
        message: 'Reference (phone/email) does not match the OTP',
      });
    }

    // Supprimer l'OTP après vérification réussie
    await OTPCacheService.deleteOTP(otp.toString());

    if (result.phone === phone) {
      const contactObj = new Contact().setPhone(phone);
      try {
        await contactObj.save();
      } catch (err) {
        return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
          code: 'contact_creation_failed',
          message: (err as Error).message,
        });
      }
    }

    // Réponse dynamique selon le type de référence
    const response: any = {
      message: 'OTP verified successfully',
    };
    if (phone) response.phone = phone;
    if (email) response.email = email;
    return R.handleSuccess(res, response);
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'internal_server_error',
      message: error.message,
    });
  }
});

/**
 * GET /otp/stats - Statistiques des OTP (pour admin/debug)
 */
router.get('/otp/stats', async (req: Request, res: Response) => {
  try {
    const stats = OTPCacheService.getStats();
    return R.handleSuccess(res, stats);
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'internal_server_error',
      message: error.message,
    });
  }
});

/**
 * GET /otp/list - Liste des OTP actifs (pour admin/debug)
 */
router.get('/otp/list', async (req: Request, res: Response) => {
  try {
    const activeOTPs = OTPCacheService.listActiveOTPs();
    return R.handleSuccess(res, {
      count: activeOTPs.length,
      otps: activeOTPs,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'internal_server_error',
      message: error.message,
    });
  }
});

/**
 * DELETE /otp/cleanup - Nettoyer les OTP expirés manuellement
 */
router.delete('/otp/cleanup', async (req: Request, res: Response) => {
  try {
    await OTPCacheService.cleanupExpiredOTPs();
    const stats = OTPCacheService.getStats();
    return R.handleSuccess(res, {
      message: 'Cleanup completed',
      stats,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'internal_server_error',
      message: error.message,
    });
  }
});

export default router;
