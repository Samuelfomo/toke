<template>
  <AuthForm
    ref="authFormRef"
    page-title="Connexion - Toké"
    welcome-message="Authentification"
    welcome-subtitle="Connectez-vous avec votre adresse email et le code de votre organisation."
    submit-button-text="Se connecter"
    loading-text="Connexion en cours…"
    success-text="Code envoyé"
    :default-fields="loginFields"
    :validation="validateLogin"
    :submit-handler="handleLogin"
    :back-link="{ url: '/', text: 'Retour au QR Code' }"
  >
    <template #fields="{ formData = {}, updateField, errors = {} }">
      <div class="space-y-5">
        <div>
          <label for="customer_code" class="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <svg class="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3" />
              <path d="M8 9h8v6H8z" />
            </svg>
            Code client
          </label>

          <input
            id="customer_code"
            :value="formData.customer_code || ''"
            type="text"
            placeholder="Ex : CLT-20455"
            autocomplete="off"
            class="min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium uppercase tracking-wide text-slate-900 outline-none transition placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:ring-4"
            :class="errors.customer_code
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
              : 'border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-blue-100'"
            @input="updateField('customer_code', ($event.target as HTMLInputElement).value.toUpperCase())"
            @blur="handleCustomerCodeBlur(formData.customer_code)"
          />

          <p v-if="errors.customer_code" class="mt-1.5 text-xs font-medium text-rose-600">
            {{ errors.customer_code }}
          </p>
        </div>

        <div>
          <label for="email" class="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <svg class="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            Adresse email
          </label>

          <input
            id="email"
            :value="formData.email || ''"
            type="email"
            placeholder="votre.email@entreprise.com"
            autocomplete="email"
            class="min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4"
            :class="errors.email
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
              : 'border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-blue-100'"
            @input="updateField('email', ($event.target as HTMLInputElement).value.trim())"
            @blur="handleEmailBlur(formData.email)"
          />

          <p v-if="errors.email" class="mt-1.5 text-xs font-medium text-rose-600">
            {{ errors.email }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="mt-7 border-t border-slate-100 pt-5 text-center">
        <p class="text-xs leading-5 text-slate-500">
          Un code de vérification sera envoyé à votre adresse email après validation de vos informations.
        </p>
        <p class="mt-3 text-[11px] text-slate-400">
          Copyright Imediatis 2025 - Tous droits réservés
        </p>
      </div>
    </template>
  </AuthForm>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthForm from './components/auth/authForm.vue'
import authCtrl from '../ctrl/authCtrl'

const router = useRouter()
const authFormRef = ref<any>(null)

const loginFields = [
  { name: 'customer_code', type: 'text', required: true },
  { name: 'email', type: 'email', required: true },
]

function validateLogin(formData: Record<string, any> = {}): boolean {
  const emailValidation = authCtrl.validateEmail(formData.email || '')
  const customerCodeValidation = authCtrl.validateCustomerCode(formData.customer_code || '')
  return emailValidation.isValid && customerCodeValidation.isValid
}

function handleEmailBlur(email: string): void {
  if (!email?.trim()) return

  const validation = authCtrl.validateEmail(email)
  if (!validation.isValid) {
    authFormRef.value?.setFieldError(
      'email',
      authCtrl.getUserFriendlyErrorMessage(validation.errors),
    )
  }
}

function handleCustomerCodeBlur(customerCode: string): void {
  if (!customerCode?.trim()) return

  const validation = authCtrl.validateCustomerCode(customerCode)
  if (!validation.isValid) {
    authFormRef.value?.setFieldError(
      'customer_code',
      authCtrl.getUserFriendlyErrorMessage(validation.errors),
    )
  }
}

async function handleLogin(formData: Record<string, any>): Promise<void> {
  const email = String(formData.email || '').trim()
  const customerCode = String(formData.customer_code || '').trim().toUpperCase()

  const emailValidation = authCtrl.validateEmail(email)
  if (!emailValidation.isValid) {
    const message = authCtrl.getUserFriendlyErrorMessage(emailValidation.errors)
    authFormRef.value?.setFieldError('email', message)
    authFormRef.value?.setGlobalError(message)
    throw new Error(message)
  }

  const customerCodeValidation = authCtrl.validateCustomerCode(customerCode)
  if (!customerCodeValidation.isValid) {
    const message = authCtrl.getUserFriendlyErrorMessage(customerCodeValidation.errors)
    authFormRef.value?.setFieldError('customer_code', message)
    authFormRef.value?.setGlobalError(message)
    throw new Error(message)
  }

  const response = await authCtrl.requestLogin({
    email,
    customer_code: customerCode,
  })

  if (!response?.success) {
    const message = authCtrl.formatResponseMessage(response)
    authFormRef.value?.setGlobalError(message)
    throw new Error(message)
  }

  authFormRef.value?.setGlobalSuccess(
    response.message || 'Code de vérification envoyé. Consultez votre boîte email.',
  )

  window.setTimeout(() => {
    void router.push({ path: '/otp', query: { email } })
  }, 900)
}
</script>
