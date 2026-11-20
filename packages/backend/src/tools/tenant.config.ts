import { NextFunction, Request, Response } from 'express';
import { HttpStatus } from '@toke/shared';
import R from '@toke/api/dist/tools/response.js';
import G from '@toke/api/dist/tools/glossary.js';

import { UserSessionService } from './user.session.js';

export class TenantConfig {
  static async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reference = TenantConfig.extractTenantReference(req);

      if (!reference) {
        R.handleError(res, HttpStatus.UNAUTHORIZED, G.clientReferenceRequired);
        return;
      }

      // 2. Add customer information to the request (depuis le cache)
      (req as any).client = {
        reference: reference,
      };

      // 3. Continue to the next
      next();
    } catch (error: any) {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, [error.message]);
    }
  }

  static async authenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(req.header('authorization') || '');
      if (!match || req.header('x-integrator-context')) {
        R.handleError(res, 401, { code: 'user_token_required', message: 'Verified manager session required' });
        return;
      }
      const reference = (req as any).client?.reference;
      if (!reference) {
        R.handleError(res, 403, { code: 'tenant_session_mismatch' });
        return;
      }
      const session = await UserSessionService.verify(match[1], String(reference));
      (req as any).authenticatedUserGuid = session.userGuid;
      res.locals.userSession = session;
      next();
    } catch (error: any) {
      R.handleError(res, error.status === 401 || error.status === 403 ? error.status : 503,
        { code: error.code || 'session_authority_unavailable', message: 'User session not authorized' });
    }
  }

  /**
   * Extrait la reference depuis les headers de la requête
   */
  private static extractTenantReference(req: Request): string | null {
    // Chercher dans différents headers possibles
    const apiClientHeader = req.headers['x-api-client'] as string;
    const referenceHeader = req.headers['x-api-reference'] as string;

    // Headers directs
    if (apiClientHeader) {
      return apiClientHeader.trim();
    }

    if (referenceHeader) {
      return referenceHeader.trim();
    }

    return null;
  }
}
