import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const ScheduleSuggestionDbStructure = {
  tableName: tableName.SCHEDULE_SUGGESTION,
  attributes: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      validate: { isInt: true, min: 1, max: 2147483647 },
      comment: 'Internal PK ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_schedule_suggestion_guid',
        msg: 'ScheduleSuggestion GUID must be unique.',
      },
      validate: { len: [1, 255] },
      comment: 'Public identifier',
    },
    tenant: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { len: [1, 255] },
      comment: 'Preventive tenant reference; database is already tenant-isolated',
    },
    manager: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: { isInt: true, min: 1 },
      comment: 'Manager who triggered generation',
    },
    config: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.PLANNING_SUGGESTION_CONFIG,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Configuration used by the V2 engine',
    },
    engine_version: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'historical-v1.5',
      comment: 'Generation engine version',
    },
    period_from: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Start of the suggested planning period',
    },
    period_to: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'End of the suggested planning period',
    },
    history_weeks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 8,
      validate: { isInt: true, min: 1, max: 52 },
      comment: 'Fairness history window; no longer used to infer coverage',
    },
    conformity_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: { min: 0, max: 100 },
      comment: 'V2 planning quality score kept under the legacy field name',
    },
    diagnostics: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Coverage, fairness and non-blocking warnings returned by the engine',
    },
    status: {
      type: DataTypes.ENUM('draft', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'draft',
      // comment: 'Lifecycle status of the suggestion',
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejected_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.SCHEDULE_SUGGESTION,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    paranoid: false,
    freezeTableName: true,
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_schedule_suggestion_guid',
      },
      {
        fields: ['manager', 'status'],
        name: 'idx_schedule_suggestion_manager_status',
      },
      {
        fields: ['config'],
        name: 'idx_schedule_suggestion_config',
      },
      {
        fields: ['period_from', 'period_to'],
        name: 'idx_schedule_suggestion_period',
      },
      {
        unique: true,
        fields: ['manager', 'period_from', 'period_to'],
        name: 'unique_manager_draft_suggestion_period',
        where: {
          status: 'draft',
          deleted_at: null,
        },
      },
    ],
    validate: {
      dateRangeValid() {
        if (this.period_from && this.period_to && this.period_from > this.period_to) {
          throw new Error('period_from must be before or equal to period_to');
        }
      },
    },
  } as ModelOptions,
};
