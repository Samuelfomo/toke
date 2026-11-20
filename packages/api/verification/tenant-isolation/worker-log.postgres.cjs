'use strict';
const assert = require('node:assert/strict');
module.exports = async function workerAtomicFailures({
  worker,
  workerLoader,
  scope,
  T,
  A,
  B,
  cfg,
  controls,
  wire,
  initializer,
  manager,
}) {
  const Assign = workerLoader.load('tenant/class/RotationAssignments.ts').default;
  const Log = workerLoader.load('tenant/class/RotationAssignmentLog.ts').default;
  const originalLoad = Assign._loadForRotation,
    originalSave = Log.prototype.save;
  const capturedAssignments = new Map(),
    capturedLogs = new Map();
  Assign._loadForRotation = async function (...args) {
    const instance = await originalLoad.apply(this, args);
    if (instance) capturedAssignments.set(manager.getCurrentTenant(), instance);
    return instance;
  };
  Log.prototype.save = async function (...args) {
    capturedLogs.set(manager.getCurrentTenant(), this);
    return originalSave.apply(this, args);
  };
  try {
    for (const operation of ['INSERT', 'UPDATE'])
      for (const failedTenant of [A, B]) {
        capturedAssignments.clear();
        capturedLogs.clear();
        const before = new Map();
        for (const tenant of [A, B])
          await scope(tenant, async () => {
            const row = await initializer
              .getModel(T.ROTATION_ASSIGNMENTS)
              .findOne({ where: { active: true } });
            await row.update({ offset: 0, last_advanced_date: null });
            before.set(tenant, {
              id: row.id,
              logs: await initializer.getModel(T.ROTATION_ASSIGNMENT_LOGS).count(),
            });
          });
        const table = operation === 'INSERT' ? T.ROTATION_ASSIGNMENT_LOGS : T.ROTATION_ASSIGNMENTS;
        await scope(failedTenant, async (db) => {
          await db.query(
            `CREATE FUNCTION v01_deny_rotation_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'V01_FORCED_${operation}_FAILURE'; END $$`,
          );
          await db.query(
            `CREATE TRIGGER v01_deny_rotation_write BEFORE ${operation} ON "${table}" FOR EACH ROW EXECUTE FUNCTION v01_deny_rotation_write()`,
          );
        });
        try {
          const start = wire.length,
            results = await Promise.all([worker.runForTenant(A), worker.runForTenant(B)]),
            sent = wire.slice(start);
          for (const [index, tenant] of [A, B].entries()) {
            const previous = before.get(tenant),
              result = results[index],
              commands = sent.filter((q) => q.database === cfg(tenant).database);
            const begin = commands.find((q) => /^START TRANSACTION/i.test(q.text));
            assert.ok(begin);
            const lock = commands.find(
              (q) => q.text.includes(T.ROTATION_ASSIGNMENTS) && /FOR UPDATE/i.test(q.text),
            );
            assert.ok(lock);
            assert.equal(lock.pid, begin.pid);
            const update = commands.find(
              (q) =>
                /^UPDATE /i.test(q.text) && q.text.includes('"' + T.ROTATION_ASSIGNMENTS + '"'),
            );
            assert.ok(update);
            assert.equal(update.pid, begin.pid);
            const insert = commands.find(
              (q) =>
                /^INSERT INTO /i.test(q.text) &&
                q.text.includes('"' + T.ROTATION_ASSIGNMENT_LOGS + '"'),
            );
            const persisted = (
              await controls[index].query(
                `SELECT "offset",last_advanced_date::text AS day FROM "${T.ROTATION_ASSIGNMENTS}" WHERE id=$1`,
                [previous.id],
              )
            ).rows[0];
            const count = Number(
              (
                await controls[index].query(
                  `SELECT count(*) AS n FROM "${T.ROTATION_ASSIGNMENT_LOGS}"`,
                )
              ).rows[0].n,
            );
            if (tenant === failedTenant) {
              assert.equal(result.processed, 0);
              assert.equal(result.failed, 1);
              assert.ok(
                result.errors.some((e) =>
                  e.reason.includes('V01_FORCED_' + operation + '_FAILURE'),
                ),
              );
              assert.equal(persisted.offset, 0);
              assert.equal(persisted.day, null);
              assert.equal(count, previous.logs);
              assert.equal(capturedAssignments.get(tenant).getOffset(), 0);
              assert.equal(capturedAssignments.get(tenant).getLastAdvancedDate(), null);
              assert.ok(commands.some((q) => /^ROLLBACK;?$/i.test(q.text) && q.pid === begin.pid));
              assert.equal(commands.filter((q) => /^COMMIT;?$/i.test(q.text)).length, 0);
              if (operation === 'UPDATE') assert.equal(insert, undefined);
              else {
                assert.equal(insert.pid, begin.pid);
                assert.equal(capturedLogs.get(tenant).getId(), undefined);
              }
            } else {
              assert.equal(result.processed, 1);
              assert.equal(result.failed, 0);
              assert.equal(persisted.offset, 1);
              assert.ok(persisted.day);
              assert.equal(count, previous.logs + 1);
              assert.equal(insert.pid, begin.pid);
              assert.ok(commands.some((q) => /^COMMIT;?$/i.test(q.text) && q.pid === begin.pid));
              const max = commands.find(
                (q) => /max\(/i.test(q.text) && q.text.includes(T.ROTATION_ASSIGNMENT_LOGS),
              );
              assert.ok(max);
              assert.equal(max.pid, begin.pid);
              assert.equal(capturedAssignments.get(tenant).getOffset(), 1);
              assert.ok(capturedLogs.get(tenant).getId());
            }
          }
        } finally {
          await scope(failedTenant, async (db) => {
            await db.query(`DROP TRIGGER v01_deny_rotation_write ON "${table}"`);
            await db.query('DROP FUNCTION v01_deny_rotation_write()');
          });
        }
        // A legitimate new invocation can now succeed once after the prior rollback.
        const retry = await worker.runForTenant(failedTenant);
        assert.equal(retry.processed, 1);
        assert.equal(retry.failed, 0);
        const repeated = await worker.runForTenant(failedTenant);
        assert.equal(repeated.skipped, 1);
        assert.equal(repeated.processed, 0);
      }
  } finally {
    Assign._loadForRotation = originalLoad;
    Log.prototype.save = originalSave;
  }
  console.log(
    'PASS WORKER ATOMICITY: INSERT/UPDATE failures roll back offset/date/log and leave memory unpublished A/B; same physical transaction for locked read, UPDATE, GUID and INSERT; other tenant succeeds',
  );
};
