const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const url = (s) =>
  'data:text/javascript;base64,' +
  Buffer.from(stripTypeScriptTypes(s, { mode: 'transform' })).toString('base64');
(async () => {
  const contract = read('verification/payment-attempt-contract.fixture.ts').replace(/export /g, '');
  const money = read('verification/renewal-amounts.fixture.ts').replace(/export /g, '');
  const source = read('master/database/base_model/db.kpay-settlement.ts').replace(
    /^import .*;\n/gm,
    '',
  );
  const { default: DB } = await import(
    url('const TableInitializer={};\n' + contract + money + source)
  );
  const proof = {
    id: 'pay_1',
    reference: 'KPAY_REF',
    externalId: 'TOKE_123',
    status: 'COMPLETED',
    amount: '10920',
    currency: 'XAF',
    provider: 'MTN_MOMO_CMR',
    phoneNumber: '237670000001',
    isTest: false,
  };
  let state,
    failAudit = false;
  function reset() {
    const start = new Date(Date.now() - 86400000).toISOString(),
      end = new Date(Date.now() + 86400000 * 29).toISOString();
    state = {
      p: {
        id: 9,
        guid: 100009,
        source_type: 'CYCLE',
        billing_cycle: 14,
        adjustment: null,
        currency_code: 'XAF',
        amount_local: '10920.00',
        amount_usd: '17.89',
        exchange_rate_used: '610.500000',
        payment_method: 1,
        transaction_status: 'PENDING',
        initiated_at: start,
      },
      c: {
        id: 14,
        guid: 100014,
        global_license: 26,
        billing_mode: 'PREPAID',
        billing_status: 'PENDING',
        billing_currency_code: 'XAF',
        total_amount_local: '10920.00',
        total_amount_usd: '17.89',
        exchange_rate_used: '610.500000',
        base_employee_count: 5,
        final_employee_count: 5,
        period_start: start,
        period_end: end,
      },
      l: {
        id: 26,
        guid: 100026,
        tenant: 22,
        billing_mode: 'PREPAID',
        license_status: 'PENDING_PAYMENT',
        minimum_seats: 5,
        current_period_start: start,
        current_period_end: end,
      },
      t: { id: 22, guid: 100022, status: 'ACTIVE' },
      a: {
        guid: 100001,
        payment_transaction: 9,
        environment: 'LIVE',
        provider: 'KPAY',
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        provider_payment_id: proof.id,
        provider_reference: proof.reference,
        external_id: proof.externalId,
        phone_number: proof.phoneNumber,
        operator: proof.provider,
        currency_code: 'XAF',
        amount_local: '10920.00',
      },
      grants: [],
      activation: [],
      cash: [],
      other: [],
      overlap: [],
      created: [{ guid: 100001 }],
    };
    failAudit = false;
  }
  const connection = {
    transaction: async (fn) => {
      const before = structuredClone(state);
      try {
        return await fn({});
      } catch (e) {
        state = before;
        throw e;
      }
    },
    query: async (sql, o) => {
      const v = o.replacements;
      if (sql.startsWith('SELECT a.*')) return [[...(v.tenant === state.t.guid ? [state.a] : [])]];
      if (sql.startsWith('SELECT * FROM public.xa_payment_transaction')) return [[state.p]];
      if (sql.startsWith('SELECT * FROM public.xa_billing_cycle')) return [[state.c]];
      if (sql.startsWith('SELECT * FROM public.xa_global_license')) return [[state.l]];
      if (sql.startsWith('SELECT * FROM public.xa_payment_attempt')) return [[state.a]];
      if (sql.startsWith('SELECT id,guid,status FROM public.xa_tenant')) return [[state.t]];
      if (sql.startsWith('SELECT * FROM public.xa_payment_method'))
        return [[{ code: 'MTN_MOMO', method_type: 'MOBILE_MONEY' }]];
      if (sql.startsWith('SELECT guid FROM public.xa_license_event')) return [state.created];
      if (sql.startsWith('SELECT id FROM public.xa_payment_transaction')) return [state.other];
      if (sql.startsWith('SELECT 1 FROM public.xa_cash_receipt')) return [state.cash];
      if (sql.startsWith('SELECT id FROM public.xa_paid_seat_grant')) return [state.overlap];
      if (sql.startsWith('SELECT * FROM public.xa_paid_seat_grant')) return [state.grants];
      if (sql.startsWith('SELECT * FROM public.xa_license_cycle_activation'))
        return [state.activation];
      if (sql.startsWith('INSERT INTO public.xa_paid_seat_grant')) {
        state.grants.push({
          id: 1,
          payment_transaction: v.payment,
          billing_cycle: v.cycle,
          global_license: v.license,
          source_type: 'CYCLE',
          adjustment: null,
          seats: v.seats,
          valid_from: v.start,
          valid_until: v.end,
        });
        return [[{ id: 1 }]];
      }
      if (sql.startsWith('UPDATE public.xa_payment_transaction')) {
        state.p.transaction_status = 'COMPLETED';
        state.p.completed_at = v.now;
        return [[{ id: 9 }]];
      }
      if (sql.startsWith('UPDATE public.xa_billing_cycle')) {
        state.c.billing_status = 'COMPLETED';
        state.c.payment_completed_at = v.now;
        return [[{ id: 14 }]];
      }
      if (sql.startsWith('UPDATE public.xa_global_license')) {
        state.l = { ...state.l, license_status: 'ACTIVE' };
        return [[state.l]];
      }
      if (sql.startsWith('INSERT INTO public.xa_license_cycle_activation')) {
        if (failAudit) throw Error('Simulated audit write failure');
        state.activation.push({
          global_license: v.license,
          payment_transaction: v.payment,
          billing_cycle: v.cycle,
        });
        return [[{ id: 1 }]];
      }
      throw Error('Unexpected SQL ' + sql);
    },
  };
  const db = new DB(connection);
  reset();
  const done = await db.settle(100022, 100001, proof);
  assert.equal(done.access_action, 'ACTIVE');
  assert.equal(state.p.transaction_status, 'COMPLETED');
  assert.equal(state.c.billing_status, 'COMPLETED');
  assert.equal(state.grants.length, 1);
  assert.equal(state.activation.length, 1);
  const replay = await db.settle(100022, 100001, proof);
  assert.equal(replay.replayed, true);
  assert.equal(state.grants.length, 1);
  assert.equal(state.activation.length, 1);
  reset();
  failAudit = true;
  await assert.rejects(db.settle(100022, 100001, proof));
  assert.equal(state.p.transaction_status, 'PENDING');
  assert.equal(state.c.billing_status, 'PENDING');
  assert.equal(state.grants.length, 0);
  assert.equal(state.activation.length, 0);
  reset();
  state.t.status = 'SUSPENDED';
  assert.equal((await db.settle(100022, 100001, proof)).access_action, 'MANUAL_REVIEW');
  assert.equal(state.l.license_status, 'PENDING_PAYMENT');
  assert.equal(state.p.transaction_status, 'COMPLETED');
  reset();
  state.l.license_status = 'SUSPENDED';
  assert.equal((await db.settle(100022, 100001, proof)).access_action, 'MANUAL_REVIEW');
  assert.equal(state.l.license_status, 'SUSPENDED');
  reset();
  state.c.period_start = state.l.current_period_start = new Date(
    Date.now() + 86400000,
  ).toISOString();
  assert.equal((await db.settle(100022, 100001, proof)).access_action, 'SCHEDULED');
  assert.equal(state.activation.length, 0);
  for (const delta of [
    { isTest: true },
    { amount: '10921' },
    { id: 'pay_other' },
    { currency: 'USD' },
    { externalId: 'wrong' },
  ]) {
    reset();
    await assert.rejects(db.settle(100022, 100001, { ...proof, ...delta }));
    assert.equal(state.grants.length, 0);
  }
  reset();
  await assert.rejects(db.settle(100023, 100001, proof));
  reset();
  state.cash = [{}];
  await assert.rejects(db.settle(100022, 100001, proof));
  reset();
  state.created = [];
  await assert.rejects(db.settle(100022, 100001, proof));
  reset();
  state.overlap = [{}];
  await assert.rejects(db.settle(100022, 100001, proof));
  // Class: TEST never settles and LIVE always obtains a fresh provider proof, even for an already-completed attempt.
  const model = `class KpaySettlementModel{constructor(data){this.data=data}candidateStored(t,a){return this.data.candidate(t,a)}settleStored(t,a,p){return this.data.settle(t,a,p)}pendingStored(a){return this.data.pending(a)}}\nclass KpayClient{constructor(){throw Error('Provider not injected')}}\n`;
  const cls = read('master/class/KpaySettlement.ts').replace(/^import .*;\n/gm, '');
  const { default: Service } = await import(url(contract + model + cls));
  let gets = 0,
    settles = 0;
  const fake = {
    candidate: async () => ({
      environment: 'TEST',
      status: 'COMPLETED',
      provider_payment_id: 'pay_1',
    }),
    settle: async () => {
      settles++;
      return { status: 'COMPLETED' };
    },
  };
  process.env.TOKE_KPAY_SETTLEMENT_ENABLED = 'true';
  assert.equal((await new Service(fake).settle(100022, 100001)).status, 'TEST_NOT_SETTLED');
  assert.equal(settles, 0);
  fake.candidate = async () => ({
    environment: 'LIVE',
    status: 'COMPLETED',
    provider_payment_id: 'pay_1',
  });
  const provider = {
    getEnvironment: () => 'LIVE',
    getPayment: async (id) => {
      gets++;
      assert.equal(id, 'pay_1');
      return proof;
    },
  };
  await new Service(fake).settle(100022, 100001, provider);
  assert.equal(gets, 1);
  assert.equal(settles, 1);
  delete process.env.TOKE_KPAY_SETTLEMENT_ENABLED;
  assert.equal((await new Service(fake).settle(100022, 100001, provider)).status, 'DISABLED');
  assert.equal(gets, 1);
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
    'PASS simulated atomic settlement/rollback, replay no duplicate capacity/audit, restrictions, scheduled coverage, proof mismatch, cash conflict, tenant isolation, TEST exclusion, LIVE fresh verification, TS syntax. No real PG/full build/KPay.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
