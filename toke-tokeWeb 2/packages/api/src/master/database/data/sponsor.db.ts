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
    country: {
      type: DataTypes.STRING(2),
      allowNull: false,
      validate: {
        is: /^[A-Z]{2}$/,
        len: [2, 2],
      },
      comment: 'Country ISO 3166-1 alpha-2 code (2 capital letters, e.g. CM)',
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

          const requiredFields = ['affiliate', 'lead', 'tenant'];
          for (const field of requiredFields) {
            if (!value[field]) {
              throw new Error(`Metadata.${field} is required`);
            }
          }

          // ✅ affiliate et lead doivent être des chaînes non vides
          if (typeof value.affiliate !== 'string' || value.affiliate.trim() === '') {
            throw new Error('Metadata.affiliate must be a non-empty string');
          }
          if (typeof value.lead !== 'string' || value.lead.trim() === '') {
            throw new Error('Metadata.lead must be a non-empty string');
          }

          // ✅ tenant doit être un objet
          if (typeof value.tenant !== 'object' || !value.tenant.subdomain) {
            throw new Error('Metadata.tenant must be an object with a valid subdomain');
          }

          // ✅ Regex plus flexible pour accepter "demo.toke.cm" ou "app.sub.toke.cm"
          const subdomainRegex = /^(?=.{1,255}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
          if (!subdomainRegex.test(value.tenant.subdomain.toLowerCase())) {
            throw new Error('Metadata.tenant.subdomain must be a valid subdomain');
          }

          // Vérifie d’autres champs requis dans tenant
          const tenantRequiredFields = ['name', 'country', 'email', 'phone'];
          for (const field of tenantRequiredFields) {
            if (!value.tenant[field]) {
              throw new Error(`Metadata.tenant.${field} is required`);
            }
          }

          // ✅ Validation du champ user (optionnel)
          if (value.user !== null && value.user !== undefined) {
            if (typeof value.user !== 'string' || value.user.trim() === '') {
              throw new Error('Metadata.user must be a non-empty string if provided');
            }
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
      {
        name: 'idx_invitation_country',
        fields: ['country'],
      },
    ],
  } as ModelOptions,
};
