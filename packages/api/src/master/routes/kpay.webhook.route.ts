import { Router } from 'express';

import Ensure from '../../middle/ensured-routes.js';
import KpayWebhook from '../class/KpayWebhook.js';
import { KpayWebhookError } from '../services/kpay-webhook-signature.js';
import { PaymentAttemptError } from '../class/payment-attempt-contract.js';

const router = Router();
// Global ServerAuth remains mandatory. Only the BFF sends this raw-body envelope.
router.post('/webhook', Ensure.post(), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    return res.status(200).json(await new KpayWebhook().receive(req.body));
  } catch (e) {
    const status =
      e instanceof KpayWebhookError || e instanceof PaymentAttemptError ? e.status : 503;
    return res.status(status).json({
      received: false,
      error: { code: status === 503 ? 'kpay_webhook_unavailable' : 'kpay_webhook_rejected' },
    });
  }
});
export default router;
