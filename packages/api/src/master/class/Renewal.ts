import { renewalSelection } from '../services/renewal-selection.js';
import RenewalModel from '../model/RenewalModel.js';
import { RenewalPreviewError } from '../database/base_model/db.renewal-preview.js';
import { RenewalPreparationError } from '../database/base_model/db.renewal-preparation.js';

export default class Renewal extends RenewalModel {
  async preview(value: unknown, query: Record<string, any> = {}) {
    const guid = String(value);
    if (!/^[1-9][0-9]{5}$/.test(guid)) throw new RenewalPreviewError('Invalid license GUID');
    try {
      return await this.previewData(Number(guid), renewalSelection(query));
    } catch (error: any) {
      throw new RenewalPreviewError(error.message);
    }
  }
  async prepare(value: unknown, input: Record<string, any>) {
    const guid = String(value);
    if (!/^[1-9][0-9]{5}$/.test(guid)) throw new RenewalPreparationError('Invalid license GUID');
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new RenewalPreparationError('Object body required');
    const allowed = new Set([
      'actor_user_guid',
      'idempotency_key',
      'payment_method_guid',
      'billing_cycle_months',
      'requested_seats',
    ]);
    if (Object.keys(input).some((key) => !allowed.has(key)))
      throw new RenewalPreparationError('Unsupported renewal input field');
    try {
      const result = await this.prepareData(Number(guid), { ...input, ...renewalSelection(input) });
      return this.preparationJSON(result);
    } catch (error: any) {
      throw new RenewalPreparationError(error.message);
    }
  }
  private preparationJSON(row: Record<string, any>) {
    const s = row.snapshot ?? {};
    return {
      license_guid: s.license_guid,
      billing_cycle_guid: Number(row.billing_cycle_guid),
      payment_transaction_guid: Number(row.payment_transaction_guid),
      period_start: row.period_start,
      period_end: row.period_end,
      payment_due_date: s.payment_due_date ?? s.period_start,
      billing_cycle_months: s.billing_cycle_months,
      billed_seats: s.billed_seats,
      minimum_seats: s.minimum_seats,
      unit_price_usd: s.unit_price_usd,
      billing_currency_code: s.currency ?? s.billing_currency_code,
      payment_method_guid: Number(row.payment_method_guid),
      grace_days: s.grace_days ?? 0,
      subtotal_local: s.amounts?.baseLocal,
      tax_amount_local: s.amounts?.taxLocal,
      total_amount_local: s.amounts?.totalLocal,
      subtotal_usd: s.amounts?.baseUsd,
      tax_amount_usd: s.amounts?.taxUsd,
      total_amount_usd: s.amounts?.totalUsd,
      exchange_rate_used: s.exchange_rate ?? s.exchange_rate_used,
      replayed: !!row.replayed,
      financial_status: 'CONSULT_TENANT_LICENSE_STATUS',
    };
  }
}
