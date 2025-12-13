import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const TeamsDbStructure = {
  tableName: tableName.TEAMS,
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
      comment: 'Team ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_teams_guid',
        msg: 'Teams GUID must be unique.',
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
      comment: 'Teams name',
    },
    manager: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Manager ID',
    },
    members: {
      // user, joined_at, active
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        notEmpty: true,
        isValidTeamStructure(value: any) {
          // 1. ✅ La valeur doit être un tableau
          if (!Array.isArray(value)) {
            throw new Error('Members must be an array.');
          }

          const members = value as Array<any>;
          const userIds = new Set<number>();

          for (let i = 0; i < members.length; i++) {
            const member = members[i];

            // 2. ✅ Chaque membre doit être un objet
            if (typeof member !== 'object' || member === null || Array.isArray(member)) {
              throw new Error(`Member at index ${i} must be a valid object.`);
            }

            // 3. ✅ Validation des champs requis

            // 3.1. Champ 'user' (ID numérique requis)
            if (
              !('user' in member) ||
              typeof member.user !== 'number' ||
              !Number.isInteger(member.user) ||
              member.user <= 0
            ) {
              throw new Error(`Member at index ${i}: 'user' must be a valid positive integer ID.`);
            }

            // 3.2. Champ 'joined_at' (Date requise)
            if (
              !('joined_at' in member) ||
              !(
                member.joined_at instanceof Date ||
                (typeof member.joined_at === 'string' && !isNaN(Date.parse(member.joined_at)))
              )
            ) {
              throw new Error(
                `Member at index ${i}: 'joined_at' must be a valid date/time string.`,
              );
            }

            // 3.3. Champ 'active' (booléen, true par défaut si manquant)
            let activeStatus = member.active;

            // Si 'active' est manquant, il est implicitement 'true' pour la validation.
            if (!('active' in member) || activeStatus === undefined) {
              activeStatus = true; // Défaut pour la vérification de type
            }

            if (typeof activeStatus !== 'boolean') {
              throw new Error(`Member at index ${i}: 'active' must be a boolean.`);
            }

            // 4. ✅ Vérification de l'unicité de l'utilisateur
            if (userIds.has(member.user)) {
              throw new Error(
                `User ID ${member.user} at index ${i} is duplicated in the members list.`,
              );
            }
            userIds.add(member.user);
          }
        },
      },
      comment: 'List of members of the team',
    },
    default_session_template: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.SESSION_TEMPLATES,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Default session template ID',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.TEAMS,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true, // ✅ Active le soft delete automatique
    deletedAt: 'deleted_at', // ✅ Nom du champ de soft delete
    underscored: true,
    freezeTableName: true,
    comment: 'Teams table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_teams_guid',
      },
      {
        fields: ['name'],
        name: 'idx_teams_name',
      },
      {
        fields: ['manager'],
        name: 'idx_teams_manager',
      },
      {
        fields: ['default_session_template'],
        name: 'idx_teams_default_session_template',
      },
      {
        fields: ['created_at'],
        name: 'idx_teams_created_at',
      },
      {
        fields: ['deleted_at'],
        name: 'idx_teams_deleted_at',
      },
      {
        fields: ['members'],
        name: 'idx_teams_members',
        using: 'GIN',
      },
    ],
  } as ModelOptions,
};
