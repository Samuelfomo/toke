import type { ApiResponse } from '@toke/shared'

import { apiRequest } from '@/tools/Fetch.Client'
import type {
    PlanningSuggestionConfigPayload,
} from '@/views/planning/suggestion/planningSuggestion.type'

const baseUrl = '/planning-config'

export default class PlanningSuggestionConfigService {
    static async list(): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: baseUrl, method: 'GET' })
        } catch (error: any) {
            console.error('PlanningSuggestionConfigService.list', error)
            return error
        }
    }

    static async active(): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/active`, method: 'GET' })
        } catch (error: any) {
            console.error('PlanningSuggestionConfigService.active', error)
            return error
        }
    }

    static async getByGuid(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'GET' })
        } catch (error: any) {
            console.error('PlanningSuggestionConfigService.getByGuid', error)
            return error
        }
    }

    static async create(
        managerGuid: string,
        payload: PlanningSuggestionConfigPayload,
    ): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${managerGuid}`,
                method: 'POST',
                data: payload,
            })
        } catch (error: any) {
            console.error('PlanningSuggestionConfigService.create', error)
            return error
        }
    }

    static async update(
        guid: string,
        payload: PlanningSuggestionConfigPayload,
    ): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'PUT', data: payload })
        } catch (error: any) {
            console.error('PlanningSuggestionConfigService.update', error)
            return error
        }
    }

    static async activate(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}/activate`, method: 'PATCH' })
        } catch (error: any) {
            console.error('PlanningSuggestionConfigService.activate', error)
            return error
        }
    }

    static async delete(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'DELETE' })
        } catch (error: any) {
            console.error('PlanningSuggestionConfigService.delete', error)
            return error
        }
    }
}
