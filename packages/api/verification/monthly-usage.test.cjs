'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '../src');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const load = (s) =>
  import(
    'data:text/javascript;base64,' +
      Buffer.from(stripTypeScriptTypes(s, { mode: 'transform' })).toString('base64')
  );
const noImports = (s) => s.replace(/^import .*;\n/gm, '');
(async () => {
  const common = read('master/services/monthly-usage.ts');
  const { monthlySeatCount } = await load(common);
  const employee = (guid, days, extra = {}) => ({
    employee_license_guid: guid,
    active_days: days,
    ...extra,
  });
  const usage = [
    employee(100001, 1),
    employee(100002, 18),
    employee(100003, 0),
    employee(100004, 2, { contractual_status: 'TERMINATED' }),
    employee(100005, 1, { declared_long_leave: true }),
  ];
  assert.deepEqual(monthlySeatCount(5, usage), { count: 4, seats: 5 });
  assert.deepEqual(monthlySeatCount(5, []), { count: 0, seats: 5 });
  assert.deepEqual(
    monthlySeatCount(
      5,
      Array.from({ length: 8 }, (_, i) => employee(100001 + i, 1)),
    ),
    { count: 8, seats: 8 },
  );
  assert.throws(() => monthlySeatCount(5, [employee(100001, 1), employee(100001, 2)]));
  assert.throws(() => monthlySeatCount(5, [employee(100001, -1)]));
  const summary = await load(
    common.replace(/export /g, '') + noImports(read('master/class/activity-monitoring-input.ts')),
  );
  const result = summary.summarizeMonthlyMonitoring({ minimum_seats: 5, employees: usage });
  assert.equal(result.billable_employees, 4);
  assert.equal(result.billed_seats, 5);
  assert.equal(result.employees[3].billing_status, 'BILLABLE');
  assert.equal(result.employees[4].billing_status, 'BILLABLE');
  assert.equal(result.period_boundary, '[start,end)');
  // Check the actual postpaid calculation delegates to the same monthly rule.
  const closure = await load(
    common.replace(/export /g, '') +
      'const TableInitializer={}; const Transaction={}; function decimalUnits(v){return BigInt(Math.round(Number(v)*100))} function centsText(v){return String(v)} function renewalAmounts(subtotal){return {subtotal}}; class ActivityMonitoringDb {}\n' +
      noImports(read('master/database/base_model/db.postpaid-closure.ts')),
  );
  const closed = closure.closureAmounts('3.00', 5, usage, '610.5', []);
  assert.equal(closed.count, result.billable_employees);
  assert.equal(closed.seats, result.billed_seats);
  assert.throws(() =>
    closure.closureAmounts('3.00', 5, [employee(100001, 1), employee(100001, 1)], '610.5', []),
  );
  function syntax(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, item.name);
      if (item.isDirectory()) syntax(p);
      else if (p.endsWith('.ts'))
        stripTypeScriptTypes(fs.readFileSync(p, 'utf8'), { mode: 'transform' });
    }
  }
  syntax(path.join(root, 'master'));
  console.log(
    'PASS: monthly count, minimum, leave/terminated historical usage, duplicates, shared summary and postpaid integration, TS syntax. PostgreSQL and full project build NOT executed.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
