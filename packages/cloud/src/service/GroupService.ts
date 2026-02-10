import { ApiResponse } from '@toke/shared';
import { apiRequest } from '@/tools/Fetch.Client';

const baseUrl = '/groups';

export interface Data {
  groups: Groups
}

export interface Groups {
  pagination: Pagination
  items: Group[]
}

export interface Pagination {
  offset: number
  limit: number
  count: number
}

export interface Group {
  guid?: string
  name: string
  manager: User
  created_at: string
  updated_at: string
  members: Members
  assignment_info: AssignmentInfo
}

export interface Manager {
  guid: string
  first_name: string
  last_name: string
  avatar_url: any
  department: string
  job_title: string
  active: boolean
  email: string
  phone_number: string
  country: string
  employee_code: string
  hire_date: string
}

export interface Members {
  count: number
  items: Member[]
}

export interface Member {
  user: User
  joined_at: string
  active: boolean
}

export interface User {
  guid: string
  first_name: string
  last_name: string
  avatar_url: any
  department: string
  job_title: string
  active: boolean
  email: string
  phone_number: string
  country: string
  employee_code: string
  hire_date: string
}

export interface AssignmentInfo {
  current_type: string
  active_schedule_assignment?: ActiveScheduleAssignment
  active_rotation_assignment: any
}

export interface ActiveScheduleAssignment {
  guid: string
  tenant: string
  start_date: string
  end_date: string
  reason: string
  active: boolean
  session_template: SessionTemplate
  created_by: CreatedBy
}

export interface SessionTemplate {
  guid: string
  tenant: string
  name: string
  valid_from: string
  valid_to: any
  definition: Definition
  is_default: boolean
}

export interface Definition {
  Fri: any
  Mon: any
  Sat: any
  Sun: any
  Thu: any
  Tue: any
  Wed: any
}

export interface Mon {
  work: string[]
  pause: any
  tolerance: number
}

export interface CreatedBy {
  guid: string
  tenant: string
  email: string
  first_name: string
  last_name: string
  phone_number: string
  country: string
  employee_code: string
  avatar_url: any
  hire_date: string
  department: string
  job_title: string
  active: boolean
  last_login_at: any
  assignment_info: AssignmentInfo2
}

export interface AssignmentInfo2 {
  current_type: string
  active_schedule_assignment: any
  active_rotation_assignment: any
}

export default class GroupService {
  /**
   * Récupérer la liste des groups d'un manager
   */
  static async listGroups(guid: string): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/manager/${guid}/list`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('Error listing groups:', error);
      return error;
    }
  }

  /**
   * Créer un nouveau groupe
   */
  static async createGroups(payload: Group): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/`,
        method: 'POST',
        data: payload,
      });
    } catch (error: any) {
      console.error('Error creating groups:', error);
      return error;
    }
  }

  /**
   * Mettre à jour un groupe existant
   */
  static async updateGroup(guid: string, payload: Group): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/${guid}`,
        method: 'PUT',
        data: payload,
      });
    } catch (error: any) {
      console.error('Error updating group:', error);
      return error;
    }
  }

  /**
   * Récupérer un groupe spécifique
   */
  static async getGroup(guid: string): Promise<ApiResponse> {
    try {
      return await apiRequest<any>({
        path: `${baseUrl}/${guid}`,
        method: 'GET',
      });
    } catch (error: any) {
      console.error('Error getting group:', error);
      return error;
    }
  }
}