import { ApiResponse } from '@toke/shared';
import { apiRequest } from '@/tools/Fetch.Client';

const baseUrl = '/schedule-assignments';

export interface ScheduleAssignmentPayload {
  user?: string;           // GUID de l'utilisateur (optionnel, exclusif avec groups)
  groups?: string;         // GUID du groupe (optionnel, exclusif avec user)
  session_template: string; // GUID du template d'horaire
  start_date: string;      // Format: YYYY-MM-DD
  end_date: string;        // Format: YYYY-MM-DD
  created_by: string;      // GUID de l'utilisateur qui crée l'assignation
  reason?: string;         // Raison de l'assignation (optionnel)
}

export interface ScheduleAssignment {
  guid: string;
  tenant: string;
  start_date: string;
  end_date: string;
  reason?: string;
  active: boolean;
  user?: {
    guid: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    department: string;
    job_title: string;
    active: boolean;
    email: string;
    phone_number: string;
    country: string;
    employee_code: string;
    hire_date: string;
  };
  group?: {
    guid: string;
    name: string;
    manager: any;
    created_at: string;
    updated_at: string;
    members: {
      count: number;
      items: any[];
    };
    assignment_info: any;
  };
  session_template: {
    guid: string;
    tenant: string;
    name: string;
    valid_from: string;
    valid_to: string | null;
    definition: any;
    is_default: boolean;
  };
  created_by: {
    guid: string;
    tenant: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    country: string;
    employee_code: string;
    avatar_url: string | null;
    hire_date: string;
    department: string;
    job_title: string;
    active: boolean;
  };
}

export default class ScheduleAssignmentService {
  /**
   * Récupérer la liste des assignations d'emplois du temps
   */
  static async listAssignments(manager: string): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/${manager}/list`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('Error listing schedule assignments:', error);
      return error;
    }
  }

  /**
   * Créer une nouvelle assignation d'emploi du temps
   */
  static async createAssignment(payload: ScheduleAssignmentPayload): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/`,
        method: 'POST',
        data: payload,
      });
    } catch (error: any) {
      console.error('Error creating schedule assignment:', error);
      return error;
    }
  }

  /**
   * Mettre à jour une assignation existante
   */
  static async updateAssignment(guid: string, payload: ScheduleAssignmentPayload): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/${guid}`,
        method: 'PUT',
        data: payload,
      });
    } catch (error: any) {
      console.error('Error updating schedule assignment:', error);
      return error;
    }
  }

  /**
   * Supprimer une assignation
   */
  static async deleteAssignment(guid: string): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/${guid}`,
        method: 'DELETE',
      });
    } catch (error: any) {
      console.error('Error deleting schedule assignment:', error);
      return error;
    }
  }

  /**
   * Récupérer une assignation spécifique
   */
  static async getAssignment(guid: string): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/${guid}`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('Error getting schedule assignment:', error);
      return error;
    }
  }

  /**
   * Récupérer les assignations d'un utilisateur
   */
  static async getUserAssignments(userGuid: string): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/user/${userGuid}`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('Error getting user schedule assignments:', error);
      return error;
    }
  }

  /**
   * Récupérer les assignations d'un groupe
   */
  static async getGroupAssignments(groupGuid: string): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/group/${groupGuid}`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('Error getting group schedule assignments:', error);
      return error;
    }
  }
}