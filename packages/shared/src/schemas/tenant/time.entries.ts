// schemas/time_entries.ts
import { z } from 'zod';

import {
  PointageStatus,
  PointageType,
  TIME_ENTRIES_DEFAULTS,
  TIME_ENTRIES_ERRORS,
  TIME_ENTRIES_VALIDATION,
} from '../../constants/tenant/time.entries.js';

// Schema pour valider les adresses IP (IPv4 et IPv6)
const ipAddressSchema = z.string().refine((ip) => {
  // Regex simplifiée pour IPv4 et IPv6
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}, TIME_ENTRIES_ERRORS.IP_ADDRESS_INVALID);

// Schema pour les informations device (JSON)
const deviceInfoSchema = z.record(z.any()).refine((deviceInfo) => {
  try {
    JSON.stringify(deviceInfo);
    return true;
  } catch {
    return false;
  }
}, TIME_ENTRIES_ERRORS.DEVICE_INFO_INVALID);

// Base schema pour les validations communes
const baseTimeEntriesSchema = z.object({
  session: z
    .number({
      required_error: TIME_ENTRIES_ERRORS.SESSION_REQUIRED,
      invalid_type_error: TIME_ENTRIES_ERRORS.SESSION_INVALID,
    })
    .int()
    .min(TIME_ENTRIES_VALIDATION.SESSION.MIN, TIME_ENTRIES_ERRORS.SESSION_INVALID)
    .max(TIME_ENTRIES_VALIDATION.SESSION.MAX, TIME_ENTRIES_ERRORS.SESSION_INVALID),

  user: z
    .number({
      required_error: TIME_ENTRIES_ERRORS.USER_REQUIRED,
      invalid_type_error: TIME_ENTRIES_ERRORS.USER_INVALID,
    })
    .int()
    .min(TIME_ENTRIES_VALIDATION.USER.MIN, TIME_ENTRIES_ERRORS.USER_INVALID)
    .max(TIME_ENTRIES_VALIDATION.USER.MAX, TIME_ENTRIES_ERRORS.USER_INVALID),

  site: z
    .number({
      required_error: TIME_ENTRIES_ERRORS.SITE_REQUIRED,
      invalid_type_error: TIME_ENTRIES_ERRORS.SITE_INVALID,
    })
    .int()
    .min(TIME_ENTRIES_VALIDATION.SITE.MIN, TIME_ENTRIES_ERRORS.SITE_INVALID)
    .max(TIME_ENTRIES_VALIDATION.SITE.MAX, TIME_ENTRIES_ERRORS.SITE_INVALID),

  pointage_type: z.nativeEnum(PointageType, {
    required_error: TIME_ENTRIES_ERRORS.POINTAGE_TYPE_REQUIRED,
    invalid_type_error: TIME_ENTRIES_ERRORS.POINTAGE_TYPE_INVALID,
  }),

  pointage_status: z
    .nativeEnum(PointageStatus, {
      invalid_type_error: TIME_ENTRIES_ERRORS.POINTAGE_STATUS_INVALID,
    })
    .default(TIME_ENTRIES_DEFAULTS.POINTAGE_STATUS),

  clocked_at: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      required_error: TIME_ENTRIES_ERRORS.CLOCKED_AT_REQUIRED,
      invalid_type_error: TIME_ENTRIES_ERRORS.CLOCKED_AT_INVALID,
    })
    .refine((date) => date <= new Date(), TIME_ENTRIES_ERRORS.FUTURE_POINTAGE),

  real_clocked_at: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: TIME_ENTRIES_ERRORS.REAL_CLOCKED_AT_INVALID,
    })
    .optional()
    .nullable(),

  latitude: z
    .number({
      required_error: TIME_ENTRIES_ERRORS.LATITUDE_REQUIRED,
      invalid_type_error: TIME_ENTRIES_ERRORS.LATITUDE_INVALID,
    })
    .min(TIME_ENTRIES_VALIDATION.LATITUDE.MIN, TIME_ENTRIES_ERRORS.LATITUDE_INVALID)
    .max(TIME_ENTRIES_VALIDATION.LATITUDE.MAX, TIME_ENTRIES_ERRORS.LATITUDE_INVALID),

  longitude: z
    .number({
      required_error: TIME_ENTRIES_ERRORS.LONGITUDE_REQUIRED,
      invalid_type_error: TIME_ENTRIES_ERRORS.LONGITUDE_INVALID,
    })
    .min(TIME_ENTRIES_VALIDATION.LONGITUDE.MIN, TIME_ENTRIES_ERRORS.LONGITUDE_INVALID)
    .max(TIME_ENTRIES_VALIDATION.LONGITUDE.MAX, TIME_ENTRIES_ERRORS.LONGITUDE_INVALID),

  gps_accuracy: z
    .number({
      invalid_type_error: TIME_ENTRIES_ERRORS.GPS_ACCURACY_INVALID,
    })
    .int()
    .min(TIME_ENTRIES_VALIDATION.GPS_ACCURACY.MIN, TIME_ENTRIES_ERRORS.GPS_ACCURACY_INVALID)
    .max(TIME_ENTRIES_VALIDATION.GPS_ACCURACY.MAX, TIME_ENTRIES_ERRORS.GPS_ACCURACY_INVALID)
    .optional()
    .nullable(),

  device_info: deviceInfoSchema.optional().nullable(),

  ip_address: ipAddressSchema.optional().nullable(),

  created_offline: z
    .boolean({
      invalid_type_error: TIME_ENTRIES_ERRORS.CREATED_OFFLINE_INVALID,
    })
    .default(TIME_ENTRIES_DEFAULTS.CREATED_OFFLINE),

  local_id: z
    .string({
      invalid_type_error: TIME_ENTRIES_ERRORS.LOCAL_ID_INVALID,
    })
    .min(TIME_ENTRIES_VALIDATION.LOCAL_ID.MIN_LENGTH, TIME_ENTRIES_ERRORS.LOCAL_ID_INVALID)
    .max(TIME_ENTRIES_VALIDATION.LOCAL_ID.MAX_LENGTH, TIME_ENTRIES_ERRORS.LOCAL_ID_INVALID)
    .trim()
    .optional()
    .nullable(),

  sync_attempts: z
    .number({
      invalid_type_error: TIME_ENTRIES_ERRORS.SYNC_ATTEMPTS_INVALID,
    })
    .int()
    .min(TIME_ENTRIES_VALIDATION.SYNC_ATTEMPTS.MIN, TIME_ENTRIES_ERRORS.SYNC_ATTEMPTS_INVALID)
    .max(TIME_ENTRIES_VALIDATION.SYNC_ATTEMPTS.MAX, TIME_ENTRIES_ERRORS.SYNC_ATTEMPTS_INVALID)
    .default(TIME_ENTRIES_DEFAULTS.SYNC_ATTEMPTS),

  last_sync_attempt: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: TIME_ENTRIES_ERRORS.LAST_SYNC_ATTEMPT_INVALID,
    })
    .optional()
    .nullable(),

  memo: z
    .number({
      invalid_type_error: TIME_ENTRIES_ERRORS.MEMO_INVALID,
    })
    .int()
    .min(TIME_ENTRIES_VALIDATION.MEMO.MIN, TIME_ENTRIES_ERRORS.MEMO_INVALID)
    .max(TIME_ENTRIES_VALIDATION.MEMO.MAX, TIME_ENTRIES_ERRORS.MEMO_INVALID)
    .optional()
    .nullable(),

  correction_reason: z
    .string({
      invalid_type_error: TIME_ENTRIES_ERRORS.CORRECTION_REASON_INVALID,
    })
    .min(
      TIME_ENTRIES_VALIDATION.CORRECTION_REASON.MIN_LENGTH,
      TIME_ENTRIES_ERRORS.CORRECTION_REASON_INVALID,
    )
    .max(
      TIME_ENTRIES_VALIDATION.CORRECTION_REASON.MAX_LENGTH,
      TIME_ENTRIES_ERRORS.CORRECTION_REASON_INVALID,
    )
    .trim()
    .optional()
    .nullable(),
});

// Schema avec validations métier complexes
const timeEntriesWithValidation = baseTimeEntriesSchema.refine(
  (data) => {
    // Si le statut est "corrected", une raison de correction est requise
    if (data.pointage_status === PointageStatus.CORRECTED && !data.correction_reason) {
      return false;
    }
    return true;
  },
  {
    message: TIME_ENTRIES_ERRORS.CORRECTION_REASON_REQUIRED,
    path: ['correction_reason'],
  },
);

// Schema pour la création - tous les champs requis
export const createTimeEntriesSchema = timeEntriesWithValidation;

// Schema pour les mises à jour - tous les champs optionnels
export const updateTimeEntriesSchema = baseTimeEntriesSchema.partial();
// export const updateTimeEntriesSchema = timeEntriesWithValidation.partial();

// Schema pour les filtres
export const timeEntriesFiltersSchema = z
  .object({
    session: z.number().int().optional(),
    user: z.number().int().optional(),
    site: z.number().int().optional(),
    pointage_type: z.nativeEnum(PointageType).optional(),
    pointage_status: z.nativeEnum(PointageStatus).optional(),
    clocked_at_from: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    clocked_at_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    created_offline: z.boolean().optional(),
    has_memo: z.boolean().optional(),
    needs_sync: z.boolean().optional(), // Pour les entrées créées offline
    gps_accuracy_min: z.number().optional(),
    gps_accuracy_max: z.number().optional(),
    pending_only: z.boolean().optional(), // Pour les entrées en attente
  })
  .strict();

// Schema pour validation GUID
export const timeEntriesGuidSchema = z
  .string()
  .min(TIME_ENTRIES_VALIDATION.GUID.MIN_LENGTH, TIME_ENTRIES_ERRORS.GUID_INVALID)
  .max(TIME_ENTRIES_VALIDATION.GUID.MAX_LENGTH, TIME_ENTRIES_ERRORS.GUID_INVALID);

// Fonctions de validation avec gestion d'erreurs
export const validateTimeEntriesCreation = (data: any) => {
  try {
    return createTimeEntriesSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateTimeEntriesUpdate = (data: any) => {
  try {
    return updateTimeEntriesSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateTimeEntriesFilters = (data: any) => {
  try {
    return timeEntriesFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateTimeEntriesGuid = (guid: any) => {
  try {
    return timeEntriesGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(TIME_ENTRIES_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Validation métier pour les transitions de statut
export const validatePointageStatusTransition = (
  currentStatus: PointageStatus,
  newStatus: PointageStatus,
) => {
  const validTransitions: Record<PointageStatus, PointageStatus[]> = {
    [PointageStatus.DRAFT]: [PointageStatus.PENDING],
    [PointageStatus.PENDING]: [
      PointageStatus.ACCEPTED,
      PointageStatus.REJECTED,
      PointageStatus.CORRECTED,
    ],
    [PointageStatus.ACCEPTED]: [PointageStatus.ACCOUNTED, PointageStatus.CORRECTED],
    [PointageStatus.CORRECTED]: [PointageStatus.ACCEPTED, PointageStatus.REJECTED],
    [PointageStatus.ACCOUNTED]: [], // Aucune transition autorisée depuis accounted
    [PointageStatus.REJECTED]: [PointageStatus.CORRECTED],
  };

  if (!validTransitions[currentStatus].includes(newStatus)) {
    throw new Error(TIME_ENTRIES_ERRORS.STATUS_TRANSITION_INVALID);
  }

  return true;
};

// Validation de la séquence de pointage
export const validatePointageSequence = (
  pointageType: PointageType,
  previousEntries: PointageType[],
) => {
  const lastEntry = previousEntries[previousEntries.length - 1];

  switch (pointageType) {
    case PointageType.CLOCK_OUT:
      if (lastEntry !== PointageType.CLOCK_IN && lastEntry !== PointageType.PAUSE_END) {
        throw new Error(TIME_ENTRIES_ERRORS.CLOCK_OUT_WITHOUT_CLOCK_IN);
      }
      break;

    case PointageType.PAUSE_START:
    case PointageType.PAUSE_END:
      if (!previousEntries.includes(PointageType.CLOCK_IN)) {
        throw new Error(TIME_ENTRIES_ERRORS.PAUSE_WITHOUT_CLOCK_IN);
      }
      break;

    case PointageType.CLOCK_IN:
      if (lastEntry === PointageType.CLOCK_IN || lastEntry === PointageType.PAUSE_START) {
        throw new Error(TIME_ENTRIES_ERRORS.CLOCK_IN_WITHOUT_CLOCK_OUT);
      }
      break;
  }

  return true;
};

// Schema complet pour les réponses (avec métadonnées)
export const timeEntriesResponseSchema = baseTimeEntriesSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Export groupé pour faciliter les imports
export const timeEntriesSchemas = {
  validateTimeEntriesCreation,
  validateTimeEntriesUpdate,
  validateTimeEntriesFilters,
  validateTimeEntriesGuid,
  validatePointageStatusTransition,
  validatePointageSequence,
  createTimeEntriesSchema,
  updateTimeEntriesSchema,
  timeEntriesFiltersSchema,
  timeEntriesGuidSchema,
};

// Types TypeScript générés à partir des schemas
export type CreateTimeEntriesInput = z.infer<typeof createTimeEntriesSchema>;
export type UpdateTimeEntriesInput = z.infer<typeof updateTimeEntriesSchema>;
export type TimeEntriesData = z.infer<typeof timeEntriesResponseSchema>;
export type TimeEntriesFilters = z.infer<typeof timeEntriesFiltersSchema>;
export type DeviceInfo = z.infer<typeof deviceInfoSchema>;
