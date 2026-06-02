import type { ApiResponse } from '@toke/shared'
import { apiRequest } from '@/tools/Fetch.Client'

const baseUrl = '/session-templates'

export default class SessionTemplateService {

    static async list(filters?: {
        search?: string
        session_model?: string
        for_rotation?: boolean
        current?: boolean
        active?: boolean
        offset?: number
        limit?: number
    }): Promise<ApiResponse> {
        try {
            const params = new URLSearchParams()
            if (filters) {
                Object.entries(filters).forEach(([k, v]) => {
                    if (v !== undefined && v !== '') params.append(k, String(v))
                })
            }
            return await apiRequest<any>({
                path: `${baseUrl}/list?${params.toString()}`,
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

    static async create(payload: {
        name: string
        session_model: string
        definition: Record<string, any>
        description?: string
        for_rotation?: boolean
        default?: boolean
        current?: boolean
    }): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/`, method: 'POST', data: payload })
        } catch (error: any) {
            console.error('SessionTemplateService.create', error)
            return error
        }
    }

    static async update(guid: string, payload: Partial<{
        name: string
        description: string
        definition: Record<string, any>
        for_rotation: boolean
        default: boolean
        current: boolean
    }>): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'PUT', data: payload })
        } catch (error: any) {
            console.error('SessionTemplateService.update', error)
            return error
        }
    }

    static async delete(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'DELETE' })
        } catch (error: any) {
            console.error('SessionTemplateService.delete', error)
            return error
        }
    }

    // Récupère uniquement les templates éligibles à la rotation
    static async listForRotation(): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/list?for_rotation=true&current=true`,
                method: 'GET',
            })
        } catch (error: any) {
            console.error('SessionTemplateService.listForRotation', error)
            return error
        }
    }
}