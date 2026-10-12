'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { stripTypeScriptTypes } = require('node:module');
const root = path.join(__dirname, '..'),
  compile = (s) => stripTypeScriptTypes(s, { mode: 'transform' });
const reconcile = new Function(
  compile(
    fs.readFileSync(path.join(root, 'patches/reconcileMonthlyAccess.ts.txt'), 'utf8'),
  ).replace(/export /g, '') + ';return reconcileMonthlyAccess;',
)();
(async () => {
  let changed = [],
    decisions = [];
  const state = [
    { id: 1, license_status: 'PENDING_PAYMENT' },
    { id: 2, license_status: 'EXPIRED' },
    { id: 3, license_status: 'ACTIVE' },
    { id: 4, license_status: 'ACTIVE' },
    { id: 5, license_status: 'SUSPENDED' },
  ];
  const db = {
    transaction: (fn) => fn({}),
    query: async (sql, options) => {
      if (sql.includes('SELECT gl.id')) return [state];
      if (sql.includes('SELECT * FROM monthly_license_access')) {
        decisions.push(options.replacements.id);
        return [[{ allowed: options.replacements.id === 4, basis: 'PAYMENT_REQUIRED' }]];
      }
      if (sql.startsWith('UPDATE ')) {
        changed.push(options.replacements);
        return [[]];
      }
      if (sql.startsWith('INSERT ')) return [[]];
      throw Error('Unexpected SQL');
    },
  };
  assert.equal(await reconcile(db), 1);
  assert.deepEqual(decisions, [3, 4]);
  assert.deepEqual(
    changed.map((c) => c.id),
    [3],
  );
  assert.equal(changed[0].status, 'EXPIRED');
  let code = compile(
    fs.readFileSync(
      path.join(root, 'master/database/base_model/db.initial-expiry-repair.ts'),
      'utf8',
    ),
  )
    .replace(/^import .*;$/gm, '')
    .replace(/export default /g, '')
    .replace(/export /g, '');
  const Repair = new Function('TableInitializer', code + ';return InitialExpiryRepairDb;')({});
  function fake(options = {}) {
    let staged = [],
      committed = [],
      rolledBack = false;
    const d = {
      transaction: async (fn) => {
        try {
          const result = await fn({});
          committed = [...staged];
          return result;
        } catch (e) {
          staged = [];
          rolledBack = true;
          throw e;
        }
      },
      query: async (sql, args) => {
        if (sql.includes('SELECT l.*,t.guid'))
          return [
            [
              {
                id: 30,
                tenant: 21,
                tenant_guid: 100021,
                license_status: options.status ?? 'EXPIRED',
                billing_mode: 'PREPAID',
              },
            ],
          ];
        if (sql.includes('SELECT guid,metadata'))
          return [
            options.prior
              ? [{ guid: 100201, metadata: { action: 'INITIAL_PENDING_EXPIRY_REPAIR' } }]
              : [],
          ];
        if (sql.includes('ORDER BY id DESC LIMIT 1'))
          return [
            [
              {
                id: 2,
                previous_status: options.badHistory ? 'ACTIVE' : 'PENDING_PAYMENT',
                new_status: 'EXPIRED',
                reason: 'PAYMENT_REQUIRED',
              },
            ],
          ];
        if (sql.includes('UNION ALL')) return [options.rights ? [{ id: 2 }] : []];
        if (sql.includes('SELECT p.id')) return [options.funds ? [{ id: 5 }] : []];
        if (sql.includes('TECHNICAL_RESTRICTION_RELEASE')) return [[]];
        if (sql.includes('SELECT guid FROM public.xa_billing_cycle')) return [[{ guid: 100014 }]];
        if (sql.startsWith('UPDATE ')) {
          staged.push('UPDATE');
          return [[]];
        }
        if (sql.startsWith('INSERT ')) {
          if (options.failAudit) throw Error('audit failure');
          staged.push('EVENT');
          return [[{ guid: 100201 }]];
        }
        throw Error('Unexpected query');
      },
    };
    return {
      d,
      get committed() {
        return committed;
      },
      get rolledBack() {
        return rolledBack;
      },
    };
  }
  let f = fake();
  const preview = await new Repair(f.d).repair(100026, true, 'FIX_1');
  assert.equal(preview.new_status, 'PENDING_PAYMENT');
  assert.equal(preview.access_granted, false);
  assert.deepEqual(f.committed, []);
  f = fake();
  const result = await new Repair(f.d).repair(100026, false, 'FIX_1');
  assert.equal(result.event_guid, 100201);
  assert.deepEqual(f.committed, ['UPDATE', 'EVENT']);
  for (const options of [
    { rights: true },
    { funds: true },
    { badHistory: true },
    { status: 'ACTIVE' },
    { failAudit: true },
  ]) {
    f = fake(options);
    await assert.rejects(() => new Repair(f.d).repair(100026, false, 'FIX_1'));
    assert.equal(f.rolledBack, true);
    assert.deepEqual(f.committed, []);
  }
  f = fake({ prior: true, status: 'PENDING_PAYMENT' });
  assert.equal((await new Repair(f.d).repair(100026, false, 'FIX_1')).replayed, true);
  assert.deepEqual(f.committed, []);
  console.log(
    'PASS pending ignored, active transitions, preview, audited repair, replay, eligibility guards and rollback mock. PostgreSQL/build not exercised.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
