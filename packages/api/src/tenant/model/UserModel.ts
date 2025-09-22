import { USERS_ERRORS, UsersValidationUtils } from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';

export default class UserModel extends BaseModel {
  public readonly db = {
    tableName: 'user',
    id: 'id',
    guid: 'guid',
    tenant: 'tenant',
    email: 'email',
    first_name: 'first_name',
    last_name: 'last_name',
    phone_number: 'phone_number',
    employee_code: 'employee_code',
    pin_hash: 'pin_hash',
    password_hash: 'password_hash',
    otp_token: 'otp_token',
    otp_expires_at: 'otp_expires_at',
    qr_code_token: 'qr_code_token',
    qr_code_expires_at: 'qr_code_expires_at',
    avatar_url: 'avatar_url',
    hire_date: 'hire_date',
    department: 'department',
    job_title: 'job_title',
    active: 'active',
    last_login_at: 'last_login_at',
  };
  protected id?: number;
  protected guid?: string;
  protected tenant?: string;
  protected email?: string;
  protected first_name?: string;
  protected last_name?: string;
  protected phone_number?: string;
  protected employee_code?: string;
  protected pin_hash?: string;
  protected password_hash?: string;
  protected otp_token?: string;
  protected otp_expires_at?: Date;
  protected qr_code_token?: string;
  protected qr_code_expires_at?: Date;
  protected avatar_url?: string;
  protected hire_date?: Date;
  protected department?: string;
  protected job_title?: string;
  protected active?: boolean;
  protected last_login_at?: Date;

  protected constructor() {
    super();
  }

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }
  protected async findByGuid(guid: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }
  protected async findByEmail(email: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.email]: email });
  }
  protected async findByEmployeeCode(employee_code: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.employee_code]: employee_code });
  }
  protected async findByPhoneNumber(phone_number: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.phone_number]: phone_number });
  }
  protected async findByQrCodeToken(qr_code_token: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.qr_code_token]: qr_code_token });
  }
  protected async findByAttribut(attribute: string, value: any): Promise<any> {
    return await this.findOne(this.db.tableName, { [attribute]: value });
  }

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }
  protected async listAllByOtpExpiresAt(
    otp_expires_at: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ) {
    return await this.listAll({ [this.db.otp_expires_at]: otp_expires_at }, paginationOptions);
  }
  protected async listAllByQrCodeExpiresAt(
    qr_code_expires_at: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ) {
    return await this.listAll(
      { [this.db.qr_code_expires_at]: qr_code_expires_at },
      paginationOptions,
    );
  }
  protected async listAllByHireDate(
    hire_date: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ) {
    return await this.listAll({ [this.db.hire_date]: hire_date }, paginationOptions);
  }
  protected async listAllByDepartment(
    department: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.department]: department }, paginationOptions);
  }
  protected async listAllByJobTitle(
    job_title: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.job_title]: job_title }, paginationOptions);
  }
  protected async listAllByActiveStatus(
    is_active: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.active]: is_active }, paginationOptions);
  }

  // Recherche par période de dernière connexion
  protected async listAllByLastLoginPeriod(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions = {
      [this.db.last_login_at]: {
        [Op.between]: [startDate, endDate],
      },
    };
    return await this.listAll(conditions, paginationOptions);
  }

  // Recherche par période d'embauche
  protected async listAllByHireDatePeriod(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions = {
      [this.db.hire_date]: {
        [Op.between]: [startDate, endDate],
      },
    };
    return await this.listAll(conditions, paginationOptions);
  }

  // Utilisateurs avec OTP expiré avant une date donnée
  protected async listAllExpiredOtpBefore(
    date: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions = {
      [this.db.otp_expires_at]: {
        [Op.and]: [{ [Op.not]: null }, { [Op.lt]: date }],
      },
    };
    return await this.listAll(conditions, paginationOptions);
  }

  // Utilisateurs avec QR code expiré avant une date donnée
  protected async listAllExpiredQrCodeBefore(
    date: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions = {
      [this.db.qr_code_expires_at]: {
        [Op.and]: [{ [Op.not]: null }, { [Op.lt]: date }],
      },
    };
    return await this.listAll(conditions, paginationOptions);
  }

  // Compter les utilisateurs par département
  protected async countByDepartment(): Promise<Record<string, number>> {
    const where = {
      [this.db.department]: { [Op.not]: null },
    };

    return await this.countByGroup(this.db.tableName, this.db.department, where);
  }

  // Compter les utilisateurs par titre de poste
  protected async countByJobTitle(): Promise<Record<string, number>> {
    const where = {
      [this.db.job_title]: { [Op.not]: null },
    };

    return await this.countByGroup(this.db.tableName, this.db.job_title, where);
  }

  // Compter les utilisateurs actifs/inactifs
  protected async getActiveStatusByTenant(): Promise<{ active: number; inactive: number }> {
    // Utilise votre méthode count existante
    const activeCount = await this.count(this.db.tableName, {
      [this.db.active]: true,
    });

    const inactiveCount = await this.count(this.db.tableName, {
      [this.db.active]: false,
    });

    return { active: activeCount, inactive: inactiveCount };
  }

  protected async create(): Promise<void> {
    await this.validate();
    const guid = await this.timeBasedTokenGenerator(this.db.tableName, 3, '_', 'TKU');
    if (!guid) {
      throw new Error(USERS_ERRORS.GUID_GENERATION_FAILED);
    }
    if (this.email) {
      const existingEmail = await this.findByEmail(this.email!);
      if (existingEmail) {
        throw new Error(USERS_ERRORS.EMAIL_ALREADY_EXISTS);
      }
    }
    if (this.phone_number) {
      const existingPhoneNumber = await this.findByPhoneNumber(this.phone_number!);
      if (existingPhoneNumber) {
        throw new Error(USERS_ERRORS.PHONE_NUMBER_ALREADY_EXISTS);
      }
    }
    if (this.employee_code) {
      const existingEmployeeCode = await this.findByEmployeeCode(this.employee_code!);
      if (existingEmployeeCode) {
        throw new Error(USERS_ERRORS.EMPLOYEE_CODE_ALREADY_EXISTS);
      }
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.tenant]: this.tenant,
      [this.db.email]: this.email ? this.email.toLowerCase() : null,
      [this.db.first_name]: this.first_name,
      [this.db.last_name]: this.last_name,
      [this.db.phone_number]: this.phone_number ? this.phone_number : null,
      [this.db.employee_code]: this.employee_code ? this.employee_code : null,
      [this.db.pin_hash]: this.pin_hash,
      [this.db.password_hash]: this.password_hash,
      [this.db.otp_token]: this.otp_token,
      [this.db.otp_expires_at]: this.otp_token ? this.otp_expires_at : null,
      [this.db.qr_code_token]: this.qr_code_token,
      [this.db.qr_code_expires_at]: this.qr_code_token ? this.qr_code_expires_at : null,
      [this.db.avatar_url]: this.avatar_url,
      [this.db.hire_date]: this.hire_date,
      [this.db.department]: this.department,
      [this.db.job_title]: this.job_title,
      [this.db.active]: this.active,
      // [this.db.last_login_at]: this.last_login_at,
    });
    if (!lastID) {
      throw new Error(USERS_ERRORS.CREATION_FAILED);
    }
    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }
  protected async update(): Promise<void> {
    await this.validate();
    if (!this.id) {
      throw new Error(USERS_ERRORS.ID_REQUIRED);
    }
    const updateData: Record<string, any> = {};
    if (this.tenant !== undefined) {
      updateData[this.db.tenant] = this.tenant;
    }
    if (this.email !== undefined) {
      updateData[this.db.email] = this.email ? this.email.toLowerCase() : null;
    }
    if (this.first_name !== undefined) {
      updateData[this.db.first_name] = this.first_name;
    }
    if (this.last_name !== undefined) {
      updateData[this.db.last_name] = this.last_name;
    }
    if (this.phone_number !== undefined) {
      updateData[this.db.phone_number] = this.phone_number;
    }
    if (this.employee_code !== undefined) {
      updateData[this.db.employee_code] = this.employee_code;
    }
    if (this.pin_hash !== undefined) {
      updateData[this.db.pin_hash] = this.pin_hash;
    }
    if (this.password_hash !== undefined) {
      updateData[this.db.password_hash] = this.password_hash;
    }
    if (this.otp_token !== undefined) {
      updateData[this.db.otp_token] = this.otp_token;
    }
    if (this.otp_expires_at !== undefined) {
      updateData[this.db.otp_expires_at] = this.otp_expires_at;
    }
    if (this.qr_code_token !== undefined) {
      updateData[this.db.qr_code_token] = this.qr_code_token;
    }
    if (this.qr_code_expires_at !== undefined) {
      updateData[this.db.qr_code_expires_at] = this.qr_code_expires_at;
    }
    if (this.avatar_url !== undefined) {
      updateData[this.db.avatar_url] = this.avatar_url;
    }
    if (this.hire_date !== undefined) {
      updateData[this.db.hire_date] = this.hire_date;
    }
    if (this.department !== undefined) {
      updateData[this.db.department] = this.department;
    }
    if (this.job_title !== undefined) {
      updateData[this.db.job_title] = this.job_title;
    }
    if (this.active !== undefined) {
      updateData[this.db.active] = this.active;
    }
    if (this.last_login_at !== undefined) {
      updateData[this.db.last_login_at] = this.last_login_at;
    }
    const updated = await this.updateOne(
      this.db.tableName,
      {
        [this.db.id]: this.id,
      },
      updateData,
    );
    if (!updated) {
      throw new Error(USERS_ERRORS.UPDATE_FAILED);
    }
  }
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }
  private async validate(): Promise<void> {
    if (!this.tenant) {
      throw new Error(USERS_ERRORS.TENANT_REQUIRED);
    }
    if (!UsersValidationUtils.validateTenant(this.tenant)) {
      throw new Error(USERS_ERRORS.TENANT_INVALID);
    }
    if (this.email && !UsersValidationUtils.validateEmail(this.email)) {
      throw new Error(USERS_ERRORS.EMAIL_INVALID);
    }
    if (!this.first_name) {
      throw new Error(USERS_ERRORS.FIRST_NAME_REQUIRED);
    }
    if (!UsersValidationUtils.validateFirstName(this.first_name)) {
      throw new Error(USERS_ERRORS.FIRST_NAME_INVALID);
    }
    if (!this.last_name) {
      throw new Error(USERS_ERRORS.LAST_NAME_REQUIRED);
    }
    if (!UsersValidationUtils.validateLastName(this.last_name)) {
      throw new Error(USERS_ERRORS.LAST_NAME_INVALID);
    }
    if (this.phone_number && !UsersValidationUtils.validatePhoneNumber(this.phone_number)) {
      throw new Error(USERS_ERRORS.PHONE_NUMBER_INVALID);
    }
    if (this.employee_code && !UsersValidationUtils.validateEmployeeCode(this.employee_code)) {
      throw new Error(USERS_ERRORS.EMPLOYEE_CODE_INVALID);
    }
    if (this.pin_hash && !UsersValidationUtils.validatePinHash(this.pin_hash)) {
      throw new Error(USERS_ERRORS.PIN_INVALID);
    }
    if (this.password_hash && !UsersValidationUtils.validatePasswordHash(this.password_hash)) {
      throw new Error(USERS_ERRORS.PASSWORD_INVALID);
    }
    if (this.otp_token && !UsersValidationUtils.validateOtpToken(this.otp_token)) {
      throw new Error(USERS_ERRORS.OTP_TOKEN_INVALID);
    }
    if (this.otp_token && !UsersValidationUtils.validateOtpExpiresAt(this.otp_expires_at!)) {
      throw new Error(USERS_ERRORS.OTP_TOKEN_EXPIRED);
    }
    if (this.qr_code_token && !UsersValidationUtils.validateQrCodeToken(this.qr_code_token)) {
      throw new Error(USERS_ERRORS.QR_CODE_TOKEN_INVALID);
    }
    if (
      this.qr_code_token &&
      !UsersValidationUtils.validateQrCodeExpiresAt(this.qr_code_expires_at!)
    ) {
      throw new Error(USERS_ERRORS.QR_CODE_TOKEN_EXPIRED);
    }
    if (this.avatar_url && !UsersValidationUtils.validateAvatarUrl(this.avatar_url)) {
      throw new Error(USERS_ERRORS.AVATAR_URL_INVALID);
    }
    if (this.hire_date && !UsersValidationUtils.validateHireDate(this.hire_date)) {
      throw new Error(USERS_ERRORS.HIRE_DATE_INVALID);
    }
    if (this.department && !UsersValidationUtils.validateDepartment(this.department)) {
      throw new Error(USERS_ERRORS.DEPARTMENT_INVALID);
    }
    if (this.job_title && !UsersValidationUtils.validateJobTitle(this.job_title)) {
      throw new Error(USERS_ERRORS.JOB_TITLE_INVALID);
    }
    if (this.active && !UsersValidationUtils.validateActive(this.active)) {
      throw new Error(USERS_ERRORS.ACTIVE_STATUS_INVALID);
    }

    const cleaned = UsersValidationUtils.cleanUserData(this);
    Object.assign(this, cleaned);
  }
}
