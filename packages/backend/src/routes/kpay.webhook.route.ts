import express, { Router } from 'express';

import KpayWebhookService from '../services/kpay.webhook.service.js';

const router = Router();
// Must be mounted before express.json(). Inflation disabled: preserve the signed octets.
router.post(
  '/webhook',
  express.raw({ type: 'application/json', limit: '64kb', inflate: false }),
  async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const signature = req.headers['x-kpay-signature'],
      eventHeader = req.headers['x-kpay-event'];
    if (
      !Buffer.isBuffer(req.body) ||
      typeof signature !== 'string' ||
      !/^[a-fA-F0-9]{64}$/.test(signature) ||
      (eventHeader != null && typeof eventHeader !== 'string')
    )
      return res.status(400).json({ received: false });
    try {
      const status = await KpayWebhookService.forward(
        req.body,
        signature,
        eventHeader as string | undefined,
      );
      return res.status(status).json({ received: status === 200 });
    } catch {
      return res.status(503).json({ received: false });
    }
  },
);
export default router;
