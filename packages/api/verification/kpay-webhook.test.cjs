const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { createHmac } = require('node:crypto'),
  { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const moduleUrl = (s) =>
  'data:text/javascript;base64,' +
  Buffer.from(stripTypeScriptTypes(s, { mode: 'transform' })).toString('base64');
(async () => {
  const guard = await import(moduleUrl(read('master/services/kpay-webhook-signature.ts'))),
    secret = 'test-webhook-secret-not-real';
  const event = {
    event: 'payment.completed',
    paymentId: 'pay_1',
    reference: 'KPAY_REF',
    externalId: 'TOKE_123',
    status: 'COMPLETED',
    amount: 10920,
    phoneNumber: '237670000001',
  };
  function envelope(e = event, space) {
    const raw = Buffer.from(JSON.stringify(e, null, space));
    return {
      raw_body_base64: raw.toString('base64'),
      signature: createHmac('sha256', secret).update(raw).digest('hex'),
      event_header: e.event,
    };
  }
  assert.equal(guard.verifiedWebhook(envelope(event, 2), secret).paymentId, 'pay_1');
  assert.equal(
    guard.verifiedWebhook(envelope({ ...event, isTest: true, currency: 'XAF' }), secret).isTest,
    true,
  );
  assert.throws(() => guard.verifiedWebhook(envelope(), undefined));
  assert.throws(() => guard.verifiedWebhook({ ...envelope(), signature: 'f'.repeat(64) }, secret));
  assert.throws(() => guard.verifiedWebhook({ ...envelope(), signature: 'xx' }, secret));
  const pretty = envelope(event, 2);
  pretty.raw_body_base64 = Buffer.from(JSON.stringify(event)).toString('base64');
  assert.throws(() => guard.verifiedWebhook(pretty, secret));
  for (const delta of [
    { status: 'FAILED' },
    { amount: 10920.32 },
    { phoneNumber: 'bad' },
    { currency: 'USD' },
    { isTest: 'true' },
    { externalId: '../wrong' },
  ])
    assert.throws(() => guard.verifiedWebhook(envelope({ ...event, ...delta }), secret));
  assert.equal(
    guard.verifiedWebhook(envelope({ ...event, event: 'refund.completed' }), secret),
    null,
  );
  assert.throws(() =>
    guard.verifiedWebhook({ ...envelope(), event_header: 'payment.failed' }, secret),
  );
  const rules = `class PaymentAttemptError extends Error{constructor(m,s=409){super(m);this.status=s}}\nfunction guid(n){if(!Number.isInteger(n)||n<100000||n>999999)throw Error('guid');return n}\nfunction wholeXaf(n){return BigInt(String(n).split('.')[0]).toString()}\n`;
  const dbSrc = read('master/database/base_model/db.payment-attempt.ts').replace(
    /^import .*;\n/gm,
    '',
  );
  const { default: DB } = await import(
    moduleUrl(
      "import {randomUUID} from 'node:crypto';\nconst TableInitializer={};\n" + rules + dbSrc,
    )
  );
  let writes = 0;
  let row = {
    guid: 100001,
    tenant_guid: 100022,
    payment_transaction_guid: 100009,
    status: 'UNKNOWN',
    environment: 'TEST',
    amount_local: '10920.00',
    currency_code: 'XAF',
    phone_number: event.phoneNumber,
    external_id: event.externalId,
  };
  const db = new DB({
    transaction: async (fn) => fn({}),
    query: async (sql, o) => {
      if (sql.includes('a.external_id=:external'))
        return [[...(o.replacements.external === row.external_id ? [row] : [])]];
      if (sql.includes('UPDATE public.xa_payment_attempt SET provider_payment_id')) {
        writes++;
        row = {
          ...row,
          provider_payment_id: o.replacements.providerId,
          provider_reference: o.replacements.reference,
        };
        return [[row]];
      }
      throw Error('Unexpected query');
    },
  });
  const verified = guard.verifiedWebhook(envelope(), secret);
  await db.bindWebhook(verified, 'TEST');
  assert.equal(row.provider_payment_id, 'pay_1');
  assert.equal(row.status, 'UNKNOWN');
  await db.bindWebhook(verified, 'TEST');
  assert.equal(row.status, 'UNKNOWN');
  await assert.rejects(db.bindWebhook({ ...verified, amount: '10921' }, 'TEST'));
  await assert.rejects(db.bindWebhook({ ...verified, paymentId: 'pay_other' }, 'TEST'));
  await assert.rejects(db.bindWebhook({ ...verified, isTest: false }, 'TEST'));
  await assert.rejects(db.bindWebhook(verified, 'LIVE'));
  await assert.rejects(db.bindWebhook({ ...verified, externalId: 'OTHER' }, 'TEST'));
  row.status = 'COMPLETED';
  const before = writes;
  await db.bindWebhook(verified, 'TEST');
  assert.equal(writes, before);
  await assert.rejects(db.bindWebhook({ ...verified, status: 'FAILED' }, 'TEST'));
  function walk(dir) {
    for (const x of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, x.name);
      if (x.isDirectory()) walk(f);
      else if (f.endsWith('.ts'))
        stripTypeScriptTypes(fs.readFileSync(f, 'utf8'), { mode: 'transform' });
    }
  }
  walk(root + '/master');
  walk(root + '/backend');
  const app = read('backend/app.ts');
  assert.ok(
    app.indexOf("this.app.use('/kpay', kpayWebhookRoute)") <
      app.indexOf("this.app.use(express.json({ limit: '50mb' }))"),
  );
  console.log(
    'PASS raw HMAC/format checks, optional provider fields, durable binding after timeout with mocked DB, identity/environment conflicts, duplicate terminal event, raw parser order, TS syntax. No real PostgreSQL/HTTP/KPay/full build.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
