export interface SchedulePlanningSlot {
    work: [string, string]
    pause?: [string, string]
}

export interface SchedulePlanningMember {
    guid: string
    name: string
    firstName?: string
    lastName?: string
    code: string
    employeeColor: string | null
    groupName: string | null
    scheduleByDate: Record<string, SchedulePlanningSlot[]>
    restByDate: Record<string, boolean>
    /** Compatibilité avec les exports détaillés existants. */
    schedule: Record<string, SchedulePlanningSlot[]>
}

export interface ScheduleCalendarDay {
    iso: string
    dayLabel: string
    dayNum: string
    monthNum: string
    isWeekend: boolean
    isToday: boolean
    jsDay: number
}

export type PlanningDisplayMode = 'detailed' | 'simple' | 'optimized'


export interface ScheduleDayAdjustmentTarget {
    member: SchedulePlanningMember
    date: string
}