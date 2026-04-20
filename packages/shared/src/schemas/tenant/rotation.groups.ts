import { z } from 'zod';

import {
  CycleUnit,
  Direction,
  ROTATION_GROUP_CODES,
  ROTATION_GROUP_DEFAULTS,
  ROTATION_GROUP_ERRORS,
  ROTATION_GROUP_VALIDATION,
  RotationGroupCode,
} from '../../constants/tenant/rotation.groups.js';
import { UsersValidationUtils } from '../../utils/tenant/users.validation.js';

// ============================================================
// NOTE ARCHITECTURE — cycle_templates
// ============================================================
// Avant : cycle_templates était un INTEGER[] (IDs de SessionTemplate).
// Maintenant : cycle_templates est un STRING[] (GUIDs de SessionTemplate).
//
// Raison : à la création d'un RotationGroup, le manager fournit des GUIDs
// de SessionTemplate. Le backend résout chaque GUID, prend un snapshot JSONB
// complet, et crée un slot dans RotationGroupTemplates. L'API expose et
// accepte des GUIDs — jamais des IDs internes.
//
// Conséquence sur la validation :
//   - MIN_ITEMS / MAX_ITEMS / no-duplicate conservés
//   - Le type passe de z.number().int().positive() à z.string().uuid()
//     (ou z.string().min(1) si le GUID n'est pas forcément un UUID v4)
// ============================================================

// Base schema for common validations
const baseRotationGroupSchema = z.object({
  name: z
    .string({
      required_error: ROTATION_GROUP_ERRORS.NAME_REQUIRED,
      invalid_type_error: ROTATION_GROUP_ERRORS.NAME_INVALID,
    })
    .min(ROTATION_GROUP_VALIDATION.NAME.MIN_LENGTH, ROTATION_GROUP_ERRORS.NAME_INVALID)
    .max(ROTATION_GROUP_VALIDATION.NAME.MAX_LENGTH, ROTATION_GROUP_ERRORS.NAME_INVALID)
    .trim(),

  // cycle_length: z
  //   .number({
  //     required_error: ROTATION_GROUP_ERRORS.CYCLE_LENGTH_REQUIRED,
  //     invalid_type_error: ROTATION_GROUP_ERRORS.CYCLE_LENGTH_INVALID,
  //   })
  //   .int(ROTATION_GROUP_ERRORS.CYCLE_LENGTH_INVALID)
  //   .min(ROTATION_GROUP_VALIDATION.CYCLE_LENGTH.MIN, ROTATION_GROUP_ERRORS.CYCLE_LENGTH_INVALID)
  //   .max(ROTATION_GROUP_VALIDATION.CYCLE_LENGTH.MAX, ROTATION_GROUP_ERRORS.CYCLE_LENGTH_INVALID),

  cycle_unit: z.nativeEnum(CycleUnit, {
    required_error: ROTATION_GROUP_ERRORS.CYCLE_UNIT_REQUIRED,
    invalid_type_error: ROTATION_GROUP_ERRORS.CYCLE_UNIT_INVALID,
  }),

  direction: z
    .nativeEnum(Direction, {
      invalid_type_error: ROTATION_GROUP_ERRORS.DIRECTION_INVALID,
    })
    .default(ROTATION_GROUP_DEFAULTS.DIRECTION),

  auto_advance: z
    .boolean({
      invalid_type_error: ROTATION_GROUP_ERRORS.ACTIVE_INVALID,
    })
    .default(ROTATION_GROUP_DEFAULTS.AUTO_ADVANCE),

  rotation_step: z
    .number({
      invalid_type_error: ROTATION_GROUP_ERRORS.ROTATION_STEP_INVALID,
    })
    .int(ROTATION_GROUP_ERRORS.ROTATION_STEP_INVALID)
    .min(ROTATION_GROUP_VALIDATION.ROTATION_STEP.MIN, ROTATION_GROUP_ERRORS.ROTATION_STEP_INVALID)
    .max(ROTATION_GROUP_VALIDATION.ROTATION_STEP.MAX, ROTATION_GROUP_ERRORS.ROTATION_STEP_INVALID)
    .default(ROTATION_GROUP_DEFAULTS.ROTATION_STEP),

  // ── cycle_templates : tableau de GUIDs de SessionTemplate ──────────────
  // Chaque GUID est une string non-vide (pas forcément un UUID v4 canonique
  // pour rester flexible, conforme à l'existant du projet).
  // Les contraintes de cardinalité et de doublons sont inchangées.
  cycle_templates: z
    .array(
      z
        .string({
          invalid_type_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID,
          required_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_REQUIRED,
        })
        .min(2, ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID)
        .trim()
        .refine((guid) => UsersValidationUtils.validateGuid(guid), {
          message: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID,
        }),
      {
        required_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_REQUIRED,
        invalid_type_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID,
      },
    )
    .min(
      ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MIN_ITEMS,
      ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_EMPTY,
    )
    .max(
      ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MAX_ITEMS,
      ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_TOO_MANY,
    )
    .refine(
      (templates) => {
        // Pas de GUID dupliqué dans le même cycle
        const unique = new Set(templates);
        return unique.size === templates.length;
      },
      { message: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_DUPLICATE },
    ),

  start_date: z
    .string({
      required_error: ROTATION_GROUP_ERRORS.START_DATE_REQUIRED,
      invalid_type_error: ROTATION_GROUP_ERRORS.START_DATE_INVALID,
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, ROTATION_GROUP_ERRORS.START_DATE_INVALID)
    .refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      },
      { message: ROTATION_GROUP_ERRORS.START_DATE_INVALID },
    ),

  active: z
    .boolean({
      invalid_type_error: ROTATION_GROUP_ERRORS.ACTIVE_INVALID,
    })
    .default(ROTATION_GROUP_DEFAULTS.ACTIVE),
});

// Schema for creation - all fields required
export const createRotationGroupSchema = baseRotationGroupSchema;

// Schema for updates — cycle_templates optionnel :
// une mise à jour du cycle passe par replaceCycleSlot() qui opère
// sur un seul slot à la fois. Passer cycle_templates complet sur un update
// est intentionnellement déconseillé (risque d'écrasement silencieux).
export const updateRotationGroupSchema = baseRotationGroupSchema
  .omit({ cycle_templates: true })
  .partial();

// Schema dédié pour remplacer UN slot du cycle (appel à replaceCycleSlot)
export const replaceCycleSlotSchema = z.object({
  position: z
    .number({
      required_error: 'position is required',
      invalid_type_error: 'position must be a non-negative integer',
    })
    .int()
    .min(0, 'position must be >= 0'),

  template_guid: z
    .string({
      required_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_REQUIRED,
      invalid_type_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID,
    })
    .min(1, ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID)
    .trim(),

  reason: z.string().max(500).optional(),
});

// Schema for filters
export const rotationGroupFiltersSchema = z
  .object({
    tenant: z.string().optional(),
    name: z.string().optional(),
    cycle_unit: z.nativeEnum(CycleUnit).optional(),
    direction: z.nativeEnum(Direction).optional(),
    active: z.boolean().optional(),
    rotation_step: z.number().int().optional(),
    auto_advance: z.boolean().optional(),
    start_date_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    start_date_to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();

// Schema for GUID validation
export const rotationGroupGuidSchema = z
  .string()
  .min(ROTATION_GROUP_VALIDATION.GUID.MIN_LENGTH, ROTATION_GROUP_ERRORS.GUID_INVALID)
  .max(ROTATION_GROUP_VALIDATION.GUID.MAX_LENGTH, ROTATION_GROUP_ERRORS.GUID_INVALID);

// ============================================================
// FIELD → CODE MAPPING
// ============================================================
const FIELD_TO_CODE_MAP: Record<string, RotationGroupCode> = {
  name: ROTATION_GROUP_CODES.NAME_INVALID,
  direction: ROTATION_GROUP_CODES.DIRECTION_INVALID,
  auto_advance: ROTATION_GROUP_CODES.AUTO_ADVANCE_INVALID,
  rotation_step: ROTATION_GROUP_CODES.ROTATION_STEP_INVALID,
  cycle_unit: ROTATION_GROUP_CODES.CYCLE_UNIT_INVALID,
  cycle_templates: ROTATION_GROUP_CODES.CYCLE_TEMPLATES_INVALID,
  start_date: ROTATION_GROUP_CODES.START_DATE_INVALID,
  active: ROTATION_GROUP_CODES.ACTIVE_INVALID,
  position: ROTATION_GROUP_CODES.VALIDATION_FAILED,
  template_guid: ROTATION_GROUP_CODES.CYCLE_TEMPLATES_INVALID,
};

// ============================================================
// FONCTIONS DE VALIDATION
// ============================================================

export const validateRotationGroupCreation = (data: any) => {
  const result = createRotationGroupSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || ROTATION_GROUP_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

export const validateRotationGroupUpdate = (data: any) => {
  const result = updateRotationGroupSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || ROTATION_GROUP_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

export const validateReplaceCycleSlot = (data: any) => {
  const result = replaceCycleSlotSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || ROTATION_GROUP_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

export const validateRotationGroupFilters = (data: any) => {
  const result = rotationGroupFiltersSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;

    const error: any = new Error(firstError.message);
    error.code = ROTATION_GROUP_CODES.FILTER_INVALID;
    throw error;
  }

  return result.data;
};

export const validateRotationGroupGuid = (guid: any) => {
  const result = rotationGroupGuidSchema.safeParse(guid);

  if (!result.success) {
    const error: any = new Error(ROTATION_GROUP_ERRORS.GUID_INVALID);
    error.code = ROTATION_GROUP_CODES.INVALID_GUID;
    throw error;
  }

  return result.data;
};

// Complete schema for responses (with metadata)
export const rotationGroupResponseSchema = baseRotationGroupSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
});

// Grouped export for easier imports
export const rotationGroupSchemas = {
  validateRotationGroupCreation,
  validateRotationGroupUpdate,
  validateReplaceCycleSlot,
  validateRotationGroupFilters,
  validateRotationGroupGuid,
  createRotationGroupSchema,
  updateRotationGroupSchema,
  replaceCycleSlotSchema,
  rotationGroupFiltersSchema,
  rotationGroupGuidSchema,
};

// TypeScript types generated from schemas
export type CreateRotationGroupInput = z.infer<typeof createRotationGroupSchema>;
export type UpdateRotationGroupInput = z.infer<typeof updateRotationGroupSchema>;
export type ReplaceCycleSlotInput = z.infer<typeof replaceCycleSlotSchema>;
export type RotationGroupData = z.infer<typeof rotationGroupResponseSchema>;
export type RotationGroupFilters = z.infer<typeof rotationGroupFiltersSchema>;

// import { z } from 'zod';
//
// import {
//   CycleUnit,
//   ROTATION_GROUP_CODES,
//   ROTATION_GROUP_DEFAULTS,
//   ROTATION_GROUP_ERRORS,
//   ROTATION_GROUP_VALIDATION,
//   RotationGroupCode,
// } from '../../constants/tenant/rotation.groups.js';
//
// // Base schema for common validations
// const baseRotationGroupSchema = z.object({
//   // tenant: z
//   //   .string({
//   //     required_error: ROTATION_GROUP_ERRORS.TENANT_REQUIRED,
//   //     invalid_type_error: ROTATION_GROUP_ERRORS.TENANT_INVALID,
//   //   })
//   //   .min(ROTATION_GROUP_VALIDATION.TENANT.MIN_LENGTH, ROTATION_GROUP_ERRORS.TENANT_INVALID)
//   //   .max(ROTATION_GROUP_VALIDATION.TENANT.MAX_LENGTH, ROTATION_GROUP_ERRORS.TENANT_INVALID)
//   //   .trim(),
//
//   name: z
//     .string({
//       required_error: ROTATION_GROUP_ERRORS.NAME_REQUIRED,
//       invalid_type_error: ROTATION_GROUP_ERRORS.NAME_INVALID,
//     })
//     .min(ROTATION_GROUP_VALIDATION.NAME.MIN_LENGTH, ROTATION_GROUP_ERRORS.NAME_INVALID)
//     .max(ROTATION_GROUP_VALIDATION.NAME.MAX_LENGTH, ROTATION_GROUP_ERRORS.NAME_INVALID)
//     .trim(),
//
//   cycle_length: z
//     .number({
//       required_error: ROTATION_GROUP_ERRORS.CYCLE_LENGTH_REQUIRED,
//       invalid_type_error: ROTATION_GROUP_ERRORS.CYCLE_LENGTH_INVALID,
//     })
//     .int(ROTATION_GROUP_ERRORS.CYCLE_LENGTH_INVALID)
//     .min(ROTATION_GROUP_VALIDATION.CYCLE_LENGTH.MIN, ROTATION_GROUP_ERRORS.CYCLE_LENGTH_INVALID)
//     .max(ROTATION_GROUP_VALIDATION.CYCLE_LENGTH.MAX, ROTATION_GROUP_ERRORS.CYCLE_LENGTH_INVALID),
//
//   cycle_unit: z.nativeEnum(CycleUnit, {
//     required_error: ROTATION_GROUP_ERRORS.CYCLE_UNIT_REQUIRED,
//     invalid_type_error: ROTATION_GROUP_ERRORS.CYCLE_UNIT_INVALID,
//   }),
//
//   // cycle_templates: z
//   //   .array(z.number().int().positive(ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID), {
//   //     required_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_REQUIRED,
//   //     invalid_type_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID,
//   //   })
//   //   .min(
//   //     ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MIN_ITEMS,
//   //     ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_EMPTY,
//   //   )
//   //   .max(
//   //     ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MAX_ITEMS,
//   //     ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_TOO_MANY,
//   //   )
//   //   .refine(
//   //     (templates) => {
//   //       // Check for duplicates
//   //       const uniqueTemplates = new Set(templates);
//   //       return uniqueTemplates.size === templates.length;
//   //     },
//   //     { message: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_DUPLICATE },
//   //   ),
//
//   cycle_templates: z
//     .array(
//       z
//         .string({
//           invalid_type_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID,
//           required_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_REQUIRED,
//         })
//         .min(1, ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID)
//         .trim(),
//       {
//         required_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_REQUIRED,
//         invalid_type_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID,
//       },
//     )
//     .min(
//       ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MIN_ITEMS,
//       ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_EMPTY,
//     )
//     .max(
//       ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MAX_ITEMS,
//       ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_TOO_MANY,
//     )
//     .refine(
//       (templates) => {
//         const uniqueTemplates = new Set(templates);
//         return uniqueTemplates.size === templates.length;
//       },
//       { message: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_DUPLICATE },
//     ),
//
//   start_date: z
//     .string({
//       required_error: ROTATION_GROUP_ERRORS.START_DATE_REQUIRED,
//       invalid_type_error: ROTATION_GROUP_ERRORS.START_DATE_INVALID,
//     })
//     .regex(/^\d{4}-\d{2}-\d{2}$/, ROTATION_GROUP_ERRORS.START_DATE_INVALID)
//     .refine(
//       (date) => {
//         const parsed = new Date(date);
//         return !isNaN(parsed.getTime());
//       },
//       { message: ROTATION_GROUP_ERRORS.START_DATE_INVALID },
//     ),
//
//   active: z
//     .boolean({
//       invalid_type_error: ROTATION_GROUP_ERRORS.ACTIVE_INVALID,
//     })
//     .default(ROTATION_GROUP_DEFAULTS.ACTIVE),
// });
//
// // Schema for creation - all fields required
// export const createRotationGroupSchema = baseRotationGroupSchema;
//
// // Schema for updates - all fields optional
// export const updateRotationGroupSchema = baseRotationGroupSchema.partial();
//
// // Schema for filters
// export const rotationGroupFiltersSchema = z
//   .object({
//     tenant: z.string().optional(),
//     name: z.string().optional(),
//     cycle_unit: z.nativeEnum(CycleUnit).optional(),
//     active: z.boolean().optional(),
//     start_date_from: z
//       .string()
//       .regex(/^\d{4}-\d{2}-\d{2}$/)
//       .optional(),
//     start_date_to: z
//       .string()
//       .regex(/^\d{4}-\d{2}-\d{2}$/)
//       .optional(),
//   })
//   .strict();
//
// // Schema for GUID validation
// export const rotationGroupGuidSchema = z
//   .string()
//   .min(ROTATION_GROUP_VALIDATION.GUID.MIN_LENGTH, ROTATION_GROUP_ERRORS.GUID_INVALID)
//   .max(ROTATION_GROUP_VALIDATION.GUID.MAX_LENGTH, ROTATION_GROUP_ERRORS.GUID_INVALID);
//
// // Shared constant for field -> code mapping
// const FIELD_TO_CODE_MAP: Record<string, RotationGroupCode> = {
//   tenant: ROTATION_GROUP_CODES.TENANT_INVALID,
//   name: ROTATION_GROUP_CODES.NAME_INVALID,
//   cycle_length: ROTATION_GROUP_CODES.CYCLE_LENGTH_INVALID,
//   cycle_unit: ROTATION_GROUP_CODES.CYCLE_UNIT_INVALID,
//   cycle_templates: ROTATION_GROUP_CODES.CYCLE_TEMPLATES_INVALID,
//   start_date: ROTATION_GROUP_CODES.START_DATE_INVALID,
//   active: ROTATION_GROUP_CODES.ACTIVE_INVALID,
// };
//
// // Validation function for creation
// export const validateRotationGroupCreation = (data: any) => {
//   const result = createRotationGroupSchema.safeParse(data);
//
//   if (!result.success) {
//     const firstError = result.error.issues[0]!;
//     const field = firstError.path[0] as string;
//
//     const error: any = new Error(firstError.message);
//     error.code = FIELD_TO_CODE_MAP[field] || ROTATION_GROUP_CODES.VALIDATION_FAILED;
//     throw error;
//   }
//
//   return result.data;
// };
//
// // Validation function for update
// export const validateRotationGroupUpdate = (data: any) => {
//   const result = updateRotationGroupSchema.safeParse(data);
//
//   if (!result.success) {
//     const firstError = result.error.issues[0]!;
//     const field = firstError.path[0] as string;
//
//     const error: any = new Error(firstError.message);
//     error.code = FIELD_TO_CODE_MAP[field] || ROTATION_GROUP_CODES.VALIDATION_FAILED;
//     throw error;
//   }
//
//   return result.data;
// };
//
// export const validateRotationGroupFilters = (data: any) => {
//   const result = rotationGroupFiltersSchema.safeParse(data);
//
//   if (!result.success) {
//     const firstError = result.error.issues[0]!;
//
//     const error: any = new Error(firstError.message);
//     error.code = ROTATION_GROUP_CODES.FILTER_INVALID;
//     throw error;
//   }
//
//   return result.data;
// };
//
// export const validateRotationGroupGuid = (guid: any) => {
//   const result = rotationGroupGuidSchema.safeParse(guid);
//
//   if (!result.success) {
//     const error: any = new Error(ROTATION_GROUP_ERRORS.GUID_INVALID);
//     error.code = ROTATION_GROUP_CODES.INVALID_GUID;
//     throw error;
//   }
//
//   return result.data;
// };
//
// // Complete schema for responses (with metadata)
// export const rotationGroupResponseSchema = baseRotationGroupSchema.extend({
//   id: z.number().int().positive(),
//   guid: z.string(),
//   created_at: z.string().datetime(),
//   updated_at: z.string().datetime(),
//   deleted_at: z.string().datetime().nullable().optional(),
// });
//
// // Grouped export for easier imports
// export const rotationGroupSchemas = {
//   validateRotationGroupCreation,
//   validateRotationGroupUpdate,
//   validateRotationGroupFilters,
//   validateRotationGroupGuid,
//   createRotationGroupSchema,
//   updateRotationGroupSchema,
//   rotationGroupFiltersSchema,
//   rotationGroupGuidSchema,
// };
//
// // TypeScript types generated from schemas
// export type CreateRotationGroupInput = z.infer<typeof createRotationGroupSchema>;
// export type UpdateRotationGroupInput = z.infer<typeof updateRotationGroupSchema>;
// export type RotationGroupData = z.infer<typeof rotationGroupResponseSchema>;
// export type RotationGroupFilters = z.infer<typeof rotationGroupFiltersSchema>;
