import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

import { useUserStore } from '@/stores/userStore';
import { integratorStorage } from '@/service/IntegratorService';

const baseURL = `https://${import.meta.env.VITE_URL}`;

interface ApiRequestConfig extends AxiosRequestConfig {
  path: string;
}

// Axios-only metadata, never an HTTP header or authentication credential.
const currentMemoSession = (): string => {
  const user = useUserStore();
  return JSON.stringify([user.tenant?.guid, user.user?.guid, user.sessionGeneration]);
};
export const memoRequestScope = (): { memoSession: string } => ({
  memoSession: currentMemoSession(),
});

export class ApiClientError<TDetails = unknown> extends Error {
  readonly status?: number;
  readonly code: string;
  readonly details?: TDetails;
  readonly payload?: unknown;

  constructor(options: {
    message: string;
    code?: string;
    status?: number;
    details?: TDetails;
    payload?: unknown;
  }) {
    super(options.message);
    this.name = 'ApiClientError';
    this.status = options.status;
    this.code = options.code ?? 'request_failed';
    this.details = options.details;
    this.payload = options.payload;
  }
}

const axiosClient: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const scoped = config as typeof config & { memoSession?: string };
  if (scoped.memoSession !== undefined && scoped.memoSession !== currentMemoSession()) {
    throw new ApiClientError({ code: 'memo_session_changed', message: 'La session du mémo a changé.' });
  }
  delete scoped.memoSession;
  const userStore = useUserStore();

  if (userStore.tenant?.guid) {
    config.headers['x-api-client'] = userStore.tenant.guid;
  }

  const context = integratorStorage.context();
  const integratorToken = integratorStorage.token();

  if (context && integratorToken) {
    config.headers['x-integrator-context'] = context;
    config.headers['Authorization'] = `Bearer ${integratorToken}`;
  } else {
    const userToken = localStorage.getItem('auth_token');

    if (userToken) {
      config.headers['Authorization'] = `Bearer ${userToken}`;
    }
  }

  return config;
});

axiosClient.interceptors.response.use(response => response, error => {
  const sentAuthorization = error?.config?.headers?.Authorization;
  const token = localStorage.getItem('auth_token');
  const code = error?.response?.data?.error?.code;
  const publicAuthentication = /^\/tenant\/(auth|retry|verify-otp)(\/|$)/.test(error?.config?.url ?? '');
  // Ignore unrelated permissions failures, delegated contexts, and stale requests.
  if (!publicAuthentication && token && sentAuthorization === `Bearer ${token}` &&
      !error?.config?.headers?.['x-integrator-context'] &&
      (error?.response?.status === 401 ||
       (error?.response?.status === 403 && code === 'tenant_session_mismatch'))) {
    useUserStore().invalidateSession();
  }
  return Promise.reject(error);
});

const extractApiError = (payload: any) => {
  const nestedError = payload?.error?.error;
  const directError = payload?.error;
  const apiError = nestedError ?? directError ?? payload;
  return {
    code: apiError?.code ?? 'request_failed',
    message: apiError?.message ?? payload?.message ?? 'Une erreur inattendue est survenue.',
    details: apiError?.details,
  };
};

export const apiRequest = async <T = unknown>({
  path,
  ...config
}: ApiRequestConfig): Promise<T> => {
  try {
    const response = await axiosClient({
      url: path,
      ...config,
      ...(path === '/memo' || path.startsWith('/memo/') ? memoRequestScope() : {}),
    });

    return response.data;
  } catch (error: any) {
    if (error instanceof ApiClientError) throw error;
    const status = error?.response?.status;
    const payload = error?.response?.data;
    const apiError = extractApiError(payload);

    throw new ApiClientError({
      status,
      code: apiError.code,
      message: apiError.message || error?.message || 'Erreur réseau.',
      details: apiError.details,
      payload,
    });
  }
};

export default axiosClient;
