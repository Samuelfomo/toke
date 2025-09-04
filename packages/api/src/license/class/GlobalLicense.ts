import { BillingCycle, LicenseStatus, Type } from '@toke/shared';

import GlobalLicenseModel from '../model/GlobalLicenseModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import { responseStructure as RS, responseValue, tableName, ViewMode } from '../../utils/response.model.js';
import Revision from '../../tools/revision.js';

import Tenant from './Tenant.js';

export default class GlobalLicense extends GlobalLicenseModel {
  private tenantObject?: Tenant;
  constructor() {
    super();
  }

  /**
   * Exports global license items with revision information.
   */
  static async exportable(paginationOptions: { offset?: number; limit?: number } = {}): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    const revision = await Revision.getRevision(tableName.GLOBAL_LICENSE);
    let data: any[] = [];

    const allLicenses = await this._list({ ['license_status']: LicenseStatus.ACTIVE }, paginationOptions);
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
   * Loads a global license based on the provided identifier.
   */
  static _load(
    identifier: any,
    byGuid: boolean = false,
  ): Promise<GlobalLicense | null> {
    return new GlobalLicense().load(identifier, byGuid);
  }

  /**
   * Liste les licences globales selon les conditions
   */
  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    return new GlobalLicense().list(conditions, paginationOptions);
  }

  /**
   * Liste les licences globales par tenant
   */
  static _listByTenant(
    tenant: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    return new GlobalLicense().listByTenant(tenant, paginationOptions);
  }

  /**
   * Liste les licences globales par type de licence
   */
  static _listByLicenseType(
    license_type: Type,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    return new GlobalLicense().listByLicenseType(license_type, paginationOptions);
  }

  /**
   * Liste les licences globales par cycle de facturation
   */
  static _listByBillingCycle(
    billing_cycle_months: BillingCycle,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    return new GlobalLicense().listByBillingCycle(billing_cycle_months, paginationOptions);
  }

  /**
   * Liste les licences globales par statut
   */
  static _listByStatus(
    license_status: LicenseStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    return new GlobalLicense().listByStatus(license_status, paginationOptions);
  }

  /**
   * Liste les licences globales expirant bientôt
   */
  static _listExpiringSoon(
    days: number = 30,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    return new GlobalLicense().listExpiringSoon(days, paginationOptions);
  }

  /**
   * Liste les licences globales expirées
   */
  static _listExpired(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    return new GlobalLicense().listExpired(paginationOptions);
  }

  /**
   * Convertit des données en objet GlobalLicense
   */
  static _toObject(data: any): GlobalLicense {
    return new GlobalLicense().hydrate(data);
  }

  // === SETTERS FLUENT ===
  setTenant(tenant: number): GlobalLicense {
    this.tenant = tenant;
    return this;
  }

  setLicenseType(license_type: Type): GlobalLicense {
    this.license_type = license_type;
    return this;
  }

  setBillingCycleMonths(billing_cycle_months: BillingCycle): GlobalLicense {
    this.billing_cycle_months = billing_cycle_months;
    return this;
  }

  setBasePriceUsd(base_price_usd: number): GlobalLicense {
    this.base_price_usd = base_price_usd;
    return this;
  }

  setMinimumSeats(minimum_seats: number): GlobalLicense {
    this.minimum_seats = minimum_seats;
    return this;
  }

  setCurrentPeriodStart(current_period_start: Date): GlobalLicense {
    this.current_period_start = current_period_start;
    return this;
  }

  setCurrentPeriodEnd(current_period_end: Date): GlobalLicense {
    this.current_period_end = current_period_end;
    return this;
  }

  setNextRenewalDate(next_renewal_date: Date): GlobalLicense {
    this.next_renewal_date = next_renewal_date;
    return this;
  }

  setTotalSeatsPurchased(total_seats_purchased: number): GlobalLicense {
    this.total_seats_purchased = total_seats_purchased;
    return this;
  }

  setLicenseStatus(license_status: LicenseStatus): GlobalLicense {
    this.license_status = license_status;
    return this;
  }

  // === GETTERS ===
  getId(): number | undefined {
    return this.id;
  }

  getGuid(): number | undefined {
    return this.guid;
  }

  getTenant(): number | undefined {
    return this.tenant;
  }

  async getTenantObject(): Promise<Tenant | null> {
    if (!this.tenant) return null;
    if (!this.tenantObject) {
      this.tenantObject =  (await Tenant._load(this.tenant)) || undefined;
    }
    return this.tenantObject || null;
  }

  getLicenseType(): Type | undefined {
    return this.license_type;
  }

  getBillingCycleMonths(): BillingCycle | undefined {
    return this.billing_cycle_months;
  }

  getBasePriceUsd(): number | undefined {
    return this.base_price_usd;
  }

  getMinimumSeats(): number | undefined {
    return this.minimum_seats;
  }

  getCurrentPeriodStart(): Date | undefined {
    return this.current_period_start;
  }

  getCurrentPeriodEnd(): Date | undefined {
    return this.current_period_end;
  }

  getNextRenewalDate(): Date | undefined {
    return this.next_renewal_date;
  }

  getTotalSeatsPurchased(): number | undefined {
    return this.total_seats_purchased;
  }

  getLicenseStatus(): LicenseStatus | undefined {
    return this.license_status;
  }

  /**
   * Obtient l'identifiant sous forme de chaîne (GUID)
   */
  getIdentifier(): string {
    return this.guid?.toString() || 'Unknown';
  }

  /**
   * Vérifie si la licence est active
   */
  isActive(): boolean {
    return this.license_status === LicenseStatus.ACTIVE && !this.isExpired();
  }

  /**
   * Vérifie si la licence est suspendue
   */
  isSuspended(): boolean {
    return this.license_status === LicenseStatus.SUSPENDED;
  }

  /**
   * Vérifie si la licence est expirée
   */
  isExpired(): boolean {
    if (!this.current_period_end) return false;
    return new Date() > new Date(this.current_period_end);
  }

  /**
   * Vérifie si la licence expire bientôt
   */
  isExpiringSoon(days: number = 30): boolean {
    if (!this.current_period_end) return false;
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + days);
    return new Date(this.current_period_end) <= warningDate && !this.isExpired();
  }

  /**
   * Calcule le prix mensuel basé sur les sièges
   */
  calculateMonthlyPrice(): number {
    if (!this.base_price_usd || !this.minimum_seats) return 0;
    const seatsToCharge = Math.max(this.total_seats_purchased || 0, this.minimum_seats);
    return this.base_price_usd * seatsToCharge;
  }

  /**
   * Calcule le prix pour la période de facturation
   */
  calculatePeriodPrice(): number {
    if (!this.billing_cycle_months) return 0;
    return this.calculateMonthlyPrice() * Number(this.billing_cycle_months);
  }

  /**
   * Obtient le nombre de jours restants dans la période actuelle
   */
  getDaysRemaining(): number {
    if (!this.current_period_end) return 0;
    const now = new Date();
    const end = new Date(this.current_period_end);
    const diffTime = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * Sauvegarde la licence globale (création ou mise à jour)
   */
  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      console.error('⚠️ Erreur sauvegarde licence globale:', error.message);
      throw new Error(error);
    }
  }

  /**
   * Supprime la licence globale
   */
  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: GlobalLicense Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  /**
   * Loads a GlobalLicense object based on the provided identifier and search method.
   *
   * @param {any} identifier - The identifier used to find the GlobalLicense object.
   *                           Can be a GUID or an ID number.
   * @param {boolean} [byGuid=false] - Specifies if the lookup should be performed by GUID.
   * @return {Promise<GlobalLicense | null>} A promise that resolves to the located GlobalLicense object, or null if not found.
   */
  async load(
    identifier: any,
    byGuid: boolean = false,
  ): Promise<GlobalLicense | null> {
    const data = byGuid
      ? await this.findByGuid(identifier)
      : await this.find(Number(identifier));

    if (!data) return null;
    return this.hydrate(data);
  }

  /**
   * Liste les licences globales selon les conditions
   */
  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new GlobalLicense().hydrate(data));
  }

  /**
   * Liste les licences globales par tenant
   */
  async listByTenant(
    tenant: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    const dataset = await this.listAllByTenant(tenant, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new GlobalLicense().hydrate(data));
  }

  /**
   * Liste les licences globales par type de licence
   */
  async listByLicenseType(
    license_type: Type,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    const dataset = await this.listAllByLicenseType(license_type, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new GlobalLicense().hydrate(data));
  }

  /**
   * Liste les licences globales par cycle de facturation
   */
  async listByBillingCycle(
    billing_cycle_months: BillingCycle,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    const dataset = await this.listAllByBillingCycle(billing_cycle_months, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new GlobalLicense().hydrate(data));
  }

  /**
   * Liste les licences globales par statut
   */
  async listByStatus(
    license_status: LicenseStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    const dataset = await this.listAllByStatus(license_status, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new GlobalLicense().hydrate(data));
  }

  /**
   * Liste les licences globales expirant bientôt
   */
  async listExpiringSoon(
    days: number = 30,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    const dataset = await this.listAllExpiringSoon(days, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new GlobalLicense().hydrate(data));
  }

  /**
   * Liste les licences globales expirées
   */
  async listExpired(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<GlobalLicense[] | null> {
    const dataset = await this.listAllExpired(paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new GlobalLicense().hydrate(data));
  }

  /**
   * Vérifie si la licence globale est nouvelle
   */
  isNew(): boolean {
    return this.id === undefined;
  }

  /**
   * Conversion JSON pour API
   */
  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const tenant = await this.getTenantObject();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.LICENSE_TYPE]: this.license_type,
      [RS.BILLING_CYCLE_MONTHS]: this.billing_cycle_months,
      [RS.BASE_PRICE_USD]: this.base_price_usd,
      [RS.MINIMUM_SEATS]: this.minimum_seats,
      [RS.CURRENT_PERIOD_START]: this.current_period_start,
      [RS.CURRENT_PERIOD_END]: this.current_period_end,
      [RS.NEXT_RENEWAL_DATE]: this.next_renewal_date,
      [RS.TOTAL_SEATS_PURCHASED]: this.total_seats_purchased,
      [RS.LICENSE_STATUS]: this.license_status,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.TENANT]: tenant?.getGuid(),
      };
    }

    return {
      ...baseData,
      [RS.TENANT]: tenant?.toJSON(),
    };
  }


  /**
   * Représentation string
   */
  toString(): string {
    return `GlobalLicense { ${RS.ID}: ${this.id}, ${RS.GUID}: ${this.guid}, ${RS.LICENSE_TYPE}: "${this.license_type}", ${RS.LICENSE_STATUS}: "${this.license_status}" }`;
  }

  /**
   * Hydrate l'instance avec les données
   */
  private hydrate(data: any): GlobalLicense {
    this.id = data.id;
    this.guid = data.guid;
    this.tenant = data.tenant;
    this.license_type = data.license_type;
    this.billing_cycle_months = data.billing_cycle_months;
    this.base_price_usd = data.base_price_usd;
    this.minimum_seats = data.minimum_seats;
    this.current_period_start = data.current_period_start;
    this.current_period_end = data.current_period_end;
    this.next_renewal_date = data.next_renewal_date;
    this.total_seats_purchased = data.total_seats_purchased;
    this.license_status = data.license_status;
    return this;
  }
}