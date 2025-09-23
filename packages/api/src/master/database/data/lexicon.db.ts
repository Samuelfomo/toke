import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

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
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Lexicon',
    },
    guid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: { name: 'unique_lexicon_guid', msg: 'The lexicon GUID must be unique' },
      validate: {
        isInt: true,
        min: 100000,
        max: 999999,
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    portable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'Indicates whether the translation can be exported for mobile applications',
    },
    reference: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: { name: 'unique_lexicon_reference', msg: 'The lexicon REFERENCE must be unique' },
      validate: {
        len: [1, 50],
        notEmpty: true,
        notNull: true,
      },
      comment: 'CamelCase reference key to identify the translation',
    },
    translation: {
      type: DataTypes.JSONB, // PostgresSQL JSONB pour de meilleures performances
      allowNull: false,
      validate: {
        notNull: true,
        notEmpty: true,
      },
      comment:
        'JSON object containing translations by language (e.g. {fr: "bonjour", en: "hello"})',
    },
  } as ModelAttributes,

  options: {
    tableName: tableName.LEXICON,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true, // snake_case pour tous les champs
    freezeTableName: true, // empêche la pluralisation
    comment: 'Multilingual translation table',
    indexes: [
      {
        // unique: true,
        fields: ['guid'],
        name: 'idx_lexicon_guid',
      },
      {
        // unique: true,
        fields: ['reference'],
        name: 'idx_lexicon_reference',
      },
      {
        fields: ['portable'],
        name: 'idx_lexicon_portable',
      },
      {
        fields: ['created_at'],
        name: 'idx_lexicon_created_at',
      },
      {
        fields: ['updated_at'],
        name: 'idx_lexicon_updated_at',
      },
    ],
  } as ModelOptions,
};
