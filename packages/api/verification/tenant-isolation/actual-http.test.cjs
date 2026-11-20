'use strict';
const { test: nodeTest } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { EventEmitter } = require('node:events');
const { createHarness } = require('./harness.cjs');
const test = (name, callback) => nodeTest(name, { timeout: 5000 }, callback);

function dispatch(router, fixtureTenant) {
  return new Promise((resolve, reject) => {
    const req = Object.assign(new EventEmitter(), { method: 'GET', url: '/fixture', headers: {}, fixtureTenant });
    const res = Object.assign(new EventEmitter(), { complete(value) { this.emit('finish'); resolve(value); } });
    router.handle(req, res, error => reject(error || Error('unexpected fallthrough')));
  });
}

test('AC33: real Express dispatch + actual middleware preserves A/B and error handler context through await', async () => {
  const h = createHarness(), router = express.Router();
  // The source loader uses a VM realm; match production's native Promise realm
  // without changing the middleware or its inside-ALS rejection handling.
  router.use((req, res, next) => Promise.resolve(h.actualMiddleware(req, res, next)));
  router.get('/fixture', async () => {
    await Promise.resolve();
    const row = await new h.Crud().read();
    const error = new Error('fixture route error'); error.database = row.database; throw error;
  });
  router.use((error, req, res, next) => res.complete({ tenant: h.Manager.getCurrentTenant(), database: error.database }));
  const results = await Promise.all([dispatch(router, 'a.v01.invalid'), dispatch(router, 'b.v01.invalid')]);
  assert.deepEqual(results, [{ tenant: 'a.v01.invalid', database: 'v01_fake_a' }, { tenant: 'b.v01.invalid', database: 'v01_fake_b' }]);
  assert.throws(() => h.Manager.getCurrentTenant(), /TENANT_CONTEXT_MISSING/);
});

test('AC33: actual setup rejection reaches the Express error handler inside its tenant scope', async () => {
  const h = createHarness(), router = express.Router();
  h.hooks.authenticate = async () => { throw Error('fixture auth failure'); };
  router.use((req, res, next) => Promise.resolve(h.actualMiddleware(req, res, next)));
  router.use((error, req, res, next) => res.complete({ tenant: h.Manager.getCurrentTenant(), error: error.message }));
  assert.deepEqual(await dispatch(router, 'a.v01.invalid'), { tenant: 'a.v01.invalid', error: 'fixture auth failure' });
});
