import { ApiResponse } from '@toke/shared';

import { apiRequest } from '@/tools/Fetch.Client';

const baseUrl = '/user';

export interface SubordinateResponse {
  id: number;
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
  // Ajoutez d'autres champs selon votre API
}
export interface EmployeeInfo {
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
  last_login_at: string | null;
  assignment_info: {
    current_type: string;
    active_schedule_assignment: string | null;
    active_rotation_assignment: string | null;
  };
}

export interface PeriodStats {
  work_days_expected: number;
  present_days: number;
  late_days: number;
  absent_days: number;
  off_days: number;
  total_delay_minutes: number;
  average_delay_minutes: number;
  max_delay_minutes: number;
  total_work_hours: number;
  average_work_hours_per_day: number;
  attendance_rate: number;
  punctuality_rate: number;
}

export interface DailyDetail {
  date: string;
  status: 'present' | 'late' | 'absent' | 'off-day' | 'active' | 'on-pause';
  clock_in_time: string | null;
  clock_out_time: string | null;
  expected_time: string;
  delay_minutes: number | null;
  work_hours: number | null;
  pause_start_time?: string | null;
  pause_end_time?: string | null;
  mission_start_time?: string | null;
  mission_end_time?: string | null;
}

export interface EmployeeAttendance {
  employee: EmployeeInfo;
  period_stats: PeriodStats;
  daily_details: DailyDetail[];
}

export interface Summary {
  total_team_members: number;
  total_present_on_time: number;
  total_late_arrivals: number;
  total_absences: number;
  total_off_days: number;
  total_expected_workdays: number;
  attendance_rate: number;
  punctuality_rate: number;
  average_delay_minutes: number;
  total_work_hours: number;
  average_work_hours_per_day: number;
  currently_active: number;
  currently_on_pause: number;
}

export interface AttendanceApiResponse {
  success: boolean;
  data: {
    message: string;
    data: {
      period: {
        start: string;
        end: string;
        total_days: number;
      };
      filters: {
        manager_guid: string;
        site_guid: string | null;
      };
      summary: Summary;
      daily_breakdown: Array<{
        date: string;
        day_of_week: string;
        expected_count: number;
        present: number;
        late: number;
        absent: number;
        off_day: number;
      }>;
      employees: EmployeeAttendance[];
    };
  };
}

// ============================================
// INTERFACES DE TRANSFORMATION
// ============================================

export interface TransformedEmployee {
  guid: string;
  name: string;
  initials: string;
  avatar: string | null;
  department: string;
  job_title: string;
  status: 'present' | 'late' | 'absent' | 'off-day' | 'on-pause' | 'active';
  statusText: string;
  statusColor: string;
  expectedTime: string;
  actualTime: string | null;
  delayMinutes: number | null;
  delayText: string | null;
  isLate: boolean;
  isAbsent: boolean;
  isPresent: boolean;
  isOffDay: boolean;
  priority: 'high' | 'medium' | 'low';
  punctualityScore: number;
  currently_active: boolean;
  daily_details: DailyDetail[];
  period_stats: PeriodStats;
  clockOutTime: string | null;
  pause_start_time?: string | null;
  pause_end_time?: string | null;
  mission_start_time?: string | null;
  mission_end_time?: string | null;
}

export interface DashboardData {
  summary: Summary;
  employees: TransformedEmployee[];
  presentEmployees: TransformedEmployee[];
  lateEmployees: TransformedEmployee[];
  absentEmployees: TransformedEmployee[];
  offDayEmployees: TransformedEmployee[];
  onPauseEmployees: TransformedEmployee[];
  activeEmployees: TransformedEmployee[];
  date: string;
  period: {
    start: string;
    end: string;
    total_days: number;
  };
}


export default class UserService {
  /**
   * Récupère la liste des subordonnés d'un manager
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

  static async listAttendance(
    managerGuid: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<AttendanceApiResponse['data']>> {
    try {
      let start = startDate || new Date().toISOString().split('T')[0];
      let end = endDate || new Date().toISOString().split('T')[0];
      const params = new URLSearchParams();

      params.append('supervisor', managerGuid);

      params.append('start_date', start);
      params.append('end_date', end);

      console.log(startDate, endDate, params.toString(), start, end);

      const response = await apiRequest<ApiResponse<AttendanceApiResponse['data']>>({
        path: `${baseUrl}/attendance/stat?${params.toString()}`,
        method: 'GET',
      });

      console.log('✅ Données d\'assiduité récupérées:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des données d\'assiduité:', error);
      throw error;
    }
  }

  /**
   * Transforme un employé de l'API en format utilisable par le dashboard
   */
  static transformEmployee(employeeData: EmployeeAttendance): TransformedEmployee {
    const { employee, period_stats, daily_details } = employeeData;
    const todayDetail = daily_details[0] || null;

    const firstName = employee.first_name || '';
    const lastName = employee.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    // Déterminer le statut
    let status = todayDetail?.status || 'absent';
    let statusText = '';
    let statusColor: 'green' | 'red' | 'orange' | 'blue' | 'gray' = 'gray';

    switch (status) {
      case 'present':
        statusText = 'Présent';
        statusColor = 'green';
        break;
      case 'late':
        statusText = 'En retard';
        statusColor = 'orange';
        break;
      case 'absent':
        statusText = 'Absent';
        statusColor = 'red';
        break;
      case 'on-pause':
        statusText = 'En pause';
        statusColor = 'blue';
        break;
      case 'off-day':
        statusText = 'Jour de repos';
        statusColor = 'gray';
        break;
      case 'active':
        statusText = 'Actif';
        statusColor = 'green';
        break;
    }

    // Calculer la priorité basée sur le statut
    let priority: 'high' | 'medium' | 'low' = 'low';
    if (status === 'absent' || status === 'late') {
      priority = 'high';
    } else if (status === 'on-pause') {
      priority = 'medium';
    }

    // Formater le texte du retard
    let delayText = null;
    if (todayDetail?.delay_minutes && todayDetail.delay_minutes > 0) {
      const hours = Math.floor(todayDetail.delay_minutes / 60);
      const minutes = todayDetail.delay_minutes % 60;

      if (hours > 0) {
        delayText = `${hours}h${minutes.toString().padStart(2, '0')}`;
      } else {
        delayText = `${minutes} min`;
      }
    }

    return {
      guid: employee.guid,
      name: fullName,
      initials,
      job_title: employee.job_title,
      department: employee.department,
      avatar: employee.avatar_url,
      status,
      statusText,
      statusColor,
      expectedTime: todayDetail?.expected_time || '08:00',
      actualTime: todayDetail?.clock_in_time || null,
      clockOutTime: todayDetail?.clock_out_time || null,
      delayMinutes: todayDetail?.delay_minutes || null,
      delayText,
      isLate: status === 'late',
      isAbsent: status === 'absent',
      isPresent: status === 'present',
      isOffDay: status === 'off-day',
      punctualityScore: Math.round(period_stats.punctuality_rate),
      priority,
      currently_active: status === 'active',
      daily_details,
      period_stats,
      pause_start_time: todayDetail?.pause_start_time,
      pause_end_time: todayDetail?.pause_end_time,
      mission_start_time: todayDetail?.mission_start_time,
      mission_end_time: todayDetail?.mission_end_time
    };
  }

  /**
   * Récupère et transforme toutes les données pour le dashboard
   */
  static async getDashboardData(
    managerGuid: string,
    startDate?: string,
    endDate?: string
  ): Promise<DashboardData> {
    try {
      const response = await this.listAttendance(managerGuid, startDate, endDate);

      if (!response.success || !response.data?.data) {
        throw new Error('Format de réponse invalide');
      }

      const apiData = response.data.data;

      // Transformer tous les employés
      const allTransformedEmployees = apiData.employees.map(emp =>
        this.transformEmployee(emp)
      );

      // Filtrer par statut
      const presentEmployees = allTransformedEmployees.filter(emp => emp.status === 'present');
      const lateEmployees = allTransformedEmployees.filter(emp => emp.status === 'late');
      const absentEmployees = allTransformedEmployees.filter(emp => emp.status === 'absent');
      const offDayEmployees = allTransformedEmployees.filter(emp => emp.status === 'off-day');
      const onPauseEmployees = allTransformedEmployees.filter(emp => emp.status === 'on-pause');
      const activeEmployees = allTransformedEmployees.filter(emp => emp.status === 'active');

      return {
        summary: apiData.summary,
        employees: allTransformedEmployees,
        presentEmployees,
        lateEmployees,
        absentEmployees,
        offDayEmployees,
        onPauseEmployees,
        activeEmployees,
        date: apiData.period.start,
        period: apiData.period,
      };
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des données du dashboard:', error);
      throw error;
    }
  }

  /**
   * Formate une date pour l'affichage
   */
  static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Formate un taux en pourcentage
   */
  static formatPercentage(rate: number): string {
    return `${Math.round(rate)}%`;
  }

  /**
   * Calcule le texte du taux d'absence
   */
  static getAbsenceRateText(summary: Summary): string {
    if (summary.total_expected_workdays === 0) return '0%';
    const absenceRate = (summary.total_absences / summary.total_expected_workdays) * 100;
    return `${Math.round(absenceRate)}%`;
  }
}