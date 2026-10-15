import { DataTypes, literal, type ModelAttributes, type ModelOptions } from 'sequelize';

/** Schema declared here; migration installs lifecycle/concurrency constraints. */
export const PaymentAttemptDbStructure = {
  tableName: 'xa_payment_attempt',
  attributes: {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    guid: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    payment_transaction: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'xa_payment_transaction', key: 'id' },
    },
    provider: { type: DataTypes.STRING(16), allowNull: false },
    operator: { type: DataTypes.STRING(32), allowNull: false },
    environment: { type: DataTypes.STRING(4), allowNull: false },
    external_id: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    idempotency_key: { type: DataTypes.STRING(128), allowNull: false },
    provider_payment_id: { type: DataTypes.STRING(128), allowNull: true },
    provider_reference: { type: DataTypes.STRING(128), allowNull: true },
    phone_number: { type: DataTypes.STRING(16), allowNull: false },
    amount_local: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency_code: { type: DataTypes.STRING(3), allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'CREATED' },
    failure_reason: { type: DataTypes.STRING(512), allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: literal('CURRENT_TIMESTAMP'),
    },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    failed_at: { type: DataTypes.DATE, allowNull: true },
  } as ModelAttributes,
  options: {
    tableName: 'xa_payment_attempt',
    timestamps: false,
    freezeTableName: true,
  } as ModelOptions,
};
