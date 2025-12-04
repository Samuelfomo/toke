// schemas/department.ts
import { z } from 'zod';

import {
  DEPARTMENT_CODES,
  DEPARTMENT_DEFAULTS,
  DEPARTMENT_ERRORS,
  DEPARTMENT_VALIDATION,
  DepartmentCode,
} from '../../constants/tenant/department.js';

// Base schema pour les validations communes
const baseDepartmentSchema = z.object({
  name: z
    .string({
      required_error: DEPARTMENT_ERRORS.NAME_REQUIRED,
      invalid_type_error: DEPARTMENT_ERRORS.NAME_INVALID,
    })
    .min(DEPARTMENT_VALIDATION.NAME.MIN_LENGTH, DEPARTMENT_ERRORS.NAME_INVALID)
    .max(DEPARTMENT_VALIDATION.NAME.MAX_LENGTH, DEPARTMENT_ERRORS.NAME_INVALID)
    .trim(),

  code: z
    .string({
      required_error: DEPARTMENT_ERRORS.CODE_REQUIRED,
      invalid_type_error: DEPARTMENT_ERRORS.CODE_INVALID,
    })
    .min(DEPARTMENT_VALIDATION.CODE.MIN_LENGTH, DEPARTMENT_ERRORS.CODE_INVALID)
    .max(DEPARTMENT_VALIDATION.CODE.MAX_LENGTH, DEPARTMENT_ERRORS.CODE_INVALID)
    .trim(),

  description: z
    .string({
      invalid_type_error: DEPARTMENT_ERRORS.DESCRIPTION_INVALID,
    })
    .min(DEPARTMENT_VALIDATION.DESCRIPTION.MIN_LENGTH, DEPARTMENT_ERRORS.DESCRIPTION_INVALID)
    .trim()
    .optional()
    .nullable(),

  manager: z
    .number({
      invalid_type_error: DEPARTMENT_ERRORS.MANAGER_INVALID,
    })
    .int()
    .min(DEPARTMENT_VALIDATION.MANAGER.MIN, DEPARTMENT_ERRORS.MANAGER_INVALID)
    .max(DEPARTMENT_VALIDATION.MANAGER.MAX, DEPARTMENT_ERRORS.MANAGER_INVALID)
    .optional()
    .nullable(),

  active: z
    .boolean({
      invalid_type_error: DEPARTMENT_ERRORS.ACTIVE_INVALID,
    })
    .default(DEPARTMENT_DEFAULTS.ACTIVE),
});

// Schema pour la création - tous les champs requis
export const createDepartmentSchema = baseDepartmentSchema;

// Schema pour les mises à jour - tous les champs optionnels
export const updateDepartmentSchema = baseDepartmentSchema.partial();

// Schema pour les filtres
export const departmentFiltersSchema = z
  .object({
    name: z.string().optional(),
    code: z.string().optional(),
    manager: z.number().int().optional(),
    active: z.boolean().optional(),
  })
  .strict();

// Schema pour validation GUID
export const departmentGuidSchema = z
  .string()
  .min(DEPARTMENT_VALIDATION.GUID.MIN_LENGTH, DEPARTMENT_ERRORS.GUID_INVALID)
  .max(DEPARTMENT_VALIDATION.GUID.MAX_LENGTH, DEPARTMENT_ERRORS.GUID_INVALID);

// Constante partagée pour le mapping field -> code
const FIELD_TO_CODE_MAP: Record<string, DepartmentCode> = {
  name: DEPARTMENT_CODES.NAME_INVALID,
  code: DEPARTMENT_CODES.CODE_INVALID,
  description: DEPARTMENT_CODES.DESCRIPTION_INVALID,
  manager: DEPARTMENT_CODES.MANAGER_INVALID,
  active: DEPARTMENT_CODES.ACTIVE_INVALID,
};

// Fonction de validation pour la création
export const validateDepartmentCreation = (data: any) => {
  const result = createDepartmentSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || DEPARTMENT_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

// Fonction de validation pour la mise à jour
export const validateDepartmentUpdate = (data: any) => {
  const result = updateDepartmentSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || DEPARTMENT_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

export const validateDepartmentFilters = (data: any) => {
  const result = departmentFiltersSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;

    const error: any = new Error(firstError.message);
    error.code = DEPARTMENT_CODES.FILTER_INVALID;
    throw error;
  }

  return result.data;
};

export const validateDepartmentGuid = (guid: any) => {
  const result = departmentGuidSchema.safeParse(guid);

  if (!result.success) {
    const error: any = new Error(DEPARTMENT_ERRORS.GUID_INVALID);
    error.code = DEPARTMENT_CODES.INVALID_GUID;
    throw error;
  }

  return result.data;
};

// Schema complet pour les réponses (avec métadonnées)
export const departmentResponseSchema = baseDepartmentSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
});

// Export groupé pour faciliter les imports
export const departmentSchemas = {
  validateDepartmentCreation,
  validateDepartmentUpdate,
  validateDepartmentFilters,
  validateDepartmentGuid,
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentFiltersSchema,
  departmentGuidSchema,
};

// Types TypeScript générés à partir des schemas
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type DepartmentData = z.infer<typeof departmentResponseSchema>;
export type DepartmentFilters = z.infer<typeof departmentFiltersSchema>;
