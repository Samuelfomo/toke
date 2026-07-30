<template>
  <PlanningDrawer
      :open="open"
      eyebrow="Profil employé"
      :title="isEdit ? 'Modifier le profil de planification' : 'Configurer un collaborateur'"
      description="Définissez comment ce collaborateur doit participer aux prochaines générations de planning."
      @close="$emit('close')"
  >
    <div class="space-y-6">
      <div class="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
        <div class="flex gap-3">
          <IconInfoCircle :size="19" class="mt-0.5 shrink-0 text-indigo-600"/>
          <div>
            <p class="text-xs font-bold text-indigo-950">Règle essentielle</p>
            <p class="mt-1 text-xs leading-5 text-indigo-800/80">Un profil fixe exige un Session Template. Un profil
              rotatif ou exclu ne doit pas en recevoir.</p>
          </div>
        </div>
      </div>

      <section class="space-y-3">
        <div>
          <label class="text-xs font-bold text-slate-700">Collaborateur <span class="text-red-500">*</span></label>
          <p class="mt-0.5 text-[11px] text-slate-400">Le collaborateur ne peut plus être changé après la création du
            profil.</p>
        </div>
        <select v-model="form.user" :disabled="isEdit || loadingData" class="field-control"
                :class="{ 'field-control-error': errors.user }">
          <option value="">Sélectionner un collaborateur…</option>
          <option v-for="employee in availableEmployees" :key="employee.guid" :value="employee.guid">{{ employee.name }}
            — {{ employee.employeeCode || 'sans code' }}
          </option>
        </select>
        <p v-if="errors.user" class="field-error-text">{{ errors.user }}</p>
      </section>

      <section>
        <label class="text-xs font-bold text-slate-700">Mode de planification <span
            class="text-red-500">*</span></label>
        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <button v-for="mode in modes" :key="mode.value" type="button"
                  class="rounded-2xl border p-4 text-left transition"
                  :class="form.planning_mode === mode.value ? mode.activeClass : 'border-slate-200 bg-white hover:border-slate-300'"
                  @click="setMode(mode.value)">
            <component :is="mode.icon" :size="20"/>
            <p class="mt-3 text-xs font-bold">{{ mode.label }}</p>
            <p class="mt-1 text-[10px] leading-4 opacity-75">{{ mode.description }}</p>
          </button>
        </div>
      </section>

      <section v-if="form.planning_mode === 'FIXED'"
               class="space-y-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-700">Session Template fixe <span
              class="text-red-500">*</span></label>
          <select v-model="form.fixed_session_template" class="field-control"
                  :class="{ 'field-control-error': errors.fixed_session_template }">
            <option value="">Sélectionner l’horaire fixe…</option>
            <option v-for="template in templates" :key="template.guid" :value="template.guid">{{ template.name }} ·
              {{ templateSummary(template) }}
            </option>
          </select>
          <p v-if="errors.fixed_session_template" class="field-error-text">{{ errors.fixed_session_template }}</p>
          <p class="field-help">Le moteur conservera ce même horaire les jours travaillés.</p>
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700">Gestion du repos fixe</label>
          <div class="mt-2 grid gap-2 sm:grid-cols-2">
            <button type="button" class="rounded-xl border p-3 text-left"
                    :class="form.fixed_rest_day_mode === 'TEMPLATE' ? 'border-indigo-300 bg-white ring-2 ring-indigo-100' : 'border-slate-200 bg-white'"
                    @click="form.fixed_rest_day_mode = 'TEMPLATE'">
              <p class="text-xs font-bold text-slate-800">Défini par le template</p>
              <p class="mt-1 text-[10px] leading-4 text-slate-500">Les jours sans bloc dans le template sont les
                repos.</p>
            </button>
            <button type="button" class="rounded-xl border p-3 text-left"
                    :class="form.fixed_rest_day_mode === 'ROTATING' ? 'border-indigo-300 bg-white ring-2 ring-indigo-100' : 'border-slate-200 bg-white'"
                    @click="form.fixed_rest_day_mode = 'ROTATING'">
              <p class="text-xs font-bold text-slate-800">Choisi par le moteur</p>
              <p class="mt-1 text-[10px] leading-4 text-slate-500">L’horaire reste fixe, mais le jour de repos peut
                varier.</p>
            </button>
          </div>
        </div>
      </section>

      <div class="grid gap-4 sm:grid-cols-2">
        <div v-if="form.planning_mode === 'ROTATING'">
          <label class="text-xs font-bold text-slate-700">Ordre de rotation</label>
          <input v-model.number="form.rotation_order" type="number" min="0" class="field-control mt-2"
                 placeholder="Ex. 1"/>
          <p class="field-help">Repère facultatif pour stabiliser l’ordre des collaborateurs.</p>
        </div>
        <div :class="form.planning_mode !== 'ROTATING' ? 'sm:col-span-2' : ''">
          <label class="text-xs font-bold text-slate-700">Limite hebdomadaire personnelle</label>
          <div class="relative mt-2">
            <input v-model="maxWeeklyHours" type="number" min="0.5" max="168" step="0.5" class="field-control pr-14"
                   placeholder="Vide = règle générale"/>
            <span
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">heures</span>
          </div>
          <p class="field-help">Laissez vide pour appliquer la limite générale de l’organisation.</p>
        </div>
      </div>

      <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <p class="text-xs font-bold text-slate-800">Profil actif</p>
          <p class="mt-1 text-[11px] text-slate-500">Un profil désactivé ne peut pas être utilisé par le moteur.</p>
        </div>
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
                :disabled="saving || loadingData" @click="save">
          <IconLoader2 v-if="saving" :size="15" class="animate-spin"/>
          <IconCheck v-else :size="15"/>
          {{ saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le profil' }}
        </button>
      </div>
    </template>
  </PlanningDrawer>
</template>

<script setup lang="ts">
import {computed, reactive, ref, watch} from 'vue'
import {IconBan, IconCalendarTime, IconCheck, IconInfoCircle, IconLoader2, IconRefresh} from '@tabler/icons-vue'
import {useTeamStore, type TeamEmployee} from '@/stores/teamStore'
import {useUserStore} from '@/stores/userStore'
import SessionTemplateService from '@/service/SessionTemplate'
import EmployeePlanningProfileService from '@/service/EmployeePlanningProfileService'
import PlanningDrawer from '../components/PlanningDrawer.vue'
import PlanningToggle from '../components/PlanningToggle.vue'
import {responseError} from '../planningSuggestion.helpers'
import type {EmployeePlanningProfile, PlanningMode, PlanningTemplateMini} from '../planningSuggestion.type'

const props = withDefaults(defineProps<{
  open: boolean;
  profile?: EmployeePlanningProfile | null;
  existingUserGuids?: string[]
}>(), {profile: null, existingUserGuids: () => []})
const emit = defineEmits<{ close: []; saved: [profile: EmployeePlanningProfile] }>()
const teamStore = useTeamStore()
const userStore = useUserStore()
const loadingData = ref(false)
const saving = ref(false)
const globalError = ref('')
const templates = ref<PlanningTemplateMini[]>([])
const employees = ref<TeamEmployee[]>([])
const maxWeeklyHours = ref('')
const errors = reactive<Record<string, string>>({})
const form = reactive({
  user: '',
  planning_mode: 'ROTATING' as PlanningMode,
  fixed_session_template: '',
  fixed_rest_day_mode: 'TEMPLATE' as 'TEMPLATE' | 'ROTATING',
  rotation_order: null as number | null,
  active: true
})
const isEdit = computed(() => Boolean(props.profile?.guid))

const modes = [
  {
    value: 'FIXED' as const,
    label: 'Horaire fixe',
    description: 'Même modèle horaire, avec repos fixe ou variable.',
    icon: IconCalendarTime,
    activeClass: 'border-indigo-300 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100'
  },
  {
    value: 'ROTATING' as const,
    label: 'Rotation',
    description: 'Services répartis automatiquement selon les besoins.',
    icon: IconRefresh,
    activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100'
  },
  {
    value: 'EXCLUDED' as const,
    label: 'Exclu',
    description: 'Non inclus dans les prochaines générations.',
    icon: IconBan,
    activeClass: 'border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-100'
  },
]

const availableEmployees = computed(() => employees.value.filter((employee) => isEdit.value || !props.existingUserGuids.includes(employee.guid)))

watch(() => props.open, async (open) => {
  if (open) {
    resetForm();
    await loadData()
  }
})

function resetForm() {
  Object.keys(errors).forEach((key) => delete errors[key])
  globalError.value = ''
  form.user = props.profile?.user?.guid ?? ''
  form.planning_mode = props.profile?.planning_mode ?? 'ROTATING'
  form.fixed_session_template = props.profile?.fixed_session_template?.guid ?? ''
  form.fixed_rest_day_mode = props.profile?.fixed_rest_day_mode ?? 'TEMPLATE'
  form.rotation_order = props.profile?.rotation_order ?? null
  form.active = props.profile?.active ?? true
  maxWeeklyHours.value = props.profile?.max_weekly_minutes ? String(props.profile.max_weekly_minutes / 60) : ''
}

async function loadData() {
  loadingData.value = true
  try {
    const managerGuid = userStore.user?.guid
    const [team, templateResponse] = await Promise.all([
      managerGuid ? teamStore.loadTeam(managerGuid, true) : Promise.resolve(teamStore.employees),
      SessionTemplateService.list({current: true, active: true, limit: 200}),
    ])
    employees.value = team ?? []
    templates.value = templateResponse?.data?.templates?.items ?? templateResponse?.data?.session_templates?.items ?? []
  } catch (error: any) {
    globalError.value = responseError(error, 'Impossible de charger les collaborateurs ou les modèles horaires.')
  } finally {
    loadingData.value = false
  }
}

function setMode(mode: PlanningMode) {
  form.planning_mode = mode
  if (mode !== 'FIXED') {
    form.fixed_session_template = '';
    form.fixed_rest_day_mode = 'TEMPLATE'
  }
  if (mode !== 'ROTATING') form.rotation_order = null
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key])
  if (!form.user) errors.user = 'Sélectionnez un collaborateur.'
  if (form.planning_mode === 'FIXED' && !form.fixed_session_template) errors.fixed_session_template = 'Sélectionnez le Session Template fixe.'
  return Object.keys(errors).length === 0
}

async function save() {
  if (!validate()) return
  saving.value = true
  globalError.value = ''
  const minutes = maxWeeklyHours.value ? Math.round(Number(maxWeeklyHours.value) * 60) : null
  const common = {
    planning_mode: form.planning_mode,
    fixed_session_template: form.planning_mode === 'FIXED' ? form.fixed_session_template : null,
    fixed_rest_day_mode: form.planning_mode === 'FIXED' ? form.fixed_rest_day_mode : 'TEMPLATE' as const,
    rotation_order: form.planning_mode === 'ROTATING' ? form.rotation_order : null,
    max_weekly_minutes: minutes,
    active: form.active,
  }
  try {
    const response = isEdit.value
        ? await EmployeePlanningProfileService.update(props.profile!.guid, common)
        : await EmployeePlanningProfileService.create({user: form.user, ...common})
    if (!response?.success) throw response
    emit('saved', response.data.employee_planning_profile)
  } catch (error: any) {
    globalError.value = responseError(error, 'Impossible d’enregistrer ce profil.')
  } finally {
    saving.value = false
  }
}

function templateSummary(template: PlanningTemplateMini): string {
  const blocks = Object.values(template.definition ?? {}).find((value) => Array.isArray(value) && value.length) as any[] | undefined
  return blocks?.length ? `${blocks[0].work[0]}–${blocks[0].work[1]}` : 'aucun horaire'
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
  background: #f8fafc;
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
