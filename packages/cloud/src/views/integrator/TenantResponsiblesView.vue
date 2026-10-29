<template>
  <div>
    <RouterLink to="/integrateur/tenants" class="inline-flex items-center gap-2 text-sm font-semibold text-[#2461bd]">
      <ArrowLeftIcon class="h-4 w-4"/>
      Retour aux entreprises
    </RouterLink>
    <div
        class="mt-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex items-start gap-4">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf1ff] text-[#2461bd]">
          <BuildingOffice2Icon class="h-7 w-7"/>
        </div>
        <div><p class="text-xs font-bold uppercase tracking-wider text-[#2461bd]">Entreprise sélectionnée</p>
          <h2 class="mt-2 text-2xl font-bold text-[#182b44]">{{ store.selectedTenant?.name || 'Chargement…' }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ store.selectedTenant?.subdomain }}</p></div>
      </div>
      <span class="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">Entreprise active</span>
    </div>
    <div class="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-6 py-5"><h3 class="text-lg font-bold text-[#182b44]">Responsables de
        l’entreprise</h3>
        <p class="mt-1 text-sm text-slate-500">Choisissez le compte auquel vous souhaitez accéder.</p>
        <div class="relative mt-5 max-w-md">
          <MagnifyingGlassIcon class="absolute left-3 top-3 h-5 w-5 text-slate-400"/>
          <input v-model="search" placeholder="Rechercher un responsable…"
                 class="w-full rounded-xl border border-slate-200 py-2.5 pl-11 pr-3 text-sm outline-none focus:border-blue-400"/>
        </div>
      </div>
      <p v-if="loading" class="p-7 text-sm text-slate-500">Chargement des responsables…</p>
      <p v-else-if="error" role="alert" class="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>
      <template v-else>
        <ResponsibleRow
            v-for="p in filtered"
            :key="String(p.guid)"
            :profile="p"
            :busy="opening === String(p.guid)"
            @open="open(p)"
        />
        <p v-if="!filtered.length" class="p-8 text-center text-sm text-slate-500">Aucun responsable trouvé.</p>
      </template>
    </div>
  </div>
</template>
<script setup lang="ts">import {computed, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {ArrowLeftIcon, BuildingOffice2Icon, MagnifyingGlassIcon} from '@heroicons/vue/24/outline';
import ResponsibleRow from './components/ResponsibleRow.vue';
import {useIntegratorStore} from '@/stores/integratorStore';
import {integratorError, type Responsible} from '@/service/IntegratorService';

const router = useRouter(), route = useRoute(), store = useIntegratorStore(), loading = ref(false), opening = ref(''),
    error = ref(''), search = ref('');

const filtered = computed(() =>
    store.responsibles.filter(p =>
        `${p.first_name} ${p.last_name} ${p.email} ${p.roles.join(' ')}`
            .toLowerCase()
            .includes(search.value.toLowerCase())
    )
)

async function load() {
  loading.value = true;
  error.value = '';
  try {
    await store.loadResponsibles(String(route.params.tenantGuid))
  } catch (e) {
    error.value = integratorError(e)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.tenantGuid, load, {immediate: true});

async function open(p: Responsible) {
  if (opening.value) return;
  opening.value = String(p.guid);
  error.value = '';
  try {
    await store.enterProfile(p);
    await router.push('/dashboard')
  } catch (e) {
    error.value = integratorError(e)
  } finally {
    opening.value = ''
  }
}
</script>
