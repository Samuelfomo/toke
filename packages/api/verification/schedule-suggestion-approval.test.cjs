const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { Op, Transaction } = require('sequelize');

// Execute the actual service with an in-memory transactional database adapter.
// No server, tenant credentials or external database is used.
function load(relative, dependencies, now) {
  const filename = path.join(__dirname, '../src', relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  class Clock extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
  }
  vm.runInNewContext(
    output,
    {
      exports,
      Date: Clock,
      Intl,
      require(name) {
        assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
        return dependencies[name];
      },
    },
    { filename },
  );
  return exports;
}

const period = load('utils/schedule.suggestion.application-period.ts', {}, '2026-11-10T12:00:00Z');
const zone = 'Africa/Douala';
const now = new Date('2026-11-10T12:00:00Z');
const errorCode = (code) => (error) => error.code === code;

test('effective period protects today and the past; future suggestion keeps its start', () => {
  assert.equal(
    period.suggestionApplicationPeriod('2026-10-01', '2026-12-31', undefined, now, zone).from,
    '2026-11-11',
  );
  assert.equal(
    period.suggestionApplicationPeriod('2026-12-01', '2026-12-31', undefined, now, zone).from,
    '2026-12-01',
  );
  assert.equal(
    period.suggestionApplicationPeriod('2026-10-01', '2026-12-31', '2026-11-20', now, zone).from,
    '2026-11-20',
  );
});

test('Douala midnight and year changes are independent of server timezone', () => {
  assert.equal(
    period.suggestionApplicationPeriod(
      '2026-10-01',
      '2026-12-31',
      undefined,
      new Date('2026-11-10T23:30:00Z'),
      zone,
    ).from,
    '2026-11-12',
  );
  assert.equal(
    period.suggestionApplicationPeriod(
      '2026-12-01',
      '2027-01-31',
      undefined,
      new Date('2026-12-31T12:00:00Z'),
      zone,
    ).from,
    '2027-01-01',
  );
});

test('invalid, retroactive and outside dates are refused', () => {
  for (const value of [null, 20261112, '', '2026-02-30', '2026-13-01', '2026-11-12T00:00:00Z']) {
    assert.throws(
      () => period.suggestionApplicationPeriod('2026-10-01', '2026-12-31', value, now, zone),
      errorCode('SUGGESTION_EFFECTIVE_FROM_INVALID'),
    );
  }
  for (const value of ['2026-11-09', '2026-11-10', '2027-01-01']) {
    assert.throws(
      () => period.suggestionApplicationPeriod('2026-10-01', '2026-12-31', value, now, zone),
      errorCode('SUGGESTION_EFFECTIVE_FROM_OUT_OF_RANGE'),
    );
  }
  assert.throws(
    () => period.suggestionApplicationPeriod('2026-12-01', '2026-12-31', '2026-11-20', now, zone),
    errorCode('SUGGESTION_EFFECTIVE_FROM_OUT_OF_RANGE'),
  );
  assert.throws(
    () => period.suggestionApplicationPeriod('2026-10-01', '2026-11-10', undefined, now, zone),
    errorCode('SUGGESTION_PERIOD_EXPIRED'),
  );
});

function fixture({
  to = '2026-12-31',
  boundarySource,
  existingContinuation = false,
  missingPastTemplate = false,
  failInsert = false,
  openEnded = false,
} = {}) {
  let state = {
    suggestion: {
      id: 1,
      guid: 'suggestion',
      status: 'draft',
      period_from: '2026-10-01',
      period_to: to,
      manager: 2,
      tenant: 'tenant',
    },
    assignments: [
      {
        guid: 'old',
        family: 'USER',
        related: 'employee',
        active: true,
        deleted_at: null,
        start_date: '2026-09-01',
        end_date: '2027-01-31',
        tenant: 'tenant',
        session_template: { guid: 'old-template' },
      },
    ],
  };
  if (openEnded) state.assignments[0].end_date = null;
  if (existingContinuation)
    state.assignments.push({
      ...state.assignments[0],
      guid: 'continuation',
      start_date: '2026-11-11',
      end_date: '2026-11-11',
      continuation_of_guid: 'previous-day',
    });
  const schedule = {};
  for (
    let cursor = new Date('2026-10-01T00:00:00Z');
    cursor.toISOString().slice(0, 10) <= to;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const iso = cursor.toISOString().slice(0, 10);
    schedule[iso] = missingPastTemplate && iso < '2026-11-11' ? 'removed-template' : 'new-template';
  }
  const item = {
    guid: 'item',
    user: 3,
    schedule,
    reasons: { '2026-11-11': { source: boundarySource } },
  };
  let readOnly = false;
  const wrap = (value) => ({
    get: (key) => typeof key === 'string' ? value[key] : value,
    update: async (data) => {
      assert.equal(readOnly, false);
      Object.assign(value, data);
    },
  });
  const models = {
    SCHEDULE_SUGGESTION: {
      findOne: async ({ where }) => where.guid === state.suggestion.guid ? wrap(state.suggestion) : null,
    },
    SCHEDULE_SUGGESTION_ITEM: { findAll: async () => [wrap(item)] },
    USERS: { findAll: async () => [wrap({ id: 3, guid: 'employee' })] },
    SESSION_TEMPLATES: {
      findAll: async () => [
        wrap({
          id: 4,
          guid: 'new-template',
          name: 'new',
          definition: Object.fromEntries(
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => [
              day,
              [{ work: ['08:00', '16:00'] }],
            ]),
          ),
        }),
      ],
    },
    SCHEDULE_ASSIGNMENTS: {
      max: async () => 10,
      findAll: async ({ where }) =>
        state.assignments
          .filter(
            (a) =>
              a.active &&
              a.related === where.related &&
              a.start_date <= where.start_date[Op.lte] &&
              (a.end_date === null || a.end_date >= where[Op.or][1].end_date[Op.gte]),
          )
          .map(wrap),
      create: async (data) => {
        assert.equal(readOnly, false);
        if (failInsert) throw new Error('insertion failed');
        state.assignments.push(data);
      },
    },
  };
  const sequelize = {
    query: async (sql) => {
      if (sql === 'SET TRANSACTION READ ONLY') readOnly = true;
      else assert.equal(readOnly, false);
    },
    transaction: async (options, callback) => {
      const before = structuredClone(state);
      try {
        const result = await callback({ LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' } });
        assert.equal(readOnly, Boolean(options.readOnly));
        return result;
      } catch (error) {
        state = before;
        throw error;
      } finally {
        readOnly = false;
      }
    },
  };
  const service = load(
    'tools/schedule.suggestion.approval.service.ts',
    {
      sequelize: { Op, Transaction },
      '@toke/shared': {
        SAFamily: { USER: 'USER' },
        TimezoneConfigUtils: { getTimezone: () => zone, getCurrentTime: () => now },
      },
      '../tenant/database/db.initializer.js': {
        TableInitializer: { getModel: (name) => models[name] },
      },
      '../tenant/database/db.tenant-manager.js': {
        default: { getConnectionSync: () => sequelize },
      },
      '../utils/response.model.js': {
        tableName: Object.fromEntries(Object.keys(models).map((key) => [key, key])),
      },
      '../utils/schedule.suggestion.application-period.js': period,
    },
    now.toISOString(),
  );
  return {
    approve: (date) => service.approveScheduleSuggestion('suggestion', date),
    preview: (date, guid = 'suggestion') => service.previewScheduleSuggestionApproval(guid, date),
    state: () => state,
    item,
  };
}

test('October suggestion applied in November preserves history and the future suffix', async () => {
  const db = fixture({ missingPastTemplate: true });
  const result = await db.approve();
  const active = db.state().assignments.filter((a) => a.active);
  assert.equal(result.effectiveFrom, '2026-11-11');
  assert.equal(result.preservedFragmentCount, 2);
  assert.ok(
    active.some(
      (a) =>
        a.start_date === '2026-09-01' &&
        a.end_date === '2026-11-10' &&
        a.session_template.guid === 'old-template',
    ),
  );
  assert.ok(
    active.some(
      (a) =>
        a.start_date === '2026-11-11' &&
        a.end_date === '2026-12-31' &&
        a.session_template.guid === 'new-template',
    ),
  );
  assert.ok(
    active.some(
      (a) =>
        a.start_date === '2027-01-01' &&
        a.end_date === '2027-01-31' &&
        a.session_template.guid === 'old-template',
    ),
  );
  assert.equal(db.state().suggestion.status, 'approved');
  await assert.rejects(db.approve(), errorCode('SUGGESTION_ALREADY_RESOLVED'));
});

test('explicit future date is used for both replacement and preservation', async () => {
  const db = fixture();
  await db.approve('2026-11-20');
  assert.ok(
    db
      .state()
      .assignments.some(
        (a) =>
          a.active && a.end_date === '2026-11-19' && a.session_template.guid === 'old-template',
      ),
  );
});

test('open-ended existing assignment resumes after the suggestion period', async () => {
  const db = fixture({ openEnded: true });
  await db.approve();
  assert.ok(
    db
      .state()
      .assignments.some(
        (a) =>
          a.active &&
          a.start_date === '2027-01-01' &&
          a.end_date === null &&
          a.session_template.guid === 'old-template',
      ),
  );
});

test('rest days replace only future dates and authorized guard spillover is retained', async () => {
  const db = fixture();
  db.item.schedule['2026-11-11'] = null;
  db.item.reasons['2026-12-31'] = { source: 'GENERATED' };
  db.item.schedule['2027-01-01'] = 'new-template';
  db.item.reasons['2027-01-01'] = { source: 'GUARD_CONTINUATION', templateGuid: 'new-template' };
  db.item.schedule['2027-01-02'] = null;
  db.item.reasons['2027-01-02'] = { source: 'POST_GUARD_REST' };
  await db.approve();
  const active = db.state().assignments.filter((a) => a.active);
  assert.ok(
    active.some(
      (a) =>
        a.start_date === '2026-11-11' &&
        a.end_date === '2026-11-11' &&
        a.session_template.guid === 'planned-rest',
    ),
  );
  assert.ok(
    active.some(
      (a) =>
        a.start_date === '2027-01-02' &&
        a.end_date === '2027-01-02' &&
        a.session_template.guid === 'planned-rest',
    ),
  );
  assert.ok(
    active.some((a) => a.start_date === '2027-01-03' && a.session_template.guid === 'old-template'),
  );
});

test('expired suggestion leaves all assignments and status intact', async () => {
  const db = fixture({ to: '2026-10-31' });
  const before = structuredClone(db.state());
  await assert.rejects(db.approve(), errorCode('SUGGESTION_PERIOD_EXPIRED'));
  assert.deepEqual(db.state(), before);
});

test('cutting suggested guards, recovery or a published continuation is refused', async () => {
  for (const options of [
    { boundarySource: 'GUARD_CONTINUATION' },
    { boundarySource: 'POST_GUARD_REST' },
    { existingContinuation: true },
  ]) {
    const db = fixture(options);
    const before = structuredClone(db.state());
    await assert.rejects(db.approve(), errorCode('SUGGESTION_UNSAFE_APPLICATION_BOUNDARY'));
    assert.deepEqual(db.state(), before);
  }
});

test('an insertion failure rolls back history and suggestion approval', async () => {
  const db = fixture({ failInsert: true });
  const before = structuredClone(db.state());
  await assert.rejects(db.approve(), /insertion failed/);
  assert.deepEqual(db.state(), before);
});

test('approval preview is read-only for a valid date, an invalid date and an approved draft', async () => {
  const db = fixture();
  const before = structuredClone(db.state());
  const ready = await db.preview();
  assert.equal(ready.can_publish, true);
  assert.equal(ready.effective_from, '2026-11-11');
  assert.equal(ready.alerts.length, 0);
  const invalid = await db.preview('2026-02-30');
  assert.equal(invalid.can_publish, false);
  assert.equal(invalid.alerts[0].code, 'SUGGESTION_EFFECTIVE_FROM_INVALID');
  assert.equal(invalid.alerts[0].severity, 'BLOCKING');
  assert.deepEqual(db.state(), before);
  await db.approve();
  assert.equal((await db.preview()).alerts[0].code, 'SUGGESTION_ALREADY_RESOLVED');
});

test('preview reports a published continuation, skips a suggested rest and proposes the first valid date', async () => {
  const db = fixture({ existingContinuation: true });
  db.item.reasons['2026-11-12'] = { source: 'POST_GUARD_REST' };
  const before = structuredClone(db.state());
  const result = await db.preview();
  assert.equal(result.can_publish, false);
  assert.equal(result.effective_from, '2026-11-11');
  assert.equal(result.alerts[0].code, 'SUGGESTION_UNSAFE_APPLICATION_BOUNDARY');
  assert.equal(result.alerts[0].details.conflicts[0].guard_assignment_guid, 'previous-day');
  assert.equal(result.earliest_valid_date, '2026-11-13');
  assert.equal(result.suggested_actions[0].effective_from, '2026-11-13');
  assert.deepEqual(db.state(), before);
  assert.equal((await db.approve(result.earliest_valid_date)).effectiveFrom, '2026-11-13');
});

test('preview reports when there is no compatible date within the suggestion', async () => {
  const db = fixture({ to: '2026-11-11', existingContinuation: true });
  const result = await db.preview('2026-11-11');
  assert.equal(result.can_publish, false);
  assert.equal(result.earliest_valid_date, undefined);
  assert.equal(result.alerts[1].code, 'SUGGESTION_NO_COMPATIBLE_EFFECTIVE_DATE');
});

test('approval checks the latest published assignments after a successful preview', async () => {
  const db = fixture();
  assert.equal((await db.preview()).can_publish, true);
  db.state().assignments.push({
    ...db.state().assignments[0],
    guid: 'new-continuation',
    start_date: '2026-11-11',
    end_date: '2026-11-11',
    continuation_of_guid: 'new-guard',
  });
  const before = structuredClone(db.state());
  await assert.rejects(db.approve(), errorCode('SUGGESTION_UNSAFE_APPLICATION_BOUNDARY'));
  assert.deepEqual(db.state(), before);
});

test('BFF preview uses the same authorization middleware as approval and only the authenticated tenant', async () => {
  const tenantA = fixture();
  const tenantB = fixture();
  tenantB.state().suggestion.guid = 'other-tenant-suggestion';
  const routes = new Map();
  const router = {
    post: (route, ...handlers) => routes.set(route, handlers),
    get() {},
    patch() {},
    delete() {},
  };
  const authenticate = (req, res, next) => req.organization ? next() : (res.status = 401);
  const method = (_req, _res, next) => next();
  load('../../backend/src/routes/schedule.suggestion.route.ts', {
    express: { Router: () => router },
    '@toke/api/dist/middle/ensured-routes.js': { default: { post: () => method, get: () => method, patch: () => method, delete: () => method } },
    '../tools/tenant.config.js': { TenantConfig: { authenticate } },
    '../tools/bff.proxy.response.js': {
      tenantReference: (req) => req.organization,
      relayTenantApiResponse: (res, result) => { res.data = result; },
      handleBffRouteError: (res, error) => { res.status = error.status; },
    },
    '../services/schedule.suggestion.service.js': {
      ScheduleSuggestionService: {
        previewApproval: (tenant, guid, body) =>
          (tenant === 'A' ? tenantA : tenantB).preview(body.effective_from, guid),
      },
    },
  }, now.toISOString());

  const handlers = routes.get('/:guid/approval-preview');
  assert.equal(handlers[0], routes.get('/:guid/approve')[0]);
  async function request(organization, guid) {
    const req = { organization, params: { guid }, body: { tenant: 'B' } };
    const res = {};
    await handlers[0](req, res, () => handlers[1](req, res, () => handlers[2](req, res)));
    return res;
  }
  assert.equal((await request(undefined, 'suggestion')).status, 401);
  assert.equal((await request('A', 'other-tenant-suggestion')).status, 404);
  assert.equal((await request('A', 'suggestion')).data.can_publish, true);
  assert.equal((await request('B', 'other-tenant-suggestion')).data.can_publish, true);
});

test('preview warns when a published guard continuation remains beyond the replacement period', async () => {
  const db = fixture();
  db.state().assignments.push({
    ...db.state().assignments[0],
    guid: 'retained-continuation',
    start_date: '2027-01-01',
    end_date: '2027-01-01',
    continuation_of_guid: 'old',
  });
  const result = await db.preview();
  assert.equal(result.can_publish, true);
  assert.equal(result.alerts[0].severity, 'WARNING');
  assert.equal(result.alerts[0].details.affected_guards[0].continuation_date, '2027-01-01');
  await db.approve();
  assert.equal(db.state().assignments.find((a) => a.guid === 'retained-continuation').active, true);
});
