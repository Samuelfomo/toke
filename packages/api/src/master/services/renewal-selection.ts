export interface RenewalSelection {
  billing_cycle_months?: number;
  requested_seats?: number;
}
export function renewalSelection(input: Record<string, any> = {}): RenewalSelection {
  const result: RenewalSelection = {};
  for (const field of ['billing_cycle_months', 'requested_seats'] as const) {
    if (input[field] === undefined) continue;
    const value = input[field];
    if (!['string', 'number'].includes(typeof value) || !/^[1-9][0-9]*$/.test(String(value)))
      throw new Error('Invalid renewal selection: ' + field);
    const n = Number(value);
    if (
      !Number.isSafeInteger(n) ||
      (field === 'billing_cycle_months' ? ![1, 3, 6, 12].includes(n) : n > 32767)
    )
      throw new Error('Invalid renewal selection: ' + field);
    result[field] = n;
  }
  return result;
}
/** Comparer le choix demandé, pas les valeurs par défaut recalculées lors d'un rejeu. */
export function renewalRequest(selection: RenewalSelection) {
  return {
    billing_cycle_months: selection.billing_cycle_months ?? null,
    requested_seats: selection.requested_seats ?? null,
  };
}
