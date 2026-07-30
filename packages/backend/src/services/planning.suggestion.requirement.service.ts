import { tenantApiRequest, type TenantApiResult } from './tenant.api.proxy.service.js';

const baseUrl = '/planning-requirement';

export class PlanningSuggestionRequirementService {
  static async listByConfig(reference: string, configGuid: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'GET',
      url: `${baseUrl}/config/${configGuid}`,
    });
  }

  static async get(reference: string, guid: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'GET',
      url: `${baseUrl}/${guid}`,
    });
  }

  static async create(
    reference: string,
    configGuid: string,
    payload: unknown,
  ): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'POST',
      url: `${baseUrl}/config/${configGuid}`,
      data: payload,
    });
  }

  static async update(reference: string, guid: string, payload: unknown): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'PUT',
      url: `${baseUrl}/${guid}`,
      data: payload,
    });
  }

  static async delete(reference: string, guid: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'DELETE',
      url: `${baseUrl}/${guid}`,
    });
  }
}
