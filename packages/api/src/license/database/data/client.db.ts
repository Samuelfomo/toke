import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

/**
 * Structure de la table clients
 */
export const ClientDbStructure = {
  tableName: tableName.CLIENT,

  attributes: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Client',
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_client_name', msg: 'The client NAME must be unique' },
      validate: {
        is: /^[a-zA-Z0-9_]{1,128}$/,
        len: [1, 128],
      },
      comment: 'Application name',
    },
    token: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: { name: 'unique_client_token', msg: 'The client TOKEN must be unique' },
      validate: {
        is: /^[a-zA-Z0-9_]{1,64}$/,
        len: [10, 64],
      },
      comment: "Token d'authentification API",
    },
    secret: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        is: /^[a-zA-Z0-9_]{1,64}$/,
        len: [8, 64],
      },
      comment: 'Secret signature key',
    },
    profile: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reference to profile (foreign key)',
      references: {
        model: tableName.PROFILE,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Statut actif/inactif',
    },
  } as ModelAttributes,

  options: {
    tableName: tableName.CLIENT,
    timestamps: true,
    comment: 'Table of API customers',
    indexes: [
      {
        unique: true,
        fields: ['token'],
        name: 'idx_client_token',
      },
      {
        fields: ['active'],
        name: 'idx_client_active',
      },
      {
        fields: ['name'],
        name: 'idx_client_name',
      },
      {
        fields: ['profile'],
        name: 'idx_client_profile',
      },
    ],
  } as ModelOptions,

  // Méthodes de validation simples
  validation: {
    validateName: (name: string): boolean => {
      return name.trim().length >= 2 && name.trim().length <= 128;
    },

    validateSecret: (secret: string): boolean => {
      return secret.trim().length >= 8 && secret.trim().length <= 64;
    },

    validateToken: (token: string): boolean => {
      return token.trim().length > 0 && /^[a-zA-Z0-9-_]+$/.test(token.trim());
    },

    /**
     * Valide l'ID du profil
     */
    validateProfil: (profile: number): boolean => {
      return Number.isInteger(profile) && profile > 0;
    },

    cleanData: (data: any): void => {
      if (data.name) data.name = data.name.trim();
      if (data.secret) data.secret = data.secret.trim();
      if (data.token) data.token = data.token.trim();
    },
  },
};