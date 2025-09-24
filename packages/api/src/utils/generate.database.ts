import { HttpStatus } from '@toke/shared';
import { Sequelize } from 'sequelize';

import api from './axios.config.js';

export default class ManageTenantDatabase {
  // static async generateDatabaseConfig(tenant: string): Promise<{
  //   database_name: string;
  //   database_username: string;
  //   database_password: string;
  // } | null> {
  //   const response = await api.patch(`/tenant/${tenant}/database`);
  //   if (response.status !== HttpStatus.SUCCESS) {
  //     return null;
  //   }
  //   return response.data.data;
  // }

  static async getDatabaseConfig(tenant: string): Promise<{
    database_name: string;
    database_username: string;
    database_password: string;
  } | null> {
    const response = await api.get(`/tenant/${tenant}/database`);
    if (response.status !== HttpStatus.SUCCESS) {
      return null;
    }
    return response.data.data;
  }

  // static async createDatabase(
  //   // subdomain: string,
  //   database_name: string,
  //   database_username: string,
  //   database_password: string,
  // ): Promise<boolean> {
  //   // ⚠️ Ici, tu te connectes à la DB "postgres" par défaut avec ton superuser
  //   const sequelize = new Sequelize(
  //     'postgres',
  //     process.env.DB_SUPERUSER || 'tokecloudapp',
  //     process.env.DB_SUPERPASS || 'm#L817E&flIvrtxg',
  //     {
  //       host: process.env.DB_HOST,
  //       port: parseInt(process.env.DB_PORT || '5432'),
  //       dialect: 'postgres',
  //       logging: false,
  //     },
  //   );
  //
  //   try {
  //     await sequelize.authenticate();
  //
  //     // 1️⃣ Créer l’utilisateur si inexistant
  //     await sequelize.query(`
  //       DO $$
  //       BEGIN
  //         IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${database_username}') THEN
  //           CREATE ROLE ${database_username} WITH LOGIN PASSWORD '${database_password}';
  //         END IF;
  //       END
  //       $$;
  //     `);
  //
  //     // 2️⃣ Créer la base si inexistante
  //     await sequelize.query(`
  //       DO $$
  //       BEGIN
  //         IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${database_name}') THEN
  //           CREATE DATABASE ${database_name}
  //             OWNER ${database_username}
  //             ENCODING 'UTF8'
  //             CONNECTION LIMIT -1;
  //         END IF;
  //       END
  //       $$;
  //     `);
  //
  //     // 3️⃣ Donner les droits
  //     await sequelize.query(
  //       `GRANT ALL PRIVILEGES ON DATABASE ${database_name} TO ${database_username};`,
  //     );
  //
  //     console.log(
  //       `✅ Base "${database_name}" et utilisateur "${database_username}" créés`, // pour tenant: ${subdomain}`,
  //     );
  //     return true;
  //   } catch (error) {
  //     console.error(
  //       `❌ Erreur création DB pour tenant: `, // ${subdomain}:`,
  //       error,
  //     );
  //     throw error;
  //   } finally {
  //     await sequelize.close();
  //   }
  // }

  static async createDatabase(
    database_name: string,
    database_username: string,
    database_password: string,
  ): Promise<{ success: boolean; error?: string }> {
    const sequelize = new Sequelize('postgres', 'tokecloudapp', 'm#L817E&flIvrtxg', {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      dialect: 'postgres',
      logging: false,
    });

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

      // 2️⃣ Créer la base si inexistante
      await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${database_name}') THEN
          CREATE DATABASE ${database_name}
            OWNER ${database_username}
            ENCODING 'UTF8'
            CONNECTION LIMIT -1;
        END IF;
      END
      $$;
    `);

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
}
