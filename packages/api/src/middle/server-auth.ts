import { NextFunction, Request, Response } from 'express';
import { HttpStatus } from '@toke/shared';

import { TableInitializer } from '../master/database/db.initializer.js';
import R from '../tools/response.js';
import G from '../tools/glossary.js';
import ClientCacheService from '../tools/client.cache.service.js';
import { ApiKeyManager } from '../tools/api-key-manager.js';
import Endpoint from '../master/class/Endpoint.js';
import Permission from '../master/class/Permission.js';

/**
 * Middleware d'authentification API Key global
 * Intercepte TOUTES les requêtes pour vérifier l'API Key
 */
export class ServerAuth {
  /**
   * Middleware principal d'authentification avec cache
   */
  static async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = ServerAuth.extractToken(req);

      if (!token) {
        R.handleError(res, HttpStatus.UNAUTHORIZED, G.authenticatorMissing);
        return;
      }

      // 3. Rechercher le client dans le cache d'abord
      let clientConfig = await ClientCacheService.getClientConfig(token);

      // Si pas trouvé dans le cache, chercher en base et mettre en cache
      if (!clientConfig) {
        // 2. Verify that the tables are initialised
        if (!TableInitializer.isInitialized()) {
          // R.handleError(res, HttpStatus.SERVER_UNAVAILABLE, G.serviceIsInitialising);
          R.handleError(res, HttpStatus.SERVER_UNAVAILABLE, G.authenticationFailed);
          return;
        }
        console.log(`🔍 Client '${token}' non trouvé en cache, recherche en base...`);

        // Fallback vers la base de données (import dynamique pour éviter les dépendances circulaires)
        const { default: Client } = await import('../master/class/Client.js');
        const clientRecord = await Client._load(token, true);

        if (!clientRecord) {
          R.handleError(res, HttpStatus.UNAUTHORIZED, G.authenticationFailed);
          return;
        }

        // Mettre le client en cache pour les prochaines requêtes
        await ClientCacheService.setClientConfig(clientRecord);

        // Récupérer la config depuis le cache maintenant
        clientConfig = await ClientCacheService.getClientConfig(token);
        if (!clientConfig) {
          R.handleError(res, HttpStatus.UNAUTHORIZED, G.authenticationFailed);
          return;
        }
      }

      // 4. Check if a client is active (déjà vérifié dans getClientConfig)
      if (!clientConfig.active) {
        R.handleError(res, HttpStatus.UNAUTHORIZED, G.clientBlocked);
        return;
      }

      // TODO a supprimer apres les le devs
      if (clientConfig.profile.root) {
        return next();
      }

      const rawToken = `${req.headers['x-api-signature'] || req.headers['X-Api-Signature']}`;
      const validity = `${req.headers['x-api-timestamp'] || req.headers['X-Api-Timestamp'] || ''}`;

      if (!rawToken) {
        R.handleError(res, HttpStatus.UNAUTHORIZED, G.clientDataRequired);
        return;
      }

      const isSignatureValid = ApiKeyManager.verify(rawToken, token, validity, clientConfig.secret);

      if (!isSignatureValid) {
        R.handleError(res, HttpStatus.UNAUTHORIZED, G.authenticationFailed);
        return;
      }

      // 6. Add customer information to the request (depuis le cache)
      (req as any).client = {
        id: clientConfig.id,
        name: clientConfig.name,
        token: clientConfig.token,
        active: clientConfig.active,
        profile: clientConfig.profile.id,
        isRoot: clientConfig.profile.root,
      };

      // 7. Log access (optional)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔑 API Key valide (cache): ${clientConfig.name} → ${req.method} ${req.path}`);
      }

      // 8. Continue to the next middleware
      next();
    } catch (error: any) {
      console.error('❌ Erreur middleware auth:', error);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, [error.message]);
    }
  }

  // /**
  //  * Middleware principal d'authentification
  //  */
  // static async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  //   try {
  //     const token = ServerAuth.extractToken(req);
  //
  //     if (!token) {
  //       R.handleError(res, HttpStatus.UNAUTHORIZED, G.authenticatorMissing);
  //       return;
  //     }
  //
  //     // 2. Verify that the tables are initialised
  //     if (!TableInitializer.isInitialized()) {
  //       R.handleError(res, HttpStatus.SERVER_UNAVAILABLE, G.serviceIsInitialising);
  //       return;
  //     }
  //
  //     // 3. Search for the customer in the database
  //     const clientRecord = await Client._load(token, true);
  //     if (!clientRecord) {
  //       R.handleError(res, HttpStatus.UNAUTHORIZED, G.authenticationFailed);
  //       return;
  //     }
  //
  //     // 4. Check if a client is active
  //     if (!clientRecord.isActive()) {
  //       R.handleError(res, HttpStatus.UNAUTHORIZED, G.clientBlocked);
  //       return;
  //     }
  //
  //     // 5. Verify uuid signature (additional security)
  //     const rawToken = `${req.headers['x-api-signature'] || ''}`;
  //
  //     const [uuidWithValidity, signature] = rawToken.split('.');
  //
  //     // Extraire uuid et validity
  //     const lastDashIndex = uuidWithValidity.lastIndexOf('-');
  //     const uuid = uuidWithValidity.substring(0, lastDashIndex);
  //     const validity = uuidWithValidity.substring(lastDashIndex + 1);
  //
  //     // Reconstruire signedToken attendu par verify (3 parties)
  //     const signedToken = `${uuid}.${validity}.${signature}`;
  //
  //     const isSignatureValid = ApiKeyManager.verify(signedToken, clientRecord.getSecret()!);
  //
  //     if (!isSignatureValid) {
  //       // If signature provided but invalid
  //       R.handleError(res, HttpStatus.UNAUTHORIZED, G.authenticationFailed);
  //       return;
  //     }
  //
  //     const profil = await clientRecord.getProfil();
  //     if (!profil) {
  //       R.handleError(res, HttpStatus.UNAUTHORIZED, G.authenticationFailed);
  //       return;
  //     }
  //
  //     // 6. Add customer information to the request
  //     (req as any).client = {
  //       id: clientRecord.getId(),
  //       name: clientRecord.getName(),
  //       token: clientRecord.getToken(),
  //       active: clientRecord.isActive(),
  //       profile: profil.getId(),
  //       isRoot: profil.isRoot(),
  //     };
  //
  //     // 7. Log access (optional)
  //     if (process.env.NODE_ENV !== 'production') {
  //       console.log(`🔑 API Key valide: ${clientRecord.getName()} → ${req.method} ${req.path}`);
  //     }
  //
  //     // 8. Continue to the next road
  //     next();
  //   } catch (error: any) {
  //     console.error('❌ Erreur middleware auth:', error);
  //     R.handleError(res, HttpStatus.INTERNAL_ERROR, [error.message]);
  //   }
  // }
  /**
   * Middleware optionnel pour vérification de signature renforcée
   * À utiliser pour les endpoints sensibles
   */
  static requireSignature(req: Request, res: Response, next: NextFunction): void {
    const signature = req.headers['x-api-signature'];

    if (!signature) {
      R.handleError(res, HttpStatus.UNAUTHORIZED, G.authenticatorMissing);
      return;
    }

    // La vérification de signature a déjà été faite dans authenticate()
    next();
  }

  /**
   * Middleware pour vérifier les permissions du client (futur)
   */
  static requirePermission(endpointData: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const client = (req as any).client;

      if (!client.isRoot) {
        const endpoint = await Endpoint._load(endpointData.toUpperCase(), true);
        if (!endpoint) {
          R.handleError(res, HttpStatus.UNAUTHORIZED, G.endpointNotFound);
          return;
        }
        const identifier = { profile: client.profile, endpoint: endpoint.getId() };
        const permission = await Permission._load(identifier, true);
        if (!permission) {
          R.handleError(res, HttpStatus.UNAUTHORIZED, G.accessForbidden);
          return;
        }
      }

      // // TODO: Implémenter un système de permissions
      // if (!client.permissions.includes(route)) {
      //   ServerAuth.sendError(res, 403, 'INSUFFICIENT_PERMISSIONS', 'Permissions insuffisantes');
      //   return;
      // }

      next();
    };
  }

  /**
   * Statistiques d'usage pour monitoring (optionnel)
   */
  static async logUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    const client = (req as any).client;

    if (client && process.env.NODE_ENV === 'production') {
      // TODO: Logger les statistiques d'usage en production
      // await logApiUsage(client.id, req.method, req.path);
    }

    next();
  }

  /**
   * Extrait le token depuis les headers de la requête
   */
  private static extractToken(req: Request): string | null {
    // Chercher dans différents headers possibles
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'] as string;
    const tokenHeader = req.headers['x-api-token'] as string;
    // const tokenSignatureHeader = req.headers['x-api-signature'] as string;

    // Routes intégrateurs : la clé de service et la session humaine coexistent.
    // Le Bearer est réservé à la session intégrateur sur ces routes.
    // La clé de service reste obligatoire et validée par authenticate().
    if ((req.path === '/integrator' || req.path.startsWith('/integrator/')) && apiKeyHeader) {
      return apiKeyHeader.trim();
    }

    // Format: "Bearer TOKEN" ou "API-Key TOKEN"
    if (authHeader) {
      const match = authHeader.match(/^(Bearer|API-Key)\s+(.+)$/i);
      if (match) {
        return match[2].trim();
      }
    }

    // // Check signature
    // if (!tokenSignatureHeader) {
    //   return null;
    // }

    // Headers directs
    if (apiKeyHeader) {
      return apiKeyHeader.trim();
    }

    if (tokenHeader) {
      return tokenHeader.trim();
    }

    return null;
  }
}
