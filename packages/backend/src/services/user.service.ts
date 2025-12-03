import { HttpStatus } from '@toke/shared';

import { getApiClient } from '../tools/api.factory.js';

const baseUrl: string = '/org-hierarchy';

export class UserService {
  static async listTeamManager(
    reference: string,
    data: string,
  ): Promise<{ status: number; response: object }> {
    try {
      console.log('🚀 Démarrage listTeamManager avec référence:', reference);
      const api = await getApiClient(reference);

      console.log('✅ Client API créé');

      const response = await api.get(`${baseUrl}/employee/all-subordinates?supervisor=${data}`);

      return {
        status: response.status,
        response: response.data.data,
      };
    } catch (error: any) {
      if (error.response) {
        return {
          status: error.response.status,
          response: error.response.data,
        };
      } else if (error.request) {
        return {
          status: HttpStatus.INTERNAL_ERROR,
          response: { message: 'No response from server', details: error.message },
        };
      } else {
        return {
          status: HttpStatus.INTERNAL_ERROR,
          response: { message: 'Unexpected error', details: error.message },
        };
      }
    }
  }
}
