import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

/**
 * Configuration générale du moteur de suggestion.
 *
 * Une seule configuration peut être active à la fois dans la base du tenant.
 * La table ne contient pas de colonne tenant : chaque tenant possède sa propre DB.
 */
export const PlanningSuggestionConfigDbStructure = {
  tableName: tableName.PLANNING_SUGGESTION_CONFIG,
  attributes: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      validate: { isInt: true, min: 1, max: 2147483647 },
      comment: 'Internal primary key',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_planning_suggestion_config_guid',
        msg: 'Planning suggestion config GUID must be unique.',
      },
      validate: { len: [1, 255] },
      comment: 'Public identifier',
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: { len: [1, 128], notEmpty: true },
      comment: 'Configuration name',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { isInt: true, min: 1 },
      comment: 'Configuration version',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: { isBoolean: true },
      comment: 'Only one configuration may be active',
    },
    min_rest_days_per_week: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { isInt: true, min: 0, max: 7 },
      comment: 'Minimum weekly rest days',
    },
    max_consecutive_work_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 6,
      validate: { isInt: true, min: 1, max: 31 },
      comment: 'Maximum consecutive worked days',
    },
    max_weekly_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { isInt: true, min: 1, max: 10080 },
      comment: 'Maximum planned minutes per rolling week',
    },
    min_rest_minutes_between_shifts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 660,
      validate: { isInt: true, min: 0, max: 2880 },
      comment: 'Minimum rest time between two services',
    },
    max_consecutive_guards: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { isInt: true, min: 0, max: 31 },
      comment: 'Maximum consecutive guard services',
    },
    rest_after_guard_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: { isBoolean: true },
      comment: 'Enable full rest days after the guard continuation',
    },
    post_guard_rest_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { isInt: true, min: 0, max: 31 },
      comment: 'Full calendar rest days after the guard continuation day',
    },
    max_resting_employees_per_day: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { isInt: true, min: 1 },
      comment: 'Optional maximum number of included employees resting on one date',
    },
    fairness_window_weeks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 8,
      validate: { isInt: true, min: 1, max: 52 },
      comment: 'Historical window used only for fairness counters',
    },
    strict_coverage: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: { isBoolean: true },
      comment: 'Fail generation when minimum coverage cannot be satisfied',
    },
    solver_type: {
      type: DataTypes.ENUM('GREEDY', 'ORTOOLS'),
      allowNull: false,
      defaultValue: 'GREEDY',
      comment: 'Planning solver requested by this configuration',
    },
    solver_timeout_seconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      validate: {
        isInt: true,
        min: 1,
        max: 300,
      },
      comment: 'Maximum OR-Tools HTTP solve duration',
    },
    fallback_to_greedy: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: { isBoolean: true },
      comment: 'Use GREEDY only when OR-Tools has a technical failure',
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: { isInt: true, min: 1 },
      comment: 'Manager who created the configuration',
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Soft-delete timestamp',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.PLANNING_SUGGESTION_CONFIG,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    underscored: true,
    freezeTableName: true,
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_planning_suggestion_config_guid',
      },
      {
        fields: ['active'],
        name: 'idx_planning_suggestion_config_active',
      },
      {
        unique: true,
        fields: ['active'],
        name: 'unique_active_planning_suggestion_config',
        where: { active: true, deleted_at: null },
      },
    ],
  } as ModelOptions,
};
