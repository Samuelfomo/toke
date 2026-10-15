import { Sequelize } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';

export default class TenantOnboardingDb {
  async provisionLock<T>(guid: number, work: () => Promise<T>): Promise<T> {
    const db = TableInitializer.getModel('xa_tenant').sequelize;
    if (!db) throw new Error('Master unavailable');
    return db.transaction(async (transaction) => {
      await db.query('SELECT pg_advisory_xact_lock(3701,CAST(:guid AS integer))', {
        replacements: { guid },
        transaction,
      });
      return work();
    });
  }
  async readiness(config: {
    database: string;
    username: string;
    password: string;
  }): Promise<'READY' | 'PENDING' | 'UNAVAILABLE'> {
    const required = (process.env.TOKE_ONBOARDING_REQUIRED_TABLES ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!required.length || required.some((s) => !/^[_a-z][_a-z0-9]*$/.test(s)))
      return 'UNAVAILABLE';
    const db = new Sequelize(config.database, config.username, config.password, {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      dialect: 'postgres',
      logging: false,
      pool: { max: 1, min: 0, acquire: 5000 },
      dialectOptions: { connectionTimeoutMillis: 5000, statement_timeout: 5000 },
    });
    try {
      const [rows] = await db.query(
        'SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname= :schema',
        { replacements: { schema: 'public' } },
      );
      const tables = new Set((rows as { tablename: string }[]).map((r) => r.tablename));
      return required.every((t) => tables.has(t)) ? 'READY' : 'PENDING';
    } catch {
      return 'UNAVAILABLE';
    } finally {
      await db.close();
    }
  }
}
