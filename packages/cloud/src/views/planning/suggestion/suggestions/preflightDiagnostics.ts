type Dictionary = Record<string, unknown>
const record = (value: unknown): Dictionary | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Dictionary : undefined
const objects = (value: unknown): Dictionary[] => Array.isArray(value)
  ? value.map(record).filter((item): item is Dictionary => item !== undefined)
  : []
const string = (value: unknown) => typeof value === 'string' ? value : undefined
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

function issue(value: Dictionary) {
  const details = record(value.details)
  const population = record(details?.population)
  const days = objects(details?.dailyCapacity).map(day => ({
    date: string(day.date),
    ordinary: number(day.ordinaryCapacity),
    quota: number(day.quotaCapacity),
    alternatives: number(day.alternativeCapacity),
    requirements: objects(day.requirements).flatMap(requirement => {
      const guid = string(requirement.guid)
      return guid ? [{ guid, maximum: number(requirement.maximum) }] : []
    }),
  }))
  return {
    code: string(value.code),
    message: string(value.message),
    from: string(details?.periodFrom) ?? string(value.date) ?? string(value.weekFrom),
    to: string(details?.periodTo),
    dates: strings(details?.dates),
    configGuid: string(details?.configGuid),
    model: string(population?.planningMode),
    pool: string(population?.guardPoolRelation),
    employees: number(population?.eligibleEmployees),
    required: number(details?.requiredAssignments),
    capacity: number(details?.maximumAssignments),
    deficit: number(details?.deficit),
    requirements: [...new Set([
      ...strings(value.requirementGuids),
      ...(typeof value.requirementGuid === 'string' ? [value.requirementGuid] : []),
      ...days.flatMap(day => day.requirements.map(requirement => requirement.guid)),
    ])],
    actions: objects(details?.suggestedActions).flatMap(action => string(action.message) ?? []),
    days,
  }
}

export function readPreflightDiagnostic(error: unknown) {
  const root = record(error)
  const response = record(root?.response)
  const candidates = [root, record(root?.error), record(record(root?.error)?.error), record(root?.data), record(record(root?.data)?.error),
    record(record(response?.data)?.error)]
  const failure = candidates.find(value => value?.code === 'PLANNING_PREFLIGHT_INFEASIBLE')
  if (!failure) return null
  const report = record(failure.details)
  return { issues: objects(report?.issues).map(issue), warnings: objects(report?.warnings).map(issue) }
}

export type PreflightDiagnostic = NonNullable<ReturnType<typeof readPreflightDiagnostic>>
export type PreflightIssue = PreflightDiagnostic['issues'][number]
