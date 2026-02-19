import { ApiResponse } from '@toke/shared';

import { apiRequest } from '@/tools/Fetch.Client';
import type {PeriodAttendanceResponse} from "@/utils/interfaces/employeeAttendances";

const baseUrl = '/time-entries';

export default class EntriesService {
  static async listEntries(manager: string): Promise<ApiResponse> {
    try {
      return await apiRequest<ApiResponse>({
        path: `${baseUrl}/attendance/team?manager=${manager}`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('response error', error);
      return error;
    }
  }
}