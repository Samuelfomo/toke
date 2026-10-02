import { Request, Response, Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import { TableInitializer } from '../database/db.initializer.js';
import { tableName } from '../../utils/response.model.js';

const router = Router();
router.get('/:licenseGuid', Ensure.get(), async (req: Request, res: Response) => {
  const guid = String(req.params.licenseGuid);
  if (!/^[1-9][0-9]{5}$/.test(guid))
    return R.handleError(res, HttpStatus.BAD_REQUEST, {
      code: 'invalid_license_guid',
      message: 'Invalid license GUID',
    });
  try {
    const db = TableInitializer.getModel(tableName.GLOBAL_LICENSE).sequelize;
    if (!db) throw new Error('Master database connection unavailable');
    const [rows] = await db.query(
      `SELECT gl.guid, gl.license_status,
      (SELECT COUNT(*) FROM xa_employee_license el WHERE el.global_license = gl.id) AS registered_users,
      (SELECT COALESCE(SUM(g.seats),0) FROM xa_paid_seat_grant g
       WHERE g.global_license=gl.id AND g.valid_from <= CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP < g.valid_until) AS paid_seats,
      (SELECT COUNT(*) FROM xa_seat_assignment sa WHERE sa.global_license=gl.id
        AND sa.released_at IS NULL AND sa.assigned_at<=CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP<sa.valid_until) AS assigned_seats,
      COALESCE((SELECT offered_seats FROM xa_commercial_transition tr WHERE tr.global_license=gl.id
       AND tr.valid_from<=CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP<tr.valid_until),0) AS offered_seats,
      (SELECT valid_until FROM xa_commercial_transition tr WHERE tr.global_license=gl.id
       AND tr.valid_from<=CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP<tr.valid_until) AS transition_until,
      EXISTS (SELECT 1 FROM xa_billing_cycle bc WHERE bc.global_license=gl.id AND bc.billing_status='COMPLETED'
        AND bc.period_start <= CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP < bc.period_end
        AND NOT EXISTS (SELECT 1 FROM xa_paid_seat_grant g WHERE g.billing_cycle=bc.id AND g.source_type='CYCLE')) AS reconciliation_required
      FROM xa_global_license gl WHERE gl.guid= :guid`,
      { replacements: { guid: Number(guid) } },
    );
    const result = (rows as any[])[0];
    if (!result)
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'license_not_found',
        message: 'License not found',
      });
    const [decisions] = await db.query(
      `SELECT d.* FROM xa_global_license gl
      CROSS JOIN LATERAL monthly_license_access(gl.id) d WHERE gl.guid = :guid`,
      { replacements: { guid: Number(guid) } },
    );
    const monthly = (decisions as any[])[0];
    return R.handleSuccess(res, {
      license_guid: result.guid,
      license_status: result.license_status,
      registered_users: Number(result.registered_users),
      paid_seats: Number(result.paid_seats),
      assigned_seats: Number(result.assigned_seats),
      offered_seats: Number(result.offered_seats),
      transition_until: result.transition_until,
      access_allowed: monthly
        ? monthly.allowed
        : result.license_status === 'ACTIVE' &&
          (Number(result.paid_seats) > 0 || Number(result.offered_seats) > 0),
      access_basis: monthly
        ? monthly.basis
        : Number(result.paid_seats) > 0
          ? 'PAID'
          : Number(result.offered_seats) > 0
            ? 'COMMERCIAL_TRANSITION'
            : 'NONE',
      access_until: monthly?.access_until ?? result.transition_until,
      unassigned_paid_seats: Math.max(0, Number(result.paid_seats) - Number(result.assigned_seats)),
      reconciliation_required: result.reconciliation_required,
    });
  } catch (error) {
    console.error('Capacity read failed:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'capacity_read_failed',
      message: 'Capacity could not be read',
    });
  }
});
export default router;
