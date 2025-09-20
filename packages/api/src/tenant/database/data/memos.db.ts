import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

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
      onDelete: 'CASCADE',
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
      onDelete: 'CASCADE',
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
      onDelete: 'CASCADE',
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
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [1, 200],
      },
      comment: 'Memo title',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [10, Infinity],
      },
      comment: 'Memo description',
    },
    incident_datetime: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'Incident date and time',
    },
    affected_session: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.WORK_SESSIONS,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      comment: 'Affected work session',
    },
    affected_entries: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true,
      validate: {
        areValidIds(value: number[]) {
          if (!Array.isArray(value)) return;
          for (const id of value) {
            if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
              throw new Error(`Invalid entry ID: ${id}`);
            }
          }
        },
      },
      comment: 'Affected entries IDs',
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isArrayOfUrls(value: any) {
          if (value == null) return; // autorise null
          if (!Array.isArray(value)) {
            throw new Error('Attachments must be an array');
          }
          for (const url of value) {
            if (typeof url !== 'string' || !/^https?:\/\/.+/.test(url)) {
              throw new Error(`Invalid URL in attachments: ${url}`);
            }
          }
        },
      },
      comment: 'Memo attachments (signed URLs)',
    },
    // attachments: {
    //     type: DataTypes.JSONB,
    //     allowNull: true,
    //     validate: {
    //         isArrayOfObjects(value: any) {
    //             if (value == null) return;
    //             if (!Array.isArray(value)) {
    //                 throw new Error('Attachments must be an array of objects');
    //             }
    //             for (const att of value) {
    //                 if (
    //                     typeof att !== 'object' ||
    //                     typeof att.name !== 'string' ||
    //                     typeof att.url !== 'string'
    //                 ) {
    //                     throw new Error(`Invalid attachment format: ${JSON.stringify(att)}`);
    //                 }
    //             }
    //         },
    //     },
    //     comment: 'Memo attachments (signed URLs)',
    // },
    validator_comments: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [10, 65535],
      },
      comment: 'Validator comments',
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'Processed date',
    },
    auto_generated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Auto generated',
    },
    auto_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [1, 255],
      },
      comment: 'Auto reason',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.MEMOS,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Memos table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_memo_guid',
      },
      {
        fields: ['author_user'],
        name: 'idx_memo_author_user',
      },
      {
        fields: ['target_user'],
        name: 'idx_memo_target_user',
      },
      {
        fields: ['validator_user'],
        name: 'idx_memo_validator_user',
      },
      {
        fields: ['memo_type'],
        name: 'idx_memo_memo_type',
      },
      {
        fields: ['memo_status'],
        name: 'idx_memo_memo_status',
      },
      {
        fields: ['title'],
        name: 'idx_memo_title',
      },
      {
        fields: ['description'],
        name: 'idx_memo_description',
      },
      {
        fields: ['incident_datetime'],
        name: 'idx_memo_incident_datetime',
      },
      {
        fields: ['affected_session'],
        name: 'idx_memo_affected_session',
      },
      {
        fields: ['affected_entries'],
        name: 'idx_memo_affected_entries',
      },
      {
        fields: ['attachments'],
        name: 'idx_memo_attachments',
      },
      {
        fields: ['validator_comments'],
        name: 'idx_memo_validator_comments',
      },
      {
        fields: ['processed_at'],
        name: 'idx_memo_processed_at',
      },
      {
        fields: ['auto_generated'],
        name: 'idx_memo_auto_generated',
      },
      {
        fields: ['auto_reason'],
        name: 'idx_memo_auto_reason',
      },
      {
        fields: ['created_at'],
        name: 'idx_memo_created_at',
      },
      {
        fields: ['updated_at'],
        name: 'idx_memo_updated_at',
      },
    ],
  } as ModelOptions,
};
