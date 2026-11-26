const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  ts = require('typescript');
function load(file, mocks, env = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../..', file), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'process', js)(
    (n) => {
      if (!(n in mocks)) throw Error('Unexpected dependency ' + n);
      return mocks[n];
    },
    module,
    module.exports,
    { env },
  );
  return module.exports;
}
const { SessionError } = load('packages/api/src/tools/user-session.authority.ts', {
  'node:crypto': require('node:crypto'),
});
class MemoReadError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
const principal = {
  v: 2,
  kind: 'manager',
  userGuid: '7',
  tenantGuid: '8',
  subdomain: 'a.invalid',
  exp: Math.floor(Date.now() / 1000) + 3600,
};
const token = 'payload.' + 's'.repeat(43);
const local = { NODE_ENV: 'test', MEMO_B2_MANAGER_READS: '1' };
const contextToken = 'c'.repeat(32);
const integratorHeaders = {
  authorization: 'Bearer integrator',
  'x-integrator-context': contextToken,
};
function response(done) {
  return {
    locals: {},
    statusCode: 200,
    setHeader() {},
    status(n) {
      this.statusCode = n;
      return this;
    },
    json(body) {
      this.body = body;
      done?.();
      return this;
    },
  };
}
function setup(
  env = local,
  {
    deny = false,
    wrongApiTenant = false,
    missingB1 = false,
    apiEnv = env,
    unavailable = false,
    delegatedTenant = '8',
  } = {},
) {
  let reads = 0,
    proof;
  const seen = [];
  const commands = [];
  const gateway = load(
    'packages/api/src/middle/memo-b2-reads.ts',
    {
      'node:crypto': require('node:crypto'),
      '../tenant/memos/writes.service.js': {
        MemoWritesService: {
          run: async (actor, route, body) => {
            commands.push({ actor, route, body });
            return route === 'recipients' ? { recipients: [{ guid: '10' }] }
              : { guid: '9', version: '2' };
          },
        },
      },
      '../tools/user-session.client.js': {
        sessionClientFromEnvironment: () => ({
          verify: async (t, unused, sub) => {
            if (unavailable) throw new SessionError(503, 'session_service_configuration_missing');
            if (t !== token) throw new SessionError(401, 'invalid_user_session');
            if (sub !== principal.subdomain) throw new SessionError(403, 'tenant_session_mismatch');
            return principal;
          },
        }),
      },
      '../tools/user-session.authority.js': { SessionError },
      '../utils/axios.config.js': {
        createApiClient: () => ({
          get: async (url, { headers }) => {
            assert.equal(url, '/integrator/context/' + contextToken);
            assert.equal(headers.Authorization, 'Bearer integrator');
            return { data: { subdomain: 'a.invalid', tenantGuid: delegatedTenant, userGuid: '7' } };
          },
        }),
      },
      '../tools/credential-extractor.service.js': {
        default: {
          extractCredentials: () => ({ subdomain: wrongApiTenant ? 'b.invalid' : 'a.invalid' }),
        },
      },
      './tenant.middleware.js': {
        tenantMiddleware: (req, res, next) => {
          req.tenant = { subdomain: 'a.invalid', config: { reference: '8' } };
          next();
        },
      },
      '../tenant/memos/reads.service.js': {
        MemoReadError,
        MemoReadsService: {
          read: async (p, selection) => {
            reads++;
            seen.push(selection);
            assert.equal(p.userGuid, '7');
            if (missingB1) throw Error('B1_SCHEMA_NOT_READY');
            if (deny) throw new MemoReadError(404, 'memo_not_found');
            if (selection.filters?.supervisor && selection.filters.supervisor !== '7')
              throw new MemoReadError(403, 'memo_actor_mismatch');
            if (selection.kind === 'state') return { revision: '1:10', unreadTotal: 1 };
            if (selection.kind === 'mark-read')
              return { readAt: selection.seenAt };
            return selection.kind === 'list'
              ? {
                  memos: [
                    {
                      guid: '9',
                      author_guid: '7',
                      target_guid: '10',
                      capabilities: { read: true, validate: false },
                    },
                  ],
                  total: 1,
                  offset: 0,
                  limit: 25,
                }
              : {
                  memo: {
                    guid: '9',
                    author_guid: '7',
                    exchanges: [],
                    capabilities: { read: true, validate: false },
                  },
                };
          },
        },
      },
    },
    {
      USER_SESSION_MASTER_URL: 'https://master.invalid',
      USER_SESSION_SERVICE_KEY: 'key',
      USER_SESSION_SERVICE_SECRET: 'secret',
      ...apiEnv,
    },
  ).memoB2ReadGateway;
  const apiGet = async (url, config) => {
    proof = config.headers;
    let done;
    const finish = new Promise((r) => (done = r));
    const res = response(done);
    const req = {
      path: url,
      method: config.method ?? 'GET',
      query: config.params ?? {},
      body: config.body,
      header: (n) => config.headers[n],
    };
    await gateway(req, res, () => {
      res.status(503).json({ success: false, error: { code: 'memo_permissions_pending' } });
    });
    await finish;
    if (res.statusCode >= 400) throw { response: { status: res.statusCode, data: res.body } };
    return { data: res.body, status: res.statusCode };
  };
  const bff = load(
    'packages/backend/src/tools/memo-manager-reads.ts',
    {
      '../services/memo.socket.bridge.service.js': {
        MemoSocketBridgeService: {
          async createBridgeTicket(readState) {
            assert.equal((await readState()).unreadTotal, 1);
            return { realtime_ticket: 'fixture', expires_at: 'fixture' };
          },
        },
      },
      './api.factory.js': {
        getApiClient: async (reference) => {
          assert.equal(reference, '8');
          return {
            get: apiGet,
            post: (url, body, options) => apiGet(url, { ...options, method: 'POST', body }),
            patch: (url, body, options) => apiGet(url, { ...options, method: 'PATCH', body }),
          };
        },
      },
    },
    env,
  ).memoManagerReads;
  const auth = load('packages/backend/src/tools/tenant.config.ts', {
    '@toke/shared': { HttpStatus: { UNAUTHORIZED: 401, INTERNAL_ERROR: 500 } },
    '@toke/api/dist/tools/response.js': {
      default: { handleError: (r, s, e) => r.status(s).json({ success: false, error: e }) },
    },
    '@toke/api/dist/tools/glossary.js': { default: {} },
    './user.session.js': {
      UserSessionService: {
        verify: async (t, tenant) => {
          if (t !== token) throw new SessionError(401, 'invalid_user_session');
          if (tenant !== '8') throw new SessionError(403, 'tenant_session_mismatch');
          return principal;
        },
      },
    },
  }).TenantConfig;
  async function request(route = '/list', opts = {}) {
    const headers = {
      'x-api-client': opts.tenant ?? '8',
      authorization: opts.noSession ? '' : `Bearer ${token}`,
      ...opts.headers,
    };
    const req = {
      path: route,
      method: opts.method ?? 'GET',
      query: opts.query ?? { supervisor: '7' },
      body: opts.body,
      header: (n) => headers[n],
      headers,
    };
    const res = response();
    await auth.authenticate(req, res, () => {});
    let authenticated = false;
    if (opts.delegated) {
      res.locals.integratorDelegation = { subdomain: 'a.invalid', userGuid: '7' };
      authenticated = true;
    } else await auth.authenticateUser(req, res, () => (authenticated = true));
    if (authenticated)
      await bff(req, res, () =>
        res.status(503).json({ success: false, error: { code: 'memo_permissions_pending' } }),
      );
    return res;
  }
  return { request, apiGet, reads: () => reads, proof: () => proof, seen, commands };
}
test('memo read receipts and realtime tickets reuse the effective actor and tenant boundary', async () => {
  const scope = { headers: integratorHeaders, delegated: true, query: {} };
  const seenAt = '2026-11-25T10:02:43.123456Z';
  const c = setup();
  for (const options of [{ query: {} }, scope]) {
    const receipt = await c.request('/9/read', {
      ...options, method: 'PATCH', body: { user_guid: '99', seen_at: seenAt },
    });
    assert.deepEqual(receipt.body.data, { readAt: seenAt });
    assert.equal((await c.request('/realtime-ticket', { ...options, method: 'POST' })).statusCode, 200);
  }
  assert.deepEqual(c.seen.map(({ kind }) => kind), ['mark-read', 'state', 'mark-read', 'state']);
  const wrongTenant = setup(local, { delegatedTenant: '99' });
  assert.equal((await wrongTenant.request('/realtime-ticket', { ...scope, method: 'POST' })).statusCode, 403);
  assert.equal(wrongTenant.reads(), 0);
});

test('memo realtime tickets are single-use and deliver only the scoped snapshot', async () => {
  const { EventEmitter } = require('node:events');
  let authenticate;
  let connect;
  const namespace = {
    sockets: new Map(),
    use(handler) { authenticate = handler; },
    on(_, handler) { connect = handler; },
    disconnectSockets() {},
  };
  const { MemoSocketBridgeService } = load('packages/backend/src/services/memo.socket.bridge.service.ts', {
    'node:crypto': require('node:crypto'),
  });
  MemoSocketBridgeService.init({ of: () => namespace });
  const state = { revision: '3:20', unreadTotal: 3 };
  const ticket = await MemoSocketBridgeService.createBridgeTicket(async () => state);
  const socket = new EventEmitter();
  socket.data = {};
  socket.connected = true;
  socket.handshake = { auth: { realtimeTicket: ticket.realtime_ticket } };
  try {
    authenticate(socket, error => assert.equal(error, undefined));
    authenticate(socket, error => assert.equal(error.message, 'memo_bridge_ticket_invalid'));
    const event = new Promise(resolve => socket.once('memo:changed', resolve));
    connect(socket);
    assert.deepEqual(await event, state);
  } finally {
    socket.connected = false;
    socket.emit('disconnect');
    MemoSocketBridgeService.shutdown();
  }
});
test('memo commands and recipients relay both verified contexts without changing the effective actor', async () => {
  const c = setup();
  const options = { method: 'POST', body: { action: 'SUBMIT', guid: '9', version: '1' }, query: {} };
  const direct = await c.request('/commands', options);
  const delegatedOptions = { headers: integratorHeaders, delegated: true, query: {} };
  const delegated = await c.request('/commands', { ...options, ...delegatedOptions });
  assert.equal(direct.statusCode, 200);
  assert.deepEqual(delegated.body, direct.body);
  assert.deepEqual(c.commands.map(({ actor }) => actor.userGuid), ['7', '7']);
  assert.match(c.commands[1].actor.auditRef, /^integrator-session:[a-f0-9]{64}$/);
  const recipients = await c.request('/recipients', delegatedOptions);
  assert.deepEqual(recipients.body.data.recipients, [{ guid: '10' }]);
  const wrongTenant = setup(local, { delegatedTenant: '99' });
  assert.equal((await wrongTenant.request('/commands', { ...options, ...delegatedOptions })).statusCode, 403);
  assert.equal(wrongTenant.commands.length, 0);
});
test('verified BFF list -> API gateway -> B2 contract, Cloud pagination preserved', async () => {
  const c = setup();
  const r = await c.request();
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.data.memos.items[0].author_user.guid, '7');
  assert.equal(r.body.data.memos.pagination.total, 1);
  assert.deepEqual(c.proof(), { 'x-toke-user-session': token });
  assert.equal(c.reads(), 1);
});
test('detail uses B2 and preserves memo envelope and capabilities', async () => {
  const c = setup();
  const r = await c.request('/9');
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.data.memo.guid, '9');
  assert.equal(r.body.data.memo.capabilities.validate, false);
  assert.equal(c.seen[0].kind, 'detail');
});
test('ACL denial remains a nondisclosing 404', async () => {
  const c = setup(local, { deny: true });
  const r = await c.request('/9');
  assert.equal(r.statusCode, 404);
  assert.equal(r.body.error.code, 'memo_not_found');
});
test('no session rejected before read', async () => {
  const c = setup();
  assert.equal((await c.request('/list', { noSession: true })).statusCode, 401);
  assert.equal(c.reads(), 0);
});
test('BFF tenant mismatch rejected before API', async () => {
  const c = setup();
  assert.equal((await c.request('/list', { tenant: '99' })).statusCode, 403);
  assert.equal(c.reads(), 0);
});
test('API tenant mismatch rejected independently', async () => {
  const c = setup(local, { wrongApiTenant: true });
  assert.equal((await c.request()).statusCode, 403);
  assert.equal(c.reads(), 0);
});
test('unverified integrator context remains forbidden', async () => {
  const c = setup();
  assert.equal((await c.request('/list', { headers: integratorHeaders })).statusCode, 401);
  assert.equal(c.reads(), 0);
});
test('delegated memo list and detail use the represented manager', async () => {
  const c = setup();
  for (const route of ['/list', '/9']) {
    const direct = await c.request(route);
    const delegated = await c.request(route, { headers: integratorHeaders, delegated: true });
    assert.equal(direct.statusCode, 200);
    assert.equal(delegated.statusCode, 200);
    assert.deepEqual(delegated.body, direct.body);
  }
  assert.deepEqual(c.proof(), {
    'x-toke-integrator-session': 'integrator',
    'x-integrator-context': contextToken,
  });
  assert.equal(c.reads(), 4);
});
test('delegated memo reads retain tenant isolation and ACLs', async () => {
  const opts = { headers: integratorHeaders, delegated: true };
  const wrong = setup(local, { delegatedTenant: '99' });
  assert.equal((await wrong.request('/list', opts)).statusCode, 403);
  assert.equal(wrong.reads(), 0);
  assert.equal(
    (await setup().request('/list', { ...opts, query: { supervisor: '99' } })).statusCode,
    403,
  );
  assert.equal((await setup(local, { deny: true }).request('/9', opts)).statusCode, 404);
});
test('spoofed internal header not forwarded; actor query cannot impersonate', async () => {
  const c = setup();
  const r = await c.request('/list', {
    headers: { 'x-toke-user-session': 'spoof' },
    query: { supervisor: '99' },
  });
  assert.equal(r.statusCode, 403);
  assert.equal(c.proof()['x-toke-user-session'], token);
});
for (const [route, method] of [
  ['/summary', 'GET'],
  ['/9/events', 'GET'],
  ['/attachments', 'POST'],
  ['/', 'GET'],
])
  test(`${method} ${route} stays locked`, async () => {
    const c = setup();
    assert.equal((await c.request(route, { method })).body.error.code, 'memo_permissions_pending');
    assert.equal(c.reads(), 0);
  });
for (const env of [{ NODE_ENV: 'production', MEMO_B2_MANAGER_READS: '1' }, { NODE_ENV: 'test' }])
  test(
    'opening disabled without both controlled environment and flag ' + JSON.stringify(env),
    async () => {
      const c = setup(env);
      assert.equal((await c.request()).body.error.code, 'memo_permissions_pending');
      assert.equal(c.reads(), 0);
    },
  );
test('missing B1 fails closed; no legacy fallback', async () => {
  const c = setup(local, { missingB1: true });
  const r = await c.request();
  assert.equal(r.statusCode, 503);
  assert.equal(r.body.error.code, 'memo_read_unavailable');
});

test('real B2 repository refuses absent B1 function without DDL', async () => {
  const queries = [];
  const db = {
    transaction: async (options, work) => work({}),
    query: async (sql) => {
      queries.push(sql);
      if (sql === 'SET TRANSACTION READ ONLY') return [];
      throw Object.assign(Error('undefined function'), { code: '42883' });
    },
  };
  const manager = {
    assertConnection() {},
    getConnectionSync: () => db,
    getCurrentTenant: () => principal.subdomain,
  };
  const real = load('packages/api/src/tenant/memos/reads.service.ts', {
    sequelize: {
      QueryTypes: { SELECT: 'SELECT' },
      Transaction: { ISOLATION_LEVELS: { REPEATABLE_READ: 'REPEATABLE READ' } },
    },
    '../../tools/user-session.authority.js': {},
    '../database/db.tenant-manager.js': { default: manager },
    './responsibility.policy.js': {
      loadMemoOrganization: async () => {
        throw Error('Must not reach ACL before schema check');
      },
    },
  });
  await assert.rejects(
    real.MemoReadsService.read(principal, { kind: 'list' }),
    (e) => e.code === 'memo_b1_not_ready',
  );
  assert.deepEqual(queries, [
    'SET TRANSACTION READ ONLY',
    'SELECT public.toke_b1_version() AS version',
  ]);
});
test('real B2 service list has no MemoReads table dependency and rejects actor impersonation', async () => {
  const queries = [];
  const actor = { id: 1, guid: '7', roles: ['MANAGER'], active: true };
  const db = {
    transaction: async (options, work) => work({}),
    query: async (sql) => {
      queries.push(sql);
      if (sql === 'SET TRANSACTION READ ONLY') return [];
      if (sql.includes('toke_b1_version')) return [{ version: 'b1-v1' }];
      if (sql.startsWith('SELECT count')) return [{ total: 0 }];
      return [];
    },
  };
  const real = load('packages/api/src/tenant/memos/reads.service.ts', {
    sequelize: {
      QueryTypes: { SELECT: 'SELECT' },
      Transaction: { ISOLATION_LEVELS: { REPEATABLE_READ: 'REPEATABLE READ' } },
    },
    '../database/db.tenant-manager.js': {
      default: { getConnectionSync: () => db, getCurrentTenant: () => principal.subdomain },
    },
    './responsibility.policy.js': {
      loadMemoOrganization: async () => ({
        people: new Map([[1, actor]]),
        activePerson: () => true,
        readableResponsibilities: () => [],
        manager: () => true,
      }),
    },
  });
  const result = await real.MemoReadsService.read(principal, {
    kind: 'list',
    filters: { supervisor: '7' },
  });
  assert.deepEqual(result, { memos: [], writesEnabled: false, receiptsEnabled: false, total: 0, offset: 0, limit: 20 });
  assert.equal(
    queries.some((q) => /JOIN public\.tk_memo_reads/.test(q)),
    false,
  );
  assert.ok(queries.some((q) => q.includes('m.author_user=$actor OR m.target_user=$actor')));
  await assert.rejects(
    real.MemoReadsService.read(principal, { kind: 'list', filters: { supervisor: '99' } }),
    (e) => e.status === 403 && e.code === 'memo_actor_mismatch',
  );
});

test('BFF enabled but API disabled preserves memo_permissions_pending without legacy fallback', async () => {
  const c = setup(local, { apiEnv: { NODE_ENV: 'test' } });
  const r = await c.request();
  assert.equal(r.statusCode, 503);
  assert.equal(r.body.error.code, 'memo_permissions_pending');
  assert.equal(c.reads(), 0);
});
test('API enabled but BFF disabled preserves memo_permissions_pending without upstream call', async () => {
  const c = setup({ NODE_ENV: 'test' }, { apiEnv: local });
  const r = await c.request();
  assert.equal(r.statusCode, 503);
  assert.equal(r.body.error.code, 'memo_permissions_pending');
  assert.equal(c.proof(), undefined);
  assert.equal(c.reads(), 0);
});
test('detail is also unavailable in production even with local flags', async () => {
  const c = setup({ NODE_ENV: 'production', MEMO_B2_MANAGER_READS: '1', MEMO_B2_LOCAL_READS: '1' });
  const r = await c.request('/9');
  assert.equal(r.statusCode, 503);
  assert.equal(r.body.error.code, 'memo_permissions_pending');
  assert.equal(c.reads(), 0);
});

const production = { NODE_ENV: 'production', MEMO_B2_PRODUCTION_MANAGER_READS: '1' };
for (const route of ['/list', '/9'])
  test('production explicit enable: ' + route, async () => {
    const c = setup(production);
    const r = await c.request(route);
    assert.equal(r.statusCode, 200);
    assert.equal(c.reads(), 1);
    assert.equal(c.proof()['x-toke-user-session'], token);
  });
for (const value of [undefined, '', '0', 'true', 'yes', ' 1', '1 '])
  test('production stays closed for non-exact flag ' + JSON.stringify(value), async () => {
    const c = setup({
      NODE_ENV: 'production',
      MEMO_B2_PRODUCTION_MANAGER_READS: value,
      MEMO_B2_MANAGER_READS: '1',
      MEMO_B2_LOCAL_READS: '1',
    });
    assert.equal((await c.request()).body.error.code, 'memo_permissions_pending');
    assert.equal(c.reads(), 0);
  });
for (const environment of [undefined, 'staging', 'Production'])
  test('unknown environment fails closed ' + environment, async () => {
    const c = setup({ NODE_ENV: environment, MEMO_B2_PRODUCTION_MANAGER_READS: '1' });
    assert.equal((await c.request()).statusCode, 503);
    assert.equal(c.reads(), 0);
  });
for (const [bff, api] of [
  [production, { NODE_ENV: 'production' }],
  [{ NODE_ENV: 'production' }, production],
])
  test('partial production enable fails closed ' + JSON.stringify(bff), async () => {
    const c = setup(bff, { apiEnv: api });
    assert.equal((await c.request()).body.error.code, 'memo_permissions_pending');
    assert.equal(c.reads(), 0);
  });
for (const [route, method] of [
  ['/', 'GET'],
  ['/summary', 'GET'],
  ['/statistics/overview', 'GET'],
  ['/9/events', 'GET'],
  ['/my-created', 'GET'],
  ['/my-memos', 'GET'],
  ['/pending', 'GET'],
  ['/pending-validation', 'GET'],
  ['/auto-generated', 'GET'],
  ['/type/other/list', 'GET'],
  ['/target/7/list', 'GET'],
  ['/9/attachments', 'GET'],
  ['/attachments', 'POST'],
  ['/9', 'HEAD'],
  ['/9', 'PUT'],
  ['/9', 'DELETE'],
  ['/list/', 'GET'],
  ['/LIST', 'GET'],
])
  test('production BFF and independent API retain lock ' + method + ' ' + route, async () => {
    const env = { ...production, MEMO_B2_LOCAL_READS: '1', MEMO_B2_MANAGER_READS: '1' };
    const c = setup(env);
    assert.equal((await c.request(route, { method })).body.error.code, 'memo_permissions_pending');
    await assert.rejects(
      c.apiGet('/memo' + route, { params: {}, headers: { 'x-toke-user-session': token }, method }),
      (e) => e.response.status === 503 && e.response.data.error.code === 'memo_permissions_pending',
    );
    assert.equal(c.reads(), 0);
  });
for (const [name, options, requestOptions, status] of [
  ['no manager proof', {}, { noSession: true }, 401],
  ['invalid manager proof', {}, { headers: { authorization: 'Bearer wrong.signature' } }, 401],
  ['integrator', {}, { headers: { 'x-integrator-context': 'synthetic' } }, 401],
  ['tenant mismatch', {}, { tenant: '99' }, 403],
  ['API tenant mismatch', { wrongApiTenant: true }, {}, 403],
  ['missing B1', { missingB1: true }, {}, 503],
  ['session configuration absent', { unavailable: true }, {}, 503],
  ['ACL denied', { deny: true }, {}, 404],
])
  test('production fails closed: ' + name, async () => {
    const c = setup(production, options);
    const result = await c.request('/9', requestOptions);
    assert.equal(result.statusCode, status);
    if (!options.deny && !options.missingB1) assert.equal(c.reads(), 0);
  });
