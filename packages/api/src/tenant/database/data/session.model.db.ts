import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const SessionModelDbStructure = {
  tableName: tableName.SESSION_MODEL,

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
      comment: 'Session Model ID',
    },

    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_session_model_guid',
        msg: 'Session Model GUID must be unique.',
      },
      validate: {
        len: [1, 255],
      },
      comment: 'Unique, automatically generated digital GUID',
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
        notEmpty: true,
      },
      comment: 'Session Model name',
    },

    workday: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Working days of the company — e.g. ["Mon","Tue","Wed","Thu","Fri"]',
      validate: {
        isValidWorkdays(value: any) {
          const valid = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          if (!Array.isArray(value) || value.length === 0) {
            throw new Error('workday must be a non-empty array');
          }
          for (const day of value) {
            if (!valid.includes(day)) {
              throw new Error(`Invalid workday value: ${day}`);
            }
          }
          if (new Set(value).size !== value.length) {
            throw new Error('workday must not contain duplicate days');
          }
        },
      },
    },

    max_working_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Maximum working time in minutes',
    },

    min_working_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Minimum working time in minutes',
    },

    normal_session_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Normal session time in minutes',
    },

    allowed_tolerance: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0,
      },
      comment: 'Allowed tolerance in minutes',
    },

    // 🔹 Pause
    pause_allowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Allows pausing the session',
    },
    pause_duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Pause time in minutes',
    },
    pause_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0,
      },
      comment: 'Number of pauses',
    },

    // 🔹 Rotation
    rotation_allowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Whether templates using this model can be used in rotation groups',
    },

    // 🔹 Extra
    extra_allowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Whether overtime is allowed',
    },
    extra_max: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0,
      },
      comment: 'Maximum overtime (minutes) — null if extra not allowed',
    },

    // 🔹 Leave
    early_leave_allowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'Whether early leave is allowed',
    },

    leave_eligibility_after_session: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 1,
      },
      comment:
        'Number of completed sessions required before leave is eligible — null if no restriction',
    },
    leave_is_optional: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'Whether leave remains optional once eligibility is reached',
    },

    // ─── Audit ────────────────────────────────────────────────────────────────

    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: tableName.USERS, key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      comment: 'User who created this model',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'Session Model status',
    },
  } as ModelAttributes,

  options: {
    tableName: tableName.SESSION_MODEL,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Session Model table for managing session models',

    indexes: [
      { fields: ['guid'], name: 'idx_session_model_guid' },
      { fields: ['pause_allowed'], name: 'idx_session_model_pause_allowed' },
      { fields: ['rotation_allowed'], name: 'idx_session_model_rotation_allowed' },
      { fields: ['early_leave_allowed'], name: 'idx_session_model_early_leave_allowed' },
    ],

    hooks: {
      beforeValidate(instance: any) {
        // min ≤ normal ≤ max
        if (instance.min_working_time && instance.max_working_time) {
          if (instance.min_working_time > instance.max_working_time) {
            throw new Error('min_working_time cannot exceed max_working_time');
          }
        }
        if (instance.normal_session_time && instance.max_working_time) {
          if (instance.normal_session_time > instance.max_working_time) {
            throw new Error('normal_session_time cannot exceed max_working_time');
          }
        }

        // Cohérence pause
        if (!instance.pause_allowed) {
          instance.pause_duration = null;
          instance.pause_count = 0;
        }

        // Cohérence extra
        if (!instance.extra_allowed) {
          instance.extra_max = null;
        }

        // Cohérence leave
        if (!instance.early_leave_allowed) {
          instance.leave_eligibility_after_session = null;
        }
      },
    },
  } as ModelOptions,
};
