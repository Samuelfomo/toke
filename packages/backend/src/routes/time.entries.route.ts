import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import R from '@toke/api/dist/tools/response.js';
import {
  HttpStatus,
  ORG_HIERARCHY_CODES,
  ORG_HIERARCHY_ERRORS,
  UsersValidationUtils,
} from '@toke/shared';

import { TenantConfig } from '../tools/tenant.config.js';
import { TimeEntriesService } from '../services/time.entries.service.js';

const router = Router();

router.get(
  '/attendance/team',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { manager } = req.query;

      // Vérification du GUID
      if (!manager || !UsersValidationUtils.validateGuid(String(manager))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ORG_HIERARCHY_CODES.INVALID_GUID,
          message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
        });
      }

      const client = (req as any).client.reference;

      const result: any = await TimeEntriesService.listEntriesTeamManager(client, String(manager));

      if (result.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, result.status, result.response.error);
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
