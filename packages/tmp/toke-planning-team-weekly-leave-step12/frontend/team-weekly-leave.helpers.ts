import type {
    EmployeePlanningProfile,
    PlanningDayKey,
    PlanningSuggestionConfig,
    SuggestionReasonSource,
} from '@/views/planning/suggestion/planningSuggestion.type'

export const PLATEAU_WEEKLY_LEAVE_DAYS: PlanningDayKey[] = [
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
]

export interface TeamRotationReadiness {
    ready: boolean
    missingRotationOrder: EmployeePlanningProfile[]
    duplicateRotationOrders: number[]
    blockers: string[]
}

export function validateTeamRotationProfiles(
    profiles: EmployeePlanningProfile[],
    config: PlanningSuggestionConfig | null,
): TeamRotationReadiness {
    if (
        config?.rules.weekly_leave_policy.mode !== 'TEAM_ROTATION'
    ) {
        return {
            ready: true,
            missingRotationOrder: [],
            duplicateRotationOrders: [],
            blockers: [],
        }
    }

    const included = profiles.filter(
        (profile) =>
            profile.active && profile.planning_mode !== 'EXCLUDED',
    )

    const missingRotationOrder = included.filter(
        (profile) => profile.rotation_order === null,
    )

    const counts = new Map<number, number>()
    for (const profile of included) {
        if (profile.rotation_order === null) continue
        counts.set(
            profile.rotation_order,
            (counts.get(profile.rotation_order) ?? 0) + 1,
        )
    }

    const duplicateRotationOrders = [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([order]) => order)
        .sort((a, b) => a - b)

    const blockers: string[] = []
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

    return {
        ready: blockers.length === 0,
        missingRotationOrder,
        duplicateRotationOrders,
        blockers,
    }
}

export function reasonBusinessLabel(
    source?: SuggestionReasonSource,
): string {
    const labels: Partial<Record<SuggestionReasonSource, string>> = {
        FIXED: 'Horaire fixe',
        GENERATED: 'Affectation automatique',
        FILL_REMAINING: 'Affectation des disponibles',
        GUARD_CONTINUATION: 'Fin de garde',
        POST_GUARD_REST: 'Repos après garde',
        WEEKLY_LEAVE: 'Congé hebdomadaire',
        TEMPLATE_REST: 'Repos prévu par le modèle',
        UNASSIGNED: 'Non affecté',
        REST: 'Repos',
    }

    return source ? labels[source] ?? source : 'Non renseigné'
}
