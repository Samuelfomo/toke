import LicenseRecordsDb, { RecordScope } from '../database/base_model/db.license-records.js';

/** Projection des entites existantes : aucune table ni modele ORM supplementaire. */
export default class LicenseRecordsModel {
  constructor(protected readonly data: LicenseRecordsDb = new LicenseRecordsDb()) {}
  protected loadCash(scope: RecordScope) {
    return this.data.cash(scope);
  }
  protected loadEvents(scope: RecordScope, limit: number, offset: number) {
    return this.data.events(scope, limit, offset);
  }
}
