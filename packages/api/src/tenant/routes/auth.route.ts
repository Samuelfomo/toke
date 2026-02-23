import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  USER_ROLES_CODES,
  USER_ROLES_ERRORS,
  UsersValidationUtils,
} from '@toke/shared';

import R from '../../tools/response.js';
import User from '../class/User.js';
import AuthCacheService from '../../tools/auth.cache.service.js';
import { ApiKeyManager } from '../../tools/api-key-manager.js';
import { DatabaseEncryption } from '../../utils/encryption.js';
import OrgHierarchy from '../class/OrgHierarchy.js';
import GenericCacheService from '../../tools/cache.data.service.js';
import GenerateOtp from '../../utils/generate.otp.js';
import EmailSender from '../../tools/send.email.service.js';
import Role from '../class/Role.js';
import { RoleValues } from '../../utils/response.model.js';
import UserRole from '../class/UserRole.js';
import { UserAuthenticationService } from '../../tools/user.authentication.service.js';

const router = Router();

// ============================================
// 📘 CODES ET MESSAGES D'ERREUR
// ============================================
const AUTH_QR_CODES = {
  SESSION_CREATION_FAILED: 'session_creation_failed',
  SESSION_NOT_FOUND: 'session_not_found',
  SESSION_EXPIRED: 'session_expired',
  SESSION_ALREADY_USED: 'session_already_used',
  INVALID_SESSION_ID: 'invalid_session_id',
  INVALID_SIGNATURE: 'invalid_signature',
  USER_NOT_FOUND: 'user_not_found',
  UNAUTHORIZED: 'unauthorized',
  VERIFICATION_FAILED: 'verification_failed',
};

const AUTH_QR_ERRORS = {
  SESSION_CREATION_FAILED: 'Failed to create QR authentication session',
  SESSION_NOT_FOUND: 'QR session not found or expired',
  SESSION_EXPIRED: 'QR code has expired',
  SESSION_ALREADY_USED: 'This QR code has already been used',
  INVALID_SESSION_ID: 'Invalid session ID format',
  INVALID_SIGNATURE: 'Invalid signature - authentication failed',
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'User not authorized for QR authentication',
  VERIFICATION_FAILED: 'Failed to verify QR authentication',
};

// ============================================
// ÉTAPE 2 : VÉRIFICATION MOBILE (APP TOKE)
// ============================================

/**
 * POST /api/auth/qr/verify
 *
 * Vérifie l'authentification depuis l'app mobile
 *
 * Flux :
 * 1. Récupère sessionId et signature depuis l'app
 * 2. Récupère le nonce depuis le cache
 * 3. Vérifie la signature HMAC(userId|sessionId, nonce)
 * 4. Si valide → marque session comme "authenticated"
 * 5. Génère JWT pour le navigateur
 * 6. Notifie le navigateur via WebSocket
 *
 * Body :
 * {
 *   "sessionId": "uuid",
 *   "userId": "user-guid",
 *   "signature": "hmac-sha256"
 * }
 */
router.post('/qr/verify', async (req: Request, res: Response) => {
  try {
    const { signature } = req.body;

    if (!signature || typeof signature !== 'string') {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'signature_required',
        message: 'Signature is required',
      });
    }

    // ============================================
    // 3️⃣ VÉRIFIER LA SIGNATURE
    // ============================================
    const tenant = (req as any).tenant;

    const reference = tenant.config.reference;
    const qrGenerator = DatabaseEncryption.decryptToObject(signature, reference);

    console.log('qrGenerator', qrGenerator.sessionId);

    // ============================================
    // 2️⃣ RÉCUPÉRER LA SESSION
    // ============================================
    // const session = await AuthCacheService.getSession(qrGenerator.sessionId);
    const session = await UserAuthenticationService.loadSession(qrGenerator.sessionId);

    console.log('session', session);
    const response: any = session.response;

    if (session.status !== HttpStatus.SUCCESS) {
      return R.handleError(res, session.status, response.error || {});
    }

    // Vérifier que la session est bien en attente
    if (response.status !== 'pending') {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: AUTH_QR_CODES.SESSION_ALREADY_USED,
        message: AUTH_QR_ERRORS.SESSION_ALREADY_USED,
      });
    }

    // ============================================
    // 4️⃣ CHARGER L'UTILISATEUR
    // ============================================
    const userObj = await User._load(qrGenerator.user, true);

    if (!userObj) {
      await AuthCacheService.rejectSession(qrGenerator.sessionId);

      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: AUTH_QR_CODES.USER_NOT_FOUND,
        message: AUTH_QR_ERRORS.USER_NOT_FOUND,
      });
    }

    // Vérifier que l'utilisateur est actif
    if (!userObj.isActive()) {
      await AuthCacheService.rejectSession(qrGenerator.sessionId);

      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: AUTH_QR_CODES.UNAUTHORIZED,
        message: 'User account is inactive',
      });
    }

    // ============================================
    // 5️⃣ VÉRIFIER LES RÔLES (MANAGER/ADMIN)
    // ============================================

    const isManager = await OrgHierarchy.hasManagerRole(userObj.getId()!);
    if (!isManager) {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: AUTH_QR_CODES.UNAUTHORIZED,
        message: AUTH_QR_ERRORS.UNAUTHORIZED,
      });
    }

    // ============================================
    // 6️⃣ GÉNÉRER JWT
    // ============================================
    // Utiliser votre système existant de génération JWT
    // Exemple basique (à adapter selon votre implémentation)
    const secret = process.env.DB_ENCRYPTION_KEY!;

    const token = ApiKeyManager.generate(secret, userObj.getGuid()!);

    // ============================================
    // 7️⃣ METTRE À JOUR LA SESSION
    // ============================================
    await AuthCacheService.authenticateSession(qrGenerator.sessionId, userObj);

    await AuthCacheService.setToken(qrGenerator.sessionId, token);

    // ============================================
    // 8️⃣ NOTIFIER LE NAVIGATEUR (VIA WEBSOCKET)
    // ============================================
    // Cette partie sera implémentée dans le serveur WebSocket
    // Le WS écoute les changements de statut et push le JWT
    // Voir fichier qr-websocket.service.ts

    // // ============================================
    // // 9️⃣ RÉPONSE À L'APP MOBILE
    // // ============================================
    // return R.handleSuccess(res, {
    //   message: 'QR authentication successful',
    //   status: 'authenticated',
    //   user: userObj.toJSON(),
    // });

    // 🆕 VÉRIFIER SI L'EMAIL A DÉJÀ UN OTP EN CACHE
    const existingOtpRef = GenericCacheService.findByData((data) => {
      return (
        data.user?.email === userObj.getEmail() || data.user?.billingEmail === userObj.getEmail()
      );
    });

    if (existingOtpRef) {
      // Supprimer l'ancien OTP pour cet email
      await GenericCacheService.delete(existingOtpRef);
      console.log(`🔄 Ancien OTP supprimé pour l'email ${userObj.getEmail()}`);
    }

    // Générer un OTP unique
    let otp: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      otp = GenerateOtp.generateOTP(6);
      // Vérifier si l'OTP existe déjà dans le cache
      isUnique = !GenericCacheService.exists(otp);
      attempts++;

      if (attempts >= maxAttempts) {
        return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
          code: 'otp_generation_failed',
          message: 'Unable to generate unique OTP',
        });
      }
    } while (!isUnique);

    // Récupération des rôles de l'utilisateur
    let roles = [];

    // Charger les rôles requis
    const [adminRole, managerRole] = await Promise.all([
      Role._load(RoleValues.ADMIN, false, true),
      Role._load(RoleValues.MANAGER, false, true),
    ]);

    if (!adminRole || !managerRole) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'role_not_found',
        message: 'One or more roles (admin/manager) are missing',
      });
    }

    const identifierAd = { user: userObj.getId(), role: adminRole.getId() };
    const identifierMn = { user: userObj.getId(), role: managerRole.getId() };

    const userRolesAd = await UserRole._load(identifierAd, false, true);
    if (userRolesAd) {
      roles.push(adminRole.toJSON());
    }
    const userRolesMn = await UserRole._load(identifierMn, false, true);
    if (userRolesMn) {
      roles.push(managerRole.toJSON());
    }

    if (!userRolesAd && !userRolesMn) {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: USER_ROLES_CODES.USER_ROLE_NOT_FOUND,
        message: USER_ROLES_ERRORS.NOT_FOUND,
      });
    }

    const user = {
      ...(await userObj.toJSON()),
      roles: roles,
    };

    // Stocker les données dans le cache avec l'OTP comme référence
    const dataToStore = {
      user: user,
      tenant: { tenant },
    };

    const stored = await GenericCacheService.store(otp, dataToStore);

    if (!stored) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'cache_storage_failed',
        message: 'Failed to store OTP in cache',
      });
    }

    // Envoie d'otp via email de l'utilisateur
    console.log(`📧 OTP à envoyer à ${userObj.getEmail()}: ${otp}`);
    try {
      await EmailSender.sender(otp, userObj.getEmail()!);
    } catch (err) {
      await GenericCacheService.delete(otp);
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'email_sending_failed',
        message: (err as Error).message,
      });
    }

    return R.handleCreated(res, {
      message: 'OTP generated and sent successfully via email',
    });
  } catch (error: any) {
    console.error('❌ [Auth QR Verify] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUTH_QR_CODES.VERIFICATION_FAILED,
      message: error.message || AUTH_QR_ERRORS.VERIFICATION_FAILED,
    });
  }
});

router.post('/qr/generate', async (req: Request, res: Response) => {
  try {
    const { user, sessionId } = req.body;

    // ============================================
    // 1️⃣ VALIDATION DES ENTRÉES
    // ============================================

    if (!user || !UsersValidationUtils.validateGuid(user)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_user_id',
        message: 'Invalid user ID format',
      });
    }

    const tenant = (req as any).tenant;
    const reference = tenant.config.reference;

    // // Recalculer la signature attendue
    // const payload = `${user}|${sessionId}`;
    // const expectedSignature = crypto.createHmac('sha256', reference).update(payload).digest('hex');
    // const expectedSignature = DatabaseEncryption.encrypt(user + '|' + sessionId, reference);
    const expectedSignature = DatabaseEncryption.encrypt({ sessionId, user }, reference);

    // ============================================
    // 9️⃣ RÉPONSE À L'APP MOBILE
    // ============================================
    return R.handleSuccess(res, {
      message: 'QR authentication successful',
      signature: expectedSignature,
    });
  } catch (error: any) {
    console.error('❌ [Auth QR Verify] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUTH_QR_CODES.VERIFICATION_FAILED,
      message: error.message || AUTH_QR_ERRORS.VERIFICATION_FAILED,
    });
  }
});

export default router;
