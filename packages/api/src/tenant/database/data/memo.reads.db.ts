import { DataTypes } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export const MemoReadsDbStructure = {
  tableName: tableName.MEMO_READS,
  attributes: {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    memo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: tableName.MEMOS, key: 'id' },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: tableName.USERS, key: 'id' },
      onDelete: 'CASCADE',
    },
    read_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  options: {
    timestamps: false,
    indexes: [{ name: 'uq_tk_memo_reads_memo_user', unique: true, fields: ['memo_id', 'user_id'] }],
  },
};
