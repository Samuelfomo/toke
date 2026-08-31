import { computed, ref, unref, type ComputedRef, type Ref } from 'vue'

import { useTeamStore } from '../../../../stores/teamStore'
import PlanningSuggestionConfigService from '../../../../service/PlanningSuggestionConfigService'
import PlanningSuggestionRequirementService from '../../../../service/PlanningSuggestionRequirementService'
import { responseData, responseError } from '../planningSuggestion.helpers'
import { validateTeamRotationReadiness } from '../teamWeeklyLeave.helpers'
import { buildRequirementCoverageSummary } from '../requirements/requirementMatrix.helpers'
import type {
  EmployeePlanningProfile,
  PlanningReadinessItem,
  PlanningRequirement,
  PlanningSuggestionConfig,
} from '../planningSuggestion.type'
import EmployeePlanningProfileService from "../../../../service/EmployeePlanningProfileService";

type MaybeGuidRef = Ref<string> | ComputedRef<string>

export function useGenerationReadiness(managerGuid: MaybeGuidRef) {
  const teamStore = useTeamStore()
  const loading = ref(false)
  const loaded = ref(false)
  const errorMessage = ref('')
  const employees = ref<any[]>([])
  const profiles = ref<EmployeePlanningProfile[]>([])
  const requirements = ref<PlanningRequirement[]>([])
  const activeConfig = ref<PlanningSuggestionConfig | null>(null)

  const activeEmployees = computed(() =>
    employees.value.filter((employee) => employee.isActive !== false),
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
      : profiles.value.some((profile) => profile.active),
  )

  const missingProfileCount = computed(() =>
    activeEmployees.value.filter(
      (employee) => !configuredGuids.value.has(employee.guid),
    ).length,
  )

  const rotationReadiness = computed(() =>
    validateTeamRotationReadiness(profiles.value, activeConfig.value),
  )

  const requirementSummary = computed(() =>
    buildRequirementCoverageSummary(requirements.value),
  )

  const requirementsReady = computed(
    () =>
      requirementSummary.value.coveredDays.length === 7 &&
      requirementSummary.value.duplicateGroupCount === 0,
  )

  const readinessItems = computed<PlanningReadinessItem[]>(() => {
    const result: PlanningReadinessItem[] = [
      {
        id: 'profiles',
        label: baseProfilesReady.value
          ? 'Tous les collaborateurs actifs ont un profil'
          : `${missingProfileCount.value || 'Des'} profil(s) employé(s) manquant(s)`,
        description: baseProfilesReady.value
          ? 'Le moteur connaît le mode de participation de chaque collaborateur.'
          : 'Configurez chaque membre actif de l’équipe avant de lancer le calcul.',
        ready: baseProfilesReady.value,
        routeName: 'planning-suggestion-profiles',
        actionLabel: 'Corriger',
      },
    ]

    if (
      activeConfig.value?.rules.weekly_leave_policy.mode === 'TEAM_ROTATION'
    ) {
      result.push({
        id: 'weekly_leave',
        label: rotationReadiness.value.ready
          ? 'Ordres de rotation complets et uniques'
          : 'Rotation hebdomadaire incomplète',
        description: rotationReadiness.value.ready
          ? 'Tous les collaborateurs concernés possèdent un ordre exploitable.'
          : rotationReadiness.value.blockers.join(' '),
        ready: rotationReadiness.value.ready,
        routeName: 'planning-suggestion-profiles',
        actionLabel: 'Corriger',
      })
    }

    result.push(
      {
        id: 'configuration',
        label: activeConfig.value
          ? `Configuration « ${activeConfig.value.name} » active`
          : 'Aucune configuration active',
        description: activeConfig.value
          ? `Version ${activeConfig.value.version} utilisée pour le prochain calcul.`
          : 'Créez ou activez les règles de repos, garde, charge et équité.',
        ready: Boolean(activeConfig.value),
        routeName: 'planning-suggestion-configuration',
        actionLabel: 'Configurer',
      },
      {
        id: 'requirements',
        label: requirementsReady.value
          ? 'Les besoins couvrent les sept jours sans doublon exact'
          : requirementSummary.value.duplicateGroupCount > 0
            ? `${requirementSummary.value.duplicateGroupCount} groupe(s) de doublons actifs`
            : `Couverture définie sur ${requirementSummary.value.coveredDays.length} jour(s) sur 7`,
        description: requirementsReady.value
          ? `${requirementSummary.value.activeCount} règle(s) active(s) seront prises en compte.`
          : requirementSummary.value.duplicateGroupCount > 0
            ? 'Supprimez ou désactivez les règles actives strictement identiques.'
            : 'Chaque jour doit posséder au moins un besoin actif.',
        ready: requirementsReady.value,
        routeName: 'planning-suggestion-requirements',
        actionLabel: 'Compléter',
      },
      {
        id: 'manager',
        label: unref(managerGuid)
          ? 'Responsable identifié'
          : 'Compte manager non identifié',
        description: unref(managerGuid)
          ? 'La proposition sera rattachée au compte actuellement connecté.'
          : 'La session doit fournir un GUID manager valide.',
        ready: Boolean(unref(managerGuid)),
        routeName: 'planning-suggestion-dashboard',
        actionLabel: 'Vérifier',
      },
    )

    return result
  })

  const ready = computed(
    () => loaded.value && readinessItems.value.every((item) => item.ready),
  )

  const blockerCount = computed(
    () => readinessItems.value.filter((item) => !item.ready).length,
  )

  const readinessPercent = computed(() => {
    if (!readinessItems.value.length) return 0
    return Math.round(
      (readinessItems.value.filter((item) => item.ready).length /
        readinessItems.value.length) *
        100,
    )
  })

  async function load(): Promise<void> {
    loading.value = true
    loaded.value = false
    errorMessage.value = ''

    try {
      const guid = unref(managerGuid)
      const [team, profileResponse, configResponse] = await Promise.all([
        guid
          ? teamStore.loadTeam(guid, true)
          : Promise.resolve((teamStore as any).employees ?? []),
        EmployeePlanningProfileService.list(),
        PlanningSuggestionConfigService.active(),
      ])

      employees.value = team ?? []
      profiles.value =
        responseData(profileResponse).employee_planning_profiles?.items ?? []
      activeConfig.value =
        responseData(configResponse).planning_suggestion_config ?? null

      requirements.value = activeConfig.value
        ? responseData(
            await PlanningSuggestionRequirementService.listByConfig(
              activeConfig.value.guid,
            ),
          ).planning_suggestion_requirements?.items ?? []
        : []

      loaded.value = true
    } catch (error: any) {
      errorMessage.value = responseError(
        error,
        'Impossible de vérifier les prérequis de génération.',
      )
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    loaded,
    errorMessage,
    profiles,
    requirements,
    activeConfig,
    readinessItems,
    readinessPercent,
    blockerCount,
    ready,
    load,
  }
}
