import { getApiClient } from '../tools/api.factory.js';

const baseUrl: string = '/rotation-assignments';

export class RotationAssignmentService {
  static async listRotationAssignments(
    reference: string,
    manager: string,
  ): Promise<{ status: number; response: object }> {
    try {
      const api = await getApiClient(reference);

      const response = await api.get(`${baseUrl}/${manager}/list`);

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

  static async saveRotationAssignment(
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

  static async updatedRotationAssignment(
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
