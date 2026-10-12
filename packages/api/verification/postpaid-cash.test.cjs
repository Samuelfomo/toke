'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
async function load(file, replace = (s) => s) {
  let s = stripTypeScriptTypes(fs.readFileSync(file, 'utf8'), { mode: 'transform' });
  return import('data:text/javascript;base64,' + Buffer.from(replace(s)).toString('base64'));
}
(async () => {
  const money = await load(
    process.env.TOKE_MONEY_FILE || path.resolve('src/master/services/renewal-amounts.ts'),
  );
  globalThis.__cash31 = { money };
  const data = await load(
    path.join(root, 'master/database/base_model/db.postpaid-cash.ts'),
    (s) =>
      `const {decimalUnits,centsText}=globalThis.__cash31.money;\n` +
      s.replace(/^import .*?;\s*/gm, ''),
  );
  assert.deepEqual(data.cashBalance('10920.32', '5000.00', '5920.32'), {
    received: '10920.32',
    outstanding: '0.00',
    settled: true,
  });
  assert.equal(data.cashBalance('10920.32', '0.00', '5000.00').outstanding, '5920.32');
  assert.throws(() => data.cashBalance('10920.32', '5000.00', '5920.33'), /exceeds/);
  const input = {
    tenant: 100014,
    payment: 100501,
    actor: '7173056141612204',
    amount: '10920.32',
    currency: 'XAF',
    receivedAt: '2026-01-01T00:00:00.000Z',
    reference: 'RECU-TEST',
    key: 'RECU-TEST',
  };
  function fake({ allowed = true, fail = false, prior = null } = {}) {
    return {
      writes: [],
      received: '0.00',
      committed: false,
      rolledBack: false,
      async transaction(fn) {
        try {
          const out = await fn({ token: 1 });
          this.committed = true;
          return out;
        } catch (e) {
          this.rolledBack = true;
          throw e;
        }
      },
      async query(sql, { replacements: r, transaction }) {
        assert(transaction);
        let out = [];
        if (sql.startsWith('SELECT c.global_license'))
          out = [{ global_license: 20, cycle_id: 500 }];
        else if (sql.includes('FOR UPDATE OF l'))
          out = [
            { id: 20, guid: 100020, tenant: 14, license_status: allowed ? 'EXPIRED' : 'SUSPENDED' },
          ];
        else if (sql.startsWith('SELECT * FROM public.xa_billing_cycle'))
          out = [
            {
              id: 500,
              guid: 100500,
              global_license: 20,
              billing_mode: 'POSTPAID',
              billing_status: 'PENDING',
            },
          ];
        else if (sql.startsWith('SELECT * FROM public.xa_payment_transaction'))
          out = [
            {
              id: 501,
              guid: 100501,
              billing_cycle: 500,
              transaction_status: 'PENDING',
              currency_code: 'XAF',
              amount_local: '10920.32',
            },
          ];
        else if (sql.startsWith('SELECT * FROM public.xa_cash_installment'))
          out = prior ? [prior] : [];
        else if (sql.startsWith('SELECT COALESCE(SUM')) out = [{ received: this.received }];
        else if (sql.startsWith('SELECT * FROM public.monthly_license_access'))
          out = [
            {
              allowed,
              basis: allowed ? 'POSTPAID_CONTRACT' : 'TECHNICAL_RESTRICTION',
              access_until: '2026-02-08',
            },
          ];
        else if (sql.startsWith('SELECT * FROM public.xa_payment_balance'))
          out = [
            {
              due_local: '10920.32',
              received_local: this.received,
              outstanding_local: money.centsText(
                money.decimalUnits('10920.32', 2) - money.decimalUnits(this.received, 2),
              ),
            },
          ];
        else if (sql.startsWith('INSERT INTO public.xa_cash_installment(')) {
          this.writes.push(sql);
          this.received = r.amount;
          out = [{ id: 1 }];
        } else if (sql.startsWith('UPDATE public.xa_payment_transaction')) {
          if (fail) throw Error('Simulated completion failure');
          this.writes.push(sql);
        } else if (sql.startsWith('INSERT') || sql.startsWith('UPDATE')) {
          this.writes.push(sql);
        }
        return [out, {}];
      },
    };
  }
  const partial = fake();
  const pr = await new data.default(partial).receive({ ...input, amount: '5000.00' });
  assert.equal(pr.billing_state, 'PARTIALLY_PAID');
  assert.equal(partial.writes.length, 1);
  const full = fake();
  const fr = await new data.default(full).receive(input);
  assert.equal(fr.billing_state, 'PAID');
  assert(full.committed);
  assert(full.writes.some((s) => s.includes('POSTPAID_DEBT_SETTLED')));
  assert(
    full.writes.every(
      (s) =>
        !s.includes('INSERT INTO xa_paid_seat_grant') &&
        !s.includes('INSERT INTO public.xa_paid_seat_grant'),
    ),
  );
  const technical = fake({ allowed: false });
  await new data.default(technical).receive(input);
  assert(!technical.writes.some((s) => s.startsWith('UPDATE public.xa_global_license')));
  const broken = fake({ fail: true });
  await assert.rejects(new data.default(broken).receive(input), /Simulated/);
  assert(broken.rolledBack);
  assert(!broken.committed);
  const prior = {
    payment_transaction: 501,
    actor_user_guid: input.actor,
    receipt_reference: input.reference,
    currency_code: 'XAF',
    amount_local: input.amount,
    received_at: input.receivedAt,
  };
  const replay = fake({ prior });
  replay.received = '10920.32';
  assert.equal((await new data.default(replay).receive(input)).replayed, true);
  assert.equal(replay.writes.length, 0);
  await assert.rejects(
    new data.default(fake({ prior: { ...prior, actor_user_guid: 'different' } })).receive(input),
    /Conflicting/,
  );
  for (const file of [
    'master/model/PostpaidCashModel.ts',
    'master/class/PostpaidCash.ts',
    'master/routes/postpaid.cash.route.ts',
  ])
    stripTypeScriptTypes(fs.readFileSync(path.join(root, file), 'utf8'), { mode: 'transform' });
  const route = fs.readFileSync(path.join(root, 'master/routes/postpaid.cash.route.ts'), 'utf8');
  assert(!route.includes('database/'));
  assert(!route.includes('.query('));
  const migration = require(path.join(root, 'migrations/20261007090000-postpaid-access-cash.cjs'));
  let sql = '';
  await migration.up({
    sequelize: {
      transaction: (fn) => fn({}),
      query: async (s) => {
        sql = s;
      },
    },
  });
  assert(!/CREATE TABLE|ADD COLUMN|CREATE INDEX/.test(sql));
  assert(sql.includes('POSTPAID_ARREARS'));
  assert(sql.includes('p_at>=debt_until'));
  assert(sql.includes('validate_postpaid_cash_installment(NEW)'));
  assert(sql.includes('validate_postpaid_cash_settlement(NEW)'));
  console.log(
    'PASS: partial/full cash, exact balance, overpayment rejection, replay/conflict, simulated rollback, technical suspension preserved, no paid-seat grant, syntax and migration structural checks. PostgreSQL not executed.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
