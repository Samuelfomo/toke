import { createApiClient } from '@toke/api/dist/utils/axios.config.js';
import TenantCacheService from '@toke/api/dist/tools/tenant-cache.service.js';

const siteUrl = (host: string): string => `https://${host}`;

export const getApiClient = async (reference: string) => {
  if (!reference) {
    throw new Error('Référence manquante pour créer le client API');
  }

  console.log('🔍 Recherche du tenant avec la référence:', reference);

  // Rechercher le subdomain du tenant par sa référence
  const subdomain = await TenantCacheService.findByData((tenantConfig) => {
    return tenantConfig.reference === reference;
  });

  if (!subdomain) {
    throw new Error(`Aucun tenant trouvé avec la référence: ${reference}`);
  }
  
  console.log('✅ Tenant trouvé:', subdomain);

  return createApiClient(
    siteUrl(subdomain),
    process.env.SECRET_KEY as string,
    process.env.API_KEY as string,
  );
};
