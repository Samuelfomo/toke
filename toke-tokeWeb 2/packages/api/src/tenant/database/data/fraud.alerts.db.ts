import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const FraudAlertsDbStructure = {
  tableName: tableName.FRAUD_ALERTS,
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
      comment: 'Fraud alert ID',
    },
    guid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_fraud_alerts_guid', msg: 'Fraud alerts GUID must be unique.' },
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
      onDelete: 'CASCADE',
      comment: 'Users',
    },
    time_entry: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.TIME_ENTRIES,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      // onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Time entries',
    },
    alert_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [1, 50],
      },
      comment: 'Alert type',
    },
    alert_severity: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'medium',
      validate: {
        len: [1, 20],
      },
      comment: 'Alert severity',
    },
    alert_description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [5, Infinity],
      },
      comment: 'Alert description',
    },
    alert_data: {
      type: DataTypes.JSONB, // -- JSONB = JSON with Données détaillées
      allowNull: true,
      comment: 'Alert data',
    },
    investigated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Is investigated',
    },
    investigation_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [1, Infinity],
      },
      comment: 'Investigation notes',
    },
    false_positive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Is false positive',
    },
    investigated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'Investigated at',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.FRAUD_ALERTS,
    timestamp: true,
    createdAt: 'created_at',
    UpdatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Fraud alerts table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_fraud_alerts_guid',
      },
      {
        fields: ['user'],
        name: 'idx_fraud_alerts_user',
      },
      {
        fields: ['time_entry'],
        name: 'idx_fraud_alerts_time_entry',
      },
      {
        fields: ['alert_type'],
        name: 'idx_fraud_alerts_alert_type',
      },
      {
        fields: ['alert_severity'],
        name: 'idx_fraud_alerts_alert_severity',
      },
      {
        fields: ['alert_description'],
        name: 'idx_fraud_alerts_alert_description',
      },
      {
        using: 'GIN',
        fields: ['alert_data'],
        name: 'idx_fraud_alerts_alert_data',
      },
      {
        fields: ['investigated'],
        name: 'idx_fraud_alerts_investigated',
      },
      {
        fields: ['false_positive'],
        name: 'idx_fraud_alerts_false_positive',
      },
      {
        fields: ['created_at'],
        name: 'idx_fraud_alerts_created_at',
      },
      {
        fields: ['investigated_at'],
        name: 'idx_fraud_alerts_investigated_at',
      },
    ],
  } as ModelOptions,
};
