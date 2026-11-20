import type { ApiResponse } from '@toke/shared'
import { apiRequest } from '@/tools/Fetch.Client'

const baseUrl = '/rotation-groups'

export default class RotationGroupService {

    static async list(filters?: {
        search?: string
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
            console.error('RotationGroupService.list', error)
            return error
        }
    }

    static async getByGuid(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'GET' })
        } catch (error: any) {
            console.error('RotationGroupService.getByGuid', error)
            return error
        }
    }

    static async create(payload: {
        name: string
        cycle_length: number
        cycle_unit: 'day' | 'week'
        start_date: string
        description?: string
        direction?: 'forward' | 'backward'
        auto_advance?: boolean
        rotation_step?: number
    }): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/`, method: 'POST', data: payload })
        } catch (error: any) {
            console.error('RotationGroupService.create', error)
            return error
        }
    }

    static async update(guid: string, payload: Partial<{
        name: string
        description: string
        cycle_length: number
        cycle_unit: 'day' | 'week'
        direction: 'forward' | 'backward'
        auto_advance: boolean
        rotation_step: number
        start_date: string
    }>): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'PUT', data: payload })
        } catch (error: any) {
            console.error('RotationGroupService.update', error)
            return error
        }
    }

    static async toggleActive(guid: string, active: boolean): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${guid}/toggle`,
                method: 'PATCH',
                data: { active },
            })
        } catch (error: any) {
            console.error('RotationGroupService.toggleActive', error)
            return error
        }
    }

    static async delete(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'DELETE' })
        } catch (error: any) {
            console.error('RotationGroupService.delete', error)
            return error
        }
    }

    // ── Positions (RotationGroupTemplate) ─────────────────────────────────────

    static async addPosition(payload: {
        rotation_group: string
        session_template: string
        position: number
    }): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/positions`,
                method: 'POST',
                data: payload,
            })
        } catch (error: any) {
            console.error('RotationGroupService.addPosition', error)
            return error
        }
    }

    static async removePosition(positionGuid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/positions/${positionGuid}`,
                method: 'DELETE',
            })
        } catch (error: any) {
            console.error('RotationGroupService.removePosition', error)
            return error
        }
    }

    static async reorderPositions(rotationGroupGuid: string, orderedGuids: string[]): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${rotationGroupGuid}/positions/reorder`,
                method: 'PATCH',
                data: { positions: orderedGuids },
            })
        } catch (error: any) {
            console.error('RotationGroupService.reorderPositions', error)
            return error
        }
    }
}