import { getApiClient } from '../tools/api.factory.js';

const baseUrl: string = '/session-model';

export class SessionModelService {
  static async list(
    reference: string,
    query?: { offset?: any; limit?: any },
  ): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);

      const params = new URLSearchParams();

      if (query?.offset) params.append('offset', query.offset);
      if (query?.limit) params.append('limit', query.limit);
      const url = `${baseUrl}/list${params.toString() ? `?${params}` : ''}`;

      const response = await api.get(url);

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
          status: 500,
          response: { message: 'No response from server', details: error.message },
        };
      } else {
        return {
          status: 500,
          response: { message: 'Unexpected error', details: error.message },
        };
      }
    }
  }

  static async save(
    reference: string,
    payload: any,
  ): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);

      const response = await api.post(`${baseUrl}/`, payload);

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
          status: 500,
          response: { message: 'No response from server', details: error.message },
        };
      } else {
        return {
          status: 500,
          response: { message: 'Unexpected error', details: error.message },
        };
      }
    }
  }

  static async updated(
    reference: string,
    guid: string,
    payload: any,
  ): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);

      const response = await api.put(`${baseUrl}/${guid}`, payload);

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
          status: 500,
          response: { message: 'No response from server', details: error.message },
        };
      } else {
        return {
          status: 500,
          response: { message: 'Unexpected error', details: error.message },
        };
      }
    }
  }
}
