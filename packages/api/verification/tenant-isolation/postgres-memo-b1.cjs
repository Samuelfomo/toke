'use strict';
// Dedicated B1 harness. No env/.env credentials, existing server or TCP path.
// Real V01 modules are injected unchanged through the existing closed harness.
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  crypto = require('node:crypto');
const assert = require('node:assert/strict'),
  vm = require('node:vm'),
  ts = require('typescript');
const { spawnSync } = require('node:child_process');
const sqlFile = path.resolve(__dirname, '../../migrations/manual/memo_foundations_b1_v1.sql');
const sourceRoot = path.resolve(__dirname, '../../src');
function loadFoundations(runtime) {
  const cache = new Map();
  const allow = new Set(['foundations.models.ts', 'foundations.persistence.ts']);
  function load(name) {
    assert.ok(allow.has(name));
    if (cache.has(name)) return cache.get(name);
    const exports = {};
    const code = ts.transpileModule(
      fs.readFileSync(path.join(sourceRoot, 'tenant/persistence/memos', name), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
    ).outputText;
    vm.runInNewContext(
      code,
      {
        exports,
        console,
        Date,
        Buffer,
        require(spec) {
          if (spec === 'sequelize') return runtime.sequelize;
          if (spec === '../../database/db.tenant-manager.js') return { default: runtime.manager };
          if (spec === '../../database/tenant.ownership.js') return runtime.ownership;
          if (spec === './foundations.models.js') return load('foundations.models.ts');
          throw Error('B1_IMPORT_DENIED: ' + spec);
        },
      },
      { timeout: 2000, filename: name },
    );
    cache.set(name, exports);
    return exports;
  }
  return load('foundations.persistence.ts').MemoFoundationsPersistence;
}
async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--create-disposable-cluster')
    throw Error('Explicit --create-disposable-cluster required; no connection attempted');
  const procEnv = { PATH: process.env.PATH, LANG: 'C', LC_ALL: 'C' };
  function run(bin, args) {
    const r = spawnSync(bin, args, { encoding: 'utf8', env: procEnv, timeout: 45000 });
    if (r.error || r.status !== 0) throw Error(bin + ': ' + (r.error?.message || r.stderr));
    return r.stdout;
  }
  console.log(run('postgres', ['--version']).trim());
  const root = fs.mkdtempSync(path.join('/tmp', 'toke-b1-')),
    data = path.join(root, 'data'),
    socket = path.join(root, 'socket');
  const nonce = crypto.randomBytes(24).toString('hex');
  fs.mkdirSync(socket, { mode: 0o700 });
  fs.writeFileSync(path.join(root, 'owner'), nonce, { mode: 0o600 });
  const port = 15483,
    wire = [],
    clients = [];
  let started = false,
    runtime;
  try {
    run('initdb', [
      '-D',
      data,
      '-U',
      'b1_control',
      '-A',
      'trust',
      '--no-locale',
      '--encoding=UTF8',
    ]);
    run('pg_ctl', [
      '-D',
      data,
      '-l',
      path.join(root, 'server.log'),
      '-o',
      `-h '' -k '${socket}' -p ${port}`,
      '-w',
      'start',
    ]);
    started = true;
    for (const key of Object.keys(process.env))
      if (/^(PG|DB_)|^DATABASE_URL$/.test(key)) delete process.env[key];
    const pg = require('pg');
    class LocalClient extends pg.Client {
      constructor(c) {
        assert.equal(c.host, socket);
        assert.equal(c.port, port);
        assert.ok(['postgres', 'v01_test_a', 'v01_test_b'].includes(c.database));
        assert.equal(c.connectionString, undefined);
        assert.equal(c.stream, undefined);
        super({
          ...c,
          ssl: false,
          connectionTimeoutMillis: 5000,
          query_timeout: 30000,
          statement_timeout: 25000,
        });
      }
      query(q, ...a) {
        wire.push({ db: this.database, sql: typeof q === 'string' ? q : q.text });
        return super.query(q, ...a);
      }
    }
    async function client(db, user) {
      assert.equal(fs.readFileSync(path.join(root, 'owner'), 'utf8'), nonce);
      const c = new LocalClient({ host: socket, port, database: db, user, password: '' });
      await c.connect();
      clients.push(c);
      return c;
    }
    const admin = await client('postgres', 'b1_control');
    for (const suffix of ['a', 'b']) {
      await admin.query(
        `CREATE ROLE fixture_${suffix} LOGIN; CREATE ROLE migrate_${suffix} NOLOGIN; CREATE ROLE runtime_${suffix} LOGIN;`,
      );
      await admin.query(`CREATE DATABASE v01_test_${suffix} OWNER fixture_${suffix}`);
      await admin.query(
        `REVOKE ALL ON DATABASE v01_test_${suffix} FROM PUBLIC; GRANT CONNECT ON DATABASE v01_test_${suffix} TO runtime_${suffix}; GRANT TEMP ON DATABASE v01_test_${suffix} TO migrate_${suffix};`,
      );
    }
    runtime = require('./postgres-runtime.cjs')({ ...pg, Client: LocalClient });
    const Repository = loadFoundations(runtime),
      { manager, initializer } = runtime;
    const tenants = ['a.v01.invalid', 'b.v01.invalid'];
    const cfg = (tenant, role) => ({
      host: socket,
      port,
      database: 'v01_test_' + tenant[0],
      username: role + '_' + tenant[0],
      password: '',
    });
    const fixtures = {};
    for (const tenant of tenants) {
      const control = await client(cfg(tenant, 'fixture').database, 'b1_control');
      if (
        (await control.query("SELECT FROM pg_available_extensions WHERE name='postgis'")).rowCount
      )
        await control.query('CREATE EXTENSION postgis');
      await manager.runWithTenant(tenant, async () => {
        const db = await manager.getConnectionForTenant(tenant, cfg(tenant, 'fixture'));
        await initializer.initialize(db, { mode: 'bootstrap' });
        let seq = 1000;
        async function seed(table, patch = {}) {
          const m = initializer.getModel(table),
            row = {};
          for (const [name, a] of Object.entries(m.rawAttributes)) {
            if (a.autoIncrement || a.defaultValue !== undefined || a.allowNull !== false) continue;
            row[name] =
              a.values?.[0] ??
              a.type.values?.[0] ??
              {
                INTEGER: 1,
                SMALLINT: 1,
                BIGINT: 1,
                BOOLEAN: true,
                DATE: new Date('2030-01-01T08:00:00Z'),
                DATEONLY: '2030-01-01',
                JSONB: {},
                JSON: {},
                FLOAT: 1,
                DOUBLE: 1,
                DECIMAL: 1,
              }[a.type.key] ??
              ('fixture-' + ++seq).slice(0, a.type.options?.length ?? 255);
          }
          if (m.rawAttributes.guid) row.guid = String(++seq);
          return m.create({ ...row, ...patch }, { validate: false });
        }
        const user = await seed('xa_users', {
          tenant,
          first_name: tenant,
          last_name: 'B1',
          employee_color: '#101010',
          country: 'CM',
        });
        const site = await seed('xa_sites', {
          tenant,
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
        });
        const session = await seed('xa_work_sessions', { user: user.id, site: site.id });
        const device = await seed('xa_device', { site: site.id });
        const entry = await seed('tk_time_entries', {
          user: user.id,
          site: site.id,
          session: session.id,
          device: device.id,
          clocked_at: new Date('2030-01-01T09:00:00Z'),
          real_clocked_at: new Date('2030-01-01T08:00:00Z'),
          pointage_status: 'corrected',
          correction_reason: 'Historical fixture: prior correction, audit origin unavailable',
        });
        const memos = [];
        for (const status of ['submitted', 'pending', 'approved', 'rejected', 'revoked'])
          memos.push(
            (
              await seed('tk_memos', {
                author_user: user.id,
                target_user: null,
                validator_user: null,
                memo_status: status,
                title: tenant + ':' + status,
                memo_content: [],
                affected_entries: [entry.id],
              })
            ).id,
          );
        fixtures[tenant] = { user: user.id, session: session.id, entry: entry.id, memos, control };
      });
      await control.query(
        `REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE,CREATE ON SCHEMA public TO migrate_${tenant[0]}; GRANT USAGE ON SCHEMA public TO runtime_${tenant[0]}; GRANT SELECT ON ALL TABLES IN SCHEMA public TO runtime_${tenant[0]}; GRANT REFERENCES ON tk_memos,xa_users,tk_time_entries,xa_work_sessions TO migrate_${tenant[0]}; GRANT SELECT ON tk_memos TO migrate_${tenant[0]}; GRANT UPDATE(id) ON tk_memos TO migrate_${tenant[0]};`,
      );
    }
    await manager.closeAllConnections();
    const migration = fs.readFileSync(sqlFile, 'utf8');
    const tables = [
      'tk_memo_workflows',
      'tk_memo_events',
      'tk_memo_commands',
      'tk_time_raw_observations',
      'tk_time_correction_changes',
    ];
    const checks = [];
    for (const tenant of tenants) {
      const f = fixtures[tenant],
        s = tenant[0],
        control = f.control,
        dbName = cfg(tenant, 'runtime').database;
      const raw = await client(dbName, 'runtime_' + s);
      const owner = await client(dbName, 'b1_control');
      await owner.query('SET ROLE migrate_' + s);
      async function execute(sql) {
        try {
          return await owner.query(sql);
        } catch (e) {
          await owner.query('ROLLBACK');
          throw e;
        }
      }
      const snapshots = async () => {
        const out = {};
        for (const t of ['tk_memos', 'xa_users', 'tk_time_entries', 'xa_work_sessions'])
          out[t] = (
            await control.query(`SELECT to_jsonb(t) AS row FROM public.${t} t ORDER BY id`)
          ).rows;
        return out;
      };
      const initial = await snapshots();
      // Existing without B1 fails closed; no model/DDL created by repository.
      await manager.runWithTenant(tenant, async () => {
        const db = await manager.getConnectionForTenant(tenant, cfg(tenant, 'runtime'));
        const start = wire.length;
        await assert.rejects(Repository.loadExisting(db), /toke_b1_version/);
        assert.ok(!wire.slice(start).some((x) => /^\s*(CREATE|ALTER|DROP|TRUNCATE)/i.test(x.sql)));
      });
      await assert.rejects(execute(migration), /B1_EXPLICIT_DATABASE_OWNER_RUNTIME_REQUIRED/);
      await owner.query(
        "SELECT set_config('toke.migration.expected_database',$1,false),set_config('toke.migration.expected_role',$2,false),set_config('toke.migration.runtime_role',$3,false)",
        [dbName, 'migrate_' + s, 'runtime_' + s],
      );
      // Incompatible historical PK fails without any B1 object.
      const incompatible = migration.replace(
        "('xa_work_sessions','smallint')",
        "('xa_work_sessions','integer')",
      );
      await assert.rejects(execute(incompatible), /B1_PARENT_INCOMPATIBLE/);
      assert.equal(
        (await control.query("SELECT to_regclass('public.tk_memo_workflows') AS t")).rows[0].t,
        null,
      );
      // Failure after DDL must roll back tables/functions/registry together.
      await assert.rejects(
        execute(
          migration.replace(
            ' -- Explicit ACLs override',
            " RAISE EXCEPTION 'B1_INJECTED_MIGRATION_FAILURE';\n -- Explicit ACLs override",
          ),
        ),
        /B1_INJECTED_MIGRATION_FAILURE/,
      );
      for (const t of tables)
        assert.equal(
          (await control.query('SELECT to_regclass($1) AS t', ['public.' + t])).rows[0].t,
          null,
        );
      assert.equal(
        (
          await control.query(
            "SELECT to_regprocedure('public.toke_b1_observe_legacy(uuid,integer,integer,text,jsonb)') AS t",
          )
        ).rows[0].t,
        null,
      );
      // Homonymous, unversioned object refused and not repaired.
      await owner.query('CREATE TABLE public.tk_memo_events(wrong text)');
      await assert.rejects(execute(migration), /B1_UNVERSIONED_OBJECT/);
      await owner.query('DROP TABLE public.tk_memo_events');
      await execute(migration);
      await execute(migration);
      assert.deepEqual(await snapshots(), initial);
      for (const t of tables)
        assert.equal(
          (await raw.query(`SELECT count(*)::int AS n FROM public.${t}`)).rows[0].n,
          0,
          'no backfill',
        );
      // Strict catalog drift, including indexes, types and ACLs, never repaired.
      await owner.query('ALTER TABLE public.tk_memo_events ADD COLUMN unexpected text');
      await assert.rejects(execute(migration), /B1_INSTALLED_SCHEMA_DRIFT/);
      await owner.query('ALTER TABLE public.tk_memo_events DROP COLUMN unexpected');
      // Dropping a physical column leaves a catalog hole, deliberately ignored.
      await execute(migration);
      await owner.query('DROP INDEX public.tk_memo_events_cycles');
      await assert.rejects(execute(migration), /B1_INSTALLED_SCHEMA_DRIFT/);
      await owner.query(
        'CREATE INDEX tk_memo_events_cycles ON public.tk_memo_events(memo_id,decision_cycle,sequence)',
      );
      await execute(migration);
      // Verify database role separation and all effective privileges.
      for (const t of tables) {
        for (const statement of [
          `UPDATE public.${t} SET ${t === 'tk_memo_workflows' ? 'version=version' : 'memo_id=memo_id'} WHERE false`,
          `DELETE FROM public.${t} WHERE false`,
          `TRUNCATE public.${t}`,
        ]) {
          // raw observations have no memo_id: column-independent no-op update.
          const sql = statement.replace(
            'SET memo_id=memo_id WHERE false',
            t === 'tk_time_raw_observations'
              ? 'SET source=source WHERE false'
              : 'SET memo_id=memo_id WHERE false',
          );
          await assert.rejects(raw.query(sql), (e) => e.code === '42501');
        }
        assert.equal(
          (
            await raw.query("SELECT has_table_privilege(current_user,$1,'INSERT') AS p", [
              'public.' + t,
            ])
          ).rows[0].p,
          false,
        );
      }
      for (const t of tables.filter((x) => x !== 'tk_memo_workflows'))
        for (const verb of ['UPDATE', 'DELETE', 'TRUNCATE']) {
          const statement =
            verb === 'UPDATE'
              ? `UPDATE public.${t} SET ${t === 'tk_time_raw_observations' ? 'source=source' : 'memo_id=memo_id'} WHERE false`
              : verb === 'DELETE'
                ? `DELETE FROM public.${t} WHERE false`
                : `TRUNCATE public.${t} CASCADE`;
          await assert.rejects(owner.query(statement), /B1_APPEND_ONLY/);
        }
      await assert.rejects(raw.query('SET ROLE migrate_' + s), (e) => e.code === '42501');
      // Repository initialization and actual V01 existing initialization are read-only.
      await manager.runWithTenant(tenant, async () => {
        const db = await manager.getConnectionForTenant(tenant, cfg(tenant, 'runtime'));
        // Main initializer needs SELECT? catalog descriptions only, as in existing.
        const start = wire.length;
        await initializer.initialize(db, { mode: 'existing' });
        const repo = await Repository.loadExisting(db);
        assert.equal(repo.models.size, 5);
        await Repository.loadExisting(db);
        assert.ok(
          !wire.slice(start).some((x) => /^\s*(CREATE|ALTER|DROP|TRUNCATE)/i.test(x.sql)),
          'existing has no DDL',
        );
        f.repository = repo;
        const id = crypto.randomUUID(),
          input = { commandId: id, memoId: f.memos[0], actorId: f.user };
        f.command = id;
        const answer = await db.transaction((tx) => repo.observeLegacyState(input, tx));
        const replay = await db.transaction((tx) => repo.observeLegacyState(input, tx));
        assert.deepEqual(replay, answer);
        await assert.rejects(
          db.transaction((tx) => repo.observeLegacyState({ ...input, memoId: f.memos[1] }, tx)),
          /B1_COMMAND_CONFLICT/,
        );
        await assert.rejects(
          db.transaction((tx) =>
            repo.observeLegacyState({ ...input, delegatedActorRef: 'different' }, tx),
          ),
          /B1_COMMAND_CONFLICT/,
        );
        await assert.rejects(
          db.transaction((tx) =>
            repo.observeLegacyState({ ...input, commandId: crypto.randomUUID() }, tx),
          ),
          /B1_WORKFLOW_ALREADY_EXISTS/,
        );
        await assert.rejects(
          db.transaction(async (tx) => {
            await repo.observeLegacyState(
              { commandId: crypto.randomUUID(), memoId: f.memos[1], actorId: f.user },
              tx,
            );
            await db.query('SELECT 1/0', { transaction: tx });
          }),
          /division by zero/,
        );
        assert.equal(
          (await raw.query('SELECT count(*)::int AS n FROM tk_memo_workflows')).rows[0].n,
          1,
        );
        assert.equal(
          (await raw.query('SELECT count(*)::int AS n FROM tk_memo_events')).rows[0].n,
          1,
        );
        assert.equal(
          (await raw.query('SELECT count(*)::int AS n FROM tk_memo_commands')).rows[0].n,
          1,
        );
        // Missing actor FK rolls back every insertion.
        await assert.rejects(
          db.transaction((tx) =>
            repo.observeLegacyState(
              { commandId: crypto.randomUUID(), memoId: f.memos[1], actorId: -999 },
              tx,
            ),
          ),
          (e) => e.original?.code === '23503',
        );
        f.event = answer.event_id;
      });
      assert.deepEqual(await snapshots(), initial, 'observing never changes historical rows');
      const workflow = (await raw.query('SELECT * FROM tk_memo_workflows')).rows[0];
      assert.equal(workflow.responsible_user_id, null);
      assert.equal(workflow.history_completeness, 'LEGACY_INCOMPLETE');
      assert.equal(workflow.initial_known_state.past_decision_date_known, false);
      assert.equal(
        (await raw.query('SELECT event_type FROM tk_memo_events')).rows[0].event_type,
        'LEGACY_STATE_OBSERVED',
      );
      // Same key concurrently: actual two sessions, exactly one durable result.
      const second = await client(dbName, 'runtime_' + s),
        concurrent = crypto.randomUUID();
      const args = [concurrent, f.memos[1], f.user, null, '{}'];
      const res = await Promise.all(
        [raw, second].map((c) =>
          c.query('SELECT public.toke_b1_observe_legacy($1,$2,$3,$4,$5) AS result', args),
        ),
      );
      assert.deepEqual(res[0].rows, res[1].rows);
      // Same key, contradictory concurrent payload/memo must never be accepted.
      await assert.rejects(
        raw.query('SELECT public.toke_b1_observe_legacy($1,$2,$3,$4,$5)', [
          concurrent,
          f.memos[2],
          f.user,
          null,
          '{}',
        ]),
        /B1_COMMAND_CONFLICT/,
      );
      // State cannot advance without a matching new event, even through owner SQL.
      await assert.rejects(
        execute(
          `BEGIN; UPDATE public.tk_memo_workflows SET version=version+1 WHERE memo_id=${f.memos[0]}; COMMIT;`,
        ),
        /B1_WORKFLOW_EVENT_MISMATCH|B1_WORKFLOW_ADVANCE_REQUIRES_EVENT/,
      );
      await assert.rejects(
        execute(
          `BEGIN; UPDATE public.tk_memo_workflows SET initial_known_state='{}' WHERE memo_id=${f.memos[0]}; COMMIT;`,
        ),
        /B1_INITIAL_STATE_IMMUTABLE/,
      );
      await assert.rejects(
        execute(
          `BEGIN; UPDATE public.tk_memo_workflows SET responsibility_reason='CHANGED_WITHOUT_EVENT' WHERE memo_id=${f.memos[0]}; COMMIT;`,
        ),
        /B1_WORKFLOW_ADVANCE_REQUIRES_EVENT/,
      );
      // Cross-memo last-event FK: requires deferred transaction check.
      await assert.rejects(
        execute(
          `BEGIN; INSERT INTO public.tk_memo_workflows(memo_id,responsibility_state,responsibility_reason,responsibility_provenance,decision_cycle,version,last_event_id,initial_known_state,history_completeness) VALUES(${f.memos[2]},'UNRESOLVED','TEST','{}',1,1,'${f.event}','{}','LEGACY_INCOMPLETE'); SET CONSTRAINTS ALL IMMEDIATE; COMMIT;`,
        ),
        (e) => e.code === '23503' || /B1_WORKFLOW_EVENT_MISMATCH/.test(e.message),
      );
      // Owner fixture inserts are only inside rollback transactions, not app writers.
      async function rejectFixture(body, pattern) {
        await assert.rejects(
          execute('BEGIN; ' + body + '; SET CONSTRAINTS ALL IMMEDIATE; COMMIT;'),
          pattern,
        );
      }
      const cmd2 = (
        await raw.query('SELECT command_id FROM tk_memo_commands WHERE memo_id=$1', [f.memos[1]])
      ).rows[0].command_id;
      await rejectFixture(
        `INSERT INTO tk_memo_events(event_id,memo_id,sequence,event_type,actor_kind,effective_author_id,decision_cycle,version,command_id,command_event_index,metadata) VALUES(gen_random_uuid(),${f.memos[0]},2,'COMMENTED','HUMAN',${f.user},1,2,'${cmd2}',1,'{"schema_version":1}')`,
        (e) => e.code === '23503',
      );
      await rejectFixture(
        `INSERT INTO tk_memo_events(event_id,memo_id,sequence,event_type,actor_kind,effective_author_id,decision_cycle,version,command_id,command_event_index,metadata) VALUES(gen_random_uuid(),${f.memos[0]},2,'COMMENTED','HUMAN',${f.user},1,2,'${f.command}',1,'{"schema_version":1}')`,
        /B1_EVENT_CHAIN_INVALID|B1_EVENT_WITHOUT_PROJECTION/,
      );
      await rejectFixture(
        `INSERT INTO tk_time_raw_observations(observation_id,entry_id,session_id,field,source,source_reference,provenance_quality,metadata) VALUES(gen_random_uuid(),${f.entry},${f.session},'clocked_at','SERVER','x','RAW_CAPTURED','{}')`,
        (e) => e.code === '23514',
      );
      await rejectFixture(
        `INSERT INTO tk_time_raw_observations(observation_id,entry_id,field,source,source_reference,provenance_quality,metadata) VALUES(gen_random_uuid(),-999,'clocked_at','SERVER','x','RAW_CAPTURED','{}')`,
        (e) => e.code === '23503',
      );
      await rejectFixture(
        `INSERT INTO tk_time_raw_observations(observation_id,entry_id,field,source,source_reference,provenance_quality,metadata) VALUES(gen_random_uuid(),${f.entry},'clocked_at','LEGACY_OBSERVED','x','RAW_CAPTURED','{}')`,
        (e) => e.code === '23514',
      );
      await rejectFixture(
        `INSERT INTO tk_time_correction_changes(change_id,command_id,memo_id,event_id,no_decision_reason,entry_id,field,before_value,after_value,actor_id,justification,version_before,version_after,provenance_quality,metadata) VALUES(gen_random_uuid(),'${f.command}',${f.memos[0]},'${f.event}','NO_DECISION',${f.entry},'clocked_at','2030-01-01','2030-01-02',${f.user},'fixture',0,1,'UNKNOWN','{}')`,
        /B1_CORRECTION_EVENT_REQUIRED/,
      );
      // Positive correction audit graph, then rollback: no hourly source is changed.
      const correctionEvent = crypto.randomUUID(),
        rawEntry = crypto.randomUUID(),
        rawSession = crypto.randomUUID(),
        change = crypto.randomUUID();
      const correctionSetup = `
        INSERT INTO tk_memo_events(event_id,memo_id,sequence,event_type,actor_kind,effective_author_id,decision_cycle,version,previous_event_id,command_id,command_event_index,metadata)
        VALUES('${correctionEvent}',${f.memos[0]},2,'TIME_CORRECTION_APPLIED','HUMAN',${f.user},1,2,'${f.event}','${f.command}',1,'{"schema_version":1}');
        UPDATE tk_memo_workflows SET last_event_id='${correctionEvent}',version=2 WHERE memo_id=${f.memos[0]};
        INSERT INTO tk_time_raw_observations(observation_id,entry_id,field,raw_value,source,source_reference,provenance_quality,metadata)
        VALUES('${rawEntry}',${f.entry},'clocked_at','2030-01-01','SERVER','raw-entry','RAW_CAPTURED','{}');
        INSERT INTO tk_time_raw_observations(observation_id,session_id,field,raw_value,source,source_reference,provenance_quality,metadata)
        VALUES('${rawSession}',${f.session},'session_start_at','2030-01-01','SERVER','raw-session','RAW_CAPTURED','{}');`;
      const correctionInsert = `INSERT INTO tk_time_correction_changes(change_id,command_id,memo_id,event_id,no_decision_reason,entry_id,field,before_value,after_value,raw_observation_id,actor_id,justification,version_before,version_after,provenance_quality,metadata)
        VALUES('${change}','${f.command}',${f.memos[0]},'${correctionEvent}','NO_DECISION',${f.entry},'clocked_at','2030-01-01','2030-01-02','${rawEntry}',${f.user},'fixture explicit correction',0,1,'RAW_CAPTURED','{}')`;
      await execute(
        'BEGIN; ' +
          correctionSetup +
          correctionInsert +
          '; SET CONSTRAINTS ALL IMMEDIATE; ROLLBACK;',
      );
      await rejectFixture(
        correctionSetup + correctionInsert.replace("'" + rawEntry + "'", "'" + rawSession + "'"),
        (e) => e.code === '23503',
      );
      await rejectFixture(
        correctionSetup +
          correctionInsert.replace(
            "'" + correctionEvent + "','NO_DECISION'",
            "'" + f.event + "','NO_DECISION'",
          ),
        /B1_CORRECTION_EVENT_REQUIRED/,
      );
      await rejectFixture(
        correctionSetup + correctionInsert.replace("'RAW_CAPTURED','{}')", "'UNKNOWN','{}')"),
        /B1_RAW_PROVENANCE_MISMATCH/,
      );
      await rejectFixture(
        correctionSetup +
          correctionInsert
            .replace(
              'version_before,version_after',
              'decision_event_id,version_before,version_after',
            )
            .replace(
              "'fixture explicit correction',0,1",
              "'fixture explicit correction','" + f.event + "',0,1",
            )
            .replace("'NO_DECISION'", 'NULL'),
        /B1_DECISION_EVENT_REQUIRED/,
      );
      // A predecessor from another field/target cannot bypass composite FK via NULL.
      const nextChange = crypto.randomUUID();
      const invalidNext = `INSERT INTO tk_time_correction_changes(change_id,command_id,memo_id,event_id,no_decision_reason,session_id,field,before_value,after_value,previous_change_id,actor_id,justification,version_before,version_after,provenance_quality,metadata)
        VALUES('${nextChange}','${f.command}',${f.memos[0]},'${correctionEvent}','NO_DECISION',${f.session},'session_start_at','2030-01-02','2030-01-03','${change}',${f.user},'fixture invalid chain',1,2,'UNKNOWN','{}')`;
      await rejectFixture(
        correctionSetup + correctionInsert + ';' + invalidNext,
        (e) => e.code === '23503',
      );
      // Partial unique index enforces one decision per cycle independently of app checks.
      const decisions = [1, 2]
        .map(
          (
            n,
          ) => `INSERT INTO tk_memo_events(event_id,memo_id,sequence,event_type,actor_kind,effective_author_id,decision_result,decision_cycle,version,previous_event_id,command_id,command_event_index,metadata)
        VALUES(gen_random_uuid(),${f.memos[0]},${n + 1},'DECIDED','HUMAN',${f.user},'approved',1,2,'${f.event}','${f.command}',${n},'{"schema_version":1}')`,
        )
        .join(';');
      await rejectFixture(decisions, (e) => e.code === '23505');
      assert.deepEqual(
        await snapshots(),
        initial,
        'all correction fixtures rolled back; historical sources intact',
      );
      // Observing a terminal historical memo must not manufacture a DECIDED event.
      await raw.query('SELECT public.toke_b1_observe_legacy($1,$2,$3,$4,$5)', [
        crypto.randomUUID(),
        f.memos[2],
        f.user,
        null,
        '{}',
      ]);
      const observedTerminal = (
        await raw.query('SELECT event_type,metadata FROM tk_memo_events WHERE memo_id=$1', [
          f.memos[2],
        ])
      ).rows;
      assert.equal(observedTerminal.length, 1);
      assert.equal(observedTerminal[0].event_type, 'LEGACY_STATE_OBSERVED');
      assert.equal(observedTerminal[0].metadata.observed_state.memo_status, 'approved');
      assert.equal(observedTerminal[0].metadata.observed_state.past_decision_date_known, false);
      assert.deepEqual(await snapshots(), initial);
      const evidenceBefore = (
        await raw.query(
          'SELECT jsonb_agg(to_jsonb(e) ORDER BY sequence,memo_id) AS rows FROM tk_memo_events e',
        )
      ).rows;
      await execute(migration); // Data-bearing rerun does not rewrite any evidence.
      assert.deepEqual(
        (
          await raw.query(
            'SELECT jsonb_agg(to_jsonb(e) ORDER BY sequence,memo_id) AS rows FROM tk_memo_events e',
          )
        ).rows,
        evidenceBefore,
      );

      checks.push(
        dbName +
          ': positive correction graph (rollback), composite target FK/provenance/decision references, one decision per cycle, install/rerun, incompatible schema, no backfill, immutability, FK, rollback, command replay/conflict, concurrency, existing no DDL PASS',
      );
    }
    // No tenant role can connect to the other fictitious DB.
    const forbidden = new LocalClient({
      host: socket,
      port,
      database: 'v01_test_b',
      user: 'runtime_a',
      password: '',
    });
    try {
      await assert.rejects(forbidden.connect(), /permission denied/);
    } finally {
      await forbidden.end();
    }
    for (const tenant of tenants) {
      const f = fixtures[tenant],
        other = tenant === tenants[0] ? tenants[1] : tenants[0];
      await assert.rejects(
        manager.runWithTenant(other, () =>
          f.repository.observeLegacyState(
            { commandId: crypto.randomUUID(), memoId: f.memos[2], actorId: f.user },
            {},
          ),
        ),
        /TENANT_CONTEXT_MISMATCH/,
      );
      await manager.runWithTenant(tenant, async () => {
        const db = await manager.getConnectionForTenant(tenant, cfg(tenant, 'runtime'));
        await assert.rejects(
          manager.runTenantOperation(other, () =>
            manager
              .getConnectionForTenant(other, cfg(other, 'runtime'))
              .then((otherDb) =>
                otherDb.transaction((tx) =>
                  f.repository.observeLegacyState(
                    { commandId: crypto.randomUUID(), memoId: f.memos[2], actorId: f.user },
                    tx,
                  ),
                ),
              ),
          ),
          /TENANT_CONTEXT_MISMATCH|TENANT_TRANSACTION_MISMATCH/,
        );
        const result = await db.query(
          'SELECT initial_known_state FROM public.tk_memo_workflows WHERE memo_id=$1',
          { bind: [f.memos[0]], type: runtime.sequelize.QueryTypes.SELECT },
        );
        assert.equal(result[0].initial_known_state.memo_status, 'submitted');
      });
    }
    console.log(checks.join('\n'));
    console.log(
      'PASS B1: A/B isolated, dedicated NOLOGIN migration owners / restricted LOGIN runtime, original V01 existing initialization unchanged; no production, no HTTP, no worker',
    );
  } finally {
    if (runtime) await runtime.manager.closeAllConnections();
    await Promise.all(clients.map((c) => c.end()));
    if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
    assert.equal(fs.readFileSync(path.join(root, 'owner'), 'utf8'), nonce);
    fs.rmSync(root, { recursive: true });
  }
}
main().catch((e) => {
  console.error(e.stack);
  console.error(e.message, e.original?.message);
  process.exitCode = 1;
});
