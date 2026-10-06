import type { Sequelize } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';

import { previewRenewal } from './db.renewal-preview.js';
import { prepareRenewal } from './db.renewal-preparation.js';

/** DBD specialisee : connexion et transactions des renouvellements existants. */
export default class RenewalDb {
  constructor(private readonly connection?: Sequelize) {}

  preview(licenseGuid: number) {
    return previewRenewal(this.database(), licenseGuid);
  }

  prepare(licenseGuid: number, input: Record<string, any>) {
    return prepareRenewal(this.database(), licenseGuid, input);
  }

  private database(): Sequelize {
    const db = this.connection ?? TableInitializer.getModel('xa_global_license').sequelize;
    if (!db) throw new Error('Master database connection unavailable');
    return db;
  }
}
