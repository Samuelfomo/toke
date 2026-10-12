'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { stripTypeScriptTypes } = require('node:module');
const root = path.join(__dirname, '..'),
  compile = (s) => stripTypeScriptTypes(s, { mode: 'transform' });
const fragment = fs.readFileSync(path.join(root, 'patches/Tenant.members.ts.txt'), 'utf8');
const Entity = new Function(
  compile('class Tenant {getGuid(){return 100021;}' + fragment + '}\n') + ';return Tenant;',
)();
const entity = new Entity();
const payment = {
  pending_payment_count: 1,
  payment_transaction_guid: 100010,
  billing_cycle_guid: 100014,
  invoice_amount_local: '10920.32',
  received_local: '0.00',
  outstanding_local: '10920.32',
  method_type: 'CASH',
  method_available: true,
  payment_method_guid: 100002,
  transaction_status: 'PENDING',
  billing_status: 'PENDING',
  currency_code: 'XAF',
  id: 50,
};
let raw = {
  tenant: { id: 21, guid: 100021, status: 'ACTIVE' },
  licenses: [
    {
      id: 30,
      guid: 100026,
      minimum_seats: 5,
      paid_seats: 0,
      allowed: false,
      basis: 'NO_PAYMENT',
      payments: [payment],
    },
  ],
};
entity.licenseStatusData = async () => raw;
(async () => {
  let result = await entity.getLicenseStatus();
  assert.equal(result.licenses[0].payments[0].amount_to_pay_local, '10920.32');
  assert.equal(result.licenses[0].payments[0].can_confirm_cash, true);
  assert.equal(result.licenses[0].paid_seats, 0);
  assert(!JSON.stringify(result).includes('"id":'));
  payment.pending_payment_count = 2;
  result = await entity.getLicenseStatus();
  assert.equal(result.licenses[0].payments[0].can_confirm_cash, false);
  raw.tenant.status = 'SUSPENDED';
  raw.licenses[0].allowed = true;
  result = await entity.getLicenseStatus();
  assert.equal(result.licenses[0].access.allowed, false);
  payment.transaction_status = 'COMPLETED';
  payment.outstanding_local = '0.00';
  result = await entity.getLicenseStatus();
  assert.equal(result.licenses[0].payments[0].amount_to_pay_local, '0.00');
  assert.equal(result.licenses[0].payments[0].can_confirm_cash, false);
  const source = fs.readFileSync(
    path.join(root, 'master/database/base_model/db.tenant-license-status.ts'),
    'utf8',
  );
  compile(source);
  const js = compile(source)
    .replace(/^import .*;$/gm, '')
    .replace('export default ', '');
  const Db = new Function('Transaction', 'TableInitializer', js + ';return TenantLicenseStatusDb;')(
    { ISOLATION_LEVELS: { REPEATABLE_READ: 'REPEATABLE READ' } },
    {},
  );
  let statements = [];
  const fake = {
    transaction: async (options, fn) => {
      assert.equal(options.isolationLevel, 'REPEATABLE READ');
      return fn({});
    },
    query: async (sql) => {
      statements.push(sql);
      if (sql === 'SET TRANSACTION READ ONLY') return [[]];
      if (sql.includes('FROM public.xa_tenant')) return [[{ id: 21, guid: 100021 }]];
      if (sql.includes('FROM public.xa_global_license')) return [[{ id: 30, guid: 100026 }]];
      if (sql.includes('FROM public.xa_billing_cycle')) return [[payment]];
      throw Error('Unexpected SQL');
    },
  };
  const loaded = await new Db(fake).load(100021);
  assert.equal(loaded.licenses[0].payments.length, 1);
  assert.equal(statements[0], 'SET TRANSACTION READ ONLY');
  assert(!statements.some((sql) => /^INSERT|^UPDATE|^DELETE/.test(sql)));
  console.log(
    'PASS syntax, read-only snapshot, GUID projection, financial amounts, ambiguous payments and inactive tenant. Real PostgreSQL/build not exercised.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
