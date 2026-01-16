import { DataTypes, ModelAttributes, ModelOptions, Op } from 'sequelize';

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
      comment: 'Reference to user (nullable for groups Assignments)',
    },
    groups: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.GROUPS,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'Reference to groups (nullable for user Assignments)',
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
      allowNull: true,
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
      {
        fields: ['user'],
        name: 'idx_schedule_assignments_user',
      },
      {
        fields: ['groups'],
        name: 'idx_schedule_assignments_groups',
      },
      {
        fields: ['session_template'],
        name: 'idx_schedule_assignments_session_template',
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

      // ✅ NOUVELLE CONTRAINTE : UNE SEULE assignment active par user
      {
        unique: true,
        fields: ['user'],
        name: 'unique_user_active_assignments',
        where: {
          deleted_at: null,
          active: true,
          user: { [Op.not]: null },
        },
      },
      // ✅ NOUVELLE CONTRAINTE : UNE SEULE assignments active par groups
      {
        unique: true,
        fields: ['groups'],
        name: 'unique_groups_active_assignments',
        where: {
          deleted_at: null,
          active: true,
          groups: { [Op.not]: null },
        },
      },
      // {
      //   unique: true,
      //   fields: ['user', 'session_template', 'start_date', 'end_date'],
      //   name: 'unique_user_schedule_assignments',
      //   where: {
      //     deleted_at: null,
      //   },
      // },
      // {
      //   unique: true,
      //   fields: ['groups', 'session_template', 'start_date', 'end_date'],
      //   name: 'unique_groups_schedule_assignments',
      //   where: {
      //     deleted_at: null,
      //   },
      // },
    ],
    validate: {
      eitherUserOrGroups() {
        if (!this.user && !this.groups) {
          throw new Error('Either user or groups must be specified');
        }
        if (this.user && this.groups) {
          throw new Error('Only one of user or groups must be specified, not both');
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
