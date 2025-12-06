import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

// ==========================================
// SCHEDULE EXCEPTIONS
// ==========================================
export const ScheduleExceptionsDbStructure = {
  tableName: tableName.SCHEDULE_EXCEPTIONS,
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
      comment: 'Schedule Exception ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_schedule_exception_guid',
        msg: 'Schedule Exception GUID must be unique.',
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
    user: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'Reference to user (nullable for group exceptions)',
    },
    group: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.ROTATION_GROUPS,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'Reference to group (nullable for user exceptions)',
    },
    session_template: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.SESSION_TEMPLATES,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'Reference to session template to apply',
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
      },
      comment: 'Start date of the exception',
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
      },
      comment: 'End date of the exception',
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'User ID who created the exception',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for the exception',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'Exception status',
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
    tableName: tableName.SCHEDULE_EXCEPTIONS,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Schedule Exceptions table for temporary schedule overrides',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_schedule_exceptions_guid',
      },
      {
        fields: ['tenant'],
        name: 'idx_schedule_exceptions_tenant',
      },
      {
        fields: ['user'],
        name: 'idx_schedule_exceptions_user',
      },
      {
        fields: ['group'],
        name: 'idx_schedule_exceptions_group',
      },
      {
        fields: ['session_template'],
        name: 'idx_schedule_exceptions_session_template',
      },
      {
        fields: ['start_date'],
        name: 'idx_schedule_exceptions_start_date',
      },
      {
        fields: ['end_date'],
        name: 'idx_schedule_exceptions_end_date',
      },
      {
        fields: ['created_by'],
        name: 'idx_schedule_exceptions_created_by',
      },
      {
        fields: ['active'],
        name: 'idx_schedule_exceptions_active',
      },
      {
        fields: ['deleted_at'],
        name: 'idx_schedule_exceptions_deleted_at',
      },
      {
        fields: ['start_date', 'end_date'],
        name: 'idx_schedule_exceptions_date_range',
      },
    ],
    validate: {
      eitherUserOrGroup() {
        if (!this.user && !this.group) {
          throw new Error('Either user or group must be specified');
        }
      },
      dateRangeValid() {
        if (this.start_date && this.end_date && this.start_date > this.end_date) {
          throw new Error('start_date must be before or equal to end_date');
        }
      },
    },
  } as ModelOptions,
};
