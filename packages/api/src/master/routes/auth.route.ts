import crypto from 'crypto';

import { Request, Response, Router } from 'express';
import { HttpStatus, TimezoneConfigUtils } from '@toke/shared';
import { v4 as uuidv4 } from 'uuid';

import R from '../../tools/response.js';
import AuthCacheService from '../../tools/auth.cache.service.js';
import { DatabaseEncryption } from '../../utils/encryption.js';
import { ApiKeyManager } from '../../tools/api-key-manager.js';

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
// ÉTAPE 1 : GÉNÉRATION DU QR CODE (NAVIGATEUR)
// ============================================

/**
 * GET /api/auth/qr/init
 *
 * Génère une session QR pour authentification navigateur
 *
 * Flux :
 * 1. Génère sessionId (UUID v4)
 * 2. Génère nonce (256 bits aléatoire)
 * 3. Stocke en cache avec TTL 2 minutes
 * 4. Retourne les données pour générer le QR
 *
 * @returns {sessionId, nonce, timestamp, expiresIn}
 */
router.get('/qr/init', async (req: Request, res: Response) => {
  try {
    // Métadonnées optionnelles
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // 1️⃣ Générer sessionId (UUID v4)
    const sessionId = uuidv4();

    // 2️⃣ Générer nonce (256 bits = 32 bytes)
    const nonce = crypto.randomBytes(32).toString('hex');

    // 3️⃣ Timestamp actuel
    // const timestamp = Date.now();
    const now = TimezoneConfigUtils.getCurrentTime();
    const timestamp = now.getTime();

    // 4️⃣ Stocker en cache
    const created = await AuthCacheService.createSession(sessionId, nonce, {
      ipAddress,
      userAgent,
    });

    if (!created) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: AUTH_QR_CODES.SESSION_CREATION_FAILED,
        message: AUTH_QR_ERRORS.SESSION_CREATION_FAILED,
      });
    }

    const qrGenerator = DatabaseEncryption.encrypt({
      nonce: nonce,
      sessionId: sessionId,
      status: 'pending',
    });

    // 5️⃣ Réponse (données pour QR)
    return R.handleSuccess(res, {
      sessionId: sessionId,
      qr_data: qrGenerator,
      timestamp,
      expiresIn: 6 * 60 * 1000, // 6 minutes en ms
    });
  } catch (error: any) {
    console.error('❌ [Auth QR Init] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUTH_QR_CODES.SESSION_CREATION_FAILED,
      message: error.message || AUTH_QR_ERRORS.SESSION_CREATION_FAILED,
    });
  }
});

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
    const { signature, sessionId } = req.body;

    if (!signature || typeof signature !== 'string') {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'signature_required',
        message: 'Signature is required',
      });
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'session_id_required',
        message: 'session ID is required',
      });
    }

    // ============================================
    // 2️⃣ RÉCUPÉRER LA SESSION
    // ============================================
    const session = await AuthCacheService.getSession(sessionId);

    if (!session) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: AUTH_QR_CODES.SESSION_NOT_FOUND,
        message: AUTH_QR_ERRORS.SESSION_NOT_FOUND,
      });
    }

    // Vérifier que la session est bien en attente
    if (session.status !== 'pending') {
      await AuthCacheService.rejectSession(sessionId);
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: AUTH_QR_CODES.SESSION_ALREADY_USED,
        message: AUTH_QR_ERRORS.SESSION_ALREADY_USED,
      });
    }

    // ============================================
    // 3️⃣ VÉRIFIER LA SIGNATURE
    // ============================================

    // let qrGenerator: any;
    // try {
    //   qrGenerator = DatabaseEncryption.decryptToObject(signature, session.nonce);
    // } catch (err: any) {
    //   await AuthCacheService.rejectSession(sessionId);
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: AUTH_QR_CODES.INVALID_SIGNATURE,
    //     message:
    //       err.message === 'decryption_failed'
    //         ? 'Invalid signature — wrong key or corrupted data'
    //         : 'Signature payload is not valid JSON',
    //   });
    // }
    //
    // // ============================================
    // // 4️⃣ CHARGER L'UTILISATEUR
    // // ============================================
    //
    // const auth = await UserAuthenticationService.recusiviteAuth(
    //   qrGenerator.email,
    //   qrGenerator.code,
    // );
    //
    // const response: any = auth.response;
    //
    // if (auth.status !== HttpStatus.CREATED) {
    //   await AuthCacheService.rejectSession(sessionId);
    //   return R.handleError(res, auth.status, response.error);
    // }

    // ============================================
    // 6️⃣ GÉNÉRER JWT
    // ============================================
    // Utiliser votre système existant de génération JWT
    // Exemple basique (à adapter selon votre implémentation)
    const secret = process.env.DB_ENCRYPTION_KEY!;

    const token = ApiKeyManager.generate(secret, sessionId);

    // ============================================
    // 7️⃣ METTRE À JOUR LA SESSION
    // ============================================
    await AuthCacheService.authenticateSession(sessionId);

    await AuthCacheService.setToken(sessionId, token);

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

router.post('/qr/decrypt', async (req: Request, res: Response) => {
  try {
    const { signature } = req.body;
    if (!signature) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: AUTH_QR_CODES.INVALID_SIGNATURE,
        message: AUTH_QR_ERRORS.INVALID_SIGNATURE,
      });
    }

    const qrGenerator = DatabaseEncryption.decryptToObject(signature);

    // 5️⃣ Réponse (données pour QR)
    return R.handleSuccess(res, {
      qrGenerator,
    });
  } catch (error: any) {
    console.error('❌ [Auth QR decrypt] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUTH_QR_CODES.SESSION_CREATION_FAILED,
      message: error.message || AUTH_QR_ERRORS.SESSION_CREATION_FAILED,
    });
  }
});

// ============================================
// ENDPOINT NAVIGATEUR : RÉCUPÉRER LE TOKEN
// ============================================

/**
 * GET /api/auth/qr/status/:sessionId
 *
 * Permet au navigateur de vérifier le statut d'une session
 * (Optionnel si vous utilisez uniquement WebSocket)
 *
 * Utile pour :
 * - Polling si WebSocket échoue
 * - Vérification avant fermeture WS
 */
router.get('/qr/status/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: AUTH_QR_CODES.INVALID_SESSION_ID,
        message: AUTH_QR_ERRORS.INVALID_SESSION_ID,
      });
    }

    const session = await AuthCacheService.getSession(sessionId as string);

    if (!session) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: AUTH_QR_CODES.SESSION_NOT_FOUND,
        message: AUTH_QR_ERRORS.SESSION_NOT_FOUND,
      });
    }

    // Réponse selon le statut
    const response: any = {
      status: session.status,
      sessionId: session.sessionId,
    };

    if (session.status === 'authenticated' && session.token) {
      response.token = session.token;
      response.user = session.userData?.toJSON();
    }

    return R.handleSuccess(res, response);
  } catch (error: any) {
    console.error('❌ [Auth QR Status] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'status_check_failed',
      message: error.message || 'Failed to check session status',
    });
  }
});

// ============================================
// ENDPOINT ADMIN : STATISTIQUES (DEBUG)
// ============================================

/**
 * GET /api/auth/qr/stats
 *
 * Statistiques du cache QR (à protéger en production)
 */
router.get('/qr/stats', async (_req: Request, res: Response) => {
  try {
    const stats = AuthCacheService.getStats();
    const activeSessions = AuthCacheService.listActiveSessions();

    return R.handleSuccess(res, {
      stats,
      active_sessions: activeSessions,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'stats_failed',
      message: error.message,
    });
  }
});

export default router;
