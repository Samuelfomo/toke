<template>
  <div class="auth-page">
    <div class="auth-container">
      <!-- Logo centré au-dessus -->
      <div class="auth-logo">
        <LazySvgImage :src="logoSrc" :alt="logoAlt" />
      </div>

      <!-- Carte du formulaire -->
      <div class="auth-form-card-test">
        <div v-if="loading" :class="skeletonContainerClass">
          <div class="skeleton-welcome-message"></div>

          <!-- Skeleton adaptatif selon le type -->
          <div v-if="skeletonType === 'otp'" class="skeleton-otp-fields">
            <div v-for="i in 6" :key="i" class="skeleton-otp-input"></div>
          </div>
          <div v-else class="skeleton-default-fields">
            <div class="skeleton-field"></div>
            <div class="skeleton-field"></div>
          </div>

          <div class="skeleton-actions"></div>
          <div class="skeleton-button"></div>
          <div class="skeleton-footer"></div>
        </div>
        <div v-else class="auth-form-card">
          <slot name="welcome">
            <p class="auth-welcome-message">
              {{ welcomeMessage }}
            </p>
            <p v-if="welcomeSubtitle" class="auth-welcome-message-subtitle">
              {{ welcomeSubtitle }}
            </p>
          </slot>

          <!-- Message d'erreur global -->
          <div v-if="globalError" class="auth-global-error">
            {{ globalError }}
          </div>

          <!-- Message de succès global -->
          <div v-if="globalSuccess" class="auth-global-success">
            {{ globalSuccess }}
          </div>

          <form @submit.prevent="handleSubmit">
            <slot name="fields" :formData="localFormData" :updateField="updateField" :errors="fieldErrors">
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
                  :class="{ 'error': fieldErrors[field.name] }"
                />
                <span v-if="fieldErrors[field.name]" class="error-message">
                  {{ fieldErrors[field.name] }}
                </span>
              </div>
            </slot>
            <slot name="actions" :formData="localFormData">
              <div v-if="secondaryActionLink" class="auth-otp-container">
                <router-link :to="secondaryActionLink.url" class="otp-link">
                  {{ secondaryActionLink.text }}
                </router-link>
              </div>
            </slot>
            <button
              type="submit"
              :disabled="isSubmitting || !isFormValid"
              class="auth-submit-btn"
            >
              {{ isSubmitting ? loadingText : submitButtonText }}
            </button>
          </form>
          <slot name="footer">
            <small class="text-black-50 text-center font-primary lead-0-75">
              {{ footerText }}
            </small>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted} from 'vue';
import { useRouter } from 'vue-router'
import HeadBuilder from '../../../utils/HeadBuilder'
import LazySvgImage from '../LazySvgImage.vue';
const router = useRouter()
const loading = ref(true);
import toke1 from '../../../../public/images/toke-main-logo.svg'

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
    required: true
  },

  // NOUVEAU : Type de skeleton
  skeletonType: {
    type: String,
    default: 'default', // 'default' | 'otp'
    validator: (value: string) => ['default', 'otp'].includes(value)
  },

  // Logo
  logoSrc: {
    type: String,
    default: toke1
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
    default: 'Copyright Imediatis 2025-2025'
  },

  // Champs par défaut
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

  // Action secondaire
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
const emit = defineEmits(['submit', 'field-change', 'loading-complete'])

// État local
const isSubmitting = ref(false)
const localFormData = ref({ ...props.initialData })
const fieldErrors = ref<Record<string, string>>({})
const globalError = ref('')
const globalSuccess = ref('')

// Computed pour la classe CSS du skeleton
const skeletonContainerClass = computed(() => {
  return `skeleton-form-card skeleton-${props.skeletonType}`
})

// Génération d'IDs uniques pour les champs
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

  const requiredFields = props.defaultFields.filter(field => field.required)
  return requiredFields.every(field => {
    const value = localFormData.value[field.name]
    return value && value.toString().trim() !== ''
  })
})

// Fonction pour mettre à jour un champ
const updateField = (fieldName: string, value: any) => {
  localFormData.value[fieldName] = value
  // Nettoyer l'erreur du champ quand l'utilisateur tape
  if (fieldErrors.value[fieldName]) {
    fieldErrors.value[fieldName] = ''
  }
  // Nettoyer les messages globaux
  globalError.value = ''
  globalSuccess.value = ''

  emit('field-change', fieldName, value)
}

// Fonction pour définir une erreur de champ
const setFieldError = (fieldName: string, errorMessage: string) => {
  fieldErrors.value[fieldName] = errorMessage
}

// Fonction pour nettoyer toutes les erreurs
const clearErrors = () => {
  fieldErrors.value = {}
  globalError.value = ''
  globalSuccess.value = ''
}

// Watch pour les changements de données initiales
watch(() => props.initialData, (newData) => {
  localFormData.value = { ...newData }
}, { deep: true })

// Gestion de la soumission
const handleSubmit = async () => {
  if (!isFormValid.value) return

  // Nettoyer les erreurs précédentes
  clearErrors()
  isSubmitting.value = true

  try {
    const result = await emit('submit', { ...localFormData.value })

    // Si une redirection est spécifiée et que tout s'est bien passé
    if (props.redirectTo) {
      await router.push(props.redirectTo)
    }
  } catch (error: any) {
    console.error('Erreur lors de la soumission:', error)

    // Gestion des erreurs
    if (error.field) {
      // Erreur spécifique à un champ
      setFieldError(error.field, error.message)
    } else {
      // Erreur globale
      globalError.value = error.message || 'Une erreur est survenue lors de la soumission du formulaire'
    }
  } finally {
    isSubmitting.value = false
  }
}

// Configuration de la page au montage
onMounted(async () => {
  // Configuration HeadBuilder
  HeadBuilder.apply({
    title: props.pageTitle,
    css: [props.cssFile],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })

  // Simulation du chargement
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Fin du chargement
  loading.value = false

  // Émettre l'événement de fin de chargement
  emit('loading-complete')
})

// Exposer les méthodes pour utilisation externe
defineExpose({
  setFieldError,
  clearErrors,
  setGlobalError: (msg: string) => { globalError.value = msg },
  setGlobalSuccess: (msg: string) => { globalSuccess.value = msg }
})
</script>

<style scoped>
.auth-global-error {
  background-color: #fee;
  border: 1px solid #fcc;
  color: #c33;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
}

.auth-global-success {
  background-color: #efe;
  border: 1px solid #cfc;
  color: #3c3;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
}

.error-message {
  color: #c33;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.auth-input.error {
  border-color: #c33;
}
</style>