<template>
  <IntegratorAuthLayout>
    <div
        class="mb-9 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-[#225fbd]">
      <LockClosedIcon class="h-6 w-6"/>
    </div>
    <p class="text-xs font-bold uppercase tracking-[.17em] text-[#225fbd]">Connexion sécurisée</p>
    <h2 class="mt-3 text-[30px] font-bold leading-tight tracking-tight text-[#142640] sm:text-[34px]">Accédez à votre
      console</h2>
    <p class="mt-4 text-sm leading-7 text-slate-500">Renseignez votre adresse intégrateur autorisée. Nous vous enverrons
      un code pour confirmer votre identité.</p>
    <form class="mt-9 space-y-5" @submit.prevent="submit">
      <div><label for="integrator-email" class="mb-2 block text-sm font-semibold text-slate-700">Adresse email
        professionnelle</label>
        <input id="integrator-email" v-model.trim="email" required type="email" autocomplete="email" autofocus
               placeholder="nom@entreprise.cm" :disabled="busy"
               class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-[#2867d0] focus:ring-4 focus:ring-blue-100 disabled:opacity-60"/>
      </div>
      <p v-if="error" role="alert" class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ error }}</p>
      <button type="submit" :disabled="busy || !email"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#225fbd] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#194f9b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#225fbd] disabled:cursor-not-allowed disabled:opacity-60">
        <span>{{ busy ? 'Envoi du code…' : 'Continuer avec mon email' }}</span>
        <ArrowRightIcon v-if="!busy" class="h-4 w-4"/>
      </button>
    </form>
    <div class="mt-9 flex items-start gap-2.5 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-500">
      <ShieldCheckIcon class="mt-0.5 h-4 w-4 shrink-0 text-[#225fbd]"/>
      <span>Accès réservé au personnel technique habilité. Aucun code n'est envoyé aux responsables des entreprises.</span>
    </div>
  </IntegratorAuthLayout>
</template>
<script setup lang="ts">
import {ref, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {LockClosedIcon, ArrowRightIcon, ShieldCheckIcon} from '@heroicons/vue/24/outline'
import IntegratorAuthLayout from './layouts/IntegratorAuthLayout.vue'
import {useIntegratorStore} from '@/stores/integratorStore'
import {integratorError} from '@/service/IntegratorService'

const router = useRouter()
const store = useIntegratorStore()
const email = ref('')
const busy = ref(false)
const error = ref('')
onMounted(() => {
  email.value = store.email
})

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await store.request(email.value)
    await router.push('/integrateur/verification')
  } catch (e) {
    error.value = integratorError(e)
  } finally {
    busy.value = false
  }
}
</script>
