import dotenv from 'dotenv';
import { HttpStatus } from '@toke/shared';

import GenerateOtp from '../utils/generate.otp.js';
// import api from '../utils/axios.config.js';
import { createApiClient } from '../utils/axios.config.js';

dotenv.config();

export default class WapService {
  static async sendOtp(
    otp: string,
    phone: string,
    country: string,
    scheduled: Date = new Date(),
  ): Promise<{
    status: number;
    response: object;
  }> {
    try {
      const api = createApiClient(process.env.SITE_URL);
      const response = await api.post('/automation', {
        reference: process.env.SEND_OTP_MESSAGE,
        country: country,
        recipient: phone,
        scheduled: scheduled.toISOString(),
        variables: {
          code_otp: otp.toString() || GenerateOtp.generateOTP(6).toString(),
        },
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
