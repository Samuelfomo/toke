import { HttpStatus } from '@toke/shared';
import dotenv from 'dotenv';

import { createApiClient } from '../utils/axios.config.js';

dotenv.config();

export class UserAuthenticationService {
  static async auth(
    email: string,
    tenant: string,
  ): Promise<{
    status: number;
    response: object;
  }> {
    try {
      const api = createApiClient(`https:${tenant}`);
      const response = await api.get(`/user/email/${email}`);

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

  static async recusiviteAuth(
    email: string,
    tenant: string,
  ): Promise<{
    status: number;
    response: object;
  }> {
    try {
      // const api = createApiClient(`https:${tenant}`);
      const api = createApiClient(`http:${process.env.SERVER_HOST}:${process.env.MT_PORT}`);
      const response = await api.post(`/tenant/auth`, { email: email, code: tenant });

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

  static async loadSession(sessionId: string): Promise<{
    status: number;
    response: object;
  }> {
    try {
      const api = createApiClient(`http:${process.env.SERVER_HOST}:${process.env.MT_PORT}`);
      const response = await api.get(`/auth/qr/status/${sessionId}`);

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
