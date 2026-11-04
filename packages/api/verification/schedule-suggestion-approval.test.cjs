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
  const wrap = (value) => ({
    get: () => value,
    update: async (data) => Object.assign(value, data),
  });
  const models = {
    SCHEDULE_SUGGESTION: { findOne: async () => wrap(state.suggestion) },
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
        if (failInsert) throw new Error('insertion failed');
        state.assignments.push(data);
      },
    },
  };
  const sequelize = {
    query: async () => {},
    transaction: async (_, callback) => {
      const before = structuredClone(state);
      try {
        return await callback({ LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' } });
      } catch (error) {
        state = before;
        throw error;
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
