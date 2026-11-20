'use strict';
// Native Node primitives only. This demonstrates the proposed mechanism, not an
// application fix; neither TenantManager nor application SQL guards are replaced.
const { test: nodeTest } = require('node:test');
const test = (name, callback) => nodeTest(name, { timeout: 5000 }, callback);
const assert = require('node:assert/strict');
const { AsyncLocalStorage, AsyncResource } = require('node:async_hooks');
const { EventEmitter } = require('node:events');
const { setImmediate: nextTurn } = require('node:timers/promises');

test('native ALS: promises and concurrent async work retain distinct tenants', async () => {
  const storage = new AsyncLocalStorage();
  const result = await Promise.all(['A', 'B'].map(tenant => storage.run(Object.freeze({ tenant }), async () => {
    await nextTurn(); await Promise.resolve(); return storage.getStore().tenant;
  })));
  assert.deepEqual(result, ['A', 'B']); assert.equal(storage.getStore(), undefined);
});

test('native ALS: nested context and errors restore the parent, with no global fallback', async () => {
  const storage = new AsyncLocalStorage();
  await storage.run({ tenant: 'master-operation-A' }, async () => {
    await assert.rejects(storage.run({ tenant: 'B' }, async () => { await nextTurn(); throw Error('fixture'); }), /fixture/);
    assert.equal(storage.getStore().tenant, 'master-operation-A');
  });
  assert.equal(storage.getStore(), undefined);
});

test('native ALS: shared EventEmitter callbacks need deliberate binding at registration', () => {
  const storage = new AsyncLocalStorage(), events = new EventEmitter();
  let unbound, bound;
  storage.run({ tenant: 'A' }, () => {
    events.once('fixture', () => { unbound = storage.getStore()?.tenant; });
    events.once('fixture', AsyncResource.bind(() => { bound = storage.getStore()?.tenant; }));
  });
  storage.run({ tenant: 'B' }, () => events.emit('fixture'));
  assert.equal(unbound, 'B'); assert.equal(bound, 'A');
});

test('native ALS: detached work retains a context after the parent callback returns', async () => {
  const storage = new AsyncLocalStorage(); let background;
  storage.run({ tenant: 'A' }, () => { background = nextTurn().then(() => storage.getStore().tenant); });
  assert.equal(storage.getStore(), undefined); assert.equal(await background, 'A');
  // Context isolation is not cancellation or request lifetime enforcement.
});
