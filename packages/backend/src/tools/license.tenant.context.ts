import TenantCacheService from '@toke/api/dist/tools/tenant-cache.service.js';

export interface LicenseTenantContext {
  tenantGuid: string;
  globalLicenseGuid: string | null;
  subdomain: string;
}

export async function getLicenseTenantContext(reference: string): Promise<LicenseTenantContext> {
  const subdomain = await TenantCacheService.findByData((tenantConfig) => {
    return tenantConfig.reference === reference;
  });

  if (!subdomain) {
    const error = new Error(
      `No tenant found for authenticated reference: ${reference}`,
    ) as Error & {
      code?: string;
    };
    error.code = 'BFF_TENANT_CONTEXT_NOT_FOUND';
    throw error;
  }

  const tenantConfig = await TenantCacheService.getTenantConfig(subdomain);
  if (!tenantConfig) {
    const error = new Error(`Tenant configuration unavailable for: ${subdomain}`) as Error & {
      code?: string;
    };
    error.code = 'BFF_TENANT_CONTEXT_UNAVAILABLE';
    throw error;
  }

  return {
    tenantGuid: reference,
    globalLicenseGuid: tenantConfig.global_license || null,
    subdomain,
  };
}

export function requireGlobalLicenseGuid(context: LicenseTenantContext): string {
  if (!context.globalLicenseGuid) {
    const error = new Error(
      'No global license is attached to the authenticated tenant.',
    ) as Error & {
      code?: string;
    };
    error.code = 'BFF_GLOBAL_LICENSE_MISSING';
    throw error;
  }

  return context.globalLicenseGuid;
}
