import type { EmployeePlanningProfile, FixedAlternationPolicy } from '../planningSuggestion.type'

export interface FixedAlternationDraft {
  enabled: boolean
  employeeGuids: [string, string]
  anchorDate: string
  cadence: number | string
  weekendRest: FixedAlternationPolicy['weekend_rest']
}

export function fixedAlternationDraft(policy?: FixedAlternationPolicy | null): FixedAlternationDraft {
  return {
    enabled: policy?.enabled ?? false,
    employeeGuids: policy ? [...policy.employee_guids] : ['', ''],
    anchorDate: policy?.anchor_date ?? '',
    cadence: policy?.shift_cadence_days ?? 1,
    weekendRest: policy?.weekend_rest ?? 'KEEP_PROFILE',
  }
}

export function eligibleFixedProfiles(profiles: EmployeePlanningProfile[]) {
  return profiles.flatMap(profile => profile.active && profile.planning_mode === 'FIXED' && profile.user?.guid
    ? [{ user: profile.user, template: profile.fixed_session_template }]
    : [],
  ).sort((a, b) => a.user.name.localeCompare(b.user.name, 'fr'))
}

export function fixedAlternationProblems(
  draft: FixedAlternationDraft,
  profiles: ReturnType<typeof eligibleFixedProfiles>,
): Record<string, string> {
  const problems: Record<string, string> = {}
  const [first, second] = draft.employeeGuids

  draft.employeeGuids.forEach((guid, index) => {
    const profile = profiles.find(candidate => candidate.user.guid === guid)
    if (!profile?.template?.guid) {
      problems[`fixed_employee_${index}`] = !guid
        ? 'Sélectionnez un collaborateur.'
        : 'Ce profil fixe ou son horaire de référence est indisponible.'
    }
  })
  if (first && first === second) {
    problems.fixed_employee_1 = 'Sélectionnez un autre collaborateur.'
  }
  const [firstTemplate, secondTemplate] = draft.employeeGuids.map(guid =>
    profiles.find(profile => profile.user.guid === guid)?.template?.guid,
  )
  if (first !== second && firstTemplate && firstTemplate === secondTemplate) {
    problems.fixed_employee_1 = 'Les deux profils doivent avoir des horaires de référence distincts.'
  }

  const date = new Date(`${draft.anchorDate}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.anchorDate) ||
      !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft.anchorDate) {
    problems.fixed_anchor_date = 'Renseignez une date de référence valide.'
  }
  const cadence = Number(draft.cadence)
  if (!Number.isInteger(cadence) || cadence < 1 || cadence > 366) {
    problems.fixed_cadence = 'Saisissez un nombre entier de jours compris entre 1 et 366.'
  }
  return problems
}

export function fixedAlternationUpdate(
  draft: FixedAlternationDraft,
  stored: FixedAlternationPolicy | null | undefined,
  profiles: ReturnType<typeof eligibleFixedProfiles>,
): FixedAlternationPolicy | undefined {
  if (!draft.enabled) {
    return stored?.enabled ? {
      ...stored,
      enabled: false,
      employee_guids: [...stored.employee_guids],
      template_guids: [...stored.template_guids],
    } : undefined
  }
  if (JSON.stringify(draft) === JSON.stringify(fixedAlternationDraft(stored))) return undefined
  if (Object.keys(fixedAlternationProblems(draft, profiles)).length) return undefined

  const templateGuids = draft.employeeGuids.map(guid =>
    profiles.find(profile => profile.user.guid === guid)?.template?.guid,
  )
  const [firstTemplate, secondTemplate] = templateGuids
  if (!firstTemplate || !secondTemplate) return undefined
  return {
    enabled: true,
    employee_guids: [...draft.employeeGuids],
    template_guids: [firstTemplate, secondTemplate],
    anchor_date: draft.anchorDate,
    shift_cadence_days: Number(draft.cadence),
    weekend_rest: draft.weekendRest,
  }
}
