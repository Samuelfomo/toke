import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';
import { CycleUnit, Direction } from '@toke/shared';

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
      allowNull: true,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Computed duration of a full rotation cycle (informational only)',
    },
    cycle_unit: {
      type: DataTypes.ENUM(...Object.values(CycleUnit)),
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(CycleUnit)],
          msg: 'Rotation groups cycle unit must be one of: day, week',
        },
      },
      comment: 'Unit of the cycle: day or week',
    },
    direction: {
      type: DataTypes.ENUM(...Object.values(Direction)),
      allowNull: false,
      defaultValue: Direction.BACKWARD,
      validate: {
        isIn: {
          args: [Object.values(Direction)],
          msg: 'Rotation groups direction must be one of: forward, backward',
        },
      },
      comment: 'Direction of the rotation: forward or backward',
    },
    auto_advance: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Automatic advancement of the rotation',
    },
    rotation_step: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Number of time units before advancing the rotation (e.g. every 2 days)',
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
        fields: ['start_date'],
        name: 'idx_rotation_groups_start_date',
      },
      {
        fields: ['active'],
        name: 'idx_rotation_groups_active',
      },
      {
        fields: ['active', 'auto_advance', 'deleted_at'],
        name: 'idx_rotation_groups_cron_filter',
      },
      {
        fields: ['start_date', 'active'],
        name: 'idx_rotation_groups_start_active',
      },
      {
        fields: ['deleted_at'],
        name: 'idx_rotation_groups_deleted_at',
      },
    ],
  } as ModelOptions,
};
