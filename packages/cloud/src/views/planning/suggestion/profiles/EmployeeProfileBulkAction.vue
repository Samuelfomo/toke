<template>
  <PlanningDrawer
    :open="open"
    eyebrow="Actions en masse"
    title="Mettre à jour plusieurs profils"
    :description="`${rows.length} collaborateur(s) sélectionné(s). Les profils manquants seront créés avec le mode Rotation.`"
    :loading="applying"
    :dirty="isDirty"
    width="xl"
    @close="$emit('close')"
  >
    <div class="space-y-6">
      <section class="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <div class="flex gap-3">
          <IconUsersGroup :size="20" class="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <p class="text-sm font-bold text-blue-950">
              {{ rows.length }} collaborateur(s) concerné(s)
            </p>
            <p class="mt-1 text-xs leading-5 text-blue-800/80">
              Les champs laissés sur « Conserver » ne modifieront pas les profils existants. Pour un collaborateur non configuré, le mode Rotation et l’état actif seront utilisés par défaut.
            </p>
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <div>
          <label class="text-sm font-semibold text-slate-700">
            Mode à appliquer
          </label>
          <p class="mt-1 text-xs leading-5 text-slate-500">
            Le mode fixe n’est pas proposé ici, car il exige le choix individuel d’un horaire type.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <button
            v-for="option in modeOptions"
            :key="option.value"
            type="button"
            class="rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            :class="form.mode === option.value
              ? option.activeClass
              : 'border-slate-200 bg-white hover:bg-slate-50'"
            @click="form.mode = option.value"
          >
            <component :is="option.icon" :size="19" />
            <p class="mt-3 text-xs font-bold">{{ option.label }}</p>
            <p class="mt-1 text-xs leading-4 opacity-75">{{ option.description }}</p>
          </button>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="text-sm font-semibold text-slate-700">
            État du profil
          </label>
          <select v-model="form.activeState" class="field-control mt-2">
            <option value="KEEP">Conserver l’état actuel</option>
            <option value="ACTIVE">Activer les profils</option>
            <option value="INACTIVE">Désactiver les profils</option>
          </select>
        </div>

        <div>
          <label class="text-sm font-semibold text-slate-700">
            Limite hebdomadaire
          </label>
          <select v-model="form.weeklyLimitAction" class="field-control mt-2">
            <option value="KEEP">Conserver la limite actuelle</option>
            <option value="SET">Définir une limite commune</option>
            <option value="CLEAR">Utiliser la règle générale</option>
          </select>
        </div>
      </section>

      <section v-if="form.weeklyLimitAction === 'SET'" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label class="text-sm font-semibold text-slate-700">
          Nombre d’heures maximum par semaine
        </label>
        <div class="relative mt-2 max-w-xs">
          <input
            v-model="form.weeklyHours"
            type="number"
            min="0.5"
            max="168"
            step="0.5"
            class="field-control pr-16"
            placeholder="Ex. 48"
          />
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
            heures
          </span>
        </div>
        <p v-if="errors.weeklyHours" class="mt-1.5 text-xs font-medium text-red-600">
          {{ errors.weeklyHours }}
        </p>
      </section>

      <section class="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <p class="text-sm font-bold text-slate-800">
            Attribuer automatiquement les ordres
          </p>
          <p class="mt-1 text-xs leading-5 text-slate-500">
            Affecte un ordre positif et unique à chaque profil actif non exclu sélectionné. Les ordres déjà utilisés hors sélection sont conservés.
          </p>
          <p v-if="rotationRequired" class="mt-2 text-xs font-semibold text-amber-700">
            Recommandé : la rotation hebdomadaire d’équipe exige un ordre unique.
          </p>
        </div>
        <PlanningToggle v-model="form.autoAssignOrder" />
      </section>

      <section class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          Résumé de l’opération
        </p>
        <ul class="mt-3 space-y-2 text-xs leading-5 text-slate-600">
          <li>• {{ rows.filter((row) => row.profile).length }} profil(s) existant(s) seront mis à jour.</li>
          <li>• {{ rows.filter((row) => !row.profile).length }} profil(s) manquant(s) seront créés.</li>
          <li>• Mode : {{ modeSummary }}</li>
          <li>• État : {{ activeSummary }}</li>
          <li>• Limite : {{ weeklyLimitSummary }}</li>
          <li>• Ordres automatiques : {{ form.autoAssignOrder ? 'oui' : 'non' }}</li>
        </ul>
      </section>

      <div
        v-if="globalError"
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
      >
        {{ globalError }}
      </div>

      <div
        v-if="resultMessage"
        class="rounded-xl border px-4 py-3 text-xs leading-5"
        :class="failureCount
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800'"
      >
        {{ resultMessage }}
        <ul v-if="failureMessages.length" class="mt-2 list-disc space-y-1 pl-5">
          <li v-for="message in failureMessages" :key="message">{{ message }}</li>
        </ul>
      </div>

      <div v-if="applying" class="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <div class="flex items-center justify-between gap-3 text-xs font-semibold text-blue-800">
          <span>Traitement des profils…</span>
          <span>{{ processedCount }} / {{ rows.length }}</span>
        </div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
          <div
            class="h-full rounded-full bg-blue-600 transition-all"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>
    </div>

    <template #footer="{ requestClose }">
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          :disabled="applying"
          @click="requestClose"
        >
          Annuler
        </button>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="applying || rows.length === 0"
          @click="applyChanges"
        >
          <IconLoader2 v-if="applying" :size="16" class="animate-spin" />
          <IconWand v-else :size="16" />
          {{ applying ? 'Application…' : 'Appliquer aux profils' }}
        </button>
      </div>
    </template>
  </PlanningDrawer>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import {
  IconBan,
  IconLoader2,
  IconRefresh,
  IconUsersGroup,
  IconWand,
} from '@tabler/icons-vue'
import EmployeePlanningProfileService from '@/service/EmployeePlanningProfileService'
import { useFormDirty } from '@/views/planning/composables/useFormDirty'
import PlanningDrawer from '../components/PlanningDrawer.vue'
import PlanningToggle from '../components/PlanningToggle.vue'
import { responseError } from '../planningSuggestion.helpers'
import type {
  EmployeePlanningProfilePayload,
  EmployeePlanningProfileUpdatePayload,
  PlanningMode,
} from '../planningSuggestion.type'
import type {
  BulkProfileResult,
  EmployeePlanningProfileRow,
} from './employeePlanningProfile.type'

const props = withDefaults(
  defineProps<{
    open: boolean
    rows: EmployeePlanningProfileRow[]
    allRows: EmployeePlanningProfileRow[]
    rotationRequired?: boolean
  }>(),
  {
    rotationRequired: false,
  },
)

const emit = defineEmits<{
  close: []
  applied: [result: BulkProfileResult]
}>()

type BulkMode = 'KEEP' | 'ROTATING' | 'EXCLUDED'
type ActiveState = 'KEEP' | 'ACTIVE' | 'INACTIVE'
type WeeklyLimitAction = 'KEEP' | 'SET' | 'CLEAR'

const applying = ref(false)
const processedCount = ref(0)
const failureCount = ref(0)
const successCount = ref(0)
const globalError = ref('')
const resultMessage = ref('')
const failureMessages = ref<string[]>([])
const errors = reactive<Record<string, string>>({})

const form = reactive({
  mode: 'KEEP' as BulkMode,
  activeState: 'KEEP' as ActiveState,
  weeklyLimitAction: 'KEEP' as WeeklyLimitAction,
  weeklyHours: '',
  autoAssignOrder: false,
})

const { isDirty, markPristine } = useFormDirty(
  () => ({ ...form }),
  computed(() => props.open),
)

const modeOptions = [
  {
    value: 'KEEP' as const,
    label: 'Conserver',
    description: 'Garder le mode actuel de chaque profil.',
    icon: IconRefresh,
    activeClass: 'border-blue-300 bg-blue-50 text-blue-800 ring-2 ring-blue-100',
  },
  {
    value: 'ROTATING' as const,
    label: 'Rotation',
    description: 'Inclure les collaborateurs dans la répartition automatique.',
    icon: IconWand,
    activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100',
  },
  {
    value: 'EXCLUDED' as const,
    label: 'Exclure',
    description: 'Retirer les collaborateurs des prochaines générations.',
    icon: IconBan,
    activeClass: 'border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-100',
  },
]

const progressPercent = computed(() =>
  props.rows.length
    ? Math.round((processedCount.value / props.rows.length) * 100)
    : 0,
)

const modeSummary = computed(() => ({
  KEEP: 'conserver les modes existants',
  ROTATING: 'passer en rotation automatique',
  EXCLUDED: 'exclure des générations',
})[form.mode])

const activeSummary = computed(() => ({
  KEEP: 'conserver les états existants',
  ACTIVE: 'activer tous les profils',
  INACTIVE: 'désactiver tous les profils',
})[form.activeState])

const weeklyLimitSummary = computed(() => {
  if (form.weeklyLimitAction === 'KEEP') return 'conserver les limites actuelles'
  if (form.weeklyLimitAction === 'CLEAR') return 'utiliser la règle générale'
  return form.weeklyHours
    ? `${form.weeklyHours} heure(s) par semaine`
    : 'limite à préciser'
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    reset()
  },
)

function reset(): void {
  form.mode = 'KEEP'
  form.activeState = 'KEEP'
  form.weeklyLimitAction = 'KEEP'
  form.weeklyHours = ''
  form.autoAssignOrder = props.rotationRequired
  processedCount.value = 0
  failureCount.value = 0
  successCount.value = 0
  globalError.value = ''
  resultMessage.value = ''
  failureMessages.value = []
  Object.keys(errors).forEach((key) => delete errors[key])
  void nextTick(markPristine)
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key])
  globalError.value = ''

  if (form.weeklyLimitAction === 'SET') {
    const hours = Number(form.weeklyHours)
    if (!form.weeklyHours || !Number.isFinite(hours) || hours < 0.5 || hours > 168) {
      errors.weeklyHours = 'Saisissez une durée comprise entre 0,5 et 168 heures.'
    }
  }

  const hasChange =
    form.mode !== 'KEEP' ||
    form.activeState !== 'KEEP' ||
    form.weeklyLimitAction !== 'KEEP' ||
    form.autoAssignOrder

  if (!hasChange) {
    globalError.value = 'Choisissez au moins une modification à appliquer.'
  }

  return Object.keys(errors).length === 0 && !globalError.value
}

function usedOrdersOutsideSelection(): Set<number> {
  const selectedUserGuids = new Set(props.rows.map((row) => row.person.guid))
  const used = new Set<number>()

  props.allRows.forEach((row) => {
    const profile = row.profile
    if (
      selectedUserGuids.has(row.person.guid) ||
      !profile?.active ||
      profile.planning_mode === 'EXCLUDED' ||
      profile.rotation_order === null
    ) {
      return
    }
    used.add(profile.rotation_order)
  })

  return used
}

function nextAvailableOrder(used: Set<number>): number {
  let candidate = 1
  while (used.has(candidate)) candidate += 1
  used.add(candidate)
  return candidate
}

function buildPayload(
  row: EmployeePlanningProfileRow,
  usedOrders: Set<number>,
): EmployeePlanningProfileUpdatePayload {
  const existing = row.profile
  const planningMode: PlanningMode =
    form.mode === 'KEEP'
      ? existing?.planning_mode ?? 'ROTATING'
      : form.mode

  const active =
    form.activeState === 'KEEP'
      ? existing?.active ?? true
      : form.activeState === 'ACTIVE'

  let rotationOrder = existing?.rotation_order ?? null

  if (planningMode === 'EXCLUDED') {
    rotationOrder = null
  } else if (form.autoAssignOrder && active) {
    rotationOrder = nextAvailableOrder(usedOrders)
  }

  let maxWeeklyMinutes = existing?.max_weekly_minutes ?? null
  if (form.weeklyLimitAction === 'CLEAR') {
    maxWeeklyMinutes = null
  } else if (form.weeklyLimitAction === 'SET') {
    maxWeeklyMinutes = Math.round(Number(form.weeklyHours) * 60)
  }

  return {
    planning_mode: planningMode,
    fixed_session_template:
      planningMode === 'FIXED'
        ? existing?.fixed_session_template?.guid ?? null
        : null,
    fixed_rest_day_mode:
      planningMode === 'FIXED'
        ? existing?.fixed_rest_day_mode ?? 'TEMPLATE'
        : 'TEMPLATE',
    rotation_order: rotationOrder,
    max_weekly_minutes: maxWeeklyMinutes,
    active,
  }
}

async function applyChanges(): Promise<void> {
  if (applying.value || !validate()) return

  applying.value = true
  processedCount.value = 0
  failureCount.value = 0
  successCount.value = 0
  resultMessage.value = ''
  failureMessages.value = []

  const usedOrders = usedOrdersOutsideSelection()

  for (const row of props.rows) {
    try {
      const common = buildPayload(row, usedOrders)
      const response = row.profile
        ? await EmployeePlanningProfileService.update(row.profile.guid, common)
        : await EmployeePlanningProfileService.create({
          user: row.person.guid,
          ...common,
        } as EmployeePlanningProfilePayload)

      if (!response?.success) throw response
      successCount.value += 1
    } catch (error: any) {
      failureCount.value += 1
      failureMessages.value.push(
        `${row.person.name} : ${responseError(error, 'mise à jour impossible')}`,
      )
    } finally {
      processedCount.value += 1
    }
  }

  applying.value = false
  markPristine()

  resultMessage.value = failureCount.value
    ? `${successCount.value} profil(s) traité(s), ${failureCount.value} échec(s). Les profils réussis ont été conservés.`
    : `${successCount.value} profil(s) ont été mis à jour avec succès.`

  emit('applied', {
    successCount: successCount.value,
    failureCount: failureCount.value,
  })

  if (failureCount.value === 0) {
    emit('close')
  }
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
</style>
