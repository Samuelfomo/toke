import { Request, Response, Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import { TableInitializer } from '../database/db.initializer.js';
import { tableName } from '../../utils/response.model.js';
import { previewRenewal, RenewalPreviewError } from '../services/renewal-preview.js';
import { prepareRenewal, RenewalPreparationError } from '../services/renewal-preparation.js';

const router = Router();
router.get('/:licenseGuid/preview', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const guid = String(req.params.licenseGuid);
    if (!/^[1-9][0-9]{5}$/.test(guid)) throw new RenewalPreviewError('Invalid license GUID');
    const db = TableInitializer.getModel(tableName.GLOBAL_LICENSE).sequelize;
    if (!db) throw new Error('Master database connection unavailable');
    return R.handleSuccess(res, await previewRenewal(db, Number(guid)));
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
    const guid = String(req.params.licenseGuid);
    if (!/^[1-9][0-9]{5}$/.test(guid)) throw new RenewalPreparationError('Invalid license GUID');
    const db = TableInitializer.getModel(tableName.GLOBAL_LICENSE).sequelize;
    if (!db) throw new Error('Master database connection unavailable');
    return R.handleSuccess(res, await prepareRenewal(db, Number(guid), req.body ?? {}));
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
