import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const AuditLogsDbStructure = {
  tableName: tableName.AUDIT_LOGS,
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
      comment: 'Audit log ID',
    },
    guid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_audit_log_guid', msg: 'Audit log GUID must be unique.' },
      defaultValue: DataTypes.UUIDV4,
      validate: {
        len: [1, 128],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    table_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [1, 50],
      },
      comment: 'Table name',
    },
    record: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      comment: 'Record ID',
    },
    record_guid: {
      type: DataTypes.UUID,
      allowNull: true,
      validate: {
        len: [1, 128],
      },
      comment: 'Record GUID',
    },
    operation: {
      type: DataTypes.STRING(10), // -- INSERT, UPDATE, DELETE
      allowNull: false,
      validate: {
        len: [1, 10],
      },
      comment: 'Operation (INSERT, UPDATE, DELETE)',
    },
    old_values: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Old values',
    },
    new_values: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'New values',
    },
    changed_by_user: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // references: {
      //   model: tableName.USERS,
      //   key: 'id',
      // },
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      comment: 'User',
    },
    changed_by_type: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: [1, 20],
      },
      comment: 'Changed by type (user, system, api)',
    },
    change_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [1, 500],
      },
      comment: 'Change reason',
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
      validate: {
        len: [1, Infinity],
      },
      comment: 'User agent',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.AUDIT_LOGS,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Audit logs table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_audit_log_guid',
      },
      {
        fields: ['table_name'],
        name: 'idx_audit_log_table_name',
      },
      {
        fields: ['record'],
        name: 'idx_audit_log_record',
      },
      {
        fields: ['record_guid'],
        name: 'idx_audit_log_record_guid',
      },
      {
        fields: ['operation'],
        name: 'idx_audit_log_operation',
      },
      {
        fields: ['old_values'],
        name: 'idx_audit_log_old_values',
      },
      {
        fields: ['new_values'],
        name: 'idx_audit_log_new_values',
      },
      {
        fields: ['changed_by_user'],
        name: 'idx_audit_log_changed_by_user',
      },
      {
        fields: ['changed_by_type'],
        name: 'idx_audit_log_changed_by_type',
      },
      {
        fields: ['change_reason'],
        name: 'idx_audit_log_change_reason',
      },
      {
        fields: ['ip_address'],
        name: 'idx_audit_log_ip_address',
      },
      {
        fields: ['user_agent'],
        name: 'idx_audit_log_user_agent',
      },
      {
        fields: ['created_at'],
        name: 'idx_audit_log_created_at',
      },
    ],
  } as ModelOptions,
};
