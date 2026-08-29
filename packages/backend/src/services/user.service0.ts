import { HttpStatus } from '@toke/shared';
import FormData from 'form-data';

import { getApiClient } from '../tools/api.factory.js';

const baseUrl: string = '/org-hierarchy';
const userBaseUrl: string = '/user';
const statBaseUrl: string = '/statistique';

const memoBaseUrl = '/memo';
const fileBaseUrl = '/upload';

export class UserService {
  static async listTeamManager(
    reference: string,
    data: string,
  ): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);

      const response = await api.get(`${baseUrl}/employee/all-subordinates?supervisor=${data}`);

      return {
        status: response.status,
        response: response.data.data,
      };
    } catch (error: any) {
      if (error.response) {
        return {
          status: error.response.status,
          response: error.response.data,
        };
      } else if (error.request) {
        return {
          status: HttpStatus.INTERNAL_ERROR,
          response: { message: 'No response from server', details: error.message },
        };
      } else {
        return {
          status: HttpStatus.INTERNAL_ERROR,
          response: { message: 'Unexpected error', details: error.message },
        };
      }
    }
  }

  static async listAttendanceTeamManager(
    reference: string,
    data: string,
    start: string,
    end: string,
  ): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);
      const response = await api.get(
        `${statBaseUrl}/attendance/stat?manager=${data}&start_date=${start}&end_date=${end}`,
      );

      return {
        status: response.status,
        response: response.data.data,
      };
    } catch (error: any) {
      if (error.response) {
        return {
          status: error.response.status,
          response: error.response.data,
        };
      } else if (error.request) {
        return {
          status: HttpStatus.INTERNAL_ERROR,
          response: { message: 'No response from server', details: error.message },
        };
      } else {
        return {
          status: HttpStatus.INTERNAL_ERROR,
          response: { message: 'Unexpected error', details: error.message },
        };
      }
    }
  }

  static async loadFiles(reference: string, data: string) {
    const api = await getApiClient(reference);

    return await api.get(data, {
      responseType: 'stream', // 🔥 OBLIGATOIRE
    });
  }

  static async uploadAttachments(reference: string, formData: FormData) {
    try {
      const api = await getApiClient(reference);

      return await api.post(`${fileBaseUrl}/attachments`, formData, {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
    } catch (error: any) {
      if (error.response) return error.response;

      return {
        status: HttpStatus.INTERNAL_ERROR,
        data: {
          success: false,
          message: error.message,
        },
      };
    }
  }

  static async sendReply(reference: string, guid: string, payload: any) {
    try {
      const api = await getApiClient(reference);
      return await api.patch(`${memoBaseUrl}/${guid}/manager-respond`, payload);
    } catch (error: any) {
      return error.response;
    }
  }

  static async sendMemoCreation(reference: string, payload: any) {
    try {
      const api = await getApiClient(reference);
      return await api.post(`${memoBaseUrl}/manager`, payload);
    } catch (error: any) {
      return error.response;
    }
  }

  static async validateMemo(reference: string, guid: string, payload: any) {
    try {
      const api = await getApiClient(reference);

      return await api.patch(`${memoBaseUrl}/${guid}/validate`, payload);
    } catch (error: any) {
      return error.response;
    }
  }

  static async revokeMemo(reference: string, guid: string, payload: any) {
    try {
      const api = await getApiClient(reference);

      return await api.patch(`${memoBaseUrl}/${guid}/revoke`, payload);
    } catch (error: any) {
      return error.response;
    }
  }
  static async rejetMemo(reference: string, guid: string, payload: any) {
    try {
      const api = await getApiClient(reference);
      return await api.patch(`${memoBaseUrl}/${guid}/reject`, payload);
    } catch (error: any) {
      return error.response;
    }
  }

  static async listByManager(reference: string, manager: string) {
    try {
      const api = await getApiClient(reference);
      return await api.get(`${memoBaseUrl}/list?supervisor=${encodeURIComponent(manager)}`);
    } catch (error: any) {
      return (
        error.response ?? {
          status: HttpStatus.INTERNAL_ERROR,
          data: {
            success: false,
            error: {
              code: 'memo_list_proxy_failed',
              message: error.message,
            },
          },
        }
      );
    }
  }

  static async getSummary(reference: string, manager: string) {
    try {
      const api = await getApiClient(reference);
      return await api.get(`${memoBaseUrl}/summary?supervisor=${manager}`);
    } catch (error: any) {
      return error.response;
    }
  }

  static async getMemo(reference: string, guid: string) {
    try {
      const api = await getApiClient(reference);
      return await api.get(`${memoBaseUrl}/${guid}`);
    } catch (error: any) {
      return error.response;
    }
  }

  /**
   * Demande à l'API tenant un ticket Socket.IO court pour un utilisateur.
   * Le ticket API reste côté BFF : il n'est jamais exposé au navigateur.
   */
  static async createMemoRealtimeTicket(reference: string, userGuid: string) {
    try {
      const api = await getApiClient(reference);
      return await api.post(`${memoBaseUrl}/realtime-ticket`, {
        user_guid: userGuid,
      });
    } catch (error: any) {
      return (
        error.response ?? {
          status: HttpStatus.INTERNAL_ERROR,
          data: {
            success: false,
            error: {
              code: 'memo_realtime_ticket_proxy_failed',
              message: error.message,
            },
          },
        }
      );
    }
  }

  static async saveUser(
    reference: string,
    payload: any,
  ): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);

      const response = await api.post(`${userBaseUrl}/`, payload);

      return {
        status: response.status,
        response: response.data.data,
      };
    } catch (error: any) {
      if (error.response) {
        return {
          status: error.response.status,
          response: error.response.data,
        };
      } else if (error.request) {
        return {
          status: 500,
          response: { message: 'No response from server', details: error.message },
        };
      } else {
        return {
          status: 500,
          response: { message: 'Unexpected error', details: error.message },
        };
      }
    }
  }

  static async updatedUser(
    reference: string,
    guid: string,
    manager: string,
    payload: any,
  ): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);

      const response = await api.put(`${userBaseUrl}/${guid}?manager=${manager}`, payload);

      return {
        status: response.status,
        response: response.data.data,
      };
    } catch (error: any) {
      if (error.response) {
        return {
          status: error.response.status,
          response: error.response.data,
        };
      } else if (error.request) {
        return {
          status: 500,
          response: { message: 'No response from server', details: error.message },
        };
      } else {
        return {
          status: 500,
          response: { message: 'Unexpected error', details: error.message },
        };
      }
    }
  }
}
