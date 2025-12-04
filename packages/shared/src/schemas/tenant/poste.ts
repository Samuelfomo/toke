// schemas/poste.ts
import { z } from 'zod';

import {
  Level,
  POSTE_CODES,
  POSTE_DEFAULTS,
  POSTE_ERRORS,
  POSTE_VALIDATION,
  PosteCode,
} from '../../constants/tenant/poste.js';

// Base schema pour les validations communes
const basePosteSchema = z.object({
  title: z
    .string({
      required_error: POSTE_ERRORS.TITLE_REQUIRED,
      invalid_type_error: POSTE_ERRORS.TITLE_INVALID,
    })
    .min(POSTE_VALIDATION.TITLE.MIN_LENGTH, POSTE_ERRORS.TITLE_INVALID)
    .max(POSTE_VALIDATION.TITLE.MAX_LENGTH, POSTE_ERRORS.TITLE_INVALID)
    .trim(),

  code: z
    .string({
      required_error: POSTE_ERRORS.CODE_REQUIRED,
      invalid_type_error: POSTE_ERRORS.CODE_INVALID,
    })
    .min(POSTE_VALIDATION.CODE.MIN_LENGTH, POSTE_ERRORS.CODE_INVALID)
    .max(POSTE_VALIDATION.CODE.MAX_LENGTH, POSTE_ERRORS.CODE_INVALID)
    .trim(),

  department: z
    .number({
      required_error: POSTE_ERRORS.DEPARTMENT_REQUIRED,
      invalid_type_error: POSTE_ERRORS.DEPARTMENT_INVALID,
    })
    .int()
    .min(POSTE_VALIDATION.DEPARTMENT.MIN, POSTE_ERRORS.DEPARTMENT_INVALID)
    .max(POSTE_VALIDATION.DEPARTMENT.MAX, POSTE_ERRORS.DEPARTMENT_INVALID),

  salary_base: z
    .number({
      invalid_type_error: POSTE_ERRORS.SALARY_BASE_INVALID,
    })
    .min(POSTE_VALIDATION.SALARY_BASE.MIN, POSTE_ERRORS.SALARY_BASE_INVALID)
    .max(POSTE_VALIDATION.SALARY_BASE.MAX, POSTE_ERRORS.SALARY_BASE_INVALID)
    .refine(
      (val) => {
        const str = val.toString();
        const decimalIndex = str.indexOf('.');
        if (decimalIndex === -1) return true;
        return str.length - decimalIndex - 1 <= POSTE_VALIDATION.SALARY_BASE.DECIMAL_PLACES;
      },
      { message: POSTE_ERRORS.SALARY_BASE_INVALID },
    )
    .optional()
    .nullable(),

  description: z
    .string({
      invalid_type_error: POSTE_ERRORS.DESCRIPTION_INVALID,
    })
    .min(POSTE_VALIDATION.DESCRIPTION.MIN_LENGTH, POSTE_ERRORS.DESCRIPTION_INVALID)
    .trim()
    .optional()
    .nullable(),

  level: z
    .nativeEnum(Level, {
      invalid_type_error: POSTE_ERRORS.LEVEL_INVALID,
    })
    .default(POSTE_DEFAULTS.LEVEL),

  active: z
    .boolean({
      invalid_type_error: POSTE_ERRORS.ACTIVE_INVALID,
    })
    .default(POSTE_DEFAULTS.ACTIVE),
});

// Schema pour la création - tous les champs requis
export const createPosteSchema = basePosteSchema;

// Schema pour les mises à jour - tous les champs optionnels
export const updatePosteSchema = basePosteSchema.partial();

// Schema pour les filtres
export const posteFiltersSchema = z
  .object({
    title: z.string().optional(),
    code: z.string().optional(),
    department: z.number().int().optional(),
    level: z.nativeEnum(Level).optional(),
    active: z.boolean().optional(),
    salary_min: z.number().optional(),
    salary_max: z.number().optional(),
  })
  .strict();

// Schema pour validation GUID
export const posteGuidSchema = z
  .string()
  .min(POSTE_VALIDATION.GUID.MIN_LENGTH, POSTE_ERRORS.GUID_INVALID)
  .max(POSTE_VALIDATION.GUID.MAX_LENGTH, POSTE_ERRORS.GUID_INVALID);

// Constante partagée pour le mapping field -> code
const FIELD_TO_CODE_MAP: Record<string, PosteCode> = {
  title: POSTE_CODES.TITLE_INVALID,
  code: POSTE_CODES.CODE_INVALID,
  department: POSTE_CODES.DEPARTMENT_INVALID,
  salary_base: POSTE_CODES.SALARY_BASE_INVALID,
  description: POSTE_CODES.DESCRIPTION_INVALID,
  level: POSTE_CODES.LEVEL_INVALID,
  active: POSTE_CODES.ACTIVE_INVALID,
};

// Fonction de validation pour la création
export const validatePosteCreation = (data: any) => {
  const result = createPosteSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || POSTE_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

// Fonction de validation pour la mise à jour
export const validatePosteUpdate = (data: any) => {
  const result = updatePosteSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || POSTE_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

export const validatePosteFilters = (data: any) => {
  const result = posteFiltersSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;

    const error: any = new Error(firstError.message);
    error.code = POSTE_CODES.FILTER_INVALID;
    throw error;
  }

  return result.data;
};

export const validatePosteGuid = (guid: any) => {
  const result = posteGuidSchema.safeParse(guid);

  if (!result.success) {
    const error: any = new Error(POSTE_ERRORS.GUID_INVALID);
    error.code = POSTE_CODES.INVALID_GUID;
    throw error;
  }

  return result.data;
};

// Schema complet pour les réponses (avec métadonnées)
export const posteResponseSchema = basePosteSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
});

// Export groupé pour faciliter les imports
export const posteSchemas = {
  validatePosteCreation,
  validatePosteUpdate,
  validatePosteFilters,
  validatePosteGuid,
  createPosteSchema,
  updatePosteSchema,
  posteFiltersSchema,
  posteGuidSchema,
};

// Types TypeScript générés à partir des schemas
export type CreatePosteInput = z.infer<typeof createPosteSchema>;
export type UpdatePosteInput = z.infer<typeof updatePosteSchema>;
export type PosteData = z.infer<typeof posteResponseSchema>;
export type PosteFilters = z.infer<typeof posteFiltersSchema>;
