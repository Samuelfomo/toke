import assert from 'node:assert/strict'
import test from 'node:test'
import { plannedMinutes, previousPlanningDate } from '../src/views/planning/schedule_assignment/plannedHours.ts'

test('counts planned work minus pauses and leaves rest days at zero', () => {
  const schedule = {
    '2026-11-23': [{work: ['08:00', '17:00'], pause: ['12:00', '13:00']}],
    '2026-11-24': [],
  }
  assert.equal(plannedMinutes(schedule, '2026-11-23', '2026-11-24'), 480)
  assert.equal(plannedMinutes(schedule, '2026-11-24', '2026-11-24'), 0)
})

test('clips each side of a night shift with a pause that crosses midnight', () => {
  const schedule = {
    '2026-11-30': [{work: ['22:00', '06:00'], pause: ['23:30', '00:30']}],
  }
  assert.equal(previousPlanningDate('2026-12-01'), '2026-11-30')
  assert.equal(plannedMinutes(schedule, '2026-11-30', '2026-11-30'), 90)
  assert.equal(plannedMinutes(schedule, '2026-12-01', '2026-12-01'), 330)
  assert.equal(plannedMinutes(schedule, '2026-11-30', '2026-12-01'), 420)
})

test('aligns pauses after midnight and counts overlapping minutes once', () => {
  const schedule = {
    '2026-11-23': [{work: ['22:00', '06:00'], pause: ['02:00', '02:30']}],
    '2026-11-24': [{work: ['04:00', '08:00']}, {work: ['04:00', '08:00']}],
  }
  assert.equal(plannedMinutes(schedule, '2026-11-24', '2026-11-24'), 450)
})

test('retains the configured end of each separately assigned guard segment', () => {
  const schedule = {
    '2026-11-23': [{work: ['16:00', '23:59']}],
    '2026-11-24': [{work: ['00:00', '08:00']}],
  }
  assert.equal(plannedMinutes(schedule, '2026-11-23', '2026-11-24'), 959)
  assert.equal(plannedMinutes(schedule, '2026-11-24', '2026-11-24'), 480)
})
