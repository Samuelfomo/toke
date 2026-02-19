import { ApiResponse } from '@toke/shared';

import type {
  EmployeeAttendanceHistory,
  GlobalAttendanceStats,
  MonthlyStats,
  AttendanceFilterOptions,
  AttendanceSortOptions,
  AttendanceComparison,
  AttendanceExportData,
  PredefinedPeriod,
  PeriodDates
} from '@/utils/interfaces/attendance.interface';

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


  /**
   * Récupère l'historique complet des pointages d'un employé
   * @param managerGuid GUID du manager
   * @param employeeGuid GUID de l'employé
   * @param monthsBack Nombre de mois en arrière (par défaut 6)
   */
  static async getEmployeeAttendanceHistory(
      managerGuid: string,
      employeeGuid: string,
      monthsBack: number = 6
  ): Promise<EmployeeAttendanceHistory> {
    try {
      // Calculer les dates
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      console.log(`📅 Récupération des pointages de ${start} à ${end}`);

      // Appeler l'API
      const response = await this.listAttendance(managerGuid, start, end);

      if (!response.success || !response.data?.data) {
        throw new Error('Format de réponse invalide');
      }

      const apiData = response.data.data;

      // Trouver l'employé spécifique
      const employeeData = apiData.employees.find(
          (emp: EmployeeAttendance) => emp.employee.guid === employeeGuid
      );

      if (!employeeData) {
        throw new Error('Employé non trouvé');
      }

      // Organiser les données
      const attendanceByMonth = this.groupByMonth(employeeData.daily_details);
      const globalStats = this.calculateGlobalStats(employeeData.daily_details);
      const monthlyStats = this.calculateMonthlyStats(attendanceByMonth);

      console.log(`✅ ${employeeData.daily_details.length} pointages récupérés`);

      return {
        employee: employeeData.employee,
        period: {
          start,
          end,
          total_days: this.calculateDaysBetween(start, end)
        },
        globalStats,
        periodStats: employeeData.period_stats,
        allDailyDetails: employeeData.daily_details,
        attendanceByMonth,
        monthlyStats
      };
    } catch (error: any) {
      console.error('❌ Erreur récupération historique:', error);
      throw error;
    }
  }

  /**
   * Récupère les pointages pour une période personnalisée
   */
  static async getEmployeeAttendanceByDateRange(
      managerGuid: string,
      employeeGuid: string,
      startDate: string,
      endDate: string
  ): Promise<EmployeeAttendanceHistory> {
    try {
      const response = await this.listAttendance(managerGuid, startDate, endDate);

      if (!response.success || !response.data?.data) {
        throw new Error('Format de réponse invalide');
      }

      const apiData = response.data.data;
      const employeeData = apiData.employees.find(
          (emp: EmployeeAttendance) => emp.employee.guid === employeeGuid
      );

      if (!employeeData) {
        throw new Error('Employé non trouvé');
      }

      const attendanceByMonth = this.groupByMonth(employeeData.daily_details);
      const globalStats = this.calculateGlobalStats(employeeData.daily_details);
      const monthlyStats = this.calculateMonthlyStats(attendanceByMonth);

      return {
        employee: employeeData.employee,
        period: {
          start: startDate,
          end: endDate,
          total_days: this.calculateDaysBetween(startDate, endDate)
        },
        globalStats,
        periodStats: employeeData.period_stats,
        allDailyDetails: employeeData.daily_details,
        attendanceByMonth,
        monthlyStats
      };
    } catch (error: any) {
      console.error('❌ Erreur récupération par période:', error);
      throw error;
    }
  }

  /**
   * Récupère les pointages pour une période prédéfinie
   */
  static async getEmployeeAttendanceByPeriod(
      managerGuid: string,
      employeeGuid: string,
      period: PredefinedPeriod
  ): Promise<EmployeeAttendanceHistory> {
    const dates = this.getPeriodDates(period);
    return this.getEmployeeAttendanceByDateRange(
        managerGuid,
        employeeGuid,
        dates.start,
        dates.end
    );
  }

  // ============================================
  // FILTRAGE ET TRI
  // ============================================

  /**
   * Filtre les pointages selon les critères donnés
   */
  static filterAttendance(
      dailyDetails: DailyDetail[],
      filters: AttendanceFilterOptions
  ): DailyDetail[] {
    let filtered = [...dailyDetails];

    // Filtre par dates
    if (filters.startDate) {
      filtered = filtered.filter(d => d.date >= filters.startDate!);
    }
    if (filters.endDate) {
      filtered = filtered.filter(d => d.date <= filters.endDate!);
    }

    // Filtre par statut
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(d => d.status === filters.status);
    }

    // Filtre par retard minimum
    if (filters.minDelayMinutes !== undefined) {
      filtered = filtered.filter(
          d => d.delay_minutes !== null && d.delay_minutes >= filters.minDelayMinutes!
      );
    }

    // Filtre par retard maximum
    if (filters.maxDelayMinutes !== undefined) {
      filtered = filtered.filter(
          d => d.delay_minutes !== null && d.delay_minutes <= filters.maxDelayMinutes!
      );
    }

    return filtered;
  }

  /**
   * Trie les pointages
   */
  static sortAttendance(
      dailyDetails: DailyDetail[],
      sortOptions: AttendanceSortOptions
  ): DailyDetail[] {
    const sorted = [...dailyDetails];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortOptions.field) {
        case 'date':
          comparison = a.date.localeCompare(b.date);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'delay_minutes':
          comparison = (a.delay_minutes || 0) - (b.delay_minutes || 0);
          break;
        case 'work_hours':
          comparison = (a.work_hours || 0) - (b.work_hours || 0);
          break;
      }

      return sortOptions.order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  // ============================================
  // CALCULS ET STATISTIQUES
  // ============================================

  /**
   * Groupe les pointages par mois
   */
  private static groupByMonth(dailyDetails: DailyDetail[]): Record<string, DailyDetail[]> {
    const grouped: Record<string, DailyDetail[]> = {};

    dailyDetails.forEach(detail => {
      const date = new Date(detail.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }

      grouped[monthKey].push(detail);
    });

    // Trier les détails de chaque mois par date décroissante
    Object.keys(grouped).forEach(month => {
      grouped[month].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return grouped;
  }

  /**
   * Calcule les statistiques globales
   */
  private static calculateGlobalStats(dailyDetails: DailyDetail[]): GlobalAttendanceStats {
    const stats: GlobalAttendanceStats = {
      total_days: dailyDetails.length,
      present_days: 0,
      late_days: 0,
      absent_days: 0,
      off_days: 0,
      total_delay_minutes: 0,
      total_work_hours: 0,
      max_delay_minutes: 0,
      average_delay_minutes: 0,
      consecutive_present_days: 0,
      consecutive_absent_days: 0,
      best_month_key: '',
      worst_month_key: ''
    };

    let currentConsecutivePresent = 0;
    let currentConsecutiveAbsent = 0;

    dailyDetails.forEach(detail => {
      switch (detail.status) {
        case 'present':
          stats.present_days++;
          currentConsecutivePresent++;
          currentConsecutiveAbsent = 0;
          break;
        case 'late':
          stats.late_days++;
          currentConsecutivePresent++;
          currentConsecutiveAbsent = 0;
          break;
        case 'absent':
          stats.absent_days++;
          currentConsecutiveAbsent++;
          currentConsecutivePresent = 0;
          break;
        case 'off-day':
          stats.off_days++;
          break;
      }

      if (detail.delay_minutes) {
        stats.total_delay_minutes += detail.delay_minutes;
        stats.max_delay_minutes = Math.max(stats.max_delay_minutes, detail.delay_minutes);
      }

      if (detail.work_hours) {
        stats.total_work_hours += detail.work_hours;
      }

      stats.consecutive_present_days = Math.max(
          stats.consecutive_present_days,
          currentConsecutivePresent
      );
      stats.consecutive_absent_days = Math.max(
          stats.consecutive_absent_days,
          currentConsecutiveAbsent
      );
    });

    // Calcul du retard moyen
    if (stats.late_days > 0) {
      stats.average_delay_minutes = stats.total_delay_minutes / stats.late_days;
    }

    return stats;
  }

  /**
   * Calcule les statistiques mensuelles
   */
  private static calculateMonthlyStats(
      attendanceByMonth: Record<string, DailyDetail[]>
  ): Record<string, MonthlyStats> {
    const monthlyStats: Record<string, MonthlyStats> = {};

    Object.entries(attendanceByMonth).forEach(([month, details]) => {
      const stats: MonthlyStats = {
        month,
        total_days: details.length,
        present_days: 0,
        late_days: 0,
        absent_days: 0,
        off_days: 0,
        total_delay_minutes: 0,
        total_work_hours: 0,
        attendance_rate: 0,
        punctuality_rate: 0,
        average_delay_minutes: 0
      };

      let workDaysExpected = 0;

      details.forEach(detail => {
        if (detail.status !== 'off-day') {
          workDaysExpected++;
        }

        switch (detail.status) {
          case 'present':
            stats.present_days++;
            break;
          case 'late':
            stats.late_days++;
            break;
          case 'absent':
            stats.absent_days++;
            break;
          case 'off-day':
            stats.off_days++;
            break;
        }

        if (detail.delay_minutes) {
          stats.total_delay_minutes += detail.delay_minutes;
        }

        if (detail.work_hours) {
          stats.total_work_hours += detail.work_hours;
        }
      });

      // Calculer les taux
      if (workDaysExpected > 0) {
        stats.attendance_rate = ((stats.present_days + stats.late_days) / workDaysExpected) * 100;
        stats.punctuality_rate = (stats.present_days / workDaysExpected) * 100;

        if (stats.late_days > 0) {
          stats.average_delay_minutes = stats.total_delay_minutes / stats.late_days;
        }
      }

      monthlyStats[month] = stats;
    });

    return monthlyStats;
  }

  /**
   * Calcule le nombre de jours entre deux dates
   */
  private static calculateDaysBetween(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // ============================================
  // COMPARAISON D'EMPLOYÉS
  // ============================================

  /**
   * Compare les pointages de deux employés
   */
  static async compareEmployeeAttendance(
      managerGuid: string,
      employee1Guid: string,
      employee2Guid: string,
      startDate: string,
      endDate: string
  ): Promise<AttendanceComparison> {
    try {
      const [history1, history2] = await Promise.all([
        this.getEmployeeAttendanceByDateRange(managerGuid, employee1Guid, startDate, endDate),
        this.getEmployeeAttendanceByDateRange(managerGuid, employee2Guid, startDate, endDate)
      ]);

      const workDays1 = history1.globalStats.total_days - history1.globalStats.off_days;
      const workDays2 = history2.globalStats.total_days - history2.globalStats.off_days;

      const attendanceRate1 = workDays1 > 0
          ? ((history1.globalStats.present_days + history1.globalStats.late_days) / workDays1) * 100
          : 0;

      const attendanceRate2 = workDays2 > 0
          ? ((history2.globalStats.present_days + history2.globalStats.late_days) / workDays2) * 100
          : 0;

      const punctualityRate1 = workDays1 > 0
          ? (history1.globalStats.present_days / workDays1) * 100
          : 0;

      const punctualityRate2 = workDays2 > 0
          ? (history2.globalStats.present_days / workDays2) * 100
          : 0;

      return {
        employee1: {
          guid: employee1Guid,
          name: `${history1.employee.first_name} ${history1.employee.last_name}`,
          stats: history1.globalStats
        },
        employee2: {
          guid: employee2Guid,
          name: `${history2.employee.first_name} ${history2.employee.last_name}`,
          stats: history2.globalStats
        },
        comparison: {
          attendance_rate_diff: attendanceRate1 - attendanceRate2,
          punctuality_rate_diff: punctualityRate1 - punctualityRate2,
          delay_minutes_diff: history1.globalStats.total_delay_minutes - history2.globalStats.total_delay_minutes,
          work_hours_diff: history1.globalStats.total_work_hours - history2.globalStats.total_work_hours
        }
      };
    } catch (error: any) {
      console.error('❌ Erreur comparaison employés:', error);
      throw error;
    }
  }

  // ============================================
  // PÉRIODES PRÉDÉFINIES
  // ============================================

  /**
   * Retourne les dates pour une période prédéfinie
   */
  static getPeriodDates(period: PredefinedPeriod): PeriodDates {
    const today = new Date();
    const start = new Date();
    let end = new Date();

    switch (period) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          label: "Aujourd'hui"
        };

      case 'yesterday':
        start.setDate(today.getDate() - 1);
        return {
          start: start.toISOString().split('T')[0],
          end: start.toISOString().split('T')[0],
          label: 'Hier'
        };

      case 'this_week':
        start.setDate(today.getDate() - today.getDay() + 1);
        return {
          start: start.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          label: 'Cette semaine'
        };

      case 'last_week':
        start.setDate(today.getDate() - today.getDay() - 6);
        end.setDate(today.getDate() - today.getDay());
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          label: 'Semaine dernière'
        };

      case 'this_month':
        start.setDate(1);
        return {
          start: start.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          label: 'Ce mois-ci'
        };

      case 'last_month':
        start.setMonth(today.getMonth() - 1);
        start.setDate(1);
        end.setMonth(today.getMonth());
        end.setDate(0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          label: 'Mois dernier'
        };

      case 'last_3_months':
        start.setMonth(today.getMonth() - 3);
        return {
          start: start.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          label: '3 derniers mois'
        };

      case 'last_6_months':
        start.setMonth(today.getMonth() - 6);
        return {
          start: start.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          label: '6 derniers mois'
        };

      case 'this_year':
        start.setMonth(0);
        start.setDate(1);
        return {
          start: start.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          label: 'Cette année'
        };

      case 'last_year':
        start.setFullYear(today.getFullYear() - 1);
        start.setMonth(0);
        start.setDate(1);
        end.setFullYear(today.getFullYear() - 1);
        end.setMonth(11);
        end.setDate(31);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          label: 'Année dernière'
        };

      default:
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          label: "Aujourd'hui"
        };
    }
  }

  // ============================================
  // EXPORT DE DONNÉES
  // ============================================

  /**
   * Prépare les données pour l'export
   */
  static prepareAttendanceExport(history: EmployeeAttendanceHistory): AttendanceExportData {
    const workDays = history.globalStats.total_days - history.globalStats.off_days;
    const attendanceRate = workDays > 0
        ? ((history.globalStats.present_days + history.globalStats.late_days) / workDays) * 100
        : 0;
    const punctualityRate = workDays > 0
        ? (history.globalStats.present_days / workDays) * 100
        : 0;

    return {
      employee: {
        guid: history.employee.guid,
        name: `${history.employee.first_name} ${history.employee.last_name}`,
        employee_code: history.employee.employee_code,
        department: history.employee.department,
        job_title: history.employee.job_title
      },
      period: {
        start: history.period.start,
        end: history.period.end
      },
      summary: {
        total_days: history.globalStats.total_days,
        present_days: history.globalStats.present_days,
        late_days: history.globalStats.late_days,
        absent_days: history.globalStats.absent_days,
        attendance_rate: Math.round(attendanceRate * 100) / 100,
        punctuality_rate: Math.round(punctualityRate * 100) / 100
      },
      details: history.allDailyDetails.map(detail => ({
        date: detail.date,
        day_of_week: new Date(detail.date).toLocaleDateString('fr-FR', { weekday: 'long' }),
        status: this.getStatusLabel(detail.status),
        expected_time: detail.expected_time || '',
        clock_in_time: detail.clock_in_time,
        clock_out_time: detail.clock_out_time,
        delay_minutes: detail.delay_minutes,
        work_hours: detail.work_hours
      }))
    };
  }

  /**
   * Exporte les données en CSV
   */
  static exportToCSV(history: EmployeeAttendanceHistory): string {
    const exportData = this.prepareAttendanceExport(history);

    const headers = [
      'Date',
      'Jour',
      'Statut',
      'Heure prévue',
      'Arrivée',
      'Départ',
      'Retard (min)',
      'Heures travaillées'
    ];

    const rows = exportData.details.map(detail => [
      detail.date,
      detail.day_of_week,
      detail.status,
      detail.expected_time,
      detail.clock_in_time || '',
      detail.clock_out_time || '',
      detail.delay_minutes?.toString() || '0',
      detail.work_hours?.toString() || '0'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Exporte les données en JSON
   */
  static exportToJSON(history: EmployeeAttendanceHistory): string {
    const exportData = this.prepareAttendanceExport(history);
    return JSON.stringify(exportData, null, 2);
  }


//   /**
//    * Formate le label d'un mois
//    */
  static formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  /**
   * Retourne le label d'un statut
   */
  static getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      'present': 'Présent',
      'late': 'En retard',
      'absent': 'Absent',
      'off-day': 'Repos',
      'on-pause': 'En pause',
      'active': 'Actif'
    };
    return statusMap[status] || status;
  }

  /**
   * Formate les minutes en texte lisible
   */
  static formatMinutesToText(minutes: number): string {
    if (minutes === 0) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h${mins.toString().padStart(2, '0')}`;
    }
    return `${mins} min`;
  }
}

