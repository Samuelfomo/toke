import { Sequelize } from 'sequelize';

import { TableInitializer } from '../tenant/database/db.initializer.js';
import TenantManager from '../tenant/database/db.tenant-manager.js';

export default class ManageTenantDatabase {
  static async createDatabase(
    database_name: string,
    database_username: string,
    database_password: string,
  ): Promise<{ success: boolean; error?: string }> {
    const sequelize = new Sequelize(
      'postgres',
      process.env.DB_SUPERUSER!,
      process.env.DB_SUPERPASS!,
      {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        dialect: 'postgres',
        logging: false,
      },
    );

    try {
      await sequelize.authenticate();

      // 1️⃣ Créer l’utilisateur si inexistant
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${database_username}') THEN
            EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', '${database_username}', '${database_password}');
          END IF;
        END
        $$;
      `);

      // 2️⃣ Vérifier si la base existe déjà
      const [results] = await sequelize.query(
        `SELECT 1 FROM pg_database WHERE datname = '${database_name}'`,
      );

      if ((results as any[]).length === 0) {
        await sequelize.query(`
          CREATE DATABASE "${database_name}"
          OWNER "${database_username}"
          ENCODING 'UTF8'
          CONNECTION LIMIT -1;
        `);
      }

      // 3️⃣ Donner les droits
      await sequelize.query(
        `GRANT ALL PRIVILEGES ON DATABASE "${database_name}" TO "${database_username}";`,
      );

      console.log(`✅ Base "${database_name}" et utilisateur "${database_username}" créés`);

      // 4️⃣ Activer les extensions PostGIS et UUID
      const result = await ManageTenantDatabase.activateExtensions(database_name);
      if (!result.success) {
        console.warn('⚠️ Les extensions n’ont pas pu être activées:', result.error);
      }

      return { success: true };
    } catch (error: any) {
      console.error(`❌ Erreur création DB:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred during database creation',
      };
    } finally {
      await sequelize.close();
    }
  }

  /*
  static async createDatabase(
  database_name: string,
  database_username: string,
  database_password: string,
): Promise<{ success: boolean; error?: string }> {
  const sequelize = new Sequelize(
    'postgres',
    process.env.DB_SUPERUSER!,
    process.env.DB_SUPERPASS!,
    {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      dialect: 'postgres',
      logging: false,
    },
  );

  try {
    await sequelize.authenticate();

    // 1️⃣ Créer l’utilisateur si inexistant
    await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${database_username}') THEN
        CREATE ROLE ${database_username} WITH LOGIN PASSWORD '${database_password}';
      END IF;
    END
    $$;
  `);

    // 2️⃣ Vérifier si la base existe déjà
    const [results] = await sequelize.query(
      `SELECT 1 FROM pg_database WHERE datname = '${database_name}'`,
    );

    if ((results as any[]).length === 0) {
      // ⚠️ Ici, exécution directe (pas de DO $$)
      await sequelize.query(`
      CREATE DATABASE ${database_name}
        OWNER ${database_username}
        ENCODING 'UTF8'
        CONNECTION LIMIT -1;
    `);
    }

    // 3️⃣ Donner les droits
    await sequelize.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${database_name} TO ${database_username};`,
    );

    console.log(`✅ Base "${database_name}" et utilisateur "${database_username}" créés`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ Erreur création DB:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred during database creation',
    };
  } finally {
    await sequelize.close();
  }
}
 */

  /**
   * Initialisation de la base de données
   */
  static async initializeDatabase(
    subdomain: string,
    port: number = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    host: string = process.env.DB_HOST || 'localhost',
    database_name: string,
    database_username: string,
    database_password: string,
  ): Promise<void> {
    try {
      console.log('🗄️ Initialisation de la base de données...');

      const connection = await TenantManager.getConnectionForTenant(subdomain, {
        host: host,
        port: port,
        username: database_username,
        password: database_password,
        database: database_name,
      });

      // // 1. Obtenir la connexion Sequelize
      // const sequelize = await TenantManager.getConnection();
      //
      // // 2. Initialiser toutes les tables (statique)
      await TableInitializer.initialize(connection); // ou sequelize

      console.log('✅ Base de données initialisée');
    } catch (error) {
      console.error('❌ Erreur initialisation DB:', error);
      throw error;
    }
  }

  // static async activateExtensions(
  //   database_name: string,
  // ): Promise<{ success: boolean; error?: string }> {
  //   const sequelizeDb = new Sequelize(
  //     database_name,
  //     process.env.DB_SUPERUSER!,
  //     process.env.DB_SUPERPASS!,
  //     {
  //       host: process.env.DB_HOST,
  //       port: parseInt(process.env.DB_PORT || '5432'),
  //       dialect: 'postgres',
  //       logging: false,
  //     },
  //   );
  //
  //   try {
  //     await sequelizeDb.authenticate();
  //
  //     await sequelizeDb.query(`CREATE EXTENSION IF NOT EXISTS postgis_topology;`);
  //     await sequelizeDb.query(`CREATE EXTENSION IF NOT EXISTS postgis_sfcgal;`);
  //     await sequelizeDb.query(`CREATE EXTENSION IF NOT EXISTS postgis_raster;`);
  //     await sequelizeDb.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  //
  //     console.log(`✅ Extensions PostGIS et UUID activées sur la base "${database_name}"`);
  //     return { success: true };
  //   } catch (error: any) {
  //     console.error(`❌ Erreur activation extensions :`, error.message);
  //     return { success: false, error: error.message };
  //   } finally {
  //     await sequelizeDb.close();
  //   }
  // }

  /**
   * Active PostGIS et UUID dans une base donnée
   */
  static async activateExtensions(
    database_name: string,
  ): Promise<{ success: boolean; error?: string }> {
    const sequelizeDb = new Sequelize(
      database_name,
      process.env.DB_SUPERUSER!,
      process.env.DB_SUPERPASS!,
      {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        dialect: 'postgres',
        logging: console.log, // <-- Affiche toutes les requêtes SQL
      },
    );

    try {
      await sequelizeDb.authenticate();
      console.log(`🔌 Connecté à la base "${database_name}" avec succès`);

      const extensions = [
        'postgis',
        'postgis_topology',
        'postgis_sfcgal',
        'postgis_raster',
        '"uuid-ossp"',
      ];

      for (const ext of extensions) {
        try {
          await sequelizeDb.query(`CREATE EXTENSION IF NOT EXISTS ${ext};`);
          console.log(`✅ Extension "${ext}" activée`);
        } catch (err: any) {
          console.error(`❌ Échec activation extension "${ext}" :`, err.message);
          return { success: false, error: `Extension ${ext} : ${err.message}` };
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error(`❌ Erreur connexion/activation extensions :`, err.message);
      return { success: false, error: err.message };
    } finally {
      await sequelizeDb.close();
      console.log(`🔒 Déconnexion de la base "${database_name}"`);
    }
  }
}
