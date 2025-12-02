import { getApiClient } from '../tools/api.factory.js';

const baseUrl: string = '/time-entries';

export class TimeEntriesService {
  static async listEntriesTeamManager(
    reference: string,
    data: string,
  ): Promise<{ status: number; response: object }> {
    try {
      const api = getApiClient(reference);

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
}
