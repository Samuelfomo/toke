import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import { Request, Response, Router } from 'express';
import R from '@toke/api/dist/tools/response.js';
import { HttpStatus, MEMOS_CODES, MEMOS_ERRORS } from '@toke/shared';

import { TenantConfig } from '../tools/tenant.config.js';
import { UserService } from '../services/user.service.js';

const router = Router();

router.get('/', TenantConfig.authenticate, Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    console.log(url);
    if (!url) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.AUTHOR_USER_REQUIRED,
        message: MEMOS_ERRORS.AUTHOR_USER_REQUIRED,
      });
    }

    const client = (req as any).client.reference;

    const result: any = await UserService.loadFiles(client, String(url));

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
});

export default router;
