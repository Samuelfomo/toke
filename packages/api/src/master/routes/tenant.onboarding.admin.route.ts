import { Router } from 'express';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import TenantOnboarding, { OnboardingError } from '../class/TenantOnboarding.js';

const router = Router();
for (const action of ['invite', 'notify-ready'] as const)
  router.post('/:tenantGuid/' + action, Ensure.post(), async (req, res) => {
    try {
      if (!/^[1-9][0-9]{5}$/.test(String(req.params.tenantGuid)))
        throw new OnboardingError('Invalid tenant GUID');
      const service = new TenantOnboarding();
      return R.handleSuccess(
        res,
        action === 'invite'
          ? await service.invite(req.params.tenantGuid)
          : await service.notifyReady(req.params.tenantGuid),
      );
    } catch (e) {
      const detail = e as {
        status?: unknown;
        text?: unknown;
        message?: unknown;
      } | null;

      console.error('Onboarding admin failed:', {
        status: detail?.status,
        message:
          detail?.text ?? detail?.message ?? (typeof e === 'string' ? e : 'Erreur sans message'),
      });

      return R.handleError(res, e instanceof OnboardingError ? e.status : 500, {
        code: 'onboarding_admin_failed',
        message: e instanceof OnboardingError ? e.message : 'Notification unavailable',
      });
    }
  });
export default router;
