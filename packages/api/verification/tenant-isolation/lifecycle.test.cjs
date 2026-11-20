'use strict';
const { test: nodeTest } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, deferred, config } = require('./harness.cjs');
const { EventEmitter } = require('node:events');
const test = (name, callback) => nodeTest(name, { timeout: 5000 }, callback);
const A = 'a.v01.invalid';

test('AC26: close during authentication never publishes its late result and retry gets a new generation', async () => {
  const h = createHarness(), entered = deferred(), resume = deferred();
  h.hooks.authenticate = async () => { entered.resolve(); await resume.promise; };
  const attempt = h.Manager.runWithTenant(A, () => h.Manager.getConnectionForTenant(A, config(A)));
  const rejected = assert.rejects(attempt, /TENANT_GENERATION_STALE/);
  await entered.promise;
  const closing = h.Manager.closeTenant(A); resume.resolve();
  await Promise.all([rejected, closing]);
  assert.equal(h.connections[0].closed, true);
  h.hooks.authenticate = null;
  const fresh = await h.boot(A);
  assert.notEqual(fresh, h.connections[0]);
});

test('AC27: closing during model validation invalidates the unpublished registry', async () => {
  const h = createHarness(), entered = deferred(), resume = deferred();
  h.hooks.sync = async () => { entered.resolve(); await resume.promise; };
  const first = h.boot(A); const rejected = assert.rejects(first, /TENANT_GENERATION_STALE/);
  await entered.promise;
  const closing = h.Manager.closeTenant(A); resume.resolve();
  await Promise.all([rejected, closing]);
  assert.equal(h.Initializer.isInitializedForTenant(A), false);
});

test('AC28/29: closes are single-flight, reject new work, drain admitted scopes, and permit explicit reconfiguration', async () => {
  const h = createHarness(); const old = await h.boot(A);
  const entered = deferred(), resume = deferred();
  const operation = h.Manager.runWithTenant(A, async () => {
    const captured = new h.Crud(); entered.resolve(); await resume.promise;
    assert.equal((await captured.read()).database, 'v01_fake_a');
  });
  await entered.promise;
  const one = h.Manager.closeTenant(A), two = h.Manager.closeTenant(A);
  await assert.rejects(h.Manager.runWithTenant(A, () => h.Manager.getConnectionForTenant(A, config(A))), /TENANT_DRAINING/);
  resume.resolve(); await Promise.all([one, two, operation]);
  assert.equal(h.calls.filter(call => call.kind === 'close').length, 1);
  await h.Manager.runWithTenant(A, async () => {
    const fresh = await h.Manager.getConnectionForTenant(A, config('b.v01.invalid'));
    assert.notEqual(old, fresh);
    await h.Initializer.initialize(fresh);
    assert.equal((await new h.Crud().read()).database, 'v01_fake_b');
  });
});

test('AC30/35: credential change is rejected, and stale captured objects cannot use a replacement generation', async () => {
  const h = createHarness(); await h.boot(A);
  const captured = h.Manager.runWithTenant(A, () => new h.Crud());
  await assert.rejects(h.Manager.runWithTenant(A, () => h.Manager.getConnectionForTenant(A, { ...config(A), password: 'DIFFERENT_FIXTURE' })), /TENANT_CONFIG_CHANGED/);
  await h.Manager.closeTenant(A); await h.boot(A);
  const before = h.calls.length;
  await assert.rejects(Promise.resolve().then(() => h.Manager.runWithTenant(A, () => captured.read())), /TENANT_GENERATION_STALE/);
  assert.equal(h.calls.length, before);
});

test('AC31: incompatible existing schema fails without sync or writes and poisons no other tenant', async () => {
  const h = createHarness(); h.hooks.tableExists = db => db.database !== 'v01_fake_a';
  await assert.rejects(h.boot(A), /TENANT_SCHEMA_NOT_READY/);
  assert.equal(h.Initializer.isInitializedForTenant(A), false);
  assert.equal(h.calls.filter(call => ['sync', 'insert', 'update', 'delete'].includes(call.kind)).length, 0);
  await h.boot('b.v01.invalid');
  await h.Manager.closeTenant(A);
  assert.equal(h.connections[0].closed, true);
  await assert.rejects(h.boot(A), /TENANT_SCHEMA_NOT_READY/); // fresh attempt, never a partial registry
});

test('AC32: bootstrap synchronizes only a verified empty fixture and rejects a partial existing DB', async () => {
  const h = createHarness();
  await h.Manager.runWithTenant(A, async () => {
    const db = await h.Manager.getConnectionForTenant(A, config(A));
    await h.Initializer.initialize(db, { mode: 'bootstrap' });
  });
  assert.ok(h.calls.some(call => call.kind === 'sync'));
  const partial = createHarness(); partial.hooks.bootstrapRows = [{ relname: 'existing_business_table' }];
  await assert.rejects(partial.Manager.runWithTenant(A, async () => {
    const db = await partial.Manager.getConnectionForTenant(A, config(A));
    await partial.Initializer.initialize(db, { mode: 'bootstrap' });
  }), /TENANT_BOOTSTRAP_NOT_EMPTY/);
  assert.equal(partial.calls.filter(call => call.kind === 'sync').length, 0);
});

test('AC33/34: actual HTTP scope survives awaited handlers but rejects detached work after response finish', async () => {
  const h = createHarness(), res = new EventEmitter(), ready = deferred(), handlerDone = deferred();
  let captured, detached;
  await h.actualMiddleware({ fixtureTenant: A, method: 'GET', path: '/fixture' }, res, error => {
    if (error) throw error;
    detached = (async () => {
      await Promise.resolve(); captured = new h.Crud();
      assert.equal((await captured.read()).database, 'v01_fake_a'); ready.resolve();
      await handlerDone.promise;
      await assert.rejects(captured.read(), /TENANT_CONTEXT_CLOSED/);
    })();
  });
  await ready.promise; res.emit('finish'); handlerDone.resolve(); await detached;
  await h.Manager.runWithTenant(A, () => new h.Crud().read()); // independent task
});

test('AC36: helpers rethrow typed context errors rather than returning a business null', async () => {
  const h = createHarness(); await h.boot(A);
  const captured = h.Manager.runWithTenant(A, () => new h.Crud());
  await assert.rejects(captured.findLastModification('users'), /TENANT_CONTEXT_MISSING/);
  await assert.rejects(captured.guidGenerator('users'), /TENANT_CONTEXT_MISSING/);
});

test('AC28: model cleanup is refused while a connection or initialization is live', async () => {
  const h = createHarness(); await h.boot(A);
  assert.throws(() => h.Initializer.cleanupTenant(A), /TENANT_MODELS_IN_USE/);
  assert.throws(() => h.Initializer.cleanup(), /TENANT_MODELS_IN_USE/);
  await h.Manager.closeTenant(A); h.Initializer.cleanupTenant(A);
  assert.equal(h.Initializer.isInitializedForTenant(A), false);
});

test('AC34: deliberate detached operation has a distinct lifetime from its parent HTTP request', async () => {
  const h = createHarness(); await h.boot(A);
  const lifetime = h.context.createTenantLifetime(), ready = deferred(), resume = deferred();
  let task;
  await h.Manager.runWithTenant(A, async () => {
    task = h.Manager.runTenantOperation(A, async () => {
      new h.Crud(); ready.resolve(); await resume.promise;
      return new h.Crud().insert({ detached: true });
    });
    await ready.promise;
  }, { lifetime: lifetime.lifetime });
  lifetime.close(); resume.resolve();
  assert.equal((await task).database, 'v01_fake_a');
  assert.throws(() => h.Manager.getConnectionSync(), /TENANT_CONTEXT_MISSING/);
});

test('AC31: missing optional model is diagnosed and blocked without disabling compatible tables', async () => {
  const h = createHarness(); h.hooks.tableExists = (db, table) => table !== 'ScheduleSuggestionDbStructure';
  await h.boot(A);
  await h.Manager.runWithTenant(A, async () => {
    assert.equal((await new h.Crud().read()).database, 'v01_fake_a');
    const before = h.calls.length;
    assert.throws(() => h.Initializer.getModel('ScheduleSuggestionDbStructure'), /TENANT_SCHEMA_NOT_READY/);
    assert.equal(h.calls.length, before);
    assert.equal(h.calls.filter(call => call.kind === 'sync').length, 0);
  });
});

test('AC33: HTTP close during shared initialization never calls the handler or poisons the ready generation', async () => {
  const h = createHarness(), entered = deferred(), resume = deferred(), res = new EventEmitter();
  h.hooks.sync = async () => { entered.resolve(); await resume.promise; };
  let called = false;
  const request = h.actualMiddleware({ fixtureTenant: A, method: 'GET', path: '/fixture' }, res, () => { called = true; });
  await entered.promise; res.destroyed = true; res.emit('close'); resume.resolve(); await request;
  assert.equal(called, false);
  h.hooks.sync = null;
  await h.Manager.runWithTenant(A, async () => {
    assert.equal((await new h.Crud().read()).database, 'v01_fake_a');
  });
});
