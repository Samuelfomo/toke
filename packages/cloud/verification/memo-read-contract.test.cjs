'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadService(response) {
  const calls = [];
  const source = fs.readFileSync(path.resolve(__dirname, '../src/service/MemoService.ts'), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  const mocks = {
    '@/tools/Fetch.Client': {
      default: { get: async () => ({ data: new Blob() }) },
      apiRequest: async (config) => { calls.push(config); return response; },
      memoRequestScope: () => ({}),
    },
  };
  new Function('require', 'module', 'exports', js)((name) => {
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  }, module, module.exports);
  return { MemoService: module.exports.default, calls };
}

test('list consumes the BFF B2 envelope and sends the manager as supervisor', async () => {
  const response = { success: true, data: { memos: { items: [], pagination: { total: 0, offset: 0, limit: 25 } } } };
  const { MemoService, calls } = loadService(response);
  assert.equal(await MemoService.listMemo('mgr-1'), response);
  assert.match(calls[0].path, /^\/memo\/list\?/);
  assert.match(calls[0].path, /supervisor=mgr-1/);
});

test('list refuses failed or malformed envelopes instead of showing a false empty state', async () => {
  for (const response of [
    { success: false, error: { code: 'memo_permissions_pending' } },
    { success: true, data: { memos: [] } },
  ]) {
    const { MemoService } = loadService(response);
    await assert.rejects(() => MemoService.listMemo('mgr-1'), (error) =>
      error.code === (response.error?.code || 'memo_read_invalid_response'));
  }
});

test('detail consumes the BFF memo envelope and URL-encodes the GUID', async () => {
  const response = { success: true, data: { memo: { guid: 'memo/a', exchanges: [] } } };
  const { MemoService, calls } = loadService(response);
  assert.equal(await MemoService.getMemoByGuid('memo/a'), response);
  assert.equal(calls[0].path, '/memo/memo%2Fa');
});

test('read errors explain the closed B2 flag and keep authorization failures distinct', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/utils/memoReadError.ts'), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', js)(module, module.exports);
  const message = module.exports.memoReadErrorMessage;
  assert.match(message(Object.assign(new Error('memo_permissions_pending'), { code: 'memo_permissions_pending' }), ''), /pas encore activée/);
  assert.match(message({ status: 403, code: 'tenant_session_mismatch' }, ''), /entreprise/);
});
