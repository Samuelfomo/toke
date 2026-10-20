'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '../src');
let source = stripTypeScriptTypes(
  fs.readFileSync(path.join(root, 'master/database/base_model/db.cash-confirmation.ts'), 'utf8'),
  { mode: 'transform' },
);
source = source.replace(/^import .*;$/gm, '').replace(/export /g, '');
const { confirmCashPayment, CashConfirmationError } = new Function(
  source + '\nreturn {confirmCashPayment,CashConfirmationError};',
)();
let state,
  tx = {};
function reset() {
  state = {
    p: {
      id: 8,
      guid: 100008,
      source_type: 'ADJUSTMENT',
      adjustment: 7,
      billing_cycle: null,
      amount_local: '6552.00',
      amount_usd: '10.73',
      currency_code: 'XAF',
      exchange_rate_used: '610.500000',
      payment_method: 2,
      transaction_status: 'PENDING',
    },
    a: {
      id: 7,
      guid: 100007,
      global_license: 3,
      adjustment_kind: 'USAGE_REGULARIZATION',
      total_amount_local: '6552.00',
      total_amount_usd: '10.73',
      billing_currency_code: 'XAF',
      exchange_rate_used: '610.500000',
      payment_status: 'PENDING',
    },
    l: { id: 3, guid: 100003, tenant: 4, billing_mode: 'PREPAID', license_status: 'EXPIRED' },
    method: { id: 2, method_type: 'CASH', active: true, supported_currencies: ['XAF'] },
    receipts: [],
    events: [],
    attempts: [],
    issued: true,
    failAudit: false,
  };
}
const db = {
  async transaction(f) {
    const before = structuredClone(state);
    try {
      return await f(tx);
    } catch (e) {
      state = before;
      throw e;
    }
  },
  async query(sql, { replacements: v, transaction }) {
    assert.equal(transaction, tx);
    if (sql === 'SELECT * FROM xa_payment_transaction WHERE guid = :guid FOR UPDATE')
      return [[state.p]];
    if (sql.startsWith('SELECT * FROM public.xa_license_adjustment')) return [[state.a]];
    if (sql === 'SELECT * FROM public.xa_global_license WHERE id=:id FOR UPDATE')
      return [[state.l]];
    if (sql === 'SELECT guid FROM public.xa_tenant WHERE id=:id') return [[{ guid: 100004 }]];
    if (sql.startsWith('SELECT * FROM xa_cash_receipt'))
      return [
        state.receipts.filter((r) => r.payment_transaction === v.id || r.idempotency_key === v.key),
      ];
    if (sql.startsWith('SELECT guid,operation_key,actor_user_guid')) return [state.events];
    if (sql === 'SELECT * FROM xa_payment_method WHERE id = :id') return [[state.method]];
    if (sql.startsWith('SELECT 1 FROM public.xa_payment_attempt')) return [state.attempts];
    if (sql.startsWith('SELECT guid FROM public.xa_license_event'))
      return [state.issued ? [{ guid: 100900 }] : []];
    if (sql.startsWith('INSERT INTO xa_cash_receipt')) {
      state.receipts.push({
        id: 1,
        payment_transaction: v.payment,
        tenant: v.tenant,
        actor_user_guid: v.actor,
        receipt_reference: v.reference,
        idempotency_key: v.key,
        amount_local: v.amount,
        currency_code: v.currency,
        received_at: v.received,
        confirmed_at: v.now,
        access_action: 'DEBT_SETTLED_NO_NEW_RIGHTS',
      });
      return [[{ id: 1 }]];
    }
    if (sql.startsWith('UPDATE xa_payment_transaction SET')) {
      assert.equal(state.receipts.length, 1);
      state.p.transaction_status = 'COMPLETED';
      return [[{ id: 8 }]];
    }
    if (sql.startsWith('UPDATE xa_license_adjustment SET')) {
      assert.equal(state.p.transaction_status, 'COMPLETED');
      state.a.payment_status = 'COMPLETED';
      return [[{ id: 7 }]];
    }
    if (sql.startsWith('INSERT INTO public.xa_license_event')) {
      if (state.failAudit) throw Error('Audit unavailable');
      state.events.push({
        guid: 100901,
        operation_key: v.key,
        actor_user_guid: v.actor,
        payload: JSON.parse(v.payload),
      });
      return [[{ guid: 100901 }]];
    }
    throw Error('Unexpected SQL (no grant/license mutation allowed): ' + sql);
  },
};
const input = {
  transactionGuid: 100008,
  tenantGuid: 100004,
  amountLocal: '6552.00',
  currency: 'XAF',
  receiptReference: 'CASH-42-5',
  idempotencyKey: 'SETTLEMENT-42-5',
  receivedAt: new Date('2026-10-19T14:00:00Z'),
};
const actor = { actorUserGuid: '7173056141612204' };
(async () => {
  reset();
  const result = await confirmCashPayment(db, input, actor);
  assert.equal(result.future_rights_created, false);
  assert.equal(result.accessAction, 'DEBT_SETTLED_NO_NEW_RIGHTS');
  assert.equal(result.amount_to_pay_local, '0.00');
  assert.equal(result.replayed, false);
  assert.equal(state.p.transaction_status, 'COMPLETED');
  assert.equal(state.a.payment_status, 'COMPLETED');
  assert.equal(state.l.license_status, 'EXPIRED');
  assert.equal(state.receipts.length, 1);
  assert.equal(state.events.length, 1);
  assert.ok(!JSON.stringify(result).includes('receiptId'));
  assert.ok(!Object.hasOwn(result, 'id'));
  assert.equal((await confirmCashPayment(db, input, actor)).replayed, true);
  assert.equal(state.receipts.length, 1);
  for (const patch of [
    { amountLocal: '1.00' },
    { tenantGuid: 100005 },
    { tenantGuid: undefined },
    { billingCycleGuid: 100010 },
    { receiptReference: 'OTHER' },
    { idempotencyKey: 'OTHER' },
    { receivedAt: new Date('2026-10-18T14:00:00Z') },
  ])
    await assert.rejects(
      () => confirmCashPayment(db, { ...input, ...patch }, actor),
      CashConfirmationError,
    );
  await assert.rejects(
    () => confirmCashPayment(db, input, { actorUserGuid: 'OTHER' }),
    CashConfirmationError,
  );
  for (const configure of [
    (s) => (s.method.active = false),
    (s) => (s.method.method_type = 'MOBILE_MONEY'),
    (s) => (s.method.supported_currencies = ['USD']),
    (s) => (s.p.amount_local = '6553.00'),
    (s) => (s.p.amount_usd = '10.74'),
    (s) => (s.p.transaction_status = 'CANCELLED'),
    (s) => (s.a.payment_status = 'COMPLETED'),
    (s) => (s.l.billing_mode = 'POSTPAID'),
    (s) => (s.attempts = [{ id: 1 }]),
    (s) => (s.issued = false),
  ]) {
    reset();
    configure(state);
    await assert.rejects(() => confirmCashPayment(db, input, actor), CashConfirmationError);
    assert.equal(state.receipts.length, 0);
  }
  reset();
  state.failAudit = true;
  await assert.rejects(() => confirmCashPayment(db, input, actor), /Audit unavailable/);
  assert.equal(state.receipts.length, 0);
  assert.equal(state.p.transaction_status, 'PENDING');
  assert.equal(state.a.payment_status, 'PENDING');
  console.log(
    'PASS: consumed debt cash settlement, replay, scope, mismatch guards, no rights, audit rollback (mock database).',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
