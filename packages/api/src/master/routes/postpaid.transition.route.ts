import { Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import PostpaidTransition, {
  PostpaidTransitionError,
  PostpaidTransitionInputError,
} from '../class/PostpaidTransition.js';
import { PostpaidClosureInputError } from '../class/PostpaidClosure.js';
import { ActivityMonitoringInputError } from '../class/activity-monitoring-input.js';

const router = Router();
function failure(res: any, error: unknown) {
  if (
    error instanceof PostpaidTransitionError ||
    error instanceof PostpaidTransitionInputError ||
    error instanceof PostpaidClosureInputError ||
    error instanceof ActivityMonitoringInputError
  )
    return R.handleError(res, HttpStatus.BAD_REQUEST, {
      code: 'postpaid_transition_invalid',
      message: error.message,
    });
  console.error('Postpaid transition failed:', error);
  return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
    code: 'postpaid_transition_failed',
    message: 'Operation unavailable; retry with the same operation key',
  });
}
router.post('/postpaid-transition/preview', Ensure.post(), async (req, res) => {
  try {
    return R.handleSuccess(res, await new PostpaidTransition().apply(req.body ?? {}, true));
  } catch (e) {
    return failure(res, e);
  }
});
router.post('/postpaid-transition/apply', Ensure.post(), async (req, res) => {
  try {
    return R.handleSuccess(res, await new PostpaidTransition().apply(req.body ?? {}, false));
  } catch (e) {
    return failure(res, e);
  }
});
router.get('/licenses/:licenseGuid/events', Ensure.get(), async (req, res) => {
  try {
    return R.handleSuccess(
      res,
      await new PostpaidTransition().events(req.params.licenseGuid, req.query.tenant_guid),
    );
  } catch (e) {
    return failure(res, e);
  }
});
export default router;
