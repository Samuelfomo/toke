import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';
import { DayOfWeek, VALID_DAYS } from '@toke/shared';

import { tableName } from '../../../utils/response.model.js';

export const SessionTemplatesDbStructure = {
  tableName: tableName.SESSION_TEMPLATES,
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
      comment: 'User ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_session_templates_guid',
        msg: 'Session templates GUID must be unique.',
      },
      validate: {
        len: [1, 255],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: {
        len: [1, 128],
        notEmpty: true,
      },
      comment: 'Session name',
    },
    definition: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Session definition with day-based work blocks',

      validate: {
        isValidDefinition(value: any) {
          // ✅ Must be an object
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error('definition must be a valid JSON object');
          }

          const validDays = VALID_DAYS;
          const definedDays = Object.keys(value) as DayOfWeek[];

          // Check for invalid day keys
          for (const day of definedDays) {
            if (!validDays.includes(day)) {
              throw new Error(`Invalid day key: ${day}. Must be one of: ${validDays.join(', ')}`);
            }
          }

          // ✅ Validate each day's value
          for (const [day, dayValue] of Object.entries(value)) {
            // 🔧 CORRECTION : Accepter null explicitement
            if (dayValue === null) {
              continue; // Jour férié → pas de validation supplémentaire
            }

            // 🔧 CORRECTION : Message d'erreur mis à jour
            if (!Array.isArray(dayValue)) {
              throw new Error(`${day} must be null (holiday) or an array of work blocks`);
            }

            const blocks = dayValue;

            // Validate each block (code existant inchangé)
            for (let i = 0; i < blocks.length; i++) {
              const block = blocks[i] as any;

              // Block must be an object
              if (typeof block !== 'object' || block === null) {
                throw new Error(`${day}[${i}]: Each block must be an object`);
              }

              // Required field: work (array of 2 time strings)
              if (!block.work || !Array.isArray(block.work) || block.work.length !== 2) {
                throw new Error(
                  `${day}[${i}]: 'work' must be an array of 2 time strings [start, end]`,
                );
              }

              // Validate work times format (HH:MM)
              const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
              if (!timeRegex.test(block.work[0]) || !timeRegex.test(block.work[1])) {
                throw new Error(
                  `${day}[${i}]: work times must be in HH:MM format (e.g., "08:00", "18:00")`,
                );
              }

              // work[0] must be before work[1]
              const [startHour, startMin] = block.work[0].split(':').map(Number);
              const [endHour, endMin] = block.work[1].split(':').map(Number);
              const startMinutes = startHour * 60 + startMin;
              const endMinutes = endHour * 60 + endMin;

              if (startMinutes >= endMinutes) {
                throw new Error(`${day}[${i}]: work start time must be before end time`);
              }

              // Optional field: pause (null or array of 2 time strings)
              if (block.pause !== null && block.pause !== undefined) {
                if (!Array.isArray(block.pause) || block.pause.length !== 2) {
                  throw new Error(
                    `${day}[${i}]: 'pause' must be null or an array of 2 time strings [start, end]`,
                  );
                }

                // Validate pause times format
                if (!timeRegex.test(block.pause[0]) || !timeRegex.test(block.pause[1])) {
                  throw new Error(`${day}[${i}]: pause times must be in HH:MM format`);
                }

                // pause[0] must be before pause[1]
                const [pauseStartHour, pauseStartMin] = block.pause[0].split(':').map(Number);
                const [pauseEndHour, pauseEndMin] = block.pause[1].split(':').map(Number);
                const pauseStartMinutes = pauseStartHour * 60 + pauseStartMin;
                const pauseEndMinutes = pauseEndHour * 60 + pauseEndMin;

                if (pauseStartMinutes >= pauseEndMinutes) {
                  throw new Error(`${day}[${i}]: pause start time must be before end time`);
                }

                // Pause must be within work block
                if (pauseStartMinutes < startMinutes || pauseEndMinutes > endMinutes) {
                  throw new Error(`${day}[${i}]: pause must be within work block time range`);
                }
              }

              // Required field: tolerance (positive integer in minutes)
              if (
                typeof block.tolerance !== 'number' ||
                block.tolerance < 0 ||
                !Number.isInteger(block.tolerance)
              ) {
                throw new Error(`${day}[${i}]: 'tolerance' must be a positive integer (minutes)`);
              }

              // Reasonable tolerance limit (e.g., max 120 minutes = 2 hours)
              if (block.tolerance > 120) {
                throw new Error(`${day}[${i}]: tolerance cannot exceed 120 minutes`);
              }
            }

            // ✅ Check for overlapping blocks (uniquement si blocks.length > 0)
            if (blocks.length > 1) {
              for (let i = 0; i < blocks.length; i++) {
                for (let j = i + 1; j < blocks.length; j++) {
                  const block1 = blocks[i] as any;
                  const block2 = blocks[j] as any;

                  const [start1Hour, start1Min] = block1.work[0].split(':').map(Number);
                  const [end1Hour, end1Min] = block1.work[1].split(':').map(Number);
                  const [start2Hour, start2Min] = block2.work[0].split(':').map(Number);
                  const [end2Hour, end2Min] = block2.work[1].split(':').map(Number);

                  const start1 = start1Hour * 60 + start1Min;
                  const end1 = end1Hour * 60 + end1Min;
                  const start2 = start2Hour * 60 + start2Min;
                  const end2 = end2Hour * 60 + end2Min;

                  // Check for overlap
                  if (start1 < end2 && start2 < end1) {
                    throw new Error(`${day}: blocks ${i} and ${j} have overlapping work times`);
                  }
                }
              }
            }
          }
        },
      },
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Template version number (incremented with each modification to the definition)',
    },
    defaults: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Default template for the tenant',
    },
    current: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Currently active template for the tenant',
    },
    for_rotation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Session template using by rotation group',
    },
    session_model: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: tableName.SESSION_MODEL, key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      comment: 'SessionModel',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.SESSION_TEMPLATES,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true, // ✅ Active le soft delete automatique
    deletedAt: 'deleted_at', // ✅ Nom du champ de soft delete
    underscored: true,
    freezeTableName: true,
    comment: 'Session templates table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_session_templates_guid',
      },
      {
        fields: ['name'],
        name: 'idx_session_templates_name',
      },
      { fields: ['session_model'], name: 'idx_session_templates_session_model' },
      {
        fields: ['deleted_at'],
        name: 'idx_session_templates_deleted_at',
      },
      {
        fields: ['definition'],
        name: 'idx_session_templates_definition',
        using: 'GIN',
      },
      {
        fields: ['version'],
        name: 'idx_session_templates_version',
      },
      // 🚨 Index Unique et Partiel (ou Conditionnel) Ajouté
      {
        fields: ['id'], // Peut être n'importe quelle colonne pour un index partiel global uniq
        unique: true,
        name: 'idx_unique_defaults_template',
        // Condition qui doit être vraie pour que l'unicité s'applique
        where: {
          defaults: true,
          deleted_at: null,
        },
      },
      {
        fields: ['defaults'],
        name: 'idx_session_templates_defaults',
      },
      {
        fields: ['for_rotation'],
        name: 'idx_session_templates_for_rotation',
      },
    ],
  } as ModelOptions,
};
