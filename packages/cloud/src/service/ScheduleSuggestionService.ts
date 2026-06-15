import type { ApiResponse } from '@toke/shared'

import { apiRequest } from '@/tools/Fetch.Client'

const baseUrl = '/schedule-suggestion'

// ── Types ──────────────────────────────────────────────────────────────────────

export type SuggestionStatus = 'draft' | 'approved' | 'rejected'

export interface ISuggestionDayReason {
    templateGuid: string | null
    templateName: string
    confidence:   number       // 0–100
    factors:      string[]
}

export interface ISuggestionItem {
    guid:     string
    user: {
        guid:          string
        name:          string
        employee_code: string | null
    }
    schedule: Record<string, string | null>               // { 'YYYY-MM-DD': templateGuid|null }
    reasons:  Record<string, ISuggestionDayReason | null>
}

export interface ISuggestion {
    guid:             string
    period_from:      string
    period_to:        string
    status:           SuggestionStatus
    conformity_score: number | null
    history_weeks:    number
    generated_at?:    string
    approved_at:      string | null
    rejected_at:      string | null
    manager: {
        guid: string
        name: string
    } | null
    items?: ISuggestionItem[]
}

export interface IGenerateSuggestionPayload {
    period_from:     string       // YYYY-MM-DD
    period_to:       string       // YYYY-MM-DD
    employee_guids?: string[]     // optionnel — scope réduit
}

export interface IPatchSuggestionItemPayload {
    iso:           string         // YYYY-MM-DD
    template_guid: string | null  // null = repos
}

// ── Service ───────────────────────────────────────────────────────────────────

export default class ScheduleSuggestionService {

    // ── Génération ────────────────────────────────────────────────────────────

    /**
     * POST /schedule-suggestions/:manager/generate
     * Génère une suggestion de planning pour les employés éligibles du manager.
     * Retourne la suggestion complète avec ses items.
     */
    static async generate(
        managerGuid: string,
        payload: IGenerateSuggestionPayload,
    ): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path:   `${baseUrl}/${managerGuid}/generate`,
                method: 'POST',
                data:   payload,
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.generate', error)
            return error
        }
    }

    // ── Lecture ───────────────────────────────────────────────────────────────

    /**
     * GET /schedule-suggestions/:manager/list
     * Liste les suggestions d'un manager (sans les items).
     */
    static async list(managerGuid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path:   `${baseUrl}/${managerGuid}/list`,
                method: 'GET',
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.list', error)
            return error
        }
    }

    /**
     * GET /schedule-suggestions/:guid
     * Charge une suggestion complète avec ses items (pour la prévisualisation).
     */
    static async get(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path:   `${baseUrl}/${guid}`,
                method: 'GET',
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.get', error)
            return error
        }
    }

    // ── Modification d'une cellule ────────────────────────────────────────────

    /**
     * PATCH /schedule-suggestions/:guid/item/:itemGuid
     * Modifie le template suggéré pour un jour donné d'un employé.
     * Body : { iso: 'YYYY-MM-DD', template_guid: string|null }
     */
    static async patchItem(
        suggestionGuid: string,
        itemGuid:       string,
        payload:        IPatchSuggestionItemPayload,
    ): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path:   `${baseUrl}/${suggestionGuid}/item/${itemGuid}`,
                method: 'PATCH',
                data:   payload,
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.patchItem', error)
            return error
        }
    }

    // ── Cycle de vie ──────────────────────────────────────────────────────────

    /**
     * POST /schedule-suggestions/:guid/approve
     * Valide la suggestion → crée les ScheduleAssignments en base.
     */
    static async approve(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path:   `${baseUrl}/${guid}/approve`,
                method: 'POST',
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.approve', error)
            return error
        }
    }

    /**
     * POST /schedule-suggestions/:guid/reject
     * Rejette la suggestion — aucun assignment créé.
     */
    static async reject(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path:   `${baseUrl}/${guid}/reject`,
                method: 'POST',
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.reject', error)
            return error
        }
    }

    /**
     * DELETE /schedule-suggestions/:guid
     * Suppression douce d'une suggestion et de ses items.
     * Utilisé lors du "Regénérer" pour nettoyer l'ancienne suggestion draft.
     */
    static async delete(guid: string): Promise<ApiResponse> {
        try {
            return await apiRequest<any>({
                path:   `${baseUrl}/${guid}`,
                method: 'DELETE',
            })
        } catch (error: any) {
            console.error('ScheduleSuggestionService.delete', error)
            return error
        }
    }
}