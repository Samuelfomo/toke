<template>
  <div class="verify-container">
    <div class="layout">
      <!-- Image à gauche -->
      <div class="side-image">
        <img :src="Image" alt="Illustration" />
      </div>
      <!-- Formulaire à droite -->
      <div class="auth-container">
        <div class="authlogo">
          <img :src="logoSrc" :alt="logoAlt" />
        </div>

        <div class="verify-card">
          <h1 class="verify-title">Verify</h1>
          <p class="verify-subtitle">Votre code vous a ete envoyer par email</p>

          <div class="otp-inputs">
            <input
              v-for="(digit, index) in otpDigits"
              :key="index"
              :ref="el => setInputRef(el, index)"
              v-model="otpDigits[index]"
              type="text"
              maxlength="1"
              class="otp-input"
              @input="handleInput(index, $event)"
              @keydown="handleKeydown(index, $event)"
              @paste="handlePaste($event)"
            />
          </div>

          <div class="action-buttons">
            <button class="verify-button" @click="verifyCode">
              Verify
            </button>
          </div>

          <p class="request-again">
            Vous n'avez pas recu de code?
            <a href="/" class="request-link">Reenvoyer</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, nextTick } from "vue"
import HeadBuilder from "../utils/HeadBuilder"
import otpCss from "../assets/css/toke-otp-02.css?url"
import defaultLogo from '/src/assets/images/toke-main-logo.svg'
import Image from '../assets/images/pic5.png'

// Quand le composant est monté, on met à jour <head>
onMounted(() => {
  HeadBuilder.apply({
    title: "Connexion - Bienvenue",
    css: [otpCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})
// Définition des props
const props = defineProps({
  // Logo
  logoSrc: {
    type: String,
    default: defaultLogo,
  },
  logoAlt: {
    type: String,
    default: 'Logo'
  },
 })
const otpDigits = ref(['', '', '', '', '', ''])
const inputRefs = ref([])

const setInputRef = (el, index) => {
  if (el) {
    inputRefs.value[index] = el
  }
}

const handleInput = async (index, event) => {
  const value = event.target.value
  // Ne garder que les chiffres
  if (!/^\d*$/.test(value)) {
    otpDigits.value[index] = ''
    return
  }
  otpDigits.value[index] = value
  // Passer au champ suivant si un chiffre est saisi
  if (value && index < 5) {
    await nextTick()
    inputRefs.value[index + 1]?.focus()
  }
}

// Fonction pour effacer depuis une position donnée jusqu'à la fin
const clearFromPosition = (startIndex) => {
  for (let i = startIndex; i < otpDigits.value.length; i++) {
    otpDigits.value[i] = ''
  }
}

// Fonction pour effacer toutes les cases
const clearAll = () => {
  for (let i = 0; i < otpDigits.value.length; i++) {
    otpDigits.value[i] = ''
  }
  // Focuser la première case après effacement
  inputRefs.value[0]?.focus()
}

const handleKeydown = async (index, event) => {
  // Ctrl+A : sélectionner tout et préparer la suppression
  if (event.ctrlKey && event.key === 'a') {
    event.preventDefault()
    // Sélectionner visuellement tous les champs (on peut ajouter une classe CSS)
    inputRefs.value.forEach(input => {
      if (input) input.select()
    })
    return
  }

  // Suppr ou Delete : effacer depuis la position actuelle jusqu'à la fin
  if (event.key === 'Delete') {
    event.preventDefault()
    clearFromPosition(index)
    return
  }

  // Retour arrière : effacer le champ actuel et aller au précédent
  if (event.key === 'Backspace') {
    event.preventDefault()

    // Si le champ actuel contient quelque chose, l'effacer
    if (otpDigits.value[index]) {
      otpDigits.value[index] = ''
    }
    // Sinon, aller au champ précédent et l'effacer
    else if (index > 0) {
      otpDigits.value[index - 1] = ''
      await nextTick()
      inputRefs.value[index - 1]?.focus()
    }
    return
  }

  // Ctrl+Backspace : effacer depuis le début jusqu'à la position actuelle
  if (event.ctrlKey && event.key === 'Backspace') {
    event.preventDefault()
    for (let i = 0; i <= index; i++) {
      otpDigits.value[i] = ''
    }
    inputRefs.value[0]?.focus()
    return
  }

  // Flèches gauche/droite pour naviguer
  if (event.key === 'ArrowLeft' && index > 0) {
    inputRefs.value[index - 1]?.focus()
  } else if (event.key === 'ArrowRight' && index < 5) {
    inputRefs.value[index + 1]?.focus()
  }
}

const handlePaste = async (event) => {
  event.preventDefault()
  const pastedData = event.clipboardData.getData('text').replace(/\D/g, '')
  if (pastedData.length <= 6) {
    // Remplir les champs avec les données collées
    for (let i = 0; i < 6; i++) {
      otpDigits.value[i] = pastedData[i] || ''
    }
    // Focuser le dernier champ rempli ou le premier vide
    await nextTick()
    const nextEmptyIndex = pastedData.length < 6 ? pastedData.length : 5
    inputRefs.value[nextEmptyIndex]?.focus()
  }
}

const verifyCode = () => {
  const code = otpDigits.value.join('')
  console.log('Code de vérification:', code)
  // Ici vous pouvez ajouter la logique de vérification
  alert(`Code saisi: ${code}`)
}

// const requestAgain = () => {
//   console.log('Demande d\'un nouveau code')
//   // Ici vous pouvez ajouter la logique pour redemander un code
//   alert('Un nouveau code va être envoyé')
// }
</script>

<style scoped>

</style>