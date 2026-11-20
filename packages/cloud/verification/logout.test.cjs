const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createPinia, setActivePinia } = require('pinia');
function load(file, mocks = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8').replaceAll('import.meta.env.VITE_URL', '"unused.invalid"');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', js)(name => {
    if (name === 'pinia' || name === 'vue') return require(name);
    assert.ok(name in mocks, `Unexpected dependency ${name}`); return mocks[name];
  }, module, module.exports);
  return module.exports;
}
function setup(post) {
  const values = new Map();
  global.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) };
  setActivePinia(createPinia());
  const calls = []; let clears = 0;
  const service = load('service/SessionLogoutService.ts', { axios: { default: { post: (...args) => { calls.push(args); return post(...args); } } } });
  const expiry = load('utils/sessionExpiry.ts');
  const store = load('stores/userStore.ts', {
    '../service/SessionLogoutService': service,
    '../service/UserService': { default: { listSubordinates: async () => ({ success: true, data: { hierarchy: [] } }) } },
    '@/stores/teamStore': { useTeamStore: () => ({ clearCache() { clears++; } }) },
    '@/utils/sessionExpiry': expiry,
  }).useUserStore();
  const login = async (id = 'old') => {
    const token = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000) + 86400, id })).toString('base64url') + '.signature';
    await store.setAuthData({ success: true, data: { user: { guid: id }, tenant: { guid: 'tenant' }, access_token: token, expires_in: 86400 } });
    store.setSubordinates([{ id: 1, name: id }]);
    return token;
  };
  return { store, login, calls, clears: () => clears };
}
const confirmed = { data: { success: true, data: { revoked: true } } };
test('confirmed revocation uses captured token before clearing identity and caches', async () => {
  let ctx;
  ctx = setup(async () => { assert.equal(ctx.store.isAuthenticated, true); assert.ok(localStorage.getItem('auth_token')); return confirmed; });
  const token = await ctx.login();
  assert.deepEqual(await ctx.store.logout(), { revoked: true, localCleared: true });
  assert.equal(ctx.calls[0][0], '/tenant/session/logout');
  assert.equal(ctx.calls[0][2].headers.Authorization, `Bearer ${token}`);
  assert.equal(ctx.calls[0][2].timeout, 10000);
  assert.equal(localStorage.getItem('auth_token'), null);
  assert.equal(localStorage.getItem('authData'), null);
  assert.equal(ctx.store.user, null); assert.equal(ctx.store.tenant, null);
  assert.equal(ctx.store.isAuthenticated, false); assert.deepEqual(ctx.store.subordinates, []);
  assert.equal(ctx.clears(), 1);
});
for (const kind of ['network', 'unconfirmed', 'http401']) {
  test(`${kind}: local cleanup without claiming revocation`, async () => {
    const ctx = setup(async () => {
      if (kind !== 'unconfirmed') throw new Error(kind);
      return { data: { success: true, data: { revoked: false } } };
    });
    await ctx.login();
    assert.deepEqual(await ctx.store.logout(), { revoked: false, localCleared: true });
    assert.equal(localStorage.getItem('auth_token'), null); assert.equal(ctx.store.isAuthenticated, false);
    assert.equal(ctx.clears(), 1);
  });
}
test('absent session performs no HTTP request and cleans local caches', async () => {
  const ctx = setup(() => { throw new Error('Must not call'); });
  assert.deepEqual(await ctx.store.logout(), { revoked: false, localCleared: true });
  assert.equal(ctx.calls.length, 0); assert.equal(ctx.clears(), 1);
});
for (const fails of [false, true]) {
  test(`new session survives old logout ${fails ? 'failure' : 'success'}`, async () => {
    let resolve, reject;
    const pending = new Promise((ok, fail) => { resolve = ok; reject = fail; });
    const ctx = setup(() => pending); const oldToken = await ctx.login();
    const logout = ctx.store.logout();
    await new Promise(setImmediate);
    const newToken = await ctx.login('new');
    if (fails) reject(new Error('offline')); else resolve(confirmed);
    assert.deepEqual(await logout, { revoked: !fails, localCleared: false });
    assert.equal(ctx.calls[0][2].headers.Authorization, `Bearer ${oldToken}`);
    assert.equal(localStorage.getItem('auth_token'), newToken);
    assert.equal(ctx.store.user.guid, 'new'); assert.equal(ctx.store.isAuthenticated, true);
    assert.equal(ctx.store.subordinates.length, 1); assert.equal(ctx.clears(), 0);
  });
}
