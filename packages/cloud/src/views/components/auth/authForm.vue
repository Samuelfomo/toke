<template>
  <div class="auth-page">
    <div class="auth-container">
      <!-- Logo centrÃ© au-dessus -->
      <div class="auth-logo">
        <img :src="logoSrc" :alt="logoAlt" />
      </div>

      <!-- Carte du formulaire -->
      <div class="auth-form-card">
        <!-- Message de bienvenue personnalisable -->
        <slot name="welcome">
          <p class="auth-welcome-message">
            {{ welcomeMessage }}
          </p>
          <p v-if="welcomeSubtitle" class="auth-welcome-message-subtitle">
            {{ welcomeSubtitle }}
          </p>
        </slot>

        <!-- Formulaire -->
        <form @submit.prevent="handleSubmit">
          <!-- Champs personnalisables via slot -->
          <slot name="fields" :formData="localFormData" :updateField="updateField">
            <!-- Champs par défaut si aucun slot fourni -->
            <div v-for="field in defaultFields" :key="field.name" class="auth-field">
              <label v-if="field.label" :for="field.id" class="auth-field-label">
                {{ field.label }}
              </label>
              <input
                :id="field.id"
                v-model="localFormData[field.name]"
                :type="field.type"
                :placeholder="field.placeholder"
                :required="field.required"
                class="auth-input"
              />
            </div>
          </slot>

          <!-- Actions personnalisables (liens, checkboxes, etc.) -->
          <slot name="actions" :formData="localFormData">
            <!-- Actions par défaut -->
            <div v-if="showRememberMe" class="auth-checkbox-container">
              <input
                id="remember"
                v-model="localFormData.remember"
                type="checkbox"
              />
              <label for="remember" class="auth-checkbox-label">
                {{ rememberMeText }}
              </label>
            </div>

            <div v-if="secondaryActionLink" class="auth-otp-container">
              <router-link :to="secondaryActionLink.url" class="otp-link">
                {{ secondaryActionLink.text }}
              </router-link>
            </div>
          </slot>

          <!-- Bouton de soumission -->
          <button
            type="submit"
            :disabled="isSubmitting || !isFormValid"
            class="auth-submit-btn"
          >
            {{ isSubmitting ? loadingText : submitButtonText }}
          </button>

          <!-- Footer personnalisable -->
          <slot name="footer">
            <small class="text-black-50 text-center font-primary lead-0-75">
              {{ footerText }}
            </small>
          </slot>
        </form>

        <!-- Lien retour si nécessaire -->
        <div v-if="backLink" class="auth-back-link-container">
          <router-link :to="backLink.url" class="auth-back-link">
            {{ backLink.text }}
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import HeadBuilder from '../../../utils/HeadBuilder'

const router = useRouter()

// Interface pour les champs
interface FormField {
  name: string
  type: string
  placeholder: string
  label?: string
  required?: boolean
  id?: string
}

interface SecondaryAction {
  url: string
  text: string
}

interface BackLink {
  url: string
  text: string
}

// Props du template
const props = defineProps({
  // Configuration de la page
  pageTitle: {
    type: String,
    default: 'Authentification'
  },
  cssFile: {
    type: String,
    required: true // Obligatoire pour charger le bon CSS
  },

  // Logo
  logoSrc: {
    type: String,
    default: '/src/assets/images/toke-main-logo.svg'
  },
  logoAlt: {
    type: String,
    default: 'Logo'
  },

  // Messages
  welcomeMessage: {
    type: String,
    default: 'Bienvenue sur votre espace de connexion'
  },
  welcomeSubtitle: {
    type: String,
    default: ''
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

  // Footer
  footerText: {
    type: String,
    default: 'Copyright Imediatis 2025'
  },

  // Champs par défaut (si pas de slot fourni)
  defaultFields: {
    type: Array as () => FormField[],
    default: () => [
      {
        name: 'email',
        type: 'email',
        placeholder: 'Renseigner votre email',
        required: true
      }
    ]
  },

  // Données initiales du formulaire
  initialData: {
    type: Object,
    default: () => ({})
  },

  // Validation personnalisée
  validation: {
    type: Function,
    default: null
  },

  // Remember me
  showRememberMe: {
    type: Boolean,
    default: false
  },
  rememberMeText: {
    type: String,
    default: 'Se souvenir de moi'
  },

  // Action secondaire (comme "J'ai un jeton valide")
  secondaryActionLink: {
    type: Object as () => SecondaryAction | null,
    default: null
  },

  // Lien retour
  backLink: {
    type: Object as () => BackLink | null,
    default: null
  },

  // Redirection après soumission
  redirectTo: {
    type: String,
    default: ''
  }
})

// Émissions
const emit = defineEmits(['submit', 'field-change'])

// État local
const isSubmitting = ref(false)
const localFormData = ref({ ...props.initialData })

// Générer des IDs uniques pour les champs
const generateFieldIds = () => {
  return props.defaultFields.map(field => ({
    ...field,
    id: field.id || `${field.name}-${Math.random().toString(36).substr(2, 9)}`
  }))
}

// Validation du formulaire
const isFormValid = computed(() => {
  if (props.validation) {
    return props.validation(localFormData.value)
  }

  // Validation par défaut : vérifier les champs requis
  const requiredFields = props.defaultFields.filter(field => field.required)
  return requiredFields.every(field => {
    const value = localFormData.value[field.name]
    return value && value.toString().trim() !== ''
  })
})

// Fonction pour mettre à jour un champ
const updateField = (fieldName: string, value: any) => {
  localFormData.value[fieldName] = value
  emit('field-change', fieldName, value)
}

// Watch pour les changements de données initiales
watch(() => props.initialData, (newData) => {
  localFormData.value = { ...newData }
}, { deep: true })

// Gestion de la soumission
const handleSubmit = async () => {
  if (!isFormValid.value) return

  isSubmitting.value = true

  try {
    // Émettre l'événement vers le parent
    emit('submit', { ...localFormData.value })

    // Redirection si spécifiée
    if (props.redirectTo) {
      await router.push(props.redirectTo)
    }
  } catch (error) {
    console.error('Erreur lors de la soumission:', error)
  } finally {
    isSubmitting.value = false
  }
}

// Configuration de la page au montage
onMounted(() => {
  HeadBuilder.apply({
    title: props.pageTitle,
    css: [props.cssFile],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})
</script>