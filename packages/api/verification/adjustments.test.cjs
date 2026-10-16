'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const strip = (s) =>
  stripTypeScriptTypes(s, { mode: 'transform' }).replace(
    /^import[\s\S]*?from ['"][^'"]+['"];?$/gm,
    '',
  );
const load = (s) => import('data:text/javascript;base64,' + Buffer.from(s).toString('base64'));
const helpers = [
  'payable-amount.ts',
  'renewal-amounts.ts',
  'monthly-usage.ts',
  'activity-monitoring-input.ts',
]
  .map((n) => strip(read('verification/dependencies/' + n)).replace(/export /g, ''))
  .join('\n');
let raw;
const modelStub = `class LicenseAdjustmentModel {async loadMonthlyAdjustmentPreview(){return globalThis.__adjustmentRaw;} async getBillingCycleGuid(){return this.billing_cycle ? 100014 : null;}}
 const PaymentTransactionStatus={PENDING:'PENDING',COMPLETED:'COMPLETED'};const TimezoneConfigUtils={};const W={},G={},Revision={};
 const RS=new Proxy({}, {get:(o,k)=>String(k).toLowerCase()}); const responseValue={FULL:'FULL',MINIMAL:'MINIMAL'};const tableName={};\n`;
const fresh = () => ({
  minimum_seats: 5,
  unit_price_usd: '3.00',
  currency: 'XAF',
  rate: '610.5',
  taxes: [{ tax_rate: '0.1925' }],
  employees: Array.from({ length: 15 }, (_, i) => ({
    employee_license_guid: 100001 + i,
    active_days: i < 2 ? 0 : 1,
  })),
  full_period_capacity: 10,
  period_closed: true,
  base_paid: true,
  coverage_requires_review: false,
  offered: false,
  existing_adjustment_guid: null,
});
const query = {
  tenant_guid: 100022,
  billing_cycle_guid: 100014,
  period_start: '2026-09-09T00:00:00+01:00',
  period_end: '2026-10-09T00:00:00+01:00',
};
(async () => {
  const { default: Adjustment } = await load(
    modelStub + helpers + strip(read('src/master/class/LicenseAdjustment.ts')),
  );
  raw = fresh();
  globalThis.__adjustmentRaw = raw;
  let p = await Adjustment.previewMonthly(100027, query);
  assert.equal(p.billable_employees, 13);
  assert.equal(p.surplus_seats, 3);
  assert.equal(p.total_amount_local, '6552.00');
  assert.equal(p.creates_debt, false);
  assert.equal(p.can_issue, false);
  assert.equal(p.payment_due_date, null);
  raw.coverage_requires_review = true;
  p = await Adjustment.previewMonthly(100027, query);
  assert.equal(p.total_amount_local, null);
  assert.equal(p.calculation_available, false);
  raw.coverage_requires_review = false;
  raw.offered = true;
  p = await Adjustment.previewMonthly(100027, query);
  assert.equal(p.surplus_seats, 0);
  assert.equal(p.total_amount_local, null);
  raw.offered = false;
  raw.existing_adjustment_guid = 100500;
  p = await Adjustment.previewMonthly(100027, query);
  assert.equal(p.existing_adjustment_guid, 100500);
  assert.equal(p.total_amount_local, null);
  raw.existing_adjustment_guid = null;
  raw.period_closed = false;
  p = await Adjustment.previewMonthly(100027, query);
  assert.equal(p.calculation_available, false);
  raw.period_closed = true;
  raw.employees = [];
  p = await Adjustment.previewMonthly(100027, query);
  assert.equal(p.requires_regularization, false);
  assert.equal(p.surplus_seats, 0);
  const e = Adjustment._toObject({
    id: 55,
    guid: 100500,
    global_license: 27,
    billing_cycle: 14,
    adjustment_kind: 'USAGE_REGULARIZATION',
    period_start: query.period_start,
    period_end: query.period_end,
    payment_due_date: '2026-10-16T00:00:00+01:00',
  });
  e.getGlobalLicenseObject = async () => ({
    getGuid: () => 100027,
    toJSON: async () => ({ guid: 100027 }),
  });
  const json = await e.toJSON('MINIMAL');
  assert.equal(json.billing_cycle_guid, 100014);
  assert.equal(json.adjustment_kind, 'USAGE_REGULARIZATION');
  assert.equal(json.global_license, 100027);
  assert.equal('id' in json, false);
  assert.equal('billing_cycle' in json, false);
  assert.ok(e.getPeriodStart() instanceof Date);
  assert.equal(e.getBillingCycle(), 14);
  assert.throws(() => e.setAdjustmentKind('INVALID'));
  assert.throws(() => e.setPaymentDueDate(new Date('invalid')));
  const legacy = Adjustment._toObject({ guid: 100001 });
  assert.equal(legacy.getAdjustmentKind(), 'LEGACY');
  assert.equal(legacy.getPaymentDueDate(), null);
  // DBD mock : scoping, no writes, incomplete coverage fails closed; SQL itself is not executed.
  const dbPrefix = `const Transaction={ISOLATION_LEVELS:{REPEATABLE_READ:'REPEATABLE READ'}};const TableInitializer={};
 class ActivityMonitoringDb {async monthlyUsage(g,start,end,tx,window){globalThis.__window=window;return {employees:[],period_closed:true}}}
 async function loadRenewalPricingConfiguration(){return {currency:'XAF',rate:'610.5',taxes:[]}}\n`;
  const { default: Db } = await load(
    dbPrefix + strip(read('src/master/database/base_model/db.adjustment-preview.ts')),
  );
  let cycle = {
    id: 14,
    global_license: 27,
    billing_mode: 'PREPAID',
    license_billing_mode: 'PREPAID',
    tenant: 22,
    minimum_seats: 5,
    base_price_usd: '3.00',
    period_start: '2026-08-08T23:00:00.000Z',
    period_end: '2026-11-08T23:00:00.000Z',
    timezone: 'Africa/Douala',
  };
  let grants = [
      {
        seats: 10,
        source_type: 'CYCLE',
        valid_from: cycle.period_start,
        valid_until: cycle.period_end,
      },
    ],
    writes = 0;
  const db = {
    transaction: async (o, f) => f({}),
    query: async (sql, o) => {
      if (/^(INSERT|UPDATE|DELETE)/.test(sql)) {
        writes++;
        throw Error('Read-only preview wrote data');
      }
      if (sql === 'SET TRANSACTION READ ONLY') return [[]];
      if (sql.includes('SELECT c.*,l.minimum_seats')) {
        assert.equal(o.replacements.tenant, 100022);
        return [cycle ? [cycle] : []];
      }
      if (sql.includes('AS month_index')) return [[{ valid: true }]];
      if (sql.includes('SELECT g.seats')) return [grants];
      if (sql.includes('AS offered')) return [[{ offered: false }]];
      if (sql.includes('SELECT guid FROM')) return [[]];
      throw Error('Unexpected query');
    },
  };
  const input = {
    tenant: 100022,
    license: 100027,
    cycle: 100014,
    start: new Date(query.period_start).toISOString(),
    end: new Date(query.period_end).toISOString(),
  };
  let d = await new Db(db).load(input);
  assert.equal(d.full_period_capacity, 10);
  assert.equal(d.base_paid, true);
  assert.equal(d.coverage_requires_review, false);
  assert.equal(globalThis.__window.anchor, cycle.period_start);
  grants.push({
    seats: 5,
    source_type: 'ADJUSTMENT',
    valid_from: '2026-09-15T00:00:00+01:00',
    valid_until: cycle.period_end,
  });
  d = await new Db(db).load(input);
  assert.equal(d.coverage_requires_review, true);
  assert.equal(d.full_period_capacity, 10);
  assert.equal(writes, 0);
  cycle.license_billing_mode = 'POSTPAID';
  await assert.rejects(new Db(db).load(input), /prepaid/);
  cycle = null;
  await assert.rejects(new Db(db).load(input), /prepaid/);
  console.log(
    'PASS: surplus count, canonical XAF, partial/free/open/already-issued guards, hydration/getters/GUID-only JSON, scoped read-only DBD and historical anchor. PostgreSQL/full build not executed.',
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
