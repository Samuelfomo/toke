import type { PaginatedResponse } from './common.js';

export interface ExchangeRateBase {
  from_currency_code: string; // ISO 4217 code (e.g., "USD")
  to_currency_code: string; // ISO 4217 code (e.g., "EUR")
  exchange_rate: number; // Rate value (e.g., 0.85 for USD to EUR)
  current: boolean; // Is this the current rate?
  created_by: number; // User ID who created this rate
}

export interface ExchangeRate extends ExchangeRateBase {
  id: number; // Database ID
  guid: number; // Unique GUID
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface CreateExchangeRateDto extends ExchangeRateBase {}
export interface UpdateExchangeRateDto extends Partial<ExchangeRateBase> {}
export interface ExchangeRateResponse extends ExchangeRate {}
export interface ExchangeRateListResponse extends PaginatedResponse<ExchangeRate> {
  revision?: string;
}

export interface ExchangeRateFilters {
  from_currency_code?: string;
  to_currency_code?: string;
  current?: boolean;
  created_by?: number;
}

// Types pour la conversion de devises
export interface CurrencyConversionRequest {
  amount: number;
  from_currency: string; // ISO 4217 code
  to_currency: string; // ISO 4217 code
}

export interface CurrencyConversionResponse {
  from_currency: string;
  to_currency: string;
  original_amount: number;
  converted_amount: number;
  exchange_rate: number;
  currency_pair: string;
  rate_guid?: number;
  conversion_timestamp: string;
  conversion_note?: string;
}

// Types pour les paires de devises
export interface CurrencyPair {
  from_currency_code: string;
  to_currency_code: string;
  pair_string: string; // Format: "USD/EUR"
}

// Types pour l'historique des taux
export interface ExchangeRateHistory {
  currency_pair: string;
  rates: Array<{
    exchange_rate: number;
    created_at: string;
    created_by: number;
    current: boolean;
  }>;
  period_start?: string;
  period_end?: string;
}
