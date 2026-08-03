<template>
  <PlanningDrawer
      :open="open"
      eyebrow="Configuration moteur"
      :title="isEdit ? 'Modifier les règles actives' : 'Créer une configuration'"
      description="Les règles saisies ici deviennent la source de vérité du moteur pour les futures générations."
      @close="$emit('close')"
  >
    <div class="space-y-7">
      <section class="space-y-4">
        <div>
          <label class="text-xs font-bold text-slate-700">
            Nom de la configuration
            <span class="text-red-500">*</span>
          </label>
          <input
              v-model="form.name"
              type="text"
              class="field-control mt-2"
              placeholder="Ex. Pharmacie du Plateau — règles 2026"
              :class="{ 'field-control-error': errors.name }"
          />
          <p v-if="errors.name" class="field-error-text">
            {{ errors.name }}
          </p>
        </div>

        <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p class="text-xs font-bold text-slate-800">
              Configuration active
            </p>
            <p class="mt-1 text-[11px] leading-4 text-slate-500">
              Une seule configuration peut être active. Les nouvelles suggestions utiliseront cette version.
            </p>
          </div>
          <PlanningToggle v-model="form.active" />
        </div>
      </section>

      <section class="rounded-2xl border border-rose-100 bg-rose-50/30 p-4">
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <IconCalendarPause :size="19" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">
              Politique de congé hebdomadaire
            </h3>
            <p class="mt-1 text-[11px] leading-4 text-slate-500">
              Choisissez si le congé est individuel, tournant au niveau de l’équipe ou non géré automatiquement.
            </p>
          </div>
        </div>

        <div class="mt-4 grid gap-3">
          <button
              v-for="policy in policyOptions"
              :key="policy.value"
              type="button"
              class="rounded-xl border p-4 text-left transition"
              :class="form.weekly_leave_mode === policy.value
                            ? policy.activeClass
                            : 'border-slate-200 bg-white hover:border-slate-300'"
              @click="selectPolicy(policy.value)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold text-slate-900">
                  {{ policy.label }}
                </p>
                <p class="mt-1 text-[10px] leading-4 text-slate-500">
                  {{ policy.description }}
                </p>
              </div>
              <IconCircleCheck
                  v-if="form.weekly_leave_mode === policy.value"
                  :size="17"
                  class="shrink-0"
              />
            </div>
          </button>
        </div>

        <div
            v-if="isPerEmployee"
            class="mt-4 rounded-xl border border-emerald-100 bg-white p-4"
        >
          <NumberField
              v-model="form.min_rest_days_per_week"
              label="Repos minimum par collaborateur"
              help="Chaque collaborateur inclus reçoit individuellement ce nombre de journées sans activité sur une semaine complète."
              suffix="jour(s)"
              :min="0"
              :max="7"
          />
        </div>

        <div
            v-else-if="isTeamRotation"
            class="mt-4 space-y-5 rounded-xl border border-rose-100 bg-white p-4"
        >
          <div class="rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3">
            <p class="text-xs font-bold text-rose-900">
              Congé tournant au niveau de l’équipe
            </p>
            <p class="mt-1 text-[11px] leading-5 text-rose-800/80">
              Le moteur sélectionne les bénéficiaires selon l’ordre de rotation des profils. Les autres collaborateurs peuvent travailler toute la semaine si aucune autre règle ne l’interdit.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <NumberField
                v-model="form.weekly_leave_employees_per_week"
                label="Bénéficiaires par semaine"
                help="Nombre exact de collaborateurs qui reçoivent le congé hebdomadaire sur chaque semaine complète."
                suffix="employé(s)"
                :min="1"
                :max="1000"
                :error="errors.weekly_leave_employees_per_week"
            />

            <div>
              <label class="text-xs font-bold text-slate-700">
                Date de démarrage du cycle
                <span class="text-red-500">*</span>
              </label>
              <input
                  v-model="form.weekly_leave_rotation_anchor_date"
                  type="date"
                  class="field-control mt-2"
                  :class="{
                                    'field-control-error': errors.weekly_leave_rotation_anchor_date,
                                }"
              />
              <p class="field-help">
                Cette date détermine la première semaine et le premier ordre de rotation.
              </p>
              <p
                  v-if="errors.weekly_leave_rotation_anchor_date"
                  class="field-error-text"
              >
                {{ errors.weekly_leave_rotation_anchor_date }}
              </p>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between gap-3">
              <div>
                <label class="text-xs font-bold text-slate-700">
                  Jours autorisés pour le congé
                </label>
                <p class="mt-1 text-[11px] text-slate-500">
                  Le moteur choisira uniquement parmi les jours sélectionnés.
                </p>
              </div>
              <button
                  type="button"
                  class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  @click="applyPlateauDays"
              >
                Mercredi à dimanche
              </button>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label
                  v-for="day in DAY_ORDER"
                  :key="day"
                  class="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition"
                  :class="form.weekly_leave_allowed_days.includes(day)
                                    ? 'border-rose-300 bg-rose-50 text-rose-800'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'"
              >
                <input
                    type="checkbox"
                    class="sr-only"
                    :checked="form.weekly_leave_allowed_days.includes(day)"
                    @change="toggleAllowedDay(day)"
                />
                <span
                    class="flex h-5 w-5 items-center justify-center rounded-md border"
                    :class="form.weekly_leave_allowed_days.includes(day)
                                        ? 'border-rose-500 bg-rose-500 text-white'
                                        : 'border-slate-300 bg-white'"
                >
                                    <IconCheck
                                        v-if="form.weekly_leave_allowed_days.includes(day)"
                                        :size="13"
                                    />
                                </span>
                {{ DAY_LABELS[day] }}
              </label>
            </div>

            <p
                v-if="errors.weekly_leave_allowed_days"
                class="field-error-text mt-2"
            >
              {{ errors.weekly_leave_allowed_days }}
            </p>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  Appliquer uniquement aux semaines complètes
                </p>
                <p class="mt-1 text-[11px] leading-4 text-slate-500">
                  Une période commençant ou terminant au milieu d’une semaine ne force pas un congé supplémentaire.
                </p>
              </div>
              <PlanningToggle
                  v-model="form.weekly_leave_complete_weeks_only"
              />
            </div>

            <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  Le repos post-garde compte comme congé
                </p>
                <p class="mt-1 text-[11px] leading-4 text-slate-500">
                  Désactivé : le congé tournant reste distinct de la récupération obligatoire après garde.
                </p>
              </div>
              <PlanningToggle
                  v-model="form.post_guard_rest_counts_as_weekly_leave"
              />
            </div>
          </div>
        </div>

        <div
            v-else
            class="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
        >
          <p class="text-xs font-bold text-slate-800">
            Aucune attribution automatique
          </p>
          <p class="mt-1 text-[11px] leading-5 text-slate-500">
            Le moteur n’impose aucun congé hebdomadaire. Les repos peuvent toutefois provenir des templates, des gardes ou d’autres contraintes.
          </p>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 p-4">
        <div class="flex items-center gap-2">
          <IconBeach :size="18" class="text-emerald-600" />
          <h3 class="text-sm font-bold text-slate-900">
            Charge et séquences de travail
          </h3>
        </div>

        <div class="mt-4 space-y-4">
          <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p class="text-xs font-bold text-slate-800">
                Limiter les jours consécutifs
              </p>
              <p class="mt-1 text-[11px] leading-4 text-slate-500">
                Désactivez cette règle lorsqu’un collaborateur peut travailler sept jours sur sept.
              </p>
            </div>
            <PlanningToggle v-model="maxConsecutiveEnabled" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <NumberField
                v-if="maxConsecutiveEnabled"
                v-model="maxConsecutiveDays"
                label="Jours consécutifs maximum"
                help="Nombre maximal de journées travaillées dans une même séquence."
                suffix="jour(s)"
                :min="1"
                :max="366"
                :error="errors.max_consecutive_work_days"
            />

            <div
                v-else
                class="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3"
            >
              <p class="text-xs font-bold text-amber-900">
                Règle désactivée
              </p>
              <p class="mt-1 text-[11px] leading-5 text-amber-800/80">
                Les collaborateurs non sélectionnés pour un congé peuvent travailler sept jours sur sept.
              </p>
            </div>

            <NumberField
                v-model="minRestHours"
                label="Repos minimum entre deux services"
                help="Exemple : 11 heures correspondent à 660 minutes."
                suffix="heures"
                :min="0"
                :max="48"
                :step="0.5"
            />

            <NumberField
                v-model="maxWeeklyHours"
                label="Limite hebdomadaire générale"
                help="Laissez vide pour ne pas fixer de plafond global."
                suffix="heures"
                :min="0.5"
                :max="168"
                :step="0.5"
                optional
            />

            <NumberField
                v-model="maxRestingInput"
                label="Repos simultanés maximum"
                help="Cette limite concerne les journées non travaillées et doit rester compatible avec les repos post-garde."
                suffix="employé(s)"
                :min="1"
                optional
            />

            <NumberField
                v-model="form.fairness_window_weeks"
                label="Fenêtre historique d’équité"
                help="Période passée utilisée pour équilibrer les charges et gardes."
                suffix="semaine(s)"
                :min="1"
                :max="52"
            />
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
        <div class="flex items-center gap-2">
          <IconMoonStars :size="18" class="text-violet-600" />
          <h3 class="text-sm font-bold text-slate-900">
            Gardes et récupération
          </h3>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <button
              type="button"
              class="rounded-xl border p-4 text-left transition"
              :class="form.guard_team_mode === 'DAILY_FLEXIBLE'
                            ? 'border-violet-300 bg-violet-50 ring-2 ring-violet-100'
                            : 'border-slate-200 bg-white hover:border-slate-300'"
              @click="selectGuardTeamMode('DAILY_FLEXIBLE')"
          >
            <p class="text-xs font-bold text-slate-900">
              Affectation quotidienne flexible
            </p>
            <p class="mt-1 text-[10px] leading-4 text-slate-500">
              Le moteur peut choisir des collaborateurs différents pour chaque début de garde.
            </p>
          </button>

          <button
              type="button"
              class="rounded-xl border p-4 text-left transition"
              :class="form.guard_team_mode === 'WEEKLY_POOL'
                            ? 'border-violet-300 bg-violet-50 ring-2 ring-violet-100'
                            : 'border-slate-200 bg-white hover:border-slate-300'"
              @click="selectGuardTeamMode('WEEKLY_POOL')"
          >
            <p class="text-xs font-bold text-slate-900">
              Pool hebdomadaire de garde
            </p>
            <p class="mt-1 text-[10px] leading-4 text-slate-500">
              Seuls les collaborateurs sélectionnés pour la semaine peuvent commencer une garde.
            </p>
          </button>
        </div>

        <div
            v-if="isWeeklyGuardPool"
            class="mt-4 space-y-4 rounded-xl border border-violet-100 bg-white p-4"
        >
          <div class="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3">
            <p class="text-xs font-bold text-violet-900">
              Équipe stable pendant la semaine
            </p>
            <p class="mt-1 text-[11px] leading-5 text-violet-800/80">
              Le pool définit les personnes autorisées à prendre les gardes. Le besoin de couverture continue de définir combien de personnes commencent réellement la garde chaque jour.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <NumberField
                v-model="form.guard_team_employees_per_week"
                label="Collaborateurs de garde par semaine"
                help="Nombre exact d’employés ROTATING appartenant au pool hebdomadaire."
                suffix="employé(s)"
                :min="1"
                :max="1000"
                :error="errors.guard_team_employees_per_week"
            />

            <div v-if="form.guard_team_selection_mode === 'ROTATION_ORDER'">
              <label class="text-xs font-bold text-slate-700">
                Date de démarrage de la rotation
                <span class="text-red-500">*</span>
              </label>
              <input
                  v-model="form.guard_team_rotation_anchor_date"
                  type="date"
                  class="field-control mt-2"
                  :class="{
                    'field-control-error': errors.guard_team_rotation_anchor_date,
                  }"
              />
              <p class="field-help">
                Définit la première semaine du cycle des équipes de garde.
              </p>
              <p
                  v-if="errors.guard_team_rotation_anchor_date"
                  class="field-error-text"
              >
                {{ errors.guard_team_rotation_anchor_date }}
              </p>
            </div>
          </div>

          <div>
            <p class="text-xs font-bold text-slate-700">
              Méthode de sélection du pool
            </p>
            <div class="mt-2 grid gap-2 sm:grid-cols-2">
              <button
                  type="button"
                  class="rounded-xl border px-4 py-3 text-left"
                  :class="form.guard_team_selection_mode === 'ROTATION_ORDER'
                                ? 'border-violet-300 bg-violet-50'
                                : 'border-slate-200 bg-white'"
                  @click="form.guard_team_selection_mode = 'ROTATION_ORDER'"
              >
                <p class="text-xs font-bold text-slate-800">Ordre de rotation</p>
                <p class="mt-1 text-[10px] leading-4 text-slate-500">
                  Sélection déterministe à partir des rotation_order des profils ROTATING.
                </p>
              </button>

              <button
                  type="button"
                  class="rounded-xl border px-4 py-3 text-left"
                  :class="form.guard_team_selection_mode === 'OPTIMIZED'
                                ? 'border-violet-300 bg-violet-50'
                                : 'border-slate-200 bg-white'"
                  @click="form.guard_team_selection_mode = 'OPTIMIZED'"
              >
                <p class="text-xs font-bold text-slate-800">Choix optimisé</p>
                <p class="mt-1 text-[10px] leading-4 text-slate-500">
                  OR-Tools choisit le pool en équilibrant les gardes et l’historique disponible.
                </p>
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  Semaines complètes uniquement
                </p>
                <p class="mt-1 text-[11px] leading-4 text-slate-500">
                  Une période partielle conserve l’affectation quotidienne flexible.
                </p>
              </div>
              <PlanningToggle v-model="form.guard_team_complete_weeks_only" />
            </div>

            <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  Participation obligatoire
                </p>
                <p class="mt-1 text-[11px] leading-4 text-slate-500">
                  Chaque membre sélectionné doit commencer au moins une garde pendant la semaine.
                </p>
              </div>
              <PlanningToggle v-model="form.guard_team_require_participation" />
            </div>
          </div>

          <div
              v-if="Number(form.post_guard_rest_days) > 0"
              class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
          >
            <p class="text-xs font-bold text-amber-900">
              Vérifiez la capacité du pool
            </p>
            <p class="mt-1 text-[11px] leading-5 text-amber-800/80">
              Un repos complet ajouté après la continuation réduit fortement le nombre de gardes possibles. Le moteur refusera une configuration mathématiquement insuffisante.
            </p>
          </div>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField
              v-model="form.max_consecutive_guards"
              label="Gardes consécutives maximum"
              help="Nombre maximal de débuts de garde successifs."
              suffix="garde(s)"
              :min="0"
              :max="31"
          />

          <NumberField
              v-model="form.post_guard_rest_days"
              label="Repos complet après garde"
              help="Jours calendaires complets ajoutés après la journée de continuation. Mettre 0 lorsque la récupération se fait le jour même après 08h."
              suffix="jour(s)"
              :min="0"
              :max="31"
              :disabled="!form.rest_after_guard_required"
          />
        </div>

        <div class="mt-4 flex items-center justify-between rounded-xl border border-violet-100 bg-white p-4">
          <div>
            <p class="text-xs font-bold text-slate-800">
              Repos après garde obligatoire
            </p>
            <p class="mt-1 text-[11px] text-slate-500">
              Lorsque cette règle est active, le moteur bloque les jours de récupération.
            </p>
          </div>
          <PlanningToggle v-model="form.rest_after_guard_required" />
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 p-4">
        <div class="flex items-center gap-2">
          <IconCpu2 :size="18" class="text-indigo-600" />
          <h3 class="text-sm font-bold text-slate-900">
            Solveur et niveau d’exigence
          </h3>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <button
              type="button"
              class="rounded-xl border p-4 text-left"
              :class="form.solver_type === 'ORTOOLS'
                            ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100'
                            : 'border-slate-200'"
              @click="form.solver_type = 'ORTOOLS'"
          >
            <p class="text-xs font-bold text-slate-800">
              OR-Tools CP-SAT
            </p>
            <p class="mt-1 text-[10px] leading-4 text-slate-500">
              Résout globalement les contraintes et garantit la rotation d’équipe.
            </p>
          </button>

          <button
              type="button"
              class="rounded-xl border p-4 text-left"
              :class="[
                            form.solver_type === 'GREEDY'
                                ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-100'
                                : 'border-slate-200',
                            requiresOrTools ? 'cursor-not-allowed opacity-50' : '',
                        ]"
              :disabled="requiresOrTools"
              @click="form.solver_type = 'GREEDY'"
          >
            <p class="text-xs font-bold text-slate-800">
              Greedy
            </p>
            <p class="mt-1 text-[10px] leading-4 text-slate-500">
              Algorithme simplifié, incompatible avec le congé tournant strict.
            </p>
          </button>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField
              v-model="form.solver_timeout_seconds"
              label="Temps maximum de résolution"
              help="Le moteur retourne la meilleure solution trouvée avant cette limite."
              suffix="secondes"
              :min="1"
              :max="300"
          />

          <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p class="text-xs font-bold text-slate-800">
                Fallback Greedy
              </p>
              <p class="mt-1 text-[11px] leading-4 text-slate-500">
                Obligatoirement désactivé pour le congé tournant ou le pool hebdomadaire de garde.
              </p>
            </div>
            <PlanningToggle
                v-model="form.fallback_to_greedy"
                :disabled="form.solver_type === 'GREEDY' || requiresOrTools"
            />
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p class="text-xs font-bold text-slate-800">
              Couverture stricte
            </p>
            <p class="mt-1 text-[11px] leading-4 text-slate-500">
              Les minimums configurés deviennent des contraintes obligatoires.
            </p>
          </div>
          <PlanningToggle v-model="form.strict_coverage" />
        </div>
      </section>

      <div
          v-if="globalError"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
      >
        {{ globalError }}
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-3">
        <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            :disabled="saving"
            @click="$emit('close')"
        >
          Annuler
        </button>

        <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
            :disabled="saving"
            @click="save"
        >
          <IconLoader2
              v-if="saving"
              :size="15"
              class="animate-spin"
          />
          <IconCheck v-else :size="15" />
          {{ saving
            ? 'Enregistrement…'
            : isEdit
                ? 'Enregistrer'
                : 'Créer la configuration' }}
        </button>
      </div>
    </template>
  </PlanningDrawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  IconBeach,
  IconCalendarPause,
  IconCheck,
  IconCircleCheck,
  IconCpu2,
  IconLoader2,
  IconMoonStars,
} from '@tabler/icons-vue'

import { useUserStore } from '@/stores/userStore'
import PlanningSuggestionConfigService from '@/service/PlanningSuggestionConfigService'

import PlanningDrawer from '../components/PlanningDrawer.vue'
import PlanningToggle from '../components/PlanningToggle.vue'
import NumberField from '../components/NumberField.vue'
import {
  DAY_LABELS,
  DAY_ORDER,
  responseError,
} from '../planningSuggestion.helpers'
import {
  DEFAULT_WEEKLY_LEAVE_DAYS,
  PLATEAU_WEEKLY_LEAVE_DAYS,
} from '../teamWeeklyLeave.helpers'
import type {
  GuardTeamMode,
  GuardTeamSelectionMode,
  PlanningDayKey,
  PlanningSolverType,
  PlanningSuggestionConfig,
  PlanningSuggestionConfigPayload,
  WeeklyLeaveMode,
} from '../planningSuggestion.type'

const props = withDefaults(
    defineProps<{
      open: boolean
      config?: PlanningSuggestionConfig | null
    }>(),
    {
      config: null,
    },
)

const emit = defineEmits<{
  close: []
  saved: [config: PlanningSuggestionConfig]
}>()

const userStore = useUserStore()
const saving = ref(false)
const globalError = ref('')
const errors = reactive<Record<string, string>>({})

const minRestHours = ref<number | string>(11)
const maxWeeklyHours = ref<number | string>('')
const maxRestingInput = ref<number | string>('')
const maxConsecutiveEnabled = ref(true)
const maxConsecutiveDays = ref<number | string>(6)

const form = reactive({
  name: '',
  active: false,

  weekly_leave_mode: 'PER_EMPLOYEE' as WeeklyLeaveMode,
  weekly_leave_employees_per_week: 1,
  weekly_leave_allowed_days: [
    ...DEFAULT_WEEKLY_LEAVE_DAYS,
  ] as PlanningDayKey[],
  weekly_leave_rotation_anchor_date: '',
  weekly_leave_complete_weeks_only: true,
  post_guard_rest_counts_as_weekly_leave: false,

  guard_team_mode: 'DAILY_FLEXIBLE' as GuardTeamMode,
  guard_team_employees_per_week: 1,
  guard_team_selection_mode: 'ROTATION_ORDER' as GuardTeamSelectionMode,
  guard_team_rotation_anchor_date: '',
  guard_team_complete_weeks_only: true,
  guard_team_require_participation: true,

  min_rest_days_per_week: 1,
  max_consecutive_guards: 1,
  rest_after_guard_required: true,
  post_guard_rest_days: 0,
  fairness_window_weeks: 8,
  strict_coverage: true,
  solver_type: 'ORTOOLS' as PlanningSolverType,
  solver_timeout_seconds: 30,
  fallback_to_greedy: false,
})

const isEdit = computed(() => Boolean(props.config?.guid))
const isTeamRotation = computed(
    () => form.weekly_leave_mode === 'TEAM_ROTATION',
)
const isPerEmployee = computed(
    () => form.weekly_leave_mode === 'PER_EMPLOYEE',
)
const isWeeklyGuardPool = computed(
    () => form.guard_team_mode === 'WEEKLY_POOL',
)
const requiresOrTools = computed(
    () => isTeamRotation.value || isWeeklyGuardPool.value,
)

const policyOptions = [
  {
    value: 'NONE' as const,
    label: 'Aucune règle automatique',
    description:
        'Le moteur n’attribue aucun congé hebdomadaire de sa propre initiative.',
    activeClass:
        'border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-100',
  },
  {
    value: 'PER_EMPLOYEE' as const,
    label: 'Repos minimum par collaborateur',
    description:
        'Chaque collaborateur reçoit individuellement un minimum de jours non travaillés.',
    activeClass:
        'border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100',
  },
  {
    value: 'TEAM_ROTATION' as const,
    label: 'Congé tournant au niveau de l’équipe',
    description:
        'Un nombre défini de collaborateurs reçoit le congé selon leur ordre de rotation.',
    activeClass:
        'border-rose-300 bg-rose-50 text-rose-800 ring-2 ring-rose-100',
  },
]

watch(
    () => props.open,
    (open) => {
      if (open) reset()
    },
)

watch(
    () => form.solver_type,
    (solver) => {
      if (solver === 'GREEDY') {
        form.fallback_to_greedy = false
      }
    },
)

function reset(): void {
  Object.keys(errors).forEach((key) => delete errors[key])
  globalError.value = ''

  const config = props.config
  const policy = config?.rules.weekly_leave_policy ?? {
    mode: 'PER_EMPLOYEE' as WeeklyLeaveMode,
    employees_per_week: 1,
    allowed_days: DEFAULT_WEEKLY_LEAVE_DAYS,
    rotation_anchor_date: null,
    complete_weeks_only: true,
    post_guard_rest_counts_as_leave: false,
  }

  form.name = config?.name ?? ''
  form.active = config?.active ?? false

  form.weekly_leave_mode = policy.mode
  form.weekly_leave_employees_per_week = policy.employees_per_week
  form.weekly_leave_allowed_days = [...policy.allowed_days]
  form.weekly_leave_rotation_anchor_date =
      policy.rotation_anchor_date ?? ''
  form.weekly_leave_complete_weeks_only = policy.complete_weeks_only
  form.post_guard_rest_counts_as_weekly_leave =
      policy.post_guard_rest_counts_as_leave

  const guardPolicy = config?.rules.guard_team_policy ?? {
    mode: 'DAILY_FLEXIBLE' as GuardTeamMode,
    employees_per_week: 1,
    selection_mode: 'ROTATION_ORDER' as GuardTeamSelectionMode,
    rotation_anchor_date: null,
    complete_weeks_only: true,
    require_participation: true,
  }

  form.guard_team_mode = guardPolicy.mode
  form.guard_team_employees_per_week = guardPolicy.employees_per_week
  form.guard_team_selection_mode = guardPolicy.selection_mode
  form.guard_team_rotation_anchor_date =
      guardPolicy.rotation_anchor_date ?? ''
  form.guard_team_complete_weeks_only =
      guardPolicy.complete_weeks_only
  form.guard_team_require_participation =
      guardPolicy.require_participation

  form.min_rest_days_per_week =
      config?.rules.min_rest_days_per_week ?? 1

  const maximumConsecutive =
      config?.rules.max_consecutive_work_days === undefined
          ? 6
          : config.rules.max_consecutive_work_days

  maxConsecutiveEnabled.value = maximumConsecutive !== null
  maxConsecutiveDays.value = maximumConsecutive ?? 6

  minRestHours.value =
      (config?.rules.min_rest_minutes_between_shifts ?? 660) / 60
  maxWeeklyHours.value = config?.rules.max_weekly_minutes
      ? config.rules.max_weekly_minutes / 60
      : ''
  maxRestingInput.value =
      config?.rules.max_resting_employees_per_day ?? ''

  form.max_consecutive_guards =
      config?.rules.max_consecutive_guards ?? 1
  form.rest_after_guard_required =
      config?.rules.rest_after_guard_required ?? true
  form.post_guard_rest_days =
      config?.rules.post_guard_rest_days ?? 0
  form.fairness_window_weeks =
      config?.rules.fairness_window_weeks ?? 8
  form.strict_coverage = config?.rules.strict_coverage ?? true

  form.solver_type = config?.solver.type ?? 'ORTOOLS'
  form.solver_timeout_seconds =
      config?.solver.timeout_seconds ?? 30
  form.fallback_to_greedy =
      config?.solver.fallback_to_greedy ?? false
}

function selectPolicy(mode: WeeklyLeaveMode): void {
  form.weekly_leave_mode = mode

  if (mode === 'TEAM_ROTATION') {
    form.min_rest_days_per_week = 0
    form.solver_type = 'ORTOOLS'
    form.fallback_to_greedy = false
    maxConsecutiveEnabled.value = false

    if (form.weekly_leave_allowed_days.length === 0) {
      form.weekly_leave_allowed_days = [
        ...PLATEAU_WEEKLY_LEAVE_DAYS,
      ]
    }
  }

  if (mode === 'NONE') {
    form.min_rest_days_per_week = 0
  }
}

function selectGuardTeamMode(mode: GuardTeamMode): void {
  form.guard_team_mode = mode

  if (mode === 'WEEKLY_POOL') {
    form.solver_type = 'ORTOOLS'
    form.fallback_to_greedy = false
  }
}

function applyPlateauDays(): void {
  form.weekly_leave_allowed_days = [
    ...PLATEAU_WEEKLY_LEAVE_DAYS,
  ]
}

function toggleAllowedDay(day: PlanningDayKey): void {
  const selected = form.weekly_leave_allowed_days.includes(day)

  form.weekly_leave_allowed_days = selected
      ? form.weekly_leave_allowed_days.filter((value) => value !== day)
      : [...form.weekly_leave_allowed_days, day]
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key])

  if (form.name.trim().length < 2) {
    errors.name = 'Saisissez un nom d’au moins deux caractères.'
  }

  if (isTeamRotation.value) {
    if (Number(form.weekly_leave_employees_per_week) < 1) {
      errors.weekly_leave_employees_per_week =
          'Le nombre de bénéficiaires doit être supérieur à zéro.'
    }

    if (form.weekly_leave_allowed_days.length === 0) {
      errors.weekly_leave_allowed_days =
          'Sélectionnez au moins un jour autorisé.'
    }

    if (!form.weekly_leave_rotation_anchor_date) {
      errors.weekly_leave_rotation_anchor_date =
          'Renseignez la date de démarrage du cycle.'
    }

    if (form.solver_type !== 'ORTOOLS') {
      globalError.value =
          'La rotation d’équipe exige le solveur OR-Tools.'
    }

    if (form.fallback_to_greedy) {
      globalError.value =
          'Le fallback Greedy doit être désactivé pour la rotation d’équipe.'
    }
  }

  if (isWeeklyGuardPool.value) {
    if (Number(form.guard_team_employees_per_week) < 1) {
      errors.guard_team_employees_per_week =
          'Le pool doit contenir au moins un collaborateur.'
    }

    if (
        form.guard_team_selection_mode === 'ROTATION_ORDER' &&
        !form.guard_team_rotation_anchor_date
    ) {
      errors.guard_team_rotation_anchor_date =
          'Renseignez la date de démarrage de la rotation des gardes.'
    }

    if (form.solver_type !== 'ORTOOLS') {
      globalError.value =
          'Le pool hebdomadaire de garde exige le solveur OR-Tools.'
    }

    if (form.fallback_to_greedy) {
      globalError.value =
          'Le fallback Greedy doit être désactivé pour le pool hebdomadaire.'
    }
  }

  if (
      maxConsecutiveEnabled.value &&
      Number(maxConsecutiveDays.value) < 1
  ) {
    errors.max_consecutive_work_days =
        'La limite doit être supérieure à zéro.'
  }

  return Object.keys(errors).length === 0 && !globalError.value
}

function payload(): PlanningSuggestionConfigPayload {
  return {
    name: form.name.trim(),
    active: form.active,

    min_rest_days_per_week:
        form.weekly_leave_mode === 'PER_EMPLOYEE'
            ? Number(form.min_rest_days_per_week)
            : 0,

    max_consecutive_work_days:
        maxConsecutiveEnabled.value
            ? Number(maxConsecutiveDays.value)
            : null,

    max_weekly_minutes:
        maxWeeklyHours.value === ''
            ? null
            : Math.round(Number(maxWeeklyHours.value) * 60),

    min_rest_minutes_between_shifts: Math.round(
        Number(minRestHours.value) * 60,
    ),

    max_consecutive_guards: Number(form.max_consecutive_guards),
    rest_after_guard_required: form.rest_after_guard_required,
    post_guard_rest_days: form.rest_after_guard_required
        ? Number(form.post_guard_rest_days)
        : 0,

    max_resting_employees_per_day:
        maxRestingInput.value === ''
            ? null
            : Number(maxRestingInput.value),

    fairness_window_weeks: Number(form.fairness_window_weeks),
    strict_coverage: form.strict_coverage,

    weekly_leave_mode: form.weekly_leave_mode,
    weekly_leave_employees_per_week: Number(
        form.weekly_leave_employees_per_week,
    ),
    weekly_leave_allowed_days: [
      ...form.weekly_leave_allowed_days,
    ],
    weekly_leave_rotation_anchor_date:
        form.weekly_leave_rotation_anchor_date || null,
    weekly_leave_complete_weeks_only:
    form.weekly_leave_complete_weeks_only,
    post_guard_rest_counts_as_weekly_leave:
    form.post_guard_rest_counts_as_weekly_leave,

    guard_team_mode: form.guard_team_mode,
    guard_team_employees_per_week: Number(
        form.guard_team_employees_per_week,
    ),
    guard_team_selection_mode:
        form.guard_team_selection_mode,
    guard_team_rotation_anchor_date:
        form.guard_team_rotation_anchor_date || null,
    guard_team_complete_weeks_only:
        form.guard_team_complete_weeks_only,
    guard_team_require_participation:
        form.guard_team_require_participation,

    solver_type: form.solver_type,
    solver_timeout_seconds: Number(form.solver_timeout_seconds),
    fallback_to_greedy:
        form.solver_type === 'ORTOOLS'
            ? form.fallback_to_greedy
            : false,
  }
}

async function save(): Promise<void> {
  globalError.value = ''

  if (!validate()) return

  saving.value = true

  try {
    const response = isEdit.value
        ? await PlanningSuggestionConfigService.update(
            props.config!.guid,
            payload(),
        )
        : await PlanningSuggestionConfigService.create(
            userStore.user?.guid ?? '',
            payload(),
        )

    if (!response?.success) throw response

    emit(
        'saved',
        response.data.planning_suggestion_config,
    )
  } catch (error: any) {
    globalError.value = responseError(
        error,
        'Impossible d’enregistrer cette configuration.',
    )
  } finally {
    saving.value = false
  }
}

</script>

<style scoped>
.field-control {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.7rem 0.8rem;
  font-size: 0.75rem;
  color: #334155;
  outline: none;
  transition: 0.16s;
}

.field-control:focus {
  border-color: #a5b4fc;
  box-shadow: 0 0 0 3px #e0e7ff;
}

.field-control:disabled {
  background: #f1f5f9;
  color: #94a3b8;
}

.field-control-error {
  border-color: #fca5a5;
}

.field-error-text {
  margin-top: 0.35rem;
  font-size: 0.68rem;
  color: #dc2626;
}

.field-help {
  margin-top: 0.35rem;
  font-size: 0.68rem;
  line-height: 1rem;
  color: #94a3b8;
}
</style>