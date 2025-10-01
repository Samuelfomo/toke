// schemas/roles.ts
import { z } from 'zod';

import { ROLES_DEFAULTS, ROLES_ERRORS, ROLES_VALIDATION } from '../../constants/tenant/roles.js';

// Base schema pour les validations communes
const baseRolesSchema = z.object({
  code: z
    .string({
      required_error: ROLES_ERRORS.CODE_REQUIRED,
      invalid_type_error: ROLES_ERRORS.CODE_INVALID,
    })
    .min(ROLES_VALIDATION.CODE.MIN_LENGTH, ROLES_ERRORS.CODE_INVALID)
    .max(ROLES_VALIDATION.CODE.MAX_LENGTH, ROLES_ERRORS.CODE_INVALID)
    .trim(),

  name: z
    .string({
      required_error: ROLES_ERRORS.NAME_REQUIRED,
      invalid_type_error: ROLES_ERRORS.NAME_INVALID,
    })
    .min(ROLES_VALIDATION.NAME.MIN_LENGTH, ROLES_ERRORS.NAME_INVALID)
    .max(ROLES_VALIDATION.NAME.MAX_LENGTH, ROLES_ERRORS.NAME_INVALID)
    .trim(),

  description: z
    .string({
      invalid_type_error: ROLES_ERRORS.DESCRIPTION_INVALID,
    })
    .min(ROLES_VALIDATION.DESCRIPTION.MIN_LENGTH, ROLES_ERRORS.DESCRIPTION_INVALID)
    .max(ROLES_VALIDATION.DESCRIPTION.MAX_LENGTH, ROLES_ERRORS.DESCRIPTION_INVALID)
    .trim()
    .optional()
    .nullable(),

  permissions: z
    .record(z.any(), {
      required_error: ROLES_ERRORS.PERMISSIONS_REQUIRED,
      invalid_type_error: ROLES_ERRORS.PERMISSIONS_INVALID,
    })
    .refine((permissions) => {
      try {
        JSON.stringify(permissions);
        return true;
      } catch {
        return false;
      }
    }, ROLES_ERRORS.PERMISSIONS_INVALID),

  system_role: z
    .boolean({
      invalid_type_error: ROLES_ERRORS.SYSTEM_ROLE_INVALID,
    })
    .default(ROLES_DEFAULTS.SYSTEM_ROLE),

  default_role: z
    .boolean({
      invalid_type_error: ROLES_ERRORS.DEFAULT_ROLE_INVALID,
    })
    .default(ROLES_DEFAULTS.DEFAULT_ROLE),
  admin_role: z
    .boolean({
      invalid_type_error: ROLES_ERRORS.ADMIN_ROLE_INVALID,
    })
    .default(ROLES_DEFAULTS.ADMIN_ROLE),
});

// Schema pour la création - tous les champs requis
export const createRolesSchema = baseRolesSchema;

// Schema pour les mises à jour - tous les champs optionnels
export const updateRolesSchema = baseRolesSchema.partial();

// Schema pour les filtres
export const rolesFiltersSchema = z
  .object({
    // code: z.string().optional(),
    // name: z.string().optional(),
    system_role: z.boolean().optional(),
    default_role: z.boolean().optional(),
    admin_role: z.boolean().optional(),
    permissions: z.string().optional(), // Pour rechercher par clé de permission
  })
  .strict();

// Schema pour validation GUID
export const rolesGuidSchema = z.string().uuid(ROLES_ERRORS.NOT_FOUND);

// Fonctions de validation avec gestion d'erreurs
export const validateRolesCreation = (data: any) => {
  try {
    return createRolesSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateRolesUpdate = (data: any) => {
  try {
    return updateRolesSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateRolesFilters = (data: any) => {
  try {
    return rolesFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateRolesGuid = (guid: any) => {
  try {
    return rolesGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(ROLES_ERRORS.NOT_FOUND);
    }
    throw error;
  }
};

// Schema complet pour les réponses (avec métadonnées)
export const rolesResponseSchema = baseRolesSchema.extend({
  id: z.number().int().positive(),
  guid: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Export groupé pour faciliter les imports
export const rolesSchemas = {
  validateRolesCreation,
  validateRolesUpdate,
  validateRolesFilters,
  validateRolesGuid,
  createRolesSchema,
  updateRolesSchema,
  rolesFiltersSchema,
  rolesGuidSchema,
};

// Types TypeScript générés à partir des schemas
export type CreateRolesInput = z.infer<typeof createRolesSchema>;
export type UpdateRolesInput = z.infer<typeof updateRolesSchema>;
export type RolesData = z.infer<typeof rolesResponseSchema>;
export type RolesFilters = z.infer<typeof rolesFiltersSchema>;
