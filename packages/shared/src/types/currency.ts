import type { PaginatedResponse } from './common';

export interface CurrencyBase {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  active: boolean;
}

export interface Currency extends CurrencyBase {
  id: number; // Database ID
  guid: number; // Unique GUID
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface CreateCurrencyDto extends CurrencyBase {}
export interface UpdateCurrencyDto extends Partial<CurrencyBase> {}
export interface CurrencyResponse extends Currency {}
export interface CurrencyListResponse extends PaginatedResponse<Currency> {
  revision?: string;
}

export interface CurrencyFilters {
  is_active?: boolean;
}
