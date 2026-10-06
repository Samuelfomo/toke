import RenewalModel from '../model/RenewalModel.js';
import { RenewalPreviewError } from '../database/base_model/db.renewal-preview.js';
import { RenewalPreparationError } from '../database/base_model/db.renewal-preparation.js';

export default class Renewal extends RenewalModel {
  async preview(value: unknown) {
    const guid = String(value);
    if (!/^[1-9][0-9]{5}$/.test(guid)) throw new RenewalPreviewError('Invalid license GUID');
    return this.previewData(Number(guid));
  }
  async prepare(value: unknown, input: Record<string, any>) {
    const guid = String(value);
    if (!/^[1-9][0-9]{5}$/.test(guid)) throw new RenewalPreparationError('Invalid license GUID');
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new RenewalPreparationError('Object body required');
    return this.prepareData(Number(guid), input);
  }
}
