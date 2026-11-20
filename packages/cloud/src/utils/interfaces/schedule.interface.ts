export interface SessionTemplate {
  success: boolean
  data: Data
}

export interface Data {
  templates: Templates
}

export interface Templates {
  pagination: Pagination
  items: Item[]
}

export interface Pagination {
  offset: number
  limit: number
  count: number
}

export interface Item {
  guid: string
  name: string
  valid_from: string
  valid_to?: string
  definition: Definition
  is_default: boolean
}

export interface Definition {
  Mon?: Days[]
  Sat?: Days[]
  Fri?: Days[]
  Sun?: Days[]
  Thu?: Days[]
  Tue?: Days[]
  Wed?: Days[]
}

export interface Days {
  work: string[]
  pause?: string[]
  tolerance: number
}

export interface Employee {
  id: number
  name: string
  role: string
  assignedScheduleGuid: string | null
}

export interface Rotation {
  id: number
  name: string
  scheduleGuids: string[]
  employeeIds: number[]
  periodType: 'day' | 'week' | 'month'
  startDate: string
  isActive: boolean
  assignedDate?: string
}
export interface Schedule {

}