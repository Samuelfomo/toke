import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  TAX_RULE_CODES,
  TAX_RULE_ERRORS,
  TaxRuleValidationUtils,
  TR,
} from '@toke/shared';

import TaxRule from '../class/TaxRule.js';
import R from '../../tools/response.js';
import G from '../../tools/glossary.js';
import Ensure from '../../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';

const router = Router();

// region ROUTES D'EXPORT

/**
 * GET / - Exporter toutes les règles fiscales
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const taxRules = await TaxRule.exportable(paginationOptions);
    return R.handleSuccess(res, { taxRules });
  } catch (error: any) {
    console.error('⚠️ Erreur export règles fiscales:', error);
    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.PAGINATION_INVALID,
        message: 'Invalid pagination parameters',
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TAX_RULE_CODES.EXPORT_FAILED,
        message: TAX_RULE_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /revision - Récupérer uniquement la révision actuelle
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.TAX_RULE);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('⚠️ Erreur récupération révision:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TAX_RULE_CODES.SEARCH_FAILED,
      message: 'Failed to get current revision',
    });
  }
});

/**
 * GET /active/:status - Lister les règles fiscales par statut actif/inactif
 */
router.get('/active/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const isActive = status.toLowerCase() === 'true' || status === '1';

    const paginationOptions = paginationSchema.parse(req.query);

    const taxRulesData = await TaxRule._listByActiveStatus(isActive, paginationOptions);
    const taxRules = {
      active: isActive,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || taxRulesData?.length,
        count: taxRulesData?.length || 0,
      },
      items: taxRulesData?.map((taxRule) => taxRule.toJSON()) || [],
    };

    R.handleSuccess(res, { taxRules });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par statut:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.PAGINATION_INVALID,
        message: 'Invalid pagination parameters',
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TAX_RULE_CODES.STATUS_SEARCH_FAILED,
        message: `Failed to search tax rules by status: ${req.params.status}`,
      });
    }
  }
});

// endregion

// region ROUTES CRUD

/**
 * POST / - Créer une nouvelle règle fiscale
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = TR.validateTaxRuleCreation(req.body);

    const taxRuleObj = new TaxRule()
      .setCountryCode(validatedData.country_code)
      .setTaxType(validatedData.tax_type)
      .setTaxName(validatedData.tax_name)
      .setTaxRate(validatedData.tax_rate)
      .setAppliesTo(validatedData.applies_to);

    if (validatedData.required_tax_number !== undefined) {
      taxRuleObj.setRequiredTaxNumber(validatedData.required_tax_number);
    }

    if (validatedData.effective_date) {
      taxRuleObj.setEffectiveDate(validatedData.effective_date);
    }

    if (validatedData.expiry_date) {
      taxRuleObj.setExpiryDate(validatedData.expiry_date);
    }

    if (validatedData.active !== undefined) {
      taxRuleObj.setActive(validatedData.active);
    }

    await taxRuleObj.save();

    console.log(
      `✅ Règle fiscale créée: ${validatedData.country_code} - ${validatedData.tax_type} (GUID: ${taxRuleObj.getGuid()})`,
    );
    return R.handleCreated(res, taxRuleObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur création règle fiscale:', error.message);

    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.VALIDATION_FAILED,
        message: 'Validation failed',
        details: error.issues,
      });
    } else if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: TAX_RULE_CODES.TAX_RULE_ALREADY_EXISTS,
        message: TAX_RULE_ERRORS.DUPLICATE_RULE,
      });
    } else if (error.message.includes('Validation failed')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.CREATION_FAILED,
        message: TAX_RULE_ERRORS.CREATION_FAILED,
      });
    }
  }
});

/**
 * PUT /:guid - Modifier une règle fiscale par GUID
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const validatedGuid = TR.validateTaxRuleGuid(req.params.guid);

    // Charger par GUID
    const taxRule = await TaxRule._load(validatedGuid, true);
    if (!taxRule) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TAX_RULE_CODES.TAX_RULE_NOT_FOUND,
        message: TAX_RULE_ERRORS.NOT_FOUND,
      });
    }

    // Validation des données avec schéma shared
    const validatedData = TR.validateTaxRuleUpdate(req.body);

    // Mise à jour des champs fournis
    if (validatedData.country_code !== undefined) {
      taxRule.setCountryCode(validatedData.country_code);
    }
    if (validatedData.tax_type !== undefined) {
      taxRule.setTaxType(validatedData.tax_type);
    }
    if (validatedData.tax_name !== undefined) {
      taxRule.setTaxName(validatedData.tax_name);
    }
    if (validatedData.tax_rate !== undefined) {
      taxRule.setTaxRate(validatedData.tax_rate);
    }
    if (validatedData.applies_to !== undefined) {
      taxRule.setAppliesTo(validatedData.applies_to);
    }
    if (validatedData.required_tax_number !== undefined) {
      taxRule.setRequiredTaxNumber(validatedData.required_tax_number);
    }
    if (validatedData.effective_date !== undefined) {
      taxRule.setEffectiveDate(validatedData.effective_date);
    }
    if (validatedData.expiry_date !== undefined) {
      taxRule.setExpiryDate(validatedData.expiry_date);
    }
    if (validatedData.active !== undefined) {
      taxRule.setActive(validatedData.active);
    }

    await taxRule.save();

    console.log(`✅ Règle fiscale modifiée: GUID ${validatedGuid}`);
    return R.handleSuccess(res, taxRule.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur modification règle fiscale:', error);

    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.VALIDATION_FAILED,
        message: 'Validation failed',
        details: error.issues,
      });
    } else if (error.message.includes('Invalid GUID')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.INVALID_GUID,
        message: TAX_RULE_ERRORS.GUID_INVALID,
      });
    } else if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: TAX_RULE_CODES.TAX_RULE_ALREADY_EXISTS,
        message: TAX_RULE_ERRORS.DUPLICATE_RULE,
      });
    } else if (error.message.includes('Validation failed')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.UPDATE_FAILED,
        message: TAX_RULE_ERRORS.UPDATE_FAILED,
      });
    }
  }
});

/**
 * DELETE /:guid - Supprimer une règle fiscale par GUID
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    // Validation du GUID avec utilitaire shared
    if (!TaxRuleValidationUtils.validateTaxRuleGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.INVALID_GUID,
        message: TAX_RULE_ERRORS.GUID_INVALID,
      });
    }

    const guid = parseInt(req.params.guid, 10);

    // Charger par GUID
    const taxRule = await TaxRule._load(guid, true);
    if (!taxRule) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TAX_RULE_CODES.TAX_RULE_NOT_FOUND,
        message: TAX_RULE_ERRORS.NOT_FOUND,
      });
    }

    const deleted = await taxRule.delete();

    if (deleted) {
      console.log(
        `✅ Règle fiscale supprimée: GUID ${guid} (${taxRule.getCountryCode()} - ${taxRule.getTaxType()})`,
      );
      return R.handleSuccess(res, {
        message: 'Tax rule deleted successfully',
        guid: guid,
        country_code: taxRule.getCountryCode(),
        tax_type: taxRule.getTaxType(),
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, G.savedError);
    }
  } catch (error: any) {
    console.error('⚠️ Erreur suppression règle fiscale:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TAX_RULE_CODES.DELETE_FAILED,
      message: TAX_RULE_ERRORS.DELETE_FAILED,
    });
  }
});

// endregion

// region ROUTES UTILITAIRES

/**
 * GET /list - Lister toutes les règles fiscales (pour admin)
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters = TR.validateTaxRuleFilters(req.query);
    const paginationOptions = paginationSchema.parse(req.query);

    const conditions: Record<string, any> = {};

    // if (filters.country_code) conditions.country_code = filters.country_code;
    // if (filters.tax_type) conditions.tax_type = filters.tax_type;
    // if (filters.applies_to) conditions.applies_to = filters.applies_to;
    // if (filters.required_tax_number !== undefined) conditions.required_tax_number = filters.required_tax_number;
    if (filters.active !== undefined) conditions.active = filters.active;

    const taxRuleEntries = await TaxRule._list(conditions, paginationOptions);
    const taxRules = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || taxRuleEntries?.length,
        count: taxRuleEntries?.length || 0,
      },
      items: taxRuleEntries?.map((taxRule) => taxRule.toJSON()) || [],
    };

    return R.handleSuccess(res, { taxRules });
  } catch (error: any) {
    console.error('⚠️ Erreur listing règles fiscales:', error);

    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.VALIDATION_FAILED,
        message: 'Invalid filters or pagination parameters',
        details: error.issues,
      });
    } else if (error.message.includes('Invalid filters')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.FILTER_INVALID,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TAX_RULE_CODES.LISTING_FAILED,
        message: TAX_RULE_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /search/country/:code - Rechercher par code pays
 */
router.get('/search/country/:code', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    // Validation avec utilitaire shared
    if (!TaxRuleValidationUtils.validateCountryCode(code)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.COUNTRY_CODE_INVALID,
        message: TAX_RULE_ERRORS.COUNTRY_CODE_INVALID,
      });
    }

    const normalizedCode = TaxRuleValidationUtils.normalizeCountryCode(code);
    const paginationOptions = paginationSchema.parse(req.query);
    const taxRulesData = await TaxRule._listByCountryCode(normalizedCode, paginationOptions);

    if (!taxRulesData || taxRulesData.length === 0) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TAX_RULE_CODES.TAX_RULE_NOT_FOUND,
        message: `No tax rules found for country code '${normalizedCode}'`,
      });
    }

    const taxRules = {
      country_code: normalizedCode,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || taxRulesData.length,
        count: taxRulesData.length,
      },
      items: taxRulesData.map((taxRule) => taxRule.toJSON()),
    };

    return R.handleSuccess(res, { taxRules });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par code pays:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TAX_RULE_CODES.SEARCH_FAILED,
      message: 'Failed to search tax rules by country code',
    });
  }
});

/**
 * GET /search/type/:type - Rechercher par type de taxe
 */
router.get('/search/type/:type', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    // Validation avec utilitaire shared
    if (!TaxRuleValidationUtils.validateTaxType(type)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.TAX_TYPE_INVALID,
        message: TAX_RULE_ERRORS.TAX_TYPE_INVALID,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const taxRulesData = await TaxRule._listByTaxType(type, paginationOptions);

    if (!taxRulesData || taxRulesData.length === 0) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TAX_RULE_CODES.TAX_RULE_NOT_FOUND,
        message: `No tax rules found for tax type '${type}'`,
      });
    }

    const taxRules = {
      tax_type: type,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || taxRulesData.length,
        count: taxRulesData.length,
      },
      items: taxRulesData.map((taxRule) => taxRule.toJSON()),
    };

    R.handleSuccess(res, { taxRules });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par type:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TAX_RULE_CODES.SEARCH_FAILED,
      message: 'Failed to search tax rules by type',
    });
  }
});

/**
 * GET /search/applies-to/:value - Rechercher par champ "applies_to"
 */
router.get('/search/applies-to/:value', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { value } = req.params;
    // Validation avec utilitaire shared
    if (!TaxRuleValidationUtils.validateAppliesTo(value)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TAX_RULE_CODES.APPLIES_TO_INVALID,
        message: TAX_RULE_ERRORS.APPLIES_TO_INVALID,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const taxRulesData = await TaxRule._listByAppliesTo(value, paginationOptions);

    if (!taxRulesData || taxRulesData.length === 0) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TAX_RULE_CODES.TAX_RULE_NOT_FOUND,
        message: `No tax rules found for applies_to '${value}'`,
      });
    }
    const taxRules = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || taxRulesData.length,
        count: taxRulesData.length,
      },
      items: taxRulesData.map((taxRule) => taxRule.toJSON()),
    };

    return R.handleSuccess(res, { taxRules });
  } catch (error: any) {
    console.error('error', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TAX_RULE_CODES.SEARCH_FAILED,
      message: 'Failed to search tax rules by applies_to',
    });
  }
});

/**
 * GET /search/tax-number-required/:value - Rechercher
 */
router.get(
  '/search/tax-number-required/:value',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { value } = req.params;
      // const required = value.toLowerCase() === 'true' || value === '1';
      const required = value.toLowerCase() === 'true' || value === '1';
      const paginationOptions = paginationSchema.parse(req.query);
      // const paginationOptions = await ExtractQueryParams.extractPaginationFromQuery(req.query);
      const taxRulesData = await TaxRule._listByRequiredTaxNumber(required, paginationOptions);
      if (!taxRulesData || taxRulesData.length === 0) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: TAX_RULE_CODES.TAX_RULE_NOT_FOUND,
          message: `No tax rules found for required_tax_number '${value}'`,
        });
      }
      const taxRules = {
        pagination: {
          offset: paginationOptions.offset || 0,
          limit: paginationOptions.limit || taxRulesData.length,
          count: taxRulesData.length,
        },
        items: taxRulesData.map((taxRule) => taxRule.toJSON()),
      };
      return R.handleSuccess(res, { taxRules });
    } catch (error: any) {
      console.error('error', error);
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TAX_RULE_CODES.SEARCH_FAILED,
        message: 'Failed to search tax rules by required_tax_number',
      });
    }
  },
);

// router.get('/:identifier', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const { identifier } = req.params;
//
//   } catch (error: any){
//
//   }
// }
// )

export default router;
