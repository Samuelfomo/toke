<template>
  <div class="space-y-6">
    <PlanningPageHeader
        eyebrow="Étape 3"
        title="Règles du moteur de planification"
        description="Ces paramètres définissent les contraintes obligatoires et les préférences utilisées pour produire un planning acceptable."
    >
      <template #actions>
        <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            :disabled="loading"
            @click="load"
        >
          <IconRefresh
              :size="16"
              :class="{ 'animate-spin': loading }"
          />
          Actualiser
        </button>

        <button
            v-if="config"
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
            @click="showForm = true"
        >
          <IconPencil :size="16" />
          Modifier les règles
        </button>
      </template>
    </PlanningPageHeader>

    <PlanningInfoPanel
        title="Impact des modifications"
        description="Toute nouvelle suggestion utilise la configuration active au moment de sa génération."
        important="Les suggestions déjà générées et les plannings publiés ne sont jamais modifiés rétroactivement."
    />

    <PlanningInfoPanel
        v-if="errorMessage"
        tone="warning"
        title="Chargement impossible"
        :description="errorMessage"
    />

    <div v-if="loading" class="grid gap-4 lg:grid-cols-2">
      <div
          v-for="index in 6"
          :key="index"
          class="h-40 animate-pulse rounded-2xl bg-slate-100"
      />
    </div>

    <div
        v-else-if="!config"
        class="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 px-6 py-14 text-center"
    >
      <IconSettingsOff
          :size="26"
          class="mx-auto text-amber-600"
      />
      <h2 class="mt-4 text-base font-bold text-slate-900">
        Aucune configuration active
      </h2>
      <p class="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-600">
        La génération reste bloquée tant que les règles de congé,
        de garde, de charge et de résolution ne sont pas définies.
      </p>
      <button
          type="button"
          class="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
          @click="showForm = true"
      >
        <IconPlus :size="16" />
        Créer une configuration
      </button>
    </div>

    <template v-else>
      <section class="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <div class="flex flex-col gap-4 bg-emerald-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <IconCircleCheck :size="21" />
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-sm font-bold text-emerald-950">
                  {{ config.name }}
                </h2>
                <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                                    Active
                                </span>
              </div>
              <p class="mt-1 text-xs text-emerald-800/70">
                Version {{ config.version }} · moteur
                {{ config.solver.type }}
              </p>
            </div>
          </div>

          <div class="rounded-xl border border-emerald-200 bg-white/70 px-4 py-3">
            <p class="text-[9px] font-bold uppercase text-emerald-500">
              Solveur
            </p>
            <p class="mt-1 text-sm font-bold text-slate-900">
              {{ config.solver.type }}
            </p>
            <p class="text-[10px] text-slate-500">
              Timeout {{ config.solver.timeout_seconds }} s
            </p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-rose-100 bg-rose-50/30 p-5 shadow-sm">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <IconCalendarPause :size="20" />
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-500">
                Politique de congé
              </p>
              <h2 class="mt-1 text-base font-bold text-slate-900">
                {{ weeklyLeaveTitle }}
              </h2>
              <p class="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
                {{ weeklyLeaveDescription }}
              </p>
            </div>
          </div>

          <div class="rounded-xl border border-rose-100 bg-white px-4 py-3 lg:text-right">
            <p class="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Valeur principale
            </p>
            <p class="mt-1 text-sm font-bold text-slate-900">
              {{ weeklyLeaveValue }}
            </p>
          </div>
        </div>

        <div
            v-if="policy.mode === 'TEAM_ROTATION'"
            class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <ConfigValue
              label="Jours autorisés"
              :value="allowedDaysLabel"
              help="Le congé ne peut être placé que sur ces jours."
          />
          <ConfigValue
              label="Début du cycle"
              :value="formatDate(policy.rotation_anchor_date)"
              help="Détermine le premier bénéficiaire de la rotation."
          />
          <ConfigValue
              label="Semaines partielles"
              :value="policy.complete_weeks_only ? 'Ignorées' : 'Incluses'"
              help="Indique si une semaine incomplète doit recevoir un congé."
          />
          <ConfigValue
              label="Repos post-garde"
              :value="policy.post_guard_rest_counts_as_leave
                            ? 'Compte comme congé'
                            : 'Reste distinct'"
              help="Sépare ou fusionne récupération et congé tournant."
          />
        </div>
      </section>

      <div class="grid gap-4 lg:grid-cols-2">
        <PlanningRuleCard
            title="Jours consécutifs maximum"
            :value="config.rules.max_consecutive_work_days === null
                        ? 'Règle désactivée'
                        : `${config.rules.max_consecutive_work_days} jour(s)`"
            :description="config.rules.max_consecutive_work_days === null
                        ? 'Les collaborateurs non sélectionnés pour le congé peuvent travailler 7 jours sur 7.'
                        : 'Empêche une séquence de travail de dépasser la limite configurée.'"
            :example="config.rules.max_consecutive_work_days === null
                        ? 'Aucune journée de repos supplémentaire n’est imposée par cette règle.'
                        : `À ${config.rules.max_consecutive_work_days}, une séquence plus longue est interdite.`"
            :icon="IconCalendarStats"
            :accent="config.rules.max_consecutive_work_days === null
                        ? 'amber'
                        : 'indigo'"
        />

        <PlanningRuleCard
            title="Récupération après garde"
            :value="config.rules.rest_after_guard_required
                        ? `${config.rules.post_guard_rest_days} jour(s)`
                        : 'Désactivée'"
            description="Bloque les journées complètes après la fin de garde."
            example="Garde lundi, fin mardi, repos mercredi avec une valeur de 1."
            :icon="IconMoonStars"
            accent="violet"
        />

        <PlanningRuleCard
            title="Gardes consécutives maximum"
            :value="String(config.rules.max_consecutive_guards)"
            description="Limite les débuts de garde successifs."
            example="À 1, deux gardes commencées deux jours consécutifs sont interdites."
            :icon="IconShieldStar"
            accent="amber"
        />

        <PlanningRuleCard
            title="Repos entre deux services"
            :value="formatMinutes(config.rules.min_rest_minutes_between_shifts)"
            description="Temps minimum entre la fin d’un service et le prochain."
            example="660 minutes correspondent à 11 heures."
            :icon="IconClockPause"
        />

        <PlanningRuleCard
            title="Limite hebdomadaire générale"
            :value="formatMinutes(config.rules.max_weekly_minutes)"
            description="Plafond utilisé lorsqu’un profil n’a pas sa propre limite."
            example="Une limite individuelle reste prioritaire."
            :icon="IconClockHour4"
            accent="emerald"
        />

        <PlanningRuleCard
            title="Couverture des besoins"
            :value="config.rules.strict_coverage
                        ? 'Couverture stricte'
                        : 'Couverture souple'"
            :description="config.rules.strict_coverage
                        ? 'Les minimums deviennent des contraintes obligatoires.'
                        : 'Le moteur peut retourner une suggestion incomplète avec des alertes.'"
            example="Les besoins EXACT restent toujours contraignants."
            :icon="IconTargetArrow"
            accent="indigo"
        />
      </div>

      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 class="text-sm font-bold text-slate-900">
          Paramètres techniques et qualité
        </h2>
        <p class="mt-1 text-xs leading-5 text-slate-500">
          Ces options déterminent l’historique d’équité et le comportement du solveur.
        </p>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ConfigValue
              label="Fenêtre d’équité"
              :value="`${config.rules.fairness_window_weeks} semaine(s)`"
              help="Historique utilisé pour équilibrer les charges."
          />
          <ConfigValue
              label="Fallback Greedy"
              :value="config.solver.fallback_to_greedy
                            ? 'Autorisé'
                            : 'Désactivé'"
              help="TEAM_ROTATION exige sa désactivation."
          />
          <ConfigValue
              label="Repos simultanés"
              :value="config.rules.max_resting_employees_per_day ?? 'Non limité'"
              help="Maximum de collaborateurs non travaillés le même jour."
          />
          <ConfigValue
              label="Mode de congé"
              :value="WEEKLY_LEAVE_MODE_LABELS[policy.mode]"
              help="Politique utilisée par les prochaines générations."
          />
        </div>
      </section>
    </template>

    <PlanningConfigForm
        :open="showForm"
        :config="config"
        @close="showForm = false"
        @saved="onConfigSaved"
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
  IconCalendarPause,
  IconCalendarStats,
  IconCircleCheck,
  IconClockHour4,
  IconClockPause,
  IconMoonStars,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSettingsOff,
  IconShieldStar,
  IconTargetArrow,
} from '@tabler/icons-vue'

import PlanningSuggestionConfigService from '@/service/PlanningSuggestionConfigService'

import PlanningInfoPanel from '../components/PlanningInfoPanel.vue'
import PlanningPageHeader from '../components/PlanningPageHeader.vue'
import PlanningRuleCard from '../components/PlanningRuleCard.vue'
import PlanningConfigForm from './PlanningConfigForm.vue'
import {
  DAY_LABELS,
  formatDate,
  formatMinutes,
  responseData,
  responseError,
} from '../planningSuggestion.helpers'
import {
  DEFAULT_WEEKLY_LEAVE_DAYS,
  WEEKLY_LEAVE_MODE_LABELS,
} from '../teamWeeklyLeave.helpers'
import type {
  PlanningSuggestionConfig,
  WeeklyLeavePolicy,
} from '../planningSuggestion.type'

const loading = ref(false)
const errorMessage = ref('')
const config = ref<PlanningSuggestionConfig | null>(null)
const showForm = ref(false)

const policy = computed<WeeklyLeavePolicy>(() =>
        config.value?.rules.weekly_leave_policy ?? {
          mode: 'PER_EMPLOYEE',
          employees_per_week: 1,
          allowed_days: DEFAULT_WEEKLY_LEAVE_DAYS,
          rotation_anchor_date: null,
          complete_weeks_only: true,
          post_guard_rest_counts_as_leave: false,
        },
)

const weeklyLeaveTitle = computed(() => {
  if (policy.value.mode === 'TEAM_ROTATION') {
    return 'Congé hebdomadaire tournant'
  }

  if (policy.value.mode === 'PER_EMPLOYEE') {
    return 'Repos minimum par collaborateur'
  }

  return 'Aucun congé hebdomadaire automatique'
})

const weeklyLeaveValue = computed(() => {
  if (!config.value) return '—'

  if (policy.value.mode === 'TEAM_ROTATION') {
    return `${policy.value.employees_per_week} collaborateur(s) par semaine`
  }

  if (policy.value.mode === 'PER_EMPLOYEE') {
    return `${config.value.rules.min_rest_days_per_week} jour(s) par collaborateur`
  }

  return 'Désactivé'
})

const weeklyLeaveDescription = computed(() => {
  if (policy.value.mode === 'TEAM_ROTATION') {
    return 'Le congé est accordé au niveau de l’équipe selon l’ordre de rotation renseigné dans les profils employés.'
  }

  if (policy.value.mode === 'PER_EMPLOYEE') {
    return 'Chaque collaborateur inclus reçoit individuellement le nombre de jours de repos indiqué sur une semaine complète.'
  }

  return 'Le moteur ne force aucun congé hebdomadaire. Les jours non travaillés peuvent toutefois provenir des templates ou des gardes.'
})

const allowedDaysLabel = computed(() =>
    policy.value.allowed_days
        .map((day) => DAY_LABELS[day])
        .join(', '),
)

async function load(): Promise<void> {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await PlanningSuggestionConfigService.active()
    config.value =
        responseData(response).planning_suggestion_config ?? null
  } catch (error: any) {
    errorMessage.value = responseError(
        error,
        'Impossible de charger la configuration.',
    )
  } finally {
    loading.value = false
  }
}

function onConfigSaved(value: PlanningSuggestionConfig): void {
  config.value = value
  showForm.value = false
}

const ConfigValue = defineComponent({
  props: {
    label: {
      type: String,
      required: true,
    },
    value: {
      type: [String, Number],
      required: true,
    },
    help: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    return () =>
        h(
            'div',
            {
              class: 'rounded-xl bg-white/80 px-4 py-3',
            },
            [
              h(
                  'p',
                  {
                    class: 'text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400',
                  },
                  props.label,
              ),
              h(
                  'p',
                  {
                    class: 'mt-1 text-sm font-bold text-slate-800',
                  },
                  String(props.value),
              ),
              h(
                  'p',
                  {
                    class: 'mt-1 text-[10px] leading-4 text-slate-500',
                  },
                  props.help,
              ),
            ],
        )
  },
})

onMounted(load)
</script>