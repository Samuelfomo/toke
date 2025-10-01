// schemas/users.ts
import { z } from 'zod';

import { USERS_DEFAULTS, USERS_ERRORS, USERS_VALIDATION } from '../../constants/tenant/users.js';

// Base schema for common validations
const baseUsersSchema = z.object({
  // tenant: z
  //   .string({
  //     required_error: USERS_ERRORS.TENANT_REQUIRED,
  //     invalid_type_error: USERS_ERRORS.TENANT_INVALID,
  //   })
  //   .min(USERS_VALIDATION.TENANT.MIN_LENGTH, USERS_ERRORS.TENANT_INVALID)
  //   .max(USERS_VALIDATION.TENANT.MAX_LENGTH, USERS_ERRORS.TENANT_INVALID)
  //   .trim(),

  supervisor: z
    .string({
      required_error: USERS_ERRORS.GUID_REQUIRED,
      invalid_type_error: USERS_ERRORS.GUID_INVALID,
    })
    .min(USERS_VALIDATION.GUID.MIN_LENGTH, USERS_ERRORS.GUID_INVALID)
    .max(USERS_VALIDATION.GUID.MAX_LENGTH, USERS_ERRORS.GUID_INVALID)
    .optional()
    .nullable(),

  // role: z
  //   .string({
  //     required_error: ROLES_ERRORS.GUID_REQUIRED,
  //     invalid_type_error: USERS_ERRORS.GUID_INVALID,
  //   })
  //   .min(USERS_VALIDATION.GUID.MIN_LENGTH, USERS_ERRORS.GUID_INVALID)
  //   .max(USERS_VALIDATION.GUID.MAX_LENGTH, USERS_ERRORS.GUID_INVALID),

  email: z
    .string({
      invalid_type_error: USERS_ERRORS.EMAIL_INVALID,
    })
    .email(USERS_ERRORS.EMAIL_INVALID)
    .min(USERS_VALIDATION.EMAIL.MIN_LENGTH, USERS_ERRORS.EMAIL_INVALID)
    .max(USERS_VALIDATION.EMAIL.MAX_LENGTH, USERS_ERRORS.EMAIL_INVALID)
    .trim()
    .toLowerCase()
    .optional()
    .nullable(),

  first_name: z
    .string({
      required_error: USERS_ERRORS.FIRST_NAME_REQUIRED,
      invalid_type_error: USERS_ERRORS.FIRST_NAME_INVALID,
    })
    .min(USERS_VALIDATION.FIRST_NAME.MIN_LENGTH, USERS_ERRORS.FIRST_NAME_INVALID)
    .max(USERS_VALIDATION.FIRST_NAME.MAX_LENGTH, USERS_ERRORS.FIRST_NAME_INVALID)
    .trim(),

  last_name: z
    .string({
      required_error: USERS_ERRORS.LAST_NAME_REQUIRED,
      invalid_type_error: USERS_ERRORS.LAST_NAME_INVALID,
    })
    .min(USERS_VALIDATION.LAST_NAME.MIN_LENGTH, USERS_ERRORS.LAST_NAME_INVALID)
    .max(USERS_VALIDATION.LAST_NAME.MAX_LENGTH, USERS_ERRORS.LAST_NAME_INVALID)
    .trim(),

  phone_number: z
    .string({
      invalid_type_error: USERS_ERRORS.PHONE_NUMBER_INVALID,
    })
    .min(USERS_VALIDATION.PHONE_NUMBER.MIN_LENGTH, USERS_ERRORS.PHONE_NUMBER_INVALID)
    .max(USERS_VALIDATION.PHONE_NUMBER.MAX_LENGTH, USERS_ERRORS.PHONE_NUMBER_INVALID)
    .trim(),
  // .optional()
  // .nullable(),

  employee_code: z
    .string({
      invalid_type_error: USERS_ERRORS.EMPLOYEE_CODE_INVALID,
    })
    .min(USERS_VALIDATION.EMPLOYEE_CODE.MIN_LENGTH, USERS_ERRORS.EMPLOYEE_CODE_INVALID)
    .max(USERS_VALIDATION.EMPLOYEE_CODE.MAX_LENGTH, USERS_ERRORS.EMPLOYEE_CODE_INVALID)
    .trim()
    .optional()
    .nullable(),

  pin_hash: z
    .string({
      invalid_type_error: USERS_ERRORS.PIN_INVALID,
    })
    .regex(USERS_VALIDATION.PIN.PATTERN, USERS_ERRORS.PIN_INVALID)
    .optional()
    .nullable(),

  password_hash: z
    .string({
      invalid_type_error: USERS_ERRORS.PASSWORD_INVALID,
    })
    .min(USERS_VALIDATION.PASSWORD.MIN_LENGTH, USERS_ERRORS.PASSWORD_INVALID)
    .max(USERS_VALIDATION.PASSWORD.MAX_LENGTH, USERS_ERRORS.PASSWORD_INVALID)
    .regex(USERS_VALIDATION.PASSWORD.PATTERN, USERS_ERRORS.PASSWORD_TOO_WEAK)
    .optional()
    .nullable(),

  otp_token: z
    .string({
      invalid_type_error: USERS_ERRORS.OTP_TOKEN_INVALID,
    })
    .min(USERS_VALIDATION.OTP_TOKEN.MIN_LENGTH, USERS_ERRORS.OTP_TOKEN_INVALID)
    .max(USERS_VALIDATION.OTP_TOKEN.MAX_LENGTH, USERS_ERRORS.OTP_TOKEN_INVALID)
    .trim()
    .optional()
    .nullable(),

  otp_expires_at: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: USERS_ERRORS.INVALID_DATE_FORMAT,
    })
    .optional()
    .nullable(),

  qr_code_token: z
    .string({
      invalid_type_error: USERS_ERRORS.QR_CODE_TOKEN_INVALID,
    })
    .min(USERS_VALIDATION.QR_CODE_TOKEN.MIN_LENGTH, USERS_ERRORS.QR_CODE_TOKEN_INVALID)
    .max(USERS_VALIDATION.QR_CODE_TOKEN.MAX_LENGTH, USERS_ERRORS.QR_CODE_TOKEN_INVALID)
    .trim()
    .optional()
    .nullable(),

  qr_code_expires_at: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: USERS_ERRORS.INVALID_DATE_FORMAT,
    })
    .optional()
    .nullable(),

  avatar_url: z
    .string({
      invalid_type_error: USERS_ERRORS.AVATAR_URL_INVALID,
    })
    .url(USERS_ERRORS.AVATAR_URL_INVALID)
    .max(USERS_VALIDATION.AVATAR_URL.MAX_LENGTH, USERS_ERRORS.AVATAR_URL_INVALID)
    .trim()
    .optional()
    .nullable(),

  hire_date: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: USERS_ERRORS.HIRE_DATE_INVALID,
    })
    .refine((date) => date <= new Date(), USERS_ERRORS.HIRE_DATE_FUTURE)
    .optional()
    .nullable(),

  department: z
    .string({
      invalid_type_error: USERS_ERRORS.DEPARTMENT_INVALID,
    })
    .min(USERS_VALIDATION.DEPARTMENT.MIN_LENGTH, USERS_ERRORS.DEPARTMENT_INVALID)
    .max(USERS_VALIDATION.DEPARTMENT.MAX_LENGTH, USERS_ERRORS.DEPARTMENT_INVALID)
    .trim()
    .optional()
    .nullable(),

  job_title: z
    .string({
      invalid_type_error: USERS_ERRORS.JOB_TITLE_INVALID,
    })
    .min(USERS_VALIDATION.JOB_TITLE.MIN_LENGTH, USERS_ERRORS.JOB_TITLE_INVALID)
    .max(USERS_VALIDATION.JOB_TITLE.MAX_LENGTH, USERS_ERRORS.JOB_TITLE_INVALID)
    .trim()
    .optional()
    .nullable(),

  active: z
    .boolean({
      invalid_type_error: USERS_ERRORS.ACTIVE_STATUS_INVALID,
    })
    .default(USERS_DEFAULTS.ACTIVE),

  last_login_at: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: USERS_ERRORS.LAST_LOGIN_DATE_INVALID,
    })
    .optional()
    .nullable(),
});

// Schema for creation - all required fields
export const createUsersSchema = baseUsersSchema;

// Schema for updates - all fields optional
export const updateUsersSchema = baseUsersSchema.partial();

// Schema for filters
export const usersFiltersSchema = z
  .object({
    tenant: z.string().optional(),
    email: z.string().email().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone_number: z.string().optional(),
    employee_code: z.string().optional(),
    department: z.string().optional(),
    job_title: z.string().optional(),
    active: z.boolean().optional(),
    hire_date_from: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    hire_date_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    last_login_from: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    last_login_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
  })
  .strict();

// Schema for GUID validation
export const usersGuidSchema = z.string().uuid(USERS_ERRORS.GUID_INVALID);

// Validation functions with error handling
export const validateUsersCreation = (data: any) => {
  try {
    return createUsersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateUsersUpdate = (data: any) => {
  try {
    return updateUsersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateUsersFilters = (data: any) => {
  try {
    return usersFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateUsersGuid = (guid: any) => {
  try {
    return usersGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(USERS_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Complete schema for responses (with metadata)
export const usersResponseSchema = baseUsersSchema.extend({
  id: z.number().int().positive(),
  guid: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Grouped export for easier imports
export const usersSchemas = {
  validateUsersCreation,
  validateUsersUpdate,
  validateUsersFilters,
  validateUsersGuid,
  createUsersSchema,
  updateUsersSchema,
  usersFiltersSchema,
  usersGuidSchema,
};

// TypeScript types generated from schemas
export type CreateUsersInput = z.infer<typeof createUsersSchema>;
export type UpdateUsersInput = z.infer<typeof updateUsersSchema>;
export type UsersData = z.infer<typeof usersResponseSchema>;
export type UsersFilters = z.infer<typeof usersFiltersSchema>;
