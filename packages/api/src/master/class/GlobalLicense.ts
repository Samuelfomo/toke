import {
  BillingCycle,
  BillingStatus,
  LicenseStatus,
  PaymentTransactionStatus,
  Type,
} from '@toke/shared';

import GlobalLicenseModel from '../model/GlobalLicenseModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import {
  responseStructure as RS,
  responseValue,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import Revision from '../../tools/revision.js';

import Tenant from './Tenant.js';
import ExchangeRate from './ExchangeRate.js';
import Billing from './BillingCycle.js';
import PaymentMethod from './PaymentMethod.js';
import LicenseAdjustment from './LicenseAdjustment.js';
import PaymentTransaction from './PaymentTransaction.js';
import TaxRule from './TaxRule.js';

export default class GlobalLicense extends GlobalLicenseModel {
  private tenantObject?: Tenant;

  constructor() {
    super();
  }

  /**
   * Exports global master items with revision information.
   */
  static async exportable(paginationOptions: { offset?: number; limit?: number } = {}): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    const revision = await Revision.getRevision(tableName.GLOBAL_LICENSE);
    let data: any[] = [];

    const allLicenses = await this._list(
      { ['license_status']: LicenseStatus.ACTIVE },
      paginationOptions,
    );
    if (allLicenses) {
      data = await Promise.all(allLicenses.map(async (license) => await license.toJSON()));
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
   * Loads a global master based on the provided identifier.
   */
  static _load(
    identifier: any,
    byGuid: boolean = false,
    byTenant: boolean = false,
  ): Promise<GlobalLicense | null> {
    return new GlobalLicense().load(identifier, byGuid, byTenant);
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

  // ❌ SUPPRIMÉ: setTotalSeatsPurchased() - colonne générée automatiquement

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
      this.tenantObject = (await Tenant._load(this.tenant)) || undefined;
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

  /**
   * ✅ Getter pour total_seats_purchased (colonne calculée)
   */
  getTotalSeatsPurchased(): number {
    return this.getTotalSeatsPurchasedValue();
  }

  /**
   * ✅ Getter pour billing_status (colonne calculée)
   */
  getBillingStatus(): string | undefined {
    return this.getBillingStatusValue();
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
   * ✅ Utilise getTotalSeatsPurchased() au lieu d'accéder directement à la propriété
   */
  calculateMonthlyPrice(): number {
    if (!this.base_price_usd || !this.minimum_seats) return 0;
    const seatsToCharge = Math.max(this.getTotalSeatsPurchased(), this.minimum_seats);
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
   * Sauvegarde la licence globale avec création automatique du premier cycle de facturation (création ou mise à jour)
   */
  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();

        // ✅ NOUVEAU : Créer automatiquement le premier cycle de facturation
        await this.createInitialBillingCycle();

        console.log(
          `✅ Licence globale créée avec cycle de facturation initial - GUID: ${this.guid}`,
        );
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
   * ✅ Les colonnes calculées sont automatiquement chargées dans les méthodes find*()
   */
  async load(
    identifier: any,
    byGuid: boolean = false,
    byTenant: boolean = false,
  ): Promise<GlobalLicense | null> {
    const data = byGuid
      ? await this.findByGuid(identifier)
      : byTenant
        ? await this.findByTenant(identifier)
        : await this.find(Number(identifier));

    if (!data) return null;

    // ✅ hydrate() charge maintenant aussi les colonnes calculées depuis data
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
   * ✅ Utilise getTotalSeatsPurchased() pour accéder à la colonne calculée
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
      [RS.TOTAL_SEATS_PURCHASED]: this.getTotalSeatsPurchased(), // ✅ Utilise le getter
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
   * ✅ Hydrate aussi les colonnes calculées si elles sont présentes dans data
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
    this.license_status = data.license_status;

    // ✅ Hydrater les colonnes calculées si présentes dans data
    // (elles sont retournées par les raw queries dans GlobalLicenseModel)
    if (data.total_seats_purchased !== undefined) {
      this['_total_seats_purchased'] = data.total_seats_purchased;
    }
    if (data.billing_status !== undefined) {
      this['_billing_status'] = data.billing_status;
    }

    return this;
  }

  /**
   * Crée le cycle de facturation initial pour la licence
   */
  private async createInitialBillingCycle(): Promise<Billing> {
    if (!this.id) {
      throw new Error('License ID is required to create initial billing cycle');
    }

    // Récupérer la devise et le taux de change
    const tenant = await this.getTenantObject();
    if (!tenant) {
      throw new Error('Tenant not found for license');
    }

    const currencyCode = tenant.getPrimaryCurrencyCode();

    // Récupérer le taux de change USD -> devise locale
    let exchangeRate = 1.0;
    const fromCurrent = 'USD';
    if (currencyCode !== fromCurrent) {
      const identifier = {
        from: fromCurrent,
        to: currencyCode,
      };
      const exchangeRateObj = await ExchangeRate._load(identifier, false, true);
      if (exchangeRateObj) {
        exchangeRate = exchangeRateObj.getExchangeRate()!;
      }
    }

    // Calculer le montant de base
    const baseEmployeeCount = Math.max(this.getTotalSeatsPurchased(), this.getMinimumSeats() || 0);

    const monthlyPrice = (this.getBasePriceUsd() || 0) * baseEmployeeCount;
    const billingMonths = Number(this.getBillingCycleMonths() || 1);
    const baseAmountUsd = monthlyPrice * billingMonths;
    const baseAmountLocal = baseAmountUsd * exchangeRate;

    // Récupérer les règles fiscales du pays
    const taxRulesData = await TaxRule._listByCountryCode(tenant.getCountryCode()!);
    if (!taxRulesData) {
      throw new Error('Error xd test2');
    }
    const taxRules = taxRulesData.map((data: any) => TaxRule._toObject(data));

    // Calculer les taxes
    let taxAmountUsd = 0;
    let taxAmountLocal = 0;

    taxRules.forEach((rule) => {
      taxAmountUsd += baseAmountUsd * rule.getTaxRate()!;
      taxAmountLocal += baseAmountLocal * rule.getTaxRate()!;
    });

    // Calculer les totaux
    const totalAmountUsd = baseAmountUsd + taxAmountUsd;

    const totalAmountLocal = baseAmountLocal + taxAmountLocal;

    // Créer le cycle de facturation

    const billingCycleData = new Billing()
      .setGlobalLicense(this.id)
      .setPeriodStart(this.current_period_start!)
      .setPeriodEnd(this.current_period_end!)
      .setBaseEmployeeCount(baseEmployeeCount)
      .setFinalEmployeeCount(baseEmployeeCount)
      .setBaseAmountUsd(baseAmountUsd)
      .setAdjustmentsAmountUsd(0)
      .setTaxAmountUsd(taxAmountUsd)
      .setBillingCurrencyCode(currencyCode!)
      .setExchangeRateUsed(exchangeRate)
      .setBaseAmountLocal(baseAmountLocal)
      .setAdjustmentsAmountLocal(0)
      .setTaxAmountLocal(taxAmountLocal)
      .setTaxRulesApplied(taxRules?.map((entry) => entry)!)
      .setBillingStatus(BillingStatus.PENDING)
      .setPaymentDueDate(
        new Date(new Date(this.current_period_end!).getTime() + 7 * 24 * 60 * 60 * 1000), // J+7
      );

    await billingCycleData.save();

    console.log(
      `✅ Cycle de facturation initial créé - ID: ${billingCycleData.getId()}, Montant: ${totalAmountLocal} ${currencyCode}`,
    );

    // ✅ Créer automatiquement la transaction de paiement
    await this.createInitialPaymentTransaction(billingCycleData);

    return billingCycleData;
  }

  /**
   * Crée la transaction de paiement initiale pour le cycle de facturation
   */
  private async createInitialPaymentTransaction(billingCycle: Billing): Promise<void> {
    if (!billingCycle.getId()) {
      throw new Error('BillingCycle ID is required');
    }

    // Récupérer le tenant pour la méthode de paiement par défaut
    const tenant = await this.getTenantObject();
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Récupérer la méthode de paiement par défaut pour le pays
    // const defaultPaymentMethod = await PaymentMethod.getDefaultForCountry(tenant.getCountryCode());
    const methods = await PaymentMethod._list();

    if (!methods?.length) {
      throw new Error(`No default payment method found for country ${tenant.getCountryCode()}`);
    }
    const defaultPaymentMethod = methods[0];

    // Créer une transaction fictive pour l'avenant (montant 0 car cycle de base)
    const dummyAdjustment = new LicenseAdjustment()
      .setGlobalLicense(this.id!)
      .setAdjustmentDate(new Date())
      .setEmployeesAddedCount(this.minimum_seats!)
      .setMonthsRemaining(Number(this.billing_cycle_months || 1))
      .setPricePerEmployeeUsd(this.base_price_usd || 0)
      .setSubtotalUsd(0)
      .setTaxAmountUsd(0)
      .setTotalAmountUsd(0)
      .setBillingCurrencyCode(billingCycle.getBillingCurrencyCode()!)
      .setExchangeRateUsed(billingCycle.getExchangeRateUsed()!)
      .setSubtotalLocal(0)
      .setTaxAmountLocal(0)
      .setTotalAmountLocal(0)
      .setPaymentStatus(PaymentTransactionStatus.COMPLETED) // Déjà inclus dans le cycle
      .setPaymentDueImmediately(false);

    await dummyAdjustment.save();

    // Créer la transaction de paiement

    const transaction = PaymentTransaction.createNew({
      billing_cycle: billingCycle.getId()!,
      adjustment: dummyAdjustment.getId()!,
      amount_usd: billingCycle.getTotalAmountUsd()!,
      amount_local: billingCycle.getTotalAmountLocal()!,
      currency_code: billingCycle.getBillingCurrencyCode()!,
      exchange_rate_used: billingCycle.getExchangeRateUsed()!,
      payment_method: defaultPaymentMethod.getId()!,
    });

    await transaction.save();

    console.log(
      `✅ Transaction de paiement créée - ID: ${transaction.getId()}, Référence: ${transaction.getPaymentReference()}`,
    );

    // ✅ Envoyer l'email avec le lien de paiement
    await this.sendPaymentEmail(transaction, billingCycle);
  }

  /**
   * Envoie l'email avec le lien de paiement
   */
  private async sendPaymentEmail(transaction: any, billingCycle: any): Promise<void> {
    try {
      const tenant = await this.getTenantObject();
      if (!tenant) return;

      // TODO: Implémenter l'envoi d'email via votre service de mailing
      const emailData = {
        to: tenant.getBillingEmail(),
        subject: `Nouvelle facture TOKÉ - ${transaction.getPaymentReference()}`,
        template: 'new_invoice',
        data: {
          tenant_name: tenant.getName(),
          reference: transaction.getPaymentReference(),
          amount: billingCycle.getTotalAmountLocal(),
          currency: billingCycle.getBillingCurrencyCode(),
          due_date: billingCycle.getPaymentDueDate(),
          payment_link: `${process.env.PAYMENT_BASE_URL}/pay/${transaction.getGuid()}`,
        },
      };

      console.log('📧 Email de paiement préparé:', emailData);
      // await EmailService.send(emailData);
    } catch (error) {
      console.error('⚠️ Erreur envoi email de paiement:', error);
      // Ne pas bloquer la création de la licence si l'email échoue
    }
  }
}

// import { BillingCycle, LicenseStatus, Type } from '@toke/shared';
//
// import GlobalLicenseModel from '../model/GlobalLicenseModel.js';
// import W from '../../tools/watcher.js';
// import G from '../../tools/glossary.js';
// import {
//   responseStructure as RS,
//   responseValue,
//   tableName,
//   ViewMode,
// } from '../../utils/response.model.js';
// import Revision from '../../tools/revision.js';
//
// import Tenant from './Tenant.js';
//
// export default class GlobalLicense extends GlobalLicenseModel {
//   private tenantObject?: Tenant;
//   constructor() {
//     super();
//   }
//
//   /**
//    * Exports global master items with revision information.
//    */
//   static async exportable(paginationOptions: { offset?: number; limit?: number } = {}): Promise<{
//     revision: string;
//     pagination: { offset?: number; limit?: number; count?: number };
//     items: any[];
//   }> {
//     const revision = await Revision.getRevision(tableName.GLOBAL_LICENSE);
//     let data: any[] = [];
//
//     const allLicenses = await this._list(
//       { ['license_status']: LicenseStatus.ACTIVE },
//       paginationOptions,
//     );
//     if (allLicenses) {
//       data = await Promise.all(allLicenses.map(async (license) => await license.toJSON()));
//     }
//
//     return {
//       revision,
//       pagination: {
//         offset: paginationOptions.offset || 0,
//         limit: paginationOptions.limit || data.length,
//         count: data.length,
//       },
//       items: data,
//     };
//   }
//
//   /**
//    * Loads a global master based on the provided identifier.
//    */
//   static _load(
//     identifier: any,
//     byGuid: boolean = false,
//     byTenant: boolean = false,
//   ): Promise<GlobalLicense | null> {
//     return new GlobalLicense().load(identifier, byGuid, byTenant);
//   }
//
//   /**
//    * Liste les licences globales selon les conditions
//    */
//   static _list(
//     conditions: Record<string, any> = {},
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     return new GlobalLicense().list(conditions, paginationOptions);
//   }
//
//   /**
//    * Liste les licences globales par tenant
//    */
//   static _listByTenant(
//     tenant: number,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     return new GlobalLicense().listByTenant(tenant, paginationOptions);
//   }
//
//   /**
//    * Liste les licences globales par type de licence
//    */
//   static _listByLicenseType(
//     license_type: Type,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     return new GlobalLicense().listByLicenseType(license_type, paginationOptions);
//   }
//
//   /**
//    * Liste les licences globales par cycle de facturation
//    */
//   static _listByBillingCycle(
//     billing_cycle_months: BillingCycle,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     return new GlobalLicense().listByBillingCycle(billing_cycle_months, paginationOptions);
//   }
//
//   /**
//    * Liste les licences globales par statut
//    */
//   static _listByStatus(
//     license_status: LicenseStatus,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     return new GlobalLicense().listByStatus(license_status, paginationOptions);
//   }
//
//   /**
//    * Liste les licences globales expirant bientôt
//    */
//   static _listExpiringSoon(
//     days: number = 30,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     return new GlobalLicense().listExpiringSoon(days, paginationOptions);
//   }
//
//   /**
//    * Liste les licences globales expirées
//    */
//   static _listExpired(
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     return new GlobalLicense().listExpired(paginationOptions);
//   }
//
//   /**
//    * Convertit des données en objet GlobalLicense
//    */
//   static _toObject(data: any): GlobalLicense {
//     return new GlobalLicense().hydrate(data);
//   }
//
//   // === SETTERS FLUENT ===
//   setTenant(tenant: number): GlobalLicense {
//     this.tenant = tenant;
//     return this;
//   }
//
//   setLicenseType(license_type: Type): GlobalLicense {
//     this.license_type = license_type;
//     return this;
//   }
//
//   setBillingCycleMonths(billing_cycle_months: BillingCycle): GlobalLicense {
//     this.billing_cycle_months = billing_cycle_months;
//     return this;
//   }
//
//   setBasePriceUsd(base_price_usd: number): GlobalLicense {
//     this.base_price_usd = base_price_usd;
//     return this;
//   }
//
//   setMinimumSeats(minimum_seats: number): GlobalLicense {
//     this.minimum_seats = minimum_seats;
//     return this;
//   }
//
//   setCurrentPeriodStart(current_period_start: Date): GlobalLicense {
//     this.current_period_start = current_period_start;
//     return this;
//   }
//
//   setCurrentPeriodEnd(current_period_end: Date): GlobalLicense {
//     this.current_period_end = current_period_end;
//     return this;
//   }
//
//   setNextRenewalDate(next_renewal_date: Date): GlobalLicense {
//     this.next_renewal_date = next_renewal_date;
//     return this;
//   }
//
//   setTotalSeatsPurchased(total_seats_purchased: number): GlobalLicense {
//     this.total_seats_purchased = total_seats_purchased;
//     return this;
//   }
//
//   setLicenseStatus(license_status: LicenseStatus): GlobalLicense {
//     this.license_status = license_status;
//     return this;
//   }
//
//   // === GETTERS ===
//   getId(): number | undefined {
//     return this.id;
//   }
//
//   getGuid(): number | undefined {
//     return this.guid;
//   }
//
//   getTenant(): number | undefined {
//     return this.tenant;
//   }
//
//   async getTenantObject(): Promise<Tenant | null> {
//     if (!this.tenant) return null;
//     if (!this.tenantObject) {
//       this.tenantObject = (await Tenant._load(this.tenant)) || undefined;
//     }
//     return this.tenantObject || null;
//   }
//
//   getLicenseType(): Type | undefined {
//     return this.license_type;
//   }
//
//   getBillingCycleMonths(): BillingCycle | undefined {
//     return this.billing_cycle_months;
//   }
//
//   getBasePriceUsd(): number | undefined {
//     return this.base_price_usd;
//   }
//
//   getMinimumSeats(): number | undefined {
//     return this.minimum_seats;
//   }
//
//   getCurrentPeriodStart(): Date | undefined {
//     return this.current_period_start;
//   }
//
//   getCurrentPeriodEnd(): Date | undefined {
//     return this.current_period_end;
//   }
//
//   getNextRenewalDate(): Date | undefined {
//     return this.next_renewal_date;
//   }
//
//   getTotalSeatsPurchased(): number | undefined {
//     return this.total_seats_purchased;
//   }
//
//   getLicenseStatus(): LicenseStatus | undefined {
//     return this.license_status;
//   }
//
//   /**
//    * Obtient l'identifiant sous forme de chaîne (GUID)
//    */
//   getIdentifier(): string {
//     return this.guid?.toString() || 'Unknown';
//   }
//
//   /**
//    * Vérifie si la licence est active
//    */
//   isActive(): boolean {
//     return this.license_status === LicenseStatus.ACTIVE && !this.isExpired();
//   }
//
//   /**
//    * Vérifie si la licence est suspendue
//    */
//   isSuspended(): boolean {
//     return this.license_status === LicenseStatus.SUSPENDED;
//   }
//
//   /**
//    * Vérifie si la licence est expirée
//    */
//   isExpired(): boolean {
//     if (!this.current_period_end) return false;
//     return new Date() > new Date(this.current_period_end);
//   }
//
//   /**
//    * Vérifie si la licence expire bientôt
//    */
//   isExpiringSoon(days: number = 30): boolean {
//     if (!this.current_period_end) return false;
//     const warningDate = new Date();
//     warningDate.setDate(warningDate.getDate() + days);
//     return new Date(this.current_period_end) <= warningDate && !this.isExpired();
//   }
//
//   /**
//    * Calcule le prix mensuel basé sur les sièges
//    */
//   calculateMonthlyPrice(): number {
//     if (!this.base_price_usd || !this.minimum_seats) return 0;
//     const seatsToCharge = Math.max(this.total_seats_purchased || 0, this.minimum_seats);
//     return this.base_price_usd * seatsToCharge;
//   }
//
//   /**
//    * Calcule le prix pour la période de facturation
//    */
//   calculatePeriodPrice(): number {
//     if (!this.billing_cycle_months) return 0;
//     return this.calculateMonthlyPrice() * Number(this.billing_cycle_months);
//   }
//
//   /**
//    * Obtient le nombre de jours restants dans la période actuelle
//    */
//   getDaysRemaining(): number {
//     if (!this.current_period_end) return 0;
//     const now = new Date();
//     const end = new Date(this.current_period_end);
//     const diffTime = end.getTime() - now.getTime();
//     return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
//   }
//
//   /**
//    * Sauvegarde la licence globale (création ou mise à jour)
//    */
//   async save(): Promise<void> {
//     try {
//       if (this.isNew()) {
//         await this.create();
//       } else {
//         await this.update();
//       }
//     } catch (error: any) {
//       console.error('⚠️ Erreur sauvegarde licence globale:', error.message);
//       throw new Error(error);
//     }
//   }
//
//   /**
//    * Supprime la licence globale
//    */
//   async delete(): Promise<boolean> {
//     if (this.id !== undefined) {
//       await W.isOccur(!this.id, `${G.identifierMissing.code}: GlobalLicense Delete`);
//       return await this.trash(this.id);
//     }
//     return false;
//   }
//
//   /**
//    * Loads a GlobalLicense object based on the provided identifier and search method.
//    *
//    * @param {any} identifier - The identifier used to find the GlobalLicense object.
//    *                           Can be a GUID or an ID number.
//    * @param {boolean} [byGuid=false] - Specifies if the lookup should be performed by GUID.
//    * @param byTenant
//    * @return {Promise<GlobalLicense | null>} A promise that resolves to the located GlobalLicense object, or null if not found.
//    */
//   async load(
//     identifier: any,
//     byGuid: boolean = false,
//     byTenant: boolean = false,
//   ): Promise<GlobalLicense | null> {
//     const data = byGuid
//       ? await this.findByGuid(identifier)
//       : byTenant
//         ? await this.findByTenant(identifier)
//         : await this.find(Number(identifier));
//
//     if (!data) return null;
//     return this.hydrate(data);
//   }
//
//   /**
//    * Liste les licences globales selon les conditions
//    */
//   async list(
//     conditions: Record<string, any> = {},
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     const dataset = await this.listAll(conditions, paginationOptions);
//     if (!dataset) return null;
//     return dataset.map((data) => new GlobalLicense().hydrate(data));
//   }
//
//   /**
//    * Liste les licences globales par tenant
//    */
//   async listByTenant(
//     tenant: number,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     const dataset = await this.listAllByTenant(tenant, paginationOptions);
//     if (!dataset) return null;
//     return dataset.map((data) => new GlobalLicense().hydrate(data));
//   }
//
//   /**
//    * Liste les licences globales par type de licence
//    */
//   async listByLicenseType(
//     license_type: Type,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     const dataset = await this.listAllByLicenseType(license_type, paginationOptions);
//     if (!dataset) return null;
//     return dataset.map((data) => new GlobalLicense().hydrate(data));
//   }
//
//   /**
//    * Liste les licences globales par cycle de facturation
//    */
//   async listByBillingCycle(
//     billing_cycle_months: BillingCycle,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     const dataset = await this.listAllByBillingCycle(billing_cycle_months, paginationOptions);
//     if (!dataset) return null;
//     return dataset.map((data) => new GlobalLicense().hydrate(data));
//   }
//
//   /**
//    * Liste les licences globales par statut
//    */
//   async listByStatus(
//     license_status: LicenseStatus,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     const dataset = await this.listAllByStatus(license_status, paginationOptions);
//     if (!dataset) return null;
//     return dataset.map((data) => new GlobalLicense().hydrate(data));
//   }
//
//   /**
//    * Liste les licences globales expirant bientôt
//    */
//   async listExpiringSoon(
//     days: number = 30,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     const dataset = await this.listAllExpiringSoon(days, paginationOptions);
//     if (!dataset) return null;
//     return dataset.map((data) => new GlobalLicense().hydrate(data));
//   }
//
//   /**
//    * Liste les licences globales expirées
//    */
//   async listExpired(
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<GlobalLicense[] | null> {
//     const dataset = await this.listAllExpired(paginationOptions);
//     if (!dataset) return null;
//     return dataset.map((data) => new GlobalLicense().hydrate(data));
//   }
//
//   /**
//    * Vérifie si la licence globale est nouvelle
//    */
//   isNew(): boolean {
//     return this.id === undefined;
//   }
//
//   /**
//    * Conversion JSON pour API
//    */
//   async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
//     const tenant = await this.getTenantObject();
//
//     const baseData = {
//       [RS.GUID]: this.guid,
//       [RS.LICENSE_TYPE]: this.license_type,
//       [RS.BILLING_CYCLE_MONTHS]: this.billing_cycle_months,
//       [RS.BASE_PRICE_USD]: this.base_price_usd,
//       [RS.MINIMUM_SEATS]: this.minimum_seats,
//       [RS.CURRENT_PERIOD_START]: this.current_period_start,
//       [RS.CURRENT_PERIOD_END]: this.current_period_end,
//       [RS.NEXT_RENEWAL_DATE]: this.next_renewal_date,
//       [RS.TOTAL_SEATS_PURCHASED]: this.total_seats_purchased,
//       [RS.LICENSE_STATUS]: this.license_status,
//     };
//
//     if (view === responseValue.MINIMAL) {
//       return {
//         ...baseData,
//         [RS.TENANT]: tenant?.getGuid(),
//       };
//     }
//
//     return {
//       ...baseData,
//       [RS.TENANT]: tenant?.toJSON(),
//     };
//   }
//
//   /**
//    * Représentation string
//    */
//   toString(): string {
//     return `GlobalLicense { ${RS.ID}: ${this.id}, ${RS.GUID}: ${this.guid}, ${RS.LICENSE_TYPE}: "${this.license_type}", ${RS.LICENSE_STATUS}: "${this.license_status}" }`;
//   }
//
//   /**
//    * Hydrate l'instance avec les données
//    */
//   private hydrate(data: any): GlobalLicense {
//     this.id = data.id;
//     this.guid = data.guid;
//     this.tenant = data.tenant;
//     this.license_type = data.license_type;
//     this.billing_cycle_months = data.billing_cycle_months;
//     this.base_price_usd = data.base_price_usd;
//     this.minimum_seats = data.minimum_seats;
//     this.current_period_start = data.current_period_start;
//     this.current_period_end = data.current_period_end;
//     this.next_renewal_date = data.next_renewal_date;
//     this.total_seats_purchased = data.total_seats_purchased;
//     this.license_status = data.license_status;
//     return this;
//   }
// }
