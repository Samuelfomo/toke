import type { SuggestionCoverage, SuggestionDiagnostics } from '../planningSuggestion.type'

export interface AlertTarget {
  date?: string | null
  employeeGuid?: string | null
  templateGuid?: string
}

interface PlanningAlert extends AlertTarget {
  critical: boolean
  message: string
  count?: number
}

const coverageCodes = new Set(['MIN_COVERAGE_NOT_REACHED', 'TARGET_COVERAGE_NOT_REACHED', 'MAX_COVERAGE_EXCEEDED'])

function coverageMessage(entry: SuggestionCoverage): string {
  const label = entry.status === 'BELOW_MINIMUM' ? `minimum ${entry.minimum}`
    : entry.status === 'ABOVE_MAXIMUM' ? `maximum ${entry.maximum}` : `cible ${entry.target}`
  return `${entry.templateName} : ${entry.assigned} collaborateur(s) affecté(s), ${label}.`
}

export function planningAlerts(diagnostics?: SuggestionDiagnostics | null): PlanningAlert[] | null {
  if (!diagnostics) return null
  const violations = diagnostics.violations
  const coverage = diagnostics.coverage
  const entries = new Map((coverage ?? []).map(entry => [`${entry.date}|${entry.requirementGuid}`, entry]))
  const reported = new Set<string>()
  const alerts: PlanningAlert[] = (violations ?? []).map(violation => {
    const key = `${violation.date}|${violation.requirementGuid}`
    const entry = entries.get(key)
    const isCoverage = entry && entry.status !== 'COVERED' && coverageCodes.has(violation.code)
    if (isCoverage) reported.add(key)
    return {
      critical: violation.severity === 'HARD',
      date: violation.date,
      employeeGuid: violation.employeeGuid,
      templateGuid: entry?.templateGuid,
      message: isCoverage ? coverageMessage(entry) : violation.message,
    }
  })

  for (const [key, entry] of entries) {
    if (entry.status === 'COVERED' || reported.has(key)) continue
    alerts.push({
      critical: entry.status === 'BELOW_MINIMUM' || entry.status === 'ABOVE_MAXIMUM',
      date: entry.date,
      templateGuid: entry.templateGuid,
      message: coverageMessage(entry),
    })
  }
  if (diagnostics.historyReview?.warning) {
    alerts.push({ critical: false, message: 'L’historique d’équité était indisponible lors du calcul.' })
  }
  const historyCount = diagnostics.historyReview?.anomalies?.length
  if (historyCount) {
    alerts.push({ critical: false, count: historyCount, message: `${historyCount} anomalie(s) dans l’historique des plannings.` })
  }
  const regeneration = diagnostics.regeneration
  if (regeneration?.warnings?.length) {
    alerts.push(...regeneration.warnings.map(warning => ({ critical: false, message: warning.message })))
  } else if (regeneration?.warningCount) {
    const count = regeneration.warningCount
    alerts.push({ critical: false, count, message: `${count} avertissement(s) signalé(s) lors de la dernière régénération.` })
  }

  if (!Array.isArray(violations) && !Array.isArray(coverage) && !alerts.length) return null
  return alerts.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
}

export function alertCountLabel(critical: number, warnings: number): string {
  if (!critical && !warnings) return 'Aucune alerte signalée'
  return `${critical} anomalie${critical === 1 ? '' : 's'} critique${critical === 1 ? '' : 's'} · ${warnings} avertissement${warnings === 1 ? '' : 's'}`
}

export function planningAlertSummary(alerts: ReturnType<typeof planningAlerts>) {
  if (!alerts) return null
  const critical = alerts.filter(alert => alert.critical).length
  const warnings = alerts.reduce((sum, alert) => sum + (alert.critical ? 0 : alert.count ?? 1), 0)
  return { critical, warnings, label: alertCountLabel(critical, warnings) }
}
