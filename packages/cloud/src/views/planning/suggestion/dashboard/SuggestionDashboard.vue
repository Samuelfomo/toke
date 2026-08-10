<template>
  <div class="space-y-6">
    <PlanningPageHeader
        eyebrow="Centre de contrôle"
        title="Préparez un planning fiable avant de le générer"
        description="Cette vue vérifie automatiquement les prérequis, indique les blocages et guide l’utilisateur vers l’action suivante."
    >
      <template #actions>
        <button
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            :disabled="loading"
            @click="loadDashboard"
        >
          <IconRefresh
              :size="16"
              :class="{ 'animate-spin': loading }"
          />
          Actualiser
        </button>

        <button
            class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm"
            :class="ready
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'cursor-not-allowed bg-slate-300'"
            :disabled="!ready"
            @click="showGenerate = true"
        >
          <IconSparkles :size="16" />
          Générer un planning
        </button>
      </template>
    </PlanningPageHeader>

    <PlanningInfoPanel
        v-if="loadError"
        tone="warning"
        title="Certaines informations n’ont pas pu être chargées"
        :description="loadError"
        important="Actualisez la page, puis vérifiez les routes de configuration si le problème persiste."
    />

    <section
        class="rounded-2xl border p-5"
        :class="ready
                ? 'border-emerald-200 bg-emerald-50/70'
                : 'border-amber-200 bg-amber-50/70'"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex items-start gap-4">
          <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              :class="ready
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'"
          >
            <IconCircleCheck v-if="ready" :size="23" />
            <IconAlertTriangle v-else :size="23" />
          </div>

          <div>
            <p
                class="text-sm font-bold"
                :class="ready
                                ? 'text-emerald-950'
                                : 'text-amber-950'"
            >
              {{ ready
                ? 'Le module est prêt pour la génération'
                : 'La configuration doit encore être complétée' }}
            </p>
            <p
                class="mt-1 max-w-2xl text-xs leading-5"
                :class="ready
                                ? 'text-emerald-800/80'
                                : 'text-amber-800/80'"
            >
              {{ ready
                ? 'La génération créera un brouillon. Aucun planning ne sera publié sans validation explicite.'
                : primaryBlocker }}
            </p>
          </div>
        </div>

        <div
            class="rounded-xl border bg-white/70 px-4 py-3 text-right"
            :class="ready
                        ? 'border-emerald-200'
                        : 'border-amber-200'"
        >
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Préparation
          </p>
          <p class="mt-0.5 text-xl font-bold text-slate-900">
            {{ readinessPercent }} %
          </p>
        </div>
      </div>
    </section>

    <PlanningInfoPanel
        v-if="activeConfig?.rules.weekly_leave_policy.mode === 'TEAM_ROTATION'"
        :tone="rotationReadiness.ready ? 'success' : 'warning'"
        title="Rotation des congés au niveau de l’équipe"
        :description="rotationReadiness.ready
                ? 'Tous les collaborateurs inclus possèdent un ordre unique. Le cycle peut être calculé par OR-Tools.'
                : rotationReadiness.blockers.join(' ')"
        :important="rotationReadiness.ready
                ? `${rotationReadiness.includedProfiles.length} collaborateur(s) participent au cycle.`
                : 'Corrigez les profils employés avant de lancer une génération.'"
    />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <PlanningMetricCard
          label="Profils employés"
          :value="profileMetric"
          description="Détermine qui travaille en fixe, en rotation ou reste exclu."
          :progress="profileProgress"
          :status-ready="profilesReady"
          :icon="IconUsersGroup"
          @open="goTo('planning-suggestion-profiles')"
      />

      <PlanningMetricCard
          label="Besoins actifs"
          :value="`${requirements.length} règle${requirements.length > 1 ? 's' : ''}`"
          description="Définit les effectifs à couvrir pour chaque service et chaque jour."
          :progress="coverageProgress"
          :status-ready="requirementsReady"
          :icon="IconTargetArrow"
          accent="emerald"
          @open="goTo('planning-suggestion-requirements')"
      />

      <PlanningMetricCard
          label="Configuration moteur"
          :value="activeConfig ? `Version ${activeConfig.version}` : 'Absente'"
          description="Centralise les congés, gardes, limites et le solveur utilisé."
          :progress="activeConfig ? 100 : 0"
          :status-ready="Boolean(activeConfig)"
          :icon="IconSettings"
          accent="violet"
          @open="goTo('planning-suggestion-configuration')"
      />

      <PlanningMetricCard
          label="Brouillons utiles"
          :value="`${draftCount} en attente`"
          description="Plannings générés mais pas encore publiés aux collaborateurs."
          :progress="managerGuid ? 100 : 0"
          :status-ready="Boolean(managerGuid)"
          :icon="IconFileDescription"
          accent="amber"
          @open="goTo('planning-suggestion-list')"
      />
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <ReadinessChecklist
          :items="readinessItems"
          @open="goTo"
      />

      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-sm font-bold text-slate-900">
              Parcours recommandé
            </h2>
            <p class="mt-1 text-xs leading-5 text-slate-500">
              Un ordre simple pour éviter les incohérences.
            </p>
          </div>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <IconRoute :size="19" />
          </div>
        </div>

        <div class="mt-5 space-y-1">
          <button
              v-for="(step, index) in journey"
              :key="step.routeName"
              class="group flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-slate-50"
              @click="goTo(step.routeName)"
          >
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
              {{ index + 1 }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-slate-800">
                {{ step.title }}
              </p>
              <p class="mt-0.5 text-xs leading-5 text-slate-500">
                {{ step.description }}
              </p>
            </div>
            <IconArrowUpRight
                :size="16"
                class="mt-1 text-slate-300 group-hover:text-slate-600"
            />
          </button>
        </div>
      </section>
    </div>

    <GenerateSuggestionModal
        :open="showGenerate"
        :manager-guid="managerGuid"
        @close="showGenerate = false"
        @generated="onGenerated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconCircleCheck,
  IconFileDescription,
  IconRefresh,
  IconRoute,
  IconSettings,
  IconSparkles,
  IconTargetArrow,
  IconUsersGroup,
} from '@tabler/icons-vue'

import { useUserStore } from '@/stores/userStore'
import { useTeamStore } from '@/stores/teamStore'
import EmployeePlanningProfileService from '@/service/EmployeePlanningProfileService'
import PlanningSuggestionConfigService from '@/service/PlanningSuggestionConfigService'
import PlanningSuggestionRequirementService from '@/service/PlanningSuggestionRequirementService'
import ScheduleSuggestionService from '@/service/ScheduleSuggestionService'

import PlanningInfoPanel from '../components/PlanningInfoPanel.vue'
import PlanningMetricCard from '../components/PlanningMetricCard.vue'
import PlanningPageHeader from '../components/PlanningPageHeader.vue'
import ReadinessChecklist from '../components/ReadinessChecklist.vue'
import GenerateSuggestionModal from '../suggestions/GenerateSuggestionModal.vue'
import {
  responseData,
  responseError,
} from '../planningSuggestion.helpers'
import { validateTeamRotationReadiness } from '../teamWeeklyLeave.helpers'
import type {
  EmployeePlanningProfile,
  PlanningReadinessItem,
  PlanningRequirement,
  PlanningSuggestionConfig,
  ScheduleSuggestionListItem,
} from '../planningSuggestion.type'

const router = useRouter()
const userStore = useUserStore()
const teamStore = useTeamStore()

const loading = ref(false)
const loadError = ref('')
const profiles = ref<EmployeePlanningProfile[]>([])
const requirements = ref<PlanningRequirement[]>([])
const suggestions = ref<ScheduleSuggestionListItem[]>([])
const activeConfig = ref<PlanningSuggestionConfig | null>(null)
const showGenerate = ref(false)

const managerGuid = computed(() => userStore.user?.guid ?? '')
const activeEmployees = computed<any[]>(() =>
    ((teamStore as any).employees ?? []).filter(
        (employee: any) => employee.isActive !== false,
    ),
)

const configuredGuids = computed(
    () =>
        new Set(
            profiles.value
                .filter((profile) => profile.active && profile.user?.guid)
                .map((profile) => profile.user!.guid),
        ),
)

const baseProfilesReady = computed(() =>
    activeEmployees.value.length
        ? activeEmployees.value.every((employee) =>
            configuredGuids.value.has(employee.guid),
        )
        : profiles.value.length > 0,
)

const rotationReadiness = computed(() =>
    validateTeamRotationReadiness(
        profiles.value,
        activeConfig.value,
    ),
)

const profilesReady = computed(
    () => baseProfilesReady.value && rotationReadiness.value.ready,
)

const profileMetric = computed(() =>
    activeEmployees.value.length
        ? `${configuredGuids.value.size} / ${activeEmployees.value.length}`
        : `${profiles.value.length} configuré(s)`,
)

const profileProgress = computed(() => {
  if (!activeEmployees.value.length) {
    return profiles.value.length ? 100 : 0
  }

  const coverage = Math.round(
      (configuredGuids.value.size / activeEmployees.value.length) * 100,
  )

  return rotationReadiness.value.ready
      ? coverage
      : Math.min(coverage, 85)
})

const coveredDays = computed(
    () =>
        new Set(
            requirements.value
                .filter((requirement) => requirement.active)
                .map((requirement) => requirement.day_of_week),
        ),
)

const requirementsReady = computed(
    () => coveredDays.value.size === 7,
)

const coverageProgress = computed(() =>
    Math.round((coveredDays.value.size / 7) * 100),
)

const draftCount = computed(
    () => suggestions.value.filter((item) => item.status === 'draft').length,
)

const readinessItems = computed<PlanningReadinessItem[]>(() => {
  const items: PlanningReadinessItem[] = [
    {
      id: 'profiles',
      label: baseProfilesReady.value
          ? 'Tous les collaborateurs ont un profil'
          : 'Des profils employés sont manquants',
      description: baseProfilesReady.value
          ? 'Le moteur connaît le mode de participation de chaque collaborateur.'
          : 'Chaque collaborateur actif doit être FIXED, ROTATING ou EXCLUDED.',
      ready: baseProfilesReady.value,
      routeName: 'planning-suggestion-profiles',
      actionLabel: 'Configurer',
    },
  ]

  if (
      activeConfig.value?.rules.weekly_leave_policy.mode ===
      'TEAM_ROTATION'
  ) {
    items.push({
      id: 'weekly_leave',
      label: rotationReadiness.value.ready
          ? 'Ordres de congé uniques et complets'
          : 'Rotation des congés incomplète',
      description: rotationReadiness.value.ready
          ? 'Chaque collaborateur inclus possède un ordre unique dans le cycle.'
          : rotationReadiness.value.blockers.join(' '),
      ready: rotationReadiness.value.ready,
      routeName: 'planning-suggestion-profiles',
      actionLabel: 'Corriger',
    })
  }

  items.push(
      {
        id: 'configuration',
        label: activeConfig.value
            ? `Configuration « ${activeConfig.value.name} » active`
            : 'Aucune configuration moteur active',
        description: activeConfig.value
            ? 'Les règles globales seront appliquées.'
            : 'Activez les règles de congé, garde, durée et équité.',
        ready: Boolean(activeConfig.value),
        routeName: 'planning-suggestion-configuration',
        actionLabel: 'Activer',
      },
      {
        id: 'requirements',
        label: requirementsReady.value
            ? 'Les besoins couvrent les 7 jours'
            : `Couverture définie sur ${coveredDays.value.size} jour(s) sur 7`,
        description: requirementsReady.value
            ? 'Chaque jour possède au moins un besoin actif.'
            : 'Les jours sans besoin ne peuvent pas être garantis.',
        ready: requirementsReady.value,
        routeName: 'planning-suggestion-requirements',
        actionLabel: 'Compléter',
      },
      {
        id: 'manager',
        label: managerGuid.value
            ? 'Responsable identifié'
            : 'Utilisateur manager non identifié',
        description: managerGuid.value
            ? 'Les suggestions seront rattachées à votre compte.'
            : 'La session doit fournir un GUID valide.',
        ready: Boolean(managerGuid.value),
        routeName: 'planning-suggestion-dashboard',
        actionLabel: 'Vérifier',
      },
  )

  return items
})

const ready = computed(() =>
    readinessItems.value.every((item) => item.ready),
)

const readinessPercent = computed(() =>
    Math.round(
        (readinessItems.value.filter((item) => item.ready).length /
            readinessItems.value.length) *
        100,
    ),
)

const primaryBlocker = computed(
    () =>
        readinessItems.value.find((item) => !item.ready)?.description ?? '',
)

const journey = [
  {
    title: 'Configurer les profils employés',
    description:
        'Définir le mode de participation et l’ordre de congé de chaque collaborateur.',
    routeName: 'planning-suggestion-profiles',
  },
  {
    title: 'Définir les besoins de couverture',
    description:
        'Préciser les services et effectifs attendus par jour.',
    routeName: 'planning-suggestion-requirements',
  },
  {
    title: 'Valider les règles de planification',
    description:
        'Contrôler congés, gardes, limites et solveur.',
    routeName: 'planning-suggestion-configuration',
  },
  {
    title: 'Générer et vérifier une suggestion',
    description:
        'Créer un brouillon puis le publier après contrôle.',
    routeName: 'planning-suggestion-list',
  },
]

async function loadDashboard(): Promise<void> {
  loading.value = true
  loadError.value = ''

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

    requirements.value = activeConfig.value
        ? responseData(
        await PlanningSuggestionRequirementService.listByConfig(
            activeConfig.value.guid,
        ),
    ).planning_suggestion_requirements?.items ?? []
        : []

    if (managerGuid.value) {
      const suggestionResponse =
          await ScheduleSuggestionService.list(
              managerGuid.value,
              {
                status: ['draft', 'approved'],
                limit: 50,
              },
          )

      const suggestionData = responseData(suggestionResponse)

      suggestions.value =
          suggestionData.schedule_suggestions?.items ??
          suggestionData.suggestions?.items ??
          []
    } else {
      suggestions.value = []
    }
  } catch (error: any) {
    loadError.value = responseError(
        error,
        'Impossible de charger l’état du module.',
    )
  } finally {
    loading.value = false
  }
}

function goTo(routeName: string): void {
  router.push({ name: routeName })
}

function onGenerated(suggestion: { guid: string }): void {
  showGenerate.value = false
  router.push({
    name: 'planning-suggestion-preview',
    params: { guid: suggestion.guid },
  })
}

onMounted(loadDashboard)
</script>
