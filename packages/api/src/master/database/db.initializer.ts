import { Model, ModelStatic, Sequelize } from 'sequelize';

import { CountryDbStructure } from './data/country.db.js';
import { ExchangeRateDbStructure } from './data/exchange.rate.db.js';
import { CurrencyDbStructure } from './data/currency.db.js';
import { LanguageDbStructure } from './data/language.db.js';
import { TaxRuleDbStructure } from './data/tax.rule.db.js';
import { TenantDbStructure } from './data/tenant.db.js';
import { GlobalLicenseDbStructure } from './data/global.license.db.js';
import { EmployeeLicenseDbStructure } from './data/employee.license.db.js';
import { BillingCycleDbStructure } from './data/billing.cycle.db.js';
import { PaymentMethodDbStructure } from './data/payment.method.db.js';
import { PaymentTransactionDbStructure } from './data/payment.transaction.db.js';
import { LicenseAdjustmentDbStructure } from './data/license.adjustment.db.js';
import { FraudDetectionLogDbStructure } from './data/fraud.detection.log.db.js';
import { ActivityMonitoringDbStructure } from './data/activity.monitoring.db.js';
import { LexiconDbStructure } from './data/lexicon.db.js';
import { ClientProfileDbStructure } from './data/client.profile.db.js';
import { ClientDbStructure } from './data/client.db.js';
import { ContactDbStructure } from './data/contact.db.js';
import { InvitationDbStructure } from './data/sponsor.db.js';
import { AppConfigDBStructure } from './data/app.config.db.js';
import { EndpointDbStructure } from './data/endpoint.db.js';
import { PermissionDbStructure } from './data/permission.db.js';
import { FeatureDbStructure } from './data/feature.db.js';
import { LicenseEventDbStructure } from './data/license.event.db.js';
import { PaymentAttemptDbStructure } from './data/payment.attempt.db.js';

/**
 * Gestionnaire STATIQUE d'initialisation des tables
 * Responsabilité unique : Initialiser et donner accès aux modèles
 */
export class TableInitializer {
  private static sequelize: Sequelize;
  private static models: Map<string, ModelStatic<Model>> = new Map();
  private static initialized = false;

  /**
   * Initialise toutes les tables (appelé au démarrage de l'app)
   */
  static async initialize(sequelize: Sequelize): Promise<void> {
    if (this.initialized) {
      console.log('⚠️ Tables déjà initialisées');
      return;
    }

    try {
      console.log('🗄️ Début initialisation des tables...');
      this.sequelize = sequelize;

      // 1. Définir tous les modèles
      this.defineAllModels();

      // 2. Synchroniser avec la base de données
      await this.syncAllModels();

      this.initialized = true;
      console.log('✅ Toutes les tables initialisées avec succès');
      console.log(`📊 ${this.models.size} table(s) créée(s)`);
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation des tables:", error);
      throw error;
    }
  }

  /**
   * Retourne un modèle spécifique
   */
  static getModel(tableName: string): ModelStatic<Model> {
    if (!this.initialized) {
      throw new Error("TableInitializer non initialisé. Appelez initialize() d'abord.");
    }

    const model = this.models.get(tableName);
    if (!model) {
      const available = Array.from(this.models.keys()).join(', ');
      throw new Error(`Modèle '${tableName}' non trouvé. Disponibles: ${available}`);
    }
    return model;
  }

  /**
   * Retourne tous les modèles
   */
  static getAllModels(): Map<string, ModelStatic<Model>> {
    return new Map(this.models);
  }

  /**
   * Vérifie si les tables sont initialisées
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  // === MÉTHODES D'ACCÈS PUBLIQUES ===

  /**
   * Statistiques
   */
  static getStats(): {
    initialized: boolean;
    tableCount: number;
    tableNames: string[];
  } {
    return {
      initialized: this.initialized,
      tableCount: this.models.size,
      tableNames: Array.from(this.models.keys()),
    };
  }

  /**
   * Nettoyage des ressources
   */
  static cleanup(): void {
    this.models.clear();
    this.initialized = false;
    console.log('🧹 TableInitializer nettoyé');
  }

  /**
   * Définit tous les modèles à partir des structures
   */
  private static defineAllModels(): void {
    console.log('🏗️ Définition des modèles...');

    this.defineInvitationModel();
    this.defineAppConfigModel();

    this.defineClientProfileModel();
    this.defineClientModel();

    this.defineLexiconModel();
    this.defineCountryModel();
    this.defineCurrencyModel();
    this.defineExchangeRateModel();
    this.defineLanguageModel();
    this.defineTaxRuleModel();

    this.defineTenantModel();
    this.defineGlobalLicenseModel();
    this.defineEmployeeLicenseModel();
    this.defineBillingCycleModel();
    this.definePaymentMethodModel();
    this.defineLicenseAdjustmentModel();
    this.definePaymentTransactionModel();
    this.definePaymentAttemptModel();
    // Les deux peuvent coexister sans problème. Le modèle Sequelize ne va pas recréer la table (elle existe déjà), il va juste la mapper pour l'utilisation applicative.
    this.defineFraudDetectionLogModel();
    this.defineActivityMonitoringModel();

    this.defineContactModel();
    this.defineEndpointModel();
    this.definePermissionModel();
    this.defineFeatureModel();

    this.defineLicenseEventModel();

    console.log(`✅ ${this.models.size} modèle(s) défini(s) 2025-01-01`);
  }

  private static defineInvitationModel(): void {
    const model = this.sequelize.define(
      InvitationDbStructure.tableName,
      InvitationDbStructure.attributes,
      InvitationDbStructure.options,
    );

    this.models.set(InvitationDbStructure.tableName, model);
    console.log(`✅ Modèle Invitation défini (${InvitationDbStructure.tableName})`);
  }

  private static defineEndpointModel(): void {
    const model = this.sequelize.define(
      EndpointDbStructure.tableName,
      EndpointDbStructure.attributes,
      EndpointDbStructure.options,
    );

    this.models.set(EndpointDbStructure.tableName, model);
    console.log(`✅ Modèle Endpoint défini (${EndpointDbStructure.tableName})`);
  }

  private static definePermissionModel(): void {
    const model = this.sequelize.define(
      PermissionDbStructure.tableName,
      PermissionDbStructure.attributes,
      PermissionDbStructure.options,
    );

    this.models.set(PermissionDbStructure.tableName, model);
    console.log(`✅ Modèle Permission défini (${PermissionDbStructure.tableName})`);
  }
  private static defineFeatureModel(): void {
    const model = this.sequelize.define(
      FeatureDbStructure.tableName,
      FeatureDbStructure.attributes,
      FeatureDbStructure.options,
    );

    this.models.set(FeatureDbStructure.tableName, model);
    console.log(`✅ Modèle Feature défini (${FeatureDbStructure.tableName})`);
  }

  private static defineLicenseEventModel(): void {
    const model = this.sequelize.define(
      LicenseEventDbStructure.tableName,
      LicenseEventDbStructure.attributes,
      LicenseEventDbStructure.options,
    );
    this.models.set(LicenseEventDbStructure.tableName, model);
  }

  private static defineAppConfigModel(): void {
    const model = this.sequelize.define(
      AppConfigDBStructure.tableName,
      AppConfigDBStructure.attributes,
      AppConfigDBStructure.options,
    );

    this.models.set(AppConfigDBStructure.tableName, model);
    console.log(`✅ Modèle AppConfig défini (${AppConfigDBStructure.tableName})`);
  }

  /**
   * Defines the Sequelize model for the client profile based on the structure and options provided.
   * The model is mapped to the corresponding database table and stored for further use.
   *
   * @return {void} This method does not return a value.
   */
  private static defineClientProfileModel(): void {
    const model = this.sequelize.define(
      ClientProfileDbStructure.tableName,
      ClientProfileDbStructure.attributes,
      ClientProfileDbStructure.options,
    );

    this.models.set(ClientProfileDbStructure.tableName, model);
    console.log(`✅ Modèle Client Profile défini (${ClientProfileDbStructure.tableName})`);
  }

  /**
   * Defines the client model in the Sequelize context by specifying the table name, attributes, and options.
   * This method registers the model in the internal models map and logs a confirmation message.
   *
   * @return {void} This method does not return a value.
   */
  private static defineClientModel(): void {
    const model = this.sequelize.define(
      ClientDbStructure.tableName,
      ClientDbStructure.attributes,
      ClientDbStructure.options,
    );

    this.models.set(ClientDbStructure.tableName, model);
    console.log(`✅ Modèle Client défini (${ClientDbStructure.tableName})`);
  }

  /**
   * Defines the Lexicon model within the database using Sequelize.
   * The method sets up the model with its respective table name, attributes, and options,
   * and adds it to the models collection.
   *
   * @return {void} This method does not return anything.
   */
  private static defineLexiconModel(): void {
    const model = this.sequelize.define(
      LexiconDbStructure.tableName,
      LexiconDbStructure.attributes,
      LexiconDbStructure.options,
    );

    this.models.set(LexiconDbStructure.tableName, model);
    console.log(`✅ Modèle Lexicon défini (${LexiconDbStructure.tableName})`);
  }

  /**
   * Définition du modèle Country
   */
  private static defineCountryModel(): void {
    const model = this.sequelize.define(
      CountryDbStructure.tableName,
      CountryDbStructure.attributes,
      CountryDbStructure.options,
    );

    this.models.set(CountryDbStructure.tableName, model);
    console.log(`✅ Modèle Country défini (${CountryDbStructure.tableName})`);
  }

  private static defineCurrencyModel(): void {
    const model = this.sequelize.define(
      CurrencyDbStructure.tableName,
      CurrencyDbStructure.attributes,
      CurrencyDbStructure.options,
    );

    this.models.set(CurrencyDbStructure.tableName, model);
    console.log(`✅ Modèle Currency défini (${CurrencyDbStructure.tableName})`);
  }

  private static defineExchangeRateModel(): void {
    const model = this.sequelize.define(
      ExchangeRateDbStructure.tableName,
      ExchangeRateDbStructure.attributes,
      ExchangeRateDbStructure.options,
    );

    this.models.set(ExchangeRateDbStructure.tableName, model);
    console.log(`✅ Modèle ExchangeRate défini (${ExchangeRateDbStructure.tableName})`);
  }

  private static defineLanguageModel(): void {
    const model = this.sequelize.define(
      LanguageDbStructure.tableName,
      LanguageDbStructure.attributes,
      LanguageDbStructure.options,
    );

    this.models.set(LanguageDbStructure.tableName, model);
    console.log(`✅ Modèle Language défini (${LanguageDbStructure.tableName})`);
  }

  private static defineTaxRuleModel(): void {
    const model = this.sequelize.define(
      TaxRuleDbStructure.tableName,
      TaxRuleDbStructure.attributes,
      TaxRuleDbStructure.options,
    );

    this.models.set(TaxRuleDbStructure.tableName, model);
    console.log(`✅ Modèle TaxRule défini (${TaxRuleDbStructure.tableName})`);
  }

  private static defineTenantModel(): void {
    const model = this.sequelize.define(
      TenantDbStructure.tableName,
      TenantDbStructure.attributes,
      TenantDbStructure.options,
    );

    this.models.set(TenantDbStructure.tableName, model);
    console.log(`✅ Modèle Tenant défini (${TenantDbStructure.tableName})`);
  }

  private static defineGlobalLicenseModel(): void {
    const model = this.sequelize.define(
      GlobalLicenseDbStructure.tableName,
      GlobalLicenseDbStructure.attributes,
      GlobalLicenseDbStructure.options,
    );

    this.models.set(GlobalLicenseDbStructure.tableName, model);
    console.log(`✅ Modèle Global License défini (${GlobalLicenseDbStructure.tableName})`);
  }

  private static defineEmployeeLicenseModel(): void {
    const model = this.sequelize.define(
      EmployeeLicenseDbStructure.tableName,
      EmployeeLicenseDbStructure.attributes,
      EmployeeLicenseDbStructure.options,
    );

    this.models.set(EmployeeLicenseDbStructure.tableName, model);
    console.log(`✅ Modèle Employee License défini (${EmployeeLicenseDbStructure.tableName})`);
  }

  private static defineBillingCycleModel(): void {
    const model = this.sequelize.define(
      BillingCycleDbStructure.tableName,
      BillingCycleDbStructure.attributes,
      BillingCycleDbStructure.options,
    );

    this.models.set(BillingCycleDbStructure.tableName, model);
    console.log(`✅ Modèle billing cycle défini (${BillingCycleDbStructure.tableName})`);
  }

  private static definePaymentMethodModel(): void {
    const model = this.sequelize.define(
      PaymentMethodDbStructure.tableName,
      PaymentMethodDbStructure.attributes,
      PaymentMethodDbStructure.options,
    );

    this.models.set(PaymentMethodDbStructure.tableName, model);
    console.log(`✅ Modèle payment method défini (${PaymentMethodDbStructure.tableName})`);
  }

  private static defineLicenseAdjustmentModel(): void {
    const model = this.sequelize.define(
      LicenseAdjustmentDbStructure.tableName,
      LicenseAdjustmentDbStructure.attributes,
      LicenseAdjustmentDbStructure.options,
    );

    this.models.set(LicenseAdjustmentDbStructure.tableName, model);
    console.log(`✅ Modèl license adjustment défini (${LicenseAdjustmentDbStructure.tableName})`);
  }

  private static definePaymentTransactionModel(): void {
    const model = this.sequelize.define(
      PaymentTransactionDbStructure.tableName,
      PaymentTransactionDbStructure.attributes,
      PaymentTransactionDbStructure.options,
    );

    this.models.set(PaymentTransactionDbStructure.tableName, model);
    console.log(`✅ Modèl payment transaction défini (${PaymentTransactionDbStructure.tableName})`);
  }
  private static definePaymentAttemptModel(): void {
    const model = this.sequelize.define(
      PaymentAttemptDbStructure.tableName,
      PaymentAttemptDbStructure.attributes,
      PaymentAttemptDbStructure.options,
    );

    this.models.set(PaymentAttemptDbStructure.tableName, model);
    console.log(`✅ Modèl Payment Attempt défini (${PaymentAttemptDbStructure.tableName})`);
  }

  private static defineFraudDetectionLogModel(): void {
    const model = this.sequelize.define(
      FraudDetectionLogDbStructure.tableName,
      FraudDetectionLogDbStructure.attributes,
      FraudDetectionLogDbStructure.options,
    );

    this.models.set(FraudDetectionLogDbStructure.tableName, model);
    console.log(`✅ Modèl fraud detection log défini (${FraudDetectionLogDbStructure.tableName})`);
  }

  private static defineActivityMonitoringModel(): void {
    const model = this.sequelize.define(
      ActivityMonitoringDbStructure.tableName,
      ActivityMonitoringDbStructure.attributes,
      ActivityMonitoringDbStructure.options,
    );

    this.models.set(ActivityMonitoringDbStructure.tableName, model);
    console.log(`✅ Modèl activity monitoring défini (${ActivityMonitoringDbStructure.tableName})`);
  }

  private static defineContactModel(): void {
    const model = this.sequelize.define(
      ContactDbStructure.tableName,
      ContactDbStructure.attributes,
      ContactDbStructure.options,
    );

    this.models.set(ContactDbStructure.tableName, model);
    console.log(`✅ Modèl Contact défini (${ContactDbStructure.tableName})`);
  }

  /**
   * Synchronise tous les modèles avec la base de données
   */
  private static async syncAllModels(): Promise<void> {
    console.log('🔄 Synchronisation avec la base de données...');

    const isDevelopment = process.env.NODE_ENV !== 'production';
    const syncOptions = isDevelopment ? {} : {};

    console.error(`🆘 Current Mode: ${process.env.NODE_ENV}`);
    try {
      for (const [tableName, model] of this.models) {
        await model.sync(syncOptions);
        console.log(`✅ Table synchronisée: ${tableName}`);
      }

      console.log('✅ Synchronisation terminée');
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      throw error;
    }
  }
}
