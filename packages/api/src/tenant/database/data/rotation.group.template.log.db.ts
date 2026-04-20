import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

// ==========================================
// ROTATION GROUP TEMPLATE LOGS
// ==========================================
// Table d'audit immuable. Chaque ligne enregistre un changement de snapshot
// sur une entrée de RotationGroupTemplates (mise à jour manuelle du manager).
// Les modifications de l'offset par le cron sont tracées séparément dans
// RotationAssignmentLogs — ces deux tables ont des responsabilités distinctes.
// ==========================================
export const RotationGroupTemplateLogDbStructure = {
  tableName: tableName.ROTATION_GROUP_TEMPLATE_LOG,
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
      comment: 'Rotation Group Template Log ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_rg_template_log_guid',
        msg: 'Rotation Group Template Log GUID must be unique.',
      },
      validate: {
        len: [1, 255],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    rotation_group_template: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.ROTATION_GROUP_TEMPLATE,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'Reference to the RotationGroupTemplate entry that was modified',
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 0,
      },
      comment: 'Snapshot of the position at the time of the change (for history readability)',
    },
    previous_snapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Full template snapshot before the change (null on initial creation)',
    },
    new_snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Full template snapshot after the change',
    },
    previous_version: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Version number before the change (null on initial creation)',
    },
    new_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Version number after the change',
    },
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
      comment: 'User (manager) who triggered the update',
    },
    modification_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional reason provided by the manager for changing the template',
    },
    changed_fields: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Computed diff between previous_snapshot and new_snapshot',
    },
    executed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true,
      },
      comment: 'Timestamp when the modification was applied',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.ROTATION_GROUP_TEMPLATE_LOG,
    timestamps: false, // Immutable audit log — no updated_at
    underscored: true,
    freezeTableName: true,
    comment: 'Immutable audit log for manual template snapshot changes on RotationGroupTemplates',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_rg_template_logs_guid',
      },
      {
        fields: ['rotation_group_template'],
        name: 'idx_rg_template_logs_rgt',
      },
      {
        fields: ['modified_by'],
        name: 'idx_rg_template_logs_modified_by',
      },
      {
        fields: ['executed_at'],
        name: 'idx_rg_template_logs_executed_at',
      },
      {
        // Efficient timeline reconstruction per template slot
        fields: ['rotation_group_template', 'executed_at'],
        name: 'idx_rg_template_logs_rgt_timeline',
      },
      {
        fields: ['previous_snapshot'],
        name: 'idx_rg_template_logs_previous_snapshot',
        using: 'GIN',
      },
      {
        fields: ['new_snapshot'],
        name: 'idx_rg_template_logs_new_snapshot',
        using: 'GIN',
      },
      {
        fields: ['changed_fields'],
        name: 'idx_rg_template_logs_changed_fields',
        using: 'GIN',
      },
    ],
  } as ModelOptions,
};
