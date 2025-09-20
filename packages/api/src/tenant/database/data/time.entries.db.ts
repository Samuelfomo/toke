import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model';

export enum PointageType {
  CLOCK_IN = 'clock_in',
  CLOCK_OUT = 'clock_out',
  PAUSE_START = 'pause_start',
  PAUSE_END = 'pause_end',
  EXTERNAL_MISSION = 'external_mission',
}

export enum PointageStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  CORRECTED = 'corrected',
  ACCOUNTED = 'accounted',
  REJECTED = 'rejected',
}

export const TimeEntriesDbStructure = {
  tableName: tableName.TIME_ENTRIES,
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
      comment: 'Time entry ID',
    },
    guid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_time_entry_guid', msg: 'Time entry GUID must be unique.' },
      defaultValue: DataTypes.UUIDV4,
      validate: {
        len: [1, 128],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    session: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.WORK_SESSIONS,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      onDelete: 'CASCADE',
      comment: 'Work sessions',
    },
    user: {
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
      OnDelete: 'CASCADE',
      comment: 'Users',
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
      onDelete: 'CASCADE',
      comment: 'Sites',
    },
    pointage_type: {
      type: DataTypes.ENUM(...Object.values(PointageType)),
      allowNull: false,
      // defaultValue: PointageType.CLOCK_IN,
      validate: {
        isIn: {
          args: [Object.values(PointageType)],
          msg: 'Pointage type must be one of: clock_in, clock_out, pause_start, pause_end, external_mission',
        },
      },
      comment: 'Pointage type',
    },
    pointage_status: {
      type: DataTypes.ENUM(...Object.values(PointageStatus)),
      allowNull: false,
      defaultValue: PointageStatus.PENDING,
      validate: {
        isIn: {
          args: [Object.values(PointageStatus)],
          msg: 'Pointage status must be one of: draft, pending, accepted, corrected, accounted, rejected',
        },
      },
      comment: 'Pointage status',
    },
    clocked_at: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
      },
      comment: 'Clocked date',
    },
    real_clocked_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'Real clocked date',
    },
    // server_received_at: {
    //   type: DataTypes.DATE,
    //   allowNull: true,
    //   defaultValue: DataTypes.NOW,
    //   validate: {
    //     isDate: true,
    //   },
    //   comment: 'Server received date',
    // },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: -90,
        max: 90,
      },
      comment: 'Latitude',
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: -180,
        max: 180,
      },
      comment: 'Longitude',
    },
    gps_accuracy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      comment: 'Geolocation accuracy',
    },
    device_info: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Device information',
    },
    ip_address: {
      type: DataTypes.CITEXT, // ou DataTypes.CITEXT si dispo
      allowNull: true,
      validate: {
        isIP: true, // Sequelize sait valider IPv4 & IPv6
      },
      comment: 'IP address (IPv4 or IPv6)',
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent',
    },
    created_offline: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Created offline',
    },
    local_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [1, 50],
      },
      comment: 'Local ID',
    },
    sync_attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0,
        max: 2147483647,
      },
      comment: 'Sync attempts',
    },
    last_sync_attempt: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'Sync last attempt date',
    },
    memo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.MEMOS,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      comment: 'Memos',
    },
    correction_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [10, 500],
      },
      comment: 'Correction reason',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.TIME_ENTRIES,
    timestamps: true,
    createdAt: 'server_received_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Time entries table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_time_entry_guid',
      },
      {
        fields: ['session'],
        name: 'idx_time_entry_session',
      },
      {
        fields: ['user'],
        name: 'idx_time_entry_user',
      },
      {
        fields: ['site'],
        name: 'idx_time_entry_site',
      },
      {
        fields: ['pointage_type'],
        name: 'idx_time_entry_pointage_type',
      },
      {
        fields: ['pointage_status'],
        name: 'idx_time_entry_pointage_status',
      },
      {
        fields: ['clocked_at'],
        name: 'idx_time_entry_clocked_at',
      },
      {
        fields: ['real_clocked_at'],
        name: 'idx_time_entry_real_clocked_at',
      },
      {
        fields: ['server_received_at'],
        name: 'idx_time_entry_server_received_at',
      },
      {
        fields: ['latitude'],
        name: 'idx_time_entry_latitude',
      },
      {
        fields: ['longitude'],
        name: 'idx_time_entry_longitude',
      },
      {
        fields: ['gps_accuracy'],
        name: 'idx_time_entry_gps_accuracy',
      },
      {
        fields: ['device_info'],
        name: 'idx_time_entry_device_info',
      },
      {
        fields: ['ip_address'],
        name: 'idx_time_entry_ip_address',
      },
      {
        fields: ['user_agent'],
        name: 'idx_time_entry_user_agent',
      },
      {
        fields: ['created_offline'],
        name: 'idx_time_entry_created_offline',
      },
      {
        fields: ['local_id'],
        name: 'idx_time_entry_local_id',
      },
      {
        fields: ['sync_attempts'],
        name: 'idx_time_entry_sync_attempts',
      },
      {
        fields: ['last_sync_attempt'],
        name: 'idx_time_entry_last_sync_attempt',
      },
      {
        fields: ['memo'],
        name: 'idx_time_entry_memo',
      },
      {
        fields: ['correction_reason'],
        name: 'idx_time_entry_correction_reason',
      },
    ],
  } as ModelOptions,
};
