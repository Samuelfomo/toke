import { createApiClient } from '@toke/api/dist/utils/axios.config.js';
import type { AxiosRequestConfig } from 'axios';

const masterUrl =
  process.env.NODE_ENV === 'development'
    ? `https://${process.env.MST_HOST}`
    : `http://${process.env.HOST}:${process.env.MST_PORT}`;

// Même mécanisme de signature que les services existants du backend.
const api = createApiClient(masterUrl, process.env.SECRET_KEY, process.env.API_KEY);

export class IntegratorService {
  static async forward(method: 'get' | 'post', path: string, token?: string, body?: unknown) {
    const config: AxiosRequestConfig = {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    };
    try {
      const response =
        method === 'get'
          ? await api.get(`/integrator${path}`, config)
          : await api.post(`/integrator${path}`, body ?? {}, config);
      return { status: response.status, data: response.data };
    } catch (error: any) {
      if (error.response) return { status: error.response.status, data: error.response.data };
      console.error('[integrator] Erreur communication API master:', error.message);
      return { status: 503, data: { message: 'Service temporairement indisponible' } };
    }
  }
}
