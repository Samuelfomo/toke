import type { ApiResponse } from '@toke/shared'

import { apiRequest } from '@/tools/Fetch.Client'

const baseUrl = '/session-templates'

export interface SessionTemplateFilters {
    search?: string
    session_model?: string
    for_rotation?: boolean
    current?: boolean
    active?: boolean
    offset?: number
    limit?: number
}

export interface SessionTemplatePayload {
    name: string
    session_model: string
    definition: Record<string, any>
    description?: string
    for_rotation?: boolean
    default?: boolean
    current?: boolean
}

export default class SessionTemplateService {
    static async list(filters?: SessionTemplateFilters): Promise<ApiResponse> {
        try {
            const params = new URLSearchParams()
            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== '') params.append(key, String(value))
                })
            }

            const query = params.toString()
            return await apiRequest<any>({
                path: `${baseUrl}/list${query ? `?${query}` : ''}`,
                method: 'GET',
            })
        } catch (error: any) {
            console.error('SessionTemplateService.list', error)
            return error
        }
    }

    static async getByGuid(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'GET' })
        } catch (error: any) {
            console.error('SessionTemplateService.getByGuid', error)
            return error
        }
    }

    static async create(payload: SessionTemplatePayload): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/`, method: 'POST', data: payload })
        } catch (error: any) {
            console.error('SessionTemplateService.create', error)
            return error
        }
    }

    static async update(guid: string, payload: Partial<SessionTemplatePayload>): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'PUT', data: payload })
        } catch (error: any) {
            console.error('SessionTemplateService.update', error)
            return error
        }
    }

    static async setCurrent(guid: string, current: boolean): Promise<ApiResponse> {
        return this.update(guid, { current })
    }

    static async delete(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'DELETE' })
        } catch (error: any) {
            console.error('SessionTemplateService.delete', error)
            return error
        }
    }

    static async listForRotation(): Promise<ApiResponse> {
        return this.list({ for_rotation: true, current: true })
    }
}