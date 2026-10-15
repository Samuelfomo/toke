const fs = require('node:fs'),
  assert = require('node:assert/strict'),
  { stripTypeScriptTypes } = require('node:module');
(async () => {
  const source = fs.readFileSync(__dirname + '/../src/master/services/kpay-client.ts', 'utf8');
  const { default: Client, kpayConfig } = await import(
    'data:text/javascript;base64,' +
      Buffer.from(stripTypeScriptTypes(source, { mode: 'transform' })).toString('base64')
  );
  const config = {
    apiKey: 'kpay_test_dummy',
    secretKey: 'test-only-secret',
    environment: 'TEST',
    timeoutMs: 1000,
  };
  const request = {
    externalId: 'TOKE_test_1',
    amountLocal: '10920.00',
    phoneNumber: '237670000001',
    operator: 'MTN_MOMO_CMR',
    environment: 'TEST',
  };
  const reply = {
    id: 'pay_test1',
    reference: 'KPAY_TEST_1',
    externalId: request.externalId,
    status: 'PENDING',
    amount: 10920,
    currency: 'XAF',
    provider: request.operator,
    phoneNumber: request.phoneNumber,
    isTest: true,
  };
  const response = (body = reply, status = 201) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  let calls = 0;
  const client = new Client(config, async (url, options) => {
    calls++;
    assert.equal(url, 'https://admin.kpay.site/api/v1/payments/init');
    assert.equal(options.headers['X-API-Key'], config.apiKey);
    assert.equal(options.headers['X-Secret-Key'], config.secretKey);
    assert.equal(options.redirect, 'error');
    const b = JSON.parse(options.body);
    assert.equal(b.amount, 10920);
    assert.equal(b.externalId, request.externalId);
    return response();
  });
  assert.equal((await client.initiate(request)).status, 'PENDING');
  assert.equal(calls, 1);
  await assert.rejects(
    client.initiate({ ...request, amountLocal: '10920.32' }),
    (e) => e.outcome === 'NOT_SENT',
  );
  assert.equal(calls, 1);
  await assert.rejects(client.initiate({ ...request, environment: 'LIVE' }));
  assert.equal(calls, 1);
  assert.throws(() => kpayConfig({ KPAY_API_KEY: 'kpay_live_test', KPAY_SECRET_KEY: 'x' }));
  for (const status of [400, 401, 409, 422, 429, 500]) {
    let count = 0;
    const c = new Client(config, async () => {
      count++;
      return response({}, status);
    });
    await assert.rejects(
      c.initiate(request),
      (e) => e.outcome === 'UNKNOWN' && e.httpStatus === status,
    );
    assert.equal(count, 1);
  }
  for (const delta of [
    { amount: 10921 },
    { externalId: 'other' },
    { isTest: false },
    { provider: 'ORANGE_CMR' },
    { phoneNumber: '237670000002' },
    { status: 'EXPIRED' },
  ])
    await assert.rejects(
      new Client(config, async () => response({ ...reply, ...delta })).initiate(request),
      (e) => e.outcome === 'UNKNOWN',
    );
  await assert.rejects(
    new Client(
      config,
      async () => new Response('<html>', { headers: { 'Content-Type': 'text/html' } }),
    ).initiate(request),
  );
  await assert.rejects(
    new Client(config, async () => {
      throw new Error('secret provider content');
    }).initiate(request),
    (e) => e.code === 'kpay_network_error' && !e.message.includes('secret provider'),
  );
  const timeout = new Client(
    config,
    async (_, o) =>
      new Promise((resolve, reject) =>
        o.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }),
      ),
  );
  await assert.rejects(
    timeout.initiate(request),
    (e) => e.code === 'kpay_timeout' && e.outcome === 'UNKNOWN',
  );
  const poll = new Client(config, async (url, o) => {
    assert.equal(url, 'https://admin.kpay.site/api/v1/payments/pay_test1');
    assert.equal(o.method, 'GET');
    return response({ ...reply, status: 'COMPLETED' });
  });
  assert.equal((await poll.getPayment('pay_test1')).status, 'COMPLETED');
  await assert.rejects(poll.getPayment('../other'));
  await assert.rejects(
    new Client(config, async () => response({ ...reply, id: 'different' })).getPayment('pay_test1'),
  );
  console.log(
    'PASS request/auth, strict XAF, environment isolation, response identity, status lookup, timeout, redacted errors and no automatic retries. Mock transport only; no KPay call or full build.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
