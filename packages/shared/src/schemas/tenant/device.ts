// schemas/devices.ts
import { z } from 'zod';

import {
  DEVICES_DEFAULTS,
  DEVICES_ERRORS,
  DEVICES_VALIDATION,
  DeviceType,
} from '../../constants/tenant/device.js';

// Base schema pour les validations communes
const baseDevicesSchema = z.object({
  name: z
    .string({
      required_error: DEVICES_ERRORS.NAME_REQUIRED,
      invalid_type_error: DEVICES_ERRORS.NAME_INVALID,
    })
    .min(DEVICES_VALIDATION.NAME.MIN_LENGTH, DEVICES_ERRORS.NAME_INVALID)
    .max(DEVICES_VALIDATION.NAME.MAX_LENGTH, DEVICES_ERRORS.NAME_INVALID)
    .trim(),

  device_type: z
    .nativeEnum(DeviceType, {
      invalid_type_error: DEVICES_ERRORS.DEVICE_TYPE_INVALID,
    })
    .default(DEVICES_DEFAULTS.DEVICE_TYPE),

  assigned_to: z
    .string({
      required_error: DEVICES_ERRORS.ASSIGNED_TO_REQUIRED,
      invalid_type_error: DEVICES_ERRORS.ASSIGNED_TO_INVALID,
    })
    .trim(),

  gps_accuracy: z
    .number({
      required_error: DEVICES_ERRORS.GPS_ACCURACY_REQUIRED,
      invalid_type_error: DEVICES_ERRORS.GPS_ACCURACY_INVALID,
    })
    .int()
    .min(DEVICES_VALIDATION.GPS_ACCURACY.MIN, DEVICES_ERRORS.GPS_ACCURACY_INVALID)
    .max(DEVICES_VALIDATION.GPS_ACCURACY.MAX, DEVICES_ERRORS.GPS_ACCURACY_INVALID)
    .default(DEVICES_DEFAULTS.GPS_ACCURACY),

  custom_geofence_radius: z
    .number({
      required_error: DEVICES_ERRORS.GEOFENCE_RADIUS_REQUIRED,
      invalid_type_error: DEVICES_ERRORS.GEOFENCE_RADIUS_INVALID,
    })
    .int()
    .min(DEVICES_VALIDATION.GEOFENCE_RADIUS.MIN, DEVICES_ERRORS.GEOFENCE_RADIUS_INVALID)
    .max(DEVICES_VALIDATION.GEOFENCE_RADIUS.MAX, DEVICES_ERRORS.GEOFENCE_RADIUS_INVALID)
    .default(DEVICES_DEFAULTS.GEOFENCE_RADIUS),

  last_seen_at: z
    .string({
      invalid_type_error: DEVICES_ERRORS.LAST_SEEN_AT_INVALID,
    })
    .datetime()
    .optional(),

  active: z
    .boolean({
      invalid_type_error: DEVICES_ERRORS.ACTIVE_STATUS_INVALID,
    })
    .default(DEVICES_DEFAULTS.ACTIVE),

  config_by: z
    .string({
      required_error: DEVICES_ERRORS.CREATED_BY_REQUIRED,
      invalid_type_error: DEVICES_ERRORS.CREATED_BY_INVALID,
    })
    .trim()
    .optional(),
});

// Schema pour la création - tous les champs requis
export const createDevicesSchema = baseDevicesSchema;

// Schema pour les mises à jour - tous les champs optionnels sauf id
export const updateDevicesSchema = baseDevicesSchema.partial();

// Schema pour les filtres
export const devicesFiltersSchema = z
  .object({
    name: z.string().optional(),
    device_type: z.nativeEnum(DeviceType).optional(),
    assigned_to: z.number().int().optional(),
    config_by: z.number().int().optional(),
    active: z.boolean().optional(),
    gps_accuracy_min: z.number().int().optional(),
    gps_accuracy_max: z.number().int().optional(),
    geofence_radius_min: z.number().int().optional(),
    geofence_radius_max: z.number().int().optional(),
    inactive_days: z.number().int().positive().optional(),
  })
  .strict();

// Schema pour validation GUID
export const devicesGuidSchema = z
  .string()
  .min(DEVICES_VALIDATION.GUID.MIN_LENGTH, DEVICES_ERRORS.GUID_INVALID)
  .max(DEVICES_VALIDATION.GUID.MAX_LENGTH, DEVICES_ERRORS.GUID_INVALID);

// Schema pour la réassignation
export const reassignDeviceSchema = z.object({
  new_assigned_to: z
    .string({
      required_error: DEVICES_ERRORS.ASSIGNED_TO_REQUIRED,
      invalid_type_error: DEVICES_ERRORS.ASSIGNED_TO_INVALID,
    })
    .trim(),
  reason: z.string().optional(),
});

// Fonctions de validation avec gestion d'erreurs
export const validateDevicesCreation = (data: any) => {
  try {
    return createDevicesSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateDevicesUpdate = (data: any) => {
  try {
    return updateDevicesSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateDevicesFilters = (data: any) => {
  try {
    return devicesFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateDevicesGuid = (guid: any) => {
  try {
    return devicesGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(DEVICES_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

export const validateReassignDevice = (data: any) => {
  try {
    return reassignDeviceSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

// Schema complet pour les réponses (avec métadonnées)
export const devicesResponseSchema = baseDevicesSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Export groupé pour faciliter les imports
export const devicesSchemas = {
  validateDevicesCreation,
  validateDevicesUpdate,
  validateDevicesFilters,
  validateDevicesGuid,
  validateReassignDevice,
  createDevicesSchema,
  updateDevicesSchema,
  devicesFiltersSchema,
  devicesGuidSchema,
  reassignDeviceSchema,
};

// Types TypeScript générés à partir des schemas
export type CreateDevicesInput = z.infer<typeof createDevicesSchema>;
export type UpdateDevicesInput = z.infer<typeof updateDevicesSchema>;
export type DevicesData = z.infer<typeof devicesResponseSchema>;
export type DevicesFilters = z.infer<typeof devicesFiltersSchema>;
export type ReassignDeviceInput = z.infer<typeof reassignDeviceSchema>;
