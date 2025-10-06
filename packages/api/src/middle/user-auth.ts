import { NextFunction, Request, Response } from 'express';
import {
  HttpStatus,
  TIME_ENTRIES_CODES,
  USERS_CODES,
  USERS_ERRORS,
  UsersValidationUtils,
} from '@toke/shared';

import R from '../tools/response.js';
import G from '../tools/glossary.js';
import User from '../tenant/class/User.js';

export class UserAuth {
  static async timeEntriesAuthenticate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // 1. Extraction du PIN depuis les headers
      const headerPin = UserAuth.extractPin(req);
      if (!headerPin) {
        R.handleError(res, HttpStatus.UNAUTHORIZED, G.authenticatorMissing);
        return;
      }

      // 2. Vérification du GUID utilisateur
      const { user } = req.body;
      if (!UsersValidationUtils.validateGuid(user)) {
        R.handleError(res, HttpStatus.BAD_REQUEST, G.authenticatorMissing);
        return;
      }

      // 3. Chargement de l'utilisateur
      const userObj = await User._load(user, true);
      if (!userObj) {
        R.handleError(res, HttpStatus.NOT_FOUND, {
          code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
        return;
      }

      // 4. Vérification du PIN (asynchrone)
      const isValidPin = await userObj.verifyPin(headerPin);
      if (!isValidPin) {
        R.handleError(res, HttpStatus.UNAUTHORIZED, {
          code: USERS_CODES.PIN_INVALID,
          message: USERS_ERRORS.PIN_VERIFICATION_FAILED,
        });
        return;
      }

      // ✅ Ajouter l'ID utilisateur dans la requête
      (req as any).userId = userObj.getId()!;

      // 5. Authentification réussie → continuer
      next();
    } catch (error: any) {
      console.error('❌ Erreur middleware auth:', error);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, [error.message]);
    }
  }

  // private static extractPin(req: Request): string | null {
  //   // Chercher dans différents headers possibles
  //   const apiUserHeader = req.headers['x-api-user'] as string;
  //   const apiPinHeader = req.headers['x-api-pin'] as string;
  //   if (apiUserHeader) return apiUserHeader.trim();
  //   if (apiPinHeader) return apiPinHeader.trim();
  //   // Chercher dans le body
  //   if (req.body?.pin) return String(req.body.pin).trim();
  //
  //   return null;
  // }
  private static extractPin(req: Request): string | null {
    // Sécurité : vérifier que req.body est un objet
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    // Chercher dans les headers (priorité)
    const apiUserHeader = req.headers['x-api-user'];
    const apiPinHeader = req.headers['x-api-pin'];

    if (typeof apiUserHeader === 'string' && apiUserHeader.trim()) {
      return apiUserHeader.trim();
    }

    if (typeof apiPinHeader === 'string' && apiPinHeader.trim()) {
      return apiPinHeader.trim();
    }

    // Chercher dans le body
    if (typeof body.pin === 'string' && body.pin.trim()) {
      return body.pin.trim();
    }

    return null;
  }
}
