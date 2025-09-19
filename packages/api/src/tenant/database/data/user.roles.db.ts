import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const UserRolesDbStructure = {
  tableName: tableName.USER_ROLES,
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
      comment: 'User role ID',
    },
    guid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_user_role_guid', msg: 'User role GUID must be unique.' },
      defaultValue: DataTypes.UUIDV4,
      validate: {
        len: [1, 128],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    user: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 65535,
      },
      OnDelete: 'CASCADE',
      comment: 'Users',
    },
    role: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      references: {
        model: tableName.ROLES,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 65535,
      },
      OnDelete: 'CASCADE',
      comment: 'Roles',
    },
    // assigned_at: {
    //   type: DataTypes.DATE,
    //   allowNull: false,
    //   defaultValue: DataTypes.NOW,
    //   validate: {
    //     isDate: true,
    //   },
    //   comment: 'Assigned date',
    // },
    assigned_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      comment: 'Users',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.USER_ROLES,
    timestamp: true,
    createdAt: 'assigned_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'User roles table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_user_role_guid',
      },
      {
        fields: ['user'],
        name: 'idx_user_role_user',
      },
      {
        fields: ['role'],
        name: 'idx_user_role_role',
      },
      {
        fields: ['assigned_by'],
        name: 'idx_user_role_assigned_by',
      },
      {
        fields: ['assigned_at'],
        name: 'idx_user_role_assigned_at',
      },
      {
        unique: true,
        fields: ['user', 'role'],
        name: 'idx_user_role',
      },
    ],
  } as ModelOptions,
};
