import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const ExchangeRateDbStructure = {
  tableName: tableName.EXCHANGE_RATE,
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
      comment: 'Exchange Rate',
    },
    guid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: { name: 'unique_exchange_rate_guid', msg: 'Exchange rate GUID must be unique' },
      validate: {
        isInt: true,
        min: 100000,
        max: 999999,
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    from_currency_code: {
      type: DataTypes.STRING(3),
      allowNull: false,
      references: {
        model: tableName.CURRENCY,
        key: 'code',
      },
      // onUpdate: 'CASCADE',
      // onDelete: 'RESTRICT', // Empêche la suppression si des taux existent
      validate: {
        is: /^[A-Z]{3}$/,
        len: [3, 3],
        notEmpty: true,
      },
      comment: 'Source currency ISO 4217 code (e.g. USD, EUR, XAF)',
    },
    to_currency_code: {
      type: DataTypes.STRING(3),
      allowNull: false,
      references: {
        model: tableName.CURRENCY,
        key: 'code',
      },
      // onUpdate: 'CASCADE',
      // onDelete: 'RESTRICT',
      validate: {
        is: /^[A-Z]{3}$/,
        len: [3, 3],
        notEmpty: true,
      },
      comment: 'Target currency ISO 4217 code (e.g. USD, EUR, XAF)',
    },
    exchange_rate: {
      type: DataTypes.DECIMAL(12, 6),
      allowNull: false,
      validate: {
        isDecimal: true,
        // min: 0.000001, // Évite les divisions par zéro
        min: 1,
        max: 999999.999999,
        notNull: true,
      },
      comment: 'Exchange rate value (up to 6 decimal places)',
    },
    current: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'Is this the current/active exchange rate?',
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
        notNull: true,
      },
      comment: 'User ID of the creator/updater',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.EXCHANGE_RATE,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // paranoid: false,      // true si tu veux soft delete
    underscored: true, // snake_case pour tous les champs
    freezeTableName: true, // empêche la pluralisation
    comment: 'Exchange rates table with currency pair relationships',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_exchange_rate_guid',
      },
      {
        fields: ['from_currency_code'],
        name: 'idx_exchange_rate_from_currency_code',
      },
      {
        fields: ['to_currency_code'],
        name: 'idx_exchange_rate_to_currency_code',
      },
      {
        fields: ['exchange_rate'],
        name: 'idx_exchange_rate_exchange_rate',
      },
      {
        fields: ['current'],
        name: 'idx_exchange_rate_is_current',
      },
      {
        fields: ['created_by'],
        name: 'idx_exchange_rate_created_by',
      },
      {
        fields: ['created_at'],
        name: 'idx_exchange_rate_created_at',
      },
      {
        fields: ['updated_at'],
        name: 'idx_exchange_rate_updated_at',
      },
    ],
    // Contraintes au niveau table
    validate: {
      differentCurrencies() {
        if (this.from_currency_code === this.to_currency_code) {
          throw new Error('From and to currency codes must be different');
        }
      },
      positiveRate(this: { exchange_rate: number }) {
        if (this.exchange_rate <= 0) {
          throw new Error('Exchange rate must be positive');
        }
      },
    },
  } as ModelOptions,
} as const;