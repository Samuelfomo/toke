// schemas/memos_validation.ts
import { z } from 'zod';
import TimezoneConfig from '@toke/api/dist/utils/timezone.config.js';

import {
  MEMOS_CODES,
  MEMOS_ERRORS,
  MEMOS_VALIDATION,
  MemoStatus,
  MemoType,
  MessageType,
} from '../../constants/tenant/memos.js';

// ============================================================================
// SCHEMAS DE BASE POUR MESSAGE
// ============================================================================

export const messageSchema = z.object({
  type: z.nativeEnum(MessageType, {
    required_error: MEMOS_ERRORS.MESSAGE_TYPE_REQUIRED,
    invalid_type_error: MEMOS_ERRORS.MESSAGE_TYPE_INVALID,
  }),
  content: z.union(
    [
      z.string().min(10, MEMOS_ERRORS.NOT_EMPTY_CONTENT),
      z
        .array(z.string().url(MEMOS_ERRORS.INVALID_ATTACTMENT_LINK))
        .min(1, MEMOS_ERRORS.LINK_IS_REQUIRED),
    ],
    {
      required_error: MEMOS_ERRORS.CONTENT_REQUIRED,
      invalid_type_error: MEMOS_ERRORS.INVALID_CONTENT,
    },
  ),
});

export const memoContentSchema = z.object({
  created_at: z
    .union([z.date(), z.string().datetime('Invalid datetime format')])
    // .default(() => new Date().toISOString()),
    .default(() => TimezoneConfig.getCurrentTime().toISOString()),
  user: z
    .string()
    .min(MEMOS_VALIDATION.AUTHOR_USER.MIN_LENGTH, {
      message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
    })
    .max(MEMOS_VALIDATION.AUTHOR_USER.MAX_LENGTH, {
      message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
    }),
  message: z.array(messageSchema), //messageSchema.or(z.array(messageSchema)),
  type: z.enum(['initial', 'response', 'validation', 'escalation']).optional(),
});

// ============================================================================
// SCHEMA POUR AJOUTER UN MESSAGE
// ============================================================================

export const addMessageSchema = z.object({
  user: z
    .string({
      required_error: 'User GUID is required',
      invalid_type_error: MEMOS_ERRORS.AUTHOR_USER_INVALID,
    })
    .min(MEMOS_VALIDATION.AUTHOR_USER.MIN_LENGTH, {
      message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
    })
    .max(MEMOS_VALIDATION.AUTHOR_USER.MAX_LENGTH, {
      message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
    })
    .trim(),

  message: z.array(messageSchema), //messageSchema.or(z.array(messageSchema)),

  // message_type: z.nativeEnum(MessageType, {
  //   required_error: 'Message type is required (TEXT or LINK)',
  //   invalid_type_error: 'Message type must be TEXT or LINK',
  // }),
  //
  // message_content: z.union(
  //   [
  //     z.string().min(10, 'Text message must be at least 10 characters'),
  //     z
  //       .array(z.string().url('Each link must be a valid HTTPS URL'))
  //       .min(1, 'At least one link is required'),
  //   ],
  //   {
  //     required_error: 'Message content is required',
  //     invalid_type_error: 'Message content must be text or array of links',
  //   },
  // ),

  content_type: z.enum(['initial', 'response', 'validation', 'escalation']).optional(),
});

// ============================================================================
// SCHEMA POUR ESCALADE
// ============================================================================

export const escalationSchema = z.object({
  escalator: z
    .string({
      required_error: 'Escalator user GUID is required',
      invalid_type_error: MEMOS_ERRORS.AUTHOR_USER_INVALID,
    })
    .min(MEMOS_VALIDATION.AUTHOR_USER.MIN_LENGTH, {
      message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
    })
    .max(MEMOS_VALIDATION.AUTHOR_USER.MAX_LENGTH, {
      message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
    })
    .trim(),

  new_validator: z
    .string({
      required_error: 'New validator user GUID is required',
      invalid_type_error: MEMOS_ERRORS.VALIDATOR_USER_INVALID,
    })
    .min(MEMOS_VALIDATION.VALIDATOR_USER.MIN_LENGTH, {
      message: MEMOS_ERRORS.VALIDATOR_USER_INVALID,
    })
    .max(MEMOS_VALIDATION.VALIDATOR_USER.MAX_LENGTH, {
      message: MEMOS_ERRORS.VALIDATOR_USER_INVALID,
    })
    .trim(),

  message: z.array(messageSchema), //messageSchema.or(z.array(messageSchema)),
});

// ============================================================================
// SCHEMAS DE VALIDATION
// ============================================================================

// Schema pour valider les IDs d'entrées affectées
const affectedEntriesSchema = z
  .array(
    z
      .string()
      .min(MEMOS_VALIDATION.AFFECTED_ENTRIES.MIN_LENGTH, {
        message: MEMOS_ERRORS.AFFECTED_ENTRIES_INVALID,
      })
      .max(MEMOS_VALIDATION.AFFECTED_ENTRIES.MAX_LENGTH, {
        message: MEMOS_ERRORS.AFFECTED_ENTRIES_INVALID,
      })
      .trim(),
  )
  .refine((entries) => entries.length > 0 && new Set(entries).size === entries.length, {
    message: MEMOS_ERRORS.AFFECTED_ENTRIES_INVALID,
  });

// Base schema pour les validations communes
const baseMemosSchema = z.object({
  author_user: z
    .string({
      invalid_type_error: MEMOS_ERRORS.AUTHOR_USER_INVALID,
    })
    .min(MEMOS_VALIDATION.AUTHOR_USER.MIN_LENGTH, {
      message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
    })
    .max(MEMOS_VALIDATION.AUTHOR_USER.MAX_LENGTH, {
      message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
    })
    .trim(),

  target_user: z
    .string({
      invalid_type_error: MEMOS_ERRORS.TARGET_USER_INVALID,
    })
    .min(MEMOS_VALIDATION.TARGET_USER.MIN_LENGTH, {
      message: MEMOS_ERRORS.TARGET_USER_INVALID,
    })
    .max(MEMOS_VALIDATION.TARGET_USER.MAX_LENGTH, {
      message: MEMOS_ERRORS.TARGET_USER_INVALID,
    })
    .trim()
    .optional()
    .nullable(),

  validator_user: z
    .string({
      invalid_type_error: MEMOS_ERRORS.VALIDATOR_USER_INVALID,
    })
    .min(MEMOS_VALIDATION.VALIDATOR_USER.MIN_LENGTH, {
      message: MEMOS_ERRORS.VALIDATOR_USER_INVALID,
    })
    .max(MEMOS_VALIDATION.VALIDATOR_USER.MAX_LENGTH, {
      message: MEMOS_ERRORS.VALIDATOR_USER_INVALID,
    })
    .trim()
    .optional()
    .nullable(),

  memo_type: z.nativeEnum(MemoType, {
    required_error: MEMOS_ERRORS.MEMO_TYPE_REQUIRED,
    invalid_type_error: MEMOS_ERRORS.MEMO_TYPE_INVALID,
    // errorMap: () => ({ message: MEMOS_ERRORS.MEMO_TYPE_INVALID }),
  }),

  memo_status: z
    .nativeEnum(MemoStatus, {
      invalid_type_error: MEMOS_ERRORS.MEMO_STATUS_INVALID,
      // errorMap: () => ({ message: MEMOS_ERRORS.MEMO_STATUS_INVALID }),
    })
    .optional(),

  title: z
    .string({
      required_error: MEMOS_ERRORS.TITLE_REQUIRED,
      invalid_type_error: MEMOS_ERRORS.TITLE_INVALID,
    })
    .min(MEMOS_VALIDATION.TITLE.MIN_LENGTH, { message: MEMOS_ERRORS.TITLE_INVALID })
    .max(MEMOS_VALIDATION.TITLE.MAX_LENGTH, { message: MEMOS_ERRORS.TITLE_INVALID })
    .trim(),

  details: z
    .string({
      invalid_type_error: MEMOS_ERRORS.DETAILS_INVALID,
    })
    .min(MEMOS_VALIDATION.DETAILS.MIN_LENGTH, { message: MEMOS_ERRORS.DETAILS_INVALID })
    .trim()
    .optional()
    .nullable(),

  incident_datetime: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: MEMOS_ERRORS.INCIDENT_DATETIME_INVALID,
    })
    .refine((date) => date <= new Date(), { message: MEMOS_ERRORS.FUTURE_INCIDENT_DATE })
    .optional()
    .nullable(),

  affected_session: z
    .string({
      invalid_type_error: MEMOS_ERRORS.AFFECTED_SESSION_INVALID,
    })
    .min(MEMOS_VALIDATION.AFFECTED_SESSION.MIN_LENGTH, {
      message: MEMOS_ERRORS.AFFECTED_SESSION_INVALID,
    })
    .max(MEMOS_VALIDATION.AFFECTED_SESSION.MAX_LENGTH, {
      message: MEMOS_ERRORS.AFFECTED_SESSION_INVALID,
    })
    .trim()
    .optional()
    .nullable(),

  affected_entries: affectedEntriesSchema.optional().nullable(),
  memo_content: z.array(memoContentSchema),
  // memo_content: z.array(memoContentSchema).optional().nullable(),
});

// ============================================================================
// SCHEMAS DE CRÉATION
// ============================================================================

// Schema pour créer un memo par un employé
export const createEmployeeMemoSchema = baseMemosSchema
  .pick({
    author_user: true,
    memo_type: true,
    memo_status: true,
    title: true,
    memo_content: true,
    incident_datetime: true,
    affected_session: true,
    affected_entries: true,
  })
  .extend({
    author_user: z
      .string({
        required_error: MEMOS_ERRORS.AUTHOR_USER_REQUIRED,
        invalid_type_error: MEMOS_ERRORS.AUTHOR_USER_INVALID,
      })
      .min(MEMOS_VALIDATION.AUTHOR_USER.MIN_LENGTH, {
        message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
      })
      .max(MEMOS_VALIDATION.AUTHOR_USER.MAX_LENGTH, {
        message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
      })
      .trim(),
    memo_content: z.array(memoContentSchema),
  });

// Schema pour créer un memo par un manager
export const createManagerMemoSchema = baseMemosSchema
  .pick({
    author_user: true,
    target_user: true,
    memo_type: true,
    memo_status: true,
    title: true,
    memo_content: true,
    incident_datetime: true,
    affected_session: true,
    affected_entries: true,
  })
  .extend({
    author_user: z
      .string({
        required_error: MEMOS_ERRORS.AUTHOR_USER_REQUIRED,
        invalid_type_error: MEMOS_ERRORS.AUTHOR_USER_INVALID,
      })
      .min(MEMOS_VALIDATION.AUTHOR_USER.MIN_LENGTH, {
        message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
      })
      .max(MEMOS_VALIDATION.AUTHOR_USER.MAX_LENGTH, {
        message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
      })
      .trim(),
    target_user: z
      .string({
        required_error: MEMOS_ERRORS.TARGET_USER_REQUIRED,
        invalid_type_error: MEMOS_ERRORS.TARGET_USER_INVALID,
      })
      .min(MEMOS_VALIDATION.TARGET_USER.MIN_LENGTH, {
        message: MEMOS_ERRORS.TARGET_USER_INVALID,
      })
      .max(MEMOS_VALIDATION.TARGET_USER.MAX_LENGTH, {
        message: MEMOS_ERRORS.TARGET_USER_INVALID,
      })
      .trim(),
    memo_content: z.array(memoContentSchema),
  });

// Schema pour créer un memo système (auto-généré)
export const createSystemMemoSchema = baseMemosSchema
  .pick({
    target_user: true,
    memo_type: true,
    memo_status: true,
    title: true,
    memo_content: true,
    details: true,
    incident_datetime: true,
    affected_session: true,
    affected_entries: true,
  })
  .extend({
    target_user: z
      .string({
        required_error: MEMOS_ERRORS.TARGET_USER_REQUIRED,
        invalid_type_error: MEMOS_ERRORS.TARGET_USER_INVALID,
      })
      .min(MEMOS_VALIDATION.TARGET_USER.MIN_LENGTH, {
        message: MEMOS_ERRORS.TARGET_USER_INVALID,
      })
      .max(MEMOS_VALIDATION.TARGET_USER.MAX_LENGTH, {
        message: MEMOS_ERRORS.TARGET_USER_INVALID,
      })
      .trim(),
    memo_content: z.array(memoContentSchema),
  });

// Schema générique pour créer un memo (détecte automatiquement le type)
export const createMemosSchema = baseMemosSchema;

// ============================================================================
// SCHEMAS DE MISE À JOUR
// ============================================================================

export const updateMemosSchema = baseMemosSchema.partial();

// Schema pour répondre à un memo (employé répond au manager ou système)
export const respondToMemoSchema = z.object({
  memo_content: z.array(memoContentSchema),
});

// Schema pour valider un memo (manager valide la réponse)
export const validateMemoSchema = z.object({
  validator_user: z
    .string({
      required_error: MEMOS_ERRORS.VALIDATOR_USER_REQUIRED,
      invalid_type_error: MEMOS_ERRORS.VALIDATOR_USER_INVALID,
    })
    .min(MEMOS_VALIDATION.VALIDATOR_USER.MIN_LENGTH, {
      message: MEMOS_ERRORS.VALIDATOR_USER_INVALID,
    })
    .trim(),
  message: z.array(messageSchema).optional(), //messageSchema.or(z.array(messageSchema)),

  // message_type: z.nativeEnum(MessageType, {
  //   required_error: 'Message type is required (TEXT or LINK)',
  //   invalid_type_error: 'Message type must be TEXT or LINK',
  // }),
  //
  // message_content: z.union(
  //   [
  //     z.string().min(10, 'Text message must be at least 10 characters'),
  //     z
  //       .array(z.string().url('Each link must be a valid HTTPS URL'))
  //       .min(1, 'At least one link is required'),
  //   ],
  //   {
  //     required_error: 'Message content is required',
  //     invalid_type_error: 'Message content must be text or array of links',
  //   },
  // ),

  content_type: z.enum(['initial', 'response', 'validation', 'escalation']).optional(),
});

// ============================================================================
// SCHEMAS DE FILTRES
// ============================================================================

export const memosFiltersSchema = z
  .object({
    author_user: z.string().optional(),
    target_user: z.string().optional(),
    validator_user: z.string().optional(),
    memo_type: z.nativeEnum(MemoType).optional(),
    memo_status: z.nativeEnum(MemoStatus).optional(),
    has_content: z.boolean().optional(),
    auto_generated: z.boolean().optional(),
    incident_date_from: z
      .union([z.date(), z.string().transform((val) => new Date(val))])
      .optional(),
    incident_date_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    pending_response: z.boolean().optional(),
    pending_validation: z.boolean().optional(),
    my_memos_only: z.boolean().optional(),
  })
  .strict();

export const memosGuidSchema = z
  .string()
  .min(MEMOS_VALIDATION.GUID.MIN_LENGTH, { message: MEMOS_ERRORS.GUID_INVALID })
  .max(MEMOS_VALIDATION.GUID.MAX_LENGTH, { message: MEMOS_ERRORS.GUID_INVALID })
  .trim();

// ============================================================================
// FONCTIONS DE VALIDATION
// ============================================================================

export const validateMemosCreation = (data: any) => {
  const result = createMemosSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: MEMOS_CODES.VALIDATION_FAILED,
    }));
    return { success: false, errors };
  }
  return { success: true, data: result.data };
};

export const validateMemosUpdate = (data: any) => {
  const result = updateMemosSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: MEMOS_CODES.VALIDATION_FAILED,
    }));
    return { success: false, errors };
  }
  return { success: true, data: result.data };
};

export const validateMemoResponse = (data: any) => {
  const result = respondToMemoSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: MEMOS_CODES.VALIDATION_FAILED,
    }));
    return { success: false, errors };
  }
  return { success: true, data: result.data };
};

export const validateMemoValidation = (data: any) => {
  const result = validateMemoSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: MEMOS_CODES.VALIDATION_FAILED,
    }));
    return { success: false, errors };
  }
  return { success: true, data: result.data };
};

export const validateMemosFilters = (data: any) => {
  const result = memosFiltersSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: MEMOS_CODES.FILTER_INVALID,
    }));
    return { success: false, errors };
  }
  return { success: true, data: result.data };
};

export const validateMemosGuid = (guid: any) => {
  const result = memosGuidSchema.safeParse(guid);
  if (!result.success) {
    return {
      success: false,
      errors: [
        {
          field: 'guid',
          message: MEMOS_ERRORS.GUID_INVALID,
          code: MEMOS_CODES.INVALID_GUID,
        },
      ],
    };
  }
  return { success: true, data: result.data };
};

export const validateAddMessage = (data: any) => {
  const result = addMessageSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: MEMOS_CODES.VALIDATION_FAILED,
    }));
    return { success: false, errors };
  }
  return { success: true, data: result.data };
};

export const validateEscalation = (data: any) => {
  const result = escalationSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: MEMOS_CODES.VALIDATION_FAILED,
    }));
    return { success: false, errors };
  }
  return { success: true, data: result.data };
};

// ============================================================================
// VALIDATIONS MÉTIER
// ============================================================================

export const validateMemoStatusTransition = (currentStatus: MemoStatus, newStatus: MemoStatus) => {
  const validTransitions: Record<MemoStatus, MemoStatus[]> = {
    [MemoStatus.SUBMITTED]: [MemoStatus.PENDING],
    [MemoStatus.PENDING]: [MemoStatus.APPROVED, MemoStatus.REJECTED],
    [MemoStatus.APPROVED]: [], // Terminal state
    [MemoStatus.REJECTED]: [MemoStatus.PENDING], // Peut être refait
  };

  if (!validTransitions[currentStatus].includes(newStatus)) {
    return {
      success: false,
      errors: [
        {
          field: 'memo_status',
          message: MEMOS_ERRORS.INVALID_STATUS_TRANSITION,
          code: MEMOS_CODES.INVALID_STATUS_TRANSITION,
        },
      ],
    };
  }
  return { success: true };
};

export const validateSelfValidation = (authorId: string, validatorId: string | null) => {
  if (validatorId && authorId === validatorId) {
    return {
      success: false,
      errors: [
        {
          field: 'validator_user',
          message: MEMOS_ERRORS.SELF_VALIDATION_NOT_ALLOWED,
          code: MEMOS_CODES.SELF_VALIDATION_NOT_ALLOWED,
        },
      ],
    };
  }
  return { success: true };
};

export const validateMemoModificationAllowed = (currentStatus: MemoStatus) => {
  const processedStatuses = [MemoStatus.APPROVED, MemoStatus.REJECTED];
  if (processedStatuses.includes(currentStatus)) {
    return {
      success: false,
      errors: [
        {
          field: 'memo_status',
          message: MEMOS_ERRORS.CANNOT_MODIFY_PROCESSED_MEMO,
          code: MEMOS_CODES.CANNOT_MODIFY_PROCESSED_MEMO,
        },
      ],
    };
  }
  return { success: true };
};

// ============================================================================
// TYPES TYPESCRIPT
// ============================================================================

export type CreateEmployeeMemoInput = z.infer<typeof createEmployeeMemoSchema>;
export type CreateManagerMemoInput = z.infer<typeof createManagerMemoSchema>;
export type CreateSystemMemoInput = z.infer<typeof createSystemMemoSchema>;
export type CreateMemosInput = z.infer<typeof createMemosSchema>;
export type UpdateMemosInput = z.infer<typeof updateMemosSchema>;
export type RespondToMemoInput = z.infer<typeof respondToMemoSchema>;
export type ValidateMemoInput = z.infer<typeof validateMemoSchema>;
export type MemosFilters = z.infer<typeof memosFiltersSchema>;
