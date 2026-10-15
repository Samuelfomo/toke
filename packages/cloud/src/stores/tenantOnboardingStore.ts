import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {
    tenantOnboardingService,
    TenantOnboardingError,
    type OnboardingGuid,
    type OnboardingPaymentMethod,
    type OnboardingStatusView,
} from '@/service/TenantOnboardingService'

const TOKEN_KEY = 'toke:onboarding-token'

const messageFromError = (error: unknown) =>
    error instanceof Error ? error.message : 'Une erreur inattendue est survenue.'

export const useTenantOnboardingStore = defineStore('tenantOnboarding', () => {
    const token = ref<string | null>(null)
    const status = ref<OnboardingStatusView | null>(null)
    const paymentMethods = ref<OnboardingPaymentMethod[]>([])

    const loadingStatus = ref(false)
    const loadingPaymentMethods = ref(false)
    const subscribing = ref(false)
    const resending = ref(false)

    const error = ref<string | null>(null)
    const tokenInvalidOrExpired = ref(false)
    const resendSuccess = ref(false)

    const hasToken = computed(() => Boolean(token.value))

    function bootstrapTokenFromFragment() {
        const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
        const params = new URLSearchParams(fragment)
        const fragmentToken = params.get('token')?.trim()

        if (fragmentToken) {
            token.value = fragmentToken
            sessionStorage.setItem(TOKEN_KEY, fragmentToken)

            // Le fragment n'est pas envoyé au serveur. Après capture, on le retire aussi de l'URL
            // pour éviter de le laisser visible/copier accidentellement dans la barre d'adresse.
            window.history.replaceState(window.history.state, document.title, `${window.location.pathname}${window.location.search}`)
            return
        }

        token.value = sessionStorage.getItem(TOKEN_KEY)
    }

    function clearToken() {
        token.value = null
        sessionStorage.removeItem(TOKEN_KEY)
    }

    function handleProtectedError(cause: unknown) {
        error.value = messageFromError(cause)
        if (cause instanceof TenantOnboardingError && (cause.status === 401 || cause.status === 403 || cause.status === 410)) {
            tokenInvalidOrExpired.value = true
            clearToken()
        }
    }

    async function loadStatus() {
        if (!token.value) {
            tokenInvalidOrExpired.value = true
            error.value = 'Le lien d’activation est absent ou n’est plus disponible.'
            return
        }

        loadingStatus.value = true
        error.value = null
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

        loadingPaymentMethods.value = true
        error.value = null

        try {
            paymentMethods.value = await tenantOnboardingService.getPaymentMethods(token.value)
        } catch (cause) {
            handleProtectedError(cause)
        } finally {
            loadingPaymentMethods.value = false
        }
    }

    async function subscribe(requestedSeats: number, paymentMethodGuid: OnboardingGuid) {
        if (!token.value) return false

        subscribing.value = true
        error.value = null

        try {
            status.value = await tenantOnboardingService.subscribe(token.value, {
                requested_seats: requestedSeats,
                payment_method_guid: paymentMethodGuid,
            })

            // Relecture canonique après mutation : le statut serveur reste l'autorité.
            await loadStatus()
            return true
        } catch (cause) {
            handleProtectedError(cause)
            return false
        } finally {
            subscribing.value = false
        }
    }

    async function resend(email: string) {
        resending.value = true
        resendSuccess.value = false
        error.value = null

        try {
            await tenantOnboardingService.resend(email)
            resendSuccess.value = true
            return true
        } catch (cause) {
            error.value = messageFromError(cause)
            return false
        } finally {
            resending.value = false
        }
    }

    return {
        token,
        status,
        paymentMethods,
        loadingStatus,
        loadingPaymentMethods,
        subscribing,
        resending,
        error,
        tokenInvalidOrExpired,
        resendSuccess,
        hasToken,
        bootstrapTokenFromFragment,
        clearToken,
        loadStatus,
        loadPaymentMethods,
        subscribe,
        resend,
    }
})
