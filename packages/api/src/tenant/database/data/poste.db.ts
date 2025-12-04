import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';
import { Level } from '@toke/shared';

import { tableName } from '../../../utils/response.model.js';

export const PosteDbStructure = {
  tableName: tableName.POSTE,
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
      comment: 'Poste ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: { name: 'unique_poste_guid', msg: 'Poste GUID must be unique.' },
      validate: {
        len: [1, 255],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
      },
      comment: 'Poste title',
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: { name: 'unique_poste_guid', msg: 'Poste GUID must be unique.' },
      validate: {
        len: [1, 50],
        notEmpty: true,
        notNull: true,
      },
      comment: 'Poste code',
    },
    department: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.DEPARTMENT,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      comment: 'Department ID',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    salary_base: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        isDecimal: true,
      },
      comment: 'Salary base',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [1, Infinity],
      },
      comment: 'Poste description',
    },
    level: {
      type: DataTypes.ENUM(...Object.values(Level)),
      allowNull: false,
      defaultValue: Level.UNKNOWN,
      validate: {
        isIn: {
          args: [[...Object.values(Level)]],
          msg: 'Level must be one of the following: ' + Object.values(Level).join(', '),
        },
      },
      comment: 'Poste level',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'Poste status',
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'Soft delete timestamp',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.POSTE,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true, // ✅ Active le soft delete automatique
    deletedAt: 'deleted_at', // ✅ Nom du champ de soft delete
    underscored: true,
    freezeTableName: true,
    comment: 'Poste table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_poste_guid',
      },
      {
        fields: ['title'],
        name: 'idx_poste_title',
      },
      {
        fields: ['code'],
        name: 'idx_poste_code',
      },
      {
        fields: ['department'],
        name: 'idx_poste_department',
      },
      {
        fields: ['salary_base'],
        name: 'idx_poste_salary_base',
      },
      {
        fields: ['active'],
        name: 'idx_poste_active',
      },
      {
        fields: ['level'],
        name: 'idx_poste_level',
      },
      {
        fields: ['deleted_at'],
        name: 'idx_poste_deleted_at',
      },
    ],
  } as ModelOptions,
};
