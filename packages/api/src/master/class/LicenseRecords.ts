import LicenseRecordsModel from '../model/LicenseRecordsModel.js';
export class LicenseRecordsInputError extends Error {}
export function publicGuid(value: unknown): number {
  if (!/^[1-9][0-9]{5}$/.test(String(value)))
    throw new LicenseRecordsInputError('Invalid public GUID');
  return Number(value);
}
function cents(value: unknown): bigint {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!m) throw new Error('Invalid persisted monetary amount');
  return BigInt(m[1]) * 100n + BigInt((m[2] ?? '').padEnd(2, '0'));
}
function amount(value: bigint): string {
  return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}
export function cashSummary(record: Record<string, any>): Record<string, any> {
  const due = cents(record.payment.amount_local);
  if (record.cash.some((r: any) => r.currency_code !== record.payment.currency_code))
    throw new Error('Inconsistent cash currencies');
  const total = record.cash.reduce((sum: bigint, r: any) => sum + cents(r.amount_local), 0n);
  const mixed =
    record.cash.some((r: any) => r.source === 'FULL_RECEIPT') &&
    record.cash.some((r: any) => r.source === 'INSTALLMENT');
  const review = mixed || total > due;
  return {
    payment: record.payment,
    encashments: record.cash,
    settlement: record.settlement,
    amount_due_local: amount(due),
    cash_received_local: amount(total),
    cash_outstanding_local: amount(total >= due ? 0n : due - total),
    cash_state: review
      ? 'REVIEW_REQUIRED'
      : total === due
        ? 'SETTLED'
        : total > 0n
          ? 'PARTIALLY_RECEIVED'
          : 'NOT_RECEIVED',
    review_reason: mixed
      ? 'MIXED_LEGACY_CASH_SOURCES'
      : total > due
        ? 'CASH_EXCEEDS_AMOUNT_DUE'
        : null,
    scope: 'CASH_ONLY',
    mutates_access: false,
  };
}
export default class LicenseRecords extends LicenseRecordsModel {
  async cash(tenant: unknown, payment: unknown): Promise<Record<string, any>> {
    return cashSummary(
      await this.loadCash({ tenantGuid: publicGuid(tenant), resourceGuid: publicGuid(payment) }),
    );
  }
  async events(
    tenant: unknown,
    license: unknown,
    rawLimit: unknown = 50,
    rawOffset: unknown = 0,
  ): Promise<Record<string, any>> {
    const limit = Number(rawLimit),
      offset = Number(rawOffset);
    if (
      !/^\d+$/.test(String(rawLimit)) ||
      !/^\d+$/.test(String(rawOffset)) ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 100000
    )
      throw new LicenseRecordsInputError('Invalid pagination');
    const rows = await this.loadEvents(
      { tenantGuid: publicGuid(tenant), resourceGuid: publicGuid(license) },
      limit + 1,
      offset,
    );
    return {
      items: rows.slice(0, limit),
      limit,
      offset,
      has_more: rows.length > limit,
      coverage: 'RECORDED_LICENSE_OPERATIONS',
      complete_audit: false,
    };
  }
}
