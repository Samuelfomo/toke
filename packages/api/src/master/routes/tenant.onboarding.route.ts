import { Router } from 'express';
import { HttpStatus } from '@toke/shared';

import { PaymentAttemptError } from '../class/payment-attempt-contract.js';
import { KpayClientError } from '../services/kpay-client.js';
import { OnboardingCommercialError } from '../class/onboarding-commercial.js';
import { LicenseSubscriptionInputError } from '../class/license-subscription-input.js';
import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import TenantOnboarding, { OnboardingError } from '../class/TenantOnboarding.js';

const router = Router();
function token(req: any) {
  return req.headers['x-onboarding-token'];
}
function fail(res: any, e: any) {
  if (e instanceof PaymentAttemptError)
    return R.handleError(res, e.status, {
      code: 'onboarding_payment_conflict',
      message: e.message,
    });
  if (e instanceof KpayClientError)
    return R.handleError(res, 503, {
      code: 'onboarding_payment_unavailable',
      message: 'Payment service unavailable; consult attempt status before retrying',
    });
  if (e instanceof OnboardingCommercialError)
    return R.handleError(res, e.status, { code: e.code, message: e.message });
  if (e instanceof LicenseSubscriptionInputError)
    return R.handleError(res, 400, { code: 'onboarding_input_invalid', message: e.message });
  if (e instanceof OnboardingError)
    return R.handleError(res, e.status, {
      code:
        e.status === 401
          ? 'onboarding_link_invalid_or_expired'
          : e.status === 409
            ? 'onboarding_subscription_conflict'
            : 'onboarding_invalid',
      message: e.message,
    });
  const status = Number(e?.status);
  console.error('Onboarding operation failed:', {
    name: e?.name,
    status: Number.isInteger(status) ? status : undefined,
  });
  return R.handleError(
    res,
    Number.isInteger(status) && status >= 400 && status < 500 ? status : HttpStatus.INTERNAL_ERROR,
    {
      code:
        status === 409
          ? 'onboarding_subscription_conflict'
          : status === 400
            ? 'onboarding_subscription_invalid'
            : 'onboarding_failed',
      message:
        status === 409
          ? 'Subscription conflict; consult status'
          : status === 400
            ? 'Subscription parameters unavailable or invalid'
            : 'Operation unavailable; consult status before retrying',
    },
  );
}
// Both routes remain behind global ServerAuth. The BFF forwards a validated link token.
router.get('/status', Ensure.get(), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    return R.handleSuccess(res, await new TenantOnboarding().status(token(req)));
  } catch (e) {
    return fail(res, e);
  }
});
router.post('/subscribe', Ensure.post(), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    return R.handleSuccess(res, await new TenantOnboarding().subscribe(token(req), req.body));
  } catch (e) {
    return fail(res, e);
  }
});
router.post('/estimate', Ensure.post(), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    return R.handleSuccess(res, await new TenantOnboarding().estimate(token(req), req.body));
  } catch (e) {
    return fail(res, e);
  }
});
export default router;

router.get('/payment-methods', Ensure.get(), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    return R.handleSuccess(res, await new TenantOnboarding().methods(token(req)));
  } catch (e) {
    return fail(res, e);
  }
});

router.post('/payment-initiate', Ensure.post(), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    return R.handleSuccess(res, await new TenantOnboarding().initiatePayment(token(req), req.body));
  } catch (e) {
    return fail(res, e);
  }
});
router.get('/payment-attempts/:guid', Ensure.get(), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    return R.handleSuccess(
      res,
      await new TenantOnboarding().paymentAttemptStatus(token(req), Number(req.params.guid)),
    );
  } catch (e) {
    return fail(res, e);
  }
});
router.post('/payment-attempts/:guid/refresh', Ensure.post(), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.body && Object.keys(req.body).length)
      throw new PaymentAttemptError('Empty body expected', 400);
    return R.handleSuccess(
      res,
      await new TenantOnboarding().refreshPaymentAttempt(token(req), Number(req.params.guid)),
    );
  } catch (e) {
    return fail(res, e);
  }
});

router.get('/payment-attempts', Ensure.get(), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    return R.handleSuccess(
      res,
      await new TenantOnboarding().listPaymentAttempts(
        token(req),
        Number(req.query.payment_transaction_guid),
      ),
    );
  } catch (e) {
    return fail(res, e);
  }
});
