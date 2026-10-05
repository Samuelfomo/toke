const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
let src = fs.readFileSync(path.join(root, 'master/class/LicenseRecords.ts'), 'utf8');
src = src
  .replace(/^import .*;$/gm, '')
  .replace(/export default class /g, 'class ')
  .replace(/export /g, '');
const context = { LicenseRecordsModel: class {}, console };
vm.createContext(context);
vm.runInContext(
  stripTypeScriptTypes(src) + '\nglobalThis.api={cashSummary,publicGuid,LicenseRecords};',
  context,
);
const { cashSummary, publicGuid, LicenseRecords } = context.api;
const payment = {
  guid: 100001,
  amount_local: '100.00',
  currency_code: 'XAF',
  transaction_status: 'PENDING',
};
const row = (value, source = 'INSTALLMENT') => ({
  amount_local: value,
  currency_code: 'XAF',
  source,
});
const record = (cash, settlement = null) => ({ payment, cash, settlement });
assert.equal(cashSummary(record([])).cash_state, 'NOT_RECEIVED');
const partial = cashSummary(record([row('33.33'), row('33.33')]));
assert.equal(partial.cash_received_local, '66.66');
assert.equal(partial.cash_outstanding_local, '33.34');
assert.equal(partial.cash_state, 'PARTIALLY_RECEIVED');
const settled = cashSummary(
  record([row('33.33'), row('33.33'), row('33.34')], { amount_local: '100.00' }),
);
assert.equal(settled.cash_received_local, '100.00');
assert.equal(settled.cash_state, 'SETTLED');
assert.equal(settled.mutates_access, false);
assert.equal(cashSummary(record([row('100.00', 'FULL_RECEIPT')])).cash_state, 'SETTLED');
assert.equal(
  cashSummary(record([row('100.00', 'FULL_RECEIPT'), row('20.00')])).cash_state,
  'REVIEW_REQUIRED',
);
assert.equal(cashSummary(record([row('101.00')])).review_reason, 'CASH_EXCEEDS_AMOUNT_DUE');
assert.throws(() => cashSummary(record([{ ...row('1.00'), currency_code: 'USD' }])));
assert.equal(publicGuid('100014'), 100014);
assert.throws(() => publicGuid('100014 OR 1=1'));
(async () => {
  const business = new LicenseRecords();
  business.loadEvents = async (scope, limit, offset) => {
    assert.equal(scope.tenantGuid, 100014);
    assert.equal(scope.resourceGuid, 100020);
    assert.equal(limit, 3);
    assert.equal(offset, 0);
    return [{ a: 1 }, { a: 2 }, { a: 3 }];
  };
  const events = await business.events(100014, 100020, 2, 0);
  assert.equal(events.items.length, 2);
  assert.equal(events.has_more, true);
  assert.equal(events.complete_audit, false);
  await assert.rejects(() => business.events(100014, 100020, 101, 0));
  // Parse every shipped TS file; no complete project compiler is available here.
  for (const dir of ['class', 'database', 'model', 'routes'])
    for (const file of fs.readdirSync(path.join(root, 'master', dir))) {
      if (file.endsWith('.ts'))
        stripTypeScriptTypes(fs.readFileSync(path.join(root, 'master', dir, file), 'utf8'), {
          mode: 'transform',
        });
    }
  const db = fs.readFileSync(path.join(root, 'master/database/db.license-records.ts'), 'utf8');
  assert(
    !/\b(?:INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/i.test(db),
  );
  const route = fs.readFileSync(path.join(root, 'master/routes/license.records.route.ts'), 'utf8');
  assert(!route.includes('.query('));
  assert(!route.includes('SELECT '));
  console.log(
    'PASS: exact cash arithmetic, partial/full settlement, no certificate double count, mixed-source anomaly, currency consistency, validation, pagination and TS syntax.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
