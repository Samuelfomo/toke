<template>
  <PlanningDrawer :open="open" eyebrow="Configuration moteur"
                  :title="isEdit ? 'Modifier les règles actives' : 'Créer une configuration'"
                  description="Les règles saisies ici deviennent la source de vérité du moteur pour les futures générations."
                  @close="$emit('close')">
    <div class="space-y-7">
      <section class="space-y-4">
        <div><label class="text-xs font-bold text-slate-700">Nom de la configuration <span class="text-red-500">*</span></label><input
            v-model="form.name" type="text" class="field-control mt-2"
            placeholder="Ex. Pharmacie du Plateau — règles 2026" :class="{'field-control-error':errors.name}"/>
          <p v-if="errors.name" class="field-error-text">{{ errors.name }}</p></div>
        <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div><p class="text-xs font-bold text-slate-800">Configuration active</p>
            <p class="mt-1 text-[11px] leading-4 text-slate-500">Une seule configuration peut être active. En création,
              il est conseillé de terminer les besoins avant l’activation.</p></div>
          <PlanningToggle v-model="form.active"/>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 p-4">
        <div class="flex items-center gap-2">
          <IconBeach :size="18" class="text-emerald-600"/>
          <h3 class="text-sm font-bold text-slate-900">Repos et séquences de travail</h3></div>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField v-model="form.min_rest_days_per_week" label="Repos minimum par semaine"
                       help="Journées complètes sans activité sur une semaine complète." suffix="jour(s)" :min="0"
                       :max="7"/>
          <NumberField v-model="form.max_consecutive_work_days" label="Jours consécutifs maximum"
                       help="Bloque les séquences de travail trop longues." suffix="jour(s)" :min="1" :max="31"/>
          <NumberField v-model="minRestHours" label="Repos minimum entre deux services"
                       help="Exemple : 11 heures correspondent à 660 minutes." suffix="heures" :min="0" :max="48"
                       :step="0.5"/>
          <NumberField v-model="maxWeeklyHours" label="Limite hebdomadaire générale"
                       help="Laissez vide pour ne pas fixer de plafond global." suffix="heures" :min="0.5" :max="168"
                       :step="0.5" optional/>
          <NumberField v-model="maxRestingInput" label="Repos simultanés maximum"
                       help="Laissez vide tant que la faisabilité réelle n’est pas vérifiée." suffix="employé(s)"
                       :min="1" optional/>
          <NumberField v-model="form.fairness_window_weeks" label="Fenêtre historique d’équité"
                       help="Période passée utilisée pour répartir équitablement les charges." suffix="semaine(s)"
                       :min="1" :max="52"/>
        </div>
      </section>

      <section class="rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
        <div class="flex items-center gap-2">
          <IconMoonStars :size="18" class="text-violet-600"/>
          <h3 class="text-sm font-bold text-slate-900">Gardes et récupération</h3></div>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField v-model="form.max_consecutive_guards" label="Gardes consécutives maximum"
                       help="Nombre maximal de débuts de garde successifs." suffix="garde(s)" :min="0" :max="31"/>
          <NumberField v-model="form.post_guard_rest_days" label="Repos complet après garde"
                       help="Jours de récupération après la journée de continuation." suffix="jour(s)" :min="0"
                       :max="31" :disabled="!form.rest_after_guard_required"/>
        </div>
        <div class="mt-4 flex items-center justify-between rounded-xl border border-violet-100 bg-white p-4">
          <div><p class="text-xs font-bold text-slate-800">Repos après garde obligatoire</p>
            <p class="mt-1 text-[11px] text-slate-500">Lorsque cette règle est active, le moteur bloque les jours de
              récupération.</p></div>
          <PlanningToggle v-model="form.rest_after_guard_required"/>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 p-4">
        <div class="flex items-center gap-2">
          <IconCpu2 :size="18" class="text-indigo-600"/>
          <h3 class="text-sm font-bold text-slate-900">Solveur et niveau d’exigence</h3></div>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" class="rounded-xl border p-4 text-left"
                  :class="form.solver_type==='ORTOOLS'?'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100':'border-slate-200'"
                  @click="form.solver_type='ORTOOLS'"><p class="text-xs font-bold text-slate-800">OR-Tools CP-SAT</p>
            <p class="mt-1 text-[10px] leading-4 text-slate-500">Résout globalement les contraintes et l’équité.
              Recommandé.</p></button>
          <button type="button" class="rounded-xl border p-4 text-left"
                  :class="form.solver_type==='GREEDY'?'border-amber-300 bg-amber-50 ring-2 ring-amber-100':'border-slate-200'"
                  @click="form.solver_type='GREEDY'"><p class="text-xs font-bold text-slate-800">Greedy</p>
            <p class="mt-1 text-[10px] leading-4 text-slate-500">Algorithme simplifié, utile uniquement comme solution
              de secours.</p></button>
        </div>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField v-model="form.solver_timeout_seconds" label="Temps maximum de résolution"
                       help="Le moteur s’arrête à cette limite et retourne la meilleure solution trouvée."
                       suffix="secondes" :min="1" :max="300"/>
          <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div><p class="text-xs font-bold text-slate-800">Fallback Greedy</p>
              <p class="mt-1 text-[11px] leading-4 text-slate-500">Autoriser l’algorithme simplifié si OR-Tools est
                indisponible.</p></div>
            <PlanningToggle v-model="form.fallback_to_greedy" :disabled="form.solver_type==='GREEDY'"/>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div><p class="text-xs font-bold text-slate-800">Couverture stricte</p>
            <p class="mt-1 text-[11px] leading-4 text-slate-500">Les minimums configurés deviennent des contraintes
              obligatoires.</p></div>
          <PlanningToggle v-model="form.strict_coverage"/>
        </div>
      </section>

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
                :disabled="saving" @click="save">
          <IconLoader2 v-if="saving" :size="15" class="animate-spin"/>
          <IconCheck v-else :size="15"/>
          {{ saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer la configuration' }}
        </button>
      </div>
    </template>
  </PlanningDrawer>
</template>

<script setup lang="ts">
import {computed, reactive, ref, watch} from 'vue'
import {IconBeach, IconCheck, IconCpu2, IconLoader2, IconMoonStars} from '@tabler/icons-vue'
import {useUserStore} from '@/stores/userStore'
import PlanningSuggestionConfigService from '@/service/PlanningSuggestionConfigService'
import PlanningDrawer from '../components/PlanningDrawer.vue'
import PlanningToggle from '../components/PlanningToggle.vue'
import NumberField from '../components/NumberField.vue'
import {responseError} from '../planningSuggestion.helpers'
import type {
  PlanningSolverType,
  PlanningSuggestionConfig,
  PlanningSuggestionConfigPayload
} from '../planningSuggestion.type'

const props = withDefaults(defineProps<{ open: boolean; config?: PlanningSuggestionConfig | null }>(), {config: null});
const emit = defineEmits<{ close: []; saved: [config: PlanningSuggestionConfig] }>();
const userStore = useUserStore();
const saving = ref(false);
const globalError = ref('');
const errors = reactive<Record<string, string>>({});
const minRestHours = ref<number | string>(11);
const maxWeeklyHours = ref<number | string>('');
const maxRestingInput = ref<number | string>('');
const form = reactive({
  name: '',
  active: false,
  min_rest_days_per_week: 1,
  max_consecutive_work_days: 6,
  max_consecutive_guards: 1,
  rest_after_guard_required: true,
  post_guard_rest_days: 1,
  fairness_window_weeks: 8,
  strict_coverage: true,
  solver_type: 'ORTOOLS' as PlanningSolverType,
  solver_timeout_seconds: 30,
  fallback_to_greedy: false
});
const isEdit = computed(() => Boolean(props.config?.guid));
watch(() => props.open, (open) => {
  if (open) reset()
})

function reset() {
  Object.keys(errors).forEach(k => delete errors[k]);
  globalError.value = '';
  const c = props.config;
  form.name = c?.name ?? '';
  form.active = c?.active ?? false;
  form.min_rest_days_per_week = c?.rules.min_rest_days_per_week ?? 1;
  form.max_consecutive_work_days = c?.rules.max_consecutive_work_days ?? 6;
  minRestHours.value = (c?.rules.min_rest_minutes_between_shifts ?? 660) / 60;
  maxWeeklyHours.value = c?.rules.max_weekly_minutes ? c.rules.max_weekly_minutes / 60 : '';
  form.max_consecutive_guards = c?.rules.max_consecutive_guards ?? 1;
  form.rest_after_guard_required = c?.rules.rest_after_guard_required ?? true;
  form.post_guard_rest_days = c?.rules.post_guard_rest_days ?? 1;
  maxRestingInput.value = c?.rules.max_resting_employees_per_day ?? '';
  form.fairness_window_weeks = c?.rules.fairness_window_weeks ?? 8;
  form.strict_coverage = c?.rules.strict_coverage ?? true;
  form.solver_type = c?.solver.type ?? 'ORTOOLS';
  form.solver_timeout_seconds = c?.solver.timeout_seconds ?? 30;
  form.fallback_to_greedy = c?.solver.fallback_to_greedy ?? false
}

function validate() {
  Object.keys(errors).forEach(k => delete errors[k]);
  if (form.name.trim().length < 2) errors.name = 'Saisissez un nom d’au moins deux caractères.';
  return Object.keys(errors).length === 0
}

function payload(): PlanningSuggestionConfigPayload {
  return {
    name: form.name.trim(),
    active: form.active,
    min_rest_days_per_week: Number(form.min_rest_days_per_week),
    max_consecutive_work_days: Number(form.max_consecutive_work_days),
    max_weekly_minutes: maxWeeklyHours.value === '' ? null : Math.round(Number(maxWeeklyHours.value) * 60),
    min_rest_minutes_between_shifts: Math.round(Number(minRestHours.value) * 60),
    max_consecutive_guards: Number(form.max_consecutive_guards),
    rest_after_guard_required: form.rest_after_guard_required,
    post_guard_rest_days: form.rest_after_guard_required ? Number(form.post_guard_rest_days) : 0,
    max_resting_employees_per_day: maxRestingInput.value === '' ? null : Number(maxRestingInput.value),
    fairness_window_weeks: Number(form.fairness_window_weeks),
    strict_coverage: form.strict_coverage,
    solver_type: form.solver_type,
    solver_timeout_seconds: Number(form.solver_timeout_seconds),
    fallback_to_greedy: form.solver_type === 'ORTOOLS' ? form.fallback_to_greedy : false
  }
}

async function save() {
  if (!validate()) return;
  saving.value = true;
  globalError.value = '';
  try {
    const response = isEdit.value ? await PlanningSuggestionConfigService.update(props.config!.guid, payload()) : await PlanningSuggestionConfigService.create(userStore.user?.guid ?? '', payload());
    if (!response?.success) throw response;
    emit('saved', response.data.planning_suggestion_config)
  } catch (error: any) {
    globalError.value = responseError(error, 'Impossible d’enregistrer cette configuration.')
  } finally {
    saving.value = false
  }
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

.field-control:disabled {
  background: #f1f5f9;
  color: #94a3b8
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