import { PaymentTransactionStatus } from '@toke/shared';

import PaymentTransactionModel from '../model/PaymentTransactionModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import { responseStructure as RS, responseValue, tableName, ViewMode } from '../../utils/response.model.js';
import Revision from '../../tools/revision.js';

import BillingCycle from './BillingCycle.js';
import Currency from './Currency.js';
import LicenseAdjustment from './LicenseAdjustment.js';

export default class PaymentTransaction extends PaymentTransactionModel {

  private billingCycleObj?: BillingCycle;
  private adjustmentObj?: LicenseAdjustment;
  private currencyCodeObj?: Currency;
  constructor() {
    super();
  }

  // === MÉTHODES STATIQUES ===

  /**
   * Exports payment transaction items with revision information.
   */
  static async exportable(paginationOptions: { offset?: number; limit?: number } = {}): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    const revision = await Revision.getRevision(tableName.PAYMENT_TRANSACTION);
    let data: any[] = [];

    const allTransactions = await this._list({}, paginationOptions);
    if (allTransactions) {
      data = await Promise.all(allTransactions.map(async transaction => await transaction.toJSON()));
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
   * Loads a payment transaction based on the provided identifier.
   */
  static _load(
    identifier: any,
    byGuid: boolean = false,
    byReference: boolean = false,
  ): Promise<PaymentTransaction | null> {
    return new PaymentTransaction().load(identifier, byGuid, byReference);
  }

  /**
   * Liste les transactions selon les conditions
   */
  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    return new PaymentTransaction().list(conditions, paginationOptions);
  }

  /**
   * Liste les transactions par statut
   */
  static _listByStatus(
    status: PaymentTransactionStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    return new PaymentTransaction().listByStatus(status, paginationOptions);
  }

  /**
   * Liste les transactions par méthode de paiement
   */
  static _listByPaymentMethod(
    paymentMethod: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    return new PaymentTransaction().listByPaymentMethod(paymentMethod, paginationOptions);
  }

  /**
   * Liste les transactions par cycle de facturation
   */
  static _listByBillingCycle(
    billingCycle: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    return new PaymentTransaction().listByBillingCycle(billingCycle, paginationOptions);
  }

  /**
   * Liste les transactions par devise
   */
  static _listByCurrency(
    currencyCode: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    return new PaymentTransaction().listByCurrency(currencyCode, paginationOptions);
  }

  /**
   * Liste les transactions par plage de dates
   */
  static _listByDateRange(
    startDate: Date,
    endDate: Date,
    dateField: 'initiated_at' | 'completed_at' | 'failed_at' = 'initiated_at',
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    return new PaymentTransaction().listByDateRange(startDate, endDate, dateField, paginationOptions);
  }

  /**
   * Liste les transactions par plage de montant
   */
  static _listByAmountRange(
    minAmount: number,
    maxAmount: number,
    currency: 'usd' | 'local' = 'usd',
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    return new PaymentTransaction().listByAmountRange(minAmount, maxAmount, currency, paginationOptions);
  }

  /**
   * Convertit des données en objet PaymentTransaction
   */
  static _toObject(data: any): PaymentTransaction {
    return new PaymentTransaction().hydrate(data);
  }

  // /**
  //  * Calcul du total par statut
  //  */
  // static async getTotalByStatus(
  //   status: PaymentTransactionStatus,
  //   currency: 'usd' | 'local' = 'usd'
  // ): Promise<number> {
  //   return await new PaymentTransaction().getTotalAmountByStatus(status, currency);
  // }

  /**
   * Nombre de transactions par statut
   */
  static async getCountByStatus(status: PaymentTransactionStatus): Promise<number> {
    return await new PaymentTransaction().getTransactionCountByStatus(status);
  }

  // === SETTERS FLUENT ===

  /**
   * Crée une nouvelle transaction avec les paramètres de base
   */
  static createNew(data: {
    billing_cycle: number;
    adjustment: number;
    amount_usd: number;
    amount_local: number;
    currency_code: string;
    exchange_rate_used: number;
    payment_method: number;
    payment_reference: string;
  }): PaymentTransaction {
    return new PaymentTransaction()
      .setBillingCycle(data.billing_cycle)
      .setAdjustment(data.adjustment)
      .setAmountUsd(data.amount_usd)
      .setAmountLocal(data.amount_local)
      .setCurrencyCode(data.currency_code)
      .setExchangeRate(data.exchange_rate_used)
      .setPaymentMethod(data.payment_method)
      .setPaymentReference(data.payment_reference)
      .setInitiatedAt(new Date());
  }

  /**
   * Recherche par multiple critères
   */
  static async search(criteria: {
    status?: PaymentTransactionStatus;
    payment_method?: number;
    currency_code?: string;
    min_amount?: number;
    max_amount?: number;
    start_date?: Date;
    end_date?: Date;
    payment_reference?: string;
  }, paginationOptions: { offset?: number; limit?: number } = {}): Promise<PaymentTransaction[] | null> {
    const instance = new PaymentTransaction();
    const conditions: Record<string, any> = {};

    if (criteria.status) conditions[instance.db.transaction_status] = criteria.status;
    if (criteria.payment_method) conditions[instance.db.payment_method] = criteria.payment_method;
    if (criteria.currency_code) conditions[instance.db.currency_code] = criteria.currency_code.toUpperCase();
    if (criteria.payment_reference) conditions[instance.db.payment_reference] = criteria.payment_reference;

    let transactions = await instance.list(conditions, paginationOptions);
    if (!transactions) return null;

    // Filtrage supplémentaire pour les critères complexes
    if (criteria.min_amount || criteria.max_amount) {
      transactions = transactions.filter(transaction => {
        const amount = transaction.getAmountUsd() || 0;
        const minOk = !criteria.min_amount || amount >= criteria.min_amount;
        const maxOk = !criteria.max_amount || amount <= criteria.max_amount;
        return minOk && maxOk;
      });
    }

    if (criteria.start_date || criteria.end_date) {
      transactions = transactions.filter(transaction => {
        const date = transaction.getInitiatedAt();
        if (!date) return false;
        const startOk = !criteria.start_date || date >= criteria.start_date;
        const endOk = !criteria.end_date || date <= criteria.end_date;
        return startOk && endOk;
      });
    }

    return transactions;
  }

  /**
   * Statistiques des transactions
   */
  static async getStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total_count: number;
    by_status: Record<PaymentTransactionStatus, { count: number; total_usd: number }>;
    total_amount_usd: number;
    average_amount_usd: number;
    success_rate: number;
  }> {
    const instance = new PaymentTransaction();

    // Conditions de date si spécifiées
    const conditions: Record<string, any> = {};
    if (startDate) conditions[`${instance.db.initiated_at} >= ?`] = startDate;
    if (endDate) conditions[`${instance.db.initiated_at} <= ?`] = endDate;

    const allTransactions = await instance.list(conditions);
    if (!allTransactions || allTransactions.length === 0) {
      return {
        total_count: 0,
        by_status: {} as any,
        total_amount_usd: 0,
        average_amount_usd: 0,
        success_rate: 0,
      };
    }

    const stats: any = {
      total_count: allTransactions.length,
      by_status: {},
      total_amount_usd: 0,
      average_amount_usd: 0,
      success_rate: 0,
    };

    // Initialisation des statistiques par statut
    Object.values(PaymentTransactionStatus).forEach(status => {
      stats.by_status[status] = { count: 0, total_usd: 0 };
    });

    let completedCount = 0;

    // Calcul des statistiques
    allTransactions.forEach(transaction => {
      const status = transaction.getTransactionStatus()!;
      const amountUsd = transaction.getAmountUsd() || 0;

      stats.by_status[status].count++;
      stats.by_status[status].total_usd += amountUsd;
      stats.total_amount_usd += amountUsd;

      if (status === PaymentTransactionStatus.COMPLETED) {
        completedCount++;
      }
    });

    stats.average_amount_usd = Math.round((stats.total_amount_usd / stats.total_count) * 100) / 100;
    stats.success_rate = Math.round((completedCount / stats.total_count) * 100 * 100) / 100;

    return stats;
  }

  setBillingCycle(billing_cycle: number): PaymentTransaction {
    this.billing_cycle = billing_cycle;
    return this;
  }

  setAdjustment(adjustment: number): PaymentTransaction {
    this.adjustment = adjustment;
    return this;
  }

  setAmountUsd(amount_usd: number): PaymentTransaction {
    this.amount_usd = amount_usd;
    return this;
  }

  setAmountLocal(amount_local: number): PaymentTransaction {
    this.amount_local = amount_local;
    return this;
  }

  setCurrencyCode(currency_code: string): PaymentTransaction {
    this.currency_code = currency_code.toUpperCase();
    return this;
  }

  setExchangeRate(exchange_rate_used: number): PaymentTransaction {
    this.exchange_rate_used = exchange_rate_used;
    return this;
  }

  setPaymentMethod(payment_method: number): PaymentTransaction {
    this.payment_method = payment_method;
    return this;
  }

  setPaymentReference(payment_reference: string): PaymentTransaction {
    this.payment_reference = payment_reference;
    return this;
  }

  setTransactionStatus(transaction_status: PaymentTransactionStatus): PaymentTransaction {
    this.transaction_status = transaction_status;
    return this;
  }

  setInitiatedAt(initiated_at: Date): PaymentTransaction {
    this.initiated_at = initiated_at;
    return this;
  }

  // === GETTERS ===

  setCompletedAt(completed_at: Date): PaymentTransaction {
    this.completed_at = completed_at;
    return this;
  }

  setFailedAt(failed_at: Date): PaymentTransaction {
    this.failed_at = failed_at;
    return this;
  }

  setFailureReason(failure_reason: string): PaymentTransaction {
    this.failure_reason = failure_reason;
    return this;
  }

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): number | undefined {
    return this.guid;
  }

  async getBillingCycle(): Promise<BillingCycle | null> {
    if(!this.billing_cycle) return null;
    if (!this.billingCycleObj){
      this.billingCycleObj = (await BillingCycle._load(this.billing_cycle)) || undefined;
    }
    return this.billingCycleObj || null;
  }

  async getAdjustment(): Promise<LicenseAdjustment |null> {
    if(!this.adjustment) return null;
    if (!this.adjustmentObj){
      this.adjustmentObj = (await LicenseAdjustment._load(this.adjustment)) || undefined;
    }
    return this.adjustmentObj || null;
  }

  getAmountUsd(): number | undefined {
    return this.amount_usd;
  }

  getAmountLocal(): number | undefined {
    return this.amount_local;
  }

  async getCurrencyCode(): Promise<Currency | null> {
    if (!this.currency_code) return null;
    if (!this.currencyCodeObj){
      this.currencyCodeObj = (await Currency._load(this.currency_code)) || undefined;
    }
    return this.currencyCodeObj || null;
  }

  getExchangeRate(): number | undefined {
    return this.exchange_rate_used;
  }

  getPaymentMethod(): number | undefined {
    return this.payment_method;
  }

  getPaymentReference(): string | undefined {
    return this.payment_reference;
  }

  getTransactionStatus(): PaymentTransactionStatus | undefined {
    return this.transaction_status;
  }

  getInitiatedAt(): Date | undefined {
    return this.initiated_at;
  }

  getCompletedAt(): Date | undefined {
    return this.completed_at;
  }

  // === MÉTHODES MÉTIER ===

  getFailedAt(): Date | undefined {
    return this.failed_at;
  }

  getFailureReason(): string | undefined {
    return this.failure_reason;
  }

  /**
   * Obtient l'identifiant sous forme de chaîne (GUID)
   */
  getIdentifier(): string {
    return this.guid?.toString() || 'Unknown';
  }

  /**
   * Vérifie si la transaction est en attente
   */
  isPending(): boolean {
    return this.transaction_status === PaymentTransactionStatus.PENDING;
  }

  /**
   * Vérifie si la transaction est en cours de traitement
   */
  isProcessing(): boolean {
    return this.transaction_status === PaymentTransactionStatus.PROCESSING;
  }

  /**
   * Vérifie si la transaction est terminée avec succès
   */
  isCompleted(): boolean {
    return this.transaction_status === PaymentTransactionStatus.COMPLETED;
  }

  /**
   * Vérifie si la transaction a échoué
   */
  isFailed(): boolean {
    return this.transaction_status === PaymentTransactionStatus.FAILED;
  }

  /**
   * Vérifie si la transaction a été annulée
   */
  isCancelled(): boolean {
    return this.transaction_status === PaymentTransactionStatus.CANCELLED;
  }

  /**
   * Vérifie si la transaction a été remboursée
   */
  isRefunded(): boolean {
    return this.transaction_status === PaymentTransactionStatus.REFUNDED;
  }

  /**
   * Vérifie si la transaction est finale (terminée, échouée, annulée ou remboursée)
   */
  isFinal(): boolean {
    return [
      PaymentTransactionStatus.COMPLETED,
      PaymentTransactionStatus.FAILED,
      PaymentTransactionStatus.CANCELLED,
      PaymentTransactionStatus.REFUNDED
    ].includes(this.transaction_status!);
  }

  /**
   * Calcule la durée de traitement en millisecondes
   */
  getProcessingDuration(): number | null {
    if (!this.initiated_at) return null;

    const endTime = this.completed_at || this.failed_at || new Date();
    return endTime.getTime() - this.initiated_at.getTime();
  }

  // === ACTIONS SUR LES TRANSACTIONS ===

  /**
   * Calcule la durée de traitement en format lisible
   */
  getFormattedProcessingDuration(): string | null {
    const duration = this.getProcessingDuration();
    if (!duration) return null;

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}j ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Vérifie la cohérence des montants avec le taux de change
   */
  isAmountConsistent(): boolean {
    if (!this.amount_usd || !this.amount_local || !this.exchange_rate_used) {
      return false;
    }

    const calculatedLocal = this.amount_usd * this.exchange_rate_used;
    const tolerance = 0.01;
    return Math.abs(calculatedLocal - this.amount_local) <= tolerance;
  }

  /**
   * Calcule le montant local théorique basé sur le taux de change
   */
  calculateExpectedLocalAmount(): number | null {
    if (!this.amount_usd || !this.exchange_rate_used) return null;
    return Math.round(this.amount_usd * this.exchange_rate_used * 100) / 100;
  }

  /**
   * Démarre le traitement de la transaction
   */
  async startProcessing(): Promise<void> {
    if (!this.isPending()) {
      throw new Error('Only pending transactions can be started');
    }
    await this.markAsProcessing();
  }

  /**
   * Complète la transaction avec succès
   */
  async complete(): Promise<void> {
    if (!this.isProcessing()) {
      throw new Error('Only processing transactions can be completed');
    }
    await this.markAsCompleted();
  }

  // === MÉTHODES DE LISTE ===

  /**
   * Marque la transaction comme échouée
   */
  async fail(reason: string): Promise<void> {
    if (this.isFinal()) {
      throw new Error('Cannot fail a final transaction');
    }
    await this.markAsFailed(reason);
  }

  /**
   * Annule la transaction
   */
  async cancel(): Promise<void> {
    if (this.isFinal()) {
      throw new Error('Cannot cancel a final transaction');
    }
    await this.markAsCancelled();
  }

  /**
   * Rembourse la transaction
   */
  async refund(): Promise<void> {
    if (!this.isCompleted()) {
      throw new Error('Only completed transactions can be refunded');
    }
    await this.markAsRefunded();
  }

  async load(
    identifier: any,
    byGuid: boolean = false,
    byReference: boolean = false,
  ): Promise<PaymentTransaction | null> {
    let data = null;

    if (byReference) {
      data = await this.findByPaymentReference(identifier);
    } else if (byGuid) {
      data = await this.findByGuid(identifier);
    } else {
      data = await this.find(Number(identifier));
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new PaymentTransaction().hydrate(data));
  }

  async listByStatus(
    status: PaymentTransactionStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    const dataset = await this.listAllByTransactionStatus(status, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new PaymentTransaction().hydrate(data));
  }

  async listByPaymentMethod(
    paymentMethod: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    const dataset = await this.listAllByPaymentMethod(paymentMethod, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new PaymentTransaction().hydrate(data));
  }

  async listByBillingCycle(
    billingCycle: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    const dataset = await this.listAllByBillingCycle(billingCycle, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new PaymentTransaction().hydrate(data));
  }

  // === GESTION D'ENTITÉ ===

  async listByCurrency(
    currencyCode: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    const dataset = await this.listAllByCurrencyCode(currencyCode.toUpperCase(), paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new PaymentTransaction().hydrate(data));
  }

  async listByDateRange(
    startDate: Date,
    endDate: Date,
    dateField: 'initiated_at' | 'completed_at' | 'failed_at' = 'initiated_at',
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    const dataset = await this.listAllByDateRange(startDate, endDate, dateField, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new PaymentTransaction().hydrate(data));
  }

  async listByAmountRange(
    minAmount: number,
    maxAmount: number,
    currency: 'usd' | 'local' = 'usd',
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentTransaction[] | null> {
    const dataset = await this.listAllByAmountRange(minAmount, maxAmount, currency, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new PaymentTransaction().hydrate(data));
  }

  // === CONVERSION ET AFFICHAGE ===

  /**
   * Vérifie si la transaction est nouvelle
   */
  isNew(): boolean {
    return this.id === undefined;
  }

  /**
   * Sauvegarde la transaction (création ou mise à jour)
   */
  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      console.error('⚠️ Erreur sauvegarde transaction de paiement:', error.message);
      throw new Error(error);
    }
  }

  /**
   * Supprime la transaction
   */
  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: PaymentTransaction Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  /**
   * Conversion JSON pour API
   */
  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {

    const billingCycle = await this.getBillingCycle();
    const adjustment = await this.getAdjustment();
    const baseData = {
      [RS.GUID]: this.guid,
      [RS.AMOUNT_USD]: this.amount_usd,
      [RS.AMOUNT_LOCAL]: this.amount_local,
      [RS.CURRENCY_CODE]: this.currency_code,
      [RS.EXCHANGE_RATE_USED]: this.exchange_rate_used,
      [RS.PAYMENT_METHOD]: this.payment_method,
      [RS.PAYMENT_REFERENCE]: this.payment_reference,
      [RS.TRANSACTION_STATUS]: this.transaction_status,
      [RS.INITIATED_AT]: this.initiated_at,
      [RS.COMPLETED_AT]: this.completed_at,
      [RS.FAILED_AT]: this.failed_at,
      [RS.FAILURE_REASON]: this.failure_reason,
      processing_duration: this.getFormattedProcessingDuration(),
      is_amount_consistent: this.isAmountConsistent(),
      is_final: this.isFinal(),
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.BILLING_CYCLE]: billingCycle?.getGuid(),
        [RS.ADJUSTMENT]: adjustment?.getGuid(),
      };
    }
    return {
      ...baseData,
      [RS.BILLING_CYCLE]: billingCycle?.toJSON(responseValue.MINIMAL),
      [RS.ADJUSTMENT]: adjustment?.toJSON(responseValue.MINIMAL),
    };

  }

  // === MÉTHODES UTILITAIRES STATIQUES ===

  /**
   * Représentation string
   */
  toString(): string {
    return `PaymentTransaction { ${RS.ID}: ${this.id}, ${RS.GUID}: ${this.guid}, ${RS.PAYMENT_REFERENCE}: "${this.payment_reference}", ${RS.TRANSACTION_STATUS}: ${this.transaction_status}, ${RS.AMOUNT_USD}: ${this.amount_usd}, ${RS.CURRENCY_CODE}: "${this.currency_code}" }`;
  }

  /**
   * Résumé court de la transaction
   */
  getSummary(): string {
    const amount = this.amount_local || this.amount_usd || 0;
    const currency = this.currency_code || 'USD';
    const status = this.transaction_status || 'UNKNOWN';
    const reference = this.payment_reference || 'No ref';

    return `${reference} - ${amount} ${currency} - ${status}`;
  }

  /**
   * Informations détaillées de la transaction
   */
  getDetails(): {
    identifier: string;
    reference: string;
    status: string;
    amounts: {
      usd: number | undefined;
      local: number | undefined;
      currency: string | undefined;
      exchange_rate: number | undefined;
    };
    dates: {
      initiated: Date | undefined;
      completed: Date | undefined;
      failed: Date | undefined;
    };
    processing_info: {
      duration: string | null;
      is_consistent: boolean;
      is_final: boolean;
    };
    failure_info?: {
      reason: string | undefined;
      failed_at: Date | undefined;
    };
  } {
    const details: any = {
      identifier: this.getIdentifier(),
      reference: this.payment_reference || 'N/A',
      status: this.transaction_status || 'UNKNOWN',
      amounts: {
        usd: this.amount_usd,
        local: this.amount_local,
        currency: this.currency_code,
        exchange_rate: this.exchange_rate_used,
      },
      dates: {
        initiated: this.initiated_at,
        completed: this.completed_at,
        failed: this.failed_at,
      },
      processing_info: {
        duration: this.getFormattedProcessingDuration(),
        is_consistent: this.isAmountConsistent(),
        is_final: this.isFinal(),
      },
    };

    if (this.isFailed() && (this.failure_reason || this.failed_at)) {
      details.failure_info = {
        reason: this.failure_reason,
        failed_at: this.failed_at,
      };
    }

    return details;
  }

  // === HYDRATATION ===

  /**
   * Hydrate l'instance avec les données
   */
  private hydrate(data: any): PaymentTransaction {
    this.id = data.id;
    this.guid = data.guid;
    this.billing_cycle = data.billing_cycle;
    this.adjustment = data.adjustment;
    this.amount_usd = data.amount_usd;
    this.amount_local = data.amount_local;
    this.currency_code = data.currency_code;
    this.exchange_rate_used = data.exchange_rate_used;
    this.payment_method = data.payment_method;
    this.payment_reference = data.payment_reference;
    this.transaction_status = data.transaction_status;
    this.initiated_at = data.initiated_at;
    this.completed_at = data.completed_at;
    this.failed_at = data.failed_at;
    this.failure_reason = data.failure_reason;
    return this;
  }
}