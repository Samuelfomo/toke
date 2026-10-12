'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  assert = require('node:assert/strict'),
  { stripTypeScriptTypes } = require('node:module'),
  { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '../src');
function compile(source) {
  return stripTypeScriptTypes(source, { mode: 'transform' });
}
function load(file, params, values, result) {
  const js = compile(fs.readFileSync(path.join(root, file), 'utf8'))
    .replace(/^import .*;$/gm, '')
    .replace(/export default /g, '')
    .replace(/export /g, '');
  return new Function(...params, js + ';return ' + result + ';')(...values);
}
const { subscriptionInput, subscriptionOffers } = load(
  'master/class/license-subscription-input.ts',
  ['GLOBAL_LICENSE_DEFAULTS'],
  [{ BASE_PRICE_USD: 3, MINIMUM_SEATS: 5 }],
  '{subscriptionInput,subscriptionOffers}',
);
const amounts = load(
  'master/services/renewal-amounts.ts',
  [],
  [],
  '{renewalAmounts,decimalUnits,centsText}',
);
const Db = load(
  'master/database/base_model/db.license-subscription.ts',
  ['TableInitializer', ...Object.keys(amounts)],
  [{}, ...Object.values(amounts)],
  'LicenseSubscriptionDb',
);
const body = {
  tenant: 100021,
  license_type: 'CLOUD_FLEX',
  billing_cycle_months: 1,
  payment_method_guid: 100002,
  start_date: '2026-10-09',
  requested_seats: 5,
  idempotency_key: 'CREATE_1',
  actor_user_guid: '7173056141612204',
  actor_tenant_guid: 100014,
};
const input = subscriptionInput(body),
  offer = subscriptionOffers().CLOUD_FLEX;
assert.equal(offer.price, '3.00');
for (const field of [
  'base_price_usd',
  'license_status',
  'minimum_seats',
  'billing_mode',
  'payment_method_code',
])
  assert.throws(() => subscriptionInput({ ...body, [field]: 'unsafe' }));
assert.throws(() => subscriptionInput({ ...body, start_date: '2026-02-30' }));
assert.throws(() => subscriptionInput({ ...body, tenant: 21 }));
assert.deepEqual(amounts.renewalAmounts('15.00', '610.500000', ['0.1925']), {
  baseUsd: '15.00',
  baseLocal: '9157.50',
  taxUsd: '2.89',
  taxLocal: '1762.82',
  totalUsd: '17.89',
  totalLocal: '10920.32',
});
function fake(options = {}) {
  const calls = [];
  let committed = [],
    rolledBack = false;
  const db = {
    query: async (sql, args = {}) => {
      calls.push(sql);
      let result = [];
      if (sql.includes('information_schema.columns'))
        result = options.missingSchema
          ? []
          : [{ column_name: 'billing_mode' }, { column_name: 'postpaid_from' }];
      else if (sql.includes('FROM public.xa_tenant'))
        result = [
          {
            id: 21,
            guid: 100021,
            status: 'ACTIVE',
            timezone: 'Africa/Douala',
            primary_currency_code: 'XAF',
            country_code: 'CM',
            tax_number: 'NIU',
            tax_exempt: false,
          },
        ];
      else if (sql.includes('SELECT e.guid')) result = options.prior ? [options.prior] : [];
      else if (sql.includes("license_status<>'CANCELLED'"))
        result = options.existing ? [{ guid: 100024 }] : [];
      else if (sql.includes('pg_timezone_names')) result = [{ name: 'Africa/Douala' }];
      else if (sql.includes('GREATEST('))
        result = [
          {
            start: '2026-10-08T23:00:00Z',
            finish: '2026-11-08T23:00:00Z',
            due: '2026-10-09T12:00:00Z',
            valid: !options.past,
          },
        ];
      else if (sql.includes('FROM public.xa_payment_method'))
        result = options.noMethod
          ? []
          : [{ id: 2, min_amount_usd: '1.00', max_amount_usd: '10000.00' }];
      else if (sql.includes('FROM public.xf_exchange_rate'))
        result = [{ exchange_rate: '610.500000' }];
      else if (sql.includes('FROM public.xf_tax_rule'))
        result = [{ guid: 100001, tax_rate: '0.1925', required_tax_number: true }];
      else if (sql.includes('nextval(')) result = [{ id: 30 }];
      else if (sql.includes('SELECT id FROM public.')) result = [];
      else if (sql.includes('INSERT INTO public.xa_license_event')) {
        if (options.failEvent) throw Error('Event insert failed');
        result = [{ guid: 100200 }];
      } else if (sql.startsWith('INSERT ')) result = [];
      else if (sql.includes('SELECT * FROM public.xa_global_license'))
        result = [{ id: 30, guid: 100030, tenant: 21 }];
      else throw Error('Unexpected SQL: ' + sql);
      return [result];
    },
    transaction: async (fn) => {
      try {
        const result = await fn({});
        committed = calls.filter((x) => x.startsWith('INSERT '));
        return result;
      } catch (e) {
        rolledBack = true;
        committed = [];
        throw e;
      }
    },
  };
  return {
    db,
    calls,
    get committed() {
      return committed;
    },
    get rolledBack() {
      return rolledBack;
    },
  };
}
(async () => {
  const success = fake();
  const created = await new Db(success.db).create(input, () => offer);
  assert.equal(success.committed.length, 5);
  assert.equal(created.snapshot.license_guid, 100030);
  assert.equal(created.snapshot.amounts.totalLocal, '10920.32');
  assert.equal(created.transaction_status, 'PENDING');
  const prior = {
    guid: 100200,
    metadata: { request: input, snapshot: created.snapshot },
    license_status: 'ACTIVE',
    billing_status: 'COMPLETED',
    transaction_status: 'COMPLETED',
  };
  const replay = fake({ prior });
  const repeated = await new Db(replay.db).create(input, () => {
    throw Error('Should not lookup configuration on replay');
  });
  assert.equal(repeated.replayed, true);
  assert.equal(repeated.license_status, 'ACTIVE');
  assert.equal(replay.committed.length, 0);
  const mismatch = fake({ prior });
  await assert.rejects(
    () => new Db(mismatch.db).create({ ...input, seats: 6 }, () => offer),
    /Idempotency key conflict/,
  );
  for (const [options, message] of [
    [{ existing: true }, /already has a license/],
    [{ past: true }, /Start date/],
    [{ noMethod: true }, /Payment method/],
    [{ missingSchema: true }, /foundation migrations/],
    [{ failEvent: true }, /Event insert failed/],
  ]) {
    const f = fake(options);
    await assert.rejects(() => new Db(f.db).create(input, () => offer), message);
    assert.equal(f.rolledBack, true);
    assert.equal(f.committed.length, 0);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toke-lot34-'));
  try {
    fs.cpSync(path.join(root, 'patches'), path.join(tmp, 'patches'), { recursive: true });
    const source = process.argv.find((x) => x.startsWith('--source='))?.slice(9);
    if (source) {
      for (const relative of [
        'routes/global.license.route.ts',
        'class/GlobalLicense.ts',
        'model/GlobalLicenseModel.ts',
      ]) {
        const dest = path.join(tmp, 'src/master', relative);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(path.join(source, relative), dest);
      }
      const run = () =>
        spawnSync(process.execPath, [path.join(root, 'scripts/install-lot34.cjs'), '--apply'], {
          cwd: tmp,
          encoding: 'utf8',
        });
      let r = run();
      assert.equal(r.status, 0, r.stderr);
      const entity = fs.readFileSync(path.join(tmp, 'src/master/class/GlobalLicense.ts'), 'utf8'),
        route = fs.readFileSync(
          path.join(tmp, 'src/master/routes/global.license.route.ts'),
          'utf8',
        );
      compile(entity);
      compile(route);
      compile(fs.readFileSync(path.join(tmp, 'src/master/model/GlobalLicenseModel.ts'), 'utf8'));
      assert.equal((route.match(/router\.post\(/g) || []).length, 1);
      assert(!route.includes('validateGlobalLicenseCreation(req.body)'));
      assert(!entity.includes('createInitialPaymentTransaction'));
      assert(!entity.includes('createInitialBillingCycle'));
      assert(!entity.includes('tenant?.toJSON()'));
      assert(!route.includes('LicenseSubscriptionRoute'));
      assert(!route.includes('../database/'));
      r = run();
      assert.equal(r.status, 0, r.stderr);
      assert(r.stdout.includes('Already installed'));
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(
    'PASS inputs, defaults reuse, money, creation, replay, conflicts, rollback mock, schema guard; optional source patch/idempotence verified. Real PostgreSQL and full build not tested.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
