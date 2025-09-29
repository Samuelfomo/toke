// schemas/work.sessions.ts
import { z } from 'zod';

import {
  SessionStatus,
  WORK_SESSIONS_DEFAULTS,
  WORK_SESSIONS_ERRORS,
  WORK_SESSIONS_VALIDATION,
} from '../../constants/tenant/work.sessions.js';

// Schema pour valider les coordonnées GPS
const coordinateSchema = z.object({
  latitude: z
    .number({
      invalid_type_error: WORK_SESSIONS_ERRORS.START_LATITUDE_INVALID,
    })
    .min(WORK_SESSIONS_VALIDATION.LATITUDE.MIN, WORK_SESSIONS_ERRORS.START_LATITUDE_INVALID)
    .max(WORK_SESSIONS_VALIDATION.LATITUDE.MAX, WORK_SESSIONS_ERRORS.START_LATITUDE_INVALID),

  longitude: z
    .number({
      invalid_type_error: WORK_SESSIONS_ERRORS.START_LONGITUDE_INVALID,
    })
    .min(WORK_SESSIONS_VALIDATION.LONGITUDE.MIN, WORK_SESSIONS_ERRORS.START_LONGITUDE_INVALID)
    .max(WORK_SESSIONS_VALIDATION.LONGITUDE.MAX, WORK_SESSIONS_ERRORS.START_LONGITUDE_INVALID),
});

// Schema pour valider les durées PostgreSQL (format interval)
const postgresIntervalSchema = z
  .string()
  .regex(
    /^(\d+\s+(years?|mons?|months?|weeks?|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?)\s*)+$|^\d{2}:\d{2}:\d{2}$/,
    'Must be a valid PostgreSQL interval format',
  );

// Base schema pour les validations communes
const baseWorkSessionsSchema = z.object({
  user: z
    .number({
      required_error: WORK_SESSIONS_ERRORS.USER_REQUIRED,
      invalid_type_error: WORK_SESSIONS_ERRORS.USER_INVALID,
    })
    .int()
    .min(WORK_SESSIONS_VALIDATION.USER.MIN, WORK_SESSIONS_ERRORS.USER_INVALID)
    .max(WORK_SESSIONS_VALIDATION.USER.MAX, WORK_SESSIONS_ERRORS.USER_INVALID),

  site: z
    .number({
      required_error: WORK_SESSIONS_ERRORS.SITE_REQUIRED,
      invalid_type_error: WORK_SESSIONS_ERRORS.SITE_INVALID,
    })
    .int()
    .min(WORK_SESSIONS_VALIDATION.SITE.MIN, WORK_SESSIONS_ERRORS.SITE_INVALID)
    .max(WORK_SESSIONS_VALIDATION.SITE.MAX, WORK_SESSIONS_ERRORS.SITE_INVALID),

  session_status: z
    .nativeEnum(SessionStatus, {
      invalid_type_error: WORK_SESSIONS_ERRORS.SESSION_STATUS_INVALID,
    })
    .default(WORK_SESSIONS_DEFAULTS.SESSION_STATUS),

  session_start: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      required_error: WORK_SESSIONS_ERRORS.SESSION_START_REQUIRED,
      invalid_type_error: WORK_SESSIONS_ERRORS.SESSION_START_INVALID,
    })
    .refine((date) => date <= new Date(), WORK_SESSIONS_ERRORS.FUTURE_SESSION_START),

  session_end: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: WORK_SESSIONS_ERRORS.SESSION_END_INVALID,
    })
    .optional()
    .nullable(),

  total_work_duration: postgresIntervalSchema
    .refine(
      (duration) => duration !== null && duration !== '',
      WORK_SESSIONS_ERRORS.TOTAL_WORK_DURATION_INVALID,
    )
    .optional()
    .nullable(),

  total_pause_duration: postgresIntervalSchema
    .refine(
      (duration) => duration !== null && duration !== '',
      WORK_SESSIONS_ERRORS.TOTAL_PAUSE_DURATION_INVALID,
    )
    .optional()
    .nullable(),

  start_latitude: z
    .number({
      invalid_type_error: WORK_SESSIONS_ERRORS.START_LATITUDE_INVALID,
    })
    .min(WORK_SESSIONS_VALIDATION.LATITUDE.MIN, WORK_SESSIONS_ERRORS.START_LATITUDE_INVALID)
    .max(WORK_SESSIONS_VALIDATION.LATITUDE.MAX, WORK_SESSIONS_ERRORS.START_LATITUDE_INVALID)
    .optional()
    .nullable(),

  start_longitude: z
    .number({
      invalid_type_error: WORK_SESSIONS_ERRORS.START_LONGITUDE_INVALID,
    })
    .min(WORK_SESSIONS_VALIDATION.LONGITUDE.MIN, WORK_SESSIONS_ERRORS.START_LONGITUDE_INVALID)
    .max(WORK_SESSIONS_VALIDATION.LONGITUDE.MAX, WORK_SESSIONS_ERRORS.START_LONGITUDE_INVALID)
    .optional()
    .nullable(),

  end_latitude: z
    .number({
      invalid_type_error: WORK_SESSIONS_ERRORS.END_LATITUDE_INVALID,
    })
    .min(WORK_SESSIONS_VALIDATION.LATITUDE.MIN, WORK_SESSIONS_ERRORS.END_LATITUDE_INVALID)
    .max(WORK_SESSIONS_VALIDATION.LATITUDE.MAX, WORK_SESSIONS_ERRORS.END_LATITUDE_INVALID)
    .optional()
    .nullable(),

  end_longitude: z
    .number({
      invalid_type_error: WORK_SESSIONS_ERRORS.END_LONGITUDE_INVALID,
    })
    .min(WORK_SESSIONS_VALIDATION.LONGITUDE.MIN, WORK_SESSIONS_ERRORS.END_LONGITUDE_INVALID)
    .max(WORK_SESSIONS_VALIDATION.LONGITUDE.MAX, WORK_SESSIONS_ERRORS.END_LONGITUDE_INVALID)
    .optional()
    .nullable(),

  // memo: z
  //   .number({
  //     invalid_type_error: WORK_SESSIONS_ERRORS.MEMO_INVALID,
  //   })
  //   .int()
  //   .min(WORK_SESSIONS_VALIDATION.MEMO.MIN, WORK_SESSIONS_ERRORS.MEMO_INVALID)
  //   .max(WORK_SESSIONS_VALIDATION.MEMO.MAX, WORK_SESSIONS_ERRORS.MEMO_INVALID)
  //   .optional()
  //   .nullable(),
});

// Schema avec validations complexes
const workSessionsWithValidation = baseWorkSessionsSchema
  .refine(
    (data) => {
      // Validation des dates logiques
      if (data.session_end && data.session_start > data.session_end) {
        return false;
      }
      return true;
    },
    {
      message: WORK_SESSIONS_ERRORS.SESSION_DATES_LOGIC_INVALID,
      path: ['session_end'],
    },
  )
  .refine(
    (data) => {
      // Validation des coordonnées complètes pour le début
      const hasStartLat = data.start_latitude !== null && data.start_latitude !== undefined;
      const hasStartLng = data.start_longitude !== null && data.start_longitude !== undefined;

      if ((hasStartLat && !hasStartLng) || (!hasStartLat && hasStartLng)) {
        return false;
      }
      return true;
    },
    {
      message: WORK_SESSIONS_ERRORS.COORDINATES_INCOMPLETE,
      path: ['start_coordinates'],
    },
  )
  .refine(
    (data) => {
      // Validation des coordonnées complètes pour la fin
      const hasEndLat = data.end_latitude !== null && data.end_latitude !== undefined;
      const hasEndLng = data.end_longitude !== null && data.end_longitude !== undefined;

      if ((hasEndLat && !hasEndLng) || (!hasEndLat && hasEndLng)) {
        return false;
      }
      return true;
    },
    {
      message: WORK_SESSIONS_ERRORS.COORDINATES_INCOMPLETE,
      path: ['end_coordinates'],
    },
  );

// Schema pour la création - tous les champs requis
export const createWorkSessionsSchema = workSessionsWithValidation;

// Schema pour les mises à jour - tous les champs optionnels
export const updateWorkSessionsSchema = baseWorkSessionsSchema.partial();
// export const updateWorkSessionsSchema = workSessionsWithValidation.partial();

// Schema pour les filtres
export const workSessionsFiltersSchema = z
  .object({
    user: z.number().int().optional(),
    site: z.number().int().optional(),
    session_status: z.nativeEnum(SessionStatus).optional(),
    session_start_from: z
      .union([z.date(), z.string().transform((val) => new Date(val))])
      .optional(),
    session_start_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    session_end_from: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    session_end_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    has_coordinates: z.boolean().optional(), // Pour filtrer les sessions avec/sans coordonnées
    // has_memo: z.boolean().optional(), // Pour filtrer les sessions avec/sans memo
    open_sessions_only: z.boolean().optional(), // Pour ne récupérer que les sessions ouvertes
  })
  .strict();

// Schema pour validation GUID
export const workSessionsGuidSchema = z
  .string()
  .min(WORK_SESSIONS_VALIDATION.GUID.MIN_LENGTH, WORK_SESSIONS_ERRORS.GUID_INVALID)
  .max(WORK_SESSIONS_VALIDATION.GUID.MAX_LENGTH, WORK_SESSIONS_ERRORS.GUID_INVALID);

// Fonctions de validation avec gestion d'erreurs
export const validateWorkSessionsCreation = (data: any) => {
  try {
    return createWorkSessionsSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateWorkSessionsUpdate = (data: any) => {
  try {
    return updateWorkSessionsSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateWorkSessionsFilters = (data: any) => {
  try {
    return workSessionsFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateWorkSessionsGuid = (guid: any) => {
  try {
    return workSessionsGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(WORK_SESSIONS_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Validation métier pour les transitions de statut
export const validateSessionStatusTransition = (
  currentStatus: SessionStatus,
  newStatus: SessionStatus,
) => {
  const validTransitions: Record<SessionStatus, SessionStatus[]> = {
    [SessionStatus.OPEN]: [SessionStatus.CLOSED, SessionStatus.ABANDONED],
    [SessionStatus.CLOSED]: [SessionStatus.CORRECTED],
    [SessionStatus.ABANDONED]: [SessionStatus.CORRECTED],
    [SessionStatus.CORRECTED]: [], // Aucune transition autorisée depuis corrected
  };

  if (!validTransitions[currentStatus].includes(newStatus)) {
    throw new Error(WORK_SESSIONS_ERRORS.SESSION_CANNOT_CLOSE);
  }

  return true;
};

// Schema complet pour les réponses (avec métadonnées)
export const workSessionsResponseSchema = baseWorkSessionsSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Export groupé pour faciliter les imports
export const workSessionsSchemas = {
  validateWorkSessionsCreation,
  validateWorkSessionsUpdate,
  validateWorkSessionsFilters,
  validateWorkSessionsGuid,
  validateSessionStatusTransition,
  createWorkSessionsSchema,
  updateWorkSessionsSchema,
  workSessionsFiltersSchema,
  workSessionsGuidSchema,
};

// Types TypeScript générés à partir des schemas
export type CreateWorkSessionsInput = z.infer<typeof createWorkSessionsSchema>;
export type UpdateWorkSessionsInput = z.infer<typeof updateWorkSessionsSchema>;
export type WorkSessionsData = z.infer<typeof workSessionsResponseSchema>;
export type WorkSessionsFilters = z.infer<typeof workSessionsFiltersSchema>;
export type CoordinatePair = z.infer<typeof coordinateSchema>;
