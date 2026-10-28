import type { Sequelize } from 'sequelize';
import { findRegularizationLicensesBatch, reconcileUsageRegularizationLicense } from '../database/base_model/db.usage-regularization-access.js';
export { reconcileUsageRegularizationLicense };

export async function reconcileUsageRegularizationAccess(db: Sequelize): Promise<number> {
  // One license per transaction avoids rolling back successfully reconciled tenants.
  let cursor=0;
  let changed=0;
  for (;;) {
  const batch = await findRegularizationLicensesBatch(db,cursor);
  if (!batch.length) break;
  for (const entry of batch) {
    try {
      if (await db.transaction(t=>reconcileUsageRegularizationLicense(db,entry.id,t))) changed++;
    } catch (error) { console.error('Regularization access reconciliation failed:',entry.id,error); }
  }
  cursor=batch[batch.length-1].id;
  }
  return changed;
}
