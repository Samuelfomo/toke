import RenewalDb from '../database/base_model/db.renewal.js';
/** Operation sur les entites existantes, sans table ni modele ORM supplementaire. */
export default class RenewalModel {
  constructor(protected readonly data: RenewalDb = new RenewalDb()) {}
  protected previewData(guid: number) {
    return this.data.preview(guid);
  }
  protected prepareData(guid: number, input: Record<string, any>) {
    return this.data.prepare(guid, input);
  }
}
