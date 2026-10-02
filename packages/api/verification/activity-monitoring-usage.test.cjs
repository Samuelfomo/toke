'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  assert = require('node:assert/strict'),
  { stripTypeScriptTypes } = require('node:module');
(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'toke-monitoring-'));
  try {
    let src = stripTypeScriptTypes(
      fs.readFileSync(path.join(__dirname, '../master/database/db.activity-monitoring.ts'), 'utf8'),
    )
      .replace(
        "import { Sequelize, Transaction } from 'sequelize';",
        "const Transaction={ISOLATION_LEVELS:{REPEATABLE_READ:'REPEATABLE READ'}};",
      )
      .replace(
        "import { TableInitializer } from './db.initializer.js';",
        'const TableInitializer={};',
      );
    fs.writeFileSync(path.join(temp, 'db.js'), src);
    fs.writeFileSync(
      path.join(temp, 'input.js'),
      stripTypeScriptTypes(
        fs.readFileSync(
          path.join(__dirname, '../master/class/activity-monitoring-input.ts'),
          'utf8',
        ),
      ),
    );
    const { default: Db } = await import('file://' + path.join(temp, 'db.js'));
    const { activityDate, activityGuid, summarizeMonthlyMonitoring } = await import(
      'file://' + path.join(temp, 'input.js')
    );
    for (const d of ['2026-02-30T00:00:00Z', '2026-10-01T00:00:00+15:00', '2026-10-01'])
      assert.throws(() => activityDate(d));
    assert.throws(() => activityGuid('000001'));
    assert.equal(activityGuid('100123'), 100123);
    const employee = {
      id: 4,
      tenant_guid: 100014,
      global_license: 2,
      activation_date: '2026-01-01T00:00:00Z',
      deactivation_date: null,
      last_activity_date: null,
      timezone: 'Africa/Douala',
    };
    let days = {},
      valid = true,
      fail = false,
      rolledBack = false;
    const queries = [];
    const connection = {
      transaction: async (...args) => {
        const cb = args.at(-1),
          before = structuredClone({ days, employee });
        try {
          return await cb({});
        } catch (e) {
          days = before.days;
          Object.assign(employee, before.employee);
          rolledBack = true;
          throw e;
        }
      },
      query: async (sql, o) => {
        queries.push(sql);
        const p = o.replacements;
        let r = [];
        if (sql.includes('FOR UPDATE OF el')) r = [employee];
        else if (sql.includes(' AS day'))
          r = [{ day: new Date(Date.parse(p.at) + 3600000).toISOString().slice(0, 10) }];
        else if (sql.includes('SELECT last_punch_date FROM xa_activity_monitoring'))
          r = days[p.day] ? [{ last_punch_date: days[p.day] }] : [];
        else if (sql.includes(' AS valid')) r = [{ valid }];
        else if (sql.includes('record_monitoring_activity')) {
          const d = new Date(Date.parse(p.at) + 3600000).toISOString().slice(0, 10);
          if (!days[d] || Date.parse(p.at) > Date.parse(days[d])) days[d] = p.at;
        } else if (sql.startsWith('UPDATE xa_employee_license')) {
          if (
            !employee.last_activity_date ||
            Date.parse(p.at) > Date.parse(employee.last_activity_date)
          ) {
            employee.last_activity_date = p.at;
            r = [employee];
          }
        } else if (sql.includes(' AS during_leave')) {
          if (fail) throw new Error('Simulated rollback');
          r = [{ during_leave: true }];
        } else throw new Error('Unexpected SQL: ' + sql);
        return [r, {}];
      },
    };
    const data = new Db(connection),
      signal = { tenantGuid: 100014, employeeGuid: 100123, occurredAt: '2026-10-01T23:30:00.000Z' };
    const first = await data.record(signal);
    assert.equal(first.monitoring_date, '2026-10-02');
    assert.equal(first.day_already_observed, false);
    assert.equal(first.activity_during_leave, true);
    assert.equal((await data.record(signal)).day_already_observed, true);
    assert.equal(Object.keys(days).length, 1);
    await data.record({ ...signal, occurredAt: '2026-10-01T22:00:00.000Z' });
    assert.equal(Object.keys(days).length, 2);
    assert.equal(employee.last_activity_date, signal.occurredAt);
    await data.record({ ...signal, occurredAt: '2026-10-01T23:10:00.000Z' });
    assert.equal(days['2026-10-02'], signal.occurredAt);
    await assert.rejects(() => data.record({ ...signal, tenantGuid: 100001 }), /belong/);
    valid = false;
    await assert.rejects(() => data.record(signal), /activation period/);
    valid = true;
    fail = true;
    rolledBack = false;
    await assert.rejects(
      () => data.record({ ...signal, occurredAt: '2026-10-03T10:00:00.000Z' }),
      /rollback/,
    );
    assert.equal(rolledBack, true);
    assert.equal(Object.keys(days).length, 2);
    assert.equal(employee.last_activity_date, signal.occurredAt);
    const report = summarizeMonthlyMonitoring({
      minimum_seats: 5,
      employees: [
        { contractual_status: 'TERMINATED', active_days: 12 },
        { contractual_status: 'ACTIVE', active_days: 0 },
        { declared_long_leave: true, active_days: 1 },
      ],
    });
    assert.equal(report.billable_employees, 2);
    assert.equal(report.billed_seats, 5);
    assert.equal(report.invoice_creation_allowed, false);
    assert.equal(report.employees[0].billing_status, 'BILLABLE');
    assert.equal(report.employees[2].billing_status, 'BILLABLE');
    assert.ok(
      !queries.some((q) =>
        /xa_license_activity_event|xa_payment_transaction|UPDATE xa_global_license/.test(q),
      ),
    );
    let sql = '';
    await require('../migrations/20261002100000-reuse-activity-monitoring.cjs').up({
      sequelize: {
        transaction: async (cb) => cb({}),
        query: async (s) => {
          sql = s;
        },
      },
    });
    assert.ok(!/CREATE TABLE|ALTER TABLE|DROP TABLE/i.test(sql));
    assert.ok(sql.includes('ON CONFLICT(employee_license,monitoring_date)'));
    assert.ok(sql.includes('Observed daily activity cannot be deleted'));
    assert.ok(sql.includes('p_reference_date-6'));
    assert.ok(sql.includes('p_reference_date-29'));
    const route = fs.readFileSync(
      path.join(__dirname, '../master/routes/activity.monitoring.route.ts'),
      'utf8',
    );
    assert.ok(!route.includes('.query('));
    assert.ok(route.includes('monitoring.recordUsageSignal'));
    const app = fs.readFileSync(path.join(__dirname, '../master/app.ts'), 'utf8');
    assert.ok(!app.includes('LicenseActivityRoute'));
    console.log(
      'PASS: existing entity, local day, daily idempotence, delayed signals, tenant boundary, leave activity, atomic rollback, monthly usage/minimum and financial data unchanged. SQL mocked.',
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
