import type { ApiResponse } from '@toke/shared'

import { apiRequest } from '@/tools/Fetch.Client'

const baseUrl = '/schedule-assignments'

// ── Types export ───────────────────────────────────────────────────────────

export interface IExportParams {
    targetGuid:      string
    targetType:      'user' | 'group'
    periodFrom:      string   // YYYY-MM-DD
    periodTo:        string   // YYYY-MM-DD
    assignmentGuid:  string
}

export interface ICreateScheduleAssignmentPayload {
    session_template: string
    created_by:       string
    start_date:       string
    related:         string
    family:        'user' | 'group'
    end_date?:        string | null
    reason?:          string
    active?:          boolean
}

// ── Service ────────────────────────────────────────────────────────────────

export default class ScheduleAssignmentService {

    // ── CRUD ─────────────────────────────────────────────────────────────────

    static async list(manager: string, filters?: {
        search?:      string
        user?:        string
        group?:       string
        target_type?: 'user' | 'group'
        date_from?:   string
        date_to?:     string
        offset?:      number
        limit?:       number
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
            console.error('ScheduleAssignmentService.list', error)
            return error
        }
    }

    static async getByGuid(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'GET' })
        } catch (error: any) {
            console.error('ScheduleAssignmentService.getByGuid', error)
            return error
        }
    }

    static async getActiveForUser(userGuid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path:   `${baseUrl}/active/user/${userGuid}`,
                method: 'GET',
            })
        } catch (error: any) {
            console.error('ScheduleAssignmentService.getActiveForUser', error)
            return error
        }
    }

    static async create(payload: ICreateScheduleAssignmentPayload): Promise<ApiResponse> {
        try {
            console.log('ScheduleAssignmentService.create', payload);
            return await apiRequest<any>({ path: `${baseUrl}/`, method: 'POST', data: payload })
        } catch (error: any) {
            console.error('ScheduleAssignmentService.create', error)
            return error
        }
    }

    static async update(guid: string, payload: Partial<{
        start_date: string
        end_date:   string | null
        active:     boolean
        reason:     string
    }>): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'PUT', data: payload })
        } catch (error: any) {
            console.error('ScheduleAssignmentService.update', error)
            return error
        }
    }

    static async deactivate(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path:   `${baseUrl}/${guid}/deactivate`,
                method: 'PATCH',
            })
        } catch (error: any) {
            console.error('ScheduleAssignmentService.deactivate', error)
            return error
        }
    }

    static async delete(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({ path: `${baseUrl}/${guid}`, method: 'DELETE' })
        } catch (error: any) {
            console.error('ScheduleAssignmentService.delete', error)
            return error
        }
    }

    // ── Export ────────────────────────────────────────────────────────────────
    //
    // Les trois méthodes ci-dessous sont des stubs prêts à brancher.
    //
    // Stratégie prévue :
    //   - exportPDF   → appel backend qui génère le PDF et retourne un blob /
    //                   une URL signée, puis déclenche le téléchargement
    //   - exportExcel → idem avec un fichier .xlsx
    //   - exportCSV   → génération côté client possible (données déjà disponibles)
    //                   ou appel backend selon la complexité
    //
    // Pattern de téléchargement suggéré (à intégrer lors de l'implémentation) :
    //
    //   const blob = await response.blob()
    //   const url  = URL.createObjectURL(blob)
    //   const a    = document.createElement('a')
    //   a.href     = url
    //   a.download = `planning_${params.targetGuid}_${params.periodFrom}.pdf`
    //   a.click()
    //   URL.revokeObjectURL(url)
    //
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Génère et télécharge un aperçu PDF du planning standard.
     *
     * TODO: implémenter l'appel backend
     *   POST /schedule-assignments/export/pdf
     *   Body: IExportParams
     *   Response: blob (application/pdf)
     */
    static async exportPDF(params: IExportParams): Promise<void> {
        console.warn('[ScheduleAssignmentService.exportPDF] — stub, non implémenté', params)
        // TODO: implémenter
        // return await apiRequest<Blob>({
        //   path:         `${baseUrl}/export/pdf`,
        //   method:       'POST',
        //   data:         params,
        //   responseType: 'blob',
        // })
    }

    /**
     * Génère et télécharge un fichier Excel (.xlsx) du planning standard.
     *
     * TODO: implémenter l'appel backend
     *   POST /schedule-assignments/export/excel
     *   Body: IExportParams
     *   Response: blob (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
     */
    static async exportExcel(params: IExportParams): Promise<void> {
        console.warn('[ScheduleAssignmentService.exportExcel] — stub, non implémenté', params)
        // TODO: implémenter
        // return await apiRequest<Blob>({
        //   path:         `${baseUrl}/export/excel`,
        //   method:       'POST',
        //   data:         params,
        //   responseType: 'blob',
        // })
    }

    /**
     * Génère et télécharge un fichier CSV du planning standard.
     *
     * NOTE: peut être généré côté client à partir des données déjà chargées
     * (IScheduleAssignment + calendarDays) sans appel backend supplémentaire.
     *
     * TODO: choisir entre génération client-side ou appel backend
     *   Option A (client) : construire le CSV depuis les données Vue et
     *                       utiliser URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
     *   Option B (backend): POST /schedule-assignments/export/csv → blob text/csv
     */
    static async exportCSV(params: IExportParams): Promise<void> {
        console.warn('[ScheduleAssignmentService.exportCSV] — stub, non implémenté', params)
        // TODO: implémenter (option A recommandée pour le CSV)
    }
}