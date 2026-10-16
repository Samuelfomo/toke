import { renewalAmounts } from '../../services/renewal-amounts.js';

export type RenewalRows = (sql: string, replacements?: Record<string, any>) => Promise<any[]>;
/** Configuration commerciale lue dans la transaction de l'opération. */
export async function loadRenewalPricingConfiguration(rows: RenewalRows, tenantId: number) {
  const tenant = (await rows('SELECT * FROM xa_tenant WHERE id= :id', { id: tenantId }))[0];
  if (
    !tenant ||
    tenant.status !== 'ACTIVE' ||
    !tenant.country_code ||
    !/^[A-Z]{3}$/.test(tenant.primary_currency_code)
  )
    throw new Error('Active tenant with complete billing profile required');
  const currency = tenant.primary_currency_code;
  const rates =
    currency === 'USD'
      ? []
      : await rows(
          `SELECT * FROM xf_exchange_rate WHERE from_currency_code='USD' AND to_currency_code= :currency AND current=true`,
          { currency },
        );
  if (currency !== 'USD' && rates.length !== 1)
    throw new Error('Exactly one current exchange rate required');
  const rate = currency === 'USD' ? '1.000000' : String(rates[0].exchange_rate);
  const taxes = tenant.tax_exempt
    ? []
    : await rows(
        `SELECT * FROM xf_tax_rule WHERE country_code= :country AND active=true
     AND effective_date<=CURRENT_TIMESTAMP AND (expiry_date IS NULL OR CURRENT_TIMESTAMP<expiry_date)
     AND applies_to='license_fee' ORDER BY id`,
        { country: tenant.country_code },
      );
  if (
    !tenant.tax_exempt &&
    (!taxes.length ||
      taxes.some((t) => t.required_tax_number && !String(tenant.tax_number ?? '').trim()))
  )
    throw new Error('Tax configuration or required tax number needs review');
  return { tenant, currency, rate, taxes, exchange_rate_guid: rates[0]?.guid ?? null };
}
export async function loadRenewalPricing(rows: RenewalRows, tenantId: number, subtotal: string) {
  const configuration = await loadRenewalPricingConfiguration(rows, tenantId);
  const amounts = renewalAmounts(
    subtotal,
    configuration.rate,
    configuration.taxes.map((t) => t.tax_rate),
    configuration.currency,
  );
  return { ...configuration, amounts };
}
