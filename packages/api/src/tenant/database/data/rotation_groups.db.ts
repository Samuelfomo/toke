import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

// ==========================================
// ROTATION GROUPS
// ==========================================
export const RotationGroupsDbStructure = {
  tableName: tableName.ROTATION_GROUPS,
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
      comment: 'Rotation Group ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_rotation_group_guid',
        msg: 'Rotation Group GUID must be unique.',
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
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
        notEmpty: true,
      },
      comment: 'Rotation Group name',
    },
    cycle_length: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Number of cycles in the rotation',
    },
    cycle_unit: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: [['day', 'week']],
      },
      comment: 'Unit of the cycle: day or week',
    },
    cycle_templates: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Ordered array of session_template IDs',
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
      },
      comment: 'Start date of the rotation cycle',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'Rotation Group status',
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'Soft delete timestamp',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.ROTATION_GROUPS,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Rotation Groups table for managing shift rotations',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_rotation_groups_guid',
      },
      {
        fields: ['tenant'],
        name: 'idx_rotation_groups_tenant',
      },
      {
        fields: ['name'],
        name: 'idx_rotation_groups_name',
      },
      {
        fields: ['start_date'],
        name: 'idx_rotation_groups_start_date',
      },
      {
        fields: ['active'],
        name: 'idx_rotation_groups_active',
      },
      {
        fields: ['deleted_at'],
        name: 'idx_rotation_groups_deleted_at',
      },
    ],
  } as ModelOptions,
};
