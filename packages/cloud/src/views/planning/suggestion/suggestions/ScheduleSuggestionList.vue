<template>
  <div class="space-y-6">
    <PlanningPageHeader eyebrow="Étape 4" title="Suggestions de planning"
                        description="Une suggestion est un brouillon contrôlable. Elle n’apparaît dans les affectations officielles qu’après validation et publication.">
      <template #actions>
        <button class="secondary-button" :disabled="loading" @click="loadSuggestions">
          <IconRefresh :size="16" :class="{'animate-spin':loading}"/>
          Actualiser
        </button>
        <button class="primary-button" @click="showGenerate=true">
          <IconSparkles :size="16"/>
          Nouvelle génération
        </button>
      </template>
    </PlanningPageHeader>
    <PlanningInfoPanel title="Cycle de vie d’une suggestion"
                       description="La génération ne publie jamais directement un planning."
                       :examples="['Brouillon : modifiable et invisible dans les affectations officielles.','Approuvé : validé puis publié sous forme d’affectations.','Rejeté : conservé uniquement dans les archives pour la traçabilité.']"
                       important="La liste principale exclut volontairement les suggestions rejetées."/>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <button class="tab-button" :class="activeTab==='active'?'active':''" @click="activeTab='active'">Suggestions
          utiles
        </button>
        <button class="tab-button" :class="activeTab==='archives'?'active':''" @click="activeTab='archives'">Archives
          rejetées
        </button>
      </div>
      <div class="relative w-full sm:w-72">
        <IconSearch :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input v-model="search" type="search" placeholder="Rechercher par période…" class="search-control"/></div>
    </div>
    <PlanningInfoPanel v-if="errorMessage" tone="warning" title="Chargement impossible" :description="errorMessage"/>
    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div v-if="loading" class="space-y-3 p-5">
        <div v-for="i in 5" :key="i" class="h-20 animate-pulse rounded-xl bg-slate-100"/>
      </div>
      <div v-else-if="filteredSuggestions.length===0" class="px-6 py-16 text-center">
        <IconFileDescription :size="28" class="mx-auto text-slate-300"/>
        <p class="mt-3 text-sm font-bold text-slate-800">
          {{ activeTab === 'archives' ? 'Aucune suggestion rejetée' : 'Aucune suggestion disponible' }}</p>
        <p class="mt-1 text-xs text-slate-500">
          {{
            activeTab === 'archives' ? 'Les propositions abandonnées apparaîtront ici pour la traçabilité.' : 'Lancez une génération après avoir validé la configuration.'
          }}</p>
      </div>
      <div v-else class="divide-y divide-slate-100">
        <button v-for="s in filteredSuggestions" :key="s.guid"
                class="group flex w-full flex-col gap-4 px-5 py-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                @click="openSuggestion(s.guid)">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl" :class="statusClass(s.status).icon">
              <IconFileDescription :size="19"/>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2"><p class="text-sm font-bold text-slate-900">
                {{ formatDate(s.period_from) }} <span class="font-normal text-slate-400">→</span>
                {{ formatDate(s.period_to) }}</p><span class="rounded-full px-2 py-.5 text-[9px] font-bold uppercase"
                                                       :class="statusClass(s.status).badge">{{
                  STATUS_LABELS[s.status]
                }}</span>
              </div>
              <p class="mt-1 text-xs text-slate-500">{{ s.configuration?.name ?? 'Configuration non renseignée' }}<span
                  v-if="s.configuration"> · version {{ s.configuration.version }}</span></p></div>
          </div>
          <div class="flex items-center gap-5">
            <div class="text-right"><p class="text-[9px] font-bold uppercase text-slate-400">Conformité</p>
              <p class="mt-.5 text-lg font-bold text-slate-900">{{ s.conformity_score ?? '—' }}<span
                  v-if="s.conformity_score!==null" class="text-xs text-slate-400">%</span></p></div>
            <IconChevronRight :size="18" class="text-slate-300 group-hover:text-slate-600"/>
          </div>
        </button>
      </div>
    </section>
    <GenerateSuggestionModal :open="showGenerate" :manager-guid="managerGuid" @close="showGenerate=false"
                             @generated="onGenerated"/>
  </div>
</template>
<script setup lang="ts">import {computed, onMounted, ref} from 'vue';
import {useRouter} from 'vue-router';
import {IconChevronRight, IconFileDescription, IconRefresh, IconSearch, IconSparkles} from '@tabler/icons-vue';
import {useUserStore} from '@/stores/userStore';
import ScheduleSuggestionService from '@/service/ScheduleSuggestionService';
import PlanningInfoPanel from '../components/PlanningInfoPanel.vue';
import PlanningPageHeader from '../components/PlanningPageHeader.vue';
import GenerateSuggestionModal from './GenerateSuggestionModal.vue';
import {formatDate, responseData, responseError, STATUS_LABELS} from '../planningSuggestion.helpers';
import type {ScheduleSuggestion, ScheduleSuggestionListItem, SuggestionStatus} from '../planningSuggestion.type';

const router = useRouter(), userStore = useUserStore();
const loading = ref(false), errorMessage = ref(''), search = ref(''), activeTab = ref<'active' | 'archives'>('active'),
    suggestions = ref<ScheduleSuggestionListItem[]>([]), showGenerate = ref(false);
const managerGuid = computed(() => userStore.user?.guid ?? '');
const filteredSuggestions = computed(() => {
  const statusFiltered = suggestions.value.filter(s => activeTab.value === 'archives' ? s.status === 'rejected' : s.status !== 'rejected');
  const q = search.value.trim().toLowerCase();
  return q ? statusFiltered.filter(s => [s.period_from, s.period_to, STATUS_LABELS[s.status], s.configuration?.name].filter(Boolean).some(v => String(v).toLowerCase().includes(q))) : statusFiltered
});

async function loadSuggestions() {
  if (!managerGuid.value) {
    errorMessage.value = 'Le compte connecté ne fournit pas de GUID manager.';
    return
  }
  loading.value = true;
  errorMessage.value = '';
  try {
    const r = await ScheduleSuggestionService.list(managerGuid.value, {offset: 0, limit: 100});
    const d = responseData(r);
    suggestions.value = d.schedule_suggestions?.items ?? d.suggestions?.items ?? []
  } catch (e: any) {
    errorMessage.value = responseError(e, 'Impossible de charger les suggestions.')
  } finally {
    loading.value = false
  }
}

function openSuggestion(guid: string) {
  router.push({name: 'planning-suggestion-preview', params: {guid}})
}

function onGenerated(s: ScheduleSuggestion) {
  showGenerate.value = false;
  openSuggestion(s.guid)
}

function statusClass(s: SuggestionStatus) {
  return {
    draft: {icon: 'bg-amber-50 text-amber-700', badge: 'bg-amber-50 text-amber-700'},
    approved: {icon: 'bg-emerald-50 text-emerald-700', badge: 'bg-emerald-50 text-emerald-700'},
    rejected: {icon: 'bg-slate-100 text-slate-500', badge: 'bg-slate-100 text-slate-600'}
  }[s]
}

onMounted(loadSuggestions)
</script>
<style scoped>.primary-button, .secondary-button {
  display: inline-flex;
  align-items: center;
  gap: .45rem;
  border-radius: .75rem;
  padding: .65rem 1rem;
  font-size: .75rem;
  font-weight: 700
}

.primary-button {
  background: #4f46e5;
  color: #fff
}

.secondary-button {
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569
}

.tab-button {
  border-radius: .55rem;
  padding: .5rem .75rem;
  font-size: .72rem;
  font-weight: 650;
  color: #64748b
}

.tab-button.active {
  background: #0f172a;
  color: #fff
}

.search-control {
  width: 100%;
  border-radius: .75rem;
  border: 1px solid #e2e8f0;
  background: white;
  padding: .65rem .75rem .65rem 2.25rem;
  font-size: .75rem;
  outline: none
}

.search-control:focus {
  border-color: #a5b4fc;
  box-shadow: 0 0 0 3px #e0e7ff
}</style>
