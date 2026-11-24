import type { EmployeePlanningProfile, FixedAlternationPolicy, PlanningTemplateMini } from '../planningSuggestion.type'

export interface FixedAlternationDraft {
  enabled: boolean
  employeeGuids: [string, string]
  anchorDate: string
  cadence: number | string
  limitedServiceGuid: string
  weekendRest: FixedAlternationPolicy['weekend_rest']
}

export function fixedAlternationDraft(policy?: FixedAlternationPolicy | null): FixedAlternationDraft {
  return {
    enabled: policy?.enabled ?? false,
    employeeGuids: policy ? [...policy.employee_guids] : ['', ''],
    anchorDate: policy?.anchor_date ?? '',
    cadence: policy?.shift_cadence_days ?? 1,
    limitedServiceGuid: policy?.limited_service_template_guid ?? '',
    weekendRest: policy?.weekend_rest ?? 'KEEP_PROFILE',
  }
}

export function eligibleFixedProfiles(profiles: EmployeePlanningProfile[]) {
  return profiles.flatMap(profile => profile.active && profile.planning_mode === 'FIXED' && profile.user?.guid
    ? [{ user: profile.user, template: profile.fixed_session_template }]
    : [],
  ).sort((a, b) => a.user.name.localeCompare(b.user.name, 'fr'))
}

export function limitedServiceOptions(
  draft: FixedAlternationDraft,
  profiles: ReturnType<typeof eligibleFixedProfiles>,
  templates: PlanningTemplateMini[],
): PlanningTemplateMini[] {
  const pair = draft.employeeGuids.map(guid => {
    const reference = profiles.find(profile => profile.user.guid === guid)?.template
    return templates.find(template => template.guid === reference?.guid) ?? reference
  })
  const [first, second] = pair
  if (!first || !second || first.guid === second.guid) return []

  const startsAt = (template: PlanningTemplateMini, time: string) => {
    const starts = Object.values(template.definition ?? {}).flatMap(blocks =>
      blocks?.length ? [blocks.map(block => block.work[0]).sort()[0]] : [],
    )
    return starts.length > 0 && starts.every(start => start === time)
  }
  return [first, second].filter((template, index) =>
    startsAt(template, '10:30') && startsAt(index === 0 ? second : first, '08:00'),
  )
}

export function fixedAlternationProblems(
  draft: FixedAlternationDraft,
  profiles: ReturnType<typeof eligibleFixedProfiles>,
  templates: PlanningTemplateMini[] = [],
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
  if (draft.limitedServiceGuid) {
    if (draft.weekendRest !== 'ALTERNATE_SAT_SUN') {
      problems.fixed_limited_service = 'Activez l’alternance des repos samedi / dimanche pour limiter ce service.'
    } else if (!limitedServiceOptions(draft, profiles, templates).some(template => template.guid === draft.limitedServiceGuid)) {
      problems.fixed_limited_service = 'Choisissez le modèle de 10 h 30 du binôme. L’autre modèle doit commencer à 8 h.'
    }
  }
  return problems
}

export function fixedAlternationUpdate(
  draft: FixedAlternationDraft,
  stored: FixedAlternationPolicy | null | undefined,
  profiles: ReturnType<typeof eligibleFixedProfiles>,
  templates: PlanningTemplateMini[] = [],
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
  if (Object.keys(fixedAlternationProblems(draft, profiles, templates)).length) return undefined

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
    ...(draft.limitedServiceGuid || stored?.limited_service_template_guid
      ? { limited_service_template_guid: draft.limitedServiceGuid || null }
      : {}),
  }
}
