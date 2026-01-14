import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import R from '@toke/api/dist/tools/response.js';
import { HttpStatus, USERS_CODES, USERS_ERRORS, UsersValidationUtils } from '@toke/shared';

import { TenantConfig } from '../tools/tenant.config.js';
import { SiteService } from '../services/site.service.js';

const router = Router();

router.get(
  '/list',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const client = (req as any).client.reference;

      const result: any = await SiteService.listSites(client);

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

router.get(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;

      // Vérification du GUID
      if (!guid || !UsersValidationUtils.validateGuid(String(guid))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.INVALID_GUID,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      const client = (req as any).client.reference;

      const result: any = await SiteService.getSite(client, String(guid));

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
