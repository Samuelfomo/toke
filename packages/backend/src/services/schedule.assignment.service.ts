import { getApiClient } from '../tools/api.factory.js';

const baseUrl = '/schedule-assignments';

type ServiceResult = {
  status: number;
  response: any;
};

/**
 * BFF proxy for the tenant API schedule-assignments resource.
 *
 * The BFF deliberately keeps business validation in the API and forwards:
 * - route params through the URL,
 * - query params through Axios `params`,
 * - request payloads unchanged.
 */
export class ScheduleAssignmentService {
  static async listAll(reference: string, query: any = {}): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'GET',
      url: baseUrl,
      params: query,
    });
  }

  // ---------------------------------------------------------------------------
  // LISTING / READ
  // ---------------------------------------------------------------------------

  static async getRevision(reference: string): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'GET',
      url: `${baseUrl}/revision`,
    });
  }

  static async listFiltered(reference: string, query: any = {}): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'GET',
      url: `${baseUrl}/list`,
      params: query,
    });
  }

  static async listScheduleAssignments(
    reference: string,
    manager: string,
    query: any = {},
  ): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'GET',
      url: `${baseUrl}/${manager}/list`,
      params: query,
    });
  }

  static async getScheduleAssignment(
    reference: string,
    guid: string,
    query: any = {},
  ): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'GET',
      url: `${baseUrl}/${guid}`,
      params: query,
    });
  }

  static async listUserAssignments(
    reference: string,
    userGuid: string,
    query: any = {},
  ): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'GET',
      url: `${baseUrl}/user/${userGuid}`,
      params: query,
    });
  }

  static async listUserAssignmentsOnDate(
    reference: string,
    userGuid: string,
    query: any = {},
  ): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'GET',
      url: `${baseUrl}/user/${userGuid}/on-date`,
      params: query,
    });
  }

  static async listGroupAssignments(
    reference: string,
    groupsGuid: string,
    query: any = {},
  ): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'GET',
      url: `${baseUrl}/groups/${groupsGuid}`,
      params: query,
    });
  }

  static async listByDateRange(reference: string, query: any = {}): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'GET',
      url: `${baseUrl}/date-range`,
      params: query,
    });
  }

  static async listActiveCurrent(reference: string, query: any = {}): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'GET',
      url: `${baseUrl}/active/current`,
      params: query,
    });
  }

  static async getHistory(
    reference: string,
    guid: string,
    query: any = {},
  ): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'GET',
      url: `${baseUrl}/${guid}/history`,
      params: query,
    });
  }

  static async getStatistics(reference: string, guid: string): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'GET',
      url: `${baseUrl}/${guid}/statistics`,
    });
  }

  static async getAdjustmentServices(reference: string, date: string): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'GET',
      url: `${baseUrl}/adjustments/services`,
      params: { date },
    });
  }

  // ---------------------------------------------------------------------------
  // ONE-DAY SCHEDULE ADJUSTMENTS
  // ---------------------------------------------------------------------------

  static async createAdjustment(reference: string, payload: any): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'POST',
      url: `${baseUrl}/adjustments`,
      data: payload,
    });
  }

  static async saveScheduleAssignment(reference: string, payload: any): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'POST',
      url: baseUrl,
      data: payload,
    });
  }

  // ---------------------------------------------------------------------------
  // WRITE
  // ---------------------------------------------------------------------------

  static async updatedScheduleAssignment(
    reference: string,
    guid: string,
    payload: any,
  ): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'PUT',
      url: `${baseUrl}/${guid}`,
      data: payload,
    });
  }

  static async updateTemplate(
    reference: string,
    guid: string,
    payload: any,
  ): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'PATCH',
      url: `${baseUrl}/template/${guid}`,
      data: payload,
    });
  }

  static async deleteScheduleAssignment(reference: string, guid: string): Promise<ServiceResult> {
    return this.request(reference, {
      method: 'DELETE',
      url: `${baseUrl}/${guid}`,
    });
  }

  private static async request(
    reference: string,
    config: {
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      url: string;
      params?: any;
      data?: any;
    },
  ): Promise<ServiceResult> {
    try {
      const api = await getApiClient(reference);
      const response = await api.request(config);

      return {
        status: response.status,
        // The tenant API wraps successful payloads in `data`.
        // Keep a fallback so this BFF remains tolerant of endpoints returning
        // an unwrapped body.
        response: response.data?.data ?? response.data,
      };
    } catch (error: any) {
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
  }
}

// import { getApiClient } from '../tools/api.factory.js';
//
// const baseUrl: string = '/schedule-assignments';
//
// export class ScheduleAssignmentService {
//   static async listScheduleAssignments(
//     reference: string,
//     manager: string,
//   ): Promise<{ status: number; response: object }> {
//     try {
//       const api = await getApiClient(reference);
//
//       const response = await api.get(`${baseUrl}/${manager}/list`);
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
//   static async saveScheduleAssignment(
//     reference: string,
//     payload: any,
//   ): Promise<{ status: number; response: object }> {
//     try {
//       const api = await getApiClient(reference);
//
//       const response = await api.post(`${baseUrl}/`, payload);
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
//   static async updatedScheduleAssignment(
//     reference: string,
//     guid: string,
//     payload: any,
//   ): Promise<{ status: number; response: object }> {
//     try {
//       const api = await getApiClient(reference);
//
//       const response = await api.put(`${baseUrl}/${guid}`, payload);
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
