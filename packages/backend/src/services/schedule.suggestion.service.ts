import { tenantApiRequest, type TenantApiResult } from './tenant.api.proxy.service.js';

const baseUrl = '/schedule-suggestion';

export class ScheduleSuggestionService {
  static async generate(
    reference: string,
    managerGuid: string,
    payload: unknown,
  ): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'POST',
      url: `${baseUrl}/${managerGuid}/generate`,
      data: payload,
    });
  }

  static async list(
    reference: string,
    managerGuid: string,
    query?: unknown,
  ): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'GET',
      url: `${baseUrl}/${managerGuid}/list`,
      params: query,
    });
  }

  static async get(reference: string, guid: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'GET',
      url: `${baseUrl}/${guid}`,
    });
  }

  static async patchItem(
    reference: string,
    suggestionGuid: string,
    itemGuid: string,
    payload: unknown,
  ): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'PATCH',
      url: `${baseUrl}/${suggestionGuid}/item/${itemGuid}`,
      data: payload,
    });
  }

  static async approve(reference: string, guid: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'POST',
      url: `${baseUrl}/${guid}/approve`,
    });
  }

  static async reject(reference: string, guid: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'POST',
      url: `${baseUrl}/${guid}/reject`,
    });
  }

  static async deleteItem(
    reference: string,
    suggestionGuid: string,
    itemGuid: string,
  ): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'DELETE',
      url: `${baseUrl}/${suggestionGuid}/item/${itemGuid}`,
    });
  }

  static async delete(reference: string, guid: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'DELETE',
      url: `${baseUrl}/${guid}`,
    });
  }
}
