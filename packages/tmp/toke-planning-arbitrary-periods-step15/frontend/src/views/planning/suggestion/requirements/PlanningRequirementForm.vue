<template>
  <PlanningDrawer
      :open="open"
      eyebrow="Besoin de couverture"
      :title="isEdit ? 'Modifier le besoin' : 'Ajouter un besoin'"
      description="Décrivez le service, les effectifs attendus, les jours concernés et la population autorisée à couvrir ce besoin."
      @close="$emit('close')"
  >
    <div class="space-y-6">
      <section>
        <label class="text-xs font-bold text-slate-700">
          Jours concernés <span class="text-red-500">*</span>
        </label>
        <p class="mt-1 text-[11px] text-slate-400">
          En création, la même règle peut être enregistrée sur plusieurs jours.
        </p>
        <div class="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
          <button
              v-for="day in DAY_ORDER"
              :key="day"
              type="button"
              class="rounded-xl border px-2 py-2.5 text-[11px] font-bold transition"
              :class="selectedDays.includes(day)
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'"
              :disabled="isEdit"
              @click="toggleDay(day)"
          >
            {{ DAY_LABELS[day].slice(0, 3) }}
          </button>
        </div>
        <p v-if="errors.days" class="field-error-text mt-2">
          {{ errors.days }}
        </p>
      </section>

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
            <p class="mt-1 text-[10px] leading-4 text-slate-500">
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
            <p class="mt-1 text-[10px] leading-4 text-slate-500">
              Le service traverse minuit et possède une continuation le lendemain.
            </p>
          </button>
        </div>
      </section>

      <section class="rounded-2xl border border-cyan-100 bg-cyan-50/30 p-4">
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
            <IconUsersGroup :size="18" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">Population éligible</h3>
            <p class="mt-1 text-[11px] leading-4 text-slate-500">
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
                    ? 'border-cyan-300'
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
                  <span class="mt-1 block text-[10px] leading-4 text-slate-500">{{ mode.description }}</span>
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
                ? 'border-indigo-300 bg-indigo-50/70 ring-2 ring-indigo-100'
                : 'border-slate-200 bg-white hover:border-slate-300'"
              :disabled="mode.value === 'FILL_REMAINING' && form.service_type === 'GUARD'"
              @click="setAllocationMode(mode.value)"
          >
            <span
                class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                :class="form.allocation_mode === mode.value
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 text-transparent'"
            >
              <IconCheck :size="12" />
            </span>
            <span>
              <span class="text-xs font-bold text-slate-800">{{ mode.label }}</span>
              <span class="mt-1 block text-[10px] leading-4 text-slate-500">{{ mode.description }}</span>
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
          class="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4 text-xs leading-5 text-cyan-800"
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
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">heures</span>
          </div>
          <p class="field-help">Utilisée dans la charge hebdomadaire.</p>
        </div>
      </div>

      <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <p class="text-xs font-bold text-slate-800">Besoin actif</p>
          <p class="mt-1 text-[11px] text-slate-500">Un besoin désactivé n’est pas envoyé au moteur.</p>
        </div>
        <PlanningToggle v-model="form.active" />
      </div>

      <div
          v-if="globalError"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
      >
        {{ globalError }}
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-3">
        <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            :disabled="saving"
            @click="$emit('close')"
        >
          Annuler
        </button>
        <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
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
import { computed, reactive, ref, watch } from 'vue'
import {
  IconCheck,
  IconLoader2,
  IconMoonStars,
  IconSun,
  IconUsersGroup,
} from '@tabler/icons-vue'

import SessionTemplateService from '@/service/SessionTemplate'
import PlanningSuggestionRequirementService from '@/service/PlanningSuggestionRequirementService'

import PlanningDrawer from '../components/PlanningDrawer.vue'
import PlanningToggle from '../components/PlanningToggle.vue'
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
      initialDay?: PlanningDayKey | null
    }>(),
    {
      requirement: null,
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

  const requirement = props.requirement
  selectedDays.value = [
    requirement?.day_of_week ?? props.initialDay ?? 'Mon',
  ]

  form.session_template = requirement?.session_template?.guid ?? ''
  form.continuation_template = requirement?.continuation_template?.guid ?? ''
  form.service_type = requirement?.service_type ?? 'STANDARD'
  form.allocation_mode = requirement?.allocation_mode ?? 'RANGE'
  form.min_employees = requirement?.min_employees ?? 1
  form.target_employees = requirement?.target_employees ?? 1
  exactEmployees.value = requirement?.target_employees ?? 1
  maxEmployeesInput.value =
      requirement?.max_employees === null ||
      requirement?.max_employees === undefined
          ? ''
          : requirement.max_employees
  creditedHours.value = requirement?.credited_minutes
      ? requirement.credited_minutes / 60
      : ''
  form.priority = requirement?.priority ?? 100
  form.active = requirement?.active ?? true
  form.eligibility_planning_modes = [
    ...(requirement?.eligibility_policy?.planning_modes ?? ['FIXED', 'ROTATING']),
  ]
  form.eligibility_guard_pool_relation =
      requirement?.eligibility_policy?.guard_pool_relation ?? 'ANY'
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
  } catch (error: any) {
    globalError.value = responseError(
        error,
        'Impossible de charger les Session Templates.',
    )
  } finally {
    loadingTemplates.value = false
  }
}

function toggleDay(day: PlanningDayKey): void {
  selectedDays.value = selectedDays.value.includes(day)
      ? selectedDays.value.filter((value) => value !== day)
      : [...selectedDays.value, day]

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

  if (errors.employees) {
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
      }
    }

    emit('saved')
  } catch (error: any) {
    globalError.value = responseError(
        error,
        'Impossible d’enregistrer ce besoin.',
    )
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
  border-color: #a5b4fc;
  box-shadow: 0 0 0 3px #e0e7ff;
}

.field-control-error {
  border-color: #fca5a5;
}

.field-error-text {
  margin-top: 0.35rem;
  font-size: 0.68rem;
  color: #dc2626;
}

.field-help {
  margin-top: 0.35rem;
  font-size: 0.68rem;
  line-height: 1rem;
  color: #94a3b8;
}
</style>
