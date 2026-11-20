import { ApiResponse } from '@toke/shared';

import { apiRequest } from '@/tools/Fetch.Client';

const baseUrl = '/time-entries';

export interface EntriesFilters {
    startDate? : string  // format YYYY-MM-DD
    endDate?   : string  // format YYYY-MM-DD
}

export default class EntriesService {
    static async listEntries(manager: string, filters?: EntriesFilters): Promise<ApiResponse> {
        try {
            const params = new URLSearchParams({ manager })

            if (filters?.startDate) params.append('start_date', filters.startDate)
            if (filters?.endDate)   params.append('end_date',   filters.endDate)

            return await apiRequest<ApiResponse>({
                path: `${baseUrl}/attendance/v2/team?${params.toString()}`,
                method: 'GET',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }
}