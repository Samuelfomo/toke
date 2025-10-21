import dotenv from 'dotenv';
import { HttpStatus } from '@toke/shared';

import { createApiClient } from '../utils/axios.config.js';

dotenv.config();

interface InvitationData {
  phone_number: string;
  metadata: Record<string, any>;
}

export default class InvitationService {
  static async saveInv(data: InvitationData): Promise<{
    status: number;
    response: object;
  }> {
    try {
      const api = createApiClient(`http:${process.env.SERVER_HOST}:${process.env.MT_PORT}`);
      const response = await api.post('/sponsors', {
        phone_number: data.phone_number,
        metadata: data.metadata,
      });

      return {
        status: response.status,
        response: response.data,
      };
    } catch (error: any) {
      if (error.response) {
        // Erreur renvoyée par le serveur
        return {
          status: error.response.status,
          response: error.response.data,
        };
      } else if (error.request) {
        // Pas de réponse reçue
        return {
          status: HttpStatus.INTERNAL_ERROR,
          response: { message: 'No response from server', details: error.message },
        };
      } else {
        // Erreur Axios/JS
        return {
          status: HttpStatus.INTERNAL_ERROR,
          response: { message: 'Unexpected error', details: error.message },
        };
      }
    }
  }
}
