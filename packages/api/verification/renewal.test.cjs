'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '../src');
// Test autonome : les dépendances de production sont copiées sous verification/dependencies.
const cache = new Map();
async function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  let source = stripTypeScriptTypes(fs.readFileSync(file, 'utf8'), { mode: 'transform' });
  for (const match of [...source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)]) {
    const spec = match[1];
    let url;
    if (spec === 'sequelize')
      url =
        'data:text/javascript;base64,' +
        Buffer.from(
          "export class Sequelize{}; export const Transaction={ISOLATION_LEVELS:{REPEATABLE_READ:'REPEATABLE READ'}};",
        ).toString('base64');
    else if (spec.endsWith('db.initializer.js'))
      url =
        'data:text/javascript;base64,' +
        Buffer.from('export const TableInitializer={};').toString('base64');
    else {
      let target = path.resolve(path.dirname(file), spec.replace(/\.js$/, '.ts'));
      if (!fs.existsSync(target)) {
        const masterAt = target.indexOf('/master/');
        if (masterAt < 0) throw Error('Missing test import ' + target);
        target = path.join(root, 'verification/dependencies', target.slice(masterAt + 1));
      }
      url = await moduleURL(target);
    }
    source = source
      .replaceAll("'" + spec + "'", "'" + url + "'")
      .replaceAll('"' + spec + '"', '"' + url + '"');
  }
  const url = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  cache.set(file, url);
  return url;
}
const moduleURL = load;
const mod = async (f) => import(await load(path.join(root, f)));
let state;
const tx = {};
function reset() {
  state = {
    licence: {
      id: 27,
      guid: 100027,
      tenant: 22,
      billing_mode: 'PREPAID',
      license_status: 'ACTIVE',
      current_period_start: '2026-10-08T23:00:00.000Z',
      current_period_end: '2026-11-08T23:00:00.000Z',
      next_renewal_date: '2026-11-08T23:00:00.000Z',
      billing_cycle_months: 1,
      minimum_seats: 5,
      base_price_usd: '3.00',
    },
    closed: false,
    windows: true,
    capacity: 10,
    employees: 7,
    prior: null,
    records: [],
    failAudit: false,
    allowed: true,
    seq: 100100,
  };
}
const db = {
  async transaction(options, fn) {
    if (typeof options === 'function') fn = options;
    const before = structuredClone(state);
    try {
      return await fn(tx);
    } catch (e) {
      state = before;
      throw e;
    }
  },
  async query(sql, o = {}) {
    const v = o.replacements ?? {};
    if (sql.includes('license_employee_billing_status')) throw Error('Legacy status rule invoked');
    if (sql.startsWith('SELECT * FROM xa_global_license')) return [[state.licence]];
    if (sql.startsWith('SELECT timezone')) return [[{ timezone: 'Africa/Douala' }]];
    if (sql.includes('pg_timezone_names')) return [[{ name: 'Africa/Douala' }]];
    if (sql.includes('WITH boundaries'))
      return [
        state.windows
          ? [
              {
                period_start: state.licence.current_period_start,
                period_end: state.licence.current_period_end,
                closed: state.closed,
                started: true,
              },
            ]
          : [],
      ];
    if (sql.includes('AS period_start') && sql.includes('payment_due_date'))
      return [
        [
          {
            period_start: state.licence.current_period_end,
            period_end: v.months === 3 ? '2027-02-08T23:00:00.000Z' : '2026-12-08T23:00:00.000Z',
            payment_due_date: '2026-11-15T23:00:00.000Z',
            current_period_coherent: true,
          },
        ],
      ];
    if (sql.includes('gl.*,t.guid AS tenant_guid'))
      return [[{ ...state.licence, tenant_guid: 100022, timezone: 'Africa/Douala' }]];
    if (sql.includes('AS local_start'))
      return [[{ valid: true, started: true, closed: state.closed }]];
    if (sql.includes('COUNT(a.id)::integer AS active_days'))
      return [
        Array.from({ length: state.employees }, (_, i) => ({
          employee_license_guid: 100001 + i,
          active_days: 1,
          contractual_status: 'ACTIVE',
        })),
      ];
    if (sql.includes('COALESCE(SUM(seats),0)')) return [[{ seats: state.capacity }]];
    if (sql.startsWith('SELECT * FROM xa_tenant'))
      return [
        [
          {
            id: 22,
            guid: 100022,
            status: 'ACTIVE',
            country_code: 'CM',
            primary_currency_code: 'XAF',
            tax_exempt: false,
            tax_number: 'REAL',
          },
        ],
      ];
    if (sql.includes('FROM xf_exchange_rate'))
      return [[{ id: 1, guid: 100001, exchange_rate: '610.500000' }]];
    if (sql.includes('FROM xf_tax_rule'))
      return [
        [
          {
            id: 1,
            guid: 100001,
            tax_name: 'TVA',
            tax_type: 'VAT',
            tax_rate: '0.1925',
            required_tax_number: true,
          },
        ],
      ];
    if (sql.startsWith('SELECT r.*,c.guid')) return [state.prior ? [state.prior] : []];
    if (sql.startsWith('SELECT id FROM xa_renewal_preparation')) return [[]];
    if (sql.includes("CURRENT_TIMESTAMP+INTERVAL '30 days'")) return [[{ allowed: state.allowed }]];
    if (sql.startsWith('SELECT g.id')) return [[{ id: 1 }]];
    if (sql.startsWith('SELECT id FROM xa_billing_cycle WHERE global_license')) return [[]];
    if (sql.startsWith('SELECT * FROM xa_payment_method'))
      return [
        [
          {
            id: 2,
            guid: 100002,
            supported_currencies: ['XAF'],
            min_amount_usd: '1.00',
            max_amount_usd: '100000.00',
          },
        ],
      ];
    if (sql.includes('SELECT nextval')) return [[{ guid: state.seq++ }]];
    if (
      sql.startsWith('SELECT id FROM xa_billing_cycle WHERE guid') ||
      sql.startsWith('SELECT id FROM xa_payment_transaction WHERE guid')
    )
      return [[]];
    if (sql.startsWith('INSERT INTO xa_billing_cycle')) {
      state.records.push({ type: 'cycle', values: v });
      return [[{ id: 90, guid: v.guid }]];
    }
    if (sql.startsWith('INSERT INTO xa_payment_transaction')) {
      state.records.push({ type: 'payment', values: v });
      return [[{ id: 91, guid: v.guid }]];
    }
    if (sql.startsWith('INSERT INTO xa_renewal_preparation')) {
      if (state.failAudit) throw Error('Snapshot failed');
      state.prior = {
        id: 99,
        global_license: 27,
        period_start: v.start,
        period_end: v.end,
        billing_cycle: 90,
        payment_transaction: 91,
        billing_cycle_guid: 100100,
        payment_transaction_guid: 100101,
        payment_method_guid: v.method,
        actor_user_guid: v.actor,
        idempotency_key: v.key,
        snapshot: JSON.parse(v.snapshot),
      };
      state.records.push({ type: 'preparation', values: v });
      return [[state.prior]];
    }
    if (sql.startsWith('SELECT snapshot FROM xa_renewal_preparation'))
      return [state.prior ? [{ snapshot: state.prior.snapshot }] : []];
    throw Error('Unexpected SQL ' + sql.slice(0, 100));
  },
};
(async () => {
  const { renewalSelection } = await mod('master/services/renewal-selection.ts');
  assert.deepEqual(renewalSelection({ billing_cycle_months: '3', requested_seats: '8' }), {
    billing_cycle_months: 3,
    requested_seats: 8,
  });
  for (const v of [0, -1, 2, 13, true, [], null])
    assert.throws(() => renewalSelection({ billing_cycle_months: v }));
  const preview = await mod('master/database/base_model/db.renewal-preview.ts');
  const { prepareRenewal } = await mod('master/database/base_model/db.renewal-preparation.ts');
  reset();
  let p = await preview.calculateRenewalPreview(db, 100027, tx, {
    billing_cycle_months: 3,
    requested_seats: 5,
  });
  assert.equal(p.suggested_seats, 10);
  assert.equal(p.suggested_seats_provisional, true);
  assert.equal(p.billed_seats, 5);
  assert.equal(p.subtotal_usd, '45.00');
  assert.equal(p.total_amount_local, '32761.00');
  assert.equal(p.payment_due_date, '2026-11-15T23:00:00.000Z');
  state.closed = true;
  p = await preview.calculateRenewalPreview(db, 100027, tx);
  assert.equal(p.suggested_seats, 7);
  assert.equal(p.reference_period_closed, true);
  state.employees = 0;
  p = await preview.calculateRenewalPreview(db, 100027, tx);
  assert.equal(p.billed_seats, 5);
  await assert.rejects(
    preview.calculateRenewalPreview(db, 100027, tx, { requested_seats: 4 }),
    /Seats/,
  );
  state.licence.billing_mode = 'POSTPAID';
  await assert.rejects(preview.calculateRenewalPreview(db, 100027, tx), /Postpaid/);
  reset();
  const input = {
    actor_user_guid: '7173056141612204',
    idempotency_key: 'RENEW_TEST_1',
    payment_method_guid: 100002,
    billing_cycle_months: 3,
    requested_seats: 5,
  };
  const before = structuredClone(state.licence);
  const result = await prepareRenewal(db, 100027, input);
  assert.equal(result.replayed, false);
  assert.deepEqual(state.licence, before);
  assert.equal(state.records.length, 3);
  assert.equal(state.records[0].values.due, '2026-11-15T23:00:00.000Z');
  assert.equal(state.records[0].values.totalLocal, '32761.00');
  assert.equal(state.prior.snapshot.reference_employees.length, 7);
  assert.equal(state.prior.snapshot.billing_cycle_months, 3);
  state.prior.snapshot.renewal_request = { requested_seats: 5, billing_cycle_months: 3 };
  state.closed = true;
  state.employees = 18;
  assert.equal((await prepareRenewal(db, 100027, input)).replayed, true);
  assert.equal(state.records.length, 3);
  await assert.rejects(
    prepareRenewal(db, 100027, { ...input, requested_seats: 6 }),
    /selection changed/,
  );
  reset();
  await assert.rejects(
    prepareRenewal(db, 100027, { ...input, requested_seats: undefined }),
    /Explicit requested_seats/,
  );
  reset();
  state.failAudit = true;
  await assert.rejects(prepareRenewal(db, 100027, input), /Snapshot failed/);
  assert.equal(state.records.length, 0);
  reset();
  state.allowed = false;
  await assert.rejects(prepareRenewal(db, 100027, input), /future coverage end/);
  const { renewalCycleMonths } = await mod('master/database/base_model/db.renewal-activation.ts');
  reset();
  assert.equal(
    await renewalCycleMonths((...args) => db.query(...args).then((r) => r[0]), 90, 1),
    1,
  );
  await prepareRenewal(db, 100027, input);
  assert.equal(
    await renewalCycleMonths((...args) => db.query(...args).then((r) => r[0]), 90, 1),
    3,
  );
  const { default: Renewal } = await mod('master/class/Renewal.ts');
  const operation = new Renewal({
    preview: async () => p,
    prepare: async () => ({ ...state.prior, replayed: false }),
  });
  const publicResult = await operation.prepare(100027, input);
  assert.equal(publicResult.billing_cycle_guid, 100100);
  assert.equal(publicResult.total_amount_local, '32761.00');
  for (const forbidden of [
    'id',
    'global_license',
    'billing_cycle',
    'payment_transaction',
    'snapshot',
  ])
    assert.equal(forbidden in publicResult, false);
  await assert.rejects(operation.prepare(100027, { ...input, base_price_usd: 1 }), /Unsupported/);
  console.log(
    'PASS selection, monthly reference/provisional fallback, minimum, canonical XAF, postpaid guard, immutable replay/conflict, snapshot rollback, activation duration and GUID-only response. Mock SQL; no PostgreSQL/full build/KPay executed.',
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
