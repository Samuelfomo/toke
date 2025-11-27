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
        max: 2147483647,
      },
      // onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Manager who generated the QR code',
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
      {
        fields: ['manager'],
        name: 'idx_qr_code_manager',
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
      {
        unique: true,
        fields: ['site', 'manager'],
        name: 'idx_qr_code_site_manager',
      },
      {
        fields: ['shared'],
        name: 'idx_qr_code_shared',
      },
    ],
  } as ModelOptions,
};
