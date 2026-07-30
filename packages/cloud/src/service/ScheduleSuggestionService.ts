import type { ApiResponse } from '@toke/shared'

import { apiRequest } from '@/tools/Fetch.Client'
import type {
    GenerateSuggestionPayload,
} from '@/views/planning/suggestion/planningSuggestion.type'

const baseUrl = '/schedule-suggestion'

type ScheduleSuggestionFilters = {
    offset?: number
    limit?: number
    status?: string[]
}

export default class ScheduleSuggestionService {
    static async generate(
        managerGuid: string,
        payload: GenerateSuggestionPayload,
    ): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${managerGuid}/generate`,
                method: 'POST',
                data: payload,
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.generate', error)
            return error
        }
    }


    static async list(
        managerGuid: string,
        filters: ScheduleSuggestionFilters = {},
    ): Promise<ApiResponse> {
        try {
            const params = new URLSearchParams()

            if (filters.offset !== undefined) {
                params.set('offset', String(filters.offset))
            }

            if (filters.limit !== undefined) {
                params.set('limit', String(filters.limit))
            }

            filters.status?.forEach(status => {
                params.append('status', status)
            })
            // if (filters.status?.length) {
            //     params.set('status', filters.status.join(','))
            // }

            const query = params.toString()

            return await apiRequest<any>({
                path: `${baseUrl}/${managerGuid}/list${query ? `?${query}` : ''}`,
                method: 'GET',
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.list', error)
            throw error
        }
    }

    static async getByGuid(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${guid}`,
                method: 'GET',
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.getByGuid', error)
            return error
        }
    }

    static async patchCell(
        suggestionGuid: string,
        itemGuid: string,
        payload: { iso: string; template_guid: string | null },
    ): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${suggestionGuid}/item/${itemGuid}`,
                method: 'PATCH',
                data: payload,
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.patchCell', error)
            return error
        }
    }

    static async approve(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${guid}/approve`,
                method: 'POST',
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.approve', error)
            return error
        }
    }

    static async reject(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${guid}/reject`,
                method: 'POST',
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.reject', error)
            return error
        }
    }

    static async delete(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${guid}`,
                method: 'DELETE',
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.delete', error)
            return error
        }
    }
}
