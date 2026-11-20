import axios, { type AxiosInstance } from 'axios'

const baseURL = `https://${import.meta.env.VITE_URL}`
export type OnboardingGuid = string | number

export interface OnboardingSubscribePayload {
  requested_seats: number
  payment_method_guid: OnboardingGuid
}

export interface OnboardingPaymentMethod {
  guid: OnboardingGuid
  code: string | null
  name: string
  methodType: string | null
  supportedCurrencies: string[]
  minAmountUsd: string | null
  maxAmountUsd: string | null
  raw: Record<string, unknown>
}

export interface OnboardingEstimateView {
  requestedSeats: number | null
  paymentMethodGuid: OnboardingGuid | null
  billingCurrencyCode: string | null
  exchangeRateUsed: string | null
  taxRulesApplied: unknown
  subtotalUsd: string | null
  taxAmountUsd: string | null
  totalAmountUsd: string | null
  subtotalLocal: string | null
  taxAmountLocal: string | null
  totalAmountLocal: string | null
  estimatedAt: string | null
  estimateOnly: boolean
  createsDebt: boolean
  pricingBasis: string | null
  periodPolicy: string | null
  notice: string | null
  raw: Record<string, unknown>
}

export type OnboardingPaymentAttemptStatus = 'CREATED' | 'UNKNOWN' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | string

export interface OnboardingPaymentAttemptView {
  guid: OnboardingGuid | null
  paymentTransactionGuid: OnboardingGuid | null
  status: OnboardingPaymentAttemptStatus | null
  amountLocal: string | null
  currencyCode: string | null
  phoneMasked: string | null
  createdAt: string | null
  updatedAt: string | null
  completedAt: string | null
  failedAt: string | null
  replayed: boolean
  financialSettlement: string | null
  reconciliationRequired: boolean
  noticeCode: string | null
  raw: Record<string, unknown>
}

export interface OnboardingPaymentInitiatePayload {
  payment_transaction_guid: OnboardingGuid
  phone_number: string
  idempotency_key: string
}

export interface OnboardingPaymentView {
  licenseGuid: OnboardingGuid | null
  paymentTransactionGuid: OnboardingGuid | null
  billingCycleGuid: OnboardingGuid | null
  periodStart: string | null
  periodEnd: string | null
  paymentDueDate: string | null
  transactionStatus: string | null
  billingStatus: string | null
  invoiceAmountLocal: string | null
  receivedLocal: string | null
  amountToPayLocal: string | null
  currencyCode: string | null
  subtotalUsd: string | null
  taxAmountUsd: string | null
  totalAmountUsd: string | null
  subtotalLocal: string | null
  taxAmountLocal: string | null
  totalAmountLocal: string | null
  exchangeRateUsed: string | null
  taxRulesApplied: unknown
  requestedSeats: number | null
  billedSeats: number | null
  unitPriceUsd: string | null
  paymentMethodGuid: OnboardingGuid | null
  paymentMethodCode: string | null
  paymentReference: string | null
  isPartial: boolean | null
  raw: Record<string, unknown>
}

export interface OnboardingStatusView {
  tenantGuid: OnboardingGuid | null
  tenantName: string | null
  tenantStatus: string | null
  phase: string | null
  provisioningStatus: string | null
  subdomain: string | null
  billingCurrencyCode: string | null
  canSubscribe: boolean
  periodPolicy: string | null
  periodNotice: string | null

  licenseGuid: OnboardingGuid | null
  licenseType: string | null
  licenseLabel: string | null
  billingMode: string | null
  billingCycleMonths: number | null
  minimumSeats: number | null
  maximumSeats: number | null
  unitPriceUsd: string | null
  pricingCurrencyCode: string | null
  payments: OnboardingPaymentView[]
  accessAllowed: boolean | null
  accessBasis: string | null
  accessUntil: string | null

  isReady: boolean
  raw: Record<string, unknown>
}

export class TenantOnboardingError extends Error {
  readonly status?: number
  readonly code: string
  readonly payload?: unknown
  constructor(options: { message: string; status?: number; code?: string; payload?: unknown }) {
    super(options.message)
    this.name = 'TenantOnboardingError'
    this.status = options.status
    this.code = options.code ?? 'onboarding_request_failed'
    this.payload = options.payload
  }
}

const onboardingClient: AxiosInstance = axios.create({
  baseURL,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}

const unwrap = (payload: unknown): Record<string, any> => {
  const root = asRecord(payload)
  if (root.success === false) throw new TenantOnboardingError({
    code: String(asRecord(root.error).code ?? 'onboarding_request_failed'),
    message: String(asRecord(root.error).message ?? 'Une erreur est survenue.'),
    payload,
  })
  const data = asRecord(root.data)
  return Object.keys(data).length ? data : root
}

const stringOrNull = (value: unknown): string | null => value === undefined || value === null || value === '' ? null : String(value)
const numberOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
const guidOrNull = (value: unknown): OnboardingGuid | null => value === undefined || value === null || value === '' ? null : value as OnboardingGuid
const tokenHeaders = (token: string) => ({ 'x-onboarding-token': token })

const requestError = (error: any): never => {
  if (error instanceof TenantOnboardingError) throw error
  const status = error?.response?.status
  const payload = error?.response?.data
  const root = asRecord(payload)
  const apiError = asRecord(root.error)
  throw new TenantOnboardingError({
    status,
    code: String(apiError.code ?? 'onboarding_request_failed'),
    message: String(apiError.message ?? root.message ?? error?.message ?? 'Une erreur réseau est survenue.'),
    payload,
  })
}

const normalizePayment = (paymentValue: unknown, licenseGuid: OnboardingGuid | null = null): OnboardingPaymentView => {
  const p = asRecord(paymentValue)
  return {
    licenseGuid,
    paymentTransactionGuid: guidOrNull(p.payment_transaction_guid),
    billingCycleGuid: guidOrNull(p.billing_cycle_guid),
    periodStart: stringOrNull(p.period_start),
    periodEnd: stringOrNull(p.period_end),
    paymentDueDate: stringOrNull(p.payment_due_date),
    transactionStatus: stringOrNull(p.transaction_status),
    billingStatus: stringOrNull(p.billing_status),
    invoiceAmountLocal: stringOrNull(p.invoice_amount_local),
    receivedLocal: stringOrNull(p.received_local),
    amountToPayLocal: stringOrNull(p.amount_to_pay_local),
    currencyCode: stringOrNull(p.currency_code),
    subtotalUsd: stringOrNull(p.subtotal_usd),
    taxAmountUsd: stringOrNull(p.tax_amount_usd),
    totalAmountUsd: stringOrNull(p.total_amount_usd),
    subtotalLocal: stringOrNull(p.subtotal_local),
    taxAmountLocal: stringOrNull(p.tax_amount_local),
    totalAmountLocal: stringOrNull(p.total_amount_local),
    exchangeRateUsed: stringOrNull(p.exchange_rate_used),
    taxRulesApplied: p.tax_rules_applied ?? null,
    requestedSeats: numberOrNull(p.requested_seats),
    billedSeats: numberOrNull(p.billed_seats),
    unitPriceUsd: stringOrNull(p.unit_price_usd),
    paymentMethodGuid: guidOrNull(p.payment_method_guid),
    paymentMethodCode: stringOrNull(p.payment_method_code),
    paymentReference: stringOrNull(p.payment_reference),
    isPartial: typeof p.is_partial === 'boolean' ? p.is_partial : null,
    raw: p,
  }
}

export const normalizeOnboardingStatus = (payload: unknown): OnboardingStatusView => {
  const body = unwrap(payload)
  const offer = asRecord(body.offer)
  const financial = asRecord(body.financial)
  const licenses = Array.isArray(financial.licenses) ? financial.licenses : []
  const licenseRecords = licenses.map(asRecord)
  const requestedLicenseGuid = guidOrNull(body.license_guid)
  const selectedLicense = requestedLicenseGuid !== null
    ? (licenseRecords.find((l) => String(l.guid ?? l.license_guid) === String(requestedLicenseGuid)) ?? {})
    : (licenseRecords.length === 1 ? licenseRecords[0] : {})
  const selectedLicenseGuid = guidOrNull(selectedLicense.guid ?? selectedLicense.license_guid ?? requestedLicenseGuid)
  const payments = Array.isArray(selectedLicense.payments)
    ? selectedLicense.payments.map((payment) => normalizePayment(payment, selectedLicenseGuid))
    : []
  const access = asRecord(selectedLicense.access)

  return {
    tenantGuid: guidOrNull(body.tenant_guid ?? financial.tenant_guid),
    tenantName: stringOrNull(body.name ?? financial.name),
    tenantStatus: stringOrNull(body.tenant_status ?? financial.tenant_status),
    phase: stringOrNull(body.phase),
    provisioningStatus: stringOrNull(body.provisioning),
    subdomain: stringOrNull(body.subdomain),
    billingCurrencyCode: stringOrNull(body.billing_currency_code),
    canSubscribe: body.can_subscribe === true,
    periodPolicy: stringOrNull(body.period_policy),
    periodNotice: stringOrNull(body.period_notice),

    licenseGuid: selectedLicenseGuid,
    licenseType: stringOrNull(offer.license_type ?? selectedLicense.license_type),
    licenseLabel: stringOrNull(offer.label),
    billingMode: stringOrNull(offer.billing_mode ?? selectedLicense.billing_mode),
    billingCycleMonths: numberOrNull(offer.billing_cycle_months ?? selectedLicense.billing_cycle_months),
    minimumSeats: numberOrNull(offer.minimum_seats ?? selectedLicense.minimum_seats),
    maximumSeats: numberOrNull(offer.maximum_seats),
    unitPriceUsd: stringOrNull(offer.unit_price_usd ?? selectedLicense.unit_price_usd),
    pricingCurrencyCode: stringOrNull(offer.pricing_currency_code),
    payments,
    accessAllowed: typeof access.allowed === 'boolean' ? access.allowed : null,
    accessBasis: stringOrNull(access.basis),
    accessUntil: stringOrNull(access.access_until),

    isReady: String(body.phase ?? '').toUpperCase() === 'READY',
    raw: body,
  }
}

export const normalizePaymentMethods = (payload: unknown): OnboardingPaymentMethod[] => {
  const body = unwrap(payload)
  const items = Array.isArray(body.payment_methods) ? body.payment_methods : []
  return items.map<OnboardingPaymentMethod | null>((value) => {
    const m = asRecord(value)
    const guid = guidOrNull(m.guid)
    if (guid === null) return null
    return {
      guid,
      code: stringOrNull(m.code),
      name: String(m.name ?? m.code ?? 'Moyen de paiement'),
      methodType: stringOrNull(m.method_type),
      supportedCurrencies: Array.isArray(m.supported_currencies) ? m.supported_currencies.map(String) : [],
      minAmountUsd: stringOrNull(m.min_amount_usd),
      maxAmountUsd: stringOrNull(m.max_amount_usd),
      raw: m,
    }
  }).filter((m): m is OnboardingPaymentMethod => m !== null)
}

export const normalizeEstimate = (payload: unknown): OnboardingEstimateView => {
  const body = unwrap(payload)
  const amounts = asRecord(body.amounts)
  return {
    requestedSeats: numberOrNull(body.requested_seats),
    paymentMethodGuid: guidOrNull(body.payment_method_guid),
    billingCurrencyCode: stringOrNull(body.billing_currency_code),
    exchangeRateUsed: stringOrNull(body.exchange_rate_used),
    taxRulesApplied: body.tax_rules_applied ?? null,
    subtotalUsd: stringOrNull(amounts.subtotal_usd),
    taxAmountUsd: stringOrNull(amounts.tax_amount_usd),
    totalAmountUsd: stringOrNull(amounts.total_amount_usd),
    subtotalLocal: stringOrNull(amounts.subtotal_local),
    taxAmountLocal: stringOrNull(amounts.tax_amount_local),
    totalAmountLocal: stringOrNull(amounts.total_amount_local),
    estimatedAt: stringOrNull(body.estimated_at),
    estimateOnly: body.estimate_only === true,
    createsDebt: body.creates_debt === true,
    pricingBasis: stringOrNull(body.pricing_basis),
    periodPolicy: stringOrNull(body.period_policy),
    notice: stringOrNull(body.notice),
    raw: body,
  }
}

const normalizePaymentAttempt = (payload: unknown): OnboardingPaymentAttemptView => {
  const body = unwrap(payload)
  const attempt = asRecord(body.attempt ?? body)
  return {
    guid: guidOrNull(attempt.guid),
    paymentTransactionGuid: guidOrNull(attempt.payment_transaction_guid),
    status: stringOrNull(attempt.status),
    amountLocal: stringOrNull(attempt.amount_local),
    currencyCode: stringOrNull(attempt.currency_code),
    phoneMasked: stringOrNull(attempt.phone_masked),
    createdAt: stringOrNull(attempt.created_at),
    updatedAt: stringOrNull(attempt.updated_at),
    completedAt: stringOrNull(attempt.completed_at),
    failedAt: stringOrNull(attempt.failed_at),
    replayed: body.replayed === true,
    financialSettlement: stringOrNull(body.financial_settlement),
    reconciliationRequired: body.reconciliation_required === true,
    noticeCode: stringOrNull(body.notice_code),
    raw: body,
  }
}

const normalizePaymentAttempts = (payload: unknown): { paymentTransactionGuid: OnboardingGuid | null; attempts: OnboardingPaymentAttemptView[] } => {
  const body = unwrap(payload)
  const paymentTransactionGuid = guidOrNull(body.payment_transaction_guid)
  const attempts = Array.isArray(body.attempts)
    ? body.attempts.map((attempt) => normalizePaymentAttempt({ success: true, data: { attempt } }))
    : []
  return { paymentTransactionGuid, attempts }
}

export const tenantOnboardingService = {
  async getStatus(token: string) {
    try {
      const response = await onboardingClient.get('/tenant-onboarding/status', { headers: tokenHeaders(token) })
      return normalizeOnboardingStatus(response.data)
    } catch (error) { return requestError(error) }
  },
  async getPaymentMethods(token: string) {
    try {
      const response = await onboardingClient.get('/tenant-onboarding/payment-methods', { headers: tokenHeaders(token) })
      return normalizePaymentMethods(response.data)
    } catch (error) { return requestError(error) }
  },
  async estimate(token: string, payload: OnboardingSubscribePayload) {
    try {
      const response = await onboardingClient.post('/tenant-onboarding/estimate', payload, { headers: tokenHeaders(token) })
      return normalizeEstimate(response.data)
    } catch (error) { return requestError(error) }
  },
  async subscribe(token: string, payload: OnboardingSubscribePayload) {
    try {
      const response = await onboardingClient.post('/tenant-onboarding/subscribe', payload, { headers: tokenHeaders(token) })
      return normalizeOnboardingStatus(response.data)
    } catch (error) { return requestError(error) }
  },
  async getPaymentAttempts(token: string, paymentTransactionGuid: OnboardingGuid) {
    try {
      const response = await onboardingClient.get('/tenant-onboarding/payment-attempts', {
        headers: tokenHeaders(token),
        params: { payment_transaction_guid: paymentTransactionGuid },
      })
      return normalizePaymentAttempts(response.data)
    } catch (error) { return requestError(error) }
  },
  async getPaymentAttempt(token: string, attemptGuid: OnboardingGuid) {
    try {
      const response = await onboardingClient.get(`/tenant-onboarding/payment-attempts/${attemptGuid}`, { headers: tokenHeaders(token) })
      return normalizePaymentAttempt(response.data)
    } catch (error) { return requestError(error) }
  },
  async initiatePayment(token: string, payload: OnboardingPaymentInitiatePayload) {
    try {
      const response = await onboardingClient.post('/tenant-onboarding/payment-initiate', payload, { headers: tokenHeaders(token) })
      return normalizePaymentAttempt(response.data)
    } catch (error) { return requestError(error) }
  },
  async refreshPaymentAttempt(token: string, attemptGuid: OnboardingGuid) {
    try {
      const response = await onboardingClient.post(`/tenant-onboarding/payment-attempts/${attemptGuid}/refresh`, {}, { headers: tokenHeaders(token) })
      return normalizePaymentAttempt(response.data)
    } catch (error) { return requestError(error) }
  },
  async resend(email: string) {
    try {
      const response = await onboardingClient.post('/tenant-onboarding/resend', { email })
      return response.data
    } catch (error) { return requestError(error) }
  },
}
