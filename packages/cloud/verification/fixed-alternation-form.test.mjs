import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  eligibleFixedProfiles,
  fixedAlternationDraft,
  fixedAlternationProblems,
  fixedAlternationUpdate,
} from '../src/views/planning/suggestion/configuration/fixedAlternationForm.ts'

const profile = (guid, templateGuid, active = true, planning_mode = 'FIXED') => ({
  active, planning_mode, user: { guid, name: guid },
  fixed_session_template: templateGuid ? { guid: templateGuid, name: templateGuid } : null,
})
const profiles = eligibleFixedProfiles([
  profile('102', '202'), profile('101', '201'), profile('103', '201'),
  profile('104', '204', false), profile('105', '205', true, 'ROTATING'), profile('106', null),
])
const policy = {
  enabled: true, employee_guids: ['102', '101'], template_guids: ['202', '201'],
  anchor_date: '2026-12-28', shift_cadence_days: 1, weekend_rest: 'ALTERNATE_SAT_SUN',
}

test('absent and unchanged policy omit the field even if the profiles are unavailable', () => {
  assert.equal(fixedAlternationDraft().cadence, 1)
  assert.equal(fixedAlternationUpdate(fixedAlternationDraft(), null, profiles), undefined)
  assert.equal(fixedAlternationUpdate(fixedAlternationDraft(policy), policy, []), undefined)
})

test('disable preserves stored values and reactivation uses the ordered reference templates', () => {
  const disabled = { ...policy, enabled: false }
  assert.deepEqual(fixedAlternationUpdate(fixedAlternationDraft(disabled), policy, []), disabled)
  assert.deepEqual(fixedAlternationUpdate(fixedAlternationDraft(policy), disabled, profiles), policy)
  assert.deepEqual(profiles.map(candidate => candidate.user.guid), ['101', '102', '103', '106'])
})

test('unavailable profiles, duplicate collaborators or templates, dates and cadence are validated', () => {
  const draft = fixedAlternationDraft(policy)
  for (const [employeeGuids, error] of [
    [['101', '101'], /autre collaborateur/],
    [['101', '103'], /distincts/],
    [['101', '106'], /indisponible/],
    [['101', '104'], /indisponible/],
  ]) {
    const invalid = { ...draft, employeeGuids }
    assert.match(fixedAlternationProblems(invalid, profiles).fixed_employee_1, error)
    assert.equal(fixedAlternationUpdate(invalid, policy, profiles), undefined)
  }
  const errors = fixedAlternationProblems({ ...draft, anchorDate: '2026-02-30', cadence: 1.5 }, profiles)
  assert.ok(errors.fixed_anchor_date)
  assert.ok(errors.fixed_cadence)
})
