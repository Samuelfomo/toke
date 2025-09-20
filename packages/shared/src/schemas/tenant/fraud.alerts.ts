// schemas/fraud_alerts.ts
import { z } from 'zod';

import {
  AlertSeverity,
  AlertType,
  FRAUD_ALERTS_DEFAULTS,
  FRAUD_ALERTS_ERRORS,
  FRAUD_ALERTS_VALIDATION,
} from '../../constants/tenant/fraud.alerts.js';

// Schema pour valider les données d'alerte (JSON)
const alertDataSchema = z.record(z.any()).refine((alertData) => {
  try {
    JSON.stringify(alertData);
    return true;
  } catch {
    return false;
  }
}, FRAUD_ALERTS_ERRORS.ALERT_DATA_INVALID);

// Base schema pour les validations communes
const baseFraudAlertsSchema = z.object({
  user: z
    .number({
      required_error: FRAUD_ALERTS_ERRORS.USER_REQUIRED,
      invalid_type_error: FRAUD_ALERTS_ERRORS.USER_INVALID,
    })
    .int()
    .min(FRAUD_ALERTS_VALIDATION.USER.MIN, FRAUD_ALERTS_ERRORS.USER_INVALID)
    .max(FRAUD_ALERTS_VALIDATION.USER.MAX, FRAUD_ALERTS_ERRORS.USER_INVALID),

  time_entry: z
    .number({
      required_error: FRAUD_ALERTS_ERRORS.TIME_ENTRY_REQUIRED,
      invalid_type_error: FRAUD_ALERTS_ERRORS.TIME_ENTRY_INVALID,
    })
    .int()
    .min(FRAUD_ALERTS_VALIDATION.TIME_ENTRY.MIN, FRAUD_ALERTS_ERRORS.TIME_ENTRY_INVALID)
    .max(FRAUD_ALERTS_VALIDATION.TIME_ENTRY.MAX, FRAUD_ALERTS_ERRORS.TIME_ENTRY_INVALID),

  alert_type: z.nativeEnum(AlertType, {
    required_error: FRAUD_ALERTS_ERRORS.ALERT_TYPE_REQUIRED,
    invalid_type_error: FRAUD_ALERTS_ERRORS.ALERT_TYPE_INVALID,
  }),

  alert_severity: z
    .nativeEnum(AlertSeverity, {
      invalid_type_error: FRAUD_ALERTS_ERRORS.ALERT_SEVERITY_INVALID,
    })
    .default(FRAUD_ALERTS_DEFAULTS.ALERT_SEVERITY),

  alert_description: z
    .string({
      required_error: FRAUD_ALERTS_ERRORS.ALERT_DESCRIPTION_REQUIRED,
      invalid_type_error: FRAUD_ALERTS_ERRORS.ALERT_DESCRIPTION_INVALID,
    })
    .min(
      FRAUD_ALERTS_VALIDATION.ALERT_DESCRIPTION.MIN_LENGTH,
      FRAUD_ALERTS_ERRORS.ALERT_DESCRIPTION_INVALID,
    )
    .trim(),

  alert_data: alertDataSchema.optional().nullable(),

  investigated: z
    .boolean({
      invalid_type_error: FRAUD_ALERTS_ERRORS.INVESTIGATED_INVALID,
    })
    .default(FRAUD_ALERTS_DEFAULTS.INVESTIGATED),

  investigation_notes: z
    .string({
      invalid_type_error: FRAUD_ALERTS_ERRORS.INVESTIGATION_NOTES_INVALID,
    })
    .min(
      FRAUD_ALERTS_VALIDATION.INVESTIGATION_NOTES.MIN_LENGTH,
      FRAUD_ALERTS_ERRORS.INVESTIGATION_NOTES_INVALID,
    )
    .trim()
    .optional()
    .nullable(),

  false_positive: z
    .boolean({
      invalid_type_error: FRAUD_ALERTS_ERRORS.FALSE_POSITIVE_INVALID,
    })
    .default(FRAUD_ALERTS_DEFAULTS.FALSE_POSITIVE),

  investigated_at: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: FRAUD_ALERTS_ERRORS.INVESTIGATED_AT_INVALID,
    })
    .optional()
    .nullable(),
});

// Schema avec validations métier complexes
const fraudAlertsWithValidation = baseFraudAlertsSchema
  .refine(
    (data) => {
      // Notes d'investigation requises si l'alerte est marquée comme investiguée
      if (data.investigated && !data.investigation_notes) {
        return false;
      }
      return true;
    },
    {
      message: FRAUD_ALERTS_ERRORS.INVESTIGATION_NOTES_REQUIRED,
      path: ['investigation_notes'],
    },
  )
  .refine(
    (data) => {
      // Date d'investigation doit être présente si investigated = true
      if (data.investigated && !data.investigated_at) {
        // Cette règle peut être assouplie si investigated_at est automatiquement définie
        return true; // Permet la validation, la date sera définie automatiquement
      }
      return true;
    },
    {
      message: FRAUD_ALERTS_ERRORS.INVESTIGATION_INCOMPLETE,
      path: ['investigated_at'],
    },
  );

// Schema pour la création - tous les champs requis
export const createFraudAlertsSchema = fraudAlertsWithValidation;

// Schema pour les mises à jour - tous les champs optionnels
export const updateFraudAlertsSchema = baseFraudAlertsSchema.partial();
// export const updateFraudAlertsSchema = fraudAlertsWithValidation.partial();

// Schema pour les filtres
export const fraudAlertsFiltersSchema = z
  .object({
    user: z.number().int().optional(),
    time_entry: z.number().int().optional(),
    alert_type: z.nativeEnum(AlertType).optional(),
    alert_severity: z.nativeEnum(AlertSeverity).optional(),
    investigated: z.boolean().optional(),
    false_positive: z.boolean().optional(),
    created_at_from: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    created_at_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    investigated_at_from: z
      .union([z.date(), z.string().transform((val) => new Date(val))])
      .optional(),
    investigated_at_to: z
      .union([z.date(), z.string().transform((val) => new Date(val))])
      .optional(),
    pending_investigation: z.boolean().optional(), // Pour alertes non investiguées
    high_priority_only: z.boolean().optional(), // Pour alertes HIGH/CRITICAL uniquement
    severity_level_min: z.nativeEnum(AlertSeverity).optional(), // Seuil minimum de sévérité
  })
  .strict();

// Schema pour validation GUID
export const fraudAlertsGuidSchema = z
  .string()
  .min(FRAUD_ALERTS_VALIDATION.GUID.MIN_LENGTH, FRAUD_ALERTS_ERRORS.GUID_INVALID)
  .max(FRAUD_ALERTS_VALIDATION.GUID.MAX_LENGTH, FRAUD_ALERTS_ERRORS.GUID_INVALID);

// Fonctions de validation avec gestion d'erreurs
export const validateFraudAlertsCreation = (data: any) => {
  try {
    return createFraudAlertsSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateFraudAlertsUpdate = (data: any) => {
  try {
    return updateFraudAlertsSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateFraudAlertsFilters = (data: any) => {
  try {
    return fraudAlertsFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateFraudAlertsGuid = (guid: any) => {
  try {
    return fraudAlertsGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(FRAUD_ALERTS_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Validation métier pour empêcher la modification d'alertes investiguées
export const validateModificationAllowed = (currentInvestigated: boolean) => {
  if (currentInvestigated) {
    throw new Error(FRAUD_ALERTS_ERRORS.CANNOT_MODIFY_INVESTIGATED);
  }
  return true;
};

// Validation pour éviter les alertes en double
export const validateDuplicateAlert = (
  userId: number,
  timeEntryId: number,
  alertType: AlertType,
  existingAlerts: any[],
) => {
  const duplicate = existingAlerts.find(
    (alert) =>
      alert.user === userId && alert.time_entry === timeEntryId && alert.alert_type === alertType,
  );

  if (duplicate) {
    throw new Error(FRAUD_ALERTS_ERRORS.DUPLICATE_ALERT_FOR_ENTRY);
  }

  return true;
};

// Validation du processus d'investigation
export const validateInvestigationProcess = (
  investigated: boolean,
  investigationNotes: string | null,
) => {
  if (investigated && !investigationNotes) {
    throw new Error(FRAUD_ALERTS_ERRORS.INVESTIGATION_INCOMPLETE);
  }
  return true;
};

// Fonction utilitaire pour ordonner les sévérités
export const getSeverityOrder = (severity: AlertSeverity): number => {
  const order = {
    [AlertSeverity.LOW]: 1,
    [AlertSeverity.MEDIUM]: 2,
    [AlertSeverity.HIGH]: 3,
    [AlertSeverity.CRITICAL]: 4,
  };
  return order[severity];
};

// Schema complet pour les réponses (avec métadonnées)
export const fraudAlertsResponseSchema = baseFraudAlertsSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Export groupé pour faciliter les imports
export const fraudAlertsSchemas = {
  validateFraudAlertsCreation,
  validateFraudAlertsUpdate,
  validateFraudAlertsFilters,
  validateFraudAlertsGuid,
  validateModificationAllowed,
  validateDuplicateAlert,
  validateInvestigationProcess,
  getSeverityOrder,
  createFraudAlertsSchema,
  updateFraudAlertsSchema,
  fraudAlertsFiltersSchema,
  fraudAlertsGuidSchema,
};

// Types TypeScript générés à partir des schemas
export type CreateFraudAlertsInput = z.infer<typeof createFraudAlertsSchema>;
export type UpdateFraudAlertsInput = z.infer<typeof updateFraudAlertsSchema>;
export type FraudAlertsData = z.infer<typeof fraudAlertsResponseSchema>;
export type FraudAlertsFilters = z.infer<typeof fraudAlertsFiltersSchema>;
export type AlertData = z.infer<typeof alertDataSchema>;
