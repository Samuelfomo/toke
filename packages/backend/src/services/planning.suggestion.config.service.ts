import { tenantApiRequest, type TenantApiResult } from './tenant.api.proxy.service.js';

const baseUrl = '/planning-config';

export class PlanningSuggestionConfigService {
  static async list(reference: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'GET',
      url: baseUrl,
    });
  }

  static async getActive(reference: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'GET',
      url: `${baseUrl}/active`,
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
    managerGuid: string,
    payload: unknown,
  ): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'POST',
      url: `${baseUrl}/${managerGuid}`,
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

  static async activate(reference: string, guid: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'PATCH',
      url: `${baseUrl}/${guid}/activate`,
    });
  }

  static async deactivate(reference: string, guid: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'PATCH',
      url: `${baseUrl}/${guid}/deactivate`,
    });
  }

  static async delete(reference: string, guid: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'DELETE',
      url: `${baseUrl}/${guid}`,
    });
  }
}
