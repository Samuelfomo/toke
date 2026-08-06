<template>
  <PlanningDrawer
      :open="open"
      eyebrow="Besoin de couverture"
      :title="isEdit ? 'Modifier le besoin' : 'Ajouter un besoin'"
      description="Décrivez le service, les effectifs attendus, les jours concernés et la population autorisée à couvrir ce besoin."
      :loading="saving"
      :dirty="isDirty"
      @close="$emit('close')"
  >
    <div class="space-y-6">
      <RequirementDaySelector
        :model-value="selectedDays"
        :disabled="isEdit"
        :conflict-days="duplicateConflictDays"
        :error="errors.days"
        @update:model-value="updateSelectedDays"
      />

      <section>
        <label class="text-xs font-bold text-slate-700">Type de service</label>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <button
              type="button"
              class="rounded-2xl border p-4 text-left transition"
              :class="form.service_type === 'STANDARD'
                ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                : 'border-slate-200 bg-white'"
              @click="setServiceType('STANDARD')"
          >
            <IconSun :size="20" class="text-blue-600" />
            <p class="mt-3 text-xs font-bold text-slate-800">Service standard</p>
            <p class="mt-1 text-xs leading-4 text-slate-500">
              Le service commence et se termine dans la même journée.
            </p>
          </button>

          <button
              type="button"
              class="rounded-2xl border p-4 text-left transition"
              :class="form.service_type === 'GUARD'
                ? 'border-violet-300 bg-violet-50 ring-2 ring-violet-100'
                : 'border-slate-200 bg-white'"
              @click="setServiceType('GUARD')"
          >
            <IconMoonStars :size="20" class="text-violet-600" />
            <p class="mt-3 text-xs font-bold text-slate-800">Garde</p>
            <p class="mt-1 text-xs leading-4 text-slate-500">
              Le service traverse minuit et possède une continuation le lendemain.
            </p>
          </button>
        </div>
      </section>

      <section class="rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <IconUsersGroup :size="18" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">Population éligible</h3>
            <p class="mt-1 text-xs leading-4 text-slate-500">
              Limitez ce besoin selon le mode de planning et l’appartenance au pool hebdomadaire de garde.
            </p>
          </div>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p class="text-xs font-bold text-slate-700">Modes de planning autorisés</p>
            <div class="mt-2 space-y-2">
              <label
                  v-for="mode in planningModeOptions"
                  :key="mode.value"
                  class="flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3"
                  :class="form.eligibility_planning_modes.includes(mode.value)
                    ? 'border-blue-300'
                    : 'border-slate-200'"
              >
                <input
                    type="checkbox"
                    class="mt-0.5"
                    :checked="form.eligibility_planning_modes.includes(mode.value)"
                    @change="toggleEligibilityPlanningMode(mode.value)"
                />
                <span>
                  <span class="block text-xs font-bold text-slate-800">{{ mode.label }}</span>
                  <span class="mt-1 block text-xs leading-4 text-slate-500">{{ mode.description }}</span>
                </span>
              </label>
            </div>
            <p v-if="errors.eligibility_planning_modes" class="field-error-text">
              {{ errors.eligibility_planning_modes }}
            </p>
          </div>

          <div>
            <label class="text-xs font-bold text-slate-700">
              Relation avec le pool de garde
            </label>
            <select v-model="form.eligibility_guard_pool_relation" class="field-control mt-2">
              <option value="ANY">Tous, indépendamment du pool</option>
              <option value="MEMBER">Uniquement les membres du pool</option>
              <option value="NON_MEMBER">Uniquement les employés hors pool</option>
            </select>
            <p class="field-help">
              MEMBER et NON_MEMBER sont actifs lorsqu’une politique de pool hebdomadaire est configurée.
            </p>
          </div>
        </div>
      </section>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="text-xs font-bold text-slate-700">
            Session Template principal <span class="text-red-500">*</span>
          </label>
          <select
              v-model="form.session_template"
              class="field-control mt-2"
              :class="{ 'field-control-error': errors.session_template }"
          >
            <option value="">Sélectionner le service…</option>
            <option
                v-for="template in mainTemplates"
                :key="template.guid"
                :value="template.guid"
            >
              {{ template.name }} · {{ templateSummary(template, selectedDays[0]) }}
            </option>
          </select>
          <p v-if="errors.session_template" class="field-error-text">
            {{ errors.session_template }}
          </p>
          <p class="field-help">
            Seuls les templates ayant un horaire sur tous les jours sélectionnés sont proposés.
          </p>
        </div>

        <div
            v-if="form.service_type === 'GUARD'"
            class="sm:col-span-2 rounded-2xl border border-violet-100 bg-violet-50/40 p-4"
        >
          <label class="text-xs font-bold text-slate-700">
            Template de continuation <span class="text-red-500">*</span>
          </label>
          <select
              v-model="form.continuation_template"
              class="field-control mt-2"
              :class="{ 'field-control-error': errors.continuation_template }"
          >
            <option value="">Sélectionner la fin de garde…</option>
            <option
                v-for="template in continuationTemplates"
                :key="template.guid"
                :value="template.guid"
            >
              {{ template.name }}
            </option>
          </select>
          <p v-if="errors.continuation_template" class="field-error-text">
            {{ errors.continuation_template }}
          </p>
          <p class="field-help">
            Cette partie est affectée automatiquement le lendemain du début de garde.
          </p>
        </div>
      </div>

      <section>
        <label class="text-xs font-bold text-slate-700">Mode d’allocation</label>
        <div class="mt-3 space-y-2">
          <button
              v-for="mode in allocationModes"
              :key="mode.value"
              type="button"
              class="flex w-full items-start gap-3 rounded-xl border p-3 text-left transition"
              :class="form.allocation_mode === mode.value
                ? 'border-blue-300 bg-blue-50/70 ring-2 ring-blue-100'
                : 'border-slate-200 bg-white hover:border-slate-300'"
              :disabled="mode.value === 'FILL_REMAINING' && form.service_type === 'GUARD'"
              @click="setAllocationMode(mode.value)"
          >
            <span
                class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                :class="form.allocation_mode === mode.value
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-300 text-transparent'"
            >
              <IconCheck :size="12" />
            </span>
            <span>
              <span class="text-xs font-bold text-slate-800">{{ mode.label }}</span>
              <span class="mt-1 block text-xs leading-4 text-slate-500">{{ mode.description }}</span>
            </span>
          </button>
        </div>
      </section>

      <div v-if="form.allocation_mode !== 'FILL_REMAINING'" class="grid gap-4 sm:grid-cols-3">
        <template v-if="form.allocation_mode === 'EXACT'">
          <div class="sm:col-span-3">
            <label class="text-xs font-bold text-slate-700">Effectif exact</label>
            <input v-model.number="exactEmployees" type="number" min="0" class="field-control mt-2" />
          </div>
        </template>
        <template v-else>
          <div>
            <label class="text-xs font-bold text-slate-700">Minimum</label>
            <input v-model.number="form.min_employees" type="number" min="0" class="field-control mt-2" />
          </div>
          <div>
            <label class="text-xs font-bold text-slate-700">Cible</label>
            <input v-model.number="form.target_employees" type="number" min="0" class="field-control mt-2" />
          </div>
          <div>
            <label class="text-xs font-bold text-slate-700">Maximum</label>
            <input v-model="maxEmployeesInput" type="number" min="0" class="field-control mt-2" placeholder="Sans limite" />
          </div>
        </template>
      </div>

      <div
          v-else
          class="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-5 text-blue-800"
      >
        Après les services obligatoires, tous les collaborateurs encore compatibles sont affectés à ce service.
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="text-xs font-bold text-slate-700">Priorité</label>
          <input v-model.number="form.priority" type="number" min="1" max="1000" class="field-control mt-2" />
          <p class="field-help">Une valeur faible est traitée avant une valeur élevée.</p>
        </div>
        <div>
          <label class="text-xs font-bold text-slate-700">Durée créditée</label>
          <div class="relative mt-2">
            <input
                v-model="creditedHours"
                type="number"
                min="0.5"
                max="168"
                step="0.5"
                class="field-control pr-14"
                placeholder="Durée réelle"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">heures</span>
          </div>
          <p class="field-help">Utilisée dans la charge hebdomadaire.</p>
        </div>
      </div>

      <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <p class="text-xs font-bold text-slate-800">Besoin actif</p>
          <p class="mt-1 text-xs text-slate-500">Un besoin désactivé n’est pas envoyé au moteur.</p>
        </div>
        <PlanningToggle v-model="form.active" />
      </div>

      <div
        v-if="duplicateConflictDays.length"
        class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
      >
        <div class="flex items-start gap-3">
          <IconAlertTriangle :size="18" class="mt-0.5 shrink-0 text-red-600" />
          <div>
            <p class="text-xs font-bold text-red-900">Règle identique déjà enregistrée</p>
            <p class="mt-1 text-xs leading-4 text-red-700">
              Une règle ayant le même service, les mêmes effectifs et la même population existe déjà pour :
              <strong>{{ duplicateConflictLabel }}</strong>.
            </p>
          </div>
        </div>
      </div>

      <section class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Résumé avant enregistrement</p>
            <p class="mt-2 text-sm font-bold text-slate-900">{{ selectedTemplateName }}</p>
          </div>
          <span
            class="rounded-full px-2.5 py-1 text-xs font-bold"
            :class="form.service_type === 'GUARD'
              ? 'bg-violet-100 text-violet-700'
              : 'bg-blue-100 text-blue-700'"
          >
            {{ form.service_type === 'GUARD' ? 'Garde' : 'Standard' }}
          </span>
        </div>
        <dl class="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt class="text-xs font-bold uppercase text-slate-400">Jours</dt>
            <dd class="mt-1 text-xs font-semibold text-slate-700">{{ selectedDaysLabel }}</dd>
          </div>
          <div>
            <dt class="text-xs font-bold uppercase text-slate-400">Allocation</dt>
            <dd class="mt-1 text-xs font-semibold text-slate-700">{{ allocationSummary }}</dd>
          </div>
          <div>
            <dt class="text-xs font-bold uppercase text-slate-400">Population</dt>
            <dd class="mt-1 text-xs font-semibold text-slate-700">{{ eligibilitySummary }}</dd>
          </div>
        </dl>
      </section>

      <div
          v-if="globalError"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
      >
        {{ globalError }}
      </div>
    </div>

    <template #footer="{ requestClose }">
      <div class="flex items-center justify-between gap-3">
        <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            :disabled="saving"
            @click="requestClose"
        >
          Annuler
        </button>
        <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            :disabled="saving || loadingTemplates"
            @click="save"
        >
          <IconLoader2 v-if="saving" :size="15" class="animate-spin" />
          <IconCheck v-else :size="15" />
          {{ saving
            ? 'Enregistrement…'
            : isEdit
                ? 'Enregistrer'
                : selectedDays.length > 1
                    ? `Créer sur ${selectedDays.length} jours`
                    : 'Créer le besoin' }}
        </button>
      </div>
    </template>
  </PlanningDrawer>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import {
  IconAlertTriangle,
  IconCheck,
  IconLoader2,
  IconMoonStars,
  IconSun,
  IconUsersGroup,
} from '@tabler/icons-vue'

import SessionTemplateService from '@/service/SessionTemplate'
import PlanningSuggestionRequirementService from '@/service/PlanningSuggestionRequirementService'
import { useFormDirty } from '@/views/planning/composables/useFormDirty'

import PlanningDrawer from '../components/PlanningDrawer.vue'
import PlanningToggle from '../components/PlanningToggle.vue'
import RequirementDaySelector from './RequirementDaySelector.vue'
import { findExactDuplicateDays } from './requirementMatrix.helpers'
import {
  DAY_LABELS,
  DAY_ORDER,
  responseError,
} from '../planningSuggestion.helpers'
import type {
  AllocationMode,
  GuardPoolRelation,
  PlanningDayKey,
  PlanningRequirement,
  PlanningRequirementPayload,
  PlanningServiceType,
  PlanningTemplateMini,
  PolicyPlanningMode,
} from '../planningSuggestion.type'

const props = withDefaults(
    defineProps<{
      open: boolean
      configGuid: string
      requirement?: PlanningRequirement | null
      seedRequirement?: PlanningRequirement | null
      existingRequirements?: PlanningRequirement[]
      initialDay?: PlanningDayKey | null
    }>(),
    {
      requirement: null,
      seedRequirement: null,
      existingRequirements: () => [],
      initialDay: null,
    },
)

const emit = defineEmits<{
  close: []
  saved: []
}>()

const loadingTemplates = ref(false)
const saving = ref(false)
const globalError = ref('')
const templates = ref<PlanningTemplateMini[]>([])
const selectedDays = ref<PlanningDayKey[]>([])
const exactEmployees = ref(1)
const maxEmployeesInput = ref<number | string>('1')
const creditedHours = ref<number | string>('')
const errors = reactive<Record<string, string>>({})

const form = reactive({
  session_template: '',
  continuation_template: '',
  service_type: 'STANDARD' as PlanningServiceType,
  allocation_mode: 'RANGE' as AllocationMode,
  min_employees: 1,
  target_employees: 1,
  priority: 100,
  active: true,
  eligibility_planning_modes: ['FIXED', 'ROTATING'] as PolicyPlanningMode[],
  eligibility_guard_pool_relation: 'ANY' as GuardPoolRelation,
})

const { isDirty, markPristine } = useFormDirty(
    () => ({
      ...form,
      selected_days: [...selectedDays.value],
      exact_employees: exactEmployees.value,
      max_employees: maxEmployeesInput.value,
      credited_hours: creditedHours.value,
    }),
    computed(() => props.open),
)

const planningModeOptions: Array<{
  value: PolicyPlanningMode
  label: string
  description: string
}> = [
  {
    value: 'FIXED',
    label: 'Profils fixes',
    description: 'Compte les collaborateurs dont le planning est piloté par un template fixe.',
  },
  {
    value: 'ROTATING',
    label: 'Profils rotatifs',
    description: 'Autorise les affectations calculées dynamiquement par le solveur.',
  },
]

const isEdit = computed(() => Boolean(props.requirement?.guid))

const candidatePayloads = computed(() =>
  selectedDays.value.map((day) => payload(day)),
)

const duplicateConflictDays = computed(() =>
  findExactDuplicateDays(
    candidatePayloads.value,
    props.existingRequirements,
    props.requirement?.guid,
  ),
)

const duplicateConflictLabel = computed(() =>
  duplicateConflictDays.value.map((day) => DAY_LABELS[day]).join(', '),
)

const selectedDaysLabel = computed(() =>
  selectedDays.value.length
    ? selectedDays.value.map((day) => DAY_LABELS[day]).join(', ')
    : 'Aucun jour sélectionné',
)

const selectedTemplateName = computed(() =>
  templates.value.find((template) => template.guid === form.session_template)?.name
    ?? props.requirement?.session_template?.name
    ?? props.seedRequirement?.session_template?.name
    ?? 'Aucun horaire type sélectionné',
)

const allocationSummary = computed(() => {
  if (form.allocation_mode === 'FILL_REMAINING') return 'Tous les disponibles'
  if (form.allocation_mode === 'EXACT') return `${Number(exactEmployees.value) || 0} employé(s)`
  const maximum = maxEmployeesInput.value === '' ? 'sans limite' : maxEmployeesInput.value
  return `${form.min_employees} minimum · ${form.target_employees} cible · ${maximum} maximum`
})

const eligibilitySummary = computed(() => {
  const modes = form.eligibility_planning_modes
    .map((mode) => mode === 'FIXED' ? 'fixes' : 'rotatifs')
    .join(' et ')
  const relation = form.eligibility_guard_pool_relation === 'MEMBER'
    ? ' · membres du pool'
    : form.eligibility_guard_pool_relation === 'NON_MEMBER'
      ? ' · hors pool'
      : ''
  return `${modes || 'aucun profil'}${relation}`
})

const allocationModes = [
  {
    value: 'EXACT' as const,
    label: 'Effectif exact',
    description: 'Le moteur doit affecter exactement le nombre indiqué.',
  },
  {
    value: 'RANGE' as const,
    label: 'Fourchette',
    description: 'Respecte le minimum et le maximum, puis cherche la cible.',
  },
  {
    value: 'FILL_REMAINING' as const,
    label: 'Affecter les disponibles',
    description: 'Place tous les collaborateurs encore disponibles sur ce service.',
  },
]

const mainTemplates = computed(() =>
    templates.value.filter((template) =>
        selectedDays.value.every((day) => hasWork(template, day)),
    ),
)

const continuationTemplates = computed(() =>
    templates.value.filter((template) =>
        selectedDays.value.every((day) => hasWork(template, nextDay(day))),
    ),
)

watch(
    () => props.open,
    async (open) => {
      if (!open) return
      reset()
      await loadTemplates()
    },
)

function reset(): void {
  Object.keys(errors).forEach((key) => delete errors[key])
  globalError.value = ''

  const source = props.requirement ?? props.seedRequirement
  selectedDays.value = [
    props.requirement?.day_of_week ?? props.initialDay ?? source?.day_of_week ?? 'Mon',
  ]

  form.session_template = source?.session_template?.guid ?? ''
  form.continuation_template = source?.continuation_template?.guid ?? ''
  form.service_type = source?.service_type ?? 'STANDARD'
  form.allocation_mode = source?.allocation_mode ?? 'RANGE'
  form.min_employees = source?.min_employees ?? 1
  form.target_employees = source?.target_employees ?? 1
  exactEmployees.value = source?.target_employees ?? 1
  maxEmployeesInput.value =
      source?.max_employees === null || source?.max_employees === undefined
          ? ''
          : source.max_employees
  creditedHours.value = source?.credited_minutes
      ? source.credited_minutes / 60
      : ''
  form.priority = source?.priority ?? 100
  form.active = props.requirement?.active ?? true
  form.eligibility_planning_modes = [
    ...(source?.eligibility_policy?.planning_modes ?? ['FIXED', 'ROTATING']),
  ]
  form.eligibility_guard_pool_relation =
      source?.eligibility_policy?.guard_pool_relation ?? 'ANY'

  void nextTick(markPristine)
}

async function loadTemplates(): Promise<void> {
  loadingTemplates.value = true
  try {
    const response = await SessionTemplateService.list({
      current: true,
      active: true,
      limit: 250,
    })
    templates.value =
        response?.data?.templates?.items ??
        response?.data?.session_templates?.items ??
        []
    ensureTemplateCompatibility()
  } catch (error: any) {
    globalError.value = responseError(
        error,
        'Impossible de charger les Session Templates.',
    )
  } finally {
    loadingTemplates.value = false
  }
}

function updateSelectedDays(days: PlanningDayKey[]): void {
  selectedDays.value = [...days]
  ensureTemplateCompatibility()
}

function ensureTemplateCompatibility(): void {
  if (!templates.value.length) return

  if (
    form.session_template &&
    !mainTemplates.value.some((template) => template.guid === form.session_template)
  ) {
    form.session_template = ''
  }

  if (
    form.continuation_template &&
    !continuationTemplates.value.some(
      (template) => template.guid === form.continuation_template,
    )
  ) {
    form.continuation_template = ''
  }
}

function toggleEligibilityPlanningMode(mode: PolicyPlanningMode): void {
  form.eligibility_planning_modes =
      form.eligibility_planning_modes.includes(mode)
          ? form.eligibility_planning_modes.filter((value) => value !== mode)
          : [...form.eligibility_planning_modes, mode]
}

function setServiceType(type: PlanningServiceType): void {
  form.service_type = type

  if (type === 'STANDARD') {
    form.continuation_template = ''
  } else if (form.allocation_mode === 'FILL_REMAINING') {
    setAllocationMode('EXACT')
  }
}

function setAllocationMode(mode: AllocationMode): void {
  form.allocation_mode = mode

  if (mode === 'EXACT') {
    exactEmployees.value = Math.max(0, form.target_employees || 1)
  }

  if (mode === 'FILL_REMAINING') {
    form.min_employees = 0
    form.target_employees = 0
    maxEmployeesInput.value = ''
  }
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key])
  globalError.value = ''

  if (!selectedDays.value.length) {
    errors.days = 'Sélectionnez au moins un jour.'
  }
  if (!form.session_template) {
    errors.session_template = 'Sélectionnez le template principal.'
  }
  if (form.service_type === 'GUARD' && !form.continuation_template) {
    errors.continuation_template = 'Sélectionnez le template de continuation.'
  }
  if (!form.eligibility_planning_modes.length) {
    errors.eligibility_planning_modes =
        'Sélectionnez au moins un mode de planning autorisé.'
  }
  if (duplicateConflictDays.value.length) {
    errors.duplicates = `Une règle identique existe déjà pour ${duplicateConflictLabel.value}.`
  }

  if (form.allocation_mode === 'RANGE') {
    const maximum =
        maxEmployeesInput.value === ''
            ? null
            : Number(maxEmployeesInput.value)

    if (form.target_employees < form.min_employees) {
      errors.employees = 'La cible doit être supérieure ou égale au minimum.'
    }
    if (maximum !== null && maximum < form.target_employees) {
      errors.employees = 'Le maximum doit être supérieur ou égal à la cible.'
    }
  }

  if (errors.duplicates) {
    globalError.value = errors.duplicates
  } else if (errors.employees) {
    globalError.value = errors.employees
  }

  return Object.keys(errors).length === 0
}

function payload(day: PlanningDayKey): PlanningRequirementPayload {
  let minimum = form.min_employees
  let target = form.target_employees
  let maximum =
      maxEmployeesInput.value === ''
          ? null
          : Number(maxEmployeesInput.value)

  if (form.allocation_mode === 'EXACT') {
    minimum = Number(exactEmployees.value)
    target = minimum
    maximum = minimum
  }

  if (form.allocation_mode === 'FILL_REMAINING') {
    minimum = 0
    target = 0
    maximum = null
  }

  return {
    session_template: form.session_template,
    continuation_template:
        form.service_type === 'GUARD'
            ? form.continuation_template
            : null,
    continuation_day_offset: form.service_type === 'GUARD' ? 1 : 0,
    day_of_week: day,
    service_type: form.service_type,
    allocation_mode: form.allocation_mode,
    min_employees: minimum,
    target_employees: target,
    max_employees: maximum,
    credited_minutes:
        creditedHours.value === ''
            ? null
            : Math.round(Number(creditedHours.value) * 60),
    priority: Number(form.priority),
    active: form.active,
    eligibility_policy: {
      planning_modes: [...form.eligibility_planning_modes],
      guard_pool_relation: form.eligibility_guard_pool_relation,
    },
  }
}

async function save(): Promise<void> {
  if (!validate()) return

  saving.value = true
  globalError.value = ''

  let createdCount = 0

  try {
    if (isEdit.value) {
      const response = await PlanningSuggestionRequirementService.update(
          props.requirement!.guid,
          payload(selectedDays.value[0]),
      )
      if (!response?.success) throw response
    } else {
      for (const day of selectedDays.value) {
        const response = await PlanningSuggestionRequirementService.create(
            props.configGuid,
            payload(day),
        )
        if (!response?.success) throw response
        createdCount += 1
      }
    }

    markPristine()
    emit('saved')
  } catch (error: any) {
    const fallback = createdCount
      ? `${createdCount} jour(s) ont été enregistrés avant l’échec. Actualisez la matrice puis complétez les jours restants.`
      : 'Impossible d’enregistrer ce besoin.'
    globalError.value = responseError(error, fallback)
  } finally {
    saving.value = false
  }
}

function hasWork(
    template: PlanningTemplateMini,
    day: PlanningDayKey,
): boolean {
  const blocks = template.definition?.[day]
  return Array.isArray(blocks) && blocks.length > 0
}

function nextDay(day: PlanningDayKey): PlanningDayKey {
  return DAY_ORDER[(DAY_ORDER.indexOf(day) + 1) % 7]
}

function templateSummary(
    template: PlanningTemplateMini,
    day?: PlanningDayKey,
): string {
  if (!day) return ''
  const blocks = template.definition?.[day]
  return Array.isArray(blocks) && blocks.length
      ? `${blocks[0].work[0]}–${blocks[0].work[1]}`
      : 'aucun horaire'
}
</script>

<style scoped>
.field-control {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.7rem 0.8rem;
  font-size: 0.75rem;
  color: #334155;
  outline: none;
  transition: 0.16s;
}

.field-control:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px #dbeafe;
}

.field-control-error {
  border-color: #fca5a5;
}

.field-error-text {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: #dc2626;
}

.field-help {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  line-height: 1rem;
  color: #94a3b8;
}
</style>
