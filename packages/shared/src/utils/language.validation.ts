import { LANGUAGE_VALIDATION } from '../constants/language.js';

export class LanguageValidationUtils {
  /**
   * Valide un code langue ISO 639-1
   */
  static validateCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim().toLowerCase();
    return LANGUAGE_VALIDATION.CODE.PATTERN.test(trimmed);
  }

  /**
   * Valide un nom anglais de langue
   */
  static validateNameEn(nameEn: string): boolean {
    if (!nameEn || typeof nameEn !== 'string') return false;
    const trimmed = nameEn.trim();
    return (
      trimmed.length >= LANGUAGE_VALIDATION.NAME_EN.MIN_LENGTH &&
      trimmed.length <= LANGUAGE_VALIDATION.NAME_EN.MAX_LENGTH
    );
  }

  /**
   * Valide un nom local de langue
   */
  static validateNameLocal(nameLocal: string): boolean {
    if (!nameLocal || typeof nameLocal !== 'string') return false;
    const trimmed = nameLocal.trim();
    return (
      trimmed.length >= LANGUAGE_VALIDATION.NAME_LOCAL.MIN_LENGTH &&
      trimmed.length <= LANGUAGE_VALIDATION.NAME_LOCAL.MAX_LENGTH
    );
  }

  /**
   * Valide un statut actif (boolean)
   */
  static validateActive(active: boolean): boolean {
    return typeof active === 'boolean';
  }

  /**
   * Valide un GUID de langue (6 digits)
   */
  static validateLanguageGuid(guid: string | number): boolean {
    const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
    return (
      !isNaN(numGuid) &&
      numGuid >= LANGUAGE_VALIDATION.GUID.MIN_VALUE &&
      numGuid <= LANGUAGE_VALIDATION.GUID.MAX_VALUE
    );
  }

  /**
   * Nettoie et normalise les données de langue
   */
  static cleanLanguageData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    if (cleaned.code) {
      cleaned.code = cleaned.code.toString().trim().toLowerCase();
    }

    if (cleaned.name_en) {
      cleaned.name_en = cleaned.name_en.toString().trim();
    }

    if (cleaned.name_local) {
      cleaned.name_local = cleaned.name_local.toString().trim();
    }

    if (cleaned.active !== undefined) {
      cleaned.active = Boolean(
        cleaned.active === 'true' || cleaned.active === true || cleaned.active === 1,
      );
    }

    return cleaned;
  }

  /**
   * Valide qu'une langue est complète pour création
   */
  static isValidForCreation(data: any): boolean {
    return (
      this.validateCode(data.code) &&
      this.validateNameEn(data.name_en) &&
      this.validateNameLocal(data.name_local)
    );
  }

  /**
   * Extrait les erreurs de validation pour une langue
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (!this.validateCode(data.code)) {
      errors.push('Invalid language code: must be 2 uppercase letters (ISO 639-1)');
    }

    if (!this.validateNameEn(data.name_en)) {
      errors.push(
        `Invalid English name: must be between ${LANGUAGE_VALIDATION.NAME_EN.MIN_LENGTH} and ${LANGUAGE_VALIDATION.NAME_EN.MAX_LENGTH} characters`,
      );
    }

    if (!this.validateNameLocal(data.name_local)) {
      errors.push(
        `Invalid local name: must be between ${LANGUAGE_VALIDATION.NAME_LOCAL.MIN_LENGTH} and ${LANGUAGE_VALIDATION.NAME_LOCAL.MAX_LENGTH} characters`,
      );
    }

    return errors;
  }

  /**
   * Normalise un code langue pour recherche
   */
  static normalizeLanguageCode(code: string): string {
    if (!this.validateCode(code)) {
      throw new Error('Invalid language code for normalization');
    }
    return code.trim().toUpperCase();
  }

  /**
   * Vérifie si deux codes langues sont identiques (après normalisation)
   */
  static areCodesEqual(code1: string, code2: string): boolean {
    if (!this.validateCode(code1) || !this.validateCode(code2)) {
      return false;
    }
    return this.normalizeLanguageCode(code1) === this.normalizeLanguageCode(code2);
  }

  /**
   * Valide les données de filtre de recherche
   */
  static validateFilterData(data: any): boolean {
    // Au moins un filtre doit être spécifié
    const hasValidFilter =
      (data.code && this.validateCode(data.code)) ||
      (data.name_en && this.validateNameEn(data.name_en)) ||
      (data.name_local && this.validateNameLocal(data.name_local)) ||
      (data.active !== undefined && this.validateActive(data.active));

    return hasValidFilter;
  }

  /**
   * Génère un résumé descriptif d'une langue
   */
  static formatLanguageSummary(code: string, nameEn: string, nameLocal: string): string {
    if (
      !this.validateCode(code) ||
      !this.validateNameEn(nameEn) ||
      !this.validateNameLocal(nameLocal)
    ) {
      throw new Error('Invalid language data for summary formatting');
    }
    return `${code} - ${nameEn} (${nameLocal})`;
  }

  /**
   * Vérifie la cohérence des noms (anglais vs local)
   */
  static areNamesConsistent(nameEn: string, nameLocal: string): boolean {
    if (!this.validateNameEn(nameEn) || !this.validateNameLocal(nameLocal)) {
      return false;
    }

    // Règles de base pour la cohérence (peut être étendue)
    const normalizedEn = nameEn.trim().toLowerCase();
    const normalizedLocal = nameLocal.trim().toLowerCase();

    // Éviter les noms identiques (sauf cas particuliers comme "English")
    if (normalizedEn === normalizedLocal && normalizedEn !== 'english') {
      return false;
    }

    return true;
  }

  /**
   * Extrait le code langue d'un identifiant mixte (code ou numérique)
   */
  static extractLanguageIdentifier(identifier: string): {
    type: 'code' | 'numeric';
    value: string;
  } {
    if (/^\d+$/.test(identifier)) {
      return { type: 'numeric', value: identifier };
    } else if (/^[A-Z]{2}$/i.test(identifier)) {
      return { type: 'code', value: identifier.toUpperCase() };
    }

    throw new Error(`Invalid language identifier format: ${identifier}`);
  }
}
