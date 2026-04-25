import {ApiResponse} from '@toke/shared';

import {apiRequest} from '@/tools/Fetch.Client';
import {
    AttendanceApiResponse,
    CreateEmployeePayload,
    CreateEmployeeResponse,
    DashboardData, EmployeeAttendance, TransformedEmployee
} from "@/utils/interfaces/stat.interface";

const baseUrl = '/user';


export default class UserService {

    // ============================================
    // CRÉATION D'UN EMPLOYÉ
    // ============================================

    static async createEmployee(
        payload: CreateEmployeePayload
    ): Promise<ApiResponse<CreateEmployeeResponse['data']>> {
        try {
            return await apiRequest<ApiResponse<CreateEmployeeResponse['data']>>({
                path: `${baseUrl}/`,
                method: 'POST',
                data: payload,
            });
        } catch (error: any) {
            console.error('❌ Erreur lors de la création de l\'employé:', error);
            throw error;
        }
    }

    // ============================================
    // MODIFICATION D'UN EMPLOYE
    // ============================================

    static async updateEmployee(
        employeeGuid: string,
        manager: string,
        payload: Partial<CreateEmployeePayload>
    ): Promise<ApiResponse> {
        try {

            const response = await apiRequest<ApiResponse>({
                path: `${baseUrl}/${employeeGuid}?manager=${manager}`,
                method: 'PUT',
                data: payload,
            });
            console.log('✅ Employé mis à jour:', response);
            return response;
        } catch (error: any) {
            console.error('❌ Erreur lors de la mise à jour de l\'employé:', error);
            throw error;
        }
    }

    // ============================================
    // MÉTHODE UTILITAIRE : MAPPING FORMULAIRE → PAYLOAD
    // ============================================

    /**
     * Transforme les données brutes du formulaire Vue en payload propre pour l'API.
     * Centraliser ce mapping ici évite de polluer la logique Vue avec des détails API.
     *
     * @param formData - L'objet `reactive` du formulaire.
     * @param supervisorGuid - Le GUID du manager connecté (récupéré depuis le store auth).
     */
    static buildCreatePayload(
        formData: {
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
            employeeId: string;
            position: string;
            department: string;
            hireDate: string;
            address?: { country?: string };
        },
        supervisorGuid: string
    ): CreateEmployeePayload {
        return {
            supervisor:     supervisorGuid,
            email:          formData.email.trim().toLowerCase(),
            first_name:     formData.firstName.trim(),
            last_name:      formData.lastName.trim(),
            phone_number:   formData.phone.trim(),
            employee_code:  formData.employeeId.trim().toUpperCase(),
            hire_date:      formData.hireDate,           // déjà au format YYYY-MM-DD (input type="date")
            department:     formData.department.trim().toUpperCase(),
            job_title:      formData.position.trim().toUpperCase(),
            country:        formData.address?.country?.trim().toUpperCase() || 'CM',
        };
    }

    // ============================================
    // MÉTHODES EXISTANTES (inchangées)
    // ============================================

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
     * Transforme un employé de l'API en format utilisable par le dashboard.
     * Utilise le dernier jour de la période comme statut courant.
     */
    static transformEmployee(employeeData: EmployeeAttendance): TransformedEmployee {
        const { employee, period_stats, daily_details } = employeeData;

        // Le statut courant = le dernier détail de la période (pas forcément [0])
        const sortedDetails = [...daily_details].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const todayDetail = sortedDetails[0] || null;

        const firstName = employee.first_name || '';
        const lastName = employee.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();

        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

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
            case 'anomaly_off_day':
                statusText = 'Anomalie – Jour OFF';
                statusColor = 'orange';
                break;
            case 'active':
                statusText = 'Actif';
                statusColor = 'green';
                break;
        }

        let priority: 'high' | 'medium' | 'low' = 'low';
        if (status === 'absent' || status === 'late') {
            priority = 'high';
        } else if (status === 'on-pause') {
            priority = 'medium';
        }

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

            const allTransformedEmployees = apiData.employees.map(emp =>
                this.transformEmployee(emp)
            );

            const presentEmployees = allTransformedEmployees.filter(emp => emp.status === 'present');
            const lateEmployees = allTransformedEmployees.filter(emp => emp.status === 'late');
            const absentEmployees = allTransformedEmployees.filter(emp => emp.status === 'absent');
            const offDayEmployees = allTransformedEmployees.filter(emp => emp.status === 'off-day' || emp.status === 'anomaly_off_day');
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
                daily_breakdown: apiData.daily_breakdown,
            };
        } catch (error: any) {
            console.error('❌ Erreur lors de la récupération des données du dashboard:', error);
            throw error;
        }
    }
}


// import {ApiResponse} from '@toke/shared';
//
// import {apiRequest} from '@/tools/Fetch.Client';
//
// const baseUrl = '/user';
//
//
// // ============================================
// // INTERFACE : CRÉATION D'EMPLOYÉ
// // ============================================
//
// /**
//  * Payload envoyé à l'API pour créer un employé.
//  * Tous les champs correspondent exactement aux clés attendues par le backend.
//  */
// export interface CreateEmployeePayload {
//   supervisor: string;       // GUID du manager connecté
//   email: string;
//   first_name: string;
//   last_name: string;
//   phone_number: string;
//   employee_code: string;
//   hire_date: string;        // Format ISO : "YYYY-MM-DD"
//   department: string;
//   job_title: string;
//   country: string;          // Code ISO 2 lettres, ex: "CM"
// }
//
// /**
//  * Réponse de l'API après création d'un employé.
//  * À adapter selon ce que votre backend renvoie réellement.
//  */
// export interface CreateEmployeeResponse {
//   success: boolean;
//   data: {
//     message: string;
//     employee: EmployeeInfo;
//   };
// }
//
// // ============================================
// // INTERFACES EXISTANTES (inchangées)
// // ============================================
//
// export interface SubordinateResponse {
//   id: number;
//   guid: string;
//   name: string;
//   email: string;
//   position: string;
//   siteId: number | string;
//   punctualityScore?: number;
//   avatar?: string;
//   first_name?: string;
//   last_name?: string;
//   job_title?: string;
//   employee_code?: string;
//   department?: string;
// }
//
// export interface EmployeeInfo {
//   guid: string;
//   tenant: string;
//   email: string;
//   first_name: string;
//   last_name: string;
//   phone_number: string;
//   country: string;
//   employee_code: string;
//   avatar_url: string | null;
//   hire_date: string;
//   department: string;
//   job_title: string;
//   active: boolean;
//   last_login_at: string | null;
//   assignment_info: {
//     current_type: string;
//     active_schedule_assignment: string | null;
//     active_rotation_assignment: string | null;
//   };
// }
//
// export interface PeriodStats {
//   work_days_expected: number;
//   present_days: number;
//   late_days: number;
//   absent_days: number;
//   off_days: number;
//   total_delay_minutes: number;
//   average_delay_minutes: number;
//   max_delay_minutes: number;
//   total_work_hours: number;
//   average_work_hours_per_day: number;
//   attendance_rate: number;
//   punctuality_rate: number;
// }
//
// export interface DailyDetail {
//   date: string;
//   status: 'present' | 'late' | 'absent' | 'off-day' | 'active' | 'on-pause';
//   clock_in_time: string | null;
//   clock_out_time: string | null;
//   expected_time: string;
//   delay_minutes: number | null;
//   work_hours: number | null;
//   pause_start_time?: string | null;
//   pause_end_time?: string | null;
//   mission_start_time?: string | null;
//   mission_end_time?: string | null;
// }
//
// export interface EmployeeAttendance {
//   employee: EmployeeInfo;
//   period_stats: PeriodStats;
//   daily_details: DailyDetail[];
// }
//
// export interface Summary {
//   total_team_members: number;
//   total_present_on_time: number;
//   total_late_arrivals: number;
//   total_absences: number;
//   total_off_days: number;
//   total_expected_workdays: number;
//   attendance_rate: number;
//   punctuality_rate: number;
//   average_delay_minutes: number;
//   total_work_hours: number;
//   average_work_hours_per_day: number;
//   currently_active: number;
//   currently_on_pause: number;
// }
//
// export interface AttendanceApiResponse {
//   success: boolean;
//   data: {
//     message: string;
//     data: {
//       period: {
//         start: string;
//         end: string;
//         total_days: number;
//       };
//       filters: {
//         manager_guid: string;
//         site_guid: string | null;
//       };
//       summary: Summary;
//       daily_breakdown: Array<{
//         date: string;
//         day_of_week: string;
//         expected_count: number;
//         present: number;
//         late: number;
//         absent: number;
//         off_day: number;
//       }>;
//       employees: EmployeeAttendance[];
//     };
//   };
// }
//
// // ============================================
// // INTERFACES DE TRANSFORMATION
// // ============================================
//
// export interface TransformedEmployee {
//   guid: string;
//   name: string;
//   initials: string;
//   avatar: string | null;
//   department: string;
//   job_title: string;
//   status: 'present' | 'late' | 'absent' | 'off-day' | 'on-pause' | 'active';
//   statusText: string;
//   statusColor: string;
//   expectedTime: string;
//   actualTime: string | null;
//   delayMinutes: number | null;
//   delayText: string | null;
//   isLate: boolean;
//   isAbsent: boolean;
//   isPresent: boolean;
//   isOffDay: boolean;
//   priority: 'high' | 'medium' | 'low';
//   punctualityScore: number;
//   currently_active: boolean;
//   daily_details: DailyDetail[];
//   period_stats: PeriodStats;
//   clockOutTime: string | null;
//   pause_start_time?: string | null;
//   pause_end_time?: string | null;
//   mission_start_time?: string | null;
//   mission_end_time?: string | null;
// }
//
// export interface DashboardData {
//   summary: Summary;
//   employees: TransformedEmployee[];
//   presentEmployees: TransformedEmployee[];
//   lateEmployees: TransformedEmployee[];
//   absentEmployees: TransformedEmployee[];
//   offDayEmployees: TransformedEmployee[];
//   onPauseEmployees: TransformedEmployee[];
//   activeEmployees: TransformedEmployee[];
//   date: string;
//   period: {
//     start: string;
//     end: string;
//     total_days: number;
//   };
// }
//
//
// export default class UserService {
//
//   // ============================================
//   // CRÉATION D'UN EMPLOYÉ
//   // ============================================
//
//   static async createEmployee(
//       payload: CreateEmployeePayload
//   ): Promise<ApiResponse<CreateEmployeeResponse['data']>> {
//     try {
//         return await apiRequest<ApiResponse<CreateEmployeeResponse['data']>>({
//           path: `${baseUrl}/`,
//           method: 'POST',
//           data: payload,
//       });
//     } catch (error: any) {
//       console.error('❌ Erreur lors de la création de l\'employé:', error);
//       throw error;
//     }
//   }
//
//   // ============================================
//   // MODIFICATION D'UN EMPLOYE
//   // ============================================
//
//   static async updateEmployee(
//       employeeGuid: string,
//       manager: string,
//       payload: Partial<CreateEmployeePayload>
//   ): Promise<ApiResponse> {
//     try {
//
//       const response = await apiRequest<ApiResponse>({
//         path: `${baseUrl}/${employeeGuid}?manager=${manager}`,
//         method: 'PUT',
//         data: payload,
//       });
//       console.log('✅ Employé mis à jour:', response);
//       return response;
//     } catch (error: any) {
//       console.error('❌ Erreur lors de la mise à jour de l\'employé:', error);
//       throw error;
//     }
//   }
//
//   // ============================================
//   // MÉTHODE UTILITAIRE : MAPPING FORMULAIRE → PAYLOAD
//   // ============================================
//
//   /**
//    * Transforme les données brutes du formulaire Vue en payload propre pour l'API.
//    * Centraliser ce mapping ici évite de polluer la logique Vue avec des détails API.
//    *
//    * @param formData - L'objet `reactive` du formulaire.
//    * @param supervisorGuid - Le GUID du manager connecté (récupéré depuis le store auth).
//    */
//   static buildCreatePayload(
//       formData: {
//         firstName: string;
//         lastName: string;
//         email: string;
//         phone: string;
//         employeeId: string;
//         position: string;
//         department: string;
//         hireDate: string;
//         address?: { country?: string };
//       },
//       supervisorGuid: string
//   ): CreateEmployeePayload {
//     return {
//       supervisor:     supervisorGuid,
//       email:          formData.email.trim().toLowerCase(),
//       first_name:     formData.firstName.trim(),
//       last_name:      formData.lastName.trim(),
//       phone_number:   formData.phone.trim(),
//       employee_code:  formData.employeeId.trim().toUpperCase(),
//       hire_date:      formData.hireDate,           // déjà au format YYYY-MM-DD (input type="date")
//       department:     formData.department.trim().toUpperCase(),
//       job_title:      formData.position.trim().toUpperCase(),
//       country:        formData.address?.country?.trim().toUpperCase() || 'CM',
//     };
//   }
//
//   // ============================================
//   // MÉTHODES EXISTANTES (inchangées)
//   // ============================================
//
//   /**
//    * Récupère la liste des subordonnés d'un manager
//    */
//   static async listSubordinates(managerGuid: string): Promise<ApiResponse> {
//     try {
//       const response = await apiRequest<ApiResponse>({
//         path: `${baseUrl}/employee/all-subordinates?supervisor=${managerGuid}`,
//         method: 'GET',
//       });
//
//       console.log('✅ Subordonnés récupérés:', response);
//       return response;
//     } catch (error: any) {
//       console.error('❌ Erreur lors de la récupération des subordonnés:', error);
//       throw error;
//     }
//   }
//
//   static async listAttendance(
//       managerGuid: string,
//       startDate?: string,
//       endDate?: string
//   ): Promise<ApiResponse<AttendanceApiResponse['data']>> {
//     try {
//       let start = startDate || new Date().toISOString().split('T')[0];
//       let end = endDate || new Date().toISOString().split('T')[0];
//       const params = new URLSearchParams();
//
//       params.append('supervisor', managerGuid);
//       params.append('start_date', start);
//       params.append('end_date', end);
//
//       const response = await apiRequest<ApiResponse<AttendanceApiResponse['data']>>({
//         path: `${baseUrl}/attendance/stat?${params.toString()}`,
//         method: 'GET',
//       });
//
//       console.log('✅ Données d\'assiduité récupérées:', response);
//       return response;
//     } catch (error: any) {
//       console.error('❌ Erreur lors de la récupération des données d\'assiduité:', error);
//       throw error;
//     }
//   }
//
//   /**
//    * Transforme un employé de l'API en format utilisable par le dashboard
//    */
//   static transformEmployee(employeeData: EmployeeAttendance): TransformedEmployee {
//     const { employee, period_stats, daily_details } = employeeData;
//     const todayDetail = daily_details[0] || null;
//
//     const firstName = employee.first_name || '';
//     const lastName = employee.last_name || '';
//     const fullName = `${firstName} ${lastName}`.trim();
//
//     const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
//
//     let status = todayDetail?.status || 'absent';
//     let statusText = '';
//     let statusColor: 'green' | 'red' | 'orange' | 'blue' | 'gray' = 'gray';
//
//     switch (status) {
//       case 'present':
//         statusText = 'Présent';
//         statusColor = 'green';
//         break;
//       case 'late':
//         statusText = 'En retard';
//         statusColor = 'orange';
//         break;
//       case 'absent':
//         statusText = 'Absent';
//         statusColor = 'red';
//         break;
//       case 'on-pause':
//         statusText = 'En pause';
//         statusColor = 'blue';
//         break;
//       case 'off-day':
//         statusText = 'Jour de repos';
//         statusColor = 'gray';
//         break;
//       case 'active':
//         statusText = 'Actif';
//         statusColor = 'green';
//         break;
//     }
//
//     let priority: 'high' | 'medium' | 'low' = 'low';
//     if (status === 'absent' || status === 'late') {
//       priority = 'high';
//     } else if (status === 'on-pause') {
//       priority = 'medium';
//     }
//
//     let delayText = null;
//     if (todayDetail?.delay_minutes && todayDetail.delay_minutes > 0) {
//       const hours = Math.floor(todayDetail.delay_minutes / 60);
//       const minutes = todayDetail.delay_minutes % 60;
//
//       if (hours > 0) {
//         delayText = `${hours}h${minutes.toString().padStart(2, '0')}`;
//       } else {
//         delayText = `${minutes} min`;
//       }
//     }
//
//     return {
//       guid: employee.guid,
//       name: fullName,
//       initials,
//       job_title: employee.job_title,
//       department: employee.department,
//       avatar: employee.avatar_url,
//       status,
//       statusText,
//       statusColor,
//       expectedTime: todayDetail?.expected_time || '08:00',
//       actualTime: todayDetail?.clock_in_time || null,
//       clockOutTime: todayDetail?.clock_out_time || null,
//       delayMinutes: todayDetail?.delay_minutes || null,
//       delayText,
//       isLate: status === 'late',
//       isAbsent: status === 'absent',
//       isPresent: status === 'present',
//       isOffDay: status === 'off-day',
//       punctualityScore: Math.round(period_stats.punctuality_rate),
//       priority,
//       currently_active: status === 'active',
//       daily_details,
//       period_stats,
//       pause_start_time: todayDetail?.pause_start_time,
//       pause_end_time: todayDetail?.pause_end_time,
//       mission_start_time: todayDetail?.mission_start_time,
//       mission_end_time: todayDetail?.mission_end_time
//     };
//   }
//
//   /**
//    * Récupère et transforme toutes les données pour le dashboard
//    */
//   static async getDashboardData(
//       managerGuid: string,
//       startDate?: string,
//       endDate?: string
//   ): Promise<DashboardData> {
//     try {
//       const response = await this.listAttendance(managerGuid, startDate, endDate);
//
//       if (!response.success || !response.data?.data) {
//         throw new Error('Format de réponse invalide');
//       }
//
//       const apiData = response.data.data;
//
//       const allTransformedEmployees = apiData.employees.map(emp =>
//           this.transformEmployee(emp)
//       );
//
//       const presentEmployees = allTransformedEmployees.filter(emp => emp.status === 'present');
//       const lateEmployees = allTransformedEmployees.filter(emp => emp.status === 'late');
//       const absentEmployees = allTransformedEmployees.filter(emp => emp.status === 'absent');
//       const offDayEmployees = allTransformedEmployees.filter(emp => emp.status === 'off-day');
//       const onPauseEmployees = allTransformedEmployees.filter(emp => emp.status === 'on-pause');
//       const activeEmployees = allTransformedEmployees.filter(emp => emp.status === 'active');
//
//       return {
//         summary: apiData.summary,
//         employees: allTransformedEmployees,
//         presentEmployees,
//         lateEmployees,
//         absentEmployees,
//         offDayEmployees,
//         onPauseEmployees,
//         activeEmployees,
//         date: apiData.period.start,
//         period: apiData.period,
//       };
//     } catch (error: any) {
//       console.error('❌ Erreur lors de la récupération des données du dashboard:', error);
//       throw error;
//     }
//   }
// }