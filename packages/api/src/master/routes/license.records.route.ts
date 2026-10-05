import { Request, Response, Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import LicenseRecords, { LicenseRecordsInputError } from '../class/LicenseRecords.js';
import { LicenseRecordsNotFound } from '../database/base_model/db.license-records.js';

const router = Router();
// ServerAuth remains global. tenant_guid is a scope filter, not proof of user authorization.
async function read(req: Request, res: Response, kind: 'cash' | 'events') {
  try {
    const records = new LicenseRecords();
    const result =
      kind === 'cash'
        ? await records.cash(req.query.tenant_guid, req.params.transactionGuid)
        : await records.events(
            req.query.tenant_guid,
            req.params.licenseGuid,
            req.query.limit ?? 50,
            req.query.offset ?? 0,
          );
    return R.handleSuccess(res, result);
  } catch (error) {
    if (error instanceof LicenseRecordsInputError)
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'license_records_invalid',
        message: error.message,
      });
    if (error instanceof LicenseRecordsNotFound)
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'license_record_not_found',
        message: error.message,
      });
    console.error('License records read failed:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'license_records_failed',
      message: 'License records unavailable',
    });
  }
}
router.get('/payments/:transactionGuid/cash', Ensure.get(), (req: Request, res: Response) =>
  read(req, res, 'cash'),
);
router.get('/licenses/:licenseGuid/events', Ensure.get(), (req: Request, res: Response) =>
  read(req, res, 'events'),
);
export default router;
