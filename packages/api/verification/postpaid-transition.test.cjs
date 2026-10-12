'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
async function load(file, replace = (s) => s) {
  const s = stripTypeScriptTypes(fs.readFileSync(file, 'utf8'), { mode: 'transform' });
  return import('data:text/javascript;base64,' + Buffer.from(replace(s)).toString('base64'));
}
(async () => {
  globalThis.__transition32 = {
    activity: await load(
      process.env.TOKE_ACTIVITY_INPUT_FILE ||
        path.resolve('src/master/class/activity-monitoring-input.ts'),
    ),
  };
  globalThis.__transition32.Model = class {
    constructor(data) {
      this.data = data;
    }
    applyData(i, d) {
      return this.data.apply(i, d);
    }
    eventData(t, l) {
      return this.data.events(t, l);
    }
  };
  globalThis.__transition32.closureText = (v, name) => {
    if (typeof v !== 'string' || !v.trim() || v.trim().length > 128) throw Error(name);
    return v.trim();
  };
  const business = await load(
    path.join(root, 'master/class/PostpaidTransition.ts'),
    (s) =>
      `const PostpaidTransitionModel=globalThis.__transition32.Model;const {activityGuid,activityDate}=globalThis.__transition32.activity;const {closureText}=globalThis.__transition32;\n` +
      s.replace(/^import .*?;\s*/gm, '').replace(/^export \{.*?\} from .*?;\s*/gm, ''),
  );
  const body = {
    tenant_guids: [100020, 100014, 100001, 100016, 100008, 100017],
    actor_user_guid: '7173056141612204',
    actor_tenant_guid: 100014,
    operation_key: 'POSTPAID-NOV-2026',
    effective_at: '2026-11-01T00:00:00+01:00',
    reason: 'Facturation sur activité réelle après le mois offert',
    exclude_legacy_unpaid_cycles: true,
    confirm: true,
  };
  const input = business.transitionInput(body);
  assert.equal(input.effectiveAt, '2026-10-31T23:00:00.000Z');
  assert.throws(
    () => business.transitionInput({ ...body, tenant_guids: [100001, 100001] }),
    /six authorized/,
  );
  assert.throws(
    () => business.transitionInput({ ...body, effective_at: '2026-11-01T00:00:00Z' }),
    /1 November/,
  );
  const data = await load(
    path.join(root, 'master/database/base_model/db.postpaid-transition.ts'),
    (s) => s.replace(/^import .*?;\s*/gm, ''),
  );
  function fake({ failTenant = null, legacy = false, issued = false, replay = false } = {}) {
    return {
      writes: [],
      tenants: [],
      committed: false,
      rolledBack: false,
      async transaction(fn) {
        try {
          const r = await fn({});
          this.committed = true;
          return r;
        } catch (e) {
          this.rolledBack = true;
          throw e;
        }
      },
      async query(sql, { replacements: r, transaction }) {
        assert(transaction);
        let out = [];
        if (sql.includes('WHERE t.guid=:tenant ORDER BY l.id')) {
          this.tenants.push(r.tenant);
          if (r.tenant === failTenant) throw Error('Simulated tenant failure');
          out = [
            {
              id: r.tenant,
              guid: r.tenant,
              tenant: r.tenant,
              tenant_guid: r.tenant,
              billing_mode: 'PREPAID',
              billing_cycle_months: 1,
              minimum_seats: 5,
              license_status: 'ACTIVE',
              current_period_end: input.effectiveAt,
              next_renewal_date: input.effectiveAt,
            },
          ];
        } else if (sql.includes("event_type='BILLING_MODE_CHANGED' AND operation_key"))
          out = replay
            ? [
                {
                  guid: 100555,
                  actor_user_guid: input.actor,
                  effective_at: input.effectiveAt,
                  reason: input.reason,
                  metadata: {
                    actor_tenant_guid: input.actorTenant,
                    exclude_legacy_unpaid_cycles: true,
                  },
                },
              ]
            : [];
        else if (sql.startsWith('SELECT grace_days')) out = [{ grace_days: 7 }];
        else if (sql.startsWith('SELECT valid_from'))
          out = [{ valid_from: '2026-09-30T23:00:00Z', valid_until: input.effectiveAt }];
        else if (sql.startsWith('SELECT CAST(:at')) out = [{ valid: true }];
        else if (sql.startsWith('SELECT * FROM public.xa_billing_cycle'))
          out = legacy
            ? [
                {
                  id: 1,
                  guid: 100500,
                  billing_mode: 'PREPAID',
                  billing_status: 'PENDING',
                  invoice_generated_at: issued ? '2026-01-01' : null,
                },
              ]
            : [];
        else if (sql.startsWith('INSERT INTO public.xa_license_event')) {
          this.writes.push({ sql, r });
          out = [{ guid: 100600 + this.writes.length }];
        } else if (sql.startsWith('UPDATE')) {
          this.writes.push({ sql, r });
          out = [{ id: r.id }];
        }
        return [out, {}];
      },
    };
  }
  const preview = fake({ legacy: true });
  const pv = await new data.default(preview).apply(input, true);
  assert.equal(pv.length, 6);
  assert.equal(preview.writes.length, 0);
  assert.deepEqual(pv[0].excluded_cycle_guids, [100500]);
  const db = fake({ legacy: true });
  const applied = await new data.default(db).apply(input, false);
  assert(db.committed);
  assert.equal(applied.length, 6);
  assert.deepEqual(
    db.tenants,
    [...input.tenants].sort((a, b) => a - b),
  );
  assert.equal(db.writes.filter((w) => w.sql.includes("'BILLING_MODE_CHANGED'")).length, 6);
  assert.equal(db.writes.filter((w) => w.sql.includes("'LEGACY_CYCLE_EXCLUDED'")).length, 6);
  assert(
    db.writes
      .filter((w) => w.sql.includes('UPDATE public.xa_global_license'))
      .every((w) => !w.sql.includes('current_period_end') && !w.sql.includes('base_price_usd')),
  );
  const failed = fake({ failTenant: 100014 });
  await assert.rejects(new data.default(failed).apply(input, false), /Simulated/);
  assert(failed.rolledBack);
  assert(!failed.committed);
  await assert.rejects(
    new data.default(fake({ legacy: true, issued: true })).apply(input, false),
    /not an unpaid legacy candidate/,
  );
  const rp = fake({ replay: true });
  assert((await new data.default(rp).apply(input, false)).every((r) => r.replayed));
  assert.equal(rp.writes.length, 0);
  const projected = business.publicLicenseEvent({
    guid: 100555,
    tenant_guid: 100014,
    license_guid: 100020,
    previous_payload: { billing_mode: 'PREPAID', id: 1 },
    new_payload: { billing_mode: 'POSTPAID', global_license: 2 },
    metadata: { actor_tenant_guid: 100014, id: 9, secret: 'hidden' },
  });
  assert(!JSON.stringify(projected).includes('hidden'));
  assert(!('id' in projected.previous_payload));
  assert(!('global_license' in projected.new_payload));
  assert(!('id' in projected.metadata));
  const app = new business.default({
    apply() {
      throw Error('Should not persist');
    },
  });
  await assert.rejects(app.apply({ ...body, confirm: false }, false), /confirm/);
  for (const file of [
    'master/model/PostpaidTransitionModel.ts',
    'master/routes/postpaid.transition.route.ts',
    'master/database/data/license.event.db.ts',
  ])
    stripTypeScriptTypes(fs.readFileSync(path.join(root, file), 'utf8'), { mode: 'transform' });
  const migration = require(path.join(root, 'migrations/20261007100000-license-events.cjs'));
  let sql = '';
  await migration.up({
    sequelize: {
      transaction: (fn) => fn({}),
      query: async (s) => {
        sql = s;
      },
    },
  });
  assert(sql.includes('UNIQUE(global_license,event_type,operation_key)'));
  assert(sql.includes("actor_type='SYSTEM' AND actor_user_guid IS NULL"));
  assert(sql.includes('BEFORE UPDATE OR DELETE'));
  assert(sql.includes('BEFORE TRUNCATE'));
  assert(sql.includes('occurred_at'));
  assert(sql.includes('effective_at'));
  console.log(
    'PASS: UTC boundary, six-tenant scope, dry run, atomic callback failure, deterministic locks, explicit legacy exclusion, issued invoice refusal, replay, GUID projection, actor/idempotence/immutability schema checks. No PostgreSQL execution or full project build.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
