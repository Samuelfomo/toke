// ========================================
// 3. MIDDLEWARE TENANT AMÉLIORÉ
// ========================================

// middleware/tenant.middleware.ts

import { NextFunction, Request, Response } from 'express';
import { HttpStatus } from '@toke/shared';

import TenantManager from '../tenant/database/db.tenant-manager.js';
import TenantCacheService from '../tools/tenant-cache.service.js';
import CredentialExtractorService from '../tools/credential-extractor.service.js';
import R from '../tools/response.js';
import { TableInitializer } from '../tenant/database/db.initializer.js';

declare global {
  namespace Express {
    interface Request {
      tenant: {
        subdomain: string;
        config: any;
        connection?: any;
      };
      credentials: {
        subdomain?: string;
        apiKey?: string;
        token?: string;
        userId?: string;
      };
    }
  }
}

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log(`🔍 Traitement requête: ${req.method} ${req.path}`);

    // 1. Extraire les credentials
    const credentials = CredentialExtractorService.extractCredentials(req);
    req.credentials = credentials;

    console.log('📋 Credentials extraits:', {
      subdomain: credentials.subdomain,
      hasToken: !!credentials.token,
      hasApiKey: !!credentials.apiKey,
    });

    // // 2. Valider les credentials
    // const validation = CredentialExtractorService.validateCredentials(credentials);
    // if (!validation.valid) {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: 'invalid_credentials',
    //     message: 'Credentials invalides',
    //     details: validation.errors,
    //   })
    // }

    const subdomain = credentials.subdomain!;

    // 3. Récupérer la configuration du tenant depuis le cache
    const tenantConfig = await TenantCacheService.getTenantConfig(subdomain);
    if (!tenantConfig) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'tenant_not_found',
        message: `Tenant '${subdomain}' non trouvé ou inactif`,
      })
    }

    // 4. Définir le tenant actuel dans TenantManager
    TenantManager.setCurrentTenant(subdomain);

    // 5. Initialiser la connexion DB pour ce tenant
    const connection = await TenantManager.getConnectionForTenant(subdomain, {
      host: tenantConfig.host,
      port: tenantConfig.port,
      username: tenantConfig.username,
      password: tenantConfig.password,
      database: tenantConfig.database,
    });

    await TableInitializer.initialize(connection);

    // 6. Ajouter les informations à la requête
    req.tenant = {
      subdomain,
      config: tenantConfig,
      connection,
    };

    console.log(`✅ Tenant '${subdomain}' configuré avec succès`);
    return next();
  } catch (error: any) {
    console.error('❌ Erreur middleware tenant:', error.message);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'tenant_configuration_error',
      message: 'Impossible de configurer le tenant',
      details: error,
    })
  }
};

// import { NextFunction, Request, Response } from 'express';
//
// import TenantManager from '../tenant/database/db.tenant-manager.js';
//
// declare global {
//   namespace Express {
//     interface Request {
//       tenant: {
//         subdomain: string;
//         connection: any; // Sequelize instance if needed
//       };
//     }
//   }
// }
//
// export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     // Extraction du sous-domaine
//     const hostname = req.hostname;
//     const subdomain = hostname.split('.')[0];
//
//     // Validation du tenant
//     if (!subdomain || subdomain === 'www') {
//       return res.status(400).json({
//         error: 'Tenant invalide. Utilisez un sous-domaine valide.',
//       });
//     }
//
//     // Définir le tenant actuel dans TenantManager
//     TenantManager.setCurrentTenant(subdomain);
//
//     // Optionnel: pré-charger la connexion
//     const connection = await TenantManager.getConnection();
//
//     // Ajouter les infos tenant à la requête
//     req.tenant = {
//       subdomain,
//       connection,
//     };
//
//     console.log(`🏢 Requête traitée pour tenant: ${subdomain}`);
//     return next();
//   } catch (error: any) {
//     console.error('❌ Erreur middleware tenant:', error.message);
//     return res.status(500).json({
//       error: 'Impossible de se connecter à la base de données du tenant',
//     });
//   }
// };
