'use strict';

// Application acceptance: actual guarded application units, inert infrastructure.
const { test: nodeTest } = require('node:test');
const test = (name, callback) => nodeTest(name, { timeout: 5000 }, callback);
const assert = require('node:assert/strict');
const { createHarness, config, deferred, loadMasterRoute, load } = require('./harness.cjs');
const A = 'a.v01.invalid', B = 'b.v01.invalid';
function within(h, tenant, callback) { return h.Manager.runWithTenant(tenant, callback); }

test('AC01: parallel async scopes retain tenant A and tenant B for reads and writes', async () => {
  const h = createHarness(); await h.boot(A); await h.boot(B);
  const ready = deferred(), resume = deferred();
  const first = within(h, A, async () => {
    const crud = new h.Crud(); ready.resolve(); await resume.promise;
    assert.equal((await crud.read()).database, 'v01_fake_a');
    assert.equal((await crud.insert({ marker: 'A' })).database, 'v01_fake_a');
  });
  await ready.promise;
  await within(h, B, async () => {
    assert.equal((await new h.Crud().insert({ marker: 'B' })).database, 'v01_fake_b');
  });
  resume.resolve(); await first;
});

test('AC02: actual simultaneous HTTP middlewares register each connection under its own tenant', async () => {
  const h = createHarness(), ready = deferred(), resume = deferred();
  h.hooks.authenticate = async db => { if (db.database === 'v01_fake_a') { ready.resolve(); await resume.promise; } };
  const responseA = {}, responseB = {};
  const first = h.middleware({ fixtureTenant: A, method: 'GET', path: '/fixture' }, responseA, () => {});
  await ready.promise;
  await h.middleware({ fixtureTenant: B, method: 'GET', path: '/fixture' }, responseB, () => {});
  resume.resolve(); await first;
  assert.equal(responseA.error, undefined);
  assert.equal(h.Initializer.isInitializedForTenant(A), true);
  assert.equal(h.Initializer.isInitializedForTenant(B), true);
});

test('AC03: concurrent connection requests share a single in-flight pool', async () => {
  const h = createHarness(), resume = deferred(); h.hooks.authenticate = () => resume.promise;
  const one = within(h, A, () => h.Manager.getConnectionForTenant(A, config(A)));
  const two = within(h, A, () => h.Manager.getConnectionForTenant(A, config(A)));
  resume.resolve(); const [a, b] = await Promise.all([one, two]);
  assert.equal(h.connections.length, 1); assert.equal(a, b);
});

test('AC04: concurrent existing initialization defines once without DDL', async () => {
  const h = createHarness(), resume = deferred();
  await within(h, A, async () => {
    const db = await h.Manager.getConnectionForTenant(A, config(A));
    h.hooks.sync = () => resume.promise;
    const one = h.Initializer.initialize(db), two = h.Initializer.initialize(db);
    resume.resolve(); await Promise.all([one, two]);
  });
  assert.equal(h.calls.filter(call => call.kind === 'define' && call.table === 'users').length, 1);
  assert.equal(h.calls.filter(call => call.kind === 'sync' && call.table === 'users').length, 0);
});

test('AC05: no implicit tenant remains after an HTTP request has completed', async () => {
  const h = createHarness();
  await h.middleware({ fixtureTenant: A, method: 'GET', path: '/fixture' }, {}, () => {});
  const before = h.calls.length;
  assert.throws(() => new h.Crud(), /context|tenant/i);
  assert.equal(h.calls.length, before);
});

test('AC06: connection A cannot be registered as tenant B, before define or sync', async () => {
  const h = createHarness(); const db = await h.boot(A); const before = h.calls.length;
  await assert.rejects(Promise.resolve().then(() => within(h, B, () => h.Initializer.initialize(db))), /context|tenant|connection/i);
  assert.equal(h.calls.length, before);
});

test('AC07: a BaseModel captured in A cannot execute raw SQL from B', async () => {
  const h = createHarness(); await h.boot(A); await h.boot(B);
  const captured = within(h, A, () => new h.Crud()); const before = h.calls.length;
  await assert.rejects(Promise.resolve().then(() => within(h, B, () => captured.query())), /context|tenant|connection/i);
  assert.equal(h.calls.length, before);
});

test('AC08: transaction A cannot be supplied to CRUD in tenant B before model operation', async () => {
  const h = createHarness(); const a = await h.boot(A); await h.boot(B);
  await within(h, A, () => a.transaction(async transaction => {
    const before = h.calls.length;
    await assert.rejects(Promise.resolve().then(() => within(h, B, () => new h.Crud().read({ transaction }))), /context|tenant|transaction/i);
    assert.equal(h.calls.length, before);
  }));
});

test('AC09: actual worker scopes end at completion and do not leave a tenant active', async () => {
  const h = createHarness(); const result = await h.worker.runForAllTenants();
  assert.ok(result.tenants.every(item => item.status === 'ok'));
  assert.throws(() => h.Manager.getConnectionSync(), /context|tenant/i);
});

test('AC10: actual Master tenant provisioning restores the caller context', async () => {
  const h = createHarness(); await h.boot(B);
  const { handler } = loadMasterRoute(h);
  await within(h, B, async () => {
    const response = {};
    await handler({ params: { guid: '100001' }, body: { subdomain: A } }, response);
    assert.equal(response.status, 200);
    assert.equal(h.Manager.getCurrentTenant(), B);
  });
});

test('AC11: parallel commit A and rollback B never mix transaction/model identities', async () => {
  const h = createHarness(); const a = await h.boot(A), b = await h.boot(B);
  const ready = deferred(), resume = deferred();
  const first = within(h, A, () => a.transaction(async transaction => {
    ready.resolve(); await resume.promise;
    await new h.Crud().read({ transaction });
    await h.Initializer.getModel('users').create({ marker: 'A' }, { transaction });
  }));
  await ready.promise;
  await assert.rejects(within(h, B, () => b.transaction(async transaction => {
    await h.Initializer.getModel('users').create({ marker: 'B' }, { transaction });
    throw Error('fixture rollback');
  })), /fixture rollback/);
  resume.resolve(); await first;
  assert.ok(!h.calls.some(call => call.transactionDatabase && call.transactionDatabase !== call.database));
  assert.equal(a.rows.get('users')?.length, 1);
  assert.equal(b.rows.get('users')?.length || 0, 0);
});

test('AC12: explicit initialization utility establishes its tenant and restores the outer scope', async () => {
  const h = createHarness(); await h.boot(B);
  const Utility = load('utils/generate.database.ts', {
    sequelize: h.sequelize,
    '../tenant/database/db.initializer.js': { TableInitializer: h.Initializer },
    '../tenant/database/db.tenant-manager.js': { default: h.Manager },
  }).default;
  await within(h, B, async () => {
    await Utility.initializeDatabase(A, 1, 'never-connect.v01.invalid', 'v01_fake_a', 'fixture', 'NOT_A_SECRET');
    assert.equal(h.Initializer.isInitializedForTenant(A), true);
    assert.equal(h.Manager.getCurrentTenant(), B);
  });
});

test('AC13: failed connection is closed and a retry can succeed', async () => {
  const h = createHarness(); h.hooks.authenticate = async () => { throw Error('fixture failure'); };
  await assert.rejects(within(h, A, () => h.Manager.getConnectionForTenant(A, config(A))), /fixture failure/);
  assert.equal(h.connections[0].closed, true);
  h.hooks.authenticate = null;
  assert.equal((await within(h, A, () => h.Manager.getConnectionForTenant(A, config(A)))).database, 'v01_fake_a');
});

test('AC14: same tenant with conflicting connection configuration is rejected, not silently reused', async () => {
  const h = createHarness(); await h.boot(A); const before = h.calls.length;
  await assert.rejects(Promise.resolve().then(() => within(h, A, () => h.Manager.getConnectionForTenant(A, config(B)))), /config|tenant|connection/i);
  assert.equal(h.calls.length, before);
});

test('AC15: overlapping actual worker calls never write tenant A work into B', async () => {
  const h = createHarness(), ready = deferred(), resume = deferred();
  h.hooks.authenticate = async db => { if (db.database === 'v01_fake_a') { ready.resolve(); await resume.promise; } };
  const first = h.worker.runForTenant(A); await ready.promise;
  await h.worker.runForTenant(B); resume.resolve(); await first;
  assert.deepEqual(h.calls.filter(call => call.kind === 'insert').map(call => call.database).sort(), ['v01_fake_a', 'v01_fake_b']);
  assert.equal(h.Initializer.isInitializedForTenant(A), true);
});

test('AC16: nested scopes restore the parent even after a failure', async () => {
  const h = createHarness();
  await within(h, A, async () => {
    await assert.rejects(h.Manager.runTenantOperation(B, async () => { await Promise.resolve(); throw Error('fixture'); }), /fixture/);
    assert.equal(h.Manager.getCurrentTenant(), A);
  });
});
