<template>
  <div class="space-y-6">
    <PlanningPageHeader
      eyebrow="Étape 4"
      title="Suggestions de planning"
      description="Générez un brouillon, contrôlez ses alertes puis publiez-le uniquement après validation explicite."
    >
      <template #actions>
        <button class="secondary-button" :disabled="loading" @click="loadSuggestions">
          <IconRefresh :size="16" :class="{ 'animate-spin': loading }" />
          Actualiser
        </button>
        <button class="primary-button" :disabled="!managerGuid" @click="showGenerate = true">
          <IconSparkles :size="16" />
          Nouvelle génération
        </button>
      </template>
    </PlanningPageHeader>

    <PlanningInfoPanel
      title="Cycle de vie d’une suggestion"
      description="La génération ne publie jamais directement un planning."
      :examples="[
        'Brouillon : modifiable et invisible dans les affectations officielles.',
        'Approuvé : validé puis publié sous forme d’affectations.',
        'Rejeté : conservé uniquement dans les archives pour la traçabilité.',
      ]"
      important="Les suggestions présentant des violations dures ou une couverture sous le minimum ne peuvent pas être publiées."
    />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SuggestionListMetric
        label="Brouillons"
        :value="draftSuggestions.length"
        description="À vérifier avant publication"
        tone="amber"
      />
      <SuggestionListMetric
        label="Publiés"
        :value="approvedSuggestions.length"
        description="Affectations officielles créées"
        tone="emerald"
      />
      <SuggestionListMetric
        label="Rejetés"
        :value="rejectedSuggestions.length"
        description="Conservés dans les archives"
        tone="slate"
      />
      <SuggestionListMetric
        label="Conformité moyenne"
        :value="averageConformity"
        suffix="%"
        description="Sur les suggestions chargées"
        tone="blue"
      />
    </div>

    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1">
        <button
          class="tab-button"
          :class="activeTab === 'active' ? 'active' : ''"
          @click="activeTab = 'active'"
        >
          Suggestions utiles
          <span class="ml-1 rounded-full bg-white/15 px-1.5 py-0.5 text-xs">{{ activeSuggestions.length }}</span>
        </button>
        <button
          class="tab-button"
          :class="activeTab === 'archives' ? 'active' : ''"
          @click="activeTab = 'archives'"
        >
          Archives rejetées
          <span class="ml-1 rounded-full bg-white/15 px-1.5 py-0.5 text-xs">{{ rejectedSuggestions.length }}</span>
        </button>
      </div>

      <div class="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
        <select v-model="statusFilter" class="filter-control sm:w-44">
          <option value="ALL">Tous les états</option>
          <option value="draft">Brouillons</option>
          <option value="approved">Publiés</option>
          <option value="rejected">Rejetés</option>
        </select>
        <div class="relative w-full sm:w-72">
          <IconSearch :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            v-model="search"
            type="search"
            placeholder="Période, configuration, état…"
            class="search-control"
          />
        </div>
      </div>
    </div>

    <PlanningInfoPanel
      v-if="errorMessage"
      tone="warning"
      title="Chargement impossible"
      :description="errorMessage"
    />

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div v-if="loading" class="space-y-3 p-5">
        <div v-for="index in 5" :key="index" class="h-24 animate-pulse rounded-xl bg-slate-100" />
      </div>

      <div v-else-if="filteredSuggestions.length === 0" class="px-6 py-16 text-center">
        <IconFileDescription :size="30" class="mx-auto text-slate-300" />
        <p class="mt-3 text-sm font-bold text-slate-800">
          {{ activeTab === 'archives' ? 'Aucune suggestion rejetée' : 'Aucune suggestion disponible' }}
        </p>
        <p class="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
          {{ emptyDescription }}
        </p>
        <button
          v-if="activeTab === 'active' && !search && statusFilter === 'ALL'"
          type="button"
          class="primary-button mx-auto mt-5"
          @click="showGenerate = true"
        >
          <IconSparkles :size="16" />
          Générer une première proposition
        </button>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <button
          v-for="suggestion in filteredSuggestions"
          :key="suggestion.guid"
          class="group flex w-full flex-col gap-4 px-5 py-5 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
          @click="openSuggestion(suggestion.guid)"
        >
          <div class="flex min-w-0 items-start gap-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              :class="statusClass(suggestion.status).icon"
            >
              <IconFileDescription :size="20" />
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-sm font-bold text-slate-900">
                  {{ formatDate(suggestion.period_from) }}
                  <span class="font-normal text-slate-400">→</span>
                  {{ formatDate(suggestion.period_to) }}
                </p>
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-bold"
                  :class="statusClass(suggestion.status).badge"
                >
                  {{ STATUS_LABELS[suggestion.status] }}
                </span>
              </div>
              <p class="mt-1.5 truncate text-xs text-slate-500">
                {{ suggestion.configuration?.name ?? 'Configuration non renseignée' }}
                <span v-if="suggestion.configuration"> · version {{ suggestion.configuration.version }}</span>
              </p>
              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>{{ suggestion.items?.length ?? '—' }} collaborateur(s)</span>
                <span v-if="suggestion.created_at">Créé le {{ formatDateTime(suggestion.created_at) }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between gap-5 sm:justify-end">
            <div class="text-left sm:text-right">
              <p class="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Conformité</p>
              <p
                class="mt-0.5 text-xl font-bold"
                :class="conformityClass(suggestion.conformity_score)"
              >
                {{ suggestion.conformity_score ?? '—' }}
                <span v-if="suggestion.conformity_score !== null" class="text-xs text-slate-400">%</span>
              </p>
            </div>
            <IconChevronRight :size="19" class="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
          </div>
        </button>
      </div>
    </section>

    <GenerateSuggestionModal
      :open="showGenerate"
      :manager-guid="managerGuid"
      @close="showGenerate = false"
      @generated="onGenerated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref } from 'vue'
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
import PlanningInfoPanel from '../components/PlanningInfoPanel.vue'
import PlanningPageHeader from '../components/PlanningPageHeader.vue'
import GenerateSuggestionModal from './GenerateSuggestionModal.vue'
import {
  formatDate,
  responseData,
  responseError,
  STATUS_LABELS,
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
const activeTab = ref<'active' | 'archives'>('active')
const statusFilter = ref<'ALL' | SuggestionStatus>('ALL')
const suggestions = ref<ScheduleSuggestionListItem[]>([])
const showGenerate = ref(false)

const managerGuid = computed(() => userStore.user?.guid ?? '')
const draftSuggestions = computed(() => suggestions.value.filter((item) => item.status === 'draft'))
const approvedSuggestions = computed(() => suggestions.value.filter((item) => item.status === 'approved'))
const rejectedSuggestions = computed(() => suggestions.value.filter((item) => item.status === 'rejected'))
const activeSuggestions = computed(() => suggestions.value.filter((item) => item.status !== 'rejected'))
const averageConformity = computed(() => {
  const values = suggestions.value
    .map((item) => item.conformity_score)
    .filter((value): value is number => typeof value === 'number')
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0
})

const filteredSuggestions = computed(() => {
  const byTab = suggestions.value.filter((item) =>
    activeTab.value === 'archives' ? item.status === 'rejected' : item.status !== 'rejected',
  )
  const byStatus = statusFilter.value === 'ALL'
    ? byTab
    : byTab.filter((item) => item.status === statusFilter.value)
  const query = search.value.trim().toLocaleLowerCase('fr')
  if (!query) return byStatus

  return byStatus.filter((item) =>
    [
      item.period_from,
      item.period_to,
      STATUS_LABELS[item.status],
      item.configuration?.name,
      item.configuration?.version,
      item.conformity_score,
    ]
      .filter((value) => value !== null && value !== undefined)
      .some((value) => String(value).toLocaleLowerCase('fr').includes(query)),
  )
})

const emptyDescription = computed(() => {
  if (search.value || statusFilter.value !== 'ALL') {
    return 'Aucune suggestion ne correspond aux filtres actuels.'
  }
  return activeTab.value === 'archives'
    ? 'Les propositions rejetées apparaîtront ici pour assurer la traçabilité.'
    : 'Lancez une génération après avoir validé les profils, les besoins et la configuration.'
})

async function loadSuggestions(): Promise<void> {
  if (!managerGuid.value) {
    errorMessage.value = 'Le compte connecté ne fournit pas de GUID manager.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await ScheduleSuggestionService.list(managerGuid.value, {
      offset: 0,
      limit: 100,
    })
    const data = responseData(response)
    suggestions.value =
      data.schedule_suggestions?.items ?? data.suggestions?.items ?? []
  } catch (error: any) {
    errorMessage.value = responseError(
      error,
      'Impossible de charger les suggestions.',
    )
  } finally {
    loading.value = false
  }
}

function openSuggestion(guid: string): void {
  router.push({ name: 'planning-suggestion-preview', params: { guid } })
}

function onGenerated(suggestion: ScheduleSuggestion): void {
  showGenerate.value = false
  openSuggestion(suggestion.guid)
}

function statusClass(status: SuggestionStatus) {
  return {
    draft: {
      icon: 'bg-amber-50 text-amber-700',
      badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    },
    approved: {
      icon: 'bg-emerald-50 text-emerald-700',
      badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    },
    rejected: {
      icon: 'bg-slate-100 text-slate-500',
      badge: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
    },
  }[status]
}

function conformityClass(value: number | null): string {
  if (value === null) return 'text-slate-500'
  if (value >= 90) return 'text-emerald-700'
  if (value >= 75) return 'text-amber-700'
  return 'text-red-700'
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Douala',
  }).format(date)
}

const SuggestionListMetric = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: Number, required: true },
    suffix: { type: String, default: '' },
    description: { type: String, required: true },
    tone: { type: String, default: 'blue' },
  },
  setup(props) {
    const tones: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-700',
      amber: 'bg-amber-50 text-amber-700',
      emerald: 'bg-emerald-50 text-emerald-700',
      slate: 'bg-slate-100 text-slate-700',
    }
    return () =>
      h('article', { class: 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm' }, [
        h('p', { class: 'text-xs font-bold uppercase tracking-[0.12em] text-slate-400' }, props.label),
        h('div', { class: 'mt-2 flex items-end justify-between gap-3' }, [
          h('p', { class: `rounded-xl px-3 py-1.5 text-xl font-bold ${tones[props.tone] ?? tones.blue}` }, `${props.value}${props.suffix}`),
        ]),
        h('p', { class: 'mt-2 text-xs leading-5 text-slate-500' }, props.description),
      ])
  },
})

onMounted(loadSuggestions)
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
  border-radius: 0.6rem;
  padding: 0.55rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
}

.tab-button.active {
  background: #0f172a;
  color: #fff;
}

.search-control,
.filter-control {
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

.filter-control {
  padding: 0.65rem 0.75rem;
}

.search-control:focus,
.filter-control:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px #dbeafe;
}
</style>
