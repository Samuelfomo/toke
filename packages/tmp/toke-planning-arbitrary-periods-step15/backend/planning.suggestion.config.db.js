"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningSuggestionConfigDbStructure = void 0;
const sequelize_1 = require("sequelize");
const response_model_js_1 = require("../../../utils/response.model.js");
/**
 * Configuration générale du moteur de suggestion.
 *
 * Une seule configuration peut être active à la fois dans la base du tenant.
 * La table ne contient pas de colonne tenant : chaque tenant possède sa propre DB.
 */
exports.PlanningSuggestionConfigDbStructure = {
    tableName: response_model_js_1.tableName.PLANNING_SUGGESTION_CONFIG,
    attributes: {
        id: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            validate: { isInt: true, min: 1, max: 2147483647 },
            comment: 'Internal primary key',
        },
        guid: {
            type: sequelize_1.DataTypes.STRING(255),
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            unique: {
                name: 'unique_planning_suggestion_config_guid',
                msg: 'Planning suggestion config GUID must be unique.',
            },
            validate: { len: [1, 255] },
            comment: 'Public identifier',
        },
        name: {
            type: sequelize_1.DataTypes.STRING(128),
            allowNull: false,
            validate: { len: [1, 128], notEmpty: true },
            comment: 'Configuration name',
        },
        version: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { isInt: true, min: 1 },
            comment: 'Configuration version',
        },
        active: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            validate: { isBoolean: true },
            comment: 'Only one configuration may be active',
        },
        min_rest_days_per_week: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { isInt: true, min: 0, max: 7 },
            comment: 'Minimum weekly rest days',
        },
        max_consecutive_work_days: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 6,
            validate: { isInt: true, min: 1, max: 366 },
            comment: 'Optional maximum consecutive worked days; null disables the rule',
        },
        max_weekly_minutes: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: true,
            validate: { isInt: true, min: 1, max: 10080 },
            comment: 'Maximum planned minutes per rolling week',
        },
        min_rest_minutes_between_shifts: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 660,
            validate: { isInt: true, min: 0, max: 2880 },
            comment: 'Minimum rest time between two services',
        },
        max_consecutive_guards: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { isInt: true, min: 0, max: 31 },
            comment: 'Maximum consecutive guard services',
        },
        rest_after_guard_required: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            validate: { isBoolean: true },
            comment: 'Enable full rest days after the guard continuation',
        },
        post_guard_rest_days: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: { isInt: true, min: 0, max: 31 },
            comment: 'Full calendar rest days after the guard continuation day',
        },
        max_resting_employees_per_day: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: true,
            validate: { isInt: true, min: 1 },
            comment: 'Optional maximum number of included employees resting on one date',
        },
        weekly_leave_mode: {
            type: sequelize_1.DataTypes.ENUM('NONE', 'PER_EMPLOYEE', 'TEAM_ROTATION', 'PER_ELIGIBLE_EMPLOYEE'),
            allowNull: false,
            defaultValue: 'PER_EMPLOYEE',
            comment: 'Weekly leave policy applied by the planning engine',
        },
        weekly_leave_employees_per_week: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { isInt: true, min: 1 },
            comment: 'Employees receiving team weekly leave in each eligible week',
        },
        weekly_leave_allowed_days: {
            type: sequelize_1.DataTypes.JSONB,
            allowNull: false,
            defaultValue: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            comment: 'Days on which a weekly leave policy may be placed',
        },
        weekly_leave_rotation_anchor_date: {
            type: sequelize_1.DataTypes.DATEONLY,
            allowNull: true,
            comment: 'Anchor date used with employee rotation_order',
        },
        weekly_leave_complete_weeks_only: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            validate: { isBoolean: true },
            comment: 'Do not allocate team leave to partial weeks',
        },
        post_guard_rest_counts_as_weekly_leave: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            validate: { isBoolean: true },
            comment: 'Allow post-guard recovery to satisfy the team weekly leave',
        },
        policy_schema_version: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 2,
            validate: { isInt: true, min: 2 },
        },
        weekly_leave_selector: {
            type: sequelize_1.DataTypes.JSONB,
            allowNull: false,
            defaultValue: { planning_modes: ['ROTATING'], guard_pool_relation: 'ANY' },
        },
        weekly_leave_days_per_employee: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { isInt: true, min: 1, max: 7 },
        },
        weekly_leave_count_mode: {
            type: sequelize_1.DataTypes.ENUM('MINIMUM', 'EXACT'),
            allowNull: false,
            defaultValue: 'EXACT',
        },
        weekly_leave_max_employees_per_day: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: true,
            validate: { isInt: true, min: 1 },
        },
        weekly_leave_require_work_on_other_days: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        weekly_leave_service_scope: {
            type: sequelize_1.DataTypes.JSONB,
            allowNull: false,
            defaultValue: {
                mode: 'ANY', service_types: [], template_guids: [], requirement_guids: [], exclusive: false,
            },
        },
        guard_team_mode: {
            type: sequelize_1.DataTypes.ENUM('DAILY_FLEXIBLE', 'WEEKLY_POOL'),
            allowNull: false,
            defaultValue: 'DAILY_FLEXIBLE',
            comment: 'Daily guard allocation or stable weekly guard pool',
        },
        guard_team_employees_per_week: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { isInt: true, min: 1 },
            comment: 'ROTATING employees selected in each weekly guard pool',
        },
        guard_team_selection_mode: {
            type: sequelize_1.DataTypes.ENUM('ROTATION_ORDER', 'OPTIMIZED'),
            allowNull: false,
            defaultValue: 'ROTATION_ORDER',
            comment: 'How weekly guard pool members are selected',
        },
        guard_team_rotation_anchor_date: {
            type: sequelize_1.DataTypes.DATEONLY,
            allowNull: true,
            comment: 'Anchor week for deterministic guard pool rotation',
        },
        guard_team_complete_weeks_only: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            validate: { isBoolean: true },
            comment: 'Apply weekly guard pool only to complete weeks',
        },
        guard_team_require_participation: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            validate: { isBoolean: true },
            comment: 'Every selected pool member must start at least one guard',
        },
        guard_team_eligible_planning_modes: {
            type: sequelize_1.DataTypes.JSONB,
            allowNull: false,
            defaultValue: ['ROTATING'],
        },
        guard_team_member_service_access: {
            type: sequelize_1.DataTypes.ENUM('ANY_SERVICE', 'GUARD_ONLY'),
            allowNull: false,
            defaultValue: 'ANY_SERVICE',
        },
        guard_team_balance_mode: {
            type: sequelize_1.DataTypes.ENUM('NONE', 'SOFT', 'STRICT'),
            allowNull: false,
            defaultValue: 'NONE',
        },
        guard_team_max_membership_spread: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: true,
            validate: { isInt: true, min: 0, max: 52 },
        },
        guard_team_max_consecutive_membership_weeks: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: true,
            validate: { isInt: true, min: 1, max: 52 },
        },
        fairness_window_weeks: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 8,
            validate: { isInt: true, min: 1, max: 52 },
            comment: 'Historical window used only for fairness counters',
        },
        strict_coverage: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            validate: { isBoolean: true },
            comment: 'Fail generation when minimum coverage cannot be satisfied',
        },
        solver_type: {
            type: sequelize_1.DataTypes.ENUM('GREEDY', 'ORTOOLS'),
            allowNull: false,
            defaultValue: 'GREEDY',
            comment: 'Planning solver requested by this configuration',
        },
        solver_timeout_seconds: {
            type: sequelize_1.DataTypes.INTEGER,
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
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            validate: { isBoolean: true },
            comment: 'Use GREEDY only when OR-Tools has a technical failure',
        },
        created_by: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: response_model_js_1.tableName.USERS,
                key: 'id',
            },
            validate: { isInt: true, min: 1 },
            comment: 'Manager who created the configuration',
        },
        deleted_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true,
            comment: 'Soft-delete timestamp',
        },
    },
    options: {
        tableName: response_model_js_1.tableName.PLANNING_SUGGESTION_CONFIG,
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
    },
};
