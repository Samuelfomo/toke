// schemas/sites.ts
import { z } from 'zod';

import {
  SITES_DEFAULTS,
  SITES_ERRORS,
  SITES_VALIDATION,
  SiteType,
} from '../../constants/tenant/sites.js';

// Schema pour valider l'adresse
const addressSchema = z
  .object({
    city: z.string().min(1),
    location: z.string().min(1),
    place_name: z.string().min(1),
  })
  .passthrough() // Permet d'autres propriétés additionnelles
  .refine((address) => {
    const requiredFields = SITES_VALIDATION.ADDRESS.REQUIRED_FIELDS;
    return requiredFields.every((field) => field in address && address[field]);
  }, SITES_ERRORS.ADDRESS_MISSING_FIELDS);

// Schema pour valider le polygone de géofence
const geofencePolygonSchema = z
  .object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()).length(2))).min(1),
  })
  .refine((polygon) => {
    // Validation basique des coordonnées (longitude, latitude)
    return polygon.coordinates.every((ring) =>
      ring.every(
        (coord) =>
          coord.length === 2 &&
          coord[0]! >= -180 &&
          coord[0]! <= 180 && // longitude
          coord[1]! >= -90 &&
          coord[1]! <= 90, // latitude
      ),
    );
  }, SITES_ERRORS.INVALID_COORDINATES);

// Base schema pour les validations communes
const baseSitesSchema = z.object({
  tenant: z
    .string({
      required_error: SITES_ERRORS.TENANT_REQUIRED,
      invalid_type_error: SITES_ERRORS.TENANT_INVALID,
    })
    .min(SITES_VALIDATION.TENANT.MIN_LENGTH, SITES_ERRORS.TENANT_INVALID)
    .max(SITES_VALIDATION.TENANT.MAX_LENGTH, SITES_ERRORS.TENANT_INVALID)
    .trim(),

  created_by: z
    .number({
      required_error: SITES_ERRORS.CREATED_BY_REQUIRED,
      invalid_type_error: SITES_ERRORS.CREATED_BY_INVALID,
    })
    .int()
    .min(SITES_VALIDATION.CREATED_BY.MIN, SITES_ERRORS.CREATED_BY_INVALID)
    .max(SITES_VALIDATION.CREATED_BY.MAX, SITES_ERRORS.CREATED_BY_INVALID),

  name: z
    .string({
      required_error: SITES_ERRORS.NAME_REQUIRED,
      invalid_type_error: SITES_ERRORS.NAME_INVALID,
    })
    .min(SITES_VALIDATION.NAME.MIN_LENGTH, SITES_ERRORS.NAME_INVALID)
    .max(SITES_VALIDATION.NAME.MAX_LENGTH, SITES_ERRORS.NAME_INVALID)
    .trim(),

  site_type: z
    .nativeEnum(SiteType, {
      invalid_type_error: SITES_ERRORS.SITE_TYPE_INVALID,
    })
    .default(SITES_DEFAULTS.SITE_TYPE),

  address: addressSchema.refine((address) => {
    try {
      JSON.stringify(address);
      return true;
    } catch {
      return false;
    }
  }, SITES_ERRORS.ADDRESS_INVALID),

  geofence_polygon: geofencePolygonSchema,

  geofence_radius: z
    .number({
      required_error: SITES_ERRORS.GEOFENCE_RADIUS_REQUIRED,
      invalid_type_error: SITES_ERRORS.GEOFENCE_RADIUS_INVALID,
    })
    .int()
    .min(SITES_VALIDATION.GEOFENCE_RADIUS.MIN, SITES_ERRORS.GEOFENCE_RADIUS_INVALID)
    .max(SITES_VALIDATION.GEOFENCE_RADIUS.MAX, SITES_ERRORS.GEOFENCE_RADIUS_INVALID)
    .default(SITES_DEFAULTS.GEOFENCE_RADIUS),

  qr_reference: z
    .number({
      invalid_type_error: SITES_ERRORS.QR_REFERENCE_INVALID,
    })
    .int()
    .min(SITES_VALIDATION.QR_REFERENCE.MIN, SITES_ERRORS.QR_REFERENCE_INVALID)
    .max(SITES_VALIDATION.QR_REFERENCE.MAX, SITES_ERRORS.QR_REFERENCE_INVALID)
    .optional()
    .nullable(),

  qr_code_data: z
    .record(z.any(), {
      invalid_type_error: SITES_ERRORS.QR_CODE_DATA_INVALID,
    })
    .refine((qrData) => {
      try {
        JSON.stringify(qrData);
        return true;
      } catch {
        return false;
      }
    }, SITES_ERRORS.QR_CODE_DATA_INVALID)
    .optional()
    .nullable(),

  active: z
    .boolean({
      invalid_type_error: SITES_ERRORS.ACTIVE_STATUS_INVALID,
    })
    .default(SITES_DEFAULTS.ACTIVE),

  public: z
    .boolean({
      invalid_type_error: SITES_ERRORS.PUBLIC_STATUS_INVALID,
    })
    .default(SITES_DEFAULTS.PUBLIC),

  allowed_roles: z
    .record(z.any(), {
      invalid_type_error: SITES_ERRORS.ALLOWED_ROLES_INVALID,
    })
    .refine((roles) => {
      try {
        JSON.stringify(roles);
        return true;
      } catch {
        return false;
      }
    }, SITES_ERRORS.ALLOWED_ROLES_INVALID)
    .optional()
    .nullable(),
});

// Schema pour la création - tous les champs requis
export const createSitesSchema = baseSitesSchema;

// Schema pour les mises à jour - tous les champs optionnels
export const updateSitesSchema = baseSitesSchema.partial();

// Schema pour les filtres
export const sitesFiltersSchema = z
  .object({
    tenant: z.string().optional(),
    created_by: z.number().int().optional(),
    name: z.string().optional(),
    site_type: z.nativeEnum(SiteType).optional(),
    city: z.string().optional(), // Filtrage par ville dans l'adresse
    active: z.boolean().optional(),
    public: z.boolean().optional(),
    geofence_radius_min: z.number().int().optional(),
    geofence_radius_max: z.number().int().optional(),
    has_qr_code: z.boolean().optional(), // Pour filtrer les sites avec QR code
  })
  .strict();

// Schema pour validation GUID
export const sitesGuidSchema = z
  .string()
  .min(SITES_VALIDATION.GUID.MIN_LENGTH, SITES_ERRORS.GUID_INVALID)
  .max(SITES_VALIDATION.GUID.MAX_LENGTH, SITES_ERRORS.GUID_INVALID);

// Fonctions de validation avec gestion d'erreurs
export const validateSitesCreation = (data: any) => {
  try {
    return createSitesSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateSitesUpdate = (data: any) => {
  try {
    return updateSitesSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateSitesFilters = (data: any) => {
  try {
    return sitesFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateSitesGuid = (guid: any) => {
  try {
    return sitesGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(SITES_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Validation géospatiale pour détecter les chevauchements
export const validateGeofenceOverlap = (data: any) => {
  const validated = validateSitesCreation(data);

  // Note: Cette validation nécessiterait une logique métier spécifique
  // pour vérifier les chevauchements avec les sites existants
  // Elle devrait être implémentée au niveau service/business logic

  return validated;
};

// Schema complet pour les réponses (avec métadonnées)
export const sitesResponseSchema = baseSitesSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Export groupé pour faciliter les imports
export const sitesSchemas = {
  validateSitesCreation,
  validateSitesUpdate,
  validateSitesFilters,
  validateSitesGuid,
  validateGeofenceOverlap,
  createSitesSchema,
  updateSitesSchema,
  sitesFiltersSchema,
  sitesGuidSchema,
};

// Types TypeScript générés à partir des schemas
export type CreateSitesInput = z.infer<typeof createSitesSchema>;
export type UpdateSitesInput = z.infer<typeof updateSitesSchema>;
export type SitesData = z.infer<typeof sitesResponseSchema>;
export type SitesFilters = z.infer<typeof sitesFiltersSchema>;
export type SiteAddress = z.infer<typeof addressSchema>;
export type GeofencePolygon = z.infer<typeof geofencePolygonSchema>;
