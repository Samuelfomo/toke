import { QueryTypes, Sequelize } from 'sequelize';

import { TableInitializer } from './db.initializer.js';
import TenantManager from './db.tenant-manager.js';

/**
 * Classe de base simple pour les modèles avec support multi-tenant
 */
export default abstract class BaseModel {
  protected sequelize!: Sequelize;

  protected constructor() {}

  // Initialiser la connexion avec le tenant actuel
  protected async init(): Promise<void> {
    this.sequelize = await TenantManager.getConnection();
    console.log(`📊 Modèle initialisé pour tenant: ${TenantManager.getCurrentTenant()}`);
  }

  // === MÉTHODES CRUD MODIFIÉES ===

  /**
   * Créer un enregistrement
   */
  protected async insertOne(tableName: string, data: any): Promise<any> {
    await this.ensureInitialized();
    const model = TableInitializer.getModel(tableName);
    const result = await model.create(data);
    return result.get();
  }

  /**
   * Trouver un enregistrement
   */
  protected async findOne(tableName: string, where: any): Promise<any> {
    await this.ensureInitialized();
    const model = TableInitializer.getModel(tableName);
    const result = await model.findOne({ where });
    return result ? result.get() : null;
  }

  /**
   * Trouver plusieurs enregistrements
   */
  protected async findAll(
    tableName: string,
    where: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    await this.ensureInitialized();
    const model = TableInitializer.getModel(tableName);

    const queryOptions: any = { where };

    if (typeof paginationOptions.offset === 'number' && paginationOptions.offset >= 0) {
      queryOptions.offset = paginationOptions.offset;
    }

    if (typeof paginationOptions.limit === 'number' && paginationOptions.limit > 0) {
      queryOptions.limit = paginationOptions.limit;
    }

    const results = await model.findAll(queryOptions);
    return results.map((r) => r.get());
  }

  /**
   * Mettre à jour un enregistrement
   */
  protected async updateOne(tableName: string, data: any, where: any): Promise<number> {
    await this.ensureInitialized();
    const model = TableInitializer.getModel(tableName);
    const [affectedCount] = await model.update(data, { where });
    return affectedCount;
  }

  /**
   * Supprimer un enregistrement
   */
  protected async deleteOne(tableName: string, where: any): Promise<boolean> {
    await this.ensureInitialized();
    const model = TableInitializer.getModel(tableName);
    const deletedCount = await model.destroy({ where });
    return deletedCount > 0;
  }

  /**
   * Compter les enregistrements
   */
  protected async count(tableName: string, where: any = {}): Promise<number> {
    await this.ensureInitialized();
    const model = TableInitializer.getModel(tableName);
    return await model.count({ where });
  }

  /**
   * Vérifier si un enregistrement existe
   */
  protected async exists(tableName: string, where: any): Promise<boolean> {
    const count = await this.count(tableName, where);
    return count > 0;
  }

  /**
   * Génère un GUID basé sur MAX (id) + offset
   */
  protected async guidGenerator(tableName: string, length: number = 6): Promise<number | null> {
    try {
      await this.ensureInitialized();
      const model = TableInitializer.getModel(tableName);

      if (!model) {
        console.error(`❌ Modèle '${tableName}' non trouvé pour génération GUID`);
        return null;
      }

      if (length < 3) {
        console.error(`❌ Taille '${length}' non autorisée pour la génération GUID`);
        return null;
      }

      const offset = Math.pow(10, length - 1);
      const maxId = ((await model.max('id')) as number) || 0;
      const nextId = maxId + 1;
      const guid = offset + nextId;

      const currentTenant = TenantManager.getCurrentTenant();
      console.log(
        `🔢 GUID généré pour '${tableName}' (tenant: ${currentTenant}): ${guid} (offset: ${offset}, next_id: ${nextId})`,
      );

      return guid;
    } catch (error: any) {
      console.error(`❌ Erreur génération GUID pour '${tableName}':`, error.message);
      return null;
    }
  }

  // Autres méthodes similaires...
  protected async timeBasedTokenGenerator(
    tableName: string,
    length: number = 3,
    divider: string = '-',
    prefix: string = 'A',
  ): Promise<string | null> {
    try {
      await this.ensureInitialized();
      const model = TableInitializer.getModel(tableName);
      if (!model) {
        console.error(`❌ Modèle '${tableName}' non trouvé pour génération token temporel`);
        return null;
      }

      // ... reste du code identique ...

      return null; // placeholder
    } catch (error: any) {
      console.error(`❌ Erreur génération token temporel pour '${tableName}':`, error.message);
      return null;
    }
  }

  protected async uuidTokenGenerator(tableName: string): Promise<string | null> {
    try {
      await this.ensureInitialized();

      const query = 'SELECT gen_random_uuid()::text as uuid';
      const [results] = (await this.sequelize.query(query, {
        type: QueryTypes.SELECT,
      })) as any[];

      const uuid = results?.uuid;
      const currentTenant = TenantManager.getCurrentTenant();

      if (!uuid) {
        console.error(
          `❌ UUID non généré par PostgreSQL pour '${tableName}' (tenant: ${currentTenant})`,
        );
        return null;
      }

      console.log(
        `🆔 UUID PostgreSQL généré pour '${tableName}' (tenant: ${currentTenant}): ${uuid}`,
      );
      return uuid;
    } catch (error: any) {
      console.error(`❌ Erreur génération UUID PostgreSQL pour '${tableName}':`, error.message);
      return null;
    }
  }

  /**
   * S'assurer que la connexion est initialisée pour le tenant actuel
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.sequelize) {
      await this.init();
    }
  }
}
