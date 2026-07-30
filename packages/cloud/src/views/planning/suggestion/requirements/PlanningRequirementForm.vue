<template>
  <PlanningDrawer :open="open" eyebrow="Besoin de couverture"
                  :title="isEdit ? 'Modifier le besoin' : 'Ajouter un besoin'"
                  description="Décrivez le service, les effectifs attendus et les jours auxquels cette règle doit s’appliquer."
                  @close="$emit('close')">
    <div class="space-y-6">
      <section>
        <label class="text-xs font-bold text-slate-700">Jours concernés <span class="text-red-500">*</span></label>
        <p class="mt-1 text-[11px] text-slate-400">En création, la même règle peut être enregistrée en une seule fois
          sur plusieurs jours.</p>
        <div class="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
          <button v-for="day in DAY_ORDER" :key="day" type="button"
                  class="rounded-xl border px-2 py-2.5 text-[11px] font-bold transition"
                  :class="selectedDays.includes(day) ? 'border-indigo-300 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'"
                  :disabled="isEdit" @click="toggleDay(day)">{{ DAY_LABELS[day].slice(0, 3) }}
          </button>
        </div>
        <p v-if="errors.days" class="field-error-text mt-2">{{ errors.days }}</p>
      </section>

      <section>
        <label class="text-xs font-bold text-slate-700">Type de service</label>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <button type="button" class="rounded-2xl border p-4 text-left transition"
                  :class="form.service_type === 'STANDARD' ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white'"
                  @click="setServiceType('STANDARD')">
            <IconSun :size="20" class="text-blue-600"/>
            <p class="mt-3 text-xs font-bold text-slate-800">Service standard</p>
            <p class="mt-1 text-[10px] leading-4 text-slate-500">Le service commence et se termine dans la même
              journée.</p>
          </button>
          <button type="button" class="rounded-2xl border p-4 text-left transition"
                  :class="form.service_type === 'GUARD' ? 'border-violet-300 bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 bg-white'"
                  @click="setServiceType('GUARD')">
            <IconMoonStars :size="20" class="text-violet-600"/>
            <p class="mt-3 text-xs font-bold text-slate-800">Garde</p>
            <p class="mt-1 text-[10px] leading-4 text-slate-500">Le service traverse minuit et possède une continuation
              le lendemain.</p>
          </button>
        </div>
      </section>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="text-xs font-bold text-slate-700">Session Template principal <span class="text-red-500">*</span></label>
          <select v-model="form.session_template" class="field-control mt-2"
                  :class="{ 'field-control-error': errors.session_template }">
            <option value="">Sélectionner le service…</option>
            <option v-for="template in mainTemplates" :key="template.guid" :value="template.guid">{{ template.name }} ·
              {{ templateSummary(template, selectedDays[0]) }}
            </option>
          </select>
          <p v-if="errors.session_template" class="field-error-text">{{ errors.session_template }}</p>
          <p class="field-help">Seuls les templates qui contiennent du travail sur tous les jours sélectionnés sont
            proposés.</p>
        </div>

        <template v-if="form.service_type === 'GUARD'">
          <div class="sm:col-span-2 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
            <label class="text-xs font-bold text-slate-700">Template de continuation <span class="text-red-500">*</span></label>
            <select v-model="form.continuation_template" class="field-control mt-2"
                    :class="{ 'field-control-error': errors.continuation_template }">
              <option value="">Sélectionner la fin de garde…</option>
              <option v-for="template in continuationTemplates" :key="template.guid" :value="template.guid">
                {{ template.name }}
              </option>
            </select>
            <p v-if="errors.continuation_template" class="field-error-text">{{ errors.continuation_template }}</p>
            <p class="field-help">Cette partie est automatiquement affectée le lendemain du début de garde.</p>
          </div>
        </template>
      </div>

      <section>
        <label class="text-xs font-bold text-slate-700">Mode d’allocation</label>
        <div class="mt-3 space-y-2">
          <button v-for="mode in allocationModes" :key="mode.value" type="button"
                  class="flex w-full items-start gap-3 rounded-xl border p-3 text-left transition"
                  :class="form.allocation_mode === mode.value ? 'border-indigo-300 bg-indigo-50/70 ring-2 ring-indigo-100' : 'border-slate-200 bg-white hover:border-slate-300'"
                  :disabled="mode.value === 'FILL_REMAINING' && form.service_type === 'GUARD'"
                  @click="setAllocationMode(mode.value)">
            <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                  :class="form.allocation_mode === mode.value ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-transparent'"><IconCheck
                :size="12"/></span>
            <span><span class="text-xs font-bold text-slate-800">{{ mode.label }}</span><span
                class="mt-1 block text-[10px] leading-4 text-slate-500">{{ mode.description }}</span></span>
          </button>
        </div>
      </section>

      <div v-if="form.allocation_mode === 'EXACT'" class="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
        <label class="text-xs font-bold text-slate-700">Effectif exact</label>
        <input v-model.number="exactEmployees" type="number" min="0" class="field-control mt-2"/>
        <p class="field-help">Le minimum, la cible et le maximum auront cette même valeur.</p>
      </div>

      <div v-else-if="form.allocation_mode === 'RANGE'" class="grid gap-4 sm:grid-cols-3">
        <div><label class="text-xs font-bold text-slate-700">Minimum</label><input v-model.number="form.min_employees"
                                                                                   type="number" min="0"
                                                                                   class="field-control mt-2"/></div>
        <div><label class="text-xs font-bold text-slate-700">Cible</label><input v-model.number="form.target_employees"
                                                                                 type="number" min="0"
                                                                                 class="field-control mt-2"/></div>
        <div><label class="text-xs font-bold text-slate-700">Maximum</label><input v-model="maxEmployeesInput"
                                                                                   type="number" min="0"
                                                                                   class="field-control mt-2"
                                                                                   placeholder="Libre"/></div>
      </div>

      <div v-else class="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4 text-xs leading-5 text-cyan-800">
        Après les services obligatoires, tous les collaborateurs encore compatibles sont affectés à ce service. Les
        effectifs minimum et cible sont automatiquement fixés à zéro.
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div><label class="text-xs font-bold text-slate-700">Priorité</label><input v-model.number="form.priority"
                                                                                    type="number" min="1" max="1000"
                                                                                    class="field-control mt-2"/>
          <p class="field-help">Une valeur faible est traitée avant une valeur élevée.</p></div>
        <div><label class="text-xs font-bold text-slate-700">Durée créditée</label>
          <div class="relative mt-2"><input v-model="creditedHours" type="number" min="0.5" max="168" step="0.5"
                                            class="field-control pr-14" placeholder="Durée réelle"/><span
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">heures</span></div>
          <p class="field-help">Utilisée dans la charge hebdomadaire.</p></div>
      </div>

      <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div><p class="text-xs font-bold text-slate-800">Besoin actif</p>
          <p class="mt-1 text-[11px] text-slate-500">Un besoin désactivé n’est pas envoyé au moteur.</p></div>
        <PlanningToggle v-model="form.active"/>
      </div>
      <div v-if="globalError"
           class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">{{ globalError }}
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-3">
        <button type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                :disabled="saving" @click="$emit('close')">Annuler
        </button>
        <button type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                :disabled="saving || loadingTemplates" @click="save">
          <IconLoader2 v-if="saving" :size="15" class="animate-spin"/>
          <IconCheck v-else :size="15"/>
          {{
            saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : selectedDays.length > 1 ? `Créer sur ${selectedDays.length} jours` : 'Créer le besoin'
          }}
        </button>
      </div>
    </template>
  </PlanningDrawer>
</template>

<script setup lang="ts">
import {computed, reactive, ref, watch} from 'vue'
import {IconCheck, IconLoader2, IconMoonStars, IconSun} from '@tabler/icons-vue'
import SessionTemplateService from '@/service/SessionTemplate'
import PlanningSuggestionRequirementService from '@/service/PlanningSuggestionRequirementService'
import PlanningDrawer from '../components/PlanningDrawer.vue'
import PlanningToggle from '../components/PlanningToggle.vue'
import {DAY_LABELS, DAY_ORDER, responseError} from '../planningSuggestion.helpers'
import type {
  AllocationMode,
  PlanningDayKey,
  PlanningRequirement,
  PlanningRequirementPayload,
  PlanningServiceType,
  PlanningTemplateMini
} from '../planningSuggestion.type'

const props = withDefaults(defineProps<{
  open: boolean;
  configGuid: string;
  requirement?: PlanningRequirement | null;
  initialDay?: PlanningDayKey | null
}>(), {requirement: null, initialDay: null})
const emit = defineEmits<{ close: []; saved: [] }>()
const loadingTemplates = ref(false);
const saving = ref(false);
const globalError = ref('');
const templates = ref<PlanningTemplateMini[]>([]);
const selectedDays = ref<PlanningDayKey[]>([]);
const exactEmployees = ref(1);
const maxEmployeesInput = ref('1');
const creditedHours = ref('');
const errors = reactive<Record<string, string>>({})
const form = reactive({
  session_template: '',
  continuation_template: '',
  service_type: 'STANDARD' as PlanningServiceType,
  allocation_mode: 'RANGE' as AllocationMode,
  min_employees: 1,
  target_employees: 1,
  priority: 100,
  active: true
})
const isEdit = computed(() => Boolean(props.requirement?.guid))
const allocationModes = [
  {
    value: 'EXACT' as const,
    label: 'Effectif exact',
    description: 'Le moteur doit affecter exactement le nombre indiqué.'
  },
  {
    value: 'RANGE' as const,
    label: 'Fourchette',
    description: 'Respecte le minimum et le maximum, puis cherche la cible.'
  },
  {
    value: 'FILL_REMAINING' as const,
    label: 'Affecter les disponibles',
    description: 'Place tous les collaborateurs encore disponibles sur ce service.'
  },
]
const mainTemplates = computed(() => templates.value.filter((template) => selectedDays.value.every((day) => hasWork(template, day))))
const continuationTemplates = computed(() => templates.value.filter((template) => selectedDays.value.every((day) => hasWork(template, nextDay(day)))))

watch(() => props.open, async (open) => {
  if (open) {
    reset();
    await loadTemplates()
  }
})

function reset() {
  Object.keys(errors).forEach(k => delete errors[k]);
  globalError.value = '';
  const r = props.requirement;
  selectedDays.value = [r?.day_of_week ?? props.initialDay ?? 'Mon'];
  form.session_template = r?.session_template?.guid ?? '';
  form.continuation_template = r?.continuation_template?.guid ?? '';
  form.service_type = r?.service_type ?? 'STANDARD';
  form.allocation_mode = r?.allocation_mode ?? 'RANGE';
  form.min_employees = r?.min_employees ?? 1;
  form.target_employees = r?.target_employees ?? 1;
  exactEmployees.value = r?.target_employees ?? 1;
  maxEmployeesInput.value = r?.max_employees === null || r?.max_employees === undefined ? '' : String(r.max_employees);
  creditedHours.value = r?.credited_minutes ? String(r.credited_minutes / 60) : '';
  form.priority = r?.priority ?? 100;
  form.active = r?.active ?? true
}

async function loadTemplates() {
  loadingTemplates.value = true;
  try {
    const response = await SessionTemplateService.list({current: true, active: true, limit: 250});
    templates.value = response?.data?.templates?.items ?? response?.data?.session_templates?.items ?? []
  } catch (error: any) {
    globalError.value = responseError(error, 'Impossible de charger les Session Templates.')
  } finally {
    loadingTemplates.value = false
  }
}

function toggleDay(day: PlanningDayKey) {
  selectedDays.value = selectedDays.value.includes(day) ? selectedDays.value.filter(d => d !== day) : [...selectedDays.value, day];
  if (form.session_template && !mainTemplates.value.some(t => t.guid === form.session_template)) form.session_template = '';
  if (form.continuation_template && !continuationTemplates.value.some(t => t.guid === form.continuation_template)) form.continuation_template = ''
}

function setServiceType(type: PlanningServiceType) {
  form.service_type = type;
  if (type === 'STANDARD') {
    form.continuation_template = '';
    if (form.allocation_mode === 'EXACT') {
    }
  } else if (form.allocation_mode === 'FILL_REMAINING') {
    setAllocationMode('EXACT')
  }
}

function setAllocationMode(mode: AllocationMode) {
  form.allocation_mode = mode;
  if (mode === 'EXACT') {
    exactEmployees.value = Math.max(0, form.target_employees || 1)
  }
  if (mode === 'FILL_REMAINING') {
    form.min_employees = 0;
    form.target_employees = 0;
    maxEmployeesInput.value = ''
  }
}

function validate() {
  Object.keys(errors).forEach(k => delete errors[k]);
  if (!selectedDays.value.length) errors.days = 'Sélectionnez au moins un jour.';
  if (!form.session_template) errors.session_template = 'Sélectionnez le template principal.';
  if (form.service_type === 'GUARD' && !form.continuation_template) errors.continuation_template = 'Sélectionnez le template de continuation.';
  if (form.allocation_mode === 'RANGE') {
    const max = maxEmployeesInput.value === '' ? null : Number(maxEmployeesInput.value);
    if (form.target_employees < form.min_employees) errors.employees = 'La cible doit être supérieure ou égale au minimum.';
    if (max !== null && max < form.target_employees) errors.employees = 'Le maximum doit être supérieur ou égal à la cible.'
  }
  if (errors.employees) globalError.value = errors.employees;
  return Object.keys(errors).length === 0
}

function payload(day: PlanningDayKey): PlanningRequirementPayload {
  let min = form.min_employees, target = form.target_employees,
      max = maxEmployeesInput.value === '' ? null : Number(maxEmployeesInput.value);
  if (form.allocation_mode === 'EXACT') {
    min = target = max = Number(exactEmployees.value)
  }
  if (form.allocation_mode === 'FILL_REMAINING') {
    min = 0;
    target = 0;
    max = null
  }
  return {
    session_template: form.session_template,
    continuation_template: form.service_type === 'GUARD' ? form.continuation_template : null,
    continuation_day_offset: form.service_type === 'GUARD' ? 1 : 0,
    day_of_week: day,
    service_type: form.service_type,
    allocation_mode: form.allocation_mode,
    min_employees: min,
    target_employees: target,
    max_employees: max,
    credited_minutes: creditedHours.value ? Math.round(Number(creditedHours.value) * 60) : null,
    priority: Number(form.priority),
    active: form.active
  }
}

async function save() {
  if (!validate()) return;
  saving.value = true;
  globalError.value = '';
  try {
    if (isEdit.value) {
      const response = await PlanningSuggestionRequirementService.update(props.requirement!.guid, payload(selectedDays.value[0]));
      if (!response?.success) throw response
    } else {
      for (const day of selectedDays.value) {
        const response = await PlanningSuggestionRequirementService.create(props.configGuid, payload(day));
        if (!response?.success) throw response
      }
    }
    emit('saved')
  } catch (error: any) {
    globalError.value = responseError(error, 'Impossible d’enregistrer ce besoin.')
  } finally {
    saving.value = false
  }
}

function hasWork(template: PlanningTemplateMini, day: PlanningDayKey) {
  const blocks = template.definition?.[day];
  return Array.isArray(blocks) && blocks.length > 0
}

function nextDay(day: PlanningDayKey): PlanningDayKey {
  return DAY_ORDER[(DAY_ORDER.indexOf(day) + 1) % 7]
}

function templateSummary(template: PlanningTemplateMini, day?: PlanningDayKey) {
  if (!day) return '';
  const blocks = template.definition?.[day];
  return Array.isArray(blocks) && blocks.length ? `${blocks[0].work[0]}–${blocks[0].work[1]}` : 'aucun horaire'
}
</script>

<style scoped>
.field-control {
  width: 100%;
  border-radius: .75rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: .7rem .8rem;
  font-size: .75rem;
  color: #334155;
  outline: none;
  transition: .16s
}

.field-control:focus {
  border-color: #a5b4fc;
  box-shadow: 0 0 0 3px #e0e7ff
}

.field-control-error {
  border-color: #fca5a5
}

.field-error-text {
  font-size: .68rem;
  color: #dc2626
}

.field-help {
  margin-top: .35rem;
  font-size: .68rem;
  line-height: 1rem;
  color: #94a3b8
}
</style>
