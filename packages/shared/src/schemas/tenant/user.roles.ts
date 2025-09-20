// schemas/user_roles.ts
import { z } from 'zod';

import { USER_ROLES_ERRORS, USER_ROLES_VALIDATION } from '../../constants/tenant/user.roles.js'; // Base schema pour les validations communes

// Base schema pour les validations communes
const baseUserRolesSchema = z.object({
  user: z
    .number({
      required_error: USER_ROLES_ERRORS.USER_REQUIRED,
      invalid_type_error: USER_ROLES_ERRORS.USER_INVALID,
    })
    .int()
    .min(USER_ROLES_VALIDATION.USER.MIN, USER_ROLES_ERRORS.USER_INVALID)
    .max(USER_ROLES_VALIDATION.USER.MAX, USER_ROLES_ERRORS.USER_INVALID),

  role: z
    .number({
      required_error: USER_ROLES_ERRORS.ROLE_REQUIRED,
      invalid_type_error: USER_ROLES_ERRORS.ROLE_INVALID,
    })
    .int()
    .min(USER_ROLES_VALIDATION.ROLE.MIN, USER_ROLES_ERRORS.ROLE_INVALID)
    .max(USER_ROLES_VALIDATION.ROLE.MAX, USER_ROLES_ERRORS.ROLE_INVALID),

  assigned_by: z
    .number({
      required_error: USER_ROLES_ERRORS.ASSIGNED_BY_REQUIRED,
      invalid_type_error: USER_ROLES_ERRORS.ASSIGNED_BY_INVALID,
    })
    .int()
    .min(USER_ROLES_VALIDATION.ASSIGNED_BY.MIN, USER_ROLES_ERRORS.ASSIGNED_BY_INVALID)
    .max(USER_ROLES_VALIDATION.ASSIGNED_BY.MAX, USER_ROLES_ERRORS.ASSIGNED_BY_INVALID),

  assigned_at: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: USER_ROLES_ERRORS.ASSIGNED_AT_INVALID,
    })
    .optional()
    .nullable(),
});

// Schema pour la création - tous les champs requis
export const createUserRolesSchema = baseUserRolesSchema;

// Schema pour les mises à jour - tous les champs optionnels
export const updateUserRolesSchema = baseUserRolesSchema.partial();

// Schema pour les filtres
export const userRolesFiltersSchema = z
  .object({
    user: z.number().int().optional(),
    role: z.number().int().optional(),
    assigned_by: z.number().int().optional(),
    assigned_at_from: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    assigned_at_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
  })
  .strict();

// Schema pour validation GUID
export const userRolesGuidSchema = z
  .string()
  .min(USER_ROLES_VALIDATION.GUID.MIN_LENGTH, USER_ROLES_ERRORS.GUID_INVALID)
  .max(USER_ROLES_VALIDATION.GUID.MAX_LENGTH, USER_ROLES_ERRORS.GUID_INVALID);

// Fonctions de validation avec gestion d'erreurs
export const validateUserRolesCreation = (data: any) => {
  try {
    return createUserRolesSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateUserRolesUpdate = (data: any) => {
  try {
    return updateUserRolesSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateUserRolesFilters = (data: any) => {
  try {
    return userRolesFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateUserRolesGuid = (guid: any) => {
  try {
    return userRolesGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(USER_ROLES_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Validation métier personnalisée pour éviter l'auto-assignation
export const validateUserRoleAssignment = (data: any) => {
  const validated = validateUserRolesCreation(data);

  if (validated.user === validated.assigned_by) {
    throw new Error(USER_ROLES_ERRORS.SELF_ASSIGNMENT_RESTRICTED);
  }

  return validated;
};

// Schema complet pour les réponses (avec métadonnées)
export const userRolesResponseSchema = baseUserRolesSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Export groupé pour faciliter les imports
export const userRolesSchemas = {
  validateUserRolesCreation,
  validateUserRolesUpdate,
  validateUserRolesFilters,
  validateUserRolesGuid,
  validateUserRoleAssignment,
  createUserRolesSchema,
  updateUserRolesSchema,
  userRolesFiltersSchema,
  userRolesGuidSchema,
};

// Types TypeScript générés à partir des schemas
export type CreateUserRolesInput = z.infer<typeof createUserRolesSchema>;
export type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;
export type UserRolesData = z.infer<typeof userRolesResponseSchema>;
export type UserRolesFilters = z.infer<typeof userRolesFiltersSchema>;
