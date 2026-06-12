<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50" @click.self="$emit('close')">
      <div class="absolute inset-0 bg-black/20 backdrop-blur-[2px]" @click="$emit('close')" />

      <!-- Drawer -->
      <div class="absolute right-0 top-0 bottom-0 w-[520px] bg-white border-l border-gray-200 shadow-2xl flex flex-col">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <IconCalendarStats :size="16" class="text-teal-500" />
            </div>
            <div>
              <h2 class="text-gray-800 font-bold text-sm">
                {{ isEdit ? 'Modifier l\'affectation' : 'Nouvelle affectation' }}
              </h2>
              <p class="text-gray-400 text-xs">Schedule Assignment</p>
            </div>
          </div>
          <button @click="$emit('close')"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          ><IconX :size="16" /></button>
        </div>

        <!-- Steps indicator -->
        <div v-if="!isEdit" class="flex items-center px-6 py-3 border-b border-gray-100 gap-0 flex-shrink-0">
          <div
              v-for="(step, idx) in STEPS" :key="step.id"
              class="flex items-center flex-1 last:flex-none"
          >
            <div class="flex items-center gap-2 flex-shrink-0">
              <div
                  class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors"
                  :class="currentStep > idx
                  ? 'bg-teal-500 text-white'
                  : currentStep === idx
                    ? 'bg-teal-100 text-teal-600 ring-2 ring-teal-300'
                    : 'bg-gray-100 text-gray-400'"
              >
                <IconCheck v-if="currentStep > idx" :size="11" />
                <span v-else>{{ idx + 1 }}</span>
              </div>
              <span
                  class="text-[11px] font-semibold hidden sm:block"
                  :class="currentStep === idx ? 'text-teal-600' : currentStep > idx ? 'text-gray-500' : 'text-gray-300'"
              >{{ step.label }}</span>
            </div>
            <div v-if="idx < STEPS.length - 1"
                 class="flex-1 h-px mx-3 transition-colors"
                 :class="currentStep > idx ? 'bg-teal-300' : 'bg-gray-200'"
            />
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-5">

          <!-- ── STEP 0 : Cible ── -->
          <div v-show="isEdit || currentStep === 0" class="space-y-4">
            <div v-if="!isEdit">
              <p class="text-sm font-bold text-gray-700 mb-1">Cible de l'affectation</p>
              <p class="text-xs text-gray-400 mb-4">Choisissez à qui s'applique cet emploi du temps.</p>
            </div>

            <div v-if="!isEdit" class="grid grid-cols-2 gap-3">
              <button
                  v-for="t in TARGET_TYPES" :key="t.value" type="button"
                  @click="form.target_type = t.value as any; form.target_guid = ''"
                  class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition"
                  :class="form.target_type === t.value
                  ? 'border-teal-400 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'"
              >
                <div class="w-10 h-10 rounded-full flex items-center justify-center"
                     :class="form.target_type === t.value ? 'bg-teal-100' : 'bg-gray-100'"
                >
                  <component :is="t.icon" :size="20"
                             :class="form.target_type === t.value ? 'text-teal-600' : 'text-gray-400'"
                  />
                </div>
                <div class="text-center">
                  <p class="text-sm font-bold" :class="form.target_type === t.value ? 'text-teal-700' : 'text-gray-600'">
                    {{ t.label }}
                  </p>
                  <p class="text-[10px] text-gray-400 mt-0.5">{{ t.description }}</p>
                </div>
              </button>
            </div>

            <!-- Affichage cible en mode édition -->
            <div v-if="isEdit && props.assignment" class="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3">
              <div
                  class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  :class="props.assignment.family === 'group' ? 'bg-violet-100 text-violet-600' : 'bg-teal-100 text-teal-700'"
              >
                {{ initials(getTargetName(props.assignment)) }}
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-800">{{ getTargetName(props.assignment) }}</p>
                <p class="text-xs text-gray-400">{{ props.assignment.family === 'group' ? 'Groupe' : 'Employé' }}</p>
              </div>
            </div>

            <!-- Sélection cible (création) -->
            <div v-if="!isEdit" class="field-group">
              <label class="field-label">
                {{ form.target_type === 'group' ? 'Groupe' : 'Employé' }}
                <span class="text-red-500">*</span>
              </label>
              <select v-model="form.target_guid"
                      class="field cursor-pointer" :class="{ 'field-error': errors.target_guid }"
              >
                <option value="">Rechercher et sélectionner...</option>
                <option v-for="t in availableTargets.filter(x => x.type === form.target_type)" :key="t.guid" :value="t.guid">
                  {{ t.name }}{{ t.member_count ? ` (${t.member_count} membres)` : '' }}
                </option>
              </select>
              <p v-if="errors.target_guid" class="err">{{ errors.target_guid }}</p>
            </div>
          </div>

          <!-- ── STEP 1 : Emploi du temps ── -->
          <div v-show="isEdit || currentStep === 1" class="space-y-4">
            <div v-if="!isEdit">
              <p class="text-sm font-bold text-gray-700 mb-1">Emploi du temps</p>
              <p class="text-xs text-gray-400 mb-4">Sélectionnez le modèle à affecter.</p>
            </div>

            <div class="field-group">
              <label class="field-label">Modèle d'emploi du temps <span class="text-red-500">*</span></label>
              <select v-model="form.session_template_guid"
                      class="field cursor-pointer" :class="{ 'field-error': errors.session_template_guid }"
              >
                <option value="">Sélectionner un modèle...</option>
                <option v-for="t in sessionTemplates" :key="t.guid" :value="t.guid">
                  {{ t.name }}
                </option>
              </select>
              <p v-if="errors.session_template_guid" class="err">{{ errors.session_template_guid }}</p>
            </div>

            <!-- Preview -->
            <div v-if="selectedTemplate"
                 class="p-3 bg-teal-50 border border-teal-100 rounded-xl flex items-start gap-3"
            >
              <div class="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <IconCalendarEvent :size="15" class="text-teal-600" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold text-teal-800">{{ selectedTemplate.name }}</p>
                <p class="text-xs text-teal-600 mt-0.5">{{ templateDaysSummary(selectedTemplate) }}</p>
              </div>
            </div>
          </div>

          <!-- ── STEP 2 : Période ── -->
          <div v-show="isEdit || currentStep === 2" class="space-y-4">
            <div v-if="!isEdit">
              <p class="text-sm font-bold text-gray-700 mb-1">Période d'application</p>
              <p class="text-xs text-gray-400 mb-4">Définissez la durée de validité de l'affectation.</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="field-group">
                <label class="field-label">Date de début <span class="text-red-500">*</span></label>
                <input type="date" v-model="form.start_date"
                       class="field cursor-pointer" :class="{ 'field-error': errors.start_date }" />
                <p v-if="errors.start_date" class="err">{{ errors.start_date }}</p>
              </div>
              <div class="field-group">
                <label class="field-label">Date de fin <span class="text-gray-400">(optionnel)</span></label>
                <input type="date" v-model="form.end_date" :min="form.start_date"
                       class="field cursor-pointer" />
                <p class="text-[10px] text-gray-400 mt-0.5">Laisser vide = affectation ouverte</p>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label">Motif <span class="text-gray-400">(optionnel)</span></label>
              <input type="text" v-model="form.reason"
                     placeholder="Ex : Remplacement, Mission externe..."
                     class="field" />
            </div>

            <!-- Statut (édition seulement) -->
            <div v-if="isEdit"
                 class="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer"
                 @click="form.active = !form.active"
            >
              <div>
                <p class="text-sm font-semibold text-gray-700">Statut de l'affectation</p>
                <p class="text-xs text-gray-400">{{ form.active ? 'Affectation active' : 'Affectation inactive' }}</p>
              </div>
              <div class="relative w-10 h-5 rounded-full transition-colors duration-200"
                   :class="form.active ? 'bg-teal-500' : 'bg-gray-300'"
              >
                <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                      :class="form.active ? 'translate-x-5' : 'translate-x-0'" />
              </div>
            </div>
          </div>

          <!-- ── STEP 3 : Récap (création only) ── -->
          <div v-if="!isEdit && currentStep === 3" class="space-y-3">
            <p class="text-sm font-bold text-gray-700 mb-4">Récapitulatif</p>
            <div class="divide-y divide-gray-100 bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-xs text-gray-500 font-medium">Type</span>
                <span class="text-xs font-bold text-gray-700">{{ form.target_type === 'group' ? 'Groupe' : 'Employé' }}</span>
              </div>
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-xs text-gray-500 font-medium">Cible</span>
                <span class="text-xs font-bold text-gray-700">{{ targetName }}</span>
              </div>
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-xs text-gray-500 font-medium">Emploi du temps</span>
                <span class="text-xs font-bold text-gray-700">{{ selectedTemplate?.name ?? '—' }}</span>
              </div>
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-xs text-gray-500 font-medium">Début</span>
                <span class="text-xs font-bold text-gray-700">{{ formatDate(form.start_date) }}</span>
              </div>
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-xs text-gray-500 font-medium">Fin</span>
                <span class="text-xs font-bold text-gray-700">{{ form.end_date ? formatDate(form.end_date) : 'Ouverte' }}</span>
              </div>
              <div v-if="form.reason" class="flex items-center justify-between px-4 py-3">
                <span class="text-xs text-gray-500 font-medium">Motif</span>
                <span class="text-xs font-bold text-gray-700">{{ form.reason }}</span>
              </div>
            </div>
          </div>

          <!-- Global error -->
          <div v-if="globalError"
               class="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs"
          >
            <IconAlertTriangle :size="14" class="flex-shrink-0" />
            {{ globalError }}
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50">
          <button
              v-if="!isEdit && currentStep > 0"
              @click="currentStep--"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-white transition"
          >
            <IconChevronLeft :size="14" /> Retour
          </button>
          <button
              v-else
              @click="$emit('close')"
              class="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-white transition"
          >Annuler</button>

          <template v-if="!isEdit">
            <button
                v-if="currentStep < STEPS.length - 1"
                @click="nextStep"
                class="flex items-center gap-1.5 px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-teal-200 transition"
            >
              Suivant <IconChevronRight :size="14" />
            </button>
            <button
                v-else
                @click="submit"
                :disabled="saving"
                class="flex items-center gap-2 px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-teal-200 transition disabled:opacity-60"
            >
              <IconLoader2 v-if="saving" :size="14" class="animate-spin" />
              <IconDeviceFloppy v-else :size="14" />
              {{ saving ? 'Enregistrement...' : 'Confirmer' }}
            </button>
          </template>

          <button
              v-else
              @click="submit"
              :disabled="saving"
              class="flex items-center gap-2 px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-teal-200 transition disabled:opacity-60"
          >
            <IconLoader2 v-if="saving" :size="14" class="animate-spin" />
            <IconDeviceFloppy v-else :size="14" />
            {{ saving ? 'Enregistrement...' : 'Mettre à jour' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  IconCalendarStats, IconX, IconLoader2, IconDeviceFloppy,
  IconAlertTriangle, IconCheck, IconCalendarEvent,
  IconChevronLeft, IconChevronRight, IconUser, IconUsers,
} from '@tabler/icons-vue'
import ScheduleAssignmentService, {ICreateScheduleAssignmentPayload} from '@/service/ScheduleAssignment'
import SessionTemplateService    from '@/service/SessionTemplate'
import type { IScheduleAssignment } from './type'
import type { ISessionTemplate } from '../session_template/type'
import { isGroupAssignment, getTargetName } from './type'
import {TeamEmployee, useTeamStore} from "@/stores/teamStore";
import GroupService, {type Group} from "@/service/GroupService";
import {useUserStore} from "@/stores/userStore";

// ── Props / emits ──────────────────────────────────────────────────────────
const props = defineProps<{ assignment?: IScheduleAssignment | null }>()
const emit  = defineEmits<{ close: []; saved: [] }>()

const isEdit = computed(() => !!props.assignment?.guid)
const userStore = useUserStore()
const teamStore = useTeamStore()
const currentUserGuid = computed(() => userStore.user?.guid || '');


// ── Constants ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'target',   label: 'Cible'   },
  { id: 'template', label: 'Horaire' },
  { id: 'period',   label: 'Période' },
  { id: 'recap',    label: 'Récap'   },
]

const TARGET_TYPES = [
  { value: 'user',  label: 'Employé', description: 'Affecter à un employé spécifique', icon: IconUser  },
  { value: 'group', label: 'Groupe',  description: 'Affecter à un groupe d\'employés', icon: IconUsers },
]

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FR: Record<string, string> = {
  Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Jeu', Fri: 'Ven', Sat: 'Sam', Sun: 'Dim',
}

// ── State ──────────────────────────────────────────────────────────────────
const currentStep      = ref(0)
const sessionTemplates = ref<ISessionTemplate[]>([])
const availableTargets = ref<{ guid: string; name: string; type: string; member_count?: number }[]>([])

const form = reactive({
  target_type:           (props.assignment?.family ?? 'user') as 'user' | 'group',
  target_guid:           props.assignment ? (
      isGroupAssignment(props.assignment)
          ? props.assignment.related.guid
          : props.assignment.related.guid
  ) : '',
  session_template_guid: props.assignment?.session_template?.guid ?? '',
  start_date:            props.assignment?.start_date ?? new Date().toISOString().split('T')[0],
  end_date:              props.assignment?.end_date ?? '',
  reason:                props.assignment?.reason ?? '',
  active:                props.assignment?.active ?? true,
})

const errors      = reactive<Record<string, string>>({})
const globalError = ref('')
const saving      = ref(false)

// ── Computed ───────────────────────────────────────────────────────────────
const selectedTemplate = computed(() =>
    sessionTemplates.value.find((t) => t.guid === form.session_template_guid) ?? null
)

const targetName = computed(() =>
    availableTargets.value.find((t) => t.guid === form.target_guid)?.name ?? '—'
)

// ── Helpers ────────────────────────────────────────────────────────────────
function initials(name?: string): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function formatDate(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function templateDaysSummary(tpl: ISessionTemplate): string {
  const days = DAY_ORDER.filter((d) => {
    const v = tpl.definition?.[d]
    return Array.isArray(v) && v.length > 0
  }).map((d) => DAY_FR[d])

  if (!days.length) return '—'

  for (const d of DAY_ORDER) {
    const blocks = tpl.definition?.[d]
    if (blocks && Array.isArray(blocks) && blocks.length > 0) {
      return `${days.join(', ')} · ${blocks[0].work[0]}–${blocks[0].work[1]}`
    }
  }
  return days.join(', ')
}

// ── Load data ──────────────────────────────────────────────────────────────
async function loadTemplates() {
  const res = await SessionTemplateService.list({ active: true, current: true, limit: 200 })
  console.log('sessionTemplates', res.data)
  if (res?.success) sessionTemplates.value = res.data.templates.items
}

const employePreselectionne = ref<TeamEmployee | null>(null);

async function loadTargets() {
  try {
    const [usersRes, groupsRes] = await Promise.all([
      computed(() => teamStore.employees || []),
      GroupService.listGroups(currentUserGuid.value),
    ])
    const targets: typeof availableTargets.value = []
      usersRes.value.forEach((u: TeamEmployee) =>
          targets.push({ guid: u.guid, name: u.name, type: 'user' })
      )

    console.log('usersRes', usersRes.value);

    if (groupsRes?.success) {
      groupsRes.data.groups?.items?.forEach((g: Group) =>
          targets.push({ guid: g.guid!, name: g.name, type: 'group', member_count: g.members?.count })
      )
    }
    availableTargets.value = targets
  } catch {}
}

// ── Wizard navigation ──────────────────────────────────────────────────────
function validateStep(step: number): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (step === 0 && !form.target_guid)           { errors.target_guid = 'Sélectionnez une cible'; return false }
  if (step === 1 && !form.session_template_guid) { errors.session_template_guid = 'Sélectionnez un modèle'; return false }
  if (step === 2 && !form.start_date)            { errors.start_date = 'Date de début requise'; return false }
  return true
}

function nextStep() {
  if (validateStep(currentStep.value)) currentStep.value++
}

// ── Submit ─────────────────────────────────────────────────────────────────
function validateAll(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  globalError.value = ''
  let ok = true
  if (!form.session_template_guid)          { errors.session_template_guid = 'Champ requis'; ok = false }
  if (!form.start_date)                     { errors.start_date = 'Champ requis'; ok = false }
  if (!isEdit.value && !form.target_guid)   { errors.target_guid = 'Champ requis'; ok = false }
  return ok
}

async function submit() {
  if (!validateAll()) return
  saving.value = true

  const payload: Partial<ICreateScheduleAssignmentPayload> = {
    session_template: form.session_template_guid,
    created_by:       currentUserGuid.value,
    start_date:       form.start_date,
  }

  if (!isEdit.value) {
    payload.family = form.target_type;
    payload.related = form.target_guid;
  }

  if (form.end_date?.trim()) payload.end_date = form.end_date
  if (form.reason?.trim()) {
    payload.reason = form.reason.trim()
  }


  if (isEdit.value)  payload.active   = form.active

  const res = isEdit.value
      ? await ScheduleAssignmentService.update(props.assignment!.guid, payload)
      : await ScheduleAssignmentService.create(payload as ICreateScheduleAssignmentPayload)

  saving.value = false

  if (res?.success === false || res?.error) {
    globalError.value = res?.error?.message ?? 'Une erreur est survenue'
    return
  }

  emit('saved')
}

onMounted(() => { loadTemplates(); loadTargets() })
</script>

<style scoped>
.field-group { @apply flex flex-col gap-1; }
.field-label { @apply text-[10.5px] font-bold text-gray-500 uppercase tracking-wide; }
.field {
  @apply w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800
  placeholder-gray-300 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition;
}
.field-error { @apply border-red-400 focus:border-red-400 focus:ring-red-100; }
.err         { @apply text-[11px] text-red-500; }
</style>