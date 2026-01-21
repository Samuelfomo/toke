import { ApiResponse } from '@toke/shared';

import { apiRequest } from '@/tools/Fetch.Client';

const baseUrl = '/user';

export interface SubordinateResponse {
  guid: string;
  name: string;
  email: string;
  position: string;
  siteId: number | string;
  punctualityScore?: number;
  avatar?: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  employee_code?: string;
  department?: string;
}

export default class UserService {
  /**
   * Récupère la liste des subordonnés d'un manager
   * @param managerGuid - GUID du manager
   * @returns Liste des employés sous la responsabilité du manager
   */
  static async listSubordinates(managerGuid: string): Promise<ApiResponse> {
    try {
      const response = await apiRequest<ApiResponse>({
        path: `${baseUrl}/employee/all-subordinates?supervisor=${managerGuid}`,
        method: 'GET',
      });

      console.log('✅ Subordonnés récupérés:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des subordonnés:', error);
      throw error;
    }
  }

  static async listAttendance(managerGuid: string): Promise<ApiResponse> {
    try {
      return await apiRequest<ApiResponse>({
        path: `${baseUrl}/attendance/today?supervisor=${managerGuid}`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des subordonnés:', error);
      throw error;
    }
  }

  /**
   * Récupère les détails d'un employé spécifique
   * @param employeeGuid - GUID de l'employé
   */
  static async getEmployeeDetails(employeeGuid: string): Promise<ApiResponse<SubordinateResponse>> {
    try {
      return await apiRequest<ApiResponse<SubordinateResponse>>({
        path: `${baseUrl}/employee/${employeeGuid}`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des détails:', error);
      throw error;
    }
  }
}