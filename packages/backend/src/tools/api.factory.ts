import { createApiClient } from '@toke/api/dist/utils/axios.config.js';
import TenantCacheService from '@toke/api/dist/tools/tenant-cache.service.js';

const siteUrl = (host: string): string => `https://${host}`;

/**
 * Résout l'URL publique de l'API tenant à partir de la référence BFF.
 * Cette fonction est utilisée à la fois par le proxy HTTP et par le bridge Socket.IO.
 */
export const getTenantApiBaseUrl = async (reference: string): Promise<string> => {
  if (!reference) {
    throw new Error('Référence manquante pour résoudre le tenant');
  }

  const subdomain = await TenantCacheService.findByData((tenantConfig) => {
    return tenantConfig.reference === reference;
  });

  if (!subdomain) {
    throw new Error(`Aucun tenant trouvé avec la référence: ${reference}`);
  }

  return siteUrl(subdomain);
};

export const getApiClient = async (reference: string) => {
  const baseUrl = await getTenantApiBaseUrl(reference);

  return createApiClient(baseUrl, process.env.SECRET_KEY as string, process.env.API_KEY as string);
};

// import { createApiClient } from '@toke/api/dist/utils/axios.config.js';
// import TenantCacheService from '@toke/api/dist/tools/tenant-cache.service.js';
//
// const siteUrl = (host: string): string => `https://${host}`;
//
// export const getApiClient = async (reference: string) => {
//   if (!reference) {
//     throw new Error('Référence manquante pour créer le client API');
//   }
//
//   console.log('🔍 Recherche du tenant avec la référence:', reference);
//
//   // Rechercher le subdomain du tenant par sa référence
//   const subdomain = await TenantCacheService.findByData((tenantConfig) => {
//     return tenantConfig.reference === reference;
//   });
//
//   if (!subdomain) {
//     throw new Error(`Aucun tenant trouvé avec la référence: ${reference}`);
//   }
//
//   return createApiClient(
//     siteUrl(subdomain),
//     process.env.SECRET_KEY as string,
//     process.env.API_KEY as string,
//   );
// };
