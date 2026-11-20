import type { ApiResponse } from '@toke/shared'

import { apiRequest } from '@/tools/Fetch.Client'
import type {
    EmployeePlanningProfilePayload,
    EmployeePlanningProfileUpdatePayload,
} from '@/views/planning/suggestion/planningSuggestion.type'

const baseUrl = '/planning-profile'

export default class EmployeePlanningProfileService {
    static async list(): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: baseUrl, method: 'GET' })
        } catch (error: any) {
            console.error('EmployeePlanningProfileService.list', error)
            return error
        }
    }

    static async getByGuid(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'GET' })
        } catch (error: any) {
            console.error('EmployeePlanningProfileService.getByGuid', error)
            return error
        }
    }

    static async getByUser(userGuid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/user/${userGuid}`, method: 'GET' })
        } catch (error: any) {
            console.error('EmployeePlanningProfileService.getByUser', error)
            return error
        }
    }

    static async create(payload: EmployeePlanningProfilePayload): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: baseUrl, method: 'POST', data: payload })
        } catch (error: any) {
            console.error('EmployeePlanningProfileService.create', error)
            return error
        }
    }

    static async update(
        guid: string,
        payload: EmployeePlanningProfileUpdatePayload,
    ): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'PUT', data: payload })
        } catch (error: any) {
            console.error('EmployeePlanningProfileService.update', error)
            return error
        }
    }

    static async delete(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'DELETE' })
        } catch (error: any) {
            console.error('EmployeePlanningProfileService.delete', error)
            return error
        }
    }
}
