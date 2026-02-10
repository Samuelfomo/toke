import { ApiResponse } from '@toke/shared';
import { apiRequest } from '@/tools/Fetch.Client';

const baseUrl = '/rotation-assignments';

export interface RotationAssignmentPayload {
  user?: string;           // GUID de l'utilisateur (optionnel, exclusif avec groups)
  group?: string;         // GUID du groupe (optionnel, exclusif avec user)
  assigned_by: string;     // GUID de l'utilisateur qui assigne
  rotation_group: string;  // GUID de la rotation
  offset: number;          // Décalage dans le cycle (0, 1, 2, etc.)
  assigned_at?: string;    // Date d'assignation (optionnel, format ISO)
}

export interface RotationAssignment {
  guid: string;
  offset: number;
  assigned_at: string;
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
  assigned_by: {
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
  };
  rotation_group: {
    guid: string;
    tenant: string;
    name: string;
    cycle_length: number;
    cycle_unit: 'day' | 'week';
    start_date: string;
    active: boolean;
    cycle_templates: Array<{
      guid: string;
      tenant: string;
      name: string;
      valid_from: string;
      valid_to: string | null;
      definition: any;
      is_default: boolean;
    }>;
  };
}

export default class RotationAssignmentService {
  /**
   * Récupérer la liste des assignations de rotations
   */
  static async listAssignments(manager: string): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/${manager}/list`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('Error listing rotation assignments:', error);
      return error;
    }
  }

  /**
   * Créer une nouvelle assignation de rotation
   */
  static async createAssignment(payload: RotationAssignmentPayload): Promise<ApiResponse> {
    try {
      console.log('payload', payload.group)
      return await apiRequest<any>({
        path: `${baseUrl}/`,
        method: 'POST',
        data: payload,
      });
    } catch (error: any) {
      console.error('Error creating rotation assignment:', error);
      return error;
    }
  }

  /**
   * Mettre à jour une assignation existante
   */
  static async updateAssignment(guid: string, payload: RotationAssignmentPayload): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/${guid}`,
        method: 'PUT',
        data: payload,
      });
    } catch (error: any) {
      console.error('Error updating rotation assignment:', error);
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
      console.error('Error deleting rotation assignment:', error);
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
      console.error('Error getting rotation assignment:', error);
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
      console.error('Error getting user rotation assignments:', error);
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
      console.error('Error getting group rotation assignments:', error);
      return error;
    }
  }
}