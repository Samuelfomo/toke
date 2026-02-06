import { ApiResponse} from '@toke/shared';

import { apiRequest } from '@/tools/Fetch.Client';

const baseUrl = '/session-templates'

export default class scheduleService {

  static async listSchedule(): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/list`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('response error', error);
      return error;
    }
  }

  static async createSchedule(payload: any): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/`,
        method: 'POST',
        data: payload,
      });
    } catch (error: any) {
      console.error('response error', error);
      return error;
    }
  }

  static async updateSchedule(guid: string, payload: any): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/${guid}`,
        method: 'PUT',
        data: payload,
      });
    } catch (error: any) {
      console.error('response error', error);
      return error;
    }
  }
}