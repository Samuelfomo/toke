import { apiRequest } from '@/tools/Fetch.Client';
import {CreateSite, Site, UpdateSite} from "@/utils/interfaces/site.interface";

const baseUrl = '/site';

export default class SiteService {
    static async listSites(): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/list`,
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
                path: `${baseUrl}/${guid}`,
                method: 'GET',
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }

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

    static async updateSite(guid: string ,site: UpdateSite): Promise<any> {
        try {
            return await apiRequest<any>({
                path: `${baseUrl}/${guid}`,
                method: 'PUT',
                data: site,
            });
        } catch (error: any) {
            console.error('response error', error);
            return error;
        }
    }
}