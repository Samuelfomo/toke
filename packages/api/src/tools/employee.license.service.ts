import dotenv from 'dotenv';
import { HttpStatus } from '@toke/shared';

import { createApiClient } from '../utils/axios.config.js';

dotenv.config();

interface EmployeeLicense {
  global_license: string;
  employee: string;
  employee_code: string;
}

export interface Activity {
  tenant: string;
  employee_license: string;
  occurred_at: string | Date;
}

export default class EmployeeLicenseService {
  static async saveEmployeeLicense(data: EmployeeLicense): Promise<{
    status: number;
    response: object;
  }> {
    try {
      const api = createApiClient(`http:${process.env.SERVER_HOST}:${process.env.MT_PORT}`);
      const response = await api.post('/employee-license', {
        global_license: data.global_license,
        employee: data.employee,
        employee_code: data.employee_code,
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

  static async getEmployeeLicense(employee: string): Promise<{
    status: number;
    response: object;
  }> {
    try {
      const api = createApiClient(`http:${process.env.SERVER_HOST}:${process.env.MT_PORT}`);
      const response = await api.get(`/employee-license/employee/${employee}`);
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

  static async sendLastActivity(data: Activity): Promise<{
    status: number;
    response: object;
  }> {
    try {
      const api = createApiClient(`http:${process.env.SERVER_HOST}:${process.env.MT_PORT}`);

      const employeeLicense = data.employee_license;
      const response = await api.post(`/activity-monitoring/employees/${employeeLicense}/signals`, {
        tenant_guid: data.tenant,
        occurred_at: data.occurred_at,
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
