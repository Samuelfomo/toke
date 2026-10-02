import type { Sequelize } from 'sequelize';

export interface CashConfirmation {
  transactionGuid: number;
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
          await rows(
            `UPDATE xa_global_license SET current_period_start = :start, current_period_end = :end,
            next_renewal_date = :end, license_status = 'ACTIVE', updated_at = :now WHERE id = :id RETURNING id`,
            { start, end, now, id: license.id },
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
