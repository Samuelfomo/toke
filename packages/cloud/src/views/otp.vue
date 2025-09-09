<template>
  <AuthForm
    page-title="Vérification OTP - Toké"
    :css-file="authCss"
    welcome-message=""
    welcome-subtitle="Saisir le code de vérification envoyé à votre adresse email"
    submit-button-text="Vérifier"
    loading-text="Vérification..."
    :default-fields="[]"
    :validation="validateOtp"
    :back-link="{ url: '/auth', text: 'Reessayer' }"
    @submit="handleOtpVerification"
  >
    <!-- Champs OTP personnalisés -->
    <template #fields="{ formData, updateField }">
      <div class="otp-inputs">
        <input
          v-for="(digit, index) in otpDigits"
          :key="index"
          :ref="el => setInputRef(el as HTMLInputElement | null, index)"
          v-model="otpDigits[index]"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="1"
          class="otp-input"
          :placeholder="'•'"
          :class="{ 'filled': otpDigits[index] }"
          @input="handleInput(index, $event, updateField)"
          @keydown="handleKeydown(index, $event)"
          @paste="handlePaste($event, updateField)"
          @focus="handleFocus(index)"
          autocomplete="one-time-code"
        />
      </div>
    </template>

<!--    &lt;!&ndash; Actions personnalisées &ndash;&gt;-->
    <template #footer>
      <p class="request-again">
        Vous n'avez pas reçu de code ?
        <a href="/auth" class="request-link">Reessayer</a>
      </p>
      <small class="text-black-50 text-center font-primary lead-0-75">
        Copyright Imediatis 2025-2025
      </small>
    </template>

  </AuthForm>

</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import otpCss from '../assets/css/toke-otp-02.css?url'
import authCss from '../assets/css/toke-auth-01.css?url'
import AuthForm from './components/auth/authForm.vue'
import HeadBuilder from './../utils/HeadBuilder';
import { useRouter } from 'vue-router';

const router = useRouter()
// État des champs OTP
const otpDigits = ref(['', '', '', '', '', ''])
const inputRefs = ref<(HTMLInputElement | null)[]>([])

// Validation OTP (fonction, pas boolean direct)
const validateOtp = () => {
  return otpDigits.value.every(digit => digit !== '')
}

// Gestion des références d'inputs
const setInputRef = (el: HTMLInputElement | null, index: number) => {
  if (el) {
    inputRefs.value[index] = el
  }
}
const cssFiles = [authCss, otpCss]

// ✅ SOLUTION 1 : Charger les CSS manuellement
onMounted(() => {
  HeadBuilder.apply({
    title: 'Vérification OTP - Toké',
    css: [authCss, otpCss], // Charger les deux fichiers CSS
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})

// Focus automatique sur le premier champ
onMounted(() => {
  nextTick(() => {
    inputRefs.value[0]?.focus()
  })
})

// Gestion du focus
const handleFocus = (index: number) => {
  nextTick(() => {
    inputRefs.value[index]?.select()
  })
}

// Gestion de la saisie
const handleInput = async (index: number, event: Event, updateField: Function) => {
  const target = event.target as HTMLInputElement
  const value = target.value

  // Ne garder que les chiffres
  if (!/^\d*$/.test(value)) {
    otpDigits.value[index] = ''
    return
  }

  otpDigits.value[index] = value

  // Mettre à jour le formData du template
  updateField('otp', otpDigits.value.join(''))

  // Passer au champ suivant
  if (value && index < 5) {
    await nextTick()
    inputRefs.value[index + 1]?.focus()
  }
}

// Gestion des touches
const handleKeydown = async (index: number, event: KeyboardEvent) => {
  if (event.key === 'Backspace') {
    event.preventDefault()
    if (otpDigits.value[index]) {
      otpDigits.value[index] = ''
    } else if (index > 0) {
      otpDigits.value[index - 1] = ''
      await nextTick()
      inputRefs.value[index - 1]?.focus()
    }
  } else if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault()
    inputRefs.value[index - 1]?.focus()
  } else if (event.key === 'ArrowRight' && index < 5) {
    event.preventDefault()
    inputRefs.value[index + 1]?.focus()
  }
}

// Gestion du collage
const handlePaste = async (event: ClipboardEvent, updateField: Function) => {
  event.preventDefault()
  const pastedData = event.clipboardData?.getData('text').replace(/\D/g, '') || ''

  if (pastedData.length <= 6) {
    for (let i = 0; i < 6; i++) {
      otpDigits.value[i] = pastedData[i] || ''
    }

    updateField('otp', otpDigits.value.join(''))

    await nextTick()
    const nextEmptyIndex = pastedData.length < 6 ? pastedData.length : 5
    inputRefs.value[nextEmptyIndex]?.focus()
  }
}

// Gestion de la vérification
const handleOtpVerification = async (formData: any) => {
  const code = otpDigits.value.join('')
  console.log('Code OTP:', code)

  // Simulation d'appel API
  await new Promise(resolve => setTimeout(resolve, 2000))
  console.log('Code vérifié avec succès')
  // ✅ Redirection après succès
  router.push('/dashboard')
}
</script>
