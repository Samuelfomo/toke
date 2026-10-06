import { Request, Response, Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import SeatAssignment, { SeatAssignmentError } from '../class/SeatAssignment.js';

const router = Router();
for (const action of ['ASSIGN', 'RELEASE'] as const) {
  router.post(
    `/:licenseGuid/${action.toLowerCase()}`,
    Ensure.post(),
    async (req: Request, res: Response) => {
      try {
        const result = await new SeatAssignment().change(
          req.params.licenseGuid,
          req.body ?? {},
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
