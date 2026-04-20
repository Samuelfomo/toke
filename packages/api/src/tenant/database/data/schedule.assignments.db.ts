import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';
import { SAFamily } from '@toke/shared';

import { tableName } from '../../../utils/response.model.js';

// ==========================================
// SCHEDULE ASSIGNMENTS
// ==========================================
export const ScheduleAssignmentsDbStructure = {
  tableName: tableName.SCHEDULE_ASSIGNMENTS,
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
      comment: 'Schedule Assignments ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_schedule_assignments_guid',
        msg: 'Schedule Assignments GUID must be unique.',
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
    family: {
      type: DataTypes.ENUM(...Object.values(SAFamily)),
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(SAFamily)],
          msg: 'Schedule assignments family must be one of: user, group',
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
    session_template: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Complete copy of session template (JSONB)',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Version number of the assignment (incremented on each modification)',
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
      },
      comment: 'Start date of the Assignments',
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'End date of the Assignments',
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'User ID who created the Assignments',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for the exception Assignments',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'Assignments status',
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
    tableName: tableName.SCHEDULE_ASSIGNMENTS,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Schedule Assignments table for temporary schedule overrides',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_schedule_assignments_guid',
      },
      {
        fields: ['tenant'],
        name: 'idx_schedule_assignments_tenant',
      },
      { fields: ['family'], name: 'idx_schedule_assignments_family' },
      { fields: ['related'], name: 'idx_schedule_assignments_related' },
      { fields: ['family', 'related'], name: 'idx_schedule_assignments_family_related' },
      {
        fields: ['session_template'],
        name: 'idx_schedule_assignments_session_template',
        using: 'GIN',
      },
      {
        fields: ['version'],
        name: 'idx_schedule_assignments_version',
      },
      {
        fields: ['start_date'],
        name: 'idx_schedule_assignments_start_date',
      },
      {
        fields: ['end_date'],
        name: 'idx_schedule_assignments_end_date',
      },
      {
        fields: ['created_by'],
        name: 'idx_schedule_assignments_created_by',
      },
      {
        fields: ['active'],
        name: 'idx_schedule_assignments_active',
      },
      {
        fields: ['deleted_at'],
        name: 'idx_schedule_assignments_deleted_at',
      },
      {
        fields: ['start_date', 'end_date'],
        name: 'idx_schedule_assignments_date_range',
      },

      // ✅ NOUVELLE CONTRAINTE : UNE SEULE assignment active par related pour une family
      {
        unique: true,
        fields: ['family', 'related'],
        name: 'unique_related_active_assignment',
        where: { deleted_at: null, active: true },
      },
    ],
    validate: {
      dateRangeValid() {
        if (this.start_date && this.end_date && this.start_date > this.end_date) {
          throw new Error('start_date must be before or equal to end_date');
        }
      },
    },
  } as ModelOptions,
};
