<template>
  <PlanningDrawer
    :open="open"
    eyebrow="Profil employé"
    :title="isEdit ? 'Modifier le profil de planification' : 'Configurer un collaborateur'"
    description="Définissez clairement comment ce collaborateur participe aux prochaines générations de planning."
    :loading="saving"
    :dirty="isDirty"
    width="2xl"
    @close="$emit('close')"
  >
    <div class="space-y-6">
      <div class="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <div class="flex gap-3">
          <IconInfoCircle :size="19" class="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <p class="text-sm font-bold text-blue-950">
              Choisissez d’abord le mode de participation
            </p>
            <p class="mt-1 text-xs leading-5 text-blue-800/80">
              Un profil fixe exige un horaire type. Un profil en rotation laisse le moteur répartir les services. Un profil exclu ne participe à aucune génération.
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="teamRotationEnabled"
        class="rounded-2xl border border-amber-100 bg-amber-50/60 p-4"
      >
        <div class="flex gap-3">
          <IconCalendarPause :size="19" class="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p class="text-sm font-bold text-amber-950">
              Congé hebdomadaire tournant actif
            </p>
            <p class="mt-1 text-xs leading-5 text-amber-800/80">
              Tout profil actif non exclu doit posséder un ordre positif et unique dans le cycle de congé de l’équipe.
            </p>
          </div>
        </div>
      </div>

      <section>
        <div class="mb-2">
          <label class="text-sm font-semibold text-slate-700">
            Collaborateur <span class="text-red-500">*</span>
          </label>
          <p class="mt-1 text-xs leading-5 text-slate-500">
            Recherchez le collaborateur par son nom ou son matricule. Il ne pourra plus être changé après la création.
          </p>
        </div>

        <EmployeeProfileSearchSelect
          v-model="form.user"
          :employees="employeeOptions"
          :disabled="isEdit || loadingData"
        />

        <p v-if="errors.user" class="field-error-text">
          {{ errors.user }}
        </p>
      </section>

      <section>
        <div>
          <label class="text-sm font-semibold text-slate-700">
            Mode de planification <span class="text-red-500">*</span>
          </label>
          <p class="mt-1 text-xs leading-5 text-slate-500">
            Le mode détermine ce que le moteur a le droit de faire pour ce collaborateur.
          </p>
        </div>

        <div class="mt-3 grid gap-3 lg:grid-cols-3">
          <EmployeeProfileModeCard
            v-for="mode in modes"
            :key="mode.value"
            :label="mode.label"
            :description="mode.description"
            :consequence="mode.consequence"
            :icon="mode.icon"
            :selected="form.planning_mode === mode.value"
            :selected-class="mode.activeClass"
            :icon-selected-class="mode.iconActiveClass"
            @select="setMode(mode.value)"
          />
        </div>
      </section>

      <section
        v-if="form.planning_mode === 'FIXED'"
        class="space-y-5 rounded-2xl border border-blue-100 bg-blue-50/30 p-4"
      >
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700">
            Horaire type fixe <span class="text-red-500">*</span>
          </label>

          <select
            v-model="form.fixed_session_template"
            class="field-control"
            :class="{ 'field-control-error': errors.fixed_session_template }"
          >
            <option value="">Sélectionner l’horaire fixe…</option>
            <option
              v-for="template in templates"
              :key="template.guid"
              :value="template.guid"
            >
              {{ template.name }} · {{ templateSummary(template) }}
            </option>
          </select>

          <p v-if="errors.fixed_session_template" class="field-error-text">
            {{ errors.fixed_session_template }}
          </p>
          <p class="field-help">
            Le moteur conservera cet horaire pour les jours travaillés.
          </p>
        </div>

        <div>
          <label class="text-sm font-semibold text-slate-700">
            Gestion du repos
          </label>
          <div class="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              class="rounded-xl border p-3 text-left transition"
              :class="form.fixed_rest_day_mode === 'TEMPLATE'
                ? 'border-blue-300 bg-white ring-2 ring-blue-100'
                : 'border-slate-200 bg-white hover:bg-slate-50'"
              @click="form.fixed_rest_day_mode = 'TEMPLATE'"
            >
              <p class="text-sm font-bold text-slate-800">Défini par l’horaire type</p>
              <p class="mt-1 text-xs leading-5 text-slate-500">
                Les jours sans bloc dans le modèle sont considérés comme repos.
              </p>
            </button>

            <button
              type="button"
              class="rounded-xl border p-3 text-left transition"
              :class="form.fixed_rest_day_mode === 'ROTATING'
                ? 'border-blue-300 bg-white ring-2 ring-blue-100'
                : 'border-slate-200 bg-white hover:bg-slate-50'"
              @click="form.fixed_rest_day_mode = 'ROTATING'"
            >
              <p class="text-sm font-bold text-slate-800">Choisi par le moteur</p>
              <p class="mt-1 text-xs leading-5 text-slate-500">
                L’horaire reste fixe, mais le jour de repos peut varier.
              </p>
            </button>
          </div>
        </div>
      </section>

      <div class="grid gap-4 sm:grid-cols-2">
        <div v-if="form.planning_mode !== 'EXCLUDED'">
          <label class="text-sm font-semibold text-slate-700">
            Ordre de congé / rotation
            <span v-if="teamRotationEnabled" class="text-red-500">*</span>
          </label>
          <input
            v-model.number="form.rotation_order"
            type="number"
            min="1"
            step="1"
            class="field-control mt-2"
            :class="{ 'field-control-error': errors.rotation_order }"
            placeholder="Ex. 1"
          />
          <p class="field-help">
            {{ teamRotationEnabled
              ? 'Position obligatoire et unique dans le cycle de congé.'
              : 'Repère facultatif permettant de stabiliser la rotation.' }}
          </p>
          <p v-if="errors.rotation_order" class="field-error-text">
            {{ errors.rotation_order }}
          </p>
        </div>

        <div :class="form.planning_mode === 'EXCLUDED' ? 'sm:col-span-2' : ''">
          <label class="text-sm font-semibold text-slate-700">
            Limite hebdomadaire personnelle
          </label>
          <div class="relative mt-2">
            <input
              v-model="maxWeeklyHours"
              type="number"
              min="0.5"
              max="168"
              step="0.5"
              class="field-control pr-16"
              :class="{ 'field-control-error': errors.max_weekly_hours }"
              placeholder="Vide = règle générale"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
              heures
            </span>
          </div>
          <p class="field-help">
            Laissez vide pour appliquer la limite générale de l’organisation.
          </p>
          <p v-if="errors.max_weekly_hours" class="field-error-text">
            {{ errors.max_weekly_hours }}
          </p>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <p class="text-sm font-bold text-slate-800">Profil actif</p>
          <p class="mt-1 text-xs leading-5 text-slate-500">
            Un profil désactivé reste conservé, mais il n’est pas utilisé par le moteur.
          </p>
        </div>
        <PlanningToggle v-model="form.active" />
      </div>

      <EmployeeProfileSummary
        :employee-name="selectedEmployee?.name ?? ''"
        :planning-mode="form.planning_mode"
        :template-name="selectedTemplate?.name ?? (form.planning_mode === 'FIXED' ? 'À sélectionner' : 'Non applicable')"
        :rotation-order="form.rotation_order"
        :max-weekly-hours="maxWeeklyHours"
        :active="form.active"
      />

      <div
        v-if="globalError"
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
      >
        {{ globalError }}
      </div>
    </div>

    <template #footer="{ requestClose }">
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          :disabled="saving"
          @click="requestClose"
        >
          Annuler
        </button>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="saving || loadingData"
          @click="save"
        >
          <IconLoader2 v-if="saving" :size="16" class="animate-spin" />
          <IconCheck v-else :size="16" />
          {{ saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le profil' }}
        </button>
      </div>
    </template>
  </PlanningDrawer>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import {
  IconBan,
  IconCalendarPause,
  IconCalendarTime,
  IconCheck,
  IconInfoCircle,
  IconLoader2,
  IconRefresh,
} from '@tabler/icons-vue'
import {
  useTeamStore,
  type TeamEmployee,
} from '@/stores/teamStore'
import { useUserStore } from '@/stores/userStore'
import SessionTemplateService from '@/service/SessionTemplate'
import EmployeePlanningProfileService from '@/service/EmployeePlanningProfileService'
import PlanningSuggestionConfigService from '@/service/PlanningSuggestionConfigService'
import { useFormDirty } from '@/views/planning/composables/useFormDirty'
import PlanningDrawer from '../components/PlanningDrawer.vue'
import PlanningToggle from '../components/PlanningToggle.vue'
import { responseData, responseError } from '../planningSuggestion.helpers'
import type {
  EmployeePlanningProfile,
  PlanningMode,
  PlanningSuggestionConfig,
  PlanningTemplateMini,
} from '../planningSuggestion.type'
import EmployeeProfileModeCard from './EmployeeProfileModeCard.vue'
import EmployeeProfileSearchSelect from './EmployeeProfileSearchSelect.vue'
import EmployeeProfileSummary from './EmployeeProfileSummary.vue'
import type { EmployeeProfilePerson } from './employeePlanningProfile.type'

const props = withDefaults(
  defineProps<{
    open: boolean
    profile?: EmployeePlanningProfile | null
    existingUserGuids?: string[]
    existingProfiles?: EmployeePlanningProfile[]
  }>(),
  {
    profile: null,
    existingUserGuids: () => [],
    existingProfiles: () => [],
  },
)

const emit = defineEmits<{
  close: []
  saved: [profile: EmployeePlanningProfile]
}>()

const teamStore = useTeamStore()
const userStore = useUserStore()
const loadingData = ref(false)
const saving = ref(false)
const globalError = ref('')
const templates = ref<PlanningTemplateMini[]>([])
const employees = ref<TeamEmployee[]>([])
const activeConfig = ref<PlanningSuggestionConfig | null>(null)
const maxWeeklyHours = ref('')
const errors = reactive<Record<string, string>>({})

const form = reactive({
  user: '',
  planning_mode: 'ROTATING' as PlanningMode,
  fixed_session_template: '',
  fixed_rest_day_mode: 'TEMPLATE' as 'TEMPLATE' | 'ROTATING',
  rotation_order: null as number | null,
  active: true,
})

const { isDirty, markPristine } = useFormDirty(
  () => ({ ...form, max_weekly_hours: maxWeeklyHours.value }),
  computed(() => props.open),
)

const isEdit = computed(() => Boolean(props.profile?.guid))
const teamRotationEnabled = computed(
  () => activeConfig.value?.rules.weekly_leave_policy.mode === 'TEAM_ROTATION',
)

const modes = [
  {
    value: 'FIXED' as const,
    label: 'Horaire fixe',
    description: 'Le collaborateur conserve le même horaire type.',
    consequence: 'Vous devez choisir un horaire type et définir la gestion du repos.',
    icon: IconCalendarTime,
    activeClass: 'border-blue-300 bg-blue-50 text-blue-800 ring-2 ring-blue-100',
    iconActiveClass: 'bg-blue-600 text-white',
  },
  {
    value: 'ROTATING' as const,
    label: 'Rotation automatique',
    description: 'Le moteur répartit les services selon les besoins.',
    consequence: 'Le collaborateur peut recevoir différents horaires et gardes selon les règles.',
    icon: IconRefresh,
    activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100',
    iconActiveClass: 'bg-emerald-600 text-white',
  },
  {
    value: 'EXCLUDED' as const,
    label: 'Exclu',
    description: 'Le collaborateur n’est pas planifié automatiquement.',
    consequence: 'Aucune affectation ne sera générée pour ce collaborateur.',
    icon: IconBan,
    activeClass: 'border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-100',
    iconActiveClass: 'bg-slate-700 text-white',
  },
]

const availableEmployees = computed(() =>
  employees.value.filter(
    (employee) => isEdit.value || !props.existingUserGuids.includes(employee.guid),
  ),
)

const employeeOptions = computed<EmployeeProfilePerson[]>(() => {
  const options = availableEmployees.value.map((employee) => ({
    guid: employee.guid,
    name: employee.name,
    employeeCode: employee.employeeCode ?? null,
  }))

  const profileUser = props.profile?.user
  if (profileUser && !options.some((employee) => employee.guid === profileUser.guid)) {
    options.unshift({
      guid: profileUser.guid,
      name: profileUser.name,
      employeeCode: profileUser.employee_code ?? '',
    })
  }

  return options
})

const selectedEmployee = computed(() =>
  employeeOptions.value.find((employee) => employee.guid === form.user) ?? null,
)

const selectedTemplate = computed(() =>
  templates.value.find((template) => template.guid === form.fixed_session_template) ?? null,
)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    resetForm()
    await loadData()
  },
)

function resetForm(): void {
  Object.keys(errors).forEach((key) => delete errors[key])
  globalError.value = ''
  form.user = props.profile?.user?.guid ?? ''
  form.planning_mode = props.profile?.planning_mode ?? 'ROTATING'
  form.fixed_session_template = props.profile?.fixed_session_template?.guid ?? ''
  form.fixed_rest_day_mode = props.profile?.fixed_rest_day_mode ?? 'TEMPLATE'
  form.rotation_order = props.profile?.rotation_order ?? null
  form.active = props.profile?.active ?? true
  maxWeeklyHours.value = props.profile?.max_weekly_minutes !== null && props.profile?.max_weekly_minutes !== undefined
    ? String(props.profile.max_weekly_minutes / 60)
    : ''
  void nextTick(markPristine)
}

async function loadData(): Promise<void> {
  loadingData.value = true
  try {
    const managerGuid = userStore.user?.guid
    const [team, templateResponse, configResponse] = await Promise.all([
      managerGuid
        ? teamStore.loadTeam(managerGuid, true)
        : Promise.resolve(teamStore.employees),
      SessionTemplateService.list({ current: true, active: true, limit: 200 }),
      PlanningSuggestionConfigService.active(),
    ])
    employees.value = team ?? []
    templates.value =
      templateResponse?.data?.templates?.items ??
      templateResponse?.data?.session_templates?.items ??
      []
    activeConfig.value = responseData(configResponse).planning_suggestion_config ?? null
  } catch (error: any) {
    globalError.value = responseError(
      error,
      'Impossible de charger les collaborateurs, les horaires types ou la configuration active.',
    )
  } finally {
    loadingData.value = false
  }
}

function setMode(mode: PlanningMode): void {
  form.planning_mode = mode
  if (mode !== 'FIXED') {
    form.fixed_session_template = ''
    form.fixed_rest_day_mode = 'TEMPLATE'
  }
  if (mode === 'EXCLUDED') {
    form.rotation_order = null
  }
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key])

  if (!form.user) errors.user = 'Sélectionnez un collaborateur.'

  if (form.planning_mode === 'FIXED' && !form.fixed_session_template) {
    errors.fixed_session_template = 'Sélectionnez un horaire type fixe.'
  }

  const included = form.active && form.planning_mode !== 'EXCLUDED'

  if (teamRotationEnabled.value && included && form.rotation_order === null) {
    errors.rotation_order = 'L’ordre est obligatoire avec le congé tournant d’équipe.'
  }

  if (
    form.rotation_order !== null &&
    (!Number.isInteger(Number(form.rotation_order)) || Number(form.rotation_order) < 1)
  ) {
    errors.rotation_order = 'L’ordre doit être un entier positif.'
  }

  if (included && form.rotation_order !== null) {
    const duplicate = props.existingProfiles.some(
      (profile) =>
        profile.guid !== props.profile?.guid &&
        profile.active &&
        profile.planning_mode !== 'EXCLUDED' &&
        profile.rotation_order === form.rotation_order,
    )
    if (duplicate) {
      errors.rotation_order = `L’ordre ${form.rotation_order} est déjà utilisé par un autre collaborateur.`
    }
  }

  if (maxWeeklyHours.value) {
    const hours = Number(maxWeeklyHours.value)
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 168) {
      errors.max_weekly_hours = 'Saisissez une durée comprise entre 0,5 et 168 heures.'
    }
  }

  return Object.keys(errors).length === 0
}

async function save(): Promise<void> {
  if (saving.value || !validate()) return
  saving.value = true
  globalError.value = ''

  const minutes = maxWeeklyHours.value
    ? Math.round(Number(maxWeeklyHours.value) * 60)
    : null

  const common = {
    planning_mode: form.planning_mode,
    fixed_session_template:
      form.planning_mode === 'FIXED' ? form.fixed_session_template : null,
    fixed_rest_day_mode:
      form.planning_mode === 'FIXED' ? form.fixed_rest_day_mode : ('TEMPLATE' as const),
    rotation_order:
      form.planning_mode !== 'EXCLUDED' ? form.rotation_order : null,
    max_weekly_minutes: minutes,
    active: form.active,
  }

  try {
    const response = isEdit.value
      ? await EmployeePlanningProfileService.update(props.profile!.guid, common)
      : await EmployeePlanningProfileService.create({ user: form.user, ...common })

    if (!response?.success) throw response
    markPristine()
    emit('saved', response.data.employee_planning_profile)
  } catch (error: any) {
    globalError.value = responseError(error, 'Impossible d’enregistrer ce profil.')
  } finally {
    saving.value = false
  }
}

function templateSummary(template: PlanningTemplateMini): string {
  const blocks = Object.values(template.definition ?? {}).find(
    (value) => Array.isArray(value) && value.length,
  ) as any[] | undefined
  return blocks?.length
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
  padding: 0.75rem 0.85rem;
  font-size: 0.875rem;
  color: #334155;
  outline: none;
  transition: 0.16s;
}
.field-control:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 4px #dbeafe;
}
.field-control:disabled {
  background: #f8fafc;
  color: #94a3b8;
}
.field-control-error {
  border-color: #fca5a5;
}
.field-error-text {
  margin-top: 0.4rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #dc2626;
}
.field-help {
  margin-top: 0.4rem;
  font-size: 0.75rem;
  line-height: 1.25rem;
  color: #64748b;
}
</style>
