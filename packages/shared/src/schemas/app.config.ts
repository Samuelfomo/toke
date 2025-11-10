// schemas/app_config_validation.ts
import { z } from 'zod';

import {
  APP_CONFIG_DEFAULTS,
  APP_CONFIG_ERRORS,
  APP_CONFIG_VALIDATION,
} from '../constants/app.config.js';

// Base schema for common validations
const baseAppConfigSchema = z.object({
  key: z
    .string({
      required_error: APP_CONFIG_ERRORS.KEY_REQUIRED,
      invalid_type_error: APP_CONFIG_ERRORS.KEY_INVALID,
    })
    .min(APP_CONFIG_VALIDATION.KEY.MIN_LENGTH, APP_CONFIG_ERRORS.KEY_INVALID)
    .max(APP_CONFIG_VALIDATION.KEY.MAX_LENGTH, APP_CONFIG_ERRORS.KEY_INVALID)
    .regex(APP_CONFIG_VALIDATION.KEY.PATTERN, APP_CONFIG_ERRORS.KEY_INVALID)
    .trim(),

  link: z
    .string({
      required_error: APP_CONFIG_ERRORS.LINK_REQUIRED,
      invalid_type_error: APP_CONFIG_ERRORS.LINK_INVALID,
    })
    .url(APP_CONFIG_ERRORS.LINK_INVALID)
    .min(APP_CONFIG_VALIDATION.LINK.MIN_LENGTH, APP_CONFIG_ERRORS.LINK_INVALID)
    .max(APP_CONFIG_VALIDATION.LINK.MAX_LENGTH, APP_CONFIG_ERRORS.LINK_INVALID)
    .regex(APP_CONFIG_VALIDATION.LINK.PATTERN, APP_CONFIG_ERRORS.LINK_INVALID)
    .trim(),

  active: z
    .boolean({
      invalid_type_error: APP_CONFIG_ERRORS.ACTIVE_STATUS_INVALID,
    })
    .default(APP_CONFIG_DEFAULTS.ACTIVE),
});

// Schema for creation - all required fields
export const createAppConfigSchema = baseAppConfigSchema;

// Schema for updates - all fields optional
export const updateAppConfigSchema = baseAppConfigSchema.partial();

// Schema for filters
export const appConfigFiltersSchema = z
  .object({
    key: z.string().optional(),
    link: z.string().optional(),
    active: z.boolean().optional(),
    created_at_from: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    created_at_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    updated_at_from: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    updated_at_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
  })
  .strict();

// Schema for ID validation
export const appConfigIdSchema = z.number().int().positive(APP_CONFIG_ERRORS.ID_INVALID);

// Validation functions with error handling
export const validateAppConfigCreation = (data: any) => {
  try {
    return createAppConfigSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateAppConfigUpdate = (data: any) => {
  try {
    return updateAppConfigSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateAppConfigFilters = (data: any) => {
  try {
    return appConfigFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateAppConfigId = (id: any) => {
  try {
    return appConfigIdSchema.parse(id);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(APP_CONFIG_ERRORS.ID_INVALID);
    }
    throw error;
  }
};

// Complete schema for responses (with metadata)
export const appConfigResponseSchema = baseAppConfigSchema.extend({
  id: z.number().int().positive(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Grouped export for easier imports
export const appConfigSchemas = {
  validateAppConfigCreation,
  validateAppConfigUpdate,
  validateAppConfigFilters,
  validateAppConfigId,
  createAppConfigSchema,
  updateAppConfigSchema,
  appConfigFiltersSchema,
  appConfigIdSchema,
};

// TypeScript types generated from schemas
export type CreateAppConfigInput = z.infer<typeof createAppConfigSchema>;
export type UpdateAppConfigInput = z.infer<typeof updateAppConfigSchema>;
export type AppConfigData = z.infer<typeof appConfigResponseSchema>;
export type AppConfigFilters = z.infer<typeof appConfigFiltersSchema>;
