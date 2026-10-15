const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
(async () => {
  const source = fs
    .readFileSync(root + '/master/class/OnboardingPayment.ts', 'utf8')
    .replace(/^import .*;\n/gm, '');
  const rules = fs
    .readFileSync(__dirname + '/payment-attempt-contract.fixture.ts', 'utf8')
    .replace(/export /g, '');
  const prefix = `
 import assert from "node:assert/strict";
 class KpayClientError extends Error{constructor(public code:string){super(code)}}
 class KpayClient{constructor(){throw Error('Configuration absent')}}
 export const store=new Map();export const counts={sent:0,record:0,dispatch:0};
 class PaymentAttempt{
  r:any={};key='';replay=false;
  setTenantGuid(v:any){this.r.tenant=v;return this}setPaymentTransactionGuid(v:any){this.r.payment_transaction_guid=v;return this}setPhoneNumber(v:any){this.r.phone_number=v;return this}setIdempotencyKey(v:any){this.key=v;return this}setEnvironment(v:any){this.r.environment=v;return this}
  async save(){const old=store.get(this.key);if(old){this.r=old;this.replay=true;return this}this.r={...this.r,guid:100001,status:'CREATED',external_id:'TOKE_123',amount_local:'10920',operator:'MTN_MOMO_CMR'};store.set(this.key,this.r);return this}
  isReplay(){return this.replay}getStatus(){return this.r.status}getGuid(){return this.r.guid}getEnvironment(){return this.r.environment}getExternalId(){return this.r.external_id}getAmountLocal(){return this.r.amount_local}getPhoneNumber(){return this.r.phone_number}getOperator(){return this.r.operator}getProviderPaymentId(){return this.r.provider_payment_id}
  async markDispatched(){counts.dispatch++;this.r.status='UNKNOWN';return this}
  async recordVerifiedProviderResult(t:any,result:any){assert.equal(t,this.r.tenant);counts.record++;this.r.status=result.status;this.r.provider_payment_id=result.id;return this}
  async load(t:any,g:any){const row=[...store.values()].find(x=>x.tenant===t&&x.guid===g);if(!row)return null;this.r=row;return this}
  async claimStatusRefresh(){return !this.r.throttled}
  async listForTransaction(t:any,p:any){return [...store.values()].filter(x=>x.tenant===t&&x.payment_transaction_guid===p).map(x=>({guid:x.guid,status:x.status}))}
  toJSON(){return {guid:this.r.guid,payment_transaction_guid:this.r.payment_transaction_guid,status:this.r.status}}
 }
 export {KpayClientError};
 `;
  const m = await import(
    'data:text/javascript;base64,' +
      Buffer.from(stripTypeScriptTypes(prefix + rules + source, { mode: 'transform' })).toString(
        'base64',
      )
  );
  const body = {
    payment_transaction_guid: 100009,
    phone_number: '237670000001',
    idempotency_key: 'TEST_0001',
  };
  const provider = {
    getEnvironment: () => 'TEST',
    initiate: async (input) => {
      m.counts.sent++;
      assert.equal([...m.store.values()][0].status, 'UNKNOWN');
      return { id: 'pay_1', status: 'PENDING' };
    },
    getPayment: async () => ({ id: 'pay_1', status: 'COMPLETED' }),
  };
  const flow = new m.default(provider);
  const [a, b] = await Promise.all([flow.initiate(100022, body), flow.initiate(100022, body)]);
  assert.equal(m.counts.sent, 1);
  assert.equal(m.counts.dispatch, 1);
  assert.equal([a, b].filter((x) => x.replayed).length, 1);
  assert.equal((await flow.status(100022, 100001)).attempt.status, 'PENDING');
  await assert.rejects(flow.status(100023, 100001));
  assert.equal((await flow.list(100022, 100009)).attempts.length, 1);
  assert.equal((await flow.list(100023, 100009)).attempts.length, 0);
  assert.equal((await flow.refresh(100022, 100001)).attempt.status, 'COMPLETED');
  assert.equal(
    (await flow.refresh(100022, 100001)).financial_settlement,
    'NOT_CONFIRMED_BY_THIS_ENDPOINT',
  );
  m.store.clear();
  const unknown = new m.default({
    ...provider,
    initiate: async () => {
      m.counts.sent++;
      throw new m.KpayClientError('kpay_timeout');
    },
  });
  const before = m.counts.sent;
  const failed = await unknown.initiate(100022, body);
  assert.equal(failed.attempt.status, 'UNKNOWN');
  assert.equal(failed.reconciliation_required, true);
  await unknown.initiate(100022, body);
  assert.equal(m.counts.sent, before + 1);
  assert.equal(
    (await unknown.refresh(100022, 100001)).notice_code,
    'payment_provider_id_unavailable',
  );
  await assert.rejects(flow.initiate(100022, { ...body, amount: 1 }));
  // Local GET/list must work without creating a provider client or requiring KPay secrets.
  assert.equal((await new m.default().status(100022, 100001)).attempt.status, 'UNKNOWN');
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
  console.log(
    'PASS orchestration, concurrent replay emits once with simulated persistence, UNKNOWN before dispatch, timeout no retry, tenant scoping, recovery list, local reads without provider config, no financial confirmation, TS syntax. No full build/PG/KPay test.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
