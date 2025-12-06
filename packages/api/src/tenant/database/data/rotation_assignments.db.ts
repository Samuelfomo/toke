import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

// ==========================================
// ROTATION ASSIGNMENTS
// ==========================================
export const RotationAssignmentsDbStructure = {
  tableName: tableName.ROTATION_ASSIGNMENTS,
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
      comment: 'Rotation Assignment ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_rotation_assignment_guid',
        msg: 'Rotation Assignment GUID must be unique.',
      },
      validate: {
        len: [1, 255],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'Reference to user',
    },
    rotation_group: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.ROTATION_GROUPS,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'Reference to rotation group',
    },
    offset: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0,
      },
      comment: 'Offset in the rotation cycle for this user',
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true,
      },
      comment: 'Date of assignment',
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
    tableName: tableName.ROTATION_ASSIGNMENTS,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Rotation Assignments table linking users to rotation groups',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_rotation_assignments_guid',
      },
      {
        fields: ['user'],
        name: 'idx_rotation_assignments_user',
      },
      {
        fields: ['rotation_group'],
        name: 'idx_rotation_assignments_rotation_group',
      },
      {
        fields: ['assigned_at'],
        name: 'idx_rotation_assignments_assigned_at',
      },
      {
        fields: ['deleted_at'],
        name: 'idx_rotation_assignments_deleted_at',
      },
      {
        unique: true,
        fields: ['user', 'rotation_group'],
        name: 'unique_user_rotation',
        where: {
          deleted_at: null,
        },
      },
    ],
  } as ModelOptions,
};
