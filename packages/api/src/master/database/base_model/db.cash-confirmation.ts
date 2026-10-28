import type { Sequelize } from 'sequelize';

import { reconcileUsageRegularizationLicense } from './db.usage-regularization-access.js';

import { renewalCycleMonths } from './db.renewal-activation.js';

export interface CashConfirmation {
  transactionGuid: number;
  tenantGuid?: number;
  billingCycleGuid?: number;
  amountLocal: string;
  currency: string;
  receiptReference: string;
  idempotencyKey: string;
  receivedAt: Date;
}
export interface CashActor {
  actorUserGuid: string;
}
export class CashConfirmationError extends Error {}
function cents(value: unknown): bigint {
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text))
    throw new CashConfirmationError('Amount must be a decimal with at most two places');
  const [whole, decimal = ''] = text.split('.');
  return BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0'));
}
/** The caller owns authorization; actorUserGuid records authorship only. */
export async function confirmCashPayment(db: Sequelize, input: CashConfirmation, actor: CashActor) {
  if (
    !Number.isInteger(input.transactionGuid) ||
    input.transactionGuid < 100000 ||
    input.transactionGuid > 999999
  )
    throw new CashConfirmationError('Invalid transaction GUID');
  if (
    typeof actor.actorUserGuid !== 'string' ||
    !actor.actorUserGuid.trim() ||
    actor.actorUserGuid.length > 128
  )
    throw new CashConfirmationError('User GUID is required');
  if (!/^[A-Z]{3}$/.test(input.currency) || cents(input.amountLocal) <= 0n)
    throw new CashConfirmationError('Invalid cash amount or currency');
  if (
    ![input.receiptReference, input.idempotencyKey].every(
      (v) => typeof v === 'string' && v.length >= 1 && v.length <= 128,
    )
  )
    throw new CashConfirmationError('Receipt and idempotency references are required');
  if (
    !(input.receivedAt instanceof Date) ||
    !Number.isFinite(input.receivedAt.getTime()) ||
    input.receivedAt.getTime() > Date.now()
  )
    throw new CashConfirmationError('Invalid receipt date');
  return db.transaction(async (transaction) => {
    async function rows(sql: string, replacements: Record<string, any> = {}): Promise<any[]> {
      const [data] = await db.query(sql, { replacements, transaction });
      return data as any[];
    }
    const payments = await rows(
      'SELECT * FROM xa_payment_transaction WHERE guid = :guid FOR UPDATE',
      { guid: input.transactionGuid },
    );
    const payment = payments[0];
    if (!payment) throw new CashConfirmationError('Transaction not found');
    // Le paiement est verrouillé avant la dette : même ordre que les autres confirmations.
    const regularization =
      payment.source_type === 'ADJUSTMENT'
        ? (
            await rows(
              "SELECT * FROM public.xa_license_adjustment WHERE id=:id AND adjustment_kind='USAGE_REGULARIZATION' FOR UPDATE",
              { id: payment.adjustment },
            )
          )[0]
        : null;
    if (regularization) {
      const debt = regularization;
      const license = (
        await rows('SELECT * FROM public.xa_global_license WHERE id=:id FOR UPDATE', {
          id: debt.global_license,
        })
      )[0];
      const tenant = license
        ? (await rows('SELECT guid FROM public.xa_tenant WHERE id=:id', { id: license.tenant }))[0]
        : null;
      if (
        !Number.isInteger(input.tenantGuid) ||
        !tenant ||
        Number(tenant.guid) !== input.tenantGuid
      )
        throw new CashConfirmationError(
          'tenant_guid must identify the owner of this regularization',
        );
      if (input.billingCycleGuid !== undefined)
        throw new CashConfirmationError(
          'Do not select a coverage cycle for consumed-month settlement',
        );
      if (
        payment.billing_cycle != null ||
        payment.currency_code !== debt.billing_currency_code ||
        cents(payment.amount_local) !== cents(debt.total_amount_local) ||
        cents(payment.amount_usd) !== cents(debt.total_amount_usd) ||
        String(payment.exchange_rate_used) !== String(debt.exchange_rate_used) ||
        input.currency !== payment.currency_code ||
        cents(input.amountLocal) !== cents(payment.amount_local)
      )
        throw new CashConfirmationError('Cash must match the issued regularization exactly');
      const previous = await rows(
        'SELECT * FROM xa_cash_receipt WHERE idempotency_key = :key OR payment_transaction = :id',
        { key: input.idempotencyKey, id: payment.id },
      );
      const projection = (eventGuid: number, replayed: boolean) => ({
        tenant_guid: Number(tenant.guid),
        license_guid: Number(license.guid),
        adjustment_guid: Number(debt.guid),
        payment_transaction_guid: Number(payment.guid),
        event_guid: Number(eventGuid),
        receipt_reference: input.receiptReference,
        currency_code: input.currency,
        invoice_amount_local: String(payment.amount_local),
        received_local: String(payment.amount_local),
        amount_to_pay_local: '0.00',
        transaction_status: 'COMPLETED',
        payment_status: 'COMPLETED',
        accessAction: 'DEBT_SETTLED_NO_NEW_RIGHTS',
        future_rights_created: false,
        replayed,
      });
      if (previous.length) {
        const receipt = previous[0];
        const audit = (
          await rows(
            "SELECT guid,operation_key,actor_user_guid FROM public.xa_license_event WHERE global_license=:license AND event_type='USAGE_REGULARIZATION_SETTLED' AND new_payload->>'payment_transaction_guid'=:payment",
            { license: license.id, payment: String(payment.guid) },
          )
        )[0];
        if (
          previous.length !== 1 ||
          receipt.payment_transaction !== payment.id ||
          receipt.actor_user_guid !== actor.actorUserGuid ||
          receipt.idempotency_key !== input.idempotencyKey ||
          receipt.receipt_reference !== input.receiptReference ||
          receipt.currency_code !== input.currency ||
          cents(receipt.amount_local) !== cents(input.amountLocal) ||
          new Date(receipt.received_at).getTime() !== input.receivedAt.getTime() ||
          receipt.access_action !== 'DEBT_SETTLED_NO_NEW_RIGHTS' ||
          !audit ||
          audit.operation_key !== input.idempotencyKey ||
          audit.actor_user_guid !== actor.actorUserGuid ||
          payment.transaction_status !== 'COMPLETED' ||
          debt.payment_status !== 'COMPLETED'
        )
          throw new CashConfirmationError('Conflicting or incomplete regularization settlement');
        return projection(audit.guid, true);
      }
      const method = (
        await rows('SELECT * FROM xa_payment_method WHERE id = :id', { id: payment.payment_method })
      )[0];
      if (
        !method ||
        method.method_type !== 'CASH' ||
        !method.active ||
        !method.supported_currencies?.includes(input.currency)
      )
        throw new CashConfirmationError(
          'Issued transaction must use an active compatible cash method',
        );
      if (
        license.billing_mode !== 'PREPAID' ||
        !['PENDING', 'PROCESSING', 'FAILED'].includes(payment.transaction_status) ||
        !['PENDING', 'PROCESSING', 'FAILED', 'OVERDUE'].includes(debt.payment_status)
      )
        throw new CashConfirmationError('Regularization is not payable');
      if (
        (
          await rows(
            `SELECT 1 FROM public.xa_payment_attempt WHERE payment_transaction=:id
         UNION ALL SELECT 1 FROM public.xa_cash_installment WHERE payment_transaction=:id
         UNION ALL SELECT 1 FROM public.xa_cash_installment_settlement WHERE payment_transaction=:id`,
            { id: payment.id },
          )
        ).length
      )
        throw new CashConfirmationError('Another payment history requires reconciliation');
      if (
        (
          await rows(
            "SELECT guid FROM public.xa_license_event WHERE global_license=:license AND event_type='USAGE_REGULARIZATION_ISSUED' AND new_payload->>'payment_transaction_guid'=:payment AND new_payload->>'adjustment_guid'=:adjustment",
            { license: license.id, payment: String(payment.guid), adjustment: String(debt.guid) },
          )
        ).length !== 1
      )
        throw new CashConfirmationError('Regularization issuance audit required');
      const now = new Date();
      // Preuve insérée avant les états : les triggers 42.4 vérifient sa présence.
      await rows(
        `INSERT INTO xa_cash_receipt(payment_transaction,tenant,actor_user_guid,receipt_reference,idempotency_key,
         amount_local,currency_code,received_at,confirmed_at,access_action)
         VALUES(:payment,:tenant,:actor,:reference,:key,:amount,:currency,:received,:now,'DEBT_SETTLED_NO_NEW_RIGHTS') RETURNING id`,
        {
          payment: payment.id,
          tenant: license.tenant,
          actor: actor.actorUserGuid,
          reference: input.receiptReference,
          key: input.idempotencyKey,
          amount: input.amountLocal,
          currency: input.currency,
          received: input.receivedAt,
          now,
        },
      );
      await rows(
        "UPDATE xa_payment_transaction SET transaction_status='COMPLETED',completed_at=:now,failed_at=NULL,failure_reason=NULL,updated_at=:now WHERE id=:id RETURNING id",
        { id: payment.id, now },
      );
      await rows(
        "UPDATE xa_license_adjustment SET payment_status='COMPLETED',payment_completed_at=:now,updated_at=:now WHERE id=:id RETURNING id",
        { id: debt.id, now },
      );
      const payload = {
        adjustment_guid: Number(debt.guid),
        payment_transaction_guid: Number(payment.guid),
        payment_status: 'COMPLETED',
        transaction_status: 'COMPLETED',
        amount_local: String(payment.amount_local),
        currency_code: input.currency,
        receipt_reference: input.receiptReference,
        received_at: input.receivedAt.toISOString(),
        access_action: 'DEBT_SETTLED_NO_NEW_RIGHTS',
      };
      const audit = (
        await rows(
          `INSERT INTO public.xa_license_event(tenant,global_license,event_type,operation_key,actor_type,actor_user_guid,
         effective_at,previous_payload,new_payload,reason,metadata)
         VALUES(:tenant,:license,'USAGE_REGULARIZATION_SETTLED',:key,'USER',:actor,:now,CAST(:previous AS jsonb),
         CAST(:payload AS jsonb),'Cash settlement of consumed-month debt; no future rights','{}') RETURNING guid`,
          {
            tenant: license.tenant,
            license: license.id,
            key: input.idempotencyKey,
            actor: actor.actorUserGuid,
            now,
            previous: JSON.stringify({
              payment_status: debt.payment_status,
              transaction_status: payment.transaction_status,
            }),
            payload: JSON.stringify(payload),
          },
        )
      )[0];
      await reconcileUsageRegularizationLicense(db, license.id, transaction);
      return projection(audit.guid, false);
    }
    const previous = await rows(
      'SELECT * FROM xa_cash_receipt WHERE idempotency_key = :key OR payment_transaction = :id',
      { key: input.idempotencyKey, id: payment.id },
    );
    if (previous.length) {
      const receipt = previous[0];
      if (
        receipt.actor_user_guid !== actor.actorUserGuid ||
        receipt.payment_transaction !== payment.id ||
        receipt.idempotency_key !== input.idempotencyKey ||
        receipt.receipt_reference !== input.receiptReference ||
        receipt.currency_code !== input.currency ||
        cents(receipt.amount_local) !== cents(input.amountLocal) ||
        new Date(receipt.received_at).getTime() !== input.receivedAt.getTime()
      )
        throw new CashConfirmationError('Conflicting cash confirmation');
      if (payment.source_type === 'ADJUSTMENT') {
        const allocations = await rows(
          `SELECT bc.guid FROM xa_paid_seat_grant g JOIN xa_billing_cycle bc ON bc.id = g.billing_cycle WHERE g.payment_transaction = :id`,
          { id: payment.id },
        );
        if (!allocations.length || allocations[0].guid !== input.billingCycleGuid)
          throw new CashConfirmationError(
            'Conflicting adjustment cycle or missing capacity reconciliation',
          );
      }
      return { receiptId: receipt.id, replayed: true, accessAction: receipt.access_action };
    }
    const methods = await rows('SELECT * FROM xa_payment_method WHERE id = :id', {
      id: payment.payment_method,
    });
    const method = methods[0];
    if (
      !method ||
      method.method_type !== 'CASH' ||
      !method.active ||
      (method.supported_currencies?.length && !method.supported_currencies.includes(input.currency))
    ) {
      throw new CashConfirmationError(
        'Transaction must use an active cash payment method supporting this currency',
      );
    }
    if (!['PENDING', 'PROCESSING', 'FAILED'].includes(payment.transaction_status))
      throw new CashConfirmationError('Transaction is not payable');
    if (!['CYCLE', 'ADJUSTMENT'].includes(payment.source_type))
      throw new CashConfirmationError(
        'Legacy payment requires source reconciliation before confirmation',
      );
    if (
      payment.currency_code !== input.currency ||
      cents(payment.amount_local) !== cents(input.amountLocal)
    )
      throw new CashConfirmationError('Cash must match the transaction exactly');
    const cycle = payment.source_type === 'CYCLE';
    const table = cycle ? 'xa_billing_cycle' : 'xa_license_adjustment';
    const sourceId = cycle ? payment.billing_cycle : payment.adjustment;
    const debts = await rows(`SELECT * FROM ${table} WHERE id = :id FOR UPDATE`, { id: sourceId });
    const debt = debts[0];
    if (!cycle && debt && debt.adjustment_kind && debt.adjustment_kind !== 'LEGACY')
      throw new CashConfirmationError(
        'Structured adjustment settlement is not enabled; do not issue prepaid rights for a consumed-month debt',
      );
    const status = cycle ? debt?.billing_status : debt?.payment_status;
    if (!debt || !['PENDING', 'PROCESSING', 'FAILED', 'OVERDUE'].includes(status))
      throw new CashConfirmationError('Debt is not payable');
    if (
      debt.billing_currency_code !== input.currency ||
      cents(debt.total_amount_local) !== cents(input.amountLocal)
    )
      throw new CashConfirmationError('Debt and transaction amounts do not match');
    let coveredCycle = debt;
    if (!cycle) {
      if (
        !Number.isInteger(input.billingCycleGuid) ||
        input.billingCycleGuid! < 100000 ||
        input.billingCycleGuid! > 999999
      )
        throw new CashConfirmationError('billing_cycle_guid is required for an adjustment');
      coveredCycle = (
        await rows('SELECT * FROM xa_billing_cycle WHERE guid = :guid FOR UPDATE', {
          guid: input.billingCycleGuid,
        })
      )[0];
      if (
        !coveredCycle ||
        coveredCycle.global_license !== debt.global_license ||
        coveredCycle.billing_status !== 'COMPLETED'
      )
        throw new CashConfirmationError('Adjustment requires a paid cycle of the same license');
      const effective = new Date(debt.adjustment_date).getTime();
      if (
        !Number.isFinite(effective) ||
        effective < new Date(coveredCycle.period_start).getTime() ||
        effective >= new Date(coveredCycle.period_end).getTime()
      )
        throw new CashConfirmationError('Adjustment date is outside the selected cycle');
    }
    const seats = Number(cycle ? debt.base_employee_count : debt.employees_added_count);
    if (!Number.isInteger(seats) || seats <= 0)
      throw new CashConfirmationError('Invalid purchased seat count');
    const grantStart = new Date(cycle ? coveredCycle.period_start : debt.adjustment_date);
    const grantEnd = new Date(coveredCycle.period_end);
    if (
      !Number.isFinite(grantStart.getTime()) ||
      !Number.isFinite(grantEnd.getTime()) ||
      grantEnd <= grantStart
    )
      throw new CashConfirmationError('Invalid paid capacity period');
    const licenses = await rows('SELECT * FROM xa_global_license WHERE id = :id FOR UPDATE', {
      id: debt.global_license,
    });
    const license = licenses[0];
    if (!license) throw new CashConfirmationError('License not found');
    if (license.billing_mode === 'POSTPAID' || debt.billing_mode === 'POSTPAID')
      throw new CashConfirmationError('Use postpaid settlement; prepaid rights must not be issued');
    if (cycle) {
      const overlap = await rows(
        `SELECT id FROM xa_paid_seat_grant WHERE global_license= :license
        AND source_type='CYCLE' AND billing_cycle<> :cycle AND valid_from < :end AND :start < valid_until`,
        { license: license.id, cycle: coveredCycle.id, start: grantStart, end: grantEnd },
      );
      if (overlap.length)
        throw new CashConfirmationError('Paid cycles overlap; reconciliation is required');
    } else {
      const base = await rows(
        `SELECT id FROM xa_paid_seat_grant WHERE billing_cycle= :cycle AND source_type='CYCLE'`,
        { cycle: coveredCycle.id },
      );
      if (!base.length)
        throw new CashConfirmationError(
          'Paid base capacity must be reconciled before adding seats',
        );
    }
    const now = new Date();
    let accessAction = cycle ? 'NO_CURRENT_COVERAGE' : 'ADJUSTMENT_CAPACITY_RECORDED';
    if (cycle) {
      const start = new Date(debt.period_start),
        end = new Date(debt.period_end);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start)
        throw new CashConfirmationError('Invalid paid period');
      if (start > now) accessAction = 'SCHEDULED';
      else if (end > now) {
        const samePeriod =
          new Date(license.current_period_start).getTime() === start.getTime() &&
          new Date(license.current_period_end).getTime() === end.getTime();
        const nextPeriod = new Date(license.current_period_end).getTime() === start.getTime();
        if (!samePeriod && !nextPeriod)
          throw new CashConfirmationError('Period requires reconciliation');
        if (['ACTIVE', 'PENDING_PAYMENT', 'EXPIRED'].includes(license.license_status)) {
          const renewalMonths = await renewalCycleMonths(
            rows,
            debt.id,
            Number(license.billing_cycle_months),
          );
          await rows(
            `UPDATE xa_global_license SET current_period_start = :start, current_period_end = :end,
            next_renewal_date = :end, billing_cycle_months = :months, updated_at = :now WHERE id = :id RETURNING id`,
            { start, end, now, id: license.id, months: renewalMonths },
          );
          accessAction = 'ACTIVE';
        } else accessAction = 'MANUAL_REVIEW';
      }
    }
    await rows(
      `UPDATE ${table} SET ${cycle ? 'billing_status' : 'payment_status'} = 'COMPLETED', payment_completed_at = :now,
      updated_at = :now WHERE id = :id RETURNING id`,
      { now, id: sourceId },
    );
    await rows(
      `UPDATE xa_payment_transaction SET transaction_status = 'COMPLETED', completed_at = :now,
      updated_at = :now WHERE id = :id RETURNING id`,
      { now, id: payment.id },
    );
    await rows(
      `INSERT INTO xa_paid_seat_grant (global_license, billing_cycle, adjustment, payment_transaction,
      source_type, seats, valid_from, valid_until)
      VALUES (:license, :cycle, :adjustment, :payment, :source, :seats, :start, :end) RETURNING id`,
      {
        license: license.id,
        cycle: coveredCycle.id,
        adjustment: cycle ? null : debt.id,
        payment: payment.id,
        source: payment.source_type,
        seats,
        start: grantStart,
        end: grantEnd,
      },
    );
    // A paid cycle does not waive overdue regularizations or technical restrictions.
    // Recalculate only after recording all settlement facts, in the same transaction.
    if (cycle && accessAction === 'ACTIVE') {
      await reconcileUsageRegularizationLicense(db, license.id, transaction);
      const current = (await rows('SELECT license_status FROM xa_global_license WHERE id=:id', {id:license.id}))[0];
      const decision = (await rows('SELECT * FROM public.monthly_license_access(:id)', {id:license.id}))[0];
      if (decision?.allowed && current && ['PENDING_PAYMENT','EXPIRED'].includes(current.license_status)) {
        // EXPIRED from another source is not ours to revive automatically.
        const last = (await rows(`SELECT metadata FROM xa_license_event WHERE global_license=:id
          AND event_type='LICENSE_STATUS_CHANGED' ORDER BY id DESC LIMIT 1`, {id:license.id}))[0];
        if (current.license_status === 'PENDING_PAYMENT' ||
            last?.metadata?.action === 'USAGE_REGULARIZATION_ACCESS_RESTORE') {
          await rows(`UPDATE xa_global_license SET license_status='ACTIVE',updated_at=NOW() WHERE id=:id`, {id:license.id});
        }
      }
      const finalStatus = (await rows('SELECT license_status FROM xa_global_license WHERE id=:id',{id:license.id}))[0];
      if (!finalStatus || finalStatus.license_status !== 'ACTIVE' || !decision?.allowed)
        accessAction='MANUAL_REVIEW';
    }
    const receipt = await rows(
      `INSERT INTO xa_cash_receipt (payment_transaction, tenant, actor_user_guid, receipt_reference,
      idempotency_key, amount_local, currency_code, received_at, confirmed_at, access_action)
      VALUES (:payment, :tenant, :actor, :reference, :key, :amount, :currency, :received, :now, :action) RETURNING id`,
      {
        payment: payment.id,
        tenant: license.tenant,
        actor: actor.actorUserGuid,
        reference: input.receiptReference,
        key: input.idempotencyKey,
        amount: input.amountLocal,
        currency: input.currency,
        received: input.receivedAt,
        now,
        action: accessAction,
      },
    );
    return { receiptId: receipt[0].id, replayed: false, accessAction };
  });
}
