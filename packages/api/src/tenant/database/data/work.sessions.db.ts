import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';
import { SessionStatus } from '@toke/shared';

import { tableName } from '../../../utils/response.model.js';

export const WorkSessionsDbStructure = {
  tableName: tableName.WORK_SESSIONS,
  attributes: {
    id: {
      type: DataTypes.SMALLINT,
      primaryKey: true,
      autoIncrement: true,
      validate: {
        isInt: true,
        min: 1,
        max: 65535,
      },
      comment: 'Work session ID',
    },
    guid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_work_session_guid', msg: 'Work session GUID must be unique.' },
      defaultValue: DataTypes.UUIDV4,
      validate: {
        len: [1, 128],
      },
      comment: 'Unique, automatically generated digital GUID',
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
      OnDelete: 'CASCADE',
      comment: 'Sites',
    },
    session_status: {
      type: DataTypes.ENUM(...Object.values(SessionStatus)),
      allowNull: false,
      defaultValue: SessionStatus.OPEN,
      validate: {
        isIn: {
          args: [Object.values(SessionStatus)],
          msg: 'Session status must be one of: open, closed, abandoned, corrected',
        },
      },
      comment: 'Session status',
    },
    session_start_at: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
      },
      comment: 'Session start date',
    },
    session_end_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'Session end date',
    },
    total_work_duration: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Total work duration as PostgreSQL INTERVAL string',
    },
    total_pause_duration: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Total pause duration as PostgreSQL INTERVAL string',
    },
    start_latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        isDecimal: true,
        min: -90,
        max: 90,
      },
      comment: 'Start latitude',
    },
    start_longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        isDecimal: true,
        min: -180,
        max: 180,
      },
      comment: 'Start longitude',
    },
    end_latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        isDecimal: true,
        min: -90,
        max: 90,
      },
      comment: 'End latitude',
    },
    end_longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        isDecimal: true,
        min: -180,
        max: 180,
      },
      comment: 'End longitude',
    },
    // memo: {
    //   type: DataTypes.INTEGER,
    //   allowNull: true,
    //   references: {
    //     model: tableName.MEMOS,
    //     key: 'id',
    //   },
    //   validate: {
    //     isInt: true,
    //     min: 1,
    //     max: 2147483647,
    //   },
    //   comment: 'Memos',
    // },
  } as ModelAttributes,
  options: {
    tableName: tableName.WORK_SESSIONS,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Work sessions table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_work_session_guid',
      },
      {
        fields: ['user'],
        name: 'idx_work_session_user',
      },
      {
        fields: ['site'],
        name: 'idx_work_session_site',
      },
      {
        fields: ['session_status'],
        name: 'idx_work_session_session_status',
      },
      {
        fields: ['session_start_at'],
        name: 'idx_work_session_session_start_at',
      },
      {
        fields: ['session_end_at'],
        name: 'idx_work_session_session_end_at',
      },
      {
        fields: ['total_work_duration'],
        name: 'idx_work_session_total_work_duration',
      },
      {
        fields: ['total_pause_duration'],
        name: 'idx_work_session_total_pause_duration',
      },
      {
        fields: ['start_latitude'],
        name: 'idx_work_session_start_latitude',
      },
      {
        fields: ['start_longitude'],
        name: 'idx_work_session_start_longitude',
      },
      {
        fields: ['end_latitude'],
        name: 'idx_work_session_end_latitude',
      },
      {
        fields: ['end_longitude'],
        name: 'idx_work_session_end_longitude',
      },
      // {
      //   fields: ['memo'],
      //   name: 'idx_work_session_memo',
      // },
      {
        fields: ['created_at'],
        name: 'idx_work_session_created_at',
      },
      {
        fields: ['updated_at'],
        name: 'idx_work_session_updated_at',
      },
    ],
  } as ModelOptions,
};
