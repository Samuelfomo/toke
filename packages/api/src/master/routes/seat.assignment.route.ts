import { Request, Response, Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import { TableInitializer } from '../database/db.initializer.js';
import { tableName } from '../../utils/response.model.js';
import { changeSeatAssignment, SeatAssignmentError } from '../services/seat-assignment.js';

const router = Router();
for (const action of ['ASSIGN', 'RELEASE'] as const) {
  router.post(
    `/:licenseGuid/${action.toLowerCase()}`,
    Ensure.post(),
    async (req: Request, res: Response) => {
      try {
        const license = String(req.params.licenseGuid),
          employee = String(req.body?.employee_license_guid ?? '');
        if (!/^[1-9][0-9]{5}$/.test(license) || !/^[1-9][0-9]{5}$/.test(employee))
          throw new SeatAssignmentError('Invalid GUID');
        const db = TableInitializer.getModel(tableName.GLOBAL_LICENSE).sequelize;
        if (!db) throw new Error('Master database connection unavailable');
        const result = await changeSeatAssignment(
          db,
          {
            licenseGuid: Number(license),
            employeeLicenseGuid: Number(employee),
            actorUserGuid: req.body?.actor_user_guid,
          },
          action,
        );
        return R.handleSuccess(res, result);
      } catch (error: any) {
        if (error instanceof SeatAssignmentError)
          return R.handleError(res, HttpStatus.BAD_REQUEST, {
            code: 'seat_assignment_invalid',
            message: error.message,
          });
        console.error('Seat assignment failed:', error);
        return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
          code: 'seat_assignment_failed',
          message: 'Seat assignment could not be completed',
        });
      }
    },
  );
}
export default router;
