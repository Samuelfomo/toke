const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const sequelize = require('sequelize');
const shared = require('@toke/shared');

function load(file, dependencies) {
  const filename = resolve(__dirname, '../src/tools', file);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: name => {
    assert.ok(name in dependencies, name);
    return dependencies[name];
  } }, { filename });
  return exports;
}

const socket = process.env.TOKE_MANUAL_TEST_PG_SOCKET;
test('confirmed manual replacement respects PostgreSQL range exclusion and is atomic', { skip: !socket }, async () => {
  const db = new sequelize.Sequelize('postgres', process.env.USER, null, {
    dialect: 'postgres', host: socket, port: Number(process.env.TOKE_MANUAL_TEST_PG_PORT || 5432), logging: false,
  });
  const schema = `manual_${crypto.randomBytes(6).toString('hex')}`;
  const { STRING, INTEGER, DATEONLY, DATE, JSONB, BOOLEAN } = sequelize.DataTypes;
  const model = db.define('Assignment', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    guid: STRING, tenant: STRING, family: STRING, related: STRING, session_template: JSONB,
    version: INTEGER, start_date: DATEONLY, end_date: DATEONLY, created_by: INTEGER, reason: STRING,
    active: BOOLEAN, deleted_at: DATE, continuation_of_guid: STRING,
  }, { schema, tableName: 'schedule_assignments', timestamps: true, underscored: true });
  const log = db.define('Log', {
    assignment: INTEGER, fields: JSONB,
  }, { schema, tableName: 'schedule_assignments_logs', timestamps: false });
  const env = {
    sequelize, '@toke/shared': shared,
    '../tenant/database/db.initializer.js': { TableInitializer: { getModel: () => model } },
    '../tenant/database/db.tenant-manager.js': { getConnectionSync: () => db, getCurrentTenant: () => 'fixture.local' },
    '../utils/response.model.js': { tableName: { SCHEDULE_ASSIGNMENTS: 'schedule_assignments' } },
  };
  class Log {
    setAssignmentId(assignment) { this.assignment = assignment; return this; }
    setChangedFields(fields) { this.fields = fields; return this; }
    async save(transaction) { await log.create({ assignment: this.assignment, fields: this.fields }, { transaction }); }
  }
  for (const name of ['PreviousTemplate', 'NewTemplate', 'PreviousVersion', 'NewVersion', 'ModifiedBy', 'OldCreator', 'ModificationReason']) {
    Log.prototype[`set${name}`] = function () { return this; };
  }
  const adjustment = load('schedule.assignment.adjustment.service.ts', { ...env, crypto });
  let manager = true;
  const { createManualAssignment, verifyManualReplacementActor } = load('schedule.assignment.manual.service.ts', {
    ...env, 'node:crypto': crypto, '../tenant/class/ScheduleAssignmentsLog.js': Log,
    '../tenant/class/OrgHierarchy.js': { hasManagerRole: async () => manager },
    './schedule.assignment.adjustment.service.js': adjustment,
    '../utils/axios.config.js': {},
    './user-session.client.js': { sessionClientFromEnvironment: () => ({
      async verify(token, tenant, subdomain) {
        assert.equal(token, 'test-session');
        assert.equal(tenant, 'fixture');
        assert.equal(subdomain, 'fixture.local');
        return { userGuid: 'manager-guid' };
      },
    }) },
  });

  const tenant = 'fixture';
  const defaults = {
    tenant, family: 'user', active: true, version: 1, created_by: 1,
    session_template: { name: 'Précédent' },
  };
  const seed = (related, start_date, end_date, extra = {}) =>
    model.create({ ...defaults, guid: crypto.randomUUID(), related, start_date, end_date, ...extra });
  async function submit(related, from, to, confirmation, fail = false) {
    const template = { name: 'Nouveau', snapshot_date: crypto.randomUUID() };
    let created;
    return createManualAssignment({
      async save(transaction) {
        created = await model.create({
          ...defaults, guid: crypto.randomUUID(), related, start_date: from, end_date: to,
          session_template: template,
        }, { transaction });
        if (fail) throw new Error('forced rollback');
      },
      async toJSON() { return created.get({ plain: true }); },
    }, { tenant, family: 'user', related, from, to, creator: 1, template, timezone: 'Africa/Douala' }, async () => {}, confirmation);
  }
  async function preview(...args) {
    const error = await submit(...args).catch(error => error);
    assert.equal(error.code, 'SCHEDULE_ASSIGNMENT_OVERLAP');
    return error.details;
  }
  const active = related => model.findAll({ raw: true, where: { related, active: true }, order: [['start_date', 'ASC']] });
  const bounds = rows => rows.map(row => [row.start_date, row.end_date]);

  try {
    await db.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
    await db.createSchema(schema);
    await model.sync();
    await log.sync();
    // Production catalog DDL is absent from the repository. Reproduce the constraint
    // described by the adjustment service with inclusive days and an unbounded NULL end.
    await db.query(`ALTER TABLE "${schema}".schedule_assignments ADD CONSTRAINT exclude_overlapping_active_schedule_assignments
      EXCLUDE USING gist (tenant WITH =, family WITH =, related WITH =, daterange(start_date, end_date, '[]') WITH &&)
      WHERE (active AND deleted_at IS NULL)`);

    await seed('open', '2020-01-01', null);
    await assert.rejects(seed('open', '2099-01-10', null), e =>
      e.parent.code === '23P01' && e.parent.constraint === 'exclude_overlapping_active_schedule_assignments');
    const request = { header: key => key === 'x-toke-user-session' ? 'test-session' : undefined };
    await verifyManualReplacementActor(request, tenant, 'manager-guid');
    await assert.rejects(verifyManualReplacementActor(request, tenant, 'other-manager'),
      { code: 'SCHEDULE_ASSIGNMENT_REPLACEMENT_FORBIDDEN' });
    const open = await preview('open', '2099-01-10', null);
    assert.deepEqual(bounds(await active('open')), [['2020-01-01', null]]);
    assert.equal(await log.count(), 0);
    await assert.rejects(submit('open', '2099-01-10', null, open.confirmation, true), /forced rollback/);
    assert.deepEqual(bounds(await active('open')), [['2020-01-01', null]]);
    assert.equal(await log.count(), 0);
    await submit('open', '2099-01-10', null, open.confirmation);
    assert.deepEqual(bounds(await active('open')), [['2020-01-01', '2099-01-09'], ['2099-01-10', null]]);
    assert.equal(await log.count(), 1);

    const source = await seed('split', '2099-01-01', null);
    const split = await preview('split', '2099-01-10', '2099-01-12');
    assert.equal(split.affected[0].preserved.length, 2);
    await source.update({ reason: 'Updated after preview' });
    const stale = await preview('split', '2099-01-10', '2099-01-12', split.confirmation);
    await submit('split', '2099-01-10', '2099-01-12', stale.confirmation);
    const parts = await active('split');
    assert.deepEqual(bounds(parts), [['2099-01-01', '2099-01-09'], ['2099-01-10', '2099-01-12'], ['2099-01-13', null]]);
    assert.equal(parts[2].session_template.name, 'Précédent');

    const covered = await seed('full', '2099-01-04', '2099-01-05');
    await seed('full', '2099-01-07', '2099-01-08', { active: false });
    manager = false;
    await assert.rejects(submit('full', '2099-01-03', '2099-01-06'), { code: 'SCHEDULE_ASSIGNMENT_REPLACEMENT_FORBIDDEN' });
    manager = true;
    const full = await preview('full', '2099-01-03', '2099-01-06');
    await submit('full', '2099-01-03', '2099-01-06', full.confirmation);
    assert.equal((await covered.reload()).active, false);
    assert.deepEqual(bounds(await active('full')), [['2099-01-03', '2099-01-06']]);

    const guard = await seed('guard', '2099-01-01', '2099-01-01');
    await seed('guard', '2099-01-02', '2099-01-02', { continuation_of_guid: guard.guid });
    await assert.rejects(submit('guard', '2099-01-01', '2099-01-01'),
      { code: 'SCHEDULE_ASSIGNMENT_REPLACEMENT_REQUIRES_ADJUSTMENT' });
    await assert.rejects(submit('past', '2020-01-01', null), { code: 'SCHEDULE_ASSIGNMENT_PAST_PERIOD' });
  } finally {
    await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await db.close();
  }
});
