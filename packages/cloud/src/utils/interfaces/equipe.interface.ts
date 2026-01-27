export interface Data {
  supervisor: string
  summary: Summary
  employees_by_group: EmployeesByGroup[]
  employees_without_group: EmployeesWithoutGroup[]
  sub_teams: SubTeam[]
}

export interface Summary {
  total_employees: number
  direct_employees: number
  sub_managers_count: number
  employees_in_groups: number
  employees_without_group: number
}

export interface EmployeesByGroup {
  group: Group
  count: number
  employees: Employee[]
}

export interface Group {
  name: string
  guid: string
  assignment_info: AssignmentInfo
}

export interface AssignmentInfo {
  current_type: string
  active_schedule_assignment: any
  active_rotation_assignment?: ActiveRotationAssignment
}

export interface ActiveRotationAssignment {
  guid: string
  offset: number
  assigned_at: string
  assigned_by: AssignedBy
  rotation_group: RotationGroup
}

export interface AssignedBy {
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

export interface RotationGroup {
  guid: string
  tenant: string
  name: string
  cycle_length: number
  cycle_unit: string
  start_date: string
  active: boolean
  cycle_templates: CycleTemplate[]
}

export interface CycleTemplate {
  guid: string
  tenant: string
  name: string
  valid_from: string
  valid_to: any
  definition: Definition
  is_default: boolean
}

export interface Definition {
  Fri?: Fri[]
  Mon: Mon[]
  Sat?: Sat[]
  Sun?: Sun[]
  Thu?: Thu[]
  Tue?: Tue[]
  Wed?: Wed[]
}

export interface Fri {
  work: string[]
  pause: any
  tolerance: number
}

export interface Mon {
  work: string[]
  pause: any
  tolerance: number
}

export interface Sat {
  work: string[]
  pause: any
  tolerance: number
}

export interface Sun {
  work: string[]
  pause: any
  tolerance: number
}

export interface Thu {
  work: string[]
  pause: any
  tolerance: number
}

export interface Tue {
  work: string[]
  pause: any
  tolerance: number
}

export interface Wed {
  work: string[]
  pause: any
  tolerance: number
}

export interface Employee {
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
  assignment_info: AssignmentInfo3
  roles: Role[]
}

export interface AssignmentInfo3 {
  current_type: string
  active_schedule_assignment?: ActiveScheduleAssignment
  active_rotation_assignment?: ActiveRotationAssignment2
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
  valid_to: string
  definition: Definition2
  is_default: boolean
}

export interface Definition2 {
  Fri: Fri2[]
  Mon: Mon2[]
  Sat: any
  Sun: any
  Thu: Thu2[]
  Tue: Tue2[]
  Wed: Wed2[]
}

export interface Fri2 {
  work: string[]
  pause: string[]
  tolerance: number
}

export interface Mon2 {
  work: string[]
  pause: string[]
  tolerance: number
}

export interface Thu2 {
  work: string[]
  pause: string[]
  tolerance: number
}

export interface Tue2 {
  work: string[]
  pause: string[]
  tolerance: number
}

export interface Wed2 {
  work: string[]
  pause: string[]
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
  assignment_info: AssignmentInfo4
}

export interface AssignmentInfo4 {
  current_type: string
  active_schedule_assignment: any
  active_rotation_assignment: any
}

export interface ActiveRotationAssignment2 {
  guid: string
  offset: number
  assigned_at: string
  assigned_by: AssignedBy2
  rotation_group: RotationGroup2
}

export interface AssignedBy2 {
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
  assignment_info: AssignmentInfo5
}

export interface AssignmentInfo5 {
  current_type: string
  active_schedule_assignment: any
  active_rotation_assignment: any
}

export interface RotationGroup2 {
  guid: string
  tenant: string
  name: string
  cycle_length: number
  cycle_unit: string
  start_date: string
  active: boolean
  cycle_templates: CycleTemplate2[]
}

export interface CycleTemplate2 {
  guid: string
  tenant: string
  name: string
  valid_from: string
  valid_to: any
  definition: Definition3
  is_default: boolean
}

export interface Definition3 {
  Fri?: Fri3[]
  Mon: Mon3[]
  Sat?: Sat2[]
  Sun?: Sun2[]
  Thu?: Thu3[]
  Tue?: Tue3[]
  Wed?: Wed3[]
}

export interface Fri3 {
  work: string[]
  pause: any
  tolerance: number
}

export interface Mon3 {
  work: string[]
  pause: any
  tolerance: number
}

export interface Sat2 {
  work: string[]
  pause: any
  tolerance: number
}

export interface Sun2 {
  work: string[]
  pause: any
  tolerance: number
}

export interface Thu3 {
  work: string[]
  pause: any
  tolerance: number
}

export interface Tue3 {
  work: string[]
  pause: any
  tolerance: number
}

export interface Wed3 {
  work: string[]
  pause: any
  tolerance: number
}

export interface Role {
  guid: string
  code: string
  name: string
  description: string
  permissions: Permissions
  system_role: boolean
}

export interface Permissions {
  memos: string
  pointage: string
}

export interface EmployeesWithoutGroup {
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
  job_title?: string
  active: boolean
  last_login_at: any
  assignment_info: AssignmentInfo6
  roles: Role2[]
}

export interface AssignmentInfo6 {
  current_type: string
  active_schedule_assignment?: ActiveScheduleAssignment2
  active_rotation_assignment?: ActiveRotationAssignment3
}

export interface ActiveScheduleAssignment2 {
  guid: string
  tenant: string
  start_date: string
  end_date: string
  reason: string
  active: boolean
  session_template: SessionTemplate2
  created_by: CreatedBy2
}

export interface SessionTemplate2 {
  guid: string
  tenant: string
  name: string
  valid_from: string
  valid_to: string
  definition: Definition4
  is_default: boolean
}

export interface Definition4 {
  Fri: Fri4[]
  Mon: Mon4[]
  Sat: Sat3[]
  Sun: any
  Thu: Thu4[]
  Tue: Tue4[]
  Wed: Wed4[]
}

export interface Fri4 {
  work: string[]
  pause: string[]
  tolerance: number
}

export interface Mon4 {
  work: string[]
  pause: string[]
  tolerance: number
}

export interface Sat3 {
  work: string[]
  pause: string[]
  tolerance: number
}

export interface Thu4 {
  work: string[]
  pause: string[]
  tolerance: number
}

export interface Tue4 {
  work: string[]
  pause: string[]
  tolerance: number
}

export interface Wed4 {
  work: string[]
  pause: string[]
  tolerance: number
}

export interface CreatedBy2 {
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
  assignment_info: AssignmentInfo7
}

export interface AssignmentInfo7 {
  current_type: string
  active_schedule_assignment: any
  active_rotation_assignment: any
}

export interface ActiveRotationAssignment3 {
  guid: string
  offset: number
  assigned_at: string
  assigned_by: AssignedBy3
  rotation_group: RotationGroup3
}

export interface AssignedBy3 {
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
  assignment_info: AssignmentInfo8
}

export interface AssignmentInfo8 {
  current_type: string
  active_schedule_assignment: any
  active_rotation_assignment: any
}

export interface RotationGroup3 {
  guid: string
  tenant: string
  name: string
  cycle_length: number
  cycle_unit: string
  start_date: string
  active: boolean
  cycle_templates: CycleTemplate3[]
}

export interface CycleTemplate3 {
  guid: string
  tenant: string
  name: string
  valid_from: string
  valid_to: any
  definition: Definition5
  is_default: boolean
}

export interface Definition5 {
  Fri?: Fri5[]
  Mon: Mon5[]
  Sat?: Sat4[]
  Sun?: Sun3[]
  Thu?: Thu5[]
  Tue?: Tue5[]
  Wed?: Wed5[]
}

export interface Fri5 {
  work: string[]
  pause: any
  tolerance: number
}

export interface Mon5 {
  work: string[]
  pause: any
  tolerance: number
}

export interface Sat4 {
  work: string[]
  pause?: string[]
  tolerance: number
}

export interface Sun3 {
  work: string[]
  pause: any
  tolerance: number
}

export interface Thu5 {
  work: string[]
  pause: any
  tolerance: number
}

export interface Tue5 {
  work: string[]
  pause?: string[]
  tolerance: number
}

export interface Wed5 {
  work: string[]
  pause?: string[]
  tolerance: number
}

export interface Role2 {
  guid: string
  code: string
  name: string
  description: string
  permissions: Permissions2
  system_role: boolean
}

export interface Permissions2 {
  memos: string
  pointage: string
}

export interface SubTeam {
  supervisor: string
  summary: Summary2
  employees_by_group: any[]
  employees_without_group: EmployeesWithoutGroup2[]
  sub_teams: any[]
}

export interface Summary2 {
  total_employees: number
  direct_employees: number
  sub_managers_count: number
  employees_in_groups: number
  employees_without_group: number
}

export interface EmployeesWithoutGroup2 {
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
  department?: string
  job_title?: string
  active: boolean
  last_login_at: any
  assignment_info: AssignmentInfo9
  roles: Role3[]
}

export interface AssignmentInfo9 {
  current_type: string
  active_schedule_assignment: any
  active_rotation_assignment: any
}

export interface Role3 {
  guid: string
  code: string
  name: string
  description: string
  permissions: Permissions3
  system_role: boolean
}

export interface Permissions3 {
  memos: string
  pointage: string
}
