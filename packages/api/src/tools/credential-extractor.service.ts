// ========================================
// 2. SERVICE D'EXTRACTION DES CREDENTIALS
// ========================================

// services/credential-extractor.service.ts
export interface ClientCredentials {
  subdomain?: string;
  apiKey?: string;
  token?: string;
  userId?: string;
}

export default class CredentialExtractorService {
  /**
   * Extrait les credentials depuis différentes sources
   */
  public static extractCredentials(req: any): ClientCredentials {
    const credentials: ClientCredentials = {};

    // 1. Extraction du domaine complet depuis l'hostname
    // Ici, on prend tout le hostname (sous-domaines + domaine)
    credentials.subdomain = req.hostname || req.get('host') || '';

    // // 1. Extraction du sous-domaine depuis l'hostname
    // const hostname = req.hostname || req.get('host') || '';
    // const hostParts = hostname.split('.');
    //
    // if (hostParts.length > 2) {
    //   credentials.subdomain = hostParts[0];
    // } else if (hostParts[0] !== 'localhost' && hostParts[0] !== '127') {
    //   credentials.subdomain = hostParts[0];
    // }

    // // 2. Extraction depuis les headers personnalisés
    // const tenantHeader = req.get('X-Tenant-ID') || req.get('x-tenant-id');
    // if (tenantHeader) {
    //   credentials.subdomain = tenantHeader;
    // }
    //
    // // 3. Extraction depuis l'Authorization header
    // const authHeader = req.get('Authorization');
    // if (authHeader) {
    //   if (authHeader.startsWith('Bearer ')) {
    //     credentials.token = authHeader.substring(7);
    //   } else if (authHeader.startsWith('ApiKey ')) {
    //     credentials.apiKey = authHeader.substring(7);
    //   }
    // }
    //
    // // 4. Extraction depuis les query parameters (pour les tests)
    // if (req.query.tenant) {
    //   credentials.subdomain = req.query.tenant as string;
    // }
    //
    // // 5. Extraction depuis le body (si applicable)
    // if (req.body && req.body.tenant_id) {
    //   credentials.subdomain = req.body.tenant_id;
    // }

    return credentials;
  }

  /**
   * Valide les credentials extraits
   */
  public static validateCredentials(credentials: ClientCredentials): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!credentials.subdomain) {
      errors.push('Subdomain/Tenant ID manquant');
    }

    if (credentials.subdomain && !/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(credentials.subdomain)) {
      // if (credentials.subdomain && !/^[a-z0-9-]+$/.test(credentials.subdomain)) {
      errors.push(
        `Format subdomain invalide (seuls a-z, 0-9 et - sont autorisés) ${credentials.subdomain}`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
