<template>
  <AuthForm
    ref="authFormRef"
    page-title="Vérification OTP - Toké"
    :css-file="authCss"
    welcome-message=""
    welcome-subtitle="Saisir le code de vérification envoyé à votre adresse email"
    submit-button-text="Vérifier"
    loading-text="Vérification..."
    :default-fields="[]"
    :validation="validateOtp"
    :back-link="{ url: '/', text: 'Reessayer' }"
    @submit="handleOtpVerification"
  >
    <!-- Champs OTP personnalisés -->
    <template #fields="{ formData, updateField }">
      <div class="otp-container">
        <div class="otp-inputs">
          <input
            v-for="(digit, index) in otpDigits"
            :key="index"
            :ref="(el) => setInputRef(el as HTMLInputElement | null, index)"
            v-model="otpDigits[index]"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="1"
            class="otp-input"
            placeholder="•"
            :class="{
    filled: !!otpDigits[index],
    error: hasError,
    success: isVerified
  }"
            @input="(e) => handleInput(index, e, updateField)"
            @keydown="(e) => handleKeydown(index, e)"
            @paste="(e) => handlePaste(e, updateField)"
            @focus="() => handleFocus(index)"
            autocomplete="one-time-code"
          />
        </div>

        <!-- Message d'erreur -->
        <transition name="fade">
          <div v-if="errorMessage" class="error-message">
            <span class="error-icon">⚠️</span>
            <span>{{ errorMessage }}</span>
          </div>
        </transition>

        <!-- Message de succès -->
        <transition name="fade">
          <div v-if="successMessage" class="success-message">
            <span class="success-icon"></span>
            <span>{{ successMessage }}</span>
          </div>
        </transition>
      </div>
    </template>

    <template #footer>
      <div class="otp-footer">
        <p class="request-again">
          Vous n'avez pas reçu de code ?
          <button
            @click="handleResendOtp"
            :disabled="resendCooldown > 0 || isResending"
            class="request-link"
            :class="{ 'disabled': resendCooldown > 0 || isResending }"
            type="button"
          >
            <span v-if="isResending">⏳ Envoi en cours...</span>
            <span v-else-if="resendCooldown > 0">⏳ Renvoyer ({{ resendCooldown }}s)</span>
            <span v-else>Renvoyer le code</span>
          </button>
        </p>
        <small class="text-black-50 text-center font-primary lead-0-75">
          Copyright Imediatis 2025
        </small>
      </div>
    </template>

  </AuthForm>

</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue'
import otpCss from '../assets/css/toke-otp-02.css?url'
import authCss from '../assets/css/toke-auth-01.css?url'
import AuthForm from './components/auth/authForm.vue'
import HeadBuilder from './../utils/HeadBuilder'
import { useRouter, useRoute } from 'vue-router'
import otpCtrl from '../ctrl/otpCtrl'
import AuthService from '@/service/AuthService';

const router = useRouter()
const authFormRef = ref<any>(null)
const route = useRoute()

// État des champs OTP
const otpDigits = ref(['', '', '', '', '', ''])
const inputRefs = ref<(HTMLInputElement | null)[]>([])
const hasError = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isVerified = ref(false)
const isResending = ref(false)
const showHelp = ref(false)
const email = ref<string>('')

// Gestion du timer de l'OTP (5 minutes par défaut)
const OTP_VALIDITY_DURATION = 5 * 60 // 5 minutes en secondes
const timeRemaining = ref(OTP_VALIDITY_DURATION)
let otpTimer: number | null = null

// Gestion du cooldown de renvoi (60 secondes)
const RESEND_COOLDOWN = 1000
const resendCooldown = ref(0)
let resendTimer: number | null = null

// Compteur de tentatives échouées
const failedAttempts = ref(0)
const MAX_ATTEMPTS = 5

// Computed
const isOtpComplete = computed(() => otpDigits.value.every(digit => digit !== ''))
const canSubmit = computed(() => isOtpComplete.value && !hasError.value && timeRemaining.value > 0)

// Validation OTP avec messages d'erreur
const validateOtp = () => {
  // Réinitialiser les messages
  errorMessage.value = ''
  successMessage.value = ''
  hasError.value = false

  // Vérifier si le temps n'est pas écoulé
  if (timeRemaining.value <= 0) {
    errorMessage.value = '⏰ Code expiré. Demandez un nouveau code.'
    hasError.value = true
    return false
  }
  return true
}

// Gestion des références d'inputs
const setInputRef = (el: HTMLInputElement | null, index: number) => {
  if (el) {
    inputRefs.value[index] = el
  }
}

const stopOtpTimer = () => {
  if (otpTimer) {
    clearInterval(otpTimer)
    otpTimer = null
  }
}

// Démarrer le cooldown de renvoi
const startResendCooldown = () => {
  stopResendCooldown()
  resendCooldown.value = RESEND_COOLDOWN

  resendTimer = window.setInterval(() => {
    resendCooldown.value--

    if (resendCooldown.value <= 0) {
      stopResendCooldown()
    }
  }, 1000)
}

const stopResendCooldown = () => {
  if (resendTimer) {
    clearInterval(resendTimer)
    resendTimer = null
  }
}

// Focus automatique sur le premier champ
onMounted(() => {
  email.value = route.query.email?.toString() || ''
  HeadBuilder.apply({
    title: 'Vérification OTP - Toké',
    css: [authCss, otpCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })

  nextTick(() => {
    inputRefs.value[0]?.focus()
  })
})

// Nettoyer les timers au démontage
onUnmounted(() => {
  stopOtpTimer()
  stopResendCooldown()
})

// Gestion du focus
const handleFocus = (index: number) => {
  nextTick(() => {
    inputRefs.value[index]?.select()
  })

  // Réinitialiser les messages au focus (sauf si le code est expiré)
  if (hasError.value && timeRemaining.value > 0) {
    hasError.value = false
    errorMessage.value = ''
    successMessage.value = ''
  }
}

// Gestion de la saisie
const handleInput = async (index: number, event: Event, updateField: Function) => {
  const target = event.target as HTMLInputElement
  const value = target.value

  // Ne garder que les chiffres
  if (!/^\d*$/.test(value)) {
    otpDigits.value[index] = ''
    errorMessage.value = '⚠️ Veuillez saisir uniquement des chiffres'
    hasError.value = true
    setTimeout(() => {
      if (errorMessage.value.includes('chiffres')) {
        errorMessage.value = ''
        hasError.value = false
      }
    }, 2000)
    return
  }

  otpDigits.value[index] = value

  // Mettre à jour le formData du template
  updateField('otp', otpDigits.value.join(''))

  // Réinitialiser les messages
  hasError.value = false
  errorMessage.value = ''
  successMessage.value = ''

  // Passer au champ suivant
  if (value && index < 5) {
    await nextTick()
    inputRefs.value[index + 1]?.focus()
  }

  // Si tous les champs sont remplis, afficher un message d'encouragement
  if (isOtpComplete.value && !hasError.value) {
    successMessage.value = 'Code complet"'
  }
}

// Gestion des touches
const handleKeydown = async (index: number, event: KeyboardEvent) => {
  if (event.key === 'Backspace') {
    event.preventDefault()
    if (otpDigits.value[index]) {
      otpDigits.value[index] = ''
      successMessage.value = ''
    } else if (index > 0) {
      otpDigits.value[index - 1] = ''
      await nextTick()
      inputRefs.value[index - 1]?.focus()
      successMessage.value = ''
    }
  } else if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault()
    inputRefs.value[index - 1]?.focus()
  } else if (event.key === 'ArrowRight' && index < 5) {
    event.preventDefault()
    inputRefs.value[index + 1]?.focus()
  } else if (event.key === 'Enter' && isOtpComplete.value) {
    // Soumettre automatiquement si le code est complet
    event.preventDefault()
    handleOtpVerification({ otp: otpDigits.value.join('') })
  }
}
const handlePaste = async (event: ClipboardEvent, updateField: Function) => {
  event.preventDefault()
  const pastedData = event.clipboardData?.getData('text').replace(/\D/g, '') || ''

  if (pastedData.length === 0) {
    errorMessage.value = '⚠️ Aucun chiffre détecté dans le presse-papier'
    hasError.value = true
    setTimeout(() => {
      errorMessage.value = ''
      hasError.value = false
    }, 5000)
    return
  }

  if (pastedData.length > 6) {
    errorMessage.value = '⚠️ Le code ne peut pas dépasser 6 chiffres'
    hasError.value = true
    setTimeout(() => {
      errorMessage.value = ''
      hasError.value = false
    }, 5000)
    return
  }

  // Remplir les champs avec les données collées
  for (let i = 0; i < 6; i++) {
    otpDigits.value[i] = pastedData[i] || ''
  }

  updateField('otp', otpDigits.value.join(''))

  await nextTick()
  const nextEmptyIndex = pastedData.length < 6 ? pastedData.length : 5
  inputRefs.value[nextEmptyIndex]?.focus()
}
// Gestion de la vérification
const handleOtpVerification = async (formData: any) => {
  const code = otpDigits.value.join('')

  // Validation avant soumission
  if (!validateOtp()) {
    // Le message d'erreur est déjà défini par validateOtp()
    return
  }

  try {
    // Afficher un message de traitement
    successMessage.value = '🔄 Vérification en cours...'
    errorMessage.value = ''
    hasError.value = false

    // Appel du contrôleur pour vérifier l'OTP
    const result = await otpCtrl.verifyOtp(code)

    if (result.success) {
      console.log('✅ Code vérifié avec succès')

      // Afficher message de succès
      isVerified.value = true
      successMessage.value = result.message || '🎉 Connexion réussie ! Redirection...'
      hasError.value = false
      errorMessage.value = ''

      // Arrêter le timer
      stopOtpTimer()

      // Stocker les infos utilisateur si nécessaire
      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user))
      }

      // Réinitialiser le compteur de tentatives
      failedAttempts.value = 0

      // Redirection vers le tableau de bord après un court délai
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)

    } else {
      // Incrémenter le compteur de tentatives échouées
      failedAttempts.value++

      // Afficher les erreurs
      hasError.value = true
      isVerified.value = false
      errorMessage.value = result.message || '❌ Code incorrect. Veuillez réessayer.'
      successMessage.value = ''

      // Ajouter info sur les tentatives restantes
      const attemptsLeft = MAX_ATTEMPTS - failedAttempts.value
      if (attemptsLeft > 0 && attemptsLeft <= 2) {
        errorMessage.value += ` (${attemptsLeft} tentative${attemptsLeft > 1 ? 's' : ''} restante${attemptsLeft > 1 ? 's' : ''})`
      }

      // Si trop de tentatives, bloquer
      if (failedAttempts.value >= MAX_ATTEMPTS) {
        errorMessage.value = '🚫 Trop de tentatives échouées. Attendez 15 minutes ou demandez un nouveau code.'
        showHelp.value = true
      }

      // Vider les champs et refocus
      otpDigits.value = ['', '', '', '', '', '']
      await nextTick()
      inputRefs.value[0]?.focus()
    }
  } catch (error) {
    hasError.value = true
    isVerified.value = false
    errorMessage.value = '⚠️ Erreur lors de la vérification. Vérifiez votre connexion et réessayez.'
    successMessage.value = ''
    console.error('Erreur lors de la vérification OTP:', error)

    // Vider les champs en cas d'erreur
    otpDigits.value = ['', '', '', '', '', '']
    await nextTick()
    inputRefs.value[0]?.focus()
  }
}

// Gestion du renvoi de l'OTP
const handleResendOtp = async () => {
  if (resendCooldown.value > 0 || isResending.value) return

  try {
    isResending.value = true
    errorMessage.value = ''
    successMessage.value = '📧 Envoi en cours...'

    // TODO: Appel au service pour renvoyer l'OTP
    const response = await AuthService.retry(email.value)

    // Simulation de succès pour l'instant
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (response.success) {
      successMessage.value = '📧 Nouveau code envoyé ! Consultez votre boîte email.'
      errorMessage.value = ''
      hasError.value = false

      // Réinitialiser les champs et le compteur de tentatives
      otpDigits.value = ['', '', '', '', '', '']
      failedAttempts.value = 0

      // Redémarrer les timers
      // startOtpTimer()
      startResendCooldown()

      // Refocus sur le premier champ
      await nextTick()
      inputRefs.value[0]?.focus()

      // Cacher le message de succès après 4 secondes
      setTimeout(() => {
        if (successMessage.value.includes('Nouveau code')) {
          successMessage.value = ''
        }
      }, 4000)
    }else {
      errorMessage.value = '⚠️ Impossible de renvoyer le code. Vérifiez votre connexion et réessayez.'
      successMessage.value = ''
      hasError.value = true
    }
  } catch (error) {
    errorMessage.value = '⚠️ Impossible de renvoyer le code. Vérifiez votre connexion et réessayez.'
    successMessage.value = ''
    hasError.value = true
    console.error('Erreur lors du renvoi de l\'OTP:', error)
  } finally {
    isResending.value = false
  }
}
</script>
