'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
async function load(file, replace) {
  let s = stripTypeScriptTypes(fs.readFileSync(file, 'utf8'), { mode: 'transform' });
  s = replace(s);
  return import('data:text/javascript;base64,' + Buffer.from(s).toString('base64'));
}
(async () => {
  const moneyPath =
    process.env.TOKE_MONEY_FILE ||
    path.resolve(process.cwd(), 'src/master/services/renewal-amounts.ts');
  if (!fs.existsSync(moneyPath))
    throw Error('Set TOKE_MONEY_FILE to your existing renewal-amounts.ts');
  const money = await load(moneyPath, (s) => s);
  globalThis.__lot30 = {
    Transaction: { ISOLATION_LEVELS: { REPEATABLE_READ: 'REPEATABLE READ' } },
    money,
    ActivityMonitoringDb: class {
      async monthlyUsage(g, s, e, tx) {
        assert(tx);
        return {
          period_closed: true,
          employees: Array.from({ length: 29 }, () => ({
            employee_license_guid: 100031,
            active_days: 1,
          })),
        };
      }
    },
  };
  const mod = await load(
    path.join(root, 'src/master/database/base_model/db.postpaid-closure.ts'),
    (s) =>
      s
        .replace(/^import .*?;\s*/gm, '')
        .replace(
          /^export class PostpaidClosureError/,
          'const {Transaction,ActivityMonitoringDb,money}=globalThis.__lot30; const {decimalUnits,centsText,renewalAmounts}=money;\nexport class PostpaidClosureError',
        ),
  );
  assert.equal(
    mod.closureAmounts(
      '3.00',
      5,
      Array.from({ length: 29 }, () => ({ active_days: 1 })),
      '610.500000',
      [{ tax_rate: '0.1925' }],
    ).amounts.totalLocal,
    '63337.85',
  );
  assert.equal(
    mod.closureAmounts('3.00', 5, [], '610.500000', [{ tax_rate: '0.1925' }]).amounts.totalLocal,
    '10920.32',
  );
  const input = {
    tenantGuid: 100014,
    licenseGuid: 100020,
    start: '2026-10-31T23:00:00.000Z',
    end: '2026-11-30T23:00:00.000Z',
    actor: '7173056141612204',
    key: 'close-november',
    methodGuid: 100002,
    coverageReference: 'NOVEMBER_SIGNALS_RECONCILED',
  };
  function fake(fail = false, prior = null) {
    return {
      committed: false,
      rolledBack: false,
      writes: [],
      async transaction(options, callback) {
        try {
          const r = await callback({ token: 1 });
          this.committed = true;
          return r;
        } catch (e) {
          this.rolledBack = true;
          throw e;
        }
      },
      async query(sql, { replacements: r, transaction }) {
        assert(transaction);
        let result = [];
        if (sql.includes('FOR UPDATE OF gl'))
          result = [
            {
              id: 20,
              tenant: 14,
              tenant_guid: 100014,
              billing_mode: 'POSTPAID',
              postpaid_from: input.start,
              billing_cycle_months: 1,
              base_price_usd: '3.00',
              minimum_seats: 5,
              primary_currency_code: 'XAF',
              country_code: 'CM',
              tax_exempt: false,
              tax_number: 'NIU',
            },
          ];
        else if (sql.includes('rp.idempotency_key')) result = prior ? [prior] : [];
        else if (sql.includes('FROM public.xa_payment_method'))
          result = [
            {
              id: 2,
              guid: 100002,
              supported_currencies: ['XAF'],
              min_amount_usd: '1.00',
              max_amount_usd: '100000.00',
            },
          ];
        else if (sql.includes('FROM public.xf_exchange_rate'))
          result = [{ guid: 100001, exchange_rate: '610.500000' }];
        else if (sql.includes('FROM public.xf_tax_rule'))
          result = [{ guid: 100001, tax_rate: '0.1925', required_tax_number: true }];
        else if (sql.includes('nextval'))
          result = [{ guid: sql.includes('cycle_guid') ? 100500 : 100501 }];
        else if (sql.startsWith('INSERT INTO public.xa_billing_cycle')) {
          assert(sql.includes("'POSTPAID'"));
          assert.equal(r.end, input.end);
          this.writes.push(sql);
          result = [{ id: 500, guid: 100500 }];
        } else if (sql.startsWith('INSERT INTO public.xa_payment_transaction')) {
          if (fail) throw Error('Simulated payment insertion failure');
          this.writes.push(sql);
          result = [{ id: 501, guid: 100501 }];
        } else if (sql.startsWith('INSERT INTO public.xa_renewal_preparation')) {
          this.writes.push(sql);
          result = [{ id: 99, actor_user_guid: r.actor, snapshot: JSON.parse(r.snapshot) }];
        }
        return [result, {}];
      },
    };
  }
  const db = fake();
  const first = await new mod.default(db).close(input);
  assert(db.committed);
  assert.equal(db.writes.length, 3);
  assert.equal(first.snapshot.billed_seats, 29);
  assert.equal(first.snapshot.payment_due_date, input.end);
  assert.equal(first.snapshot.data_completeness, 'ADMIN_ATTESTED');
  assert(db.writes.every((s) => !s.includes('xa_paid_seat_grant')));
  const failed = fake(true);
  await assert.rejects(new mod.default(failed).close(input), /Simulated/);
  assert(failed.rolledBack);
  assert(!failed.committed);
  const replayDb = fake(false, {
    ...first,
    period_start: input.start,
    period_end: input.end,
    payment_method_guid: input.methodGuid,
  });
  assert.equal((await new mod.default(replayDb).close(input)).replayed, true);
  assert.equal(replayDb.writes.length, 0);
  await assert.rejects(
    new mod.default(
      fake(false, {
        ...first,
        period_start: input.start,
        period_end: input.end,
        payment_method_guid: 999999,
      }),
    ).close(input),
    /conflict/,
  );
  globalThis.__lot30.Model = class {
    constructor(data) {
      this.data = data;
    }
    closeData(i) {
      return this.data.close(i);
    }
  };
  const helperPath =
    process.env.TOKE_ACTIVITY_INPUT_FILE ||
    path.resolve(process.cwd(), 'src/master/class/activity-monitoring-input.ts');
  globalThis.__lot30.activity = await load(helperPath, (s) => s);
  const business = await load(
    path.join(root, 'src/master/class/PostpaidClosure.ts'),
    (s) =>
      'const PostpaidClosureModel=globalThis.__lot30.Model; const {activityGuid,activityDate}=globalThis.__lot30.activity;\n' +
      s.replace(/^import .*?;\s*/gm, '').replace(/^export \{.*?\} from .*?;\s*/gm, ''),
  );

  const projected = business.closurePublic({
    ...first,
    id: 9,
    global_license: 20,
    secret: 'hidden',
  });
  assert(!JSON.stringify(projected).includes('hidden'));
  assert(!('id' in projected));
  assert(!('global_license' in projected));
  await assert.rejects(
    new business.default({
      close() {
        throw Error('Should not persist');
      },
    }).close(input.licenseGuid, {}),
    /confirmed/,
  );
  for (const file of [
    'src/master/model/PostpaidClosureModel.ts',
    'src/master/routes/postpaid.closure.route.ts',
  ])
    stripTypeScriptTypes(fs.readFileSync(path.join(root, file), 'utf8'), { mode: 'transform' });
  const route = fs.readFileSync(
    path.join(root, 'src/master/routes/postpaid.closure.route.ts'),
    'utf8',
  );
  assert(!route.includes('database/'));
  assert(!route.includes('.query('));
  console.log(
    'PASS: exact money, minimum seats, atomic callback failure, replay, conflict, public GUID projection, coverage guard and TS syntax. Mocked DB only; PostgreSQL integration and full build remain required.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
