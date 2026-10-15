import { Router } from 'express';
import Limit from '@toke/api/dist/tools/onboarding-resend-limit.js';

import TenantOnboardingResendService from '../services/tenant.onboarding.resend.service.js';

const router = Router();
router.post('/resend', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (
    !email ||
    email.length > 254 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    Object.keys(req.body).some((k) => k !== 'email')
  )
    return res.status(400).json({
      success: false,
      error: { code: 'invalid_email', message: 'Adresse email valide requise' },
    });
  try {
    // Configure Express trust proxy to trusted proxy hops; never take X-Forwarded-For directly.
    if (!(await Limit.allow('IP', req.ip || req.socket.remoteAddress || 'unknown')))
      return res.status(429).json({
        success: false,
        error: {
          code: 'resend_rate_limited',
          message: 'Trop de demandes ; réessayez dans une minute',
        },
      });
    const r = await TenantOnboardingResendService.request(email);
    return res.status(r.status).json(r.data);
  } catch {
    return res.status(503).json({
      success: false,
      error: { code: 'resend_unavailable', message: 'Service momentanément indisponible' },
    });
  }
});
export default router;
