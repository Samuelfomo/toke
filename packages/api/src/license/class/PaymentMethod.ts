import PaymentMethodModel from '../model/PaymentMethodModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import { responseStructure as RS, responseValue, tableName, ViewMode } from '../../utils/response.model.js';
import Revision from '../../tools/revision.js';

export default class PaymentMethod extends PaymentMethodModel {
  constructor() {
    super();
  }

  /**
   * Exports payment method items with revision information.
   */
  static async exportable(paginationOptions: { offset?: number; limit?: number } = {}): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    const revision = await Revision.getRevision(tableName.PAYMENT_METHOD);
    let data: any[] = [];

    const allMethods = await this._list({}, paginationOptions);
    if (allMethods) {
      data = await Promise.all(allMethods.map(async method => await method.toJSON()));
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
   * Loads a payment method based on the provided identifier.
   */
  static _load(
    identifier: any,
    byGuid: boolean = false,
    byCode: boolean = false,
  ): Promise<PaymentMethod | null> {
    return new PaymentMethod().load(identifier, byGuid, byCode);
  }

  /**
   * Liste les moyens de paiement selon les conditions
   */
  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentMethod[] | null> {
    return new PaymentMethod().list(conditions, paginationOptions);
  }

  /**
   * Liste les moyens de paiement actifs ou inactifs
   */
  static _listByActiveStatus(
    active: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentMethod[] | null> {
    return new PaymentMethod().listByActiveStatus(active, paginationOptions);
  }

  /**
   * Liste les moyens de paiement par type
   */
  static _listByMethodType(
    methodType: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentMethod[] | null> {
    return new PaymentMethod().listByMethodType(methodType, paginationOptions);
  }

  /**
   * Liste les moyens de paiement supportant une devise
   */
  static _listBySupportedCurrency(
    currency: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentMethod[] | null> {
    return new PaymentMethod().listBySupportedCurrency(currency, paginationOptions);
  }

  /**
   * Liste les moyens de paiement par plage de montant
   */
  static _listByAmountRange(
    amount: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentMethod[] | null> {
    return new PaymentMethod().listByAmountRange(amount, paginationOptions);
  }

  /**
   * Convertit des données en objet PaymentMethod
   */
  static _toObject(data: any): PaymentMethod {
    return new PaymentMethod().hydrate(data);
  }

  // === SETTERS FLUENT ===
  setCode(code: string): PaymentMethod {
    this.code = code;
    return this;
  }

  setName(name: string): PaymentMethod {
    this.name = name;
    return this;
  }

  setMethodType(method_type: string): PaymentMethod {
    this.method_type = method_type;
    return this;
  }

  setSupportedCurrencies(supported_currencies: string[]): PaymentMethod {
    this.supported_currencies = supported_currencies;
    return this;
  }

  setActive(active: boolean): PaymentMethod {
    this.active = active;
    return this;
  }

  setProcessingFeeRate(processing_fee_rate: number): PaymentMethod {
    this.processing_fee_rate = processing_fee_rate;
    return this;
  }

  setMinAmountUsd(min_amount_usd: number): PaymentMethod {
    this.min_amount_usd = min_amount_usd;
    return this;
  }

  setMaxAmountUsd(max_amount_usd: number): PaymentMethod {
    this.max_amount_usd = max_amount_usd;
    return this;
  }

  // === GETTERS ===
  getId(): number | undefined {
    return this.id;
  }

  getGuid(): number | undefined {
    return this.guid;
  }

  getCode(): string | undefined {
    return this.code;
  }

  getName(): string | undefined {
    return this.name;
  }

  getMethodType(): string | undefined {
    return this.method_type;
  }

  getSupportedCurrencies(): Array<string> | string | undefined {
    return this.supported_currencies;
  }

  isActive(): boolean {
    return this.active || false;
  }

  getProcessingFeeRate(): number | undefined {
    return this.processing_fee_rate;
  }

  getMinAmountUsd(): number | undefined {
    return this.min_amount_usd;
  }

  getMaxAmountUsd(): number | undefined {
    return this.max_amount_usd;
  }

  /**
   * Obtient l'identifiant sous forme de chaîne (GUID)
   */
  getIdentifier(): string {
    return this.guid?.toString() || 'Unknown';
  }

  /**
   * Vérifie si le moyen de paiement supporte une devise
   */
  supportsCurrency(currency: string): boolean {
    if (!this.supported_currencies) return false;

    const currencies = Array.isArray(this.supported_currencies)
      ? this.supported_currencies
      : [this.supported_currencies];

    return currencies.includes(currency.toUpperCase());
  }

  /**
   * Vérifie si le montant est dans la plage autorisée
   */
  isAmountInRange(amountUsd: number): boolean {
    const min = this.min_amount_usd || 0;
    const max = this.max_amount_usd ?? Infinity;
    return amountUsd >= min && amountUsd <= max;
  }

  /**
   * Calcule les frais de traitement pour un montant donné
   */
  calculateProcessingFee(amountUsd: number): number {
    const rate = this.processing_fee_rate || 0;
    return Math.round(amountUsd * rate * 100) / 100;
  }

  /**
   * Calcule le montant total avec frais de traitement
   */
  calculateTotalWithFees(amountUsd: number): number {
    return amountUsd + this.calculateProcessingFee(amountUsd);
  }

  /**
   * Vérifie si le moyen de paiement est disponible pour un montant et une devise
   */
  isAvailableFor(amountUsd: number, currency: string): boolean {
    return this.isActive() &&
      this.supportsCurrency(currency) &&
      this.isAmountInRange(amountUsd);
  }

  /**
   * Vérifie si c'est un moyen de paiement mobile
   */
  isMobilePayment(): boolean {
    const mobileTypes = ['MOBILE_MONEY', 'MTN_MOMO', 'ORANGE_MONEY'];
    return mobileTypes.some(type =>
      this.method_type?.toUpperCase().includes(type) ||
      this.code?.toUpperCase().includes(type)
    );
  }

  /**
   * Vérifie si c'est un paiement par carte
   */
  isCardPayment(): boolean {
    const cardTypes = ['CARD', 'CREDIT_CARD', 'STRIPE'];
    return cardTypes.some(type =>
      this.method_type?.toUpperCase().includes(type) ||
      this.code?.toUpperCase().includes(type)
    );
  }

  /**
   * Vérifie si c'est un virement bancaire
   */
  isBankTransfer(): boolean {
    const bankTypes = ['BANK_TRANSFER', 'WIRE', 'SEPA'];
    return bankTypes.some(type =>
      this.method_type?.toUpperCase().includes(type) ||
      this.code?.toUpperCase().includes(type)
    );
  }

  /**
   * Active le moyen de paiement
   */
  async activateMethod(): Promise<void> {
    const instance = new PaymentMethod();
    await instance.activate();
    // await super.activate();
  }

  /**
   * Désactive le moyen de paiement
   */
  async deactivateMethod(): Promise<void> {
    await (new PaymentMethod()).deactivate();
  }

  /**
   * Sauvegarde le moyen de paiement (création ou mise à jour)
   */
  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      console.error('⚠️ Erreur sauvegarde moyen de paiement:', error.message);
      throw new Error(error);
    }
  }

  /**
   * Supprime le moyen de paiement
   */
  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: PaymentMethod Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  /**
   * Loads a PaymentMethod object based on the provided identifier and search method.
   */
  async load(
    identifier: any,
    byGuid: boolean = false,
    byCode: boolean = false,
  ): Promise<PaymentMethod | null> {
    let data = null;

    if (byCode) {
      data = await this.findByCode(identifier);
    } else if (byGuid) {
      data = await this.findByGuid(identifier);
    } else {
      data = await this.find(Number(identifier));
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  /**
   * Liste les moyens de paiement selon les conditions
   */
  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentMethod[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new PaymentMethod().hydrate(data));
  }

  /**
   * Liste les moyens de paiement par statut actif
   */
  async listByActiveStatus(
    active: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentMethod[] | null> {
    const dataset = await this.listAllByActiveStatus(active, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new PaymentMethod().hydrate(data));
  }

  /**
   * Liste les moyens de paiement par type
   */
  async listByMethodType(
    methodType: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentMethod[] | null> {
    const dataset = await this.listAllByMethodType(methodType, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new PaymentMethod().hydrate(data));
  }

  /**
   * Liste les moyens de paiement supportant une devise
   */
  async listBySupportedCurrency(
    currency: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentMethod[] | null> {
    const allMethods = await this.listAll({}, paginationOptions);
    if (!allMethods) return null;

    const filtered = allMethods.filter(data => {
      const method = new PaymentMethod().hydrate(data);
      return method.supportsCurrency(currency);
    });

    return filtered.map((data) => new PaymentMethod().hydrate(data));
  }

  /**
   * Liste les moyens de paiement disponibles pour un montant donné
   */
  async listByAmountRange(
    amount: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<PaymentMethod[] | null> {
    const allMethods = await this.listAll({}, paginationOptions);
    if (!allMethods) return null;

    const filtered = allMethods.filter(data => {
      const method = new PaymentMethod().hydrate(data);
      return method.isAmountInRange(amount);
    });

    return filtered.map((data) => new PaymentMethod().hydrate(data));
  }

  /**
   * Vérifie si le moyen de paiement est nouveau
   */
  isNew(): boolean {
    return this.id === undefined;
  }

  /**
   * Conversion JSON pour API
   */
  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const baseData = {
      [RS.GUID]: this.guid,
      [RS.CODE]: this.code,
      [RS.NAME]: this.name,
      [RS.METHOD_TYPE]: this.method_type,
      [RS.SUPPORTED_CURRENCIES]: this.supported_currencies,
      [RS.ACTIVE]: this.active,
      [RS.PROCESSING_FEE_RATE]: this.processing_fee_rate,
      [RS.MIN_AMOUNT_USD]: this.min_amount_usd,
      [RS.MAX_AMOUNT_USD]: this.max_amount_usd,
    };

    if (view === responseValue.MINIMAL) {
      return {
        [RS.GUID]: this.guid,
        [RS.CODE]: this.code,
        [RS.NAME]: this.name,
        [RS.ACTIVE]: this.active,
      };
    }

    return baseData;
  }

  /**
   * Représentation string
   */
  toString(): string {
    return `PaymentMethod { ${RS.ID}: ${this.id}, ${RS.GUID}: ${this.guid}, ${RS.CODE}: "${this.code}", ${RS.NAME}: "${this.name}", ${RS.ACTIVE}: ${this.active} }`;
  }

  /**
   * Hydrate l'instance avec les données
   */
  private hydrate(data: any): PaymentMethod {
    this.id = data.id;
    this.guid = data.guid;
    this.code = data.code;
    this.name = data.name;
    this.method_type = data.method_type;
    this.supported_currencies = data.supported_currencies;
    this.active = data.active;
    this.processing_fee_rate = data.processing_fee_rate;
    this.min_amount_usd = data.min_amount_usd;
    this.max_amount_usd = data.max_amount_usd;
    return this;
  }
}