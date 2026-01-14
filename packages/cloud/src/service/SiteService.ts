import { apiRequest } from '@/tools/Fetch.Client';

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
}