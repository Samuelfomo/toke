import type { IUserMini, IPagination } from '../session_model/type'

export interface IDayBlock {
    work: [string, string]
    pause: [string, string] | null
    tolerance: number
    end_day_offset?: number
}

export type IDefinition = Record<string, IDayBlock[] | [] | null | undefined>

export interface SessionModelRef {
    guid: string
    name: string
}

export interface SessionTemplateUsage {
    total?: number | null
    employees?: number | null
    groups?: number | null
}

export interface ISessionTemplate {
    guid: string
    name: string
    description: string | null
    session_model: SessionModelRef | string
    definition: IDefinition
    for_rotation: boolean
    default?: boolean
    is_default?: boolean
    current?: boolean
    is_current?: boolean
    usage?: SessionTemplateUsage | null
    usage_count?: number | null
    employee_count?: number | null
    group_count?: number | null
    created_by: IUserMini
    created_at: string
    updated_at: string
}

export interface ISessionTemplateCollection {
    pagination: IPagination
    items: ISessionTemplate[]
    summary?: {
        active?: number
        rotation?: number
        default?: number
    }
}

export interface ISessionTemplateResponseData {
    session_templates: ISessionTemplateCollection
}
