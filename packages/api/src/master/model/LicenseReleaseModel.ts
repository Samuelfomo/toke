import LicenseReleaseDb, { type ReleaseInput } from '../database/base_model/db.license-release.js';

export default class LicenseReleaseModel {
  constructor(protected readonly data: LicenseReleaseDb = new LicenseReleaseDb()) {}
  protected releaseData(input: ReleaseInput, preview: boolean) {
    return this.data.release(input, preview);
  }
}
