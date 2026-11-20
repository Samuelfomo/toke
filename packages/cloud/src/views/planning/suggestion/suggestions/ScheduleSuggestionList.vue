<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-xl font-bold text-slate-900">Suggestions de planning</h1>
      <div class="flex flex-wrap gap-2">
        <button class="secondary-button" :disabled="loading" @click="loadSuggestions">
          <IconRefresh :size="16" :class="{ 'animate-spin': loading }" /> Actualiser
        </button>
        <button class="primary-button" :disabled="!managerGuid" @click="showGenerate = true">
          <IconSparkles :size="16" /> Créer une suggestion
        </button>
      </div>
    </header>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <div role="group" aria-label="Statut des suggestions" class="grid w-full grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:flex sm:w-auto">
        <button v-for="tab in tabs" :key="tab.key" type="button" class="tab-button"
            :aria-pressed="activeTab === tab.key" @click="activeTab = tab.key">
          {{ tab.label }}
          <span class="rounded-full bg-slate-500/15 px-1.5 py-0.5 text-xs tabular-nums">
            {{ loaded ? counts[tab.key] : '—' }}
          </span>
        </button>
      </div>
      <label class="relative block w-full sm:w-64">
        <span class="sr-only">Rechercher une période</span>
        <IconSearch :size="16" class="pointer-events-none absolute left-3 top-3 text-slate-500" aria-hidden="true" />
        <input v-model="search" type="search" placeholder="Rechercher une période…" class="search-control" />
      </label>
    </div>

    <PlanningInfoPanel v-if="errorMessage" tone="warning" title="Chargement impossible" :description="errorMessage" />

    <section aria-label="Suggestions" :aria-busy="loading">
      <div v-if="loading && !loaded" class="suggestion-grid" role="status">
        <span class="sr-only">Chargement des suggestions…</span>
        <div v-for="index in 6" :key="index" class="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
      </div>

      <div v-else-if="loaded && !filteredSuggestions.length" class="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <IconFileDescription :size="26" class="mx-auto text-slate-400" aria-hidden="true" />
        <p class="mt-2 text-sm font-bold text-slate-800">{{ emptyTitle }}</p>
        <p class="mt-1 text-xs text-slate-600">{{ emptyDescription }}</p>
        <button v-if="!search.trim() && activeTab === 'all'" type="button" class="primary-button mx-auto mt-3"
            :disabled="!managerGuid" @click="showGenerate = true">
          <IconSparkles :size="16" /> Créer une première suggestion
        </button>
      </div>

      <ul v-else-if="visibleSuggestions.length" class="suggestion-grid">
        <li v-for="{ suggestion, summary } in visibleCards" :key="suggestion.guid" class="suggestion-card group min-w-0">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 class="text-sm font-bold leading-tight text-slate-900">
              {{ formatDate(suggestion.period_from) }} – {{ formatDate(suggestion.period_to) }}
            </h2>
            <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="statusClass(suggestion.status)">
              {{ statusLabel(suggestion.status) }}
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span>{{ employeeLabel(suggestion) }}</span>
          </div>
          <div v-if="summary" class="flex flex-wrap items-center gap-x-2 text-xs font-semibold"
              :class="summary.critical ? 'text-red-800' : summary.warnings ? 'text-amber-900' : 'text-emerald-800'">
            <span>{{ summary.label }}</span>
            <RouterLink v-if="summary.critical || summary.warnings"
                :to="{ name: 'planning-suggestion-preview', params: { guid: suggestion.guid }, query: { panel: 'alerts' } }"
                class="relative z-10 py-1 underline">Voir les détails<span class="sr-only"> des alertes du {{ formatDate(suggestion.period_from) }}</span></RouterLink>
          </div>
          <RouterLink :to="{ name: 'planning-suggestion-preview', params: { guid: suggestion.guid } }"
              class="card-link mt-auto inline-flex items-center gap-1 text-xs font-bold text-blue-700 group-hover:underline">
            Consulter <span class="sr-only">la suggestion du {{ formatDate(suggestion.period_from) }}</span><IconChevronRight :size="15" aria-hidden="true" />
          </RouterLink>
        </li>
      </ul>

      <nav v-if="pageCount > 1" aria-label="Pagination des suggestions" class="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button type="button" class="secondary-button" :disabled="page === 1" @click="page--">Précédent</button>
        <span aria-live="polite" class="text-xs font-semibold text-slate-700">Page {{ page }} / {{ pageCount }}</span>
        <button type="button" class="secondary-button" :disabled="page === pageCount" @click="page++">Suivant</button>
      </nav>
    </section>

    <GenerateSuggestionModal :open="showGenerate" :manager-guid="managerGuid"
        @close="showGenerate = false" @generated="onGenerated" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconChevronRight,
  IconFileDescription,
  IconRefresh,
  IconSearch,
  IconSparkles,
} from '@tabler/icons-vue'
import { useUserStore } from '@/stores/userStore'
import ScheduleSuggestionService from '@/service/ScheduleSuggestionService'
import { planningAlerts, planningAlertSummary } from './suggestionAlerts'
import PlanningInfoPanel from '../components/PlanningInfoPanel.vue'
import GenerateSuggestionModal from './GenerateSuggestionModal.vue'
import {
  formatDate,
  responseData,
  responseError,
} from '../planningSuggestion.helpers'
import type {
  ScheduleSuggestion,
  ScheduleSuggestionListItem,
  SuggestionStatus,
} from '../planningSuggestion.type'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const errorMessage = ref('')
const search = ref('')
const tabs = [
  { key: 'all', label: 'Toutes' },
  { key: 'draft', label: 'À vérifier' },
  { key: 'approved', label: 'Publiées' },
  { key: 'rejected', label: 'Archives' },
] as const
const activeTab = ref<(typeof tabs)[number]['key']>('all')
const suggestions = ref<ScheduleSuggestionListItem[]>([])
const loaded = ref(false)
const showGenerate = ref(false)
const page = ref(1)
const cardsPerPage = 12
const apiPageSize = 50
let loadRequest = 0

const managerGuid = computed(() => userStore.user?.guid ?? '')
const counts = computed(() => suggestions.value.reduce((result, item) => {
  result.all++
  result[item.status]++
  return result
}, { all: 0, draft: 0, approved: 0, rejected: 0 }))

const filteredSuggestions = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('fr')
  return suggestions.value.filter(item =>
    (activeTab.value === 'all' || item.status === activeTab.value) &&
    (!query || [
      item.period_from, item.period_to,
      formatDate(item.period_from), formatDate(item.period_to), statusLabel(item.status),
    ].some(value => value.toLocaleLowerCase('fr').includes(query))),
  )
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredSuggestions.value.length / cardsPerPage)))
const visibleSuggestions = computed(() =>
  filteredSuggestions.value.slice((page.value - 1) * cardsPerPage, page.value * cardsPerPage),
)
const visibleCards = computed(() => visibleSuggestions.value.map(suggestion => ({
  suggestion,
  summary: planningAlertSummary(planningAlerts(suggestion.diagnostics)),
})))
watch([activeTab, search], () => { page.value = 1 })
watch(pageCount, value => { page.value = Math.min(page.value, value) })

const emptyTitle = computed(() => {
  if (search.value.trim()) return 'Aucun résultat'
  return ({
    all: 'Aucune suggestion disponible',
    draft: 'Aucune suggestion à vérifier',
    approved: 'Aucune suggestion publiée',
    rejected: 'Aucune archive',
  })[activeTab.value]
})
const emptyDescription = computed(() => {
  if (search.value.trim()) return 'Essayez une autre période ou consultez un autre onglet.'
  if (activeTab.value === 'rejected') return 'Les suggestions rejetées apparaîtront ici.'
  return 'Créez une suggestion pour préparer un nouveau planning.'
})

async function loadSuggestions(): Promise<void> {
  const request = ++loadRequest
  const manager = managerGuid.value
  if (!manager) {
    loading.value = false
    errorMessage.value = 'Toké ne parvient pas à identifier le responsable connecté. Reconnectez-vous puis réessayez.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const results = new Map<string, ScheduleSuggestionListItem>()
    for (let offset = 0; ; offset += apiPageSize) {
      const response = await ScheduleSuggestionService.list(manager, { offset, limit: apiPageSize })
      if (request !== loadRequest) return
      if (!response.success) throw response
      const data = responseData(response)
      const items = data.schedule_suggestions?.items ?? data.suggestions?.items
      if (!Array.isArray(items)) throw new Error('Les suggestions reçues sont illisibles.')

      const previousSize = results.size
      for (const item of items) results.set(item.guid, item)
      if (items.length < apiPageSize) break
      if (results.size === previousSize) {
        throw new Error('La liste n’a pas pu être chargée en entier. Réessayez.')
      }
    }
    suggestions.value = [...results.values()]
    loaded.value = true
  } catch (error) {
    if (request === loadRequest) {
      errorMessage.value = responseError(error, 'Impossible de charger les suggestions.')
    }
  } finally {
    if (request === loadRequest) loading.value = false
  }
}

watch(managerGuid, () => {
  suggestions.value = []
  loaded.value = false
  page.value = 1
  void loadSuggestions()
}, { immediate: true })

function openSuggestion(guid: string): void {
  router.push({ name: 'planning-suggestion-preview', params: { guid } })
}

function onGenerated(suggestion: ScheduleSuggestion): void {
  showGenerate.value = false
  openSuggestion(suggestion.guid)
}

function statusClass(status: SuggestionStatus): string {
  return {
    draft: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200',
    rejected: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
  }[status]
}

function statusLabel(status: SuggestionStatus): string {
  return { draft: 'À vérifier', approved: 'Publié', rejected: 'Rejeté' }[status]
}

function employeeLabel(suggestion: ScheduleSuggestionListItem): string {
  const count = suggestion.items?.length ?? suggestion.diagnostics?.generationScope?.includedEmployeeCount
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) return 'Effectif non renseigné'
  return `${count} collaborateur${count === 1 ? '' : 's'}`
}
</script>

<style scoped>
.primary-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 0.75rem;
  padding: 0.68rem 1rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.primary-button {
  background: #1d4ed8;
  color: #fff;
}

.primary-button:hover:not(:disabled) {
  background: #1e40af;
}

.secondary-button {
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569;
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.tab-button {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: .4rem;
  border-radius: 0.6rem;
  padding: 0.55rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
}

.tab-button[aria-pressed="true"] {
  background: #004aad;
  color: #fff;
}

.search-control {
  min-height: 42px;
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 0.8rem;
  color: #334155;
  outline: none;
}

.search-control {
  padding: 0.65rem 0.75rem 0.65rem 2.25rem;
}

.search-control:focus,
.tab-button:focus-visible,
.suggestion-card a:focus-visible,
.primary-button:focus-visible,
.secondary-button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.suggestion-grid { display: grid; gap: .65rem; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 640px) { .suggestion-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .suggestion-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.suggestion-card {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: .45rem;
  padding: .75rem;
  border: 1px solid #e2e8f0;
  border-radius: .75rem;
  background: white;
  text-decoration: none;
}
.card-link::after { content: ""; position: absolute; inset: 0; border-radius: inherit; }
.suggestion-card:hover { border-color: #93c5fd; background: #f8fbff; }
</style>
