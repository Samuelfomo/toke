import { Request, Response, Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import Renewal from '../class/Renewal.js';
import { RenewalPreviewError } from '../services/renewal-preview.js';
import { RenewalPreparationError } from '../services/renewal-preparation.js';

const router = Router();
router.get('/:licenseGuid/preview', Ensure.get(), async (req: Request, res: Response) => {
  try {
    return R.handleSuccess(res, await new Renewal().preview(req.params.licenseGuid));
  } catch (error: any) {
    if (error instanceof RenewalPreviewError)
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'renewal_preview_invalid',
        message: error.message,
      });
    console.error('Renewal preview failed:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'renewal_preview_failed',
      message: 'Renewal preview could not be calculated',
    });
  }
});
router.post('/:licenseGuid/prepare', Ensure.post(), async (req: Request, res: Response) => {
  try {
    return R.handleSuccess(
      res,
      await new Renewal().prepare(req.params.licenseGuid, req.body ?? {}),
    );
  } catch (error: any) {
    if (error instanceof RenewalPreparationError)
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'renewal_preparation_invalid',
        message: error.message,
      });
    console.error('Renewal preparation failed:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'renewal_preparation_failed',
      message: 'Renewal could not be prepared',
    });
  }
});
export default router;
