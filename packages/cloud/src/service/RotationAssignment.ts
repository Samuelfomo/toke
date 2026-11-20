import type { ApiResponse } from '@toke/shared'

import { apiRequest } from '@/tools/Fetch.Client'

const baseUrl = '/rotation-assignments'

// ── Types export ──────────────────────────────────────────────────────────────

export interface IRotationExportParams {
    targetGuid:      string   // '' = tous
    targetType:      'user' | 'group'
    periodFrom:      string   // YYYY-MM-DD
    periodTo:        string   // YYYY-MM-DD
    rotationGroupGuid?: string
    managerGuid?:    string
}

export interface ICreateRotationAssignmentPayload {
    rotation_group: string
    assigned_by:    string
    related:        string
    family:         'user' | 'group'
    offset?:        number
}
// ── Service ───────────────────────────────────────────────────────────────────

export default class RotationAssignmentService {

    // ── LIST ────────────────────────────────────────────────────────────────────

    /**
     * GET /rotation-assignments/:manager/list
     * Retourne toutes les assignations de rotation du manager.
     * Les items group contiennent le rotation_group complet via
     * related.assignment_info.active_rotation_assignment.rotation_group
     */
    static async list(manager: string, filters?: {
        search?:       string
        user?:         string
        group?:        string
        target_type?:  'user' | 'group'
        rotation_group?: string
        date_from?:    string
        date_to?:      string
        offset?:       number
        limit?:        number
    }): Promise<ApiResponse> {
        try {
            const params = new URLSearchParams()
            if (filters) {
                Object.entries(filters).forEach(([k, v]) => {
                    if (v !== undefined && v !== '') params.append(k, String(v))
                })
            }
            return await apiRequest<any>({
                path:   `${baseUrl}/${manager}/list?${params.toString()}`,
                method: 'GET',
            })
        } catch (error: any) {
            console.error('RotationAssignmentService.list', error)
            return error
        }
    }

    // ── GET BY GUID ─────────────────────────────────────────────────────────────

    static async getByGuid(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'GET' })
        } catch (error: any) {
            console.error('RotationAssignmentService.getByGuid', error)
            return error
        }
    }

    // ── CREATE ──────────────────────────────────────────────────────────────────
    /**
     * POST /rotation-assignments/
     * Payload : rotation_group (guid), user_id | group_id, offset (1-based)
     */
    static async create(payload: ICreateRotationAssignmentPayload): Promise<ApiResponse> {
        try {
            return  await apiRequest<any>({ path: `${baseUrl}/`, method: 'POST', data: payload })
        } catch (error: any) {
            console.error('RotationAssignmentService.create', error)
            return error
        }
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────────

    /**
     * PUT /rotation-assignments/:guid
     * Champs modifiables : offset, active
     */
    static async update(guid: string, payload: Partial<{
        offset: number
        active: boolean
    }>): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'PUT', data: payload })
        } catch (error: any) {
            console.error('RotationAssignmentService.update', error)
            return error
        }
    }

    // ── DEACTIVATE ──────────────────────────────────────────────────────────────

    static async deactivate(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path:   `${baseUrl}/${guid}/deactivate`,
                method: 'PATCH',
            })
        } catch (error: any) {
            console.error('RotationAssignmentService.deactivate', error)
            return error
        }
    }

    // ── DELETE ──────────────────────────────────────────────────────────────────

    static async delete(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'DELETE' })
        } catch (error: any) {
            console.error('RotationAssignmentService.delete', error)
            return error
        }
    }

    // ── EXPORT STUBS ─────────────────────────────────────────────────────────────
    //
    // Pattern de téléchargement à brancher lors de l'implémentation :
    //
    //   const blob = await response.blob()
    //   const url  = URL.createObjectURL(blob)
    //   const a    = document.createElement('a')
    //   a.href     = url
    //   a.download = `rotations_${params.periodFrom}_${params.periodTo}.pdf`
    //   a.click()
    //   URL.revokeObjectURL(url)
    //
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * TODO: POST /rotation-assignments/export/pdf
     * Body: IRotationExportParams → Response: blob application/pdf
     */
    static async exportPDF(params: IRotationExportParams): Promise<void> {
        console.warn('[RotationAssignmentService.exportPDF] — stub', params)
    }

    /**
     * TODO: POST /rotation-assignments/export/excel
     * Body: IRotationExportParams → Response: blob .xlsx
     */
    static async exportExcel(params: IRotationExportParams): Promise<void> {
        console.warn('[RotationAssignmentService.exportExcel] — stub', params)
    }

    /**
     * TODO: export CSV (option client-side recommandée)
     * Construire le CSV depuis les données déjà chargées et
     * déclencher le téléchargement via URL.createObjectURL
     */
    static async exportCSV(params: IRotationExportParams): Promise<void> {
        console.warn('[RotationAssignmentService.exportCSV] — stub', params)
    }

    // ── IMPRIMER ─────────────────────────────────────────────────────────────────

    /**
     * Déclenche window.print() après avoir préparé la vue d'impression.
     * TODO: brancher une logique de préparation si nécessaire.
     */
    static printCurrent(): void {
        window.print()
    }
}