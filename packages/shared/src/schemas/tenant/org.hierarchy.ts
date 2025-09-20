// schemas/org_hierarchy.ts
import { z } from 'zod';

import {
  ORG_HIERARCHY_DEFAULTS,
  ORG_HIERARCHY_ERRORS,
  ORG_HIERARCHY_VALIDATION,
  RelationshipType,
} from '../../constants/tenant/org.hierarchy.js';

// Base schema pour les validations communes
const baseOrgHierarchySchema = z.object({
  subordinate: z
    .number({
      required_error: ORG_HIERARCHY_ERRORS.SUBORDINATE_REQUIRED,
      invalid_type_error: ORG_HIERARCHY_ERRORS.SUBORDINATE_INVALID,
    })
    .int()
    .min(ORG_HIERARCHY_VALIDATION.SUBORDINATE.MIN, ORG_HIERARCHY_ERRORS.SUBORDINATE_INVALID)
    .max(ORG_HIERARCHY_VALIDATION.SUBORDINATE.MAX, ORG_HIERARCHY_ERRORS.SUBORDINATE_INVALID),

  supervisor: z
    .number({
      required_error: ORG_HIERARCHY_ERRORS.SUPERVISOR_REQUIRED,
      invalid_type_error: ORG_HIERARCHY_ERRORS.SUPERVISOR_INVALID,
    })
    .int()
    .min(ORG_HIERARCHY_VALIDATION.SUPERVISOR.MIN, ORG_HIERARCHY_ERRORS.SUPERVISOR_INVALID)
    .max(ORG_HIERARCHY_VALIDATION.SUPERVISOR.MAX, ORG_HIERARCHY_ERRORS.SUPERVISOR_INVALID),

  relationship_type: z
    .nativeEnum(RelationshipType, {
      required_error: ORG_HIERARCHY_ERRORS.RELATIONSHIP_TYPE_REQUIRED,
      invalid_type_error: ORG_HIERARCHY_ERRORS.RELATIONSHIP_TYPE_INVALID,
    })
    .default(ORG_HIERARCHY_DEFAULTS.RELATIONSHIP_TYPE as RelationshipType),

  effective_from: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      required_error: ORG_HIERARCHY_ERRORS.EFFECTIVE_FROM_REQUIRED,
      invalid_type_error: ORG_HIERARCHY_ERRORS.EFFECTIVE_FROM_INVALID,
    })
    .refine((date) => date <= new Date(), ORG_HIERARCHY_ERRORS.FUTURE_EFFECTIVE_DATE),

  effective_to: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: ORG_HIERARCHY_ERRORS.EFFECTIVE_TO_INVALID,
    })
    .optional()
    .nullable(),

  department: z
    .string({
      invalid_type_error: ORG_HIERARCHY_ERRORS.DEPARTMENT_INVALID,
    })
    .min(ORG_HIERARCHY_VALIDATION.DEPARTMENT.MIN_LENGTH, ORG_HIERARCHY_ERRORS.DEPARTMENT_INVALID)
    .max(ORG_HIERARCHY_VALIDATION.DEPARTMENT.MAX_LENGTH, ORG_HIERARCHY_ERRORS.DEPARTMENT_INVALID)
    .trim()
    .optional()
    .nullable(),

  cost_center: z
    .string({
      invalid_type_error: ORG_HIERARCHY_ERRORS.COST_CENTER_INVALID,
    })
    .min(ORG_HIERARCHY_VALIDATION.COST_CENTER.MIN_LENGTH, ORG_HIERARCHY_ERRORS.COST_CENTER_INVALID)
    .max(ORG_HIERARCHY_VALIDATION.COST_CENTER.MAX_LENGTH, ORG_HIERARCHY_ERRORS.COST_CENTER_INVALID)
    .trim()
    .optional()
    .nullable(),

  delegation_level: z
    .number({
      required_error: ORG_HIERARCHY_ERRORS.DELEGATION_LEVEL_REQUIRED,
      invalid_type_error: ORG_HIERARCHY_ERRORS.DELEGATION_LEVEL_INVALID,
    })
    .int()
    .min(
      ORG_HIERARCHY_VALIDATION.DELEGATION_LEVEL.MIN,
      ORG_HIERARCHY_ERRORS.DELEGATION_LEVEL_INVALID,
    )
    .max(
      ORG_HIERARCHY_VALIDATION.DELEGATION_LEVEL.MAX,
      ORG_HIERARCHY_ERRORS.DELEGATION_LEVEL_INVALID,
    )
    .default(ORG_HIERARCHY_DEFAULTS.DELEGATION_LEVEL),
});

// Schema avec validation des dates logiques
const orgHierarchyWithDateValidation = baseOrgHierarchySchema.refine(
  (data) => {
    if (data.effective_to && data.effective_from > data.effective_to) {
      return false;
    }
    return true;
  },
  {
    message: ORG_HIERARCHY_ERRORS.EFFECTIVE_DATES_LOGIC_INVALID,
    path: ['effective_to'],
  },
);

// Schema pour la création - tous les champs requis
export const createOrgHierarchySchema = orgHierarchyWithDateValidation;

// Schema pour les mises à jour - tous les champs optionnels
export const updateOrgHierarchySchema = baseOrgHierarchySchema.partial().refine(
  (data) => {
    if (data.effective_to && data.effective_from! > data.effective_to) {
      return false;
    }
    return true;
  },
  {
    message: ORG_HIERARCHY_ERRORS.EFFECTIVE_DATES_LOGIC_INVALID,
    path: ['effective_to'],
  },
);

// Schema pour les filtres
export const orgHierarchyFiltersSchema = z
  .object({
    subordinate: z.number().int().optional(),
    supervisor: z.number().int().optional(),
    relationship_type: z.nativeEnum(RelationshipType).optional(),
    department: z.string().optional(),
    cost_center: z.string().optional(),
    delegation_level: z.number().int().optional(),
    effective_from: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    effective_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    active_only: z.boolean().optional(), // Pour filtrer les relations actives
  })
  .strict();

// Schema pour validation GUID
export const orgHierarchyGuidSchema = z
  .string()
  .min(ORG_HIERARCHY_VALIDATION.GUID.MIN_LENGTH, ORG_HIERARCHY_ERRORS.GUID_INVALID)
  .max(ORG_HIERARCHY_VALIDATION.GUID.MAX_LENGTH, ORG_HIERARCHY_ERRORS.GUID_INVALID);

// Fonctions de validation avec gestion d'erreurs
export const validateOrgHierarchyCreation = (data: any) => {
  try {
    return createOrgHierarchySchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateOrgHierarchyUpdate = (data: any) => {
  try {
    return updateOrgHierarchySchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateOrgHierarchyFilters = (data: any) => {
  try {
    return orgHierarchyFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateOrgHierarchyGuid = (guid: any) => {
  try {
    return orgHierarchyGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(ORG_HIERARCHY_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Validation métier personnalisée pour éviter l'auto-supervision
export const validateOrgHierarchyAssignment = (data: any) => {
  const validated = validateOrgHierarchyCreation(data);

  if (validated.subordinate === validated.supervisor) {
    throw new Error(ORG_HIERARCHY_ERRORS.SELF_SUPERVISION_INVALID);
  }

  return validated;
};

// Schema complet pour les réponses (avec métadonnées)
export const orgHierarchyResponseSchema = baseOrgHierarchySchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Export groupé pour faciliter les imports
export const orgHierarchySchemas = {
  validateOrgHierarchyCreation,
  validateOrgHierarchyUpdate,
  validateOrgHierarchyFilters,
  validateOrgHierarchyGuid,
  validateOrgHierarchyAssignment,
  createOrgHierarchySchema,
  updateOrgHierarchySchema,
  orgHierarchyFiltersSchema,
  orgHierarchyGuidSchema,
};

// Types TypeScript générés à partir des schemas
export type CreateOrgHierarchyInput = z.infer<typeof createOrgHierarchySchema>;
export type UpdateOrgHierarchyInput = z.infer<typeof updateOrgHierarchySchema>;
export type OrgHierarchyData = z.infer<typeof orgHierarchyResponseSchema>;
export type OrgHierarchyFilters = z.infer<typeof orgHierarchyFiltersSchema>;
