import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import R from '@toke/api/dist/tools/response.js';
import { HttpStatus, TENANT_CODES, TENANT_ERRORS, TenantValidationUtils } from '@toke/shared';

import { TenantService } from '../services/tenant.service.js';

const router = Router();

router.post('/auth', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    // Validations
    if (!email) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.BILLING_EMAIL_REQUIRED,
        message: TENANT_ERRORS.BILLING_EMAIL_REQUIRED,
      });
    }
    if (!code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.KEY_REQUIRED,
        message: TENANT_ERRORS.KEY_REQUIRED,
      });
    }
    if (!TenantValidationUtils.validateBillingEmail(email)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.BILLING_EMAIL_INVALID,
        message: TENANT_ERRORS.BILLING_EMAIL_INVALID,
      });
    }
    if (!TenantValidationUtils.validateKey(code)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.KEY_INVALID,
        message: TENANT_ERRORS.KEY_INVALID,
      });
    }
    const data = {
      email,
      code,
    };

    const result: any = await TenantService.authenticate(data);

    if (result.status !== HttpStatus.CREATED) {
      return R.handleError(res, result.status, result.response.error);
    }
    return R.handleCreated(res, result.response);
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TENANT_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

router.get('/verify-otp/:otp', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { otp } = req.params;

    if (!otp) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'otp_required',
        message: 'OTP is required',
      });
    }

    // Valider le format de l'OTP (6 chiffres)
    if (!/^\d{6}$/.test(otp)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'otp_invalid_format',
        message: 'OTP must be 6 digits',
      });
    }

    const result: any = await TenantService.loadTenant(otp);

    if (result.status !== HttpStatus.SUCCESS) {
      return R.handleError(res, result.status, result.response.error);
    }
    return R.handleCreated(res, result.response);
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'verification_failed',
      message: error.message,
    });
  }
});

export default router;
