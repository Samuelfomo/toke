import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const DepartmentDbStructure = {
  tableName: tableName.DEPARTMENT,
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
      comment: 'Department ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: { name: 'unique_department_guid', msg: 'Department GUID must be unique.' },
      validate: {
        len: [1, 255],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
      },
      comment: 'Department name',
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: { name: 'unique_department_guid', msg: 'Department GUID must be unique.' },
      validate: {
        len: [1, 50],
        notEmpty: true,
        notNull: true,
      },
      comment: 'Department code',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [1, Infinity],
      },
      comment: 'Department description',
    },
    manager: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      comment: 'Manager of the department',
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'Department status',
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
    tableName: tableName.DEPARTMENT,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true, // ✅ Active le soft delete automatique
    deletedAt: 'deleted_at', // ✅ Nom du champ de soft delete
    underscored: true,
    freezeTableName: true,
    comment: 'Department table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_department_guid',
      },
      {
        fields: ['name'],
        name: 'idx_department_name',
      },
      {
        fields: ['code'],
        name: 'idx_department_code',
      },
      {
        fields: ['active'],
        name: 'idx_department_active',
      },
      {
        fields: ['manager'],
        name: 'idx_department_manager',
      },
      {
        fields: ['deleted_at'],
        name: 'idx_department_deleted_at',
      },
    ],
  } as ModelOptions,
};
