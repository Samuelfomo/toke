const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function load(relativePath, dependencies) {
  const filename = path.join(__dirname, '../src', relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, structuredClone,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), name);
      return dependencies[name];
    },
  }, { filename });
  return exports;
}

const policy = {
  enabled: true, employee_guids: ['101', '102'], template_guids: ['201', '202'],
  anchor_date: '2026-11-30', shift_cadence_days: 1, weekend_rest: 'ALTERNATE_SAT_SUN',
};

test('configuration persists, hydrates and versions activation changes with existing fields', async () => {
  let row;
  class BaseModel {
    isNew() { return !this.getId(); }
    randomGuidGenerator() { return 'config'; }
    insertOne(_table, data) { row = { id: 1, ...data }; return 1; }
    findOne() { return row; }
    updateOne(_table, data) { row = { ...row, ...data }; return true; }
  }
  const model = load('tenant/model/PlanningSuggestionConfigModel.ts', {
    '@toke/shared': {},
    '../database/db.base.js': { default: BaseModel },
    '../../utils/response.model.js': { tableName: { PLANNING_SUGGESTION_CONFIG: 'config' } },
  });
  const { default: Config } = load('tenant/class/PlanningSuggestionConfig.ts', {
    '../model/PlanningSuggestionConfigModel.js': model,
    './User.js': { default: { _load: async () => null } },
  });

  const config = new Config().setName('Planning').setCreatedBy(1);
  assert.equal(config.getFixedAlternationPolicy(), null);
  assert.equal((await config.toJSON()).rules.fixed_alternation_policy, undefined);
  config.setFixedAlternationPolicy(policy);
  await config.save();
  assert.deepEqual(row.fixed_alternation_policy, policy);
  const loaded = new Config().hydrate(row);
  assert.deepEqual((await loaded.toJSON()).rules.fixed_alternation_policy, policy);
  assert.equal(loaded.getPolicySchemaVersion(), 2);
  loaded.setFixedAlternationPolicy({ ...policy, enabled: false });
  await loaded.save();
  assert.equal(row.version, 2);
  assert.equal(row.fixed_alternation_policy.enabled, false);
  assert.equal(row.min_rest_days_per_week, 1);
  loaded.setFixedAlternationPolicy(null);
  await loaded.save();
  assert.equal(row.version, 3);
  assert.equal(row.fixed_alternation_policy, null);
});

test('regeneration preserves a manual FIXED shift and rest with the pending policy', async () => {
  const shiftDate = '2026-12-01';
  const restDate = '2026-12-02';
  const manual = { source: 'MANUAL', manualLock: true };
  const rows = [
    { id: 1, guid: 'item-1', user: 11, schedule: { [shiftDate]: '202' }, reasons: { [shiftDate]: manual } },
    { id: 2, guid: 'item-2', user: 12, schedule: { [restDate]: null }, reasons: { [restDate]: manual } },
  ];
  const draft = { id: 1, guid: 'draft', manager: 5, config: 7, status: 'draft', period_from: shiftDate, period_to: restDate };
  const config = { id: 7, guid: 'config', active: true, version: 2, fixed_alternation_policy: policy };
  const wrap = row => ({ get: () => row, update: data => Object.assign(row, data) });
  const models = {
    SCHEDULE_SUGGESTION: { findOne: async () => wrap(draft) },
    SCHEDULE_SUGGESTION_ITEM: { findAll: async () => rows.map(wrap) },
    USERS: { findAll: async () => [{ id: 11, guid: '101' }, { id: 12, guid: '102' }].map(wrap), findOne: async () => wrap({ guid: 'manager' }) },
    EMPLOYEE_PLANNING_PROFILE: { findAll: async () => [11, 12].map(user => wrap({ user, planning_mode: 'FIXED' })) },
    PLANNING_SUGGESTION_REQUIREMENT: { findAll: async () => [] },
    SESSION_TEMPLATES: { findAll: async () => [wrap({ guid: '202', name: 'Matin', definition: {} })] },
    PLANNING_SUGGESTION_CONFIG: { findOne: async () => wrap(config) },
  };
  const { regenerateScheduleSuggestion } = load('utils/schedule.suggestion.regeneration.service.ts', {
    sequelize: { Op: { in: Symbol() }, Transaction: { ISOLATION_LEVELS: { SERIALIZABLE: 'SERIALIZABLE' } } },
    '../tenant/database/db.initializer.js': { TableInitializer: { getModel: name => models[name] } },
    '../tenant/database/db.tenant-manager.js': { default: { getConnectionSync: () => ({
      transaction: (_, callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }),
    }) } },
    './response.model.js': { tableName: Object.fromEntries(Object.keys(models).map(key => [key, key])) },
    './schedule.suggestion.generation.service.js': {
      SuggestionGenerationError: Error,
      async solveConfiguredSuggestion(_manager, _from, _to, _excluded, locks) {
        assert.equal(locks.length, 2);
        assert.equal(locks[0].templateGuid, '202');
        assert.equal(locks[0].requirementGuid, null);
        assert.equal(locks[1].templateGuid, null);
        return {
          config: { getId: () => 7 }, configGuid: config.guid, configVersion: config.version,
          solver: { solverVersion: 'fixture' }, employeeCount: 2,
          persistedDiagnostics: { fixedAlternation: { status: 'PENDING_SOLVER_SUPPORT', applied: false } },
          engineResult: { conformityScore: 100, items: ['101', '102'].map(userGuid => ({
            userGuid, schedule: { [shiftDate]: '201', [restDate]: '201' }, reasons: {},
          })) },
        };
      },
    },
  });
  const result = await regenerateScheduleSuggestion('draft');
  assert.equal(result.locked_cell_count, 2);
  assert.equal(rows[0].schedule[shiftDate], '202');
  assert.equal(rows[1].schedule[restDate], null);
  assert.equal(rows[0].reasons[shiftDate], manual);
  assert.equal(rows[1].reasons[restDate], manual);
  assert.equal(draft.diagnostics.fixedAlternation.applied, false);
});

test('config route validates tenant FIXED references on activation and allows disabling', async () => {
  const routes = new Map();
  const router = {
    get() {}, post() {}, delete() {}, patch() {},
    put(route, ...handlers) { routes.set(route, handlers.at(-1)); },
  };
  const lookup = new Map([
    ['101', { id: 11, template: '201', mode: 'FIXED' }],
    ['102', { id: 12, template: '202', mode: 'ROTATING' }],
  ]);
  let saved = null;
  const config = {
    setFixedAlternationPolicy(value) { saved = value; },
    async save() {},
    async toJSON() { return { rules: { fixed_alternation_policy: saved } }; },
  };
  const shared = {
    HttpStatus: { BAD_REQUEST: 400, INTERNAL_ERROR: 500 },
    validatePlanningSuggestionConfigGuid: value => value,
    validatePlanningSuggestionConfigUpdate: () => ({}),
    UsersValidationUtils: { validateGuid: value => /^\d+$/.test(value) },
  };
  const alternation = load('utils/planning.fixed.alternation.ts', { '@toke/shared': shared });
  load('tenant/routes/planning.suggestion.config.route.ts', {
    express: { Router: () => router },
    '@toke/shared': shared,
    '../../middle/ensured-routes.js': { default: { get() {}, post() {}, put() {}, delete() {}, patch() {} } },
    '../../tools/response.js': { default: {
      handleError(res, status, error) { Object.assign(res, { status, error }); },
      handleSuccess(res, data) { Object.assign(res, { status: 200, data }); },
    } },
    '../class/PlanningSuggestionConfig.js': { default: { _load: async () => config } },
    '../class/User.js': { default: { _load: async guid => {
      const row = lookup.get(guid);
      return row ? { getId: () => row.id } : null;
    } } },
    '../class/EmployeePlanningProfile.js': { default: { _loadByUser: async id => {
      const row = [...lookup.values()].find(candidate => candidate.id === id);
      return row ? {
        isActive: () => true, isFixed: () => row.mode === 'FIXED',
        getFixedSessionTemplateObj: async () => ({ getGuid: () => row.template }),
      } : null;
    } } },
    '../../utils/planning.fixed.alternation.js': alternation,
  });

  async function update(value) {
    const res = {};
    await routes.get('/:guid')({ params: { guid: 'config' }, body: { fixed_alternation_policy: value } }, res);
    return res;
  }
  assert.equal((await update(policy)).error.code, 'PLANNING_FIXED_ALTERNATION_INVALID');
  lookup.get('102').mode = 'FIXED';
  assert.equal((await update({ ...policy, employee_guids: ['101', '999'] })).status, 400);
  assert.equal((await update({ ...policy, template_guids: ['201', '999'] })).status, 400);
  assert.equal((await update(policy)).data.planning_suggestion_config.rules.fixed_alternation_policy.enabled, true);
  lookup.delete('102');
  assert.equal((await update({ ...policy, enabled: false })).status, 200);
  assert.equal(saved.enabled, false);
});
