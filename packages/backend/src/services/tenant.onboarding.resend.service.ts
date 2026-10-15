import { createApiClient } from '@toke/api/dist/utils/axios.config.js';

export default class TenantOnboardingResendService {
  static async request(email: string) {
    const base =
      process.env.NODE_ENV === 'development'
        ? `https://${process.env.MST_HOST}`
        : `http://${process.env.HOST}:${process.env.MST_PORT}`;
    const api = createApiClient(base, process.env.SECRET_KEY, process.env.API_KEY);
    try {
      const r = await api.post('/tenant-onboarding/resend', { email }, { timeout: 15000 });
      return { status: r.status, data: r.data };
    } catch (e: any) {
      return {
        status: e.response?.status === 400 ? 400 : 503,
        data: {
          success: false,
          error: {
            code: 'resend_unavailable',
            message: 'Demande indisponible ; réessayez plus tard',
          },
        },
      };
    }
  }
}
