import { DataTypes } from 'sequelize';

import { tableName } from '../../../utils/response.model';

export enum MemoType {
  DELAY_JUSTIFICATION = 'delay_justification',
  ABSENCE_JUSTIFICATION = 'absence_justification',
  CORRECTION_REQUEST = 'correction_request',
  SESSION_CLOSURE = 'session_closure',
  AUTO_GENERATED = 'auto_generated',
}

export enum MemoStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export const MemosDbStructure = {
  tableName: tableName.MEMOS,
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
      comment: 'Memo ID',
    },
    guid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_memo_guid', msg: 'Memo GUID must be unique.' },
      defaultValue: DataTypes.UUIDV4,
      validate: {
        len: [1, 128],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    author_user: {
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
    target_user: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    validator_user: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    memo_type: {
      type: DataTypes.ENUM(...Object.values(MemoType)),
      allowNull: false,
      // defaultValue: MemoType.AUTO_GENERATED,
      validate: {
        isIn: {
          args: [Object.values(MemoType)],
          msg: 'Memo type must be one of: delay_justification, absence_justification, correction_request, session_closure, auto_generated',
        },
      },
      comment: 'Memo type',
    },
    memo_status: {
      type: DataTypes.ENUM(...Object.values(MemoStatus)),
      allowNull: false,
      defaultValue: MemoStatus.DRAFT,
      validate: {
        isIn: {
          args: [Object.values(MemoStatus)],
          msg: 'Memo status must be one of: draft, submitted, pending, approved, rejected',
        },
      },
      comment: 'Memo status',
    },
  },
};
