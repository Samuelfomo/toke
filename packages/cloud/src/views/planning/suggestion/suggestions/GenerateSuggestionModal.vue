<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-5"
      >
        <div
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <header class="relative overflow-hidden bg-blue-700 px-5 py-4 text-white sm:px-6 sm:py-5">
            <div class="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-blue-500/25 blur-3xl" />
            <div class="relative flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-2 text-xs font-semibold text-blue-100">
                  <IconSparkles :size="16" />
                  Nouvelle proposition
                </div>
                <h2 :id="titleId" class="mt-1.5 text-xl font-bold">
                  Générer une proposition de planning
                </h2>
                <p class="mt-1.5 max-w-2xl text-xs leading-5 text-blue-100/80">
                  {{ currentStepMeta.description }}
                </p>
              </div>

              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="saving"
                aria-label="Fermer"
                @click="requestClose"
              >
                <IconX :size="18" />
              </button>
            </div>
          </header>

          <div class="border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
            <ol class="grid grid-cols-5 gap-2" aria-label="Étapes de génération">
              <li v-for="step in steps" :key="step.id" class="relative">
                <div class="flex items-center gap-2.5">
                  <span
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition"
                    :class="stepCircleClass(step.id)"
                  >
                    <IconCheck v-if="step.id < currentStep" :size="15" stroke-width="2.5" />
                    <span v-else>{{ step.id }}</span>
                  </span>

                  <div class="min-w-0">
                    <p
                      class="truncate text-xs font-bold"
                      :class="step.id === currentStep ? 'text-blue-700' : step.id < currentStep ? 'text-slate-700' : 'text-slate-400'"
                    >
                      {{ step.label }}
                    </p>
                    <p class="hidden truncate text-[10px] text-slate-400 sm:block">
                      {{ step.shortDescription }}
                    </p>
                  </div>
                </div>
              </li>
            </ol>
          </div>

          <main class="min-h-[360px] px-5 py-5 sm:px-6 sm:py-6">
            <!-- ÉTAPE 1 : COLLABORATEURS -->
            <section v-if="currentStep === 1" class="space-y-4">
              <div
                v-if="readiness.errorMessage.value"
                class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"
              >
                {{ readiness.errorMessage.value }}
                <button
                  type="button"
                  class="ml-2 font-bold underline"
                  @click="readiness.load"
                >
                  Réessayer
                </button>
              </div>

              <div
                v-if="readiness.loading.value"
                class="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50"
              >
                <div class="text-center">
                  <IconLoader2 :size="24" class="mx-auto animate-spin text-blue-700" />
                  <p class="mt-2 text-xs font-semibold text-slate-600">Chargement de l’équipe…</p>
                </div>
              </div>

              <TemporaryEmployeeExclusionPicker
                v-else
                v-model="excludedEmployeeGuids"
                :employees="readiness.teamEmployees.value"
                :profiles="readiness.profiles.value"
                :disabled="saving"
              />
            </section>

            <!-- ÉTAPE 2 : PRÉREQUIS -->
            <section v-else-if="currentStep === 2" class="space-y-4">
              <GenerationReadinessPanel
                :items="readiness.readinessItems.value"
                :loading="readiness.loading.value"
                :percent="readiness.readinessPercent.value"
                @open="openCorrection"
              />

              <div class="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
                Les prérequis sont vérifiés uniquement sur les
                <strong>{{ readiness.includedEmployees.value.length }} collaborateur(s) inclus</strong>
                dans cette génération.
              </div>
            </section>

            <!-- ÉTAPE 3 : PÉRIODE -->
            <section v-else-if="currentStep === 3" class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Période à planifier</h3>
                  <p class="mt-1 text-xs leading-5 text-slate-500">
                    Choisissez une durée rapide ou définissez vos propres dates.
                  </p>
                </div>
                <span class="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {{ durationDays }} jour(s)
                </span>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  v-for="preset in presets"
                  :key="preset.id"
                  type="button"
                  class="rounded-xl border px-3 py-2 text-xs font-semibold transition"
                  :class="activePreset === preset.id
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                  @click="applyPreset(preset.id)"
                >
                  {{ preset.label }}
                </button>
              </div>

              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label for="suggestion-period-from" class="text-xs font-bold text-slate-700">
                    Date de début
                  </label>
                  <input
                    id="suggestion-period-from"
                    v-model="periodFrom"
                    type="date"
                    class="field-control mt-2"
                    :min="today"
                    @input="activePreset = 'custom'"
                  />
                </div>

                <div>
                  <label for="suggestion-period-to" class="text-xs font-bold text-slate-700">
                    Date de fin
                  </label>
                  <input
                    id="suggestion-period-to"
                    v-model="periodTo"
                    type="date"
                    class="field-control mt-2"
                    :min="periodFrom || today"
                    @input="activePreset = 'custom'"
                  />
                </div>
              </div>

              <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs font-bold text-slate-700">Période demandée</span>
                  <span class="text-sm font-bold text-slate-900">{{ periodLabel }}</span>
                </div>
                <p class="mt-2 text-xs leading-5 text-slate-500">
                  Une continuation de garde ou un repos post-garde peut apparaître après la date de fin principale afin de conserver un planning cohérent.
                </p>
              </div>
            </section>

            <!-- ÉTAPE 4 : HISTORIQUE D’ÉQUITÉ -->
            <section v-else-if="currentStep === 4" class="space-y-4">
              <div
                v-if="historyError"
                class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"
              >
                {{ historyError }} La génération reste possible sans historique.
              </div>

              <HistoryFairnessReview
                :review="historyReview"
                :adjustments="historyAdjustments"
                :loading="historyLoading"
                @update:adjustments="historyAdjustments = $event"
              />
            </section>

            <!-- ÉTAPE 5 : CONFIRMATION -->
            <section v-else class="space-y-4">
              <div class="rounded-2xl border border-slate-200 bg-white p-5">
                <div class="flex items-start gap-3">
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <IconClipboardCheck :size="20" />
                  </span>
                  <div>
                    <h3 class="text-sm font-bold text-slate-900">Vérifiez avant de lancer le calcul</h3>
                    <p class="mt-1 text-xs leading-5 text-slate-500">
                      Le solveur recevra uniquement les collaborateurs inclus. Aucun planning ne sera publié automatiquement.
                    </p>
                  </div>
                </div>

                <dl class="mt-5 grid gap-3 sm:grid-cols-5">
                  <div class="rounded-xl bg-slate-50 p-3.5">
                    <dt class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Inclus</dt>
                    <dd class="mt-1 text-xs font-bold text-emerald-700">
                      {{ readiness.includedEmployees.value.length }} collaborateur(s)
                    </dd>
                  </div>

                  <div class="rounded-xl bg-slate-50 p-3.5">
                    <dt class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Exclus temporairement</dt>
                    <dd class="mt-1 text-xs font-bold" :class="excludedEmployeeGuids.length ? 'text-amber-700' : 'text-slate-700'">
                      {{ excludedEmployeeGuids.length }} collaborateur(s)
                    </dd>
                  </div>

                  <div class="rounded-xl bg-slate-50 p-3.5">
                    <dt class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Période</dt>
                    <dd class="mt-1 text-xs font-bold text-slate-800">{{ periodLabel }}</dd>
                  </div>

                  <div class="rounded-xl bg-slate-50 p-3.5">
                    <dt class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Durée</dt>
                    <dd class="mt-1 text-xs font-bold text-slate-800">{{ durationDays }} jour(s)</dd>
                  </div>

                  <div class="rounded-xl bg-slate-50 p-3.5">
                    <dt class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Historique</dt>
                    <dd class="mt-1 text-xs font-bold" :class="historyWarningCount ? 'text-amber-700' : 'text-emerald-700'">
                      {{ historyWarningCount }} alerte(s)
                    </dd>
                  </div>
                </dl>
              </div>

              <div
                v-if="excludedEmployeeGuids.length"
                class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"
              >
                Les exclusions sont limitées à cette génération : elles ne modifient ni les profils permanents, ni les plannings déjà publiés, et ne seront pas converties en jours de repos.
              </div>

              <div
                v-if="errorMessage"
                class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
              >
                {{ errorMessage }}
              </div>
            </section>
          </main>

          <footer class="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p class="text-xs leading-5 text-slate-500">
              {{ footerMessage }}
            </p>

            <div class="flex items-center justify-end gap-2">
              <button
                v-if="currentStep === 1"
                type="button"
                class="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="saving"
                @click="requestClose"
              >
                Annuler
              </button>

              <button
                v-else
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="saving"
                @click="goPrevious"
              >
                <IconChevronLeft :size="15" />
                Précédent
              </button>

              <button
                v-if="currentStep < 5"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                :disabled="!canGoNext"
                :title="nextBlocker"
                @click="goNext"
              >
                Suivant
                <IconChevronRight :size="15" />
              </button>

              <button
                v-else
                type="button"
                class="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                :disabled="saving || !validPeriod || !readiness.ready.value || readiness.loading.value || readiness.includedEmployees.value.length === 0"
                :title="generateBlocker"
                @click="generate"
              >
                <IconLoader2 v-if="saving" :size="15" class="animate-spin" />
                <IconSparkles v-else :size="15" />
                {{ saving ? 'Calcul en cours…' : 'Générer la proposition' }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardCheck,
  IconLoader2,
  IconSparkles,
  IconX,
} from '@tabler/icons-vue'
import ScheduleSuggestionService from '@/service/ScheduleSuggestionService'
import { useBodyScrollLock } from '@/views/planning/composables/useBodyScrollLock'
import { formatDate, responseError } from '../planningSuggestion.helpers'
import { useGenerationReadiness } from '../composables/useGenerationReadiness'
import type { PlanningHistoryAdjustment, PlanningHistoryReview, ScheduleSuggestion } from '../planningSuggestion.type'
import GenerationReadinessPanel from './GenerationReadinessPanel.vue'
import HistoryFairnessReview from './HistoryFairnessReview.vue'
import TemporaryEmployeeExclusionPicker from './TemporaryEmployeeExclusionPicker.vue'

const props = defineProps<{ open: boolean; managerGuid: string }>()
const emit = defineEmits<{ close: []; generated: [suggestion: ScheduleSuggestion] }>()
const router = useRouter()
const titleId = `generate-suggestion-title-${Math.random().toString(36).slice(2, 9)}`
const saving = ref(false)
const errorMessage = ref('')
const periodFrom = ref('')
const periodTo = ref('')
const activePreset = ref('14-days')
const excludedEmployeeGuids = ref<string[]>([])
const currentStep = ref<1 | 2 | 3 | 4 | 5>(1)
const historyReview = ref<PlanningHistoryReview | null>(null)
const historyAdjustments = ref<PlanningHistoryAdjustment[]>([])
const historyLoading = ref(false)
const historyError = ref('')
const today = new Date().toISOString().slice(0, 10)
const managerGuidRef = computed(() => props.managerGuid)
const readiness = useGenerationReadiness(managerGuidRef, excludedEmployeeGuids)

const steps = [
  {
    id: 1 as const,
    label: 'Collaborateurs',
    shortDescription: 'Définir le périmètre',
    description: 'Choisissez l’équipe concernée et retirez ponctuellement les collaborateurs qui ne doivent pas participer à cette génération.',
  },
  {
    id: 2 as const,
    label: 'Prérequis',
    shortDescription: 'Vérifier la configuration',
    description: 'Toké vérifie les profils, besoins et règles uniquement sur le périmètre de collaborateurs retenu.',
  },
  {
    id: 3 as const,
    label: 'Période',
    shortDescription: 'Définir les dates',
    description: 'Choisissez précisément la période sur laquelle Toké doit construire la proposition.',
  },
  {
    id: 4 as const,
    label: 'Historique',
    shortDescription: 'Équité et alertes',
    description: 'Toké analyse les charges passées. Les anomalies sont des avertissements et ne bloquent jamais la génération.',
  },
  {
    id: 5 as const,
    label: 'Confirmation',
    shortDescription: 'Contrôler et lancer',
    description: 'Contrôlez les paramètres retenus avant de lancer le calcul du planning.',
  },
]

const presets = [
  { id: '7-days', label: '7 jours' },
  { id: '14-days', label: '14 jours' },
  { id: '28-days', label: '28 jours' },
  { id: 'next-month', label: 'Mois prochain' },
]

const currentStepMeta = computed(() => steps[currentStep.value - 1]!)

useBodyScrollLock(computed(() => props.open))

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    errorMessage.value = ''
    historyError.value = ''
    historyReview.value = null
    historyAdjustments.value = []
    excludedEmployeeGuids.value = []
    currentStep.value = 1
    applyPreset('14-days')
    await readiness.load()
  },
)

watch(
  [periodFrom, periodTo, () => excludedEmployeeGuids.value.join('|')],
  () => {
    // Any scope/date change invalidates the previous historical review.
    historyReview.value = null
    historyAdjustments.value = []
    historyError.value = ''
  },
)

function requestClose(): void {
  if (saving.value) return
  emit('close')
}

function dateToIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return dateToIso(date)
}

function nextMonday(): string {
  const base = new Date(`${today}T12:00:00`)
  const offset = (8 - base.getDay()) % 7 || 7
  base.setDate(base.getDate() + offset)
  return dateToIso(base)
}

function applyPreset(id: string): void {
  activePreset.value = id

  if (id === 'next-month') {
    const current = new Date(`${today}T12:00:00`)
    const first = new Date(current.getFullYear(), current.getMonth() + 1, 1, 12)
    const last = new Date(current.getFullYear(), current.getMonth() + 2, 0, 12)
    periodFrom.value = dateToIso(first)
    periodTo.value = dateToIso(last)
    return
  }

  const duration = id === '7-days' ? 7 : id === '28-days' ? 28 : 14
  periodFrom.value = nextMonday()
  periodTo.value = addDays(periodFrom.value, duration - 1)
}

const validPeriod = computed(() =>
  Boolean(periodFrom.value && periodTo.value && periodFrom.value <= periodTo.value),
)

const durationDays = computed(() => {
  if (!validPeriod.value) return 0
  return (
    Math.round(
      (new Date(`${periodTo.value}T12:00:00`).getTime() -
        new Date(`${periodFrom.value}T12:00:00`).getTime()) /
        86400000,
    ) + 1
  )
})

const periodLabel = computed(() =>
  validPeriod.value
    ? `${formatDate(periodFrom.value)} → ${formatDate(periodTo.value)}`
    : 'Période invalide',
)

const historyWarningCount = computed(() =>
  historyReview.value?.anomalies?.length ?? (historyError.value ? 1 : 0),
)

const canGoNext = computed(() => {
  if (saving.value) return false

  if (currentStep.value === 1) {
    return (
      readiness.loaded.value &&
      !readiness.loading.value &&
      readiness.includedEmployees.value.length > 0
    )
  }

  if (currentStep.value === 2) {
    return !readiness.loading.value && readiness.ready.value
  }

  if (currentStep.value === 3) {
    return validPeriod.value
  }

  if (currentStep.value === 4) {
    return !historyLoading.value
  }

  return false
})

const nextBlocker = computed(() => {
  if (currentStep.value === 1) {
    if (readiness.loading.value) return 'Chargement de l’équipe en cours.'
    if (!readiness.loaded.value) return 'Impossible de vérifier l’équipe.'
    if (readiness.includedEmployees.value.length === 0) {
      return 'Réincluez au moins un collaborateur avant de poursuivre.'
    }
  }

  if (currentStep.value === 2) {
    if (readiness.loading.value) return 'Vérification des prérequis en cours.'
    if (!readiness.ready.value) return 'Corrigez les prérequis signalés avant de poursuivre.'
  }

  if (currentStep.value === 3 && !validPeriod.value) {
    return 'Choisissez une période valide avant de poursuivre.'
  }

  if (currentStep.value === 4 && historyLoading.value) {
    return 'Analyse de l’historique en cours.'
  }

  return 'Passer à l’étape suivante.'
})

const footerMessage = computed(() => {
  if (currentStep.value === 1) {
    if (readiness.loading.value) return 'Chargement de l’équipe en cours…'
    return `${readiness.includedEmployees.value.length} collaborateur(s) inclus · ${excludedEmployeeGuids.value.length} exclusion(s) temporaire(s).`
  }

  if (currentStep.value === 2) {
    if (readiness.loading.value) return 'Vérification des prérequis en cours…'
    if (readiness.ready.value) return 'Tous les prérequis du périmètre retenu sont validés.'
    return `${readiness.blockerCount.value} blocage(s) à corriger avant de poursuivre.`
  }

  if (currentStep.value === 3) {
    return validPeriod.value
      ? `${durationDays.value} jour(s) sélectionné(s).`
      : 'Choisissez une période valide.'
  }

  if (currentStep.value === 4) {
    if (historyLoading.value) return 'Analyse de l’historique en cours…'
    if (historyError.value) return 'Historique indisponible : la génération continuera sans équité historique.'
    return `${historyWarningCount.value} alerte(s) historique(s) · aucune n’est bloquante.`
  }

  return 'La proposition restera un brouillon jusqu’à votre validation explicite.'
})

const generateBlocker = computed(() => {
  if (saving.value) return 'Calcul en cours.'
  if (readiness.includedEmployees.value.length === 0) return 'Aucun collaborateur inclus.'
  if (readiness.loading.value) return 'Vérification des prérequis en cours.'
  if (!readiness.ready.value) return 'Corrigez les prérequis signalés avant de générer.'
  if (!validPeriod.value) return 'Choisissez une période valide.'
  return 'Générer une proposition de planning.'
})

function stepCircleClass(stepId: number): string {
  if (stepId < currentStep.value) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (stepId === currentStep.value) {
    return 'border-blue-700 bg-blue-700 text-white'
  }

  return 'border-slate-200 bg-white text-slate-400'
}

async function loadHistoryReview(): Promise<void> {
  if (!validPeriod.value || !props.managerGuid) return

  historyLoading.value = true
  historyError.value = ''

  try {
    const response = await ScheduleSuggestionService.reviewHistory(props.managerGuid, {
      period_from: periodFrom.value,
      ...(excludedEmployeeGuids.value.length
        ? { excluded_employee_guids: excludedEmployeeGuids.value }
        : {}),
      ...(historyAdjustments.value.length
        ? { history_adjustments: historyAdjustments.value }
        : {}),
    })

    if (!response?.success) throw response
    historyReview.value = response.data.history_review ?? null
  } catch (error: any) {
    historyReview.value = null
    historyError.value = responseError(
      error,
      'Impossible d’analyser l’historique d’équité.',
    )
  } finally {
    historyLoading.value = false
  }
}

async function goNext(): Promise<void> {
  if (!canGoNext.value || currentStep.value >= 5) return

  if (currentStep.value === 3) {
    currentStep.value = 4
    await loadHistoryReview()
    return
  }

  currentStep.value = (currentStep.value + 1) as 1 | 2 | 3 | 4 | 5
}

function goPrevious(): void {
  if (saving.value || currentStep.value <= 1) return
  currentStep.value = (currentStep.value - 1) as 1 | 2 | 3 | 4 | 5
}

async function openCorrection(routeName: string): Promise<void> {
  if (saving.value) return
  emit('close')
  await router.push({ name: routeName })
}

async function generate(): Promise<void> {
  if (
    currentStep.value !== 5 ||
    !validPeriod.value ||
    !props.managerGuid ||
    saving.value ||
    !readiness.ready.value ||
    readiness.includedEmployees.value.length === 0
  ) {
    return
  }

  saving.value = true
  errorMessage.value = ''

  try {
    const response = await ScheduleSuggestionService.generate(props.managerGuid, {
      period_from: periodFrom.value,
      period_to: periodTo.value,
      ...(excludedEmployeeGuids.value.length
        ? { excluded_employee_guids: excludedEmployeeGuids.value }
        : {}),
      ...(historyAdjustments.value.length
        ? { history_adjustments: historyAdjustments.value }
        : {}),
    })

    if (!response?.success) throw response
    emit('generated', response.data.suggestion)
  } catch (error: any) {
    errorMessage.value = responseError(
      error,
      'La génération du planning a échoué. Vérifiez les contraintes courantes signalées par Toké.',
    )
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.field-control {
  width: 100%;
  min-height: 42px;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.7rem 0.8rem;
  font-size: 0.875rem;
  color: #334155;
  outline: none;
}

.field-control:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px #dbeafe;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
