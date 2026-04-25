// ============================================
// INTERFACE : CRÉATION D'EMPLOYÉ
// ============================================

/**
 * Payload envoyé à l'API pour créer un employé.
 * Tous les champs correspondent exactement aux clés attendues par le backend.
 */
export interface CreateEmployeePayload {
    supervisor: string;       // GUID du manager connecté
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    employee_code: string;
    hire_date: string;        // Format ISO : "YYYY-MM-DD"
    department: string;
    job_title: string;
    country: string;          // Code ISO 2 lettres, ex: "CM"
}

/**
 * Réponse de l'API après création d'un employé.
 * À adapter selon ce que votre backend renvoie réellement.
 */
export interface CreateEmployeeResponse {
    success: boolean;
    data: {
        message: string;
        employee: EmployeeInfo;
    };
}

// ============================================
// INTERFACES EXISTANTES (inchangées)
// ============================================

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
    anomaly_off_days: number;
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
    status: 'present' | 'late' | 'absent' | 'off-day' | 'active' | 'on-pause' | 'anomaly_off_day';
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

export interface TeamCoverage {
    timestamp: string;
    currently_present: number;
    currently_on_pause: number;
    expected_today: number;
    coverage_rate: number;
    missing_count: number;
}

export interface UnexpectedPresenceAction {
    type: string;
    label: string;
    deep_link: string;
    count: number;
}

export interface UnexpectedPresence {
    total_anomaly_off_days: number;
    unexpected_presence_rate: number;
    employees_concerned: number;
    occurrences: Array<{
        employee_guid: string;
        employee_name: string;
        date: string;
        clock_in_time: string;
        clock_out_time: string | null;
        work_hours: number | null;
    }>;
    status: 'ok' | 'warning' | 'critical';
    action: UnexpectedPresenceAction;
}

export interface ScheduleCompliance {
    total_clocked: number;
    on_time: number;
    late: number;
    on_time_rate: number;
    avg_deviation_minutes: number;
}

export interface JustificationStatus {
    total_absences: number;
    with_memo: number;
    without_memo: number;
    pending_validation: number;
    approved: number;
    rejected: number;
}

export interface Summary {
    // Membres & présence globale
    total_team_members: number;
    total_present_on_time: number;
    total_late_arrivals: number;
    total_absences: number;
    total_off_days: number;
    total_anomaly_off_days: number;
    total_expected_workdays: number;
    // Taux calculés
    attendance_rate: number;
    punctuality_rate: number;
    average_delay_minutes: number;
    // Heures
    total_work_hours: number;
    average_work_hours_per_day: number;
    // Temps réel
    currently_active: number;
    currently_on_pause: number;
    // Objets enrichis
    team_coverage: TeamCoverage;
    unexpected_presence: UnexpectedPresence;
    schedule_compliance: ScheduleCompliance;
    justification_status: JustificationStatus;
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
                anomaly_off_day: number;
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
    status: 'present' | 'late' | 'absent' | 'off-day' | 'on-pause' | 'active'| 'anomaly_off_day';
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
    daily_breakdown: Array<{
        date: string;
        day_of_week: string;
        expected_count: number;
        present: number;
        late: number;
        absent: number;
        off_day: number;
        anomaly_off_day: number;
    }>;
}