import { DAY_ORDER } from '../planningSuggestion.helpers'
import type {
  PlanningDayKey,
  PlanningRequirement,
  PlanningRequirementPayload,
  PlanningServiceType,
} from '../planningSuggestion.type'

export interface RequirementMatrixRow {
  key: string
  templateGuid: string
  templateName: string
  serviceType: PlanningServiceType
  continuationGuid: string | null
  continuationName: string | null
  seedRequirement: PlanningRequirement
  requirementsByDay: Record<PlanningDayKey, PlanningRequirement[]>
}

export interface RequirementCoverageSummaryData {
  totalCount: number
  activeCount: number
  inactiveCount: number
  guardCount: number
  coveredDays: PlanningDayKey[]
  uncoveredDays: PlanningDayKey[]
  duplicateGroupCount: number
  duplicateRequirementCount: number
  multipleRuleCellCount: number
}

type RequirementLike = PlanningRequirement | PlanningRequirementPayload

function emptyDayMap(): Record<PlanningDayKey, PlanningRequirement[]> {
  return DAY_ORDER.reduce((accumulator, day) => {
    accumulator[day] = []
    return accumulator
  }, {} as Record<PlanningDayKey, PlanningRequirement[]>)
}

function templateGuid(requirement: RequirementLike): string {
  return typeof requirement.session_template === 'string'
    ? requirement.session_template
    : requirement.session_template?.guid ?? ''
}

function continuationGuid(requirement: RequirementLike): string {
  return typeof requirement.continuation_template === 'string'
    ? requirement.continuation_template
    : requirement.continuation_template?.guid ?? ''
}

function normalizedModes(requirement: RequirementLike): string {
  return [...(requirement.eligibility_policy?.planning_modes ?? [])]
    .sort()
    .join(',')
}

export function requirementRowKey(requirement: PlanningRequirement): string {
  return [
    requirement.session_template?.guid ?? 'missing-template',
    requirement.service_type,
    requirement.continuation_template?.guid ?? 'no-continuation',
  ].join('|')
}

/**
 * Clé métier volontairement stricte : deux règles ne sont signalées comme
 * doublons que lorsqu'elles décrivent la même couverture, la même population
 * et les mêmes effectifs sur le même jour.
 */
export function requirementDuplicateKey(requirement: RequirementLike): string {
  return [
    requirement.day_of_week,
    templateGuid(requirement),
    requirement.service_type,
    continuationGuid(requirement),
    requirement.continuation_day_offset,
    requirement.allocation_mode,
    requirement.min_employees,
    requirement.target_employees,
    requirement.max_employees ?? 'none',
    normalizedModes(requirement),
    requirement.eligibility_policy?.guard_pool_relation ?? 'ANY',
  ].join('|')
}

export function duplicateRequirementGuids(
  requirements: PlanningRequirement[],
): Set<string> {
  const grouped = new Map<string, PlanningRequirement[]>()

  requirements
    .filter((requirement) => requirement.active)
    .forEach((requirement) => {
      const key = requirementDuplicateKey(requirement)
      const current = grouped.get(key) ?? []
      current.push(requirement)
      grouped.set(key, current)
    })

  const result = new Set<string>()
  grouped.forEach((items) => {
    if (items.length < 2) return
    items.forEach((item) => result.add(item.guid))
  })

  return result
}

export function buildRequirementMatrixRows(
  requirements: PlanningRequirement[],
): RequirementMatrixRow[] {
  const rows = new Map<string, RequirementMatrixRow>()

  requirements.forEach((requirement) => {
    const key = requirementRowKey(requirement)
    const existing = rows.get(key)

    if (!existing) {
      rows.set(key, {
        key,
        templateGuid: requirement.session_template?.guid ?? '',
        templateName:
          requirement.session_template?.name ?? 'Template indisponible',
        serviceType: requirement.service_type,
        continuationGuid: requirement.continuation_template?.guid ?? null,
        continuationName: requirement.continuation_template?.name ?? null,
        seedRequirement: requirement,
        requirementsByDay: emptyDayMap(),
      })
    }

    rows.get(key)!.requirementsByDay[requirement.day_of_week].push(requirement)
  })

  const result = [...rows.values()]

  result.forEach((row) => {
    DAY_ORDER.forEach((day) => {
      row.requirementsByDay[day].sort((left, right) => {
        if (left.active !== right.active) return left.active ? -1 : 1
        return left.priority - right.priority
      })
    })
  })

  return result.sort((left, right) => {
    if (left.serviceType !== right.serviceType) {
      return left.serviceType === 'STANDARD' ? -1 : 1
    }
    return left.templateName.localeCompare(right.templateName, 'fr')
  })
}

export function buildRequirementCoverageSummary(
  requirements: PlanningRequirement[],
): RequirementCoverageSummaryData {
  const activeRequirements = requirements.filter((requirement) => requirement.active)
  const covered = new Set(activeRequirements.map((requirement) => requirement.day_of_week))
  const duplicateGuids = duplicateRequirementGuids(requirements)
  const duplicateKeys = new Set<string>()
  const cellCounts = new Map<string, number>()

  activeRequirements.forEach((requirement) => {
    if (duplicateGuids.has(requirement.guid)) {
      duplicateKeys.add(requirementDuplicateKey(requirement))
    }

    const cellKey = `${requirementRowKey(requirement)}|${requirement.day_of_week}`
    cellCounts.set(cellKey, (cellCounts.get(cellKey) ?? 0) + 1)
  })

  return {
    totalCount: requirements.length,
    activeCount: activeRequirements.length,
    inactiveCount: requirements.length - activeRequirements.length,
    guardCount: activeRequirements.filter(
      (requirement) => requirement.service_type === 'GUARD',
    ).length,
    coveredDays: DAY_ORDER.filter((day) => covered.has(day)),
    uncoveredDays: DAY_ORDER.filter((day) => !covered.has(day)),
    duplicateGroupCount: duplicateKeys.size,
    duplicateRequirementCount: duplicateGuids.size,
    multipleRuleCellCount: [...cellCounts.values()].filter((count) => count > 1).length,
  }
}

export function requirementTimeSummary(
  requirement: PlanningRequirement,
  day: PlanningDayKey = requirement.day_of_week,
): string {
  const blocks = requirement.session_template?.definition?.[day]
  if (!Array.isArray(blocks) || !blocks.length) return 'Horaire indisponible'

  return blocks
    .map((block) => `${block.work[0]}–${block.work[1]}`)
    .join(' · ')
}

export function findExactDuplicateDays(
  candidatePayloads: PlanningRequirementPayload[],
  existingRequirements: PlanningRequirement[],
  excludedGuid?: string | null,
): PlanningDayKey[] {
  const existingKeys = new Set(
    existingRequirements
      .filter(
        (requirement) => requirement.guid !== excludedGuid && requirement.active,
      )
      .map(requirementDuplicateKey),
  )

  return candidatePayloads
    .filter(
      (candidate) =>
        candidate.active && existingKeys.has(requirementDuplicateKey(candidate)),
    )
    .map((candidate) => candidate.day_of_week)
}
