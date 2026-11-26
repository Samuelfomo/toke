const assert = require('node:assert/strict');
const fs = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const shared = require('@toke/shared');

const root = resolve(__dirname, '../../..');
function load(path, dependencies) {
  const filename = resolve(root, path);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { console, exports, require: name => {
    assert.ok(name in dependencies, name);
    return dependencies[name];
  } }, { filename });
  return exports;
}

test('manual create, update and manager list preserve saved template and open period', async () => {
  const routes = new Map();
  const router = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(method => [
    method, (path, ...handlers) => routes.set(`${method} ${path}`, handlers.at(-1)),
  ]));
  const records = new Map();
  const guid = '1000000000000001';
  const manager = '1000000000000002';
  const employee = '1000000000000003';
  const firstTemplate = '1000000000000004';
  const secondTemplate = '1000000000000005';
  const firstDate = '2026-12-01';
  const templates = new Map([[firstTemplate, { guid: firstTemplate }], [secondTemplate, { guid: secondTemplate }]]);
  const logs = [];
  class Database {
    async randomGuidGenerator() { return guid; }
    async insertOne(_table, row) {
      records.set(row.guid, { ...row, id: 1, deleted_at: null });
      return { id: 1 };
    }
    async updateOne(_table, changes, { id }) {
      const row = [...records.values()].find(candidate => candidate.id === id);
      if (!row) return 0;
      Object.assign(row, changes);
      return 1;
    }
    async findOne(_table, { guid: key }) { return records.get(key); }
    async findAll(_table, where) {
      return [...records.values()].filter(row => Object.entries(where).every(([key, value]) => row[key] === value));
    }
  }
  const AssignmentModel = load('packages/api/src/tenant/model/ScheduleAssignmentsModel.ts', {
    '@toke/shared': shared, sequelize: require('sequelize'), '../database/db.base.js': Database,
    '../../utils/response.model.js': { tableName: { SCHEDULE_ASSIGNMENTS: 'assignments' } },
  }).default;
  class Log {
    async save() { logs.push(this.template); }
    setNewTemplate(template) { this.template = template; return this; }
    setAssignmentId() { return this; }
    setPreviousTemplate() { return this; }
    setPreviousVersion() { return this; }
    setNewVersion() { return this; }
    setModifiedBy() { return this; }
    setOldCreator() { return this; }
    setModificationReason() { return this; }
    setChangedFields() { return this; }
  }
  class Template {
    static async _load(key) { return templates.get(key) ? new Template(key) : null; }
    static toObject(row) { return new Template(row.guid); }
    constructor(key) { this.guid = key; }
    getGuid() { return this.guid; }
    getId() { return 1; }
    getName() { return 'Service'; }
    getDefinition() { return {}; }
    getVersion() { return 1; }
    getSessionModel() { return 1; }
    isDefaultSessionTemplate() { return false; }
    async toJSON() { return { guid: this.guid }; }
  }
  const User = { async _load(key) {
    const actor = key === manager || key === 2;
    return { getFullName: () => 'Test', getId: () => actor ? 2 : 3, getGuid: () => actor ? manager : employee,
      isWorkforceMember: () => true, toJSON: () => ({ guid: actor ? manager : employee }) };
  } };
  const assignmentPath = 'packages/api/src/tenant/class/ScheduleAssignments.ts';
  const source = fs.readFileSync(resolve(root, assignmentPath), 'utf8');
  const imports = Object.fromEntries([...source.matchAll(/^import .* from '([^']+)';/gm)].map(([, name]) => [name, {}]));
  const Assignment = load(assignmentPath, {
    ...imports, '@toke/shared': shared,
    '../model/ScheduleAssignmentsModel.js': AssignmentModel,
    './ScheduleAssignmentsLog.js': Log,
    './SessionTemplates.js': Template,
    './User.js': User,
    '../../utils/response.model.js': {
      responseValue: { FULL: 'FULL' }, responseStructure: Object.fromEntries(
        ['GUID', 'TENANT', 'FAMILY', 'START_DATE', 'END_DATE', 'REASON', 'ACTIVE', 'RELATED',
          'SESSION_TEMPLATE', 'CREATED_BY', 'VERSION', 'CREATED_AT', 'UPDATED_AT', 'DELETED_AT', 'NAME']
          .map(key => [key, key.toLowerCase()]),
      ),
    },
  }).default;
  const routePath = 'packages/api/src/tenant/routes/schedule.assignments.route.ts';
  load(routePath, {
    express: { Router: () => router }, '@toke/shared': shared, sequelize: require('sequelize'),
    '../../middle/ensured-routes.js': { __esModule: true, default: new Proxy({}, { get: () => () => {} }) },
    '../../tools/response.js': {
      handleSuccess: (res, data) => Object.assign(res, { status: 200, data }),
      handleCreated: (res, data) => Object.assign(res, { status: 201, data }),
      handleError: (res, status, error) => Object.assign(res, { status, error }),
    },
    '../class/ScheduleAssignments.js': Assignment,
    '../class/SessionTemplates.js': Template,
    '../class/User.js': User,
    '../class/OrgHierarchy.js': { hasManagerRole: async () => true },
    '../../tools/revision.js': {}, '../../utils/response.model.js': {},
    '../../utils/view.validator.js': {}, '../class/Groups.js': {},
    '../../tools/schedule.assignment.adjustment.service.js': {},
    '../database/db.tenant-manager.js': { getTimezone: () => 'Africa/Douala' },
    '../../tools/schedule.assignment.manual.service.js': {
      ManualAssignmentError: class extends Error {},
      async createManualAssignment(assignment) {
        await assignment.save();
        return assignment.toJSON();
      },
    },
  });

  async function request(route, params, body) {
    const reply = {};
    await routes.get(route)({ params, body, tenant: { config: { reference: 'test-tenant' } } }, reply);
    return reply;
  }
  const { ScheduleAssignmentService: service } = load('packages/backend/src/services/schedule.assignment.service.ts', {
    '../tools/api.factory.js': {
      getApiClient: async reference => {
        assert.equal(reference, 'test-tenant');
        return { async request({ method, url, data }) {
          const [, , key, operation] = url.split('/');
          const route = method === 'POST' ? 'post /' : method === 'PUT' ? 'put /:guid' : 'get /:manager/list';
          if (method === 'GET') assert.equal(operation, 'list');
          const reply = await request(route, { guid: key, manager: key }, data);
          if (reply.status >= 400) throw { response: { status: reply.status, data: { error: reply.error } } };
          return { status: reply.status, data: { data: reply.data } };
        } };
      },
    },
  });
  const created = await service.saveScheduleAssignment('test-tenant', {
    related: employee, family: 'user', created_by: manager, session_template: firstTemplate,
    start_date: firstDate, end_date: '2026-12-06',
  });
  assert.equal(created.status, 201, JSON.stringify(created));
  const refused = await service.updatedScheduleAssignment('test-tenant', guid, { session_template: '1000000000000006' });
  assert.equal(refused.status, 404, JSON.stringify(refused));
  assert.equal(refused.response.code, shared.SCHEDULE_ASSIGNMENTS_CODES.SESSION_TEMPLATE_NOT_FOUND);
  assert.equal(records.get(guid).session_template.guid, firstTemplate);
  const updated = await service.updatedScheduleAssignment('test-tenant', guid, {
    session_template: secondTemplate, end_date: null,
  });
  assert.equal(updated.status, 200, JSON.stringify(updated));
  assert.equal(records.get(guid).end_date, null);
  assert.equal(logs[0].guid, secondTemplate);
  assert.equal(records.get(guid).version, 2);
  const listed = await service.listScheduleAssignments('test-tenant', manager);
  assert.equal(listed.status, 200, JSON.stringify(listed));
  assert.equal(listed.response.schedule_assignments.items[0].session_template.guid, secondTemplate);
  assert.equal(listed.response.schedule_assignments.items[0].end_date, null);
});
