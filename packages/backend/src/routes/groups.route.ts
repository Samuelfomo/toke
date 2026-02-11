import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import R from '@toke/api/dist/tools/response.js';
import {
  HttpStatus,
  SessionTemplateValidationUtils,
  USERS_CODES,
  USERS_ERRORS,
  UsersValidationUtils,
} from '@toke/shared';

import { TenantConfig } from '../tools/tenant.config.js';
import { GroupsService } from '../services/groups.service.js';

const router = Router();

router.get(
  '/manager/:manager/list',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const client = (req as any).client.reference;

      const { manager } = req.params;
      if (!UsersValidationUtils.validateGuid(manager)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.INVALID_GUID,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      const result: any = await GroupsService.listManagerGroups(client, manager);

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

    const result: any = await GroupsService.saveManagerGroup(client, req.body);

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

      if (!SessionTemplateValidationUtils.validateGuid(guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'guid_invalid',
          message: 'GUID is invalid',
        });
      }

      const result: any = await GroupsService.updatedManagerGroup(client, guid, req.body);

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
