import { LEXICON_VALIDATION } from '../constants/lexicon.js';

// Import Language utilities for dynamic language validation
import { LanguageValidationUtils } from './language.validation.js';

export class LexiconValidationUtils {
  /**
   * Valide une référence camelCase
   */
  static validateReference(reference: string): boolean {
    if (!reference || typeof reference !== 'string') return false;
    const trimmed = reference.trim();

    return (
      trimmed.length >= LEXICON_VALIDATION.REFERENCE.MIN_LENGTH &&
      trimmed.length <= LEXICON_VALIDATION.REFERENCE.MAX_LENGTH &&
      LEXICON_VALIDATION.REFERENCE.PATTERN.test(trimmed)
    );
  }

  /**
   * Valide un code de langue (utilise la validation dynamique des langues)
   */
  static async validateLanguageCode(
    langCode: string,
    // activeLanguagesOnly: boolean = true,
  ): Promise<boolean> {
    if (!langCode || typeof langCode !== 'string') return false;

    // Utilise la validation du système de langues
    if (!LanguageValidationUtils.validateCode(langCode)) return false;

    // TODO: Si activeLanguagesOnly est true, vérifier que la langue est active dans la DB
    // Cette vérification nécessiterait une requête DB ou une liste de langues actives en cache
    return true;
  }

  /**
   * Valide un objet translation
   */
  static async validateTranslation(
    translation: any,
    availableLanguageCodes?: string[],
  ): Promise<boolean> {
    if (!translation || typeof translation !== 'object') return false;

    // Vérifier la présence de la langue par défaut (français)
    if (
      !translation[LEXICON_VALIDATION.TRANSLATION.REQUIRED_DEFAULT_LANG] ||
      typeof translation[LEXICON_VALIDATION.TRANSLATION.REQUIRED_DEFAULT_LANG] !== 'string' ||
      translation[LEXICON_VALIDATION.TRANSLATION.REQUIRED_DEFAULT_LANG].trim().length === 0
    ) {
      return false;
    }

    // Valider tous les codes de langue présents
    for (const langCode of Object.keys(translation)) {
      // Valider le format du code de langue
      if (!(await this.validateLanguageCode(langCode))) {
        return false;
      }

      // Si une liste de langues disponibles est fournie, vérifier l'appartenance
      if (availableLanguageCodes && !availableLanguageCodes.includes(langCode)) {
        return false;
      }

      // Vérifier que la traduction n'est pas vide
      if (
        !translation[langCode] ||
        typeof translation[langCode] !== 'string' ||
        translation[langCode].trim().length === 0
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Valide un statut portable (boolean)
   */
  static validatePortable(portable: boolean): boolean {
    return typeof portable === 'boolean';
  }

  /**
   * Valide un GUID de lexique (6 digits)
   */
  static validateLexiconGuid(guid: string | number): boolean {
    const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
    return (
      !isNaN(numGuid) &&
      numGuid >= LEXICON_VALIDATION.GUID.MIN_VALUE &&
      numGuid <= LEXICON_VALIDATION.GUID.MAX_VALUE
    );
  }

  /**
   * Nettoie et normalise les données de lexique
   */
  static cleanLexiconData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    if (cleaned.reference) {
      cleaned.reference = cleaned.reference.toString().trim();
    }

    if (cleaned.translation && typeof cleaned.translation === 'object') {
      // Nettoyer les traductions (trim des espaces)
      for (const langCode of Object.keys(cleaned.translation)) {
        if (typeof cleaned.translation[langCode] === 'string') {
          cleaned.translation[langCode] = cleaned.translation[langCode].trim();
        }
      }
    }

    if (cleaned.portable !== undefined) {
      cleaned.portable = Boolean(
        cleaned.portable === 'true' || cleaned.portable === true || cleaned.portable === 1,
      );
    }

    return cleaned;
  }

  /**
   * Valide qu'un lexique est complet pour création
   */
  static async isValidForCreation(data: any, availableLanguageCodes?: string[]): Promise<boolean> {
    return (
      this.validateReference(data.reference) &&
      (await this.validateTranslation(data.translation, availableLanguageCodes))
    );
  }

  /**
   * Extrait les erreurs de validation pour un lexique
   */
  static async getValidationErrors(
    data: any,
    availableLanguageCodes?: string[],
  ): Promise<string[]> {
    const errors: string[] = [];

    if (!this.validateReference(data.reference)) {
      errors.push(
        `Invalid reference: must be camelCase format (${LEXICON_VALIDATION.REFERENCE.MIN_LENGTH}-${LEXICON_VALIDATION.REFERENCE.MAX_LENGTH} characters, start with lowercase)`,
      );
    }

    if (!(await this.validateTranslation(data.translation, availableLanguageCodes))) {
      errors.push(
        'Invalid translation: must contain at least French translation and valid language codes',
      );
    }

    return errors;
  }

  /**
   * Vérifie si une traduction contient la langue par défaut
   */
  static hasDefaultLanguage(translation: any): boolean {
    return (
      translation &&
      typeof translation === 'object' &&
      translation[LEXICON_VALIDATION.TRANSLATION.REQUIRED_DEFAULT_LANG] &&
      typeof translation[LEXICON_VALIDATION.TRANSLATION.REQUIRED_DEFAULT_LANG] === 'string' &&
      translation[LEXICON_VALIDATION.TRANSLATION.REQUIRED_DEFAULT_LANG].trim().length > 0
    );
  }

  /**
   * Valide les données de filtre de recherche
   */
  static validateFilterData(data: any): boolean {
    // Au moins un filtre doit être spécifié

    return (
      (data.reference && this.validateReference(data.reference)) ||
      (data.portable !== undefined && this.validatePortable(data.portable))
    );
  }

  /**
   * Génère un résumé descriptif d'un lexique
   */
  static formatLexiconSummary(reference: string, translation: any): string {
    if (!this.validateReference(reference) || !this.hasDefaultLanguage(translation)) {
      throw new Error('Invalid lexicon data for summary formatting');
    }

    const defaultTranslation = translation[LEXICON_VALIDATION.TRANSLATION.REQUIRED_DEFAULT_LANG];
    const languageCount = Object.keys(translation).length;

    return `${reference}: "${defaultTranslation}" (${languageCount} langue${languageCount > 1 ? 's' : ''})`;
  }

  /**
   * Extrait les codes de langue d'un objet de traduction
   */
  static extractLanguageCodes(translation: any): string[] {
    if (!translation || typeof translation !== 'object') return [];
    return Object.keys(translation).filter(
      (code) => typeof translation[code] === 'string' && translation[code].trim().length > 0,
    );
  }

  /**
   * Vérifie la cohérence des traductions (pas de doublons de valeur)
   */
  static areTranslationsConsistent(translation: any): boolean {
    if (!translation || typeof translation !== 'object') return false;

    const values = Object.values(translation).map((val) =>
      typeof val === 'string' ? val.trim().toLowerCase() : '',
    );

    // Vérifier qu'il n'y a pas de doublons de traduction
    const uniqueValues = new Set(values.filter((val) => val.length > 0));
    return uniqueValues.size === values.filter((val) => val.length > 0).length;
  }

  /**
   * Merge partiel des traductions existantes avec nouvelles
   */
  static mergeTranslations(existingTranslation: any, newTranslation: any): any {
    if (!existingTranslation || typeof existingTranslation !== 'object') {
      return newTranslation;
    }

    if (!newTranslation || typeof newTranslation !== 'object') {
      return existingTranslation;
    }

    return {
      ...existingTranslation,
      ...newTranslation,
    };
  }
}
