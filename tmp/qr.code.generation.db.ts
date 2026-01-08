import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const QrCodeGenerationDbStructure = {
  tableName: tableName.QR_CODE_GENERATION,
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
      comment: 'QR Code Generation ID',
    },
    guid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_qr_code_guid', msg: 'QR Code GUID must be unique.' },
      validate: {
        len: [1, 128],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
      },
      comment: 'QR Code name',
    },
    site: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.SITES,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      // onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Site ID',
    },
    // manager: {
    //   type: DataTypes.INTEGER,
    //   allowNull: false,
    //   references: {
    //     model: tableName.USERS,
    //     key: 'id',
    //   },
    //   validate: {
    //     isInt: true,
    //     min: 1,
    //     max: 2147483647,
    //   },
    //   // onUpdate: 'CASCADE',
    //   onDelete: 'CASCADE',
    //   comment: 'Manager who generated the QR code',
    // },
    team: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.TEAMS,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      onDelete: 'CASCADE',
      comment: 'Team ID',
    },
    valid_from: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'QR code validity start date (null = no start limit)',
    },
    valid_to: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'QR code validity end date (null = no end limit)',
    },
    shared: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Qr code is Shared',
    },
    // shared_with: {
    //   type: DataTypes.ARRAY(DataTypes.INTEGER),
    //   allowNull: true,
    //   validate: {
    //     areValidIds(value: number[]) {
    //       if (!Array.isArray(value)) return;
    //       for (const id of value) {
    //         if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
    //           throw new Error(`Invalid entry ID: ${id}`);
    //         }
    //       }
    //     },
    //   },
    //   comment: 'Qr code shared with what team ?',
    // },
    shared_with: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidTeamStructure(value: any) {
          // 1. ✅ La valeur doit être un tableau
          if (!Array.isArray(value)) {
            throw new Error('Teams must be an array.');
          }

          const teams = value as Array<any>;
          const codeIds = new Set<number>();

          for (let i = 0; i < teams.length; i++) {
            const team = teams[i];

            // 2. ✅ Chaque equipe doit être un objet
            if (typeof team !== 'object' || team === null || Array.isArray(team)) {
              throw new Error(`Team at index ${i} must be a valid object.`);
            }

            // 3. ✅ Validation des champs requis

            // 3.1. Champ 'code' (ID numérique requis)
            if (
              !('code' in team) ||
              typeof team.code !== 'number' ||
              !Number.isInteger(team.code) ||
              team.code <= 0
            ) {
              throw new Error(`Team at index ${i}: 'code' must be a valid positive integer ID.`);
            }

            // 3.2. Champ 'shared_at' (Date requise)
            if (
              !('shared_at' in team) ||
              !(
                team.shared_at instanceof Date ||
                (typeof team.shared_at === 'string' && !isNaN(Date.parse(team.shared_at)))
              )
            ) {
              throw new Error(`Team at index ${i}: 'shared_at' must be a valid date/time string.`);
            }

            // // 3.3. Champ 'active' (booléen, true par défaut si manquant)
            // let activeStatus = team.active;
            //
            // // Si 'active' est manquant, il est implicitement 'true' pour la validation.
            // if (!('active' in team) || activeStatus === undefined) {
            //   activeStatus = true; // Défaut pour la vérification de type
            // }
            //
            // if (typeof activeStatus !== 'boolean') {
            //   throw new Error(`Team at index ${i}: 'active' must be a boolean.`);
            // }

            // 4. ✅ Vérification de l'unicité de l'utilisateur
            if (codeIds.has(team.code)) {
              throw new Error(
                `Code ID ${team.code} at index ${i} is duplicated in the teams list.`,
              );
            }
            codeIds.add(team.code);
          }
        },
      },
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.QR_CODE_GENERATION,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'QR Code Generation table for site access',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_qr_code_guid',
        unique: true,
      },
      {
        fields: ['site'],
        name: 'idx_qr_code_site',
      },
      // {
      //   fields: ['manager'],
      //   name: 'idx_qr_code_manager',
      // },
      {
        fields: ['team'],
        name: 'idx_qr_code_team',
      },
      {
        fields: ['valid_from'],
        name: 'idx_qr_code_valid_from',
      },
      {
        fields: ['valid_to'],
        name: 'idx_qr_code_valid_to',
      },
      {
        fields: ['created_at'],
        name: 'idx_qr_code_created_at',
      },
      // {
      //   // unique: true,
      //   fields: ['site', 'manager'],
      //   name: 'idx_qr_code_site_manager',
      // },
      {
        fields: ['site', 'team'],
        name: 'idx_qr_code_site_team',
      },
      {
        fields: ['shared'],
        name: 'idx_qr_code_shared',
      },
      {
        fields: ['shared_with'],
        name: 'idx_qr_code_shared_with',
        using: 'GIN',
      },
      {
        fields: ['name'],
        name: 'idx_qr_code_name',
      },
    ],
  } as ModelOptions,
};
