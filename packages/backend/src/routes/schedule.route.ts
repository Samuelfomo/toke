import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import R from '@toke/api/dist/tools/response.js';
import {
  HttpStatus,
  SESSION_TEMPLATE_CODES,
  SESSION_TEMPLATE_ERRORS,
  SessionTemplateValidationUtils,
} from '@toke/shared';

import { TenantConfig } from '../tools/tenant.config.js';
import { ScheduleService } from '../services/schedule.service.js';

const router = Router();

router.get(
  '/list',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const client = (req as any).client.reference;

      const result: any = await ScheduleService.listSchedules(client);

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
      if (!SessionTemplateValidationUtils.validateGuid(req.params.guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: SESSION_TEMPLATE_CODES.INVALID_GUID,
          message: SESSION_TEMPLATE_ERRORS.GUID_INVALID,
        });
      }

      const client = (req as any).client.reference;

      const result = await ScheduleService.getByGuid(req.params.guid as string, client);

      if (result.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, result.status, result.response);
      }
      return R.handleSuccess(res, result.response);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SESSION_TEMPLATE_CODES.SEARCH_FAILED,
        message: error.message,
      });
    }
  },
);

router.post('/', TenantConfig.authenticate, Ensure.post(), async (req: Request, res: Response) => {
  try {
    const client = (req as any).client.reference;

    const result: any = await ScheduleService.saveSchedule(client, req.body);

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

      const result: any = await ScheduleService.updatedSchedule(client, guid as string, req.body);

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

router.delete(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.delete(),
  async (req: Request, res: Response) => {
    try {
      if (!SessionTemplateValidationUtils.validateGuid(req.params.guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: SESSION_TEMPLATE_CODES.INVALID_GUID,
          message: SESSION_TEMPLATE_ERRORS.GUID_INVALID,
        });
      }

      const client = (req as any).client.reference;

      const result = await ScheduleService.delete(req.params.guid as string, client);

      if (result.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, result.status, result.response);
      }
      return R.handleSuccess(res, result.response);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SESSION_TEMPLATE_CODES.SEARCH_FAILED,
        message: error.message,
      });
    }
  },
);

export default router;
