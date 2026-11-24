import type { PlanningDayKey, PlanningTemplateMini, ScheduleSuggestionItem } from '../planningSuggestion.type'

const dayKeys: PlanningDayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function templateWorksOn(template: PlanningTemplateMini | undefined, iso: string): boolean {
  const blocks = template?.definition?.[dayKeys[new Date(`${iso}T12:00:00`).getDay()]]
  return Array.isArray(blocks) && blocks.length > 0
}

export function serviceAbsence(item: ScheduleSuggestionItem, iso: string): 'rest' | 'unassigned' | undefined {
  if (item.schedule[iso]) return undefined
  const reason = item.reasons?.[iso]
  switch (reason?.source) {
    case 'REST':
    case 'POST_GUARD_REST':
    case 'WEEKLY_LEAVE':
    case 'TEMPLATE_REST':
      return 'rest'
    case 'MANUAL':
      return reason.manualLock || reason.templateName === 'Repos' ? 'rest' : 'unassigned'
    default:
      return 'unassigned'
  }
}

export function canMoveService(
  item: ScheduleSuggestionItem,
  sourceIso: string,
  targetIso: string,
  template: PlanningTemplateMini | undefined,
): boolean {
  return Boolean(sourceIso === targetIso && template && item.schedule[targetIso] !== template.guid &&
    templateWorksOn(template, targetIso))
}
