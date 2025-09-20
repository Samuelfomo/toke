// schemas/memos.ts
import { z } from 'zod';

import {
  MEMOS_DEFAULTS,
  MEMOS_ERRORS,
  MEMOS_VALIDATION,
  MemoStatus,
  MemoType,
} from '../../constants/tenant/memos.js';

// Schema pour valider les URLs d'attachments (HTTPS uniquement)
const httpsUrlSchema = z
  .string()
  .url()
  .refine((url) => url.startsWith('https://'), MEMOS_ERRORS.ATTACHMENTS_URL_INVALID);

// Schema pour valider les IDs d'entrées affectées
const affectedEntriesSchema = z
  .array(
    z
      .number()
      .int()
      .min(MEMOS_VALIDATION.AFFECTED_ENTRIES.MIN_ID)
      .max(MEMOS_VALIDATION.AFFECTED_ENTRIES.MAX_ID),
  )
  .refine(
    (entries) => entries.length > 0 && new Set(entries).size === entries.length,
    MEMOS_ERRORS.AFFECTED_ENTRIES_INVALID,
  );

// Base schema pour les validations communes
const baseMemosSchema = z.object({
  author_user: z
    .number({
      required_error: MEMOS_ERRORS.AUTHOR_USER_REQUIRED,
      invalid_type_error: MEMOS_ERRORS.AUTHOR_USER_INVALID,
    })
    .int()
    .min(MEMOS_VALIDATION.AUTHOR_USER.MIN, MEMOS_ERRORS.AUTHOR_USER_INVALID)
    .max(MEMOS_VALIDATION.AUTHOR_USER.MAX, MEMOS_ERRORS.AUTHOR_USER_INVALID),

  target_user: z
    .number({
      invalid_type_error: MEMOS_ERRORS.TARGET_USER_INVALID,
    })
    .int()
    .min(MEMOS_VALIDATION.TARGET_USER.MIN, MEMOS_ERRORS.TARGET_USER_INVALID)
    .max(MEMOS_VALIDATION.TARGET_USER.MAX, MEMOS_ERRORS.TARGET_USER_INVALID)
    .optional()
    .nullable(),

  validator_user: z
    .number({
      invalid_type_error: MEMOS_ERRORS.VALIDATOR_USER_INVALID,
    })
    .int()
    .min(MEMOS_VALIDATION.VALIDATOR_USER.MIN, MEMOS_ERRORS.VALIDATOR_USER_INVALID)
    .max(MEMOS_VALIDATION.VALIDATOR_USER.MAX, MEMOS_ERRORS.VALIDATOR_USER_INVALID)
    .optional()
    .nullable(),

  memo_type: z.nativeEnum(MemoType, {
    required_error: MEMOS_ERRORS.MEMO_TYPE_REQUIRED,
    invalid_type_error: MEMOS_ERRORS.MEMO_TYPE_INVALID,
  }),

  memo_status: z
    .nativeEnum(MemoStatus, {
      invalid_type_error: MEMOS_ERRORS.MEMO_STATUS_INVALID,
    })
    .default(MEMOS_DEFAULTS.MEMO_STATUS),

  title: z
    .string({
      required_error: MEMOS_ERRORS.TITLE_REQUIRED,
      invalid_type_error: MEMOS_ERRORS.TITLE_INVALID,
    })
    .min(MEMOS_VALIDATION.TITLE.MIN_LENGTH, MEMOS_ERRORS.TITLE_INVALID)
    .max(MEMOS_VALIDATION.TITLE.MAX_LENGTH, MEMOS_ERRORS.TITLE_INVALID)
    .trim(),

  description: z
    .string({
      required_error: MEMOS_ERRORS.DESCRIPTION_REQUIRED,
      invalid_type_error: MEMOS_ERRORS.DESCRIPTION_INVALID,
    })
    .min(MEMOS_VALIDATION.DESCRIPTION.MIN_LENGTH, MEMOS_ERRORS.DESCRIPTION_INVALID)
    .trim(),

  incident_datetime: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: MEMOS_ERRORS.INCIDENT_DATETIME_INVALID,
    })
    .refine((date) => date <= new Date(), MEMOS_ERRORS.FUTURE_INCIDENT_DATE)
    .optional()
    .nullable(),

  affected_session: z
    .number({
      invalid_type_error: MEMOS_ERRORS.AFFECTED_SESSION_INVALID,
    })
    .int()
    .min(MEMOS_VALIDATION.AFFECTED_SESSION.MIN, MEMOS_ERRORS.AFFECTED_SESSION_INVALID)
    .max(MEMOS_VALIDATION.AFFECTED_SESSION.MAX, MEMOS_ERRORS.AFFECTED_SESSION_INVALID)
    .optional()
    .nullable(),

  affected_entries: affectedEntriesSchema.optional().nullable(),

  attachments: z
    .array(httpsUrlSchema)
    .refine(
      (attachments) => attachments.every((url) => typeof url === 'string'),
      MEMOS_ERRORS.ATTACHMENTS_INVALID,
    )
    .optional()
    .nullable(),

  validator_comments: z
    .string({
      invalid_type_error: MEMOS_ERRORS.VALIDATOR_COMMENTS_INVALID,
    })
    .min(MEMOS_VALIDATION.VALIDATOR_COMMENTS.MIN_LENGTH, MEMOS_ERRORS.VALIDATOR_COMMENTS_INVALID)
    .max(MEMOS_VALIDATION.VALIDATOR_COMMENTS.MAX_LENGTH, MEMOS_ERRORS.VALIDATOR_COMMENTS_INVALID)
    .trim()
    .optional()
    .nullable(),

  processed_at: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: MEMOS_ERRORS.PROCESSED_AT_INVALID,
    })
    .optional()
    .nullable(),

  auto_generated: z
    .boolean({
      invalid_type_error: MEMOS_ERRORS.AUTO_GENERATED_INVALID,
    })
    .default(MEMOS_DEFAULTS.AUTO_GENERATED),

  auto_reason: z
    .string({
      invalid_type_error: MEMOS_ERRORS.AUTO_REASON_INVALID,
    })
    .min(MEMOS_VALIDATION.AUTO_REASON.MIN_LENGTH, MEMOS_ERRORS.AUTO_REASON_INVALID)
    .max(MEMOS_VALIDATION.AUTO_REASON.MAX_LENGTH, MEMOS_ERRORS.AUTO_REASON_INVALID)
    .trim()
    .optional()
    .nullable(),
});

// Schema avec validations métier complexes
const memosWithValidation = baseMemosSchema
  .refine(
    (data) => {
      // Auto-reason requis pour les mémos auto-générés
      if (data.auto_generated && !data.auto_reason) {
        return false;
      }
      return true;
    },
    {
      message: MEMOS_ERRORS.AUTO_REASON_REQUIRED,
      path: ['auto_reason'],
    },
  )
  .refine(
    (data) => {
      // Commentaires validateur requis pour approbation/rejet
      const requiresComments = [MemoStatus.APPROVED, MemoStatus.REJECTED];
      if (requiresComments.includes(data.memo_status) && !data.validator_comments) {
        return false;
      }
      return true;
    },
    {
      message: MEMOS_ERRORS.VALIDATOR_COMMENTS_REQUIRED,
      path: ['validator_comments'],
    },
  )
  .refine(
    (data) => {
      // Validateur requis pour approbation/rejet
      const requiresValidator = [MemoStatus.APPROVED, MemoStatus.REJECTED];
      if (requiresValidator.includes(data.memo_status) && !data.validator_user) {
        return false;
      }
      return true;
    },
    {
      message: MEMOS_ERRORS.VALIDATION_REQUIRED_FOR_APPROVAL,
      path: ['validator_user'],
    },
  );

// Schema pour la création - tous les champs requis
export const createMemosSchema = memosWithValidation;

// Schema pour les mises à jour - tous les champs optionnels
export const updateMemosSchema = baseMemosSchema.partial();
// export const updateMemosSchema = memosWithValidation.partial();

// Schema pour les filtres
export const memosFiltersSchema = z
  .object({
    author_user: z.number().int().optional(),
    target_user: z.number().int().optional(),
    validator_user: z.number().int().optional(),
    memo_type: z.nativeEnum(MemoType).optional(),
    memo_status: z.nativeEnum(MemoStatus).optional(),
    auto_generated: z.boolean().optional(),
    has_attachments: z.boolean().optional(),
    incident_date_from: z
      .union([z.date(), z.string().transform((val) => new Date(val))])
      .optional(),
    incident_date_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    processed_date_from: z
      .union([z.date(), z.string().transform((val) => new Date(val))])
      .optional(),
    processed_date_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    pending_validation: z.boolean().optional(), // Pour mémos en attente de validation
    my_memos_only: z.boolean().optional(), // Pour filtrer les mémos de l'utilisateur
  })
  .strict();

// Schema pour validation GUID
export const memosGuidSchema = z
  .string()
  .min(MEMOS_VALIDATION.GUID.MIN_LENGTH, MEMOS_ERRORS.GUID_INVALID)
  .max(MEMOS_VALIDATION.GUID.MAX_LENGTH, MEMOS_ERRORS.GUID_INVALID);

// Fonctions de validation avec gestion d'erreurs
export const validateMemosCreation = (data: any) => {
  try {
    return createMemosSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateMemosUpdate = (data: any) => {
  try {
    return updateMemosSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateMemosFilters = (data: any) => {
  try {
    return memosFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateMemosGuid = (guid: any) => {
  try {
    return memosGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(MEMOS_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Validation métier pour les transitions de statut
export const validateMemoStatusTransition = (currentStatus: MemoStatus, newStatus: MemoStatus) => {
  const validTransitions: Record<MemoStatus, MemoStatus[]> = {
    [MemoStatus.DRAFT]: [MemoStatus.SUBMITTED],
    [MemoStatus.SUBMITTED]: [MemoStatus.PENDING, MemoStatus.DRAFT],
    [MemoStatus.PENDING]: [MemoStatus.APPROVED, MemoStatus.REJECTED],
    [MemoStatus.APPROVED]: [], // Terminal state
    [MemoStatus.REJECTED]: [MemoStatus.DRAFT, MemoStatus.SUBMITTED], // Peut être refait
  };

  if (!validTransitions[currentStatus].includes(newStatus)) {
    throw new Error(MEMOS_ERRORS.INVALID_STATUS_TRANSITION);
  }

  return true;
};

// Validation pour éviter l'auto-validation
export const validateSelfValidation = (authorId: number, validatorId: number | null) => {
  if (validatorId && authorId === validatorId) {
    throw new Error(MEMOS_ERRORS.SELF_VALIDATION_NOT_ALLOWED);
  }
  return true;
};

// Validation de modification des mémos traités
export const validateModificationAllowed = (currentStatus: MemoStatus) => {
  const processedStatuses = [MemoStatus.APPROVED, MemoStatus.REJECTED];
  if (processedStatuses.includes(currentStatus)) {
    throw new Error(MEMOS_ERRORS.CANNOT_MODIFY_PROCESSED_MEMO);
  }
  return true;
};

// Schema complet pour les réponses (avec métadonnées)
export const memosResponseSchema = baseMemosSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Export groupé pour faciliter les imports
export const memosSchemas = {
  validateMemosCreation,
  validateMemosUpdate,
  validateMemosFilters,
  validateMemosGuid,
  validateMemoStatusTransition,
  validateSelfValidation,
  validateModificationAllowed,
  createMemosSchema,
  updateMemosSchema,
  memosFiltersSchema,
  memosGuidSchema,
};

// Types TypeScript générés à partir des schemas
export type CreateMemosInput = z.infer<typeof createMemosSchema>;
export type UpdateMemosInput = z.infer<typeof updateMemosSchema>;
export type MemosData = z.infer<typeof memosResponseSchema>;
export type MemosFilters = z.infer<typeof memosFiltersSchema>;
export type AffectedEntries = z.infer<typeof affectedEntriesSchema>;
