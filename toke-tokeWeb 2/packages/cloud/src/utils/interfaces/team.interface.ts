export interface Root {
  success: boolean
  data: Data
}

export interface Data {
  message?: string
  data: Data2
}

export interface Data2 {
  date: string
  manager: string
  site_filter: any
  statistics: Statistics
  present_employees: any[]
  late_employees: any[]
  absent_employees: any[]
  off_day_employees: OffDayEmployee[]
  top_late_employees: any[]
  sessions_by_site: any
  all_employees_status: Status[]
}

export interface Statistics {
  total_team_members: number
  expected_to_work: number
  present_on_time: number
  present_to_days: number
  late_arrivals: number
  absences: number
  off_day: number
  currently_active: number
  on_pause: number
  on_mission: number
  checked_out: number
  total_work_hours: string
  average_work_hours: string
  attendance_rate: string
  punctuality_rate: string
}

export interface OffDayEmployee {
  employee: string
  schedule_info: ScheduleInfo
}

export interface ScheduleInfo {
  template_name: string
  source: string
  is_work_day: boolean
  expected_blocks: any[]
  tolerance_minutes: number
}

export interface Status {
  employee: Employee
  roles: Roles
  status: string
  expected_schedule: ExpectedSchedule
  clock_in_time: any
  delay_minutes: any
  is_active: boolean
  session: any
  memos: Memos
  time_entries: TimeEntries
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
  hire_date?: string
  department: string
  job_title?: string
  active: boolean
  last_login_at: any
}

export interface Roles {
  count: number
  items: Item[]
}

export interface Item {
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

export interface ExpectedSchedule {
  template_name: string
  source: string
  is_work_day: boolean
  expected_blocks: any[]
  tolerance_minutes: number
}

export interface Memos {
  count: number
  items: Item2[]
}

export interface Item2 {
  guid: string
  memo_type: string
  memo_status: string
  title: string
  memo_content: MemoContent[]
  incident_date_time: string
  auto_generated: boolean
  created_at: string
  updated_at: string
  affected_entries: string[]
  messages_count: number
  latest_message: LatestMessage
  author_user: string
  target_user: string
}

export interface MemoContent {
  user: string
  message: Message[]
  created_at: string
  type?: string
}

export interface Message {
  type: string
  content: string
}

export interface LatestMessage {
  user: string
  message: Message2[]
  created_at: string
  type?: string
}

export interface Message2 {
  type: string
  content: string
}

export interface TimeEntries {
  count: number
  items: Item3[]
}

export interface Item3 {
  guid: string
  pointage_type: string
  pointage_status: string
  clocked_at: string
  server_received_at: string
  real_clocked_at: any
  created_offline: boolean
  coordinates: string
  gps_accuracy: any
  correction_reason: any
  user: string
  site: string
  session: string
  memo: string
}
