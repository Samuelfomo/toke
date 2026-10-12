import { DataTypes, literal, type ModelAttributes, type ModelOptions } from 'sequelize';

/** Schema of the single approved append-only license event entity. */
export const LicenseEventDbStructure = {
  tableName: 'xa_license_event',
  attributes: {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    guid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'xa_license_event_guid_key',
      defaultValue: literal("nextval('public.xa_license_event_guid_seq')"),
    },
    tenant: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'xa_tenant', key: 'id' },
    },
    global_license: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'xa_global_license', key: 'id' },
    },
    event_type: { type: DataTypes.STRING(64), allowNull: false },
    operation_key: { type: DataTypes.STRING(128), allowNull: false },
    actor_type: { type: DataTypes.STRING(8), allowNull: false },
    actor_user_guid: { type: DataTypes.STRING(128), allowNull: true },
    occurred_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: literal('CURRENT_TIMESTAMP'),
    },
    effective_at: { type: DataTypes.DATE, allowNull: false },
    previous_payload: { type: DataTypes.JSONB, allowNull: false },
    new_payload: { type: DataTypes.JSONB, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  } as ModelAttributes,
  options: {
    tableName: 'xa_license_event',
    timestamps: false,
    freezeTableName: true,
  } as ModelOptions,
};
