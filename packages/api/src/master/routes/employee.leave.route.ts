import { Request, Response, Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import { TableInitializer } from '../database/db.initializer.js';
import { tableName } from '../../utils/response.model.js';
import { EmployeeLeaveError, manageEmployeeLeave } from '../services/employee-leave.js';

const router = Router();
async function handle(req: Request, res: Response, action: 'DECLARE' | 'CANCEL' | 'LIST') {
  try {
    const guid = String(req.params.employeeGuid);
    if (!/^[1-9][0-9]{5}$/.test(guid))
      throw new EmployeeLeaveError('Invalid employee license GUID');
    const db = TableInitializer.getModel(tableName.EMPLOYEE_LICENSE).sequelize;
    if (!db) throw new Error('Master database connection unavailable');
    return R.handleSuccess(
      res,
      await manageEmployeeLeave(db, Number(guid), action, req.body ?? {}),
    );
  } catch (error: any) {
    if (error instanceof EmployeeLeaveError)
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'employee_leave_invalid',
        message: error.message,
      });
    console.error('Employee leave failed:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'employee_leave_failed',
      message: 'Employee leave operation failed',
    });
  }
}
router.post('/:employeeGuid/declare', Ensure.post(), (req, res) => handle(req, res, 'DECLARE'));
router.post('/:employeeGuid/cancel', Ensure.post(), (req, res) => handle(req, res, 'CANCEL'));
router.get('/:employeeGuid', Ensure.get(), (req, res) => handle(req, res, 'LIST'));
export default router;
