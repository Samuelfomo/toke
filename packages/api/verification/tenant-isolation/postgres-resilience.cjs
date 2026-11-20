'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  { fork, spawnSync } = require('node:child_process');
module.exports = async function resilience(env) {
  const {
    manager,
    initializer,
    context,
    ownership,
    sequelize,
    cfg,
    A,
    B,
    controls,
    wire,
    deferred,
    localPG,
    root,
    nonce,
    port,
    socket,
  } = env;
  const scope = (tenant, work) =>
    manager.runTenantOperation(tenant, async () => {
      const db = await manager.getConnectionForTenant(tenant, cfg(tenant));
      await initializer.initialize(db);
      return work(db);
    });
  const loader = require('./postgres-business-loader.cjs')(env),
    Base = loader.load('tenant/database/db.base.ts').default,
    T = loader.load('utils/response.model.ts').tableName;
  class Crud extends Base {
    read(options = {}) {
      return this.findOne(T.USERS, { guid: '700002' }, options);
    }
  }
  let captured, model, native;
  await scope(A, async (db) => {
    captured = new Crud();
    model = initializer.getModel(T.USERS);
    native = await db.connectionManager.getConnection({ type: 'SELECT' });
    try {
      const callback = await new Promise((resolve, reject) =>
        native.query({ text: 'SELECT $1::int AS n', values: [5] }, (error, result) =>
          error ? reject(error) : resolve(result),
        ),
      );
      assert.equal(callback.rows[0].n, 5);
      const query = new (require('pg').Query)({ text: 'SELECT $1::text AS marker', values: [A] });
      const result = new Promise((resolve, reject) => {
        query.on('end', resolve);
        query.on('error', reject);
      });
      native.query(query);
      assert.equal((await result).rows[0].marker, A);
    } finally {
      await db.connectionManager.releaseConnection(native);
    }
    await db.transaction(async (tx) => {
      const before = wire.length;
      await assert.rejects(
        manager.runTenantOperation(B, async () => {
          const dbB = await manager.getConnectionForTenant(B, cfg(B));
          await captured.read({ transaction: tx });
        }),
        /TENANT_CONTEXT_MISMATCH/,
      );
      assert.equal(wire.length, before);
    });
  });
  const before = wire.length;
  await assert.rejects(
    Promise.resolve().then(() => captured.read()),
    /TENANT_CONTEXT_MISSING/,
  );
  await assert.rejects(model.findAll(), /TENANT_CONTEXT_MISSING/);
  await assert.rejects(
    model.sequelize.getQueryInterface().select(null, T.USERS, {}),
    /TENANT_CONTEXT_MISSING/,
  );
  await assert.rejects(
    manager.runTenantOperation(B, () => model.findAll({ hooks: false })),
    /TENANT_CONTEXT_MISMATCH/,
  );
  assert.throws(
    () => manager.runTenantOperation(B, () => native.query('SELECT 1')),
    /TENANT_CONTEXT_MISMATCH/,
  );
  await assert.rejects(
    manager.runTenantOperation(B, () => initializer.initialize(model.sequelize)),
    /TENANT_CONTEXT_MISMATCH/,
  );
  assert.equal(wire.length, before);
  await manager.closeTenant(A);
  initializer.cleanupTenant(A);
  await scope(A, async (db) => {
    await assert.rejects(captured.read(), /TENANT_GENERATION_STALE/);
    await assert.rejects(model.findAll(), /TENANT_GENERATION_STALE/);
    const native = await db.connectionManager.getConnection({ type: 'SELECT' });
    try {
      await new Promise((resolve, reject) =>
        native.query('SELECT 1', (e, r) => (e ? reject(e) : resolve(r))),
      );
    } finally {
      await db.connectionManager.releaseConnection(native);
    }
    const snapshot = wire.length;
    await assert.rejects(
      db.getQueryInterface().select(null, T.USERS, { transaction: { connection: {} } }),
      /TENANT_TRANSACTION_MISMATCH/,
    );
    assert.equal(wire.length, snapshot);
  });
  console.log(
    'PASS RESILIENCE: native callback/pg.Query, raw/QueryInterface, foreign BaseModel/model/transaction and stale generation checks on real PG',
  );
  // Internal pool factory must reject, rather than throw out of its promise
  // contract, when its original caller's lifetime has already expired.
  let expiredConnect;
  await scope(A, async (db) => {
    expiredConnect = require('node:async_hooks').AsyncResource.bind(() =>
      db.connectionManager._connect(db.config),
    );
  });
  const wireBeforeExpired = wire.length;
  let pendingConnect;
  assert.doesNotThrow(() => {
    pendingConnect = expiredConnect();
  });
  await assert.rejects(pendingConnect, /TENANT_CONTEXT_CLOSED/);
  const { Pool } = require('sequelize-pool');
  const expiredPool = new Pool({
    name: 'v01-expired-pg',
    create: expiredConnect,
    destroy: async () => {},
    validate: () => true,
    min: 0,
    max: 1,
    acquireTimeoutMillis: 1000,
  });
  try {
    await assert.rejects(expiredPool.acquire(), /TENANT_CONTEXT_CLOSED/);
  } finally {
    await expiredPool.drain();
    await expiredPool.destroyAllNow();
  }
  assert.equal(wire.length, wireBeforeExpired);
  console.log(
    'PASS RESILIENCE: expired pool creation rejects through Sequelize pool promise contract with zero native SQL',
  );
  // Actual server error -> transaction aborted -> owned rollback -> pool reused.
  await scope(A, async (db) => {
    await assert.rejects(
      db.transaction(async (tx) => {
        await db.query('SELECT 1/0', { transaction: tx });
      }),
      (error) => error.original?.code === '22012',
    );
    assert.equal((await db.query('SELECT 7 AS n'))[0][0].n, 7);
  });
  // A separate real ORM manager holds authentication at an explicit barrier.
  const entered = deferred(),
    resume = deferred();
  class PausedSequelize extends sequelize.Sequelize {
    async authenticate(...args) {
      await super.authenticate(...args);
      entered.resolve();
      await resume.promise;
    }
  }
  const other = require('./postgres-runtime.cjs')(localPG, {
    ...sequelize,
    Sequelize: PausedSequelize,
  });
  const opening = other.manager
    .runTenantOperation(A, () => other.manager.getConnectionForTenant(A, cfg(A)))
    .then(
      () => ({ ok: true }),
      (error) => ({ error }),
    );
  await Promise.race([
    entered.promise,
    opening.then((result) => {
      throw result.error || Error('no authentication barrier');
    }),
  ]);
  await assert.rejects(
    other.manager.runTenantOperation(A, () =>
      other.manager.getConnectionForTenant(A, { ...cfg(A), password: 'changed-while-pending' }),
    ),
    /TENANT_CONFIG_CHANGED/,
  );
  const closing = other.manager.closeAllConnections();
  await assert.rejects(
    other.manager.runTenantOperation(A, () => other.manager.getConnectionForTenant(A, cfg(A))),
    /TENANT_DRAINING/,
  );
  resume.resolve();
  const result = await opening;
  assert.match(result.error?.message ?? '', /TENANT_GENERATION_STALE/);
  await closing;
  assert.equal(other.manager.hasLiveConnections(), false);
  console.log(
    'PASS RESILIENCE: actual PostgreSQL error/rollback/reuse; closeAll during real authenticated acquisition prevents late publication',
  );
  // Schema drift fixture: rename one column, observe refusal without repair,
  // then restore only the fixture and admit a fresh generation.
  let victim;
  await scope(A, async () => {
    victim = initializer.getModel(T.MEMOS);
  });
  const column = Object.keys(victim.rawAttributes).find(
    (name) => name !== 'id' && name !== 'guid' && victim.rawAttributes[name].type.key !== 'VIRTUAL',
  );
  const field = victim.rawAttributes[column].field || column;
  await manager.closeTenant(A);
  initializer.cleanupTenant(A);
  await controls[0].query(
    `ALTER TABLE "${T.MEMOS}" RENAME COLUMN "${field}" TO v01_fixture_hidden`,
  );
  try {
    await scope(A, async () => {
      assert.throws(() => initializer.getModel(T.MEMOS), /TENANT_SCHEMA_NOT_READY/);
      assert.equal(await initializer.getModel(T.USERS).count(), 2);
    });
    const observed = await controls[0].query(
      'SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND column_name=$2',
      [T.MEMOS, 'v01_fixture_hidden'],
    );
    assert.equal(observed.rowCount, 1);
  } finally {
    await manager.closeTenant(A);
    initializer.cleanupTenant(A);
    await controls[0].query(
      `ALTER TABLE "${T.MEMOS}" RENAME COLUMN v01_fixture_hidden TO "${field}"`,
    );
  }
  await scope(A, async (db) => {
    assert.ok(initializer.getModel(T.MEMOS));
    assert.equal(
      (await db.query("SELECT current_setting('TimeZone') AS timezone"))[0][0].timezone,
      'Africa/Douala',
    );
    const type = 'enum_' + T.ROTATION_GROUPS + '_cycle_unit';
    assert.equal((await db.query(`SELECT 'day'::"${type}" AS value`))[0][0].value, 'day');
    await assert.rejects(
      db.query(`SELECT 'not-a-unit'::"${type}"`),
      (error) => error.original?.code === '22P02',
    );
  });
  console.log(
    'PASS RESILIENCE: real historical-style column drift is blocked without repair, compatible tables survive, restored fixture gets fresh models; enum rejection/timezone preserved',
  );

  // SCRAM only inside the owned cluster, never on an existing service.
  assert.equal(fs.readFileSync(path.join(root, 'owner'), 'utf8'), nonce);
  const hba = path.join(root, 'data', 'pg_hba.conf'),
    original = fs.readFileSync(hba, 'utf8');
  const reload = () => {
    const r = spawnSync('pg_ctl', ['-D', path.join(root, 'data'), 'reload'], {
      env: { PATH: process.env.PATH, HOME: root },
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr);
  };
  await manager.closeTenant(A);
  initializer.cleanupTenant(A);
  try {
    await controls[0].query("ALTER ROLE v01_a PASSWORD 'V01-fictitious-first'");
    fs.writeFileSync(hba, 'local v01_test_a v01_a scram-sha-256\n' + original);
    reload();
    // SHOW confirms the reload request has been processed on a fresh connection;
    // a wrong password must fail rather than silently falling back to trust.
    const wrong = () =>
      manager.runTenantOperation(A, () =>
        manager.getConnectionForTenant(A, { ...cfg(A), password: 'V01-wrong' }),
      );
    let denied = false;
    for (let i = 0; i < 30; i++) {
      try {
        await wrong();
        await manager.closeTenant(A);
      } catch (error) {
        assert.equal(error.original?.code || error.parent?.code, '28P01');
        denied = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(denied, true, 'SCRAM reload did not become effective');
    let old;
    await manager.runTenantOperation(A, async () => {
      old = await manager.getConnectionForTenant(A, {
        ...cfg(A),
        password: 'V01-fictitious-first',
      });
      await initializer.initialize(old);
    });
    await controls[0].query("ALTER ROLE v01_a PASSWORD 'V01-fictitious-second'");
    await assert.rejects(
      manager.runTenantOperation(A, () =>
        manager.getConnectionForTenant(A, { ...cfg(A), password: 'V01-fictitious-second' }),
      ),
      /TENANT_CONFIG_CHANGED/,
    );
    await manager.closeTenant(A);
    initializer.cleanupTenant(A);
    await assert.rejects(
      manager.runTenantOperation(A, () =>
        manager.getConnectionForTenant(A, { ...cfg(A), password: 'V01-fictitious-first' }),
      ),
      (error) => error.original?.code === '28P01',
    );
    await manager.runTenantOperation(A, async () => {
      const next = await manager.getConnectionForTenant(A, {
        ...cfg(A),
        password: 'V01-fictitious-second',
      });
      await initializer.initialize(next);
      await assert.rejects(old.query('SELECT 1'), /TENANT_GENERATION_STALE/);
      await next.query('SELECT 1');
    });
  } finally {
    await manager.closeTenant(A);
    initializer.cleanupTenant(A);
    fs.writeFileSync(hba, original);
    reload();
  }
  console.log(
    'PASS RESILIENCE: real SCRAM auth failure/retry, credential rotation after drain and stale pool refusal',
  );
  for (const tenant of [A, B])
    await scope(tenant, (db) =>
      db.query('CREATE TABLE v01_process_fixture (id integer PRIMARY KEY,marker text NOT NULL)'),
    );
  const children = [];
  try {
    const ready = [],
      done = [];
    for (let index = 1; index <= 2; index++) {
      const child = fork(path.join(__dirname, 'postgres-child.cjs'), [], {
        env: { PATH: process.env.PATH, NODE_ENV: 'test' },
        execArgv: [],
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      });
      children.push(child);
      let stderr = '';
      child.stderr.on('data', (chunk) => (stderr += chunk));
      child.stdout.resume();
      ready.push(
        new Promise((resolve, reject) => {
          child.on('message', (m) => {
            if (m.ready) resolve();
            if (m.error) reject(Error(m.error));
          });
          child.on('error', reject);
          child.on('exit', (code) => {
            if (code) reject(Error(stderr || 'child failed'));
          });
        }),
      );
      done.push(
        new Promise((resolve, reject) => {
          child.on('message', (m) => {
            if (m.error) reject(Error(m.error));
          });
          child.on('error', reject);
          child.on('exit', (code) =>
            code === 0 ? resolve() : reject(Error(stderr || 'child exit ' + code)),
          );
        }),
      );
      child.send({ root, nonce, index });
    }
    await Promise.all(ready);
    for (const child of children) child.send({ action: 'resume' });
    await Promise.all(done);
  } finally {
    for (const child of children)
      if (child.exitCode === null) {
        child.kill();
        await new Promise((resolve) => child.once('exit', resolve));
      }
  }
  for (const tenant of [A, B])
    await scope(tenant, async (db) => {
      const [rows] = await db.query('SELECT id,marker FROM v01_process_fixture ORDER BY id');
      assert.deepEqual(
        rows.map((r) => r.marker),
        [tenant[0] + ':1', tenant[0] + ':2'],
      );
    });
  console.log(
    'PASS RESILIENCE: two child Node processes initialize existing A/B concurrently and keep writes separated; pools closed before child exit',
  );
};
