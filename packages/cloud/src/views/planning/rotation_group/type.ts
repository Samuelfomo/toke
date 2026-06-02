import type { IUserMini, IPagination } from '../session_model/type'
import type { ISessionTemplate } from '../session_template/type'

export interface IRotationGroupTemplate {
    guid: string
    rotation_group: string        // guid du groupe parent
    session_template: string      // guid du template
    position: number              // index dans le cycle (commence à 0)
    template_snapshot: ISessionTemplate
}

export interface IRotationGroup {
    guid: string
    name: string
    description?: string | null

    // Cycle config
    cycle_length: number
    cycle_unit: 'day' | 'week'
    direction: 'forward' | 'backward'
    auto_advance: boolean
    rotation_step: number
    start_date: string            // YYYY-MM-DD

    // Positions (templates dans l'ordre)
    cycle_templates?: IRotationGroupTemplate[]

    // Status
    active: boolean

    // Audit
    created_by?: IUserMini
    created_at: string
    updated_at: string
}

export interface IRotationGroupCollection {
    pagination: IPagination
    items: IRotationGroup[]
}

export interface IRotationGroupResponseData {
    rotation_groups: IRotationGroupCollection
}