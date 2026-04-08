import { TimezoneConfigUtils, USERS_DEFAULTS } from '@toke/shared';

import UserModel from '../model/UserModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import {
  responseStructure as RS,
  responseValue,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import GenerateOtp from '../../utils/generate.otp.js';
import { TenantRevision } from '../../tools/revision.js';

import RotationAssignment from './RotationAssignments.js';
import ScheduleAssignments from './ScheduleAssignments.js';
import Groups from './Groups.js';

export default class User extends UserModel {
  // private sessionTemplateObjs: Map<number, SessionTemplate> = new Map();
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
    byOtp: boolean = false,
  ): Promise<User | null> {
    return new User().load(identifier, byGuid, byEmail, byEmployeeCode, byPhoneNumber, byOtp);
  }
  static _loadForRestore(identifier: string): Promise<User | null> {
    return new User().loadForRestore(identifier);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<User[] | null> {
    return new User().list(conditions, paginationOptions);
  }

  static _listDeleted(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<User[] | null> {
    return new User().listDeleted(conditions, paginationOptions);
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

  // /**
  //  * Liste les utilisateurs par session template
  //  */
  // static async _listBySessionTemplate(
  //   sessionTemplate: number,
  //   paginationOptions: { offset?: number; limit?: number } = {},
  // ): Promise<User[] | null> {
  //   return new User().listBySessionTemplate(sessionTemplate, paginationOptions);
  // }
  //
  // /**
  //  * Liste les utilisateurs avec session active
  //  */
  // static async _listWithActiveSession(
  //   paginationOptions: { offset?: number; limit?: number } = {},
  // ): Promise<User[] | null> {
  //   return new User().listWithActiveSession(paginationOptions);
  // }

  static async exportable(
    conditions: Record<string, any> = {
      ['active']: USERS_DEFAULTS.ACTIVE,
    },
    // conditions.active = USERS_DEFAULTS.ACTIVE,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const users = await this._list(conditions, paginationOptions);
    if (users) {
      items = await Promise.all(users.map(async (user) => await user.toJSON()));
    }
    return {
      revision: await TenantRevision.getRevision(tableName.USERS),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  /**
   * Charge un utilisateur avec vérification OTP expiré
   */
  static async _loadAndCleanExpiredOtp(
    identifier: any,
    byGuid: boolean = false,
    byEmail: boolean = false,
    byEmployeeCode: boolean = false,
    byPhoneNumber: boolean = false,
    byOtp: boolean = false,
  ): Promise<User | null> {
    const user = await User._load(
      identifier,
      byGuid,
      byEmail,
      byEmployeeCode,
      byPhoneNumber,
      byOtp,
    );
    if (user) {
      await user.clearExpiredOtp();
    }
    return user;
  }

  /**
   * Vérifie et nettoie l'OTP s'il est expiré
   * @returns true si OTP expiré et nettoyé, false sinon
   */
  async clearExpiredOtp(): Promise<boolean> {
    if (
      this.otp_token &&
      this.otp_expires_at &&
      TimezoneConfigUtils.getCurrentTime() > this.otp_expires_at
    ) {
      await this.clearOtp();
      return true;
    }
    return false;
  }

  // ============================================
  // GETTERS FLUENT
  // ============================================

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

  getCountry(): string | undefined {
    return this.country;
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

  getCreatedAt(): Date | undefined {
    return this.created_at;
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

  getDeviceToken(): string | undefined {
    return this.device_token;
  }

  // ============================================
  // MÉTHODES DE RÉSOLUTION DES ASSIGNATIONS
  // ============================================

  // /**
  //  * Récupère l'assignation d'horaire active pour cet utilisateur
  //  * Priorité : Schedule Assignment > Rotation Assignment
  //  */
  // async getActiveScheduleAssignment(): Promise<ScheduleAssignments | null> {
  //   const today = TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];
  //
  //   const activeAssignments = await ScheduleAssignments._listForUserOnDate(this.id!, today);
  //
  //   const activeGroup = await Groups._load(this.getId(), false, true);
  //   if (activeGroup) {
  //     const activeAssignments2 = await activeGroup.getActiveScheduleAssignment();
  //     console.log('activeAssignments2', activeAssignments2);
  //   }
  //
  //   // Retourner la plus récente active
  //   if (activeAssignments && activeAssignments.length > 0) {
  //     return activeAssignments.sort((a, b) => {
  //       const dateA = new Date(a.getStartDate()!).getTime();
  //       const dateB = new Date(b.getStartDate()!).getTime();
  //       return dateB - dateA; // Plus récent en premier
  //     })[0];
  //   }
  //
  //   return null;
  // }
  /**
   * Récupère l'assignation d'horaire active la plus récente
   * (peut provenir du user ou du group)
   */
  async getActiveScheduleAssignment(): Promise<ScheduleAssignments | null> {
    const active = await this.getActiveAssignment();
    if (!active) return null;

    return active.type === 'schedule' ? (active.assignment as ScheduleAssignments) : null;
  }

  // /**
  //  * Récupère l'assignation de rotation active pour cet utilisateur
  //  */
  // async getActiveRotationAssignment(): Promise<RotationAssignment | null> {
  //   const assignments = await RotationAssignment._listByUser(this.id!);
  //
  //   const activeGroup = await Groups._load(this.getId(), false, true);
  //   if (activeGroup) {
  //     const activeAssignments = await activeGroup.getActiveRotationAssignment();
  //     console.log('activeAssignments', activeAssignments);
  //   }
  //
  //   // Il ne devrait y avoir qu'une seule rotation active par utilisateur
  //   return assignments && assignments.length > 0 ? assignments[0] : null;
  // }

  /**
   * Récupère l'assignation de rotation active la plus récente
   * (user ou group)
   */
  async getActiveRotationAssignment(): Promise<RotationAssignment | null> {
    const active = await this.getActiveAssignment();
    if (!active) return null;

    return active.type === 'rotation' ? (active.assignment as RotationAssignment) : null;
  }

  /**
   * Retourne l'assignation active la plus récente
   * (schedule ou rotation, user ou group)
   */
  async getActiveAssignment(): Promise<{
    type: 'schedule' | 'rotation';
    assignment: any;
  } | null> {
    const today = TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];

    const candidates: Array<{
      type: 'schedule' | 'rotation';
      assignedAt: Date;
      assignment: any;
    }> = [];

    // 1️⃣ SCHEDULE USER
    const userSchedules = await ScheduleAssignments._listForUserOnDate(this.id!, today);
    if (userSchedules?.length) {
      userSchedules.forEach((s) => {
        candidates.push({
          type: 'schedule',
          assignedAt: s.getCreatedAt() || new Date(0),
          assignment: s,
        });
      });
    }

    // 2️⃣ ROTATION USER
    const userRotations = await RotationAssignment._listByUser(this.id!);
    if (userRotations?.length) {
      userRotations.forEach((r) => {
        candidates.push({
          type: 'rotation',
          assignedAt: r.getCreatedAt() || new Date(0),
          assignment: r,
        });
      });
    }

    // 3️⃣ GROUP
    const activeGroup = await Groups._load(this.getId(), false, true);
    if (activeGroup) {
      const groupSchedule = await activeGroup.getActiveScheduleAssignment();
      if (groupSchedule) {
        candidates.push({
          type: 'schedule',
          assignedAt: groupSchedule.getCreatedAt() || new Date(0),
          assignment: groupSchedule,
        });
      }

      const groupRotation = await activeGroup.getActiveRotationAssignment();
      if (groupRotation) {
        candidates.push({
          type: 'rotation',
          assignedAt: groupRotation.getCreatedAt() || new Date(0),
          assignment: groupRotation,
        });
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // 4️⃣ Trier par assignedAt
    candidates.sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime());

    const winner = candidates[0];

    return {
      type: winner.type,
      assignment: winner.assignment,
    };
  }

  /**
   * Récupère toutes les assignations d'horaire (historique complet)
   */
  async getAllScheduleAssignments(): Promise<ScheduleAssignments[]> {
    return (await ScheduleAssignments._listByUser(this.id!)) || [];
  }

  /**
   * Récupère toutes les assignations de rotation
   */
  async getAllRotationAssignments(): Promise<RotationAssignment[]> {
    return (await RotationAssignment._listByUser(this.id!)) || [];
  }

  /**
   * Détermine le type d'assignation en cours : 'schedule', 'rotation', ou 'none'
   */
  // async getCurrentAssignmentType(): Promise<'schedule' | 'rotation' | 'none'> {
  //   const scheduleAssignment = await this.getActiveScheduleAssignment();
  //   if (scheduleAssignment) return 'schedule';
  //
  //   const rotationAssignment = await this.getActiveRotationAssignment();
  //   if (rotationAssignment) return 'rotation';
  //
  //   return 'none';
  // }
  async getCurrentAssignmentType(): Promise<'schedule' | 'rotation' | 'none'> {
    const active = await this.getActiveAssignment();
    return active ? active.type : 'none';
  }

  // getAssignedSessions(): TI.AssignedSession[] {
  //   return this.assigned_sessions || [];
  // }
  //
  // async getSessionTemplateObjs(template: number): Promise<SessionTemplate | null> {
  //   if (!this.sessionTemplateObjs.has(template)) {
  //     const templateObj = await SessionTemplate._load(template);
  //     if (templateObj) {
  //       this.sessionTemplateObjs.set(template, templateObj);
  //     }
  //   }
  //   return this.sessionTemplateObjs.get(template) || null;
  // }

  // ============================================
  // SETTERS FLUENT
  // ============================================

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

  setCountry(country_code: string): User {
    this.country = country_code;
    return this;
  }

  setEmployeeCode(employeeCode: string): User {
    this.employee_code = employeeCode;
    return this;
  }

  setPin(pin: string): User {
    this.pin_hash = pin;
    return this;
  }

  setPassword(password: string): User {
    this.password_hash = password;
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

  setOtpToken(otpToken: string): User {
    this.otp_token = otpToken;
    return this;
  }

  setOtpExpiresAt(otpExpiresAt: Date): User {
    this.otp_expires_at = otpExpiresAt;
    return this;
  }

  setQrCodeToken(qrCodeToken: string): User {
    this.qr_code_token = qrCodeToken;
    return this;
  }

  setQrCodeExpiresAt(qrCodeExpiresAt: Date): User {
    this.qr_code_expires_at = qrCodeExpiresAt;
    return this;
  }

  setDeviceToken(deviceToken: string): User {
    this.device_token = deviceToken;
    return this;
  }

  // setAssignedSessions(sessions: TI.AssignedSession[]): User {
  //   this.assigned_sessions = sessions;
  //   return this;
  // }

  // ============================================
  // MÉTHODES DE GESTION DES TOKENS
  // ============================================

  /**
   * ✅ Génère un OTP simple (non unique)
   */
  generateOtpToken(expirationMinutes: number = 5): User {
    // Génère un OTP à 6 chiffres
    this.otp_token = GenerateOtp.generateOTP(6).toString();
    this.otp_expires_at = new Date(Date.now() + expirationMinutes * 60 * 1000);
    return this;
  }

  /**
   * ✅ Génère un QR Code Token
   */
  generateQrCodeToken(expirationHours: number = 24): User {
    // Génère un token QR code unique
    this.qr_code_token = this.generateRandomToken(32);
    this.qr_code_expires_at = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
    return this;
  }

  /**
   * Génère un OTP unique en vérifiant qu'il n'existe pas déjà
   * @param expirationMinutes Durée de validité en minutes
   */
  async generateUniqueOtpToken(expirationMinutes: number = 5): Promise<User> {
    let attempts = 0;
    const maxAttempts = 10;
    let otpGenerated = false;

    while (!otpGenerated && attempts < maxAttempts) {
      const newOtp = GenerateOtp.generateOTP(6).toString();

      // Vérifie si cet OTP existe déjà pour un autre utilisateur
      const existingUser = await this.findByAttribut(this.db.otp_token, newOtp);

      if (!existingUser || existingUser.id === this.id) {
        this.otp_token = newOtp;
        this.otp_expires_at = new Date(Date.now() + expirationMinutes * 60 * 1000);
        otpGenerated = true;
      }

      attempts++;
    }

    if (!otpGenerated) {
      throw new Error('Impossible de générer un OTP unique après plusieurs tentatives');
    }

    return this;
  }

  // /**
  //  * Assigner une nouvelle session template
  //  */
  // assignSession(sessionTemplate: number, assignAt?: Date, active: boolean = true): User {
  //   const newSession: TI.AssignedSession = {
  //     session_template: sessionTemplate,
  //     assign_at: assignAt || TimezoneConfigUtils.getCurrentTime(),
  //     active,
  //   };
  //
  //   this.assigned_sessions = GroupsValidationUtils.assignSession(
  //     this.assigned_sessions,
  //     newSession,
  //   );
  //   return this;
  // }
  //
  // /**
  //  * Activer une session template spécifique
  //  */
  // activateSession(sessionTemplate: number): User {
  //   this.assigned_sessions = GroupsValidationUtils.activateSession(
  //     this.assigned_sessions,
  //     sessionTemplate,
  //   );
  //   return this;
  // }
  //
  // /**
  //  * Récupérer la session active
  //  */
  // getActiveSession(): TI.AssignedSession | null {
  //   return GroupsValidationUtils.getActiveSession(this.assigned_sessions);
  // }
  //
  // /**
  //  * Vérifier si une session est active
  //  */
  // hasActiveSession(): boolean {
  //   return this.getActiveSession() !== null;
  // }
  //
  // /**
  //  * Désactiver toutes les sessions
  //  */
  // deactivateAllSessions(): User {
  //   this.assigned_sessions = GroupsValidationUtils.deactivateAllSessions(this.assigned_sessions);
  //   return this;
  // }
  //
  // /**
  //  * Retirer une session template
  //  */
  // removeSession(sessionTemplate: number): User {
  //   this.assigned_sessions = this.assigned_sessions.filter(
  //     (session) => session.session_template !== sessionTemplate,
  //   );
  //   return this;
  // }
  //
  // /**
  //  * Vérifier si une session template est assignée
  //  */
  // hasSessionTemplate(sessionTemplate: number): boolean {
  //   return this.assigned_sessions.some((session) => session.session_template === sessionTemplate);
  // }
  //
  // /**
  //  * Obtenir l'historique complet des sessions
  //  */
  // getSessionHistory(): TI.AssignedSession[] {
  //   return [...this.assigned_sessions].sort((a, b) => {
  //     const dateA = new Date(a.assign_at!).getTime();
  //     const dateB = new Date(b.assign_at!).getTime();
  //     return dateB - dateA; // Plus récent en premier
  //   });
  // }
  //
  // /**
  //  * Compter le nombre de sessions assignées
  //  */
  // countAssignedSessions(): number {
  //   return this.assigned_sessions.length;
  // }
  //
  // /**
  //  * Obtenir toutes les sessions inactives
  //  */
  // getInactiveSessions(): TI.AssignedSession[] {
  //   return this.assigned_sessions.filter((session) => session.active === false);
  // }

  /**
   * ✅ Reset OTP en mémoire
   */
  clearOtpToken(): User {
    this.otp_token = undefined;
    this.otp_expires_at = undefined;
    return this;
  }

  /**
   * ✅ Reset QR Code en mémoire
   */
  clearQrCodeToken(): User {
    this.qr_code_token = undefined;
    this.qr_code_expires_at = undefined;
    return this;
  }

  /**
   * ✅ Vérifie si l'OTP est valide (non expiré + correspond)
   */
  async isOtpValid(otp: string): Promise<boolean> {
    if (!this.otp_token || !this.otp_expires_at) {
      return false;
    }
    if (TimezoneConfigUtils.getCurrentTime() > this.otp_expires_at) {
      return false;
    }
    return this.otp_token === otp;
  }

  /**
   * Nettoie l'OTP (reset en mémoire + DB)
   */
  async clearOtp(): Promise<void> {
    try {
      this.clearOtpToken(); // méthode interne qui remet otp_token et otp_expires_at à null

      await this.cleanOtpDb();
    } catch (error: any) {
      console.error('⚠️ Erreur définition otp user:', error.message);
      throw new Error(error);
    }
  }

  /**
   * ✅ Vérifie si le QR Code est valide
   */
  isQrCodeValid(): boolean {
    if (!this.qr_code_token || !this.qr_code_expires_at) {
      return false;
    }
    return TimezoneConfigUtils.getCurrentTime() < this.qr_code_expires_at;
  }

  // ============================================
  // MÉTHODES D'AUTHENTIFICATION
  // ============================================

  /**
   * ✅ MODIFIÉ : Appelle la méthode du modèle
   */
  async verifyPin(pin: string): Promise<boolean> {
    if (!this.pin_hash) {
      return false;
    }
    // return await bcrypt.compare(pin, this.pin_hash);
    return await super.verifyPin(pin, this.pin_hash);
  }

  /**
   * ✅ MODIFIÉ : Appelle la méthode du modèle
   */
  async verifyPassword(password: string): Promise<boolean> {
    if (!this.password_hash) {
      return false;
    }
    // return await bcrypt.compare(password, this.password_hash);
    return await super.verifyPassword(password, this.password_hash);
  }

  // async listBySessionTemplate(
  //   sessionTemplate: number,
  //   paginationOptions: { offset?: number; limit?: number } = {},
  // ): Promise<User[] | null> {
  //   const dataset = await this.listAllBySessionTemplate(sessionTemplate, paginationOptions);
  //   if (!dataset || dataset.length === 0) return null;
  //   return dataset.map((data) => new User().hydrate(data));
  // }

  // async listWithActiveSession(
  //   paginationOptions: { offset?: number; limit?: number } = {},
  // ): Promise<User[] | null> {
  //   const dataset = await this.listAllWithActiveSession(paginationOptions);
  //   if (!dataset || dataset.length === 0) return null;
  //   return dataset.map((data) => new User().hydrate(data));
  // }

  // async updateLastLogin(): Promise<void> {
  //   this.last_login_at = TimezoneConfigUtils.getCurrentTime();
  //   if (this.id) {
  //     await this.updateOne(
  //       this.db.tableName,
  //       { [this.db.id]: this.id },
  //       { [this.db.last_login_at]: this.last_login_at },
  //     );
  //   }
  // }

  // ============================================
  // MÉTHODES MÉTIER
  // ============================================

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
    const today = TimezoneConfigUtils.getCurrentTime();
    const diffTime = this.hire_date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysSinceLastLogin(): number | null {
    if (!this.last_login_at) return null;
    const today = TimezoneConfigUtils.getCurrentTime();
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

  async defineOtpToken(): Promise<void> {
    try {
      await this.defineOtpDb();
    } catch (error: any) {
      console.error('⚠️ Erreur définition otp user:', error.message);
      throw new Error(error);
    }
  }

  async definePassword(): Promise<void> {
    try {
      await this.definePwDb();
    } catch (error: any) {
      console.error('⚠️ Erreur définition password manager:', error.message);
      throw new Error(error);
    }
  }

  async definePin(): Promise<void> {
    try {
      await this.definePinDb();
    } catch (error: any) {
      console.error('⚠️ Erreur définition pin user:', error.message);
      throw new Error(error);
    }
  }

  async defineQrCodeToken(): Promise<void> {
    try {
      await this.defineQrCodeDb();
    } catch (error: any) {
      console.error('⚠️ Erreur définition qr code user:', error.message);
      throw new Error(error);
    }
  }

  // ============================================
  // CHARGEMENT ET LISTING
  // ============================================

  async load(
    identifier: any,
    byGuid: boolean = false,
    byEmail: boolean = false,
    byEmployeeCode: boolean = false,
    byPhoneNumber: boolean = false,
    byOtp: boolean = false,
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
    } else if (byOtp) {
      data = await this.findByAttribut(this.db.otp_token, identifier);
    } else {
      data = await this.find(Number(identifier));
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  async loadForRestore(identifier: string): Promise<User | null> {
    const data = await this.findForRestore(identifier);
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

  async listDeleted(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<User[] | null> {
    const dataset = await this.listAllDeleted(conditions, paginationOptions);
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

  /**
   * ✅ MODIFIÉ : Soft delete maintenant
   */
  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: User Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  /**
   * ✅ MODIFIÉ : restore maintenant
   */
  async restoreUser(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: User Restore`);
      return await this.restore(this.id);
    }
    return false;
  }

  async addDeviceToken(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: User Add Device Token`);
      return await this.updateDeviceToken(this.id, this.device_token!);
    }
    return false;
  }
  // async addSessionTemplate(): Promise<boolean> {
  //   if (this.id !== undefined) {
  //     await W.isOccur(!this.id, `${G.identifierMissing.code}: User Add Session Template`);
  //     return await this.definedSessionTemplate(this.id, this.session_template!);
  //   }
  //   return false;
  // }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    // const activeSession = this.getActiveSession();
    const baseModel = {
      [RS.GUID]: this.guid,
      [RS.TENANT]: this.tenant,
      [RS.EMAIL]: this.email,
      [RS.FIRST_NAME]: this.first_name,
      [RS.LAST_NAME]: this.last_name,
      [RS.PHONE_NUMBER]: this.phone_number,
      [RS.COUNTRY]: this.country,
      [RS.EMPLOYEE_CODE]: this.employee_code,
      [RS.AVATAR_URL]: this.avatar_url,
      [RS.HIRE_DATE]: this.hire_date,
      [RS.DEPARTMENT]: this.department,
      [RS.JOB_TITLE]: this.job_title,
      [RS.ACTIVE]: this.active,
      [RS.LAST_LOGIN_AT]: this.last_login_at,
    };

    // Mode FULL - inclure les assignations
    const assignmentType = await this.getCurrentAssignmentType();
    const activeSchedule = await this.getActiveScheduleAssignment();
    const activeRotation = await this.getActiveRotationAssignment();

    if (view === responseValue.MINIMAL) {
      return {
        ...baseModel,
        assignment_info: {
          current_type: assignmentType,
          active_schedule_assignment: activeSchedule ? activeSchedule.getGuid() : null,
          active_rotation_assignment: activeRotation ? activeRotation.getGuid() : null,
        },
      };
    }

    // Mode FULL
    // const enrichedSessions = await Promise.all(
    //   this.assigned_sessions.map(async (session) => {
    //     const templateObj = await this.getSessionTemplateObjs(session.session_template);
    //     return {
    //       session_template: templateObj ? templateObj.toJSON() : null,
    //       assign_at: session.assign_at,
    //       active: session.active,
    //     };
    //   }),
    // );

    return {
      ...baseModel,
      assignment_info: {
        current_type: assignmentType,
        active_schedule_assignment: activeSchedule ? await activeSchedule.toPUBLIC() : null,
        active_rotation_assignment: activeRotation ? await activeRotation.toPUBLIC() : null,
      },
      // Historique complet si nécessaire (peut être coûteux)
      // all_schedule_assignments: {
      //   count: allSchedules.length,
      //   items: await Promise.all(allSchedules.map(s => s.toJSON(responseValue.MINIMAL)))
      // },
      // all_rotation_assignments: {
      //   count: allRotations.length,
      //   items: await Promise.all(allRotations.map(r => r.toJSON(responseValue.MINIMAL)))
      // }
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
      [RS.EMAIL]: this.email,
      [RS.PHONE_NUMBER]: this.phone_number,
      [RS.COUNTRY]: this.country,
      [RS.EMPLOYEE_CODE]: this.employee_code,
      [RS.HIRE_DATE]: this.hire_date,
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): User {
    this.id = data.id;
    this.guid = data.guid;
    this.tenant = data.tenant;
    this.email = data.email;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.phone_number = data.phone_number;
    this.country = data.country;
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
    this.device_token = data.device_token;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    // this.assigned_sessions = data.assigned_sessions || [];
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
