import { SessionTemplateValidationUtils } from '@toke/shared'
import type { SchedulePlanningSlot } from './components/views/schedulePlanningView.types'

const DAY_MINUTES = 24 * 60
type Interval = [start: number, end: number]

export function previousPlanningDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

function minutes(time: string): number {
  return SessionTemplateValidationUtils.timeToMinutes(time.trim())
}

function workingIntervals(slot: SchedulePlanningSlot): Interval[] {
  const start = minutes(slot.work[0])
  const endTime = minutes(slot.work[1])
  const end = endTime < start ? endTime + DAY_MINUTES : endTime
  if (!(start < end)) return []
  if (!slot.pause) return [[start, end]]

  let pauseStart = minutes(slot.pause[0])
  let pauseEnd = minutes(slot.pause[1])
  if (end > DAY_MINUTES && pauseStart < start) {
    pauseStart += DAY_MINUTES
    pauseEnd += DAY_MINUTES
  }
  if (pauseEnd < pauseStart) pauseEnd += DAY_MINUTES
  pauseStart = Math.max(start, pauseStart)
  pauseEnd = Math.min(end, pauseEnd)
  if (!(pauseStart < pauseEnd)) return [[start, end]]

  return [[start, pauseStart], [pauseEnd, end]]
}

export function plannedMinutes(
  schedule: Readonly<Record<string, SchedulePlanningSlot[]>>,
  from: string,
  to: string,
): number {
  const firstDay = Date.parse(from)
  const afterLastDay = (Date.parse(to) - firstDay) / 60_000 + DAY_MINUTES
  const intervals: Interval[] = []

  for (const [date, slots] of Object.entries(schedule)) {
    const offset = (Date.parse(date) - firstDay) / 60_000
    for (const slot of slots) {
      for (const [start, end] of workingIntervals(slot)) {
        const clippedStart = Math.max(0, offset + start)
        const clippedEnd = Math.min(afterLastDay, offset + end)
        if (clippedStart < clippedEnd) intervals.push([clippedStart, clippedEnd])
      }
    }
  }

  // Une même minute peut apparaître dans une suite de garde et dans un autre bloc.
  intervals.sort(([a], [b]) => a - b)
  let total = 0
  let coveredUntil = 0
  for (const [start, end] of intervals) {
    total += Math.max(0, end - Math.max(start, coveredUntil))
    coveredUntil = Math.max(coveredUntil, end)
  }
  return total
}
