'use strict';
const assert = require('node:assert/strict'),
  path = require('node:path'),
  { fork } = require('node:child_process');
module.exports = async function provisioning(env) {
  const { manager, initializer, localPG, socket, port, root, nonce, sequelize } = env;
  const p = await require('./provisioning-http-fixture.cjs')({ ...env, createCatalog: true });
  const failures = [];
  try {
    const success = await p.request(810001);
    assert.equal(success.status, 200, JSON.stringify(success.body));
    assert.equal(success.body.data.tenant_guid, 810001);
    const target = p.targets[810001];
    await manager.runTenantOperation(target.domain, async () => {
      const db = await manager.getConnectionForTenant(target.domain, {
        host: socket,
        port,
        database: target.db,
        username: target.role,
        password: 'V01-only-http-fixture',
      });
      assert.equal(initializer.getAllModels().size, 30);
      assert.equal((await db.query('SELECT current_database() AS db'))[0][0].db, target.db);
    });
    assert.throws(() => manager.getCurrentTenant(), /TENANT_CONTEXT_MISSING/);
    console.log(
      'PASS MASTER HTTP: actual provisioning route, actual onboarding advisory transaction, role/database/extensions/bootstrap and scoped tenant; catalogue/license fixtures explicit',
    );
    // The lock is exercised by the actual route in two independent HTTP processes.
    const children = [],
      ready = [],
      done = [];
    const barrier = new localPG.Client({
      host: socket,
      port,
      database: 'postgres',
      user: 'v01_control',
      password: '',
    });
    await barrier.connect();
    await barrier.query('BEGIN');
    await barrier.query('SELECT pg_advisory_xact_lock(3701,810003)');
    try {
      for (let index = 1; index <= 2; index++) {
        const child = fork(path.join(__dirname, 'provisioning-child.cjs'), [], {
          env: { PATH: process.env.PATH, NODE_ENV: 'test' },
          execArgv: [],
          stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        });
        children.push(child);
        let err = '';
        child.stdout.resume();
        child.stderr.on('data', (d) => (err += d));
        ready.push(
          new Promise((resolve, reject) => {
            child.on('message', (m) => {
              if (m.ready) resolve();
              if (m.error) reject(Error(m.error));
            });
            child.on('error', reject);
            child.on('exit', (code) => {
              if (code) reject(Error(err || 'child failed'));
            });
          }),
        );
        const end = new Promise((resolve, reject) => {
          child.on('message', (m) => {
            if (m.error) reject(Error(m.error));
          });
          child.on('exit', (code) =>
            code === 0 ? resolve() : reject(Error(err || 'child exit ' + code)),
          );
          child.on('error', reject);
        });
        end.catch(() => {});
        done.push(end);
        child.send({ root, nonce, index });
      }
      await Promise.all(ready);
      children.forEach((child) => child.send({ action: 'resume' }));
      let observed = false;
      for (let i = 0; i < 300; i++) {
        await barrier.query('SELECT pg_stat_clear_snapshot()');
        const rows = (
          await barrier.query(
            "SELECT pid FROM pg_stat_activity WHERE datname='postgres' AND wait_event_type='Lock' AND query LIKE '%pg_advisory_xact_lock(3701,%'",
          )
        ).rows;
        if (rows.length >= 2) {
          observed = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.equal(observed, true, 'two provisioning lock waiters required');
      await barrier.query('COMMIT');
      await Promise.all(done);
      const c = new localPG.Client({
        host: socket,
        port,
        database: 'v01_concurrent_new',
        user: 'v01_control',
        password: '',
      });
      try {
        await c.connect();
        const rows = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
        const expected=await manager.runTenantOperation(target.domain,async()=>[...initializer.getAllModels().values()].map(model=>{const name=model.getTableName();return typeof name==='string'?name:name.tableName;}));
        const names = new Set(rows.rows.map((row) => row.tablename));
        assert.equal(expected.length, 30);
        assert.ok(expected.every((name) => names.has(name)), 'Missing expected tables '+JSON.stringify(expected.filter(name=>!names.has(name)))+'; actual '+JSON.stringify([...names]));
      } finally {
        await c.end();
      }
      console.log(
        'PASS PROVISIONING MULTIPROCESS: two real HTTP processes wait on existing advisory lock; one creates/bootstrap, second reopens existing complete schema',
      );
    } finally {
      await barrier.query('ROLLBACK');
      await barrier.end();
      for (const child of children)
        if (child.exitCode === null) {
          child.kill();
          await new Promise((resolve) => child.once('exit', resolve));
        }
    }
    // Force a failure after DDL and cache publication, before tenant models.
    p.setFailure('cache');
    const failed = await p.request(810002);
    assert.equal(failed.status, 500, JSON.stringify(failed.body));
    p.setFailure(undefined);
    const record = await p.catalog.findByPk(810002);
    assert.equal(record.database, 'v01_http_fail');
    assert.equal(record.subdomain, 'v01httpfail');
    assert.equal(
      (await p.master.query('SELECT pg_try_advisory_xact_lock(3701,810002) AS available'))[0][0]
        .available,
      true,
    );
    assert.throws(() => manager.getCurrentTenant(), /TENANT_CONTEXT_MISSING/);
    const retry = await p.request(810002);
    if (retry.status !== 200) {
      assert.equal(retry.status, 500);
      console.error(
        'OBSERVED PROVISIONING RECOVERY GAP: HTTP failure retains Master configuration/database/cache; retry treats empty new DB as existing and fails read-only compatibility',
      );
      failures.push(
        Error(
          'PROVISIONING_RECOVERY_REQUIRED: interrupted new provisioning cannot resume empty database; no distributed rollback',
        ),
      );
    }
  } finally {
    for (const target of Object.values(p.targets)) await manager.closeTenant(target.domain);
    await p.close();
  }
  if (failures.length)
    throw new AggregateError(
      failures,
      'PROVISIONING_HTTP_FAILURES: ' + failures.map((e) => e.message).join('; '),
    );
};
