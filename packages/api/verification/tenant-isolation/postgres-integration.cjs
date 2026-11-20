'use strict';
// Explicitly-created disposable cluster only. There is no DATABASE_URL/PGHOST
// override, existing-server mode, production .env, or TCP connection path.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

async function main() {
  if (process.argv[2] !== '--create-disposable-cluster') throw Error('Explicit --create-disposable-cluster required; no connection attempted');
  if (process.argv.slice(3).some(arg => arg !== '--skip-memo-migration')) throw Error('Unknown integration option');
  const skipMemoMigration = process.argv.includes('--skip-memo-migration');
  for (const binary of ['initdb', 'pg_ctl', 'postgres']) {
    const result = spawnSync(binary, ['--version'], { encoding: 'utf8', env: { PATH: process.env.PATH } });
    if (result.error || result.status !== 0) {
      process.exitCode = 2;
      console.error(`PREREQUISITE_MISSING: ${binary}. No cluster created or connection attempted.`);
      return;
    }
  }
  // /tmp keeps the PostgreSQL Unix socket name below its OS length limit.
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()).length > 40 ? '/tmp' : os.tmpdir(), 'v01-pg-'));
  const data = path.join(root, 'data'), socket = path.join(root, 'socket');
  const nonce = crypto.randomBytes(24).toString('hex');
  fs.mkdirSync(socket, { mode: 0o700 });
  fs.writeFileSync(path.join(root, 'owner'), nonce, { mode: 0o600 });
  const env = { PATH: process.env.PATH, HOME: root, LANG: 'C', LC_ALL: 'C' };
  const run = (binary, args) => {
    const result = spawnSync(binary, args, { env, encoding: 'utf8', timeout: 45000 });
    if (result.error || result.status !== 0) throw Error(`${binary} failed: ${result.error?.message || result.stderr}`);
  };
  let started = false, admin, manager;
  const suiteFailures = [];
  const port = 15479; // Unix socket only in a unique private directory.
  try {
    run('initdb', ['-D', data, '-U', 'v01_control', '-A', 'trust', '--no-locale', '--encoding=UTF8']);
    run('pg_ctl', ['-D', data, '-l', path.join(root, 'postgres.log'), '-o', `-h '' -k '${socket}' -p ${port}`, '-w', 'start']);
    started = true;
    assert.equal(fs.readFileSync(path.join(root, 'owner'), 'utf8'), nonce);
    for (const name of Object.keys(process.env)) if (/^(PG|DB_)|^DATABASE_URL$/.test(name)) delete process.env[name];
    delete process.env.NODE_PG_FORCE_NATIVE;
    const pg = require('pg');
    const allowed = new Set(['postgres', 'v01_test_a', 'v01_test_b', 'v01_provisioned', 'v01_http_new', 'v01_http_fail', 'v01_concurrent_new', 'v01_bootstrap_interrupt']);
    const wire = [];
    class LocalOnlyClient extends pg.Client {
      constructor(config) {
        assert.equal(config.host, socket); assert.equal(config.port, port);
        assert.ok(allowed.has(config.database));
        assert.equal(config.connectionString, undefined); assert.equal(config.stream, undefined);
        super({ ...config, ssl: false, connectionTimeoutMillis: 5000, query_timeout: 10000, statement_timeout: 10000 });
      }
      query(sql, ...args) {
        wire.push({ database: this.database, pid: this.processID, text: typeof sql === 'string' ? sql : sql.text });
        return super.query(sql, ...args);
      }
    }
    const localPG = { ...pg, Client: LocalOnlyClient };
    admin = new LocalOnlyClient({ host: socket, port, database: 'postgres', user: 'v01_control', password: '' });
    await admin.connect();
    await admin.query('CREATE ROLE v01_a LOGIN'); await admin.query('CREATE ROLE v01_b LOGIN');
    await admin.query('CREATE DATABASE v01_test_a OWNER v01_a'); await admin.query('CREATE DATABASE v01_test_b OWNER v01_b');
    await admin.query('REVOKE CONNECT ON DATABASE v01_test_a FROM PUBLIC');
    await admin.query('REVOKE CONNECT ON DATABASE v01_test_b FROM PUBLIC');
    const { load, deferred } = require('./harness.cjs');
    const sequelize = require('sequelize');
    const context = load('tenant/database/tenant.context.ts', { 'node:async_hooks': require('node:async_hooks'), 'node:crypto': crypto });
    const ownership = load('tenant/database/tenant.ownership.ts', { './tenant.context.js': context });
    const guard = load('tenant/database/tenant.sql-guard.ts', { sequelize, pg: { default: localPG }, 'node:async_hooks': require('node:async_hooks'), './tenant.context.js': context, './tenant.ownership.js': ownership });
    manager = load('tenant/database/db.tenant-manager.ts', {
      sequelize, '@toke/shared': { TimezoneConfigUtils: { getCurrentTime: () => new Date() } }, 'node:crypto': crypto,
      './tenant.context.js': context, './tenant.ownership.js': ownership, './tenant.sql-guard.js': guard,
    }).default;
    const A = 'a.v01.invalid', B = 'b.v01.invalid';
    const cfg = tenant => ({ host: socket, port, database: tenant === A ? 'v01_test_a' : 'v01_test_b', username: tenant === A ? 'v01_a' : 'v01_b', password: '' });
    const schemas = require('./postgres-schemas.cjs')(sequelize);
    const initializer = load('tenant/database/db.initializer.ts', {
      sequelize, ...schemas.dependencies, './db.tenant-manager.js': { default: manager },
      './tenant.context.js': context, './tenant.ownership.js': ownership,
    }).TableInitializer;
    const controls = [];
    try {
      for (const tenant of [A, B]) {
        const control = new LocalOnlyClient({ host: socket, port, database: cfg(tenant).database, user: 'v01_control', password: '' });
        await control.connect(); controls.push(control);
        const available = await control.query("SELECT name FROM pg_available_extensions WHERE name = 'postgis'");
        if (available.rowCount) {
          await control.query('CREATE EXTENSION postgis');
          console.log('PASS: PostGIS installed only in disposable ' + cfg(tenant).database);
        } else console.log('NOT_EXECUTED: PostGIS extension unavailable');
      }
      for (const tenant of [A, B]) {
        const results = await Promise.all(Array.from({ length: 4 }, () => manager.runWithTenant(tenant, async () => {
          const db = await manager.getConnectionForTenant(tenant, cfg(tenant));
          await initializer.initialize(db, { mode: 'bootstrap' }); return db;
        })));
        assert.ok(results.every(db => db === results[0]));
        await manager.runWithTenant(tenant, () => assert.equal(initializer.getStats().tableCount, 30));
      }
      console.log('PASS: 30 real application schemas bootstrapped A/B, four concurrent connection/model callers per tenant');
      const testEnv = { manager, initializer, context, ownership, sequelize, cfg, A, B, controls, wire, deferred, localPG, socket, port, root, nonce };
      for (const suite of ['postgres-business', 'postgres-resilience', 'postgres-final-isolation', 'postgres-memo-review', 'postgres-memo-migration', 'postgres-provisioning-http', 'postgres-handshake', 'postgres-user-session']) {
        if (suite === 'postgres-memo-migration' && skipMemoMigration) {
          console.log('NOT_EXECUTED: manual MemoReads migration retained; previous validation unchanged');
          continue;
        }
        try { await require('./' + suite + '.cjs')(testEnv); } catch (error) { suiteFailures.push(error); console.error('FAIL SUITE: ' + suite + ' — ' + error.message); }
      }
      await require('./postgres-scenarios.cjs')({ manager, initializer, context, ownership, sequelize, cfg, A, B, controls, wire, deferred });
    } finally { await Promise.all(controls.map(control => control.end())); }
    const dbs = new Map(), models = new Map();
    for (const tenant of [A, B]) await manager.runWithTenant(tenant, async () => {
      const db = await manager.getConnectionForTenant(tenant, cfg(tenant));
      const [identity] = await db.query('SELECT current_database() AS db, current_user AS role');
      assert.equal(identity[0].db, cfg(tenant).database); assert.equal(identity[0].role, cfg(tenant).username);
      const Model = db.define('fixture', { id: { type: sequelize.DataTypes.INTEGER, primaryKey: true }, marker: sequelize.DataTypes.TEXT }, { timestamps: false });
      // Explicit fixture bootstrap, on this just-created empty cluster only.
      await Model.sync({}); dbs.set(tenant, db); models.set(tenant, Model);
    });
    const entered = deferred(), resume = deferred();
    const first = manager.runWithTenant(A, () => dbs.get(A).transaction(async transaction => {
      entered.resolve(); await resume.promise;
      await models.get(A).create({ id: 1, marker: nonce + ':A' }, { transaction });
    })).then(() => ({ ok: true }), error => ({ error }));
    await Promise.race([entered.promise, first.then(result => { throw result.error || Error('A completed without entering transaction'); })]);
    try {
      await manager.runWithTenant(B, () => dbs.get(B).transaction(transaction => models.get(B).create({ id: 1, marker: nonce + ':B' }, { transaction })));
    } finally { resume.resolve(); }
    const firstResult = await first;
    if (firstResult.error) throw firstResult.error;
    await assert.rejects(manager.runWithTenant(B, () => dbs.get(B).transaction(async transaction => {
      await models.get(B).create({ id: 2, marker: 'must-rollback' }, { transaction }); throw Error('fixture rollback');
    })), /fixture rollback/);
    for (const tenant of [A, B]) await manager.runWithTenant(tenant, async () => {
      assert.equal(await models.get(tenant).count(), 1);
      assert.equal((await models.get(tenant).findByPk(1)).marker, nonce + (tenant === A ? ':A' : ':B'));
    });
    await manager.runWithTenant(A, () => dbs.get(A).transaction(async transaction => {
      await assert.rejects(manager.runTenantOperation(B, () => dbs.get(B).query('SELECT 1', { transaction })), /TENANT_TRANSACTION_MISMATCH/);
    }));
    await assert.rejects(dbs.get(A).query('SELECT 1'), /TENANT_CONTEXT_MISSING/);
    const forbidden = new LocalOnlyClient({ host: socket, port, database: 'v01_test_b', user: 'v01_a', password: '' });
    try { await assert.rejects(forbidden.connect(), /permission denied/); } finally { await forbidden.end(); }
    console.log('PASS: disposable PostgreSQL A/B identity, concurrent SQL writes, commits, rollback, real ORM models, wrong transaction/context, cross-role denial.');
    console.log('Other AC integration scenarios remain mandatory; this is not a production certification.');
    if (suiteFailures.length) throw new AggregateError(suiteFailures, 'INTEGRATION_FAILURES: ' + suiteFailures.map(error => error.message).join('; '));
  } finally {
    let cleanupError;
    try { if (manager) await manager.closeAllConnections(); } catch (error) { cleanupError = error; }
    try { if (admin) await admin.end(); } catch (error) { cleanupError ||= error; }
    // Always attempt server shutdown, even if a pool cleanup failed. If shutdown
    // fails, retain the marked directory for inspection rather than delete data
    // underneath a live local server.
    if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
    assert.equal(fs.readFileSync(path.join(root, 'owner'), 'utf8'), nonce);
    fs.rmSync(root, { recursive: true });
    if (cleanupError) throw cleanupError;
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
