import { NextFunction, Request, Response } from 'express';

import TenantManager from '../tenant/database/db.tenant-manager.js';

declare global {
  namespace Express {
    interface Request {
      tenant: {
        subdomain: string;
        connection: any; // Sequelize instance if needed
      };
    }
  }
}

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extraction du sous-domaine
    const hostname = req.hostname;
    const subdomain = hostname.split('.')[0];

    // Validation du tenant
    if (!subdomain || subdomain === 'www') {
      return res.status(400).json({
        error: 'Tenant invalide. Utilisez un sous-domaine valide.',
      });
    }

    // Définir le tenant actuel dans TenantManager
    TenantManager.setCurrentTenant(subdomain);

    // Optionnel: pré-charger la connexion
    const connection = await TenantManager.getConnection();

    // Ajouter les infos tenant à la requête
    req.tenant = {
      subdomain,
      connection,
    };

    console.log(`🏢 Requête traitée pour tenant: ${subdomain}`);
    return next();
  } catch (error: any) {
    console.error('❌ Erreur middleware tenant:', error.message);
    return res.status(500).json({
      error: 'Impossible de se connecter à la base de données du tenant',
    });
  }
};
