import { BillingStatus } from '@toke/shared';

import BillingCycleModel from '../model/BillingCycleModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import {
  responseStructure as RS,
  responseValue,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import Revision from '../../tools/revision.js';

import GlobalLicense from './GlobalLicense.js';
import Currency from './Currency.js';

export default class BillingCycle extends BillingCycleModel {
  private globalLicenseObject?: GlobalLicense;
  private currencyObject?: Currency;

  constructor() {
    super();
  }

  /**
   * Exports billing cycle items with revision information.
   */
  static async exportable(paginationOptions: { offset?: number; limit?: number } = {}): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    const revision = await Revision.getRevision(tableName.BILLING_CYCLE);
    let data: any[] = [];

    const allCycles = await this._list(
      { [BillingStatus.COMPLETED]: BillingStatus.COMPLETED },
      paginationOptions,
    );
    if (allCycles) {
      data = await Promise.all(allCycles.map(async (cycle) => await cycle.toJSON()));
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
   * Loads a billing cycle based on the provided identifier.
   */
  static _load(identifier: any, byGuid: boolean = false): Promise<BillingCycle | null> {
    return new BillingCycle().load(identifier, byGuid);
  }

  /**
   * Liste les cycles de facturation selon les conditions
   */
  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    return new BillingCycle().list(conditions, paginationOptions);
  }

  /**
   * Liste les cycles de facturation par licence globale
   */
  static _listByGlobalLicense(
    global_license: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    return new BillingCycle().listByGlobalLicense(global_license, paginationOptions);
  }

  /**
   * Liste les cycles de facturation par statut
   */
  static _listByStatus(
    billing_status: BillingStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    return new BillingCycle().listByStatus(billing_status, paginationOptions);
  }

  /**
   * Liste les cycles de facturation par devise
   */
  static _listByCurrency(
    billing_currency_code: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    return new BillingCycle().listByCurrency(billing_currency_code, paginationOptions);
  }

  /**
   * Liste les cycles de facturation par période
   */
  static _listByPeriod(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    return new BillingCycle().listByPeriod(startDate, endDate, paginationOptions);
  }

  /**
   * Liste les cycles de facturation en retard
   */
  static _listOverdue(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    return new BillingCycle().listOverdue(paginationOptions);
  }

  /**
   * Liste les cycles de facturation avec échéance proche
   */
  static _listDueSoon(
    days: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    return new BillingCycle().listDueSoon(days, paginationOptions);
  }

  /**
   * Liste les cycles de facturation en attente de facture
   */
  static _listPendingInvoice(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    return new BillingCycle().listPendingInvoice(paginationOptions);
  }

  /**
   * Liste les cycles de facturation terminés
   */
  static _listCompleted(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    return new BillingCycle().listCompleted(paginationOptions);
  }

  /**
   * Convertit des données en objet BillingCycle
   */
  static _toObject(data: any): BillingCycle {
    return new BillingCycle().hydrate(data);
  }

  // === SETTERS FLUENT ===
  setGlobalLicense(global_license: number): BillingCycle {
    this.global_license = global_license;
    return this;
  }

  setPeriodStart(period_start: Date): BillingCycle {
    this.period_start = period_start;
    return this;
  }

  setPeriodEnd(period_end: Date): BillingCycle {
    this.period_end = period_end;
    return this;
  }

  setBaseEmployeeCount(base_employee_count: number): BillingCycle {
    this.base_employee_count = base_employee_count;
    return this;
  }

  setFinalEmployeeCount(final_employee_count: number): BillingCycle {
    this.final_employee_count = final_employee_count;
    return this;
  }

  setBaseAmountUsd(base_amount_usd: number): BillingCycle {
    this.base_amount_usd = base_amount_usd;
    return this;
  }

  setAdjustmentsAmountUsd(adjustments_amount_usd: number): BillingCycle {
    this.adjustments_amount_usd = adjustments_amount_usd;
    return this;
  }

  setTaxAmountUsd(tax_amount_usd: number): BillingCycle {
    this.tax_amount_usd = tax_amount_usd;
    return this;
  }

  setBillingCurrencyCode(billing_currency_code: string): BillingCycle {
    this.billing_currency_code = billing_currency_code;
    return this;
  }

  setExchangeRateUsed(exchange_rate_used: number): BillingCycle {
    this.exchange_rate_used = exchange_rate_used;
    return this;
  }

  setBaseAmountLocal(base_amount_local: number): BillingCycle {
    this.base_amount_local = base_amount_local;
    return this;
  }

  setAdjustmentsAmountLocal(adjustments_amount_local: number): BillingCycle {
    this.adjustments_amount_local = adjustments_amount_local;
    return this;
  }

  setTaxAmountLocal(tax_amount_local: number): BillingCycle {
    this.tax_amount_local = tax_amount_local;
    return this;
  }

  setTaxRulesApplied(tax_rules_applied: any[]): BillingCycle {
    this.tax_rules_applied = tax_rules_applied;
    return this;
  }

  setBillingStatus(billing_status: BillingStatus): BillingCycle {
    this.billing_status = billing_status;
    return this;
  }

  setPaymentDueDate(payment_due_date: Date): BillingCycle {
    this.payment_due_date = payment_due_date;
    return this;
  }

  setInvoiceGeneratedAt(invoice_generated_at: Date): BillingCycle {
    this.invoice_generated_at = invoice_generated_at;
    return this;
  }

  setPaymentCompletedAt(payment_completed_at: Date): BillingCycle {
    this.payment_completed_at = payment_completed_at;
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

  getPeriodStart(): Date | undefined {
    return this.period_start;
  }

  getPeriodEnd(): Date | undefined {
    return this.period_end;
  }

  getBaseEmployeeCount(): number | undefined {
    return this.base_employee_count;
  }

  getFinalEmployeeCount(): number | undefined {
    return this.final_employee_count;
  }

  getBaseAmountUsd(): number | undefined {
    return this.base_amount_usd;
  }

  getAdjustmentsAmountUsd(): number | undefined {
    return this.adjustments_amount_usd;
  }

  getSubtotalUsd(): number | undefined {
    return this.subtotal_usd;
  }

  getTaxAmountUsd(): number | undefined {
    return this.tax_amount_usd;
  }

  getTotalAmountUsd(): number | undefined {
    return this.total_amount_usd;
  }

  getBillingCurrencyCode(): string | undefined {
    return this.billing_currency_code;
  }

  async getCurrencyObject(): Promise<Currency | null> {
    if (!this.billing_currency_code) return null;
    if (!this.currencyObject) {
      this.currencyObject =
        (await Currency._load(this.billing_currency_code, false, true)) || undefined;
    }
    return this.currencyObject || null;
  }

  getExchangeRateUsed(): number | undefined {
    return this.exchange_rate_used;
  }

  getBaseAmountLocal(): number | undefined {
    return this.base_amount_local;
  }

  getAdjustmentsAmountLocal(): number | undefined {
    return this.adjustments_amount_local;
  }

  getSubtotalLocal(): number | undefined {
    return this.subtotal_local;
  }

  getTaxAmountLocal(): number | undefined {
    return this.tax_amount_local;
  }

  getTotalAmountLocal(): number | undefined {
    return this.total_amount_local;
  }

  getTaxRulesApplied(): any[] | undefined {
    return this.tax_rules_applied;
  }

  getBillingStatus(): BillingStatus | undefined {
    return this.billing_status;
  }

  getInvoiceGeneratedAt(): Date | undefined {
    return this.invoice_generated_at;
  }

  getPaymentDueDate(): Date | undefined {
    return this.payment_due_date;
  }

  getPaymentCompletedAt(): Date | undefined {
    return this.payment_completed_at;
  }

  /**
   * Obtient l'identifiant sous forme de chaîne (GUID)
   */
  getIdentifier(): string {
    return this.guid?.toString() || 'Unknown';
  }

  /**
   * Vérifie si le cycle est en attente
   */
  isPending(): boolean {
    return this.billing_status === BillingStatus.PENDING;
  }

  /**
   * Vérifie si le cycle est en cours de traitement
   */
  isProcessing(): boolean {
    return this.billing_status === BillingStatus.PROCESSING;
  }

  /**
   * Vérifie si le cycle est terminé
   */
  isCompleted(): boolean {
    return this.billing_status === BillingStatus.COMPLETED;
  }

  /**
   * Vérifie si le cycle a échoué
   */
  isFailed(): boolean {
    return this.billing_status === BillingStatus.FAILED;
  }

  /**
   * Vérifie si le cycle est annulé
   */
  isCancelled(): boolean {
    return this.billing_status === BillingStatus.CANCELLED;
  }

  /**
   * Vérifie si le cycle est en retard
   */
  isOverdue(): boolean {
    if (this.billing_status !== BillingStatus.OVERDUE) return false;
    if (!this.payment_due_date) return false;
    return new Date() > new Date(this.payment_due_date);
  }

  /**
   * Vérifie si le paiement est dû bientôt
   */
  isDueSoon(days: number = 7): boolean {
    if (!this.payment_due_date || this.isCompleted() || this.isCancelled()) return false;
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + days);
    return (
      new Date(this.payment_due_date) <= warningDate &&
      new Date(this.payment_due_date) >= new Date()
    );
  }

  /**
   * Vérifie si une facture a été générée
   */
  hasInvoice(): boolean {
    return this.invoice_generated_at !== null && this.invoice_generated_at !== undefined;
  }

  /**
   * Vérifie si le paiement a été effectué
   */
  isPaid(): boolean {
    return this.payment_completed_at !== null && this.payment_completed_at !== undefined;
  }

  /**
   * Calcule la durée de la période de facturation en jours
   */
  getPeriodDurationDays(): number {
    if (!this.period_start || !this.period_end) return 0;
    const start = new Date(this.period_start);
    const end = new Date(this.period_end);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcule l'ajustement d'employés
   */
  getEmployeeCountAdjustment(): number {
    if (!this.base_employee_count || !this.final_employee_count) return 0;
    return this.final_employee_count - this.base_employee_count;
  }

  /**
   * Calcule le taux de taxe effectif en pourcentage
   */
  getEffectiveTaxRate(): number {
    if (!this.subtotal_usd || !this.tax_amount_usd || this.subtotal_usd === 0) return 0;
    return (this.tax_amount_usd / this.subtotal_usd) * 100;
  }

  /**
   * Obtient le nombre de jours restants avant l'échéance
   */
  getDaysUntilDue(): number {
    if (!this.payment_due_date) return 0;
    const now = new Date();
    const due = new Date(this.payment_due_date);
    const diffTime = due.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * Obtient le nombre de jours de retard
   */
  getDaysOverdue(): number {
    if (!this.payment_due_date || !this.isOverdue()) return 0;
    const now = new Date();
    const due = new Date(this.payment_due_date);
    const diffTime = now.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Marque le cycle comme facturé
   */
  async markAsInvoiced(): Promise<void> {
    await super.markAsInvoiced();
  }

  /**
   * Marque le cycle comme payé
   */
  async markAsPaid(): Promise<void> {
    await super.markAsPaid();
  }

  /**
   * Marque le cycle comme en retard
   */
  async markAsOverdue(): Promise<void> {
    await super.markAsOverdue();
  }

  /**
   * Annule le cycle de facturation
   */
  async cancel(): Promise<void> {
    await super.cancel();
  }

  /**
   * Sauvegarde le cycle de facturation (création ou mise à jour)
   */
  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      console.error('⚠️ Erreur sauvegarde cycle de facturation:', error.message);
      throw new Error(error);
    }
  }

  /**
   * Supprime le cycle de facturation
   */
  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: BillingCycle Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  /**
   * Loads a BillingCycle object based on the provided identifier and search method.
   *
   * @param {any} identifier - The identifier used to find the BillingCycle object.
   *                           Can be a GUID or an ID number.
   * @param {boolean} [byGuid=false] - Specifies if the lookup should be performed by GUID.
   * @return {Promise<BillingCycle | null>} A promise that resolves to the located BillingCycle object, or null if not found.
   */
  async load(identifier: any, byGuid: boolean = false): Promise<BillingCycle | null> {
    const data = byGuid ? await this.findByGuid(identifier) : await this.find(Number(identifier));

    if (!data) return null;
    return this.hydrate(data);
  }

  /**
   * Liste les cycles de facturation selon les conditions
   */
  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new BillingCycle().hydrate(data));
  }

  /**
   * Liste les cycles de facturation par licence globale
   */
  async listByGlobalLicense(
    global_license: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    const dataset = await this.listAllByGlobalLicense(global_license, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new BillingCycle().hydrate(data));
  }

  /**
   * Liste les cycles de facturation par statut
   */
  async listByStatus(
    billing_status: BillingStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    const dataset = await this.listAllByStatus(billing_status, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new BillingCycle().hydrate(data));
  }

  /**
   * Liste les cycles de facturation par devise
   */
  async listByCurrency(
    billing_currency_code: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    const dataset = await this.listAllByCurrency(billing_currency_code, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new BillingCycle().hydrate(data));
  }

  /**
   * Liste les cycles de facturation par période
   */
  async listByPeriod(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    const dataset = await this.listAllByPeriod(startDate, endDate, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new BillingCycle().hydrate(data));
  }

  /**
   * Liste les cycles de facturation en retard
   */
  async listOverdue(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    const dataset = await this.listAllOverdue(paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new BillingCycle().hydrate(data));
  }

  /**
   * Liste les cycles de facturation avec échéance proche
   */
  async listDueSoon(
    days: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    const dataset = await this.listAllDueSoon(days, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new BillingCycle().hydrate(data));
  }

  /**
   * Liste les cycles de facturation en attente de facture
   */
  async listPendingInvoice(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    const dataset = await this.listAllPendingInvoice(paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new BillingCycle().hydrate(data));
  }

  /**
   * Liste les cycles de facturation terminés
   */
  async listCompleted(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<BillingCycle[] | null> {
    const dataset = await this.listAllCompleted(paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new BillingCycle().hydrate(data));
  }

  /**
   * Vérifie si le cycle de facturation est nouveau
   */
  isNew(): boolean {
    return this.id === undefined;
  }

  /**
   * Conversion JSON pour API
   */
  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const globalLicense = await this.getGlobalLicenseObject();
    const currency = await this.getCurrencyObject();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.PERIOD_START]: this.period_start,
      [RS.PERIOD_END]: this.period_end,
      [RS.BASE_EMPLOYEE_COUNT]: this.base_employee_count,
      [RS.FINAL_EMPLOYEE_COUNT]: this.final_employee_count,
      [RS.BASE_AMOUNT_USD]: this.base_amount_usd,
      [RS.ADJUSTMENTS_AMOUNT_USD]: this.adjustments_amount_usd,
      [RS.SUBTOTAL_USD]: this.subtotal_usd,
      [RS.TAX_AMOUNT_USD]: this.tax_amount_usd,
      [RS.TOTAL_AMOUNT_USD]: this.total_amount_usd,
      [RS.BILLING_CURRENCY_CODE]: this.billing_currency_code,
      [RS.EXCHANGE_RATE_USED]: this.exchange_rate_used,
      [RS.BASE_AMOUNT_LOCAL]: this.base_amount_local,
      [RS.ADJUSTMENTS_AMOUNT_LOCAL]: this.adjustments_amount_local,
      [RS.SUBTOTAL_LOCAL]: this.subtotal_local,
      [RS.TAX_AMOUNT_LOCAL]: this.tax_amount_local,
      [RS.TOTAL_AMOUNT_LOCAL]: this.total_amount_local,
      [RS.TAX_RULES_APPLIED]: this.tax_rules_applied,
      [RS.BILLING_STATUS]: this.billing_status,
      [RS.INVOICE_GENERATED_AT]: this.invoice_generated_at,
      [RS.PAYMENT_DUE_DATE]: this.payment_due_date,
      [RS.PAYMENT_COMPLETED_AT]: this.payment_completed_at,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.GLOBAL_LICENSE]: globalLicense?.getGuid(),
        [RS.CURRENCY]: currency?.getCode(),
      };
    }

    return {
      ...baseData,
      [RS.GLOBAL_LICENSE]: globalLicense?.toJSON(responseValue.MINIMAL),
      [RS.CURRENCY]: currency?.toJSON(),
    };
  }

  /**
   * Représentation string
   */
  toString(): string {
    return `BillingCycle { ${RS.ID}: ${this.id}, ${RS.GUID}: ${this.guid}, ${RS.BILLING_STATUS}: "${this.billing_status}", ${RS.TOTAL_AMOUNT_USD}: ${this.total_amount_usd} }`;
  }

  /**
   * Hydrate l'instance avec les données
   */
  private hydrate(data: any): BillingCycle {
    this.id = data.id;
    this.guid = data.guid;
    this.global_license = data.global_license;
    this.period_start = data.period_start;
    this.period_end = data.period_end;
    this.base_employee_count = data.base_employee_count;
    this.final_employee_count = data.final_employee_count;
    this.base_amount_usd = data.base_amount_usd;
    this.adjustments_amount_usd = data.adjustments_amount_usd;
    this.subtotal_usd = data.subtotal_usd;
    this.tax_amount_usd = data.tax_amount_usd;
    this.total_amount_usd = data.total_amount_usd;
    this.billing_currency_code = data.billing_currency_code;
    this.exchange_rate_used = data.exchange_rate_used;
    this.base_amount_local = data.base_amount_local;
    this.adjustments_amount_local = data.adjustments_amount_local;
    this.subtotal_local = data.subtotal_local;
    this.tax_amount_local = data.tax_amount_local;
    this.total_amount_local = data.total_amount_local;
    this.tax_rules_applied = data.tax_rules_applied;
    this.billing_status = data.billing_status;
    this.invoice_generated_at = data.invoice_generated_at;
    this.payment_due_date = data.payment_due_date;
    this.payment_completed_at = data.payment_completed_at;
    return this;
  }
}
