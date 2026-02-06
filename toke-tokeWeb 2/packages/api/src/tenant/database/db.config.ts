import { Sequelize } from 'sequelize';

import TenantManager from './db.tenant-manager.js';

/**
 * Gestionnaire simple de base de données avec support multi-tenant
 */
export default class Db {
  private static instance: Sequelize | null = null;

  // OBSOLÈTE: Utilisez TenantManager.getConnection() à la place
  public static async getInstance(): Promise<Sequelize> {
    console.warn('⚠️ Db.getInstance() est obsolète. Utilisez TenantManager.getConnection()');
    return await TenantManager.getConnection();
  }

  // Fermer la connexion
  public static async close(): Promise<void> {
    await TenantManager.closeAllConnections();
    Db.instance = null;
    console.log('🔌 Toutes les connexions DB fermées');
  }
}

// import { Sequelize } from 'sequelize';
// import { config } from 'dotenv';
//
// config();
//
// /**
//  * Gestionnaire simple de base de données
//  */
// export default class Db {
//   private static instance: Sequelize | null = null;
//
//   // Obtenir la connexion DB
//   public static async getInstance(
//     db_name: string,
//     db_username: string,
//     db_password: string,
//     db_host: string,
//   ): Promise<Sequelize> {
//     if (!Db.instance) {
//       console.log('🔌 Connexion à la base de données...');
//
//       Db.instance = new Sequelize(db_name, db_username, db_password, {
//         host: db_host,
//         port: Number(process.env.DB_PORT!),
//         dialect: 'postgres',
//         logging: false, // Désactive les logs SQL
//         pool: {
//           max: 5,
//           min: 0,
//           acquire: 30000,
//           idle: 10000,
//         },
//       });
//
//       try {
//         await Db.instance.authenticate();
//         console.log('✅ Connexion DB réussie');
//       } catch (error) {
//         console.error('❌ Erreur DB:', error);
//         throw error;
//       }
//     }
//     return Db.instance;
//   }
//
//   // Fermer la connexion
//   public static async close(): Promise<void> {
//     if (Db.instance) {
//       await Db.instance.close();
//       Db.instance = null;
//       console.log('🔌 Connexion DB fermée');
//     }
//   }
// }
