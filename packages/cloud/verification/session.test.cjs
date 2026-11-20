const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createPinia, setActivePinia } = require('pinia');
const root = path.resolve(__dirname, '../src');
function load(file, mocks = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8').replaceAll('import.meta.env.VITE_URL', '"unused.invalid"');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', js)(name => name in mocks ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}
const expiry = load('utils/sessionExpiry.ts');
const token = exp => Buffer.from(JSON.stringify({ exp })).toString('base64url') + '.signature';
function setup() {
  const values = new Map();
  global.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) };
  setActivePinia(createPinia());
  const stores = load('stores/userStore.ts', {
    '../service/UserService': { default: { listSubordinates: async () => ({ success: true, data: { hierarchy: [] } }) } },
    '@/stores/teamStore': { useTeamStore: () => ({ clearCache() {} }) },
    '@/utils/sessionExpiry': expiry,
  });
  return stores;
}
function seed(exp, withToken = true) {
  localStorage.setItem('authData', JSON.stringify({ user: { guid: 'u' }, tenant: { guid: 't' }, expiresAt: Date.now() + 7 * 86400000 }));
  if (withToken) localStorage.setItem('auth_token', token(exp));
}
test('valid existing session migrates seven-day cache to real expiry', () => {
  const stores = setup(); const exp = Math.floor(Date.now()/1000) + 3600;
  seed(exp); const store = stores.useUserStore();
  assert.equal(store.checkSession(), true);
  assert.equal(store.isAuthenticated, true);
  assert.equal(JSON.parse(localStorage.getItem('authData')).expiresAt, exp * 1000);
  store.updateUserData({ first_name: 'Updated' });
  assert.equal(JSON.parse(localStorage.getItem('authData')).expiresAt, exp * 1000);
});
test('expired token rejects a still-future cache and clears authentication', () => {
  const stores = setup(); seed(Math.floor(Date.now()/1000));
  const store = stores.useUserStore(); assert.equal(store.checkSession(), false); assert.equal(store.isAuthenticated, false);
});
test('missing token rejects cached identity', () => {
  const stores = setup(); seed(0, false);
  const store = stores.useUserStore(); assert.equal(store.checkSession(), false); assert.equal(store.isAuthenticated, false);
});
test('new session respects expires_in and token exp without extending on profile update', async () => {
  const stores = setup(); const store = stores.useUserStore();
  const exp = Math.floor(Date.now()/1000) + 86400;
  await store.setAuthData({ success: true, data: { user: { guid: 'u' }, tenant: { guid: 't' }, access_token: token(exp), expires_in: 86400 } });
  assert.equal(JSON.parse(localStorage.getItem('authData')).expiresAt, exp * 1000);
  assert.equal(store.checkSession(), true);
});
test('server rejection invalidates current session only; preserves on network/503/permissions/stale failures', async () => {
  const stores = setup(); seed(Math.floor(Date.now()/1000) + 3600); const store = stores.useUserStore();
  let reject;
  const client = { interceptors: { request: { use() {} }, response: { use(ok, fail) { reject = fail; } } } };
  load('tools/Fetch.Client.ts', { axios: { default: { create: () => client } }, '@/stores/userStore': stores, '@/service/IntegratorService': { integratorStorage: {} } });
  const authorization = `Bearer ${localStorage.getItem('auth_token')}`;
  for (const [status, auth] of [[503, authorization], [403, authorization], [401, 'Bearer old'], [undefined, authorization]]) {
    await assert.rejects(reject({ config: { headers: { Authorization: auth } }, response: { status } }));
    assert.equal(store.checkSession(), true);
  }
  await assert.rejects(reject({ config: { url: '/tenant/verify-otp/000000', headers: { Authorization: authorization } }, response: { status: 401 } }));
  assert.equal(store.checkSession(), true);
  await assert.rejects(reject({ config: { headers: { Authorization: authorization } }, response: { status: 401 } }));
  assert.equal(store.isAuthenticated, false); assert.equal(store.checkSession(), false);
});

test('expires_in shorter than token lifetime is respected', async () => {
  const stores = setup(); const store = stores.useUserStore(); const start = Date.now();
  await store.setAuthData({ success: true, data: { user: { guid: 'u' }, tenant: { guid: 't' }, access_token: token(Math.floor(start/1000) + 86400), expires_in: 60 } });
  const end = JSON.parse(localStorage.getItem('authData')).expiresAt;
  assert.ok(end >= start + 60000 && end <= Date.now() + 60000);
});
