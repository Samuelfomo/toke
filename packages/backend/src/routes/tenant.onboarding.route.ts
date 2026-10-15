import { Router } from 'express';

import TenantOnboardingService from '../services/tenant.onboarding.service.js';

const router = Router();
for (const action of [
  'status',
  'subscribe',
  'payment-methods',
  'estimate',
  'payment-initiate',
] as const) {
  const handler = async (req: any, res: any) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const token = req.headers['x-onboarding-token'];
    if (typeof token !== 'string' || token.length > 2048)
      return res.status(401).json({
        success: false,
        error: { code: 'onboarding_token_required', message: 'Onboarding link required' },
      });
    try {
      const r = await TenantOnboardingService.forward(action, token, req.body);
      return res.status(r.status).json(r.data);
    } catch {
      return res.status(503).json({
        success: false,
        error: { code: 'onboarding_unavailable', message: 'Service unavailable' },
      });
    }
  };
  if (action === 'status' || action === 'payment-methods') router.get('/' + action, handler);
  else router.post('/' + action, handler);
}
export default router;

for (const [path, action] of [
  ['/payment-attempts/:guid', 'payment-attempt-status'],
  ['/payment-attempts/:guid/refresh', 'payment-attempt-refresh'],
] as const) {
  const handler = async (req: any, res: any) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const token = req.headers['x-onboarding-token'];
    if (typeof token !== 'string' || token.length > 2048)
      return res.status(401).json({
        success: false,
        error: { code: 'onboarding_token_required', message: 'Onboarding link required' },
      });
    try {
      const r = await TenantOnboardingService.forward(
        action,
        token,
        req.body,
        Number(req.params.guid),
      );
      return res.status(r.status).json(r.data);
    } catch {
      return res.status(503).json({
        success: false,
        error: {
          code: 'onboarding_unavailable',
          message: 'Consult attempt status before retrying',
        },
      });
    }
  };
  if (action === 'payment-attempt-status') router.get(path, handler);
  else router.post(path, handler);
}

router.get('/payment-attempts', async (req: any, res: any) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const token = req.headers['x-onboarding-token'];
  if (typeof token !== 'string' || token.length > 2048)
    return res.status(401).json({
      success: false,
      error: { code: 'onboarding_token_required', message: 'Onboarding link required' },
    });
  try {
    const r = await TenantOnboardingService.forward(
      'payment-attempt-list',
      token,
      undefined,
      Number(req.query.payment_transaction_guid),
    );
    return res.status(r.status).json(r.data);
  } catch {
    return res.status(503).json({
      success: false,
      error: { code: 'onboarding_unavailable', message: 'Service unavailable' },
    });
  }
});
