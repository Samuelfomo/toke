<template>
  <div class="space-y-6">
    <PlanningPageHeader eyebrow="Centre de contrôle" title="Préparez un planning fiable avant de le générer"
                        description="Cette vue vérifie automatiquement les prérequis, indique les blocages et guide l’utilisateur vers l’action suivante.">
      <template #actions>
        <button
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            :disabled="loading" @click="loadDashboard">
          <IconRefresh :size="16" :class="{ 'animate-spin': loading }"/>
          Actualiser
        </button>
        <button class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm"
                :class="ready ? 'bg-indigo-600 hover:bg-indigo-700' : 'cursor-not-allowed bg-slate-300'"
                :disabled="!ready" @click="goTo('planning-suggestion-list')">
          <IconSparkles :size="16"/>
          Générer un planning
        </button>
      </template>
    </PlanningPageHeader>

    <PlanningInfoPanel v-if="loadError" tone="warning" title="Certaines informations n’ont pas pu être chargées"
                       :description="loadError"
                       important="Actualisez la page, puis vérifiez les routes de configuration si le problème persiste."/>

    <section class="rounded-2xl border p-5"
             :class="ready ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex items-start gap-4">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
               :class="ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
            <IconCircleCheck v-if="ready" :size="23"/>
            <IconAlertTriangle v-else :size="23"/>
          </div>
          <div>
            <p class="text-sm font-bold" :class="ready ? 'text-emerald-950' : 'text-amber-950'">
              {{ ready ? 'Le module est prêt pour la génération' : 'La configuration doit encore être complétée' }}</p>
            <p class="mt-1 max-w-2xl text-xs leading-5" :class="ready ? 'text-emerald-800/80' : 'text-amber-800/80'">{{
                ready ? 'La génération créera un brouillon. Aucun planning ne sera publié sans validation explicite.' : primaryBlocker
              }}</p>
          </div>
        </div>
        <div class="rounded-xl border bg-white/70 px-4 py-3 text-right"
             :class="ready ? 'border-emerald-200' : 'border-amber-200'">
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Préparation</p>
          <p class="mt-0.5 text-xl font-bold text-slate-900">{{ readinessPercent }} %</p>
        </div>
      </div>
    </section>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <PlanningMetricCard label="Profils employés" :value="profileMetric"
                          description="Détermine qui travaille en fixe, en rotation ou reste exclu."
                          :progress="profileProgress" :status-ready="profilesReady" :icon="IconUsersGroup"
                          @open="goTo('planning-suggestion-profiles')"/>
      <PlanningMetricCard label="Besoins actifs"
                          :value="`${requirements.length} règle${requirements.length > 1 ? 's' : ''}`"
                          description="Définit les effectifs à couvrir pour chaque service et chaque jour."
                          :progress="coverageProgress" :status-ready="requirementsReady" :icon="IconTargetArrow"
                          accent="emerald" @open="goTo('planning-suggestion-requirements')"/>
      <PlanningMetricCard label="Configuration moteur"
                          :value="activeConfig ? `Version ${activeConfig.version}` : 'Absente'"
                          description="Centralise les repos, gardes, limites et le solveur utilisé."
                          :progress="activeConfig ? 100 : 0" :status-ready="Boolean(activeConfig)" :icon="IconSettings"
                          accent="violet" @open="goTo('planning-suggestion-configuration')"/>
      <PlanningMetricCard label="Brouillons utiles" :value="`${draftCount} en attente`"
                          description="Plannings générés mais pas encore publiés aux collaborateurs."
                          :progress="managerGuid ? 100 : 0" :status-ready="Boolean(managerGuid)"
                          :icon="IconFileDescription" accent="amber" @open="goTo('planning-suggestion-list')"/>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <ReadinessChecklist :items="readinessItems" @open="goTo"/>
      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex items-start justify-between">
          <div><h2 class="text-sm font-bold text-slate-900">Parcours recommandé</h2>
            <p class="mt-1 text-xs leading-5 text-slate-500">Un ordre simple pour éviter les incohérences.</p></div>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <IconRoute :size="19"/>
          </div>
        </div>
        <div class="mt-5 space-y-1">
          <button v-for="(step,index) in journey" :key="step.routeName"
                  class="group flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-slate-50"
                  @click="goTo(step.routeName)">
            <div
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-bold text-white">
              {{ index + 1 }}
            </div>
            <div class="min-w-0 flex-1"><p class="text-sm font-semibold text-slate-800">{{ step.title }}</p>
              <p class="mt-0.5 text-xs leading-5 text-slate-500">{{ step.description }}</p></div>
            <IconArrowUpRight :size="16" class="mt-1 text-slate-300 group-hover:text-slate-600"/>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
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
  IconUsersGroup
} from '@tabler/icons-vue'
import {useUserStore} from '@/stores/userStore'
import {useTeamStore} from '@/stores/teamStore'
import EmployeePlanningProfileService from '@/service/EmployeePlanningProfileService'
import PlanningSuggestionConfigService from '@/service/PlanningSuggestionConfigService'
import PlanningSuggestionRequirementService from '@/service/PlanningSuggestionRequirementService'
import ScheduleSuggestionService from '@/service/ScheduleSuggestionService'
import PlanningInfoPanel from '../components/PlanningInfoPanel.vue'
import PlanningMetricCard from '../components/PlanningMetricCard.vue'
import PlanningPageHeader from '../components/PlanningPageHeader.vue'
import ReadinessChecklist from '../components/ReadinessChecklist.vue'
import {responseData, responseError} from '../planningSuggestion.helpers'
import type {
  EmployeePlanningProfile,
  PlanningReadinessItem,
  PlanningRequirement,
  PlanningSuggestionConfig,
  ScheduleSuggestionListItem
} from '../planningSuggestion.type'

const router = useRouter(), userStore = useUserStore(), teamStore = useTeamStore()
const loading = ref(false), loadError = ref('')
const profiles = ref<EmployeePlanningProfile[]>([]), requirements = ref<PlanningRequirement[]>([]),
    suggestions = ref<ScheduleSuggestionListItem[]>([]), activeConfig = ref<PlanningSuggestionConfig | null>(null)
const managerGuid = computed(() => userStore.user?.guid ?? '')
const activeEmployees = computed<any[]>(() => ((teamStore as any).employees ?? []).filter((employee: any) => employee.isActive !== false))
const configuredGuids = computed(() => new Set(profiles.value.filter(p => p.active && p.user?.guid).map(p => p.user!.guid)))
const profilesReady = computed(() => activeEmployees.value.length ? activeEmployees.value.every(e => configuredGuids.value.has(e.guid)) : profiles.value.length > 0)
const profileMetric = computed(() => activeEmployees.value.length ? `${configuredGuids.value.size} / ${activeEmployees.value.length}` : `${profiles.value.length} configuré(s)`)
const profileProgress = computed(() => activeEmployees.value.length ? Math.round(configuredGuids.value.size / activeEmployees.value.length * 100) : (profiles.value.length ? 100 : 0))
const coveredDays = computed(() => new Set(requirements.value.filter(r => r.active).map(r => r.day_of_week)))
const requirementsReady = computed(() => coveredDays.value.size === 7),
    coverageProgress = computed(() => Math.round(coveredDays.value.size / 7 * 100)),
    draftCount = computed(() => suggestions.value.filter(s => s.status === 'draft').length)
const readinessItems = computed<PlanningReadinessItem[]>(() => [
  {
    id: 'profiles',
    label: profilesReady.value ? 'Tous les collaborateurs ont un profil' : 'Des profils employés sont manquants',
    description: profilesReady.value ? 'Le moteur sait traiter chaque collaborateur.' : 'Chaque collaborateur actif doit être FIXED, ROTATING ou EXCLUDED.',
    ready: profilesReady.value,
    routeName: 'planning-suggestion-profiles',
    actionLabel: 'Configurer'
  },
  {
    id: 'configuration',
    label: activeConfig.value ? `Configuration « ${activeConfig.value.name} » active` : 'Aucune configuration moteur active',
    description: activeConfig.value ? 'Les règles globales seront appliquées.' : 'Activez les règles de repos, garde, durée et équité.',
    ready: Boolean(activeConfig.value),
    routeName: 'planning-suggestion-configuration',
    actionLabel: 'Activer'
  },
  {
    id: 'requirements',
    label: requirementsReady.value ? 'Les besoins couvrent les 7 jours' : `Couverture définie sur ${coveredDays.value.size} jour(s) sur 7`,
    description: requirementsReady.value ? 'Chaque jour possède au moins un besoin actif.' : 'Les jours sans besoin ne peuvent pas être garantis.',
    ready: requirementsReady.value,
    routeName: 'planning-suggestion-requirements',
    actionLabel: 'Compléter'
  },
  {
    id: 'manager',
    label: managerGuid.value ? 'Responsable identifié' : 'Utilisateur manager non identifié',
    description: managerGuid.value ? 'Les suggestions seront rattachées à votre compte.' : 'La session doit fournir un GUID valide.',
    ready: Boolean(managerGuid.value),
    routeName: 'planning-suggestion-dashboard',
    actionLabel: 'Vérifier'
  },
])
const ready = computed(() => readinessItems.value.every(i => i.ready)),
    readinessPercent = computed(() => Math.round(readinessItems.value.filter(i => i.ready).length / readinessItems.value.length * 100)),
    primaryBlocker = computed(() => readinessItems.value.find(i => !i.ready)?.description ?? '')
const journey = [
  {
    title: 'Configurer les profils employés',
    description: 'Définir le mode de participation de chaque collaborateur.',
    routeName: 'planning-suggestion-profiles'
  },
  {
    title: 'Définir les besoins de couverture',
    description: 'Préciser les services et effectifs attendus par jour.',
    routeName: 'planning-suggestion-requirements'
  },
  {
    title: 'Valider les règles du moteur',
    description: 'Contrôler repos, gardes, limites et solveur.',
    routeName: 'planning-suggestion-configuration'
  },
  {
    title: 'Générer et vérifier une suggestion',
    description: 'Créer un brouillon puis le publier après contrôle.',
    routeName: 'planning-suggestion-list'
  },
]

async function loadDashboard() {
  loading.value = true;
  loadError.value = '';
  try {
    const [pr, cr] = await Promise.all([EmployeePlanningProfileService.list(), PlanningSuggestionConfigService.active()])
    profiles.value = responseData(pr).employee_planning_profiles?.items ?? []
    activeConfig.value = responseData(cr).planning_suggestion_config ?? null
    requirements.value = activeConfig.value ? (responseData(await PlanningSuggestionRequirementService.listByConfig(activeConfig.value.guid)).planning_suggestion_requirements?.items ?? []) : []
    if (managerGuid.value) {
      const sr = await ScheduleSuggestionService.list(managerGuid.value, {status: ['draft', 'approved'], limit: 50})
      const sd = responseData(sr)
      suggestions.value = sd.schedule_suggestions?.items ?? sd.suggestions?.items ?? []
    } else {
      suggestions.value = []
    }
  } catch (error: any) {
    loadError.value = responseError(error, 'Impossible de charger l’état du module.')
  } finally {
    loading.value = false
  }
}

function goTo(routeName: string) {
  router.push({name: routeName})
}

onMounted(loadDashboard)
</script>
