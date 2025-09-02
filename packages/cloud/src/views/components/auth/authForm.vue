<template>
  <div class="auth-page">
    <!-- Logo centré au-dessus -->
    <div class="auth-container">
<!--      <div class="auth-logo">-->
<!--        <img-->
<!--          :src="logoSrc"-->
<!--          :alt="logoAlt"-->
<!--        />-->
<!--      </div>-->
      <!-- Carte du formulaire -->
      <div class="auth-form-card">
        <slot name="welcome">
          <p class="auth-welcome-message">
            {{ welcomeMessage }}
          </p>
        </slot>
        <form @submit.prevent="handleSubmit">
          <div class="auth-field">
            <label class="auth-field-label" :for="emailFieldId">
              {{ emailLabel }}
            </label>
            <input
              :id="emailFieldId"
              v-model="localEmail"
              type="email"
              :placeholder="emailPlaceholder"
              class="auth-input"
              :required="emailRequired"
            />
          </div>

          <!-- Lien OTP aligné à droite -->
          <div class="auth-otp-container">
            <a href="/otp" class="otp-link">
              J'ai un jeton valide
            </a>
          </div>

          <!-- Case à cocher "Se souvenir de moi" -->
          <div v-if="showRememberMe" class="auth-checkbox-container">
            <input
              :id="rememberFieldId"
              type="checkbox"
              v-model="localRemember"
            />
            <label :for="rememberFieldId" class="auth-checkbox-label">
              {{ rememberLabel }}
            </label>
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="auth-submit-btn"
          >
            {{ isSubmitting ? loadingText : submitButtonText }}
          </button>
        </form>

        <!-- Retour conditionnel -->
        <div v-if="showBackLink" class="auth-back-link-container">
          <a
            :href="backLinkUrl"
            class="auth-back-link"
          >
            {{ backLinkText }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
import defaultLogo from '/src/assets/images/toke-main-logo.svg'

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
  welcomeMessage: {
    type: String,
    default: 'Bienvenue sur votre espace de connexion'
  },

  // Champs du formulaire
  emailLabel: {
    type: String,
    default: 'Adresse e-mail'
  },
  emailPlaceholder: {
    type: String,
    default: 'Email'
  },
  emailRequired: {
    type: Boolean,
    default: true
  },

  // Mot de passe
  showPassword: {
    type: Boolean,
    default: false
  },
  passwordLabel: {
    type: String,
    default: 'Mot de passe'
  },
  passwordPlaceholder: {
    type: String,
    default: ''
  },
  passwordRequired: {
    type: Boolean,
    default: false
  },

  // Case à cocher
  showRememberMe: {
    type: Boolean,
    default: true
  },
  rememberLabel: {
    type: String,
    default: 'Se souvenir de moi'
  },

  // Bouton de soumission
  submitButtonText: {
    type: String,
    default: 'Envoyer'
  },
  loadingText: {
    type: String,
    default: 'Chargement...'
  },

  // Lien retour
  showBackLink: {
    type: Boolean,
    default: true
  },
  backLinkText: {
    type: String,
    default: '← Retour vers Quelques choses'
  },
  backLinkUrl: {
    type: String,
    default: '#'
  },

  // Valeurs initiales
  initialEmail: {
    type: String,
    default: ''
  },
  initialPassword: {
    type: String,
    default: ''
  },
  initialRemember: {
    type: Boolean,
    default: false
  }
})

// Définition des émissions
const emit = defineEmits(['submit', 'back-click'])

// Variables réactives
const localEmail = ref(props.initialEmail)
const localPassword = ref(props.initialPassword)
const localRemember = ref(props.initialRemember)
const isSubmitting = ref(false)

// IDs uniques pour les champs
const emailFieldId = computed(() => `email-${Math.random().toString(36).substr(2, 9)}`)
const passwordFieldId = computed(() => `password-${Math.random().toString(36).substr(2, 9)}`)
const rememberFieldId = computed(() => `remember-${Math.random().toString(36).substr(2, 9)}`)

// Fonctions
const handleSubmit = async () => {
  isSubmitting.value = true

  const formData = {
    email: localEmail.value,
    remember: localRemember.value
  }

  try {
    // on émet l'événement vers le parent si besoin
    emit('submit', formData)

    // puis on redirige vers la page OTP
    router.push('/otp')
  } finally {
    isSubmitting.value = false
  }
}
</script>
