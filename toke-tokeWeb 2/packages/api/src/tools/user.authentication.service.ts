import { HttpStatus } from '@toke/shared';

import { createApiClient } from '../utils/axios.config.js';

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
}
