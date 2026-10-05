import { Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import MonthlyBillingPreview from '../class/MonthlyBillingPreview.js';
import { ActivityMonitoringInputError } from '../class/activity-monitoring-input.js';
import { MonthlyBillingPreviewDataError } from '../database/base_model/db.monthly-billing-preview.js';

const router = Router();
// ServerAuth global ; tenant_guid filtre le perimetre, sans remplacer les habilitations.
router.get('/licenses/:licenseGuid/monthly-preview', Ensure.get(), async (req, res) => {
  try {
    return R.handleSuccess(
      res,
      await new MonthlyBillingPreview().preview(req.params.licenseGuid, req.query),
    );
  } catch (error) {
    if (
      error instanceof ActivityMonitoringInputError ||
      error instanceof MonthlyBillingPreviewDataError
    )
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'monthly_preview_invalid',
        message: error.message,
      });
    console.error('Monthly billing preview failed:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'monthly_preview_failed',
      message: 'Monthly preview unavailable',
    });
  }
});
export default router;
