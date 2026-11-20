'use strict';
const { test: nodeTest } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createHarness, load, config, deferred, sourceRoot } = require('./harness.cjs');
const test = (name, callback) => nodeTest(name, { timeout: 5000 }, callback);
const A = 'a.v01.invalid', B = 'b.v01.invalid';

test('AC25/38: Master CRUD remains independent while tenant CRUD keeps existing return shapes', async () => {
  const h = createHarness();
  const Master = load('master/database/db.base.ts', {
    sequelize: h.sequelize, './db.config': { default: { getInstance: async () => ({ query: async () => ['master'] }) } },
    './db.initializer.js': { TableInitializer: { getModel: () => ({ create: async value => ({ get: () => value }) }) } },
  }).default;
  class MasterCrud extends Master { write() { return this.insertOne('master', { kind: 'master' }); } }
  assert.equal((await new MasterCrud().write()).kind, 'master');
  await h.boot(A);
  await h.Manager.runWithTenant(A, async () => {
    const crud = new h.Crud();
    assert.equal((await crud.insert({ marker: 'A' })).marker, 'A');
    assert.equal((await crud.read()).marker, 'A');
    assert.equal((await crud.list()).length, 1);
    assert.equal(await crud.size(), 1); assert.equal(await crud.present(), true);
    assert.equal(await crud.update({ marker: 'updated' }), 1); assert.equal(await crud.remove(), true);
    assert.equal((await new MasterCrud().write()).kind, 'master');
  });
});

test('AC38: actual pointage PIN middleware keeps request identity and tenant-owned license writes', async () => {
  const h = createHarness(); await h.boot(A); await h.boot(B);
  const writes = [];
  const middleware = load('middle/user-auth.ts', {
    '@toke/shared': { HttpStatus: { SUCCESS: 200, UNAUTHORIZED: 401 }, UsersValidationUtils: { validateGuid: () => true }, TIME_ENTRIES_CODES: {}, USERS_CODES: { PIN_INVALID: 'pin_invalid' }, USERS_ERRORS: {} },
    '../tools/response.js': { default: h.response }, '../tools/glossary.js': { default: {} },
    '../tools/employee.license.service.js': { default: { getEmployeeLicense: async () => ({ status: 200, response: { data: { guid: 'fixture-license' } } }) } },
    '../tenant/class/User.js': { default: { _load: async () => {
      const crud = new h.Crud(); await crud.read();
      return { getGuid: () => '100001', getId: () => 1, isActive: () => true, verifyPin: async pin => pin === '1234',
        setEmployeeLicense() {}, getEmployeeLicense: () => 'fixture-license',
        changeEmployeeLicense: async () => { writes.push(await crud.insert({ license: 'fixture-license' })); } };
    } } },
  }).UserAuth.timeEntriesAuthenticate;
  await Promise.all([A, B].map(tenant => h.Manager.runWithTenant(tenant, async () => {
    const req = { headers: { 'x-api-pin': '1234' }, body: { user: '100001' } }; let next = false;
    await middleware(req, {}, () => { next = true; });
    assert.equal(next, true); assert.equal(req.userGuid, '100001'); assert.equal(req.employeeLicense, 'fixture-license');
  })));
  assert.deepEqual(writes.map(row => row.database).sort(), ['v01_fake_a', 'v01_fake_b']);
  await h.Manager.runWithTenant(A, async () => {
    const res = {}; let next = false;
    await middleware({ headers: { 'x-api-pin': 'wrong' }, body: { user: '100001' } }, res, () => { next = true; });
    assert.equal(next, false); assert.equal(res.status, 401);
    // Existing middleware writes the license before checking PIN; V01 does not change that rule.
  });
});

test('AC24: all three actual integrator DB sections restore context and preserve responses', async () => {
  const h = createHarness(), routes = [];
  const router = Object.fromEntries(['get', 'post'].map(method => [method, (route, ...handlers) => routes.push({ method, route, handler: handlers.at(-1) })]));
  const tenant = domain => ({
    getSubdomain: () => domain, getDatabaseName: () => config(domain).database, getGuid: () => '100001',
    toJSON: () => ({ guid: '100001', name: 'Fixture', status: 'ACTIVE' }),
  });
  class Redis { on() {} async set() {} async sadd() {} async expire() {} }
  const dependencies = {
    'node:crypto': { default: require('node:crypto') }, express: { Router: () => router }, ioredis: { default: Redis },
    sequelize: h.sequelize, '@toke/shared': { Status: { ACTIVE: 'ACTIVE' } },
    '../class/Tenant.js': { default: { _list: async () => [tenant(A), tenant(B)], _load: async domain => tenant(domain) } },
    '../../tools/tenant-cache.service.js': { default: h.cache }, '../../tools/send.email.service.js': { default: {} },
    '../../tenant/database/db.tenant-manager.js': { default: h.Manager },
    '../../utils/response.model.js': { tableName: { USERS: 'users', USER_ROLES: 'user_roles', ROLES: 'roles' } },
    '../../tools/user.authentication.service.js': { UserAuthenticationService: { auth: async () => ({ status: 200, response: { guid: '100001' } }) } },
  };
  h.hooks.query = (db, sql) => sql.includes('SELECT DISTINCT') ? [{ guid: '100001', email: 'fixture@example.invalid' }] : sql.includes('SELECT u.guid') ? [{ guid: '100001' }] : undefined;
  load('master/routes/integrator.route.ts', dependencies);
  const invoke = async (method, route, req) => {
    const res = { code: 200, locals: { integratorToken: 'fixture-token', integratorSession: { email: 'fixture@example.invalid' } }, status(code) { this.code = code; return this; }, json(value) { this.result = value; return this; } };
    await routes.find(item => item.method === method && item.route === route).handler(req, res);
    assert.equal(res.code, 200); assert.throws(() => h.Manager.getCurrentTenant(), /TENANT_CONTEXT_MISSING/);
    return res.result;
  };
  assert.equal((await invoke('get', '/tenants', {})).tenants.length, 2);
  assert.equal((await invoke('get', '/tenants/:subdomain/responsibles', { params: { subdomain: A } })).profiles.length, 1);
  assert.equal((await invoke('post', '/context/select', { body: { subdomain: B, userGuid: '100001' } })).user.guid, '100001');
});

test('AC37: overlapping worker triggers coalesce by tenant in the same process', async () => {
  const h = createHarness(), entered = deferred(), resume = deferred();
  h.hooks.authenticate = async () => { entered.resolve(); await resume.promise; };
  const first = h.worker.runForTenant(A); await entered.promise;
  const second = h.worker.runForTenant(A); resume.resolve();
  await Promise.all([first, second]);
  assert.equal(h.calls.filter(call => call.kind === 'insert').length, 1);
});

test('AC37/38: actual rotation business logic advances once, keeps logs tenant-owned, and then skips the same day', async () => {
  const h = createHarness(); await h.boot(A); await h.boot(B);
  const dates = new Map();
  const rotation = load('automate/rotation.cron.ts', {
    sequelize: { ...h.sequelize, Op: require('sequelize').Op, Transaction: require('sequelize').Transaction },
    '../tenant/database/db.tenant-manager.js': { default: h.Manager },
    '@toke/shared': { ...h.shared, CycleUnit: { DAY: 'day', WEEK: 'week' }, Direction: { FORWARD: 'forward', BACKWARD: 'backward' } },
    '../tenant/class/RotationAssignments.js': { default: {
      _list: async () => [{ getId: () => 1, getRotationGroup:()=>1 }],
      _loadForRotation: async (id, transaction) => {
        assert.ok(transaction);
        const tenant = h.Manager.getCurrentTenant(), crud = new h.Crud(); await crud.read();
        return { getId: () => id, getRotationGroup: () => 1, getLastAdvancedDate: () => dates.get(tenant), getOffset: () => 0,
          applyRotationOffset: async (offset, date, tx, queue) => { assert.equal(tx, transaction);assert.equal(offset,1);queue(()=>dates.set(tenant,date));await crud.insert({offset});return true; } };
      },
    } },
    '../tenant/class/RotationGroups.js': { default: { _list: async () => [{getId:()=>1}], _loadForRotation: async (id,tx) => {assert.ok(tx);return {getAutoAdvance:()=>true,getCycleUnit:()=> 'day',getDirection:()=> 'forward',getRotationStep:()=>1,getStartDate:()=> '2026-11-01',getCycleSlotCountForRotation:async supplied=>{assert.equal(supplied,tx);return 3;}};} } },
    '../tenant/class/RotationAssignmentLog.js': { default: class {
      constructor() { this.crud = new h.Crud(); }
      setRotationAssignment() { return this; } setPreviousOffset() { return this; } setNewOffset() { return this; } setCycleLength(value) { assert.equal(value, 3); return this; } setExecutedAt() { return this; }
      async save() { await this.crud.insert({ rotationLog: true }); }
    } },
  });
  await Promise.all([A, B].map(tenant => h.Manager.runWithTenant(tenant, async () => {
    const first = await rotation.runRotationCron(); assert.equal(first.processed, 1); assert.equal(first.failed, 0);
    const second = await rotation.runRotationCron(); assert.equal(second.processed, 0); assert.equal(second.skipped, 1);
  })));
  assert.deepEqual(h.calls.filter(call => call.kind === 'insert').map(call => call.database).sort(), ['v01_fake_a', 'v01_fake_a', 'v01_fake_b', 'v01_fake_b']);
});

test('AC40: active sources have no mutable global tenant or autonomous setter callers', () => {
  const root = path.resolve(sourceRoot);
  const targets = [];
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (file.endsWith('.ts')) targets.push(file); } };
  walk(root);
  for (const filename of targets) {
    const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = node => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        assert.notEqual(node.expression.name.text, 'setCurrentTenant', filename);
        assert.notEqual(node.expression.name.text, 'useCLS', filename);
      }
      if (ts.isPropertyDeclaration(node)) assert.notEqual(node.name.getText(source), 'currentTenant', filename);
      if (ts.isPropertyAccessExpression(node) && node.name.text === 'connectionManager') {
        assert.equal(path.relative(root, filename), 'tenant/database/tenant.sql-guard.ts', 'Unreviewed internal connection-manager access: ' + filename);
      }
      if (ts.isPropertyAccessExpression(node) && node.name.text === 'query' && /\.connection$/.test(node.expression.getText(source))) {
        assert.fail('Unreviewed direct protocol connection.query: ' + filename);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
});
