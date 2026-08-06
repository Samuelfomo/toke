<template>
  <div class="space-y-6">
    <PlanningPageHeader
      eyebrow="Étape 1"
      title="Profils de planification des collaborateurs"
      description="Configurez toute l’équipe depuis une vue unique, identifiez immédiatement les profils manquants et appliquez les réglages répétitifs en masse."
    >
      <template #actions>
        <button
          type="button"
          class="secondary-button"
          :disabled="loading"
          @click="loadData"
        >
          <IconRefresh :size="16" :class="{ 'animate-spin': loading }" />
          Actualiser
        </button>

        <button type="button" class="primary-button" @click="openCreate()">
          <IconUserPlus :size="16" />
          Configurer un collaborateur
        </button>
      </template>
    </PlanningPageHeader>

    <PlanningInfoPanel
      title="Une vue centrée sur l’équipe actuelle"
      description="Chaque collaborateur de l’équipe apparaît, même lorsqu’aucun profil n’a encore été créé."
      :examples="[
        'Prêt : le profil peut être utilisé par le moteur.',
        'À configurer : aucun profil n’existe encore.',
        'À corriger : une règle obligatoire manque ou un ordre est dupliqué.',
      ]"
      important="Le mode fixe exige un horaire type. Avec le congé tournant, chaque profil actif non exclu exige un ordre unique."
    />

    <PlanningInfoPanel
      v-if="teamRotationEnabled"
      :tone="rotationReadiness.ready ? 'success' : 'warning'"
      title="Congé hebdomadaire tournant"
      :description="rotationReadiness.ready
        ? 'Tous les collaborateurs inclus possèdent un ordre unique dans le cycle.'
        : rotationReadiness.blockers.join(' ')"
      :important="rotationReadiness.ready
        ? `${rotationReadiness.includedProfiles.length} profil(s) participent à la rotation.`
        : 'Corrigez les ordres manquants ou dupliqués avant de générer.'"
    />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Équipe actuelle"
        :value="stats.teamTotal"
        help="Collaborateurs disponibles dans l’équipe du manager."
        tone="blue"
      />
      <MetricCard
        label="Profils configurés"
        :value="stats.configured"
        :help="`${stats.unconfigured} profil(s) restent à créer.`"
        tone="indigo"
      />
      <MetricCard
        label="Prêts"
        :value="stats.ready"
        :help="`${completionPercent}% de l’équipe est prête.`"
        tone="emerald"
      />
      <MetricCard
        label="À traiter"
        :value="stats.needsAttention"
        help="Profils manquants, incomplets ou désactivés."
        tone="amber"
      />
    </div>

    <PlanningInfoPanel
      v-if="feedbackMessage"
      tone="success"
      title="Profils mis à jour"
      :description="feedbackMessage"
    />

    <PlanningInfoPanel
      v-if="errorMessage"
      tone="warning"
      title="Chargement impossible"
      :description="errorMessage"
    />

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-5 py-4">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">Équipe et profils</h2>
            <p class="mt-1 text-xs text-slate-500">
              {{ filteredRows.length }} résultat(s) sur {{ rows.length }} collaborateur(s) et profil(s).
            </p>
          </div>

          <div class="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-[280px_180px_190px]">
            <div class="relative sm:col-span-2 xl:col-span-1">
              <IconSearch
                :size="16"
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                v-model="search"
                type="search"
                placeholder="Nom, matricule, mode ou horaire…"
                class="search-control"
              />
            </div>

            <select v-model="modeFilter" class="filter-control">
              <option value="ALL">Tous les modes</option>
              <option value="FIXED">Horaire fixe</option>
              <option value="ROTATING">Rotation automatique</option>
              <option value="EXCLUDED">Exclus</option>
            </select>

            <select v-model="statusFilter" class="filter-control">
              <option value="ALL">Tous les états</option>
              <option value="READY">Prêts</option>
              <option value="UNCONFIGURED">À configurer</option>
              <option value="INCOMPLETE">À corriger</option>
              <option value="INACTIVE">Désactivés</option>
              <option value="OUTSIDE_TEAM">Hors équipe actuelle</option>
            </select>
          </div>
        </div>

        <div
          v-if="selectedRows.length"
          class="mt-4 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <IconChecks :size="18" />
            </div>
            <div>
              <p class="text-sm font-bold text-blue-950">
                {{ selectedRows.length }} collaborateur(s) sélectionné(s)
              </p>
              <p class="text-xs text-blue-700/80">
                Appliquez un mode, un état, une limite ou des ordres automatiques.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button type="button" class="selection-button" @click="clearSelection">
              Effacer
            </button>
            <button type="button" class="bulk-button" @click="showBulk = true">
              <IconAdjustments :size="16" />
              Modifier en masse
            </button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="space-y-3 p-5">
        <div v-for="index in 6" :key="index" class="h-20 animate-pulse rounded-xl bg-slate-100" />
      </div>

      <div v-else-if="filteredRows.length === 0" class="px-6 py-14 text-center">
        <IconUserSearch :size="32" class="mx-auto text-slate-300" />
        <p class="mt-3 text-sm font-bold text-slate-800">Aucun résultat</p>
        <p class="mt-1 text-xs leading-5 text-slate-500">
          Modifiez la recherche ou les filtres pour retrouver un collaborateur.
        </p>
        <button type="button" class="mt-4 secondary-button" @click="resetFilters">
          Réinitialiser les filtres
        </button>
      </div>

      <template v-else>
        <div class="hidden overflow-x-auto lg:block">
          <table class="w-full min-w-[1180px]">
            <thead class="bg-slate-50/80">
              <tr class="text-left text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                <th class="w-12 px-5 py-3.5">
                  <input
                    type="checkbox"
                    class="selection-checkbox"
                    :checked="allVisibleSelected"
                    :indeterminate="someVisibleSelected"
                    aria-label="Sélectionner les collaborateurs visibles"
                    @change="toggleVisibleSelection"
                  />
                </th>
                <th class="px-3 py-3.5">Collaborateur</th>
                <th class="px-4 py-3.5">Mode</th>
                <th class="px-4 py-3.5">Ordre</th>
                <th class="px-4 py-3.5">Horaire / repos</th>
                <th class="px-4 py-3.5">Limite</th>
                <th class="px-4 py-3.5">État</th>
                <th class="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="row in filteredRows"
                :key="row.key"
                class="transition hover:bg-slate-50/70"
                :class="selectedKeys.includes(row.key) ? 'bg-blue-50/35' : ''"
              >
                <td class="px-5 py-4">
                  <input
                    v-if="row.inCurrentTeam"
                    type="checkbox"
                    class="selection-checkbox"
                    :checked="selectedKeys.includes(row.key)"
                    :aria-label="`Sélectionner ${row.person.name}`"
                    @change="toggleRow(row.key)"
                  />
                </td>

                <td class="px-3 py-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-xs font-bold text-white">
                      {{ initials(row.person.name) }}
                    </div>
                    <div class="min-w-0">
                      <p class="max-w-[230px] truncate text-sm font-semibold text-slate-800">
                        {{ row.person.name }}
                      </p>
                      <p class="mt-0.5 text-xs text-slate-400">
                        {{ row.person.employeeCode || 'Matricule non renseigné' }}
                      </p>
                    </div>
                  </div>
                </td>

                <td class="px-4 py-4">
                  <span
                    v-if="row.profile"
                    class="rounded-full px-2.5 py-1 text-xs font-bold"
                    :class="modeClass(row.profile.planning_mode)"
                  >
                    {{ MODE_LABELS[row.profile.planning_mode] }}
                  </span>
                  <span v-else class="text-xs font-medium text-slate-400">Non défini</span>
                </td>

                <td class="px-4 py-4">
                  <template v-if="row.profile && row.profile.planning_mode !== 'EXCLUDED'">
                    <span
                      v-if="row.profile.rotation_order !== null"
                      class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-blue-700 px-2 text-xs font-bold text-white"
                    >
                      {{ row.profile.rotation_order }}
                    </span>
                    <span v-else class="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                      <IconAlertCircle :size="14" /> Manquant
                    </span>
                  </template>
                  <span v-else class="text-xs text-slate-400">—</span>
                </td>

                <td class="px-4 py-4">
                  <p class="max-w-[220px] truncate text-xs font-semibold text-slate-700">
                    {{ row.profile?.fixed_session_template?.name ?? 'Selon les besoins' }}
                  </p>
                  <p class="mt-1 max-w-[230px] truncate text-xs text-slate-400">
                    {{ restManagement(row) }}
                  </p>
                </td>

                <td class="px-4 py-4 text-xs font-medium text-slate-600">
                  {{ row.profile ? formatMinutes(row.profile.max_weekly_minutes) : '—' }}
                </td>

                <td class="px-4 py-4">
                  <div>
                    <span
                      class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset"
                      :class="profileStatusClass(readiness(row).status)"
                      :title="readiness(row).issues.join(' ')"
                    >
                      {{ readiness(row).label }}
                    </span>
                    <p
                      v-if="readiness(row).issues.length"
                      class="mt-1.5 max-w-[240px] text-xs leading-5 text-slate-500"
                    >
                      {{ readiness(row).issues[0] }}
                    </p>
                  </div>
                </td>

                <td class="px-5 py-4 text-right">
                  <button
                    v-if="row.inCurrentTeam"
                    type="button"
                    class="edit-button"
                    @click="row.profile ? openEdit(row.profile) : openCreate(row)"
                  >
                    <IconPencil v-if="row.profile" :size="14" />
                    <IconUserPlus v-else :size="14" />
                    {{ row.profile ? 'Modifier' : 'Configurer' }}
                  </button>
                  <span v-else class="text-xs text-slate-400">Consultation uniquement</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="divide-y divide-slate-100 lg:hidden">
          <article v-for="row in filteredRows" :key="row.key" class="p-4">
            <div class="flex items-start gap-3">
              <input
                v-if="row.inCurrentTeam"
                type="checkbox"
                class="selection-checkbox mt-3"
                :checked="selectedKeys.includes(row.key)"
                :aria-label="`Sélectionner ${row.person.name}`"
                @change="toggleRow(row.key)"
              />
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-xs font-bold text-white">
                {{ initials(row.person.name) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold text-slate-900">{{ row.person.name }}</p>
                <p class="mt-0.5 text-xs text-slate-400">
                  {{ row.person.employeeCode || 'Matricule non renseigné' }}
                </p>
              </div>
              <span
                class="rounded-full px-2 py-1 text-xs font-bold ring-1 ring-inset"
                :class="profileStatusClass(readiness(row).status)"
              >
                {{ readiness(row).label }}
              </span>
            </div>

            <dl class="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-xs">
              <div>
                <dt class="text-slate-400">Mode</dt>
                <dd class="mt-1 font-semibold text-slate-700">
                  {{ row.profile ? MODE_LABELS[row.profile.planning_mode] : 'Non défini' }}
                </dd>
              </div>
              <div>
                <dt class="text-slate-400">Ordre</dt>
                <dd class="mt-1 font-semibold text-slate-700">
                  {{ row.profile?.rotation_order ?? '—' }}
                </dd>
              </div>
              <div>
                <dt class="text-slate-400">Horaire</dt>
                <dd class="mt-1 font-semibold text-slate-700">
                  {{ row.profile?.fixed_session_template?.name ?? 'Selon les besoins' }}
                </dd>
              </div>
              <div>
                <dt class="text-slate-400">Limite</dt>
                <dd class="mt-1 font-semibold text-slate-700">
                  {{ row.profile ? formatMinutes(row.profile.max_weekly_minutes) : '—' }}
                </dd>
              </div>
            </dl>

            <p v-if="readiness(row).issues.length" class="mt-3 text-xs leading-5 text-amber-700">
              {{ readiness(row).issues.join(' ') }}
            </p>

            <button
              v-if="row.inCurrentTeam"
              type="button"
              class="edit-button mt-4 w-full justify-center"
              @click="row.profile ? openEdit(row.profile) : openCreate(row)"
            >
              <IconPencil v-if="row.profile" :size="14" />
              <IconUserPlus v-else :size="14" />
              {{ row.profile ? 'Modifier le profil' : 'Configurer le collaborateur' }}
            </button>
          </article>
        </div>
      </template>
    </section>

    <EmployeePlanningProfileForm
      :open="showForm"
      :profile="editTarget"
      :initial-user-guid="createTargetUserGuid"
      :existing-user-guids="existingUserGuids"
      :existing-profiles="profiles"
      @close="closeForm"
      @saved="onSaved"
    />

    <EmployeeProfileBulkAction
      :open="showBulk"
      :rows="selectedRows"
      :all-rows="rows"
      :rotation-required="teamRotationEnabled"
      @close="showBulk = false"
      @applied="onBulkApplied"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  onMounted,
  ref,
} from 'vue'
import {
  IconAdjustments,
  IconAlertCircle,
  IconChecks,
  IconPencil,
  IconRefresh,
  IconSearch,
  IconUserPlus,
  IconUserSearch,
} from '@tabler/icons-vue'
import { useTeamStore, type TeamEmployee } from '@/stores/teamStore'
import { useUserStore } from '@/stores/userStore'
import EmployeePlanningProfileService from '@/service/EmployeePlanningProfileService'
import PlanningSuggestionConfigService from '@/service/PlanningSuggestionConfigService'
import PlanningInfoPanel from '../components/PlanningInfoPanel.vue'
import PlanningPageHeader from '../components/PlanningPageHeader.vue'
import EmployeePlanningProfileForm from './EmployeePlanningProfileForm.vue'
import EmployeeProfileBulkAction from './EmployeeProfileBulkAction.vue'
import {
  formatMinutes,
  MODE_LABELS,
  responseData,
  responseError,
} from '../planningSuggestion.helpers'
import { validateTeamRotationReadiness } from '../teamWeeklyLeave.helpers'
import type {
  EmployeePlanningProfile,
  PlanningMode,
  PlanningSuggestionConfig,
} from '../planningSuggestion.type'
import {
  buildEmployeeProfileRows,
  duplicateRotationOrders,
  profileReadiness,
  profileStatusClass,
} from './employeePlanningProfile.helpers'
import type {
  BulkProfileResult,
  EmployeePlanningProfileRow,
  ProfileModeFilter,
  ProfileStatusFilter,
} from './employeePlanningProfile.type'

const teamStore = useTeamStore()
const userStore = useUserStore()
const loading = ref(false)
const errorMessage = ref('')
const feedbackMessage = ref('')
const search = ref('')
const modeFilter = ref<ProfileModeFilter>('ALL')
const statusFilter = ref<ProfileStatusFilter>('ALL')
const profiles = ref<EmployeePlanningProfile[]>([])
const employees = ref<TeamEmployee[]>([])
const activeConfig = ref<PlanningSuggestionConfig | null>(null)
const showForm = ref(false)
const showBulk = ref(false)
const editTarget = ref<EmployeePlanningProfile | null>(null)
const createTargetUserGuid = ref('')
const selectedKeys = ref<string[]>([])

const teamRotationEnabled = computed(
  () => activeConfig.value?.rules.weekly_leave_policy.mode === 'TEAM_ROTATION',
)

const rows = computed(() => buildEmployeeProfileRows(employees.value, profiles.value))
const duplicateOrders = computed(() => duplicateRotationOrders(profiles.value))
const rotationReadiness = computed(() =>
  validateTeamRotationReadiness(profiles.value, activeConfig.value),
)

const readinessByKey = computed(() => {
  const values = new Map<string, ReturnType<typeof profileReadiness>>()
  rows.value.forEach((row) => {
    values.set(
      row.key,
      profileReadiness(row, {
        teamRotationEnabled: teamRotationEnabled.value,
        duplicateOrders: duplicateOrders.value,
      }),
    )
  })
  return values
})

const stats = computed(() => {
  const currentTeamRows = rows.value.filter((row) => row.inCurrentTeam)
  const statuses = currentTeamRows.map((row) => readiness(row).status)
  return {
    teamTotal: currentTeamRows.length,
    configured: currentTeamRows.filter((row) => row.profile).length,
    unconfigured: statuses.filter((status) => status === 'UNCONFIGURED').length,
    ready: statuses.filter((status) => status === 'READY').length,
    needsAttention: statuses.filter((status) =>
      ['UNCONFIGURED', 'INCOMPLETE', 'INACTIVE'].includes(status),
    ).length,
  }
})

const completionPercent = computed(() =>
  stats.value.teamTotal
    ? Math.round((stats.value.ready / stats.value.teamTotal) * 100)
    : 0,
)

const existingUserGuids = computed(() =>
  profiles.value
    .map((profile) => profile.user?.guid)
    .filter(Boolean) as string[],
)

const filteredRows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('fr')
  return rows.value.filter((row) => {
    const profile = row.profile
    const status = readiness(row).status
    const matchesSearch = !query || [
      row.person.name,
      row.person.employeeCode,
      profile ? MODE_LABELS[profile.planning_mode] : 'non configuré',
      profile?.fixed_session_template?.name,
      profile?.rotation_order,
      readiness(row).label,
    ]
      .filter((value) => value !== null && value !== undefined)
      .some((value) => String(value).toLocaleLowerCase('fr').includes(query))

    const matchesMode =
      modeFilter.value === 'ALL' || profile?.planning_mode === modeFilter.value
    const matchesStatus = statusFilter.value === 'ALL' || status === statusFilter.value
    return matchesSearch && matchesMode && matchesStatus
  })
})

const selectableVisibleRows = computed(() =>
  filteredRows.value.filter((row) => row.inCurrentTeam),
)
const selectedRows = computed(() =>
  rows.value.filter((row) => selectedKeys.value.includes(row.key) && row.inCurrentTeam),
)
const allVisibleSelected = computed(() =>
  selectableVisibleRows.value.length > 0 &&
  selectableVisibleRows.value.every((row) => selectedKeys.value.includes(row.key)),
)
const someVisibleSelected = computed(() =>
  !allVisibleSelected.value &&
  selectableVisibleRows.value.some((row) => selectedKeys.value.includes(row.key)),
)

async function loadData(): Promise<void> {
  loading.value = true
  errorMessage.value = ''
  try {
    const managerGuid = userStore.user?.guid
    const [team, profileResponse, configResponse] = await Promise.all([
      managerGuid
        ? teamStore.loadTeam(managerGuid, true)
        : Promise.resolve(teamStore.employees),
      EmployeePlanningProfileService.list(),
      PlanningSuggestionConfigService.active(),
    ])
    employees.value = team ?? []
    profiles.value = responseData(profileResponse).employee_planning_profiles?.items ?? []
    activeConfig.value = responseData(configResponse).planning_suggestion_config ?? null
    const validKeys = new Set(buildEmployeeProfileRows(employees.value, profiles.value).map((row) => row.key))
    selectedKeys.value = selectedKeys.value.filter((key) => validKeys.has(key))
  } catch (error: any) {
    errorMessage.value = responseError(error, 'Impossible de charger l’équipe et les profils.')
  } finally {
    loading.value = false
  }
}

function readiness(row: EmployeePlanningProfileRow) {
  return readinessByKey.value.get(row.key) ?? {
    status: 'INCOMPLETE' as const,
    label: 'À vérifier',
    issues: ['État impossible à déterminer.'],
  }
}

function openCreate(row?: EmployeePlanningProfileRow): void {
  editTarget.value = null
  createTargetUserGuid.value = row?.person.guid ?? ''
  showForm.value = true
}

function openEdit(profile: EmployeePlanningProfile): void {
  editTarget.value = profile
  createTargetUserGuid.value = ''
  showForm.value = true
}

function closeForm(): void {
  showForm.value = false
  editTarget.value = null
  createTargetUserGuid.value = ''
}

async function onSaved(): Promise<void> {
  closeForm()
  feedbackMessage.value = 'Le profil a été enregistré avec succès.'
  await loadData()
}

async function onBulkApplied(result: BulkProfileResult): Promise<void> {
  feedbackMessage.value = result.failureCount
    ? `${result.successCount} profil(s) mis à jour et ${result.failureCount} échec(s). Consultez le détail dans la fenêtre d’action en masse.`
    : `${result.successCount} profil(s) ont été mis à jour avec succès.`
  await loadData()
  if (result.failureCount === 0) {
    clearSelection()
    showBulk.value = false
  }
}

function toggleRow(key: string): void {
  selectedKeys.value = selectedKeys.value.includes(key)
    ? selectedKeys.value.filter((value) => value !== key)
    : [...selectedKeys.value, key]
}

function toggleVisibleSelection(): void {
  const visibleKeys = selectableVisibleRows.value.map((row) => row.key)
  if (allVisibleSelected.value) {
    selectedKeys.value = selectedKeys.value.filter((key) => !visibleKeys.includes(key))
  } else {
    selectedKeys.value = [...new Set([...selectedKeys.value, ...visibleKeys])]
  }
}

function clearSelection(): void {
  selectedKeys.value = []
}

function resetFilters(): void {
  search.value = ''
  modeFilter.value = 'ALL'
  statusFilter.value = 'ALL'
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((value) => value[0])
    .join('')
    .toUpperCase()
}

function restManagement(row: EmployeePlanningProfileRow): string {
  const profile = row.profile
  if (!profile) return 'Profil à configurer'
  if (profile.planning_mode === 'EXCLUDED') return 'Non applicable'
  if (profile.planning_mode === 'ROTATING') return 'Selon les règles globales'
  return profile.fixed_rest_day_mode === 'ROTATING'
    ? 'Jour choisi par le moteur'
    : 'Repos défini dans l’horaire type'
}

function modeClass(mode: PlanningMode): string {
  return {
    FIXED: 'bg-blue-50 text-blue-700',
    ROTATING: 'bg-emerald-50 text-emerald-700',
    EXCLUDED: 'bg-slate-100 text-slate-600',
  }[mode]
}

const MetricCard = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: Number, required: true },
    help: { type: String, required: true },
    tone: { type: String, required: true },
  },
  setup(props) {
    return () => h('div', {
      class: `rounded-2xl border p-4 ${{
        blue: 'border-blue-100 bg-blue-50/60',
        indigo: 'border-blue-100 bg-blue-50/60',
        emerald: 'border-emerald-100 bg-emerald-50/60',
        amber: 'border-amber-100 bg-amber-50/60',
      }[props.tone] ?? 'border-slate-200 bg-slate-50'}`,
    }, [
      h('p', { class: 'text-xs font-bold uppercase tracking-[0.12em] text-slate-500' }, props.label),
      h('p', { class: 'mt-1 text-2xl font-bold text-slate-900' }, String(props.value)),
      h('p', { class: 'mt-1 text-xs leading-5 text-slate-500' }, props.help),
    ])
  },
})

onMounted(loadData)
</script>

<style scoped>
.primary-button,
.secondary-button,
.edit-button,
.selection-button,
.bulk-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 0.75rem;
  font-size: 0.8125rem;
  font-weight: 700;
  transition: 0.16s;
}
.primary-button {
  background: #1d4ed8;
  color: white;
  padding: 0.7rem 1rem;
}
.secondary-button,
.selection-button,
.edit-button {
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569;
  padding: 0.65rem 0.9rem;
}
.bulk-button {
  background: #1d4ed8;
  color: white;
  padding: 0.65rem 0.9rem;
}
.search-control,
.filter-control {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0.7rem 0.8rem;
  font-size: 0.8125rem;
  color: #475569;
  outline: none;
}
.search-control { padding-left: 2.35rem; }
.search-control:focus,
.filter-control:focus {
  border-color: #93c5fd;
  background: white;
  box-shadow: 0 0 0 3px #dbeafe;
}
.selection-checkbox {
  height: 1rem;
  width: 1rem;
  border-radius: 0.25rem;
  border-color: #cbd5e1;
  accent-color: #1d4ed8;
}
</style>
