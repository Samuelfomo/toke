import type { PaginatedResponse } from './common.js';

export interface LanguageBase {
  code: string; // ISO 639-1 code (e.g., "EN", "FR")
  name_en: string; // English name (e.g., "French")
  name_local: string; // Local name (e.g., "Français")
  active: boolean; // Is this language active?
}

export interface Language extends LanguageBase {
  id: number; // Database ID
  guid: number; // Unique GUID
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface CreateLanguageDto extends LanguageBase {}
export interface UpdateLanguageDto extends Partial<LanguageBase> {}
export interface LanguageResponse extends Language {}
export interface LanguageListResponse extends PaginatedResponse<Language> {
  revision?: string;
}

export interface LanguageFilters {
  code?: string;
  name_en?: string;
  name_local?: string;
  active?: boolean;
}

// Types pour les recherches et identifications
export interface LanguageSearchResult {
  language: Language;
  match_type: 'code' | 'name_en' | 'name_local';
  match_score: number;
}

export interface LanguageIdentifier {
  type: 'id' | 'guid' | 'code';
  value: string | number;
}

// Types pour les statistiques et rapports
export interface LanguageStatistics {
  total_languages: number;
  active_languages: number;
  inactive_languages: number;
  most_recent_addition: string;
  coverage_by_region?: Record<string, number>;
}
