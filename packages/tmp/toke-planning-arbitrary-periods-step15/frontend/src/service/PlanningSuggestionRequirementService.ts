import type { ApiResponse } from '@toke/shared'
import { apiRequest } from '@/tools/Fetch.Client'
import type {
    PlanningRequirementPayload,
} from '@/views/planning/suggestion/planningSuggestion.type'

const baseUrl = '/planning-suggestion-requirements'

export default class PlanningSuggestionRequirementService {
    static async listByConfig(configGuid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/config/${configGuid}`, method: 'GET' })
        } catch (error: any) {
            console.error('PlanningSuggestionRequirementService.listByConfig', error)
            return error
        }
    }

    static async getByGuid(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'GET' })
        } catch (error: any) {
            console.error('PlanningSuggestionRequirementService.getByGuid', error)
            return error
        }
    }

    static async create(
        configGuid: string,
        payload: PlanningRequirementPayload,
    ): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/config/${configGuid}`,
                method: 'POST',
                data: payload,
            })
        } catch (error: any) {
            console.error('PlanningSuggestionRequirementService.create', error)
            return error
        }
    }

    static async update(
        guid: string,
        payload: PlanningRequirementPayload,
    ): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'PUT', data: payload })
        } catch (error: any) {
            console.error('PlanningSuggestionRequirementService.update', error)
            return error
        }
    }

    static async delete(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'DELETE' })
        } catch (error: any) {
            console.error('PlanningSuggestionRequirementService.delete', error)
            return error
        }
    }
}
