// Native ESM imports from the assembled artifact; no VM/source business loader.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const info = JSON.parse(fs.readFileSync(process.env.C_WORKER_FIXTURE_INFO, 'utf8'));
const require = createRequire(path.join(info.artifact, 'package.json'));
const pg = require('pg'),
  wire = [];
const query = pg.Client.prototype.query;
pg.Client.prototype.query = function (sql, ...args) {
  wire.push({
    database: this.database,
    pid: this.processID,
    sql: typeof sql === 'string' ? sql : sql.text,
  });
  return query.call(this, sql, ...args);
};
const mod = (rel) => import(pathToFileURL(path.join(info.artifact, rel)).href);
const TenantManager = (await mod('dist/tenant/database/db.tenant-manager.js')).default;
const { TableInitializer } = await mod('dist/tenant/database/db.initializer.js');
const { tableName: T } = await mod('dist/utils/response.model.js');
const mode = process.argv[2];
const tenants = ['a.cworker.invalid', 'b.cworker.invalid'];
const config = (t) => ({
  host: info.socket,
  port: info.port,
  database: t[0] === 'a' ? 'v01_test_a' : 'v01_test_b',
  username: (mode === 'bootstrap' ? 'fixture_' : 'runtime_') + t[0],
  password: '',
});
async function scope(t, work) {
  return TenantManager.runWithTenant(t, async () => {
    const db = await TenantManager.getConnectionForTenant(t, config(t));
    await TableInitializer.initialize(db, {
      mode: mode === 'bootstrap' ? 'bootstrap' : 'existing',
    });
    return work(db);
  });
}
let launcher, result;
try {
  if (mode === 'bootstrap') {
    for (const t of tenants)
      await scope(t, async () => {
        let seq = 500000;
        const seed = async (table, patch = {}) => {
          const m = TableInitializer.getModel(table),
            data = {};
          for (const [name, a] of Object.entries(m.rawAttributes)) {
            if (a.autoIncrement || a.defaultValue !== undefined || a.allowNull !== false) continue;
            data[name] =
              a.values?.[0] ??
              a.type.values?.[0] ??
              {
                INTEGER: 1,
                SMALLINT: 1,
                BIGINT: 1,
                BOOLEAN: true,
                DATE: new Date(),
                DATEONLY: '2020-01-01',
                JSONB: {},
                JSON: {},
                FLOAT: 1,
                DECIMAL: 1,
              }[a.type.key] ??
              ('fixture-' + ++seq).slice(0, a.type.options?.length ?? 255);
          }
          if (m.rawAttributes.guid) data.guid = String(++seq);
          return m.create({ ...data, ...patch }, { validate: false });
        };
        const user = await seed(T.USERS, {
          tenant: t,
          last_name: 'Worker',
          first_name: t,
          country: 'CM',
          employee_color: '#123456',
        });
        const active = await seed(T.ROTATION_GROUPS, {
          tenant: t,
          name: 'selected',
          auto_advance: true,
          cycle_unit: 'day',
          rotation_step: 1,
          start_date: '2020-01-01',
          direction: 'forward',
          cycle_length: 99,
        });
        await seed(T.ROTATION_GROUPS, {
          tenant: t,
          name: 'excluded',
          auto_advance: true,
          cycle_unit: 'day',
          rotation_step: 1,
          start_date: '2020-01-01',
          direction: 'forward',
        });
        for (let p = 0; p < 3; p++)
          await seed(T.ROTATION_GROUP_TEMPLATE, {
            rotation_group: active.id,
            position: p,
            template_snapshot: { name: 'slot-' + p, definition: {}, version: 1 },
          });
        await seed(T.ROTATION_ASSIGNMENTS, {
          family: 'user',
          related: String(user.id),
          assigned_by: user.id,
          rotation_group: active.id,
          offset: 0,
          active: true,
          last_advanced_date: null,
        });
      });
    result = { bootstrap: true };
  } else {
    launcher = await mod('run.mjs');
    const cron = require('node-cron'); // ESM and CJS cron registries differ: use ESM below.
    const cronES = (
      await import(pathToFileURL(require.resolve('node-cron').replace(/\.cjs$/, '.js')).href)
    ).default;
    assert.equal(cronES.getTasks().size, 1);
    assert.equal([...cronES.getTasks().values()][0].getPattern(), '0 0 * * *');
    if (mode === 'scheduled') {
      await [...cronES.getTasks().values()][0].execute();
      result = { scheduled: true };
    } else if (mode === 'busy') {
      const execution = [...cronES.getTasks().values()][0].execute();
      process.send?.({ stage: 'busy-started' });
      await execution;
      result = { busy: true };
    } else if (mode === 'run') {
      result = await Promise.all(tenants.map((t) => launcher.worker.runForTenant(t)));
    } else if (mode === 'guard') {
      let captured, transaction;
      await scope(tenants[0], async (db) => {
        captured = db;
        transaction = await db.transaction();
        await transaction.rollback();
      });
      const start = wire.length;
      await assert.rejects(
        captured.query('SELECT 1'),
        /TENANT_CONTEXT_MISSING|TENANT_CONTEXT_CLOSED/,
      );
      await scope(tenants[1], async (db) => {
        await assert.rejects(captured.query('SELECT 1'), /TENANT_CONTEXT_MISMATCH/);
        await db.transaction(async (tx) => {
          await assert.rejects(
            captured.query('SELECT 1', { transaction: tx }),
            /TENANT_CONTEXT_MISMATCH|TENANT_TRANSACTION_MISMATCH/,
          );
        });
      });
      assert.ok(!wire.slice(start).some((q) => q.sql === 'SELECT 1'));
      result = { guards: true };
    } else if (mode === 'uncertain') {
      await scope(tenants[0], async (db) => {
        let injected = false;
        db.addHook('afterQuery', 'fixture-commit-ack', (options, q) => {
          if (!injected && /^COMMIT\b/i.test(q.sql ?? '')) {
            injected = true;
            throw Error('FIXTURE_COMMIT_ACK_LOST');
          }
        });
      });
      result = await launcher.worker.runForTenant(tenants[0]);
      assert.equal(result.failed, 1);
      assert.equal(result.processed, 0);
    } else throw Error('UNKNOWN_FIXTURE_MODE');
    assert.ok(
      !wire.some((q) => /^\s*(CREATE|ALTER|DROP|TRUNCATE|COMMENT|GRANT)/i.test(q.sql)),
      'existing must emit no DDL',
    );
    for (const t of tenants) {
      const target = t[0] === 'a' ? 'v01_test_a' : 'v01_test_b';
      const queries = wire.filter((q) => q.database === target);
      let inTx = false,
        pid;
      for (const q of queries) {
        if (/^START TRANSACTION/i.test(q.sql)) {
          inTx = true;
          pid = q.pid;
        }
        if (inTx) assert.equal(q.pid, pid, 'one physical backend per transaction');
        if (/^(COMMIT|ROLLBACK)/i.test(q.sql)) inTx = false;
      }
    }
  }
  process.send?.({ result, wire });
} catch (e) {
  console.error(e.stack);
  process.exitCode = 1;
  process.send?.({ failure: e.message, wire });
} finally {
  if (launcher) await launcher.shutdown();
  else await TenantManager.closeAllConnections();
}
