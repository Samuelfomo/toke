import { Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import LicenseRelease, {
  LicenseReleaseError,
  LicenseReleaseInputError,
} from '../class/LicenseRelease.js';
import { PostpaidClosureInputError } from '../class/PostpaidClosure.js';
import { ActivityMonitoringInputError } from '../class/activity-monitoring-input.js';

const router = Router();
function failure(res: any, error: unknown) {
  if (
    error instanceof LicenseReleaseError ||
    error instanceof LicenseReleaseInputError ||
    error instanceof PostpaidClosureInputError ||
    error instanceof ActivityMonitoringInputError
  )
    return R.handleError(res, HttpStatus.BAD_REQUEST, {
      code: 'license_release_invalid',
      message: error.message,
    });
  console.error('License restriction release failed:', error);
  return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
    code: 'license_release_failed',
    message: 'Release unavailable; retry with the same operation key',
  });
}
router.post(
  '/licenses/:licenseGuid/release-restriction/preview',
  Ensure.post(),
  async (req, res) => {
    try {
      return R.handleSuccess(
        res,
        await new LicenseRelease().release(req.params.licenseGuid, req.body ?? {}, true),
      );
    } catch (e) {
      return failure(res, e);
    }
  },
);
router.post('/licenses/:licenseGuid/release-restriction/apply', Ensure.post(), async (req, res) => {
  try {
    return R.handleSuccess(
      res,
      await new LicenseRelease().release(req.params.licenseGuid, req.body ?? {}, false),
    );
  } catch (e) {
    return failure(res, e);
  }
});
export default router;
