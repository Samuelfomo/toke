import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';
import { MemoStatus, MemoType, MessageType } from '@toke/shared';

import { tableName } from '../../../utils/response.model.js';

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
      // onUpdate: 'CASCADE',
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
      // onUpdate: 'CASCADE',
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
      // onUpdate: 'CASCADE',
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
      validate: {
        isIn: {
          args: [Object.values(MemoStatus)],
          msg: 'Memo status must be one of: submitted, pending, approved, rejected',
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
      // onUpdate: 'CASCADE',
      // onDelete: 'CASCADE',
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
    auto_generated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Auto generated',
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [10, Infinity],
      },
      comment: 'Additional details from system (for anomalies)',
    },
    memo_content: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Historique des messages (timeline)',
      validate: {
        isValidContent(value: any) {
          if (!Array.isArray(value)) {
            throw new Error('memo_content must be an array');
          }
          for (const item of value) {
            // Check required fields
            if (!item.created_at || !item.user || !item.message) {
              throw new Error('Each content item must have: created_at, user, message');
            }
            // Check message structure
            if (typeof item.message !== 'object' || !item.message.type || !item.message.content) {
              throw new Error('Message must be a valid object with type and content');
            }
            // Check message.type is valid enum value
            if (!Object.values(MessageType).includes(item.message.type)) {
              throw new Error(`Invalid message type: ${item.message.type}`);
            }
            // Check content type
            const isValidContent =
              typeof item.message.content === 'string' ||
              (Array.isArray(item.message.content) &&
                item.message.content.every((c: any) => typeof c === 'string'));

            if (!isValidContent) {
              throw new Error('Message content must be a string or array of strings');
            }

            // Validate URL if type is LINK
            if (item.message.type === MessageType.LINK) {
              const urls = Array.isArray(item.message.content)
                ? item.message.content
                : [item.message.content];

              for (const url of urls) {
                if (!/^https?:\/\/.+/.test(url)) {
                  throw new Error(`Invalid URL: ${url}`);
                }
              }
            }
          }
        },
      },
    },

    // attachments: {
    //   type: DataTypes.JSONB,
    //   allowNull: true,
    //   defaultValue: [],
    //   validate: {
    //     isValidAttachments(value: any) {
    //       if (!Array.isArray(value)) {
    //         throw new Error('Attachments must be an array');
    //       }
    //       for (const item of value) {
    //         if (!item.date || !item.user || !item.link) {
    //           throw new Error('Each attachment must have: date, user, link');
    //         }
    //         if (!/^https?:\/\/.+/.test(item.link)) {
    //           throw new Error(`Invalid URL: ${item.link}`);
    //         }
    //       }
    //     },
    //   },
    //   comment: 'Attachments with metadata (date, user, link, title?)',
    // },
  } as ModelAttributes,
  options: {
    tableName: tableName.MEMOS,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Memos table for employee requests, manager requests, and system anomalies',
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
      // {
      //   fields: ['attachments'],
      //   name: 'idx_memo_attachments',
      // },
      {
        fields: ['auto_generated'],
        name: 'idx_memo_auto_generated',
      },
      {
        fields: ['details'],
        name: 'idx_memo_details',
      },
      {
        fields: ['created_at'],
        name: 'idx_memo_created_at',
      },
      {
        fields: ['updated_at'],
        name: 'idx_memo_updated_at',
      },
      {
        fields: ['memo_type', 'memo_status'],
        name: 'idx_memo_type_status',
      },
      {
        fields: ['target_user', 'memo_status'],
        name: 'idx_memo_target_status',
      },
      {
        fields: ['author_user', 'memo_type'],
        name: 'idx_memo_author_type',
      },
      {
        fields: ['memo_content'],
        name: 'idx_memo_content',
      },
    ],
  } as ModelOptions,
};
