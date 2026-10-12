import type { TenantApiResult } from './tenant.api.proxy.service.js';
import { masterApiRequest } from './master.api.proxy.service.js';

function forbidden(message: string): TenantApiResult {
  return {
    status: 403,
    response: {
      code: 'BFF_LICENSE_SCOPE_FORBIDDEN',
      message,
    },
  };
}

function extractGuid(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.guid === 'string' || typeof candidate.guid === 'number') {
      return String(candidate.guid);
    }
  }

  return null;
}

function globalLicenseFromEmployeePayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const source = payload as Record<string, unknown>;
  return extractGuid(source.global_license);
}

function globalLicenseFromTransactionPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const source = payload as Record<string, unknown>;
  const billingCycle = source.billing_cycle;

  if (!billingCycle || typeof billingCycle !== 'object') return null;
  return extractGuid((billingCycle as Record<string, unknown>).global_license);
}

export class LicenseService {
  static async getTenantLicenseStatus(tenantGuid: string): Promise<TenantApiResult> {
    return await masterApiRequest({
      method: 'GET',
      url: `/tenant/${tenantGuid}/license-status`,
    });
  }

  static async createSubscription(
    tenantGuid: string,
    payload: unknown,
  ): Promise<TenantApiResult> {
    const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};

    return await masterApiRequest({
      method: 'POST',
      url: '/global-license/',
      data: {
        ...body,
        tenant: Number(tenantGuid),
      },
    });
  }

  static async provisionSubdomain(
    tenantGuid: string,
    payload: unknown,
  ): Promise<TenantApiResult> {
    return await masterApiRequest({
      method: 'PATCH',
      url: `/tenant/${tenantGuid}/subdomain`,
      data: payload,
    });
  }

  static async listActivePaymentMethods(): Promise<TenantApiResult> {
    return await masterApiRequest({
      method: 'GET',
      url: '/payment-method/active/true',
    });
  }

  static async listPaymentMethodsByCurrency(currency: string): Promise<TenantApiResult> {
    return await masterApiRequest({
      method: 'GET',
      url: `/payment-method/currency/${encodeURIComponent(currency)}`,
    });
  }

  static async listEmployeeLicenses(globalLicenseGuid: string): Promise<TenantApiResult> {
    return await masterApiRequest({
      method: 'GET',
      url: `/employee-license/global/${globalLicenseGuid}`,
    });
  }

  static async getEmployeeLicense(
    employeeLicenseGuid: string,
    expectedGlobalLicenseGuid: string,
  ): Promise<TenantApiResult> {
    const result = await masterApiRequest({
      method: 'GET',
      url: `/employee-license/${employeeLicenseGuid}`,
    });

    if (result.status >= 200 && result.status < 300) {
      const actual = globalLicenseFromEmployeePayload(result.response);
      if (!actual || actual !== expectedGlobalLicenseGuid) {
        return forbidden('The requested employee license does not belong to the authenticated tenant.');
      }
    }

    return result;
  }

  static async getEmployeeLicenseByEmployee(
    employeeGuid: string,
    expectedGlobalLicenseGuid: string,
  ): Promise<TenantApiResult> {
    const result = await masterApiRequest({
      method: 'GET',
      url: `/employee-license/employee/${employeeGuid}`,
    });

    if (result.status >= 200 && result.status < 300) {
      const actual = globalLicenseFromEmployeePayload(result.response);
      if (!actual || actual !== expectedGlobalLicenseGuid) {
        return forbidden('The requested employee does not belong to the authenticated license scope.');
      }
    }

    return result;
  }

  static async previewRenewal(globalLicenseGuid: string): Promise<TenantApiResult> {
    return await masterApiRequest({
      method: 'GET',
      url: `/license-renewals/${globalLicenseGuid}/preview`,
    });
  }

  static async prepareRenewal(
    globalLicenseGuid: string,
    payload: unknown,
  ): Promise<TenantApiResult> {
    return await masterApiRequest({
      method: 'POST',
      url: `/license-renewals/${globalLicenseGuid}/prepare`,
      data: payload,
    });
  }

  static async getCashInstallmentBalance(
    transactionGuid: string,
    expectedGlobalLicenseGuid: string,
  ): Promise<TenantApiResult> {
    // Avant de retourner un solde, on vérifie l'appartenance via la transaction master.
    const transaction = await masterApiRequest({
      method: 'GET',
      url: `/payment-transaction/${transactionGuid}`,
    });

    if (transaction.status < 200 || transaction.status >= 300) {
      return transaction;
    }

    const actual = globalLicenseFromTransactionPayload(transaction.response);
    if (!actual || actual !== expectedGlobalLicenseGuid) {
      return forbidden('The requested payment transaction does not belong to the authenticated tenant.');
    }

    return await masterApiRequest({
      method: 'GET',
      url: `/cash-installments/${transactionGuid}/balance`,
    });
  }

  static async getMonthlyUsage(
    globalLicenseGuid: string,
    params: unknown,
  ): Promise<TenantApiResult> {
    return await masterApiRequest({
      method: 'GET',
      url: `/activity-monitoring/licenses/${globalLicenseGuid}/monthly-usage`,
      params,
    });
  }

  static async getMonthlyPreview(
    globalLicenseGuid: string,
    params: unknown,
  ): Promise<TenantApiResult> {
    return await masterApiRequest({
      method: 'GET',
      url: `/license-admin/licenses/${globalLicenseGuid}/monthly-preview`,
      params,
    });
  }

  static async getLicenseAccess(
    tenantGuid: string,
    globalLicenseGuid: string,
    params: Record<string, unknown>,
  ): Promise<TenantApiResult> {
    return await masterApiRequest({
      method: 'GET',
      url: `/license-admin/licenses/${globalLicenseGuid}/access`,
      params: {
        ...params,
        tenant_guid: tenantGuid,
      },
    });
  }

  static async getLicenseEvents(
    tenantGuid: string,
    globalLicenseGuid: string,
    params: Record<string, unknown>,
  ): Promise<TenantApiResult> {
    return await masterApiRequest({
      method: 'GET',
      url: `/license-admin/licenses/${globalLicenseGuid}/events`,
      params: {
        ...params,
        tenant_guid: tenantGuid,
      },
    });
  }
}
