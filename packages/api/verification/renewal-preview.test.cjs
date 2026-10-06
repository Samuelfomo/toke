'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { stripTypeScriptTypes } = require('node:module');
(async () => {
  const src = fs.readFileSync(
    require('node:path').join(__dirname, '../master/database/db.renewal-preview.ts'),
    'utf8',
  );
  const { renewalSubtotal, previewRenewal } = await import(
    'data:text/javascript;base64,' +
      Buffer.from(
        stripTypeScriptTypes(src).replace(
          "import { Transaction } from 'sequelize';",
          "const Transaction={ISOLATION_LEVELS:{REPEATABLE_READ:'REPEATABLE READ'}};",
        ),
      ).toString('base64')
  );
  assert.equal(renewalSubtotal('3.00', 5, 6), '90.00');
  assert.equal(renewalSubtotal('3', 8, 6), '144.00');
  assert.equal(renewalSubtotal('0.10', 7, 3), '2.10');
  assert.throws(() => renewalSubtotal('3', 5, 2));
  let count = 3,
    legacy = 0;
  const queries = [];
  const license = {
    id: 1,
    guid: 100001,
    license_status: 'ACTIVE',
    current_period_end: '2026-10-01T00:00:00Z',
    next_renewal_date: '2026-10-01T00:00:00Z',
    minimum_seats: 5,
    billing_cycle_months: 6,
    base_price_usd: '3.00',
  };
  const db = {
    transaction: async (options, cb) => {
      assert.equal(options.isolationLevel, 'REPEATABLE READ');
      return cb({});
    },
    query: async (sql, options) => {
      queries.push(sql);
      let result;
      if (sql.includes('FROM xa_global_license')) result = [license];
      else if (sql.includes('SELECT timezone FROM xa_tenant'))
        result = [{ timezone: 'Africa/Douala' }];
      else if (sql.includes('FROM pg_timezone_names')) {
        assert.equal(options.replacements.zone, 'Africa/Douala');
        result = [{ name: 'Africa/Douala' }];
      } else if (sql.includes('make_interval'))
        result = [{ period_start: license.current_period_end, period_end: '2027-04-01T00:00:00Z' }];
      else if (sql.includes('GROUP BY status')) {
        assert.equal(options.replacements.at, license.current_period_end);
        result = [
          { status: 'BILLABLE', count: String(count) },
          { status: 'NON_BILLABLE', count: '2' },
        ];
      } else result = [{ count: String(legacy) }];
      return [result, {}];
    },
  };
  const first = await previewRenewal(db, 100001);
  assert.equal(first.billed_seats, 5);
  assert.equal(first.calendar_timezone, 'Africa/Douala');
  count = 8;
  legacy = 1;
  const p = await previewRenewal(db, 100001);
  assert.equal(p.subtotal_usd, '144.00');
  assert.equal(p.reconciliation_required, true);
  license.next_renewal_date = '2026-10-02T00:00:00Z';
  await assert.rejects(() => previewRenewal(db, 100001), /reconciliation/);
  assert.ok(queries.every((q) => q.trim().startsWith('SELECT')));
  console.log(
    'PASS: minimum seats, exact subtotal, date of renewal, snapshot, undated-leave warning and no writes; SQL mocked.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
