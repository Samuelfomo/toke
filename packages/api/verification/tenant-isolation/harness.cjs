'use strict';

// No application module is imported by Node. Only allowlisted source text is
// transpiled in a VM, with a closed dependency map. No real Sequelize/pg,
// dotenv, filesystem, process, network, Redis, mail or scheduler is exposed.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

const sourceRoot = path.resolve(__dirname, '../../src');
const allowed = new Set([
  'tenant/database/db.tenant-manager.ts', 'tenant/database/db.initializer.ts',
  'tenant/database/db.base.ts', 'tenant/database/db.config.ts',
  'middle/tenant.middleware.ts', 'automate/automate.ts',
  'master/routes/tenant.route.ts', 'master/database/db.base.ts',
  'utils/generate.database.ts', 'middle/user-auth.ts', 'automate/rotation.cron.ts', 'master/routes/integrator.route.ts', 'tenant/database/tenant.context.ts',
  'tenant/database/tenant.ownership.ts', 'tenant/database/tenant.sql-guard.ts',
]);
const quiet = Object.freeze({ log() {}, warn() {}, error(...args) { if (process.env.V01_TEST_DIAGNOSTICS === '1') console.error(...args); }, info() {} });

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function config(tenant) {
  assert.ok(['a.v01.invalid', 'b.v01.invalid'].includes(tenant));
  return { host: 'never-connect.v01.invalid', port: 1, username: 'fixture',
    password: 'NOT_A_SECRET', database: tenant.startsWith('a.') ? 'v01_fake_a' : 'v01_fake_b',
    reference: tenant.startsWith('a.') ? '100001' : '100002', active: true };
}

function load(relative, dependencies) {
  assert.ok(allowed.has(relative), `Source not allowlisted: ${relative}`);
  const filename = path.join(sourceRoot, relative);
  const source = fs.readFileSync(filename, 'utf8');
  const exports = {};
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const sandbox = {
    exports, console: quiet, Buffer, Date, Promise,
    process: Object.freeze({ env: Object.freeze({ NODE_ENV: 'test' }) }),
    require(name) {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`DEPENDENCY_DENIED: ${name}`);
      return dependencies[name];
    },
  };
  vm.runInNewContext(output, sandbox, { filename, timeout: 2000 });
  return exports;
}

function createHarness() {
  const connections = [], calls = [], scheduled = [];
  const hooks = { authenticate: null, sync: null };
  class FakeSequelize {
    constructor(database, username, password, options) {
      assert.ok(['v01_fake_a', 'v01_fake_b'].includes(database), 'NON_FIXTURE_DATABASE_DENIED');
      assert.equal(options.host, 'never-connect.v01.invalid');
      assert.equal(options.port, 1);
      assert.equal(username, 'fixture');
      assert.equal(password, 'NOT_A_SECRET');
      this.database = database;
      this.config = { database, host: options.host, port: options.port, username };
      this.options = options;
      this.hooks = {};
      this.connectionManager = { getConnection: async () => ({}), _connect: async () => ({}) };
      this.models = {};
      this.rows = new Map();
      this.closed = false;
      connections.push(this);
    }
    async authenticate() {
      this.nativeClient ||= new this.options.dialectModule.Client();
      calls.push({ kind: 'authenticate', database: this.database });
      if (hooks.authenticate) await hooks.authenticate(this);
    }
    async close() { this.closed = true; calls.push({ kind: 'close', database: this.database }); }
    addHook(name, callback) { (this.hooks[name] ||= []).push(callback); }
    getQueryInterface() { return {
      tableExists: async table => { if (hooks.sync) await hooks.sync(this); await this.query('MOCK TABLE EXISTS'); return hooks.tableExists ? hooks.tableExists(this, table) : true; },
      describeTable: async () => { await this.query('MOCK DESCRIBE'); return {}; },
    }; }
    fn(...args) { return { fn: args }; }
    define(name) {
      calls.push({ kind: 'define', database: this.database, table: name });
      const db = this;
      const record = async (kind, options = {}) => {
        await db.query('MOCK ' + kind, options);
        calls.push({ kind, database: db.database, table: name,
          transactionDatabase: options.transaction?.database });
      };
      const rows = () => db.rows.get(name) || [];
      const model = {
        sequelize: db,
        getTableName: () => name,
        getAttributes: () => ({}),
        async sync() { await record('sync'); if (hooks.sync) await hooks.sync(db, name); },
        async create(value, options = {}) {
          await record('insert', options);
          const row = { ...value, database: db.database };
          const write = () => db.rows.set(name, [...rows(), row]);
          if (options.transaction) options.transaction.pending.push(write); else write();
          return { get: () => row };
        },
        async findOne(options = {}) { await record('read', options); return { get: () => ({ database: db.database, ...(rows()[0] || {}) }) }; },
        async findAll(options = {}) { await record('readAll', options); return rows().map(row => ({ get: () => row })); },
        async update(value, options = {}) { await record('update', options); return [rows().length]; },
        async destroy(options = {}) { await record('delete', options); const n = rows().length; db.rows.set(name, []); return n; },
        async count(options = {}) { await record('count', options); return rows().length; },
        async max() { await record('max'); return rows().length; },
      };
      this.models[name] = model;
      return model;
    }
    async query(sql, options = {}) {
      for (const hook of this.hooks.beforeQuery || []) await hook(options);
      calls.push({ kind: 'query', database: this.database, transactionDatabase: options.transaction?.database });
      if (hooks.query) { const result = await hooks.query(this, sql, options); if (result !== undefined) return result; }
      if (sql.includes('pg_catalog.pg_tables') || sql.includes('pg_catalog.pg_class')) return [hooks.bootstrapRows || [], {}];
      return [{ database: this.database, uuid: 'fixture-uuid' }];
    }
    async transaction(options, callback) {
      if (typeof options === 'function') callback = options;
      const tx = new FakeTransaction(this);
      await this.query('BEGIN', { transaction: tx });
      calls.push({ kind: 'begin', database: this.database });
      try {
        const result = await callback(tx);
        await tx.commit();
        return result;
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    }
  }
  class FakeTransaction {
    constructor(db) { this.database = db.database; this.sequelize = db; this.connection = db.nativeClient; this.pending = []; this.LOCK = { UPDATE: 'UPDATE', SHARE: 'SHARE' }; }
    async commit() { await this.sequelize.query('COMMIT', { transaction: this }); this.pending.forEach(write => write()); this.finished = 'commit'; calls.push({ kind: 'commit', database: this.database }); }
    async rollback() { await this.sequelize.query('ROLLBACK', { transaction: this }); this.finished = 'rollback'; calls.push({ kind: 'rollback', database: this.database }); }
  }
  FakeSequelize.version = '6.37.8';
  const context = load('tenant/database/tenant.context.ts', { 'node:async_hooks': require('node:async_hooks'), 'node:crypto': require('node:crypto') });
  const ownership = load('tenant/database/tenant.ownership.ts', { './tenant.context.js': context });
  const shared = { TimezoneConfigUtils: { getCurrentTime: () => new Date('2026-11-05T12:00:00Z') }, HttpStatus: { BAD_REQUEST: 400, NOT_FOUND: 404, INTERNAL_ERROR: 500, SUCCESS: 200, FORBIDDEN: 403 } };
  const sequelize = { Sequelize: FakeSequelize, Transaction: FakeTransaction, QueryTypes: { SELECT: 'SELECT' } };
  const guard = load('tenant/database/tenant.sql-guard.ts', { sequelize, pg: { default: { Client: class {} } }, 'node:async_hooks': require('node:async_hooks'), './tenant.context.js': context, './tenant.ownership.js': ownership });
  const Manager = load('tenant/database/db.tenant-manager.ts', { sequelize, '@toke/shared': shared, 'node:crypto': require('node:crypto'), './tenant.context.js': context, './tenant.ownership.js': ownership, './tenant.sql-guard.js': guard }).default;
  const dependencies = { sequelize, './db.tenant-manager.js': { default: Manager }, './tenant.context.js': context, './tenant.ownership.js': ownership };
  const initializerText = fs.readFileSync(path.join(sourceRoot, 'tenant/database/db.initializer.ts'), 'utf8');
  const ast = ts.createSourceFile('initializer.ts', initializerText, ts.ScriptTarget.Latest, true);
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const specifier = statement.moduleSpecifier.text;
    if (!specifier.startsWith('./data/')) continue;
    const values = {};
    for (const element of statement.importClause.namedBindings.elements) {
      values[element.name.text] = { tableName: element.name.text === 'UsersDbStructure' ? 'users' : element.name.text, attributes: {}, options: {} };
    }
    dependencies[specifier] = values;
  }
  const Initializer = load('tenant/database/db.initializer.ts', dependencies).TableInitializer;
  const Base = load('tenant/database/db.base.ts', { sequelize, './db.tenant-manager.js': { default: Manager }, './db.initializer.js': { TableInitializer: Initializer }, './tenant.context.js': context }).default;
  class Crud extends Base {
    insert(value) { return this.insertOne('users', value); }
    read(options) { return this.findOne('users', {}, options); }
    list() { return this.findAll('users', {}, { limit: 10, offset: 0 }); }
    update(value, options) { return this.updateOne('users', value, {}, options); }
    remove() { return this.deleteOne('users', {}); }
    size() { return this.count('users'); }
    present() { return this.exists('users', {}); }
    query() { return this.sequelize.query('SELECT fixture'); }
    get connection() { return this.sequelize; }
  }
  const cache = { getTenantConfig: async tenant => config(tenant), listTenants: async () => ['a.v01.invalid', 'b.v01.invalid'] };
  const response = { handleError(res, status, error) { res.status = status; res.error = error; }, handleSuccess(res, result) { res.status = 200; res.result = result; } };
  const actualMiddleware = load('middle/tenant.middleware.ts', {
    '@toke/shared': shared,
    '../tenant/database/tenant.context.js': context,
    '../tenant/database/db.tenant-manager.js': { default: Manager },
    '../tenant/database/db.initializer.js': { TableInitializer: Initializer },
    '../tools/tenant-cache.service.js': { default: cache },
    '../tools/credential-extractor.service.js': { default: { extractCredentials: req => ({ subdomain: req.fixtureTenant }), validateCredentials: () => ({ valid: true }) } },
    '../tools/response.js': { default: response },
  }).tenantMiddleware;
  const middleware = async (req, res, next) => {
    const events = new (require('node:events').EventEmitter)();
    res.once = events.once.bind(events); res.off = events.off.bind(events);
    let error;
    await actualMiddleware(req, res, err => { if (err) error = err; else next(); });
    events.emit('finish');
    if (error) throw error;
  };
  const worker = load('automate/automate.ts', {
    'node-cron': { default: { schedule: (...args) => { scheduled.push(args); } } },
    '../tools/tenant-cache.service.js': { default: cache },
    '../tenant/database/db.tenant-manager.js': { default: Manager },
    '../tenant/database/db.initializer.js': { TableInitializer: Initializer },
    './rotation.cron.js': { runRotationCron: async () => { await new Crud().insert({ worker: true }); return { processed: 1, failed: 0, skipped: 0 }; } },
  });
  async function boot(tenant) {
    const work = async () => {
      const db = await Manager.getConnectionForTenant(tenant, config(tenant));
      await Initializer.initialize(db);
      return db;
    };
    if (typeof Manager.runWithTenant === 'function') return Manager.runWithTenant(tenant, work);
    Manager.setCurrentTenant(tenant);
    return work();
  }
  return { Manager, Initializer, Crud, FakeSequelize, sequelize, shared, cache, response,
    middleware, actualMiddleware, context, ownership, worker, scheduled, connections, calls, hooks, boot, load };
}

function loadMasterRoute(h) {
  const registrations = [];
  const router = {};
  for (const method of ['get', 'post', 'patch', 'put', 'delete']) {
    router[method] = (route, ...handlers) => registrations.push({ method, route, handler: handlers.at(-1) });
  }
  // Imports never recurse: unused business dependencies are inert empty objects.
  const dependencies = {};
  const text = fs.readFileSync(path.join(sourceRoot, 'master/routes/tenant.route.ts'), 'utf8');
  const ast = ts.createSourceFile('route.ts', text, ts.ScriptTarget.Latest, true);
  for (const statement of ast.statements) {
    if (ts.isImportDeclaration(statement)) dependencies[statement.moduleSpecifier.text] = { default: {} };
  }
  const tenant = {
    isActive: () => true, getId: () => 1, getGuid: () => '100001', getName: () => 'Fixture A',
    getDatabaseName: () => 'v01_fake_a', getDatabaseUsername: () => 'fixture', getDatabasePassword: () => 'NOT_A_SECRET',
    getSubdomain: () => 'a.v01.invalid', setSubdomain() {}, defineDbSubdomain: async () => {},
    getBillingAddress: () => ({}), getCountryCode: () => 'CM', getBillingEmail: () => 'a@example.invalid', getBillingPhone: () => '000',
  };
  dependencies.express = { Router: () => router };
  dependencies['@toke/shared'] = { ...h.shared,
    LicenseStatus: { ACTIVE: 'active' },
    TN: { validateTenantGuid: value => value },
    TenantValidationUtils: { validateSubdomain: () => true },
  };
  dependencies['../../middle/ensured-routes.js'] = { default: Object.fromEntries(['get', 'post', 'patch', 'put', 'delete'].map(method => [method, () => () => {}])) };
  dependencies['../class/Tenant.js'] = { default: { _load: async () => tenant } };
  dependencies['../class/GlobalLicense.js'] = { default: { _load: async () => ({ getLicenseStatus: () => 'active', getGuid: () => 'fixture-license' }) } };
  dependencies['../class/TenantOnboarding.js'] = { default: class { async provision(guid, callback) { return callback(); } } };
  dependencies['../../utils/generate.database.js'] = { default: { createDatabase: async () => ({ success: true }) } };
  dependencies['../../tools/tenant-cache.service.js'] = { default: { ...h.cache, setTenantConfig: async () => {} } };
  dependencies['../../tenant/database/db.tenant-manager.js'] = { default: h.Manager };
  dependencies['../../tenant/database/db.initializer.js'] = { TableInitializer: h.Initializer };
  dependencies['../../tools/response.js'] = { default: h.response };
  load('master/routes/tenant.route.ts', dependencies);
  return { handler: registrations.find(item => item.method === 'patch' && item.route === '/:guid/subdomain').handler, registrations };
}

module.exports = { createHarness, loadMasterRoute, load, config, deferred, sourceRoot };
