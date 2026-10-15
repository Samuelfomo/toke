const assert = require('node:assert/strict');
const fs = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
(async () => {
  process.env.TOKE_ONBOARDING_SECRET = 'test-only-abcdefghijklmnopqrstuvwxyz0123456789';
  process.env.TOKE_ONBOARDING_URL = 'https://example.test/first-license';
  const source = fs.readFileSync(__dirname + '/../tools/tenant-onboarding-token.ts', 'utf8');
  const { default: T } = await import(
    'data:text/javascript;base64,' +
      Buffer.from(stripTypeScriptTypes(source, { mode: 'transform' })).toString('base64')
  );
  const now = Date.now(),
    token = T.issue(100021, 'Contact@Example.test', now);
  assert.equal(T.verify(token, now).tenant, 100021);
  assert.equal(T.verify(token, now).contact, T.contact('contact@example.test'));
  assert.throws(() => T.verify(token, now + 86400001));
  const [p, s] = token.split('.');
  const tampered =
    Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), tenant: 100022 }),
    ).toString('base64url') +
    '.' +
    s;
  assert.throws(() => T.verify(tampered, now));
  assert.throws(() => T.verify('100021', now));
  assert.throws(() => T.verify(token + '.x', now));
  assert.equal(new URL(T.url(token)).search, '');
  assert.ok(new URL(T.url(token)).hash.includes('token='));
  process.env.TOKE_ONBOARDING_SECRET = 'short';
  assert.throws(() => T.issue(100021, 'a@b.c'));
  for (const file of ['tenant.lookup.route.ts.txt', 'tenant.provision.route.ts.txt'])
    stripTypeScriptTypes(fs.readFileSync(__dirname + '/../patches/' + file, 'utf8'), {
      mode: 'transform',
    });
  const lookup = fs.readFileSync(__dirname + '/../patches/tenant.lookup.route.ts.txt', 'utf8');
  assert.ok(!lookup.includes('EmailSender'));
  const provision = fs.readFileSync(
    __dirname + '/../patches/tenant.provision.route.ts.txt',
    'utf8',
  );
  assert.ok(provision.includes('.provision(validGuid'));
  assert.ok(
    provision.indexOf('const createDb') > provision.indexOf('defineDatabaseConfig();\n\n    }'),
  );
  console.log(
    'PASS signatures, expiration, tenant tampering, link purpose, secret, syntax of route patches, read-only GET, retry structure. No DB/build/E-mailJS integration tested.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
