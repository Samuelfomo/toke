'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  { stripTypeScriptTypes } = require('node:module');
(async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'toke-renewal-'));
  try {
    fs.writeFileSync(path.join(folder, 'package.json'), '{"type":"module"}');
    for (const name of [
      'renewal-preparation',
      'renewal-preview',
      'renewal-amounts',
      'payment-money',
    ]) {
      const file =
        name.startsWith('renewal-') && name !== 'renewal-amounts'
          ? path.join(__dirname, '../master/database', 'db.' + name + '.ts')
          : path.join(__dirname, 'fixtures', name + '.ts');
      let source = stripTypeScriptTypes(fs.readFileSync(file, 'utf8'))
        .replace(
          "import { Transaction } from 'sequelize';",
          "const Transaction={ISOLATION_LEVELS:{REPEATABLE_READ:'REPEATABLE READ'}};",
        )
        .replace("'./db.renewal-preview.js'", "'./renewal-preview.js'")
        .replace("'../services/renewal-amounts.js'", "'./renewal-amounts.js'")
        .replace("'../services/payment-money.js'", "'./payment-money.js'");
      fs.writeFileSync(path.join(folder, name + '.js'), source);
    }
    const { prepareRenewal } = await import(
      'file://' + path.join(folder, 'renewal-preparation.js')
    );
    const { renewalAmounts } = await import('file://' + path.join(folder, 'renewal-amounts.js'));
    assert.deepEqual(renewalAmounts('90.00', '700.000000', ['0.1925']), {
      baseUsd: '90.00',
      baseLocal: '63000.00',
      taxUsd: '17.33',
      taxLocal: '12127.50',
      totalUsd: '107.33',
      totalLocal: '75127.50',
    });
    assert.throws(() => renewalAmounts('90.00', '0', []));
    const start = '2026-10-15T00:00:00Z',
      end = '2027-04-15T00:00:00Z';
    const license = {
      id: 1,
      guid: 100001,
      tenant: 1,
      license_status: 'ACTIVE',
      current_period_start: '2026-04-15T00:00:00Z',
      current_period_end: start,
      next_renewal_date: start,
      billing_cycle_months: 6,
      minimum_seats: 5,
      base_price_usd: '3.00',
    };
    const input = {
      actor_user_guid: 'user-guid',
      idempotency_key: 'renewal-1',
      payment_method_guid: 100005,
    };
    let prior = null,
      failPayment = false,
      missingBase = false,
      rolledBack = false;
    const calls = [];
    const db = {
      transaction: async (options, cb) => {
        assert.equal(options.isolationLevel, 'REPEATABLE READ');
        try {
          return await cb({});
        } catch (e) {
          rolledBack = true;
          throw e;
        }
      },
      query: async (sql, opt) => {
        calls.push(sql);
        let r = [];
        if (sql.startsWith('SELECT * FROM xa_global_license')) r = [license];
        else if (sql.includes('r.idempotency_key')) r = prior ? [prior] : [];
        else if (sql.includes('SELECT timezone FROM xa_tenant'))
          r = [{ timezone: 'Africa/Douala' }];
        else if (sql.includes('FROM pg_timezone_names')) r = [{ name: 'Africa/Douala' }];
        else if (sql.includes('make_interval')) r = [{ period_start: start, period_end: end }];
        else if (sql.includes('GROUP BY status')) r = [{ status: 'BILLABLE', count: '5' }];
        else if (sql.includes('COUNT(*) AS count')) r = [{ count: '0' }];
        else if (sql.includes(' AS allowed')) r = [{ allowed: true }];
        else if (sql.includes('FROM xa_paid_seat_grant')) r = missingBase ? [] : [{ id: 1 }];
        else if (sql.startsWith('SELECT * FROM xa_tenant'))
          r = [
            {
              country_code: 'CM',
              primary_currency_code: 'XAF',
              tax_exempt: false,
              tax_number: 'test-tax',
            },
          ];
        else if (sql.startsWith('SELECT * FROM xa_payment_method'))
          r = [
            {
              id: 5,
              supported_currencies: ['XAF'],
              min_amount_usd: '1.00',
              max_amount_usd: '99999.99',
            },
          ];
        else if (sql.includes('FROM xf_exchange_rate'))
          r = [{ id: 1, exchange_rate: '700.000000' }];
        else if (sql.includes('FROM xf_tax_rule'))
          r = [{ id: 1, tax_rate: '0.1925', required_tax_number: true }];
        else if (sql.includes('nextval'))
          r = [{ guid: sql.includes('cycle_guid') ? 100010 : 100020 }];
        else if (sql.startsWith('INSERT INTO xa_billing_cycle')) {
          assert.equal(opt.replacements.seats, 5);
          assert.equal(opt.replacements.totalLocal, '75127.50');
          r = [{ id: 10, guid: 100010 }];
        } else if (sql.startsWith('INSERT INTO xa_payment_transaction')) {
          if (failPayment) throw new Error('Simulated payment insert failure');
          r = [{ id: 20, guid: 100020 }];
        } else if (sql.startsWith('INSERT INTO xa_renewal_preparation'))
          r = [{ id: 30, actor_user_guid: 'user-guid', payment_method_guid: 100005 }];
        return [r, {}];
      },
    };
    const result = await prepareRenewal(db, 100001, input);
    assert.equal(result.billing_cycle_guid, 100010);
    assert.equal(result.payment_transaction_guid, 100020);
    assert.ok(!calls.some((q) => q.startsWith('UPDATE xa_global_license')));
    prior = { ...result };
    assert.equal((await prepareRenewal(db, 100001, input)).replayed, true);
    await assert.rejects(
      () => prepareRenewal(db, 100001, { ...input, actor_user_guid: 'different' }),
      /Idempotency/,
    );
    prior = null;
    missingBase = true;
    await assert.rejects(() => prepareRenewal(db, 100001, input), /paid cycle/);
    missingBase = false;
    failPayment = true;
    rolledBack = false;
    await assert.rejects(() => prepareRenewal(db, 100001, input), /Simulated/);
    assert.equal(rolledBack, true);
    console.log(
      'PASS: money, preparation, pending source, minimum, replay/conflict, reconciliation and atomic error propagation; SQL mocked.',
    );
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
