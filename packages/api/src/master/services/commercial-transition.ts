import type { Sequelize } from 'sequelize';

/** Caller controls authorization. All selected licenses change atomically. No payment is fabricated. */
export async function applyCommercialTransition(
  db: Sequelize,
  input: {
    tenantGuids: number[];
    actorUserGuid: string;
    actorTenantGuid: number;
    validFrom: Date;
    validUntil: Date;
    unitPriceUsd: string;
    reason: string;
    key: string;
  },
): Promise<any[]> {
  if (
    !input.tenantGuids.length ||
    new Set(input.tenantGuids).size !== input.tenantGuids.length ||
    !input.tenantGuids.every((n) => Number.isInteger(n) && n >= 100000 && n <= 999999) ||
    !input.actorUserGuid.trim() ||
    input.actorUserGuid.length > 128 ||
    !Number.isInteger(input.actorTenantGuid) ||
    !/^\d+(\.\d{1,2})?$/.test(input.unitPriceUsd) ||
    Number(input.unitPriceUsd) <= 0 ||
    !input.reason.trim() ||
    !input.key.trim() ||
    input.key.length > 115 ||
    !Number.isFinite(input.validFrom.getTime()) ||
    !Number.isFinite(input.validUntil.getTime()) ||
    input.validUntil <= input.validFrom
  )
    throw new Error('Invalid commercial transition');
  return db.transaction<any[]>(async (transaction) => {
    async function rows(sql: string, replacements: Record<string, any> = {}): Promise<any[]> {
      const [r] = await db.query(sql, { transaction, replacements });
      return r as any[];
    }
    const results: any[] = [];
    for (const guid of [...input.tenantGuids].sort((a, b) => a - b)) {
      const tenant = (
        await rows('SELECT id FROM xa_tenant WHERE guid= :guid FOR UPDATE', { guid })
      )[0];
      if (!tenant) throw new Error(`Tenant ${guid} not found`);
      const licenses = await rows(
        'SELECT * FROM xa_global_license WHERE tenant= :tenant ORDER BY id FOR UPDATE',
        { tenant: tenant.id },
      );
      if (licenses.length !== 1)
        throw new Error(`Tenant ${guid} requires exactly one reconciled license`);
      const license = licenses[0],
        key = `${input.key}:${guid}`;
      const prior = (
        await rows('SELECT * FROM xa_commercial_transition WHERE global_license= :id', {
          id: license.id,
        })
      )[0];
      if (prior) {
        if (
          prior.idempotency_key !== key ||
          prior.actor_user_guid !== input.actorUserGuid ||
          prior.actor_tenant_guid !== input.actorTenantGuid ||
          new Date(prior.valid_from).getTime() !== input.validFrom.getTime() ||
          new Date(prior.valid_until).getTime() !== input.validUntil.getTime() ||
          Number(prior.unit_price_usd) !== Number(input.unitPriceUsd) ||
          prior.reason !== input.reason
        )
          throw new Error(`Transition conflict for ${guid}`);
        results.push({ tenant_guid: guid, license_guid: license.guid, replayed: true });
        continue;
      }
      if (!['ACTIVE', 'PENDING_PAYMENT', 'EXPIRED'].includes(license.license_status))
        throw new Error(`Technical restriction requires review for ${guid}`);
      const [window] = await rows(
        'SELECT CAST(:start AS timestamptz)<=NOW() AND NOW()<CAST(:end AS timestamptz) AS allowed',
        { start: input.validFrom, end: input.validUntil },
      );
      if (!window?.allowed) throw new Error('Transition must cover the current instant');
      if (
        (
          await rows(
            `SELECT id FROM xa_paid_seat_grant WHERE global_license= :id AND valid_from< :end AND :start <valid_until`,
            { id: license.id, start: input.validFrom, end: input.validUntil },
          )
        ).length
      )
        throw new Error(`Paid capacity requires review for ${guid}`);
      if (
        (
          await rows('SELECT id FROM xa_renewal_preparation WHERE global_license= :id', {
            id: license.id,
          })
        ).length
      )
        throw new Error(`Prepared billing requires review for ${guid}`);
      if (!Number.isInteger(Number(license.minimum_seats)) || Number(license.minimum_seats) < 5)
        throw new Error('Invalid minimum seats');
      const [count] = await rows(
        `SELECT COUNT(*)::integer AS count FROM xa_employee_license
    WHERE global_license= :id AND public.license_employee_billing_status(id,NOW())::text ='BILLABLE'`,
        { id: license.id },
      );
      const seats = Math.max(Number(license.minimum_seats), Number(count.count));
      const [updated] = await rows(
        `UPDATE xa_global_license SET base_price_usd= :price,
    current_period_start= :start,current_period_end= :end,next_renewal_date= :end,license_status='ACTIVE',updated_at=NOW()
    WHERE id= :id RETURNING *`,
        {
          id: license.id,
          price: input.unitPriceUsd,
          start: input.validFrom,
          end: input.validUntil,
        },
      );
      await rows(
        `INSERT INTO xa_commercial_transition(global_license,tenant,actor_user_guid,actor_tenant_guid,idempotency_key,
    valid_from,valid_until,offered_seats,unit_price_usd,reason,previous_license,new_license)
    VALUES(:license,:tenant,:actor,:actorTenant,:key,:start,:end,:seats,:price,:reason,CAST(:before AS jsonb),CAST(:after AS jsonb))`,
        {
          license: license.id,
          tenant: tenant.id,
          actor: input.actorUserGuid,
          actorTenant: input.actorTenantGuid,
          key,
          start: input.validFrom,
          end: input.validUntil,
          seats,
          price: input.unitPriceUsd,
          reason: input.reason,
          before: JSON.stringify(license),
          after: JSON.stringify(updated),
        },
      );
      results.push({
        tenant_guid: guid,
        license_guid: license.guid,
        offered_seats: seats,
        replayed: false,
      });
    }
    return results;
  });
}

/** Call after paid-cycle activation. Expiration preserves technical restrictions and employee contracts. */
export async function expireCommercialTransitions(db: Sequelize): Promise<number> {
  return db.transaction<number>(async (transaction) => {
    const [result] = await db.query(
      `SELECT gl.*,t.id AS transition_id FROM xa_global_license gl
   JOIN xa_commercial_transition t ON t.global_license=gl.id
   WHERE t.valid_until<=NOW() AND NOT EXISTS(SELECT 1 FROM xa_monthly_license_policy p WHERE p.global_license=gl.id) AND NOT EXISTS(SELECT 1 FROM xa_commercial_transition_expiry e WHERE e.transition_id=t.id)
   ORDER BY gl.id FOR UPDATE OF gl`,
      { transaction },
    );
    let count = 0;
    for (const row of result as any[]) {
      const before = { ...row };
      delete before.transition_id;
      const [paid] = await db.query(
        `SELECT id FROM xa_paid_seat_grant WHERE global_license= :id
    AND source_type='CYCLE' AND valid_from<=NOW() AND NOW()<valid_until`,
        { transaction, replacements: { id: row.id } },
      );
      let after = before;
      if (!(paid as any[]).length && ['ACTIVE', 'PENDING_PAYMENT'].includes(row.license_status)) {
        const [updated] = await db.query(
          "UPDATE xa_global_license SET license_status='EXPIRED',updated_at=NOW() WHERE id= :id RETURNING *",
          { transaction, replacements: { id: row.id } },
        );
        after = (updated as any[])[0];
      }
      await db.query(
        `INSERT INTO xa_commercial_transition_expiry(transition_id,previous_license,new_license)
    VALUES(:id,CAST(:before AS jsonb),CAST(:after AS jsonb))`,
        {
          transaction,
          replacements: {
            id: row.transition_id,
            before: JSON.stringify(before),
            after: JSON.stringify(after),
          },
        },
      );
      count++;
    }
    return count;
  });
}
