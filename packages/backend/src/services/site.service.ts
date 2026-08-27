import { SI } from '@toke/shared';

import { getApiClient } from '../tools/api.factory.js';

const baseUrl = '/site';

type ServiceResult = {
  status: number;
  response: any;
};

type QueryParams = Record<string, unknown>;

export class SiteService {
  static async exportSites(reference: string, query: QueryParams = {}): Promise<ServiceResult> {
    return this.request(reference, 'get', '/', { params: query });
  }

  static async getRevision(reference: string): Promise<ServiceResult> {
    return this.request(reference, 'get', '/revision');
  }

  static async listSites(reference: string, query: QueryParams = {}): Promise<ServiceResult> {
    return this.request(reference, 'get', '/list', { params: query });
  }

  // ─── Listing / lecture ────────────────────────────────────────────────────

  static async listSitesByType(reference: string, siteType: string): Promise<ServiceResult> {
    return this.request(reference, 'get', `/type/${encodeURIComponent(siteType)}/list`);
  }

  static async listActiveSites(reference: string, query: QueryParams = {}): Promise<ServiceResult> {
    return this.request(reference, 'get', '/active', { params: query });
  }

  static async listPublicSites(reference: string): Promise<ServiceResult> {
    return this.request(reference, 'get', '/public');
  }

  static async listSitesByCreator(reference: string, guid: string): Promise<ServiceResult> {
    return this.request(reference, 'get', `/creator/${encodeURIComponent(guid)}/list`);
  }

  static async listActiveSitesByCreator(reference: string, guid: string): Promise<ServiceResult> {
    return this.request(reference, 'get', `/creator/${encodeURIComponent(guid)}/active`);
  }

  static async getSite(reference: string, guid: string): Promise<ServiceResult> {
    return this.request(reference, 'get', `/${encodeURIComponent(guid)}`);
  }

  static async getStatistics(reference: string): Promise<ServiceResult> {
    return this.request(reference, 'get', '/statistics/overview');
  }

  static async createSite(reference: string, site: SI.CreateSite): Promise<ServiceResult> {
    return this.request(reference, 'post', '/', { data: site });
  }

  static async updateSite(
    reference: string,
    guid: string,
    site: SI.UpdateSite,
  ): Promise<ServiceResult> {
    return this.request(reference, 'put', `/${encodeURIComponent(guid)}`, { data: site });
  }

  static async deleteSite(reference: string, guid: string): Promise<ServiceResult> {
    return this.request(reference, 'delete', `/${encodeURIComponent(guid)}`);
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  static async setSiteStatus(
    reference: string,
    guid: string,
    active: boolean | string,
  ): Promise<ServiceResult> {
    return this.request(reference, 'patch', `/${encodeURIComponent(guid)}/status`, {
      params: { active },
    });
  }

  static async regenerateQRCode(
    reference: string,
    guid: string,
    reason?: string,
  ): Promise<ServiceResult> {
    return this.request(reference, 'patch', `/${encodeURIComponent(guid)}/regenerate-qr`, {
      data: reason ? { reason } : {},
    });
  }

  static async validateQRCode(reference: string, qrToken: string): Promise<ServiceResult> {
    return this.request(reference, 'patch', '/validate-qr', {
      data: { qr_token: qrToken },
    });
  }

  static async generateQRCode(
    reference: string,
    siteGuid: string,
    managerGuid: string,
  ): Promise<ServiceResult> {
    return this.request(reference, 'post', '/generate-qr-code', {
      data: {
        site: siteGuid,
        manager: managerGuid,
      },
    });
  }

  // ─── QR codes ─────────────────────────────────────────────────────────────

  static async addTeamMembers(
    reference: string,
    guid: string,
    userGuids: string[],
    reason?: string,
  ): Promise<ServiceResult> {
    return this.request(reference, 'post', `/${encodeURIComponent(guid)}/team/add`, {
      data: {
        user_guids: userGuids,
        ...(reason ? { reason } : {}),
      },
    });
  }

  static async removeTeamMembers(
    reference: string,
    guid: string,
    userGuids: string[],
    reason?: string,
  ): Promise<ServiceResult> {
    return this.request(reference, 'post', `/${encodeURIComponent(guid)}/team/remove`, {
      data: {
        user_guids: userGuids,
        ...(reason ? { reason } : {}),
      },
    });
  }

  static async listExpiringTemporarySites(
    reference: string,
    days: number | string = 7,
  ): Promise<ServiceResult> {
    return this.request(reference, 'get', '/temporary/expiring', {
      params: { days },
    });
  }

  // ─── Équipe ───────────────────────────────────────────────────────────────

  static async extendTemporarySiteValidity(
    reference: string,
    guid: string,
    newEndDate: string,
    approvedBy: string,
  ): Promise<ServiceResult> {
    return this.request(reference, 'patch', `/${encodeURIComponent(guid)}/extend-validity`, {
      data: {
        new_end_date: newEndDate,
        approved_by: approvedBy,
      },
    });
  }

  static async deactivateExpiredSites(reference: string): Promise<ServiceResult> {
    return this.request(reference, 'patch', '/maintenance/deactivate-expired');
  }

  // ─── Sites temporaires / maintenance ─────────────────────────────────────

  private static success(response: any): ServiceResult {
    return {
      status: response.status,
      response: response.data?.data ?? response.data,
    };
  }

  private static failure(error: any): ServiceResult {
    if (error.response) {
      return {
        status: error.response.status,
        response: error.response.data,
      };
    }

    if (error.request) {
      return {
        status: 500,
        response: {
          message: 'No response from server',
          details: error.message,
        },
      };
    }

    return {
      status: 500,
      response: {
        message: 'Unexpected error',
        details: error.message,
      },
    };
  }

  private static async request(
    reference: string,
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    options: {
      data?: unknown;
      params?: QueryParams;
    } = {},
  ): Promise<ServiceResult> {
    try {
      const api = await getApiClient(reference);
      const response = await api.request({
        method,
        url: `${baseUrl}${path}`,
        ...(options.data !== undefined ? { data: options.data } : {}),
        ...(options.params ? { params: options.params } : {}),
      });

      return this.success(response);
    } catch (error: any) {
      return this.failure(error);
    }
  }
}

// import { SI } from '@toke/shared';
//
// import { getApiClient } from '../tools/api.factory.js';
//
// const baseUrl: string = '/site';
//
// export class SiteService {
//   static async listSites(reference: string): Promise<{ status: number; response: object }> {
//     try {
//       const api = await getApiClient(reference);
//
//       const response = await api.get(`${baseUrl}/list`);
//
//       return {
//         status: response.status,
//         response: response.data.data,
//       };
//     } catch (error: any) {
//       if (error.response) {
//         return {
//           status: error.response.status,
//           response: error.response.data,
//         };
//       } else if (error.request) {
//         return {
//           status: 500,
//           response: { message: 'No response from server', details: error.message },
//         };
//       } else {
//         return {
//           status: 500,
//           response: { message: 'Unexpected error', details: error.message },
//         };
//       }
//     }
//   }
//
//   static async getSite(
//     reference: string,
//     guid: string,
//   ): Promise<{ status: number; response: object }> {
//     try {
//       const api = await getApiClient(reference);
//
//       const response = await api.get(`${baseUrl}/${guid}`);
//
//       return {
//         status: response.status,
//         response: response.data.data,
//       };
//     } catch (error: any) {
//       if (error.response) {
//         return {
//           status: error.response.status,
//           response: error.response.data,
//         };
//       } else if (error.request) {
//         return {
//           status: 500,
//           response: { message: 'No response from server', details: error.message },
//         };
//       } else {
//         return {
//           status: 500,
//           response: { message: 'Unexpected error', details: error.message },
//         };
//       }
//     }
//   }
//
//   static async createSite(
//     reference: string,
//     site: SI.CreateSite,
//   ): Promise<{ status: number; response: object }> {
//     try {
//       const api = await getApiClient(reference);
//
//       const response = await api.post(`${baseUrl}/`, site);
//
//       return {
//         status: response.status,
//         response: response.data.data,
//       };
//     } catch (error: any) {
//       if (error.response) {
//         return {
//           status: error.response.status,
//           response: error.response.data,
//         };
//       } else if (error.request) {
//         return {
//           status: 500,
//           response: { message: 'No response from server', details: error.message },
//         };
//       } else {
//         return {
//           status: 500,
//           response: { message: 'Unexpected error', details: error.message },
//         };
//       }
//     }
//   }
//
//   static async updateSite(
//     reference: string,
//     guid: string,
//     site: SI.UpdateSite,
//   ): Promise<{ status: number; response: object }> {
//     try {
//       const api = await getApiClient(reference);
//
//       const response = await api.put(`${baseUrl}/${guid}`, site);
//
//       return {
//         status: response.status,
//         response: response.data.data,
//       };
//     } catch (error: any) {
//       if (error.response) {
//         return {
//           status: error.response.status,
//           response: error.response.data,
//         };
//       } else if (error.request) {
//         return {
//           status: 500,
//           response: { message: 'No response from server', details: error.message },
//         };
//       } else {
//         return {
//           status: 500,
//           response: { message: 'Unexpected error', details: error.message },
//         };
//       }
//     }
//   }
// }
