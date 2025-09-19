// schemas/employee.master.ts
import { z } from 'zod';

import {
  BillingStatusComputed,
  ContractualStatus,
  EMPLOYEE_LICENSE_DEFAULTS,
  EMPLOYEE_LICENSE_ERRORS,
  EMPLOYEE_LICENSE_VALIDATION,
  LeaveType,
} from '../constants/employee.license.js';

// Base schema for common validations
const baseEmployeeLicenseSchema = z.object({
  global_license: z
    .number({
      required_error: EMPLOYEE_LICENSE_ERRORS.GLOBAL_LICENSE_REQUIRED,
      invalid_type_error: EMPLOYEE_LICENSE_ERRORS.GLOBAL_LICENSE_INVALID,
    })
    .int(EMPLOYEE_LICENSE_ERRORS.GLOBAL_LICENSE_INVALID)
    .positive(EMPLOYEE_LICENSE_ERRORS.GLOBAL_LICENSE_INVALID),

  employee: z
    .string({
      required_error: EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_REQUIRED,
      invalid_type_error: EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_INVALID,
    })
    .min(EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE.MIN_LENGTH, EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_INVALID)
    .max(EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE.MAX_LENGTH, EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_INVALID)
    .regex(EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE.PATTERN, EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_INVALID)
    .transform((val) => val.trim()),

  employee_code: z
    .string({
      required_error: EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_CODE_REQUIRED,
      invalid_type_error: EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_CODE_INVALID,
    })
    .min(
      EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE_CODE.MIN_LENGTH,
      EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_CODE_INVALID,
    )
    .max(
      EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE_CODE.MAX_LENGTH,
      EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_CODE_INVALID,
    )
    .regex(
      EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE_CODE.PATTERN,
      EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_CODE_INVALID,
    )
    .transform((val) => val.trim()),

  activation_date: z
    .date({
      required_error: EMPLOYEE_LICENSE_ERRORS.ACTIVATION_DATE_REQUIRED,
      invalid_type_error: EMPLOYEE_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    })
    .refine((date) => date <= new Date(), EMPLOYEE_LICENSE_ERRORS.FUTURE_ACTIVATION_DATE),

  deactivation_date: z
    .date({
      invalid_type_error: EMPLOYEE_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    })
    .optional()
    .nullable(),

  last_activity_date: z
    .date({
      invalid_type_error: EMPLOYEE_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    })
    .optional()
    .nullable(),

  contractual_status: z
    .nativeEnum(ContractualStatus, {
      invalid_type_error: EMPLOYEE_LICENSE_ERRORS.CONTRACTUAL_STATUS_INVALID,
    })
    .default(EMPLOYEE_LICENSE_DEFAULTS.CONTRACTUAL_STATUS),

  declared_long_leave: z.boolean().default(EMPLOYEE_LICENSE_DEFAULTS.DECLARED_LONG_LEAVE),

  long_leave_declared_by: z
    .string()
    .min(
      EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_DECLARED_BY.MIN_LENGTH,
      EMPLOYEE_LICENSE_ERRORS.LONG_LEAVE_DECLARED_BY_INVALID,
    )
    .max(
      EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_DECLARED_BY.MAX_LENGTH,
      EMPLOYEE_LICENSE_ERRORS.LONG_LEAVE_DECLARED_BY_INVALID,
    )
    .regex(
      EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_DECLARED_BY.PATTERN,
      EMPLOYEE_LICENSE_ERRORS.LONG_LEAVE_DECLARED_BY_INVALID,
    )
    .transform((val) => val.trim())
    .optional()
    .nullable(),

  long_leave_declared_at: z
    .date({
      invalid_type_error: EMPLOYEE_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    })
    .optional()
    .nullable(),

  long_leave_type: z
    .nativeEnum(LeaveType, {
      invalid_type_error: EMPLOYEE_LICENSE_ERRORS.LONG_LEAVE_TYPE_INVALID,
    })
    .optional()
    .nullable(),

  long_leave_reason: z
    .string()
    .max(
      EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_REASON.MAX_LENGTH,
      EMPLOYEE_LICENSE_ERRORS.LONG_LEAVE_REASON_INVALID,
    )
    .transform((val) => val.trim())
    .optional()
    .nullable(),

  grace_period_start: z
    .date({
      invalid_type_error: EMPLOYEE_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    })
    .optional()
    .nullable(),

  grace_period_end: z
    .date({
      invalid_type_error: EMPLOYEE_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    })
    .optional()
    .nullable(),
});
// .refine(
//   (data) => {
//     // Validate deactivation date is after activation date
//     if (data.deactivation_date && data.activation_date) {
//       return data.deactivation_date > data.activation_date;
//     }
//     return true;
//   },
//   {
//     message: EMPLOYEE_LICENSE_ERRORS.DEACTIVATION_BEFORE_ACTIVATION,
//     path: ['deactivation_date'],
//   },
// )
// .refine(
//   (data) => {
//     // Validate long leave data consistency
//     if (data.declared_long_leave) {
//       return data.long_leave_declared_by && data.long_leave_declared_at;
//     }
//     return true;
//   },
//   {
//     message: EMPLOYEE_LICENSE_ERRORS.LONG_LEAVE_INCOMPLETE_DATA,
//     path: ['declared_long_leave'],
//   },
// )
// .refine(
//   (data) => {
//     // Anti-fraud constraint: no long leave with recent activity
//     if (data.declared_long_leave && data.last_activity_date) {
//       const sevenDaysAgo = new Date();
//       sevenDaysAgo.setDate(
//         sevenDaysAgo.getDate() -
//           EMPLOYEE_LICENSE_VALIDATION.GRACE_PERIOD.DAYS_AFTER_LAST_ACTIVITY,
//       );
//       return data.last_activity_date < sevenDaysAgo;
//     }
//     return true;
//   },
//   {
//     message: EMPLOYEE_LICENSE_ERRORS.LONG_LEAVE_WITH_RECENT_ACTIVITY,
//     path: ['declared_long_leave'],
//   },
// )
// .refine(
//   (data) => {
//     // Validate grace period dates
//     if (data.grace_period_start && data.grace_period_end) {
//       return data.grace_period_end > data.grace_period_start;
//     }
//     return true;
//   },
//   {
//     message: EMPLOYEE_LICENSE_ERRORS.GRACE_PERIOD_INVALID,
//     path: ['grace_period_end'],
//   },
// );

// Schema for creation - all required fields
export const createEmployeeLicenseSchema = baseEmployeeLicenseSchema;

// Schema for updates - all fields optional except computed ones
export const updateEmployeeLicenseSchema = baseEmployeeLicenseSchema.partial().refine((data) => {
  // Prevent manual setting of computed billing status
  if ('computed_billing_status' in data) {
    throw new Error(EMPLOYEE_LICENSE_ERRORS.BILLING_STATUS_COMPUTED_READONLY);
  }
  return true;
});

// Schema for filters
export const employeeLicenseFiltersSchema = z
  .object({
    global_license: z.number().int().positive().optional(),
    employee: z.string().optional(),
    employee_code: z.string().optional(),
    contractual_status: z.nativeEnum(ContractualStatus).optional(),
    declared_long_leave: z.boolean().optional(),
    long_leave_type: z.nativeEnum(LeaveType).optional(),
    computed_billing_status: z.nativeEnum(BillingStatusComputed).optional(),
    activation_date_from: z.date().optional(),
    activation_date_to: z.date().optional(),
    deactivation_date_from: z.date().optional(),
    deactivation_date_to: z.date().optional(),
    last_activity_date_from: z.date().optional(),
    last_activity_date_to: z.date().optional(),
  })
  .strict();

// Schema for validation du GUID
export const employeeLicenseGuidSchema = z
  .string()
  .regex(/^\d{6}$/, EMPLOYEE_LICENSE_ERRORS.GUID_INVALID)
  .transform((val) => parseInt(val))
  .refine(
    (val) =>
      val >= EMPLOYEE_LICENSE_VALIDATION.GUID.MIN_VALUE &&
      val <= EMPLOYEE_LICENSE_VALIDATION.GUID.MAX_VALUE,
    EMPLOYEE_LICENSE_ERRORS.GUID_INVALID,
  );

// Functions de validation avec gestion d'erreurs
export const validateEmployeeLicenseCreation = (data: any) => {
  try {
    return createEmployeeLicenseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateEmployeeLicenseUpdate = (data: any) => {
  try {
    return updateEmployeeLicenseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateEmployeeLicenseFilters = (data: any) => {
  try {
    return employeeLicenseFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateEmployeeLicenseGuid = (guid: any) => {
  try {
    return employeeLicenseGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(EMPLOYEE_LICENSE_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Schema complet pour les réponses (avec métadonnées)
export const employeeLicense = baseEmployeeLicenseSchema.extend({
  id: z.number().int().positive(),
  guid: z
    .number()
    .int()
    .min(EMPLOYEE_LICENSE_VALIDATION.GUID.MIN_VALUE)
    .max(EMPLOYEE_LICENSE_VALIDATION.GUID.MAX_VALUE),
  computed_billing_status: z.nativeEnum(BillingStatusComputed),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Export groupé pour faciliter l'import
export const employeeLicenseSchemas = {
  validateEmployeeLicenseCreation,
  validateEmployeeLicenseUpdate,
  validateEmployeeLicenseFilters,
  validateEmployeeLicenseGuid,
  createEmployeeLicenseSchema,
  updateEmployeeLicenseSchema,
  employeeLicenseFiltersSchema,
  employeeLicenseGuidSchema,
};

// Types TypeScript générés à partir des schémas
export type CreateEmployeeLicenseInput = z.infer<typeof createEmployeeLicenseSchema>;
export type UpdateEmployeeLicenseInput = z.infer<typeof updateEmployeeLicenseSchema>;
export type EmployeeLicenseData = z.infer<typeof employeeLicense>;
export type EmployeeLicenseFilters = z.infer<typeof employeeLicenseFiltersSchema>;
