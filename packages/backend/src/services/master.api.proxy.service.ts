import { createApiClient } from '@toke/api/dist/utils/axios.config.js';

import type { ApiErrorPayload, TenantApiHttpMethod, TenantApiResult } from './tenant.api.proxy.service.js';

export interface MasterApiRequestOptions {
  method: TenantApiHttpMethod;
  url: string;
  data?: unknown;
  params?: unknown;
}

function masterBaseUrl(): string {
  return process.env.NODE_ENV === 'development'
    ? `https://${process.env.MST_HOST}`
    : `http://${process.env.HOST}:${process.env.MST_PORT}`;
}

function normalizeUpstreamError(payload: unknown, fallbackMessage: string): ApiErrorPayload {
  const source =
    payload && typeof payload === 'object' && 'error' in payload
      ? (payload as { error?: unknown }).error
      : payload;

  if (source && typeof source === 'object') {
    const error = source as {
      code?: unknown;
      message?: unknown;
      details?: unknown;
    };

    return {
      code: typeof error.code === 'string' ? error.code : 'UPSTREAM_API_ERROR',
      message: typeof error.message === 'string' ? error.message : fallbackMessage,
      ...(error.details !== undefined ? { details: error.details } : {}),
    };
  }

  return {
    code: 'UPSTREAM_API_ERROR',
    message: typeof source === 'string' ? source : fallbackMessage,
  };
}

/**
 * Exécute une requête vers l'API master.
 * Cette fonction n'est jamais exposée directement au frontend : les routes BFF
 * appliquent d'abord TenantConfig.authenticate puis les contrôles d'appartenance.
 */
export async function masterApiRequest<T = Record<string, unknown>>(
  request: MasterApiRequestOptions,
): Promise<TenantApiResult<T>> {
  try {
    const api = createApiClient(
      masterBaseUrl(),
      process.env.SECRET_KEY as string,
      process.env.API_KEY as string,
    );

    const response = await api.request({
      method: request.method,
      url: request.url,
      data: request.data,
      params: request.params,
    });

    return {
      status: response.status,
      response: (response.data?.data ?? response.data) as T,
    };
  } catch (error: unknown) {
    const requestError = error as {
      message?: string;
      response?: {
        status: number;
        data?: unknown;
      };
      request?: unknown;
    };

    if (requestError.response) {
      return {
        status: requestError.response.status,
        response: normalizeUpstreamError(
          requestError.response.data,
          `The master API returned HTTP ${requestError.response.status}.`,
        ),
      };
    }

    if (requestError.request) {
      return {
        status: 503,
        response: {
          code: 'MASTER_API_UNAVAILABLE',
          message: 'No response was received from the master API.',
          details: requestError.message,
        },
      };
    }

    return {
      status: 500,
      response: {
        code: 'BFF_MASTER_REQUEST_FAILED',
        message: 'The BFF could not prepare the master API request.',
        details: requestError.message,
      },
    };
  }
}
