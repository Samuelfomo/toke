import axios, { AxiosInstance } from 'axios'

const baseURL = `https://${import.meta.env.VITE_URL}`

export type OnboardingGuid = string | number

export interface OnboardingSubscribePayload {
  requested_seats: number
  payment_method_guid: OnboardingGuid
}

export interface OnboardingPaymentMethod {
  guid: OnboardingGuid
  name: string
  code?: string | null
  currency?: string | null
  supportedCurrencies: string[]
  raw: Record<string, unknown>
}

export interface OnboardingStatusView {
  state: string | null
  phase: string | null
  provisioningStatus: string | null
  tenantGuid: OnboardingGuid | null
  tenantName: string | null
  tenantStatus: string | null
  subdomain: string | null

  licenseGuid: OnboardingGuid | null
  licenseType: string | null
  licenseLabel: string | null
  billingMode: string | null
  billingCycleMonths: number | null
  minimumSeats: number | null
  maximumSeats: number | null
  requestedSeats: number | null
  paidSeats: number | null

  unitPrice: string | number | null
  unitPriceCurrency: string | null
  billingCurrencyCode: string | null
  periodPolicy: string | null
  periodNotice: string | null
  periodStart: string | null
  periodEnd: string | null

  invoiceAmount: string | number | null
  amountReceived: string | number | null
  amountDue: string | number | null
  taxesAmount: string | number | null
  currencyCode: string | null
  paymentStatus: string | null

  canSubscribe: boolean | null
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
  headers: {
    'Content-Type': 'application/json',
  },
})

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {}

const unwrap = (payload: unknown): Record<string, any> => {
  const root = asRecord(payload)
  const data = asRecord(root.data)
  return Object.keys(data).length ? data : root
}

const firstDefined = (...values: unknown[]) => values.find((value) => value !== undefined && value !== null)

const firstRecord = (...values: unknown[]) => {
  for (const value of values) {
    const record = asRecord(value)
    if (Object.keys(record).length) return record
  }
  return {}
}

const firstArrayRecord = (...values: unknown[]): Record<string, any> => {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) {
      const record = asRecord(value[0])
      if (Object.keys(record).length) return record
    }
  }
  return {}
}

const numberOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const stringOrNull = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null
  return String(value)
}

const scalarOrNull = (value: unknown): string | number | null => {
  if (value === undefined || value === null || value === '') return null
  return typeof value === 'number' ? value : String(value)
}

const requestError = (error: any): never => {
  const status = error?.response?.status
  const payload = error?.response?.data
  const root = asRecord(payload)
  const nested = asRecord(root.error)
  const deepest = asRecord(nested.error)
  const apiError = Object.keys(deepest).length ? deepest : Object.keys(nested).length ? nested : root

  throw new TenantOnboardingError({
    status,
    code: String(apiError.code ?? 'onboarding_request_failed'),
    message: String(apiError.message ?? root.message ?? error?.message ?? 'Une erreur réseau est survenue.'),
    payload,
  })
}

const tokenHeaders = (token: string) => ({
  'x-onboarding-token': token,
})

export const normalizeOnboardingStatus = (payload: unknown): OnboardingStatusView => {
  const body = unwrap(payload)
  const financial = asRecord(body.financial)
  const tenant = firstRecord(body.tenant, financial.tenant)
  const license = firstRecord(
    body.license,
    body.subscription,
    body.global_license,
    financial.license,
    financial.global_license,
    firstArrayRecord(body.licenses, financial.licenses),
  )
  const pricing = firstRecord(body.pricing, body.offer, body.plan, body.subscription_config, license.pricing)
  const payment = firstRecord(
    body.payment,
    body.transaction,
    body.invoice,
    license.payment,
    firstArrayRecord(body.payments, license.payments, financial.payments),
  )

  const phase = stringOrNull(firstDefined(body.phase, body.onboarding_phase, body.onboardingPhase))
  const state = stringOrNull(firstDefined(body.state, body.status, body.onboarding_status, body.onboardingState, phase))
  const provisioningStatus = stringOrNull(firstDefined(body.provisioning, body.provisioning_status, body.provisioningStatus))
  const normalizedState = String(firstDefined(state, phase, '')).toUpperCase()
  const normalizedProvisioning = String(provisioningStatus ?? '').toUpperCase()

  const explicitCanSubscribe = firstDefined(body.can_subscribe, body.canSubscribe)
  const canSubscribe = typeof explicitCanSubscribe === 'boolean'
    ? explicitCanSubscribe
    : phase?.toUpperCase() === 'SUBSCRIPTION_REQUIRED'
      ? true
      : null

  const currencyCode = stringOrNull(firstDefined(
    payment.currency_code,
    payment.currency,
    body.billing_currency_code,
    body.billingCurrencyCode,
    body.currency_code,
    body.currencyCode,
  ))

  return {
    state,
    phase,
    provisioningStatus,
    tenantGuid: (firstDefined(body.tenant_guid, body.tenantGuid, tenant.guid, financial.tenant_guid) ?? null) as OnboardingGuid | null,
    tenantName: stringOrNull(firstDefined(body.name, body.tenant_name, body.tenantName, tenant.name, financial.name)),
    tenantStatus: stringOrNull(firstDefined(tenant.status, tenant.tenant_status, financial.tenant_status, body.tenant_status, body.tenantStatus)),
    subdomain: stringOrNull(firstDefined(body.subdomain, tenant.subdomain, financial.subdomain)),

    licenseGuid: (firstDefined(license.guid, license.license_guid, body.license_guid) ?? null) as OnboardingGuid | null,
    licenseType: stringOrNull(firstDefined(license.license_type, pricing.license_type, body.license_type, body.licenseType)),
    licenseLabel: stringOrNull(firstDefined(license.name, license.label, pricing.name, pricing.label, body.license_name)),
    billingMode: stringOrNull(firstDefined(license.billing_mode, pricing.billing_mode, body.billing_mode, body.billingMode)),
    billingCycleMonths: numberOrNull(firstDefined(license.billing_cycle_months, pricing.billing_cycle_months, body.billing_cycle_months, body.billingCycleMonths)),
    minimumSeats: numberOrNull(firstDefined(license.minimum_seats, pricing.minimum_seats, body.minimum_seats, body.minimumSeats)),
    maximumSeats: numberOrNull(firstDefined(license.maximum_seats, pricing.maximum_seats, body.maximum_seats, body.maximumSeats)),
    requestedSeats: numberOrNull(firstDefined(license.requested_seats, pricing.requested_seats, body.requested_seats, body.requestedSeats)),
    paidSeats: numberOrNull(firstDefined(license.paid_seats, license.total_seats_purchased, body.paid_seats, body.total_seats_purchased)),

    unitPrice: scalarOrNull(firstDefined(
      pricing.unit_price,
      pricing.unit_price_usd,
      pricing.price_per_employee,
      pricing.employee_price,
      pricing.seat_price,
      pricing.base_price_usd,
      license.unit_price,
      license.price_per_employee,
      license.base_price_usd,
      body.unit_price,
      body.unit_price_usd,
      body.price_per_employee,
      body.base_price_usd,
    )),
    unitPriceCurrency: stringOrNull(firstDefined(
      pricing.unit_price_currency,
      pricing.pricing_currency_code,
      pricing.currency_code,
      license.currency_code,
      body.unit_price_currency,
      body.pricing_currency_code,
    )),
    billingCurrencyCode: stringOrNull(firstDefined(
      body.billing_currency_code,
      body.billingCurrencyCode,
      payment.currency_code,
      payment.currency,
    )),
    periodPolicy: stringOrNull(firstDefined(body.period_policy, body.periodPolicy)),
    periodNotice: stringOrNull(firstDefined(body.period_notice, body.periodNotice)),
    periodStart: stringOrNull(firstDefined(
      license.current_period_start,
      license.period_start,
      payment.period_start,
      body.period_start,
      body.start_date,
    )),
    periodEnd: stringOrNull(firstDefined(
      license.current_period_end,
      license.period_end,
      payment.period_end,
      body.period_end,
      body.end_date,
    )),

    invoiceAmount: scalarOrNull(firstDefined(
      payment.invoice_amount_local,
      payment.invoice_amount,
      payment.amount_total,
      body.invoice_amount_local,
      body.invoice_amount,
    )),
    amountReceived: scalarOrNull(firstDefined(
      payment.received_local,
      payment.amount_received,
      body.received_local,
      body.amount_received,
    )),
    amountDue: scalarOrNull(firstDefined(
      payment.amount_to_pay_local,
      payment.amount_due,
      body.amount_to_pay_local,
      body.amount_due,
      body.amountDue,
    )),
    taxesAmount: scalarOrNull(firstDefined(
      payment.tax_amount,
      payment.taxes_amount,
      body.tax_amount,
      body.taxes_amount,
    )),
    currencyCode,
    paymentStatus: stringOrNull(firstDefined(
      payment.status,
      payment.transaction_status,
      body.payment_status,
      body.paymentStatus,
    )),

    canSubscribe,
    isReady: normalizedState === 'READY' || normalizedProvisioning === 'READY',
    raw: body,
  }
}

export const normalizePaymentMethods = (payload: unknown): OnboardingPaymentMethod[] => {
  const body = unwrap(payload)
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(body.payment_methods)
      ? body.payment_methods
      : Array.isArray(body.methods)
        ? body.methods
        : Array.isArray(body.items)
          ? body.items
          : []

  return candidates
    .map<OnboardingPaymentMethod | null>((item: unknown) => {
      const method = asRecord(item)
      const guid = firstDefined(method.guid, method.payment_method_guid, method.id)
      if (guid === undefined || guid === null) return null

      const supportedCurrencies = Array.isArray(method.supported_currencies)
        ? method.supported_currencies.map((value: unknown) => String(value))
        : Array.isArray(method.currencies)
          ? method.currencies.map((value: unknown) => String(value))
          : []

      return {
        guid: guid as OnboardingGuid,
        name: String(firstDefined(method.display_name, method.name, method.label, method.code, `Moyen ${guid}`)),
        code: stringOrNull(method.code),
        currency: stringOrNull(firstDefined(method.currency_code, method.currency)),
        supportedCurrencies,
        raw: method,
      }
    })
    .filter((method): method is OnboardingPaymentMethod => method !== null)
}

export const tenantOnboardingService = {
  async getStatus(token: string): Promise<OnboardingStatusView> {
    try {
      const response = await onboardingClient.get('/tenant-onboarding/status', {
        headers: tokenHeaders(token),
      })
      return normalizeOnboardingStatus(response.data)
    } catch (error) {
      return requestError(error)
    }
  },

  async getPaymentMethods(token: string): Promise<OnboardingPaymentMethod[]> {
    try {
      const response = await onboardingClient.get('/tenant-onboarding/payment-methods', {
        headers: tokenHeaders(token),
      })
      return normalizePaymentMethods(response.data)
    } catch (error) {
      return requestError(error)
    }
  },

  async subscribe(token: string, payload: OnboardingSubscribePayload): Promise<OnboardingStatusView> {
    try {
      const response = await onboardingClient.post('/tenant-onboarding/subscribe', payload, {
        headers: tokenHeaders(token),
      })
      return normalizeOnboardingStatus(response.data)
    } catch (error) {
      return requestError(error)
    }
  },

  async resend(email: string): Promise<unknown> {
    try {
      const response = await onboardingClient.post('/tenant-onboarding/resend', { email })
      return response.data
    } catch (error) {
      return requestError(error)
    }
  },
}
