import { getApiClient } from '../tools/api.factory.js';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface TenantApiResult<T = Record<string, unknown>> {
  status: number;
  response: T | ApiErrorPayload;
}

export type TenantApiHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface TenantApiRequestOptions {
  method: TenantApiHttpMethod;
  url: string;
  data?: unknown;
  params?: unknown;
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
 * Exécute une requête vers l'API tenant et normalise la réponse pour le BFF.
 *
 * API attendue :
 * - succès : { success: true, data: ... }
 * - erreur  : { success: false, error: { code, message, details? } }
 */
export async function tenantApiRequest<T = Record<string, unknown>>(
  reference: string,
  request: TenantApiRequestOptions,
): Promise<TenantApiResult<T>> {
  try {
    const api = await getApiClient(reference);
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
          `The upstream API returned HTTP ${requestError.response.status}.`,
        ),
      };
    }

    if (requestError.request) {
      return {
        status: 503,
        response: {
          code: 'UPSTREAM_API_UNAVAILABLE',
          message: 'No response was received from the tenant API.',
          details: requestError.message,
        },
      };
    }

    return {
      status: 500,
      response: {
        code: 'BFF_UPSTREAM_REQUEST_FAILED',
        message: 'The BFF could not prepare the upstream API request.',
        details: requestError.message,
      },
    };
  }
}
