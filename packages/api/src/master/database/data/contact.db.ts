import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const ContactDbStructure = {
  tableName: tableName.CONTACT,
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
      comment: 'Contact ID',
    },
    guid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_contact_guid', msg: 'Contact GUID must be unique' },
      validate: {
        len: [1, 128],
        notEmpty: true,
        notNull: true,
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    tenant: {
      type: DataTypes.STRING(128),
      allowNull: true,
      validate: {
        len: [1, 128],
        notEmpty: true,
      },
      comment: 'Tenant reference',
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: { name: 'unique_contact_phone', msg: 'Contact phone must be unique' },
      validate: {
        len: [5, 50],
        notEmpty: true,
        notNull: true,
      },
      comment: 'Phone number',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.CONTACT,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Table of qualified WhatsApp contacts',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_contact_guid',
      },
      {
        fields: ['tenant'],
        name: 'idx_contact_tenant',
      },
      {
        fields: ['phone'],
        name: 'idx_contact_phone',
      },
    ],
  } as ModelOptions,
};
