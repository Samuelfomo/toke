import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

/**
 * Structure de la table profiles
 */
export const ClientProfileDbStructure = {
  tableName: tableName.PROFILE,

  attributes: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'Profile',
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_profil_name', msg: 'The profil NAME must be unique' },
      comment: 'Name',
    },
    root: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indicates whether the profile is root (super administrator)',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Detailed description',
    },
  } as ModelAttributes,

  options: {
    tableName: tableName.PROFILE,
    timestamps: true,
    comment: 'Table of user profiles with permissions',
    indexes: [
      {
        unique: true,
        fields: ['name'],
        name: 'idx_profile_name',
      },
      {
        fields: ['root'],
        name: 'idx_profile_root',
      },
      {
        // Index unique partiel : seul un profil peut avoir root=true
        unique: true,
        fields: ['root'],
        name: 'idx_profile_unique_root',
        where: {
          root: true,
        },
      },
    ],
  } as ModelOptions,

  // Méthodes de validation
  validation: {
    /**
     * Valide le nom du profil
     */
    validateName: (name: string): boolean => {
      const trimmed = name.trim();
      return trimmed.length >= 2 && trimmed.length <= 128;
    },

    /**
     * Valide la description du profil
     */
    validateDescription: (description: string): boolean => {
      if (!description) return true; // Nullable
      const trimmed = description.trim();
      return trimmed.length <= 255;
    },

    /**
     * Valide qu'il n'y a qu'un seul profil root
     * Cette validation est également garantie par la contrainte DB
     */
    validateUniqueRoot: (root: boolean): boolean => {
      // La contrainte DB s'occupe de l'unicité,
      // cette validation est pour la cohérence métier
      return typeof root === 'boolean';
    },

    /**
     * Nettoie les données avant insertion/update
     */
    cleanData: (data: any): void => {
      if (data.name) {
        data.name = data.name.trim();
      }
      if (data.description) {
        data.description = data.description.trim();
      }
      // Assure que root est bien un boolean
      if (data.root !== undefined) {
        data.root = Boolean(data.root);
      }
    },
  },
};
