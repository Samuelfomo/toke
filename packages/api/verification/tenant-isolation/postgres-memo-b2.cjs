'use strict';
// No existing-cluster mode, env file or external transport. All application
// sources are transpiled through closed loaders with explicit dependencies.
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process'),
  vm = require('node:vm'),
  ts = require('typescript'),
  http = require('node:http'),
  express = require('express');
const rootSource = path.resolve(__dirname, '../../src');
async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--create-disposable-cluster')
    throw Error('Explicit --create-disposable-cluster required; no connection attempted');
  const root = fs.mkdtempSync('/tmp/toke-b2-'),
    data = path.join(root, 'data'),
    socket = path.join(root, 'socket'),
    nonce = crypto.randomBytes(24).toString('hex');
  fs.mkdirSync(socket, { mode: 0o700 });
  fs.writeFileSync(path.join(root, 'owner'), nonce, { mode: 0o600 });
  const servers = [],
    clients = [],
    wire = [],
    redisClients = [];
  let started = false,
    runtime,
    redisServer;
  const port = 15485,
    procEnv = { PATH: process.env.PATH, LANG: 'C', LC_ALL: 'C' };
  const run = (bin, args) => {
    const r = spawnSync(bin, args, { encoding: 'utf8', env: procEnv, timeout: 45000 });
    if (r.error || r.status !== 0) throw Error(bin + ': ' + (r.error?.message || r.stderr));
    return r.stdout;
  };
  try {
    console.log(run('postgres', ['--version']).trim());
    run('initdb', [
      '-D',
      data,
      '-U',
      'b2_control',
      '-A',
      'trust',
      '--no-locale',
      '--encoding=UTF8',
    ]);
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
    for (const k of Object.keys(process.env))
      if (/^(PG|DB_)|^DATABASE_URL$/.test(k)) delete process.env[k];
    const pg = require('pg');
    class LocalClient extends pg.Client {
      constructor(c) {
        assert.equal(c.host, socket);
        assert.equal(c.port, port);
        assert.ok(['postgres', 'v01_test_a', 'v01_test_b'].includes(c.database));
        assert.equal(c.connectionString, undefined);
        assert.equal(c.stream, undefined);
        super({ ...c, ssl: false, connectionTimeoutMillis: 5000, statement_timeout: 15000 });
      }
      query(q, ...args) {
        wire.push({ database: this.database, sql: typeof q === 'string' ? q : q.text });
        return super.query(q, ...args);
      }
    }
    async function client(database, user) {
      assert.equal(fs.readFileSync(path.join(root, 'owner'), 'utf8'), nonce);
      const c = new LocalClient({ host: socket, port, database, user, password: '' });
      await c.connect();
      clients.push(c);
      return c;
    }
    const admin = await client('postgres', 'b2_control');
    const isolation = (await admin.query("SELECT current_setting('data_directory') AS directory, inet_server_addr() AS address")).rows[0];
    assert.equal(fs.realpathSync(isolation.directory), fs.realpathSync(data));
    assert.equal(isolation.address, null);
    console.log('PASS ISOLATION: new private data_directory, Unix socket only, owner nonce checked');
    for (const s of ['a', 'b']) {
      await admin.query(
        `CREATE ROLE fixture_${s} LOGIN; CREATE ROLE migrate_${s} NOLOGIN; CREATE ROLE runtime_${s} LOGIN;`,
      );
      await admin.query(`CREATE DATABASE v01_test_${s} OWNER fixture_${s}`);
      await admin.query(
        `REVOKE ALL ON DATABASE v01_test_${s} FROM PUBLIC; GRANT CONNECT ON DATABASE v01_test_${s} TO runtime_${s}; GRANT TEMP ON DATABASE v01_test_${s} TO migrate_${s};`,
      );
    }
    runtime = require('./postgres-runtime.cjs')({ ...pg, Client: LocalClient });
    const { manager, initializer } = runtime,
      tenants = ['a.v01.invalid', 'b.v01.invalid'],
      fixtures = {};
    const cfg = (t, role = 'runtime') => ({
      host: socket,
      port,
      database: 'v01_test_' + t[0],
      username: role + '_' + t[0],
      password: '',
      reference: t === tenants[0] ? '100001' : '100002',
      active: true,
    });
    for (const t of tenants) {
      const control = await client(cfg(t).database, 'b2_control'),
        fixture = await client(cfg(t).database, 'fixture_' + t[0]);
      if (
        (await control.query("SELECT FROM pg_available_extensions WHERE name='postgis'")).rowCount
      )
        await control.query('CREATE EXTENSION postgis');
      await manager.runWithTenant(t, async () => {
        const db = await manager.getConnectionForTenant(t, cfg(t, 'fixture'));
        await initializer.initialize(db, { mode: 'bootstrap' });
        let seq = 400000;
        async function seed(table, patch = {}) {
          const m = initializer.getModel(table),
            row = {};
          for (const [n, a] of Object.entries(m.rawAttributes)) {
            if (a.autoIncrement || a.defaultValue !== undefined || a.allowNull !== false) continue;
            row[n] =
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
              }[a.type.key] ??
              ('fixture-' + ++seq).slice(0, a.type.options?.length ?? 255);
          }
          if (m.rawAttributes.guid) row.guid = String(++seq);
          return m.create({ ...row, ...patch }, { validate: false });
        }
        const managerRole = await seed('xa_roles', {
            code: 'MANAGER',
            name: 'Manager',
            permissions: {},
          }),
          employeeRole = await seed('xa_roles', {
            code: 'EMPLOYEE',
            name: 'Employee',
            permissions: {},
          });
        const users = {};
        let userGuid = 200000;
        for (const name of [
          'employee',
          'direct',
          'group',
          'senior',
          'outsider',
          'other',
          'inactive',
          'former',
        ]) {
          const u = await seed('xa_users', {
            guid: String(++userGuid),
            tenant: cfg(t).reference,
            first_name: name,
            last_name: 'B2',
            country: 'CM',
            employee_color: '#' + String(userGuid).padStart(6, '0'),
            active: name !== 'inactive',
          });
          users[name] = { id: u.id, guid: u.guid };
          await seed('xa_user_roles', {
            user: u.id,
            role: name === 'employee' ? employeeRole.id : managerRole.id,
            assigned_by: null,
          });
        }
        const memos = {};
        let memoGuid = 500000;
        for (const [name, status, author, target, validator] of [
          ['certified', 'submitted', 'employee', null, null],
          ['foreign', 'approved', 'other', null, 'direct'],
          ['author', 'approved', 'direct', null, null],
          ['target', 'rejected', 'other', 'direct', null],
          ['legacy', 'approved', 'employee', null, 'direct'],
          ['rejected', 'rejected', 'employee', null, null],
          ['pending', 'pending', 'employee', null, null],
        ]) {
          const m = await seed('tk_memos', {
            guid: String(++memoGuid),
            author_user: users[author].id,
            target_user: target ? users[target].id : null,
            validator_user: validator ? users[validator].id : null,
            memo_status: status,
            title: t + ':' + name,
            memo_content: [
              {
                created_at: new Date().toISOString(),
                user: users[author].guid,
                message: [
                  { type: 'text', content: 'Known historical exchange' },
                  { type: 'link', content: 'SECRET_MEDIA_MUST_NOT_BE_RETURNED' },
                ],
              },
            ],
          });
          memos[name] = { id: m.id, guid: m.guid };
        }
        await db.query('UPDATE xa_user_roles SET assigned_by=$1 WHERE "user"=$2', {
          bind: [users.other.id, users.employee.id],
        });
        fixtures[t] = { control, fixture, users, memos };
      });
      await control.query(
        `REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE,CREATE ON SCHEMA public TO migrate_${t[0]}; GRANT USAGE ON SCHEMA public TO runtime_${t[0]}; GRANT SELECT ON ALL TABLES IN SCHEMA public TO runtime_${t[0]}; GRANT REFERENCES ON tk_memos,xa_users,tk_time_entries,xa_work_sessions TO migrate_${t[0]}; GRANT SELECT ON tk_memos TO migrate_${t[0]}; GRANT UPDATE(id) ON tk_memos TO migrate_${t[0]};`,
      );
      await control.query('SET ROLE migrate_' + t[0]);
      await control.query(
        "SELECT set_config('toke.migration.expected_database',$1,false),set_config('toke.migration.expected_role',$2,false),set_config('toke.migration.runtime_role',$3,false)",
        [cfg(t).database, 'migrate_' + t[0], 'runtime_' + t[0]],
      );
      await control.query(
        fs.readFileSync(
          path.join(__dirname, '../../migrations/manual/memo_foundations_b1_v1.sql'),
          'utf8',
        ),
      );
      // Test-only certificate representing future persisted data, not an assignment
      // command exposed by B2. Owner fixture supplies all constrained audit rows.
      const f = fixtures[t],
        command = crypto.randomUUID(),
        event = crypto.randomUUID();
      await control.query('BEGIN');
      await control.query(
        "INSERT INTO tk_memo_commands(command_id,memo_id,actor_id,action,payload,result) VALUES($1,$2,$3,'OBSERVE_LEGACY_STATE','{}','{}')",
        [command, f.memos.certified.id, f.users.direct.id],
      );
      await control.query(
        "INSERT INTO tk_memo_events(event_id,memo_id,sequence,event_type,actor_kind,effective_author_id,responsible_user_id,decision_cycle,version,command_id,command_event_index,metadata) VALUES($1,$2,1,'SUBMITTED','HUMAN',$3,$3,1,1,$4,0,'{\"schema_version\":1}')",
        [event, f.memos.certified.id, f.users.direct.id, command],
      );
      await control.query(
        "INSERT INTO tk_memo_workflows(memo_id,responsible_user_id,responsibility_state,responsibility_provenance,decision_cycle,version,last_event_id,initial_known_state,history_completeness) VALUES($1,$2,'ASSIGNED','{\"schema_version\":1}',1,1,$3,'{}','COMPLETE_SINCE_B')",
        [f.memos.certified.id, f.users.direct.id, event],
      );
      await control.query('COMMIT');
      await control.query('RESET ROLE');
      const rawSeed = await client(cfg(t).database, 'runtime_' + t[0]);
      await rawSeed.query('SELECT public.toke_b1_observe_legacy($1,$2,$3,$4,$5)', [
        crypto.randomUUID(),
        f.memos.pending.id,
        f.users.employee.id,
        null,
        '{}',
      ]);
    }
    await manager.closeAllConnections();
    const ports = new Set();
    const localFetch = (url, options) => {
      const u = new URL(url);
      assert.equal(u.hostname, '127.0.0.1');
      assert.ok(ports.has(u.port));
      return fetch(url, options);
    };
    async function listen(app) {
      const server = http.createServer(app);
      servers.push(server);
      await new Promise((r) => server.listen(0, '127.0.0.1', r));
      ports.add(String(server.address().port));
      return 'http://127.0.0.1:' + server.address().port;
    }
    const redisSocket = path.join(root, 'redis.sock');
    redisServer = spawn(
      'redis-server',
      [
        '--port',
        '0',
        '--unixsocket',
        redisSocket,
        '--unixsocketperm',
        '700',
        '--save',
        '',
        '--appendonly',
        'no',
        '--dir',
        root,
      ],
      { env: { PATH: process.env.PATH }, stdio: 'ignore' },
    );
    for (let i = 0; i < 100 && !fs.existsSync(redisSocket); i++)
      await new Promise((r) => setTimeout(r, 20));
    assert.ok(fs.existsSync(redisSocket));
    const Redis = require('ioredis'),
      redis = new Redis({
        path: redisSocket,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: () => null,
        maxRetriesPerRequest: 1,
      });
    redisClients.push(redis);
    redis.on('error', () => {});
    await redis.connect();
    const makeSessionLoader = require('../user-sessions/load.cjs'),
      sessionLoad = makeSessionLoader();
    const { UserSessionAuthority, SessionError } = sessionLoad(
      'packages/api/src/tools/user-session.authority.ts',
    );
    const authority = new UserSessionAuthority(
      redis,
      'FAKE_B2_SIGNING_SECRET_01234567890123456789',
      async (identity) => {
        const t = tenants.find(
          (t) => t === identity.subdomain && cfg(t).reference === identity.tenantGuid,
        );
        if (!t) throw new SessionError(403, 'tenant_session_mismatch');
        const row = (
          await fixtures[t].fixture.query(
            'SELECT active,deleted_at FROM xa_users WHERE guid=$1 AND tenant=$2',
            [identity.userGuid, identity.tenantGuid],
          )
        ).rows[0];
        if (!row?.active || row.deleted_at)
          throw new SessionError(401, 'session_account_unavailable');
      },
    );
    const serviceKey = 'FAKE_B2_SERVICE',
      serviceSecret = Buffer.from('FAKE_B2_SERVICE_SECRET_0123456789').toString('base64');
    const masterLoad = makeSessionLoader({
      env: { USER_SESSION_SERVICE_KEYS: serviceKey },
      fetch: localFetch,
      overrides: {
        'packages/api/src/tools/user-session.authority.ts': { UserSessionAuthority, SessionError },
        'packages/api/src/tools/user-session.runtime.ts': {
          managerSessionAuthority: async () => authority,
        },
        'packages/api/src/tools/client.cache.service.ts': {
          default: {
            getClientConfig: async (k) =>
              k === serviceKey
                ? { active: true, secret: serviceSecret, profile: { root: true } }
                : null,
          },
        },
      },
    });
    const master = express();
    master.use(express.json());
    master.use(
      '/auth/session',
      masterLoad('packages/api/src/master/routes/user-session.route.ts').default,
    );
    const masterUrl = await listen(master);
    const sessionEnv = {
      USER_SESSION_MASTER_URL: masterUrl,
      USER_SESSION_SERVICE_KEY: serviceKey,
      USER_SESSION_SERVICE_SECRET: serviceSecret,
    };
    const apiSessionLoad = makeSessionLoader({
      env: sessionEnv,
      fetch: localFetch,
      overrides: {
        'packages/api/src/tools/user-session.authority.ts': { UserSessionAuthority, SessionError },
      },
    });
    const credentials = apiSessionLoad('packages/api/src/tools/credential-extractor.service.ts');
    const R = {
      handleError: (res, status, error) => res.status(status).json({ success: false, error }),
    };
    const tenantMiddleware = require('./harness.cjs').load('middle/tenant.middleware.ts', {
      '@toke/shared': { HttpStatus: { BAD_REQUEST: 400, NOT_FOUND: 404, INTERNAL_ERROR: 500 } },
      '../tenant/database/db.tenant-manager.js': { default: manager },
      '../tenant/database/db.initializer.js': { TableInitializer: initializer },
      '../tenant/database/tenant.context.js': runtime.context,
      '../tools/credential-extractor.service.js': credentials,
      '../tools/tenant-cache.service.js': {
        default: { getTenantConfig: async (t) => (tenants.includes(t) ? cfg(t) : null) },
      },
      '../tools/response.js': { default: R },
    }).tenantMiddleware;
    const sourceEnvironment = { ...sessionEnv, NODE_ENV: 'test', MEMO_B2_LOCAL_READS: '1' };
    const allowed = new Set([
      'tenant/memos/responsibility.policy.ts',
      'tenant/memos/reads.service.ts',
      'tenant/persistence/memos/foundations.persistence.ts',
      'tenant/persistence/memos/foundations.models.ts',
      'middle/memo-b2-reads.ts',
      'middle/server-auth.ts',
    ]);
    const cache = new Map();
    function load(rel) {
      if (cache.has(rel)) return cache.get(rel);
      assert.ok(allowed.has(rel), rel);
      const exports = {};
      cache.set(rel, exports);
      const deps = {
        'tenant/database/db.tenant-manager.ts': { default: manager },
        'tenant/database/tenant.ownership.ts': runtime.ownership,
        'tools/user-session.authority.ts': { UserSessionAuthority, SessionError },
        'tools/user-session.client.ts': apiSessionLoad(
          'packages/api/src/tools/user-session.client.ts',
        ),
        'tools/credential-extractor.service.ts': credentials,
        'middle/tenant.middleware.ts': { tenantMiddleware },
        'master/database/db.initializer.ts': { TableInitializer: { isInitialized: () => false } },
        'tools/response.ts': { default: R },
        'tools/glossary.ts': {
          default: {
            authenticatorMissing: { code: 'service_required' },
            authenticationFailed: { code: 'service_invalid' },
          },
        },
        'tools/client.cache.service.ts': {
          default: {
            getClientConfig: async (k) =>
              k === serviceKey
                ? { active: true, secret: serviceSecret, profile: { root: false } }
                : null,
          },
        },
        'tools/api-key-manager.ts': apiSessionLoad('packages/api/src/tools/api-key-manager.ts'),
        'master/class/Endpoint.ts': { default: {} },
        'master/class/Permission.ts': { default: {} },
      };
      const code = ts.transpileModule(fs.readFileSync(path.join(rootSource, rel), 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText;
      vm.runInNewContext(
        code,
        {
          exports,
          Buffer,
          Date,
          Promise,
          console: { log() {}, error() {} },
          process: { env: sourceEnvironment },
          require(name) {
            if (name === 'sequelize') return runtime.sequelize;
            if (name === '@toke/shared')
              return {
                HttpStatus: { UNAUTHORIZED: 401, INTERNAL_ERROR: 500, SERVER_UNAVAILABLE: 503 },
              };
            if (name.startsWith('.')) {
              const r = path.posix.normalize(
                path.posix.join(path.posix.dirname(rel), name.replace(/\.js$/, '.ts')),
              );
              if (Object.hasOwn(deps, r)) {
                const d = deps[r];
                return d && Object.hasOwn(d, 'default') ? { __esModule: true, ...d } : d;
              }
              return load(r);
            }
            throw Error('IMPORT_DENIED ' + name);
          },
        },
        { filename: rel, timeout: 4000 },
      );
      return exports;
    }
    const { loadMemoOrganization } = load('tenant/memos/responsibility.policy.ts'),
      { MemoReadsService } = load('tenant/memos/reads.service.ts'),
      gateway = load('middle/memo-b2-reads.ts');
    const principal = (t, name) => ({
      v: 2,
      kind: 'manager',
      iss: 'toke-master',
      aud: 'toke-user-session',
      kid: 'v2',
      sid: 'x'.repeat(43),
      userGuid: fixtures[t].users[name].guid,
      tenantGuid: cfg(t).reference,
      subdomain: t,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const read = (t, name, selection) =>
      manager.runWithTenant(t, async () => {
        await manager.getConnectionForTenant(t, cfg(t));
        return MemoReadsService.read(principal(t, name), selection);
      });
    const resolve = (t) =>
      manager.runWithTenant(t, async () => {
        const db = await manager.getConnectionForTenant(t, cfg(t));
        return db.transaction(async (tx) =>
          (await loadMemoOrganization(db, tx, cfg(t).reference)).resolve(
            fixtures[t].users.employee.id,
          ),
        );
      });
    const reset = async (t) => {
      await fixtures[t].fixture.query(
        "DELETE FROM xa_org_hierarchy; DELETE FROM xa_groups; UPDATE xa_users SET active=true WHERE first_name<>'inactive';",
      );
    };
    const link = async (t, sub, sup, type = 'direct_report', from = '2020-01-01', to = null) =>
      fixtures[t].fixture.query(
        'INSERT INTO xa_org_hierarchy(guid,subordinate,supervisor,relationship_type,effective_from,effective_to,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,now(),now())',
        [crypto.randomUUID(), fixtures[t].users[sub].id, fixtures[t].users[sup].id, type, from, to],
      );
    const group = async (t, managerName, active = true, extra = {}) =>
      fixtures[t].fixture.query(
        'INSERT INTO xa_groups(guid,name,manager,members,created_at,updated_at) VALUES($1,$2,$3,$4,now(),now())',
        [
          crypto.randomUUID(),
          'Group ' + crypto.randomUUID(),
          fixtures[t].users[managerName].id,
          JSON.stringify([
            {
              user: fixtures[t].users.employee.id,
              joined_at: '2020-01-01T00:00:00Z',
              ...(active === undefined ? {} : { active }),
              ...extra,
            },
          ]),
        ],
      );
    const names = [
      'manager direct unique',
      'groupe seul',
      'direct prioritaire sur groupe divergent',
      'directs contradictoires',
      'groupes concurrents',
      'membre inactif',
      'direct expiré et non DIRECT_REPORT',
      'cycle',
      'manager inactif',
      'groupes multiples même manager',
      'adhésion future',
      'rôle manager retiré',
      'intervalle incohérent',
    ];
    for (const t of tenants) {
      const tests = [
        async () => {
          await link(t, 'employee', 'direct');
          assert.equal((await resolve(t)).responsibleUserId, fixtures[t].users.direct.id);
        },
        async () => {
          await group(t, 'group');
          assert.equal((await resolve(t)).responsibleUserId, fixtures[t].users.group.id);
        },
        async () => {
          await link(t, 'employee', 'direct');
          await group(t, 'group');
          assert.equal((await resolve(t)).responsibleUserId, fixtures[t].users.direct.id);
        },
        async () => {
          await link(t, 'employee', 'direct');
          await link(t, 'employee', 'other');
          assert.equal((await resolve(t)).state, 'UNRESOLVED');
        },
        async () => {
          await group(t, 'group');
          await group(t, 'other');
          assert.equal((await resolve(t)).state, 'UNRESOLVED');
        },
        async () => {
          await group(t, 'group', false);
          assert.equal((await resolve(t)).state, 'UNRESOLVED');
        },
        async () => {
          await link(t, 'employee', 'direct', 'direct_report', '2020-01-01', '2020-01-02');
          await link(t, 'employee', 'other', 'matrix_report');
          assert.equal((await resolve(t)).state, 'UNRESOLVED');
        },
        async () => {
          await link(t, 'employee', 'direct');
          await link(t, 'direct', 'employee');
          assert.equal((await resolve(t)).state, 'REVIEW_REQUIRED');
        },
        async () => {
          await link(t, 'employee', 'inactive');
          await group(t, 'group');
          assert.equal((await resolve(t)).state, 'REVIEW_REQUIRED');
        },
        async () => {
          await group(t, 'group');
          await group(t, 'group', undefined, { active: undefined });
          assert.equal((await resolve(t)).responsibleUserId, fixtures[t].users.group.id);
        },
        async () => {
          await group(t, 'group', true, { joined_at: '2099-01-01T00:00:00Z' });
          assert.equal((await resolve(t)).state, 'UNRESOLVED');
        },
        async () => {
          await link(t, 'employee', 'direct');
          await fixtures[t].fixture.query(
            `UPDATE xa_user_roles SET role=(SELECT id FROM xa_roles WHERE code='EMPLOYEE') WHERE "user"=$1`,
            [fixtures[t].users.direct.id],
          );
          try {
            assert.equal((await resolve(t)).state, 'REVIEW_REQUIRED');
          } finally {
            await fixtures[t].fixture.query(
              `UPDATE xa_user_roles SET role=(SELECT id FROM xa_roles WHERE code='MANAGER') WHERE "user"=$1`,
              [fixtures[t].users.direct.id],
            );
          }
        },
        async () => {
          await link(t, 'employee', 'direct', 'direct_report', '2025-01-01', '2024-01-01');
          assert.equal((await resolve(t)).state, 'REVIEW_REQUIRED');
        },
      ];
      for (let i = 0; i < tests.length; i++) {
        await reset(t);
        await tests[i]();
        console.log('PASS PG ' + t + ': ' + names[i]);
      }
      await reset(t);
      await link(t, 'employee', 'direct');
      await link(t, 'direct', 'senior');
      const f = fixtures[t];
      const before = (
        await f.fixture.query('SELECT to_jsonb(m) AS row FROM tk_memos m ORDER BY id')
      ).rows;
      const list = await read(t, 'direct', { kind: 'list', filters: { limit: '1', offset: '1' } });
      assert.equal(list.total, 3);
      assert.equal(list.memos.length, 1);
      assert.ok(!JSON.stringify(list).includes(':foreign'));
      const stats = await read(t, 'direct', { kind: 'statistics' });
      assert.equal(stats.total, 3);
      assert.equal(stats.by_status.submitted, 1);
      assert.equal(stats.by_status.approved, 1);
      assert.equal(stats.by_status.rejected, 1);
      assert.equal((await read(t, 'senior', { kind: 'list' })).total, 1);
      assert.equal((await read(t, 'outsider', { kind: 'list' })).total, 0);
      assert.equal((await read(t, 'employee', { kind: 'list' })).total, 4); // author, not validator fallback
      for (const memo of ['legacy', 'rejected', 'foreign'])
        await assert.rejects(
          read(t, 'direct', { kind: 'detail', guid: f.memos[memo].guid }),
          (e) => e.status === 404,
        );
      const legacy = await read(t, 'employee', { kind: 'detail', guid: f.memos.legacy.guid });
      assert.equal(legacy.memo.responsibility.state, 'UNRESOLVED');
      assert.equal(legacy.memo.responsibility.responsible_guid, null);
      assert.equal(legacy.memo.memo_status, 'approved');
      const unresolved = await read(t, 'employee', { kind: 'detail', guid: f.memos.pending.guid });
      assert.equal(unresolved.memo.responsibility.state, 'UNRESOLVED');
      assert.equal(unresolved.memo.responsibility.responsible_guid, null);
      assert.ok(!JSON.stringify(legacy).includes('SECRET_MEDIA'));
      assert.equal(
        (await read(t, 'senior', { kind: 'events', guid: f.memos.certified.guid })).events.length,
        1,
      );
      assert.equal(
        (await read(t, 'employee', { kind: 'events', guid: f.memos.legacy.guid })).events.length,
        0,
      );
      await assert.rejects(
        read(t, 'outsider', { kind: 'events', guid: f.memos.certified.guid }),
        (e) => e.status === 404,
      );
      await assert.rejects(
        read(t, 'direct', { kind: 'list', filters: { supervisor: f.users.senior.guid } }),
        (e) => e.status === 403,
      );
      await f.fixture.query('UPDATE xa_users SET active=false WHERE id=$1', [f.users.direct.id]);
      assert.equal((await read(t, 'senior', { kind: 'list' })).total, 0);
      const inactive = await read(t, 'employee', { kind: 'detail', guid: f.memos.certified.guid });
      assert.equal(inactive.memo.responsibility.state, 'REVIEW_REQUIRED');
      await assert.rejects(read(t, 'direct', { kind: 'list' }), (e) => e.status === 401);
      await reset(t);
      await link(t, 'direct', 'senior', 'direct_report', '2020-01-01', '2020-01-02');
      assert.equal((await read(t, 'senior', { kind: 'list' })).total, 0);
      await reset(t);
      await link(t, 'direct', 'senior', 'matrix_report');
      assert.equal((await read(t, 'senior', { kind: 'list' })).total, 0);
      await reset(t);
      await link(t, 'direct', 'senior');
      await link(t, 'senior', 'direct');
      assert.equal((await read(t, 'senior', { kind: 'list' })).total, 0);
      await reset(t);
      await group(t, 'group', true, { user: f.users.direct.id });
      assert.equal((await read(t, 'group', { kind: 'list' })).total, 0);
      await reset(t);
      await group(t, 'group');
      assert.equal((await read(t, 'group', { kind: 'list' })).total, 0); // no retroactive responsibility
      await link(t, 'direct', 'senior');
      assert.equal((await read(t, 'senior', { kind: 'list' })).total, 1); // current certified branch only
      await f.fixture.query('DELETE FROM xa_org_hierarchy');
      assert.equal((await read(t, 'senior', { kind: 'list' })).total, 0);
      assert.deepEqual(
        (await f.fixture.query('SELECT to_jsonb(m) AS row FROM tk_memos m ORDER BY id')).rows,
        before,
      );
      const inspect = await client(cfg(t).database, 'runtime_' + t[0]);
      assert.equal(
        (await inspect.query('SELECT count(*)::int AS n FROM tk_memo_workflows')).rows[0].n,
        2,
        'read never backfills',
      );
      assert.equal(
        (await inspect.query('SELECT count(*)::int AS n FROM tk_memo_events')).rows[0].n,
        2,
      );
      assert.equal(
        (await inspect.query('SELECT count(*)::int AS n FROM tk_memo_commands')).rows[0].n,
        2,
      );
      console.log(
        'PASS PG ' +
          t +
          ': central ACL, author/target/responsible/superior, history, no validator fallback, pagination/statistics, inactive/deleted/expired relation, changed group, zero writes',
      );
    }
    // Real API transport: actual service auth, A introspection and tenant middleware,
    // B2 gateway/read repository. All new paths go to PG, not stub memo responses.
    const api = express();
    api.use(express.json());
    api.use(load('middle/server-auth.ts').ServerAuth.authenticate);
    api.use(gateway.memoB2ReadGateway);
    api.use(apiSessionLoad('packages/api/src/middle/manager-session.ts').managerSessionBoundary);
    api.use((_req, res) => res.status(404).json({ success: false }));
    const base = await listen(api);
    const tokens = {};
    for (const t of tenants)
      for (const name of ['employee', 'direct', 'senior', 'outsider']) {
        const otp = await authority.issueChallenge(name + '@' + t, {
          user: { guid: fixtures[t].users[name].guid },
          tenant: { guid: cfg(t).reference, subdomain: t },
        });
        tokens[t + name] = (await authority.consume(otp)).access_token;
      }
    function serviceHeaders() {
      const timestamp = String(Math.floor(Date.now() / 1000));
      return {
        'x-api-key': serviceKey,
        'x-api-timestamp': timestamp,
        'x-api-signature': crypto
          .createHmac('sha256', Buffer.from(serviceSecret, 'base64'))
          .update(serviceKey + timestamp)
          .digest('base64'),
      };
    }
    const call = (route, t = tenants[0], name = 'direct', extra = {}, method = 'GET') =>
      localFetch(base + route, {
        method,
        headers: {
          ...serviceHeaders(),
          'x-api-tenant': t,
          'x-toke-user-session': tokens[t + name],
          ...extra,
        },
      });
    for (const t of tenants) {
      await reset(t);
      await link(t, 'direct', 'senior');
      assert.equal((await call('/memo/list', t)).status, 200);
      assert.equal((await call('/memo/list', t, 'direct', { 'x-api-key': '' })).status, 401);
      assert.equal(
        (await call('/memo/list', t, 'direct', { 'x-toke-user-session': '' })).status,
        401,
      );
      assert.equal(
        (await call('/memo/list', t, 'direct', { 'x-toke-user-session': '200002' })).status,
        401,
      );
      assert.equal(
        (
          await call('/memo/list', t, 'direct', {
            'x-api-tenant': t === tenants[0] ? tenants[1] : tenants[0],
          })
        ).status,
        403,
      );
      assert.equal(
        (await call('/memo/list?supervisor=' + fixtures[t].users.senior.guid, t)).status,
        403,
      );
      assert.equal(
        (await call('/memo/' + fixtures[t].memos.certified.guid, t, 'senior')).status,
        200,
      );
      assert.equal(
        (await call('/memo/' + fixtures[t].memos.certified.guid, t, 'outsider')).status,
        404,
      );
      const denied = await call('/memo/' + fixtures[t].memos.certified.guid, t, 'outsider'),
        missing = await call('/memo/999999999', t, 'outsider');
      assert.deepEqual(await denied.json(), await missing.json());
      assert.equal(
        (await call('/memo/statistics/overview', t, 'senior').then((r) => r.json())).data.total,
        1,
      );
      assert.equal(
        (await call('/memo/' + fixtures[t].memos.certified.guid + '/events', t, 'senior')).status,
        200,
      );
      for (const route of [
        '/memo',
        '/memo/',
        '/memo/list',
        '/memo/my-created',
        '/memo/my-memos',
        '/memo/pending',
        '/memo/pending-validation',
        '/memo/auto-generated',
        '/memo/type/other/list',
        '/memo/status/approved/list',
        '/memo/target/' + fixtures[t].users.direct.guid + '/list',
        '/memo/validator/' + fixtures[t].users.direct.guid + '/list',
      ]) {
        const response = await call(route, t);
        assert.equal(response.status, 200, route);
        const body = await response.json();
        const allowedMemos = ['certified', 'author', 'target'].map(
          (k) => fixtures[t].memos[k].guid,
        );
        assert.ok(
          body.data.memos.every((m) => allowedMemos.includes(m.guid)),
          route + ' must remain ACL scoped',
        );
        if (route.includes('/validator/')) assert.equal(body.data.total, 0);
        if (route === '/memo/my-created') assert.equal(body.data.total, 1);
        if (route === '/memo/my-memos') assert.equal(body.data.total, 2);
      }
      assert.equal(
        (await call('/memo/pending-validation', t, 'senior').then((r) => r.json())).data.total,
        0,
      );
      for (const route of [
        '/MEMO/list',
        '/memo/list/',
        '/memo/urgent',
        '/memo/revision',
        '/memo/session/500001/list',
        '/memo/500001/attachments',
        '/upload/files',
        '/memo/escalated-to-me',
      ])
        assert.equal((await call(route, t)).status, 503, route);
      for (const [route, method] of [
        ['/memo/500001/validate', 'PATCH'],
        ['/memo/500001/reject', 'PATCH'],
        ['/memo/500001/content', 'PATCH'],
        ['/memo/500001/read', 'PATCH'],
        ['/memo/realtime-ticket', 'POST'],
        ['/memo/500001', 'PUT'],
        ['/memo/500001', 'HEAD'],
      ])
        assert.equal((await call(route, t, 'direct', {}, method)).status, 503, route);
      assert.equal((await call('/memo/list?limit=1&limit=2', t)).status, 400);
      assert.equal((await call('/memo/list?url=SECRET', t)).status, 400);
      assert.equal(
        (await call('/memo/list', t, 'direct', { 'x-toke-integrator-session': 'fake' })).status,
        401,
      );
      console.log(
        'PASS HTTP ' +
          t +
          ': real A/Redis verification, independent Tenant auth, direct API proof, scoped reads, opaque404, forged GUID, bad tenant, closed mutations/media',
      );
    }
    await require('./postgres-memo-bff-reads.cjs')({
      base, listen, localFetch, serviceHeaders, tokens, tenants, fixtures, cfg,
      sessionEnv, makeSessionLoader, sourceEnvironment,
    });
    await authority.logout(tokens[tenants[0] + 'direct']);
    assert.equal((await call('/memo/list')).status, 401);
    // Truly expired, validly signed session issued by the unchanged authority
    // with a controlled past clock; current Master rejects its exp, not a mock.
    const expiredIssuer = new UserSessionAuthority(
      redis,
      'FAKE_B2_SIGNING_SECRET_01234567890123456789',
      async (identity) => {
        const row = (
          await fixtures[tenants[0]].fixture.query('SELECT active FROM xa_users WHERE guid=$1', [
            identity.userGuid,
          ])
        ).rows[0];
        if (!row?.active) throw new SessionError(401, 'session_account_unavailable');
      },
      () => Math.floor(Date.now() / 1000) - 86401,
    );
    const oldOtp = await expiredIssuer.issueChallenge('expired@fiction.invalid', {
      user: { guid: fixtures[tenants[0]].users.senior.guid },
      tenant: { guid: '100001', subdomain: tenants[0] },
    });
    const expiredToken = (await expiredIssuer.consume(oldOtp)).access_token;
    assert.equal(
      (await call('/memo/list', tenants[0], 'senior', { 'x-toke-user-session': expiredToken }))
        .status,
      401,
    );
    // Disable flag locally: the exact same route returns to the A lock.
    const disabled = express();
    disabled.use(
      gateway.createMemoB2ReadGateway({
        enabled: () => false,
        verify: async () => {
          throw Error('must not call');
        },
        tenant: tenantMiddleware,
        read: MemoReadsService.read,
      }),
    );
    disabled.use(
      apiSessionLoad('packages/api/src/middle/manager-session.ts').managerSessionBoundary,
    );
    const off = await listen(disabled);
    const r = await localFetch(off + '/memo/list', {
      headers: { 'x-api-tenant': tenants[1], 'x-toke-user-session': tokens[tenants[1] + 'direct'] },
    });
    assert.equal(r.status, 503);
    assert.equal((await r.json()).error.code, 'memo_permissions_pending');
    sourceEnvironment.NODE_ENV = 'production';
    assert.equal(
      (await call('/memo/list', tenants[1], 'direct')).status,
      503,
      'production cannot enable local B2 reads',
    );
    sourceEnvironment.NODE_ENV = 'test';
    delete sourceEnvironment.MEMO_B2_LOCAL_READS;
    assert.equal(
      (await call('/memo/list', tenants[1], 'direct')).status,
      503,
      'default stays locked',
    );
    sourceEnvironment.MEMO_B2_LOCAL_READS = '1';
    for (const t of tenants) {
      const raw = await client(cfg(t).database, 'runtime_' + t[0]);
      await assert.rejects(
        raw.query('UPDATE tk_memo_workflows SET version=2'),
        (e) => e.code === '42501',
      );
      await assert.rejects(raw.query('DELETE FROM tk_memo_events'), (e) => e.code === '42501');
    }
    await assert.rejects(
      manager.runWithTenant(tenants[1], () =>
        MemoReadsService.read(principal(tenants[0], 'employee'), { kind: 'list' }),
      ),
      (e) => e.code === 'tenant_session_mismatch',
    );
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
    console.log(
      'PASS B2: actual PostgreSQL A/B, private Redis and signed Master/API HTTP; B1 remains immutable; no backfill, no business mutation, no public unlock',
    );
  } finally {
    for (const server of servers) {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    }
    for (const c of redisClients) c.disconnect();
    if (redisServer?.pid && redisServer.exitCode === null) {
      redisServer.kill('SIGTERM');
      await new Promise((r) => redisServer.once('exit', r));
    }
    if (runtime) await runtime.manager.closeAllConnections();
    await Promise.all(clients.map((c) => c.end()));
    if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
    assert.equal(fs.readFileSync(path.join(root, 'owner'), 'utf8'), nonce);
    fs.rmSync(root, { recursive: true });
  }
}
main().catch((e) => {
  console.error(e.stack, e.message, e.original?.message);
  process.exitCode = 1;
});
