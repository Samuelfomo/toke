import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import R from '@toke/api/dist/tools/response.js';
import { HttpStatus, RotationGroupValidationUtils } from '@toke/shared';

import { TenantConfig } from '../tools/tenant.config.js';
import { RotationGroupService } from '../services/rotation.group.service.js';

const router = Router();

router.get(
  '/list',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const client = (req as any).client.reference;

      const result: any = await RotationGroupService.listRotationGroups(client);

      if (result.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, result.status, result.response);
      }
      return R.handleSuccess(res, result.response);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'search_failed',
        message: error.message,
      });
    }
  },
);

router.post('/', TenantConfig.authenticate, Ensure.post(), async (req: Request, res: Response) => {
  try {
    const client = (req as any).client.reference;

    const result: any = await RotationGroupService.saveRotationGroups(client, req.body);

    if (result.status !== HttpStatus.CREATED) {
      return R.handleError(res, result.status, result.response);
    }
    return R.handleSuccess(res, result.response);
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'search_failed',
      message: error.message,
    });
  }
});

router.put(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.put(),
  async (req: Request, res: Response) => {
    try {
      const client = (req as any).client.reference;
      const { guid } = req.params;
      if (!guid) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'guid_required',
          message: 'GUID is required',
        });
      }

      if (!RotationGroupValidationUtils.validateGuid(guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'guid_invalid',
          message: 'GUID is invalid',
        });
      }

      const result: any = await RotationGroupService.updatedRotationGroups(client, guid, req.body);

      if (result.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, result.status, result.response);
      }
      return R.handleSuccess(res, result.response);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'search_failed',
        message: error.message,
      });
    }
  },
);

export default router;
