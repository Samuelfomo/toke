import type {
    EmployeePlanningProfile,
    PlanningDayKey,
    PlanningSuggestionConfig,
    SuggestionReasonSource,
    WeeklyLeaveMode,
} from './planningSuggestion.type'

export const DEFAULT_WEEKLY_LEAVE_DAYS: PlanningDayKey[] = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
]

export const WEEKLY_LEAVE_MODE_LABELS: Record<WeeklyLeaveMode, string> = {
    NONE: 'Aucune règle automatique',
    PER_EMPLOYEE: 'Repos minimum par collaborateur',
    TEAM_ROTATION: 'Congé tournant au niveau de l’équipe',
    PER_ELIGIBLE_EMPLOYEE: 'Politique ciblée par employé éligible',
}

export interface TeamRotationReadiness {
    ready: boolean
    includedProfiles: EmployeePlanningProfile[]
    missingRotationOrder: EmployeePlanningProfile[]
    duplicateRotationOrders: number[]
    blockers: string[]
}

export function validateTeamRotationReadiness(
    profiles: EmployeePlanningProfile[],
    config: PlanningSuggestionConfig | null,
): TeamRotationReadiness {
    const includedProfiles = profiles.filter(
        (profile) =>
            profile.active && profile.planning_mode !== 'EXCLUDED',
    )

    if (config?.rules.weekly_leave_policy.mode !== 'TEAM_ROTATION') {
        return {
            ready: true,
            includedProfiles,
            missingRotationOrder: [],
            duplicateRotationOrders: [],
            blockers: [],
        }
    }

    const policy = config.rules.weekly_leave_policy
    const missingRotationOrder = includedProfiles.filter(
        (profile) => profile.rotation_order === null,
    )

    const orderCounts = new Map<number, number>()

    for (const profile of includedProfiles) {
        if (profile.rotation_order === null) continue

        orderCounts.set(
            profile.rotation_order,
            (orderCounts.get(profile.rotation_order) ?? 0) + 1,
        )
    }

    const duplicateRotationOrders = [...orderCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([order]) => order)
        .sort((a, b) => a - b)

    const blockers: string[] = []

    if (includedProfiles.length === 0) {
        blockers.push(
            'Aucun collaborateur actif n’est inclus dans la rotation des congés.',
        )
    }

    if (missingRotationOrder.length > 0) {
        blockers.push(
            `${missingRotationOrder.length} collaborateur(s) inclus n’ont pas d’ordre de rotation.`,
        )
    }

    if (duplicateRotationOrders.length > 0) {
        blockers.push(
            `Ordres de rotation dupliqués : ${duplicateRotationOrders.join(', ')}.`,
        )
    }

    if (policy.employees_per_week > includedProfiles.length) {
        blockers.push(
            `Le nombre de bénéficiaires par semaine (${policy.employees_per_week}) dépasse le nombre de collaborateurs inclus (${includedProfiles.length}).`,
        )
    }

    if (policy.allowed_days.length === 0) {
        blockers.push(
            'Aucun jour de la semaine n’est autorisé pour le congé tournant.',
        )
    }

    if (!policy.rotation_anchor_date) {
        blockers.push(
            'La date de démarrage du cycle de congé n’est pas renseignée.',
        )
    }

    if (config.solver.type !== 'ORTOOLS') {
        blockers.push(
            'La rotation d’équipe exige le solveur OR-Tools.',
        )
    }

    if (config.solver.fallback_to_greedy) {
        blockers.push(
            'Le fallback Greedy doit être désactivé pour garantir la rotation.',
        )
    }

    return {
        ready: blockers.length === 0,
        includedProfiles,
        missingRotationOrder,
        duplicateRotationOrders,
        blockers,
    }
}

export function reasonBusinessLabel(
    source?: SuggestionReasonSource,
): string {
    const labels: Record<SuggestionReasonSource, string> = {
        FIXED: 'Horaire fixe',
        GENERATED: 'Affectation automatique',
        FILL_REMAINING: 'Affectation des disponibles',
        GUARD_CONTINUATION: 'Fin de garde / récupération',
        POST_GUARD_REST: 'Repos après garde',
        WEEKLY_LEAVE: 'Congé hebdomadaire',
        TEMPLATE_REST: 'Repos prévu par le modèle',
        UNASSIGNED: 'Non affecté',
        REST: 'Repos',
    }

    return source ? labels[source] : 'Non renseigné'
}