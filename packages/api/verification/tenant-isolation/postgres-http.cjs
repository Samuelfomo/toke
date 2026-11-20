'use strict';
const assert = require('node:assert/strict'),
  http = require('node:http'),
  path = require('node:path'),
  express = require('express');
module.exports = async function httpScenarios(env) {
  const { manager, initializer, cfg, A, B, socket, deferred } = env;
  const scope = (tenant, work) =>
    manager.runTenantOperation(tenant, async () => {
      const db = await manager.getConnectionForTenant(tenant, cfg(tenant));
      await initializer.initialize(db);
      return work(db);
    });
  const loader = require('./postgres-business-loader.cjs')({
    ...env,
    overrides: {
      'packages/api/src/tools/tenant-cache.service.ts': {
        default: {
          getTenantConfig: async (tenant) => {
            assert.ok([A, B].includes(tenant));
            return cfg(tenant);
          },
        },
      },
      'packages/api/src/tools/credential-extractor.service.ts': {
        default: {
          extractCredentials: (req) => ({ subdomain: req.headers['x-v01-tenant'] }),
          validateCredentials: (c) => ({ valid: [A, B].includes(c.subdomain) }),
        },
      },
    },
  });
  const middleware = loader.load('middle/tenant.middleware.ts').tenantMiddleware;
  const Base = loader.load('tenant/database/db.base.ts').default;
  const T = loader.load('utils/response.model.ts').tableName;
  class Crud extends Base {
    read() {
      return this.findOne(T.USERS, { guid: '700002' });
    }
  }
  const events = new (require('node:events').EventEmitter)(),
    callbacks = new Map(),
    callbacksReady = deferred(),
    eventResults = [];
  events.on('sql', () => {
    for (const callback of callbacks.values()) eventResults.push(callback());
  });
  const app = express(),
    aborted = deferred(),
    resume = deferred(),
    abortDone = deferred(),
    responseClosed = deferred();
  let inheritedTask, independentTask, releaseDetached;
  app.use((req, res, next) => Promise.resolve(middleware(req, res, next)));
  app.get('/normal', async (req, res) => {
    await Promise.resolve();
    const row = await new Crud().read();
    res.json({ tenant: manager.getCurrentTenant(), marker: row.first_name });
  });
  app.get('/stream', async (req, res) => {
    res.setHeader('content-type', 'application/json');
    res.write('{"tenant":');
    await new Promise((resolve) => setImmediate(resolve));
    const row = await new Crud().read();
    res.end(JSON.stringify(row.first_name) + '}');
  });
  app.get('/callback', (req, res) => {
    const tenant = manager.getCurrentTenant();
    callbacks.set(
      tenant,
      require('node:async_hooks').AsyncResource.bind(async () => {
        try {
          const row = await new Crud().read();
          if (!res.writableEnded) res.json({ tenant, marker: row.first_name });
          return row.first_name;
        } catch (error) {
          return error.code || error.message;
        }
      }),
    );
    if (callbacks.size === 2) callbacksReady.resolve();
  });
  app.get('/error', async (req, res) => {
    await req.tenant.connection.query('SELECT 1/0');
  });
  app.get('/abort', async (req, res) => {
    res.once('close', () => responseClosed.resolve());
    try {
      await req.tenant.connection.transaction(async (transaction) => {
        await req.tenant.connection.query("INSERT INTO v01_http_tx VALUES (1,'aborted')", {
          transaction,
        });
        aborted.resolve();
        await resume.promise;
        await req.tenant.connection.query('SELECT 1', { transaction });
      });
      abortDone.reject(Error('aborted operation unexpectedly completed'));
    } catch (error) {
      abortDone.resolve(error);
    }
  });
  app.get('/detached', async (req, res) => {
    const gate = deferred();
    releaseDetached = gate.resolve;
    inheritedTask = gate.promise.then(() => req.tenant.connection.query('SELECT 1'));
    // Create the independent operation while the parent is still legitimate.
    independentTask = manager.runTenantOperation(req.tenant.subdomain, async () => {
      await gate.promise;
      return req.tenant.connection.query('SELECT 2 AS n');
    });
    res.json({ ok: true });
  });
  app.use((error, req, res, next) =>
    res.status(500).json({ tenant: manager.getCurrentTenant(), code: error.original?.code }),
  );
  for (const tenant of [A, B])
    await scope(tenant, (db) =>
      db.query('CREATE TABLE v01_http_tx (id integer PRIMARY KEY,marker text)'),
    );
  const httpSocket = path.join(socket, 'http.sock');
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(httpSocket, resolve);
  });
  function request(tenant, route) {
    return new Promise((resolve, reject) => {
      const req = http.get(
        { socketPath: httpSocket, path: route, headers: { 'x-v01-tenant': tenant }, agent: false },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
        },
      );
      req.on('error', reject);
    });
  }
  try {
    const rows = await Promise.all([request(A, '/normal'), request(B, '/normal')]);
    assert.deepEqual(
      rows.map((r) => r.body),
      [
        { tenant: A, marker: A },
        { tenant: B, marker: B },
      ],
    );
    const streams = await Promise.all([request(A, '/stream'), request(B, '/stream')]);
    assert.deepEqual(
      streams.map((r) => r.body.tenant),
      [A, B],
    );
    const pendingCallbacks = Promise.all([request(A, '/callback'), request(B, '/callback')]);
    await callbacksReady.promise;
    assert.throws(() => manager.getCurrentTenant(), /TENANT_CONTEXT_MISSING/);
    events.emit('sql');
    await Promise.all(eventResults.splice(0));
    const eventResponses = await pendingCallbacks;
    assert.deepEqual(
      eventResponses.map((r) => r.body.marker),
      [A, B],
    );
    const beforeLate = env.wire.length;
    events.emit('sql');
    const late = await Promise.all(eventResults.splice(0));
    assert.deepEqual(late, ['TENANT_CONTEXT_CLOSED', 'TENANT_CONTEXT_CLOSED']);
    assert.equal(env.wire.length, beforeLate);
    const errors = await Promise.all([request(A, '/error'), request(B, '/error')]);
    assert.deepEqual(
      errors.map((r) => r.body),
      [
        { tenant: A, code: '22012' },
        { tenant: B, code: '22012' },
      ],
    );
    await request(A, '/detached');
    releaseDetached();
    await assert.rejects(inheritedTask, /TENANT_CONTEXT_CLOSED/);
    assert.equal((await independentTask)[0][0].n, 2);
    const req = http.get({
      socketPath: httpSocket,
      path: '/abort',
      headers: { 'x-v01-tenant': A },
      agent: false,
    });
    req.on('error', () => {});
    await aborted.promise;
    req.destroy();
    await responseClosed.promise;
    resume.resolve();
    const error = await abortDone.promise;
    assert.match(error.message, /TENANT_CONTEXT_CLOSED/);
    await scope(A, async (db) =>
      assert.equal((await db.query('SELECT count(*)::int AS n FROM v01_http_tx'))[0][0].n, 0),
    );
    assert.throws(() => manager.getCurrentTenant(), /TENANT_CONTEXT_MISSING/);
    console.log(
      'PASS HTTP: real Express/Unix transport + middleware + PostgreSQL A/B, streams, bound shared events, late SQL refusal, error handlers, response finish, detached tasks and aborted transaction rollback',
    );
  } finally {
    resume.resolve();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
};
