import { NextFunction, Request, Response } from 'express';
import { HttpStatus } from '@toke/shared';
import R from '@toke/api/dist/tools/response.js';
import G from '@toke/api/dist/tools/glossary.js';

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
