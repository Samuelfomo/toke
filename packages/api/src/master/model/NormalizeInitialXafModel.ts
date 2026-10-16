import NormalizeInitialXafDb from '../database/base_model/db.normalize-initial-xaf.js';
export default class NormalizeInitialXafModel {
  constructor(protected readonly data: NormalizeInitialXafDb = new NormalizeInitialXafDb()) {}
  protected runStored(guid: number, apply: boolean) {
    return this.data.run(guid, apply);
  }
}
