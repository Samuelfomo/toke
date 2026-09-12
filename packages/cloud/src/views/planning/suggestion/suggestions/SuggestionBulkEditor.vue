<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
          v-if="open && suggestion"
          class="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-5"
      >
        <div
            role="dialog"
            aria-modal="true"
            class="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <header class="relative shrink-0 overflow-hidden bg-slate-900 px-5 py-4 text-white sm:px-6 sm:py-5">
            <div class="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-indigo-500/25 blur-3xl" />
            <div class="relative flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-2 text-xs font-semibold text-indigo-200">
                  <IconEdit :size="16" />
                  Décision managériale
                </div>
                <h2 class="mt-1.5 text-xl font-bold">
                  {{ seededFromCell ? `Ajuster le planning de ${seededEmployeeName}` : 'Ajuster le planning' }}
                </h2>
                <p class="mt-1.5 max-w-2xl text-xs leading-5 text-slate-300">
                  {{ currentMeta.description }}
                </p>
              </div>
              <button
                  type="button"
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50"
                  :disabled="applying"
                  aria-label="Fermer"
                  @click="emit('close')"
              >
                <IconX :size="18" />
              </button>
            </div>
          </header>

          <div class="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-6">
            <ol class="grid grid-cols-4 gap-2" aria-label="Étapes de modification">
              <li v-for="meta in steps" :key="meta.id">
                <div class="flex items-center gap-2.5">
                  <span
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
                      :class="stepClass(meta.id)"
                  >
                    <IconCheck v-if="meta.id < step" :size="15" stroke-width="2.5" />
                    <span v-else>{{ meta.id }}</span>
                  </span>
                  <div class="min-w-0">
                    <p
                        class="truncate text-xs font-bold"
                        :class="meta.id === step ? 'text-indigo-700' : meta.id < step ? 'text-slate-700' : 'text-slate-400'"
                    >
                      {{ meta.label }}
                    </p>
                    <p class="hidden truncate text-[10px] text-slate-400 sm:block">
                      {{ meta.short }}
                    </p>
                  </div>
                </div>
              </li>
            </ol>
          </div>

          <!-- Le corps, et non tout le modal, peut scroller. Les actions restent toujours visibles. -->
          <main class="min-h-0 flex-1 overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
            <!-- 1. Collaborateurs -->
            <section v-if="step === 1" class="h-full overflow-y-auto pr-1">
              <div class="space-y-4">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 class="text-sm font-bold text-slate-900">Collaborateurs concernés</h3>
                    <p class="mt-1 text-xs text-slate-500">Choisissez une ou plusieurs lignes de cette suggestion.</p>
                  </div>
                  <div class="flex gap-2">
                    <button type="button" class="small-button" @click="selectAll">Tout sélectionner</button>
                    <button type="button" class="small-button" @click="clearSelection">Aucun</button>
                  </div>
                </div>

                <div class="grid gap-2 sm:grid-cols-2">
                  <label
                      v-for="item in suggestion.items"
                      :key="item.guid"
                      class="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition"
                      :class="selectedItemGuids.includes(item.guid)
                      ? 'border-indigo-200 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'"
                  >
                    <input
                        v-model="selectedItemGuids"
                        :value="item.guid"
                        type="checkbox"
                        class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        @change="invalidatePreview"
                    />
                    <div class="min-w-0">
                      <p class="truncate text-xs font-bold text-slate-800">{{ item.user.name }}</p>
                      <p class="mt-0.5 text-[10px] text-slate-400">{{ item.user.employee_code ?? 'Sans code' }}</p>
                    </div>
                  </label>
                </div>

                <p class="rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                  {{ selectedItemGuids.length }} collaborateur(s) sélectionné(s)
                </p>
              </div>
            </section>

            <!-- 2. Portée temporelle -->
            <section v-else-if="step === 2" class="h-full overflow-y-auto pr-1">
              <div class="space-y-5">
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Quand appliquer cette décision ?</h3>
                  <p class="mt-1 text-xs text-slate-500">Depuis une cellule, vous pouvez rester sur ce jour ou élargir la portée.</p>
                </div>

                <div class="grid gap-3 sm:grid-cols-3">
                  <button
                      type="button"
                      class="scope-card"
                      :class="scopeMode === 'ONE_DAY' ? 'selected' : ''"
                      @click="setScopeMode('ONE_DAY')"
                  >
                    <IconCalendarEvent :size="19" />
                    <span>
                      <strong>Un jour</strong>
                      <small>Une date précise</small>
                    </span>
                  </button>
                  <button
                      type="button"
                      class="scope-card"
                      :class="scopeMode === 'DATES' ? 'selected' : ''"
                      @click="setScopeMode('DATES')"
                  >
                    <IconListCheck :size="19" />
                    <span>
                      <strong>Plusieurs jours</strong>
                      <small>Dates précises X, Y…</small>
                    </span>
                  </button>
                  <button
                      type="button"
                      class="scope-card"
                      :class="scopeMode === 'PERIOD' ? 'selected' : ''"
                      @click="setScopeMode('PERIOD')"
                  >
                    <IconCalendarStats :size="19" />
                    <span>
                      <strong>Une période</strong>
                      <small>Du… au… + jours</small>
                    </span>
                  </button>
                </div>

                <div v-if="scopeMode === 'ONE_DAY'" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label class="field-label">Date</label>
                  <input
                      v-model="singleDate"
                      type="date"
                      class="field-control mt-2 max-w-xs"
                      :min="suggestion.period_from"
                      :max="suggestion.period_to"
                      @change="invalidatePreview"
                  />
                </div>

                <div v-else-if="scopeMode === 'DATES'" class="space-y-3">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="field-label">Dates précises</p>
                      <p class="mt-1 text-[11px] text-slate-500">Cliquez sur chaque date à modifier.</p>
                    </div>
                    <button type="button" class="small-button" @click="clearSelectedDates">Effacer</button>
                  </div>
                  <div class="max-h-[300px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div class="grid grid-cols-4 gap-2 sm:grid-cols-7">
                      <button
                          v-for="date in allSuggestionDates"
                          :key="date.iso"
                          type="button"
                          class="rounded-xl border px-2 py-2.5 text-center transition"
                          :class="selectedDates.includes(date.iso)
                          ? 'border-indigo-300 bg-indigo-600 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'"
                          @click="toggleDate(date.iso)"
                      >
                        <span class="block text-[9px] font-semibold uppercase opacity-70">{{ date.weekday }}</span>
                        <span class="mt-0.5 block text-xs font-bold">{{ date.dayMonth }}</span>
                      </button>
                    </div>
                  </div>
                  <p class="text-xs font-semibold text-slate-600">{{ selectedDates.length }} date(s) sélectionnée(s)</p>
                </div>

                <div v-else class="space-y-5">
                  <div class="flex flex-wrap gap-2">
                    <button type="button" class="small-button" @click="useWholeSuggestionPeriod">
                      Toute la suggestion
                    </button>
                    <button
                        v-if="initialIso"
                        type="button"
                        class="small-button"
                        @click="usePeriodFromInitialDate"
                    >
                      À partir du jour cliqué
                    </button>
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label class="field-label">Du</label>
                      <input
                          v-model="periodFrom"
                          type="date"
                          class="field-control mt-2"
                          :min="suggestion.period_from"
                          :max="periodTo || suggestion.period_to"
                          @change="invalidatePreview"
                      />
                    </div>
                    <div>
                      <label class="field-label">Au</label>
                      <input
                          v-model="periodTo"
                          type="date"
                          class="field-control mt-2"
                          :min="periodFrom || suggestion.period_from"
                          :max="suggestion.period_to"
                          @change="invalidatePreview"
                      />
                    </div>
                  </div>

                  <div>
                    <div class="flex items-center justify-between gap-3">
                      <label class="field-label">Jours de la semaine</label>
                      <button type="button" class="text-xs font-bold text-indigo-600 hover:text-indigo-800" @click="toggleAllWeekdays">
                        {{ weekdays.length === 7 ? 'Désélectionner tout' : 'Tous les jours' }}
                      </button>
                    </div>
                    <div class="mt-3 grid grid-cols-7 gap-2">
                      <button
                          v-for="day in weekdayOptions"
                          :key="day.value"
                          type="button"
                          class="rounded-xl border px-2 py-3 text-xs font-bold transition"
                          :class="weekdays.includes(day.value)
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-400'"
                          @click="toggleWeekday(day.value)"
                      >
                        {{ day.label }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- 3. Affectation -->
            <section v-else-if="step === 3" class="h-full overflow-y-auto pr-1">
              <div class="space-y-5">
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Quelle affectation appliquer ?</h3>
                  <p class="mt-1 text-xs text-slate-500">
                    Le manager peut utiliser tout modèle horaire courant. Les écarts par rapport aux règles du moteur seront signalés, pas bloqués.
                  </p>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <button
                      type="button"
                      class="choice-card"
                      :class="action === 'REST' ? 'selected' : ''"
                      @click="chooseRest"
                  >
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <IconBed :size="20" />
                    </span>
                    <span>
                      <span class="block text-xs font-bold text-slate-900">Repos</span>
                      <span class="mt-1 block text-[11px] leading-4 text-slate-500">Aucune affectation de service sur les dates ciblées.</span>
                    </span>
                  </button>

                  <button
                      v-for="service in serviceOptions"
                      :key="service.guid"
                      type="button"
                      class="choice-card"
                      :class="action === 'ASSIGN_SERVICE' && templateGuid === service.guid ? 'selected' : ''"
                      @click="chooseService(service.guid)"
                  >
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                      <IconClock :size="20" />
                    </span>
                    <span class="min-w-0">
                      <span class="block truncate text-xs font-bold text-slate-900">{{ service.name }}</span>
                      <span class="mt-1 block text-[11px] leading-4 text-slate-500">
                        {{ serviceCompatibilityLabel(service) }}
                      </span>
                    </span>
                  </button>
                </div>

                <div>
                  <label class="field-label">Motif interne <span class="font-normal text-slate-400">(facultatif)</span></label>
                  <textarea
                      v-model="reason"
                      rows="3"
                      maxlength="300"
                      class="field-control mt-2 resize-none"
                      placeholder="Ex. remplacement exceptionnel, changement opérationnel, décision du responsable…"
                      @input="invalidatePreview"
                  />
                </div>
              </div>
            </section>

            <!-- 4. Vérification -->
            <section v-else class="h-full overflow-y-auto pr-1">
              <div class="space-y-4 pb-1">
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Vérification avant application</h3>
                  <p class="mt-1 text-xs text-slate-500">
                    Les blocages ci-dessous sont uniquement techniques. Les règles métier du moteur apparaissent comme avertissements et n’empêchent pas la décision du manager.
                  </p>
                </div>

                <div v-if="previewLoading" class="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                  <div class="text-center text-xs text-slate-500">
                    <IconLoader2 :size="24" class="mx-auto mb-3 animate-spin text-indigo-600" />
                    Vérification des impacts…
                  </div>
                </div>

                <template v-else-if="preview">
                  <div class="grid gap-2 sm:grid-cols-4">
                    <div class="metric-card"><span>Collaborateurs</span><strong>{{ preview.affected_items }}</strong></div>
                    <div class="metric-card"><span>Cellules touchées</span><strong>{{ preview.affected_cells }}</strong></div>
                    <div class="metric-card"><span>Avertissements</span><strong>{{ preview.warnings.length }}</strong></div>
                    <div class="metric-card"><span>Score indicatif</span><strong>{{ preview.conformity_score }}%</strong></div>
                  </div>

                  <div
                      v-if="preview.blockers.length"
                      class="rounded-2xl border border-red-200 bg-red-50 p-4"
                  >
                    <div class="flex items-center gap-2 text-xs font-bold text-red-800">
                      <IconAlertCircle :size="16" />
                      {{ preview.blockers.length }} problème(s) technique(s) à corriger
                    </div>
                    <div class="mt-3 max-h-[240px] space-y-2 overflow-y-auto pr-1">
                      <article v-for="issue in preview.blockers" :key="issueKey(issue)" class="rounded-xl bg-white/80 p-3">
                        <p class="text-xs font-bold text-red-800">{{ issue.message }}</p>
                        <p v-if="issue.suggested_actions?.length" class="mt-1 text-[11px] leading-4 text-red-700/80">
                          {{ issue.suggested_actions.join(' · ') }}
                        </p>
                      </article>
                    </div>
                  </div>

                  <div
                      v-if="preview.warnings.length"
                      class="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-2 text-xs font-bold text-amber-900">
                        <IconAlertTriangle :size="16" />
                        {{ preview.warnings.length }} avertissement(s) — application autorisée
                      </div>
                      <span class="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Décision manager</span>
                    </div>
                    <div class="mt-3 max-h-[300px] space-y-2 overflow-y-auto pr-1">
                      <article v-for="issue in preview.warnings" :key="issueKey(issue)" class="rounded-xl border border-amber-100 bg-white/80 p-3">
                        <p class="text-xs font-semibold leading-5 text-amber-900">{{ issue.message }}</p>
                        <p v-if="issue.suggested_actions?.length" class="mt-1 text-[11px] leading-4 text-amber-700">
                          {{ issue.suggested_actions.join(' · ') }}
                        </p>
                      </article>
                    </div>
                  </div>

                  <div v-if="!preview.blockers.length" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div class="flex gap-3">
                      <IconCheck :size="18" class="mt-0.5 shrink-0 text-emerald-700" />
                      <div>
                        <p class="text-xs font-bold text-emerald-900">La modification peut être appliquée</p>
                        <p class="mt-1 text-xs leading-5 text-emerald-800/80">
                          {{ preview.warnings.length
                            ? 'Les avertissements restent visibles dans le planning mais ne bloquent pas la décision du manager.'
                            : 'Aucun conflit technique ni avertissement métier supplémentaire n’a été détecté.' }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div v-if="derivedChanges.length" class="rounded-2xl border border-slate-200 bg-white p-4">
                    <p class="text-xs font-bold text-slate-800">Ajustements automatiques liés</p>
                    <p class="mt-1 text-[11px] text-slate-500">Ex. continuation technique d’une garde.</p>
                    <div class="mt-3 max-h-[180px] space-y-2 overflow-y-auto pr-1">
                      <div v-for="change in derivedChanges" :key="`${change.item_guid}-${change.date}-${change.kind}`" class="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                        <strong class="text-slate-800">{{ change.employee_name }}</strong>
                        · {{ formatIso(change.date) }} · {{ change.after_label }}
                      </div>
                    </div>
                  </div>
                </template>

                <div v-else class="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                  {{ previewError || 'Impossible de calculer l’aperçu.' }}
                </div>
              </div>
            </section>
          </main>

          <footer class="mt-auto shrink-0 flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
            <button
                type="button"
                class="secondary-button"
                :disabled="applying"
                @click="step === 1 ? emit('close') : previousStep()"
            >
              <IconArrowLeft v-if="step > 1" :size="15" />
              {{ step === 1 ? 'Annuler' : 'Précédent' }}
            </button>

            <div class="flex items-center gap-3">
              <span v-if="step < 4" class="hidden text-xs text-slate-400 sm:inline">Étape {{ step }} / 4</span>
              <button
                  v-if="step < 4"
                  type="button"
                  class="primary-button"
                  :disabled="!canContinue || applying"
                  @click="nextStep"
              >
                Suivant
                <IconArrowRight :size="15" />
              </button>
              <button
                  v-else
                  type="button"
                  class="primary-button"
                  :disabled="!preview || preview.blockers.length > 0 || applying || previewLoading"
                  @click="apply"
              >
                <IconLoader2 v-if="applying" :size="15" class="animate-spin" />
                <IconCheck v-else :size="15" />
                {{ applyLabel }}
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
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconBed,
  IconCalendarEvent,
  IconCalendarStats,
  IconCheck,
  IconClock,
  IconEdit,
  IconListCheck,
  IconLoader2,
  IconX,
} from '@tabler/icons-vue'

import ScheduleSuggestionService from '@/service/ScheduleSuggestionService'
import { responseData, responseError } from '../planningSuggestion.helpers'
import type {
  PlanningDayKey,
  PlanningTemplateMini,
  ScheduleSuggestion,
  SuggestionBulkEditAction,
  SuggestionBulkEditIssue,
  SuggestionBulkEditPayload,
  SuggestionBulkEditPreview,
} from '../planningSuggestion.type'

type ScopeMode = 'ONE_DAY' | 'DATES' | 'PERIOD'

const props = withDefaults(defineProps<{
  open: boolean
  suggestion: ScheduleSuggestion | null
  templates?: PlanningTemplateMini[]
  initialItemGuid?: string | null
  initialIso?: string | null
}>(), {
  templates: () => [],
  initialItemGuid: null,
  initialIso: null,
})

const emit = defineEmits<{
  close: []
  saved: []
}>()

const step = ref(1)
const selectedItemGuids = ref<string[]>([])
const scopeMode = ref<ScopeMode>('PERIOD')
const singleDate = ref('')
const selectedDates = ref<string[]>([])
const periodFrom = ref('')
const periodTo = ref('')
const weekdays = ref<PlanningDayKey[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
const action = ref<SuggestionBulkEditAction>('ASSIGN_SERVICE')
const templateGuid = ref('')
const reason = ref('')
const preview = ref<SuggestionBulkEditPreview | null>(null)
const previewLoading = ref(false)
const applying = ref(false)
const previewError = ref('')

const steps = [
  { id: 1, label: 'Collaborateurs', short: 'Qui ?', description: 'Choisissez les collaborateurs concernés.' },
  { id: 2, label: 'Portée', short: 'Quand ?', description: 'Appliquez la décision à un jour, plusieurs dates ou une période.' },
  { id: 3, label: 'Affectation', short: 'Quoi ?', description: 'Choisissez le service ou le repos à appliquer.' },
  { id: 4, label: 'Vérification', short: 'Impacts', description: 'Vérifiez les conflits techniques et les avertissements métier avant application.' },
] as const

const currentMeta = computed(() => steps[step.value - 1])
const seededFromCell = computed(() => Boolean(props.initialItemGuid && props.initialIso))
const seededEmployeeName = computed(() =>
    props.suggestion?.items.find((item) => item.guid === props.initialItemGuid)?.user.name ?? 'ce collaborateur',
)

const weekdayOptions: Array<{ value: PlanningDayKey; label: string }> = [
  { value: 'Mon', label: 'Lun' },
  { value: 'Tue', label: 'Mar' },
  { value: 'Wed', label: 'Mer' },
  { value: 'Thu', label: 'Jeu' },
  { value: 'Fri', label: 'Ven' },
  { value: 'Sat', label: 'Sam' },
  { value: 'Sun', label: 'Dim' },
]

const allSuggestionDates = computed(() => {
  if (!props.suggestion) return []
  const result: Array<{ iso: string; weekday: string; dayMonth: string }> = []
  const cursor = new Date(`${props.suggestion.period_from}T12:00:00`)
  const end = new Date(`${props.suggestion.period_to}T12:00:00`)
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10)
    result.push({
      iso,
      weekday: new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(cursor).replace('.', ''),
      dayMonth: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(cursor),
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
})

const serviceOptions = computed(() =>
    [...props.templates]
        .filter((template) => template?.guid)
        .sort((a, b) => a.name.localeCompare(b.name)),
)

const effectiveDates = computed((): string[] => {
  if (!props.suggestion) return []
  if (scopeMode.value === 'ONE_DAY') return singleDate.value ? [singleDate.value] : []
  if (scopeMode.value === 'DATES') return [...selectedDates.value].sort()

  if (!periodFrom.value || !periodTo.value || periodFrom.value > periodTo.value) return []
  const allowed = new Set(weekdays.value)
  const result: string[] = []
  const cursor = new Date(`${periodFrom.value}T12:00:00`)
  const end = new Date(`${periodTo.value}T12:00:00`)
  const keys: PlanningDayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10)
    if (allowed.has(keys[cursor.getDay()]!)) result.push(iso)
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
})

const canContinue = computed(() => {
  if (step.value === 1) return selectedItemGuids.value.length > 0
  if (step.value === 2) return effectiveDates.value.length > 0
  if (step.value === 3) return action.value === 'REST' || Boolean(templateGuid.value)
  return Boolean(preview.value && preview.value.blockers.length === 0)
})

const derivedChanges = computed(() =>
    preview.value?.changes.filter((entry) => entry.kind !== 'DIRECT') ?? [],
)

const applyLabel = computed(() => {
  if (applying.value) return 'Application…'
  const warningCount = preview.value?.warnings.length ?? 0
  return warningCount > 0
      ? `Appliquer malgré ${warningCount} avertissement${warningCount > 1 ? 's' : ''}`
      : 'Appliquer les modifications'
})

function reset(): void {
  const suggestion = props.suggestion
  const initialIso = props.initialIso && suggestion && props.initialIso >= suggestion.period_from && props.initialIso <= suggestion.period_to
      ? props.initialIso
      : suggestion?.period_from ?? ''

  selectedItemGuids.value = props.initialItemGuid
      ? [props.initialItemGuid]
      : []
  scopeMode.value = props.initialIso ? 'ONE_DAY' : 'PERIOD'
  singleDate.value = initialIso
  selectedDates.value = initialIso ? [initialIso] : []
  periodFrom.value = props.initialIso ? initialIso : suggestion?.period_from ?? ''
  periodTo.value = props.initialIso ? initialIso : suggestion?.period_to ?? ''
  weekdays.value = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const seededItem = suggestion?.items.find((item) => item.guid === props.initialItemGuid)
  const seededTemplate = props.initialIso ? seededItem?.schedule?.[props.initialIso] ?? null : null
  action.value = seededTemplate ? 'ASSIGN_SERVICE' : 'REST'
  templateGuid.value = seededTemplate ?? serviceOptions.value[0]?.guid ?? ''
  reason.value = ''
  preview.value = null
  previewError.value = ''
  step.value = props.initialItemGuid ? 2 : 1
}

watch(() => props.open, (value) => { if (value) reset() })
watch(() => [props.suggestion?.guid, props.initialItemGuid, props.initialIso], () => {
  if (props.open) reset()
})

function stepClass(id: number): string {
  if (id < step.value) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (id === step.value) return 'border-indigo-600 bg-indigo-600 text-white'
  return 'border-slate-200 bg-white text-slate-400'
}

function selectAll(): void {
  selectedItemGuids.value = props.suggestion?.items.map((item) => item.guid) ?? []
  invalidatePreview()
}
function clearSelection(): void {
  selectedItemGuids.value = []
  invalidatePreview()
}
function setScopeMode(value: ScopeMode): void {
  scopeMode.value = value
  if (value === 'ONE_DAY' && !singleDate.value) {
    singleDate.value = props.initialIso ?? props.suggestion?.period_from ?? ''
  }
  if (value === 'DATES' && selectedDates.value.length === 0 && singleDate.value) {
    selectedDates.value = [singleDate.value]
  }
  if (
      value === 'PERIOD' &&
      props.initialIso &&
      periodFrom.value === props.initialIso &&
      periodTo.value === props.initialIso
  ) {
    periodFrom.value = props.initialIso
    periodTo.value = props.suggestion?.period_to ?? props.initialIso
  }
  invalidatePreview()
}
function clearSelectedDates(): void {
  selectedDates.value = []
  invalidatePreview()
}
function useWholeSuggestionPeriod(): void {
  if (!props.suggestion) return
  periodFrom.value = props.suggestion.period_from
  periodTo.value = props.suggestion.period_to
  invalidatePreview()
}
function usePeriodFromInitialDate(): void {
  if (!props.suggestion || !props.initialIso) return
  periodFrom.value = props.initialIso
  periodTo.value = props.suggestion.period_to
  invalidatePreview()
}
function toggleDate(iso: string): void {
  selectedDates.value = selectedDates.value.includes(iso)
      ? selectedDates.value.filter((entry) => entry !== iso)
      : [...selectedDates.value, iso]
  invalidatePreview()
}
function toggleWeekday(value: PlanningDayKey): void {
  weekdays.value = weekdays.value.includes(value)
      ? weekdays.value.filter((entry) => entry !== value)
      : [...weekdays.value, value]
  invalidatePreview()
}
function toggleAllWeekdays(): void {
  weekdays.value = weekdays.value.length === 7
      ? []
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  invalidatePreview()
}
function chooseRest(): void {
  action.value = 'REST'
  templateGuid.value = ''
  invalidatePreview()
}
function chooseService(guid: string): void {
  action.value = 'ASSIGN_SERVICE'
  templateGuid.value = guid
  invalidatePreview()
}
function invalidatePreview(): void {
  preview.value = null
  previewError.value = ''
}
function previousStep(): void {
  if (step.value > 1) step.value--
}
async function nextStep(): Promise<void> {
  if (!canContinue.value) return
  if (step.value < 3) {
    step.value++
    return
  }
  step.value = 4
  await loadPreview()
}

function payload(): SuggestionBulkEditPayload {
  const dates = effectiveDates.value
  const from = dates[0] ?? props.suggestion?.period_from ?? ''
  const to = dates.at(-1) ?? from
  return {
    item_guids: [...selectedItemGuids.value],
    period_from: scopeMode.value === 'PERIOD' ? periodFrom.value : from,
    period_to: scopeMode.value === 'PERIOD' ? periodTo.value : to,
    ...(scopeMode.value === 'PERIOD'
        ? { weekdays: [...weekdays.value] }
        : { dates }),
    action: action.value,
    template_guid: action.value === 'ASSIGN_SERVICE' ? templateGuid.value : null,
    reason: reason.value.trim() || null,
  }
}

async function loadPreview(): Promise<void> {
  if (!props.suggestion) return
  previewLoading.value = true
  previewError.value = ''
  preview.value = null
  try {
    const response = await ScheduleSuggestionService.previewBulkEdit(props.suggestion.guid, payload())
    const data = responseData(response)
    preview.value = (data.bulk_edit ?? data) as SuggestionBulkEditPreview
    if (!preview.value?.suggestion_guid) throw response
  } catch (error: any) {
    previewError.value = responseError(error, 'Impossible de vérifier cette modification.')
  } finally {
    previewLoading.value = false
  }
}

async function apply(): Promise<void> {
  if (!props.suggestion || !preview.value || preview.value.blockers.length) return
  applying.value = true
  previewError.value = ''
  try {
    const response = await ScheduleSuggestionService.applyBulkEdit(props.suggestion.guid, payload())
    const data = responseData(response)
    const result = (data.bulk_edit ?? data) as SuggestionBulkEditPreview
    if (!result?.applied) throw response
    emit('saved')
  } catch (error: any) {
    previewError.value = responseError(
        error,
        'La modification n’a pas pu être appliquée. Les contrôles techniques ont été relancés côté API.',
    )
    await loadPreview()
  } finally {
    applying.value = false
  }
}

function serviceCompatibilityLabel(template: PlanningTemplateMini): string {
  const dates = effectiveDates.value
  if (dates.length === 0) return 'Modèle horaire courant'
  const keys: PlanningDayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const invalid = dates.filter((iso) => {
    const day = keys[new Date(`${iso}T12:00:00`).getDay()]!
    const blocks = template.definition?.[day]
    return !Array.isArray(blocks) || blocks.length === 0
  }).length
  return invalid === 0
      ? 'Disponible sur toutes les dates ciblées'
      : `${invalid} date(s) sans horaire dans ce modèle`
}
function formatIso(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${iso}T12:00:00`))
}
function issueKey(issue: SuggestionBulkEditIssue): string {
  return `${issue.code}-${JSON.stringify(issue.details ?? {})}`
}
</script>

<style scoped>
.field-label { font-size: 0.75rem; font-weight: 700; color: #334155; }
.field-control { width: 100%; border: 1px solid #cbd5e1; border-radius: 0.75rem; background: white; padding: 0.65rem 0.8rem; font-size: 0.75rem; color: #0f172a; outline: none; }
.field-control:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgb(99 102 241 / 0.1); }
.primary-button, .secondary-button, .small-button { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 0.75rem; font-size: 0.75rem; font-weight: 700; transition: 0.16s; }
.primary-button { background: #4f46e5; color: white; padding: 0.68rem 1rem; }
.primary-button:hover:not(:disabled) { background: #4338ca; }
.primary-button:disabled { cursor: not-allowed; opacity: 0.5; }
.secondary-button { border: 1px solid #e2e8f0; background: white; color: #475569; padding: 0.65rem 0.9rem; }
.small-button { border: 1px solid #e2e8f0; background: white; color: #475569; padding: 0.45rem 0.65rem; }
.choice-card { display: flex; min-height: 82px; align-items: flex-start; gap: 0.75rem; border: 1px solid #e2e8f0; border-radius: 1rem; background: white; padding: 0.9rem; text-align: left; transition: 0.16s; }
.choice-card:hover { border-color: #c7d2fe; }
.choice-card.selected { border-color: #a5b4fc; background: #eef2ff; box-shadow: 0 0 0 2px #e0e7ff; }
.scope-card { display: flex; align-items: center; gap: 0.7rem; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 0.85rem; background: white; color: #475569; text-align: left; transition: 0.16s; }
.scope-card strong { display: block; font-size: 0.75rem; color: #0f172a; }
.scope-card small { display: block; margin-top: 0.15rem; font-size: 0.65rem; color: #94a3b8; }
.scope-card.selected { border-color: #a5b4fc; background: #eef2ff; color: #4f46e5; box-shadow: 0 0 0 2px #e0e7ff; }
.metric-card { border: 1px solid #e2e8f0; border-radius: 0.9rem; background: #fff; padding: 0.8rem; }
.metric-card span { display: block; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
.metric-card strong { display: block; margin-top: 0.25rem; font-size: 1.1rem; color: #0f172a; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.16s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
