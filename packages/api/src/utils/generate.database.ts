import { HttpStatus } from '@toke/shared';
import { Sequelize } from 'sequelize';

import { TableInitializer } from '../tenant/database/db.initializer.js';
import TenantManager from '../tenant/database/db.tenant-manager.js';

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

  static async sendOtp(otp: number, phone: string): Promise<any> {
    const response = await api.post(`/v1/tenants/${otp}/sendOtp`, phone);
  }

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
        username: database_name,
        password: database_username,
        database: database_password,
      });

      // // 1. Obtenir la connexion Sequelize
      const sequelize = await TenantManager.getConnection();
      //
      // // 2. Initialiser toutes les tables (statique)
      await TableInitializer.initialize(sequelize);

      console.log('✅ Base de données initialisée');
    } catch (error) {
      console.error('❌ Erreur initialisation DB:', error);
      throw error;
    }
  }
}
