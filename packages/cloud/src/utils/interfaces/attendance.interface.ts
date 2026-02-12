/**
 * Interfaces pour la gestion des pointages et de l'historique
 */

import type { DailyDetail, PeriodStats, EmployeeInfo } from '@/service/UserService';

// ============================================
// HISTORIQUE DES POINTAGES
// ============================================

export interface EmployeeAttendanceHistory {
    employee: EmployeeInfo;
    period: {
        start: string;
        end: string;
        total_days: number;
    };
    globalStats: GlobalAttendanceStats;
    periodStats: PeriodStats;
    allDailyDetails: DailyDetail[];
    attendanceByMonth: Record<string, DailyDetail[]>;
    monthlyStats: Record<string, MonthlyStats>;
}

export interface GlobalAttendanceStats {
    total_days: number;
    present_days: number;
    late_days: number;
    absent_days: number;
    off_days: number;
    total_delay_minutes: number;
    total_work_hours: number;
    max_delay_minutes: number;
    average_delay_minutes: number;
    consecutive_present_days: number;
    consecutive_absent_days: number;
    best_month_key: string;
    worst_month_key: string;
}

export interface MonthlyStats {
    month: string;
    total_days: number;
    present_days: number;
    late_days: number;
    absent_days: number;
    off_days: number;
    total_delay_minutes: number;
    total_work_hours: number;
    attendance_rate: number;
    punctuality_rate: number;
    average_delay_minutes: number;
}

// ============================================
// FILTRES ET OPTIONS
// ============================================

export interface AttendanceFilterOptions {
    startDate?: string;
    endDate?: string;
    status?: 'present' | 'late' | 'absent' | 'off-day' | 'on-pause' | 'active' | 'all';
    minDelayMinutes?: number;
    maxDelayMinutes?: number;
}

export interface AttendanceSortOptions {
    field: 'date' | 'status' | 'delay_minutes' | 'work_hours';
    order: 'asc' | 'desc';
}

// ============================================
// STATISTIQUES COMPARATIVES
// ============================================

export interface AttendanceComparison {
    employee1: {
        guid: string;
        name: string;
        stats: GlobalAttendanceStats;
    };
    employee2: {
        guid: string;
        name: string;
        stats: GlobalAttendanceStats;
    };
    comparison: {
        attendance_rate_diff: number;
        punctuality_rate_diff: number;
        delay_minutes_diff: number;
        work_hours_diff: number;
    };
}

// ============================================
// EXPORT DE DONNÉES
// ============================================

export interface AttendanceExportData {
    employee: {
        guid: string;
        name: string;
        employee_code: string;
        department: string;
        job_title: string;
    };
    period: {
        start: string;
        end: string;
    };
    summary: {
        total_days: number;
        present_days: number;
        late_days: number;
        absent_days: number;
        attendance_rate: number;
        punctuality_rate: number;
    };
    details: Array<{
        date: string;
        day_of_week: string;
        status: string;
        expected_time: string;
        clock_in_time: string | null;
        clock_out_time: string | null;
        delay_minutes: number | null;
        work_hours: number | null;
    }>;
}

// ============================================
// PÉRIODES PRÉDÉFINIES
// ============================================

export type PredefinedPeriod = 'today' | 'yesterday' | 'this_week' | 'last_week' |
    'this_month' | 'last_month' | 'last_3_months' |
    'last_6_months' | 'this_year' | 'last_year';

export interface PeriodDates {
    start: string;
    end: string;
    label: string;
}