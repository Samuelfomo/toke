import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const ScheduleSuggestionItemDbStructure = {
  tableName: tableName.SCHEDULE_SUGGESTION_ITEM,
  attributes: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      validate: { isInt: true, min: 1, max: 2147483647 },
      comment: 'Internal PK — never exposed to client',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_schedule_suggestion_item_guid',
        msg: 'ScheduleSuggestionItem GUID must be unique.',
      },
      validate: { len: [1, 255] },
      comment: 'Public identifier',
    },
    suggestion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { isInt: true, min: 1 },
      comment: 'Internal FK → schedule_suggestions.id',
    },
    user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { isInt: true, min: 1 },
      comment: 'Internal FK → users.id of the targeted employee',
    },
    // JSONB : { Mon: templateGuid|null, Tue: templateGuid|null, ... }
    // null = repos/férié, templateGuid = template suggéré ce jour
    schedule: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Suggested schedule per day: { Mon: templateGuid|null, ... }',
      validate: {
        isValidSchedule(value: any) {
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error('schedule must be a valid JSON object');
          }
          //       const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          //       for (const day of Object.keys(value)) {
          //         if (!validDays.includes(day)) {
          //           throw new Error(`Invalid day key in schedule: ${day}`);
          //         }
          //         const v = value[day];
          //         if (v !== null && typeof v !== 'string') {
          //           throw new Error(`schedule.${day} must be a templateGuid (string) or null`);
          //         }
          //       }
          //     },
          //   },
          // },
          const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
          for (const key of Object.keys(value)) {
            if (!isoPattern.test(key) || isNaN(Date.parse(key))) {
              throw new Error(`Invalid date key in schedule: "${key}". Expected YYYY-MM-DD.`);
            }
            const v = value[key];
            if (v !== null && typeof v !== 'string') {
              throw new Error(`schedule["${key}"] must be a templateGuid (string) or null`);
            }
          }
        },
      },
    },
    // JSONB : { Mon: { templateName, confidence, factors[] }, ... }
    reasons: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Explanation per day: { Mon: { templateName, confidence, factors[] }, ... }',
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Soft-delete timestamp',
    },
  } as ModelAttributes,
  options: {
    timestamps: true,
    underscored: true,
    paranoid: false,
  } as ModelOptions,
};
