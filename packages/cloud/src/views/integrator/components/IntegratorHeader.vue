<template>
  <header
      class="sticky top-0 z-20 flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur lg:px-9">
    <div><p class="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Espace technique Toké</p>
      <h1 class="mt-1 text-xl font-bold tracking-tight text-[#12243d] sm:text-2xl">{{ title }}</h1></div>
    <div class="flex items-center gap-3">
      <div class="hidden text-right sm:block">
        <div class="text-xs font-semibold text-slate-700">Compte intégrateur</div>
        <div class="max-w-44 truncate text-xs text-slate-500">{{ store.email }}</div>
      </div>
      <button @click="signOut" :disabled="busy"
              class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">
        Déconnexion
      </button>
    </div>
  </header>
</template>
<script setup lang="ts">
import {ref} from 'vue'
import {useRouter} from 'vue-router'
import {useIntegratorStore} from '@/stores/integratorStore'
import {integratorError} from '@/service/IntegratorService'

defineProps<{ title: string }>();
const store = useIntegratorStore(), router = useRouter();
const busy = ref(false)

async function signOut() {
  busy.value = true;
  try {
    await store.logout();
    await router.replace('/integrateur/connexion')
  } catch (e) {
    alert(integratorError(e))
  } finally {
    busy.value = false
  }
}
</script>
