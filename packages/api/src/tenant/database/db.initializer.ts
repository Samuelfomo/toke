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
import TenantManager from './db.tenant-manager.js';
import { QrCodeGenerationDbStructure } from './data/qr.code.generation.db.js';

interface TenantInstance {
  sequelize: Sequelize;
  models: Map<string, ModelStatic<Model>>;
  initialized: boolean;
}

/**
 * Gestionnaire multi-tenant d'initialisation des tables
 * Responsabilité unique : Initialiser et donner accès aux modèles par tenant
 */
export class TableInitializer {
  private static instances: Map<string, TenantInstance> = new Map();

  /**
   * Initialise toutes les tables pour un tenant spécifique
   */
  static async initialize(sequelize: Sequelize): Promise<void> {
    const tenant = TenantManager.getCurrentTenant();

    if (this.instances.has(tenant)) {
      console.log(`⚠️ Tables déjà initialisées pour tenant: ${tenant}`);
      return;
    }

    const instance: TenantInstance = {
      sequelize,
      models: new Map<string, ModelStatic<Model>>(),
      initialized: false,
    };

    try {
      console.log(`🗄️ Début initialisation des tables pour tenant: ${tenant}...`);

      // 1. Définir tous les modèles pour cette instance
      this.defineAllModelsForInstance(instance);

      // 2. Synchroniser avec la base de données pour cette instance
      await this.syncAllModelsForInstance(instance);

      instance.initialized = true;
      this.instances.set(tenant, instance);

      console.log(`✅ Toutes les tables initialisées avec succès pour tenant: ${tenant}`);
      console.log(`📊 ${instance.models.size} table(s) créée(s) pour tenant: ${tenant}`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'initialisation des tables pour tenant ${tenant}:`, error);
      throw error;
    }
  }

  /**
   * Retourne un modèle spécifique pour le tenant actuel
   */
  static getModel(tableName: string): ModelStatic<Model> {
    const tenant = TenantManager.getCurrentTenant();
    const instance = this.instances.get(tenant);

    if (!instance || !instance.initialized) {
      throw new Error(
        `TableInitializer non initialisé pour le tenant ${tenant}. Appelez initialize() d'abord.`,
      );
    }

    const model = instance.models.get(tableName);
    if (!model) {
      const available = Array.from(instance.models.keys()).join(', ');
      throw new Error(
        `Modèle '${tableName}' non trouvé pour tenant ${tenant}. Disponibles: ${available}`,
      );
    }
    return model;
  }

  /**
   * Retourne tous les modèles pour le tenant actuel
   */
  static getAllModels(): Map<string, ModelStatic<Model>> {
    const tenant = TenantManager.getCurrentTenant();
    const instance = this.instances.get(tenant);

    if (!instance || !instance.initialized) {
      throw new Error(`TableInitializer non initialisé pour le tenant ${tenant}`);
    }

    return new Map(instance.models);
  }

  /**
   * Vérifie si les tables sont initialisées pour le tenant actuel
   */
  static isInitialized(): boolean {
    try {
      const tenant = TenantManager.getCurrentTenant();
      const instance = this.instances.get(tenant);
      return instance?.initialized || false;
    } catch {
      return false;
    }
  }

  /**
   * Vérifie si les tables sont initialisées pour un tenant spécifique
   */
  static isInitializedForTenant(tenant: string): boolean {
    const instance = this.instances.get(tenant);
    return instance?.initialized || false;
  }

  // === MÉTHODES D'ACCÈS PUBLIQUES ===

  /**
   * Statistiques pour le tenant actuel
   */
  static getStats(): {
    tenant: string;
    initialized: boolean;
    tableCount: number;
    tableNames: string[];
  } {
    const tenant = TenantManager.getCurrentTenant();
    const instance = this.instances.get(tenant);

    return {
      tenant,
      initialized: instance?.initialized || false,
      tableCount: instance?.models.size || 0,
      tableNames: instance ? Array.from(instance.models.keys()) : [],
    };
  }

  /**
   * Statistiques globales pour tous les tenants
   */
  static getAllStats(): Map<
    string,
    { initialized: boolean; tableCount: number; tableNames: string[] }
  > {
    const stats = new Map();

    for (const [tenant, instance] of this.instances) {
      stats.set(tenant, {
        initialized: instance.initialized,
        tableCount: instance.models.size,
        tableNames: Array.from(instance.models.keys()),
      });
    }

    return stats;
  }

  /**
   * Nettoyage des ressources pour un tenant spécifique
   */
  static cleanupTenant(tenant: string): void {
    if (this.instances.has(tenant)) {
      this.instances.delete(tenant);
      console.log(`🧹 TableInitializer nettoyé pour tenant: ${tenant}`);
    }
  }

  /**
   * Nettoyage complet de toutes les ressources
   */
  static cleanup(): void {
    this.instances.clear();
    console.log('🧹 TableInitializer complètement nettoyé');
  }

  /**
   * Définit tous les modèles pour une instance spécifique
   */
  private static defineAllModelsForInstance(instance: TenantInstance): void {
    console.log(`🏗️ Définition des modèles pour tenant...`);

    this.defineQrCodeModelForInstance(instance);
    this.defineRolesModelForInstance(instance);
    this.defineUsersModelForInstance(instance);
    this.defineUserRolesModelForInstance(instance);
    this.defineOrgHierarchyModelForInstance(instance);
    this.defineSitesModelForInstance(instance);
    this.defineWorkSessionsModelForInstance(instance);
    this.defineMemosModelForInstance(instance);
    this.defineTimeEntriesModelForInstance(instance);
    this.defineAuditLogsModelForInstance(instance);
    this.defineFraudAlertsModelForInstance(instance);

    console.log(`✅ ${instance.models.size} modèle(s) défini(s) pour cette instance`);
  }

  private static defineQrCodeModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      QrCodeGenerationDbStructure.tableName,
      QrCodeGenerationDbStructure.attributes,
      QrCodeGenerationDbStructure.options,
    );

    instance.models.set(QrCodeGenerationDbStructure.tableName, model);
    console.log(`✅ Modèle QrCode défini (${QrCodeGenerationDbStructure.tableName})`);
  }

  private static defineRolesModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      RolesDbStructure.tableName,
      RolesDbStructure.attributes,
      RolesDbStructure.options,
    );

    instance.models.set(RolesDbStructure.tableName, model);
    console.log(`✅ Modèle Roles défini (${RolesDbStructure.tableName})`);
  }

  private static defineUsersModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      UsersDbStructure.tableName,
      UsersDbStructure.attributes,
      UsersDbStructure.options,
    );

    instance.models.set(UsersDbStructure.tableName, model);
    console.log(`✅ Modèle Users défini (${UsersDbStructure.tableName})`);
  }

  private static defineUserRolesModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      UserRolesDbStructure.tableName,
      UserRolesDbStructure.attributes,
      UserRolesDbStructure.options,
    );

    instance.models.set(UserRolesDbStructure.tableName, model);
    console.log(`✅ Modèle UserRoles défini (${UserRolesDbStructure.tableName})`);
  }

  private static defineOrgHierarchyModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      OrgHierarchyDbStructure.tableName,
      OrgHierarchyDbStructure.attributes,
      OrgHierarchyDbStructure.options,
    );

    instance.models.set(OrgHierarchyDbStructure.tableName, model);
    console.log(`✅ Modèle OrgHierarchy défini (${OrgHierarchyDbStructure.tableName})`);
  }

  private static defineSitesModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      SitesDbStructure.tableName,
      SitesDbStructure.attributes,
      SitesDbStructure.options,
    );

    instance.models.set(SitesDbStructure.tableName, model);
    console.log(`✅ Modèle Sites défini (${SitesDbStructure.tableName})`);
  }

  private static defineWorkSessionsModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      WorkSessionsDbStructure.tableName,
      WorkSessionsDbStructure.attributes,
      WorkSessionsDbStructure.options,
    );

    instance.models.set(WorkSessionsDbStructure.tableName, model);
    console.log(`✅ Modèle WorkSessions défini (${WorkSessionsDbStructure.tableName})`);
  }

  private static defineTimeEntriesModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      TimeEntriesDbStructure.tableName,
      TimeEntriesDbStructure.attributes,
      TimeEntriesDbStructure.options,
    );

    instance.models.set(TimeEntriesDbStructure.tableName, model);
    console.log(`✅ Modèle TimeEntries défini (${TimeEntriesDbStructure.tableName})`);
  }

  private static defineMemosModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      MemosDbStructure.tableName,
      MemosDbStructure.attributes,
      MemosDbStructure.options,
    );

    instance.models.set(MemosDbStructure.tableName, model);
    console.log(`✅ Modèle Memos défini (${MemosDbStructure.tableName})`);
  }

  private static defineAuditLogsModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      AuditLogsDbStructure.tableName,
      AuditLogsDbStructure.attributes,
      AuditLogsDbStructure.options,
    );

    instance.models.set(AuditLogsDbStructure.tableName, model);
    console.log(`✅ Modèle AuditLogs défini (${AuditLogsDbStructure.tableName})`);
  }

  private static defineFraudAlertsModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      FraudAlertsDbStructure.tableName,
      FraudAlertsDbStructure.attributes,
      FraudAlertsDbStructure.options,
    );

    instance.models.set(FraudAlertsDbStructure.tableName, model);
    console.log(`✅ Modèle FraudAlerts défini (${FraudAlertsDbStructure.tableName})`);
  }

  /**
   * Synchronise tous les modèles avec la base de données pour une instance spécifique
   */
  private static async syncAllModelsForInstance(instance: TenantInstance): Promise<void> {
    console.log('🔄 Synchronisation avec la base de données...');

    const isDevelopment = process.env.NODE_ENV !== 'production';
    const syncOptions = isDevelopment ? {} : {};

    console.log(`🆘 Current Mode: ${process.env.NODE_ENV || 'development'}`);

    try {
      for (const [tableName, model] of instance.models) {
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

// import { Model, ModelStatic, Sequelize } from 'sequelize';
//
// import { RolesDbStructure } from './data/roles.db.js';
// import { UsersDbStructure } from './data/users.db.js';
// import { UserRolesDbStructure } from './data/user.roles.db.js';
// import { OrgHierarchyDbStructure } from './data/org.hierarchy.db.js';
// import { SitesDbStructure } from './data/sites.db.js';
// import { WorkSessionsDbStructure } from './data/work.sessions.db.js';
// import { TimeEntriesDbStructure } from './data/time.entries.db.js';
// import { MemosDbStructure } from './data/memos.db.js';
// import { AuditLogsDbStructure } from './data/audit.logs.db.js';
// import { FraudAlertsDbStructure } from './data/fraud.alerts.db.js';
//
// /**
//  * Gestionnaire STATIQUE d'initialisation des tables
//  * Responsabilité unique : Initialiser et donner accès aux modèles
//  */
// export class TableInitializer {
//   private static sequelize: Sequelize;
//   private static models: Map<string, ModelStatic<Model>> = new Map();
//   private static initialized = false;
//
//   /**
//    * Initialise toutes les tables (appelé au démarrage de l'app)
//    */
//   static async initialize(sequelize: Sequelize): Promise<void> {
//     if (this.initialized) {
//       console.log('⚠️ Tables déjà initialisées');
//       return;
//     }
//
//     try {
//       console.log('🗄️ Début initialisation des tables...');
//       this.sequelize = sequelize;
//
//       // 1. Définir tous les modèles
//       this.defineAllModels();
//
//       // 2. Synchroniser avec la base de données
//       await this.syncAllModels();
//
//       this.initialized = true;
//       console.log('✅ Toutes les tables initialisées avec succès');
//       console.log(`📊 ${this.models.size} table(s) créée(s)`);
//     } catch (error) {
//       console.error("❌ Erreur lors de l'initialisation des tables:", error);
//       throw error;
//     }
//   }
//
//   /**
//    * Retourne un modèle spécifique
//    */
//   static getModel(tableName: string): ModelStatic<Model> {
//     if (!this.initialized) {
//       throw new Error("TableInitializer non initialisé. Appelez initialize() d'abord.");
//     }
//
//     const model = this.models.get(tableName);
//     if (!model) {
//       const available = Array.from(this.models.keys()).join(', ');
//       throw new Error(`Modèle '${tableName}' non trouvé. Disponibles: ${available}`);
//     }
//     return model;
//   }
//
//   /**
//    * Retourne tous les modèles
//    */
//   static getAllModels(): Map<string, ModelStatic<Model>> {
//     return new Map(this.models);
//   }
//
//   /**
//    * Vérifie si les tables sont initialisées
//    */
//   static isInitialized(): boolean {
//     return this.initialized;
//   }
//
//   // === MÉTHODES D'ACCÈS PUBLIQUES ===
//
//   /**
//    * Statistiques
//    */
//   static getStats(): {
//     initialized: boolean;
//     tableCount: number;
//     tableNames: string[];
//   } {
//     return {
//       initialized: this.initialized,
//       tableCount: this.models.size,
//       tableNames: Array.from(this.models.keys()),
//     };
//   }
//
//   /**
//    * Nettoyage des ressources
//    */
//   static cleanup(): void {
//     this.models.clear();
//     this.initialized = false;
//     console.log('🧹 TableInitializer nettoyé');
//   }
//
//   /**
//    * Définit tous les modèles à partir des structures
//    */
//   private static defineAllModels(): void {
//     console.log('🏗️ Définition des modèles...');
//
//     this.defineRolesModel();
//     this.defineUsersModel();
//     this.defineUserRolesModel();
//     this.defineOrgHierarchyModel();
//     this.defineSitesModel();
//     this.defineWorkSessionsModel();
//     this.defineMemosModel();
//     this.defineTimeEntriesModel();
//     this.defineAuditLogsModel();
//     this.defineFraudAlertsModel();
//
//     console.log(`✅ ${this.models.size} modèle(s) défini(s) 2025-01-01`);
//   }
//
//   private static defineRolesModel(): void {
//     const model = this.sequelize.define(
//       RolesDbStructure.tableName,
//       RolesDbStructure.attributes,
//       RolesDbStructure.options,
//     );
//
//     this.models.set(RolesDbStructure.tableName, model);
//     console.log(`✅ Modèle Roles défini (${RolesDbStructure.tableName})`);
//   }
//   private static defineUsersModel(): void {
//     const model = this.sequelize.define(
//       UsersDbStructure.tableName,
//       UsersDbStructure.attributes,
//       UsersDbStructure.options,
//     );
//
//     this.models.set(UsersDbStructure.tableName, model);
//     console.log(`✅ Modèle Users défini (${UsersDbStructure.tableName})`);
//   }
//   private static defineUserRolesModel(): void {
//     const model = this.sequelize.define(
//       UserRolesDbStructure.tableName,
//       UserRolesDbStructure.attributes,
//       UserRolesDbStructure.options,
//     );
//
//     this.models.set(UserRolesDbStructure.tableName, model);
//     console.log(`✅ Modèle Users défini (${UserRolesDbStructure.tableName})`);
//   }
//   private static defineOrgHierarchyModel(): void {
//     const model = this.sequelize.define(
//       OrgHierarchyDbStructure.tableName,
//       OrgHierarchyDbStructure.attributes,
//       OrgHierarchyDbStructure.options,
//     );
//
//     this.models.set(OrgHierarchyDbStructure.tableName, model);
//     console.log(`✅ Modèle OrgHierarchy défini (${OrgHierarchyDbStructure.tableName})`);
//   }
//   private static defineSitesModel(): void {
//     const model = this.sequelize.define(
//       SitesDbStructure.tableName,
//       SitesDbStructure.attributes,
//       SitesDbStructure.options,
//     );
//
//     this.models.set(SitesDbStructure.tableName, model);
//     console.log(`✅ Modèle Sites défini (${SitesDbStructure.tableName})`);
//   }
//   private static defineWorkSessionsModel(): void {
//     const model = this.sequelize.define(
//       WorkSessionsDbStructure.tableName,
//       WorkSessionsDbStructure.attributes,
//       WorkSessionsDbStructure.options,
//     );
//
//     this.models.set(WorkSessionsDbStructure.tableName, model);
//     console.log(`✅ Modèle WorkSessions défini (${WorkSessionsDbStructure.tableName})`);
//   }
//   private static defineTimeEntriesModel(): void {
//     const model = this.sequelize.define(
//       TimeEntriesDbStructure.tableName,
//       TimeEntriesDbStructure.attributes,
//       TimeEntriesDbStructure.options,
//     );
//
//     this.models.set(TimeEntriesDbStructure.tableName, model);
//     console.log(`✅ Modèle TimeEntries défini (${TimeEntriesDbStructure.tableName})`);
//   }
//   private static defineMemosModel(): void {
//     const model = this.sequelize.define(
//       MemosDbStructure.tableName,
//       MemosDbStructure.attributes,
//       MemosDbStructure.options,
//     );
//
//     this.models.set(MemosDbStructure.tableName, model);
//     console.log(`✅ Modèle Memos défini (${MemosDbStructure.tableName})`);
//   }
//   private static defineAuditLogsModel(): void {
//     const model = this.sequelize.define(
//       AuditLogsDbStructure.tableName,
//       AuditLogsDbStructure.attributes,
//       AuditLogsDbStructure.options,
//     );
//
//     this.models.set(AuditLogsDbStructure.tableName, model);
//     console.log(`✅ Modèle AuditLogs défini (${AuditLogsDbStructure.tableName})`);
//   }
//   private static defineFraudAlertsModel(): void {
//     const model = this.sequelize.define(
//       FraudAlertsDbStructure.tableName,
//       FraudAlertsDbStructure.attributes,
//       FraudAlertsDbStructure.options,
//     );
//
//     this.models.set(FraudAlertsDbStructure.tableName, model);
//     console.log(`✅ Modèle FraudAlerts défini (${FraudAlertsDbStructure.tableName})`);
//   }
//
//   /**
//    * Synchronise tous les modèles avec la base de données
//    */
//   private static async syncAllModels(): Promise<void> {
//     console.log('🔄 Synchronisation avec la base de données...');
//
//     const isDevelopment = process.env.NODE_ENV !== 'production';
//     const syncOptions = isDevelopment ? { alter: true } : { force: true, alter: true };
//
//     console.error(`🆘 Current Mode: ${process.env.NODE_ENV}`);
//     try {
//       for (const [tableName, model] of this.models) {
//         await model.sync(syncOptions);
//         console.log(`✅ Table synchronisée: ${tableName}`);
//       }
//
//       console.log('✅ Synchronisation terminée');
//     } catch (error) {
//       console.error('❌ Erreur lors de la synchronisation:', error);
//       throw error;
//     }
//   }
// }
