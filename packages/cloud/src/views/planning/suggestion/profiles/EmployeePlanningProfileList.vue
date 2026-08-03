<template>
  <div class="space-y-6">
    <PlanningPageHeader
        eyebrow="Étape 1"
        title="Profils de planification des collaborateurs"
        description="
        Chaque collaborateur doit disposer d’un profil actif. Ce profil indique s’il conserve un horaire fixe,
        participe aux rotations ou reste exclu des générations."
    >
      <template #actions>
        <button
            type="button"
            class="secondary-button"
            :disabled="loading"
            @click="loadProfiles"
        >
          <IconRefresh
              :size="16"
              :class="{ 'animate-spin': loading }"
          />
          Actualiser
        </button>

        <button
            type="button"
            class="primary-button"
            @click="openCreate"
        >
          <IconUserPlus :size="16"/>
          Configurer un collaborateur
        </button>
      </template>
    </PlanningPageHeader>

    <PlanningInfoPanel
        title="Comment choisir le bon mode ?"
        description="Le mode décrit la participation du collaborateur au moteur. Il ne modifie pas son compte utilisateur."
        :examples="[
                'Horaire fixe : même modèle horaire, avec un repos défini ou choisi par le moteur.',
                'Rotation automatique : services répartis selon les besoins et l’équité.',
                'Exclu : collaborateur non inclus dans les prochaines générations.',
            ]"
        important="Un collaborateur FIXED doit obligatoirement posséder un Session Template fixe."
    />

    <PlanningInfoPanel
        v-if="teamRotationEnabled"
        :tone="rotationReadiness.ready ? 'success' : 'warning'"
        title="Congé hebdomadaire tournant"
        :description="rotationReadiness.ready
                ? 'Tous les collaborateurs inclus possèdent un ordre unique dans le cycle de congé.'
                : rotationReadiness.blockers.join(' ')"
        :important="rotationReadiness.ready
                ? `${rotationReadiness.includedProfiles.length} profil(s) participent à la rotation.`
                : 'Les employés FIXED et ROTATING actifs doivent tous avoir un ordre positif et unique.'"
    />

    <div class="grid gap-4 sm:grid-cols-3">
      <Metric
          label="Horaires fixes"
          :value="stats.fixed"
          help="Modèle stable, repos fixe ou rotatif."
          tone="indigo"
      />
      <Metric
          label="En rotation"
          :value="stats.rotating"
          help="Répartis automatiquement entre les services."
          tone="emerald"
      />
      <Metric
          label="Exclus"
          :value="stats.excluded"
          help="Non inclus dans les futures suggestions."
          tone="slate"
      />
    </div>

    <PlanningInfoPanel
        v-if="errorMessage"
        tone="warning"
        title="Chargement impossible"
        :description="errorMessage"
    />

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
          class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-sm font-bold text-slate-900">
            Profils actifs
          </h2>
          <p class="mt-1 text-xs text-slate-500">
            {{ profiles.length }} profil(s) disponibles pour le moteur.
          </p>
        </div>

        <div class="relative w-full sm:w-72">
          <IconSearch
              :size="16"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
              v-model="search"
              type="search"
              placeholder="Rechercher un collaborateur…"
              class="search-control"
          />
        </div>
      </div>

      <div v-if="loading" class="space-y-3 p-5">
        <div
            v-for="index in 5"
            :key="index"
            class="h-16 animate-pulse rounded-xl bg-slate-100"
        />
      </div>

      <div
          v-else-if="filteredProfiles.length === 0"
          class="px-6 py-14 text-center"
      >
        <IconUsersGroup
            :size="30"
            class="mx-auto text-slate-300"
        />
        <p class="mt-3 text-sm font-bold text-slate-800">
          Aucun profil trouvé
        </p>
        <p class="mt-1 text-xs text-slate-500">
          Configurez la participation des collaborateurs avant de générer.
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[1100px]">
          <thead class="bg-slate-50/80">
          <tr class="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
            <th class="px-5 py-3.5">Collaborateur</th>
            <th class="px-4 py-3.5">Mode</th>
            <th class="px-4 py-3.5">Ordre</th>
            <th class="px-4 py-3.5">Horaire fixe</th>
            <th class="px-4 py-3.5">Gestion du repos</th>
            <th class="px-4 py-3.5">Limite hebdo.</th>
            <th class="px-4 py-3.5">État</th>
            <th class="px-5 py-3.5 text-right">Action</th>
          </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
          <tr
              v-for="profile in filteredProfiles"
              :key="profile.guid"
              class="hover:bg-slate-50/70"
          >
            <td class="px-5 py-4">
              <div class="flex items-center gap-3">
                <div
                    class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#004aad] text-xs font-bold text-white">
                  {{ initials(profile.user?.name) }}
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-800">
                    {{ profile.user?.name ?? 'Collaborateur introuvable' }}
                  </p>
                  <p class="mt-0.5 text-[11px] text-slate-400">
                    {{ profile.user?.employee_code || 'Code non renseigné' }}
                  </p>
                </div>
              </div>
            </td>

            <td class="px-4 py-4">
              <span
                  class="rounded-full px-2.5 py-1 text-[10px] font-bold"
                  :class="modeClass(profile.planning_mode)"
              >
                {{ MODE_LABELS[profile.planning_mode] }}
              </span>
            </td>

            <td class="px-4 py-4">
              <template v-if="profile.planning_mode !== 'EXCLUDED'">
                <span
                    v-if="profile.rotation_order !== null"
                    class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg
                           bg-[#004aad] px-2 text-xs font-bold text-white"
                >
                  {{ profile.rotation_order }}
                </span>
                <span
                    v-else
                    class="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700"
                >
                  <IconAlertCircle :size="14"/>
                  Manquant
                </span>
              </template>
              <span v-else class="text-xs text-slate-400">
                Non applicable
              </span>
            </td>

            <td class="px-4 py-4 text-xs text-slate-600">
              {{ profile.fixed_session_template?.name ?? 'Non applicable' }}
            </td>

            <td class="px-4 py-4 text-xs text-slate-600">
              {{
                profile.planning_mode === 'FIXED'
                    ? profile.fixed_rest_day_mode === 'ROTATING'
                        ? 'Choisi par le moteur'
                        : 'Défini dans le template'
                    : profile.planning_mode === 'EXCLUDED'
                        ? 'Non applicable'
                        : 'Selon les règles globales'
              }}
            </td>

            <td class="px-4 py-4 text-xs text-slate-600">
              {{ formatMinutes(profile.max_weekly_minutes) }}
            </td>

            <td class="px-4 py-4">
                                <span
                                    class="inline-flex items-center gap-1.5 text-xs font-semibold"
                                    :class="profileComplete(profile)
                                        ? 'text-emerald-700'
                                        : 'text-amber-700'"
                                >
                                    <span
                                        class="h-1.5 w-1.5 rounded-full"
                                        :class="profileComplete(profile)
                                            ? 'bg-emerald-500'
                                            : 'bg-amber-500'"
                                    />
                                    {{
                                    profileComplete(profile)
                                        ? 'Profil complet'
                                        : 'À compléter'
                                  }}
                                </span>
            </td>

            <td class="px-5 py-4 text-right">
              <button
                  type="button"
                  class="edit-button"
                  @click="openEdit(profile)"
              >
                <IconPencil :size="14"/>
                Modifier
              </button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </section>

    <EmployeePlanningProfileForm
        :open="showForm"
        :profile="editTarget"
        :existing-user-guids="existingUserGuids"
        :existing-profiles="profiles"
        @close="showForm = false"
        @saved="onSaved"
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
  IconAlertCircle,
  IconPencil,
  IconRefresh,
  IconSearch,
  IconUserPlus,
  IconUsersGroup,
} from '@tabler/icons-vue'

import EmployeePlanningProfileService from '@/service/EmployeePlanningProfileService'
import PlanningSuggestionConfigService from '@/service/PlanningSuggestionConfigService'

import PlanningInfoPanel from '../components/PlanningInfoPanel.vue'
import PlanningPageHeader from '../components/PlanningPageHeader.vue'
import EmployeePlanningProfileForm from './EmployeePlanningProfileForm.vue'
import {
  formatMinutes,
  MODE_LABELS,
  responseData,
  responseError,
} from '../planningSuggestion.helpers'
import {validateTeamRotationReadiness} from '../teamWeeklyLeave.helpers'
import type {
  EmployeePlanningProfile,
  PlanningMode,
  PlanningSuggestionConfig,
} from '../planningSuggestion.type'

const loading = ref(false)
const errorMessage = ref('')
const search = ref('')
const profiles = ref<EmployeePlanningProfile[]>([])
const activeConfig = ref<PlanningSuggestionConfig | null>(null)
const showForm = ref(false)
const editTarget = ref<EmployeePlanningProfile | null>(null)

const teamRotationEnabled = computed(
    () =>
        activeConfig.value?.rules.weekly_leave_policy.mode ===
        'TEAM_ROTATION',
)

const rotationReadiness = computed(() =>
    validateTeamRotationReadiness(
        profiles.value,
        activeConfig.value,
    ),
)

const stats = computed(() => ({
  fixed: profiles.value.filter(
      (profile) => profile.planning_mode === 'FIXED',
  ).length,
  rotating: profiles.value.filter(
      (profile) => profile.planning_mode === 'ROTATING',
  ).length,
  excluded: profiles.value.filter(
      (profile) => profile.planning_mode === 'EXCLUDED',
  ).length,
}))

const existingUserGuids = computed(() =>
    profiles.value
        .map((profile) => profile.user?.guid)
        .filter(Boolean) as string[],
)

const filteredProfiles = computed(() => {
  const query = search.value.trim().toLowerCase()

  if (!query) return profiles.value

  return profiles.value.filter((profile) =>
      [
        profile.user?.name,
        profile.user?.employee_code,
        MODE_LABELS[profile.planning_mode],
        profile.fixed_session_template?.name,
        profile.rotation_order,
      ]
          .filter((value) => value !== null && value !== undefined)
          .some((value) =>
              String(value).toLowerCase().includes(query),
          ),
  )
})

async function loadProfiles(): Promise<void> {
  loading.value = true
  errorMessage.value = ''

  try {
    const [profileResponse, configResponse] = await Promise.all([
      EmployeePlanningProfileService.list(),
      PlanningSuggestionConfigService.active(),
    ])

    profiles.value =
        responseData(profileResponse).employee_planning_profiles?.items ??
        []

    activeConfig.value =
        responseData(configResponse).planning_suggestion_config ?? null
  } catch (error: any) {
    errorMessage.value = responseError(
        error,
        'Impossible de charger les profils.',
    )
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editTarget.value = null
  showForm.value = true
}

function openEdit(profile: EmployeePlanningProfile): void {
  editTarget.value = profile
  showForm.value = true
}

function onSaved(): void {
  showForm.value = false
  loadProfiles()
}

function initials(name?: string): string {
  return name
      ? name
          .split(/\s+/)
          .slice(0, 2)
          .map((value) => value[0])
          .join('')
          .toUpperCase()
      : '?'
}

function profileComplete(
    profile: EmployeePlanningProfile,
): boolean {
  if (!profile.active) return false

  if (
      profile.planning_mode === 'FIXED' &&
      !profile.fixed_session_template
  ) {
    return false
  }

  if (
      teamRotationEnabled.value &&
      profile.planning_mode !== 'EXCLUDED' &&
      profile.rotation_order === null
  ) {
    return false
  }

  return true
}

function modeClass(mode: PlanningMode): string {
  return {
    FIXED: 'bg-indigo-50 text-indigo-700',
    ROTATING: 'bg-emerald-50 text-emerald-700',
    EXCLUDED: 'bg-slate-100 text-slate-600',
  }[mode]
}

const Metric = defineComponent({
  props: {
    label: String,
    value: Number,
    help: String,
    tone: String,
  },
  setup(props) {
    return () =>
        h(
            'div',
            {
              class: `rounded-2xl border p-4 ${
                  props.tone === 'indigo'
                      ? 'border-indigo-100 bg-indigo-50/60'
                      : props.tone === 'emerald'
                          ? 'border-emerald-100 bg-emerald-50/60'
                          : 'border-slate-200 bg-slate-50'
              }`,
            },
            [
              h(
                  'p',
                  {
                    class: 'text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500',
                  },
                  props.label,
              ),
              h(
                  'p',
                  {
                    class: 'mt-1 text-2xl font-bold text-slate-900',
                  },
                  String(props.value),
              ),
              h(
                  'p',
                  {
                    class: 'mt-1 text-xs text-slate-500',
                  },
                  props.help,
              ),
            ],
        )
  },
})

onMounted(loadProfiles)
</script>

<style scoped>
.primary-button,
.secondary-button,
.edit-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  transition: 0.16s;
}

.primary-button {
  background: #4f46e5;
  color: white;
  padding: 0.65rem 1rem;
}

.secondary-button {
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569;
  padding: 0.65rem 0.9rem;
}

.edit-button {
  border: 1px solid #e2e8f0;
  color: #475569;
  padding: 0.5rem 0.65rem;
}

.search-control {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0.65rem 0.75rem 0.65rem 2.25rem;
  font-size: 0.75rem;
  outline: none;
}

.search-control:focus {
  border-color: #a5b4fc;
  background: white;
  box-shadow: 0 0 0 3px #e0e7ff;
}
</style>