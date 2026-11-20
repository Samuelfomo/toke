const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Load the real controller, replacing its service and store; no HTTP client is loaded.
function setup(response = { success: true, data: { user: {}, tenant: {} } }) {
  const calls = [];
  const stored = [];
  const source = fs.readFileSync(path.resolve(__dirname, '../src/ctrl/otpCtrl.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  const mocks = {
    '../service/AuthService': { default: { verifyOtp: async otp => { calls.push(otp); return response; } } },
    '@/stores/userStore': { useUserStore: () => ({ setAuthData: data => stored.push(data) }) },
  };
  new Function('require', 'module', 'exports', js)(name => {
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  }, module, module.exports);
  return { controller: module.exports.default, calls, stored };
}

for (const otp of ['000000', '111111', '123456', '654321', '012345', '938207']) {
  test(`six-digit OTP ${otp} reaches verification unchanged`, async () => {
    const { controller, calls, stored } = setup();
    const result = await controller.verifyOtp(otp);
    assert.equal(result.success, true);
    assert.deepEqual(calls, [otp]);
    assert.equal(stored.length, 1);
  });
}

for (const otp of ['', '   ', '1234', '12345', '1234567', '12345678', '12a456', '12 456', '123456 ', ' 123456', '123456\n', '１２３４５６']) {
  test(`invalid format ${JSON.stringify(otp)} is rejected locally`, async () => {
    const { controller, calls, stored } = setup();
    const result = await controller.verifyOtp(otp);
    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.deepEqual(calls, []);
    assert.deepEqual(stored, []);
  });
}

for (const message of ['Code OTP incorrect', 'Code OTP expiré']) {
  test(`server rejection is preserved: ${message}`, async () => {
    const { controller, calls, stored } = setup({ success: false, message });
    const result = await controller.verifyOtp('000000');
    assert.equal(result.success, false);
    assert.equal(result.message, message);
    assert.deepEqual(calls, ['000000']);
    assert.deepEqual(stored, []);
  });
}
