const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { stripTypeScriptTypes } = require('node:module');
(async () => {
  let src = fs.readFileSync(__dirname + '/../master/class/TenantOnboardingResend.ts', 'utf8');
  src = src.replace(/^import .*;\n/gm, '');
  src =
    "const ctx=globalThis.__ctx;const Limit={allow:async()=>ctx.allowed};class TenantOnboardingResendModel{async tenantByContact(){ctx.lookups++;return ctx.tenant}}class TenantOnboarding{async invite(){ctx.sends++;if(ctx.error)throw Error('delivery')}}\n" +
    src;
  globalThis.__ctx = { allowed: true, tenant: null, lookups: 0, sends: 0 };
  const { default: C } = await import(
    'data:text/javascript;base64,' +
      Buffer.from(stripTypeScriptTypes(src, { mode: 'transform' })).toString('base64')
  );
  const c = new C(),
    unknown = await c.request({ email: 'unknown@example.test' });
  globalThis.__ctx.tenant = { getGuid: () => 100021 };
  assert.deepEqual(await c.request({ email: 'known@example.test' }), unknown);
  assert.equal(globalThis.__ctx.sends, 1);
  globalThis.__ctx.allowed = false;
  assert.deepEqual(await c.request({ email: 'known@example.test' }), unknown);
  assert.equal(globalThis.__ctx.sends, 1);
  await assert.rejects(c.request({ email: 'bad' }));
  await assert.rejects(c.request({ email: 'a@b.c', tenant_guid: 100022 }));
  globalThis.__ctx.allowed = true;
  globalThis.__ctx.error = true;
  assert.deepEqual(await c.request({ email: 'known@example.test' }), unknown);
  console.log(
    'PASS unknown/known same response, limited no send, invalid body refused, delivery error neutral (mocks).',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
