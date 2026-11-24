import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canMoveService, serviceAbsence } from '../src/views/planning/suggestion/suggestions/suggestionServiceCells.ts'

const monday = '2026-11-23'
const item = (schedule, reason) => ({ schedule, reasons: { [monday]: reason } })
const service = { guid: 'service', definition: { Mon: [{ work: ['08:00', '16:00'] }] } }

test('distinguishes rests, missing assignments and withdrawn guard continuations', () => {
  for (const source of ['WEEKLY_LEAVE', 'POST_GUARD_REST', 'REST', 'TEMPLATE_REST']) {
    assert.equal(serviceAbsence(item({ [monday]: null }, { source }), monday), 'rest')
  }
  assert.equal(serviceAbsence(item({ [monday]: null }, { source: 'MANUAL', manualLock: true }), monday), 'rest')
  assert.equal(serviceAbsence(item({ [monday]: null }, { source: 'MANUAL', manualDerived: true }), monday), 'unassigned')
  assert.equal(serviceAbsence(item({ [monday]: null }, { source: 'UNASSIGNED' }), monday), 'unassigned')
  assert.equal(serviceAbsence(item({ [monday]: null }), monday), 'unassigned')
  assert.equal(serviceAbsence(item({}), monday), 'unassigned')
  assert.equal(serviceAbsence(item({ [monday]: 'service' }), monday), undefined)
})

test('only admits a different service compatible with the source date', () => {
  for (const schedule of [{ [monday]: 'other' }, { [monday]: null }, {}]) {
    assert.equal(canMoveService(item(schedule), monday, monday, service), true)
  }
  assert.equal(canMoveService(item({ [monday]: 'service' }), monday, monday, service), false)
  assert.equal(canMoveService(item({}), monday, '2026-11-30', service), false)
  assert.equal(canMoveService(item({}), '2026-11-24', '2026-11-24', service), false)
  assert.equal(canMoveService(item({}), monday, monday, undefined), false)
})
