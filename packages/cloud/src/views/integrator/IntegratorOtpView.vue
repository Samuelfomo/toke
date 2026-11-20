<template>
  <IntegratorAuthLayout>
    <div
        class="mb-9 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-[#225fbd]">
      <EnvelopeIcon class="h-6 w-6"/>
    </div>
    <p class="text-xs font-bold uppercase tracking-[.17em] text-[#225fbd]">Étape 2 · Vérification</p>
    <h2 class="mt-3 text-[30px] font-bold leading-tight tracking-tight text-[#142640] sm:text-[34px]">Confirmez votre
      identité</h2>
    <p class="mt-4 text-sm leading-7 text-slate-500">Saisissez le code à 6 chiffres envoyé à <strong
        class="break-all font-semibold text-slate-700">{{ store.email }}</strong>.</p>
    <form class="mt-9" @submit.prevent="submit">
      <label for="integrator-otp" class="mb-2 block text-sm font-semibold text-slate-700">Code de vérification</label>
      <div class="relative" @click="focusOtp">
        <div aria-hidden="true" class="grid grid-cols-6 gap-2 sm:gap-3">
          <span v-for="i in 6" :key="i"
                class="flex h-14 items-center justify-center rounded-xl border bg-white text-xl font-semibold tabular-nums transition"
                :class="[code.length === i - 1 && focused ? 'border-[#2867d0] ring-2 ring-blue-100' : 'border-slate-300', code[i-1] ? 'text-[#142640]' : 'text-slate-300']">{{
              code[i - 1] || '·'
            }}</span>
        </div>
        <input id="integrator-otp" ref="otpInput" v-model="code" type="text" inputmode="numeric"
               autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required :disabled="busy"
               aria-label="Code de vérification à six chiffres" @input="onInput" @focus="focused = true"
               @blur="focused = false" class="absolute inset-0 h-full w-full cursor-text opacity-0"/>
      </div>
      <p class="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <ClockIcon class="h-4 w-4 shrink-0"/>
        Le code expire après 5 minutes.
      </p>
      <p v-if="error" role="alert"
         class="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>
      <p v-if="notice" role="status"
         class="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{
          notice
        }}</p>
      <button type="submit" :disabled="busy || code.length !== 6"
              class="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#225fbd] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#194f9b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#225fbd] disabled:cursor-not-allowed disabled:opacity-60">
        {{ busy ? 'Vérification…' : 'Vérifier et accéder à la console' }}
        <ArrowRightIcon v-if="!busy" class="h-4 w-4"/>
      </button>
    </form>
    <div
        class="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm font-semibold">
      <RouterLink to="/integrateur/connexion"
                  class="inline-flex items-center gap-1.5 text-slate-600 hover:text-[#225fbd]">
        <ArrowLeftIcon class="h-4 w-4"/>
        Modifier mon email
      </RouterLink>
      <button type="button" class="text-[#225fbd] hover:text-[#194f9b] disabled:opacity-50"
              :disabled="resending || busy || !store.email" @click="resend">
        {{ resending ? 'Envoi en cours…' : 'Renvoyer le code' }}
      </button>
    </div>
  </IntegratorAuthLayout>
</template>
<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {EnvelopeIcon, ArrowRightIcon, ArrowLeftIcon, ClockIcon} from '@heroicons/vue/24/outline'
import IntegratorAuthLayout from './layouts/IntegratorAuthLayout.vue'
import {useIntegratorStore} from '@/stores/integratorStore'
import {integratorError} from '@/service/IntegratorService'

const router = useRouter()
const store = useIntegratorStore()
const code = ref('')
const busy = ref(false)
const resending = ref(false)
const focused = ref(false)
const error = ref('')
const notice = ref('')
const otpInput = ref<HTMLInputElement | null>(null)
onMounted(async () => {
  if (!store.email) {
    await router.replace('/integrateur/connexion');
    return
  }
  otpInput.value?.focus()
})

function focusOtp() {
  otpInput.value?.focus()
}

function onInput() {
  code.value = code.value.replace(/\D/g, '').slice(0, 6)
}

async function submit() {
  if (busy.value || code.value.length !== 6) return
  busy.value = true
  error.value = ''
  try {
    await store.verify(code.value);
    await router.replace('/integrateur')
  } catch (e) {
    error.value = integratorError(e)
  } finally {
    busy.value = false
  }
}

async function resend() {
  if (resending.value || busy.value || !store.email) return
  resending.value = true
  error.value = '';
  notice.value = '';
  code.value = ''
  try {
    await store.request(store.email);
    notice.value = 'Si cette adresse est autorisée, un nouveau code lui a été envoyé.';
    otpInput.value?.focus()
  } catch (e) {
    error.value = integratorError(e)
  } finally {
    resending.value = false
  }
}
</script>
