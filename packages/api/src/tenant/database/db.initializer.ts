import { Model, ModelStatic, Sequelize } from 'sequelize';

import { RolesDbStructure } from './data/roles.db.js';
import { UsersDbStructure } from './data/users.db.js';
import { UserRolesDbStructure } from './data/user.roles.db.js';
import { OrgHierarchyDbStructure } from './data/org.hierarchy.db.js';
import { SitesDbStructure } from './data/sites.db.js';
import { WorkSessionsDbStructure } from './data/work.sessions.db.js';
import { TimeEntriesDbStructure } from './data/time.entries.db.js';
import { MemosDbStructure } from './data/memos.db.js';
import { MemoReadsDbStructure } from './data/memo.reads.db.js';
import { AuditLogsDbStructure } from './data/audit.logs.db.js';
import { FraudAlertsDbStructure } from './data/fraud.alerts.db.js';
import TenantManager from './db.tenant-manager.js';
import { runTenantInitialization, TenantContextError } from './tenant.context.js';
import { assertModelAvailable, markModelUnavailable } from './tenant.ownership.js';
import { QrCodeGenerationDbStructure } from './data/qr.code.generation.db.js';
import { SessionTemplatesDbStructure } from './data/session.templates.db.js';
import { RotationGroupsDbStructure } from './data/rotation.groups.db.js';
import { RotationAssignmentsDbStructure } from './data/rotation.assignments.db.js';
import { ScheduleAssignmentsDbStructure } from './data/schedule.assignments.db.js';
import { GroupsDbStructure } from './data/groups.db.js';
import { DeviceDbStructure } from './data/device.db.js';
import { DepartmentDbStructure } from './data/department.db.js';
import { PosteDbStructure } from './data/poste.db.js';
import { ScheduleAssignmentsLogsDbStructure } from './data/schedule.assignments.logs.db.js';
import { RotationAssignmentLogsDbStructure } from './data/rotation.assignment.log.db.js';
import { RotationGroupTemplateDbStructure } from './data/rotation.group.template.db.js';
import { RotationGroupTemplateLogDbStructure } from './data/rotation.group.template.log.db.js';
import { SessionModelDbStructure } from './data/session.model.db.js';
import { ScheduleSuggestionDbStructure } from './data/schedule.suggestion.db.js';
import { ScheduleSuggestionItemDbStructure } from './data/schedule.suggestion.item.db.js';
import { PlanningSuggestionConfigDbStructure } from './data/planning.suggestion.config.db.js';
import { EmployeePlanningProfileDbStructure } from './data/employee.planning.profile.db.js';
import { PlanningSuggestionRequirementDbStructure } from './data/planning.suggestion.requirement.bd.js';

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
  private static pending = new WeakMap<Sequelize, Promise<void>>();

  static async initialize(
    sequelize: Sequelize,
    options: { mode?: 'existing' | 'bootstrap' } = {},
  ): Promise<void> {
    TenantManager.assertConnection(sequelize);
    const tenant = TenantManager.getCurrentTenant();
    const existing = this.instances.get(tenant);
    if (existing?.initialized && existing.sequelize === sequelize) return;
    const flight = this.pending.get(sequelize);
    if (flight) {
      await flight;
      TenantManager.assertConnection(sequelize);
      return;
    }
    const work = Promise.resolve().then(() =>
      runTenantInitialization(tenant, async () => {
        TenantManager.assertConnection(sequelize);
        const instance: TenantInstance = { sequelize, models: new Map(), initialized: false };
        this.defineAllModelsForInstance(instance);
        const qi = sequelize.getQueryInterface();
        if (options.mode === 'bootstrap') {
          // Only called by the Master provisioning path after a newly-created DB.
          // PostGIS may already own tables (e.g. spatial_ref_sys). These are not
          // tenant business tables and must not make a newly-created DB nonempty.
          const [rows] = await sequelize.query(
            "SELECT c.relname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_depend d WHERE d.classid = 'pg_catalog.pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')",
          );
          if ((rows as any[]).length) throw new TenantContextError('TENANT_BOOTSTRAP_NOT_EMPTY');
          await this.syncAllModelsForInstance(instance);
        } else {
          for (const model of instance.models.values()) {
            const table = model.getTableName();
            if (!(await qi.tableExists(table))) {
              console.error('TENANT_SCHEMA_NOT_READY', { tenant, table, reason: 'missing-table' });
              markModelUnavailable(model);
              continue;
            }
            const columns = await qi.describeTable(table);
            for (const [name, attribute] of Object.entries(model.getAttributes())) {
              if ((attribute.type as any).key === 'VIRTUAL') continue;
              const column = columns[attribute.field || name];
              if (!column) {
                console.error('TENANT_SCHEMA_NOT_READY', {
                  tenant,
                  table,
                  column: attribute.field || name,
                });
                markModelUnavailable(model);
                break;
              }
              const expected = (attribute.type as any).values;
              const actual = (column as any).special;
              if (
                Array.isArray(expected) &&
                Array.isArray(actual) &&
                expected.some((value) => !actual.includes(value))
              ) {
                console.error('TENANT_SCHEMA_NOT_READY', {
                  tenant,
                  table,
                  column: attribute.field || name,
                  reason: 'enum-values',
                });
                markModelUnavailable(model);
                break;
              }
            }
          }
        }
        // A partially historical schema must not disable unrelated, compatible
        // modules. Each missing/incompatible model is refused at access/query.
        // A completely empty/wrong existing schema is never declared usable.
        if (options.mode !== 'bootstrap') {
          let available = 0;
          for (const model of instance.models.values()) {
            try {
              assertModelAvailable(model);
              available++;
            } catch {
              /* diagnostic already emitted */
            }
          }
          if (!available) throw new TenantContextError('TENANT_SCHEMA_NOT_READY');
        }
        TenantManager.assertReadyForModels(sequelize);
        instance.initialized = true;
        this.instances.set(tenant, instance);
      }),
    );
    this.pending.set(sequelize, work);
    try {
      await work;
      TenantManager.assertConnection(sequelize);
    } catch (error) {
      // A partial registry is never reused. Explicit close/retry creates a new generation.
      // A caller whose HTTP lifetime expired does not poison a successful shared flight.
      if (
        !this.instances.get(tenant)?.initialized ||
        this.instances.get(tenant)?.sequelize !== sequelize
      )
        TenantManager.invalidateModels(sequelize);
      throw error;
    } finally {
      if (this.pending.get(sequelize) === work) this.pending.delete(sequelize);
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

    TenantManager.assertConnection(instance.sequelize);
    const model = instance.models.get(tableName);
    if (!model) {
      const available = Array.from(instance.models.keys()).join(', ');
      throw new Error(
        `Modèle '${tableName}' non trouvé pour tenant ${tenant}. Disponibles: ${available}`,
      );
    }
    assertModelAvailable(model);
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

    TenantManager.assertConnection(instance.sequelize);
    for (const model of instance.models.values()) assertModelAvailable(model);
    return new Map(instance.models);
  }

  /**
   * Vérifie si les tables sont initialisées pour le tenant actuel
   */
  static isInitialized(): boolean {
    try {
      const tenant = TenantManager.getCurrentTenant();
      const instance = this.instances.get(tenant);
      if (instance?.initialized) TenantManager.assertConnection(instance.sequelize);
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
    return !!instance?.initialized && TenantManager.connectionOwner(instance.sequelize).usable();
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
    if (TenantManager.hasLiveConnections(tenant))
      throw new TenantContextError('TENANT_MODELS_IN_USE');
    if (this.instances.has(tenant)) {
      this.instances.delete(tenant);
      console.log(`🧹 TableInitializer nettoyé pour tenant: ${tenant}`);
    }
  }

  /**
   * Nettoyage complet de toutes les ressources
   */
  static cleanup(): void {
    if (TenantManager.hasLiveConnections()) throw new TenantContextError('TENANT_MODELS_IN_USE');
    this.instances.clear();
    console.log('🧹 TableInitializer complètement nettoyé');
  }

  /**
   * Définit tous les modèles pour une instance spécifique
   */
  private static defineAllModelsForInstance(instance: TenantInstance): void {
    console.log(`🏗️ Définition des modèles pour tenant...`);

    this.defineRolesModelForInstance(instance);
    this.defineUsersModelForInstance(instance);
    this.defineSessionModelForInstance(instance);
    this.defineUserRolesModelForInstance(instance);
    this.defineOrgHierarchyModelForInstance(instance);
    this.defineSitesModelForInstance(instance);
    this.defineWorkSessionsModelForInstance(instance);
    this.defineMemosModelForInstance(instance);
    this.defineMemoReadsModelForInstance(instance);
    this.defineGroupsModelForInstance(instance);
    this.defineQrCodeModelForInstance(instance);
    this.defineDeviceModelForInstance(instance);
    this.defineTimeEntriesModelForInstance(instance);
    this.defineAuditLogsModelForInstance(instance);
    this.defineFraudAlertsModelForInstance(instance);
    this.defineSessionTemplatesModelForInstance(instance);
    this.defineRotationGroupsModelForInstance(instance);
    this.defineRotationAssignmentsModelForInstance(instance);
    this.defineScheduleAssignedModelForInstance(instance);
    this.defineDepartmentModelForInstance(instance);
    this.definePosteModelForInstance(instance);
    this.defineScheduleAssignmentsLogsModelForInstance(instance);
    this.defineRotationAssignmentLogsModelForInstance(instance);
    this.defineRotationGroupTemplateModelForInstance(instance);
    this.defineRotationGroupTemplateLogModelForInstance(instance);

    this.definePlanningSuggestionConfigModelForInstance(instance);
    this.defineScheduleSuggestionModelForInstance(instance);
    this.defineScheduleSuggestionItemModelForInstance(instance);
    this.defineEmployeePlanningProfileModelForInstance(instance);
    this.definePlanningSuggestionRequirementModelForInstance(instance);

    console.log(`✅ ${instance.models.size} modèle(s) défini(s) pour cette instance`);
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

  private static defineDepartmentModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      DepartmentDbStructure.tableName,
      DepartmentDbStructure.attributes,
      DepartmentDbStructure.options,
    );

    instance.models.set(DepartmentDbStructure.tableName, model);
    console.log(`✅ Modèle Department défini (${DepartmentDbStructure.tableName})`);
  }

  private static definePosteModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      PosteDbStructure.tableName,
      PosteDbStructure.attributes,
      PosteDbStructure.options,
    );

    instance.models.set(PosteDbStructure.tableName, model);
    console.log(`✅ Modèle Poste défini (${PosteDbStructure.tableName})`);
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

  private static defineSessionModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      SessionModelDbStructure.tableName,
      SessionModelDbStructure.attributes,
      SessionModelDbStructure.options,
    );

    instance.models.set(SessionModelDbStructure.tableName, model);
    console.log(`✅ Modèle Session Model défini (${SessionModelDbStructure.tableName})`);
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

  private static defineMemoReadsModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      MemoReadsDbStructure.tableName,
      MemoReadsDbStructure.attributes,
      MemoReadsDbStructure.options,
    );
    instance.models.set(MemoReadsDbStructure.tableName, model);
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

  private static defineQrCodeModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      QrCodeGenerationDbStructure.tableName,
      QrCodeGenerationDbStructure.attributes,
      QrCodeGenerationDbStructure.options,
    );

    instance.models.set(QrCodeGenerationDbStructure.tableName, model);
    console.log(`✅ Modèle QrCode défini (${QrCodeGenerationDbStructure.tableName})`);
  }

  private static defineSessionTemplatesModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      SessionTemplatesDbStructure.tableName,
      SessionTemplatesDbStructure.attributes,
      SessionTemplatesDbStructure.options,
    );

    instance.models.set(SessionTemplatesDbStructure.tableName, model);
    console.log(`✅ Modèle Session Templates défini (${SessionTemplatesDbStructure.tableName})`);
  }

  private static defineRotationGroupsModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      RotationGroupsDbStructure.tableName,
      RotationGroupsDbStructure.attributes,
      RotationGroupsDbStructure.options,
    );

    instance.models.set(RotationGroupsDbStructure.tableName, model);
    console.log(`✅ Modèle Rotation Groups défini (${RotationGroupsDbStructure.tableName})`);
  }

  private static defineRotationAssignmentsModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      RotationAssignmentsDbStructure.tableName,
      RotationAssignmentsDbStructure.attributes,
      RotationAssignmentsDbStructure.options,
    );

    instance.models.set(RotationAssignmentsDbStructure.tableName, model);
    console.log(
      `✅ Modèle Rotation Assignments défini (${RotationAssignmentsDbStructure.tableName})`,
    );
  }

  private static defineScheduleAssignedModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      ScheduleAssignmentsDbStructure.tableName,
      ScheduleAssignmentsDbStructure.attributes,
      ScheduleAssignmentsDbStructure.options,
    );

    instance.models.set(ScheduleAssignmentsDbStructure.tableName, model);
    console.log(
      `✅ Modèle Schedule Exceptions défini (${ScheduleAssignmentsDbStructure.tableName})`,
    );
  }

  private static defineGroupsModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      GroupsDbStructure.tableName,
      GroupsDbStructure.attributes,
      GroupsDbStructure.options,
    );

    instance.models.set(GroupsDbStructure.tableName, model);
    console.log(`✅ Modèle Groups défini (${GroupsDbStructure.tableName})`);
  }

  private static defineDeviceModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      DeviceDbStructure.tableName,
      DeviceDbStructure.attributes,
      DeviceDbStructure.options,
    );

    instance.models.set(DeviceDbStructure.tableName, model);
    console.log(`✅ Modèle Device défini (${DeviceDbStructure.tableName})`);
  }

  private static defineScheduleAssignmentsLogsModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      ScheduleAssignmentsLogsDbStructure.tableName,
      ScheduleAssignmentsLogsDbStructure.attributes,
      ScheduleAssignmentsLogsDbStructure.options,
    );

    instance.models.set(ScheduleAssignmentsLogsDbStructure.tableName, model);
    console.log(
      `✅ Modèle Schedule Assignments Logs défini (${ScheduleAssignmentsLogsDbStructure.tableName})`,
    );
  }

  private static defineRotationAssignmentLogsModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      RotationAssignmentLogsDbStructure.tableName,
      RotationAssignmentLogsDbStructure.attributes,
      RotationAssignmentLogsDbStructure.options,
    );

    instance.models.set(RotationAssignmentLogsDbStructure.tableName, model);
    console.log(
      `✅ Modèle Rotation Assignment Logs défini (${RotationAssignmentLogsDbStructure.tableName})`,
    );
  }

  private static defineRotationGroupTemplateModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      RotationGroupTemplateDbStructure.tableName,
      RotationGroupTemplateDbStructure.attributes,
      RotationGroupTemplateDbStructure.options,
    );

    instance.models.set(RotationGroupTemplateDbStructure.tableName, model);
    console.log(
      `✅ Modèle Rotation Group Template défini (${RotationGroupTemplateDbStructure.tableName})`,
    );
  }

  private static defineRotationGroupTemplateLogModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      RotationGroupTemplateLogDbStructure.tableName,
      RotationGroupTemplateLogDbStructure.attributes,
      RotationGroupTemplateLogDbStructure.options,
    );

    instance.models.set(RotationGroupTemplateLogDbStructure.tableName, model);
    console.log(
      `✅ Modèle Rotation Group Template Log défini (${RotationGroupTemplateLogDbStructure.tableName})`,
    );
  }

  private static definePlanningSuggestionConfigModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      PlanningSuggestionConfigDbStructure.tableName,
      PlanningSuggestionConfigDbStructure.attributes,
      PlanningSuggestionConfigDbStructure.options,
    );

    instance.models.set(PlanningSuggestionConfigDbStructure.tableName, model);
    console.log(
      `✅ Modèle Planning Suggestion Config défini (${PlanningSuggestionConfigDbStructure.tableName})`,
    );
  }

  private static defineScheduleSuggestionModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      ScheduleSuggestionDbStructure.tableName,
      ScheduleSuggestionDbStructure.attributes,
      ScheduleSuggestionDbStructure.options,
    );

    instance.models.set(ScheduleSuggestionDbStructure.tableName, model);
    console.log(
      `✅ Modèle Schedule Suggestion défini (${ScheduleSuggestionDbStructure.tableName})`,
    );
  }
  private static defineScheduleSuggestionItemModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      ScheduleSuggestionItemDbStructure.tableName,
      ScheduleSuggestionItemDbStructure.attributes,
      ScheduleSuggestionItemDbStructure.options,
    );

    instance.models.set(ScheduleSuggestionItemDbStructure.tableName, model);
    console.log(
      `✅ Modèle Schedule Suggestion Item défini (${ScheduleSuggestionItemDbStructure.tableName})`,
    );
  }

  private static defineEmployeePlanningProfileModelForInstance(instance: TenantInstance): void {
    const model = instance.sequelize.define(
      EmployeePlanningProfileDbStructure.tableName,
      EmployeePlanningProfileDbStructure.attributes,
      EmployeePlanningProfileDbStructure.options,
    );

    instance.models.set(EmployeePlanningProfileDbStructure.tableName, model);
    console.log(
      `✅ Modèle Employee Planning Profile défini (${EmployeePlanningProfileDbStructure.tableName})`,
    );
  }

  private static definePlanningSuggestionRequirementModelForInstance(
    instance: TenantInstance,
  ): void {
    const model = instance.sequelize.define(
      PlanningSuggestionRequirementDbStructure.tableName,
      PlanningSuggestionRequirementDbStructure.attributes,
      PlanningSuggestionRequirementDbStructure.options,
    );

    instance.models.set(PlanningSuggestionRequirementDbStructure.tableName, model);
    console.log(
      `✅ Modèle Planning Suggestion Requirement défini (${PlanningSuggestionRequirementDbStructure.tableName})`,
    );
  }

  /**
   * Synchronise tous les modèles avec la base de données pour une instance spécifique
   */
  private static async syncAllModelsForInstance(instance: TenantInstance): Promise<void> {
    console.log('🔄 Synchronisation avec la base de données...');

    // Bootstrap only; never repair or drop an existing business schema.
    const syncOptions = { force: false, alter: false, hooks: false };

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
