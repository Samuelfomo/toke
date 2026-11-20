'use strict';
const assert = require('node:assert/strict');
module.exports = async function business(env) {
  const { manager, initializer, context, ownership, sequelize, cfg, A, B } = env;
  const l = require('./postgres-business-loader.cjs')(env),
    { tableName: T } = l.load('utils/response.model.ts');
  const scope = (tenant, fn) =>
    manager.runTenantOperation(tenant, async () => {
      const db = await manager.getConnectionForTenant(tenant, cfg(tenant));
      await initializer.initialize(db);
      return fn(db);
    });
  let sequence = 700000;
  // Fixture creation only: JS validation is disabled for generic required-column
  // filling. PostgreSQL constraints and all tenant SQL guards remain active.
  async function seed(key, patch = {}) {
    const model = initializer.getModel(T[key]),
      data = {};
    for (const [name, a] of Object.entries(model.rawAttributes)) {
      if (a.autoIncrement || a.defaultValue !== undefined || a.allowNull !== false) continue;
      const type = a.type.key;
      data[name] =
        a.values?.[0] ??
        a.type.values?.[0] ??
        {
          INTEGER: 1,
          SMALLINT: 1,
          BIGINT: 1,
          BOOLEAN: true,
          DATE: new Date(),
          DATEONLY: '2030-01-01',
          JSONB: {},
          JSON: {},
          FLOAT: 1,
          DOUBLE: 1,
          DECIMAL: 1,
        }[type] ??
        ('fixture-' + ++sequence).slice(0, a.type.options?.length ?? 255);
    }
    if (model.rawAttributes.guid) data.guid = String(++sequence);
    try {
      return await model.create({ ...data, ...patch }, { validate: false });
    } catch (error) {
      throw Error('FIXTURE_SEED ' + key + ': ' + error.message, { cause: error });
    }
  }
  const fixtures = new Map();
  for (const tenant of [A, B])
    await scope(tenant, async () => {
      const managerUser = await seed('USERS', {
        guid: '700001',
        tenant,
        email: 'manager@v01.invalid',
        first_name: tenant,
        last_name: 'Manager',
        employee_color: '#101010',
        pin_hash: '1234',
        active: true,
      });
      const employee = await seed('USERS', {
        guid: '700002',
        tenant,
        email: 'employee@v01.invalid',
        first_name: tenant,
        last_name: 'Employee',
        employee_color: '#202020',
        pin_hash: '1234',
        active: true,
      });
      const site = await seed('SITES', {
        guid: '700003',
        tenant,
        name: 'Site ' + tenant,
        geofence_polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [8, 3],
              [10, 3],
              [10, 5],
              [8, 5],
              [8, 3],
            ],
          ],
        },
        address: { city: 'Fixture', location: 'Fixture', place_name: 'Fixture' },
      });
      const device = await seed('DEVICE', {
        guid: '700004',
        assigned_to: employee.id,
        name: 'Device ' + tenant,
      });
      const roleManager = await seed('ROLES', {
          code: 'MANAGER',
          name: 'Manager',
          permissions: {},
        }),
        roleEmployee = await seed('ROLES', { code: 'EMPLOYEE', name: 'Employee', permissions: {} });
      await seed('USER_ROLES', {
        user: managerUser.id,
        role: roleManager.id,
        assigned_by: managerUser.id,
      });
      await seed('USER_ROLES', {
        user: employee.id,
        role: roleEmployee.id,
        assigned_by: managerUser.id,
      });
      const definition = Object.fromEntries(
        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => [
          day,
          [{ work: ['08:00', '16:00'] }],
        ]),
      );
      const sessionModel = await seed('SESSION_MODEL', {
        name: 'Fixture',
        workday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        max_working_time: 720,
        min_working_time: 1,
        normal_session_time: 480,
        pause_allowed: true,
        max_pause_time: 60,
        min_pause_time: 1,
      });
      const template = await seed('SESSION_TEMPLATES', {
        guid: '700005',
        name: 'Day ' + tenant,
        definition,
        current: true,
        session_model: sessionModel.id,
      });
      const config = await seed('PLANNING_SUGGESTION_CONFIG', {
        guid: '700006',
        name: 'Fixture',
        active: true,
        created_by: managerUser.id,
        solver_type: 'GREEDY',
        history_weeks: 1,
        strict_coverage: false,
      });
      await seed('EMPLOYEE_PLANNING_PROFILE', {
        user: employee.id,
        planning_mode: 'ROTATING',
        active: true,
      });
      for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
        await seed('PLANNING_SUGGESTION_REQUIREMENT', {
          config: config.id,
          session_template: template.id,
          day_of_week: day,
          min_staff: 1,
          target_staff: 1,
          max_staff: 1,
          active: true,
        });
      fixtures.set(tenant, { managerUser, employee, site, device, template, config, definition });
    });
  const failures = [];
  async function check(name, fn) {
    try {
      await fn();
      console.log('PASS BUSINESS: ' + name);
    } catch (error) {
      failures.push({ name, error });
      console.error('FAIL BUSINESS: ' + name + ' — ' + error.message);
    }
  }
  await check('PIN real User/bcrypt + sessions/pauses A/B', async () => {
    const UserAuth = l.load('middle/user-auth.ts').UserAuth;
    const Work = l.load('tenant/class/WorkSessions.ts').default,
      Entries = l.load('tenant/class/TimeEntries.ts').default;
    const { PointageType: P, SessionStatus: S } = l.shared;
    await Promise.all(
      [A, B].map((tenant) =>
        scope(tenant, async () => {
          const f = fixtures.get(tenant),
            res = {
              status(n) {
                this.code = n;
                return this;
              },
              json(v) {
                this.result = v;
                return this;
              },
            };
          const request = { headers: { 'x-api-pin': '1234' }, body: { user: f.employee.guid } };
          let admitted = false;
          await UserAuth.timeEntriesAuthenticate(request, res, () => {
            admitted = true;
          });
          assert.equal(admitted, true, JSON.stringify(res.result));
          assert.equal(request.userId, f.employee.id);
          let rejected = true;
          await UserAuth.timeEntriesAuthenticate(
            { ...request, headers: { 'x-api-pin': '9999' } },
            res,
            () => {
              rejected = false;
            },
          );
          assert.equal(rejected, true);
          assert.equal(res.code, 401);
          const session = new Work()
            .setUser(f.employee.id)
            .setSite(f.site.id)
            .setSessionStartAt(new Date('2026-11-04T08:00:00Z'))
            .setStartCoordinates(4, 9);
          await session.save();
          assert.ok(session.getId());
          let index = 0;
          for (const [type, time] of [
            [P.CLOCK_IN, '08:00'],
            [P.PAUSE_START, '12:00'],
            [P.PAUSE_END, '12:30'],
            [P.CLOCK_OUT, '16:00'],
          ]) {
            const entry = new Entries()
              .setUser(f.employee.id)
              .setSession(session.getId())
              .setSite(f.site.id)
              .setDevice(f.device.id)
              .setExternalId(
                l.load('utils/time.entry.external-id.ts').resolveTimeEntryExternalId(undefined, {
                  user: f.employee.id,
                  local_id: 'V01-' + tenant[0] + '-' + ++index,
                }),
              )
              .setPointageType(type)
              .setClockedAt(new Date('2026-11-04T' + time + ':00Z'))
              .setCoordinates(4, 9);
            await entry.save();
            await entry.accept();
          }
          session.setSessionEndAt(new Date('2026-11-04T16:00:00Z')).setSessionStatus(S.CLOSED);
          await session.save();
          const durations = await session.calculateDurations();
          assert.equal(durations.total_pause_duration, '0 hours 30 minutes');
          assert.equal(durations.net_work_time, '7 hours 30 minutes');
          const loaded = await Work._load(session.getId());
          assert.equal(loaded.getUser(), f.employee.id);
          assert.equal(loaded.isActive(), false);
          assert.equal(
            await initializer.getModel(T.TIME_ENTRIES).count({ where: { user: f.employee.id } }),
            4,
          );
          const persisted = await initializer.getModel(T.USERS).findByPk(f.employee.id);
          assert.equal(persisted.first_name, tenant);
        }),
      ),
    );
  });
  const bulk = l.load('utils/schedule.suggestion.bulk-edit.service.ts');
  async function draft(f) {
    const s = await seed('SCHEDULE_SUGGESTION', {
      tenant: manager.getCurrentTenant(),
      manager: f.managerUser.id,
      config: f.config.id,
      period_from: '2030-01-07',
      period_to: '2030-01-13',
      status: 'draft',
      diagnostics: {
        generationScope: { configGuid: f.config.guid, configVersion: f.config.version },
      },
    });
    const schedule = Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => [
        '2030-01-' + String(i + 7).padStart(2, '0'),
        f.template.guid,
      ]),
    );
    const item = await seed('SCHEDULE_SUGGESTION_ITEM', {
      suggestion: s.id,
      user: f.employee.id,
      schedule,
      reasons: {},
    });
    return { s, item };
  }
  await check('planning bulk-edit + publication + adjustment A/B', async () => {
    const approval = l.load('tools/schedule.suggestion.approval.service.ts'),
      adjust = l.load('tools/schedule.assignment.adjustment.service.ts');
    await Promise.all(
      [A, B].map((tenant) =>
        scope(tenant, async () => {
          const f = fixtures.get(tenant),
            { s, item } = await draft(f);
          const result = await bulk.applyScheduleSuggestionBulkEdit(s.guid, {
            item_guids: [item.guid],
            period_from: '2030-01-07',
            period_to: '2030-01-13',
            dates: ['2030-01-08'],
            action: 'REST',
          });
          assert.equal(result.applied, true);
          assert.equal((await item.reload()).schedule['2030-01-08'], null);
          const published = await approval.approveScheduleSuggestion(s.guid);
          assert.ok(published);
          assert.equal((await s.reload()).status, 'approved');
          const adjustment = await adjust.applyScheduleDayAdjustment({
            tenantReference: tenant,
            managerId: f.managerUser.id,
            managerGuid: f.managerUser.guid,
            employeeGuid: f.employee.guid,
            date: '2030-01-09',
            serviceKey: 'rest',
            reason: 'V01 fixture',
          });
          assert.ok(adjustment.operation_id);
          const assignments = await initializer
            .getModel(T.SCHEDULE_ASSIGNMENTS)
            .findAll({ where: { related: f.employee.guid, active: true } });
          assert.ok(assignments.length > 0);
          assert.ok(assignments.every((row) => row.tenant === tenant));
        }),
      ),
    );
  });
  await check('planning regeneration real GREEDY A/B', async () => {
    const regenerate = l.load('utils/schedule.suggestion.regeneration.service.ts');
    await Promise.all(
      [A, B].map((tenant) =>
        scope(tenant, async () => {
          const f = fixtures.get(tenant),
            { s, item } = await draft(f);
          const result = await regenerate.regenerateScheduleSuggestion(s.guid);
          assert.equal(result.employee_count, 1);
          assert.equal((await s.reload()).status, 'draft');
          assert.ok(Object.keys((await item.reload()).schedule).length === 7);
          await s.update({ status: 'rejected' });
        }),
      ),
    );
  });
  await check('planning real SQL failure rolls back bulk-edit A/B', async () => {
    await Promise.all(
      [A, B].map((tenant) =>
        scope(tenant, async (db) => {
          const f = fixtures.get(tenant),
            { s, item } = await draft(f),
            before = JSON.stringify(item.schedule);
          // Server trigger fails the final suggestion UPDATE, after item UPDATE.
          await db.query(
            `CREATE FUNCTION v01_fail_suggestion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'V01_SQL_INJECTED'; END $$`,
          );
          await db.query(
            `CREATE TRIGGER v01_fail_suggestion BEFORE UPDATE ON "${T.SCHEDULE_SUGGESTION}" FOR EACH ROW EXECUTE FUNCTION v01_fail_suggestion()`,
          );
          try {
            await assert.rejects(
              bulk.applyScheduleSuggestionBulkEdit(s.guid, {
                item_guids: [item.guid],
                period_from: '2030-01-07',
                period_to: '2030-01-13',
                dates: ['2030-01-08'],
                action: 'REST',
              }),
              /V01_SQL_INJECTED/,
            );
            assert.equal(JSON.stringify((await item.reload()).schedule), before);
          } finally {
            await db.query(`DROP TRIGGER v01_fail_suggestion ON "${T.SCHEDULE_SUGGESTION}"`);
            await db.query('DROP FUNCTION v01_fail_suggestion()');
          }
          await s.update({ status: 'rejected' });
        }),
      ),
    );
  });
  await check(
    'publication/adjustment/regeneration rollback after real SQL failure A/B',
    async () => {
      const approval = l.load('tools/schedule.suggestion.approval.service.ts'),
        adjust = l.load('tools/schedule.assignment.adjustment.service.ts'),
        regen = l.load('utils/schedule.suggestion.regeneration.service.ts');
      await Promise.all(
        [A, B].map((tenant) =>
          scope(tenant, async (db) => {
            const f = fixtures.get(tenant),
              assignmentModel = initializer.getModel(T.SCHEDULE_ASSIGNMENTS);
            const snapshot = async () =>
              JSON.stringify(
                (await assignmentModel.findAll({ order: [['id', 'ASC']] })).map((row) =>
                  row.get({ plain: true }),
                ),
              );
            async function deny(table, event, fn) {
              await db.query(
                `CREATE FUNCTION v01_fail_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'V01_ROLLBACK_REQUIRED'; END $$`,
              );
              await db.query(
                `CREATE TRIGGER v01_fail_write BEFORE ${event} ON "${table}" FOR EACH ROW EXECUTE FUNCTION v01_fail_write()`,
              );
              try {
                await assert.rejects(fn(), /V01_ROLLBACK_REQUIRED/);
              } finally {
                await db.query(`DROP TRIGGER v01_fail_write ON "${table}"`);
                await db.query('DROP FUNCTION v01_fail_write()');
              }
            }
            const publication = await draft(f),
              beforePublish = await snapshot();
            await deny(T.SCHEDULE_SUGGESTION, 'UPDATE', () =>
              approval.approveScheduleSuggestion(publication.s.guid),
            );
            assert.equal((await publication.s.reload()).status, 'draft');
            assert.equal(await snapshot(), beforePublish);
            await publication.s.update({ status: 'rejected' });
            const beforeAdjustment = await snapshot();
            await deny(T.SCHEDULE_ASSIGNMENTS, 'INSERT', () =>
              adjust.applyScheduleDayAdjustment({
                tenantReference: tenant,
                managerId: f.managerUser.id,
                managerGuid: f.managerUser.guid,
                employeeGuid: f.employee.guid,
                date: '2030-01-10',
                serviceKey: 'rest',
                reason: 'V01 rollback fixture',
              }),
            );
            assert.equal(await snapshot(), beforeAdjustment);
            const regeneration = await draft(f),
              beforeRegeneration = JSON.stringify(regeneration.item.get({ plain: true }));
            await deny(T.SCHEDULE_SUGGESTION, 'UPDATE', () =>
              regen.regenerateScheduleSuggestion(regeneration.s.guid),
            );
            assert.deepEqual(
              JSON.parse(JSON.stringify((await regeneration.item.reload()).get({ plain: true }))),
              JSON.parse(beforeRegeneration),
            );
            assert.equal((await regeneration.s.reload()).status, 'draft');
            await regeneration.s.update({ status: 'rejected' });
          }),
        ),
      );
    },
  );
  await check('WORKER-IDS separate regression', () =>
    require('./worker-group-filter.postgres.cjs')({ ...env, scope, seed }),
  );
  let workerForAtomicity, workerLoaderForAtomicity;
  await check('worker real rotation A/B, coalescing, failure then next tenant', async () => {
    for (const tenant of [A, B])
      await scope(tenant, async () => {
        const f = fixtures.get(tenant),
          group = await seed('ROTATION_GROUPS', {
            tenant,
            name: 'Cycle',
            cycle_length: 97,
            auto_advance: true,
            start_date: '2026-01-01',
            cycle_unit: 'day',
            direction: 'forward',
            rotation_step: 1,
          });
        for (let position = 0; position < (tenant === A ? 2 : 3); position++)
          await seed('ROTATION_GROUP_TEMPLATE', {
            rotation_group: group.id,
            position,
            template_snapshot: { guid: f.template.guid, name: 'Fixture', definition: f.definition },
          });
        await seed('ROTATION_ASSIGNMENTS', {
          family: l.shared.RAFamily.USER,
          related: f.employee.guid,
          rotation_group: group.id,
          assigned_by: f.managerUser.id,
          offset: 0,
          last_advanced_date: null,
        });
      });
    let broken = false;
    l.stubs['packages/api/src/tools/tenant-cache.service.ts'] = {
      default: {
        getTenantConfig: async (tenant) => {
          if (broken && tenant === A) throw Error('V01_FIXTURE_CACHE_FAILURE');
          return cfg(tenant);
        },
        listTenants: async () => [A, B],
      },
    };
    const schedules = [];
    // No actual cron library is exposed. Only records registration.
    const workerLoader = require('./postgres-business-loader.cjs')({
      ...env,
      overrides: l.stubs,
      externals: { 'node-cron': { default: { schedule: (...args) => schedules.push(args) } } },
    });
    workerLoaderForAtomicity = workerLoader;
    const worker = workerLoader.load('automate/automate.ts');
    workerForAtomicity = worker;
    assert.equal(schedules.length, 1);
    const results = await Promise.all([
      worker.runForTenant(A),
      worker.runForTenant(A),
      worker.runForTenant(B),
    ]);
    assert.equal(results[0].processed, 1, JSON.stringify(results[0]));
    assert.equal(results[1].processed, 1, JSON.stringify(results[1]));
    assert.equal(results[2].processed, 1, JSON.stringify(results[2]));
    const repeated = await Promise.all([worker.runForTenant(A), worker.runForTenant(B)]);
    assert.ok(
      repeated.every(
        (result) => result.skipped === 1 && result.processed === 0 && result.failed === 0,
      ),
    );
    broken = true;
    const summary = await worker.runForAllTenants();
    assert.deepEqual(
      Array.from(summary.tenants, (row) => row.status),
      ['error', 'ok'],
    );
    await Promise.all(
      [A, B].map((tenant) =>
        scope(tenant, async () => {
          const logs = await initializer.getModel(T.ROTATION_ASSIGNMENT_LOGS).findAll();
          assert.equal(logs.length, 1);
          assert.equal(logs[0].cycle_length, tenant === A ? 2 : 3);
          assert.equal(logs[0].previous_offset, 0);
          assert.equal(logs[0].new_offset, 1);
          const assignment = await initializer
            .getModel(T.ROTATION_ASSIGNMENTS)
            .findOne({ where: { active: true } });
          assert.equal(logs[0].rotation_assignment, assignment.id);
          assert.equal(assignment.offset, 1);
          assert.ok(assignment.last_advanced_date);
          const group = await initializer
            .getModel(T.ROTATION_GROUPS)
            .findByPk(assignment.rotation_group);
          assert.equal(group.tenant, tenant);
          assert.equal(group.cycle_length, 97);
        }),
      ),
    );
    broken = false;
  });
  await check('WORKER atomicity required after PostgreSQL journal failure', () =>
    require('./worker-log.postgres.cjs')({
      ...env,
      worker: workerForAtomicity,
      workerLoader: workerLoaderForAtomicity,
      scope,
      T,
    }),
  );
  await check('WORKER concurrent row lock, abandonment and uncertain commit', () =>
    require('./worker-atomic-concurrency.postgres.cjs')({
      ...env,
      worker: workerForAtomicity,
      workerLoader: workerLoaderForAtomicity,
      scope,
      T,
    }),
  );
  await check('pointage complete HTTP routes A/B',()=>require('./postgres-pointage-http.cjs')({...env,scope,fixtures,seed,T}));
  await check('HTTP real transport A/B and interruption', () =>
    require('./postgres-http.cjs')(env),
  );
  await require('./postgres-business-boundaries.cjs')({ ...env, l, scope, fixtures, seed, check });
  if (failures.length)
    throw new AggregateError(
      failures.map((f) => f.error),
      'BUSINESS_FAILURES: ' + failures.map((f) => f.name).join('; '),
    );
  console.log(
    'PASS BUSINESS: all named scenarios completed; external license/activity/revision/notifications remain inert',
  );
};
