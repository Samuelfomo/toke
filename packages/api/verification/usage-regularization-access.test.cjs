'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../src');
const migration = require('../migrations/20261020190000-usage-regularization-access.cjs');
const sql = [];
const q = {
  sequelize: {
    transaction: async (fn) => fn({}),
    query: async (query) => {
      sql.push(query);
      return [[]];
    },
  },
};
(async () => {
  await migration.up(q);
  const definition = sql.join('\n');
  assert.match(definition, /payment_due_date<=p_at/);
  assert.match(definition, /USAGE_REGULARIZATION_OVERDUE/);
  assert.match(definition, /monthly_license_access_before_426/);
  assert.match(definition, /TECHNICAL_RESTRICTION/);
  assert.match(
    definition,
    /payment_status::text<>'COMPLETED' OR p.transaction_status::text<>'COMPLETED'/,
  );
  const forward = require('../migrations/20261020220000-usage-regularization-missing-transaction.cjs');
  await forward.up(q);
  assert.match(sql.at(-1), /NOT EXISTS \(SELECT 1 FROM public.xa_payment_transaction p/);
  const service = fs.readFileSync(
    path.join(root, 'master/services/usage-regularization-access.ts'),
    'utf8',
  );
  const dbd = fs.readFileSync(
    path.join(root, 'master/database/base_model/db.usage-regularization-access.ts'),
    'utf8',
  );
  assert.match(
    dbd,
    /license_status === 'EXPIRED' && access.allowed === true && ownsCurrentExpiredStatus/,
  );
  assert.match(dbd, /USAGE_REGULARIZATION_ACCESS_RESTORE/);
  assert.match(dbd, /xa_license_event/);
  const job = fs.readFileSync(
    path.join(root, 'master/jobs/scheduled-license-activation.ts'),
    'utf8',
  );
  assert.ok(
    job.indexOf('await reconcileUsageRegularizationAccess(db)') <
      job.indexOf('await reconcileMonthlyAccess(db)'),
  );
  const cash = fs.readFileSync(
    path.join(root, 'master/database/base_model/db.cash-confirmation.ts'),
    'utf8',
  );
  assert.match(cash, /await reconcileUsageRegularizationLicense\(db, license.id, transaction\)/);
  console.log('Lot 42.6 structural and migration contract checks: OK');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
