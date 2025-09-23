import bcrypt from 'bcrypt';

import UserModel from '../model/UserModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import { responseStructure as RS } from '../../utils/response.model.js';

export default class User extends UserModel {
  constructor() {
    super();
  }

  // === MÉTHODES STATIQUES DE CHARGEMENT ===

  static _load(
    identifier: any,
    byGuid: boolean = false,
    byEmail: boolean = false,
    byEmployeeCode: boolean = false,
    byPhoneNumber: boolean = false,
  ): Promise<User | null> {
    return new User().load(identifier, byGuid, byEmail, byEmployeeCode, byPhoneNumber);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<User[] | null> {
    return new User().list(conditions, paginationOptions);
  }

  static _listByDepartment(
    department: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<User[] | null> {
    return new User().listByDepartment(department, paginationOptions);
  }

  static _listByJobTitle(
    jobTitle: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<User[] | null> {
    return new User().listByJobTitle(jobTitle, paginationOptions);
  }

  static _listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<User[] | null> {
    return new User().listByActiveStatus(isActive, paginationOptions);
  }

  static async exportable(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const users = await this._list(conditions, paginationOptions);
    if (users) {
      items = users.map((user) => user.toJSON());
    }
    return {
      revision: '',
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  // === GETTERS FLUENT ===

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getTenant(): string | undefined {
    return this.tenant;
  }

  getEmail(): string | undefined {
    return this.email;
  }

  getFirstName(): string | undefined {
    return this.first_name;
  }

  getLastName(): string | undefined {
    return this.last_name;
  }

  getFullName(): string {
    const firstName = this.first_name || '';
    const lastName = this.last_name || '';
    return `${firstName} ${lastName}`.trim();
  }

  getPhoneNumber(): string | undefined {
    return this.phone_number;
  }

  getEmployeeCode(): string | undefined {
    return this.employee_code;
  }

  getAvatarUrl(): string | undefined {
    return this.avatar_url;
  }

  getHireDate(): Date | undefined {
    return this.hire_date;
  }

  getDepartment(): string | undefined {
    return this.department;
  }

  getJobTitle(): string | undefined {
    return this.job_title;
  }

  isActive(): boolean | undefined {
    return this.active;
  }

  getLastLoginAt(): Date | undefined {
    return this.last_login_at;
  }

  getOtpToken(): string | undefined {
    return this.otp_token;
  }

  getOtpExpiresAt(): Date | undefined {
    return this.otp_expires_at;
  }

  getQrCodeToken(): string | undefined {
    return this.qr_code_token;
  }

  getQrCodeExpiresAt(): Date | undefined {
    return this.qr_code_expires_at;
  }

  // === SETTERS FLUENT ===

  setTenant(tenant: string): User {
    this.tenant = tenant;
    return this;
  }

  setEmail(email: string): User {
    this.email = email.toLowerCase();
    return this;
  }

  setFirstName(firstName: string): User {
    this.first_name = firstName;
    return this;
  }

  setLastName(lastName: string): User {
    this.last_name = lastName;
    return this;
  }

  setPhoneNumber(phoneNumber: string): User {
    this.phone_number = phoneNumber;
    return this;
  }

  setEmployeeCode(employeeCode: string): User {
    this.employee_code = employeeCode;
    return this;
  }

  setPin(pin: string): User {
    const salt = bcrypt.genSaltSync(12);
    this.pin_hash = bcrypt.hashSync(pin, salt);
    return this;
  }

  setPassword(password: string): User {
    const salt = bcrypt.genSaltSync(12);
    this.password_hash = bcrypt.hashSync(password, salt);
    return this;
  }

  setAvatarUrl(avatarUrl: string): User {
    this.avatar_url = avatarUrl;
    return this;
  }

  setHireDate(hireDate: Date): User {
    this.hire_date = hireDate;
    return this;
  }

  setDepartment(department: string): User {
    this.department = department;
    return this;
  }

  setJobTitle(jobTitle: string): User {
    this.job_title = jobTitle;
    return this;
  }

  setActive(active: boolean): User {
    this.active = active;
    return this;
  }

  setLastLoginAt(lastLoginAt: Date): User {
    this.last_login_at = lastLoginAt;
    return this;
  }

  // === MÉTHODES DE GESTION DES TOKENS ===

  generateOtpToken(expirationMinutes: number = 15): User {
    // Génère un OTP à 6 chiffres
    this.otp_token = Math.floor(100000 + Math.random() * 900000).toString();
    this.otp_expires_at = new Date(Date.now() + expirationMinutes * 60 * 1000);
    return this;
  }

  generateQrCodeToken(expirationHours: number = 24): User {
    // Génère un token QR code unique
    this.qr_code_token = this.generateRandomToken(32);
    this.qr_code_expires_at = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
    return this;
  }

  clearOtpToken(): User {
    this.otp_token = undefined;
    this.otp_expires_at = undefined;
    return this;
  }

  clearQrCodeToken(): User {
    this.qr_code_token = undefined;
    this.qr_code_expires_at = undefined;
    return this;
  }

  isOtpValid(otp: string): boolean {
    if (!this.otp_token || !this.otp_expires_at) {
      return false;
    }
    if (new Date() > this.otp_expires_at) {
      return false;
    }
    return this.otp_token === otp;
  }

  isQrCodeValid(): boolean {
    if (!this.qr_code_token || !this.qr_code_expires_at) {
      return false;
    }
    return new Date() < this.qr_code_expires_at;
  }

  // === MÉTHODES D'AUTHENTIFICATION ===

  async verifyPin(pin: string): Promise<boolean> {
    if (!this.pin_hash) {
      return false;
    }
    return await bcrypt.compare(pin, this.pin_hash);
  }

  async verifyPassword(password: string): Promise<boolean> {
    if (!this.password_hash) {
      return false;
    }
    return await bcrypt.compare(password, this.password_hash);
  }

  async updateLastLogin(): Promise<void> {
    this.last_login_at = new Date();
    if (this.id) {
      await this.updateOne(
        this.db.tableName,
        { [this.db.id]: this.id },
        { [this.db.last_login_at]: this.last_login_at },
      );
    }
  }

  // === MÉTHODES MÉTIER ===

  isNew(): boolean {
    return this.id === undefined;
  }

  hasValidCredentials(): boolean {
    return Boolean(this.pin_hash || this.password_hash);
  }

  isEmployee(): boolean {
    return Boolean(this.employee_code);
  }

  isManager(): boolean {
    return Boolean(this.email);
  }

  getDaysUntilHire(): number | null {
    if (!this.hire_date) return null;
    const today = new Date();
    const diffTime = this.hire_date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysSinceLastLogin(): number | null {
    if (!this.last_login_at) return null;
    const today = new Date();
    const diffTime = today.getTime() - this.last_login_at.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }

  async load(
    identifier: any,
    byGuid: boolean = false,
    byEmail: boolean = false,
    byEmployeeCode: boolean = false,
    byPhoneNumber: boolean = false,
  ): Promise<User | null> {
    let data = null;

    if (byGuid) {
      data = await this.findByGuid(identifier);
    } else if (byEmail) {
      data = await this.findByEmail(identifier);
    } else if (byEmployeeCode) {
      data = await this.findByEmployeeCode(identifier);
    } else if (byPhoneNumber) {
      data = await this.findByPhoneNumber(identifier);
    } else {
      data = await this.find(Number(identifier));
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<User[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new User().hydrate(data));
  }

  async listByDepartment(
    department: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<User[] | null> {
    const dataset = await this.listAllByDepartment(department, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new User().hydrate(data));
  }

  async listByJobTitle(
    jobTitle: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<User[] | null> {
    const dataset = await this.listAllByJobTitle(jobTitle, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new User().hydrate(data));
  }

  async listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<User[] | null> {
    const dataset = await this.listAllByActiveStatus(isActive, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new User().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: User Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  toJSON(): object {
    return {
      [RS.GUID]: this.guid,
      [RS.TENANT]: this.tenant,
      [RS.EMAIL]: this.email,
      [RS.FIRST_NAME]: this.first_name,
      [RS.LAST_NAME]: this.last_name,
      [RS.PHONE_NUMBER]: this.phone_number,
      [RS.EMPLOYEE_CODE]: this.employee_code,
      [RS.AVATAR_URL]: this.avatar_url,
      [RS.HIRE_DATE]: this.hire_date,
      [RS.DEPARTMENT]: this.department,
      [RS.JOB_TITLE]: this.job_title,
      [RS.ACTIVE]: this.active,
      [RS.LAST_LOGIN_AT]: this.last_login_at,
      // Les tokens et mots de passe ne sont jamais exposés dans le JSON
    };
  }

  toPublicJSON(): object {
    return {
      [RS.GUID]: this.guid,
      [RS.FIRST_NAME]: this.first_name,
      [RS.LAST_NAME]: this.last_name,
      [RS.AVATAR_URL]: this.avatar_url,
      [RS.DEPARTMENT]: this.department,
      [RS.JOB_TITLE]: this.job_title,
      [RS.ACTIVE]: this.active,
    };
  }

  // === MÉTHODES PRIVÉES ===

  private hydrate(data: any): User {
    this.id = data.id;
    this.guid = data.guid;
    this.tenant = data.tenant;
    this.email = data.email;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.phone_number = data.phone_number;
    this.employee_code = data.employee_code;
    this.pin_hash = data.pin_hash;
    this.password_hash = data.password_hash;
    this.otp_token = data.otp_token;
    this.otp_expires_at = data.otp_expires_at;
    this.qr_code_token = data.qr_code_token;
    this.qr_code_expires_at = data.qr_code_expires_at;
    this.avatar_url = data.avatar_url;
    this.hire_date = data.hire_date;
    this.department = data.department;
    this.job_title = data.job_title;
    this.active = data.active;
    this.last_login_at = data.last_login_at;
    return this;
  }

  private generateRandomToken(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
