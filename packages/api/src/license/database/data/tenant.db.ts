import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';
// import bcrypt from 'bcrypt';
import { Status } from '@toke/shared';

import { tableName } from '../../../utils/response.model.js';

export const TenantDbStructure = {
  tableName: tableName.TENANT,
  attributes: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      validate: {
        isInt: true,
        min: 1,
      },
      comment: 'Tenant',
    },
    guid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: { name: 'unique_tenant_guid', msg: 'Tenant GUID must be unique' },
      validate: {
        isInt: true,
        min: 100000,
        max: 999999,
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [2, 255],
        notEmpty: true,
        notNull: true,
      },
      comment: 'Display name (e.g. Cameroon Operations SARL)',
    },
    short_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [1, 50],
      },
      comment: 'Short name or abbreviation (e.g. CM-OPS)',
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: { name: 'unique_tenant_key', msg: 'Tenant key must be unique' },
      validate: {
        len: [2, 100],
        notEmpty: true,
        notNull: true,
      },
      comment: 'Key',
    },
    country_code: {
      type: DataTypes.STRING(2),
      allowNull: false,
      references: {
        model: tableName.COUNTRY,
        key: 'code',
      },
      validate: {
        is: /^[A-Z]{2}$/,
        len: [2, 2],
      },
      comment: 'ISO 3166-1 alpha-2 country code (e.g. CM, FR, US)',
    },
    primary_currency_code: {
      type: DataTypes.STRING(3),
      allowNull: false,
      references: {
        model: tableName.CURRENCY,
        key: 'code',
      },
      validate: {
        is: /^[A-Z]{3}$/,
        len: [3, 3],
      },
      comment: 'ISO 4217 primary currency code (e.g. XAF, USD, EUR)',
    },
    preferred_language_code: {
      type: DataTypes.STRING(2),
      allowNull: false,
      references: {
        model: tableName.LANGUAGE,
        key: 'code',
      },
      defaultValue: 'en',
      validate: {
        is: /^[a-z]{2}$/,
        len: [2, 2],
      },
      comment: 'ISO 639-1 preferred language code (e.g. fr, en)',
    },
    timezone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'UTC',
      validate: {
        is: /^([A-Z][a-z]+\/[A-Za-z_]+|UTC[+-]\d{1,2}(:\d{2})?|UTC)$/,
        len: [1, 64],
        notEmpty: true,
        notNull: true,
      },
      comment: 'Timezone',
    },
    tax_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        is: /^[A-Za-z0-9-_]{2,50}$/,
        len: [2, 50],
        notEmpty: true,
        notNull: true,
      },
      unique: { name: 'unique_tenant_tax_number', msg: 'Tenant TAX_NUMBER must be unique' },
      comment: 'Numéro TVA ou fiscal (ex. FR12345678901)',
    },
    tax_exempt: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Is the tenant tax exempt?',
    },
    billing_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
        len: [2, 255],
        notEmpty: true,
        notNull: true,
      },
      comment: 'Billing email',
    },
    // billing_address: {
    //   type: DataTypes.TEXT,
    //   allowNull: true,
    //   validate: {
    //     len: [0, 65535],
    //   },
    //   comment: 'Billing address',
    // },
    billing_address: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        isValidAddress(value: any) {
          // if (value === null || value === undefined) return;
          if (typeof value !== 'object') {
            throw new Error('Billing address must be an object');
          }
          const requiredFields = ['city', 'location', 'place_name'];
          for (const field of requiredFields) {
            if (!value[field] || typeof value[field] !== 'string') {
              throw new Error(`Billing address must contain a valid ${field}`);
            }
          }
        },
      },
      comment: 'Billing address as JSON object with city, location, place_name',
    },
    billing_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^[0-9+\-\s()]+$/,
        len: [7, 20],
      },
      comment: 'Billing phone',
    },
    registration_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [6, 100],
        notEmpty: true,
      },
      comment: 'Registration number',
    },
    // employee_count: {
    //   type: DataTypes.STRING(100),
    //   allowNull: false,
    //   validate: {
    //     notEmpty: { msg: 'Employee count interval is required' },
    //   },
    //   comment: 'Employee count intervalle (e.g: [5, 15])',
    // },
    employee_count: {
      type: DataTypes.ARRAY(DataTypes.INTEGER), // Tableau d'entiers
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Employee count interval is required' },
        isValidInterval(value: number[]) {
          if (!Array.isArray(value) || value.length !== 2) {
            throw new Error('Employee count must be an array of two numbers [min, max]');
          }
          if (typeof value[0] !== 'number' || typeof value[1] !== 'number') {
            throw new Error('Employee count values must be numbers');
          }
          if (value[0] >= value[1]) {
            throw new Error('Employee count interval must be [min, max] with min < max');
          }
        },
      },
      comment: 'Employee count intervalle (e.g: [5, 15])',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(Status)),
      allowNull: false,
      defaultValue: Status.ACTIVE,
      validate: {
        isIn: {
          args: [Object.values(Status)],
          msg: 'Status must be one of ACTIVE, SUSPENDED, TERMINATED',
        },
      },
      comment: 'Status',
    },
    subdomain: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: { name: 'unique_tenant_subdomain', msg: 'Tenant subdomain must be unique' },
      validate: {
        is: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        len: [1, 255],
        // len: [0, 255],
      },
      comment: 'Subdomain',
    },
    database_name: {
      type: DataTypes.STRING(128),
      allowNull: true,
      validate: {
        is: /^[a-z0-9_]+(?:-[a-z0-9_]+)*$/,
        len: [0, 128],
      },
      comment: 'Database name',
    },
    database_username: {
      type: DataTypes.STRING(128),
      allowNull: true,
      validate: {
        is: /^[a-z0-9_]+(?:-[a-z0-9_]+)*$/,
        // is: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        len: [0, 128],
      },
      comment: 'Database username',
    },
    database_password: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [8, 255],
        isValidPassword(value: string) {
          if (value && !value.includes(':')) { // Simple check si pas encore chiffré
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,255}$/;
            if (!passwordRegex.test(value)) {
              throw new Error('Password must contain at least one uppercase, one lowercase, and one digit');
            }
          }
        },
      },
      comment: 'Database password (encrypted)',
      // Supprimer le setter bcrypt actuel
    },
    // database_password: {
    //   type: DataTypes.STRING(255),
    //   allowNull: true,
    //   validate: {
    //     len: [8, 255], // Minimum 8 caractères pour un mot de passe
    //     isValidPassword(value: string) {
    //       if (value && !value.startsWith('$2b')) {
    //         // Validation avant hachage
    //         const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,255}$/;
    //       if (!passwordRegex.test(value)) {
    //         throw new Error('Password must contain at least one uppercase, one lowercase, and one digit');
    //       }
    //     }
    //   },
    //   },
    //   comment: 'Database password (hashed)',
    //   set(value: string) {
    //     // Hash automatique du mot de passe
    //     if (value && !value.startsWith('$2b')) {
    //       const salt = bcrypt.genSaltSync(12);
    //       const hash = bcrypt.hashSync(value, salt);
    //       this.setDataValue('database_password', hash);
    //     }
    //   },
    // },
  } as ModelAttributes,
  options: {
    tableName: tableName.TENANT,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Tenant table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_tenant_guid',
        unique: true,
      },
      {
        fields: ['name'],
        name: 'idx_tenant_name',
      },
      {
        fields: ['key'],
        name: 'idx_tenant_key',
        unique: true,
      },
      {
        fields: ['country_code'],
        name: 'idx_tenant_country_code',
      },
      {
        fields: ['primary_currency_code'],
        name: 'idx_tenant_primary_currency_code',
      },
      {
        fields: ['preferred_language_code'],
        name: 'idx_tenant_preferred_language_code',
      },
      {
        fields: ['timezone'],
        name: 'idx_tenant_timezone',
      },
      {
        fields: ['tax_number'],
        name: 'idx_tenant_tax_number',
      },
      {
        fields: ['tax_exempt'],
        name: 'idx_tenant_is_tax_exempt',
      },
      {
        fields: ['billing_email'],
        name: 'idx_tenant_billing_email',
      },
      {
        fields: ['billing_address'],
        name: 'idx_tenant_billing_address',
      },
      {
        fields: ['billing_phone'],
        name: 'idx_tenant_billing_phone',
      },
      {
        fields: ['status'],
        name: 'idx_tenant_status',
      },
      {
        fields: ['created_at'],
        name: 'idx_tenant_created_at',
      },
      {
        fields: ['subdomain'],
        name: 'idx_tenant_subdomain',
        unique: true,
      },
      {
        fields: ['database_name'],
        name: 'idx_tenant_database_name',
      },
      {
        fields: ['database_username'],
        name: 'idx_tenant_database_username',
      },
      {
        fields: ['employee_count'],
        name: 'idx_tenant_employee_count',
      }
    ],
  } as ModelOptions,
};
