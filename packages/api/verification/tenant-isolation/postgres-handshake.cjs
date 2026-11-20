'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  { spawnSync } = require('node:child_process');
module.exports = async function handshake(env) {
  const { localPG, cfg, A, root, nonce, controls, deferred, wire, sequelize, socket, port } = env;
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
  const password = 'V01-handshake-only',
    config = { ...cfg(A), password };
  const runtimes = [];
  try {
    await controls[0].query("ALTER ROLE v01_a PASSWORD 'V01-handshake-only'");
    fs.writeFileSync(hba, 'local v01_test_a v01_a scram-sha-256\n' + original);
    reload();
    // Wait for reload using only the private socket and known fixture identity.
    let protectedBySCRAM = false;
    for (let i = 0; i < 30; i++) {
      const probe = new localPG.Client({
        host: socket,
        port,
        database: config.database,
        user: config.username,
        password: 'wrong',
      });
      try {
        await probe.connect();
      } catch (error) {
        assert.equal(error.code, '28P01');
        protectedBySCRAM = true;
      } finally {
        await probe.end();
      }
      if (protectedBySCRAM) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    assert.ok(protectedBySCRAM);
    let drops = 0;
    class DropClient extends localPG.Client {
      constructor(c) {
        super(c);
        this.connection.once('authenticationSASL', () => {
          if (!drops++) {
            this.connection.stream.destroy(Error('V01_HANDSHAKE_DROPPED'));
          }
        });
      }
    }
    const dropped = require('./postgres-runtime.cjs')({ ...localPG, Client: DropClient });
    runtimes.push(dropped);
    const start = wire.length;
    await assert.rejects(
      dropped.manager.runTenantOperation(A, () =>
        dropped.manager.getConnectionForTenant(A, config),
      ),
    );
    assert.ok(drops >= 1);
    assert.equal(dropped.manager.hasLiveConnections(), false);
    assert.equal(wire.length, start);
    await dropped.manager.runTenantOperation(A, async () => {
      const db = await dropped.manager.getConnectionForTenant(A, config);
      await dropped.initializer.initialize(db);
      await db.query('SELECT 1');
    });
    await dropped.manager.closeAllConnections();
    const entered = deferred(),
      resume = deferred();
    let pause = true;
    class PausedClient extends localPG.Client {
      constructor(c) {
        super(c);
        if (pause) {
          pause = false;
          this.password = async () => {
            entered.resolve();
            await resume.promise;
            return password;
          };
        }
      }
    }
    const pending = require('./postgres-runtime.cjs')({ ...localPG, Client: PausedClient });
    runtimes.push(pending);
    const opening = pending.manager
      .runTenantOperation(A, () => pending.manager.getConnectionForTenant(A, config))
      .then(
        () => ({ ok: true }),
        (error) => ({ error }),
      );
    await Promise.race([
      entered.promise,
      opening.then((result) => {
        throw result.error || Error('Handshake barrier not reached');
      }),
    ]);
    const closing = pending.manager.closeAllConnections();
    resume.resolve();
    const result = await opening;
    assert.match(result.error?.message || '', /TENANT_GENERATION_STALE/);
    await closing;
    assert.equal(pending.manager.hasLiveConnections(), false);
    assert.equal(pending.initializer.isInitializedForTenant(A), false);
    console.log(
      'PASS HANDSHAKE: real SCRAM challenge socket interruption sends zero SQL; retry succeeds; close during password exchange publishes no invalid generation',
    );
  } finally {
    for (const runtime of runtimes) await runtime.manager.closeAllConnections();
    fs.writeFileSync(hba, original);
    reload();
  }
  // Close during actual first bootstrap DDL, only in a newly-created empty DB.
  const control = new localPG.Client({
    host: socket,
    port,
    database: 'postgres',
    user: 'v01_control',
    password: '',
  });
  await control.connect();
  try {
    await control.query('CREATE DATABASE v01_bootstrap_interrupt');
  } finally {
    await control.end();
  }
  const ddlControl = new localPG.Client({
    host: socket,
    port,
    database: 'v01_bootstrap_interrupt',
    user: 'v01_control',
    password: '',
  });
  await ddlControl.connect();
  const runtime = require('./postgres-runtime.cjs')(localPG),
    C = 'bootstrap-interrupt.v01.invalid',
    entered = deferred(),
    resume = deferred();
  try {
    await ddlControl.query('CREATE EXTENSION postgis');
    const work = runtime.manager
      .runTenantOperation(C, async () => {
        const db = await runtime.manager.getConnectionForTenant(C, {
          host: socket,
          port,
          database: 'v01_bootstrap_interrupt',
          username: 'v01_control',
          password: '',
        });
        const qi = db.getQueryInterface(),
          create = qi.createTable.bind(qi);
        let first = true;
        qi.createTable = async (...args) => {
          const value = await create(...args);
          if (first) {
            first = false;
            entered.resolve();
            await resume.promise;
          }
          return value;
        };
        await runtime.initializer.initialize(db, { mode: 'bootstrap' });
      })
      .then(
        () => ({ ok: true }),
        (error) => ({ error }),
      );
    await Promise.race([
      entered.promise,
      work.then((result) => {
        throw result.error || Error('DDL barrier absent');
      }),
    ]);
    const close = runtime.manager.closeTenant(C);
    resume.resolve();
    const result = await work;
    assert.match(result.error?.message || '', /TENANT_GENERATION_STALE/);
    await close;
    assert.equal(runtime.initializer.isInitializedForTenant(C), false);
    assert.equal(runtime.manager.hasLiveConnections(), false);
    console.log(
      'PASS BOOTSTRAP LIFECYCLE: close during actual CREATE TABLE prevents late model publication and closes pool; DDL is not claimed rollbackable as a whole',
    );
  } finally {
    resume.resolve();
    await runtime.manager.closeAllConnections();
    await ddlControl.end();
  }
};
