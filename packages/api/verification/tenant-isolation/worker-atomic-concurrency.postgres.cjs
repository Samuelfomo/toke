'use strict';
const assert = require('node:assert/strict'),
  path = require('node:path'),
  { fork } = require('node:child_process');
module.exports = async function concurrent(env) {
  const { A, B, scope, controls, initializer, T, manager, workerLoader, wire, cfg, root, nonce } =
    env;
  const Assign = workerLoader.load('tenant/class/RotationAssignments.ts').default,
    Log = workerLoader.load('tenant/class/RotationAssignmentLog.ts').default;
  const run = workerLoader.load('automate/rotation.cron.ts').runRotationCron;
  async function reset() {
    const before = new Map();
    for (const [index, tenant] of [A, B].entries())
      await scope(tenant, async () => {
        const row = await initializer
          .getModel(T.ROTATION_ASSIGNMENTS)
          .findOne({ where: { active: true } });
        await row.update({ offset: 0, last_advanced_date: null });
        before.set(tenant, {
          id: row.id,
          logs: Number(
            (
              await controls[index].query(
                `SELECT count(*) AS n FROM "${T.ROTATION_ASSIGNMENT_LOGS}"`,
              )
            ).rows[0].n,
          ),
        });
      });
    return before;
  }
  async function verify(before) {
    for (const [index, tenant] of [A, B].entries()) {
      const b = before.get(tenant);
      const row = (
        await controls[index].query(
          `SELECT "offset",last_advanced_date FROM "${T.ROTATION_ASSIGNMENTS}" WHERE id=$1`,
          [b.id],
        )
      ).rows[0];
      assert.equal(row.offset, 1);
      assert.ok(row.last_advanced_date);
      const count = Number(
        (await controls[index].query(`SELECT count(*) AS n FROM "${T.ROTATION_ASSIGNMENT_LOGS}"`))
          .rows[0].n,
      );
      assert.equal(count, b.logs + 1);
    }
  }
  async function waitLocked() {
    for (let attempt = 0; attempt < 300; attempt++) {
      await controls[0].query('SELECT pg_stat_clear_snapshot()');
      const rows = (
        await controls[0].query(
          "SELECT pid FROM pg_stat_activity WHERE datname=$1 AND usename='v01_a' AND wait_event_type='Lock' AND query ILIKE '%FOR UPDATE%'",
          [cfg(A).database],
        )
      ).rows;
      if (rows.length >= 2) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw Error('Two real FOR UPDATE waiters not observed');
  }
  let before = await reset();
  await controls[0].query('BEGIN');
  await controls[0].query(`SELECT id FROM "${T.ROTATION_ASSIGNMENTS}" WHERE id=$1 FOR UPDATE`, [
    before.get(A).id,
  ]);
  let work;
  try {
    work = Promise.all([A, A, B, B].map((tenant) => scope(tenant, () => run())));
    work.catch(() => {});
    await waitLocked();
  } finally {
    await controls[0].query('COMMIT');
  }
  const results = await work;
  assert.deepEqual(results.map((r) => r.processed).sort(), [0, 0, 1, 1]);
  assert.ok(results.every((r) => r.failed === 0));
  await verify(before);
  console.log(
    'PASS WORKER CONCURRENCY: independent invocations wait on FOR UPDATE, then one advance/log per tenant; not relying on process coalescing',
  );
  // Two independent Node processes, with the same observed lock barrier.
  before = await reset();
  const children = [],
    ready = [],
    done = [];
  await controls[0].query('BEGIN');
  await controls[0].query(`SELECT id FROM "${T.ROTATION_ASSIGNMENTS}" WHERE id=$1 FOR UPDATE`, [
    before.get(A).id,
  ]);
  try {
    for (let index = 1; index <= 2; index++) {
      const child = fork(path.join(__dirname, 'postgres-child.cjs'), [], {
        env: { PATH: process.env.PATH, NODE_ENV: 'test' },
        execArgv: [],
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      });
      children.push(child);
      let stderr = '';
      child.stdout.resume();
      child.stderr.on('data', (data) => (stderr += data));
      ready.push(
        new Promise((resolve, reject) => {
          child.on('message', (m) => {
            if (m.ready) resolve();
            if (m.error) reject(Error(m.error));
          });
          child.on('error', reject);
          child.on('exit', (code) => {
            if (code) reject(Error(stderr || 'child failed'));
          });
        }),
      );
      const finished = new Promise((resolve, reject) => {
        child.on('message', (m) => {
          if (m.error) reject(Error(m.error));
        });
        child.on('exit', (code) =>
          code === 0 ? resolve() : reject(Error(stderr || 'child exit ' + code)),
        );
        child.on('error', reject);
      });
      finished.catch(() => {});
      done.push(finished);
      child.send({ root, nonce, index, mode: 'rotation' });
    }
    await Promise.all(ready);
    children.forEach((child) => child.send({ action: 'resume' }));
    await waitLocked();
    await controls[0].query('COMMIT');
    await Promise.all(done);
    await verify(before);
  } finally {
    await controls[0].query('ROLLBACK');
    for (const child of children)
      if (child.exitCode === null) {
        child.kill();
        await new Promise((resolve) => child.once('exit', resolve));
      }
  }
  console.log(
    'PASS WORKER CONCURRENCY: two Node processes race the same assignments A/B; one advance/log after locked recheck',
  );
  // Unmanaged transaction abandoned: V01 rolls it back and permits pool close.
  before = await reset();
  let captured, log;
  const unpublished = [];
  await scope(A, async (db) => {
    const tx = await db.transaction();
    captured = await Assign._loadForRotation(before.get(A).id, tx);
    await captured.applyRotationOffset(1, '2026-11-05', tx, (publish) => unpublished.push(publish));
    log = new Log()
      .setRotationAssignment(captured.getId())
      .setPreviousOffset(0)
      .setNewOffset(1)
      .setCycleLength(2)
      .setExecutedAt(new Date());
    await log.save(tx, (publish) => unpublished.push(publish));
    assert.equal(captured.getOffset(), 0);
    assert.equal(log.getId(), undefined);
  });
  await manager.closeTenant(A);
  initializer.cleanupTenant(A);
  const abandoned = (
    await controls[0].query(
      `SELECT "offset",last_advanced_date FROM "${T.ROTATION_ASSIGNMENTS}" WHERE id=$1`,
      [before.get(A).id],
    )
  ).rows[0];
  assert.equal(abandoned.offset, 0);
  assert.equal(abandoned.last_advanced_date, null);
  assert.equal(
    Number(
      (await controls[0].query(`SELECT count(*) AS n FROM "${T.ROTATION_ASSIGNMENT_LOGS}"`)).rows[0]
        .n,
    ),
    before.get(A).logs,
  );
  assert.equal(captured.getOffset(), 0);
  assert.equal(log.getId(), undefined);
  assert.ok(unpublished.length === 2);
  console.log(
    'PASS WORKER ABANDONMENT: owned UPDATE/log both rolled back, no memory publication, pool closed',
  );
  // Controlled post-query error after actual COMMIT models a lost success signal.
  // This is not a real network partition: actual server state is checked separately.
  before = await reset();
  const originalLoad = Assign._loadForRotation,
    originalSave = Log.prototype.save;
  const memory = {};
  Assign._loadForRotation = async function (...args) {
    const instance = await originalLoad.apply(this, args);
    memory.assignment = instance;
    return instance;
  };
  Log.prototype.save = async function (...args) {
    memory.log = this;
    return originalSave.apply(this, args);
  };
  try {
    await scope(A, async (db) => {
      let errors = 0;
      db.addHook('afterQuery', 'v01-commit-outcome', (_options, query) => {
        if (/^COMMIT;?$/i.test(query.sql)) {
          errors++;
          throw Error('V01_COMMIT_OUTCOME_UNKNOWN');
        }
      });
      const start = wire.length;
      let result;
      try {
        result = await run();
      } finally {
        db.removeHook('afterQuery', 'v01-commit-outcome');
      }
      assert.equal(result.failed, 1);
      assert.equal(result.processed, 0);
      assert.equal(errors, 1);
      assert.ok(result.errors[0].reason.includes('V01_COMMIT_OUTCOME_UNKNOWN'));
      assert.equal(
        wire
          .slice(start)
          .filter((q) => q.database === cfg(A).database && /^COMMIT;?$/i.test(q.text)).length,
        1,
      );
      assert.equal(memory.assignment.getOffset(), 0);
      assert.equal(memory.log.getId(), undefined);
      const row = (
        await controls[0].query(`SELECT "offset" FROM "${T.ROTATION_ASSIGNMENTS}" WHERE id=$1`, [
          before.get(A).id,
        ])
      ).rows[0];
      assert.equal(row.offset, 1);
      assert.equal(
        Number(
          (await controls[0].query(`SELECT count(*) AS n FROM "${T.ROTATION_ASSIGNMENT_LOGS}"`))
            .rows[0].n,
        ),
        before.get(A).logs + 1,
      );
    });
  } finally {
    Assign._loadForRotation = originalLoad;
    Log.prototype.save = originalSave;
  }
  console.log(
    'PASS WORKER COMMIT OUTCOME: simulated post-COMMIT error reports failure, no automatic replay or memory publication; real committed state retained',
  );
};
