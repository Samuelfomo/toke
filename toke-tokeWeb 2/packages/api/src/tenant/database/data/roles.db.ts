import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const RolesDbStructure = {
  tableName: tableName.ROLES,
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
    guid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_role_guid', msg: 'Role GUID must be unique.' },
      defaultValue: DataTypes.UUIDV4,
      validate: {
        len: [1, 128],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: { name: 'unique_role_code', msg: 'Role CODE must be unique.' },
      validate: {
        len: [1, 50],
      },
      comment: 'Unique role CODE',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
      },
      comment: 'Role NAME',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [10, 500],
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
    // default_role: {
    //   type: DataTypes.BOOLEAN,
    //   allowNull: false,
    //   defaultValue: false,
    //   validate: {
    //     isBoolean: true,
    //   },
    //   comment: 'Default role',
    // },
    // admin_role: {
    //   type: DataTypes.BOOLEAN,
    //   allowNull: false,
    //   defaultValue: false,
    //   validate: {
    //     isBoolean: true,
    //   },
    //   comment: 'Admin role',
    // },
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
        fields: ['guid'],
        name: 'idx_role_guid',
      },
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
      // {
      //   fields: ['default_role'],
      //   name: 'idx_role_default_role',
      // },
      // {
      //   fields: ['admin_role'],
      //   name: 'idx_role_admin_role',
      // },
    ],
  } as ModelOptions,
};
