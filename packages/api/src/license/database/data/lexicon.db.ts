import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

/**
 * Énumération des langues acceptees pour le lexique
 */
export enum Iso639Code {
  FRENCH = 'fr',
  ENGLISH = 'en',
  DUTCH = 'de',
  SPANISH = 'es',
}
export const iso639Codes = Object.values(Iso639Code) as string[];

/**
 * Structure de la table lexicon
 */
export const LexiconDbStructure = {
  tableName: tableName.LEXICON,

  attributes: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'Lexicon',
    },
    guid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: { name: 'unique_lexicon_guid', msg: 'The lexicon GUID must be unique' },
      comment: 'Unique, automatically generated digital GUID',
    },
    portable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Indicates whether the translation can be exported for mobile applications',
    },
    reference: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: { name: 'unique_lexicon_reference', msg: 'The lexicon REFERENCE must be unique' },
      comment: 'CamelCase reference key to identify the translation',
    },
    translation: {
      type: DataTypes.JSONB, // PostgresSQL JSONB pour de meilleures performances
      allowNull: false,
      comment:
        'JSON object containing translations by language (e.g. {fr: “bonjour”, en: “hello”})',
    },
  } as ModelAttributes,

  options: {
    tableName: tableName.LEXICON,
    timestamps: true,
    comment: 'Multilingual translation table',
    indexes: [
      {
        unique: true,
        fields: ['guid'],
        name: 'idx_lexicon_guid',
      },
      {
        unique: true,
        fields: ['reference'],
        name: 'idx_lexicon_reference',
      },
      {
        fields: ['portable'],
        name: 'idx_lexicon_portable',
      },
    ],
  } as ModelOptions,

  // Méthodes de validation
  validation: {
    /**
     * Valide le format camelCase de la référence
     */
    validateReference: (reference: string): boolean => {
      const trimmed = reference.trim();
      // Vérifier la longueur (1-50 caractères)
      if (trimmed.length === 0 || trimmed.length > 50) return false;

      // Vérifier le format camelCase : commence par minuscule, peut contenir lettres et chiffres
      const camelCaseRegex = /^[a-z][a-zA-Z0-9]*$/;
      return camelCaseRegex.test(trimmed);
    },

    /**
     * Valide les codes de langue ISO 639-1
     */
    validateLanguageCode: (langCode: string): boolean => {
      // const iso639Codes = ['de', 'en', 'es', 'fr'];
      return iso639Codes.includes(langCode.toLowerCase());
    },

    /**
     * Valide l'objet translation
     */
    validateTranslation: (translation: any): boolean => {
      if (!translation || typeof translation !== 'object') return false;

      // Doit contenir au moins le français (langue par défaut)
      if (
        !translation.fr ||
        typeof translation.fr !== 'string' ||
        translation.fr.trim().length === 0
      ) {
        return false;
      }

      // Valider tous les codes de langue présents
      for (const langCode of Object.keys(translation)) {
        if (!LexiconDbStructure.validation.validateLanguageCode(langCode)) {
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
    },

    /**
     * Nettoie les données avant insertion/update
     */
    cleanData: (data: any): void => {
      if (data.reference) {
        data.reference = data.reference.trim();
      }

      if (data.translation && typeof data.translation === 'object') {
        // Nettoyer les traductions (trim des espaces)
        for (const langCode of Object.keys(data.translation)) {
          if (typeof data.translation[langCode] === 'string') {
            data.translation[langCode] = data.translation[langCode].trim();
          }
        }
      }
    },
  },
};
