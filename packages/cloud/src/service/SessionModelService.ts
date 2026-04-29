import type { ApiResponse } from '@toke/shared'

import { apiRequest } from '@/tools/Fetch.Client'

const baseUrl = '/session-model'

export default class SessionModelService {
    static async list(filters?: {
        pause_allowed?: boolean
        rotation_allowed?: boolean
        early_leave_allowed?: boolean
        active?: boolean
        offset?: number
        limit?: number
    }): Promise<ApiResponse> {
        try {
            const params = new URLSearchParams()
            if (filters) {
                Object.entries(filters).forEach(([k, v]) => {
                    if (v !== undefined) params.append(k, String(v))
                })
            }
            return await apiRequest<any>({
                path: `${baseUrl}/list?${params.toString()}`,
                method: 'GET',
            })
        } catch (error: any) {
            console.error('SessionModelService.list error', error)
            return error
        }
    }

    static async getByGuid(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${guid}`,
                method: 'GET',
            })
        } catch (error: any) {
            console.error('SessionModelService.getByGuid error', error)
            return error
        }
    }

    static async create(payload: {
        name: string
        workday: string[]
        min_working_time: number
        max_working_time: number
        normal_session_time: number
        allowed_tolerance?: number
        pause_allowed?: boolean
        pause_duration?: number
        pause_count?: number
        rotation_allowed?: boolean
        extra_allowed?: boolean
        extra_max?: number
        early_leave_allowed?: boolean
        leave_eligibility_after_session?: number
        leave_is_optional?: boolean
        created_by: string
    }): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/`,
                method: 'POST',
                data: payload,
            })
        } catch (error: any) {
            console.error('SessionModelService.create error', error)
            return error
        }
    }

    static async update(guid: string, payload: Partial<{
        name: string
        workday: string[]
        min_working_time: number
        max_working_time: number
        normal_session_time: number
        allowed_tolerance: number
        pause_allowed: boolean
        pause_duration: number
        pause_count: number
        rotation_allowed: boolean
        extra_allowed: boolean
        extra_max: number
        early_leave_allowed: boolean
        leave_eligibility_after_session: number
        leave_is_optional: boolean
    }>): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${guid}`,
                method: 'PUT',
                data: payload,
            })
        } catch (error: any) {
            console.error('SessionModelService.update error', error)
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
            console.error('SessionModelService.delete error', error)
            return error
        }
    }
}