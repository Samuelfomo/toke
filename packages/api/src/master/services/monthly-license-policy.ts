import type { Sequelize } from 'sequelize';

export async function applyMonthlyPolicy(
  db: Sequelize,
  input: { tenantGuids: number[]; actorUserGuid: string; actorTenantGuid: number },
): Promise<any[]> {
  if (
    !input.tenantGuids.length ||
    new Set(input.tenantGuids).size !== input.tenantGuids.length ||
    !input.tenantGuids.every((n) => Number.isInteger(n) && n >= 100000 && n <= 999999) ||
    !input.actorUserGuid.trim() ||
    input.actorUserGuid.length > 128 ||
    !Number.isInteger(input.actorTenantGuid)
  )
    throw new Error('Invalid monthly policy input');
  return db.transaction<any[]>(async (transaction) => {
    async function rows(sql: string, replacements: Record<string, any> = {}): Promise<any[]> {
      const [r] = await db.query(sql, { transaction, replacements });
      return r as any[];
    }
    const result: any[] = [];
    for (const guid of [...input.tenantGuids].sort((a, b) => a - b)) {
      const licenses = await rows(
        `SELECT gl.* FROM xa_global_license gl JOIN xa_tenant t ON t.id=gl.tenant
    WHERE t.guid = :guid ORDER BY gl.id FOR UPDATE OF gl`,
        { guid },
      );
      if (licenses.length !== 1) throw new Error(`Tenant ${guid} needs one license`);
      const l = licenses[0],
        key = `TOKEMONTHLY2026_${guid}`;
      const prior = (
        await rows('SELECT * FROM xa_monthly_license_policy WHERE global_license = :id', {
          id: l.id,
        })
      )[0];
      if (prior) {
        if (
          prior.actor_user_guid !== input.actorUserGuid ||
          prior.actor_tenant_guid !== input.actorTenantGuid ||
          prior.idempotency_key !== key ||
          Number(l.billing_cycle_months) !== 1
        )
          throw new Error('Monthly policy conflict');
        result.push({ tenant_guid: guid, license_guid: l.guid, replayed: true });
        continue;
      }
      if (!['ACTIVE', 'PENDING_PAYMENT', 'EXPIRED'].includes(l.license_status))
        throw new Error('Technical restriction requires review');
      if (
        !(
          await rows(
            'SELECT id FROM xa_commercial_transition WHERE global_license = :id AND NOW()<valid_until',
            { id: l.id },
          )
        ).length
      )
        throw new Error('Current commercial transition required');
      if (
        (
          await rows('SELECT id FROM xa_renewal_preparation WHERE global_license = :id', {
            id: l.id,
          })
        ).length
      )
        throw new Error('Existing renewal requires review');
      const [after] = await rows(
        'UPDATE xa_global_license SET billing_cycle_months=1,updated_at=NOW() WHERE id = :id RETURNING *',
        { id: l.id },
      );
      await rows(
        `INSERT INTO xa_monthly_license_policy(global_license,grace_days,actor_user_guid,actor_tenant_guid,idempotency_key,previous_license,new_license)
    VALUES(:id,7,:actor,:actorTenant,:key,CAST(:before AS jsonb),CAST(:after AS jsonb))`,
        {
          id: l.id,
          actor: input.actorUserGuid,
          actorTenant: input.actorTenantGuid,
          key,
          before: JSON.stringify(l),
          after: JSON.stringify(after),
        },
      );
      result.push({
        tenant_guid: guid,
        license_guid: l.guid,
        billing_cycle_months: 1,
        grace_days: 7,
        replayed: false,
      });
    }
    return result;
  });
}
export async function reconcileMonthlyAccess(db: Sequelize): Promise<number> {
  return db.transaction<number>(async (transaction) => {
    const [raw] = await db.query(
      `SELECT gl.id,gl.license_status FROM xa_global_license gl
   JOIN xa_monthly_license_policy p ON p.global_license=gl.id ORDER BY gl.id FOR UPDATE OF gl`,
      { transaction },
    );
    let count = 0;
    for (const l of raw as any[]) {
      if (!['ACTIVE', 'PENDING_PAYMENT', 'EXPIRED'].includes(l.license_status)) continue;
      const [decision] = await db.query('SELECT * FROM monthly_license_access(:id)', {
        transaction,
        replacements: { id: l.id },
      });
      const access = (decision as any[])[0];
      if (!access) throw new Error('Monthly access decision missing');
      const status = access.allowed ? 'ACTIVE' : 'EXPIRED';
      if (status === l.license_status) continue;
      await db.query(
        'UPDATE xa_global_license SET license_status = :status,updated_at=NOW() WHERE id = :id',
        { transaction, replacements: { id: l.id, status } },
      );
      await db.query(
        `INSERT INTO xa_monthly_license_status_event(global_license,previous_status,new_status,reason)
    VALUES(:id,:before,:after,:reason)`,
        {
          transaction,
          replacements: { id: l.id, before: l.license_status, after: status, reason: access.basis },
        },
      );
      count++;
    }
    return count;
  });
}
