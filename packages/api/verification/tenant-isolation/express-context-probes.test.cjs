'use strict';
// Real Express Router, synthetic requests/responses; no HTTP server or network.
// Test-local ALS examples describe framework behavior, not application changes.
const { test: nodeTest } = require('node:test');
const assert = require('node:assert/strict');
const { AsyncLocalStorage } = require('node:async_hooks');
const { EventEmitter } = require('node:events');
const express = require('express');
const test = (name, callback) => nodeTest(name, { timeout: 5000 }, callback);
function dispatch(router, fixtureTenant) {
  const req = Object.assign(new EventEmitter(), { method: 'GET', url: '/fixture', headers: {}, fixtureTenant });
  return new Promise((resolve, reject) => {
    const res = Object.assign(new EventEmitter(), { complete: resolve });
    router.handle(req, res, error => reject(error || Error('Unexpected router fallthrough')));
  });
}

test('Express Router preserves ALS through parallel awaited route handlers and their rejection handlers', async () => {
  const storage = new AsyncLocalStorage(), router = express.Router();
  router.use((req, res, next) => storage.run({ tenant: req.fixtureTenant }, () => next()));
  router.get('/fixture', async () => { await Promise.resolve(); throw Error('fixture route rejection'); });
  router.use((error, req, res, next) => res.complete({ tenant: storage.getStore()?.tenant, error: error.message }));
  const results = await Promise.all([dispatch(router, 'A'), dispatch(router, 'B')]);
  assert.deepEqual(results.map(result => result.tenant), ['A', 'B']);
  assert.ok(results.every(result => result.error === 'fixture route rejection'));
  assert.equal(storage.getStore(), undefined);
});

test('returning an ALS promise with rejection handling registered by the outer Router can lose the scope', async () => {
  const storage = new AsyncLocalStorage(), router = express.Router();
  router.use((req, res, next) => storage.run({ tenant: req.fixtureTenant }, async () => {
    await Promise.resolve(); throw Error('fixture setup rejection');
  }));
  router.use((error, req, res, next) => res.complete({ tenant: storage.getStore()?.tenant, error: error.message }));
  const result = await dispatch(router, 'A');
  assert.equal(result.tenant, undefined);
  assert.equal(result.error, 'fixture setup rejection');
});

test('catching setup rejection inside ALS before calling next(error) retains the scope', async () => {
  const storage = new AsyncLocalStorage(), router = express.Router();
  router.use((req, res, next) => storage.run({ tenant: req.fixtureTenant }, () => {
    return (async () => { await Promise.resolve(); throw Error('fixture setup rejection'); })().catch(next);
  }));
  router.use((error, req, res, next) => res.complete({ tenant: storage.getStore()?.tenant, error: error.message }));
  const result = await dispatch(router, 'A');
  assert.equal(result.tenant, 'A');
  assert.equal(result.error, 'fixture setup rejection');
});
