'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '../src');
async function load(file, replace = (s) => s) {
  const s = stripTypeScriptTypes(fs.readFileSync(file, 'utf8'), { mode: 'transform' });
  return import('data:text/javascript;base64,' + Buffer.from(replace(s)).toString('base64'));
}
(async () => {
  const data = await load(
    path.join(root, 'master/database/base_model/db.license-release.ts'),
    (s) => s.replace(/^import .*?;\s*/gm, ''),
  );
  const input = {
    tenant: 100014,
    license: 100020,
    actor: '7173056141612204',
    actorTenant: 100014,
    key: 'RELEASE-100020-001',
    reason: 'Incident technique résolu après contrôle',
  };
  function fake({ financial = true, status = 'SUSPENDED', fail = false, prior = null } = {}) {
    return {
      status,
      writes: [],
      committed: false,
      rolledBack: false,
      async transaction(fn) {
        const before = this.status;
        try {
          const r = await fn({});
          this.committed = true;
          return r;
        } catch (e) {
          this.status = before;
          this.rolledBack = true;
          throw e;
        }
      },
      async query(sql, { replacements: r, transaction }) {
        assert(transaction);
        let out = [];
        if (sql.includes('FOR UPDATE OF l'))
          out = [
            {
              id: 20,
              tenant: 14,
              license_status: this.status,
              billing_cycle_months: 1,
              tenant_status: 'ACTIVE',
            },
          ];
        else if (sql.startsWith('SELECT guid,actor_user_guid')) out = prior ? [prior] : [];
        else if (sql.startsWith('SELECT grace_days')) out = [{ grace_days: 7 }];
        else if (sql.startsWith('SELECT * FROM public.monthly_license_access'))
          out = [
            {
              allowed: ['ACTIVE', 'EXPIRED'].includes(this.status) && financial,
              basis: ['BLOCKED', 'SUSPENDED'].includes(this.status)
                ? 'TECHNICAL_RESTRICTION'
                : financial
                  ? 'POSTPAID_CONTRACT'
                  : 'POSTPAID_ARREARS',
              access_until: '2026-12-08',
            },
          ];
        else if (sql.startsWith('UPDATE')) {
          this.status = sql.includes("license_status='ACTIVE'") ? 'ACTIVE' : 'EXPIRED';
          this.writes.push(sql);
        } else if (sql.startsWith('INSERT INTO public.xa_license_event')) {
          if (fail) throw Error('Simulated audit insertion failure');
          this.writes.push(sql);
          this.payload = {
            before: JSON.parse(r.before),
            after: JSON.parse(r.after),
            metadata: JSON.parse(r.metadata),
          };
          out = [{ guid: 100700 }];
        }
        return [out, {}];
      },
    };
  }
  const preview = fake();
  const p = await new data.default(preview).release(input, true);
  assert(p.preview);
  assert.equal(preview.status, 'SUSPENDED');
  assert.equal(preview.writes.length, 0);
  const cleared = fake();
  const c = await new data.default(cleared).release(input, false);
  assert(cleared.committed);
  assert.equal(c.current_license_status, 'ACTIVE');
  assert(c.access.allowed);
  assert.deepEqual(cleared.payload.before, { license_status: 'SUSPENDED' });
  assert.deepEqual(cleared.payload.after, { license_status: 'ACTIVE' });
  assert.equal(cleared.payload.metadata.actor_tenant_guid, 100014);
  const debt = fake({ financial: false, status: 'BLOCKED' });
  const d = await new data.default(debt).release(input, false);
  assert.equal(d.current_license_status, 'EXPIRED');
  assert(!d.access.allowed);
  assert.equal(d.access.basis, 'POSTPAID_ARREARS');
  const error = fake({ fail: true });
  await assert.rejects(new data.default(error).release(input, false), /Simulated/);
  assert(error.rolledBack);
  assert(!error.committed);
  assert.equal(error.status, 'SUSPENDED');
  const prior = {
    guid: 100700,
    actor_user_guid: input.actor,
    reason: input.reason,
    new_payload: { license_status: 'ACTIVE' },
    metadata: { actor_tenant_guid: input.actorTenant, action: 'TECHNICAL_RESTRICTION_RELEASE' },
  };
  const replay = fake({ prior, status: 'BLOCKED' });
  const rr = await new data.default(replay).release(input, false);
  assert(rr.replayed);
  assert.equal(rr.applied_license_status, 'ACTIVE');
  assert.equal(rr.current_license_status, 'BLOCKED');
  assert.equal(replay.writes.length, 0);
  await assert.rejects(
    new data.default(fake({ prior: { ...prior, actor_user_guid: 'different' } })).release(
      input,
      false,
    ),
    /conflict/,
  );
  await assert.rejects(
    new data.default(fake({ status: 'EXPIRED' })).release(input, false),
    /expired debt requires payment/,
  );
  globalThis.__release33 = {
    Model: class {
      constructor(data) {
        this.data = data;
      }
      releaseData(i, p) {
        return this.data.release(i, p);
      }
    },
    activity: await load(
      process.env.TOKE_ACTIVITY_INPUT_FILE ||
        path.resolve('src/master/class/activity-monitoring-input.ts'),
    ),
    closureText: (v, name) => {
      if (typeof v !== 'string' || !v.trim() || v.trim().length > 128) throw Error(name);
      return v.trim();
    },
  };
  const business = await load(
    path.join(root, 'master/class/LicenseRelease.ts'),
    (s) =>
      `const LicenseReleaseModel=globalThis.__release33.Model;const {activityGuid}=globalThis.__release33.activity;const {closureText}=globalThis.__release33;\n` +
      s.replace(/^import .*?;\s*/gm, '').replace(/^export \{.*?\} from .*?;\s*/gm, ''),
  );
  const publicResult = business.releaseProjection({
    ...c,
    id: 20,
    tenant: 14,
    secret: 'hidden',
    access: { ...c.access, id: 99, secret: 'nested' },
  });
  assert(!JSON.stringify(publicResult).includes('hidden'));
  assert(!JSON.stringify(publicResult).includes('nested'));
  assert.equal(publicResult.access.scope, 'LICENSE_ONLY');
  assert(!('id' in publicResult.access));
  await assert.rejects(
    new business.default({
      release() {
        throw Error('Should not persist');
      },
    }).release(100020, { confirm: false }, false),
    /confirm/,
  );
  for (const f of ['master/model/LicenseReleaseModel.ts', 'master/routes/license.release.route.ts'])
    stripTypeScriptTypes(fs.readFileSync(path.join(root, f), 'utf8'), { mode: 'transform' });
  const route = fs.readFileSync(path.join(root, 'master/routes/license.release.route.ts'), 'utf8');
  assert(!route.includes('database/'));
  assert(!route.includes('.query('));
  console.log(
    'PASS: preview without writes, authorized technical release, financial debt retained, audit failure rollback simulation, replay after later restriction, conflict, expired-license refusal, GUID-only projection and TypeScript syntax. No PostgreSQL execution/full build.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
