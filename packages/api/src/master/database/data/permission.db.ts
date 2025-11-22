import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

/**
 * Structure de la table permissions
 */
export const PermissionDbStructure = {
  tableName: tableName.PERMISSION,

  attributes: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'Unique permission identifier',
    },
    profile: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Profile',
      references: {
        model: tableName.PROFILE,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    endpoint: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: `Endpoint`,
      references: {
        model: tableName.ENDPOINT,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    route: {
      type: DataTypes.STRING(128),
      allowNull: false,
      comment: 'Route associated with this permission (e.g. Lexicon)',
    },
  } as ModelAttributes,

  options: {
    tableName: tableName.PERMISSION,
    timestamps: true,
    comment: 'Table of permissions linking profiles, endpoints and routes',
    indexes: [
      {
        // Index unique composite : un profil ne peut pas avoir la même permission endpoint+route
        unique: true,
        fields: ['profile', 'endpoint', 'route'],
        name: 'idx_permission_unique_profile_endpoint_route',
      },
      {
        fields: ['profile'],
        name: 'idx_permission_profile',
      },
      {
        fields: ['endpoint'],
        name: 'idx_permission_endpoint',
      },
      {
        fields: ['route'],
        name: 'idx_permission_route',
      },
      {
        // Index composite pour optimiser les requêtes de vérification d'accès
        fields: ['profile', 'route'],
        name: 'idx_permission_profile_route',
      },
      {
        // Index unique composite : un profil ne peut pas avoir la même permission endpoint+route
        unique: true,
        fields: ['profile', 'endpoint'],
        name: 'idx_permission_unique_profile_endpoint',
      },
    ],
  } as ModelOptions,
};
