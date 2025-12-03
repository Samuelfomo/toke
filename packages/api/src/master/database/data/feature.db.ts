import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const FeatureDbStructure = {
  tableName: tableName.FEATURE,
  attributes: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'Feature',
    },
    guid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: { name: 'unique_feature_guid', msg: 'The feature GUID must be unique' },
      comment: 'Unique, automatically generated digital GUID',
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_feature_name', msg: 'The feature name must be unique' },
      comment: 'Name',
    },
    code: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_feature_code', msg: 'The feature code must be unique' },
      comment: 'Code',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Detailed description',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.FEATURE,
    timestamps: true,
    comment: 'Table of features',
    indexes: [
      {
        unique: true,
        fields: ['guid'],
        name: 'idx_feature_guid',
      },
      {
        unique: true,
        fields: ['name'],
        name: 'idx_feature_name',
      },
      {
        unique: true,
        fields: ['code'],
        name: 'idx_feature_code',
      },
    ],
  } as ModelOptions,

  validation: {
    validateName: (name: string): boolean => {
      const trimmed = name.trim();
      return trimmed.length > 0 && trimmed.length <= 128;
    },
    validateCode(code: string): boolean {
      const trimmed = code.trim();
      return trimmed.length > 0 && trimmed.length <= 128;
    },

    validateDescription: (description: string): boolean => {
      if (!description) return true; // Nullable
      const trimmed = description.trim();
      return trimmed.length <= 255;
    },

    cleanData: (data: any): void => {
      if (data.name && typeof data.name === 'string') {
        data.name = data.name.trim();
      }
      if (data.code && typeof data.code === 'string') {
        data.code = data.code.trim();
      }
      if (data.description && typeof data.description === 'string') {
        data.description = data.description.trim();
      }
    },
  },
};
