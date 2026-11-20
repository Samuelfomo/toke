'use strict';
// No CLI target/URL. This child accepts only the parent's owned disposable
// cluster marker over IPC, validates it, and closes all pools before exiting.
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  pg = require('pg');
process.once('message', async (message) => {
  let runtime;
  try {
    const { root, nonce, index, mode } = message;
    assert.match(root, /^\/(?:private\/)?tmp\/v01-pg-[A-Za-z0-9]+$/);
    assert.match(nonce, /^[a-f0-9]{48}$/);
    assert.equal(fs.readFileSync(path.join(root, 'owner'), 'utf8'), nonce);
    const socket = path.join(root, 'socket'),
      port = 15479;
    class Client extends pg.Client {
      constructor(config) {
        assert.equal(config.host, socket);
        assert.equal(config.port, port);
        assert.ok(['v01_test_a', 'v01_test_b'].includes(config.database));
        assert.ok(['v01_a', 'v01_b'].includes(config.user));
        assert.equal(config.connectionString, undefined);
        assert.equal(config.stream, undefined);
        super({ ...config, ssl: false, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
      }
    }
    runtime = require('./postgres-runtime.cjs')({ ...pg, Client });
    const { manager, initializer } = runtime;
    for (const letter of ['a', 'b'])
      await manager.runTenantOperation(letter + '.v01.invalid', async () => {
        const db = await manager.getConnectionForTenant(letter + '.v01.invalid', {
          host: socket,
          port,
          database: 'v01_test_' + letter,
          username: 'v01_' + letter,
          password: '',
        });
        await initializer.initialize(db);
      });
    process.send({ ready: true, index });
    await new Promise((resolve) =>
      process.once('message', (next) => {
        assert.equal(next.action, 'resume');
        resolve();
      }),
    );
    if (mode === 'rotation') {
      const loader = require('./postgres-business-loader.cjs')({ ...runtime });
      const run = loader.load('automate/rotation.cron.ts').runRotationCron;
      for (const letter of ['a', 'b'])
        await manager.runTenantOperation(letter + '.v01.invalid', async () => {
          const result = await run();
          assert.equal(result.failed, 0);
          assert.equal(result.processed + result.skipped, 1);
        });
    } else {
      for (const letter of ['a', 'b'])
        await manager.runTenantOperation(letter + '.v01.invalid', async () => {
          const db = manager.getConnectionSync();
          const [identity] = await db.query('SELECT current_database() AS db');
          assert.equal(identity[0].db, 'v01_test_' + letter);
          await db.query('INSERT INTO v01_process_fixture (id,marker) VALUES ($1,$2)', {
            bind: [index, letter + ':' + index],
          });
        });
    }
    await manager.closeAllConnections();
    process.send({ passed: true, index });
    process.disconnect();
  } catch (error) {
    if (runtime) await runtime.manager.closeAllConnections().catch(() => {});
    if (process.connected) {
      process.send({ error: error.message });
      process.disconnect();
    }
    process.exitCode = 1;
  }
});
