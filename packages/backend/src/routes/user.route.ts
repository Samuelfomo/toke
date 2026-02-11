import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import R from '@toke/api/dist/tools/response.js';
import {
  HttpStatus,
  ORG_HIERARCHY_CODES,
  ORG_HIERARCHY_ERRORS,
  TimezoneConfigUtils,
  UsersValidationUtils,
} from '@toke/shared';

import { UserService } from '../services/user.service.js';
import { TenantConfig } from '../tools/tenant.config.js';

const router = Router();

router.get(
  '/employee/all-subordinates',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { supervisor } = req.query;

      // Vérification du GUID
      if (!supervisor || !UsersValidationUtils.validateGuid(String(supervisor))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ORG_HIERARCHY_CODES.INVALID_GUID,
          message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
        });
      }

      const client = (req as any).client.reference;

      const result: any = await UserService.listTeamManager(client, String(supervisor));

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
  '/attendance/stat',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { supervisor, start_date, end_date } = req.query;

      // Vérification du GUID
      if (!supervisor || !UsersValidationUtils.validateGuid(String(supervisor))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ORG_HIERARCHY_CODES.INVALID_GUID,
          message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
        });
      }

      const client = (req as any).client.reference;
      let start = start_date || TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];
      let end = end_date || TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];

      const result: any = await UserService.listAttendanceTeamManager(
        client,
        String(supervisor),
        String(start),
        String(end),
      );

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
