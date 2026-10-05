import MonthlyBillingPreviewDb from '../database/base_model/db.monthly-billing-preview.js';
/** Projection de lecture des entites existantes, sans nouvelle table. */
export default class MonthlyBillingPreviewModel {
  constructor(protected readonly data: MonthlyBillingPreviewDb = new MonthlyBillingPreviewDb()) {}
  protected loadPreview(tenant: number, license: number, start: string, end: string) {
    return this.data.load(tenant, license, start, end);
  }
}
