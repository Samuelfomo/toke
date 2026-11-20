import { CreateSite, UpdateSite } from '@/utils/interfaces/site.interface';
import { apiRequest } from '@/tools/Fetch.Client';

const baseUrl = '/site';

type SiteListFilters = {
    offset?: number;
    limit?: number;
    site_type?: string;
    active?: boolean;
    public?: boolean;
    tenant?: string;
    created_by?: string | number;
};

type TeamMutationPayload = {
    user_guids: string[];
    reason?: string;
};

type ExtendValidityPayload = {
    new_end_date: string;
    approved_by: string;
};

const buildQuery = (params: Record<string, unknown> = {}): string => {
    const query = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');

    return query ? `?${query}` : '';
};

export default class SiteService {

    // ─── Listing / lecture ────────────────────────────────────────────────────

    static async listSites(filters: SiteListFilters = {}): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/list${buildQuery(filters)}`,
                method: 'GET',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async exportSites(offset?: number, limit?: number): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${buildQuery({ offset, limit })}`,
                method: 'GET',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    /**
     * Compatibilité avec l'ancien frontend.
     * La vraie route API est /site/creator/:guid/list (et non /site/list/:guid).
     */
    static async listSitesByManager(managerGuid: string): Promise<any> {
        return this.listSitesByCreator(managerGuid);
    }

    static async listSitesByCreator(creatorGuid: string): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/creator/${encodeURIComponent(creatorGuid)}/list`,
                method: 'GET',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async listActiveSitesByCreator(creatorGuid: string): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/creator/${encodeURIComponent(creatorGuid)}/active`,
                method: 'GET',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async listSitesByType(siteType: string): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/type/${encodeURIComponent(siteType)}/list`,
                method: 'GET',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async listActiveSites(offset?: number, limit?: number): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/active${buildQuery({ offset, limit })}`,
                method: 'GET',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async listPublicSites(): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/public`,
                method: 'GET',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async getRevision(): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/revision`,
                method: 'GET',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async getSite(guid: string): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${encodeURIComponent(guid)}`,
                method: 'GET',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async getStatistics(): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/statistics/overview`,
                method: 'GET',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    static async createSite(site: CreateSite): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/`,
                method: 'POST',
                data: site,
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async updateSite(guid: string, site: UpdateSite): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${encodeURIComponent(guid)}`,
                method: 'PUT',
                data: site,
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async deleteSite(guid: string): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${encodeURIComponent(guid)}`,
                method: 'DELETE',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async setSiteStatus(guid: string, active: boolean): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${encodeURIComponent(guid)}/status${buildQuery({ active })}`,
                method: 'PATCH',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    // ─── QR code ──────────────────────────────────────────────────────────────

    static async regenerateQRCode(guid: string, reason?: string): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${encodeURIComponent(guid)}/regenerate-qr`,
                method: 'PATCH',
                data: reason ? { reason } : {},
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async validateQRCode(qrToken: string): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/validate-qr`,
                method: 'PATCH',
                data: { qr_token: qrToken },
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async generateQRCode(siteGuid: string, managerGuid: string): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/generate-qr-code`,
                method: 'POST',
                data: {
                    site: siteGuid,
                    manager: managerGuid,
                },
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    // ─── Sites temporaires / maintenance ─────────────────────────────────────

    static async listExpiringTemporarySites(days = 7): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/temporary/expiring${buildQuery({ days })}`,
                method: 'GET',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async extendTemporarySiteValidity(
        guid: string,
        newEndDate: string,
        approvedBy: string,
    ): Promise<any> {
        const payload: ExtendValidityPayload = {
            new_end_date: newEndDate,
            approved_by: approvedBy,
        };

        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${encodeURIComponent(guid)}/extend-validity`,
                method: 'PATCH',
                data: payload,
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async deactivateExpiredSites(): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/maintenance/deactivate-expired`,
                method: 'PATCH',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    // ─── Équipe ───────────────────────────────────────────────────────────────
    // Ces routes existent côté API, mais leur logique métier serveur est encore
    // un stub. Les méthodes sont exposées ici pour aligner le client avec le
    // contrat HTTP, sans les brancher à l'interface tant que la persistance
    // backend n'est pas implémentée.

    static async addTeamMembers(guid: string, userGuids: string[], reason?: string): Promise<any> {
        const payload: TeamMutationPayload = {
            user_guids: userGuids,
            ...(reason ? { reason } : {}),
        };

        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${encodeURIComponent(guid)}/team/add`,
                method: 'POST',
                data: payload,
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

    static async removeTeamMembers(guid: string, userGuids: string[], reason?: string): Promise<any> {
        const payload: TeamMutationPayload = {
            user_guids: userGuids,
            ...(reason ? { reason } : {}),
        };

        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${encodeURIComponent(guid)}/team/remove`,
                method: 'POST',
                data: payload,
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }
}
