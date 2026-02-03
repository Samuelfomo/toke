import { getApiClient } from '../tools/api.factory.js';

const baseUrl: string = '/session-templates';

export class ScheduleService {
  static async listSchedules(reference: string): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);

      const response = await api.get(`${baseUrl}/list`);

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

  static async saveSchedule(
    reference: string,
    payload: any,
  ): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);

      const response = await api.post(`${baseUrl}/`, payload);

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

  static async updatedSchedule(
    reference: string,
    guid: string,
    payload: any,
  ): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);

      const response = await api.put(`${baseUrl}/${guid}`, payload);

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
