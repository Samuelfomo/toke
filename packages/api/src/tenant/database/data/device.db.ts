import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';
import { DeviceType } from '@toke/shared';

import { tableName } from '../../../utils/response.model.js';

export const DeviceDbStructure = {
  tableName: tableName.DEVICE,
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
      comment: 'Device ID',
    },
    guid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_device_guid', msg: 'Device GUID must be unique.' },
      defaultValue: DataTypes.UUIDV4,
      validate: {
        len: [1, 128],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
        nullable: false,
        notEmpty: true,
      },
      comment: 'Device Name',
    },
    // identified: {
    //   type: DataTypes.STRING(255),
    //   allowNull: false,
    //   unique: { name: 'unique_device_identified', msg: 'Device Identified must be unique.' },
    //   validate: {
    //     len: [1, 255],
    //     nullable: false,
    //     notEmpty: true,
    //   },
    //   comment: 'Device identified',
    // },
    device_type: {
      type: DataTypes.ENUM(...Object.values(DeviceType)),
      allowNull: false,
      defaultValue: DeviceType.OTHER,
      validate: {
        isIn: {
          args: [Object.values(DeviceType)],
          msg: `Device Type must be one of: ${Object.values(DeviceType).join(', ')}`,
        },
      },
      comment: 'Device Type',
    },
    assigned_to: {
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
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'users',
    },
    gps_accuracy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      comment: 'Geolocation accuracy',
    },
    custom_geofence_radius: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
        max: 10000, // 10 km,
      },
      comment: 'Device Geolocation radius',
    },
    last_seen_at: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
      },
      comment: 'Device last seen at',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'Active device status',
    },
    created_by: {
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
      comment: 'device created by',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.DEVICE,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Device table for user',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_device_guid',
      },
      {
        fields: ['name'],
        name: 'idx_device_name',
      },
      // {
      //   fields: ['identified'],
      //   name: 'idx_device_identified',
      // },
      {
        fields: ['device_type'],
        name: 'idx_device_type',
      },
      {
        fields: ['assigned_to'],
        name: 'idx_device_assigned_to',
      },
      {
        fields: ['last_seen_at'],
        name: 'idx_device_last_seen_at',
      },
      {
        fields: ['gps_accuracy'],
        name: 'idx_device_gps_accuracy',
      },
      {
        fields: ['custom_geofence_radius'],
        name: 'idx_device_custom_geofence_radius',
      },
      {
        fields: ['active'],
        name: 'idx_device_active',
      },
      {
        fields: ['created_by'],
        name: 'idx_device_created_by',
      },
    ],
  } as ModelOptions,
};
