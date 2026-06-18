import { getApiClient } from '../tools/api.factory.js';

const baseUrl: string = '/time-entries';

export class TimeEntriesService {
  static async listEntriesTeamManager(
    reference: string,
    data: string,
  ): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);

      const response = await api.get(`${baseUrl}/attendance/team?manager=${data}`);

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

  static async listEntriesTeamManagerV2(
    reference: string,
    data: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);

      const params = new URLSearchParams({ manager: data });
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await api.get(`${baseUrl}/attendance/v2/team?${params.toString()}`);

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
