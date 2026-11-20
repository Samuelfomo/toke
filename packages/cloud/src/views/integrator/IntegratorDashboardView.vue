<template>
  <div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div><p class="text-sm font-semibold text-[#2461bd]">Bienvenue dans votre espace</p>
        <h2 class="mt-2 text-2xl font-bold tracking-tight text-[#162940]">Votre console, toutes vos entreprises.</h2>
        <p class="mt-2 text-sm text-slate-500">Retrouvez les entreprises accessibles et choisissez un responsable pour
          intervenir.</p></div>
      <RouterLink to="/integrateur/tenants"
                  class="rounded-xl bg-[#2461bd] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/10 hover:bg-[#1c4f9a]">
        Explorer les entreprises →
      </RouterLink>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2461bd]">
          <BuildingOffice2Icon class="h-6 w-6"/>
        </div>
        <p class="mt-5 text-3xl font-bold tabular-nums text-[#192d45]">{{ store.tenantCount }}</p>
        <p class="mt-1 text-sm text-slate-500">Entreprises actives accessibles</p></div>
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <ShieldCheckIcon class="h-6 w-6"/>
        </div>
        <p class="mt-5 text-base font-bold text-[#192d45]">Session connectée</p>
        <p class="mt-2 truncate text-sm text-slate-500">{{ store.email }}</p></div>
    </div>
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="mb-5 flex items-center justify-between">
        <div><h3 class="text-lg font-bold text-[#182b44]">Entreprises disponibles</h3>
          <p class="mt-1 text-sm text-slate-500">Sélectionnez une entreprise pour voir ses responsables.</p></div>
        <RouterLink to="/integrateur/tenants" class="text-sm font-semibold text-[#2461bd]">Tout afficher</RouterLink>
      </div>
      <p v-if="loading" class="py-8 text-sm text-slate-500">Chargement des entreprises…</p>
      <p v-else-if="error" role="alert" class="rounded-lg bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>
      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TenantCard v-for="tenant in store.tenants.slice(0,6)" :key="String(tenant.guid)" :tenant="tenant"
                    @select="router.push(`/integrateur/tenants/${tenant.guid}/responsables`)"/>
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {useRouter} from 'vue-router';
import {BuildingOffice2Icon, ShieldCheckIcon} from '@heroicons/vue/24/outline';
import TenantCard from './components/TenantCard.vue';
import {useIntegratorStore} from '@/stores/integratorStore';
import {integratorError} from '@/service/IntegratorService';

const router = useRouter(), store = useIntegratorStore(), loading = ref(false), error = ref('');
onMounted(async () => {
  loading.value = true;
  try {
    await store.loadTenants()
  } catch (e) {
    error.value = integratorError(e)
  } finally {
    loading.value = false
  }
})
</script>
