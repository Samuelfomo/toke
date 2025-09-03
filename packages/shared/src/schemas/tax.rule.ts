// schemas/tax.rule.ts
import { z } from 'zod';

import { TAX_RULE_DEFAULTS, TAX_RULE_ERRORS, TAX_RULE_VALIDATION } from '../constants/tax.rule.js';

// Schema de base pour les validations communes
const baseTaxRuleSchema = z.object({
  country_code: z
    .string({
      required_error: TAX_RULE_ERRORS.COUNTRY_CODE_REQUIRED,
      invalid_type_error: TAX_RULE_ERRORS.COUNTRY_CODE_INVALID,
    })
    .min(TAX_RULE_VALIDATION.COUNTRY_CODE.MIN_LENGTH, TAX_RULE_ERRORS.COUNTRY_CODE_INVALID)
    .max(TAX_RULE_VALIDATION.COUNTRY_CODE.MAX_LENGTH, TAX_RULE_ERRORS.COUNTRY_CODE_INVALID)
    .regex(
      new RegExp(
        `^(${TAX_RULE_VALIDATION.COUNTRY_CODE.PATTERN_2.source}|${TAX_RULE_VALIDATION.COUNTRY_CODE.PATTERN_3.source})$`,
      ),
      TAX_RULE_ERRORS.COUNTRY_CODE_INVALID,
    )
    .transform((val) => val.trim().toUpperCase()),

  tax_type: z
    .string({
      required_error: TAX_RULE_ERRORS.TAX_TYPE_REQUIRED,
      invalid_type_error: TAX_RULE_ERRORS.TAX_TYPE_INVALID,
    })
    .min(TAX_RULE_VALIDATION.TAX_TYPE.MIN_LENGTH, TAX_RULE_ERRORS.TAX_TYPE_INVALID)
    .max(TAX_RULE_VALIDATION.TAX_TYPE.MAX_LENGTH, TAX_RULE_ERRORS.TAX_TYPE_INVALID)
    .regex(TAX_RULE_VALIDATION.TAX_TYPE.PATTERN, TAX_RULE_ERRORS.TAX_TYPE_INVALID)
    .transform((val) => val.trim()),

  tax_name: z
    .string({
      required_error: TAX_RULE_ERRORS.TAX_NAME_REQUIRED,
      invalid_type_error: TAX_RULE_ERRORS.TAX_NAME_INVALID,
    })
    .min(TAX_RULE_VALIDATION.TAX_NAME.MIN_LENGTH, TAX_RULE_ERRORS.TAX_NAME_INVALID)
    .max(TAX_RULE_VALIDATION.TAX_NAME.MAX_LENGTH, TAX_RULE_ERRORS.TAX_NAME_INVALID)
    .transform((val) => val.trim()),

  tax_rate: z
    .number({
      required_error: TAX_RULE_ERRORS.TAX_RATE_REQUIRED,
      invalid_type_error: TAX_RULE_ERRORS.TAX_RATE_INVALID,
    })
    .min(TAX_RULE_VALIDATION.TAX_RATE.MIN_VALUE, TAX_RULE_ERRORS.TAX_RATE_INVALID)
    .max(TAX_RULE_VALIDATION.TAX_RATE.MAX_VALUE, TAX_RULE_ERRORS.TAX_RATE_INVALID)
    .refine((val) => {
      // Vérifier que le nombre de décimales ne dépasse pas le maximum
      const decimals = val.toString().split('.')[1];
      return !decimals || decimals.length <= TAX_RULE_VALIDATION.TAX_RATE.DECIMAL_PLACES;
    }, TAX_RULE_ERRORS.TAX_RATE_INVALID),

  applies_to: z
    .string({
      required_error: TAX_RULE_ERRORS.APPLIES_TO_REQUIRED,
      invalid_type_error: TAX_RULE_ERRORS.APPLIES_TO_INVALID,
    })
    .min(TAX_RULE_VALIDATION.APPLIES_TO.MIN_LENGTH, TAX_RULE_ERRORS.APPLIES_TO_INVALID)
    .max(TAX_RULE_VALIDATION.APPLIES_TO.MAX_LENGTH, TAX_RULE_ERRORS.APPLIES_TO_INVALID)
    .regex(TAX_RULE_VALIDATION.APPLIES_TO.PATTERN, TAX_RULE_ERRORS.APPLIES_TO_INVALID)
    .default(TAX_RULE_DEFAULTS.APPLIES_TO)
    .transform((val) => val.trim()),

  required_tax_number: z.coerce
    .boolean()
    .default(TAX_RULE_DEFAULTS.REQUIRED_TAX_NUMBER)
    .transform((val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    }),

  effective_date: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .refine((date) => !isNaN(date.getTime()), TAX_RULE_ERRORS.EFFECTIVE_DATE_INVALID)
    .default(() => new Date()),

  expiry_date: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .refine((date) => !isNaN(date.getTime()), TAX_RULE_ERRORS.EXPIRY_DATE_INVALID)
    .optional(),

  active: z.coerce
    .boolean()
    .default(TAX_RULE_DEFAULTS.ACTIVE)
    .transform((val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    }),
});

// Schéma avec validation des dates croisées
const baseTaxRuleWithDateValidation = baseTaxRuleSchema.refine(
  (data) => {
    if (data.expiry_date && data.effective_date) {
      return data.expiry_date > data.effective_date;
    }
    return true;
  },
  {
    message: TAX_RULE_ERRORS.DATE_RANGE_INVALID,
    path: ['expiry_date'],
  },
);

// Schéma pour création - tous les champs requis sauf optionnels
export const createTaxRuleSchema = baseTaxRuleWithDateValidation;

// Schéma pour mise à jour - tous les champs optionnels
export const updateTaxRuleSchema = baseTaxRuleSchema.partial();

// Schéma pour les filtres de recherche
export const taxRuleFiltersSchema = z
  .object({
    country_code: z
      .string()
      .regex(
        new RegExp(
          `^(${TAX_RULE_VALIDATION.COUNTRY_CODE.PATTERN_2.source}|${TAX_RULE_VALIDATION.COUNTRY_CODE.PATTERN_3.source})$`,
        ),
        TAX_RULE_ERRORS.COUNTRY_CODE_INVALID,
      )
      .transform((val) => val.trim().toUpperCase())
      .optional(),
    tax_type: z
      .string()
      .regex(TAX_RULE_VALIDATION.TAX_TYPE.PATTERN, TAX_RULE_ERRORS.TAX_TYPE_INVALID)
      .transform((val) => val.trim())
      .optional(),
    tax_name: z
      .string()
      .min(1)
      .transform((val) => val.trim())
      .optional(),
    applies_to: z
      .string()
      .regex(TAX_RULE_VALIDATION.APPLIES_TO.PATTERN, TAX_RULE_ERRORS.APPLIES_TO_INVALID)
      .transform((val) => val.trim())
      .optional(),
    required_tax_number: z.coerce.boolean().optional(),
    active: z.coerce.boolean().optional(),
    effective_from: z
      .string()
      .datetime()
      .transform((val) => new Date(val))
      .optional(),
    effective_to: z
      .string()
      .datetime()
      .transform((val) => new Date(val))
      .optional(),
  })
  .strict();

// Schéma pour validation du GUID
export const taxRuleGuidSchema = z
  .string()
  .regex(/^\d{6}$/, TAX_RULE_ERRORS.GUID_INVALID)
  .transform((val) => parseInt(val))
  .refine(
    (val) => val >= TAX_RULE_VALIDATION.GUID.MIN_VALUE && val <= TAX_RULE_VALIDATION.GUID.MAX_VALUE,
    TAX_RULE_ERRORS.GUID_INVALID,
  );

// Fonctions de validation avec gestion d'erreurs
export const validateTaxRuleCreation = (data: any) => {
  try {
    return createTaxRuleSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateTaxRuleUpdate = (data: any) => {
  try {
    return updateTaxRuleSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateTaxRuleFilters = (data: any) => {
  try {
    return taxRuleFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateTaxRuleGuid = (guid: any) => {
  try {
    return taxRuleGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(TAX_RULE_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Schéma complet pour les réponses (avec métadonnées)
export const taxRule = baseTaxRuleSchema.extend({
  id: z.number().int().positive(),
  guid: z
    .number()
    .int()
    .min(TAX_RULE_VALIDATION.GUID.MIN_VALUE)
    .max(TAX_RULE_VALIDATION.GUID.MAX_VALUE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Schéma pour les paramètres d'URL
export const taxRuleParamsSchema = z.object({
  guid: z
    .string()
    .regex(/^\d{6}$/, TAX_RULE_ERRORS.GUID_INVALID)
    .transform((val) => parseInt(val)),

  country_code: z
    .string()
    .regex(
      new RegExp(
        `^(${TAX_RULE_VALIDATION.COUNTRY_CODE.PATTERN_2.source}|${TAX_RULE_VALIDATION.COUNTRY_CODE.PATTERN_3.source})$`,
      ),
      TAX_RULE_ERRORS.COUNTRY_CODE_INVALID,
    )
    .transform((val) => val.toUpperCase()),

  tax_type: z
    .string()
    .regex(TAX_RULE_VALIDATION.TAX_TYPE.PATTERN, TAX_RULE_ERRORS.TAX_TYPE_INVALID),
});

// Schéma pour les réponses d'erreur API
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

// Schéma pour les réponses API génériques
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.optional(),
    error: apiErrorSchema.optional(),
    success: z.boolean(),
  });

// Schémas de réponses spécifiques
export const taxRuleResponseSchema = apiResponseSchema(taxRule);
export const taxRuleListResponseSchema = apiResponseSchema(
  z.object({
    taxRules: z.object({
      revision: z.string().optional(),
      pagination: z.object({
        offset: z.number(),
        limit: z.number(),
        count: z.number(),
      }),
      items: z.array(taxRule),
    }),
  }),
);

// Export groupé pour faciliter l'import
export const taxRuleSchemas = {
  validateTaxRuleCreation,
  validateTaxRuleUpdate,
  validateTaxRuleFilters,
  validateTaxRuleGuid,
  createTaxRuleSchema,
  updateTaxRuleSchema,
  taxRuleFiltersSchema,
  taxRuleGuidSchema,
};

// Types TypeScript générés à partir des schémas
export type CreateTaxRuleInput = z.infer<typeof createTaxRuleSchema>;
export type UpdateTaxRuleInput = z.infer<typeof updateTaxRuleSchema>;
export type TaxRuleData = z.infer<typeof taxRule>;
export type TaxRuleFiltersInput = z.infer<typeof taxRuleFiltersSchema>;
export type TaxRuleParamsInput = z.infer<typeof taxRuleParamsSchema>;
export type ApiErrorData = z.infer<typeof apiErrorSchema>;
