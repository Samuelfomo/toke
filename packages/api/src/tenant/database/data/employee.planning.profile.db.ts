import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

/**
 * Façon dont un employé participe au moteur.
 *
 * FIXED    : le moteur conserve son template fixe.
 * ROTATING : le moteur peut l'affecter aux besoins configurés.
 * EXCLUDED : l'employé n'entre pas dans la génération.
 */
export const EmployeePlanningProfileDbStructure = {
  tableName: tableName.EMPLOYEE_PLANNING_PROFILE,
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
        name: 'unique_employee_planning_profile_guid',
        msg: 'Employee planning profile GUID must be unique.',
      },
      validate: { len: [1, 255] },
      comment: 'Public identifier',
    },
    user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: { isInt: true, min: 1 },
      comment: 'Employee',
    },
    planning_mode: {
      type: DataTypes.ENUM('FIXED', 'ROTATING', 'EXCLUDED'),
      allowNull: false,
      defaultValue: 'ROTATING',
      comment: 'Participation mode in automatic planning',
    },
    fixed_session_template: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.SESSION_TEMPLATES,
        key: 'id',
      },
      validate: { isInt: true, min: 1 },
      comment: 'Required for FIXED employees',
    },
    fixed_rest_day_mode: {
      type: DataTypes.ENUM('TEMPLATE', 'ROTATING'),
      allowNull: false,
      defaultValue: 'TEMPLATE',
      comment:
        'TEMPLATE keeps template rest days; ROTATING lets the solver choose weekly rest while keeping the fixed shift',
    },
    rotation_order: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { isInt: true, min: 0 },
      comment: 'Stable tie-breaker for rotating employees',
    },
    max_weekly_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { isInt: true, min: 1, max: 10080 },
      comment: 'Optional employee override',
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
    tableName: tableName.EMPLOYEE_PLANNING_PROFILE,
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
        name: 'idx_employee_planning_profile_guid',
      },
      {
        fields: ['planning_mode', 'active'],
        name: 'idx_employee_planning_profile_mode_active',
      },
      {
        unique: true,
        fields: ['user'],
        name: 'unique_active_employee_planning_profile',
        where: { active: true, deleted_at: null },
      },
    ],
    validate: {
      fixedModeRequiresTemplate() {
        if (this.planning_mode === 'FIXED' && !this.fixed_session_template) {
          throw new Error('fixed_session_template is required when planning_mode is FIXED');
        }

        if (this.planning_mode !== 'FIXED' && this.fixed_session_template) {
          throw new Error('fixed_session_template is only allowed when planning_mode is FIXED');
        }

        if (this.planning_mode !== 'FIXED' && this.fixed_rest_day_mode !== 'TEMPLATE') {
          throw new Error(
            'fixed_rest_day_mode ROTATING is only allowed when planning_mode is FIXED',
          );
        }
      },
    },
  } as ModelOptions,
};
