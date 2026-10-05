export class ActivityMonitoringInputError extends Error {}
export function activityGuid(value: unknown): number {
  if (!/^[1-9][0-9]{5}$/.test(String(value)))
    throw new ActivityMonitoringInputError('Six-digit GUID required');
  return Number(value);
}
export function activityDate(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new ActivityMonitoringInputError('ISO date with timezone required');
  if (
    Number(value.slice(11, 13)) > 23 ||
    Number(value.slice(14, 16)) > 59 ||
    Number(value.slice(17, 19)) > 59 ||
    new Date(value.slice(0, 10) + 'T00:00:00Z').toISOString().slice(0, 10) !== value.slice(0, 10)
  )
    throw new ActivityMonitoringInputError('Invalid calendar date or time');
  const zone = value.slice(-6);
  if (zone[0] === '+' || zone[0] === '-') {
    if (
      Number(zone.slice(1, 3)) > 14 ||
      Number(zone.slice(4)) > 59 ||
      (Number(zone.slice(1, 3)) === 14 && Number(zone.slice(4)) !== 0)
    )
      throw new ActivityMonitoringInputError('Invalid timezone offset');
  }
  return new Date(value).toISOString();
}

export function summarizeMonthlyMonitoring(result: Record<string, any>): Record<string, any> {
  const employees = result.employees.map((e: any) => ({
    ...e,
    billing_status: Number(e.active_days) > 0 ? 'BILLABLE' : 'NON_BILLABLE',
    activity_basis: Number(e.active_days) > 0 ? 'OBSERVED_DAILY_USAGE' : 'NO_DAILY_TRACE_RECEIVED',
  }));
  const count = employees.filter((e: any) => e.billing_status === 'BILLABLE').length;
  return {
    ...result,
    employees,
    billable_employees: count,
    billed_seats: Math.max(result.minimum_seats, count),
    basis: 'MONTHLY_OBSERVED_USAGE',
    recent_activity_window_days: 7,
    is_estimate: true,
    taxes_included: false,
    data_completeness: 'NOT_ATTESTED',
    invoice_creation_allowed: false,
    warning:
      'Daily traces only. No trace is not proof of no usage. Existing invoices are unchanged.',
  };
}
