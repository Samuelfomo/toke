const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { stripTypeScriptTypes } = require('node:module');
(async () => {
  let source = fs
    .readFileSync(__dirname + '/../master/class/onboarding-subscription-input.ts', 'utf8')
    .replace(/^import .*;\n/gm, '');
  source =
    'class OnboardingError extends Error{constructor(message,status=400){super(message);this.status=status}}\n' +
    source;
  const { onboardingChoice: choice, onboardingRequest: request } = await import(
    'data:text/javascript;base64,' +
      Buffer.from(stripTypeScriptTypes(source, { mode: 'transform' })).toString('base64')
  );
  const c = choice({ requested_seats: 5, payment_method_guid: 100002 });
  const a = request(100022, c, null, new Date('2026-10-13T23:10:00Z'));
  assert.equal(a.start_date, '2026-10-14');
  assert.equal(a.idempotency_key, 'ONBOARDING_FIRST_V1_100022');
  const prior = {
    tenant: 100022,
    key: a.idempotency_key,
    type: 'CLOUD_FLEX',
    months: 1,
    seats: 5,
    method: 100002,
    startDate: a.start_date,
  };
  const b = request(100022, c, prior, new Date('2026-10-17T23:10:00Z'));
  assert.deepEqual(a, b);
  assert.throws(() => request(100022, { ...c, seats: 6 }, prior));
  assert.throws(() => choice({ requested_seats: 5, payment_method_guid: 100002, tenant: 100023 }));
  assert.throws(() => choice({ requested_seats: 5, payment_method_guid: '100002' }));
  assert.throws(() => choice({ payment_method_guid: 100002 }));
  assert.notEqual(request(100023, c, null).idempotency_key, a.idempotency_key);
  console.log(
    'PASS two-field contract, server defaults, Douala midnight, replay days later, changed choices refused, tenant injection refused.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
