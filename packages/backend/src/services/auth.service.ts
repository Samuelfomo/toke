import { HttpStatus } from '@toke/shared';
import { createApiClient } from '@toke/api/dist/utils/axios.config.js';
import dotenv from 'dotenv';

dotenv.config();

const baseUrl: string = '/auth';
const inDev = process.env.NODE_ENV === 'development';

const masterUrl = inDev
  ? `https://${process.env.MST_HOST}`
  : `http://${process.env.HOST}:${process.env.MST_PORT}`;

const api = createApiClient(masterUrl, process.env.SECRET_KEY, process.env.API_KEY);

export class AuthService {
  static async initQrSession(): Promise<{ status: number; response: any }> {
    try {
      const response = await api.get(`${baseUrl}/qr/init`);
      return { status: response.status, response: response.data.data };
    } catch (error: any) {
      if (error.response) {
        return { status: error.response.status, response: error.response.data };
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

  static async verifyQr(
    signature: string,
    sessionId: string,
  ): Promise<{ status: number; response: any }> {
    try {
      const response = await api.post(`${baseUrl}/qr/verify`, { signature, sessionId });
      return { status: response.status, response: response.data.data };
    } catch (error: any) {
      if (error.response) {
        return { status: error.response.status, response: error.response.data };
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
