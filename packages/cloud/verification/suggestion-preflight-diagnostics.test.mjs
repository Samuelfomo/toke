import assert from 'node:assert/strict'
import { test } from 'node:test'
import { planningAlerts, planningAlertSummary } from '../src/views/planning/suggestion/suggestions/suggestionAlerts.ts'
import { readPreflightDiagnostic } from '../src/views/planning/suggestion/suggestions/preflightDiagnostics.ts'

test('reads the API capacity diagnosis without recomputing its figures', () => {
  const diagnostic = {
    code: 'PLANNING_PREFLIGHT_INFEASIBLE',
    details: { issues: [{
      code: 'PREFLIGHT_WEEKLY_WORK_CAPACITY_INSUFFICIENT', weekFrom: '2026-11-30',
      requirementGuids: ['early'],
      details: {
        configGuid: 'config', periodFrom: '2026-11-30', periodTo: '2026-12-06',
        population: { planningMode: 'ROTATING', guardPoolRelation: 'NON_MEMBER', eligibleEmployees: 4 },
        requiredAssignments: 24, maximumAssignments: 23, deficit: 1,
        dailyCapacity: [{ date: '2026-11-30', ordinaryCapacity: 0, quotaCapacity: 1, alternativeCapacity: 2,
          requirements: [{ guid: 'early', maximum: null }, { guid: 'late', maximum: 1 }] }],
        suggestedActions: [{ message: 'Revoir les plafonds.', requiresRevalidation: true }],
      },
    }], warnings: [{ message: 'Historique incomplet.' }] },
  }
  for (const envelope of [diagnostic, { error: diagnostic }, { response: { data: { error: diagnostic } } }]) {
    const result = readPreflightDiagnostic(envelope)
    const item = result.issues[0]
    assert.deepEqual([item.required, item.capacity, item.deficit, item.employees], [24, 23, 1, 4])
    assert.deepEqual(item.requirements, ['early', 'late'])
    assert.equal(item.days[0].ordinary, 0)
    assert.deepEqual(item.actions, ['Revoir les plafonds.'])
    assert.equal(item.to, '2026-12-06')
    assert.equal(result.warnings[0].message, 'Historique incomplet.')
  }
})

test('accepts legacy or incomplete details and leaves other errors on their existing path', () => {
  const report = readPreflightDiagnostic({ error: { code: 'PLANNING_PREFLIGHT_INFEASIBLE', details: {
    issues: [{ code: 'PREFLIGHT_REQUIREMENT_CAPACITY_INSUFFICIENT', date: '2026-12-01', message: 'Legacy', requirementGuid: 'need' }],
  } } })
  assert.deepEqual(report.issues[0].requirements, ['need'])
  assert.equal(report.issues[0].message, 'Legacy')
  assert.equal(report.issues[0].capacity, undefined)
  assert.deepEqual(readPreflightDiagnostic({ code: 'PLANNING_PREFLIGHT_INFEASIBLE' }), { issues: [], warnings: [] })
  assert.equal(readPreflightDiagnostic({ code: 'SUGGESTION_GENERATION_FAILED' }), null)
})


test('warnings on a generated suggestion do not become blocking alerts', () => {
  const alerts = planningAlerts({ apiPreflight: { warnings: [{ message: 'Capacité serrée' }] } })
  assert.equal(planningAlertSummary(alerts).critical, 0)
  assert.equal(planningAlertSummary(alerts).warnings, 1)
})
