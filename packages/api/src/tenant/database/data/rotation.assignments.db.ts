import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';
import { RAFamily } from '@toke/shared';

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
    family: {
      type: DataTypes.ENUM(...Object.values(RAFamily)),
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(RAFamily)],
          msg: 'Rotation assignments family must be one of: user, group',
        },
      },
      comment: 'Type of assignment target: user or group',
    },
    related: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { len: [1, 255], notEmpty: true },
      comment: 'GUID of the related user or group (no FK)',
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
      comment: 'Reference to rotation group to apply',
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
    assigned_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'User ID who assign the rotation',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'Rotation status',
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
    last_advanced_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment:
        'Date (YYYY-MM-DD) of the last cron-triggered offset advancement. ' +
        'Used as idempotency guard: if the cron runs twice in the same day ' +
        '(e.g. after a PM2 restart), the second run is skipped.',
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
      { fields: ['family'], name: 'idx_rotation_assignments_family' },
      { fields: ['related'], name: 'idx_rotation_assignments_related' },
      { fields: ['family', 'related'], name: 'idx_rotation_assignments_family_related' },
      {
        fields: ['rotation_group'],
        name: 'idx_rotation_assignments_rotation_group',
      },
      {
        fields: ['assigned_by'],
        name: 'idx_rotation_assignments_assigned_by',
      },
      {
        fields: ['active'],
        name: 'idx_rotation_assignments_active',
      },
      {
        fields: ['assigned_at'],
        name: 'idx_rotation_assignments_assigned_at',
      },
      {
        fields: ['last_advanced_date'],
        name: 'idx_rotation_assignments_last_advanced_date',
      },
      {
        fields: ['deleted_at'],
        name: 'idx_rotation_assignments_deleted_at',
      },
      {
        unique: true,
        fields: ['family', 'related', 'rotation_group'],
        name: 'unique_related_rotation_group',
        where: { deleted_at: null },
      },
    ],
    validate: {
      // dateNotTooFarInPast() {
      //   if (this.assigned_at) {
      //     const now = TimezoneConfigUtils.getCurrentTime();
      //     const limit = new Date(now.getTime() - 5 * 60 * 1000); // -5 minutes
      //
      //     const assignedAtDate =
      //       this.assigned_at instanceof Date
      //         ? this.assigned_at
      //         : new Date(this.assigned_at as string);
      //
      //     console.log('assignedAt', assignedAtDate, this.assigned_at);
      //
      //     if (assignedAtDate < limit) {
      //       throw new Error('assigned_at is too far in the past');
      //     }
      //   }
      // },
      // dateNotInPast() {
      //   if (this.assigned_at && this.assigned_at < TimezoneConfigUtils.getCurrentTime()) {
      //     throw new Error('assigned_at cannot be in the past');
      //   }
      // },
    },
  } as ModelOptions,
};
