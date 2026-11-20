'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
async function main() {
  let artifact = process.argv[2];
  if (!artifact || process.argv[3] !== '--create-disposable-cluster' || !path.isAbsolute(artifact))
    throw Error('ARTIFACT_AND_EXPLICIT_DISPOSABLE_FLAG_REQUIRED');
  const manifest = JSON.parse(fs.readFileSync(path.join(artifact, 'MANIFEST.json'), 'utf8'));
  for (const [file, hash] of Object.entries(manifest.files))
    assert.equal(
      crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(artifact, file)))
        .digest('hex'),
      hash,
      file,
    );
  assert.ok(
    !manifest.packages.some((p) =>
      ['ioredis', 'express', 'nodemailer', 'firebase-admin', 'socket.io'].includes(p.name),
    ),
  );
  const root = fs.mkdtempSync('/tmp/toke-cworker-'),
    data = path.join(root, 'data'),
    socket = path.join(root, 'socket'),
    nonce = crypto.randomBytes(24).toString('hex'),
    port = 15489;
  fs.mkdirSync(socket, { mode: 0o700 });
  fs.writeFileSync(path.join(root, 'owner'), nonce, { mode: 0o600 });
  const installed = path.join(root, 'installed');
  fs.cpSync(artifact, installed, { recursive: true });
  artifact = installed;
  const infoFile = path.join(root, 'fixture.json'),
    cacheFile = path.join(root, 'tenants.json');
  fs.writeFileSync(infoFile, JSON.stringify({ artifact, root, socket, port, nonce }), {
    mode: 0o600,
  });
  const configs = {};
  for (const s of ['a', 'b'])
    configs[s + '.cworker.invalid'] = {
      subdomain: s + '.cworker.invalid',
      active: true,
      host: socket,
      port,
      database: 'v01_test_' + s,
      username: 'runtime_' + s,
      password: '',
      reference: s === 'a' ? '100001' : '100002',
      last_updated: new Date().toISOString(),
    };
  fs.writeFileSync(cacheFile, JSON.stringify(configs), { mode: 0o600 });
  const env = { PATH: process.env.PATH, LANG: 'C', LC_ALL: 'C' },
    children = [],
    clients = [];
  let started = false;
  const run = (bin, args) => {
    const r = spawnSync(bin, args, { encoding: 'utf8', env, timeout: 45000 });
    if (r.error || r.status !== 0) throw Error(bin + ': ' + (r.error?.message || r.stderr));
    return r.stdout;
  };
  const childEnv = {
    PATH: process.env.PATH,
    NODE_ENV: 'production',
    TZ: 'Africa/Douala',
    C_WORKER_TENANT_CACHE_FILE: cacheFile,
    C_WORKER_FIXTURE_INFO: infoFile,
    DB_NAME:'MASTER_MUST_NOT_CONNECT',DB_HOST:path.join(root,'forbidden-master'),DB_PORT:'1',DB_USERNAME:'FAKE_MASTER',DB_PASSWORD:'FAKE_ONLY',
  };
  function child(mode) {
    const c = spawn(
      process.execPath,
      [
        '--require',
        path.join(__dirname, 'fixture-preload.cjs'),
        path.join(__dirname, 'fixture-driver.mjs'),
        mode,
      ],
      { cwd: artifact, env: childEnv, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
    );
    children.push(c);
    let output = '',
      message;
    c.stdout.on('data', (x) => (output += x));
    c.stderr.on('data', (x) => (output += x));
    c.on('message', (x) => (message = x));
    const done = new Promise((resolve, reject) => {
      c.on('error', reject);
      c.on('exit', (code, signal) =>
        code === 0 && message && !message.failure
          ? resolve(message)
          : reject(
              Error(
                'ARTIFACT_CHILD ' +
                  mode +
                  ' ' +
                  code +
                  ' ' +
                  signal +
                  ' ' +
                  (message?.failure ?? '') +
                  '\n' +
                  output,
              ),
            ),
      );
    });
    return { child: c, done, output: () => output };
  }
  try {
    console.log(run('postgres', ['--version']).trim());
    run('initdb', ['-D', data, '-U', 'control', '-A', 'trust', '--no-locale', '--encoding=UTF8']);
    run('pg_ctl', [
      '-D',
      data,
      '-l',
      path.join(root, 'pg.log'),
      '-o',
      `-h '' -k '${socket}' -p ${port}`,
      '-w',
      'start',
    ]);
    started = true;
    const { createRequire } = require('node:module'),
      pg = createRequire(path.join(artifact, 'package.json'))('pg');
    async function connect(db, user = 'control') {
      const c = new pg.Client({
        host: socket,
        port,
        database: db,
        user,
        password: '',
        connectionTimeoutMillis: 5000,
      });
      await c.connect();
      clients.push(c);
      return c;
    }
    const admin = await connect('postgres');
    for (const s of ['a', 'b']) {
      await admin.query(`CREATE ROLE fixture_${s} LOGIN; CREATE ROLE runtime_${s} LOGIN;`);
      await admin.query(`CREATE DATABASE v01_test_${s} OWNER fixture_${s}`);
      await admin.query(
        `REVOKE CONNECT ON DATABASE v01_test_${s} FROM PUBLIC; GRANT CONNECT ON DATABASE v01_test_${s} TO runtime_${s};`,
      );
    }
    const controls = [];
    for (const s of ['a', 'b']) {
      const c = await connect('v01_test_' + s);
      controls.push(c);
      if ((await c.query("SELECT FROM pg_available_extensions WHERE name='postgis'")).rowCount)
        await c.query('CREATE EXTENSION postgis');
    }
    await child('bootstrap').done;
    for (const [i, c] of controls.entries()) {
      const s = i === 0 ? 'a' : 'b';
      await c.query(
        `DROP TABLE tk_memo_reads; REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO runtime_${s}; GRANT SELECT ON ALL TABLES IN SCHEMA public TO runtime_${s}; GRANT UPDATE ON xa_rotation_assignments TO runtime_${s}; GRANT INSERT ON xa_rotation_assignment_log TO runtime_${s}; GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO runtime_${s};`,
      );
      await c.query(
        "CREATE FUNCTION public.fixture_deny_ddl() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FIXTURE_EXISTING_DDL_FORBIDDEN'; END $$; CREATE EVENT TRIGGER fixture_no_ddl ON ddl_command_start WHEN TAG IN ('CREATE TABLE','ALTER TABLE','CREATE TYPE','ALTER TYPE','CREATE INDEX') EXECUTE FUNCTION public.fixture_deny_ddl();",
      );
    }
    const snapshot = async (c) =>
      (await c.query('SELECT * FROM xa_rotation_assignments ORDER BY id')).rows;
    const logs = async (c) =>
      (await c.query('SELECT * FROM xa_rotation_assignment_log ORDER BY id')).rows;
    const reset = async () => {
      for (const c of controls)
        await c.query(
          'DELETE FROM xa_rotation_assignment_log; UPDATE xa_rotation_assignments SET "offset"=0,last_advanced_date=NULL;',
        );
    };
    const scheduled = await child('scheduled').done;
    for (const c of controls) {
      assert.equal((await snapshot(c))[0].offset, 1);
      const rows = await logs(c);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].cycle_length, 3);
      assert.equal(rows[0].previous_offset, 0);
      assert.equal(rows[0].new_offset, 1);
    }
    assert.ok(
      scheduled.wire.some((q) => q.sql.includes('IN (1)') || q.sql.includes('IN (1,')),
      'actual group selection includes Op.in',
    );
    await child('scheduled').done;
    for (const c of controls) assert.equal((await logs(c)).length, 1);
    console.log(
      'PASS artifact native entry + actual cron task execution, correct groups/cycle_length=3 (not informative99), A/B, no MemoReads table or DDL, replay idempotent',
    );
    // Transaction failures: trigger creation is a fixture-only admin operation.
    for (const operation of ['INSERT', 'UPDATE'])
      for (const [index, c] of controls.entries()) {
        await reset();
        const before = await snapshot(c);
        await c.query('ALTER EVENT TRIGGER fixture_no_ddl DISABLE');
        const table =
          operation === 'INSERT' ? 'xa_rotation_assignment_log' : 'xa_rotation_assignments';
        await c.query(
          `CREATE FUNCTION public.fixture_fail_rotation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FIXTURE_ROTATION_FAILURE'; END $$; CREATE TRIGGER fixture_fail_rotation BEFORE ${operation} ON ${table} FOR EACH ROW EXECUTE FUNCTION public.fixture_fail_rotation();`,
        );
        await c.query('ALTER EVENT TRIGGER fixture_no_ddl ENABLE');
        const r = await child('run').done;
        assert.equal(r.result[index].failed, 1);
        assert.deepEqual(await snapshot(c), before);
        assert.equal((await logs(c)).length, 0);
        assert.equal((await logs(controls[1 - index])).length, 1);
        await c.query('ALTER EVENT TRIGGER fixture_no_ddl DISABLE');
        await c.query(
          `DROP TRIGGER fixture_fail_rotation ON ${table}; DROP FUNCTION public.fixture_fail_rotation();`,
        );
        await c.query('ALTER EVENT TRIGGER fixture_no_ddl ENABLE');
      }
    console.log(
      'PASS artifact rollback: failed log INSERT / assignment UPDATE A/B preserve offset/date and journal, other tenant commits',
    );
    await reset();
    // Hold A's row until two distinct worker processes are waiting FOR UPDATE.
    await controls[0].query('BEGIN');
    await controls[0].query('SELECT * FROM xa_rotation_assignments FOR UPDATE');
    const first = child('run'),
      second = child('run');
    first.done.catch(() => {});
    second.done.catch(() => {});
    let waiting = false;
    for (let i = 0; i < 1200; i++) {
      const q = await admin.query(
        "SELECT count(*)::integer AS n FROM pg_stat_activity WHERE datname='v01_test_a' AND usename='runtime_a' AND wait_event_type='Lock' AND query ILIKE '%FOR UPDATE%'",
      );
      if (q.rows[0].n >= 2) {
        waiting = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    await controls[0].query('COMMIT');
    const rr = await Promise.all([first.done, second.done]);
    assert.ok(waiting, 'two real processes must wait for row lock');
    for (const c of controls) {
      assert.equal((await snapshot(c))[0].offset, 1);
      assert.equal((await logs(c)).length, 1);
    }
    assert.equal(
      rr.reduce((sum, x) => sum + x.result[0].processed, 0),
      1,
    );
    console.log(
      'PASS artifact two-process concurrency, real FOR UPDATE wait observed, exactly one advance/log A/B',
    );
    await child('guard').done;
    console.log(
      'PASS artifact V01: native/raw SQL absent/foreign context and transaction refused before driver',
    );
    await reset();
    const uncertain = await child('uncertain').done;
    assert.equal((await snapshot(controls[0]))[0].offset, 1);
    assert.equal((await logs(controls[0])).length, 1);
    assert.equal(uncertain.wire.filter((q) => /^COMMIT\b/i.test(q.sql)).length, 1);
    console.log(
      'PASS artifact uncertain commit: real SQL COMMIT then injected acknowledgement failure; durable offset/log, failed=1/processed=0, no replay',
    );
    await reset();
    await controls[0].query('BEGIN');
    await controls[0].query('SELECT * FROM xa_rotation_assignments FOR UPDATE');
    const busy = child('busy');
    busy.done.catch(() => {});
    let busyWaiting = false;
    for (let i = 0; i < 1200; i++) {
      const observed = await admin.query(
        "SELECT count(*)::integer AS n FROM pg_stat_activity WHERE datname='v01_test_a' AND usename='runtime_a' AND wait_event_type='Lock' AND query ILIKE '%FOR UPDATE%'",
      );
      if (observed.rows[0].n >= 1) {
        busyWaiting = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.ok(busyWaiting, 'running scheduled task must be blocked in SQL before signal');
    busy.child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(busy.child.exitCode, null, 'signal waits for running transaction');
    await controls[0].query('COMMIT');
    await busy.done;
    assert.ok(busy.output().includes('C_WORKER_DRAINED'));
    for (const c of controls) assert.equal((await logs(c)).length, 1);
    console.log(
      'PASS SIGTERM during actual scheduled execution waits for transaction and both tenants, then drains pools',
    );
    // Start the shipped launcher itself as the OS entry, not just a module import.
    const proc = spawn(
      process.execPath,
      ['--require', path.join(__dirname, 'fixture-preload.cjs'), path.join(artifact, 'run.mjs')],
      { cwd: artifact, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    children.push(proc);
    let out = '';
    proc.stdout.on('data', (x) => (out += x));
    proc.stderr.on('data', (x) => (out += x));
    const exit = new Promise((resolve, reject) => {
      proc.on('error', reject);
      proc.on('exit', (code, signal) => resolve({ code, signal }));
    });
    for (let i = 0; i < 100 && !out.includes('C_WORKER_READY'); i++)
      await new Promise((r) => setTimeout(r, 25));
    assert.ok(out.includes('C_WORKER_READY'), out);
    proc.kill('SIGTERM');
    const stopped = await exit;
    assert.equal(stopped.code, 0);
    assert.ok(out.includes('C_WORKER_DRAINED'));
    console.log(
      'PASS actual OS entry startup + SIGTERM shutdown, no HTTP listener/external network/real dotenv/cache, no Redis package',
    );
    for (const [file, hash] of Object.entries(manifest.files))
      assert.equal(
        crypto
          .createHash('sha256')
          .update(fs.readFileSync(path.join(artifact, file)))
          .digest('hex'),
        hash,
        'artifact unchanged ' + file,
      );
    console.log(
      'PASS native runtime tested after relocation outside workspace, all dependencies private',
    );
    console.log('RESULT C-WORKER artifact verification PASS');
  } finally {
    for (const c of children)
      if (c.exitCode === null && c.signalCode === null) {
        c.kill('SIGTERM');
        await new Promise((r) => c.once('exit', r));
      }
    await Promise.all(clients.map((c) => c.end()));
    if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
    assert.equal(fs.readFileSync(path.join(root, 'owner'), 'utf8'), nonce);
    fs.rmSync(root, { recursive: true });
    console.log('CLEANUP owned A/B cluster stopped and removed; all child processes exited');
  }
}
main().catch((e) => {
  console.error(e.stack);
  process.exitCode = 1;
});
