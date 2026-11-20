import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {
    tenantOnboardingService,
    TenantOnboardingError,
    type OnboardingEstimateView,
    type OnboardingGuid,
    type OnboardingPaymentAttemptView,
    type OnboardingPaymentInitiatePayload,
    type OnboardingPaymentMethod,
    type OnboardingStatusView,
} from '@/service/TenantOnboardingService'

const messageFromError = (error: unknown) => error instanceof Error ? error.message : 'Une erreur inattendue est survenue.'

export const useTenantOnboardingStore = defineStore('tenantOnboarding', () => {
    const token = ref<string | null>(null)
    const status = ref<OnboardingStatusView | null>(null)
    const paymentMethods = ref<OnboardingPaymentMethod[]>([])
    const estimate = ref<OnboardingEstimateView | null>(null)
    const loadingStatus = ref(false)
    const loadingPaymentMethods = ref(false)
    const estimating = ref(false)
    const subscribing = ref(false)
    const resending = ref(false)
    const paymentAttempts = ref<OnboardingPaymentAttemptView[]>([])
    const loadingPaymentAttempts = ref(false)
    const initiatingPayment = ref(false)
    const refreshingPaymentAttempt = ref(false)
    const lastPaymentErrorCode = ref<string | null>(null)
    const lastPaymentErrorStatus = ref<number | null>(null)
    const error = ref<string | null>(null)
    const tokenInvalidOrExpired = ref(false)
    const resendSuccess = ref(false)
    let estimateRequestId = 0

    const hasToken = computed(() => Boolean(token.value))

    function bootstrapTokenFromFragment() {
        const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
        const fragmentToken = new URLSearchParams(fragment).get('token')?.trim()
        token.value = fragmentToken || null
        if (fragmentToken) {
            window.history.replaceState(window.history.state, document.title, `${window.location.pathname}${window.location.search}`)
        }
    }

    function clearToken() {
        token.value = null
    }

    function invalidateEstimate() {
        estimateRequestId += 1;
        estimate.value = null
    }

    function handleProtectedError(cause: unknown) {
        error.value = messageFromError(cause)
        if (cause instanceof TenantOnboardingError && cause.status === 401) {
            tokenInvalidOrExpired.value = true
            clearToken()
        }
    }

    async function loadStatus() {
        if (!token.value) {
            tokenInvalidOrExpired.value = true;
            return
        }
        loadingStatus.value = true;
        error.value = null;
        tokenInvalidOrExpired.value = false
        try {
            status.value = await tenantOnboardingService.getStatus(token.value)
        } catch (cause) {
            handleProtectedError(cause)
        } finally {
            loadingStatus.value = false
        }
    }

    async function loadPaymentMethods() {
        if (!token.value) return
        loadingPaymentMethods.value = true;
        error.value = null
        try {
            paymentMethods.value = await tenantOnboardingService.getPaymentMethods(token.value)
        } catch (cause) {
            handleProtectedError(cause)
        } finally {
            loadingPaymentMethods.value = false
        }
    }

    async function loadEstimate(requestedSeats: number, paymentMethodGuid: OnboardingGuid) {
        if (!token.value) return false
        const requestId = ++estimateRequestId
        estimating.value = true;
        error.value = null
        try {
            const result = await tenantOnboardingService.estimate(token.value, {
                requested_seats: requestedSeats,
                payment_method_guid: paymentMethodGuid
            })
            if (requestId === estimateRequestId) estimate.value = result
            return requestId === estimateRequestId
        } catch (cause) {
            if (requestId === estimateRequestId) {
                estimate.value = null;
                handleProtectedError(cause)
            }
            return false
        } finally {
            if (requestId === estimateRequestId) estimating.value = false
        }
    }

    async function subscribe(requestedSeats: number, paymentMethodGuid: OnboardingGuid) {
        if (!token.value) return false
        subscribing.value = true;
        error.value = null
        try {
            status.value = await tenantOnboardingService.subscribe(token.value, {
                requested_seats: requestedSeats,
                payment_method_guid: paymentMethodGuid
            })
            estimate.value = null
            await loadStatus()
            return true
        } catch (cause) {
            handleProtectedError(cause)
            // Une réponse perdue ne doit jamais conduire à recréer aveuglément la licence.
            await loadStatus()
            return false
        } finally {
            subscribing.value = false
        }
    }


    async function loadPaymentAttempts(paymentTransactionGuid: OnboardingGuid) {
        if (!token.value) return false
        loadingPaymentAttempts.value = true;
        error.value = null
        try {
            const result = await tenantOnboardingService.getPaymentAttempts(token.value, paymentTransactionGuid)
            paymentAttempts.value = result.attempts
            return true
        } catch (cause) {
            handleProtectedError(cause)
            return false
        } finally {
            loadingPaymentAttempts.value = false
        }
    }

    async function initiatePayment(payload: OnboardingPaymentInitiatePayload) {
        if (!token.value) return null
        initiatingPayment.value = true;
        error.value = null;
        lastPaymentErrorCode.value = null;
        lastPaymentErrorStatus.value = null
        try {
            const attempt = await tenantOnboardingService.initiatePayment(token.value, payload)
            const index = paymentAttempts.value.findIndex((item) => String(item.guid) === String(attempt.guid))
            if (index >= 0) paymentAttempts.value[index] = attempt
            else paymentAttempts.value.unshift(attempt)
            return attempt
        } catch (cause) {
            if (cause instanceof TenantOnboardingError) {
                lastPaymentErrorCode.value = cause.code
                lastPaymentErrorStatus.value = cause.status ?? null
            }
            handleProtectedError(cause)
            return null
        } finally {
            initiatingPayment.value = false
        }
    }

    async function refreshPaymentAttempt(attemptGuid: OnboardingGuid) {
        if (!token.value) return null
        refreshingPaymentAttempt.value = true;
        error.value = null
        try {
            const attempt = await tenantOnboardingService.refreshPaymentAttempt(token.value, attemptGuid)
            const index = paymentAttempts.value.findIndex((item) => String(item.guid) === String(attempt.guid))
            if (index >= 0) paymentAttempts.value[index] = attempt
            else paymentAttempts.value.unshift(attempt)
            return attempt
        } catch (cause) {
            handleProtectedError(cause)
            return null
        } finally {
            refreshingPaymentAttempt.value = false
        }
    }

    function clearPaymentAttempts() {
        paymentAttempts.value = []
    }

    async function resend(email: string) {
        resending.value = true;
        resendSuccess.value = false;
        error.value = null
        try {
            await tenantOnboardingService.resend(email);
            resendSuccess.value = true;
            return true
        } catch (cause) {
            error.value = messageFromError(cause);
            return false
        } finally {
            resending.value = false
        }
    }

    return {
        token, status, paymentMethods, estimate,
        loadingStatus, loadingPaymentMethods, estimating, subscribing, resending,
        paymentAttempts, loadingPaymentAttempts, initiatingPayment, refreshingPaymentAttempt,
        lastPaymentErrorCode, lastPaymentErrorStatus,
        error, tokenInvalidOrExpired, resendSuccess, hasToken,
        bootstrapTokenFromFragment, clearToken, invalidateEstimate,
        loadStatus, loadPaymentMethods, loadEstimate, subscribe,
        loadPaymentAttempts, initiatePayment, refreshPaymentAttempt, clearPaymentAttempts, resend,
    }
})
