import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

// ==========================================
// ROTATION ASSIGNMENT LOGS
// ==========================================
export const RotationAssignmentLogsDbStructure = {
  tableName: tableName.ROTATION_ASSIGNMENT_LOGS,
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
      comment: 'Rotation Assignment Log ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_rotation_assignment_log_guid',
        msg: 'Rotation Assignment Log GUID must be unique.',
      },
      validate: {
        len: [1, 255],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    rotation_assignment: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.ROTATION_ASSIGNMENTS,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'Reference to the rotation assignment',
    },
    previous_offset: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 0,
      },
      comment: 'Offset value before the cron rotation',
    },
    new_offset: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 0,
      },
      comment: 'Offset value after the cron rotation',
    },
    cycle_length: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Snapshot of the cycle_length used for this rotation tick',
    },
    executed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true,
      },
      comment: 'Timestamp when the cron executed this rotation',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.ROTATION_ASSIGNMENT_LOGS,
    timestamps: false, // Immutable audit log — no updated_at needed
    underscored: true,
    freezeTableName: true,
    comment: 'Audit log for automatic rotation offset changes triggered by the cron job',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_rotation_assignment_logs_guid',
      },
      {
        fields: ['rotation_assignment'],
        name: 'idx_rotation_assignment_logs_assignment',
      },
      {
        fields: ['executed_at'],
        name: 'idx_rotation_assignment_logs_executed_at',
      },
      {
        // Composite: fetch full timeline for a given assignment efficiently
        fields: ['rotation_assignment', 'executed_at'],
        name: 'idx_rotation_assignment_logs_assignment_timeline',
      },
    ],
  } as ModelOptions,
};
