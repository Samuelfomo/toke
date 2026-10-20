'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..'),
  read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const strip = (s) =>
  stripTypeScriptTypes(s, { mode: 'transform' }).replace(
    /^import[\s\S]*?from ['"][^'"]+['"];?$/gm,
    '',
  );
const helpers = [
  'payable-amount.ts',
  'renewal-amounts.ts',
  'monthly-usage.ts',
  'activity-monitoring-input.ts',
]
  .map((p) => strip(read('verification/dependencies/' + p)).replace(/export /g, ''))
  .join('\n');
const prefix = `const Transaction={ISOLATION_LEVELS:{REPEATABLE_READ:'REPEATABLE READ'}};
 const TableInitializer={getModel(){return {sequelize:globalThis.__db}}};
 class ActivityMonitoringDb {async monthlyUsage(license,start,end,tx){if(tx!==globalThis.__tx)throw Error('Nested transaction');return {period_closed:globalThis.__state.closed,employees:Array.from({length:globalThis.__state.employees},(_,n)=>({employee_license_guid:100001+n,active_days:1}))}}}
 async function loadRenewalPricingConfiguration(){return {currency:'XAF',rate:'610.5',taxes:[{guid:100001,tax_name:'TVA',tax_type:'VAT',tax_rate:'0.1925'}]}}
 class LicenseAdjustmentModel {loadMonthlyAdjustmentPreview(i){return new AdjustmentPreviewDb().load(i)} issueMonthlyData(i,calculate){return new AdjustmentIssuanceDb().issue(i,calculate)}}
 const PaymentTransactionStatus={},TimezoneConfigUtils={},W={},G={},Revision={},RS={},responseValue={},tableName={};\n`;
let state,
  sequence = 1;
const tx = {};
globalThis.__tx = tx;
function reset() {
  state = {
    employees: 13,
    closed: true,
    offered: false,
    partial: false,
    base: true,
    failEvent: false,
    serialize: false,
    price: '3.00',
    a: [],
    p: [],
    events: [],
    grantsCreated: 0,
  };
  globalThis.__state = state;
}
const db = {
  async transaction(o, f) {
    const before = structuredClone(state);
    try {
      return await f(tx);
    } catch (e) {
      state = before;
      globalThis.__state = state;
      throw e;
    }
  },
  async query(sql, o) {
    assert.strictEqual(o.transaction, tx);
    const v = o.replacements;
    if (sql.startsWith('SET TRANSACTION READ ONLY'))
      throw Error('Issuance must not start a nested read-only transaction');
    if (sql.startsWith('SELECT l.id,l.tenant')) {
      if (state.serialize) throw { original: { code: '40001' } };
      return [[{ id: 27, tenant: 22, cycle_id: 14, timezone: 'Africa/Douala' }]];
    }
    if (sql.startsWith('SELECT e.guid')) {
      const e = state.events.find((e) => e.key === v.key);
      if (!e) return [[]];
      const a = state.a.find((a) => a.guid === e.payload.adjustment_guid),
        p = state.p.find((p) => p.guid === e.payload.payment_transaction_guid);
      return [
        [
          {
            ...e,
            event_guid: e.guid,
            actor_user_guid: e.actor,
            metadata: e.metadata,
            issued_at: e.issued,
            adjustment_guid: a.guid,
            payment_transaction_guid: p.guid,
            payment_due_date: a.due,
            payment_status: a.status,
            transaction_status: p.status,
          },
        ],
      ];
    }
    if (sql.startsWith('SELECT guid FROM public.xa_license_event')) return [[]];
    if (sql.startsWith('SELECT c.*,l.minimum_seats'))
      return [
        [
          {
            id: 14,
            global_license: 27,
            tenant: 22,
            minimum_seats: 5,
            base_price_usd: state.price,
            billing_mode: 'PREPAID',
            license_billing_mode: 'PREPAID',
            period_start: '2026-08-08T23:00:00.000Z',
            period_end: '2026-11-08T23:00:00.000Z',
            timezone: 'Africa/Douala',
          },
        ],
      ];
    if (sql.includes('AS month_index')) return [[{ valid: true }]];
    if (sql.startsWith('SELECT g.seats'))
      return [
        [
          ...(state.base
            ? [
                {
                  seats: 10,
                  source_type: 'CYCLE',
                  valid_from: '2026-08-08T23:00:00.000Z',
                  valid_until: '2026-11-08T23:00:00.000Z',
                },
              ]
            : []),
          ...(state.partial
            ? [
                {
                  seats: 2,
                  source_type: 'ADJUSTMENT',
                  valid_from: '2026-09-15T00:00:00+01:00',
                  valid_until: '2026-11-08T23:00:00.000Z',
                },
              ]
            : []),
        ],
      ];
    if (sql.includes('AS offered')) return [[{ offered: state.offered }]];
    if (sql.startsWith('SELECT guid FROM public.xa_license_adjustment'))
      return [state.a.map((a) => ({ guid: a.guid }))];
    if (sql.startsWith('SELECT * FROM public.xa_payment_method'))
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
    if (sql.startsWith('SELECT CURRENT_TIMESTAMP AS issued_at'))
      return [[{ issued_at: '2026-10-20T15:00:00.000Z', due: '2026-10-27T15:00:00.000Z' }]];
    if (sql.startsWith('SELECT nextval(pg_get_serial_sequence')) return [[{ id: sequence++ }]];
    if (sql.startsWith('SELECT id FROM public.xa_license_adjustment')) return [[]];
    if (sql.startsWith("SELECT nextval('public.xa_renewal_payment_guid_seq')"))
      return [[{ guid: 100200 + sequence++ }]];
    if (sql.startsWith('SELECT id FROM public.xa_payment_transaction')) return [[]];
    if (sql.startsWith('INSERT INTO public.xa_license_adjustment')) {
      state.a.push({ ...v, status: 'PENDING' });
      return [[{ id: v.id, guid: v.guid, payment_status: 'PENDING' }]];
    }
    if (sql.startsWith('INSERT INTO public.xa_payment_transaction')) {
      state.p.push({ ...v, guid: v.payment, status: 'PENDING' });
      return [[{ guid: v.payment, transaction_status: 'PENDING' }]];
    }
    if (sql.startsWith('INSERT INTO public.xa_license_event')) {
      if (state.failEvent) throw Error('Audit insert failed');
      const e = {
        guid: 100600 + sequence++,
        key: v.key,
        actor: v.actor,
        metadata: JSON.parse(v.metadata),
        payload: JSON.parse(v.payload),
        issued: v.issued,
      };
      state.events.push(e);
      return [[{ guid: e.guid }]];
    }
    if (sql.includes('INSERT INTO public.xa_paid_seat_grant')) {
      state.grantsCreated++;
      throw Error('Consumed month must not create rights');
    }
    throw Error('Unexpected SQL ' + sql.slice(0, 100));
  },
};
globalThis.__db = db;
(async () => {
  const preview = strip(read('src/master/database/base_model/db.adjustment-preview.ts')).replace(
    'export default class AdjustmentPreviewDb',
    'class AdjustmentPreviewDb',
  );
  const issuance = strip(read('src/master/database/base_model/db.adjustment-issuance.ts')).replace(
    'export default class AdjustmentIssuanceDb',
    'class AdjustmentIssuanceDb',
  );
  const source =
    prefix + helpers + preview + issuance + strip(read('src/master/class/LicenseAdjustment.ts'));
  const { default: Adjustment } = await import(
    'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
  );
  const body = {
    tenant_guid: 100022,
    billing_cycle_guid: 100014,
    period_start: '2026-09-09T00:00:00+01:00',
    period_end: '2026-10-09T00:00:00+01:00',
    payment_method_guid: 100002,
    actor_user_guid: '7173056141612204',
    idempotency_key: 'REG_2026_09_V1',
    coverage_reference: 'SYNC_REVIEW_2026_09',
  };
  reset();
  const a = await Adjustment.issueMonthly(100027, body);
  assert.equal(a.total_amount_local, '6552.00');
  assert.equal(a.surplus_seats, 3);
  assert.equal(a.future_rights_created, false);
  assert.equal(a.replayed, false);
  assert.equal(state.a.length, 1);
  assert.equal(state.p.length, 1);
  assert.equal(state.events.length, 1);
  assert.equal(state.grantsCreated, 0);
  assert.equal(state.events[0].metadata.snapshot.employees.length, 13);
  assert.equal(state.events[0].metadata.snapshot.data_completeness, 'ADMIN_ATTESTED');
  assert.equal(state.p[0].adjustment, state.a[0].id);
  assert.equal(a.payment_due_date, '2026-10-27T15:00:00.000Z');
  for (const field of ['id', 'snapshot', 'metadata', 'actor_user_guid', 'employees'])
    assert.equal(field in a, false);
  state.employees = 19;
  state.price = '9.00';
  const replay = await Adjustment.issueMonthly(100027, body);
  assert.equal(replay.total_amount_local, '6552.00');
  assert.equal(replay.replayed, true);
  assert.equal(state.a.length, 1);
  state.p[0].status = 'COMPLETED';
  state.a[0].status = 'COMPLETED';
  assert.equal((await Adjustment.issueMonthly(100027, body)).transaction_status, 'COMPLETED');
  await assert.rejects(
    Adjustment.issueMonthly(100027, { ...body, payment_method_guid: 100001 }),
    /conflicts/,
  );
  await assert.rejects(
    Adjustment.issueMonthly(100027, { ...body, idempotency_key: 'NEW_KEY_SAME_MONTH' }),
    /already exists/,
  );
  reset();
  state.failEvent = true;
  await assert.rejects(Adjustment.issueMonthly(100027, body), /Audit insert failed/);
  assert.equal(state.a.length, 0);
  assert.equal(state.p.length, 0);
  assert.equal(state.events.length, 0);
  for (const [field, value] of [
    ['closed', false],
    ['partial', true],
    ['offered', true],
    ['base', false],
    ['employees', 8],
  ]) {
    reset();
    state[field] = value;
    await assert.rejects(Adjustment.issueMonthly(100027, body));
    assert.equal(state.a.length, 0);
  }
  reset();
  state.serialize = true;
  await assert.rejects(Adjustment.issueMonthly(100027, body), /Concurrent issuance/);
  reset();
  await assert.rejects(
    Adjustment.issueMonthly(100027, { ...body, coverage_reference: '' }),
    /attestation/,
  );
  await assert.rejects(
    Adjustment.issueMonthly(100027, { ...body, total_amount_local: '1.00' }),
    /Unsupported/,
  );
  console.log(
    'PASS issuance, exact money, fixed due, immutable snapshot/replay, current statuses, key conflicts, atomic rollback, offered/open/partial/unpaid/zero-surplus refusals, serialization conflict, no future rights and public GUID projection. Mock database only; PostgreSQL migration/full build NOT executed.',
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
