import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export enum InvitationStatus {
  PENDING = 'pending',
  SEND = 'send',
}

export const InvitationDbStructure = {
  tableName: tableName.INVITATION,
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
      comment: 'Invitation ID',
    },
    guid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_invitation_guid', msg: 'Invitation GUID must be unique' },
      validate: {
        len: [1, 128],
        notEmpty: true,
        notNull: true,
      },
      comment: 'Unique invitation token (GUID)',
    },
    phone_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        name: 'unique_invitation_phone_number',
        msg: 'Invitation PHONE_NUMBER must be unique',
      },
      validate: {
        len: [5, 50],
        notEmpty: true,
        notNull: true,
      },
      comment: 'Invited user phone number',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(InvitationStatus)),
      allowNull: false,
      defaultValue: InvitationStatus.PENDING,
      validate: {
        isIn: {
          args: [Object.values(InvitationStatus)],
          msg: 'Invalid invitation status',
        },
        notNull: true,
      },
      comment: 'Invitation status',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      validate: {
        notNull: true,
        isValidMetadata(value: any) {
          if (!value || typeof value !== 'object') {
            throw new Error('Metadata must be an object');
          }

          // Champs obligatoires
          const requiredFields = ['affiliate', 'lead', 'tenant'];
          for (const field of requiredFields) {
            if (!value[field]) {
              throw new Error(`Metadata.${field} is required`);
            }
            if (typeof value[field] !== 'string' || value[field].trim() === '') {
              throw new Error(`Metadata.${field} must be a non-empty string`);
            }
          }

          // Validation du champ user (optionnel)
          if (value.user !== null && value.user !== undefined) {
            if (typeof value.user !== 'number' && typeof value.user !== 'string') {
              throw new Error('Metadata.user must be a number or string if provided');
            }
          }

          // Validation des GUIDs (affiliate et lead)
          const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!guidRegex.test(value.affiliate)) {
            throw new Error('Metadata.affiliate must be a valid GUID');
          }
          if (!guidRegex.test(value.lead)) {
            throw new Error('Metadata.lead must be a valid GUID');
          }

          // Validation du tenant (subdomain)
          const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
          if (!subdomainRegex.test(value.tenant)) {
            throw new Error('Metadata.tenant must be a valid subdomain');
          }
        },
      },
      comment: 'Contains: user, affiliate, lead, tenant (all required except user)',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.INVITATION,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Table of user invitations',
    indexes: [
      {
        name: 'idx_invitation_guid',
        fields: ['guid'],
      },
      {
        name: 'idx_invitation_phone_status',
        fields: ['phone_number'],
        // comment: 'Index for searching active invitations by phone',
      },
      {
        name: 'idx_invitation_status',
        fields: ['status'],
        // comment: 'Index for filtering by status',
      },
      {
        name: 'idx_invitation_metadata',
        fields: ['metadata'],
        using: 'gin',
        // comment: 'GIN index for JSONB metadata queries',
      },
    ],
  } as ModelOptions,
};
