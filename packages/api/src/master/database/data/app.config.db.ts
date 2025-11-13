import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const AppConfigDBStructure = {
  tableName: tableName.APP_CONFIG,
  attributes: {
    id: {
      type: DataTypes.SMALLINT,
      primaryKey: true,
      autoIncrement: true,
      validate: {
        isInt: true,
        min: 1,
        max: 65535,
      },
      comment: 'AppConfig',
    },
    key: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_app_config_key', msg: 'App config key must be unique' },
      validate: {
        len: [1, 128],
        notEmpty: true,
        notNull: true,
      },
      comment: 'Key',
    },
    link: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: { name: 'unique_app_config_link', msg: 'App config link must be unique' },
      validate: {
        isUrl: { msg: 'The link must be a valid URL.' },
        len: [1, 255],
      },
      comment: 'Link',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'App config is active',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.APP_CONFIG,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'App config table with validation information',
    indexes: [
      {
        name: 'idx_app_config_key',
        fields: ['key'],
      },
      {
        name: 'idx_app_config_link',
        fields: ['link'],
      },
      {
        name: 'idx_app_config_active',
        fields: ['active'],
      },
    ],
  } as ModelOptions,
};
