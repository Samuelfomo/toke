// utils/tax.rule.validation.ts
import { TAX_RULE_VALIDATION } from '../constants/tax.rule.js';

export class TaxRuleValidationUtils {
  /**
   * Valide un code pays ISO 3166-1 (2 ou 3 lettres)
   */
  static validateCountryCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim().toUpperCase();
    return (
      TAX_RULE_VALIDATION.COUNTRY_CODE.PATTERN_2.test(trimmed) ||
      TAX_RULE_VALIDATION.COUNTRY_CODE.PATTERN_3.test(trimmed)
    );
  }

  /**
   * Valide un type de taxe
   */
  static validateTaxType(taxType: string): boolean {
    if (!taxType || typeof taxType !== 'string') return false;
    const trimmed = taxType.trim();
    return (
      trimmed.length >= TAX_RULE_VALIDATION.TAX_TYPE.MIN_LENGTH &&
      trimmed.length <= TAX_RULE_VALIDATION.TAX_TYPE.MAX_LENGTH &&
      TAX_RULE_VALIDATION.TAX_TYPE.PATTERN.test(trimmed)
    );
  }

  /**
   * Valide un nom de taxe
   */
  static validateTaxName(taxName: string): boolean {
    if (!taxName || typeof taxName !== 'string') return false;
    const trimmed = taxName.trim();
    return (
      trimmed.length >= TAX_RULE_VALIDATION.TAX_NAME.MIN_LENGTH &&
      trimmed.length <= TAX_RULE_VALIDATION.TAX_NAME.MAX_LENGTH
    );
  }

  /**
   * Valide un taux de taxe (0-1 avec max 4 décimales)
   */
  static validateTaxRate(taxRate: number | string): boolean {
    const rate = typeof taxRate === 'string' ? parseFloat(taxRate) : taxRate;

    if (isNaN(rate)) return false;
    if (
      rate < TAX_RULE_VALIDATION.TAX_RATE.MIN_VALUE ||
      rate > TAX_RULE_VALIDATION.TAX_RATE.MAX_VALUE
    )
      return false;

    // Vérifier le nombre de décimales
    const decimals = rate.toString().split('.')[1];
    if (decimals && decimals.length > TAX_RULE_VALIDATION.TAX_RATE.DECIMAL_PLACES) {
      return false;
    }

    return true;
  }

  /**
   * Valide le champ "applies_to"
   */
  static validateAppliesTo(appliesTo: string): boolean {
    if (!appliesTo || typeof appliesTo !== 'string') return false;
    const trimmed = appliesTo.trim();
    return (
      trimmed.length >= TAX_RULE_VALIDATION.APPLIES_TO.MIN_LENGTH &&
      trimmed.length <= TAX_RULE_VALIDATION.APPLIES_TO.MAX_LENGTH &&
      TAX_RULE_VALIDATION.APPLIES_TO.PATTERN.test(trimmed)
    );
  }

  /**
   * Valide un statut boolean
   */
  static validateBoolean(value: any): boolean {
    return typeof value === 'boolean';
  }

  /**
   * Valide une date
   */
  static validateDate(date: Date | string): boolean {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  }

  /**
   * Valide qu'une date d'expiration est après la date d'effectivité
   */
  static validateDateRange(effectiveDate: Date | string, expiryDate: Date | string): boolean {
    if (!this.validateDate(effectiveDate) || !this.validateDate(expiryDate)) {
      return false;
    }

    const effective = new Date(effectiveDate);
    const expiry = new Date(expiryDate);

    return expiry > effective;
  }

  /**
   * Valide un GUID de règle fiscale (6 chiffres)
   */
  static validateTaxRuleGuid(guid: string | number): boolean {
    const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
    return (
      !isNaN(numGuid) &&
      numGuid >= TAX_RULE_VALIDATION.GUID.MIN_VALUE &&
      numGuid <= TAX_RULE_VALIDATION.GUID.MAX_VALUE
    );
  }

  /**
   * Nettoie et normalise les données de règle fiscale
   */
  static cleanTaxRuleData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    if (cleaned.country_code) {
      cleaned.country_code = cleaned.country_code.toString().trim().toUpperCase();
    }

    if (cleaned.tax_type) {
      cleaned.tax_type = cleaned.tax_type.toString().trim();
    }

    if (cleaned.tax_name) {
      cleaned.tax_name = cleaned.tax_name.toString().trim();
    }

    if (cleaned.tax_rate !== undefined) {
      cleaned.tax_rate =
        typeof cleaned.tax_rate === 'string' ? parseFloat(cleaned.tax_rate) : cleaned.tax_rate;
    }

    if (cleaned.applies_to) {
      cleaned.applies_to = cleaned.applies_to.toString().trim();
    }

    if (cleaned.required_tax_number !== undefined) {
      cleaned.required_tax_number = Boolean(
        cleaned.required_tax_number === 'true' ||
          cleaned.required_tax_number === true ||
          cleaned.required_tax_number === 1,
      );
    }

    if (cleaned.active !== undefined) {
      cleaned.active = Boolean(
        cleaned.active === 'true' || cleaned.active === true || cleaned.active === 1,
      );
    }

    if (cleaned.effective_date) {
      cleaned.effective_date = new Date(cleaned.effective_date);
    }

    if (cleaned.expiry_date) {
      cleaned.expiry_date = new Date(cleaned.expiry_date);
    }

    return cleaned;
  }

  /**
   * Valide qu'une règle fiscale est complète pour création
   */
  static isValidForCreation(data: any): boolean {
    return (
      this.validateCountryCode(data.country_code) &&
      this.validateTaxType(data.tax_type) &&
      this.validateTaxName(data.tax_name) &&
      this.validateTaxRate(data.tax_rate) &&
      this.validateAppliesTo(data.applies_to || TAX_RULE_VALIDATION.APPLIES_TO.DEFAULT)
    );
  }

  /**
   * Extrait les erreurs de validation pour une règle fiscale
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (!this.validateCountryCode(data.country_code)) {
      errors.push('Invalid country code: must be 2 or 3 uppercase letters (ISO 3166-1)');
    }

    if (!this.validateTaxType(data.tax_type)) {
      errors.push(
        `Invalid tax type: must be between ${TAX_RULE_VALIDATION.TAX_TYPE.MIN_LENGTH} and ${TAX_RULE_VALIDATION.TAX_TYPE.MAX_LENGTH} alphanumeric characters with underscores`,
      );
    }

    if (!this.validateTaxName(data.tax_name)) {
      errors.push(
        `Invalid tax name: must be between ${TAX_RULE_VALIDATION.TAX_NAME.MIN_LENGTH} and ${TAX_RULE_VALIDATION.TAX_NAME.MAX_LENGTH} characters`,
      );
    }

    if (!this.validateTaxRate(data.tax_rate)) {
      errors.push(
        `Invalid tax rate: must be between ${TAX_RULE_VALIDATION.TAX_RATE.MIN_VALUE} and ${TAX_RULE_VALIDATION.TAX_RATE.MAX_VALUE} with max ${TAX_RULE_VALIDATION.TAX_RATE.DECIMAL_PLACES} decimal places`,
      );
    }

    if (data.applies_to && !this.validateAppliesTo(data.applies_to)) {
      errors.push(
        `Invalid applies_to: must be between ${TAX_RULE_VALIDATION.APPLIES_TO.MIN_LENGTH} and ${TAX_RULE_VALIDATION.APPLIES_TO.MAX_LENGTH} alphanumeric characters with underscores`,
      );
    }

    if (data.effective_date && !this.validateDate(data.effective_date)) {
      errors.push('Invalid effective date');
    }

    if (data.expiry_date && !this.validateDate(data.expiry_date)) {
      errors.push('Invalid expiry date');
    }

    if (
      data.effective_date &&
      data.expiry_date &&
      !this.validateDateRange(data.effective_date, data.expiry_date)
    ) {
      errors.push('Expiry date must be after effective date');
    }

    return errors;
  }

  /**
   * Normalise un code pays pour recherche
   */
  static normalizeCountryCode(code: string): string {
    if (!this.validateCountryCode(code)) {
      throw new Error('Invalid country code for normalization');
    }
    return code.trim().toUpperCase();
  }

  /**
   * Vérifie si deux codes pays sont identiques (après normalisation)
   */
  static areCountryCodesEqual(code1: string, code2: string): boolean {
    if (!this.validateCountryCode(code1) || !this.validateCountryCode(code2)) {
      return false;
    }
    return this.normalizeCountryCode(code1) === this.normalizeCountryCode(code2);
  }

  /**
   * Valide les données de filtre de recherche
   */
  static validateFilterData(data: any): boolean {
    // Au moins un filtre doit être spécifié
    return (
      (data.country_code && this.validateCountryCode(data.country_code)) ||
      (data.tax_type && this.validateTaxType(data.tax_type)) ||
      (data.tax_name && this.validateTaxName(data.tax_name)) ||
      (data.applies_to && this.validateAppliesTo(data.applies_to)) ||
      (data.required_tax_number !== undefined && this.validateBoolean(data.required_tax_number)) ||
      (data.active !== undefined && this.validateBoolean(data.active))
    );
  }

  /**
   * Génère un résumé descriptif d'une règle fiscale
   */
  static formatTaxRuleSummary(
    countryCode: string,
    taxType: string,
    taxName: string,
    taxRate: number,
  ): string {
    if (
      !this.validateCountryCode(countryCode) ||
      !this.validateTaxType(taxType) ||
      !this.validateTaxName(taxName) ||
      !this.validateTaxRate(taxRate)
    ) {
      throw new Error('Invalid tax rule data for summary formatting');
    }
    const ratePercentage = (taxRate * 100).toFixed(2);
    return `${countryCode} - ${taxType}: ${taxName} (${ratePercentage}%)`;
  }

  /**
   * Vérifie si une règle fiscale est active à une date donnée
   */
  static isActiveAtDate(
    effectiveDate: Date | string,
    expiryDate: Date | string | null,
    checkDate: Date = new Date(),
  ): boolean {
    const effective = new Date(effectiveDate);
    const expiry = expiryDate ? new Date(expiryDate) : null;

    if (!this.validateDate(effective)) return false;
    if (expiry && !this.validateDate(expiry)) return false;

    return checkDate >= effective && (!expiry || checkDate <= expiry);
  }

  /**
   * Convertit un taux décimal en pourcentage formaté
   */
  static formatTaxRateAsPercentage(taxRate: number): string {
    if (!this.validateTaxRate(taxRate)) {
      throw new Error('Invalid tax rate for percentage formatting');
    }
    return `${(taxRate * 100).toFixed(2)}%`;
  }

  /**
   * Convertit un pourcentage en taux décimal
   */
  static parsePercentageToRate(percentage: string): number {
    const cleaned = percentage.replace('%', '').trim();
    const rate = parseFloat(cleaned) / 100;

    if (!this.validateTaxRate(rate)) {
      throw new Error('Invalid percentage value');
    }

    return rate;
  }

  /**
   * Vérifie la cohérence entre type de taxe et nom
   */
  static areTaxTypeAndNameConsistent(taxType: string, taxName: string): boolean {
    if (!this.validateTaxType(taxType) || !this.validateTaxName(taxName)) {
      return false;
    }

    const normalizedType = taxType.trim().toLowerCase();
    const normalizedName = taxName.trim().toLowerCase();

    // Règles de base pour la cohérence (peut être étendue)
    if (normalizedType.includes('tva') && !normalizedName.includes('tva')) {
      return false;
    }

    if (normalizedType.includes('vat') && !normalizedName.includes('vat')) {
      return false;
    }

    return true;
  }

  /**
   * Extrait l'identifiant d'une règle fiscale (GUID ou ID numérique)
   */
  static extractTaxRuleIdentifier(identifier: string): {
    type: 'guid' | 'id';
    value: number;
  } {
    if (/^\d{6}$/.test(identifier)) {
      return { type: 'guid', value: parseInt(identifier) };
    } else if (/^\d+$/.test(identifier)) {
      return { type: 'id', value: parseInt(identifier) };
    }

    throw new Error(`Invalid tax rule identifier format: ${identifier}`);
  }

  /**
   * Valide qu'une règle fiscale n'entre pas en conflit avec des règles existantes
   */
  static validateNoConflict(
    newRule: any,
    existingRules: any[],
  ): { isValid: boolean; conflicts: string[] } {
    const conflicts: string[] = [];

    for (const existing of existingRules) {
      // Même pays, type et applies_to
      if (
        existing.country_code === newRule.country_code &&
        existing.tax_type === newRule.tax_type &&
        existing.applies_to === newRule.applies_to &&
        existing.active === true
      ) {
        // Vérifier les chevauchements de dates
        const newEffective = new Date(newRule.effective_date);
        const newExpiry = newRule.expiry_date ? new Date(newRule.expiry_date) : null;
        const existingEffective = new Date(existing.effective_date);
        const existingExpiry = existing.expiry_date ? new Date(existing.expiry_date) : null;

        // Logique de détection de chevauchement
        const hasOverlap =
          (newEffective <= existingEffective && (!newExpiry || newExpiry >= existingEffective)) ||
          (newEffective <= (existingExpiry || new Date()) && newEffective >= existingEffective);

        if (hasOverlap) {
          conflicts.push(
            `Conflicts with existing rule for ${existing.country_code}-${existing.tax_type}`,
          );
        }
      }
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Calcule le montant de taxe à partir d'un montant de base
   */
  static calculateTaxAmount(baseAmount: number, taxRate: number): number {
    if (!this.validateTaxRate(taxRate) || baseAmount < 0) {
      throw new Error('Invalid parameters for tax calculation');
    }

    return Math.round(baseAmount * taxRate * 100) / 100; // Arrondi à 2 décimales
  }

  /**
   * Calcule le montant total (base + taxe)
   */
  static calculateTotalAmount(baseAmount: number, taxRate: number): number {
    const taxAmount = this.calculateTaxAmount(baseAmount, taxRate);
    return baseAmount + taxAmount;
  }
}
