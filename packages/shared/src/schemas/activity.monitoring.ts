// schemas/activity.monitoring.ts
import { z } from 'zod';

import { RiskLevel } from '../constants/fraud.detection.log.js';
import {
  ACTIVITY_MONITORING_DEFAULTS,
  ACTIVITY_MONITORING_ERRORS,
  ACTIVITY_MONITORING_VALIDATION,
  ActivityStatus,
} from '../constants/activity.monitoring.js';

// Base schema for activity monitoring (read-only fields)
const baseActivityMonitoringSchema = z.object({
  employee_license: z
    .number({
      required_error: ACTIVITY_MONITORING_ERRORS.EMPLOYEE_LICENSE_REQUIRED,
      invalid_type_error: ACTIVITY_MONITORING_ERRORS.INVALID_EMPLOYEE_LICENSE,
    })
    .int(ACTIVITY_MONITORING_ERRORS.INVALID_EMPLOYEE_LICENSE)
    .min(
      ACTIVITY_MONITORING_VALIDATION.EMPLOYEE_LICENSE.MIN_VALUE,
      ACTIVITY_MONITORING_ERRORS.INVALID_EMPLOYEE_LICENSE,
    ),

  monitoring_date: z
    .date({
      required_error: ACTIVITY_MONITORING_ERRORS.MONITORING_DATE_REQUIRED,
      invalid_type_error: ACTIVITY_MONITORING_ERRORS.INVALID_DATE_FORMAT,
    })
    .min(ACTIVITY_MONITORING_VALIDATION.DATE.MIN_DATE, ACTIVITY_MONITORING_ERRORS.INVALID_DATE)
    .max(ACTIVITY_MONITORING_VALIDATION.DATE.MAX_DATE, ACTIVITY_MONITORING_ERRORS.INVALID_DATE)
    .refine((date) => date <= new Date(), ACTIVITY_MONITORING_ERRORS.FUTURE_DATE_NOT_ALLOWED),

  last_punch_date: z
    .date({
      invalid_type_error: ACTIVITY_MONITORING_ERRORS.INVALID_DATE_FORMAT,
    })
    .optional()
    .nullable(),

  punch_count_7_days: z
    .number({
      invalid_type_error: ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT,
    })
    .int(ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT)
    .min(
      ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MIN_VALUE,
      ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT,
    )
    .max(
      ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MAX_VALUE,
      ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT,
    )
    .default(ACTIVITY_MONITORING_DEFAULTS.PUNCH_COUNT_7_DAYS),

  punch_count_30_days: z
    .number({
      invalid_type_error: ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT,
    })
    .int(ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT)
    .min(
      ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MIN_VALUE,
      ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT,
    )
    .max(
      ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MAX_VALUE,
      ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT,
    )
    .default(ACTIVITY_MONITORING_DEFAULTS.PUNCH_COUNT_30_DAYS),

  consecutive_absent_days: z
    .number({
      invalid_type_error: ACTIVITY_MONITORING_ERRORS.INVALID_ABSENT_DAYS,
    })
    .int(ACTIVITY_MONITORING_ERRORS.INVALID_ABSENT_DAYS)
    .min(
      ACTIVITY_MONITORING_VALIDATION.CONSECUTIVE_ABSENT_DAYS.MIN_VALUE,
      ACTIVITY_MONITORING_ERRORS.INVALID_ABSENT_DAYS,
    )
    .max(
      ACTIVITY_MONITORING_VALIDATION.CONSECUTIVE_ABSENT_DAYS.MAX_VALUE,
      ACTIVITY_MONITORING_ERRORS.INVALID_ABSENT_DAYS,
    )
    .default(ACTIVITY_MONITORING_DEFAULTS.CONSECUTIVE_ABSENT_DAYS),

  status_at_date: z
    .nativeEnum(ActivityStatus, {
      invalid_type_error: ACTIVITY_MONITORING_ERRORS.INVALID_STATUS,
    })
    .default(ACTIVITY_MONITORING_DEFAULTS.STATUS),

  created_at: z
    .date({
      invalid_type_error: ACTIVITY_MONITORING_ERRORS.INVALID_DATE_FORMAT,
    })
    .optional(),

  updated_at: z
    .date({
      invalid_type_error: ACTIVITY_MONITORING_ERRORS.INVALID_DATE_FORMAT,
    })
    .optional(),
});
// .refine(
//   (data) => {
//     // Validate punch count logic: 7 days should not exceed 30 days
//     return data.punch_count_7_days <= data.punch_count_30_days;
//   },
//   {
//     message: ACTIVITY_MONITORING_ERRORS.PUNCH_COUNT_LOGIC_ERROR,
//     path: ['punch_count_7_days'],
//   },
// );

// Schema for updates - only status can be manually updated (limited)
export const updateActivityMonitoringSchema = z
  .object({
    status_at_date: z
      .nativeEnum(ActivityStatus, {
        invalid_type_error: ACTIVITY_MONITORING_ERRORS.INVALID_STATUS,
      })
      .optional(),
  })
  .strict()
  .refine((data) => {
    // Prevent modification of computed fields
    const readonlyFields = [
      'employee_license',
      'monitoring_date',
      'last_punch_date',
      'punch_count_7_days',
      'punch_count_30_days',
      'consecutive_absent_days',
      'created_at',
      'updated_at',
    ];

    const providedFields = Object.keys(data);
    const hasReadonlyField = providedFields.some((field) => readonlyFields.includes(field));

    if (hasReadonlyField) {
      throw new Error(ACTIVITY_MONITORING_ERRORS.READONLY_FIELD_MODIFICATION);
    }

    return true;
  });

// Schema for filters
export const activityMonitoringFiltersSchema = z
  .object({
    employee_license: z.number().int().positive().optional(),
    monitoring_date: z.date().optional(),
    monitoring_date_from: z.date().optional(),
    monitoring_date_to: z.date().optional(),
    last_punch_date: z.date().optional(),
    last_punch_date_from: z.date().optional(),
    last_punch_date_to: z.date().optional(),
    status_at_date: z.nativeEnum(ActivityStatus).optional(),
    punch_count_7_days: z.number().int().min(0).optional(),
    punch_count_7_days_min: z.number().int().min(0).optional(),
    punch_count_7_days_max: z.number().int().min(0).optional(),
    punch_count_30_days: z.number().int().min(0).optional(),
    punch_count_30_days_min: z.number().int().min(0).optional(),
    punch_count_30_days_max: z.number().int().min(0).optional(),
    consecutive_absent_days: z.number().int().min(0).optional(),
    consecutive_absent_days_min: z.number().int().min(0).optional(),
    consecutive_absent_days_max: z.number().int().min(0).optional(),
    created_at_from: z.date().optional(),
    created_at_to: z.date().optional(),
    updated_at_from: z.date().optional(),
    updated_at_to: z.date().optional(),
  })
  .strict()
  .refine((data) => {
    // Validate date ranges
    if (data.monitoring_date_from && data.monitoring_date_to) {
      if (data.monitoring_date_from > data.monitoring_date_to) {
        throw new Error(ACTIVITY_MONITORING_ERRORS.DATE_RANGE_INVALID);
      }
    }

    if (data.last_punch_date_from && data.last_punch_date_to) {
      if (data.last_punch_date_from > data.last_punch_date_to) {
        throw new Error(ACTIVITY_MONITORING_ERRORS.DATE_RANGE_INVALID);
      }
    }

    if (data.created_at_from && data.created_at_to) {
      if (data.created_at_from > data.created_at_to) {
        throw new Error(ACTIVITY_MONITORING_ERRORS.DATE_RANGE_INVALID);
      }
    }

    if (data.updated_at_from && data.updated_at_to) {
      if (data.updated_at_from > data.updated_at_to) {
        throw new Error(ACTIVITY_MONITORING_ERRORS.DATE_RANGE_INVALID);
      }
    }

    // Validate numeric ranges
    if (data.punch_count_7_days_min !== undefined && data.punch_count_7_days_max !== undefined) {
      if (data.punch_count_7_days_min > data.punch_count_7_days_max) {
        throw new Error('Minimum punch count 7 days cannot exceed maximum');
      }
    }

    if (data.punch_count_30_days_min !== undefined && data.punch_count_30_days_max !== undefined) {
      if (data.punch_count_30_days_min > data.punch_count_30_days_max) {
        throw new Error('Minimum punch count 30 days cannot exceed maximum');
      }
    }

    if (
      data.consecutive_absent_days_min !== undefined &&
      data.consecutive_absent_days_max !== undefined
    ) {
      if (data.consecutive_absent_days_min > data.consecutive_absent_days_max) {
        throw new Error('Minimum absent days cannot exceed maximum');
      }
    }

    return true;
  });

// Schema for ID validation
export const activityMonitoringIdSchema = z.union([z.string(), z.number()]).transform((val) => {
  const num = typeof val === 'string' ? parseInt(val) : val;
  if (isNaN(num) || !Number.isInteger(num) || num < 1) {
    throw new Error(ACTIVITY_MONITORING_ERRORS.INVALID_ID);
  }
  return num;
});

// Schema for employee license validation
export const activityMonitoringEmployeeLicenseSchema = z
  .union([z.string(), z.number()])
  .transform((val) => {
    const num = typeof val === 'string' ? parseInt(val) : val;
    if (
      isNaN(num) ||
      !Number.isInteger(num) ||
      num < ACTIVITY_MONITORING_VALIDATION.EMPLOYEE_LICENSE.MIN_VALUE
    ) {
      throw new Error(ACTIVITY_MONITORING_ERRORS.INVALID_EMPLOYEE_LICENSE);
    }
    return num;
  });

// Schema for date validation
export const activityMonitoringDateSchema = z.union([z.string(), z.date()]).transform((val) => {
  const date = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(date.getTime())) {
    throw new Error(ACTIVITY_MONITORING_ERRORS.INVALID_DATE_FORMAT);
  }
  if (
    date < ACTIVITY_MONITORING_VALIDATION.DATE.MIN_DATE ||
    date > ACTIVITY_MONITORING_VALIDATION.DATE.MAX_DATE
  ) {
    throw new Error(ACTIVITY_MONITORING_ERRORS.INVALID_DATE);
  }
  if (date > new Date()) {
    throw new Error(ACTIVITY_MONITORING_ERRORS.FUTURE_DATE_NOT_ALLOWED);
  }
  return date;
});

// Schema for activity status validation
export const activityMonitoringStatusSchema = z
  .string()
  .transform((val) => val.trim().toUpperCase())
  .refine((val) => Object.values(ActivityStatus).includes(val as ActivityStatus), {
    message: ACTIVITY_MONITORING_ERRORS.INVALID_STATUS,
  })
  .transform((val) => val as ActivityStatus);

// Schema for pagination validation
export const activityMonitoringPaginationSchema = z.object({
  offset: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val) : val;
      if (isNaN(num) || num < 0) return ACTIVITY_MONITORING_DEFAULTS.PAGINATION.OFFSET;
      return num;
    })
    .default(ACTIVITY_MONITORING_DEFAULTS.PAGINATION.OFFSET),

  limit: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val) : val;
      if (isNaN(num) || num < 1) return ACTIVITY_MONITORING_DEFAULTS.PAGINATION.LIMIT;
      if (num > ACTIVITY_MONITORING_DEFAULTS.PAGINATION.MAX_LIMIT) {
        return ACTIVITY_MONITORING_DEFAULTS.PAGINATION.MAX_LIMIT;
      }
      return num;
    })
    .default(ACTIVITY_MONITORING_DEFAULTS.PAGINATION.LIMIT),
});

// Schema for risk level validation
export const activityMonitoringRiskLevelSchema = z
  .string()
  .transform((val) => val.trim().toUpperCase())
  .refine((val) => Object.values(RiskLevel).includes(val as RiskLevel), {
    message: ACTIVITY_MONITORING_ERRORS.RISK_LEVEL_INVALID,
  })
  .transform((val) => val as RiskLevel);

// Validation functions with error handling
export const validateActivityMonitoringUpdate = (data: any) => {
  try {
    return updateActivityMonitoringSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateActivityMonitoringFilters = (data: any) => {
  try {
    return activityMonitoringFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateActivityMonitoringId = (id: any) => {
  try {
    return activityMonitoringIdSchema.parse(id);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(ACTIVITY_MONITORING_ERRORS.INVALID_ID);
    }
    throw error;
  }
};

export const validateActivityMonitoringEmployeeLicense = (employeeLicense: any) => {
  try {
    return activityMonitoringEmployeeLicenseSchema.parse(employeeLicense);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(ACTIVITY_MONITORING_ERRORS.INVALID_EMPLOYEE_LICENSE);
    }
    throw error;
  }
};

export const validateActivityMonitoringDate = (date: any) => {
  try {
    return activityMonitoringDateSchema.parse(date);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(ACTIVITY_MONITORING_ERRORS.INVALID_DATE_FORMAT);
    }
    throw error;
  }
};

export const validateActivityMonitoringStatus = (status: any) => {
  try {
    return activityMonitoringStatusSchema.parse(status);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(ACTIVITY_MONITORING_ERRORS.INVALID_STATUS);
    }
    throw error;
  }
};

export const validateActivityMonitoringPagination = (offset: any, limit: any) => {
  try {
    return activityMonitoringPaginationSchema.parse({ offset, limit });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(ACTIVITY_MONITORING_ERRORS.PAGINATION_INVALID);
    }
    throw error;
  }
};

export const validateActivityMonitoringRiskLevel = (riskLevel: any) => {
  try {
    return activityMonitoringRiskLevelSchema.parse(riskLevel);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(ACTIVITY_MONITORING_ERRORS.RISK_LEVEL_INVALID);
    }
    throw error;
  }
};

// Schema complet pour les réponses (avec métadonnées)
export const activityMonitoring = baseActivityMonitoringSchema
  .extend({
    id: z.number().int().positive(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .refine(
    (data) => {
      // Validate punch count logic: 7 days should not exceed 30 days
      return data.punch_count_7_days <= data.punch_count_30_days;
    },
    {
      message: ACTIVITY_MONITORING_ERRORS.PUNCH_COUNT_LOGIC_ERROR,
      path: ['punch_count_7_days'],
    },
  );

// Export groupé pour faciliter l'import
export const activityMonitoringSchemas = {
  validateActivityMonitoringUpdate,
  validateActivityMonitoringFilters,
  validateActivityMonitoringId,
  validateActivityMonitoringEmployeeLicense,
  validateActivityMonitoringDate,
  validateActivityMonitoringStatus,
  validateActivityMonitoringPagination,
  validateActivityMonitoringRiskLevel,
  updateActivityMonitoringSchema,
  activityMonitoringFiltersSchema,
  activityMonitoringIdSchema,
  activityMonitoringEmployeeLicenseSchema,
  activityMonitoringDateSchema,
  activityMonitoringStatusSchema,
  activityMonitoringPaginationSchema,
  activityMonitoringRiskLevelSchema,
};

// Types TypeScript générés à partir des schémas
export type UpdateActivityMonitoringInput = z.infer<typeof updateActivityMonitoringSchema>;
export type ActivityMonitoringData = z.infer<typeof activityMonitoring>;
export type ActivityMonitoringFilters = z.infer<typeof activityMonitoringFiltersSchema>;
export type ActivityMonitoringPagination = z.infer<typeof activityMonitoringPaginationSchema>;
