import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';
import bcrypt from 'bcrypt';

import { tableName } from '../../../utils/response.model.js';

export const UsersDbStructure = {
  tableName: tableName.USERS,
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
      comment: 'User ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: { name: 'unique_user_guid', msg: 'User GUID must be unique.' },
      validate: {
        len: [1, 255],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    tenant: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: {
        len: [1, 128],
        notEmpty: true,
      },
      // OnDelete: 'CASCADE',
      comment: 'Tenant Reference',
    },
    email: {
      type: DataTypes.STRING(255), // -- Obligatoire si manager (remarque : pas de validation pour le moment)
      allowNull: true,
      unique: { name: 'unique_user_email', msg: 'User email must be unique.' },
      validate: {
        isEmail: true,
        len: [5, 255],
      },
      comment: 'User email',
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
      },
      comment: 'User first name',
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
      },
      comment: 'User last name',
    },
    phone_number: {
      type: DataTypes.STRING(20), // -- Obligatoire si employé (remarque : pas de validation pour le moment)
      allowNull: true, // Ne devrait pas etre nullable car tous user est par default un employe
      unique: { name: 'unique_user_phone_number', msg: 'User phone number must be unique.' },
      validate: {
        len: [5, 20],
      },
      comment: 'User phone number',
    },
    country: {
      type: DataTypes.STRING(2),
      allowNull: false,
      validate: {
        is: /^[A-Z]{2}$/,
        len: [2, 2],
      },
      comment: 'ISO 3166-1 alpha-2 code (2 capital letters, e.g. CM)',
    },
    employee_code: {
      type: DataTypes.STRING(20), //-- Auto-généré si employé
      allowNull: true,
      unique: { name: 'unique_user_employee_code', msg: 'User employee code must be unique.' },
      validate: {
        len: [5, 20],
      },
      comment: 'User employee code',
    },
    pin_hash: {
      type: DataTypes.STRING(255), //-- PIN employé (pointage)
      allowNull: true,
      validate: {
        isValidPIN(value: string) {
          if (value && !value.startsWith('$2b')) {
            // Validation avant hachage
            const pinRegex = /^\d{4,6}$/; // PIN numérique de 4 à 6 chiffres
            if (!pinRegex.test(value)) {
              throw new Error('PIN must be 4 to 6 digits');
            }
          }
        },
      },
      comment: 'User PIN hash',
      set(value: string) {
        // Hash automatique du mot de passe
        if (value && !value.startsWith('$2b')) {
          const salt = bcrypt.genSaltSync(12);
          const hash = bcrypt.hashSync(value, salt);
          this.setDataValue('pin_hash', hash);
        }
      },
    },
    password_hash: {
      type: DataTypes.STRING(255), // -- Password manager (gestion)
      allowNull: true,
      validate: {
        len: [8, 255], // minimum 8 caractères recommandés
        isValidPassword(value: string) {
          if (value && !value.startsWith('$2b')) {
            // Vérifie complexité seulement avant hachage
            const passwordRegex =
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,255}$/;
            if (!passwordRegex.test(value)) {
              throw new Error(
                'Password must contain at least one uppercase, one lowercase, one digit, and one special character',
              );
            }
          }
        },
      },
      comment: 'User password hash',
      set(value: string) {
        if (value && !value.startsWith('$2b')) {
          const salt = bcrypt.genSaltSync(12); // facteur de complexité
          const hash = bcrypt.hashSync(value, salt);
          this.setDataValue('password_hash', hash);
        }
      },
    },
    otp_token: {
      type: DataTypes.STRING(10), //-- OTP temporaire onboarding
      allowNull: true,
      unique: {
        name: 'unique_user_otp_token',
        msg: 'User OTP token must be unique.',
      },
      validate: {
        len: [6, 10],
      },
      comment: 'User OTP token',
    },
    otp_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'User OTP expiration date',
    },
    qr_code_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: { name: 'unique_user_qr_code_token', msg: 'User QR code token must be unique.' },
      validate: {
        len: [1, 255],
      },
      comment: 'User QR code token',
    },
    qr_code_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'User QR code expiration date',
    },
    avatar_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [1, 500],
      },
      comment: 'User avatar URL',
    },
    hire_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'User hire date',
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100],
      },
      comment: 'User department',
    },
    job_title: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100],
      },
      comment: 'User job title',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'User status',
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'Soft delete timestamp',
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'User last login date',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.USERS,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true, // ✅ Active le soft delete automatique
    deletedAt: 'deleted_at', // ✅ Nom du champ de soft delete
    underscored: true,
    freezeTableName: true,
    comment: 'User table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_user_guid',
      },
      {
        fields: ['tenant'],
        name: 'idx_user_tenant',
      },
      {
        fields: ['email'],
        name: 'idx_user_email',
      },
      {
        fields: ['phone_number'],
        name: 'idx_user_phone_number',
      },
      {
        fields: ['employee_code'],
        name: 'idx_user_employee_code',
      },
      {
        fields: ['otp_token'],
        name: 'idx_user_otp_token',
      },
      {
        fields: ['otp_expires_at'],
        name: 'idx_user_otp_expires_at',
      },
      {
        fields: ['qr_code_token'],
        name: 'idx_user_qr_code_token',
      },
      {
        fields: ['qr_code_expires_at'],
        name: 'idx_user_qr_code_expires_at',
      },
      {
        fields: ['hire_date'],
        name: 'idx_user_hire_date',
      },
      {
        fields: ['department'],
        name: 'idx_user_department',
      },
      {
        fields: ['job_title'],
        name: 'idx_user_job_title',
      },
      {
        fields: ['active'],
        name: 'idx_user_active',
      },
      {
        fields: ['deleted_at'],
        name: 'idx_user_deleted_at',
      },
      {
        fields: ['last_login_at'],
        name: 'idx_user_last_login_at',
      },
      {
        fields: ['country'],
        name: ['idx_user_country'],
      },
    ],
  } as ModelOptions,
};
