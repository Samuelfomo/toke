import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import LicenseService, {
  type EmployeeLicenseData,
  type PaymentMethodData,
  type RenewalPreviewData,
  type TenantLicenseStatusData,
  type TenantLicenseStatusItem,
} from '@/service/LicenseService'
import { ApiClientError } from '@/tools/Fetch.Client'

export const useLicenseStore = defineStore('license', () => {
  const status = ref<TenantLicenseStatusData | null>(null)
  const myLicense = ref<EmployeeLicenseData | null>(null)
  const organizationLicenses = ref<EmployeeLicenseData[]>([])
  const organizationLicenseCount = ref(0)
  const renewalPreview = ref<RenewalPreviewData | null>(null)
  const paymentMethods = ref<PaymentMethodData[]>([])
  const renewalPrepareResult = ref<Record<string, unknown> | null>(null)

  const loading = ref(false)
  const myLicenseLoading = ref(false)
  const organizationLicensesLoading = ref(false)
  const renewalPreviewLoading = ref(false)
  const paymentMethodsLoading = ref(false)
  const renewalPrepareLoading = ref(false)

  const error = ref<string | null>(null)
  const errorCode = ref<string | null>(null)
  const myLicenseError = ref<string | null>(null)
  const myLicenseErrorCode = ref<string | null>(null)
  const organizationLicensesError = ref<string | null>(null)
  const organizationLicensesErrorCode = ref<string | null>(null)
  const renewalError = ref<string | null>(null)
  const renewalErrorCode = ref<string | null>(null)
  const renewalPrepareError = ref<string | null>(null)

  const loadedTenantGuid = ref<string | number | null>(null)
  const loadedEmployeeGuid = ref<string | number | null>(null)
  const loadedOrganizationLicenseGuid = ref<string | number | null>(null)
  const organizationOffset = ref(0)
  const organizationLimit = ref(50)
  const loadedRenewalLicenseGuid = ref<string | number | null>(null)

  const licenses = computed(() => status.value?.licenses ?? [])
  const primaryLicense = computed<TenantLicenseStatusItem | null>(() => licenses.value[0] ?? null)
  const accessAllowed = computed(() => primaryLicense.value?.access?.allowed === true)

  async function loadTenantLicenseStatus(tenantGuid: string | number, force = false) {
    if (!force && loadedTenantGuid.value === tenantGuid && status.value) return status.value

    loading.value = true
    error.value = null
    errorCode.value = null

    try {
      const response = await LicenseService.getTenantLicenseStatus(tenantGuid)
      status.value = response?.data ?? null
      loadedTenantGuid.value = tenantGuid
      return status.value
    } catch (cause) {
      status.value = null
      loadedTenantGuid.value = null
      if (cause instanceof ApiClientError) {
        error.value = cause.message
        errorCode.value = cause.code
      } else {
        error.value = cause instanceof Error ? cause.message : 'Impossible de charger l’état de la licence.'
        errorCode.value = 'request_failed'
      }
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function loadMyLicense(employeeGuid: string | number, force = false) {
    if (!force && loadedEmployeeGuid.value === employeeGuid && myLicense.value) return myLicense.value

    myLicenseLoading.value = true
    myLicenseError.value = null
    myLicenseErrorCode.value = null

    try {
      const response = await LicenseService.getEmployeeLicense(employeeGuid)
      myLicense.value = response?.data ?? null
      loadedEmployeeGuid.value = employeeGuid
      return myLicense.value
    } catch (cause) {
      myLicense.value = null
      loadedEmployeeGuid.value = null
      if (cause instanceof ApiClientError) {
        myLicenseError.value = cause.message
        myLicenseErrorCode.value = cause.code
      } else {
        myLicenseError.value = cause instanceof Error ? cause.message : 'Impossible de charger votre licence individuelle.'
        myLicenseErrorCode.value = 'request_failed'
      }
      throw cause
    } finally {
      myLicenseLoading.value = false
    }
  }

  async function loadOrganizationLicenses(
    globalLicenseGuid: string | number,
    options: { offset?: number; limit?: number; force?: boolean } = {},
  ) {
    const offset = options.offset ?? organizationOffset.value
    const limit = options.limit ?? organizationLimit.value
    const force = options.force ?? false

    if (!force
      && loadedOrganizationLicenseGuid.value === globalLicenseGuid
      && organizationOffset.value === offset
      && organizationLimit.value === limit
      && organizationLicenses.value.length > 0) {
      return organizationLicenses.value
    }

    organizationLicensesLoading.value = true
    organizationLicensesError.value = null
    organizationLicensesErrorCode.value = null
    renewalError.value = null
    renewalErrorCode.value = null
    renewalPrepareError.value = null

    try {
      const response = await LicenseService.getOrganizationEmployeeLicenses(globalLicenseGuid, offset, limit)
      organizationLicenses.value = response?.data?.items ?? []
      organizationLicenseCount.value = response?.data?.count
        ?? response?.data?.pagination?.count
        ?? organizationLicenses.value.length
      loadedOrganizationLicenseGuid.value = globalLicenseGuid
      organizationOffset.value = offset
      organizationLimit.value = limit
      return organizationLicenses.value
    } catch (cause) {
      organizationLicenses.value = []
      organizationLicenseCount.value = 0
      loadedOrganizationLicenseGuid.value = null
      if (cause instanceof ApiClientError) {
        organizationLicensesError.value = cause.message
        organizationLicensesErrorCode.value = cause.code
      } else {
        organizationLicensesError.value = cause instanceof Error
          ? cause.message
          : 'Impossible de charger les licences de l’organisation.'
        organizationLicensesErrorCode.value = 'request_failed'
      }
      throw cause
    } finally {
      organizationLicensesLoading.value = false
    }
  }

  async function loadRenewalPreview(licenseGuid: string | number, force = false) {
    if (!force && loadedRenewalLicenseGuid.value === licenseGuid && renewalPreview.value) {
      return renewalPreview.value
    }

    renewalPreviewLoading.value = true
    renewalError.value = null
    renewalErrorCode.value = null

    try {
      const response = await LicenseService.getRenewalPreview(licenseGuid)
      renewalPreview.value = response?.data ?? null
      loadedRenewalLicenseGuid.value = licenseGuid
      return renewalPreview.value
    } catch (cause) {
      renewalPreview.value = null
      loadedRenewalLicenseGuid.value = null
      if (cause instanceof ApiClientError) {
        renewalError.value = cause.message
        renewalErrorCode.value = cause.code
      } else {
        renewalError.value = cause instanceof Error ? cause.message : 'Impossible de charger l’aperçu du renouvellement.'
        renewalErrorCode.value = 'request_failed'
      }
      throw cause
    } finally {
      renewalPreviewLoading.value = false
    }
  }

  async function loadPaymentMethods(force = false) {
    if (!force && paymentMethods.value.length > 0) return paymentMethods.value
    paymentMethodsLoading.value = true
    renewalError.value = null
    try {
      const response = await LicenseService.getActivePaymentMethods()
      paymentMethods.value = response?.data?.payment_methods?.items ?? []
      return paymentMethods.value
    } catch (cause) {
      if (cause instanceof ApiClientError) {
        renewalError.value = cause.message
        renewalErrorCode.value = cause.code
      } else {
        renewalError.value = cause instanceof Error ? cause.message : 'Impossible de charger les moyens de paiement.'
        renewalErrorCode.value = 'request_failed'
      }
      throw cause
    } finally {
      paymentMethodsLoading.value = false
    }
  }

  async function prepareRenewal(licenseGuid: string | number, paymentMethodGuid: string | number) {
    renewalPrepareLoading.value = true
    renewalPrepareError.value = null
    renewalPrepareResult.value = null

    try {
      const idempotencyKey = `renewal-${String(licenseGuid)}-${Date.now()}`
      const response = await LicenseService.prepareRenewal(licenseGuid, {
        payment_method_guid: paymentMethodGuid,
        idempotency_key: idempotencyKey,
      })
      renewalPrepareResult.value = response?.data ?? {}
      return response
    } catch (cause) {
      renewalPrepareError.value = cause instanceof ApiClientError
        ? cause.message
        : cause instanceof Error
          ? cause.message
          : 'Impossible de préparer le renouvellement.'
      throw cause
    } finally {
      renewalPrepareLoading.value = false
    }
  }

  function clear() {
    status.value = null
    myLicense.value = null
    organizationLicenses.value = []
    organizationLicenseCount.value = 0
    renewalPreview.value = null
    paymentMethods.value = []
    renewalPrepareResult.value = null

    loading.value = false
    myLicenseLoading.value = false
    organizationLicensesLoading.value = false
    renewalPreviewLoading.value = false
    paymentMethodsLoading.value = false
    renewalPrepareLoading.value = false

    error.value = null
    errorCode.value = null
    myLicenseError.value = null
    myLicenseErrorCode.value = null
    organizationLicensesError.value = null
    organizationLicensesErrorCode.value = null
    renewalError.value = null
    renewalErrorCode.value = null
    renewalPrepareError.value = null

    loadedTenantGuid.value = null
    loadedEmployeeGuid.value = null
    loadedOrganizationLicenseGuid.value = null
    organizationOffset.value = 0
    organizationLimit.value = 50
    loadedRenewalLicenseGuid.value = null
  }

  return {
    status,
    myLicense,
    organizationLicenses,
    organizationLicenseCount,
    loading,
    myLicenseLoading,
    organizationLicensesLoading,
    error,
    errorCode,
    myLicenseError,
    myLicenseErrorCode,
    organizationLicensesError,
    organizationLicensesErrorCode,
    renewalPreview,
    paymentMethods,
    renewalPrepareResult,
    renewalPreviewLoading,
    paymentMethodsLoading,
    renewalPrepareLoading,
    renewalError,
    renewalErrorCode,
    renewalPrepareError,
    licenses,
    primaryLicense,
    accessAllowed,
    loadTenantLicenseStatus,
    loadMyLicense,
    loadOrganizationLicenses,
    loadRenewalPreview,
    loadPaymentMethods,
    prepareRenewal,
    clear,
  }
})
