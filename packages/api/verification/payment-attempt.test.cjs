const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '../src');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const url = (s) =>
  'data:text/javascript;base64,' +
  Buffer.from(stripTypeScriptTypes(s, { mode: 'transform' })).toString('base64');
(async () => {
  const rules = await import(url(read('master/class/payment-attempt-contract.ts')));
  const input = {
    tenantGuid: 100022,
    transactionGuid: 100009,
    phoneNumber: '+237670000001',
    idempotencyKey: 'DEMO_FIRST_0001',
    environment: 'TEST',
  };
  assert.equal(rules.normalizeAttempt(input).phoneNumber, '237670000001');
  for (const bad of ['10920.32', '0', '-1', '1e3', 'Infinity'])
    assert.throws(() => rules.wholeXaf(bad));
  assert.equal(rules.wholeXaf('10920.00'), '10920');
  for (const s of ['FAILED', 'CANCELLED', 'COMPLETED'])
    assert.equal(rules.canTransition(s, 'PENDING'), false);
  assert.equal(rules.canTransition('PROCESSING', 'PENDING'), false);
  assert.equal(rules.canTransition('UNKNOWN', 'COMPLETED'), true);
  assert.equal(rules.canTransition('PENDING', 'EXPIRED'), false);
  assert.equal(rules.providerFor('MTN_MOMO'), 'MTN_MOMO_CMR');
  assert.throws(() => rules.providerFor('CASH'));
  assert.throws(() => rules.normalizeAttempt({ ...input, phoneNumber: 'abc' }));
  assert.throws(() => rules.normalizeAttempt({ ...input, tenantGuid: 22 }));
  const rulesSource = read('master/class/payment-attempt-contract.ts').replace(/export /g, '');
  const dbSource = read('master/database/base_model/db.payment-attempt.ts').replace(
    /^import .*;\n/gm,
    '',
  );
  const { default: Db } = await import(
    url(
      "import {randomUUID} from 'node:crypto';\nconst TableInitializer={getModel(){throw Error('No default connection in test')}};\n" +
        rulesSource +
        '\n' +
        dbSource,
    )
  );
  let stored = null,
    insertions = 0;
  const payment = {
    id: 9,
    guid: 100009,
    tenant_status: 'ACTIVE',
    license_status: 'PENDING_PAYMENT',
    billing_mode: 'PREPAID',
    source_type: 'CYCLE',
    transaction_status: 'PENDING',
    billing_status: 'PENDING',
    method_active: true,
    method_type: 'MOBILE_MONEY',
    currency_code: 'XAF',
    billing_currency_code: 'XAF',
    supported_currencies: ['XAF'],
    amount_local: '10920.00',
    total_amount_local: '10920.00',
    method_code: 'MTN_MOMO',
  };
  const conn = {
    transaction: async (f) => f({}),
    query: async (sql, opts) => {
      if (sql.includes('FOR UPDATE OF p')) return [[payment]];
      if (sql.includes('idempotency_key=:key'))
        return [[...(stored && stored.idempotency_key === opts.replacements.key ? [stored] : [])]];
      if (sql.includes('SELECT guid FROM')) return [[...(stored ? [{ guid: 100001 }] : [])]];
      if (sql.includes('SELECT received_local')) return [[{ received_local: '0.00' }]];
      if (sql.includes('INSERT INTO')) {
        insertions++;
        stored = {
          id: 1,
          guid: 100001,
          payment_transaction: 9,
          status: 'CREATED',
          phone_number: opts.replacements.phone,
          environment: opts.replacements.environment,
          idempotency_key: opts.replacements.key,
          external_id: opts.replacements.external,
          amount_local: opts.replacements.amount,
          currency_code: 'XAF',
        };
        return [[stored]];
      }
      if (sql.includes('WHERE t.guid=:tenant AND a.guid=:attempt')) {
        assert.equal(opts.replacements.tenant, 100022);
        assert.equal(opts.replacements.attempt, 100001);
        return [[]];
      }
      throw Error('Unexpected query');
    },
  };
  const db = new Db(conn);
  assert.equal(await db.load(100022, 100001), null);
  const first = await db.reserve(input);
  assert.equal(first.replayed, false);
  assert.equal((await db.reserve(input)).replayed, true);
  assert.equal(insertions, 1);
  await assert.rejects(db.reserve({ ...input, phoneNumber: '237670000002' }));
  await assert.rejects(db.reserve({ ...input, idempotencyKey: 'DEMO_FIRST_0002' }));
  stored = null;
  payment.amount_local = '10920.32';
  await assert.rejects(db.reserve(input));
  assert.equal(insertions, 1);
  const model = read('master/model/PaymentAttemptModel.ts')
    .replace(/^import .*;\n/gm, '')
    .replace('export default class', 'class');
  const entity = read('master/class/PaymentAttempt.ts').replace(/^import .*;\n/gm, '');
  const { default: Entity } = await import(
    url(rulesSource + '\nclass PaymentAttemptDb{}\n' + model + '\n' + entity)
  );
  const e = new Entity().hydrate({
    id: 22,
    guid: 100001,
    payment_transaction: 9,
    payment_transaction_guid: 100009,
    phone_number: '237670000001',
    status: 'CREATED',
    external_id: 'secret-reference',
  });
  const json = e.toJSON();
  assert.equal(json.guid, 100001);
  assert.equal(json.phone_masked, '*******001');
  for (const k of ['id', 'payment_transaction', 'phone_number', 'external_id'])
    assert.equal(k in json, false);
  function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p);
      else if (p.endsWith('.ts'))
        stripTypeScriptTypes(fs.readFileSync(p, 'utf8'), { mode: 'transform' });
    }
  }
  walk(path.join(root, 'master'));
  const init = read('master/database/db.initializer.ts');
  assert.ok(
    init.indexOf('    this.definePaymentTransactionModel();') <
      init.indexOf('    this.models.set(PaymentAttemptDbStructure'),
  );
  console.log(
    'PASS rules, XAF integer rejection, idempotency/conflict with simulated DB, tenant-scoped reads, public projection, TS syntax and sync order. PostgreSQL concurrency/migration and full build NOT tested.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
