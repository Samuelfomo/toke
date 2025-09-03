<template>
  <AuthForm
    page-title="Vérification OTP - Toké"
    :css-file="otpCss"
    welcome-message=""
    welcome-subtitle="Saisir le code de vérification envoyé à votre adresse email"
    submit-button-text="Vérifier"
    loading-text="Vérification..."
    :default-fields="[]"
    :validation="validateOtp"
    :back-link="{ url: '/', text: 'Renvoyer' }"
    @submit="handleOtpVerification"
  >
    <!-- Champs OTP personnalisés -->
    <template #fields="{ formData, updateField }">
      <div class="otp-inputs">
        <input
          v-for="(digit, index) in otpDigits"
          :key="index"
          :ref="el => setInputRef(el, index)"
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

    <!-- Actions personnalisées -->
    <template #actions>
      <p class="request-again">
        Vous n'avez pas reçu de code ?
        <a href="/" class="request-link">
          Renvoyer
        </a>
      </p>
    </template>
  </AuthForm>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, onMounted } from 'vue'
import otpCss from '../assets/css/toke-otp-02.css?url'
import AuthForm from './components/auth/authForm.vue';

// État des champs OTP
const otpDigits = ref(['', '', '', '', '', ''])
const inputRefs = ref([])

// Validation OTP
const validateOtp = computed(() => {
  return otpDigits.value.every(digit => digit !== '')
})

// Gestion des références d'inputs
const setInputRef = (el: HTMLElement | null, index: number) => {
  if (el) {
    inputRefs.value[index] = el
  }
}

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
}
</script>