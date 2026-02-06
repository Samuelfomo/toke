import { ApiResponse } from '@toke/shared';
import { apiRequest } from '@/tools/Fetch.Client';

const baseUrl = '/rotation-groups';

export interface RotationPayload {
  name: string;
  cycle_length: number;
  cycle_unit: 'day' | 'week' | 'month';
  cycle_templates: string[];
  start_date: string;
}

export interface RotationGroup {
  guid: string;
  tenant: string;
  name: string;
  cycle_length: number;
  cycle_unit: 'day' | 'week' | 'month';
  start_date: string;
  active: boolean;
  cycle_templates: {
    guid: string;
    name: string;
    valid_from: string;
    valid_to: string | null;
    definition: any;
    is_default: boolean;
  }[];
}

export default class Rotationservice {
  /**
   * Récupérer la liste des rotations
   */
  static async listRotations(): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/list`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('Error listing rotations:', error);
      return error;
    }
  }

  /**
   * Créer une nouvelle rotation
   */
  static async createRotation(payload: RotationPayload): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/`,
        method: 'POST',
        data: payload,
      });
    } catch (error: any) {
      console.error('Error creating rotation:', error);
      return error;
    }
  }

  /**
   * Mettre à jour une rotation existante
   */
  static async updateRotation(guid: string, payload: RotationPayload): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/${guid}`,
        method: 'PUT',
        data: payload,
      });
    } catch (error: any) {
      console.error('Error updating rotation:', error);
      return error;
    }
  }

  /**
   * Supprimer une rotation
   */
  static async deleteRotation(guid: string): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/${guid}`,
        method: 'DELETE',
      });
    } catch (error: any) {
      console.error('Error deleting rotation:', error);
      return error;
    }
  }

  /**
   * Récupérer une rotation spécifique
   */
  static async getRotation(guid: string): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/${guid}`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('Error getting rotation:', error);
      return error;
    }
  }
}