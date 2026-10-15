import { Router } from 'express';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import TenantOnboardingResend from '../class/TenantOnboardingResend.js';

const router = Router();
router.post('/resend', Ensure.post(), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    return R.handleSuccess(res, await new TenantOnboardingResend().request(req.body));
  } catch (e) {
    return R.handleError(res, e instanceof Error && e.message === 'INVALID_EMAIL' ? 400 : 503, {
      code:
        e instanceof Error && e.message === 'INVALID_EMAIL'
          ? 'invalid_email'
          : 'resend_unavailable',
      message:
        e instanceof Error && e.message === 'INVALID_EMAIL'
          ? 'Adresse email valide requise'
          : 'Service momentanément indisponible',
    });
  }
});
export default router;
