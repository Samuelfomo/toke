import { apiRequest } from '@/tools/Fetch.Client'

export type BillingMode = 'PREPAID' | 'POSTPAID' | string
export type LicenseStatus = 'PENDING_PAYMENT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | string

export interface LicenseAccessDecision {
  allowed: boolean
  basis?: string | null
  access_until?: string | null
}

export interface LicensePaymentSummary {
  payment_transaction_guid?: string | number
  billing_cycle_guid?: string | number
  period_start?: string | null
  period_end?: string | null
  payment_due_date?: string | null
  transaction_status?: string | null
  billing_status?: string | null
  currency_code?: string | null
  invoice_amount_local?: string | number | null
  received_local?: string | number | null
  amount_to_pay_local?: string | number | null
  payment_method?: unknown
  payment_reference?: string | null
  can_confirm_cash?: boolean
}

export interface TenantLicenseStatusItem {
  license_guid: string | number
  license_type?: string | null
  license_status: LicenseStatus
  billing_mode?: BillingMode | null
  current_period_start?: string | null
  current_period_end?: string | null
  next_renewal_date?: string | null
  minimum_seats?: number | null
  paid_seats?: number | null
  total_seats_purchased?: number | null
  access?: LicenseAccessDecision | null
  payments?: LicensePaymentSummary[]
}

export interface TenantLicenseStatusData {
  tenant_guid: string | number
  name?: string | null
  tenant_status?: string | boolean | null
  licenses: TenantLicenseStatusItem[]
}

export interface TenantLicenseStatusResponse {
  success: boolean
  data: TenantLicenseStatusData
}

export interface EmployeeGlobalLicenseSummary {
  guid?: string | number
  license_type?: string | null
  billing_cycle_months?: number | null
  minimum_seats?: number | null
  current_period_start?: string | null
  current_period_end?: string | null
  next_renewal_date?: string | null
  total_seats_purchased?: number | null
  license_status?: LicenseStatus | null
  tenant?: string | number | null
}

export interface EmployeeLicenseData {
  guid: string | number
  employee: string
  employee_code?: string | null
  activation_date?: string | null
  deactivation_date?: string | null
  last_activity_date?: string | null
  contractual_status?: string | null
  declared_long_leave?: boolean | null
  long_leave_declared_by?: string | null
  long_leave_declared_at?: string | null
  long_leave_type?: string | null
  long_leave_reason?: string | null
  computed_billing_status?: string | null
  grace_period_start?: string | null
  grace_period_end?: string | null
  global_license?: EmployeeGlobalLicenseSummary | string | number | null
}

export interface EmployeeLicenseResponse {
  success: boolean
  data: EmployeeLicenseData
}

export interface EmployeeLicenseListData {
  items: EmployeeLicenseData[]
  pagination?: { offset?: number; limit?: number; count?: number }
  count?: number
}

export interface EmployeeLicenseListResponse {
  success: boolean
  data: EmployeeLicenseListData
}


export interface RenewalPreviewData {
  license_guid?: string | number
  billing_mode?: BillingMode | null
  current_period_start?: string | null
  current_period_end?: string | null
  next_period_start?: string | null
  next_period_end?: string | null
  next_renewal_date?: string | null
  seat_count?: number | null
  quantity?: number | null
  currency_code?: string | null
  subtotal_local?: string | number | null
  tax_amount_local?: string | number | null
  total_amount_local?: string | number | null
  amount_to_pay_local?: string | number | null
  can_prepare?: boolean | null
  reason?: string | null
  [key: string]: unknown
}

export interface RenewalPreviewResponse {
  success: boolean
  data: RenewalPreviewData
}

export interface RenewalPreparePayload {
  payment_method_guid: string | number
  idempotency_key: string
}

export interface RenewalPrepareResponse {
  success: boolean
  data?: Record<string, unknown>
  message?: string
}

export interface PaymentMethodData {
  guid: string | number
  code?: string | null
  name?: string | null
  method_type?: string | null
  supported_currencies?: string[] | string | null
  active?: boolean | null
  processing_fee_rate?: string | number | null
  min_amount_usd?: string | number | null
  max_amount_usd?: string | number | null
}

export interface ActivePaymentMethodsResponse {
  success: boolean
  data?: {
    payment_methods?: {
      active_status?: boolean
      pagination?: { offset?: number; limit?: number; count?: number }
      items?: PaymentMethodData[]
    }
  }
}

export default class LicenseService {
  /**
   * Vue customer de l'état licence du tenant.
   *
   * IMPORTANT : ce endpoint doit être projeté/scopé côté BFF selon l'utilisateur authentifié.
   * Le frontend ne doit jamais être utilisé comme frontière de sécurité pour masquer
   * des paiements ou licences auxquels l'utilisateur n'a pas droit.
   */
  static async getTenantLicenseStatus(
    tenantGuid: string | number,
  ): Promise<TenantLicenseStatusResponse> {
    return apiRequest<TenantLicenseStatusResponse>({
      path: `/tenant/${encodeURIComponent(String(tenantGuid))}/license-status`,
      method: 'GET',
    })
  }

  /**
   * Licence individuelle d'un collaborateur.
   *
   * Le frontend n'affiche volontairement que les informations personnelles utiles.
   * Le BFF/API doit vérifier que l'utilisateur authentifié a le droit de consulter
   * l'employeeGuid demandé et ne doit pas s'appuyer sur le masquage Vue comme sécurité.
   */
  static async getEmployeeLicense(
    employeeGuid: string | number,
  ): Promise<EmployeeLicenseResponse> {
    return apiRequest<EmployeeLicenseResponse>({
      path: `/employee-license/employee/${encodeURIComponent(String(employeeGuid))}`,
      method: 'GET',
    })
  }

  /**
   * Licences individuelles rattachées à une licence globale.
   * Réservé au parcours organisation RH/Admin côté customer/BFF.
   * Le backend doit vérifier que la licence globale appartient bien au tenant
   * authentifié et que l'acteur possède le droit organisationnel requis.
   */
  static async getOrganizationEmployeeLicenses(
    globalLicenseGuid: string | number,
    offset = 0,
    limit = 50,
  ): Promise<EmployeeLicenseListResponse> {
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    })

    return apiRequest<EmployeeLicenseListResponse>({
      path: `/employee-license/global/${encodeURIComponent(String(globalLicenseGuid))}?${params.toString()}`,
      method: 'GET',
    })
  }

  /** Aperçu serveur du renouvellement PREPAID. Aucun droit n'est accordé par cette lecture. */
  static async getRenewalPreview(
    licenseGuid: string | number,
  ): Promise<RenewalPreviewResponse> {
    return apiRequest<RenewalPreviewResponse>({
      path: `/license-renewals/${encodeURIComponent(String(licenseGuid))}/preview`,
      method: 'GET',
    })
  }

  /**
   * Prépare un renouvellement PREPAID.
   * L'acteur doit être déduit de la session côté BFF/API et n'est donc pas envoyé
   * librement par le navigateur. La préparation ne vaut pas confirmation de paiement.
   */
  static async prepareRenewal(
    licenseGuid: string | number,
    payload: RenewalPreparePayload,
  ): Promise<RenewalPrepareResponse> {
    return apiRequest<RenewalPrepareResponse>({
      path: `/license-renewals/${encodeURIComponent(String(licenseGuid))}/prepare`,
      method: 'POST',
      data: payload,
    })
  }

  /** Moyens de paiement actifs. Le frontend filtre ensuite par devise annoncée par le tenant. */
  static async getActivePaymentMethods(): Promise<ActivePaymentMethodsResponse> {
    return apiRequest<ActivePaymentMethodsResponse>({
      path: '/payment-method/active/true',
      method: 'GET',
    })
  }

}
