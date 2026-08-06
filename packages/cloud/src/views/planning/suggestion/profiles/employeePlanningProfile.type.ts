import type { EmployeePlanningProfile, PlanningMode } from '../planningSuggestion.type'

export interface EmployeeProfilePerson {
  guid: string
  name: string
  employeeCode: string | null
}

export interface EmployeePlanningProfileRow {
  key: string
  person: EmployeeProfilePerson
  profile: EmployeePlanningProfile | null
  inCurrentTeam: boolean
}

export type ProfileReadinessStatus =
  | 'READY'
  | 'INCOMPLETE'
  | 'INACTIVE'
  | 'UNCONFIGURED'
  | 'OUTSIDE_TEAM'

export interface ProfileReadiness {
  status: ProfileReadinessStatus
  label: string
  issues: string[]
}

export type ProfileModeFilter = 'ALL' | PlanningMode
export type ProfileStatusFilter = 'ALL' | ProfileReadinessStatus

export interface BulkProfileResult {
  successCount: number
  failureCount: number
}
