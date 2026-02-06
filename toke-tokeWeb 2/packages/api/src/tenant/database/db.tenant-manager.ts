// ========================================
// 4. TENANT MANAGER MODIFIÉ
// ========================================

// database/db.tenant-manager.ts (Version améliorée)
import { Sequelize } from 'sequelize';

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
    config: TenantConnectionConfig
  ): Promise<Sequelize> {
    const connectionKey = `${subdomain}`;

    if (TenantManager.connections.has(connectionKey)) {
      console.log(`♻️ Réutilisation connexion existante pour tenant: ${subdomain}`);
      return TenantManager.connections.get(connectionKey)!;
    }

    console.log(`🔌 Création nouvelle connexion pour tenant: ${subdomain}`);
    console.log(`📍 DB: ${config.username}@${config.host}:${config.port}/${config.database}`);
    console.log(`🌍 Timezone: ${TenantManager.TIMEZONE} (UTC+1)`);

    const sequelize = new Sequelize(
      config.database,
      config.username,
      config.password,
      {
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
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },

        // Définir les options par défaut pour les timestamps
        define: {
          timestamps: true,
          underscored: true,
        },

      }
    );

    try {
      await sequelize.authenticate();
      console.log(`✅ Connexion DB établie pour tenant: ${subdomain}`);

      // Configurer le timezone au niveau de la session PostgreSQL
      await sequelize.query(`SET timezone = '${TenantManager.TIMEZONE}'`);
      console.log(`⏰ Timezone configuré: ${TenantManager.TIMEZONE}`);

      TenantManager.connections.set(connectionKey, sequelize);
      return sequelize;

    } catch (error: any) {
      console.error(`❌ Erreur connexion DB pour tenant ${subdomain}:`, error.message);
      throw new Error(`Impossible de se connecter à la DB du tenant ${subdomain}: ${error.message}`);
    }
  }

  public static async getConnection(): Promise<Sequelize> {
    const tenant = TenantManager.getCurrentTenant();
    const connection = TenantManager.connections.get(tenant);

    if (!connection) {
      throw new Error(`Connexion non trouvée pour le tenant ${tenant}. Le middleware tenant doit être appelé en premier.`);
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
    return new Date(new Date().toLocaleString('en-US', { timeZone: TenantManager.TIMEZONE }));
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


// import { Sequelize } from 'sequelize';
// import { config } from 'dotenv';
//
// config();
//
// interface TenantConfig {
//   host: string;
//   port: number;
//   username: string;
//   password: string;
//   database: string;
// }
//
// export default class TenantManager {
//   private static connections: Map<string, Sequelize> = new Map();
//   private static currentTenant: string | null = null;
//
//   /**
//    * Définit le tenant actuel pour toute l'application
//    */
//   public static setCurrentTenant(subdomain: string): void {
//     TenantManager.currentTenant = subdomain;
//     console.log(`🏢 Tenant actuel défini: ${subdomain}`);
//   }
//
//   /**
//    * Récupère le tenant actuel
//    */
//   public static getCurrentTenant(): string {
//     if (!TenantManager.currentTenant) {
//       throw new Error(
//         "Aucun tenant défini. Appelez TenantManager.setCurrentTenant() avant d'utiliser les modèles.",
//       );
//     }
//     return TenantManager.currentTenant;
//   }
//
//   /**
//    * Obtient la connexion pour le tenant actuel
//    */
//   public static async getConnection(): Promise<Sequelize> {
//     const tenant = TenantManager.getCurrentTenant();
//     return await TenantManager.getConnectionForTenant(tenant);
//   }
//
//   /**
//    * Obtient la connexion pour un tenant spécifique
//    */
//   public static async getConnectionForTenant(subdomain: string): Promise<Sequelize> {
//     if (TenantManager.connections.has(subdomain)) {
//       return TenantManager.connections.get(subdomain)!;
//     }
//
//     console.log(`🔌 Création connexion pour tenant: ${subdomain}`);
//
//     const config = TenantManager.getTenantConfig(subdomain);
//     const sequelize = new Sequelize(config.database, config.username, config.password, {
//       host: config.host,
//       port: config.port,
//       dialect: 'postgres',
//       logging: false,
//       pool: {
//         max: 5,
//         min: 0,
//         acquire: 30000,
//         idle: 10000,
//       },
//     });
//
//     try {
//       await sequelize.authenticate();
//       console.log(`✅ Connexion DB réussie pour tenant: ${subdomain}`);
//       TenantManager.connections.set(subdomain, sequelize);
//     } catch (error) {
//       console.error(`❌ Erreur connexion DB pour tenant ${subdomain}:`, error);
//       throw error;
//     }
//
//     return sequelize;
//   }
//
//   /**
//    * Ferme toutes les connexions
//    */
//   public static async closeAllConnections(): Promise<void> {
//     for (const [tenant, connection] of TenantManager.connections) {
//       await connection.close();
//       console.log(`🔌 Connexion fermée pour tenant: ${tenant}`);
//     }
//     TenantManager.connections.clear();
//     TenantManager.currentTenant = null;
//   }
//
//   /**
//    * Ferme la connexion d'un tenant spécifique
//    */
//   public static async closeTenantConnection(subdomain: string): Promise<void> {
//     const connection = TenantManager.connections.get(subdomain);
//     if (connection) {
//       await connection.close();
//       TenantManager.connections.delete(subdomain);
//       console.log(`🔌 Connexion fermée pour tenant: ${subdomain}`);
//     }
//   }
//
//   /**
//    * Configuration du tenant basée sur les variables d'environnement
//    */
//   private static getTenantConfig(subdomain: string): TenantConfig {
//     const prefix = `TENANT_${subdomain.toUpperCase()}`;
//
//     return {
//       host: process.env[`${prefix}_DB_HOST`] || process.env.DB_HOST!,
//       port: parseInt(process.env[`${prefix}_DB_PORT`] || process.env.DB_PORT!),
//       username: process.env[`${prefix}_DB_USERNAME`] || process.env.DB_USERNAME!,
//       password: process.env[`${prefix}_DB_PASSWORD`] || process.env.DB_PASSWORD!,
//       database: process.env[`${prefix}_DB_NAME`] || process.env.DB_NAME!,
//     };
//   }
// }
