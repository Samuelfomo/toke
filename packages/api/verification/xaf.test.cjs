const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const url = (s) =>
  'data:text/javascript;base64,' +
  Buffer.from(stripTypeScriptTypes(s, { mode: 'transform' })).toString('base64');
const clean = (s) => s.replace(/^import .*;\n/gm, '').replace(/export /g, '');
(async () => {
  const policy = read('master/services/payable-amount.ts');
  const p = await import(url(policy));
  for (const [input, expected] of [
    ['10920.32', '10920.00'],
    ['10920.49', '10920.00'],
    ['10920.50', '10921.00'],
    ['10920.99', '10921.00'],
    ['1.00', '1.00'],
  ])
    assert.equal(p.normalizePayableAmount(input, 'XAF'), expected);
  assert.equal(p.normalizePayableAmount('17.89', 'USD'), '17.89');
  assert.throws(() => p.normalizePayableAmount('-1', 'XAF'));
  assert.equal(p.payableTotalMatches('9157.50', '1762.82', '10920.00', 'XAF'), true);
  assert.equal(p.payableTotalMatches('9157.50', '1762.82', '10920.32', 'XAF'), true);
  assert.equal(p.payableTotalMatches('9157.50', '1762.82', '10921.00', 'XAF'), false);
  const amounts = await import(
    url(clean(policy) + read('master/services/renewal-amounts.ts').replace(/^import .*;\n/gm, ''))
  );
  const a = amounts.renewalAmounts('15.00', '610.500000', ['0.1925'], 'XAF');
  assert.equal(a.totalLocal, '10920.00');
  assert.equal(a.baseLocal, '9157.50');
  assert.equal(a.taxLocal, '1762.82');
  assert.equal(a.totalUsd, '17.89');
  assert.equal(amounts.renewalAmounts('15.00', '610.500000', ['0.1925']).totalLocal, '10920.32');
  const off = policy.replace(
    'return moneyText(((cents+50n)/100n)*100n);',
    'return moneyText(cents);',
  );
  const disabled = await import(
    url(clean(off) + read('master/services/renewal-amounts.ts').replace(/^import .*;\n/gm, ''))
  );
  assert.equal(disabled.renewalAmounts('15.00', '610.5', ['0.1925'], 'XAF').totalLocal, '10920.32');
  const historical = await import(url(off));
  assert.equal(historical.payableTotalMatches('9157.50', '1762.82', '10920.00', 'XAF'), true);
  const money = await import(url(read('master/services/payment-money.ts')));
  assert.equal(money.paymentAmountsConsistent('17.89', '10920.00', '610.500000', 'XAF'), true);
  assert.equal(money.paymentAmountsConsistent('17.89', '10000.00', '610.500000', 'XAF'), false);
  // Exercise guarded repair and rollback on audit failure with a simulated transactional database.
  const dbsource = read('master/database/base_model/db.normalize-initial-xaf.ts').replace(
    /^import .*;\n/gm,
    '',
  );
  const prefix =
    "const TableInitializer={};function guid(n){if(!Number.isInteger(n)||n<100000||n>999999)throw Error('guid')}class PaymentAttemptError extends Error{}\n";
  const { default: Db } = await import(url(prefix + clean(policy) + dbsource));
  let state,
    failAudit = false;
  function reset() {
    state = {
      p: {
        id: 10,
        guid: 100010,
        source_type: 'CYCLE',
        adjustment: null,
        billing_cycle: 15,
        currency_code: 'XAF',
        transaction_status: 'PENDING',
        amount_local: '10920.32',
      },
      c: {
        id: 15,
        guid: 100015,
        global_license: 27,
        billing_mode: 'PREPAID',
        billing_currency_code: 'XAF',
        billing_status: 'PENDING',
        total_amount_local: '10920.32',
        subtotal_local: '9157.50',
        tax_amount_local: '1762.82',
      },
      l: {
        id: 27,
        guid: 100027,
        tenant: 22,
        billing_mode: 'PREPAID',
        license_status: 'PENDING_PAYMENT',
      },
      events: [],
      attempts: [],
    };
    failAudit = false;
  }
  const conn = {
    transaction: async (f) => {
      const before = structuredClone(state);
      try {
        return await f({});
      } catch (e) {
        state = before;
        throw e;
      }
    },
    query: async (sql, o) => {
      const v = o.replacements;
      if (sql.startsWith('SELECT * FROM public.xa_payment_transaction')) return [[state.p]];
      if (sql.startsWith('SELECT * FROM public.xa_billing_cycle')) return [[state.c]];
      if (sql.startsWith('SELECT * FROM public.xa_global_license')) return [[state.l]];
      if (sql.startsWith('SELECT new_payload')) return [state.events];
      if (sql.startsWith('SELECT guid FROM public.xa_license_event')) return [[{ guid: 100001 }]];
      if (sql.startsWith('SELECT guid FROM public.xa_payment_attempt')) return [state.attempts];
      if (
        sql.startsWith('SELECT id FROM public.xa_paid_seat_grant') ||
        sql.startsWith('SELECT 1 FROM public.xa_cash_receipt') ||
        sql.startsWith('SELECT id FROM public.xa_payment_transaction')
      )
        return [[]];
      if (sql.startsWith('UPDATE public.xa_billing_cycle')) {
        state.c.total_amount_local = v.total;
        return [[{ id: 15 }]];
      }
      if (sql.startsWith('UPDATE public.xa_payment_transaction')) {
        state.p.amount_local = v.total;
        return [[{ id: 10 }]];
      }
      if (sql.startsWith('SELECT current_user'))
        return [[{ db_role: 'test', session_role: 'test' }]];
      if (sql.startsWith('INSERT INTO public.xa_license_event')) {
        if (failAudit) throw Error('Audit failed');
        state.events.push({ new_payload: JSON.parse(v.after) });
        return [[{ guid: 100002 }]];
      }
      throw Error('Unexpected SQL');
    },
  };
  const db = new Db(conn);
  reset();
  assert.equal((await db.run(100010)).applied, false);
  assert.equal(state.p.amount_local, '10920.32');
  assert.equal((await db.run(100010, true)).total_amount_local, '10920.00');
  assert.equal(state.p.amount_local, state.c.total_amount_local);
  assert.equal(state.events.length, 1);
  assert.equal((await db.run(100010, true)).replayed, true);
  assert.equal(state.events.length, 1);
  reset();
  failAudit = true;
  await assert.rejects(db.run(100010, true));
  assert.equal(state.p.amount_local, '10920.32');
  assert.equal(state.c.total_amount_local, '10920.32');
  reset();
  state.attempts = [{}];
  await assert.rejects(db.run(100010, true));
  reset();
  state.p.transaction_status = 'COMPLETED';
  await assert.rejects(db.run(100010, true));
  function walk(dir) {
    for (const x of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, x.name);
      if (x.isDirectory()) walk(f);
      else if (f.endsWith('.ts'))
        stripTypeScriptTypes(fs.readFileSync(f, 'utf8'), { mode: 'transform' });
    }
  }
  walk(root + '/master');
  console.log(
    'PASS half-up exact arithmetic, unchanged HT/taxes/USD, optional currency path, reversible policy with historical validation, FX bounds, repair preview/apply/replay/rollback and attempt/payment refusals, TS syntax. No full build or actual PostgreSQL migration.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
