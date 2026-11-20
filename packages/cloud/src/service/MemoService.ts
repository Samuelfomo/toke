import { ApiResponse } from '@toke/shared';

import axiosClient, { apiRequest, memoRequestScope } from '@/tools/Fetch.Client';

const baseUrl = '/memo';

export interface UploadFileResponse {
    success: boolean;
    url: string;
    type: 'image' | 'audio' | 'file';
    filename: string;
}

export interface CreateMemo {
    user_author: string;
    target_user: string;
    type: string;
    title: string;
    message: MessageContent[];
}

export interface MessageContent {
    type: 'text' | 'link';
    content: string;
}

export interface SendReplyPayload {
    user: string;
    message: MessageContent[];
}

export interface ValidateMemoPayload {
    memo_guid: string;
    action: 'approve' | 'reject';
    message?: MessageContent[];
}

export interface UploadedAttachment {
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
}

export interface UploadMultipleResponse {
    success: boolean;
    attachments: UploadedAttachment[];
}

export interface MemoRealtimeTicket {
    realtime_ticket: string;
    expires_at: string;
}

const MAX_FILES = 8;

export default class MemoService {
    static async loadFiles(url: string): Promise<Blob> {
        const normalizedUrl = url?.trim();
        if (!normalizedUrl) {
            throw new Error('URL du fichier manquante');
        }

        const response = await axiosClient.get(`${baseUrl}/`, {
            ...memoRequestScope(),
            params: { url: normalizedUrl },
            responseType: 'blob',
        });
        return response.data;
    }

    static async uploadFile(file: File): Promise<UploadedAttachment> {
        const formData = new FormData();
        formData.append('files', file);

        const response = await apiRequest<ApiResponse<{ attachments: UploadedAttachment[] }>>({
            path: `${baseUrl}/attachments`,
            method: 'POST',
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (!response.success || !response.data?.attachments?.[0]) {
            throw new Error('Réponse upload invalide');
        }
        return response.data.attachments[0];
    }

    static async uploadMultipleFiles(files: File[]): Promise<UploadedAttachment[]> {
        if (files.length === 0) return [];
        if (files.length > MAX_FILES) throw new Error(`Maximum ${MAX_FILES} fichiers autorisés`);

        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));

        const response = await apiRequest<ApiResponse>({
            path: `${baseUrl}/attachments`,
            method: 'POST',
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (!response.success) {
            throw new Error(
                `Erreur lors de l'upload des fichiers : ${response.data?.error?.message || 'Aucun message d\'erreur'}`,
            );
        }

        return response.data.attachments;
    }

    static buildMessageContent(
        textContent: string,
        uploadedFiles: UploadedAttachment[],
    ): MessageContent[] {
        const messages: MessageContent[] = [];

        if (textContent.trim()) {
            messages.push({ type: 'text', content: textContent.trim() });
        }

        uploadedFiles.forEach((file) => {
            messages.push({ type: 'link', content: file.url });
        });

        return messages;
    }

    /** Manager -> employé via le BFF. */
    static async sendReply(guid: string, payload: SendReplyPayload): Promise<any> {
        return await apiRequest<ApiResponse>({
            path: `${baseUrl}/reply/${guid}`,
            method: 'PATCH',
            data: payload,
        });
    }

    /** Création depuis l'interface manager via le BFF. */
    static async createMemo(memo: CreateMemo): Promise<any> {
        return await apiRequest<ApiResponse>({
            path: `${baseUrl}/memo`,
            method: 'POST',
            data: {
                author_user: memo.user_author,
                target_user: memo.target_user,
                memo_type: memo.type,
                title: memo.title,
                memo_content: [
                    {
                        user: memo.user_author,
                        message: memo.message,
                    },
                ],
            },
        });
    }

    static async validateMemo(guid: string, user: string): Promise<ApiResponse> {
        return await apiRequest<ApiResponse>({
            path: `${baseUrl}/validate/${guid}`,
            method: 'PATCH',
            data: { validator_user: user },
        });
    }

    static async rejetMemo(guid: string, user: string): Promise<ApiResponse> {
        return await apiRequest<ApiResponse>({
            path: `${baseUrl}/rejet/${guid}`,
            method: 'PATCH',
            data: { validator_user: user },
        });
    }

    static async revokeMemo(guid: string, user: string): Promise<ApiResponse> {
        return await apiRequest<ApiResponse>({
            path: `${baseUrl}/revoke/${guid}`,
            method: 'PATCH',
            data: { validator_user: user },
        });
    }

    static async uploadAudioBlob(
        audioBlob: Blob,
        filename: string = 'audio.webm',
    ): Promise<UploadedAttachment> {
        const file = new File([audioBlob], filename, { type: audioBlob.type });
        return await MemoService.uploadFile(file);
    }

    static async listMemo(managerGuid: string, params: {
        offset?: number; limit?: number; memo_type?: string; memo_status?: string;
        target_user?: string; search?: string; sort?: 'recent' | 'oldest';
    } = {}): Promise<ApiResponse> {
        const query = new URLSearchParams({ supervisor: managerGuid,
            offset: String(params.offset ?? 0), limit: String(params.limit ?? 25) });
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '' && key !== 'offset' && key !== 'limit')
                query.set(key, String(value));
        }
        const response = await apiRequest<ApiResponse>({ path: `${baseUrl}/list?${query}`, method: 'GET' });
        const list = response?.data?.memos ?? (response as any)?.memos;
        if (!response?.success || !Array.isArray(list?.items)) {
            const code = response?.error?.code || 'memo_read_invalid_response';
            throw Object.assign(new Error(code), { code });
        }
        return response;
    }

    static async markAsRead(memoGuid: string, userGuid: string): Promise<ApiResponse> {
        return await apiRequest<ApiResponse>({
            path: `${baseUrl}/${encodeURIComponent(memoGuid)}/read`,
            method: 'PATCH', data: { user_guid: userGuid },
        });
    }

    static async getMemoByGuid(guid: string): Promise<ApiResponse> {
        const response = await apiRequest<ApiResponse>({
            path: `${baseUrl}/${encodeURIComponent(guid)}`,
            method: 'GET',
        });
        const memo = response?.data?.memo ?? (response as any)?.memo;
        if (!response?.success || !memo?.guid) {
            const code = response?.error?.code || 'memo_read_invalid_response';
            throw Object.assign(new Error(code), { code });
        }
        return response;
    }

    /**
     * Ticket BFF court pour ouvrir le namespace /memo-realtime.
     * Le ticket Socket.IO de l'API tenant n'est jamais exposé au navigateur.
     */
    static async createRealtimeTicket(userGuid: string): Promise<MemoRealtimeTicket> {
        const response = await apiRequest<ApiResponse>({
            path: `${baseUrl}/realtime-ticket`,
            method: 'POST',
            data: { user_guid: userGuid },
        });

        if (!response?.success) {
            throw new Error(response?.error?.message || 'Impossible de créer le ticket temps réel');
        }

        const data = response.data?.data ?? response.data;
        return {
            realtime_ticket: data.realtime_ticket,
            expires_at: data.expires_at,
        };
    }
}
