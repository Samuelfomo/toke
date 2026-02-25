// ========================================
// 4. TENANT MANAGER MODIFIÉ
// ========================================

// database/db.tenant-manager.ts (Version améliorée)
import { Sequelize } from 'sequelize';
import { TimezoneConfigUtils } from '@toke/shared';

interface TenantConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export default class TenantManager {
  private static connections: Map<string, Sequelize> = new Map();
  private static currentTenant: string | null = null;

  // Timezone pour l'Afrique Centrale (Cameroun, Congo, etc.)
  private static readonly TIMEZONE = 'Africa/Douala'; // UTC+1

  public static setCurrentTenant(subdomain: string): void {
    TenantManager.currentTenant = subdomain;
    console.log(`🏢 Tenant actuel défini: ${subdomain}`);
  }

  public static getCurrentTenant(): string {
    if (!TenantManager.currentTenant) {
      throw new Error('Aucun tenant défini. Le middleware tenant doit être appelé en premier.');
    }
    return TenantManager.currentTenant;
  }

  /**
   * Version améliorée qui accepte la config en paramètre
   */
  public static async getConnectionForTenant(
    subdomain: string,
    config: TenantConnectionConfig,
  ): Promise<Sequelize> {
    const connectionKey = `${subdomain}`;

    if (TenantManager.connections.has(connectionKey)) {
      console.log(`♻️ Réutilisation connexion existante pour tenant: ${subdomain}`);
      return TenantManager.connections.get(connectionKey)!;
    }

    console.log(`🔌 Création nouvelle connexion pour tenant: ${subdomain}`);
    console.log(`📍 DB: ${config.username}@${config.host}:${config.port}/${config.database}`);
    console.log(`🌍 Timezone: ${TenantManager.TIMEZONE} (UTC+1)`);

    const sequelize = new Sequelize(config.database, config.username, config.password, {
      host: config.host,
      port: config.port,
      dialect: 'postgres',
      logging: false, // Activer en dev si nécessaire

      // Configuration timezone Afrique Centrale
      timezone: TenantManager.TIMEZONE,
      dialectOptions: {
        timezone: TenantManager.TIMEZONE,
      },

      pool: {
        max: 3, // max: 5,    // IMPORTANT avec PgBouncer
        min: 0,
        acquire: 30000,
        idle: 10000,
      },

      // Définir les options par défaut pour les timestamps
      define: {
        timestamps: true,
        underscored: true,
      },
    });

    try {
      await sequelize.authenticate();
      console.log(`✅ Connexion DB établie pour tenant: ${subdomain}`);

      // // Configurer le timezone au niveau de la session PostgreSQL
      // await sequelize.query(`SET timezone = '${TenantManager.TIMEZONE}'`);
      // console.log(`⏰ Timezone configuré: ${TenantManager.TIMEZONE}`);

      TenantManager.connections.set(connectionKey, sequelize);
      return sequelize;
    } catch (error: any) {
      console.error(`❌ Erreur connexion DB pour tenant ${subdomain}:`, error.message);
      throw new Error(
        `Impossible de se connecter à la DB du tenant ${subdomain}: ${error.message}`,
      );
    }
  }

  public static async getConnection(): Promise<Sequelize> {
    const tenant = TenantManager.getCurrentTenant();
    const connection = TenantManager.connections.get(tenant);

    if (!connection) {
      throw new Error(
        `Connexion non trouvée pour le tenant ${tenant}. Le middleware tenant doit être appelé en premier.`,
      );
    }

    return connection;
  }

  public static getConnectionSync(): Sequelize {
    const tenant = this.getCurrentTenant();
    const connection = this.connections.get(tenant);

    if (!connection) {
      throw new Error(`Connection not initialized for tenant ${tenant}`);
    }

    return connection;
  }

  /**
   * Retourne le timezone configuré
   */
  public static getTimezone(): string {
    return TenantManager.TIMEZONE;
  }

  /**
   * Retourne la date/heure actuelle au timezone Africa/Douala
   */
  public static getCurrentTime(): Date {
    return TimezoneConfigUtils.getCurrentTime();
  }

  public static async closeAllConnections(): Promise<void> {
    for (const [tenant, connection] of TenantManager.connections) {
      try {
        await connection.close();
        console.log(`🔌 Connexion fermée pour tenant: ${tenant}`);
      } catch (error) {
        console.error(`❌ Erreur fermeture connexion pour tenant ${tenant}:`, error);
      }
    }
    TenantManager.connections.clear();
    TenantManager.currentTenant = null;
  }
}
