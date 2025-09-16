import { BillingStatusComputed, ContractualStatus, LeaveType } from '@toke/shared';

import EmployeeLicenseModel from '../model/EmployeeLicenseModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import { responseStructure as RS, responseValue, tableName, ViewMode } from '../../utils/response.model.js';
import Revision from '../../tools/revision.js';

import GlobalLicense from './GlobalLicense.js';

export default class EmployeeLicense extends EmployeeLicenseModel {
  private globalLicenseObject?: GlobalLicense;

  constructor() {
    super();
  }

  /**
   * Exports employee license items with revision information.
   */
  static async exportable(paginationOptions: { offset?: number; limit?: number } = {}): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    const revision = await Revision.getRevision(tableName.EMPLOYEE_LICENSE);
    let data: any[] = [];

    const allLicenses = await this._list({ ['contractual_status']: ContractualStatus.ACTIVE }, paginationOptions);
    if (allLicenses) {
      data = await Promise.all(allLicenses.map(async license => await license.toJSON()));
    }

    return {
      revision,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || data.length,
        count: data.length,
      },
      items: data,
    };
  }

  /**
   * Loads an employee license based on the provided identifier.
   */
  static _load(
    identifier: any,
    byGuid: boolean = false,
  ): Promise<EmployeeLicense | null> {
    return new EmployeeLicense().load(identifier, byGuid);
  }

  /**
   * Loads an employee license by employee ID.
   */
  static _loadByEmployee(employee: string): Promise<EmployeeLicense | null> {
    return new EmployeeLicense().loadByEmployee(employee);
  }

  /**
   * Loads an employee license by employee code.
   */
  static _loadByEmployeeCode(employee_code: string): Promise<EmployeeLicense | null> {
    return new EmployeeLicense().loadByEmployeeCode(employee_code);
  }

  /**
   * Liste les licences employés selon les conditions
   */
  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    return new EmployeeLicense().list(conditions, paginationOptions);
  }

  /**
   * Liste les licences employés par licence globale
   */
  static _listByGlobalLicense(
    global_license: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    return new EmployeeLicense().listByGlobalLicense(global_license, paginationOptions);
  }

  /**
   * Liste les licences employés par statut contractuel
   */
  static _listByContractualStatus(
    contractual_status: ContractualStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    return new EmployeeLicense().listByContractualStatus(contractual_status, paginationOptions);
  }

  /**
   * Liste les licences employés par statut de facturation
   */
  static _listByBillingStatus(
    billing_status: BillingStatusComputed,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    return new EmployeeLicense().listByBillingStatus(billing_status, paginationOptions);
  }

  static _getBillableCountForLicense(
    global_license: number,
  ): Promise<number>{
    return (new EmployeeLicense()).countBillableForLicense(global_license);
  }

  /**
   * Liste tous les employés en congé long
   */
  static _listOnLongLeave(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    return new EmployeeLicense().listOnLongLeave(paginationOptions);
  }

  /**
   * Liste les employés par type de congé
   */
  static _listByLeaveType(
    leave_type: LeaveType,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    return new EmployeeLicense().listByLeaveType(leave_type, paginationOptions);
  }

  /**
   * Liste les employés avec activité récente
   */
  static _listWithRecentActivity(
    days: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    return new EmployeeLicense().listWithRecentActivity(days, paginationOptions);
  }

  /**
   * Liste les employés sans activité récente
   */
  static _listWithoutRecentActivity(
    days: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    return new EmployeeLicense().listWithoutRecentActivity(days, paginationOptions);
  }

  /**
   * Liste les employés en période de grâce
   */
  static _listInGracePeriod(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    return new EmployeeLicense().listInGracePeriod(paginationOptions);
  }

  /**
   * Liste les employés dont la période de grâce expire bientôt
   */
  static _listGracePeriodExpiringSoon(
    days: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    return new EmployeeLicense().listGracePeriodExpiringSoon(days, paginationOptions);
  }

  /**
   * Convertit des données en objet EmployeeLicense
   */
  static _toObject(data: any): EmployeeLicense {
    return new EmployeeLicense().hydrate(data);
  }

  /**
   * Met à jour l'activité d'un employé par son ID
   */
  static async _updateActivity(employee: string, activity_date?: Date): Promise<boolean> {
    return new EmployeeLicense().updateLastActivity(employee, activity_date);
  }

  /**
   * Déclare un employé en congé long
   */
  static async _declareLongLeave(
    employee: string,
    declared_by: string,
    leave_type: LeaveType,
    reason?: string
  ): Promise<boolean> {
    return new EmployeeLicense().declareLongLeave(employee, declared_by, leave_type, reason);
  }

  /**
   * Annule la déclaration de congé long
   */
  static async _cancelLongLeave(employee: string): Promise<boolean> {
    return new EmployeeLicense().cancelLongLeave(employee);
  }

  /**
   * Désactive un employé
   */
  static async _deactivateEmployee(employee: string): Promise<boolean> {
    return new EmployeeLicense().deactivateEmployee(employee);
  }

  /**
   * Réactive un employé
   */
  static async _reactivateEmployee(employee: string): Promise<boolean> {
    return new EmployeeLicense().reactivateEmployee(employee);
  }

  /**
   * Obtient les statistiques de facturation pour une licence globale
   */
  static async _getBillingStats(global_license: number): Promise<Record<string, number>> {
    return new EmployeeLicense().getBillingStatusCountByGlobalLicense(global_license);
  }

  // === SETTERS FLUENT ===
  setGlobalLicense(global_license: number): EmployeeLicense {
    this.global_license = global_license;
    return this;
  }

  setEmployee(employee: string): EmployeeLicense {
    this.employee = employee;
    return this;
  }

  setEmployeeCode(employee_code: string): EmployeeLicense {
    this.employee_code = employee_code;
    return this;
  }

  setActivationDate(activation_date: Date): EmployeeLicense {
    this.activation_date = activation_date;
    return this;
  }

  setDeactivationDate(deactivation_date: Date): EmployeeLicense {
    this.deactivation_date = deactivation_date;
    return this;
  }

  setLastActivityDate(last_activity_date: Date): EmployeeLicense {
    this.last_activity_date = last_activity_date;
    return this;
  }

  setContractualStatus(contractual_status: ContractualStatus): EmployeeLicense {
    this.contractual_status = contractual_status;
    return this;
  }

  setDeclaredLongLeave(declared_long_leave: boolean): EmployeeLicense {
    this.declared_long_leave = declared_long_leave;
    return this;
  }

  setLongLeaveDeclaredBy(long_leave_declared_by: string): EmployeeLicense {
    this.long_leave_declared_by = long_leave_declared_by;
    return this;
  }

  setLongLeaveDeclaredAt(long_leave_declared_at: Date): EmployeeLicense {
    this.long_leave_declared_at = long_leave_declared_at;
    return this;
  }

  setLongLeaveType(long_leave_type: LeaveType): EmployeeLicense {
    this.long_leave_type = long_leave_type;
    return this;
  }

  setLongLeaveReason(long_leave_reason: string): EmployeeLicense {
    this.long_leave_reason = long_leave_reason;
    return this;
  }

  setGracePeriodStart(grace_period_start: Date): EmployeeLicense {
    this.grace_period_start = grace_period_start;
    return this;
  }

  setGracePeriodEnd(grace_period_end: Date): EmployeeLicense {
    this.grace_period_end = grace_period_end;
    return this;
  }

  // === GETTERS ===
  getId(): number | undefined {
    return this.id;
  }

  getGuid(): number | undefined {
    return this.guid;
  }

  getGlobalLicense(): number | undefined {
    return this.global_license;
  }

  async getGlobalLicenseObject(): Promise<GlobalLicense | null> {
    if (!this.global_license) return null;
    if (!this.globalLicenseObject) {
      this.globalLicenseObject = (await GlobalLicense._load(this.global_license)) || undefined;
    }
    return this.globalLicenseObject || null;
  }

  getEmployee(): string | undefined {
    return this.employee;
  }

  getEmployeeCode(): string | undefined {
    return this.employee_code;
  }

  getActivationDate(): Date | undefined {
    return this.activation_date;
  }

  getDeactivationDate(): Date | undefined {
    return this.deactivation_date;
  }

  getLastActivityDate(): Date | undefined {
    return this.last_activity_date;
  }

  getContractualStatus(): ContractualStatus | undefined {
    return this.contractual_status;
  }

  getDeclaredLongLeave(): boolean | undefined {
    return this.declared_long_leave;
  }

  getLongLeaveDeclaredBy(): string | undefined {
    return this.long_leave_declared_by;
  }

  getLongLeaveDeclaredAt(): Date | undefined {
    return this.long_leave_declared_at;
  }

  getLongLeaveType(): LeaveType | undefined {
    return this.long_leave_type;
  }

  getLongLeaveReason(): string | undefined {
    return this.long_leave_reason;
  }

  getComputedBillingStatus(): BillingStatusComputed | undefined {
    return this.computed_billing_status;
  }

  getGracePeriodStart(): Date | undefined {
    return this.grace_period_start;
  }

  getGracePeriodEnd(): Date | undefined {
    return this.grace_period_end;
  }

  /**
   * Obtient l'identifiant sous forme de chaîne (GUID)
   */
  getIdentifier(): string {
    return this.guid?.toString() || 'Unknown';
  }

  // === MÉTHODES MÉTIER ===

  /**
   * Vérifie si l'employé est actif
   */
  isActive(): boolean {
    return this.contractual_status === ContractualStatus.ACTIVE && !this.isDeactivated();
  }

  /**
   * Vérifie si l'employé est suspendu
   */
  isSuspended(): boolean {
    return this.contractual_status === ContractualStatus.SUSPENDED;
  }

  /**
   * Vérifie si l'employé est désactivé
   */
  isDeactivated(): boolean {
    return this.deactivation_date !== null && this.deactivation_date !== undefined;
  }

  /**
   * Vérifie si l'employé est en congé long
   */
  isOnLongLeave(): boolean {
    return this.declared_long_leave === true;
  }

  /**
   * Vérifie si l'employé a eu une activité récente
   */
  hasRecentActivity(days: number = 7): boolean {
    if (!this.last_activity_date) return false;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return new Date(this.last_activity_date) >= cutoffDate;
  }

  /**
   * Vérifie si l'employé est en période de grâce
   */
  isInGracePeriod(): boolean {
    if (!this.grace_period_start || !this.grace_period_end) return false;
    const now = new Date();
    return now >= new Date(this.grace_period_start) && now <= new Date(this.grace_period_end);
  }

  /**
   * Vérifie si l'employé est facturable
   */
  isBillable(): boolean {
    return this.computed_billing_status === BillingStatusComputed.BILLABLE;
  }

  /**
   * Vérifie si l'employé est non facturable
   */
  isNonBillable(): boolean {
    return this.computed_billing_status === BillingStatusComputed.NON_BILLABLE;
  }

  /**
   * Calcule les jours depuis la dernière activité
   */
  getDaysSinceLastActivity(): number {
    if (!this.last_activity_date) return -1;
    const now = new Date();
    const lastActivity = new Date(this.last_activity_date);
    const diffTime = now.getTime() - lastActivity.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcule les jours restants dans la période de grâce
   */
  getGracePeriodDaysRemaining(): number {
    if (!this.grace_period_end || !this.isInGracePeriod()) return 0;
    const now = new Date();
    const end = new Date(this.grace_period_end);
    const diffTime = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * Obtient la durée du congé en jours
   */
  getLeaveDurationDays(): number {
    if (!this.long_leave_declared_at) return 0;
    const now = new Date();
    const leaveStart = new Date(this.long_leave_declared_at);
    const diffTime = now.getTime() - leaveStart.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * Enregistre une activité pour cet employé
   */
  async recordActivity(activity_date?: Date): Promise<boolean> {
    if (!this.employee) return false;
    return await this.updateLastActivity(this.employee, activity_date);
  }

  /**
   * Déclare cet employé en congé long
   */
  async declareLongLeaveForThis(
    declared_by: string,
    leave_type: LeaveType,
    reason?: string
  ): Promise<boolean> {
    if (!this.employee) return false;
    const result = await this.declareLongLeave(this.employee, declared_by, leave_type, reason);
    if (result) {
      // Mettre à jour l'instance locale
      this.declared_long_leave = true;
      this.long_leave_declared_by = declared_by;
      this.long_leave_declared_at = new Date();
      this.long_leave_type = leave_type;
      this.long_leave_reason = reason;
    }
    return result;
  }

  /**
   * Annule le congé long pour cet employé
   */
  async cancelLongLeaveForThis(): Promise<boolean> {
    if (!this.employee) return false;
    const result = await this.cancelLongLeave(this.employee);
    if (result) {
      // Mettre à jour l'instance locale
      this.declared_long_leave = false;
      this.long_leave_declared_by = undefined;
      this.long_leave_declared_at = undefined;
      this.long_leave_type = undefined;
      this.long_leave_reason = undefined;
    }
    return result;
  }

  /**
   * Sauvegarde la licence employé (création ou mise à jour)
   */
  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      console.error('⚠️ Erreur sauvegarde licence employé:', error.message);
      throw new Error(error);
    }
  }

  /**
   * Supprime la licence employé
   */
  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: EmployeeLicense Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  /**
   * Loads an EmployeeLicense object based on the provided identifier and search method.
   */
  async load(
    identifier: any,
    byGuid: boolean = false,
  ): Promise<EmployeeLicense | null> {
    const data = byGuid
      ? await this.findByGuid(identifier)
      : await this.find(Number(identifier));

    if (!data) return null;
    return this.hydrate(data);
  }

  /**
   * Loads an EmployeeLicense object by employee ID.
   */
  async loadByEmployee(employee: string): Promise<EmployeeLicense | null> {
    const data = await this.findByEmployee(employee);
    if (!data) return null;
    return this.hydrate(data);
  }

  /**
   * Loads an EmployeeLicense object by employee code.
   */
  async loadByEmployeeCode(employee_code: string): Promise<EmployeeLicense | null> {
    const data = await this.findByEmployeeCode(employee_code);
    if (!data) return null;
    return this.hydrate(data);
  }

  /**
   * Liste les licences employés selon les conditions
   */
  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new EmployeeLicense().hydrate(data));
  }

  /**
   * Liste les licences employés par licence globale
   */
  async listByGlobalLicense(
    global_license: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    const dataset = await this.listAllByGlobalLicense(global_license, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new EmployeeLicense().hydrate(data));
  }

  /**
   * Liste les licences employés par statut contractuel
   */
  async listByContractualStatus(
    contractual_status: ContractualStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    const dataset = await this.listAllByContractualStatus(contractual_status, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new EmployeeLicense().hydrate(data));
  }

  /**
   * Liste les licences employés par statut de facturation
   */
  async listByBillingStatus(
    billing_status: BillingStatusComputed,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    const dataset = await this.listAllByBillingStatus(billing_status, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new EmployeeLicense().hydrate(data));
  }

  /**
   * Liste tous les employés en congé long
   */
  async listOnLongLeave(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    const dataset = await this.listAllOnLongLeave(paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new EmployeeLicense().hydrate(data));
  }

  /**
   * Liste les employés par type de congé
   */
  async listByLeaveType(
    leave_type: LeaveType,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    const dataset = await this.listAllByLeaveType(leave_type, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new EmployeeLicense().hydrate(data));
  }

  /**
   * Liste les employés avec activité récente
   */
  async listWithRecentActivity(
    days: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    const dataset = await this.listAllWithRecentActivity(days, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new EmployeeLicense().hydrate(data));
  }

  /**
   * Liste les employés sans activité récente
   */
  async listWithoutRecentActivity(
    days: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    const dataset = await this.listAllWithoutRecentActivity(days, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new EmployeeLicense().hydrate(data));
  }

  /**
   * Liste les employés en période de grâce
   */
  async listInGracePeriod(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    const dataset = await this.listAllInGracePeriod(paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new EmployeeLicense().hydrate(data));
  }

  /**
   * Liste les employés dont la période de grâce expire bientôt
   */
  async listGracePeriodExpiringSoon(
    days: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EmployeeLicense[] | null> {
    const dataset = await this.listAllGracePeriodExpiringSoon(days, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new EmployeeLicense().hydrate(data));
  }

  /**
   * Vérifie si la licence employé est nouvelle
   */
  isNew(): boolean {
    return this.id === undefined;
  }

  /**
   * Conversion JSON pour API
   */
  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const globalLicense = await this.getGlobalLicenseObject();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.EMPLOYEE]: this.employee,
      [RS.EMPLOYEE_CODE]: this.employee_code,
      [RS.ACTIVATION_DATE]: this.activation_date,
      [RS.DEACTIVATION_DATE]: this.deactivation_date,
      [RS.LAST_ACTIVITY_DATE]: this.last_activity_date,
      [RS.CONTRACTUAL_STATUS]: this.contractual_status,
      [RS.DECLARED_LONG_LEAVE]: this.declared_long_leave,
      [RS.LONG_LEAVE_DECLARED_BY]: this.long_leave_declared_by,
      [RS.LONG_LEAVE_DECLARED_AT]: this.long_leave_declared_at,
      [RS.LONG_LEAVE_TYPE]: this.long_leave_type,
      [RS.LONG_LEAVE_REASON]: this.long_leave_reason,
      [RS.COMPUTED_BILLING_STATUS]: this.computed_billing_status,
      [RS.GRACE_PERIOD_START]: this.grace_period_start,
      [RS.GRACE_PERIOD_END]: this.grace_period_end,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.GLOBAL_LICENSE]: globalLicense?.getGuid(),
      };
    }

    return {
      ...baseData,
      [RS.GLOBAL_LICENSE]: await globalLicense?.toJSON(responseValue.MINIMAL),
    };
  }

  /**
   * Représentation string
   */
  toString(): string {
    return `EmployeeLicense { ${RS.ID}: ${this.id}, ${RS.GUID}: ${this.guid}, ${RS.EMPLOYEE}: "${this.employee}", ${RS.CONTRACTUAL_STATUS}: "${this.contractual_status}", ${RS.COMPUTED_BILLING_STATUS}: "${this.computed_billing_status}" }`;
  }

  /**
   * Hydrate l'instance avec les données
   */
  private hydrate(data: any): EmployeeLicense {
    this.id = data.id;
    this.guid = data.guid;
    this.global_license = data.global_license;
    this.employee = data.employee;
    this.employee_code = data.employee_code;
    this.activation_date = data.activation_date;
    this.deactivation_date = data.deactivation_date;
    this.last_activity_date = data.last_activity_date;
    this.contractual_status = data.contractual_status;
    this.declared_long_leave = data.declared_long_leave;
    this.long_leave_declared_by = data.long_leave_declared_by;
    this.long_leave_declared_at = data.long_leave_declared_at;
    this.long_leave_type = data.long_leave_type;
    this.long_leave_reason = data.long_leave_reason;
    this.computed_billing_status = data.computed_billing_status;
    this.grace_period_start = data.grace_period_start;
    this.grace_period_end = data.grace_period_end;
    return this;
  }
}