import type {
    IUserMini,
    IGroupMember,
    ISessionTemplateDefinition,
} from '../schedule_assignment/type'

// ── Template snapshot dans un cycle ──────────────────────────────────────────

export interface IRotationTemplateSnapshot {
    guid:          string
    name:          string
    version:       number
    definition:    ISessionTemplateDefinition
    is_default:    boolean
    snapshot_date: string
}

// ── CycleTemplate : une position dans le cycle ────────────────────────────────

export interface ICycleTemplate {
    guid:                 string
    position:             number          // 0-based
    template_snapshot:    IRotationTemplateSnapshot
    source_template_guid: string
    created_at:           string
    updated_at:           string
}

// ── Rotation Group complet (dans assignment_info) ─────────────────────────────

export interface IRotationGroupFull {
    guid:             string
    tenant:           string
    name:             string
    cycle_length:     number              // nombre de positions dans le cycle
    cycle_unit:       'day' | 'week'
    direction:        'forward' | 'backward'
    auto_advance:     boolean
    rotation_step:    number
    start_date:       string             // YYYY-MM-DD, référence pour calculer la position
    active:           boolean
    cycle_templates:  ICycleTemplate[]   // triés par position ASC
}

// ── Rotation Group mini (niveau racine des items user/group) ──────────────────

export interface IRotationGroupMini {
    guid: string
    name: string
}

// ── assigned_by mini ──────────────────────────────────────────────────────────

export interface IAssignedByMini {
    guid: string
    name: string
}

// ── Related : employé ─────────────────────────────────────────────────────────

export type IRotationAssignmentRelatedUser = IUserMini

// ── Related : groupe ─────────────────────────────────────────────────────────

export interface IRotationAssignmentRelatedGroup {
    guid:        string
    name:        string
    manager:     IUserMini
    created_at:  string
    updated_at:  string
    members: {
        count: number
        items: IGroupMember[]
    }
    /**
     * assignment_info présent uniquement sur les items de type group.
     * Contient le rotation_group complet avec cycle_templates.
     */
    assignment_info: {
        current_type:                'schedule' | 'rotation' | 'none'
        active_schedule_assignment:  unknown | null
        active_rotation_assignment: {
            guid:          string
            family:        'user' | 'group'
            offset:        number
            assigned_at:   string
            assigned_by:   IUserMini & { assignment_info: unknown }
            rotation_group: IRotationGroupFull
        } | null
    }
}

// ── Entité principale ─────────────────────────────────────────────────────────

export interface IRotationAssignment {
    guid:          string
    family:        'user' | 'group'
    offset:        number               // position de départ dans le cycle (0-based ou 1-based selon backend)
    assigned_at:   string               // ISO datetime
    active:        boolean
    related:       IRotationAssignmentRelatedUser | IRotationAssignmentRelatedGroup
    assigned_by:   IAssignedByMini
    rotation_group: IRotationGroupMini  // minimal — cycle_templates absent ici
}

// ── Collection ────────────────────────────────────────────────────────────────

export interface IRotationAssignmentCollection {
    count: number
    items: IRotationAssignment[]
}

// ── Helpers de narrowing ──────────────────────────────────────────────────────

export function isGroupRotationAssignment(
    a: IRotationAssignment
): a is IRotationAssignment & { related: IRotationAssignmentRelatedGroup } {
    return a.family === 'group'
}

export function isUserRotationAssignment(
    a: IRotationAssignment
): a is IRotationAssignment & { related: IRotationAssignmentRelatedUser } {
    return a.family === 'user'
}

// ── Résolution du RotationGroup complet ──────────────────────────────────────
/**
 * Pour les items `family === 'group'`, le rotation_group complet (avec cycle_templates)
 * est disponible dans related.assignment_info.active_rotation_assignment.rotation_group.
 * Pour les items `family === 'user'`, seul le mini est disponible au niveau racine.
 * → Dans ce cas, il faut chercher dans d'autres items du même groupe si disponible.
 */
export function resolveRotationGroup(a: IRotationAssignment): IRotationGroupFull | null {
    if (isGroupRotationAssignment(a)) {
        return a.related.assignment_info?.active_rotation_assignment?.rotation_group ?? null
    }
    return null
}

export function getRotationTargetName(a: IRotationAssignment): string {
    if (isGroupRotationAssignment(a)) return a.related.name
    if (isUserRotationAssignment(a)) {
        return `${a.related.first_name} ${a.related.last_name}`.trim()
    }
    return '—'
}

// ── Calcul de position dans le cycle ─────────────────────────────────────────
/**
 * Calcule l'index (0-based) du template actif pour un jour donné.
 *
 * @param startDate   - start_date du rotation_group (référence du cycle)
 * @param targetDate  - date du jour à calculer (YYYY-MM-DD)
 * @param offset      - offset de l'assignation (0-based côté API, ajuster si 1-based)
 * @param cycleLength - nombre de positions dans le cycle
 * @param direction   - 'forward' | 'backward'
 * @param rotationStep - pas de rotation (généralement 1)
 */
export function resolveTemplatePosition(
    startDate:    string,
    targetDate:   string,
    offset:       number,
    cycleLength:  number,
    direction:    'forward' | 'backward',
    rotationStep: number = 1
): number {
    const start  = new Date(startDate)
    const target = new Date(targetDate)
    const diffMs = target.getTime() - start.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    // Nombre de "pas" depuis le début
    const steps = Math.floor(diffDays / rotationStep)

    // Position brute avec offset (offset est 1-based dans la réponse API → on convertit en 0-based)
    const offsetZero = Math.max(0, offset - 1)

    let position: number
    if (direction === 'forward') {
        position = (offsetZero + steps) % cycleLength
    } else {
        // backward : on recule dans le cycle
        position = ((offsetZero - steps) % cycleLength + cycleLength) % cycleLength
    }

    return position
}