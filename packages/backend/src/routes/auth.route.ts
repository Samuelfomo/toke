import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import R from '@toke/api/dist/tools/response.js';
import { HttpStatus } from '@toke/shared';

import { AuthService } from '../services/auth.service.js';

const router = Router();

router.get('/qr/init', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const result = await AuthService.initQrSession();

    if (result.status !== HttpStatus.SUCCESS) {
      return R.handleError(res, result.status, result.response.error || result.response);
    }
    return R.handleSuccess(res, result.response);
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'qr_init_failed',
      message: error.message,
    });
  }
});

router.post('/qr/verify', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { signature, sessionId } = req.body;

    if (!signature) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'signature_required',
        message: 'Signature is required',
      });
    }
    if (!sessionId) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'session_id_required',
        message: 'Session ID is required',
      });
    }

    const result = await AuthService.verifyQr(signature, sessionId);

    if (result.status !== HttpStatus.CREATED) {
      return R.handleError(res, result.status, result.response.error || result.response);
    }
    return R.handleCreated(res, result.response);
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'qr_verify_failed',
      message: error.message,
    });
  }
});

export default router;
