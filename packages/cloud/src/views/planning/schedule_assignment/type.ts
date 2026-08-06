// ── Sous-types ─────────────────────────────────────────────────────────────

export interface ISessionModelMini {
    guid: string
    name: string
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

/**
 * Forme minimale réellement renvoyée par certaines routes d'affectation.
 * Elle suffit pour identifier le modèle, mais pas pour dessiner les créneaux.
 */
export interface ISessionTemplateSummary {
    guid: string
    name: string
}

/** Forme complète nécessaire à l'affichage du planning. */
export interface ISessionTemplateInline extends ISessionTemplateSummary {
    definition: ISessionTemplateDefinition
    session_model?: ISessionModelMini
}

export type IScheduleAssignmentTemplate =
    | ISessionTemplateSummary
    | ISessionTemplateInline

export interface IUserMini {
    guid: string
    first_name: string
    last_name: string
    avatar_url: string | null
    department: string | null
    job_title: string | null
    active: boolean
    email: string
    phone_number: string
    country: string
    employee_code: string
    hire_date: string | null
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

export interface IScheduleAssignmentRelatedUser extends IUserMini {
    assignment_info: IAssignmentInfo
}

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

// ── Assignment info (situation active aujourd'hui) ─────────────────────────

/**
 * Ces champs décrivent l'affectation active au moment de la requête.
 * Ils ne doivent pas être utilisés pour résoudre le modèle d'une ligne
 * historique ou future de la collection.
 */
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

    /** Discriminant : 'user' | 'group'. */
    family: 'user' | 'group'

    /** Objet lié : employé ou groupe selon family. */
    related: IScheduleAssignmentRelatedUser | IScheduleAssignmentRelatedGroup

    /**
     * Le backend peut renvoyer seulement { guid, name }.
     * La liste complète des templates sert alors de catalogue de résolution.
     */
    session_template: IScheduleAssignmentTemplate

    start_date: string
    end_date: string | null
    reason: string | null
    active: boolean

    created_by: ICreatedByMini
}

// ── Helpers de narrowing ───────────────────────────────────────────────────

export function isGroupAssignment(
    assignment: IScheduleAssignment,
): assignment is IScheduleAssignment & {
    related: IScheduleAssignmentRelatedGroup
} {
    return assignment.family === 'group'
}

export function isUserAssignment(
    assignment: IScheduleAssignment,
): assignment is IScheduleAssignment & {
    related: IScheduleAssignmentRelatedUser
} {
    return assignment.family === 'user'
}

export function getTargetName(assignment: IScheduleAssignment): string {
    if (isGroupAssignment(assignment)) {
        return assignment.related.name
    }

    if (isUserAssignment(assignment)) {
        return `${assignment.related.first_name} ${assignment.related.last_name}`.trim()
    }

    return '—'
}

export function hasTemplateDefinition(
    template: unknown,
): template is ISessionTemplateInline {
    if (!template || typeof template !== 'object') return false

    const candidate = template as Partial<ISessionTemplateInline>
    return Boolean(
        candidate.guid
        && candidate.name
        && candidate.definition
        && typeof candidate.definition === 'object',
    )
}

export function isPlannedRestAssignment(
    assignment: IScheduleAssignment,
): boolean {
    return assignment.session_template.guid === 'planned-rest'
}

/**
 * Résout le template de la ligne courante.
 *
 * Important : aucun fallback n'est effectué vers
 * related.assignment_info.active_schedule_assignment, car cette affectation
 * peut correspondre à aujourd'hui, à une ancienne période ou à un autre modèle.
 */
export function resolveFullTemplate(
    assignment: IScheduleAssignment,
    templatesByGuid?: ReadonlyMap<string, ISessionTemplateInline>,
): ISessionTemplateInline | undefined {
    if (hasTemplateDefinition(assignment.session_template)) {
        return assignment.session_template
    }

    return templatesByGuid?.get(assignment.session_template.guid)
}

/** Vérifie si une affectation active couvre une date ISO. */
export function assignmentCoversDate(
    assignment: IScheduleAssignment,
    iso: string,
): boolean {
    if (!assignment.active) return false
    if (assignment.start_date > iso) return false
    return !(assignment.end_date && assignment.end_date < iso)
}

/** Vérifie le chevauchement d'une affectation avec une période inclusive. */
export function assignmentOverlapsPeriod(
    assignment: IScheduleAssignment,
    periodFrom: string,
    periodTo: string,
): boolean {
    return assignment.start_date <= periodTo
        && (assignment.end_date === null || assignment.end_date >= periodFrom)
}

// ── Collection ─────────────────────────────────────────────────────────────

export interface IScheduleAssignmentCollection {
    count: number
    items: IScheduleAssignment[]
}

export interface IScheduleAssignmentResponseData {
    schedule_assignments: IScheduleAssignmentCollection
}


// // ── Sous-types ─────────────────────────────────────────────────────────────
//
// export interface ISessionModelMini {
//     guid: string
//     name: string
// }
//
// export function getTargetName(a: IScheduleAssignment): string {
//     if (isGroupAssignment(a)) {
//         return a.related.name
//     }
//
//     if (isUserAssignment(a)) {
//         return `${a.related.first_name} ${a.related.last_name}`.trim()
//     }
//
//     return '—'
// }
//
// export interface ISessionTemplateDefinitionBlock {
//     work: [string, string]
//     pause: [string, string] | null
//     tolerance: number
// }
//
// export interface ISessionTemplateDefinition {
//     Mon: ISessionTemplateDefinitionBlock[] | null
//     Tue: ISessionTemplateDefinitionBlock[] | null
//     Wed: ISessionTemplateDefinitionBlock[] | null
//     Thu: ISessionTemplateDefinitionBlock[] | null
//     Fri: ISessionTemplateDefinitionBlock[] | null
//     Sat: ISessionTemplateDefinitionBlock[] | null
//     Sun: ISessionTemplateDefinitionBlock[] | null
// }
//
// export interface ISessionTemplateInline {
//     guid: string
//     name: string
//     definition: ISessionTemplateDefinition
//     session_model: ISessionModelMini
// }
//
// export interface IUserMini {
//     guid: string
//     first_name: string
//     last_name: string
//     avatar_url: string | null
//     department: string
//     job_title: string
//     active: boolean
//     email: string
//     phone_number: string
//     country: string
//     employee_code: string
//     hire_date: string
// }
//
// export interface IGroupMember {
//     user: IUserMini
//     joined_at: string
//     active: boolean
// }
//
// export interface ICreatedByMini {
//     guid: string
//     name: string
// }
//
// // ── Cible selon family ─────────────────────────────────────────────────────
//
// // family === 'user'
// export interface IScheduleAssignmentRelatedUser extends IUserMini {
//     assignment_info: IAssignmentInfo
// }
//
// // family === 'group'
// export interface IScheduleAssignmentRelatedGroup {
//     guid: string
//     name: string
//     manager: IUserMini
//     created_at: string
//     updated_at: string
//     members: {
//         count: number
//         items: IGroupMember[]
//     }
//     assignment_info: IAssignmentInfo
// }
//
// // ── Assignment info (imbriqué dans related) ────────────────────────────────
//
// export interface IAssignmentInfo {
//     current_type: 'schedule' | 'rotation' | 'none'
//     active_schedule_assignment: IScheduleAssignment | null
//     active_rotation_assignment: IRotationAssignmentMini | null
// }
//
// export interface IRotationAssignmentMini {
//     guid: string
//     family: 'user' | 'group'
//     offset: number
//     assigned_at: string
//     assigned_by: IUserMini & { assignment_info: IAssignmentInfo }
//     rotation_group: {
//         guid: string
//         tenant: string
//         name: string
//         cycle_length: number
//         cycle_unit: string
//         direction: string
//         auto_advance: boolean
//         rotation_step: number
//         start_date: string
//         active: boolean
//         cycle_templates: ICycleTemplate[]
//     }
// }
//
// export interface ICycleTemplate {
//     guid: string
//     position: number
//     template_snapshot: ISessionTemplateInline & {
//         version: number
//         is_default: boolean
//         snapshot_date: string
//     }
//     source_template_guid: string
//     created_at: string
//     updated_at: string
// }
//
// // ── Entité principale ──────────────────────────────────────────────────────
//
// export interface IScheduleAssignment {
//     guid: string
//     tenant: string
//
//     /** Discriminant : 'user' | 'group' */
//     family: 'user' | 'group'
//
//     /** Objet lié : employé ou groupe selon family */
//     related: IScheduleAssignmentRelatedUser | IScheduleAssignmentRelatedGroup
//
//     /** Template appliqué (objet complet retourné par l'API) */
//     session_template: ISessionTemplateInline
//
//     start_date: string           // YYYY-MM-DD
//     end_date: string | null
//     reason: string | null
//     active: boolean
//
//     created_by: ICreatedByMini
// }
//
// // ── Helpers de narrowing ───────────────────────────────────────────────────
//
// export function isGroupAssignment(
//     a: IScheduleAssignment
// ): a is IScheduleAssignment & { related: IScheduleAssignmentRelatedGroup } {
//     return a.family === 'group'
// }
//
// export function isUserAssignment(
//     a: IScheduleAssignment
// ): a is IScheduleAssignment & { related: IScheduleAssignmentRelatedUser } {
//     return a.family === 'user'
// }
//
// // ── Collection ─────────────────────────────────────────────────────────────
//
// export interface IScheduleAssignmentCollection {
//     count: number
//     items: IScheduleAssignment[]
// }
//
// export interface IScheduleAssignmentResponseData {
//     schedule_assignments: IScheduleAssignmentCollection
// }
//
// /**
//  * Résout le session_template complet (avec definition) depuis un IScheduleAssignment.
//  * L'API retourne session_template sans definition au niveau root.
//  * La definition est dans related.assignment_info.active_schedule_assignment.session_template
//  */
// export function resolveFullTemplate(
//     assignment: IScheduleAssignment,
// ): ISessionTemplateInline | undefined {
//     if (assignment.session_template?.definition) {
//         return assignment.session_template
//     }
//     return assignment.related.assignment_info?.active_schedule_assignment?.session_template
// }
//
//
// /**
//  * Vérifier la période réelle de l’affectation pour chaque date ISO.
//  */
// export function assignmentCoversDate(
//     assignment: IScheduleAssignment,
//     iso: string,
// ): boolean {
//     if (!assignment.active) return false
//     if (assignment.start_date > iso) return false
//     return !(assignment.end_date && assignment.end_date < iso);
//
// }
