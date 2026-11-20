'use strict';
const { test: nodeTest } = require('node:test');
const assert = require('node:assert/strict');
const { guardedRuntime } = require('./guarded-orm-fixture.cjs');
const test = (name, callback) => nodeTest(name, { timeout: 5000 }, callback);
const A = 'a.v01.invalid', B = 'b.v01.invalid';

test('AC17/19: guarded real ORM cold start, version probe, SET/OIDs and pool reuse stay in A', async () => {
  const h = guardedRuntime(), { db } = h.connection(A);
  try {
    await assert.rejects(db.query('SELECT 1'), /TENANT_CONTEXT_MISSING/);
    assert.equal(h.calls.length, 0);
    await h.context.runWithTenant(A, async () => { await db.authenticate(); await db.query('SELECT 1'); });
    assert.ok(h.calls.some(call => call.sql.includes('SET TIME ZONE')));
    assert.ok(h.calls.some(call => call.sql === 'SHOW SERVER_VERSION'));
    assert.ok(h.calls.every(call => call.database === 'v01_fake_a'));
    assert.equal(h.clients.length, 2); // temporary version connection + pool
  } finally { await db.close(); }
});

test('AC18/20: captured native Client, raw SQL, hooks:false and foreign transaction cannot escape ownership', async () => {
  const h = guardedRuntime(), one = h.connection(A), two = h.connection(B);
  try {
    await h.context.runWithTenant(A, () => one.db.authenticate());
    const client = h.clients.at(-1), before = h.calls.length;
    assert.throws(() => client.query('SELECT 1'), /TENANT_CONTEXT_MISSING/);
    await assert.rejects(h.context.runWithTenant(B, () => one.db.query('SELECT 1', { hooks: false })), /TENANT_CONTEXT_MISMATCH/);
    assert.equal(h.calls.length, before);
    await h.context.runWithTenant(A, () => one.db.transaction(async transaction => {
      await assert.rejects(h.context.runWithTenant(B, () => two.db.query('SELECT 1', { transaction }), { switchTenant: true }), /TENANT_TRANSACTION_MISMATCH/);
    }));
  } finally { await one.db.close(); await two.db.close(); }
});

test('AC21/22: actual managed transaction rolls back under a revoked lifetime without permitting business SQL', async () => {
  const h = guardedRuntime(), { db } = h.connection(A), lifetime = h.context.createTenantLifetime();
  try {
    await assert.rejects(h.context.runWithTenant(A, () => db.transaction(async () => {
      lifetime.close();
      await assert.rejects(db.query('SELECT business'), /TENANT_CONTEXT_CLOSED/);
      throw Error('fixture rollback');
    }), { lifetime: lifetime.lifetime }), /fixture rollback/);
    assert.ok(h.calls.some(call => call.sql === 'ROLLBACK;'));
    assert.ok(!h.calls.some(call => call.sql.includes('business')));
  } finally { await db.close(); }
});

test('AC21: unmanaged transactions cannot migrate between operations of the same tenant', async () => {
  const h = guardedRuntime(), { db } = h.connection(A);
  let transaction;
  try {
    // Deliberately retaining an unmanaged transaction is rejected elsewhere.
    const operation = h.context.createTenantLifetime();
    await h.context.runWithTenant(A, async () => { transaction = await db.transaction(); }, { lifetime: operation.lifetime });
    await assert.rejects(h.context.runWithTenant(A, () => db.query('SELECT 1', { transaction })), /TENANT_TRANSACTION_MISMATCH/);
    // Cleanup is invoked in the original operation, not by inventing a new one.
    operation.close();
  } finally {
    await db.close();
    assert.ok(h.calls.some(call => call.sql === 'ROLLBACK;'));
  }
});

test('AC23: afterCommit rejection is not misreported as an automatic rollback', async () => {
  const h = guardedRuntime(), { db } = h.connection(A);
  try {
    await assert.rejects(h.context.runWithTenant(A, () => db.transaction(async tx => {
      tx.afterCommit(() => { throw Error('fixture after commit'); });
    })), /fixture after commit/);
    assert.ok(h.calls.some(call => call.sql === 'COMMIT;'));
    assert.ok(!h.calls.some(call => call.sql === 'ROLLBACK;'));
  } finally { await db.close(); }
});

test('AC35/39: a captured model uses real ORM with replacements and cannot cross tenants or generations', async () => {
  const h = guardedRuntime(), one = h.connection(A);
  try {
    const Model = one.db.define('fixture', { id: { type: h.sequelize.DataTypes.INTEGER, primaryKey: true } }, { timestamps: false });
    await h.context.runWithTenant(A, async () => { await Model.findAll(); await one.db.query('SELECT :n', { replacements: { n: 1 } }); });
    const before = h.calls.length;
    await assert.rejects(h.context.runWithTenant(B, () => Model.findAll()), /TENANT_CONTEXT_MISMATCH/);
    one.invalidate();
    await assert.rejects(h.context.runWithTenant(A, () => Model.findAll()), /TENANT_GENERATION_STALE/);
    assert.equal(h.calls.length, before);
  } finally { await one.db.close(); }
});

test('AC21/22: nested real savepoints roll back safely even when the HTTP lifetime has expired', async () => {
  const h = guardedRuntime(), { db } = h.connection(A), lifetime = h.context.createTenantLifetime();
  try {
    await assert.rejects(h.context.runWithTenant(A, () => db.transaction(parent =>
      db.transaction({ transaction: parent }, async () => {
        lifetime.close(); throw Error('fixture nested rollback');
      })
    ), { lifetime: lifetime.lifetime }), /fixture nested rollback/);
    // Revocation rolls back the root, which already cancels its savepoints.
    assert.equal(h.calls.filter(call => call.sql === 'ROLLBACK;').length, 1);
  } finally { await db.close(); }
});

test('AC39: injected guarded pg Client preserves callback and query-object invocation shapes', async () => {
  const h = guardedRuntime(), { db } = h.connection(A);
  try {
    await h.context.runWithTenant(A, async () => {
      await db.authenticate();
      const client = h.clients.at(-1);
      const result = await new Promise((resolve, reject) => client.query({ text: 'SELECT 1' }, (error, rows) => error ? reject(error) : resolve(rows)));
      assert.equal(result.rows[0].database, 'v01_fake_a');
      await db.query('SELECT $n', { bind: { n: 1 } });
    });
  } finally { await db.close(); }
});

test('AC17/19/26: QueryInterface and pool entry require a context; denied setup SQL closes the unpooled client', async () => {
  const h = guardedRuntime(), { db } = h.connection(A);
  try {
    await assert.rejects(db.getQueryInterface().select(null, 'fixture', { raw: true }), /TENANT_CONTEXT_MISSING/);
    assert.throws(() => db.connectionManager.getConnection({}), /TENANT_CONTEXT_MISSING/);
    assert.equal(h.clients.length, 0);
    db.options.timezone = 'UTC'; // Not the reviewed tenant session configuration.
    await assert.rejects(h.context.runWithTenant(A, () => db.authenticate()), /TENANT_TECHNICAL_SQL_DENIED/);
    assert.equal(h.calls.length, 0);
    assert.ok(h.clients.every(client => client._ending));
  } finally { await db.close(); }
});

test('AC21/35: changing the physical connection of an owned transaction is rejected before SQL', async () => {
  const h = guardedRuntime(), { db } = h.connection(A);
  try {
    await h.context.runWithTenant(A, () => db.transaction(async transaction => {
      const connection = transaction.connection, before = h.calls.length;
      transaction.connection = {};
      try { await assert.rejects(db.query('SELECT 1', { transaction }), /TENANT_TRANSACTION_CONNECTION_MISMATCH/); }
      finally { transaction.connection = connection; }
      assert.equal(h.calls.length, before);
    }));
  } finally { await db.close(); }
});

test('AC21: successful savepoint restores the parent and completed transactions cannot use completesTransaction as a bypass', async () => {
  const h = guardedRuntime(), { db } = h.connection(A);
  try {
    await h.context.runWithTenant(A, async () => {
      const transaction = await db.transaction();
      await db.transaction({ transaction }, async child => { await db.query('SELECT 1', { transaction: child }); });
      await db.query('SELECT 1', { transaction });
      await transaction.commit();
      const before = h.calls.length;
      await assert.rejects(db.query('SELECT 1', { transaction, completesTransaction: true }), /TENANT_TRANSACTION_FINISHED/);
      assert.equal(h.calls.length, before);
    });
    assert.ok(h.calls.some(call => call.sql === 'COMMIT;'));
  } finally { await db.close(); }
});

test('AC26: pool creation from a revoked scope rejects asynchronously without opening a client', async () => {
  const h = guardedRuntime(), { db } = h.connection(A);
  let connect;
  try {
    h.context.runWithTenant(A, () => {
      connect = require('node:async_hooks').AsyncResource.bind(() => db.connectionManager._connect(db.config));
    });
    let pending;
    assert.doesNotThrow(() => { pending = connect(); });
    await assert.rejects(pending, /TENANT_CONTEXT_CLOSED/);
    const { Pool } = require('sequelize-pool');
    const pool = new Pool({ name: 'v01-revoked', create: connect, destroy: async () => {}, validate: () => true, min: 0, max: 1, acquireTimeoutMillis: 1000 });
    try { await assert.rejects(pool.acquire(), /TENANT_CONTEXT_CLOSED/); }
    finally { await pool.drain(); await pool.destroyAllNow(); }
    assert.equal(h.clients.length, 0); assert.equal(h.calls.length, 0);
  } finally { await db.close(); }
});
