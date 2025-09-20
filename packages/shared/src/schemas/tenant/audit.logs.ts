// schemas/audit_logs.ts
import { z } from 'zod';

import {
  AUDIT_LOGS_ERRORS,
  AUDIT_LOGS_VALIDATION,
  AuditOperation,
  ChangedByType,
} from '../../constants/tenant/audit.logs.js';

// Schema pour valider les adresses IP (IPv4 et IPv6)
const ipAddressSchema = z.string().refine((ip) => {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}, AUDIT_LOGS_ERRORS.IP_ADDRESS_INVALID);

// Schema pour valider les valeurs JSON (old_values, new_values)
const jsonValuesSchema = z.record(z.any()).refine((values) => {
  try {
    JSON.stringify(values);
    return true;
  } catch {
    return false;
  }
}, 'Must be a valid JSON object');

// Schema pour User Agent (optionnel mais validé si fourni)
const userAgentSchema = z
  .string()
  .min(1)
  .max(500) // Limite raisonnable pour User-Agent
  .refine(
    (ua) => typeof ua === 'string' && ua.trim().length > 0,
    AUDIT_LOGS_ERRORS.USER_AGENT_INVALID,
  );

// Base schema pour les validations communes
const baseAuditLogsSchema = z.object({
  table_name: z
    .string({
      required_error: AUDIT_LOGS_ERRORS.TABLE_NAME_REQUIRED,
      invalid_type_error: AUDIT_LOGS_ERRORS.TABLE_NAME_INVALID,
    })
    .min(AUDIT_LOGS_VALIDATION.TABLE_NAME.MIN_LENGTH, AUDIT_LOGS_ERRORS.TABLE_NAME_INVALID)
    .max(AUDIT_LOGS_VALIDATION.TABLE_NAME.MAX_LENGTH, AUDIT_LOGS_ERRORS.TABLE_NAME_INVALID)
    .trim(),

  record: z
    .number({
      required_error: AUDIT_LOGS_ERRORS.RECORD_REQUIRED,
      invalid_type_error: AUDIT_LOGS_ERRORS.RECORD_INVALID,
    })
    .int()
    .min(AUDIT_LOGS_VALIDATION.RECORD.MIN, AUDIT_LOGS_ERRORS.RECORD_INVALID)
    .max(AUDIT_LOGS_VALIDATION.RECORD.MAX, AUDIT_LOGS_ERRORS.RECORD_INVALID),

  record_guid: z
    .string({
      invalid_type_error: AUDIT_LOGS_ERRORS.RECORD_GUID_INVALID,
    })
    .min(AUDIT_LOGS_VALIDATION.RECORD_GUID.MIN_LENGTH, AUDIT_LOGS_ERRORS.RECORD_GUID_INVALID)
    .max(AUDIT_LOGS_VALIDATION.RECORD_GUID.MAX_LENGTH, AUDIT_LOGS_ERRORS.RECORD_GUID_INVALID)
    .trim()
    .optional()
    .nullable(),

  operation: z.nativeEnum(AuditOperation, {
    required_error: AUDIT_LOGS_ERRORS.OPERATION_REQUIRED,
    invalid_type_error: AUDIT_LOGS_ERRORS.OPERATION_INVALID,
  }),

  old_values: jsonValuesSchema.optional().nullable(),

  new_values: jsonValuesSchema.optional().nullable(),

  changed_by_user: z
    .number({
      invalid_type_error: AUDIT_LOGS_ERRORS.CHANGED_BY_USER_INVALID,
    })
    .int()
    .min(AUDIT_LOGS_VALIDATION.CHANGED_BY_USER.MIN, AUDIT_LOGS_ERRORS.CHANGED_BY_USER_INVALID)
    .max(AUDIT_LOGS_VALIDATION.CHANGED_BY_USER.MAX, AUDIT_LOGS_ERRORS.CHANGED_BY_USER_INVALID)
    .optional()
    .nullable(),

  changed_by_type: z
    .nativeEnum(ChangedByType, {
      invalid_type_error: AUDIT_LOGS_ERRORS.CHANGED_BY_TYPE_INVALID,
    })
    .optional()
    .nullable(),

  change_reason: z
    .string({
      invalid_type_error: AUDIT_LOGS_ERRORS.CHANGE_REASON_INVALID,
    })
    .min(AUDIT_LOGS_VALIDATION.CHANGE_REASON.MIN_LENGTH, AUDIT_LOGS_ERRORS.CHANGE_REASON_INVALID)
    .max(AUDIT_LOGS_VALIDATION.CHANGE_REASON.MAX_LENGTH, AUDIT_LOGS_ERRORS.CHANGE_REASON_INVALID)
    .trim()
    .optional()
    .nullable(),

  ip_address: ipAddressSchema.optional().nullable(),

  user_agent: userAgentSchema.optional().nullable(),

  changed_at: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: 'Changed at must be a valid date',
    })
    .optional()
    .nullable(),
});

// Schema avec validations métier spécifiques aux logs d'audit
const auditLogsWithValidation = baseAuditLogsSchema.refine(
  (data) => {
    // Validation des valeurs requises selon l'opération
    switch (data.operation) {
      case AuditOperation.INSERT:
        return data.new_values !== null && data.new_values !== undefined;
      case AuditOperation.UPDATE:
        return (
          data.old_values !== null &&
          data.old_values !== undefined &&
          data.new_values !== null &&
          data.new_values !== undefined
        );
      case AuditOperation.DELETE:
        return data.old_values !== null && data.old_values !== undefined;
      default:
        return true;
    }
  },
  {
    message: AUDIT_LOGS_ERRORS.VALUES_REQUIRED_FOR_OPERATION,
    path: ['old_values', 'new_values'],
  },
);

// Schema pour la création - seule opération autorisée sur les logs d'audit
export const createAuditLogsSchema = auditLogsWithValidation;

// Pas de schema update - les logs d'audit sont immutables
// export const updateAuditLogsSchema = "AUDIT LOGS ARE IMMUTABLE";

// Schema pour les filtres (lecture seule)
export const auditLogsFiltersSchema = z
  .object({
    table_name: z.string().optional(),
    record: z.number().int().optional(),
    record_guid: z.string().optional(),
    operation: z.nativeEnum(AuditOperation).optional(),
    changed_by_user: z.number().int().optional(),
    changed_by_type: z.nativeEnum(ChangedByType).optional(),
    changed_at_from: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    changed_at_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    ip_address: z.string().optional(),
    has_user_agent: z.boolean().optional(),
    has_change_reason: z.boolean().optional(),
    system_changes_only: z.boolean().optional(), // Pour filtrer les changements système
  })
  .strict()
  .refine(
    (data) => {
      // Validation de la plage de dates
      if (data.changed_at_from && data.changed_at_to && data.changed_at_from > data.changed_at_to) {
        return false;
      }
      return true;
    },
    {
      message: AUDIT_LOGS_ERRORS.INVALID_DATE_RANGE,
      path: ['changed_at_to'],
    },
  );

// Schema pour validation GUID
export const auditLogsGuidSchema = z
  .string()
  .min(AUDIT_LOGS_VALIDATION.GUID.MIN_LENGTH, AUDIT_LOGS_ERRORS.GUID_INVALID)
  .max(AUDIT_LOGS_VALIDATION.GUID.MAX_LENGTH, AUDIT_LOGS_ERRORS.GUID_INVALID);

// Fonctions de validation avec gestion d'erreurs
export const validateAuditLogsCreation = (data: any) => {
  try {
    return createAuditLogsSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

// Pas de fonction d'update - les logs d'audit sont immutables
export const validateAuditLogsUpdate = () => {
  throw new Error(AUDIT_LOGS_ERRORS.AUDIT_LOG_IMMUTABLE);
};

export const validateAuditLogsFilters = (data: any) => {
  try {
    return auditLogsFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateAuditLogsGuid = (guid: any) => {
  try {
    return auditLogsGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(AUDIT_LOGS_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Validation des politiques de rétention (logique métier)
export const validateRetentionPolicy = (changeDate: Date, retentionDays: number = 2555) => {
  // ~7 ans par défaut
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  if (changeDate < cutoffDate) {
    throw new Error(AUDIT_LOGS_ERRORS.RETENTION_VIOLATION);
  }

  return true;
};

// Validation pour empêcher la suppression en masse
export const validateBulkDelete = () => {
  throw new Error(AUDIT_LOGS_ERRORS.BULK_DELETE_NOT_ALLOWED);
};

// Schema complet pour les réponses (avec métadonnées)
export const auditLogsResponseSchema = baseAuditLogsSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  // Pas de updated_at - les logs d'audit ne sont jamais modifiés
});

// Export groupé pour faciliter les imports
export const auditLogsSchemas = {
  validateAuditLogsCreation,
  validateAuditLogsUpdate, // Lance une erreur
  validateAuditLogsFilters,
  validateAuditLogsGuid,
  validateRetentionPolicy,
  validateBulkDelete, // Lance une erreur
  createAuditLogsSchema,
  // updateAuditLogsSchema: undefined, // Pas de schema update
  auditLogsFiltersSchema,
  auditLogsGuidSchema,
};

// Types TypeScript générés à partir des schemas
export type CreateAuditLogsInput = z.infer<typeof createAuditLogsSchema>;
// export type UpdateAuditLogsInput = never; // Les logs d'audit ne sont jamais modifiés
export type AuditLogsData = z.infer<typeof auditLogsResponseSchema>;
export type AuditLogsFilters = z.infer<typeof auditLogsFiltersSchema>;
export type JsonValues = z.infer<typeof jsonValuesSchema>;
