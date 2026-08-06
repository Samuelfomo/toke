<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/20 backdrop-blur-[2px]" aria-hidden="true"/>

      <!-- Drawer -->
      <div role="dialog" aria-modal="true" aria-labelledby="rotation-assignment-form-title"
           class="absolute right-0 top-0 bottom-0 w-full max-w-[540px] bg-white border-l border-slate-200 shadow-2xl flex flex-col">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <IconRotate :size="16" class="text-violet-500"/>
            </div>
            <div>
              <h2 id="rotation-assignment-form-title" class="text-slate-800 font-bold text-sm">
                {{ isEdit ? 'Modifier l\'assignation' : 'Nouvelle assignation de rotation' }}
              </h2>
              <p class="text-slate-400 text-xs">Rotation Assignment</p>
            </div>
          </div>
          <button type="button" @click="requestClose" :disabled="saving" aria-label="Fermer"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition disabled:cursor-not-allowed disabled:opacity-50">
            <IconX :size="16"/>
          </button>
        </div>

        <!-- Steps indicator (création uniquement) -->
        <div v-if="!isEdit" class="flex items-center px-6 py-3 border-b border-slate-100 gap-0 flex-shrink-0">
          <div v-for="(step, idx) in STEPS" :key="step.id" class="flex items-center flex-1 last:flex-none">
            <div class="flex items-center gap-2 flex-shrink-0">
              <div
                  class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                  :class="currentStep > idx
                  ? 'bg-violet-500 text-white'
                  : currentStep === idx
                    ? 'bg-violet-100 text-violet-600 ring-2 ring-violet-300'
                    : 'bg-slate-100 text-slate-400'"
              >
                <IconCheck v-if="currentStep > idx" :size="11"/>
                <span v-else>{{ idx + 1 }}</span>
              </div>
              <span
                  class="text-xs font-semibold hidden sm:block"
                  :class="currentStep === idx ? 'text-violet-600' : currentStep > idx ? 'text-slate-500' : 'text-slate-300'"
              >{{ step.label }}</span>
            </div>
            <div v-if="idx < STEPS.length - 1"
                 class="flex-1 h-px mx-3 transition-colors"
                 :class="currentStep > idx ? 'bg-violet-300' : 'bg-slate-200'"/>
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-5">

          <!-- ── STEP 0 : Cible ── -->
          <div v-show="isEdit || currentStep === 0" class="space-y-4">
            <div v-if="!isEdit">
              <p class="text-sm font-bold text-slate-700 mb-1">Cible de l'assignation</p>
              <p class="text-xs text-slate-400 mb-4">Choisissez à qui s'applique cette rotation.</p>
            </div>

            <!-- Type selector (création) -->
            <div v-if="!isEdit" class="grid grid-cols-2 gap-3">
              <button
                  v-for="t in TARGET_TYPES" :key="t.value" type="button"
                  @click="form.target_type = t.value as any; form.target_guid = ''"
                  class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition"
                  :class="form.target_type === t.value ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-slate-300'"
              >
                <div class="w-10 h-10 rounded-full flex items-center justify-center"
                     :class="form.target_type === t.value ? 'bg-violet-100' : 'bg-slate-100'">
                  <component :is="t.icon" :size="20"
                             :class="form.target_type === t.value ? 'text-violet-600' : 'text-slate-400'"/>
                </div>
                <div class="text-center">
                  <p class="text-sm font-bold"
                     :class="form.target_type === t.value ? 'text-violet-700' : 'text-slate-600'">
                    {{ t.label }}
                  </p>
                  <p class="text-xs text-slate-400 mt-0.5">{{ t.description }}</p>
                </div>
              </button>
            </div>

            <!-- Cible en mode édition -->
            <div v-if="isEdit && props.assignment"
                 class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                   :class="props.assignment.family === 'group' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-700'">
                {{ initials(getRotationTargetName(props.assignment)) }}
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-800">{{ getRotationTargetName(props.assignment) }}</p>
                <p class="text-xs text-slate-400">{{ props.assignment.family === 'group' ? 'Groupe' : 'Employé' }}</p>
              </div>
            </div>

            <!-- Select cible (création) -->
            <div v-if="!isEdit" class="field-group">
              <label class="field-label">
                {{ form.target_type === 'group' ? 'Groupe' : 'Employé' }}
                <span class="text-red-500">*</span>
              </label>
              <select v-model="form.target_guid"
                      class="field cursor-pointer" :class="{ 'field-error': errors.target_guid }">
                <option value="">Sélectionner...</option>
                <option v-for="t in availableTargets.filter(x => x.type === form.target_type)"
                        :key="t.guid" :value="t.guid">
                  {{ t.name }}{{ t.member_count ? ` (${t.member_count} membres)` : '' }}
                </option>
              </select>
              <p v-if="errors.target_guid" class="err">{{ errors.target_guid }}</p>
            </div>
          </div>

          <!-- ── STEP 1 : Rotation Group + Offset ── -->
          <div v-show="isEdit || currentStep === 1" class="space-y-4">
            <div v-if="!isEdit">
              <p class="text-sm font-bold text-slate-700 mb-1">Groupe de rotation</p>
              <p class="text-xs text-slate-400 mb-4">Sélectionnez la rotation à appliquer et le point de départ dans le
                cycle.</p>
            </div>

            <!-- Select rotation group -->
            <div class="field-group">
              <label class="field-label">Groupe de rotation <span class="text-red-500">*</span></label>
              <select v-model="form.rotation_group_guid"
                      :disabled="isEdit"
                      class="field cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      :class="{ 'field-error': errors.rotation_group_guid }">
                <option value="">Sélectionner un groupe de rotation...</option>
                <option v-for="rg in rotationGroups" :key="rg.guid" :value="rg.guid">
                  {{ rg.name }} — cycle {{ rg.cycle_length }} {{ rg.cycle_unit === 'day' ? 'jour(s)' : 'semaine(s)' }}
                </option>
              </select>
              <p v-if="errors.rotation_group_guid" class="err">{{ errors.rotation_group_guid }}</p>
            </div>

            <!-- Preview du cycle sélectionné -->
            <div v-if="selectedRotationGroup" class="p-4 bg-violet-50 border border-violet-100 rounded-xl space-y-3">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <IconRotate :size="13" class="text-violet-600"/>
                </div>
                <div>
                  <p class="text-sm font-bold text-violet-800">{{ selectedRotationGroup.name }}</p>
                  <p class="text-xs text-violet-500">
                    Cycle : {{ selectedRotationGroup.cycle_length }}
                    {{ selectedRotationGroup.cycle_unit === 'day' ? 'jour(s)' : 'semaine(s)' }}
                    &nbsp;·&nbsp; Direction : {{ selectedRotationGroup.direction === 'forward' ? 'Avant' : 'Arrière' }}
                    &nbsp;·&nbsp; Auto-avance : {{ selectedRotationGroup.auto_advance ? 'Oui' : 'Non' }}
                  </p>
                </div>
              </div>

              <!-- Templates du cycle -->
              <div class="space-y-1.5">
                <p class="text-xs text-violet-500 font-bold uppercase tracking-wide">Templates du cycle</p>
                <div class="flex items-center gap-2 flex-wrap">
                  <div v-for="ct in selectedRotationGroup.cycle_templates" :key="ct.guid"
                       class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold"
                       :class="ct.position === form.offset - 1
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-white text-violet-700 border-violet-200'"
                  >
                    <span class="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          :class="ct.position === form.offset - 1 ? 'bg-white/30' : 'bg-violet-100'">
                      {{ ct.position + 1 }}
                    </span>
                    {{ ct.template_snapshot.name }}
                  </div>
                  <IconArrowRight v-if="selectedRotationGroup.direction === 'forward'" :size="12"
                                  class="text-violet-300"/>
                  <IconRotateClockwise v-else :size="12" class="text-violet-300"/>
                  <span class="text-xs text-violet-400 italic">
                    Répétition infinie ({{ selectedRotationGroup.direction === 'forward' ? 'Forward' : 'Backward' }})
                  </span>
                </div>
              </div>
            </div>

            <!-- Offset -->
            <div class="field-group">
              <label class="field-label">
                Point de départ dans le cycle
                <span class="text-slate-400">(offset)</span>
              </label>
              <div class="flex items-center gap-3">
                <input
                    type="number"
                    v-model.number="form.offset"
                    :min="1"
                    :max="selectedRotationGroup?.cycle_length ?? 99"
                    class="field w-24 text-center"
                    :class="{ 'field-error': errors.offset }"
                />
                <p class="text-xs text-slate-500">
                  <template v-if="selectedRotationGroup">
                    Le cycle démarrera au template
                    <strong class="text-violet-600">
                      {{
                        selectedRotationGroup.cycle_templates.find((ct: ICycleTemplate) => ct.position === form.offset - 1)?.template_snapshot.name ?? '?'
                      }}
                    </strong>
                  </template>
                  <template v-else>
                    Sélectionnez un groupe de rotation d'abord
                  </template>
                </p>
              </div>
              <p v-if="errors.offset" class="err">{{ errors.offset }}</p>
              <p class="text-xs text-slate-400 mt-0.5">
                1 = premier template du cycle. Max = {{ selectedRotationGroup?.cycle_length ?? '—' }}
              </p>
            </div>

            <!-- Active toggle (édition) -->
            <div v-if="isEdit"
                 class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                 @click="form.active = !form.active">
              <div>
                <p class="text-sm font-semibold text-slate-700">Statut de l'assignation</p>
                <p class="text-xs text-slate-400">{{ form.active ? 'Assignation active' : 'Assignation inactive' }}</p>
              </div>
              <div class="relative w-10 h-5 rounded-full transition-colors duration-200"
                   :class="form.active ? 'bg-violet-500' : 'bg-slate-300'">
                <span
                    class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                    :class="form.active ? 'translate-x-5' : 'translate-x-0'"/>
              </div>
            </div>
          </div>

          <!-- ── STEP 2 : Récap (création uniquement) ── -->
          <div v-if="!isEdit && currentStep === 2" class="space-y-3">
            <p class="text-sm font-bold text-slate-700 mb-4">Récapitulatif</p>
            <div class="divide-y divide-slate-100 bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-xs text-slate-500 font-medium">Type</span>
                <span class="text-xs font-bold text-slate-700">{{
                    form.target_type === 'group' ? 'Groupe' : 'Employé'
                  }}</span>
              </div>
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-xs text-slate-500 font-medium">Cible</span>
                <span class="text-xs font-bold text-slate-700">{{ selectedTargetName }}</span>
              </div>
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-xs text-slate-500 font-medium">Groupe de rotation</span>
                <span class="text-xs font-bold text-slate-700">{{ selectedRotationGroup?.name ?? '—' }}</span>
              </div>
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-xs text-slate-500 font-medium">Cycle</span>
                <span class="text-xs font-bold text-slate-700">
                  {{ selectedRotationGroup?.cycle_length ?? '—' }}
                  {{ selectedRotationGroup?.cycle_unit === 'day' ? 'jour(s)' : 'semaine(s)' }}
                  · {{ selectedRotationGroup?.direction === 'forward' ? 'Forward' : 'Backward' }}
                </span>
              </div>
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-xs text-slate-500 font-medium">Offset (départ)</span>
                <span class="text-xs font-bold text-violet-600">
                  {{
                    form.offset
                  }} — {{
                    selectedRotationGroup?.cycle_templates.find((ct: ICycleTemplate) => ct.position === form.offset - 1)?.template_snapshot.name ?? '?'
                  }}
                </span>
              </div>
            </div>
          </div>

          <!-- Global error -->
          <div v-if="globalError"
               class="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
            <IconAlertTriangle :size="14" class="flex-shrink-0"/>
            {{ globalError }}
          </div>
        </div>

        <!-- Footer -->
        <div
            class="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50">
          <button
              v-if="!isEdit && currentStep > 0"
              @click="currentStep--"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-white transition">
            <IconChevronLeft :size="14"/>
            Retour
          </button>
          <button v-else type="button" @click="requestClose" :disabled="saving"
                  class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-white transition disabled:cursor-not-allowed disabled:opacity-50">
            Annuler
          </button>

          <template v-if="!isEdit">
            <button
                v-if="currentStep < STEPS.length - 1"
                @click="nextStep"
                class="flex items-center gap-1.5 px-5 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-violet-200 transition">
              Suivant
              <IconChevronRight :size="14"/>
            </button>
            <button v-else @click="submit" :disabled="saving"
                    class="flex items-center gap-2 px-5 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-violet-200 transition disabled:opacity-60">
              <IconLoader2 v-if="saving" :size="14" class="animate-spin"/>
              <IconDeviceFloppy v-else :size="14"/>
              {{ saving ? 'Enregistrement...' : 'Confirmer' }}
            </button>
          </template>

          <button v-else @click="submit" :disabled="saving"
                  class="flex items-center gap-2 px-5 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-violet-200 transition disabled:opacity-60">
            <IconLoader2 v-if="saving" :size="14" class="animate-spin"/>
            <IconDeviceFloppy v-else :size="14"/>
            {{ saving ? 'Enregistrement...' : 'Mettre à jour' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {ref, reactive, computed, onMounted} from 'vue'
import {
  IconX, IconLoader2, IconDeviceFloppy, IconAlertTriangle,
  IconCheck, IconChevronLeft, IconChevronRight,
  IconUser, IconUsers, IconRotate, IconArrowRight, IconRotateClockwise,
} from '@tabler/icons-vue'
import RotationAssignmentService, {ICreateRotationAssignmentPayload} from '@/service/RotationAssignment'
import RotationGroupService from '@/service/RotationGroup'
import {getRotationTargetName, ICycleTemplate} from './type'
import type {IRotationAssignment} from './type'
import GroupService, {type Group} from "@/service/GroupService";
import {useUserStore} from "@/stores/userStore";
import {TeamEmployee, useTeamStore} from "@/stores/teamStore";
import {useBodyScrollLock} from "@/views/planning/composables/useBodyScrollLock";

// ── Props / emits ─────────────────────────────────────────────────────────────
const props = defineProps<{ assignment?: IRotationAssignment | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const userStore = useUserStore()
const teamStore = useTeamStore()

const currentUserGuid = computed(() => userStore.user?.guid || '');
const isEdit = computed(() => !!props.assignment?.guid)

// ── Constants ─────────────────────────────────────────────────────────────────
const STEPS = [
  {id: 'target', label: 'Cible'},
  {id: 'rotation', label: 'Rotation'},
  {id: 'recap', label: 'Récap'},
]

const TARGET_TYPES = [
  {value: 'user', label: 'Employé', description: 'Assigner à un employé spécifique', icon: IconUser},
  {value: 'group', label: 'Groupe', description: 'Assigner à un groupe d\'employés', icon: IconUsers},
]

// ── State ─────────────────────────────────────────────────────────────────────
const currentStep = ref(0)
const rotationGroups = ref<any[]>([])
const availableTargets = ref<{ guid: string; name: string; type: string; member_count?: number }[]>([])

const form = reactive({
  target_type: (props.assignment?.family ?? 'user') as 'user' | 'group',
  target_guid: props.assignment?.related?.guid ?? '',
  rotation_group_guid: props.assignment?.rotation_group?.guid ?? '',
  offset: props.assignment?.offset ?? 1,
  active: props.assignment?.active ?? true,
})

const errors = reactive<Record<string, string>>({})
const globalError = ref('')
const saving = ref(false)

useBodyScrollLock(true)

// ── Computed ──────────────────────────────────────────────────────────────────
const selectedRotationGroup = computed(() =>
    rotationGroups.value.find((rg) => rg.guid === form.rotation_group_guid) ?? null
)

const selectedTargetName = computed(() =>
    availableTargets.value.find((t) => t.guid === form.target_guid)?.name ?? '—'
)

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name?: string): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// ── Load data ─────────────────────────────────────────────────────────────────
async function loadRotationGroups() {
  try {
    const res = await RotationGroupService.list({active: true, limit: 200})
    if (res?.success) {
      rotationGroups.value = res.data.rotation_groups?.items ?? []
    }
  } catch (e) {
    console.error('loadRotationGroups', e)
  }
}

async function loadTargets() {
  try {
    const [usersRes, groupsRes] = await Promise.all([
      computed(() => teamStore.employees || []),
      GroupService.listGroups(currentUserGuid.value),
    ])
    const targets: typeof availableTargets.value = []
    usersRes.value?.forEach((u: TeamEmployee) =>
        targets.push({guid: u.guid, name: u.name, type: 'user'})
    )
    if (groupsRes?.success) {
      groupsRes.data.groups?.items?.forEach((g: Group) =>
          targets.push({guid: g.guid!, name: g.name, type: 'group', member_count: g.members?.count})
      )
    }
    availableTargets.value = targets
  } catch {
  }
}

// ── Wizard ────────────────────────────────────────────────────────────────────
function validateStep(step: number): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (step === 0) {
    if (!form.target_guid) {
      errors.target_guid = 'Sélectionnez une cible';
      return false
    }
  }
  if (step === 1) {
    if (!form.rotation_group_guid) {
      errors.rotation_group_guid = 'Sélectionnez un groupe de rotation';
      return false
    }
    const max = selectedRotationGroup.value?.cycle_length ?? 1
    if (form.offset < 1 || form.offset > max) {
      errors.offset = `L'offset doit être entre 1 et ${max}`
      return false
    }
  }
  return true
}

function nextStep() {
  if (validateStep(currentStep.value)) currentStep.value++
}

// ── Submit ────────────────────────────────────────────────────────────────────
function validateAll(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  globalError.value = ''
  let ok = true
  if (!isEdit.value && !form.target_guid) {
    errors.target_guid = 'Champ requis';
    ok = false
  }
  if (!isEdit.value && !form.rotation_group_guid) {
    errors.rotation_group_guid = 'Champ requis';
    ok = false
  }
  if (form.offset < 1) {
    errors.offset = 'Offset invalide';
    ok = false
  }
  return ok
}

async function submit() {
  if (saving.value || !validateAll()) return
  saving.value = true

  try {
    let res: any
    if (isEdit.value) {
      res = await RotationAssignmentService.update(props.assignment!.guid, {
        offset: form.offset,
        active: form.active,
      })
    } else {
      // const payload: Record<string, any> = {
      const payload: ICreateRotationAssignmentPayload = {
        rotation_group: form.rotation_group_guid,
        assigned_by: currentUserGuid.value,
        related: form.target_guid,
        family: form.target_type,
        offset: form.offset,
      }
      res = await RotationAssignmentService.create(payload)
    }

    if (res?.success === false || res?.error) {
      globalError.value = res?.error?.message ?? 'Une erreur est survenue'
      return
    }
    emit('saved')
  } finally {
    saving.value = false
  }
}

function requestClose(): void {
  if (saving.value) return
  emit('close')
}

onMounted(() => {
  loadRotationGroups();
  loadTargets()
})
</script>

<style scoped>
.field-group {
  @apply flex flex-col gap-1;
}

.field-label {
  @apply text-xs font-bold text-slate-500 uppercase tracking-wide;
}

.field {
  @apply w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800
  placeholder-slate-300 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition;
}

.field-error {
  @apply border-red-400 focus:border-red-400 focus:ring-red-100;
}

.err {
  @apply text-xs text-red-500;
}
</style>