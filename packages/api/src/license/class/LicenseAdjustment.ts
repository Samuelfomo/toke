import { PaymentTransactionStatus } from '@toke/shared';

import LicenseAdjustmentModel from '../model/LicenseAdjustmentModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import { responseStructure as RS, responseValue, tableName, ViewMode } from '../../utils/response.model.js';
import Revision from '../../tools/revision.js';

import GlobalLicense from './GlobalLicense.js';

export default class LicenseAdjustment extends LicenseAdjustmentModel {
  private globalLicenseObject?: GlobalLicense;

  constructor() {
    super();
  }

  /**
   * Exports license adjustment items with revision information.
   */
  static async exportable(paginationOptions: { offset?: number; limit?: number } = {}): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    const revision = await Revision.getRevision(tableName.LICENSE_ADJUSTMENT);
    let data: any[] = [];

    const allAdjustments = await this._list({}, paginationOptions);
    if (allAdjustments) {
      data = await Promise.all(allAdjustments.map(async adjustment => await adjustment.toJSON()));
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
   * Charge un avenant de licence basé sur l'identifiant fourni.
   */
  static _load(
    identifier: any,
    byGuid: boolean = false,
  ): Promise<LicenseAdjustment | null> {
    return new LicenseAdjustment().load(identifier, byGuid);
  }

  /**
   * Liste les avenants selon les conditions
   */
  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    return new LicenseAdjustment().list(conditions, paginationOptions);
  }

  /**
   * Liste les avenants par licence globale
   */
  static _listByGlobalLicense(
    global_license: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    return new LicenseAdjustment().listByGlobalLicense(global_license, paginationOptions);
  }

  /**
   * Liste les avenants par statut de paiement
   */
  static _listByPaymentStatus(
    payment_status: PaymentTransactionStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    return new LicenseAdjustment().listByPaymentStatus(payment_status, paginationOptions);
  }

  /**
   * Liste les avenants par devise
   */
  static _listByCurrency(
    billing_currency_code: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    return new LicenseAdjustment().listByCurrency(billing_currency_code, paginationOptions);
  }

  /**
   * Liste les avenants créés dans une période
   */
  static _listCreatedBetween(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    return new LicenseAdjustment().listCreatedBetween(startDate, endDate, paginationOptions);
  }

  /**
   * Liste les avenants payés dans une période
   */
  static _listPaidBetween(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    return new LicenseAdjustment().listPaidBetween(startDate, endDate, paginationOptions);
  }

  /**
   * Liste les avenants en attente de paiement
   */
  static _listPendingPayment(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    return new LicenseAdjustment().listPendingPayment(paginationOptions);
  }

  /**
   * Liste les avenants facturés mais non payés
   */
  static _listInvoicedNotPaid(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    return new LicenseAdjustment().listInvoicedNotPaid(paginationOptions);
  }

  /**
   * Liste les avenants facturés mais non payés pour une licence globale
   */
  static _listInvoicedNotPaidGlobalLicense(
    global_license: number,
  ): Promise<LicenseAdjustment[] | null> {
    return (new LicenseAdjustment()).listAllInvoicedNotPaidGlobalLicense(global_license);
  }


  /**
   * Obtient les statistiques financières par devise
   */
  static async _getFinancialStats(currency_code?: string): Promise<any[]> {
    return new LicenseAdjustment().getFinancialStatsByCurrency(currency_code);
  }

  /**
   * Convertit des données en objet LicenseAdjustment
   */
  static _toObject(data: any): LicenseAdjustment {
    return new LicenseAdjustment().hydrate(data);
  }

  /**
   * Met à jour le statut de paiement d'un avenant
   */
  static async _updatePaymentStatus(id: number, status: PaymentTransactionStatus, completed_at?: Date): Promise<boolean> {
    return new LicenseAdjustment().updatePaymentStatus(id, status, completed_at);
  }

  /**
   * Marque une facture comme envoyée
   */
  static async _markInvoiceSent(id: number, sent_at?: Date): Promise<boolean> {
    return new LicenseAdjustment().markInvoiceSent(id, sent_at);
  }

  /**
   * Calcule les montants d'un avenant
   */
  static calculateAdjustmentAmounts(
    employees_added: number,
    months_remaining: number,
    price_per_employee_usd: number,
    tax_rules: any[] = [],
    exchange_rate: number = 1
  ): {
    subtotal_usd: number;
    tax_amount_usd: number;
    total_amount_usd: number;
    subtotal_local: number;
    tax_amount_local: number;
    total_amount_local: number;
  } {
    // Calcul du sous-total USD
    const subtotal_usd = Math.round((employees_added * months_remaining * price_per_employee_usd) * 100) / 100;

    // Calcul des taxes
    let tax_amount_usd = 0;
    tax_rules.forEach(rule => {
      if (rule.rate && typeof rule.rate === 'number') {
        tax_amount_usd += subtotal_usd * rule.rate;
      }
    });
    tax_amount_usd = Math.round(tax_amount_usd * 100) / 100;

    // Total USD
    const total_amount_usd = Math.round((subtotal_usd + tax_amount_usd) * 100) / 100;

    // Montants locaux
    const subtotal_local = Math.round((subtotal_usd * exchange_rate) * 100) / 100;
    const tax_amount_local = Math.round((tax_amount_usd * exchange_rate) * 100) / 100;
    const total_amount_local = Math.round((total_amount_usd * exchange_rate) * 100) / 100;

    return {
      subtotal_usd,
      tax_amount_usd,
      total_amount_usd,
      subtotal_local,
      tax_amount_local,
      total_amount_local
    };
  }

  // === SETTERS FLUENT ===
  setGlobalLicense(global_license: number): LicenseAdjustment {
    this.global_license = global_license;
    return this;
  }

  setAdjustmentDate(adjustment_date: Date): LicenseAdjustment {
    this.adjustment_date = adjustment_date;
    return this;
  }

  setEmployeesAddedCount(employees_added_count: number): LicenseAdjustment {
    this.employees_added_count = employees_added_count;
    return this;
  }

  setMonthsRemaining(months_remaining: number): LicenseAdjustment {
    this.months_remaining = months_remaining;
    return this;
  }

  setPricePerEmployeeUsd(price_per_employee_usd: number): LicenseAdjustment {
    this.price_per_employee_usd = price_per_employee_usd;
    return this;
  }

  setSubtotalUsd(subtotal_usd: number): LicenseAdjustment {
    this.subtotal_usd = subtotal_usd;
    return this;
  }

  setTaxAmountUsd(tax_amount_usd: number): LicenseAdjustment {
    this.tax_amount_usd = tax_amount_usd;
    return this;
  }

  setTotalAmountUsd(total_amount_usd: number): LicenseAdjustment {
    this.total_amount_usd = total_amount_usd;
    return this;
  }

  setBillingCurrencyCode(billing_currency_code: string): LicenseAdjustment {
    this.billing_currency_code = billing_currency_code;
    return this;
  }

  setExchangeRateUsed(exchange_rate_used: number): LicenseAdjustment {
    this.exchange_rate_used = exchange_rate_used;
    return this;
  }

  setSubtotalLocal(subtotal_local: number): LicenseAdjustment {
    this.subtotal_local = subtotal_local;
    return this;
  }

  setTaxAmountLocal(tax_amount_local: number): LicenseAdjustment {
    this.tax_amount_local = tax_amount_local;
    return this;
  }

  setTotalAmountLocal(total_amount_local: number): LicenseAdjustment {
    this.total_amount_local = total_amount_local;
    return this;
  }

  setTaxRulesApplied(tax_rules_applied: any[]): LicenseAdjustment {
    this.tax_rules_applied = tax_rules_applied;
    return this;
  }

  setPaymentStatus(payment_status: PaymentTransactionStatus): LicenseAdjustment {
    this.payment_status = payment_status;
    return this;
  }

  setPaymentDueImmediately(payment_due_immediately: boolean): LicenseAdjustment {
    this.payment_due_immediately = payment_due_immediately;
    return this;
  }

  setInvoiceSentAt(invoice_sent_at: Date): LicenseAdjustment {
    this.invoice_sent_at = invoice_sent_at;
    return this;
  }

  setPaymentCompletedAt(payment_completed_at: Date): LicenseAdjustment {
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

  getAdjustmentDate(): Date | undefined {
    return this.adjustment_date;
  }

  getEmployeesAddedCount(): number | undefined {
    return this.employees_added_count;
  }

  getMonthsRemaining(): number | undefined {
    return this.months_remaining;
  }

  getPricePerEmployeeUsd(): number | undefined {
    return this.price_per_employee_usd;
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

  getExchangeRateUsed(): number | undefined {
    return this.exchange_rate_used;
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

  getPaymentStatus(): PaymentTransactionStatus | undefined {
    return this.payment_status;
  }

  getPaymentDueImmediately(): boolean | undefined {
    return this.payment_due_immediately;
  }

  getInvoiceSentAt(): Date | undefined {
    return this.invoice_sent_at;
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

  // === MÉTHODES MÉTIER ===

  /**
   * Vérifie si l'avenant est en attente de paiement
   */
  isPendingPayment(): boolean {
    return this.payment_status === PaymentTransactionStatus.PENDING;
  }

  /**
   * Vérifie si l'avenant est en cours de traitement
   */
  isProcessing(): boolean {
    return this.payment_status === PaymentTransactionStatus.PROCESSING;
  }

  /**
   * Vérifie si l'avenant est payé
   */
  isPaid(): boolean {
    return this.payment_status === PaymentTransactionStatus.COMPLETED;
  }

  /**
   * Vérifie si l'avenant est annulé
   */
  isCancelled(): boolean {
    return this.payment_status === PaymentTransactionStatus.CANCELLED;
  }

  /**
   * Vérifie si l'avenant est remboursé
   */
  isRefunded(): boolean {
    return this.payment_status === PaymentTransactionStatus.REFUNDED;
  }

  /**
   * Vérifie si la facture a été envoyée
   */
  isInvoiceSent(): boolean {
    return this.invoice_sent_at !== null && this.invoice_sent_at !== undefined;
  }

  /**
   * Vérifie si le paiement est dû immédiatement
   */
  isPaymentDueImmediately(): boolean {
    return this.payment_due_immediately === true;
  }

  /**
   * Calcule le montant total en USD
   */
  calculateTotalUsd(): number {
    const subtotal = this.subtotal_usd || 0;
    const tax = this.tax_amount_usd || 0;
    return Math.round((subtotal + tax) * 100) / 100;
  }

  /**
   * Calcule le montant total en devise locale
   */
  calculateTotalLocal(): number {
    const subtotal = this.subtotal_local || 0;
    const tax = this.tax_amount_local || 0;
    return Math.round((subtotal + tax) * 100) / 100;
  }

  /**
   * Calcule les jours depuis la création de l'avenant
   */
  getDaysSinceAdjustment(): number {
    if (!this.adjustment_date) return -1;
    const now = new Date();
    const adjustmentDate = new Date(this.adjustment_date);
    const diffTime = now.getTime() - adjustmentDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcule les jours depuis l'envoi de la facture
   */
  getDaysSinceInvoiceSent(): number {
    if (!this.invoice_sent_at) return -1;
    const now = new Date();
    const sentDate = new Date(this.invoice_sent_at);
    const diffTime = now.getTime() - sentDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcule les jours depuis le paiement
   */
  getDaysSincePaymentCompleted(): number {
    if (!this.payment_completed_at) return -1;
    const now = new Date();
    const paymentDate = new Date(this.payment_completed_at);
    const diffTime = now.getTime() - paymentDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Met à jour le statut de paiement pour cet avenant
   */
  async updatePaymentStatusForThis(status: PaymentTransactionStatus, completed_at?: Date): Promise<boolean> {
    if (!this.id) return false;
    const result = await this.updatePaymentStatus(this.id, status, completed_at);
    if (result) {
      this.payment_status = status;
      if (status === PaymentTransactionStatus.COMPLETED && completed_at) {
        this.payment_completed_at = completed_at;
      }
    }
    return result;
  }

  /**
   * Marque la facture comme envoyée pour cet avenant
   */
  async markInvoiceSentForThis(sent_at?: Date): Promise<boolean> {
    if (!this.id) return false;
    const result = await this.markInvoiceSent(this.id, sent_at);
    if (result) {
      this.invoice_sent_at = sent_at || new Date();
    }
    return result;
  }

  /**
   * Calcule automatiquement tous les montants basés sur les paramètres de base
   */
  calculateAmounts(tax_rules: any[] = []): void {
    if (!this.employees_added_count || !this.months_remaining || !this.price_per_employee_usd || !this.exchange_rate_used) {
      throw new Error('Missing required parameters for amount calculation');
    }

    const amounts = LicenseAdjustment.calculateAdjustmentAmounts(
      this.employees_added_count,
      this.months_remaining,
      this.price_per_employee_usd,
      tax_rules,
      this.exchange_rate_used
    );

    this.subtotal_usd = amounts.subtotal_usd;
    this.tax_amount_usd = amounts.tax_amount_usd;
    this.total_amount_usd = amounts.total_amount_usd;
    this.subtotal_local = amounts.subtotal_local;
    this.tax_amount_local = amounts.tax_amount_local;
    this.total_amount_local = amounts.total_amount_local;
    this.tax_rules_applied = tax_rules;
  }

  /**
   * Sauvegarde l'avenant de licence (création ou mise à jour)
   */
  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      console.error('⚠️ Erreur sauvegarde avenant de licence:', error.message);
      throw new Error(error);
    }
  }

  /**
   * Supprime l'avenant de licence
   */
  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: LicenseAdjustment Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  /**
   * Loads a LicenseAdjustment object based on the provided identifier and search method.
   */
  async load(
    identifier: any,
    byGuid: boolean = false,
  ): Promise<LicenseAdjustment | null> {
    const data = byGuid
      ? await this.findByGuid(identifier)
      : await this.find(Number(identifier));

    if (!data) return null;
    return this.hydrate(data);
  }

  /**
   * Liste les avenants selon les conditions
   */
  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new LicenseAdjustment().hydrate(data));
  }

  /**
   * Liste les avenants par licence globale
   */
  async listByGlobalLicense(
    global_license: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    const dataset = await this.listAllByGlobalLicense(global_license, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new LicenseAdjustment().hydrate(data));
  }

  /**
   * Liste les avenants par statut de paiement
   */
  async listByPaymentStatus(
    payment_status: PaymentTransactionStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    const dataset = await this.listAllByPaymentStatus(payment_status, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new LicenseAdjustment().hydrate(data));
  }

  /**
   * Liste les avenants par devise
   */
  async listByCurrency(
    billing_currency_code: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    const dataset = await this.listAllByCurrency(billing_currency_code, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new LicenseAdjustment().hydrate(data));
  }

  /**
   * Liste les avenants créés dans une période
   */
  async listCreatedBetween(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    const dataset = await this.listAllCreatedBetween(startDate, endDate, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new LicenseAdjustment().hydrate(data));
  }

  /**
   * Liste les avenants payés dans une période
   */
  async listPaidBetween(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    const dataset = await this.listAllPaidBetween(startDate, endDate, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new LicenseAdjustment().hydrate(data));
  }

  /**
   * Liste les avenants en attente de paiement
   */
  async listPendingPayment(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    const dataset = await this.listAllPendingPayment(paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new LicenseAdjustment().hydrate(data));
  }

  /**
   * Liste les avenants facturés mais non payés
   */
  async listInvoicedNotPaid(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<LicenseAdjustment[] | null> {
    const dataset = await this.listAllInvoicedNotPaid(paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new LicenseAdjustment().hydrate(data));
  }

  /**
   * Vérifie si l'avenant est nouveau
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
      [RS.ADJUSTMENT_DATE]: this.adjustment_date,
      [RS.EMPLOYEES_ADDED_COUNT]: this.employees_added_count,
      [RS.MONTHS_REMAINING]: this.months_remaining,
      [RS.PRICE_PER_EMPLOYEE_USD]: this.price_per_employee_usd,
      [RS.SUBTOTAL_USD]: this.subtotal_usd,
      [RS.TAX_AMOUNT_USD]: this.tax_amount_usd,
      [RS.TOTAL_AMOUNT_USD]: this.total_amount_usd,
      [RS.BILLING_CURRENCY_CODE]: this.billing_currency_code,
      [RS.EXCHANGE_RATE_USED]: this.exchange_rate_used,
      [RS.SUBTOTAL_LOCAL]: this.subtotal_local,
      [RS.TAX_AMOUNT_LOCAL]: this.tax_amount_local,
      [RS.TOTAL_AMOUNT_LOCAL]: this.total_amount_local,
      [RS.TAX_RULES_APPLIED]: this.tax_rules_applied,
      [RS.PAYMENT_STATUS]: this.payment_status,
      [RS.PAYMENT_DUE_IMMEDIATELY]: this.payment_due_immediately,
      [RS.INVOICE_SENT_AT]: this.invoice_sent_at,
      [RS.PAYMENT_COMPLETED_AT]: this.payment_completed_at,
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
    return `LicenseAdjustment { ${RS.ID}: ${this.id}, ${RS.GUID}: ${this.guid}, ${RS.GLOBAL_LICENSE}: ${this.global_license}, ${RS.EMPLOYEES_ADDED_COUNT}: ${this.employees_added_count}, ${RS.PAYMENT_STATUS}: "${this.payment_status}", ${RS.TOTAL_AMOUNT_USD}: ${this.total_amount_usd} }`;
  }

  /**
   * Hydrate l'instance avec les données
   */
  private hydrate(data: any): LicenseAdjustment {
    this.id = data.id;
    this.guid = data.guid;
    this.global_license = data.global_license;
    this.adjustment_date = data.adjustment_date;
    this.employees_added_count = data.employees_added_count;
    this.months_remaining = data.months_remaining;
    this.price_per_employee_usd = data.price_per_employee_usd;
    this.subtotal_usd = data.subtotal_usd;
    this.tax_amount_usd = data.tax_amount_usd;
    this.total_amount_usd = data.total_amount_usd;
    this.billing_currency_code = data.billing_currency_code;
    this.exchange_rate_used = data.exchange_rate_used;
    this.subtotal_local = data.subtotal_local;
    this.tax_amount_local = data.tax_amount_local;
    this.total_amount_local = data.total_amount_local;
    this.tax_rules_applied = data.tax_rules_applied;
    this.payment_status = data.payment_status;
    this.payment_due_immediately = data.payment_due_immediately;
    this.invoice_sent_at = data.invoice_sent_at;
    this.payment_completed_at = data.payment_completed_at;
    return this;
  }
}