'use strict';

// Real installed Sequelize, injected inert PostgreSQL driver. No application
// module, .env, server, socket or actual database is used. These are framework
// behavior probes, not a tenant guard implementation or PostgreSQL integration.
const { test: nodeTest } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Sequelize, DataTypes, Transaction } = require('sequelize');
const test = (name, callback) => nodeTest(name, { timeout: 5000 }, callback);

function fixture() {
  const calls = [];
  class InertClient extends EventEmitter {
    constructor(config) {
      super();
      assert.equal(config.host, 'driver.v01.invalid');
      assert.equal(config.database, 'v01_framework_fixture');
      assert.equal(config.port, 1);
      this.connection = new EventEmitter();
      calls.push({ kind: 'client' });
    }
    connect(callback) { calls.push({ kind: 'connect' }); queueMicrotask(() => callback(null)); }
    query(sql) { calls.push({ kind: 'driverSQL', sql }); return Promise.resolve({ rows: [] }); }
    end(callback) { calls.push({ kind: 'end' }); if (callback) callback(); }
  }
  const db = new Sequelize('v01_framework_fixture', 'fixture', 'NOT_A_SECRET', {
    dialect: 'postgres', host: 'driver.v01.invalid', port: 1,
    databaseVersion: '16.0.0', logging: false, pool: { min: 0, max: 1 },
    dialectModule: { Client: InertClient, types: { getTypeParser: () => value => value } },
  });
  return { db, calls };
}

function interceptQuery(db, calls) {
  db.connectionManager.getConnection = async () => { calls.push({ kind: 'acquire' }); return { fixtureConnection: true }; };
  db.connectionManager.releaseConnection = () => { calls.push({ kind: 'release' }); };
  db.dialect.Query = class {
    constructor(connection, sequelize, options) { this.connection = connection; this.sequelize = sequelize; this.options = options; }
    async run(sql) { calls.push({ kind: 'run', sql, connection: this.connection }); return []; }
  };
}

test('framework versions reviewed are exact, not package.json ranges', () => {
  assert.equal(Sequelize.version, '6.37.8');
  assert.equal(require('express/package.json').version, '5.3.0');
  assert.equal(require('router/package.json').version, '2.2.0');
});

test('beforeQuery can stop Query.run but is later than connection acquisition', async () => {
  const { db, calls } = fixture(); interceptQuery(db, calls);
  db.addHook('beforeQuery', () => { calls.push({ kind: 'hook' }); throw Error('fixture denial'); });
  try {
    await assert.rejects(db.query('SELECT 1', { retry: { max: 0 } }), /fixture denial/);
    assert.deepEqual(calls.map(call => call.kind), ['acquire', 'hook', 'release']);
  } finally { await db.close(); }
});

test('beforeConnect rejects before constructing the injected driver client', async () => {
  const { db, calls } = fixture();
  db.addHook('beforeConnect', () => { throw Error('fixture connect denial'); });
  try {
    await assert.rejects(db.connectionManager._connect(db.config), /fixture connect denial/);
    assert.equal(calls.length, 0);
  } finally { await db.close(); }
});

test('PostgreSQL driver setup emits SQL without beforeQuery', async () => {
  const { db, calls } = fixture(); let queryHooks = 0;
  db.addHook('beforeQuery', () => { queryHooks++; });
  try {
    const connection = await db.connectionManager._connect(db.config);
    assert.ok(calls.some(call => call.kind === 'driverSQL' && call.sql.includes('SET')));
    assert.ok(calls.some(call => call.kind === 'driverSQL' && call.sql.includes('pg_type')));
    assert.equal(queryHooks, 0);
    await db.connectionManager._disconnect(connection);
  } finally { await db.close(); }
});

test('reusing a pooled connection does not call beforeConnect again', async () => {
  const { db, calls } = fixture(); let connects = 0, acquires = 0;
  db.addHook('beforeConnect', () => { connects++; });
  db.addHook('beforePoolAcquire', () => { acquires++; });
  try {
    const first = await db.connectionManager.getConnection({});
    db.connectionManager.releaseConnection(first);
    const second = await db.connectionManager.getConnection({});
    assert.equal(first, second);
    db.connectionManager.releaseConnection(second);
    assert.equal(connects, 1); assert.equal(acquires, 2);
    assert.equal(calls.filter(call => call.kind === 'client').length, 1);
  } finally { await db.close(); }
});

test('Sequelize.query does not reject a transaction owned by another instance', async () => {
  const one = fixture(), two = fixture(); interceptQuery(two.db, two.calls);
  const foreign = new Transaction(one.db, {});
  foreign.connection = { fixtureOwner: 'one' }; // No BEGIN or network.
  try {
    await two.db.query('SELECT 1', { transaction: foreign });
    assert.equal(two.calls.filter(call => call.kind === 'acquire').length, 0);
    assert.equal(two.calls.find(call => call.kind === 'run').connection, foreign.connection);
  } finally { await one.db.close(); await two.db.close(); }
});

test('hooks:false does not disable the unconditional beforeQuery call in this version', async () => {
  const { db, calls } = fixture(); interceptQuery(db, calls);
  db.addHook('beforeQuery', () => { throw Error('fixture guard'); });
  try {
    await assert.rejects(db.query('SELECT 1', { hooks: false, retry: { max: 0 } }), /fixture guard/);
    assert.equal(calls.filter(call => call.kind === 'run').length, 0);
  } finally { await db.close(); }
});

test('sync({}) on an existing table still calls ensureEnums and adds missing indexes', async () => {
  const { db } = fixture(); const events = [];
  const Model = db.define('fixture', { state: DataTypes.ENUM('one', 'two') }, {
    timestamps: false, indexes: [{ name: 'fixture_state_idx', fields: ['state'] }],
  });
  const qi = db.getQueryInterface();
  qi.tableExists = async () => true;
  qi.ensureEnums = async () => { events.push('ensureEnums'); };
  qi.showIndex = async () => [];
  qi.addIndex = async () => { events.push('addIndex'); };
  qi.createTable = async () => { throw Error('unexpected createTable'); };
  try {
    await Model.sync({});
    assert.deepEqual(events, ['ensureEnums', 'addIndex']);
  } finally { await db.close(); }
});
