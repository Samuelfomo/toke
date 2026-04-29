export interface IUserMini {
    guid: string
    name: string
}

export interface ISessionModel {
    guid: string

    // Identity
    name: string

    // Work days
    workday: string[]

    // Time rules (minutes)
    max_working_time: number
    min_working_time: number
    normal_session_time: number
    allowed_tolerance: number

    // Pause
    pause_allowed: boolean
    pause_duration: number | null
    pause_count: number

    // Rotation
    rotation_allowed: boolean

    // Extra hours
    extra_allowed: boolean
    extra_max: number | null

    // Leave
    leave_allowed: boolean
    leave_eligibility_after_session: number | null
    leave_is_optional: boolean

    // Status
    active: boolean

    // Audit
    created_by: IUserMini
    created_at: string
    updated_at: string
}

export interface IPagination {
    offset: number
    limit: number
    count: number
}

export interface ISessionModelCollection {
    pagination: IPagination
    items: ISessionModel[]
}

export interface ISessionModelResponseData {
    session_models: ISessionModelCollection
}
