import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const SessionTemplatesDbStructure = {
  tableName: tableName.SESSION_TEMPLATES,
  attributes: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      comment: 'User ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_session_templates_guid',
        msg: 'Session templates GUID must be unique.',
      },
      validate: {
        len: [1, 255],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    tenant: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: {
        len: [1, 128],
        notEmpty: true,
      },
      comment: 'Tenant Reference',
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: {
        len: [1, 128],
        notEmpty: true,
      },
      comment: 'Session name',
    },
    valid_from: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true,
      },
      comment: 'Session valid from date',
    },
    valid_to: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'Session valid to date',
    },
    definition: {
      type: DataTypes.JSONB,
      allowNull: false,
      // validate: {
      //   isJson: true,
      // },
      comment: 'Session definition',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.SESSION_TEMPLATES,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true, // ✅ Active le soft delete automatique
    deletedAt: 'deleted_at', // ✅ Nom du champ de soft delete
    underscored: true,
    freezeTableName: true,
    comment: 'Session templates table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_session_templates_guid',
      },
      {
        fields: ['tenant'],
        name: 'idx_session_templates_tenant',
      },
      {
        fields: ['name'],
        name: 'idx_session_templates_name',
      },
      {
        fields: ['valid_from'],
        name: 'idx_session_templates_valid_from',
      },
      {
        fields: ['valid_to'],
        name: 'idx_session_templates_valid_to',
      },
      {
        fields: ['created_at'],
        name: 'idx_session_templates_created_at',
      },
      {
        fields: ['deleted_at'],
        name: 'idx_session_templates_deleted_at',
      },
      {
        fields: ['information'],
        name: 'idx_session_templates_information',
        using: 'gin',
      },
    ],
  } as ModelOptions,
};
