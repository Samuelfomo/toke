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
    ],
  } as ModelOptions,
};
