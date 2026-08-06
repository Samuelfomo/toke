<template>
  <div class="space-y-6">
    <PlanningPageHeader
      eyebrow="Étape 2"
      title="Besoins de couverture hebdomadaires"
      description="Comparez les services sur toute la semaine, repérez les jours incomplets et ouvrez une cellule pour créer ou modifier une règle."
    >
      <template #actions>
        <button class="secondary-button" :disabled="loading" @click="loadRequirements">
          <IconRefresh :size="16" :class="{ 'animate-spin': loading }" />
          Actualiser
        </button>
        <button class="primary-button" :disabled="!activeConfig" @click="openCreate(null, null)">
          <IconPlus :size="16" />
          Ajouter un besoin
        </button>
      </template>
    </PlanningPageHeader>

    <PlanningInfoPanel
      title="Lire la matrice"
      description="Une ligne correspond à un service ou à une garde. Les colonnes représentent les jours de la semaine."
      :examples="[
        'Une cellule vide signifie qu’aucune règle de ce service n’existe pour le jour concerné.',
        'Minimum / cible / maximum est affiché sous la forme 2 / 3 / 4.',
        'Plusieurs règles dans une cellule sont autorisées lorsqu’elles ciblent des populations différentes.',
      ]"
      important="Les doublons exacts sont signalés en rouge et doivent être corrigés avant la génération."
    />

    <PlanningInfoPanel
      v-if="!activeConfig && !loading"
      tone="warning"
      title="Aucune configuration active"
      description="Les besoins doivent être rattachés à une configuration de planification active."
      important="Créez ou activez une configuration avant d’ajouter des besoins."
    />

    <PlanningInfoPanel
      v-if="errorMessage"
      tone="warning"
      title="Chargement impossible"
      :description="errorMessage"
    />

    <div v-if="loading" class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div v-for="index in 5" :key="index" class="h-28 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <div class="h-[420px] animate-pulse rounded-2xl bg-slate-100" />
    </div>

    <template v-else>
      <RequirementSummary :summary="coverageSummary" />

      <div
        v-if="coverageSummary.uncoveredDays.length || coverageSummary.duplicateGroupCount"
        class="grid gap-3 lg:grid-cols-2"
      >
        <div
          v-if="coverageSummary.uncoveredDays.length"
          class="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <IconCalendarOff :size="19" class="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p class="text-xs font-bold text-amber-900">Journées sans couverture active</p>
            <p class="mt-1 text-xs leading-4 text-amber-700">
              {{ uncoveredDaysLabel }}. Le moteur ne pourra garantir aucun effectif sur ces journées.
            </p>
          </div>
        </div>

        <div
          v-if="coverageSummary.duplicateGroupCount"
          class="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <IconAlertTriangle :size="19" class="mt-0.5 shrink-0 text-red-600" />
          <div>
            <p class="text-xs font-bold text-red-900">Doublons exacts détectés</p>
            <p class="mt-1 text-xs leading-4 text-red-700">
              {{ coverageSummary.duplicateRequirementCount }} règle(s) décrivent exactement la même couverture. Ouvrez les cellules rouges pour les corriger.
            </p>
          </div>
        </div>
      </div>

      <WeeklyRequirementMatrix
        :rows="matrixRows"
        :duplicate-guids="duplicateGuids"
        @edit="openEdit"
        @create="openCreate"
      />

      <div
        v-if="coverageSummary.inactiveCount"
        class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600"
      >
        <strong>{{ coverageSummary.inactiveCount }} règle(s) inactive(s)</strong> restent visibles dans la matrice avec un style atténué, mais ne sont pas prises en compte dans la couverture.
      </div>
    </template>

    <PlanningRequirementForm
      :open="showForm"
      :config-guid="activeConfig?.guid ?? ''"
      :requirement="editTarget"
      :seed-requirement="seedTarget"
      :existing-requirements="requirements"
      :initial-day="initialDay"
      @close="closeForm"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  IconAlertTriangle,
  IconCalendarOff,
  IconPlus,
  IconRefresh,
} from '@tabler/icons-vue'

import PlanningSuggestionConfigService from '@/service/PlanningSuggestionConfigService'
import PlanningSuggestionRequirementService from '@/service/PlanningSuggestionRequirementService'

import PlanningInfoPanel from '../components/PlanningInfoPanel.vue'
import PlanningPageHeader from '../components/PlanningPageHeader.vue'
import { DAY_LABELS, responseData, responseError } from '../planningSuggestion.helpers'
import type {
  PlanningDayKey,
  PlanningRequirement,
  PlanningSuggestionConfig,
} from '../planningSuggestion.type'
import PlanningRequirementForm from './PlanningRequirementForm.vue'
import RequirementSummary from './RequirementSummary.vue'
import WeeklyRequirementMatrix from './WeeklyRequirementMatrix.vue'
import {
  buildRequirementCoverageSummary,
  buildRequirementMatrixRows,
  duplicateRequirementGuids,
} from './requirementMatrix.helpers'

const loading = ref(false)
const errorMessage = ref('')
const activeConfig = ref<PlanningSuggestionConfig | null>(null)
const requirements = ref<PlanningRequirement[]>([])
const showForm = ref(false)
const editTarget = ref<PlanningRequirement | null>(null)
const seedTarget = ref<PlanningRequirement | null>(null)
const initialDay = ref<PlanningDayKey | null>(null)

const matrixRows = computed(() => buildRequirementMatrixRows(requirements.value))
const coverageSummary = computed(() =>
  buildRequirementCoverageSummary(requirements.value),
)
const duplicateGuids = computed(() => [
  ...duplicateRequirementGuids(requirements.value),
])
const uncoveredDaysLabel = computed(() =>
  coverageSummary.value.uncoveredDays
    .map((day) => DAY_LABELS[day])
    .join(', '),
)

async function loadRequirements(): Promise<void> {
  loading.value = true
  errorMessage.value = ''

  try {
    const configResponse = await PlanningSuggestionConfigService.active()
    activeConfig.value =
      responseData(configResponse).planning_suggestion_config ?? null

    if (!activeConfig.value) {
      requirements.value = []
      return
    }

    const requirementResponse =
      await PlanningSuggestionRequirementService.listByConfig(
        activeConfig.value.guid,
      )

    requirements.value =
      responseData(requirementResponse).planning_suggestion_requirements?.items ?? []
  } catch (error: any) {
    errorMessage.value = responseError(
      error,
      'Impossible de charger les besoins de couverture.',
    )
  } finally {
    loading.value = false
  }
}

function openCreate(
  day: PlanningDayKey | null,
  seedRequirement: PlanningRequirement | null,
): void {
  editTarget.value = null
  seedTarget.value = seedRequirement
  initialDay.value = day
  showForm.value = true
}

function openEdit(requirement: PlanningRequirement): void {
  editTarget.value = requirement
  seedTarget.value = null
  initialDay.value = requirement.day_of_week
  showForm.value = true
}

function closeForm(): void {
  showForm.value = false
  editTarget.value = null
  seedTarget.value = null
  initialDay.value = null
}

function onSaved(): void {
  closeForm()
  void loadRequirements()
}

onMounted(loadRequirements)
</script>

<style scoped>
.primary-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 0.75rem;
  padding: 0.65rem 0.9rem;
  font-size: 0.75rem;
  font-weight: 700;
  transition: 0.16s;
}

.primary-button {
  background: #1d4ed8;
  color: #fff;
}

.primary-button:hover:not(:disabled) {
  background: #1d4ed8;
}

.primary-button:disabled {
  cursor: not-allowed;
  background: #cbd5e1;
}

.secondary-button {
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569;
}

.secondary-button:hover:not(:disabled) {
  background: #f8fafc;
}
</style>
