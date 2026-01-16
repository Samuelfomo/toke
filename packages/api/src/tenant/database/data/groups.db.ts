import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const GroupsDbStructure = {
  tableName: tableName.GROUPS,
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
      comment: 'Groups ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_groups_guid',
        msg: 'Groups GUID must be unique.',
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
      comment: 'Groups name',
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
        isValidGroupStructure(value: any) {
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
      comment: 'List of members of the groups',
    },
    // assigned_sessions: {
    //   type: DataTypes.JSONB,
    //   allowNull: false,
    //   defaultValue: [],
    //   comment: 'History of session templates assigned to groups members.',
    //   validate: {
    //     isValidSessionAssignmentStructure(value: any) {
    //       // 1. ✅ La valeur doit être un tableau (Array)
    //       if (!Array.isArray(value)) {
    //         throw new Error('Assigned sessions must be an array.');
    //       }
    //
    //       const assignments = value as Array<any>;
    //       let activeCount = 0;
    //
    //       for (let i = 0; i < assignments.length; i++) {
    //         const assignment = assignments[i];
    //
    //         // 2. ✅ Chaque élément doit être un objet
    //         if (
    //           typeof assignment !== 'object' ||
    //           assignment === null ||
    //           Array.isArray(assignment)
    //         ) {
    //           throw new Error(`Assignment at index ${i} must be a valid object.`);
    //         }
    //
    //         // 3. ✅ Validation des champs
    //
    //         // 3.1. 'session_template' (ID numérique requis, référence)
    //         if (
    //           !('session_template' in assignment) ||
    //           typeof assignment.session_template !== 'number' ||
    //           !Number.isInteger(assignment.session_template) ||
    //           assignment.session_template <= 0
    //         ) {
    //           throw new Error(
    //             `Assignment at index ${i}: 'session_template' must be a valid positive integer ID.`,
    //           );
    //         }
    //
    //         // 3.2. 'assign_at' (Date requise)
    //         if (
    //           !('assign_at' in assignment) ||
    //           !(
    //             assignment.assign_at instanceof Date ||
    //             (typeof assignment.assign_at === 'string' &&
    //               !isNaN(Date.parse(assignment.assign_at)))
    //           )
    //         ) {
    //           throw new Error(
    //             `Assignment at index ${i}: 'assign_at' must be a valid date/time string.`,
    //           );
    //         }
    //
    //         // 3.3. 'active' (Booléen requis)
    //         // ATTENTION: contrairement au 'members', 'active' doit être explicite ici pour la règle métier.
    //         if (!('active' in assignment) || typeof assignment.active !== 'boolean') {
    //           throw new Error(
    //             `Assignment at index ${i}: 'active' must be explicitly provided as a boolean.`,
    //           );
    //         }
    //
    //         // 4. 🚨 Règle métier : Vérifier l'unicité du statut 'active = true'
    //         if (assignment.active === true) {
    //           activeCount++;
    //         }
    //       }
    //
    //       // 5. ✅ Contrainte Finale: Un seul modèle actif est autorisé (Count doit être 1)
    //       if (activeCount > 1) {
    //         throw new Error('Only one session template can be active (active: true) at a time.');
    //       }
    //
    //       // OPTIONNEL: Permettre 0 modèle actif si l'utilisateur n'en a pas encore un
    //       // if (activeCount === 0) {
    //       //   throw new Error('At least one session template must be marked as active.');
    //       // }
    //     },
    //   },
    // },
  } as ModelAttributes,
  options: {
    tableName: tableName.GROUPS,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true, // ✅ Active le soft delete automatique
    deletedAt: 'deleted_at', // ✅ Nom du champ de soft delete
    underscored: true,
    freezeTableName: true,
    comment: 'Groups table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_groups_guid',
      },
      {
        fields: ['name'],
        name: 'idx_groups_name',
      },
      {
        fields: ['manager'],
        name: 'idx_groups_manager',
      },
      // {
      //   fields: ['assigned_sessions'],
      //   name: 'idx_groups_assigned_sessions',
      // },
      {
        fields: ['created_at'],
        name: 'idx_groups_created_at',
      },
      {
        fields: ['deleted_at'],
        name: 'idx_groups_deleted_at',
      },
      {
        fields: ['members'],
        name: 'idx_groups_members',
        using: 'GIN',
      },
      {
        fields: ['manager', 'name'],
        name: 'idx_groups_manager_name',
        unique: true,
      },
    ],
  } as ModelOptions,
};
