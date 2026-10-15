import { createApiClient } from '@toke/api/dist/utils/axios.config.js';

export default class KpayWebhookService {
  static async forward(raw: Buffer, signature: string, eventHeader?: string) {
    const base =
      process.env.NODE_ENV === 'development'
        ? `https://${process.env.MST_HOST}`
        : `http://${process.env.HOST}:${process.env.MST_PORT}`;
    const api = createApiClient(base, process.env.SECRET_KEY, process.env.API_KEY);
    try {
      const r = await api.post(
        '/kpay/webhook',
        {
          raw_body_base64: raw.toString('base64'),
          signature,
          ...(eventHeader ? { event_header: eventHeader } : {}),
        },
        { timeout: 2400 },
      );
      return r.status === 200 ? 200 : 503;
    } catch (e: any) {
      const status = e.response?.status;
      return [400, 401, 404, 409, 413].includes(status) ? status : 503;
    }
  }
}
