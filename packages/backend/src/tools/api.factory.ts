import { createApiClient } from '@toke/api/dist/utils/axios.config.js';
import TenantCacheService from '@toke/api/dist/tools/tenant-cache.service.js';

const siteUrl = (host: string): string => `https://${host}`;

export const getApiClient = (reference: string) => {
  if (!reference) {
    throw new Error('Host manquant pour créer le client API');
  }

  // Rechercher le subdomain du tenant par sa référence
  const subdomain = TenantCacheService.findByData((tenantConfig) => {
    return tenantConfig.reference === reference;
  });

  if (!subdomain) {
    throw new Error(`Aucun tenant trouvé avec la référence: ${reference}`);
  }

  return createApiClient(
    siteUrl(subdomain),
    process.env.SECRET_KEY as string,
    process.env.API_KEY as string,
  );
};
