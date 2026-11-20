<template>
  <AuthForm
    ref="authFormRef"
    page-title="Vérification OTP - Toké"
    welcome-message="Vérification de votre identité"
    welcome-subtitle="Saisissez le code à 6 chiffres envoyé à votre adresse email."
    submit-button-text="Vérifier le code"
    loading-text="Vérification…"
    success-text="Code vérifié"
    :default-fields="[]"
    :validation="validateOtp"
    :submit-handler="handleOtpVerification"
    :back-link="{ url: '/auth', text: 'Retour à la connexion' }"
  >
    <template #fields="{ updateField }">
      <div>
        <div class="mb-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          <span class="min-w-0 truncate">
            Code envoyé à <strong class="font-semibold text-slate-800">{{ maskedEmail }}</strong>
          </span>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 font-semibold tabular-nums"
            :class="timeRemaining <= 60 ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'"
          >
            {{ formattedTime }}
          </span>
        </div>

        <div class="grid grid-cols-6 gap-1.5 sm:gap-2" aria-label="Code de vérification à 6 chiffres">
          <input
            v-for="(_, index) in otpDigits"
            :key="index"
            :ref="(el) => setInputRef(el as HTMLInputElement | null, index)"
            v-model="otpDigits[index]"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="1"
            autocomplete="one-time-code"
            :aria-label="`Chiffre ${index + 1} du code`"
            class="aspect-square min-w-0 rounded-xl border bg-white text-center text-lg font-bold tabular-nums text-slate-900 outline-none transition focus:ring-4 sm:text-xl"
            :class="hasError
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
              : isVerified
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700 focus:ring-emerald-100'
                : otpDigits[index]
                  ? 'border-blue-400 bg-blue-50/50 text-blue-700 focus:border-blue-500 focus:ring-blue-100'
                  : 'border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-blue-100'"
            @input="(event) => handleInput(index, event, updateField)"
            @keydown="(event) => handleKeydown(index, event, updateField)"
            @paste="(event) => handlePaste(event, updateField)"
            @focus="handleFocus(index)"
          />
        </div>

        <div v-if="errorMessage" class="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-left text-xs leading-5 text-rose-700" role="alert">
          <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 17h.01" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <div v-if="successMessage" class="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-xs leading-5 text-emerald-700" role="status">
          <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="m8.5 12 2.25 2.25L15.5 9.5" />
          </svg>
          <span>{{ successMessage }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="mt-7 border-t border-slate-100 pt-5 text-center">
        <p class="text-sm text-slate-600">
          Vous n'avez pas reçu le code ?
        </p>

        <button
          type="button"
          :disabled="resendCooldown > 0 || isResending"
          class="mt-2 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:text-slate-400"
          @click="handleResendOtp"
        >
          <svg v-if="isResending" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" />
            <path class="opacity-90" fill="currentColor" d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3Z" />
          </svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M20 11a8 8 0 1 0-2.34 5.66" />
            <path d="M20 4v7h-7" />
          </svg>

          <span v-if="isResending">Envoi en cours…</span>
          <span v-else-if="resendCooldown > 0">Renvoyer dans {{ resendCooldown }}s</span>
          <span v-else>Renvoyer le code</span>
        </button>

        <p class="mt-4 text-[11px] text-slate-400">Copyright Imediatis 2025</p>
      </div>
    </template>
  </AuthForm>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AuthForm from './components/auth/authForm.vue'
import otpCtrl from '../ctrl/otpCtrl'
import AuthService from '@/service/AuthService'

const router = useRouter()
const route = useRoute()
const authFormRef = ref<any>(null)

const otpDigits = ref(['', '', '', '', '', ''])
const inputRefs = ref<(HTMLInputElement | null)[]>([])
const hasError = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isVerified = ref(false)
const isResending = ref(false)
const email = ref('')

const OTP_VALIDITY_DURATION = 5 * 60
const RESEND_COOLDOWN_SECONDS = 60
const MAX_ATTEMPTS = 5

const timeRemaining = ref(OTP_VALIDITY_DURATION)
const resendCooldown = ref(0)
const failedAttempts = ref(0)

let otpTimer: number | null = null
let resendTimer: number | null = null

const otpCode = computed(() => otpDigits.value.join(''))
const isOtpComplete = computed(() => /^\d{6}$/.test(otpCode.value))
const formattedTime = computed(() => {
  const minutes = Math.floor(timeRemaining.value / 60)
  const seconds = timeRemaining.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const maskedEmail = computed(() => {
  const value = email.value.trim()
  const [name, domain] = value.split('@')
  if (!name || !domain) return value || 'votre adresse email'
  const visible = name.slice(0, Math.min(2, name.length))
  return `${visible}${'*'.repeat(Math.max(2, name.length - visible.length))}@${domain}`
})

function validateOtp(): boolean {
  return isOtpComplete.value && timeRemaining.value > 0 && !hasError.value
}

function setInputRef(el: HTMLInputElement | null, index: number): void {
  if (el) inputRefs.value[index] = el
}

function stopOtpTimer(): void {
  if (otpTimer !== null) {
    window.clearInterval(otpTimer)
    otpTimer = null
  }
}

function startOtpTimer(): void {
  stopOtpTimer()
  timeRemaining.value = OTP_VALIDITY_DURATION

  otpTimer = window.setInterval(() => {
    timeRemaining.value = Math.max(0, timeRemaining.value - 1)

    if (timeRemaining.value === 0) {
      stopOtpTimer()
      hasError.value = true
      errorMessage.value = 'Le code a expiré. Demandez un nouveau code pour continuer.'
      authFormRef.value?.setGlobalError(errorMessage.value)
    }
  }, 1000)
}

function stopResendCooldown(): void {
  if (resendTimer !== null) {
    window.clearInterval(resendTimer)
    resendTimer = null
  }
}

function startResendCooldown(): void {
  stopResendCooldown()
  resendCooldown.value = RESEND_COOLDOWN_SECONDS

  resendTimer = window.setInterval(() => {
    resendCooldown.value = Math.max(0, resendCooldown.value - 1)
    if (resendCooldown.value === 0) stopResendCooldown()
  }, 1000)
}

function clearInlineMessages(): void {
  if (timeRemaining.value <= 0) return
  hasError.value = false
  errorMessage.value = ''
  successMessage.value = ''
}

function syncOtp(updateField: Function): void {
  updateField('otp', otpCode.value)
}

function handleFocus(index: number): void {
  void nextTick(() => inputRefs.value[index]?.select())
  clearInlineMessages()
}

async function handleInput(index: number, event: Event, updateField: Function): Promise<void> {
  const target = event.target as HTMLInputElement
  const numeric = target.value.replace(/\D/g, '').slice(-1)

  otpDigits.value[index] = numeric
  target.value = numeric
  syncOtp(updateField)
  clearInlineMessages()

  if (numeric && index < otpDigits.value.length - 1) {
    await nextTick()
    inputRefs.value[index + 1]?.focus()
  }
}

async function handleKeydown(index: number, event: KeyboardEvent, updateField: Function): Promise<void> {
  if (event.key === 'Backspace') {
    event.preventDefault()

    if (otpDigits.value[index]) {
      otpDigits.value[index] = ''
    } else if (index > 0) {
      otpDigits.value[index - 1] = ''
      await nextTick()
      inputRefs.value[index - 1]?.focus()
    }

    syncOtp(updateField)
    clearInlineMessages()
    return
  }

  if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault()
    inputRefs.value[index - 1]?.focus()
  }

  if (event.key === 'ArrowRight' && index < otpDigits.value.length - 1) {
    event.preventDefault()
    inputRefs.value[index + 1]?.focus()
  }
}

async function handlePaste(event: ClipboardEvent, updateField: Function): Promise<void> {
  event.preventDefault()
  const pastedData = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6)

  if (!pastedData) {
    hasError.value = true
    errorMessage.value = 'Aucun chiffre valide n’a été détecté dans le contenu collé.'
    return
  }

  for (let index = 0; index < 6; index += 1) {
    otpDigits.value[index] = pastedData[index] || ''
  }

  syncOtp(updateField)
  clearInlineMessages()

  await nextTick()
  inputRefs.value[Math.min(pastedData.length, 6) - 1]?.focus()
}

async function handleOtpVerification(): Promise<void> {
  if (timeRemaining.value <= 0) {
    const message = 'Le code a expiré. Demandez un nouveau code.'
    hasError.value = true
    errorMessage.value = message
    authFormRef.value?.setGlobalError(message)
    throw new Error(message)
  }

  if (!isOtpComplete.value) {
    const message = 'Saisissez les 6 chiffres du code de vérification.'
    hasError.value = true
    errorMessage.value = message
    authFormRef.value?.setGlobalError(message)
    throw new Error(message)
  }

  try {
    const result = await otpCtrl.verifyOtp(otpCode.value)

    if (!result.success) {
      failedAttempts.value += 1
      hasError.value = true
      isVerified.value = false

      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - failedAttempts.value)
      let message = result.message || 'Code incorrect. Veuillez réessayer.'

      if (attemptsLeft > 0 && attemptsLeft <= 2) {
        message += ` (${attemptsLeft} tentative${attemptsLeft > 1 ? 's' : ''} restante${attemptsLeft > 1 ? 's' : ''})`
      }

      if (failedAttempts.value >= MAX_ATTEMPTS) {
        message = 'Trop de tentatives échouées. Demandez un nouveau code avant de réessayer.'
      }

      errorMessage.value = message
      authFormRef.value?.setGlobalError(message)
      otpDigits.value = ['', '', '', '', '', '']
      await nextTick()
      inputRefs.value[0]?.focus()
      throw new Error(message)
    }

    isVerified.value = true
    hasError.value = false
    errorMessage.value = ''
    successMessage.value = result.message || 'Code vérifié avec succès.'
    failedAttempts.value = 0
    stopOtpTimer()

    authFormRef.value?.setGlobalSuccess(successMessage.value)

    window.setTimeout(() => {
      void router.push('/dashboard')
    }, 900)
  } catch (error: any) {
    if (!errorMessage.value) {
      const message = 'Impossible de vérifier le code pour le moment. Vérifiez votre connexion et réessayez.'
      hasError.value = true
      errorMessage.value = message
      authFormRef.value?.setGlobalError(message)
    }
    throw error
  }
}

async function handleResendOtp(): Promise<void> {
  if (resendCooldown.value > 0 || isResending.value) return

  if (!email.value) {
    const message = 'Adresse email introuvable. Revenez à la connexion pour demander un nouveau code.'
    hasError.value = true
    errorMessage.value = message
    authFormRef.value?.setGlobalError(message)
    return
  }

  try {
    isResending.value = true
    clearInlineMessages()

    const response = await AuthService.retry(email.value)

    if (!response.success) {
      const message = response.message || 'Impossible de renvoyer le code.'
      hasError.value = true
      errorMessage.value = message
      authFormRef.value?.setGlobalError(message)
      return
    }

    otpDigits.value = ['', '', '', '', '', '']
    failedAttempts.value = 0
    hasError.value = false
    errorMessage.value = ''
    isVerified.value = false
    successMessage.value = 'Un nouveau code vient d’être envoyé.'
    authFormRef.value?.setGlobalSuccess(successMessage.value)

    startOtpTimer()
    startResendCooldown()

    await nextTick()
    inputRefs.value[0]?.focus()
  } catch (error) {
    console.error('Erreur lors du renvoi de l’OTP:', error)
    const message = 'Impossible de renvoyer le code. Vérifiez votre connexion et réessayez.'
    hasError.value = true
    errorMessage.value = message
    authFormRef.value?.setGlobalError(message)
  } finally {
    isResending.value = false
  }
}

onMounted(() => {
  email.value = String(route.query.email || '')
  startOtpTimer()
  void nextTick(() => inputRefs.value[0]?.focus())
})

onUnmounted(() => {
  stopOtpTimer()
  stopResendCooldown()
})
</script>
