import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

/**
 * Besoin de couverture hebdomadaire du moteur.
 *
 * Une garde est représentée sans modifier SessionTemplate :
 * - session_template : début de garde, par exemple 16:00–23:59 ;
 * - continuation_template : fin de garde, par exemple 00:00–08:00 ;
 * - continuation_day_offset : toujours 1 pour une garde.
 */
export const PlanningSuggestionRequirementDbStructure = {
  tableName: tableName.PLANNING_SUGGESTION_REQUIREMENT,
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
        name: 'unique_planning_suggestion_requirement_guid',
        msg: 'Planning suggestion requirement GUID must be unique.',
      },
      validate: { len: [1, 255] },
      comment: 'Public identifier',
    },
    config: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.PLANNING_SUGGESTION_CONFIG,
        key: 'id',
      },
      validate: { isInt: true, min: 1 },
      comment: 'FK to planning suggestion configuration',
    },
    session_template: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.SESSION_TEMPLATES,
        key: 'id',
      },
      validate: { isInt: true, min: 1 },
      comment: 'Main template assigned on the requirement date',
    },
    continuation_template: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.SESSION_TEMPLATES,
        key: 'id',
      },
      validate: { isInt: true, min: 1 },
      comment: 'Template automatically assigned on the next day for a guard',
    },
    continuation_day_offset: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true,
        isIn: [[0, 1]],
      },
      comment: '0 for STANDARD; exactly 1 for GUARD',
    },
    day_of_week: {
      type: DataTypes.ENUM('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'),
      allowNull: false,
      comment: 'Recurring weekday',
    },
    service_type: {
      type: DataTypes.ENUM('STANDARD', 'GUARD'),
      allowNull: false,
      defaultValue: 'STANDARD',
      comment: 'Controls standard or two-part guard behavior',
    },
    allocation_mode: {
      type: DataTypes.ENUM('EXACT', 'RANGE', 'FILL_REMAINING'),
      allowNull: false,
      defaultValue: 'RANGE',
      comment:
        'EXACT: strict count; RANGE: fill to target; FILL_REMAINING: assign every remaining eligible rotating employee',
    },
    min_employees: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { isInt: true, min: 0 },
      comment: 'Hard minimum coverage',
    },
    target_employees: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { isInt: true, min: 0 },
      comment: 'Desired coverage',
    },
    max_employees: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { isInt: true, min: 0 },
      comment: 'Optional hard maximum coverage',
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      validate: { isInt: true, min: 1, max: 1000 },
      comment: 'Smaller value means the slot is filled first',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: { isBoolean: true },
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Soft-delete timestamp',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.PLANNING_SUGGESTION_REQUIREMENT,
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
        name: 'idx_planning_suggestion_requirement_guid',
      },
      {
        fields: ['config', 'day_of_week'],
        name: 'idx_planning_suggestion_requirement_config_day',
      },
      {
        fields: ['session_template'],
        name: 'idx_planning_suggestion_requirement_template',
      },
      {
        fields: ['continuation_template'],
        name: 'idx_planning_suggestion_requirement_continuation_template',
      },
      {
        unique: true,
        fields: ['config', 'day_of_week', 'session_template'],
        name: 'unique_active_requirement_slot',
        where: { active: true, deleted_at: null },
      },
      {
        unique: true,
        fields: ['config', 'day_of_week'],
        name: 'unique_active_fill_remaining_requirement',
        where: {
          active: true,
          deleted_at: null,
          allocation_mode: 'FILL_REMAINING',
        },
      },
    ],
    validate: {
      employeeCountsAreValid() {
        const min = Number(this.min_employees);
        const target = Number(this.target_employees);
        const max =
          this.max_employees === null || this.max_employees === undefined
            ? null
            : Number(this.max_employees);

        if (target < min) {
          throw new Error('target_employees must be greater than or equal to min_employees');
        }

        if (max !== null && max < target) {
          throw new Error('max_employees must be greater than or equal to target_employees');
        }
      },

      allocationConfigurationIsValid() {
        const mode = this.allocation_mode ?? 'RANGE';
        const min = Number(this.min_employees);
        const target = Number(this.target_employees);
        const max =
          this.max_employees === null || this.max_employees === undefined
            ? null
            : Number(this.max_employees);

        if (mode === 'EXACT') {
          if (max === null) {
            throw new Error('max_employees is required for an EXACT requirement');
          }

          if (!(min === target && target === max)) {
            throw new Error(
              'EXACT requires min_employees, target_employees and max_employees to be equal',
            );
          }
        }

        if (mode === 'FILL_REMAINING' && this.service_type !== 'STANDARD') {
          throw new Error('FILL_REMAINING is only allowed for a STANDARD requirement');
        }
      },

      continuationConfigurationIsValid() {
        if (this.service_type === 'GUARD') {
          if (!this.continuation_template) {
            throw new Error('continuation_template is required for a GUARD requirement');
          }

          if (Number(this.continuation_day_offset) !== 1) {
            throw new Error('continuation_day_offset must be 1 for a GUARD requirement');
          }

          return;
        }

        if (this.continuation_template !== null && this.continuation_template !== undefined) {
          throw new Error('continuation_template is only allowed for a GUARD requirement');
        }

        if (Number(this.continuation_day_offset) !== 0) {
          throw new Error('continuation_day_offset must be 0 for a STANDARD requirement');
        }
      },
    },
  } as ModelOptions,
};
