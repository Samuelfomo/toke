const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { stripTypeScriptTypes } = require('node:module');
(async () => {
  const fixture = fs.readFileSync(__dirname + '/renewal-amounts.fixture.ts', 'utf8');
  let src = fs
    .readFileSync(__dirname + '/../master/class/onboarding-commercial.ts', 'utf8')
    .replace(/^import .*;\n/gm, '');
  src =
    "class OnboardingError extends Error{constructor(m,s=400){super(m);this.status=s}}\nfunction subscriptionOffers(){return {CLOUD_FLEX:{price:'3.00',minimum:5,maxSeats:32767,months:[1]}}}\n" +
    fixture +
    '\n' +
    src;
  const mod = await import(
    'data:text/javascript;base64,' +
      Buffer.from(stripTypeScriptTypes(src, { mode: 'transform' })).toString('base64')
  );
  process.env.TOKE_CASH_CONTACT = 'Support test';
  const raw = {
    tenant: { guid: 100022, primary_currency_code: 'XAF' },
    rate: '610.500000',
    taxes: [{ guid: 100001, tax_rate: '0.1925' }],
    methods: [
      {
        guid: 100002,
        code: 'CASH',
        method_type: 'CASH',
        min_amount_usd: '1',
        max_amount_usd: '100000',
      },
      { guid: 100001, code: 'MTN_MOMO', method_type: 'MOBILE_MONEY' },
    ],
  };
  const q = mod.calculateOnboardingEstimate(raw, 5, 100002);
  assert.equal(q.amounts.total_amount_local, '10920.32');
  assert.equal(q.amounts.tax_amount_local, '1762.82');
  assert.equal(q.amounts.total_amount_usd, '17.89');
  assert.equal(q.creates_debt, false);
  assert.throws(() => mod.calculateOnboardingEstimate(raw, 4, 100002));
  assert.throws(() => mod.calculateOnboardingEstimate(raw, 5, 100001));
  const base = {
    financial: { tenant_status: 'ACTIVE', licenses: [] },
    phase: 'SUBSCRIPTION_REQUIRED',
  };
  assert.equal(
    mod.enrichOnboardingStatus(base, {
      tenant: raw.tenant,
      licenses: [],
      cycles: [],
      requests: [],
      methods: raw.methods,
    }).can_subscribe,
    true,
  );
  delete process.env.TOKE_CASH_CONTACT;
  assert.equal(mod.availableMethod(raw.methods[0]), false);
  process.env.TOKE_CASH_CONTACT = 'Support test';
  const state = {
    phase: 'PAYMENT_PENDING',
    financial: {
      tenant_status: 'ACTIVE',
      licenses: [
        {
          license_guid: 100027,
          license_status: 'PENDING_PAYMENT',
          billing_mode: 'PREPAID',
          payments: [
            {
              billing_cycle_guid: 100015,
              payment_method_code: 'CASH',
              payment_reference: 'REF',
              transaction_status: 'PENDING',
              received_local: '5000.00',
              amount_to_pay_local: '5920.32',
            },
          ],
        },
      ],
    },
  };
  const records = {
    tenant: raw.tenant,
    licenses: [{ guid: 100027, license_type: 'CLOUD_FLEX', billing_cycle_months: 1 }],
    cycles: [
      {
        guid: 100015,
        subtotal_usd: '15.00',
        tax_amount_usd: '2.89',
        total_amount_usd: '17.89',
        subtotal_local: '9157.50',
        tax_amount_local: '1762.82',
        total_amount_local: '10920.32',
        exchange_rate_used: '610.5',
        tax_rules_applied: [{ tax_rate: '.1925' }],
        final_employee_count: 5,
      },
    ],
    requests: [
      { license_guid: 100027, billing_cycle_guid: 100015, seats: 5, unit_price_usd: '3.00' },
    ],
    methods: raw.methods,
  };
  const result = mod.enrichOnboardingStatus(state, records),
    p = result.financial.licenses[0].payments[0];
  assert.equal(result.can_subscribe, false);
  assert.equal(p.is_partial, true);
  assert.equal(p.tax_amount_local, '1762.82');
  assert.equal(p.unit_price_usd, '3.00');
  assert.equal(p.instructions.reference, 'REF');
  state.financial.licenses[0].license_status = 'EXPIRED';
  assert.equal(mod.enrichOnboardingStatus(state, records).can_subscribe, false);
  records.requests = [];
  assert.equal(
    mod.enrichOnboardingStatus(state, records).financial.licenses[0].payments[0].requested_seats,
    null,
  );
  function walk(dir) {
    for (const x of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, x.name);
      if (x.isDirectory()) walk(f);
      else if (f.endsWith('.ts'))
        stripTypeScriptTypes(fs.readFileSync(f, 'utf8'), { mode: 'transform' });
    }
  }
  walk(__dirname + '/../master');
  walk(__dirname + '/../backend');
  console.log(
    'PASS estimate money/tax/limits, CASH-only, unconfigured contact, immutable invoice projection, partial balance, expired no new subscription, null legacy data, TS syntax. No PG/build/provider integration tested.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
