// types/tax.rule.ts
import type { PaginatedResponse } from './common.js';

export interface TaxRuleBase {
  country_code: string; // ISO 3166-1 code (e.g., "FR", "US", "CAN")
  tax_type: string; // Tax type identifier (e.g., "TVA", "VAT", "GST")
  tax_name: string; // Human-readable tax name (e.g., "Taxe sur la Valeur Ajoutée")
  tax_rate: number; // Tax rate as decimal (e.g., 0.20 for 20%)
  applies_to: string; // What the tax applies to (e.g., "license_fee", "adjustment")
  required_tax_number: boolean; // Whether tax number is required
  effective_date: Date; // When the tax rule becomes effective
  expiry_date?: Date; // When the tax rule expires (optional)
  active: boolean; // Is this tax rule active?
}

export interface TaxRule extends TaxRuleBase {
  id: number; // Database ID
  guid: number; // Unique GUID (6 digits)
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface CreateTaxRuleDto extends TaxRuleBase {}
export interface UpdateTaxRuleDto extends Partial<TaxRuleBase> {}
export interface TaxRuleResponse extends TaxRule {}
export interface TaxRuleListResponse extends PaginatedResponse<TaxRule> {
  revision?: string;
}

export interface TaxRuleFilters {
  country_code?: string;
  tax_type?: string;
  tax_name?: string;
  applies_to?: string;
  required_tax_number?: boolean;
  active?: boolean;
  effective_from?: Date;
  effective_to?: Date;
}

// Types pour les recherches et identifications
export interface TaxRuleSearchResult {
  tax_rule: TaxRule;
  match_type: 'country_code' | 'tax_type' | 'tax_name' | 'applies_to';
  match_score: number;
}

export interface TaxRuleIdentifier {
  type: 'id' | 'guid';
  value: number;
}

// Types pour les calculs de taxes
export interface TaxCalculation {
  base_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  tax_rule_guid: number;
  calculation_date: Date;
}

export interface TaxBreakdown {
  country_code: string;
  calculations: TaxCalculation[];
  total_tax_amount: number;
  total_amount_with_tax: number;
}

// Types pour les statistiques et rapports
export interface TaxRuleStatistics {
  total_rules: number;
  active_rules: number;
  inactive_rules: number;
  rules_by_country: Record<string, number>;
  rules_by_type: Record<string, number>;
  average_tax_rate: number;
  most_recent_addition: string;
  expiring_soon: TaxRule[]; // Rules expiring within 30 days
}

// Types pour la validation et les conflits
export interface TaxRuleConflict {
  existing_rule: TaxRule;
  conflict_type: 'date_overlap' | 'duplicate_rule' | 'rate_discrepancy';
  description: string;
}

export interface TaxRuleValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: TaxRuleConflict[];
}

// Types pour les exports et imports
export interface TaxRuleExport {
  export_date: string;
  total_rules: number;
  rules: TaxRule[];
  metadata: {
    version: string;
    format: 'json' | 'csv' | 'excel';
    filters_applied: TaxRuleFilters;
  };
}

export interface TaxRuleImportResult {
  total_processed: number;
  successful_imports: number;
  failed_imports: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    data: any;
  }>;
  imported_rules: TaxRule[];
}

// Types pour l'audit et l'historique
export interface TaxRuleAuditEntry {
  id: number;
  tax_rule_guid: number;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  changes: Record<string, { old_value: any; new_value: any }>;
  performed_by: string;
  performed_at: string;
  reason?: string;
}

export interface TaxRuleHistory {
  tax_rule: TaxRule;
  audit_entries: TaxRuleAuditEntry[];
  total_changes: number;
  first_created: string;
  last_modified: string;
}
