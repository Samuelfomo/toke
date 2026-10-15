import { createApiClient } from '@toke/api/dist/utils/axios.config.js';

export default class TenantOnboardingService {
  static async forward(
    action:
      | 'status'
      | 'subscribe'
      | 'payment-methods'
      | 'estimate'
      | 'payment-initiate'
      | 'payment-attempt-status'
      | 'payment-attempt-refresh'
      | 'payment-attempt-list',
    token: string,
    body: unknown,
    attemptGuid?: number,
  ) {
    const paymentAction =
      action === 'payment-attempt-status' ||
      action === 'payment-attempt-refresh' ||
      action === 'payment-attempt-list';
    if (
      paymentAction &&
      (!Number.isInteger(attemptGuid) || attemptGuid! < 100000 || attemptGuid! > 999999)
    )
      return {
        status: 400,
        data: {
          success: false,
          error: { code: 'onboarding_payment_input_invalid', message: 'Invalid attempt GUID' },
        },
      };
    const target =
      action === 'payment-attempt-list'
        ? '/tenant-onboarding/payment-attempts?payment_transaction_guid=' + attemptGuid
        : paymentAction
          ? '/tenant-onboarding/payment-attempts/' +
            attemptGuid +
            (action === 'payment-attempt-refresh' ? '/refresh' : '')
          : '/tenant-onboarding/' + action;
    const base =
      process.env.NODE_ENV === 'development'
        ? `https://${process.env.MST_HOST}`
        : `http://${process.env.HOST}:${process.env.MST_PORT}`;
    const api = createApiClient(base, process.env.SECRET_KEY, process.env.API_KEY);
    const config = { headers: { 'x-onboarding-token': token }, timeout: 35000 };
    try {
      const r =
        action === 'status' ||
        action === 'payment-methods' ||
        action === 'payment-attempt-status' ||
        action === 'payment-attempt-list'
          ? await api.get(target, config)
          : await api.post(target, body, config);
      return { status: r.status, data: r.data };
    } catch (e: any) {
      const status = e.response?.status;
      if (Number.isInteger(status) && status >= 400 && status < 500)
        return { status, data: e.response.data };
      return {
        status: 503,
        data: {
          success: false,
          error: {
            code: 'onboarding_unavailable',
            message: 'Consult status before retrying with the same key',
          },
        },
      };
    }
  }
}
