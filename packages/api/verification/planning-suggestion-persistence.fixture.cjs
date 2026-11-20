const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync, mkdtempSync, mkdirSync, rmSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const sequelize = require('sequelize');
const pg = require('pg');

function load(file, dependencies, process) {
  const path = join(__dirname, '../src', file);
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  runInNewContext(outputText, { exports, console, process, structuredClone, require: name => dependencies[name] ?? {} }, { filename: path });
  return exports;
}

test('real PostgreSQL duplicate and item validation map to safe errors and preserve atomicity', { timeout: 30_000 }, async () => {
  const root = mkdtempSync('/tmp/toke-suggestion-pg-');
  const socket = join(root, 'sock');
  const data = join(root, 'db');
  mkdirSync(socket, { mode: 0o700 });
  const port = 15477;
  const run = (file, args) => {
    const result = spawnSync(file, args, {
      env: { PATH: process.env.PATH, LANG: 'C' }, encoding: 'utf8', timeout: 10_000,
    });
    assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  };
  let db;
  let started = false;
  try {
    run('initdb', ['-D', data, '-U', 'fixture', '-A', 'trust', '--no-locale']);
    run('pg_ctl', ['-D', data, '-l', join(root, 'postgres.log'), '-o', `-h '' -k '${socket}' -p ${port}`, '-w', 'start']);
    started = true;
    class LocalClient extends pg.Client {
      constructor(config) {
        assert.equal(config.host, socket);
        assert.equal(config.port, port);
        assert.equal(config.database, 'postgres');
        assert.equal(config.connectionString, undefined);
        super(config);
      }
    }
    db = new sequelize.Sequelize('postgres', 'fixture', '', {
      dialect: 'postgres', host: socket, port, logging: false,
      dialectModule: { ...pg, Client: LocalClient },
    });
    const tableName = {
      SCHEDULE_SUGGESTION: 'suggestions', SCHEDULE_SUGGESTION_ITEM: 'items',
      USERS: 'users_fixture', PLANNING_SUGGESTION_CONFIG: 'config_fixture',
    };
    const modules = { sequelize, '../../../utils/response.model.js': { tableName } };
    const models = {};
    for (const reference of [tableName.USERS, tableName.PLANNING_SUGGESTION_CONFIG]) {
      await db.query(`CREATE TABLE "${reference}" (id integer PRIMARY KEY)`);
      await db.query(`INSERT INTO "${reference}" VALUES (1)`);
    }
    let next = 0;
    class BaseModel {
      async randomGuidGenerator() { return String(++next); }
      async insertOne(table, values, options) {
        return (await models[table].create(values, options)).get();
      }
    }
    const classes = {};
    for (const [name, tableSuffix, table] of [
      ['ScheduleSuggestion', '', tableName.SCHEDULE_SUGGESTION],
      ['ScheduleSuggestionItem', '.item', tableName.SCHEDULE_SUGGESTION_ITEM],
    ]) {
      const definition = load(`tenant/database/data/schedule.suggestion${tableSuffix}.db.ts`, modules)[`${name}DbStructure`];
      models[table] = db.define(table, definition.attributes, definition.options);
      await models[table].sync();
      const model = load(`tenant/model/${name}Model.ts`, {
        '../database/db.base.js': { default: BaseModel }, '../../utils/response.model.js': { tableName },
      });
      classes[`../tenant/class/${name}.js`] = load(`tenant/class/${name}.ts`, {
        [`../model/${name}Model.js`]: model,
      });
    }
    const { persistConfiguredSuggestion } = load('utils/schedule.suggestion.generation.service.ts', {
      sequelize, ...classes,
      '../tenant/database/db.tenant-manager.js': { default: { getConnectionSync: () => db, getCurrentTenant: () => 'fixture' } },
      '../tenant/class/User.js': { default: { _load: async () => ({ getId: () => 1 }) } },
    });
    const diagnostics = { fixedAlternation: { status: 'NOT_APPLICABLE', applied: false, reason: 'EMPLOYEE_EXCLUDED' } };
    const item = { userGuid: 'camille', schedule: { '2026-11-23': 'morning' }, reasons: {} };
    const solved = {
      manager: { getId: () => 1, getTenant: () => '' }, config: { getId: () => 1 },
      historyWeeks: 8, solver: { solverVersion: 'fixture' }, persistedDiagnostics: diagnostics,
      engineResult: { conformityScore: 100, items: [item] },
    };
    await persistConfiguredSuggestion(solved, '2026-11-23', '2026-12-06');
    const saved = await models.suggestions.findOne();
    assert.deepEqual(saved.diagnostics, diagnostics);
    assert.equal(saved.tenant, 'fixture');
    try {
      await models.suggestions.create({ ...saved.get(), id: undefined, guid: 'different' });
      assert.fail('expected actual PostgreSQL duplicate index');
    } catch (error) {
      assert.equal(error.name, 'SequelizeUniqueConstraintError');
      assert.equal(error.message, 'Validation error');
      assert.equal(error.parent.constraint, 'unique_manager_draft_suggestion_period');
    }
    await assert.rejects(persistConfiguredSuggestion(solved, '2026-11-23', '2026-12-06'), {
      code: 'SUGGESTION_DRAFT_ALREADY_EXISTS', status: 409,
    });
    solved.engineResult.items.push({ ...item, schedule: { invalid: 'morning' } });
    await assert.rejects(persistConfiguredSuggestion(solved, '2026-12-07', '2026-12-20'), error =>
      error.code === 'SUGGESTION_PERSISTENCE_VALIDATION_FAILED' &&
      error.details.stage === 'item' && error.details.fields.includes('schedule'));
    assert.equal(await models.suggestions.count(), 1);
    assert.equal(await models.items.count(), 1);
  } finally {
    await db?.close();
    if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
    rmSync(root, { recursive: true, force: true });
  }
});

exports.loadGeneration = function loadGeneration(endpoint, input, policy) {
  const moduleAt = (name) => require('../src/utils/' + name + '.ts');
  const configModel = load('tenant/model/PlanningSuggestionConfigModel.ts', {
    '../database/db.base.js': { default: class {} }, '../../utils/response.model.js': { tableName: {} },
  });
  const { default: Config } = load('tenant/class/PlanningSuggestionConfig.ts', {
    '../model/PlanningSuggestionConfigModel.js': configModel,
  });
  const config = new Config().hydrate({
    id: 1, guid: 'config', min_rest_days_per_week: 1, solver_type: 'ORTOOLS',
    fixed_alternation_policy: policy, fallback_to_greedy: false,
  }).setMaxConsecutiveWorkDays(null);
  const getter = values => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, () => value]));
  const users = input.employees.map((employee, index) =>
    getter({ getGuid: employee.guid, getId: index + 2, getFullName: employee.name }));
  const profiles = input.employees.map((employee, index) => getter({
    getUser: index + 2, getUserObj: users[index], isExcluded: false, isFixed: true,
    getPlanningMode: 'FIXED', getRotationOrder: employee.rotationOrder,
    getFixedRestDayMode: employee.fixedRestDayMode, getMaxWeeklyMinutes: null,
    getFixedSessionTemplateObj: getter({
      getGuid: employee.fixedTemplate.guid, getName: employee.fixedTemplate.name,
      getDefinition: employee.fixedTemplate.definition,
    }),
  }));
  const requirement = getter({
    getGuid: 'r', getSessionTemplateObj: profiles[0].getFixedSessionTemplateObj(), getDayOfWeek: 'Mon',
    isGuard: false, getServiceType: 'STANDARD', getMinEmployees: 0, getTargetEmployees: 0,
    getMaxEmployees: 0, getPriority: 1, getAllocationMode: 'EXACT', getContinuationDayOffset: 0,
    getCreditedMinutes: null, getEligibilityPolicy: { planning_modes: ['ROTATING'], guard_pool_relation: 'ANY' },
  });
  const dependencies = Object.fromEntries([
    'suggestion.engine', 'solver/ortools.planning.solver', 'solver/planning.solver.factory',
    'solver/planning.solver', 'planning.preflight.validation.service', 'planning.fixed.alternation',
    'planning.horizon', 'planning.rolling.horizon',
  ].map(name => ['./' + name + '.js', moduleAt(name)]));
  return load('utils/schedule.suggestion.generation.service.ts', {
    ...dependencies, '@toke/shared': { UsersValidationUtils: { validateGuid: value => typeof value === 'string' } },
    '../tenant/class/User.js': { default: { _load: async () => getter({ getId: 1 }) } },
    '../tenant/class/OrgHierarchy.js': { default: { hasManagerRole: async () => true, getAllTeamMembers: async () => ({ all_employees_flat: users }) } },
    '../tenant/class/PlanningSuggestionConfig.js': { default: { _loadActive: async () => config } },
    '../tenant/class/PlanningSuggestionRequirement.js': { default: { _listByConfig: async () => [requirement] } },
    '../tenant/class/EmployeePlanningProfile.js': { default: { _listActive: async () => profiles } },
    './planning.history.analysis.service.js': { analyzePlanningHistory: async () => ({ boundaryGuardFacts: [], fairness: [] }) },
  }, { env: { PLANNING_ORTOOLS_URL: endpoint } }).solveConfiguredSuggestion;
};
