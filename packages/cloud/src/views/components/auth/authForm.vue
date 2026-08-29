<template>
  <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#004aad]/80 via-[#004aad]/60 to-[#004aad]/80 px-4 py-8 sm:px-6">
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div class="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div class="absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-200/10 blur-3xl" />
      <div class="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
    </div>

    <section class="relative z-10 w-full max-w-[520px]">
      <div class="mx-auto mb-7 flex w-28 items-center justify-center sm:w-32">
        <LazySvgImage :src="logoSrc" :alt="logoAlt" />
      </div>

      <div class="rounded-3xl border border-white/50 bg-white/95 p-5 shadow-2xl shadow-blue-950/20 backdrop-blur sm:p-8">
        <slot name="welcome">
          <div class="text-center">
            <h1 class="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {{ welcomeMessage }}
            </h1>
            <p v-if="welcomeSubtitle" class="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600 sm:text-base">
              {{ welcomeSubtitle }}
            </p>
          </div>
        </slot>

        <div
          v-if="globalError"
          class="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm leading-5 text-rose-700"
          role="alert"
        >
          <svg class="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 17h.01" />
          </svg>
          <span>{{ globalError }}</span>
        </div>

        <div
          v-if="globalSuccess"
          class="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm leading-5 text-emerald-700"
          role="status"
        >
          <svg class="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="m8.5 12 2.25 2.25L15.5 9.5" />
          </svg>
          <span>{{ globalSuccess }}</span>
        </div>

        <form class="mt-7" @submit.prevent="handleSubmit">
          <slot name="fields" :formData="localFormData" :updateField="updateField" :errors="fieldErrors">
            <div class="space-y-5">
              <div v-for="field in fieldsWithIds" :key="field.name" class="text-left">
                <label v-if="field.label" :for="field.id" class="mb-2 block text-sm font-semibold text-slate-700">
                  {{ field.label }}
                </label>
                <input
                  :id="field.id"
                  :value="localFormData[field.name] ?? ''"
                  :type="field.type || 'text'"
                  :placeholder="field.placeholder"
                  :required="field.required"
                  class="min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4"
                  :class="fieldErrors[field.name]
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                    : 'border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-blue-100'"
                  @input="updateField(field.name, ($event.target as HTMLInputElement).value)"
                />
                <p v-if="fieldErrors[field.name]" class="mt-1.5 text-xs font-medium text-rose-600">
                  {{ fieldErrors[field.name] }}
                </p>
              </div>
            </div>
          </slot>

          <slot name="actions" :formData="localFormData">
            <div v-if="secondaryActionLink" class="mt-4 flex justify-end">
              <RouterLink :to="secondaryActionLink.url" class="text-sm font-semibold text-blue-700 no-underline hover:text-blue-800 hover:underline">
                {{ secondaryActionLink.text }}
              </RouterLink>
            </div>
          </slot>

          <button
            type="submit"
            :disabled="isSubmitting || isSuccess || !isFormValid"
            class="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            <svg v-if="isSubmitting" class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" />
              <path class="opacity-90" fill="currentColor" d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3Z" />
            </svg>
            <svg v-else-if="isSuccess" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="m5 12 4 4L19 6" />
            </svg>
            <span>{{ buttonText }}</span>
          </button>
        </form>

        <slot name="footer">
          <p class="mt-7 text-center text-xs leading-5 text-slate-500">
            {{ footerText }}
          </p>
        </slot>
      </div>

      <div v-if="backLink" class="mt-5 text-center">
        <RouterLink
          :to="backLink.url"
          class="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white no-underline backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {{ backLink.text }}
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import HeadBuilder from '../../../utils/HeadBuilder'
import LazySvgImage from '../LazySvgImage.vue'
import tokeLogo from '../../../../public/images/toke-white-logo.svg'

interface FormField {
  name: string
  type?: string
  placeholder?: string
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

interface SubmitHelpers {
  setFieldError: (fieldName: string, message: string) => void
  setGlobalError: (message: string) => void
  setGlobalSuccess: (message: string) => void
}

type SubmitHandler = (formData: Record<string, any>, helpers: SubmitHelpers) => Promise<void> | void

const props = withDefaults(defineProps<{
  pageTitle?: string
  logoSrc?: string
  logoAlt?: string
  welcomeMessage?: string
  welcomeSubtitle?: string
  submitButtonText?: string
  loadingText?: string
  successText?: string
  footerText?: string
  defaultFields?: FormField[]
  initialData?: Record<string, any>
  validation?: ((data: Record<string, any>) => boolean) | null
  secondaryActionLink?: SecondaryAction | null
  backLink?: BackLink | null
  redirectTo?: string
  submitHandler?: SubmitHandler | null
}>(), {
  pageTitle: 'Authentification',
  logoSrc: tokeLogo,
  logoAlt: 'Toké',
  welcomeMessage: 'Bienvenue sur votre espace de connexion',
  welcomeSubtitle: '',
  submitButtonText: 'Envoyer',
  loadingText: 'Chargement…',
  successText: 'Connexion réussie !',
  footerText: 'Copyright Imediatis 2025 - Tous droits réservés',
  defaultFields: () => [],
  initialData: () => ({}),
  validation: null,
  secondaryActionLink: null,
  backLink: null,
  redirectTo: '',
  submitHandler: null,
})

const emit = defineEmits<{
  submit: [data: Record<string, any>]
  'field-change': [fieldName: string, value: any]
}>()

const isSubmitting = ref(false)
const isSuccess = ref(false)
const localFormData = ref<Record<string, any>>({ ...props.initialData })
const fieldErrors = ref<Record<string, string>>({})
const globalError = ref('')
const globalSuccess = ref('')

const fieldsWithIds = computed(() =>
  props.defaultFields.map((field, index) => ({
    ...field,
    id: field.id || `${field.name}-${index}`,
  })),
)

const buttonText = computed(() => {
  if (isSuccess.value) return props.successText
  if (isSubmitting.value) return props.loadingText
  return props.submitButtonText
})

const isFormValid = computed(() => {
  if (props.validation) return props.validation(localFormData.value)

  return props.defaultFields
    .filter((field) => field.required)
    .every((field) => String(localFormData.value[field.name] ?? '').trim() !== '')
})

function updateField(fieldName: string, value: any): void {
  localFormData.value[fieldName] = value
  if (fieldErrors.value[fieldName]) fieldErrors.value[fieldName] = ''
  globalError.value = ''
  globalSuccess.value = ''
  isSuccess.value = false
  emit('field-change', fieldName, value)
}

function setFieldError(fieldName: string, errorMessage: string): void {
  fieldErrors.value[fieldName] = errorMessage
}

function setGlobalError(message: string): void {
  globalError.value = message
  if (message) {
    globalSuccess.value = ''
    isSuccess.value = false
  }
}

function setGlobalSuccess(message: string): void {
  globalSuccess.value = message
  if (message) globalError.value = ''
}

function setSuccess(value = true): void {
  isSuccess.value = value
}

function clearErrors(): void {
  fieldErrors.value = {}
  globalError.value = ''
  globalSuccess.value = ''
  isSuccess.value = false
}

async function handleSubmit(): Promise<void> {
  if (!isFormValid.value || isSubmitting.value) return

  clearErrors()
  isSubmitting.value = true

  try {
    const data = { ...localFormData.value }
    const helpers: SubmitHelpers = { setFieldError, setGlobalError, setGlobalSuccess }

    if (props.submitHandler) {
      await props.submitHandler(data, helpers)
    } else {
      emit('submit', data)
    }

    if (!globalError.value) {
      isSuccess.value = true
    }
  } catch (error: any) {
    isSuccess.value = false
    if (!globalError.value) {
      globalError.value = error?.message || 'Une erreur est survenue. Veuillez réessayer.'
    }
  } finally {
    isSubmitting.value = false
  }
}

watch(
  () => props.initialData,
  (newData) => {
    localFormData.value = { ...newData }
  },
  { deep: true },
)

onMounted(() => {
  HeadBuilder.apply({
    title: props.pageTitle,
    css: [],
    meta: { viewport: 'width=device-width, initial-scale=1.0' },
  })
})

defineExpose({
  setFieldError,
  setGlobalError,
  setGlobalSuccess,
  setSuccess,
  clearErrors,
})
</script>
