// shared/src/types/country.ts

import type { PaginatedResponse } from './common.js';

export interface CountryBase {
  code: string; // ISO 3166-1 alpha-2 (e.g., "CM")
  name_en: string; // English name
  name_local?: string; // Local name
  default_currency_code: string; // ISO 4217 (e.g., "XAF")
  default_language_code: string; // ISO 639-1 (e.g., "fr")
  active: boolean; // Is country active
  timezone_default: string; // Timezone (e.g., "Africa/Douala")
  phone_prefix: string; // International prefix (e.g., "+237")
}

export interface Country extends CountryBase {
  id: number; // Database ID
  guid: number; // Unique GUID
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

// Pour les créations (sans ID, GUID, timestamps)
export interface CreateCountryDto extends CountryBase {}

// Pour les mises à jour (tous les champs optionnels sauf les IDs)
export interface UpdateCountryDto extends Partial<CountryBase> {}

// Pour les réponses d'API
export interface CountryResponse extends Country {}

export interface CountryListResponse extends PaginatedResponse<Country> {
  revision?: string;
}

// Pour les filtres de recherche
export interface CountryFilters {
  timezone_default?: string;
  default_currency_code?: string;
  default_language_code?: string;
  is_active?: boolean;
}
