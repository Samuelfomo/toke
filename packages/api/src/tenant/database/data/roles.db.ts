import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const RolesDbStructure = {
  tableName: tableName,
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
      comment: 'Roles ID',
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: { name: 'unique_role_code', msg: 'Role CODE must be unique.' },
      validate: {
        len: [1, 50],
      },
      comment: 'Unique, automatically generated digital CODE',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      // unique: { name: 'unique_role_name', msg: 'Role NAME must be unique.' },
      validate: {
        len: [1, 100],
      },
      comment: 'Role NAME',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [1, 500],
      },
      comment: 'Role description',
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Role permissions',
    },
    system_role: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'System role',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.ROLES,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Roles table with validation information',
    indexes: [
      {
        fields: ['code'],
        name: 'idx_role_code',
      },
      {
        fields: ['name'],
        name: 'idx_role_name',
      },
      {
        fields: ['permissions'],
        name: 'idx_role_permissions',
        using: 'GIN',
      },
      {
        fields: ['system_role'],
        name: 'idx_role_system_role',
      },
    ],
  } as ModelOptions,
};
