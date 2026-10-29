<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div><h2 class="text-2xl font-bold text-[#142841]">Entreprises</h2>
        <p class="mt-2 text-sm text-slate-500">Sélectionnez une entreprise pour consulter les responsables associés.</p>
      </div>
      <button @click="load" :disabled="loading"
              class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
        Actualiser
      </button>
    </div>
    <div
        class="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="relative w-full sm:max-w-lg">
        <MagnifyingGlassIcon class="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400"/>
        <input v-model="search" placeholder="Rechercher par nom ou domaine…" aria-label="Rechercher une entreprise"
               class="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"/>
      </div>
      <span class="text-sm text-slate-500">{{ filtered.length }} entreprise(s)</span></div>
    <p v-if="loading" class="py-10 text-sm text-slate-500">Chargement…</p>
    <p v-else-if="error" role="alert" class="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>
    <div v-else class="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <TenantCard v-for="tenant in filtered" :key="String(tenant.guid)" :tenant="tenant"
                  @select="router.push(`/integrateur/tenants/${tenant.guid}/responsables`)"/>
    </div>
    <p v-if="!loading&&!error&&!filtered.length"
       class="mt-6 rounded-xl bg-white p-8 text-center text-sm text-slate-500">Aucune entreprise ne correspond à votre
      recherche.</p></div>
</template>
<script setup lang="ts">
import {ref, computed, onMounted} from 'vue';
import {useRouter} from 'vue-router';
import {MagnifyingGlassIcon} from '@heroicons/vue/24/outline';
import TenantCard from './components/TenantCard.vue';
import {useIntegratorStore} from '@/stores/integratorStore';
import {integratorError} from '@/service/IntegratorService';

const router = useRouter(), store = useIntegratorStore(), search = ref(''), loading = ref(false), error = ref('');
const filtered = computed(() => store.tenants.filter(t => `${t.name} ${t.subdomain}`.toLowerCase().includes(search.value.toLowerCase())));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    await store.loadTenants()
  } catch (e) {
    error.value = integratorError(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
