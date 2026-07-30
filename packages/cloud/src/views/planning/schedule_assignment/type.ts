// ── Sous-types ─────────────────────────────────────────────────────────────

export interface ISessionModelMini {
    guid: string
    name: string
}

export function getTargetName(a: IScheduleAssignment): string {
    if (isGroupAssignment(a)) {
        return a.related.name
    }

    if (isUserAssignment(a)) {
        return `${a.related.first_name} ${a.related.last_name}`.trim()
    }

    return '—'
}

export interface ISessionTemplateDefinitionBlock {
    work: [string, string]
    pause: [string, string] | null
    tolerance: number
}

export interface ISessionTemplateDefinition {
    Mon: ISessionTemplateDefinitionBlock[] | null
    Tue: ISessionTemplateDefinitionBlock[] | null
    Wed: ISessionTemplateDefinitionBlock[] | null
    Thu: ISessionTemplateDefinitionBlock[] | null
    Fri: ISessionTemplateDefinitionBlock[] | null
    Sat: ISessionTemplateDefinitionBlock[] | null
    Sun: ISessionTemplateDefinitionBlock[] | null
}

export interface ISessionTemplateInline {
    guid: string
    name: string
    definition: ISessionTemplateDefinition
    session_model: ISessionModelMini
}

export interface IUserMini {
    guid: string
    first_name: string
    last_name: string
    avatar_url: string | null
    department: string
    job_title: string
    active: boolean
    email: string
    phone_number: string
    country: string
    employee_code: string
    hire_date: string
}

export interface IGroupMember {
    user: IUserMini
    joined_at: string
    active: boolean
}

export interface ICreatedByMini {
    guid: string
    name: string
}

// ── Cible selon family ─────────────────────────────────────────────────────

// family === 'user'
export interface IScheduleAssignmentRelatedUser extends IUserMini {
    assignment_info: IAssignmentInfo
}

// family === 'group'
export interface IScheduleAssignmentRelatedGroup {
    guid: string
    name: string
    manager: IUserMini
    created_at: string
    updated_at: string
    members: {
        count: number
        items: IGroupMember[]
    }
    assignment_info: IAssignmentInfo
}

// ── Assignment info (imbriqué dans related) ────────────────────────────────

export interface IAssignmentInfo {
    current_type: 'schedule' | 'rotation' | 'none'
    active_schedule_assignment: IScheduleAssignment | null
    active_rotation_assignment: IRotationAssignmentMini | null
}

export interface IRotationAssignmentMini {
    guid: string
    family: 'user' | 'group'
    offset: number
    assigned_at: string
    assigned_by: IUserMini & { assignment_info: IAssignmentInfo }
    rotation_group: {
        guid: string
        tenant: string
        name: string
        cycle_length: number
        cycle_unit: string
        direction: string
        auto_advance: boolean
        rotation_step: number
        start_date: string
        active: boolean
        cycle_templates: ICycleTemplate[]
    }
}

export interface ICycleTemplate {
    guid: string
    position: number
    template_snapshot: ISessionTemplateInline & {
        version: number
        is_default: boolean
        snapshot_date: string
    }
    source_template_guid: string
    created_at: string
    updated_at: string
}

// ── Entité principale ──────────────────────────────────────────────────────

export interface IScheduleAssignment {
    guid: string
    tenant: string

    /** Discriminant : 'user' | 'group' */
    family: 'user' | 'group'

    /** Objet lié : employé ou groupe selon family */
    related: IScheduleAssignmentRelatedUser | IScheduleAssignmentRelatedGroup

    /** Template appliqué (objet complet retourné par l'API) */
    session_template: ISessionTemplateInline

    start_date: string           // YYYY-MM-DD
    end_date: string | null
    reason: string | null
    active: boolean

    created_by: ICreatedByMini
}

// ── Helpers de narrowing ───────────────────────────────────────────────────

export function isGroupAssignment(
    a: IScheduleAssignment
): a is IScheduleAssignment & { related: IScheduleAssignmentRelatedGroup } {
    return a.family === 'group'
}

export function isUserAssignment(
    a: IScheduleAssignment
): a is IScheduleAssignment & { related: IScheduleAssignmentRelatedUser } {
    return a.family === 'user'
}

// ── Collection ─────────────────────────────────────────────────────────────

export interface IScheduleAssignmentCollection {
    count: number
    items: IScheduleAssignment[]
}

export interface IScheduleAssignmentResponseData {
    schedule_assignments: IScheduleAssignmentCollection
}

/**
 * Résout le session_template complet (avec definition) depuis un IScheduleAssignment.
 * L'API retourne session_template sans definition au niveau root.
 * La definition est dans related.assignment_info.active_schedule_assignment.session_template
 */
export function resolveFullTemplate(
    assignment: IScheduleAssignment,
): ISessionTemplateInline | undefined {
    if (assignment.session_template?.definition) {
        return assignment.session_template
    }
    return assignment.related.assignment_info?.active_schedule_assignment?.session_template
}


/**
 * Vérifier la période réelle de l’affectation pour chaque date ISO.
 */
export function assignmentCoversDate(
    assignment: IScheduleAssignment,
    iso: string,
): boolean {
    if (!assignment.active) return false
    if (assignment.start_date > iso) return false
    return !(assignment.end_date && assignment.end_date < iso);

}
