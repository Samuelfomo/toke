'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  pg = require('pg'),
  sequelize = require('sequelize');
process.once('message', async ({ root, nonce, index }) => {
  let runtime, fixture;
  try {
    assert.match(root, /^\/(?:private\/)?tmp\/v01-pg-[A-Za-z0-9]+$/);
    assert.equal(fs.readFileSync(path.join(root, 'owner'), 'utf8'), nonce);
    assert.match(nonce, /^[a-f0-9]{48}$/);
    const socket = path.join(root, 'socket'),
      port = 15479;
    class Client extends pg.Client {
      constructor(config) {
        assert.equal(config.host, socket);
        assert.equal(config.port, port);
        assert.ok(['postgres', 'v01_concurrent_new'].includes(config.database));
        assert.equal(config.connectionString, undefined);
        assert.equal(config.stream, undefined);
        super({ ...config, ssl: false, connectionTimeoutMillis: 5000, statement_timeout: 12000 });
      }
    }
    const localPG = { ...pg, Client };
    runtime = require('./postgres-runtime.cjs')(localPG);
    fixture = await require('./provisioning-http-fixture.cjs')({
      ...runtime,
      sequelize,
      localPG,
      socket,
      port,
      serverName: index === 1 ? 'provision-child-a' : 'provision-child-b',
    });
    process.send({ ready: true, index });
    await new Promise((resolve) =>
      process.once('message', (m) => {
        assert.equal(m.action, 'resume');
        resolve();
      }),
    );
    const response = await fixture.request(810003);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    await runtime.manager.closeAllConnections();
    await fixture.close();
    fixture = null;
    process.send({ passed: true, index });
    process.disconnect();
  } catch (error) {
    if (runtime) await runtime.manager.closeAllConnections().catch(() => {});
    if (fixture) await fixture.close().catch(() => {});
    if (process.connected) {
      process.send({ error: error.message });
      process.disconnect();
    }
    process.exitCode = 1;
  }
});
