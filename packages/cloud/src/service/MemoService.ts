import {ApiResponse} from "@toke/shared";

import axiosClient, { apiRequest } from '@/tools/Fetch.Client';


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
  message: MessageContent[] ;
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

const MAX_FILES = 8;

export default class MemoService {

  static async loadFiles(url: string): Promise<Blob> {
    const response = await axiosClient.get(`${baseUrl}/`, {
      params: { url },
      responseType: 'blob', // 🔥 ESSENTIEL
    });

    return response.data; // ← Blob réel
  }

  static async uploadFile(file: File): Promise<UploadedAttachment> {
    const formData = new FormData();
    formData.append('files', file); // ⚠️ même pour 1 → "files"

    const response = await apiRequest<UploadMultipleResponse>({
      path: `${baseUrl}/attachments`,
      method: 'POST',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.attachments[0];
  }


  /**
   * Upload plusieurs fichiers en une requête
   */
  static async uploadMultipleFiles(files: File[]): Promise<UploadedAttachment[]> {
    if (files.length === 0) return [];

    if (files.length > MAX_FILES) {
      throw new Error(`Maximum ${MAX_FILES} fichiers autorisés`);
    }

    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await apiRequest<ApiResponse>({
      path: `${baseUrl}/attachments`,
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.success) throw new Error(`Erreur lors de l'upload des fichiers : ' + response.data.error?.message || 'Aucun message d'erreur`)

    return response.data.attachments;
  }


  /**
   * Construire le contenu du message avec texte et liens
   */
  static buildMessageContent(
    textContent: string,
    uploadedFiles: UploadedAttachment[]
  ): MessageContent[] {
    const messages: MessageContent[] = [];

    // Ajouter le texte si présent
    if (textContent.trim()) {
      messages.push({
        type: 'text',
        content: textContent.trim()
      });
    }

    console.log('uploadedFiles', uploadedFiles);

    // Ajouter les liens des fichiers uploadés
    uploadedFiles.forEach(file => {
      messages.push({
        type: 'link',
        content: file.url
      });
    });

    console.log('messages', messages);

    return messages;
  }

  /**
   * Envoyer une réponse simple (sans validation)
   */
  static async sendReply(guid: string, payload: SendReplyPayload): Promise<any> {
    try {
      return await apiRequest<ApiResponse>({
        path: `${baseUrl}/reply/${guid}`,
        method: 'PATCH',
        data: payload,
      });
    }
    catch (error: any) {
      return error;
    }
  }

  /**
   * Valider un mémo (approuver ou rejeter)
   */
  static async createMemo(memo: CreateMemo): Promise<any> {
    try {
      console.log('memo data', memo);
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
          message: memo.message
        }
      ]
        },
      });
    }
    catch (error: any) {
      return error;
    }
  }

  static async validateMemo(guid: string, user: string): Promise<ApiResponse> {
    try {
      // Appel normal de l'API
      return await apiRequest<ApiResponse>({
        path: `${baseUrl}/validate/${guid}`,
        method: 'PATCH',
        data: { validator_user: user },
      });
    } catch (error: any) {
      console.error(
        'recuperation Axios:',
        error.response?.data?.error?.message, error.response?.data?.message, error.message
      )
      if (error.response && error.response.data) {
        console.error('Erreur renvoyée par l’API:', error.response.data);
        return error.response.data;
      }

      // Si pas de réponse serveur
      return {
        success: false,
        error: {
          code: 'unknown_error',
          message: error.message || 'Erreur inconnue'
        }
      };
    }
  }



  static async rejetMemo(guid: string, user: string): Promise<any> {
    try {
      return await apiRequest<ApiResponse>({
        path: `${baseUrl}/rejet/${guid}`,
        method: 'PATCH',
        data: {validator_user: user},
      });
    }
    catch (error: any) {
      return error;
    }
  }

  /**
   * Upload audio (Blob) et retourner l'URL
   */
  static async uploadAudioBlob(audioBlob: Blob, filename: string = 'audio.webm'): Promise<UploadedAttachment> {
    const file = new File([audioBlob], filename, { type: audioBlob.type });
    return await MemoService.uploadFile(file);
  }


  static async listMemo(managerGuid: string): Promise<ApiResponse> {
    try {
      return await apiRequest<ApiResponse>({
        path: `${baseUrl}/memo/list?supervisor=${managerGuid}`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des subordonnés:', error);
      throw error;
    }
  }

}