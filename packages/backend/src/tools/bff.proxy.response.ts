import type { Request, Response } from 'express';
import { HttpStatus } from '@toke/shared';
import R from '@toke/api/dist/tools/response.js';

import type { TenantApiResult } from '../services/tenant.api.proxy.service.js';

type TenantRequest = Request & {
  client?: {
    reference?: string;
  };
};

export function tenantReference(req: Request): string {
  const reference = (req as TenantRequest).client?.reference;

  if (!reference) {
    const error = new Error(
      'Tenant client reference is missing from the authenticated request.',
    ) as Error & { code?: string };

    error.code = 'BFF_TENANT_REFERENCE_MISSING';
    throw error;
  }

  return reference;
}

/**
 * Écrit la réponse HTTP puis termine.
 * Les helpers R.handle* du projet retournent void, pas express.Response.
 */
export function relayTenantApiResponse(res: Response, result: TenantApiResult<unknown>): void {
  if (result.status < 200 || result.status >= 300) {
    R.handleError(res, result.status as any, result.response as any);
    return;
  }

  if (result.status === HttpStatus.CREATED || result.status === 201) {
    R.handleCreated(res, result.response as any);
    return;
  }

  R.handleSuccess(res, result.response as any);
}

export function handleBffRouteError(res: Response, error: unknown, fallbackCode: string): void {
  const routeError = error as {
    code?: string;
    message?: string;
  };

  R.handleError(res, HttpStatus.INTERNAL_ERROR, {
    code: routeError?.code ?? fallbackCode,
    message: routeError?.message ?? 'Unexpected BFF error.',
  });
}
