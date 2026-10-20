import type { Sequelize, Transaction } from 'sequelize';

/** Reconciles only status transitions attributable to overdue usage regularizations.
 * The caller must own a transaction when invoked from financial settlement.
 */
export async function reconcileUsageRegularizationLicense(
  db: Sequelize,
  licenseId: number,
  transaction: Transaction,
): Promise<boolean> {
  const rows = async (sql: string, replacements: Record<string, unknown> = {}) => {
    const [value] = await db.query(sql, { transaction, replacements });
    return value as any[];
  };
  const license = (
    await rows(
      'SELECT id,tenant,guid,license_status FROM public.xa_global_license WHERE id=:id FOR UPDATE',
      { id: licenseId },
    )
  )[0];
  if (!license || !['ACTIVE', 'EXPIRED'].includes(license.license_status)) return false;
  const access = (
    await rows('SELECT * FROM public.monthly_license_access(:id)', { id: licenseId })
  )[0];
  if (!access) throw new Error('Monthly access decision missing');
  const overdue = access.basis === 'USAGE_REGULARIZATION_OVERDUE';
  // Only the very latest status transition can authorize reversal of our own block.
  // This avoids overriding manual or independent transitions even if status became EXPIRED again.
  const lastStatusEvent = (
    await rows(
      `SELECT id, previous_payload, new_payload, metadata FROM public.xa_license_event
     WHERE global_license=:id AND event_type='LICENSE_STATUS_CHANGED'
     ORDER BY id DESC LIMIT 1`,
      { id: licenseId },
    )
  )[0];
  const ownsCurrentExpiredStatus =
    !!lastStatusEvent &&
    lastStatusEvent.metadata?.action === 'USAGE_REGULARIZATION_ACCESS_BLOCK' &&
    lastStatusEvent.previous_payload?.license_status === 'ACTIVE' &&
    lastStatusEvent.new_payload?.license_status === 'EXPIRED';
  let next: string | null = null;
  let action: string | null = null;
  if (overdue && license.license_status === 'ACTIVE') {
    next = 'EXPIRED';
    action = 'USAGE_REGULARIZATION_ACCESS_BLOCK';
  } else if (
    !overdue &&
    license.license_status === 'EXPIRED' &&
    access.allowed === true &&
    ownsCurrentExpiredStatus
  ) {
    // Never restore an EXPIRED license without a matching outstanding automatic block.
    next = 'ACTIVE';
    action = 'USAGE_REGULARIZATION_ACCESS_RESTORE';
  }
  if (!next || !action) return false;
  const changed = await rows(
    `UPDATE public.xa_global_license SET license_status=:next,updated_at=NOW()
     WHERE id=:id AND license_status=:before RETURNING id`,
    { id: licenseId, next, before: license.license_status },
  );
  if (changed.length !== 1) throw new Error('Concurrent license status change');
  await rows(
    `INSERT INTO public.xa_license_event
     (tenant,global_license,event_type,operation_key,actor_type,actor_user_guid,
      effective_at,previous_payload,new_payload,reason,metadata)
     VALUES(:tenant,:license,'LICENSE_STATUS_CHANGED',:key,'SYSTEM',NULL,NOW(),
       CAST(:before AS jsonb),CAST(:after AS jsonb),:reason,CAST(:metadata AS jsonb))`,
    {
      tenant: license.tenant,
      license: licenseId,
      key: `USAGE426_${action}_${license.guid}_${lastStatusEvent?.id ?? 0}`,
      before: JSON.stringify({ license_status: license.license_status }),
      after: JSON.stringify({ license_status: next }),
      reason: overdue
        ? 'Overdue usage regularization'
        : 'Usage regularization paid; remaining access checks passed',
      metadata: JSON.stringify({ action, access_basis: access.basis }),
    },
  );
  return true;
}

/** Paginated selection, kept in the database access layer. */
export async function findRegularizationLicensesBatch(
  db: Sequelize,
  cursor: number,
): Promise<{ id: number }[]> {
  const [data] = await db.query(
    `
    SELECT DISTINCT l.id FROM public.xa_global_license l
    WHERE l.license_status::text IN ('ACTIVE','EXPIRED')
      AND (EXISTS (SELECT 1 FROM public.xa_license_adjustment a
        WHERE a.global_license=l.id AND a.adjustment_kind='USAGE_REGULARIZATION')
        OR EXISTS (SELECT 1 FROM public.xa_license_event e
        WHERE e.global_license=l.id AND e.event_type='LICENSE_STATUS_CHANGED'
          AND e.metadata->>'action'='USAGE_REGULARIZATION_ACCESS_BLOCK'))
      AND l.id > :cursor
    ORDER BY l.id LIMIT 500
  `,
    { replacements: { cursor } },
  );
  return data as { id: number }[];
}

/** Recheck access after an activation or payment within the caller's transaction.
 * Regularization events are owned by LicenseEvent; other monthly restrictions keep
 * the legacy monthly status journal. Neither path lifts a manual suspension. */
export async function reconcileAccessAfterFinancialChange(
  db: Sequelize,
  licenseId: number,
  transaction: Transaction,
): Promise<boolean> {
  const regChanged = await reconcileUsageRegularizationLicense(db, licenseId, transaction);
  const [data] = await db.query(
    'SELECT license_status FROM public.xa_global_license WHERE id=:id FOR UPDATE',
    { transaction, replacements: { id: licenseId } },
  );
  const license = (data as any[])[0];
  if (!license || license.license_status !== 'ACTIVE') return regChanged;
  const [decisions] = await db.query('SELECT * FROM public.monthly_license_access(:id)', {
    transaction,
    replacements: { id: licenseId },
  });
  const decision = (decisions as any[])[0];
  if (!decision) throw new Error('Monthly access decision missing');
  if (decision.allowed || decision.basis === 'USAGE_REGULARIZATION_OVERDUE') return regChanged;
  if (decision.basis === 'TECHNICAL_RESTRICTION') return regChanged;
  const [changed] = await db.query(
    "UPDATE public.xa_global_license SET license_status='EXPIRED',updated_at=NOW() WHERE id=:id AND license_status='ACTIVE' RETURNING id",
    { transaction, replacements: { id: licenseId } },
  );
  if ((changed as any[]).length !== 1) throw new Error('Concurrent license status change');
  await db.query(
    `INSERT INTO public.xa_monthly_license_status_event(global_license,previous_status,new_status,reason)
     VALUES(:id,'ACTIVE','EXPIRED',:reason)`,
    { transaction, replacements: { id: licenseId, reason: decision.basis } },
  );
  return true;
}
