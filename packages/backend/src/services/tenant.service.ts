import { HttpStatus } from '@toke/shared';
import { createApiClient } from '@toke/api/dist/utils/axios.config.js';
import dotenv from 'dotenv';

dotenv.config();

interface Auth {
  email: string;
  code: string;
}

const baseUrl: string = '/tenant';

export class TenantService {
  static async authenticate(data: Auth): Promise<{
    status: number;
    response: object;
  }> {
    try {
      const api = createApiClient(
        `https://${process.env.MST_HOST}`,
        process.env.SECRET_KEY,
        process.env.API_KEY,
      );

      const response = await api.post(`${baseUrl}/auth`, {
        email: data.email,
        code: data.code,
      });
      console.log(response);

      return {
        status: response.status,
        response: response.data.data,
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

  static async loadTenant(data: string): Promise<{
    status: number;
    response: object;
  }> {
    try {
      const api = createApiClient(
        `https://${process.env.MST_HOST}`,
        process.env.SECRET_KEY,
        process.env.API_KEY,
      );

      const response = await api.get(`${baseUrl}/verify-otp/${data}`);
      console.log(response);

      return {
        status: response.status,
        response: response.data.data,
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
