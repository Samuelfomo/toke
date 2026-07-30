import { tenantApiRequest, type TenantApiResult } from './tenant.api.proxy.service.js';

const baseUrl = '/planning-profile';

export class EmployeePlanningProfileService {
  static async list(reference: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'GET',
      url: baseUrl,
    });
  }

  static async getByUser(reference: string, userGuid: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'GET',
      url: `${baseUrl}/user/${userGuid}`,
    });
  }

  static async get(reference: string, guid: string): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'GET',
      url: `${baseUrl}/${guid}`,
    });
  }

  static async create(reference: string, payload: unknown): Promise<TenantApiResult> {
    return await tenantApiRequest(reference, {
      method: 'POST',
      url: baseUrl,
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
