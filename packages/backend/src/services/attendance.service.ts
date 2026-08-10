import { HttpStatus } from '@toke/shared';

import { getApiClient } from '../tools/api.factory.js';

const statBaseUrl: string = '/statistique';

export class AttendanceService {
  static async listAttendanceTeamManager(
    reference: string,
    data: string,
    start: string,
    end: string,
    site?: string,
  ): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);

      const params = new URLSearchParams({
        manager: data,
        start_date: start,
        end_date: end,
      });

      if (site) {
        console.log('site: ', site);
        params.append('site', site);
      }

      const response = await api.get(`${statBaseUrl}/overview?${params.toString()}`);

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
          response: {
            message: 'No response from server',
            details: error.message,
          },
        };
      } else {
        return {
          status: HttpStatus.INTERNAL_ERROR,
          response: {
            message: 'Unexpected error',
            details: error.message,
          },
        };
      }
    }
  }
}
