import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

// ==========================================
// SCHEDULE ASSIGNMENTS LOGS
// ==========================================
export const ScheduleAssignmentsLogsDbStructure = {
  tableName: tableName.SCHEDULE_ASSIGNMENTS_LOGS,
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
      comment: 'Schedule Assignments Log ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_schedule_assignments_logs_guid',
        msg: 'Schedule Assignments Log GUID must be unique.',
      },
      validate: {
        len: [1, 255],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    assignment: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.SCHEDULE_ASSIGNMENTS,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'Reference to the schedule assignment',
    },
    // Snapshots des templates
    previous_template: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Previous template snapshot (null for creation)',
    },
    new_template: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'New template snapshot',
    },
    // Versioning
    previous_version: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Previous version number (null for creation)',
    },
    new_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'New version number',
    },
    // Auditabilité
    modified_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'User who made the modification',
    },
    old_creator: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'User who made the assignation',
    },
    modification_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for the modification',
    },
    // Métadonnées techniques (optionnel)
    changed_fields: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'JSON diff of changed fields (optional)',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true,
      },
      comment: 'Timestamp of the log entry',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.SCHEDULE_ASSIGNMENTS_LOGS,
    timestamps: false, // Pas besoin de updated_at pour une table de logs
    underscored: true,
    freezeTableName: true,
    comment: 'Audit log for schedule assignments modifications',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_schedule_assignments_logs_guid',
      },
      {
        fields: ['assignment'],
        name: 'idx_schedule_assignments_logs_assignment',
      },
      {
        fields: ['modified_by'],
        name: 'idx_schedule_assignments_logs_modified_by',
      },
      {
        fields: ['old_creator'],
        name: 'idx_schedule_assignments_logs_old_creator',
      },
      // {
      //   fields: ['modification_type'],
      //   name: 'idx_schedule_assignments_logs_modification_type',
      // },
      {
        fields: ['created_at'],
        name: 'idx_schedule_assignments_logs_created_at',
      },
      // Index composite pour récupérer l'historique d'un assignment
      {
        fields: ['assignment', 'created_at'],
        name: 'idx_schedule_assignments_logs_assignment_timeline',
      },
      // Index GIN pour recherche dans les templates JSONB
      {
        fields: ['previous_template'],
        name: 'idx_schedule_assignments_logs_previous_template',
        using: 'GIN',
      },
      {
        fields: ['new_template'],
        name: 'idx_schedule_assignments_logs_new_template',
        using: 'GIN',
      },
      {
        fields: ['changed_fields'],
        name: 'idx_schedule_assignments_logs_changed_fields',
        using: 'GIN',
      },
    ],
  } as ModelOptions,
};
