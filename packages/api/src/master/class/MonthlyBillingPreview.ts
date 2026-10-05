import MonthlyBillingPreviewModel from '../model/MonthlyBillingPreviewModel.js';
import { centsText, decimalUnits, renewalAmounts } from '../services/renewal-amounts.js';

import {
  activityDate,
  activityGuid,
  ActivityMonitoringInputError,
  summarizeMonthlyMonitoring,
} from './activity-monitoring-input.js';

export function calculateMonthlyPreview(raw: Record<string, any>): Record<string, any> {
  const usage = summarizeMonthlyMonitoring(raw.usage);
  if (!Number.isSafeInteger(usage.billed_seats) || usage.billed_seats < 5)
    throw new ActivityMonitoringInputError('Minimum five seats required');
  const price = decimalUnits(usage.unit_price_usd, 2);
  if (price <= 0n) throw new ActivityMonitoringInputError('Positive unit price required');
  const subtotal = centsText(price * BigInt(usage.billed_seats));
  const amounts = renewalAmounts(
    subtotal,
    raw.exchange_rate,
    raw.taxes.map((t: any) => t.tax_rate),
  );
  return {
    ...usage,
    taxes_included: true,
    billing_currency_code: raw.currency,
    exchange_rate_used: raw.exchange_rate,
    exchange_rate_guid: raw.exchange_rate_guid,
    exchange_rate_updated_at: raw.exchange_rate_updated_at,
    tenant_tax_exempt: raw.tax_exempt,
    tax_rules_applied: raw.taxes,
    amounts,
    pricing_basis: 'CURRENT_CONFIGURATION_NOT_HISTORICAL_SNAPSHOT',
    mutates_access: false,
    invoice_creation_allowed: false,
    warning:
      'Estimate only: signal coverage is not attested; current price, exchange rate and taxes are used. No debt or payment is created.',
  };
}
export default class MonthlyBillingPreview extends MonthlyBillingPreviewModel {
  async preview(license: unknown, query: Record<string, any>): Promise<Record<string, any>> {
    const tenant = activityGuid(query.tenant_guid),
      guid = activityGuid(license);
    const start = activityDate(query.period_start),
      end = activityDate(query.period_end);
    if (Date.parse(end) <= Date.parse(start))
      throw new ActivityMonitoringInputError('Period end must follow start');
    return calculateMonthlyPreview(await this.loadPreview(tenant, guid, start, end));
  }
}
