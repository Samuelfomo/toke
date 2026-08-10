import type { ApiResponse } from '@toke/shared'

import { apiRequest } from '@/tools/Fetch.Client'
const baseUrl = '/schedule-assignments'

// ── Types export ───────────────────────────────────────────────────────────

export interface IExportParams {
    targetGuid: string
    targetType: 'user' | 'group'
    periodFrom: string
    periodTo: string
    assignmentGuid: string
}

export interface ICreateScheduleAssignmentPayload {
    session_template: string
    created_by: string
    start_date: string
    related: string
    family: 'user' | 'group'
    end_date?: string | null
    reason?: string
    active?: boolean
}

export interface IScheduleAssignmentListFilters {
    search?: string
    user?: string
    group?: string
    target_type?: 'user' | 'group'
    date_from?: string
    date_to?: string
    offset?: number
    limit?: number
}

export interface IUpdateScheduleAssignmentPayload {
    session_template?: string
    start_date?: string
    end_date?: string | null
    active?: boolean
    reason?: string | null
}

// ── Service ────────────────────────────────────────────────────────────────

export default class ScheduleAssignmentService {
    static async list(
        manager: string,
        filters?: IScheduleAssignmentListFilters,
    ): Promise<ApiResponse> {
        try {
            const params = new URLSearchParams()

            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== '') {
                        params.append(key, String(value))
                    }
                })
            }

            const query = params.toString()
            const path = `${baseUrl}/${manager}/list${query ? `?${query}` : ''}`

            return await apiRequest<any>({
                path,
                method: 'GET',
            })
        } catch (error: unknown) {
            console.error('ScheduleAssignmentService.list', error)
            return error as ApiResponse
        }
    }

    static async getByGuid(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest({
                path: `${baseUrl}/${guid}`,
                method: 'GET',
            })
        } catch (error: unknown) {
            console.error('ScheduleAssignmentService.getByGuid', error)
            return error as ApiResponse
        }
    }

    static async getActiveForUser(userGuid: string): Promise<ApiResponse> {
        try {
            return await apiRequest({
                path: `${baseUrl}/active/user/${userGuid}`,
                method: 'GET',
            })
        } catch (error: unknown) {
            console.error('ScheduleAssignmentService.getActiveForUser', error)
            return error as ApiResponse
        }
    }

    static async create(
        payload: ICreateScheduleAssignmentPayload,
    ): Promise<ApiResponse> {
        try {
            return await apiRequest({
                path: `${baseUrl}/`,
                method: 'POST',
                data: payload,
            })
        } catch (error: unknown) {
            console.error('ScheduleAssignmentService.create', error)
            return error as ApiResponse
        }
    }

    static async update(
        guid: string,
        payload: IUpdateScheduleAssignmentPayload,
    ): Promise<ApiResponse> {
        try {
            return await apiRequest({
                path: `${baseUrl}/${guid}`,
                method: 'PUT',
                data: payload,
            })
        } catch (error: unknown) {
            console.error('ScheduleAssignmentService.update', error)
            return error as ApiResponse
        }
    }

    static async deactivate(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest({
                path: `${baseUrl}/${guid}/deactivate`,
                method: 'PATCH',
            })
        } catch (error: unknown) {
            console.error('ScheduleAssignmentService.deactivate', error)
            return error as ApiResponse
        }
    }

    static async delete(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest({
                path: `${baseUrl}/${guid}`,
                method: 'DELETE',
            })
        } catch (error: unknown) {
            console.error('ScheduleAssignmentService.delete', error)
            return error as ApiResponse
        }
    }

    // ── Export ─────────────────────────────────────────────────────────────

    /**
     * Les exports de la page utilisent actuellement les utilitaires frontend.
     * Ces méthodes restent disponibles pour un futur branchement backend.
     */
    static async exportPDF(params: IExportParams): Promise<void> {
        console.warn(
            '[ScheduleAssignmentService.exportPDF] — stub, non implémenté',
            params,
        )
    }

    static async exportExcel(params: IExportParams): Promise<void> {
        console.warn(
            '[ScheduleAssignmentService.exportExcel] — stub, non implémenté',
            params,
        )
    }

    static async exportCSV(params: IExportParams): Promise<void> {
        console.warn(
            '[ScheduleAssignmentService.exportCSV] — stub, non implémenté',
            params,
        )
    }
}