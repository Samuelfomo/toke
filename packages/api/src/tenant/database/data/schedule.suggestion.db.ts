import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

// ─────────────────────────────────────────────────────────────────────────────
// ScheduleSuggestion — en-tête d'une session de suggestion
// ─────────────────────────────────────────────────────────────────────────────

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
      comment: 'Tenant identifier',
    },
    manager: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { isInt: true, min: 1 },
      comment: 'Internal FK → users.id of the manager who triggered generation',
    },
    period_from: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Start of the suggested planning period (YYYY-MM-DD)',
    },
    period_to: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'End of the suggested planning period (YYYY-MM-DD)',
    },
    history_weeks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 8,
      validate: { isInt: true, min: 1, max: 52 },
      comment: 'Number of historical weeks used to generate the suggestion',
    },
    conformity_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: { min: 0, max: 100 },
      comment: 'Global conformity score (0–100) computed at generation time',
    },
    status: {
      type: DataTypes.ENUM('draft', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Lifecycle status of the suggestion',
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when the manager approved the suggestion',
    },
    rejected_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when the manager rejected the suggestion',
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Soft-delete timestamp',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.SCHEDULE_SUGGESTION,
    timestamps: true,
    underscored: true,
    paranoid: false,
  } as ModelOptions,
};
