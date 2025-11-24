import { z } from 'zod';

import {
  QR_CODE_CODES,
  QR_CODE_DEFAULTS,
  QR_CODE_ERRORS,
  QR_CODE_VALIDATION,
} from '../../constants/tenant/qr.code.generation.js';

// ============================================================================
// SCHEMAS DE VALIDATION
// ============================================================================

// Base schema pour les validations communes
const baseQrCodeSchema = z.object({
  site: z
    .string({
      required_error: QR_CODE_ERRORS.SITE_REQUIRED,
      invalid_type_error: QR_CODE_ERRORS.SITE_INVALID,
    })
    .min(QR_CODE_VALIDATION.SITE.MIN_LENGTH, {
      message: QR_CODE_ERRORS.SITE_INVALID,
    })
    .max(QR_CODE_VALIDATION.SITE.MAX_LENGTH, {
      message: QR_CODE_ERRORS.SITE_INVALID,
    })
    .trim(),

  manager: z
    .string({
      required_error: QR_CODE_ERRORS.MANAGER_REQUIRED,
      invalid_type_error: QR_CODE_ERRORS.MANAGER_INVALID,
    })
    .min(QR_CODE_VALIDATION.MANAGER.MIN_LENGTH, {
      message: QR_CODE_ERRORS.MANAGER_INVALID,
    })
    .max(QR_CODE_VALIDATION.MANAGER.MAX_LENGTH, {
      message: QR_CODE_ERRORS.MANAGER_INVALID,
    })
    .trim(),

  shared: z
    .boolean({
      invalid_type_error: QR_CODE_ERRORS.SHARED_INVALID,
    })
    .default(QR_CODE_DEFAULTS.SHARED),

  valid_from: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: QR_CODE_ERRORS.VALID_FROM_INVALID,
    })
    .optional()
    .nullable(),

  valid_to: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: QR_CODE_ERRORS.VALID_TO_INVALID,
    })
    .optional()
    .nullable(),
});
// .refine(
//   (data) => {
//     if (data.valid_from && data.valid_to) {
//       return data.valid_from < data.valid_to;
//     }
//     return true;
//   },
//   {
//     message: QR_CODE_ERRORS.VALID_FROM_AFTER_VALID_TO,
//     path: ['valid_from'],
//   },
// );

// ============================================================================
// SCHEMAS DE CRÉATION
// ============================================================================

export const createQrCodeSchema = baseQrCodeSchema.refine(
  (data) => {
    if (data.valid_from && data.valid_to) {
      return data.valid_from < data.valid_to;
    }
    return true;
  },
  {
    message: QR_CODE_ERRORS.VALID_FROM_AFTER_VALID_TO,
    path: ['valid_from'],
  },
);

// ============================================================================
// SCHEMAS DE MISE À JOUR
// ============================================================================

export const updateQrCodeSchema = baseQrCodeSchema.partial().refine(
  (data) => {
    if (data.valid_from && data.valid_to) {
      return data.valid_from < data.valid_to;
    }
    return true;
  },
  {
    message: QR_CODE_ERRORS.VALID_FROM_AFTER_VALID_TO,
    path: ['valid_from'],
  },
);

// ============================================================================
// SCHEMAS DE FILTRES
// ============================================================================

export const qrCodeFiltersSchema = z
  .object({
    site: z.string().optional(),
    manager: z.string().optional(),
    is_expired: z.boolean().optional(),
    created_from: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    created_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    shared: z.boolean().optional(),
    has_expiration: z.boolean().optional(),
  })
  .strict();

export const qrCodeGuidSchema = z
  .string()
  .min(QR_CODE_VALIDATION.GUID.MIN_LENGTH, { message: QR_CODE_ERRORS.GUID_INVALID })
  .max(QR_CODE_VALIDATION.GUID.MAX_LENGTH, { message: QR_CODE_ERRORS.GUID_INVALID })
  .trim();

export const qrCodeSharedSchema = z.boolean({
  invalid_type_error: QR_CODE_ERRORS.SHARED_INVALID,
});

// ============================================================================
// FONCTIONS DE VALIDATION
// ============================================================================

export const validateQrCodeCreation = (data: any) => {
  const result = createQrCodeSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: QR_CODE_CODES.VALIDATION_FAILED,
    }));
    return { success: false, errors };
  }
  return { success: true, data: result.data };
};

export const validateQrCodeUpdate = (data: any) => {
  const result = updateQrCodeSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: QR_CODE_CODES.VALIDATION_FAILED,
    }));
    return { success: false, errors };
  }
  return { success: true, data: result.data };
};

export const validateQrCodeFilters = (data: any) => {
  const result = qrCodeFiltersSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: QR_CODE_CODES.FILTER_INVALID,
    }));
    return { success: false, errors };
  }
  return { success: true, data: result.data };
};

export const validateQrCodeGuid = (guid: any) => {
  const result = qrCodeGuidSchema.safeParse(guid);
  if (!result.success) {
    return {
      success: false,
      errors: [
        {
          field: 'guid',
          message: QR_CODE_ERRORS.GUID_INVALID,
          code: QR_CODE_CODES.INVALID_GUID,
        },
      ],
    };
  }
  return { success: true, data: result.data };
};

export const validateShared = (value: any) => {
  const result = qrCodeSharedSchema.safeParse(value);
  if (!result.success) {
    return {
      success: false,
      errors: [
        {
          field: 'shared',
          message: QR_CODE_ERRORS.SHARED_INVALID,
          code: QR_CODE_CODES.SHARED_INVALID,
        },
      ],
    };
  }
  return { success: true, data: result.data };
};

// ============================================================================
// TYPES TYPESCRIPT
// ============================================================================

export type CreateQrCodeInput = z.infer<typeof createQrCodeSchema>;
export type UpdateQrCodeInput = z.infer<typeof updateQrCodeSchema>;
export type QrCodeFilters = z.infer<typeof qrCodeFiltersSchema>;
