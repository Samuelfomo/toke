import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  ORG_HIERARCHY_CODES,
  ORG_HIERARCHY_ERRORS,
  TimezoneConfigUtils,
  UsersValidationUtils,
} from '@toke/shared';
import R from '@toke/api/dist/tools/response.js';

import { TenantConfig } from '../tools/tenant.config.js';
import { AttendanceService } from '../services/attendance.service.js';

const router = Router();

router.get(
  '/statistics/overview',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { manager, start_date, end_date, site } = req.query;

      console.log('data received: ', manager, start_date, end_date, site);
      // Vérification du GUID
      if (!manager || !UsersValidationUtils.validateGuid(String(manager))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ORG_HIERARCHY_CODES.INVALID_GUID,
          message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
        });
      }

      if (site && !UsersValidationUtils.validateGuid(String(site))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ORG_HIERARCHY_CODES.INVALID_GUID,
          message: 'Site id invalid',
        });
      }

      const client = (req as any).client.reference;
      let start = start_date || TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];
      let end = end_date || TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];

      const result: any = await AttendanceService.listAttendanceTeamManager(
        client,
        String(manager),
        String(start),
        String(end),
        site ? String(site) : undefined,
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
