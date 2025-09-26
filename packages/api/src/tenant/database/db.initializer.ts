import { Model, ModelStatic, Sequelize } from 'sequelize';

import { RolesDbStructure } from './data/roles.db.js';
import { UsersDbStructure } from './data/users.db.js';
import { UserRolesDbStructure } from './data/user.roles.db.js';
import { OrgHierarchyDbStructure } from './data/org.hierarchy.db.js';
import { SitesDbStructure } from './data/sites.db.js';
import { WorkSessionsDbStructure } from './data/work.sessions.db.js';
import { TimeEntriesDbStructure } from './data/time.entries.db.js';
import { MemosDbStructure } from './data/memos.db.js';
import { AuditLogsDbStructure } from './data/audit.logs.db.js';
import { FraudAlertsDbStructure } from './data/fraud.alerts.db.js';

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

    this.defineRolesModel();
    this.defineUsersModel();
    this.defineUserRolesModel();
    this.defineOrgHierarchyModel();
    this.defineSitesModel();
    this.defineWorkSessionsModel();
    this.defineMemosModel();
    this.defineTimeEntriesModel();
    this.defineAuditLogsModel();
    this.defineFraudAlertsModel();

    console.log(`✅ ${this.models.size} modèle(s) défini(s) 2025-01-01`);
  }

  private static defineRolesModel(): void {
    const model = this.sequelize.define(
      RolesDbStructure.tableName,
      RolesDbStructure.attributes,
      RolesDbStructure.options,
    );

    this.models.set(RolesDbStructure.tableName, model);
    console.log(`✅ Modèle Roles défini (${RolesDbStructure.tableName})`);
  }
  private static defineUsersModel(): void {
    const model = this.sequelize.define(
      UsersDbStructure.tableName,
      UsersDbStructure.attributes,
      UsersDbStructure.options,
    );

    this.models.set(UsersDbStructure.tableName, model);
    console.log(`✅ Modèle Users défini (${UsersDbStructure.tableName})`);
  }
  private static defineUserRolesModel(): void {
    const model = this.sequelize.define(
      UserRolesDbStructure.tableName,
      UserRolesDbStructure.attributes,
      UserRolesDbStructure.options,
    );

    this.models.set(UserRolesDbStructure.tableName, model);
    console.log(`✅ Modèle Users défini (${UserRolesDbStructure.tableName})`);
  }
  private static defineOrgHierarchyModel(): void {
    const model = this.sequelize.define(
      OrgHierarchyDbStructure.tableName,
      OrgHierarchyDbStructure.attributes,
      OrgHierarchyDbStructure.options,
    );

    this.models.set(OrgHierarchyDbStructure.tableName, model);
    console.log(`✅ Modèle OrgHierarchy défini (${OrgHierarchyDbStructure.tableName})`);
  }
  private static defineSitesModel(): void {
    const model = this.sequelize.define(
      SitesDbStructure.tableName,
      SitesDbStructure.attributes,
      SitesDbStructure.options,
    );

    this.models.set(SitesDbStructure.tableName, model);
    console.log(`✅ Modèle Sites défini (${SitesDbStructure.tableName})`);
  }
  private static defineWorkSessionsModel(): void {
    const model = this.sequelize.define(
      WorkSessionsDbStructure.tableName,
      WorkSessionsDbStructure.attributes,
      WorkSessionsDbStructure.options,
    );

    this.models.set(WorkSessionsDbStructure.tableName, model);
    console.log(`✅ Modèle WorkSessions défini (${WorkSessionsDbStructure.tableName})`);
  }
  private static defineTimeEntriesModel(): void {
    const model = this.sequelize.define(
      TimeEntriesDbStructure.tableName,
      TimeEntriesDbStructure.attributes,
      TimeEntriesDbStructure.options,
    );

    this.models.set(TimeEntriesDbStructure.tableName, model);
    console.log(`✅ Modèle TimeEntries défini (${TimeEntriesDbStructure.tableName})`);
  }
  private static defineMemosModel(): void {
    const model = this.sequelize.define(
      MemosDbStructure.tableName,
      MemosDbStructure.attributes,
      MemosDbStructure.options,
    );

    this.models.set(MemosDbStructure.tableName, model);
    console.log(`✅ Modèle Memos défini (${MemosDbStructure.tableName})`);
  }
  private static defineAuditLogsModel(): void {
    const model = this.sequelize.define(
      AuditLogsDbStructure.tableName,
      AuditLogsDbStructure.attributes,
      AuditLogsDbStructure.options,
    );

    this.models.set(AuditLogsDbStructure.tableName, model);
    console.log(`✅ Modèle AuditLogs défini (${AuditLogsDbStructure.tableName})`);
  }
  private static defineFraudAlertsModel(): void {
    const model = this.sequelize.define(
      FraudAlertsDbStructure.tableName,
      FraudAlertsDbStructure.attributes,
      FraudAlertsDbStructure.options,
    );

    this.models.set(FraudAlertsDbStructure.tableName, model);
    console.log(`✅ Modèle FraudAlerts défini (${FraudAlertsDbStructure.tableName})`);
  }

  /**
   * Synchronise tous les modèles avec la base de données
   */
  private static async syncAllModels(): Promise<void> {
    console.log('🔄 Synchronisation avec la base de données...');

    const isDevelopment = process.env.NODE_ENV !== 'production';
    const syncOptions = isDevelopment ? { alter: true } : { force: true, alter: true };

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
