import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import R from '@toke/api/dist/tools/response.js';
import { HttpStatus, TENANT_CODES, TENANT_ERRORS, TenantValidationUtils } from '@toke/shared';

import { TenantService } from '../services/tenant.service.js';
import { UserSessionService } from '../tools/user.session.js';

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
      return R.handleError(res, result.status, {
        result: result.response.error,
        response: result,
      });
    }
    return R.handleCreated(res, result.response);
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TENANT_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

router.post('/retry', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validations
    if (!email) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.BILLING_EMAIL_REQUIRED,
        message: TENANT_ERRORS.BILLING_EMAIL_REQUIRED,
      });
    }
    if (!TenantValidationUtils.validateBillingEmail(email)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TENANT_CODES.BILLING_EMAIL_INVALID,
        message: TENANT_ERRORS.BILLING_EMAIL_INVALID,
      });
    }

    const result: any = await TenantService.retryAuthenticate(email);

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
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { otp } = req.params;

    if (!otp) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'otp_required',
        message: 'OTP is required',
      });
    }

    // Valider le format de l'OTP (6 chiffres)
    if (!/^\d{6}$/.test(otp as string)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'otp_invalid_format',
        message: 'OTP must be 6 digits',
      });
    }

    const result: any = await TenantService.loadTenant(otp as string);

    if (result.status !== HttpStatus.SUCCESS) {
      return R.handleError(res, result.status, result.response.error);
    }
    // return R.handleSuccess(res, result.response);
    const authData = result.response as {
      user?: { guid?: string };
      tenant?: { guid?: string };
      [key: string]: any;
    };

    if (!authData.user?.guid || !authData.tenant?.guid) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'invalid_auth_response',
        message: 'Authenticated user or tenant is missing',
      });
    }

    if (typeof authData.access_token !== 'string' || authData.token_type !== 'Bearer' || authData.expires_in !== 86400) {
      return R.handleError(res, HttpStatus.UNAUTHORIZED, { code: 'invalid_auth_response', message: 'Registered session required' });
    }
    // BFF independently checks the proof issued by Master; it cannot mint from a GUID.
    await UserSessionService.verify(authData.access_token, String(authData.tenant.guid));

    return R.handleSuccess(res, {
      ...authData,
      access_token: authData.access_token,
      token_type: 'Bearer',
      expires_in: 86400,
    });
  } catch (error: any) {
    return R.handleError(res, (error.status === 401 || error.status === 403) ? error.status : 503, {
      code: 'verification_failed',
      message: 'Session verification failed',
    });
  }
});

router.post('/session/logout', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const token = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(req.header('authorization') || '')?.[1];
  if (!token) return R.handleError(res, 401, { code: 'user_token_required' });
  try {
    await UserSessionService.logout(token);
    res.setHeader('Cache-Control', 'no-store');
    return R.handleSuccess(res, { revoked: true });
  } catch (error: any) {
    return R.handleError(res, error.status === 401 ? 401 : 503, { code: 'session_revocation_unconfirmed' });
  }
});

export default router;
