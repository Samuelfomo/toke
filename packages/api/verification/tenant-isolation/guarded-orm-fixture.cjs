'use strict';
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const sequelize = require('sequelize');
const { load } = require('./harness.cjs');

// Real ORM and real application guards. The injected pg Client cannot open a
// socket. SQL is recorded, not sent anywhere. This is not PostgreSQL integration.
function guardedRuntime() {
  const context = load('tenant/database/tenant.context.ts', { 'node:async_hooks': require('node:async_hooks'), 'node:crypto': require('node:crypto') });
  const ownership = load('tenant/database/tenant.ownership.ts', { './tenant.context.js': context });
  const calls = [], clients = [];
  class Client extends EventEmitter {
    constructor(config) {
      super(); assert.equal(config.host, 'inert.v01.invalid'); assert.equal(config.port, 1);
      assert.ok(['v01_fake_a', 'v01_fake_b'].includes(config.database));
      this.database = config.database; this.connection = new EventEmitter(); clients.push(this);
    }
    connect(callback) { queueMicrotask(() => callback(null)); }
    query(sql, ...args) {
      const statement = typeof sql === 'string' ? sql : sql.text;
      calls.push({ database: this.database, sql: statement });
      const rows = statement === 'SHOW SERVER_VERSION' ? [{ server_version: '16.0.0' }] : statement.startsWith('WITH ranges') ? [] : [{ database: this.database, result: 2 }];
      const result = { rows, rowCount: rows.length, command: statement.split(' ')[0] };
      const callback = args.at(-1);
      if (typeof callback === 'function') { queueMicrotask(() => callback(null, result)); return; }
      return Promise.resolve(result);
    }
    end(callback) { this._ending = true; if (callback) callback(); }
  }
  const guard = load('tenant/database/tenant.sql-guard.ts', {
    sequelize, pg: { default: { Client, types: { getTypeParser: () => value => value } } },
    'node:async_hooks': require('node:async_hooks'), './tenant.context.js': context, './tenant.ownership.js': ownership,
  });
  function connection(tenant, generation = 1) {
    let db;
    db = new sequelize.Sequelize(tenant.startsWith('a.') ? 'v01_fake_a' : 'v01_fake_b', 'fixture', 'NOT_A_SECRET', {
      dialect: 'postgres', host: 'inert.v01.invalid', port: 1, logging: false,
      timezone: 'Africa/Douala', pool: { min: 0, max: 2 },
      dialectModule: guard.tenantDriver(() => db),
    });
    let live = true;
    ownership.registerConnection(db, { tenant, generation, usable: () => live, retain() {} });
    guard.installTenantSQLGuard(db);
    return { db, invalidate: () => { live = false; } };
  }
  return { context, ownership, guard, calls, clients, connection, sequelize };
}
module.exports = { guardedRuntime };
