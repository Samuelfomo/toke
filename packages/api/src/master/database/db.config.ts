import { Sequelize } from 'sequelize';
import { config } from 'dotenv';

config();

/**
 * Gestionnaire simple de base de données
 */
export default class Db {
  private static instance: Sequelize | null = null;

  // Obtenir la connexion DB
  public static async getInstance(): Promise<Sequelize> {
    if (!Db.instance) {
      console.log('🔌 Connexion à la base de données...');

      Db.instance = new Sequelize(
        process.env.DB_NAME!,
        process.env.DB_USERNAME!,
        process.env.DB_PASSWORD!,
        {
          host: process.env.DB_HOST!,
          port: Number(process.env.DB_PORT!),
          dialect: 'postgres',
          logging: false, // Désactive les logs SQL
          pool: {
            max: 3, // max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
          },
        },
      );

      try {
        await Db.instance.authenticate();
        console.log('✅ Connexion DB réussie');
      } catch (error) {
        console.error('❌ Erreur DB:', error);
        throw error;
      }
    }
    return Db.instance;
  }

  // Fermer la connexion
  public static async close(): Promise<void> {
    if (Db.instance) {
      await Db.instance.close();
      Db.instance = null;
      console.log('🔌 Connexion DB fermée');
    }
  }
}
