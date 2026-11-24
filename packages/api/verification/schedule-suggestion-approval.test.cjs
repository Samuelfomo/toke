const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { Op, Transaction } = require('sequelize');

// Execute the actual service with an in-memory transactional database adapter.
// No server, tenant credentials or external database is used.
function load(relative, dependencies, now, env = process.env) {
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
      process: { env },
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
  if (existingContinuation) {
    state.assignments[0].end_date = '2026-11-09';
    state.assignments.push(
      { ...state.assignments[0], guid: 'previous-day', start_date: '2026-11-10', end_date: '2026-11-10' },
      { ...state.assignments[0], guid: 'continuation', start_date: '2026-11-11', end_date: '2026-11-11', continuation_of_guid: 'previous-day' },
    );
  }
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
    PLANNING_SUGGESTION_CONFIG: { findOne: async () => state.config ? wrap(state.config) : null },
    PLANNING_SUGGESTION_REQUIREMENT: { findAll: async () => (state.requirements ?? []).map(wrap) },
    EMPLOYEE_PLANNING_PROFILE: { findAll: async () => [wrap({ user: 3, active: true, planning_mode: 'ROTATING' })] },
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
              state.templateHours?.[day] ?? [{ work: ['08:00', '16:00'] }],
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
      'node:crypto': require('node:crypto'),
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
      '../utils/schedule.suggestion.bulk-edit.service.js': {
        restGapViolations: load('utils/schedule.suggestion.bulk-edit.service.ts', {
          sequelize: { Op, Transaction }, '@toke/shared': {},
          '../tenant/database/db.initializer.js': {}, '../tenant/database/db.tenant-manager.js': {},
          './response.model.js': {}, './schedule.suggestion.regeneration.service.js': {},
          './schedule.suggestion.application-period.js': period,
        }, now.toISOString()).restGapViolations,
        eligibilityForRequirement: (requirement, profile) => Boolean(profile?.active &&
          (requirement.eligibility_policy?.planning_modes ?? ['FIXED', 'ROTATING']).includes(profile.planning_mode)),
      },
    },
    now.toISOString(),
  );
  return {
    approve: (date, confirmation, actor = { id: 2, guid: 'manager', kind: 'MANAGER_SESSION' }) => service.approveScheduleSuggestion('suggestion', date, actor, confirmation),
    preview: (date, guid = 'suggestion', actor = { id: 2, guid: 'manager', kind: 'MANAGER_SESSION' }) => service.previewScheduleSuggestionApproval(guid, date, actor),
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

test('cutting suggested guards, recovery or a published continuation requires explicit confirmation', async () => {
  for (const options of [
    { boundarySource: 'GUARD_CONTINUATION' },
    { boundarySource: 'POST_GUARD_REST' },
    { existingContinuation: true },
  ]) {
    const db = fixture(options);
    const before = structuredClone(db.state());
    await assert.rejects(db.approve(), errorCode('SUGGESTION_APPROVAL_CONFIRMATION_REQUIRED'));
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

test('confirmed publication replaces a continuation and applies the suggested rest without touching the historical start', async () => {
  const db = fixture({ existingContinuation: true });
  db.item.schedule['2026-11-12'] = null;
  db.item.reasons['2026-11-12'] = { source: 'POST_GUARD_REST' };
  const before = structuredClone(db.state());
  const result = await db.preview();
  assert.equal(result.can_publish, true);
  assert.equal(result.effective_from, '2026-11-11');
  const guard = result.alerts.find(alert => alert.code === 'SUGGESTION_PUBLISHED_GUARD_IMPACT');
  assert.equal(guard.details.guard.guid, 'previous-day');
  assert.equal(result.earliest_valid_date, '2026-11-13');
  assert.deepEqual(db.state(), before);
  const approval = await db.approve(result.effective_from, { token: result.confirmation_token, reason: 'Couverture maintenue' });
  assert.equal(approval.effectiveFrom, '2026-11-11');
  const assignments = db.state().assignments.filter(row => row.active);
  assert.equal(assignments.filter(row => row.start_date <= '2026-11-11' && row.end_date >= '2026-11-11').length, 1);
  assert.equal(db.state().assignments.find(row => row.guid === 'continuation').active, false);
  assert.equal(assignments.find(row => row.start_date === '2026-11-11').session_template.guid, 'new-template');
  assert.equal(assignments.find(row => row.start_date === '2026-11-12').session_template.guid, 'planned-rest');
  const historicalStart = assignments.find(row => row.guid === 'previous-day');
  assert.equal(historicalStart.active, true);
  assert.equal(historicalStart.session_template.guid, 'old-template');
  assert.deepEqual(JSON.parse(JSON.stringify(historicalStart.session_template.publication_guard_start)),
    { date: '2026-11-10', former_continuation_guid: 'continuation' });
  assert.equal(db.state().suggestion.diagnostics.publication.exceptional, true);
  assert.equal(db.state().suggestion.diagnostics.publication.actor_guid, 'manager');
  assert.equal(db.state().suggestion.diagnostics.publication.reason, 'Couverture maintenue');
});

test('confirmation replaces the published continuation even on the last date', async () => {
  const db = fixture({ to: '2026-11-11', existingContinuation: true });
  const result = await db.preview('2026-11-11');
  assert.equal(result.can_publish, true);
  assert.equal(result.earliest_valid_date, undefined);
  const published = await db.approve('2026-11-11', { token: result.confirmation_token });
  assert.equal(published.createdCount, 1);
  assert.equal(published.deactivatedCount, 1);
});

test('rechecks current draft after edits and rejects confirmation for another plan', async () => {
  const db = fixture({ existingContinuation: true });
  const first = await db.preview();
  db.item.schedule['2026-11-14'] = null;
  const revised = await db.preview();
  assert.notEqual(revised.confirmation_token, first.confirmation_token);
  const before = structuredClone(db.state());
  await assert.rejects(db.approve(undefined, { token: first.confirmation_token }),
    errorCode('SUGGESTION_APPROVAL_CONFIRMATION_REQUIRED'));
  assert.deepEqual(db.state(), before);
  await db.approve(undefined, { token: revised.confirmation_token });
  assert.equal(db.item.schedule['2026-11-14'], null);
});

test('refuses another manager and classifies coverage as an acceptable business warning', async () => {
  const db = fixture();
  const foreign = { id: 9, guid: 'other' };
  await assert.rejects(db.preview(undefined, 'suggestion', foreign), errorCode('SUGGESTION_NOT_FOUND'));
  await assert.rejects(db.approve(undefined, undefined, foreign), errorCode('SUGGESTION_NOT_FOUND'));
  db.state().suggestion.diagnostics = { coverage: [{
    status: 'BELOW_MINIMUM', date: '2026-11-11', requirementGuid: 'need', minimum: 3, target: 3, assigned: 2,
  }] };
  const preview = await db.preview();
  assert.equal(preview.alerts[0].severity, 'WARNING');
  assert.equal(preview.alerts[0].details.requirement_guid, 'need');
  await assert.rejects(db.approve(), errorCode('SUGGESTION_APPROVAL_CONFIRMATION_REQUIRED'));
  await db.approve(undefined, { token: preview.confirmation_token });
});

test('BFF preview uses the same authorization middleware as approval and only the authenticated tenant', async () => {
  const tenantA = fixture();
  const tenantB = fixture();
  tenantB.state().suggestion.guid = 'other-tenant-suggestion';
  const routes = new Map();
  const forwarded = [];
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
        previewApproval: (tenant, guid, body, credentials) => {
          forwarded.push({ tenant, credentials });
          return (tenant === 'A' ? tenantA : tenantB).preview(body.effective_from, guid);
        },
        approve: (tenant, guid, body, credentials) => {
          forwarded.push({ tenant, credentials });
          return { guid };
        },
      },
    },
  }, now.toISOString());

  const handlers = routes.get('/:guid/approval-preview');
  assert.equal(handlers[0], routes.get('/:guid/approve')[0]);
  async function request(organization, guid, options = {}) {
    const chain = routes.get(options.route ?? '/:guid/approval-preview');
    const req = {
      organization, params: { guid }, body: { tenant: 'B' },
      header: (name) => options.headers?.[name],
    };
    const res = { locals: options.verified ? { integratorDelegation: { subdomain: 'pharmacy.test' } } : {} };
    await chain[0](req, res, () => chain[1](req, res, () => chain[2](req, res)));
    return res;
  }
  assert.equal((await request(undefined, 'suggestion')).status, 401);
  assert.equal((await request('A', 'other-tenant-suggestion')).status, 404);
  assert.equal((await request('A', 'suggestion')).data.can_publish, true);
  assert.equal((await request('B', 'other-tenant-suggestion')).data.can_publish, true);
  const direct = { authorization: 'Bearer manager.session', 'x-toke-integrator-session': 'forged' };
  await request('A', 'suggestion', { route: '/:guid/approve', headers: direct });
  assert.deepEqual({ ...forwarded.at(-1).credentials }, { 'x-toke-user-session': 'manager.session' });

  const delegated = { authorization: 'Bearer delegated-token', 'x-integrator-context': 'verified-context' };
  await request('A', 'suggestion', { headers: delegated });
  assert.deepEqual({ ...forwarded.at(-1).credentials }, {});
  for (const route of ['/:guid/approval-preview', '/:guid/approve']) {
    await request('A', 'suggestion', { route, headers: delegated, verified: true });
    assert.equal(forwarded.at(-1).tenant, 'A');
    assert.deepEqual({ ...forwarded.at(-1).credentials }, {
      'x-toke-integrator-session': 'delegated-token',
      'x-integrator-context': 'verified-context',
    });
  }
});

test('preview warns when a published guard continuation remains beyond the replacement period', async () => {
  const db = fixture();
  db.state().assignments[0].end_date = '2026-12-30';
  db.state().assignments.push({
    ...db.state().assignments[0],
    guid: 'retained-guard', start_date: '2026-12-31', end_date: '2026-12-31',
  }, {
    ...db.state().assignments[0],
    guid: 'retained-continuation', start_date: '2027-01-01', end_date: '2027-01-01',
    continuation_of_guid: 'retained-guard',
  });
  const result = await db.preview();
  assert.equal(result.can_publish, true);
  assert.equal(result.alerts[0].severity, 'WARNING');
  assert.equal(result.alerts[0].details.continuation.date, '2027-01-01');
  await db.approve(undefined, { token: result.confirmation_token });
  assert.equal(db.state().assignments.find(a => a.guid === 'retained-guard').active, false);
  const continuation = db.state().assignments.find(a => a.guid === 'retained-continuation');
  assert.equal(continuation.active, true);
  assert.equal(continuation.continuation_of_guid, null);
  assert.equal(continuation.start_date, '2027-01-01');
});


test('reverification uses the current coverage requirement and preserves edits to the draft', async () => {
  const db = fixture();
  db.state().suggestion.config = 30;
  db.state().requirements = [{
    id: 8, guid: 'need', session_template: 4, day_of_week: 'Wed',
    min_employees: 2, target_employees: 2, allocation_mode: 'EXACT',
  }];
  const warning = await db.preview();
  assert.ok(warning.alerts.some(alert => alert.code === 'SUGGESTION_COVERAGE_WARNING'));
  db.state().requirements[0].target_employees = 1;
  db.item.schedule['2026-11-14'] = null;
  const corrected = await db.preview();
  assert.equal(corrected.alerts.length, 0);
  assert.equal(corrected.confirmation_token, undefined);
  await db.approve();
  assert.equal(db.item.schedule['2026-11-14'], null);
});

test('overlapping published hours on a future date are replaced after confirmation', async () => {
  const db = fixture({ existingContinuation: true });
  const day = { Wed: [{ work: ['06:00', '10:00'] }] };
  const tail = db.state().assignments.find(row => row.guid === 'continuation');
  tail.session_template = { guid: 'released', definition: day };
  db.state().assignments.push({
    ...tail, continuation_of_guid: null, guid: 'overlap',
  });
  const before = structuredClone(db.state());
  const preview = await db.preview();
  assert.equal(preview.can_publish, true);
  assert.ok(preview.alerts.some(alert => alert.code === 'SUGGESTION_PUBLISHED_HOURS_OVERLAP'));
  assert.deepEqual(db.state(), before);
  await db.approve(undefined, { token: preview.confirmation_token });
  const applied = db.state().assignments.filter(row => row.active && row.start_date === '2026-11-11');
  assert.equal(applied.length, 1);
  assert.equal(applied[0].session_template.guid, 'new-template');
});

test('a night shift is clipped exactly at midnight without changing earlier weekday blocks', async () => {
  const db = fixture();
  const historical = db.state().assignments[0];
  historical.created_by = 3;
  historical.session_template = {
    guid: 'night', definition: { Tue: [{ work: ['20:00', '08:00'], pause: ['23:30', '00:30'] }] },
  };
  const preview = await db.preview();
  assert.equal(preview.impact.truncated_overnight_assignments, 1);
  assert.ok(preview.alerts.some(alert => alert.code === 'SUGGESTION_OVERNIGHT_ASSIGNMENT_TRUNCATED'));
  await db.approve(undefined, { token: preview.confirmation_token });
  const prefix = db.state().assignments.find(row => row.guid === 'old');
  assert.equal(prefix.end_date, '2026-11-09');
  assert.equal(prefix.session_template.definition.Tue[0].work[1], '08:00');
  const lastDay = db.state().assignments.find(row => row.start_date === '2026-11-10');
  assert.equal(lastDay.session_template.definition.Tue[0].work[1], '24:00');
  assert.equal(lastDay.session_template.definition.Tue[0].pause[1], '24:00');
  assert.equal(lastDay.created_by, 3);
});

test('actual overlap between approved shifts is a warning and both dates are applied', async () => {
  const db = fixture({ to: '2026-11-12' });
  db.state().templateHours = {
    Wed: [{ work: ['20:00', '09:00'] }],
    Thu: [{ work: ['08:00', '16:00'] }],
  };
  const result = await db.preview();
  assert.ok(result.alerts.some(alert => alert.code === 'SUGGESTION_PUBLICATION_HOURS_OVERLAP' &&
    alert.details.date === '2026-11-12'));
  await db.approve(undefined, { token: result.confirmation_token });
  const active = db.state().assignments.filter(row => row.active && row.session_template.guid === 'new-template');
  assert.equal(active.length, 1);
  assert.equal(active[0].start_date, '2026-11-11');
  assert.equal(active[0].end_date, '2026-11-12');
});

test('a leading continuation is published without an incoherent historical link', async () => {
  const db = fixture({ existingContinuation: true });
  db.item.reasons['2026-11-11'] = { source: 'GUARD_CONTINUATION', templateGuid: 'new-template' };
  const preview = await db.preview();
  assert.ok(preview.alerts.some(alert => alert.code === 'SUGGESTION_GUARD_CONTINUITY_WARNING'));
  await db.approve(undefined, { token: preview.confirmation_token });
  const applied = db.state().assignments.find(row => row.active && row.start_date === '2026-11-11');
  assert.equal(applied.session_template.guid, 'new-template');
  assert.equal(applied.continuation_of_guid, null);
});

test('a verified historical start can keep its link to the replacement continuation', async () => {
  const db = fixture({ existingContinuation: true, missingPastTemplate: true });
  const parent = db.state().assignments.find(row => row.guid === 'previous-day');
  parent.session_template = { guid: 'removed-template', definition: { Tue: [{ work: ['20:00', '23:59'] }] } };
  const tail = db.state().assignments.find(row => row.guid === 'continuation');
  tail.session_template = { guid: 'new-template', definition: { Wed: [{ work: ['08:00', '16:00'] }] } };
  db.item.reasons['2026-11-11'] = { source: 'GUARD_CONTINUATION', templateGuid: 'new-template' };
  const preview = await db.preview();
  await db.approve(undefined, { token: preview.confirmation_token });
  const applied = db.state().assignments.find(row => row.active && row.start_date === '2026-11-11');
  assert.equal(applied.continuation_of_guid, 'previous-day');
});

test('tenant publication routes require a verified active manager or a verified delegation of this tenant', async () => {
  const handlers = new Map();
  let grantManager = true;
  let delegatedTenant = 'pharmacy.test';
  let timezone = 'Africa/Douala';
  let delegatedReference = '1001';
  let rejectDelegation = false;
  let actingUserId = 2;
  const env = {
    USER_SESSION_MASTER_URL: 'https://master.test',
    USER_SESSION_SERVICE_KEY: 'signed-service-key',
    USER_SESSION_SERVICE_SECRET: 'signed-service-secret',
  };
  const router = {
    post: (route, ...chain) => handlers.set(route, chain.at(-1)),
    get() {}, patch() {}, delete() {},
  };
  const method = () => () => {};
  const success = (res, result) => { res.data = result; };
  const error = (res, status, result) => { res.status = status; res.error = result; };
  let snapshot = fixture();
  const approval = load('tools/schedule.suggestion.approval.service.ts', {
    'node:crypto': require('node:crypto'),
    sequelize: { Op, Transaction },
    '@toke/shared': {},
    '../tenant/database/db.initializer.js': {},
    '../tenant/database/db.tenant-manager.js': { default: {} },
    '../utils/response.model.js': {},
    '../utils/schedule.suggestion.application-period.js': period,
    '../utils/schedule.suggestion.bulk-edit.service.js': {},
  }, now.toISOString());
  load('tenant/routes/schedule.suggestion.route.ts', {
    express: { Router: () => router },
    '@toke/shared': { UsersValidationUtils: { validateGuid: () => true }, HttpStatus: { BAD_REQUEST: 400, INTERNAL_ERROR: 500 } },
    '../../middle/ensured-routes.js': { default: { post: method, get: method, patch: method, delete: method } },
    '../../tools/response.js': { default: { handleSuccess: success, handleError: error } },
    '../class/ScheduleSuggestion.js': {},
    '../class/ScheduleSuggestionItem.js': {},
    '../class/User.js': { default: { _load: async () => ({ getId: () => actingUserId, isActive: () => true }) } },
    '../class/OrgHierarchy.js': { default: { hasManagerRole: async () => grantManager } },
    '../database/db.tenant-manager.js': { default: { getCurrentTenant: () => 'pharmacy.test' } },
    '../../utils/axios.config.js': {
      createApiClient: (url, secret, key) => {
        assert.equal(url, env.USER_SESSION_MASTER_URL);
        assert.equal(secret, env.USER_SESSION_SERVICE_SECRET);
        assert.equal(key, env.USER_SESSION_SERVICE_KEY);
        return {
          get: async (path, options) => {
            assert.equal(options.maxRedirects, 0);
            if (path.startsWith('/tenant/')) return { data: { success: true, data: { timezone } } };
            assert.equal(path, '/integrator/context/' + 'b'.repeat(43));
            assert.equal(options.headers.Authorization, 'Bearer actor-token');
            if (rejectDelegation) throw { response: { status: 401 } };
            return { data: { subdomain: delegatedTenant, tenantGuid: delegatedReference, userGuid: 'manager' } };
          },
        };
      },
    },
    '../../tools/user-session.client.js': { sessionClientFromEnvironment: () => ({
      verify: async (_token, _tenant, subdomain) => {
        assert.equal(subdomain, 'pharmacy.test');
        return { userGuid: 'manager' };
      },
    }) },
    '../../tools/user-session.authority.js': { SessionError: Error },
    '../../utils/schedule.suggestion.generation.service.js': {},
    '../../utils/response.model.js': {},
    '../../tools/schedule.suggestion.approval.service.js': {
      ...approval,
      previewScheduleSuggestionApproval: (guid, date, actor) => snapshot.preview(date, guid, actor),
      approveScheduleSuggestion: (_guid, date, actor, confirmation) => snapshot.approve(date, confirmation, actor),
    },
    '../../utils/schedule.suggestion.bulk-edit.service.js': {},
    '../../utils/schedule.suggestion.regeneration.service.js': {},
    '../../utils/planning.history.review.service.js': {},
  }, now.toISOString(), env);
  async function request(route, headers) {
    const result = {};
    await handlers.get(route)({ params: { guid: 'suggestion' }, body: {}, tenant: { config: { reference: '1001' } }, header: key => headers[key] }, result);
    return result;
  }
  const manager = { 'x-toke-user-session': 'session.' + 'a'.repeat(43) };
  const delegated = { 'x-toke-integrator-session': 'actor-token', 'x-integrator-context': 'b'.repeat(43) };
  assert.equal((await request('/:guid/approve', {})).status, 401);
  assert.equal((await request('/:guid/approval-preview', manager)).data.can_publish, true);
  grantManager = false;
  assert.equal((await request('/:guid/approve', manager)).status, 403);
  grantManager = true;
  assert.equal((await request('/:guid/approve', manager)).data.suggestion_guid, 'suggestion');
  assert.equal(snapshot.state().suggestion.diagnostics.publication.actor_kind, 'MANAGER_SESSION');
  snapshot = fixture();
  timezone = 'invalid';
  assert.equal((await request('/:guid/approval-preview', manager)).error.code, 'SUGGESTION_APPROVAL_TIMEZONE_INVALID');
  timezone = 'Africa/Lagos';
  delegatedTenant = 'elsewhere.test';
  assert.equal((await request('/:guid/approval-preview', delegated)).status, 403);
  delegatedTenant = 'pharmacy.test';
  delegatedReference = '9999';
  assert.equal((await request('/:guid/approve', delegated)).status, 403);
  delegatedReference = '1001';
  rejectDelegation = true;
  assert.equal((await request('/:guid/approval-preview', delegated)).status, 401);
  rejectDelegation = false;

  // Integrators can act on a draft owned by another manager of this tenant,
  // including through a context issued for an ADMIN-RH.
  actingUserId = 8;
  grantManager = false;
  assert.equal((await request('/:guid/approval-preview', delegated)).data.can_publish, true);
  assert.equal((await request('/:guid/approve', delegated)).data.suggestion_guid, 'suggestion');
  assert.equal(snapshot.state().suggestion.diagnostics.publication.actor_kind, 'DELEGATED_INTEGRATOR');
  assert.equal(snapshot.state().suggestion.diagnostics.publication.timezone, 'Africa/Lagos');
});

test('live rest checks report actionable warnings and respond to a corrected rule', async () => {
  const db = fixture();
  db.state().suggestion.config = 30;
  db.state().config = { min_rest_minutes_between_shifts: 1020 };
  const preview = await db.preview();
  const warning = preview.alerts.find(alert => alert.code === 'SUGGESTION_PUBLICATION_REST_WARNING');
  assert.equal(warning.severity, 'WARNING');
  assert.equal(warning.details.item_guid, 'item');
  assert.equal(warning.details.action, 'EDIT_ASSIGNMENT');
  await assert.rejects(db.approve(), errorCode('SUGGESTION_APPROVAL_CONFIRMATION_REQUIRED'));
  db.state().config.min_rest_minutes_between_shifts = 660;
  assert.equal((await db.preview()).confirmation_token, undefined);
});
