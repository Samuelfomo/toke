<template>
  <div class="space-y-5">
    <header class="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button
            type="button"
            class="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            :disabled="saving"
            @click="requestCancel"
          >
            <IconArrowLeft :size="18" />
            Retour aux règles
          </button>
          <p class="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
            Configuration de la planification
          </p>
          <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {{ isEdit ? 'Modifier les règles actives' : 'Créer une configuration' }}
          </h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Avancez étape par étape. Les paramètres techniques restent regroupés à la fin du parcours.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span
            v-if="isDirty"
            class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"
          >
            Non enregistré
          </span>
          <span class="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            Étape {{ currentStepIndex + 1 }} sur {{ steps.length }}
          </span>
        </div>
      </div>

      <div class="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          class="h-full rounded-full bg-blue-600 transition-all duration-300"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
    </header>

    <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:hidden">
      <div class="flex min-w-max gap-2">
        <button
          v-for="step in steps"
          :key="step.id"
          type="button"
          class="rounded-xl px-3.5 py-2.5 text-xs font-bold transition"
          :class="currentStepId === step.id
            ? 'bg-blue-600 text-white'
            : stepErrorCounts[step.id]
              ? 'bg-red-50 text-red-700'
              : 'bg-slate-100 text-slate-600'"
          @click="currentStepId = step.id"
        >
          {{ step.number }}. {{ step.shortLabel }}
        </button>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[270px_minmax(0,1fr)_310px]">
      <aside class="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
        <PlanningConfigStepNavigation
          :steps="steps"
          :current-step-id="currentStepId"
          :completed-step-ids="completedStepIds"
          :error-counts="stepErrorCounts"
          @select="currentStepId = $event"
        />
      </aside>

      <div class="min-w-0 space-y-5">
      <section v-show="currentStepId === 'general'" class="space-y-4">
        <div>
          <label class="text-xs font-bold text-slate-700">
            Nom de la configuration <span class="text-red-500">*</span>
          </label>
          <input
              v-model="form.name"
              type="text"
              class="field-control mt-2"
              placeholder="Ex. Règles opérationnelles — version 2026"
              :class="{ 'field-control-error': errors.name }"
          />
          <p v-if="errors.name" class="field-error-text">{{ errors.name }}</p>
        </div>

        <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p class="text-xs font-bold text-slate-800">Configuration active</p>
            <p class="mt-1 text-xs leading-4 text-slate-500">
              Une seule version active est utilisée pour les nouvelles suggestions.
            </p>
          </div>
          <PlanningToggle v-model="form.active" />
        </div>
      </section>

      <section v-show="currentStepId === 'leave'" class="rounded-2xl border border-rose-100 bg-rose-50/30 p-4">
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <IconCalendarPause :size="19" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">Politique de repos hebdomadaire</h3>
            <p class="mt-1 text-xs leading-4 text-slate-500">
              Le mode avancé permet de cibler une population et un périmètre de service sans logique spécifique au client.
            </p>
          </div>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
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
                <p class="text-xs font-bold text-slate-900">{{ policy.label }}</p>
                <p class="mt-1 text-xs leading-4 text-slate-500">{{ policy.description }}</p>
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
            v-if="isLegacyPerEmployee"
            class="mt-4 rounded-xl border border-emerald-100 bg-white p-4"
        >
          <NumberField
              v-model="form.min_rest_days_per_week"
              label="Repos minimum par collaborateur"
              help="Mode historique appliqué à l’ensemble des employés inclus. Pour cibler un service ou un groupe, utilisez la politique avancée."
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
            <p class="text-xs font-bold text-rose-900">Quota tournant historique</p>
            <p class="mt-1 text-xs leading-5 text-rose-800/80">
              Un nombre exact de bénéficiaires est choisi chaque semaine selon rotation_order.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <NumberField
                v-model="form.weekly_leave_employees_per_week"
                label="Bénéficiaires par semaine"
                help="Quota global pour la semaine complète."
                suffix="employé(s)"
                :min="1"
                :max="1000"
                :error="errors.weekly_leave_employees_per_week"
            />

            <div>
              <label class="text-xs font-bold text-slate-700">
                Date de démarrage du cycle <span class="text-red-500">*</span>
              </label>
              <input
                  v-model="form.weekly_leave_rotation_anchor_date"
                  type="date"
                  class="field-control mt-2"
                  :class="{ 'field-control-error': errors.weekly_leave_rotation_anchor_date }"
              />
              <p v-if="errors.weekly_leave_rotation_anchor_date" class="field-error-text">
                {{ errors.weekly_leave_rotation_anchor_date }}
              </p>
            </div>
          </div>

          <AllowedDaysEditor
              :days="form.weekly_leave_allowed_days"
              :error="errors.weekly_leave_allowed_days"
              @toggle="toggleAllowedDay"
              @set="setAllowedDays"
          />

          <CommonLeaveToggles
              v-model:completeWeeksOnly="form.weekly_leave_complete_weeks_only"
              v-model:postGuardCounts="form.post_guard_rest_counts_as_weekly_leave"
          />
        </div>

        <div
            v-else-if="isPerEligibleEmployee"
            class="mt-4 space-y-5 rounded-xl border border-blue-100 bg-white p-4"
        >
          <div class="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <p class="text-xs font-bold text-blue-900">Politique avancée par employé éligible</p>
            <p class="mt-1 text-xs leading-5 text-blue-800/80">
              Le nombre d’employés concernés est calculé automatiquement à partir du sélecteur et du pool de garde de chaque semaine.
            </p>
          </div>

          <section class="rounded-xl border border-slate-200 p-4">
            <h4 class="text-xs font-bold text-slate-800">1. Population concernée</h4>
            <div class="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p class="text-xs font-bold text-slate-700">Modes de planning</p>
                <div class="mt-2 space-y-2">
                  <PolicyModeCheckbox
                      v-for="option in policyPlanningModeOptions"
                      :key="option.value"
                      :checked="form.weekly_leave_selector_planning_modes.includes(option.value)"
                      :label="option.label"
                      :description="option.description"
                      @toggle="toggleWeeklyLeavePlanningMode(option.value)"
                  />
                </div>
                <p v-if="errors.weekly_leave_selector_planning_modes" class="field-error-text">
                  {{ errors.weekly_leave_selector_planning_modes }}
                </p>
              </div>

              <div>
                <label class="text-xs font-bold text-slate-700">Relation avec le pool de garde</label>
                <select v-model="form.weekly_leave_selector_guard_pool_relation" class="field-control mt-2">
                  <option value="ANY">Tous les employés sélectionnés</option>
                  <option value="MEMBER">Uniquement les membres du pool</option>
                  <option value="NON_MEMBER">Uniquement les employés hors pool</option>
                </select>
                <p class="field-help">
                  Le groupe est recalculé chaque semaine. Aucun effectif dérivé n’est codé en dur.
                </p>
              </div>
            </div>
          </section>

          <section class="rounded-xl border border-slate-200 p-4">
            <h4 class="text-xs font-bold text-slate-800">2. Nombre et répartition des repos</h4>
            <div class="mt-3 grid gap-4 sm:grid-cols-2">
              <NumberField
                  v-model="form.weekly_leave_days_per_employee"
                  label="Repos par employé éligible"
                  help="Nombre appliqué indépendamment à chaque collaborateur correspondant au sélecteur."
                  suffix="jour(s)"
                  :min="1"
                  :max="7"
                  :error="errors.weekly_leave_days_per_employee"
              />

              <div>
                <label class="text-xs font-bold text-slate-700">Niveau d’exigence</label>
                <select v-model="form.weekly_leave_count_mode" class="field-control mt-2">
                  <option value="EXACT">Nombre exact</option>
                  <option value="MINIMUM">Nombre minimum</option>
                </select>
              </div>

              <NumberField
                  v-model="weeklyLeaveMaxPerDayInput"
                  label="Repos simultanés maximum"
                  help="Laissez vide pour ne pas limiter le nombre de bénéficiaires le même jour."
                  suffix="employé(s)"
                  :min="1"
                  optional
              />
            </div>

            <div class="mt-4">
              <AllowedDaysEditor
                  :days="form.weekly_leave_allowed_days"
                  :error="errors.weekly_leave_allowed_days"
                  @toggle="toggleAllowedDay"
                  @set="setAllowedDays"
              />
            </div>
          </section>

          <section class="rounded-xl border border-slate-200 p-4">
            <h4 class="text-xs font-bold text-slate-800">3. Périmètre de service</h4>
            <p class="mt-1 text-xs leading-4 text-slate-500">
              Cette sélection permet, par exemple, d’imposer un repos aux employés du service standard tout en excluant les gardes.
            </p>

            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                  v-for="scope in serviceScopeOptions"
                  :key="scope.value"
                  type="button"
                  class="rounded-xl border p-3 text-left"
                  :class="form.weekly_leave_service_scope_mode === scope.value
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 bg-white'"
                  @click="form.weekly_leave_service_scope_mode = scope.value"
              >
                <p class="text-xs font-bold text-slate-800">{{ scope.label }}</p>
                <p class="mt-1 text-xs leading-4 text-slate-500">{{ scope.description }}</p>
              </button>
            </div>

            <div
                v-if="form.weekly_leave_service_scope_mode === 'SERVICE_TYPE'"
                class="mt-4 grid gap-2 sm:grid-cols-2"
            >
              <PolicyModeCheckbox
                  :checked="form.weekly_leave_service_types.includes('STANDARD')"
                  label="Services standards"
                  description="Services qui commencent et se terminent dans la journée."
                  @toggle="toggleWeeklyLeaveServiceType('STANDARD')"
              />
              <PolicyModeCheckbox
                  :checked="form.weekly_leave_service_types.includes('GUARD')"
                  label="Gardes"
                  description="Débuts de garde traversant minuit."
                  @toggle="toggleWeeklyLeaveServiceType('GUARD')"
              />
            </div>

            <div
                v-else-if="form.weekly_leave_service_scope_mode === 'TEMPLATE'"
                class="mt-4"
            >
              <label class="text-xs font-bold text-slate-700">Session Templates concernés</label>
              <select
                  v-model="form.weekly_leave_template_guids"
                  multiple
                  class="field-control mt-2 min-h-[140px]"
              >
                <option v-for="template in templates" :key="template.guid" :value="template.guid">
                  {{ template.name }}
                </option>
              </select>
              <p class="field-help">Maintenez Ctrl ou Cmd pour sélectionner plusieurs templates.</p>
            </div>

            <div
                v-else-if="form.weekly_leave_service_scope_mode === 'REQUIREMENT'"
                class="mt-4"
            >
              <label class="text-xs font-bold text-slate-700">GUID des besoins concernés</label>
              <textarea
                  v-model="requirementGuidsInput"
                  rows="4"
                  class="field-control mt-2"
                  placeholder="Un GUID par ligne ou séparé par une virgule"
              />
              <p class="field-help">Utile pour cibler une règle de couverture précise sans modifier le code.</p>
            </div>

            <p v-if="errors.weekly_leave_service_scope" class="field-error-text">
              {{ errors.weekly_leave_service_scope }}
            </p>

            <div class="mt-4 space-y-3">
              <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p class="text-xs font-bold text-slate-800">Travail obligatoire les autres jours</p>
                  <p class="mt-1 text-xs leading-4 text-slate-500">
                    Chaque jour sans repos doit contenir au moins une affectation dans le périmètre choisi.
                  </p>
                </div>
                <PlanningToggle v-model="form.weekly_leave_require_work_on_other_days" />
              </div>

              <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p class="text-xs font-bold text-slate-800">Périmètre exclusif</p>
                  <p class="mt-1 text-xs leading-4 text-slate-500">
                    Les employés concernés ne peuvent pas recevoir un autre service pendant cette semaine.
                  </p>
                </div>
                <PlanningToggle v-model="form.weekly_leave_service_scope_exclusive" />
              </div>
            </div>
          </section>

          <CommonLeaveToggles
              v-model:completeWeeksOnly="form.weekly_leave_complete_weeks_only"
              v-model:postGuardCounts="form.post_guard_rest_counts_as_weekly_leave"
          />
        </div>

        <div
            v-else
            class="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
        >
          <p class="text-xs font-bold text-slate-800">Aucune attribution automatique</p>
          <p class="mt-1 text-xs leading-5 text-slate-500">
            Les repos peuvent toujours provenir des templates ou des récupérations après garde.
          </p>
        </div>
      </section>

      <section v-show="currentStepId === 'workload'" class="rounded-2xl border border-slate-200 p-4">
        <div class="flex items-center gap-2">
          <IconBeach :size="18" class="text-emerald-600" />
          <h3 class="text-sm font-bold text-slate-900">Charge et séquences de travail</h3>
        </div>

        <div class="mt-4 space-y-4">
          <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p class="text-xs font-bold text-slate-800">Limiter les jours consécutifs</p>
              <p class="mt-1 text-xs leading-4 text-slate-500">
                Cette règle globale peut rester désactivée lorsqu’une politique de repos exacte contrôle déjà les semaines.
              </p>
            </div>
            <PlanningToggle v-model="maxConsecutiveEnabled" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <NumberField
                v-if="maxConsecutiveEnabled"
                v-model="maxConsecutiveDays"
                label="Jours consécutifs maximum"
                help="Nombre maximal de journées travaillées dans une séquence."
                suffix="jour(s)"
                :min="1"
                :max="366"
                :error="errors.max_consecutive_work_days"
            />
            <div v-else class="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p class="text-xs font-bold text-amber-900">Règle désactivée</p>
              <p class="mt-1 text-xs leading-5 text-amber-800/80">
                Les politiques ciblées restent appliquées indépendamment.
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
                label="Repos simultanés maximum global"
                help="Cette ancienne limite s’applique à toutes les journées non travaillées."
                suffix="employé(s)"
                :min="1"
                optional
            />

            <NumberField
                v-model="form.fairness_window_weeks"
                label="Fenêtre historique d’équité"
                help="Historique utilisé pour équilibrer les charges et gardes."
                suffix="semaine(s)"
                :min="1"
                :max="52"
            />
          </div>
        </div>
      </section>

      <section v-show="currentStepId === 'guard'" class="rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
        <div class="flex items-center gap-2">
          <IconMoonStars :size="18" class="text-violet-600" />
          <h3 class="text-sm font-bold text-slate-900">Gardes et récupération</h3>
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
            <p class="text-xs font-bold text-slate-900">Affectation quotidienne flexible</p>
            <p class="mt-1 text-xs leading-4 text-slate-500">
              Aucun groupe stable n’est imposé à la semaine.
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
            <p class="text-xs font-bold text-slate-900">Pool hebdomadaire de garde</p>
            <p class="mt-1 text-xs leading-4 text-slate-500">
              Seuls les membres du groupe de la semaine peuvent démarrer une garde.
            </p>
          </button>
        </div>

        <div
            v-if="isWeeklyGuardPool"
            class="mt-4 space-y-4 rounded-xl border border-violet-100 bg-white p-4"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <NumberField
                v-model="form.guard_team_employees_per_week"
                label="Taille du pool hebdomadaire"
                help="Effectif exact du groupe autorisé à commencer les gardes."
                suffix="employé(s)"
                :min="1"
                :max="1000"
                :error="errors.guard_team_employees_per_week"
            />

            <div>
              <label class="text-xs font-bold text-slate-700">Méthode de sélection</label>
              <select v-model="form.guard_team_selection_mode" class="field-control mt-2">
                <option value="ROTATION_ORDER">Ordre de rotation déterministe</option>
                <option value="OPTIMIZED">Choix optimisé par OR-Tools</option>
              </select>
            </div>

            <div v-if="form.guard_team_selection_mode === 'ROTATION_ORDER'">
              <label class="text-xs font-bold text-slate-700">
                Date de démarrage de la rotation <span class="text-red-500">*</span>
              </label>
              <input
                  v-model="form.guard_team_rotation_anchor_date"
                  type="date"
                  class="field-control mt-2"
                  :class="{ 'field-control-error': errors.guard_team_rotation_anchor_date }"
              />
              <p v-if="errors.guard_team_rotation_anchor_date" class="field-error-text">
                {{ errors.guard_team_rotation_anchor_date }}
              </p>
            </div>

            <div>
              <label class="text-xs font-bold text-slate-700">Services autorisés aux membres</label>
              <select v-model="form.guard_team_member_service_access" class="field-control mt-2">
                <option value="ANY_SERVICE">Tous les services compatibles</option>
                <option value="GUARD_ONLY">Gardes uniquement pendant la semaine</option>
              </select>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 p-4">
            <p class="text-xs font-bold text-slate-800">Population candidate au pool</p>
            <PolicyModeCheckbox
                class="mt-3"
                :checked="form.guard_team_eligible_planning_modes.includes('ROTATING')"
                label="Profils rotatifs"
                description="Le moteur actuel constitue les pools à partir des profils ROTATING."
                @toggle="toggleGuardEligiblePlanningMode('ROTATING')"
            />
            <p v-if="errors.guard_team_eligible_planning_modes" class="field-error-text">
              {{ errors.guard_team_eligible_planning_modes }}
            </p>
          </div>

          <div class="rounded-xl border border-slate-200 p-4">
            <p class="text-xs font-bold text-slate-800">Équilibrage des appartenances au pool</p>
            <select v-model="form.guard_team_balance_mode" class="field-control mt-3">
              <option value="NONE">Aucune règle supplémentaire</option>
              <option value="SOFT">Équilibrage souple dans l’objectif</option>
              <option value="STRICT">Équilibrage strict</option>
            </select>

            <div v-if="form.guard_team_balance_mode !== 'NONE'" class="mt-4 grid gap-4 sm:grid-cols-2">
              <NumberField
                  v-model="guardMembershipSpreadInput"
                  label="Écart maximum de semaines"
                  help="Différence autorisée entre l’employé le plus et le moins sélectionné. Obligatoire en mode strict."
                  suffix="semaine(s)"
                  :min="0"
                  :max="52"
                  optional
                  :error="errors.guard_team_max_membership_spread"
              />
              <NumberField
                  v-model="guardConsecutiveWeeksInput"
                  label="Semaines consécutives maximum"
                  help="Laissez vide pour ne pas imposer cette limite."
                  suffix="semaine(s)"
                  :min="1"
                  :max="52"
                  optional
              />
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p class="text-xs font-bold text-slate-800">Semaines complètes uniquement</p>
                <p class="mt-1 text-xs leading-4 text-slate-500">
                  Les semaines partielles restent en mode quotidien flexible.
                </p>
              </div>
              <PlanningToggle v-model="form.guard_team_complete_weeks_only" />
            </div>

            <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p class="text-xs font-bold text-slate-800">Participation obligatoire</p>
                <p class="mt-1 text-xs leading-4 text-slate-500">
                  Chaque membre doit commencer au moins une garde pendant la semaine.
                </p>
              </div>
              <PlanningToggle v-model="form.guard_team_require_participation" />
            </div>
          </div>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField
              v-model="form.max_consecutive_guards"
              label="Gardes consécutives maximum"
              help="Nombre maximal de débuts de garde sur des jours successifs."
              suffix="garde(s)"
              :min="0"
              :max="31"
          />

          <NumberField
              v-model="form.post_guard_rest_days"
              label="Repos complet supplémentaire"
              help="Jours complets ajoutés après la journée de continuation. Mettre 0 lorsque le repos commence après la sortie à 08h."
              suffix="jour(s)"
              :min="0"
              :max="31"
              :disabled="!form.rest_after_guard_required"
          />
        </div>

        <div class="mt-4 flex items-center justify-between rounded-xl border border-violet-100 bg-white p-4">
          <div>
            <p class="text-xs font-bold text-slate-800">Repos après garde obligatoire</p>
            <p class="mt-1 text-xs text-slate-500">
              La continuation bloque déjà toute autre affectation sur sa journée.
            </p>
          </div>
          <PlanningToggle v-model="form.rest_after_guard_required" />
        </div>
      </section>

      <section v-show="currentStepId === 'solver'" class="rounded-2xl border border-slate-200 p-4">
        <div class="flex items-center gap-2">
          <IconCpu2 :size="18" class="text-blue-600" />
          <h3 class="text-sm font-bold text-slate-900">Solveur et niveau d’exigence</h3>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <button
              type="button"
              class="rounded-xl border p-4 text-left"
              :class="form.solver_type === 'ORTOOLS'
                ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                : 'border-slate-200'"
              @click="form.solver_type = 'ORTOOLS'"
          >
            <p class="text-xs font-bold text-slate-800">OR-Tools CP-SAT</p>
            <p class="mt-1 text-xs leading-4 text-slate-500">
              Requis pour les groupes dynamiques et politiques ciblées.
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
            <p class="text-xs font-bold text-slate-800">Greedy</p>
            <p class="mt-1 text-xs leading-4 text-slate-500">
              Disponible uniquement pour les règles simples historiques.
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
              <p class="text-xs font-bold text-slate-800">Fallback Greedy</p>
              <p class="mt-1 text-xs leading-4 text-slate-500">
                Désactivé automatiquement lorsque la configuration exige OR-Tools.
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
            <p class="text-xs font-bold text-slate-800">Couverture stricte</p>
            <p class="mt-1 text-xs leading-4 text-slate-500">
              Les minimums configurés deviennent des contraintes obligatoires.
            </p>
          </div>
          <PlanningToggle v-model="form.strict_coverage" />
        </div>
      </section>

      <section
        v-show="currentStepId === 'review'"
        class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <IconChecklist :size="20" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">Vérification finale</h3>
            <p class="mt-1 text-sm leading-6 text-slate-600">
              Relisez les choix essentiels. L’enregistrement effectuera une dernière validation complète.
            </p>
          </div>
        </div>

        <PlanningConfigSummary
          :name="form.name"
          :active="form.active"
          :items="summaryItems"
          :dirty="isDirty"
          :error-count="totalErrorCount"
        />

        <div class="grid gap-3 md:grid-cols-2">
          <button
            v-for="step in editableSteps"
            :key="step.id"
            type="button"
            class="flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition"
            :class="stepErrorCounts[step.id]
              ? 'border-red-200 bg-red-50 hover:border-red-300'
              : 'border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-blue-50'"
            @click="currentStepId = step.id"
          >
            <span>
              <span class="block text-sm font-bold text-slate-900">{{ step.label }}</span>
              <span class="mt-1 block text-xs leading-5 text-slate-500">{{ step.description }}</span>
            </span>
            <span
              class="rounded-full px-2.5 py-1 text-xs font-bold"
              :class="stepErrorCounts[step.id]
                ? 'bg-red-100 text-red-700'
                : 'bg-emerald-100 text-emerald-700'"
            >
              {{ stepErrorCounts[step.id] ? `${stepErrorCounts[step.id]} erreur(s)` : 'Prêt' }}
            </span>
          </button>
        </div>
      </section>

        <div
          v-if="globalError"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
        >
          {{ globalError }}
        </div>
      </div>

      <PlanningConfigSummary
        class="hidden 2xl:block"
        :name="form.name"
        :active="form.active"
        :items="summaryItems"
        :dirty="isDirty"
        :error-count="totalErrorCount"
      />
    </div>

    <footer class="sticky bottom-3 z-20 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl shadow-slate-950/10 backdrop-blur sm:px-5">
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          :disabled="saving"
          @click="requestCancel"
        >
          Annuler
        </button>

        <div class="flex items-center justify-end gap-2">
          <button
            v-if="currentStepIndex > 0"
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            :disabled="saving"
            @click="goPrevious"
          >
            <IconChevronLeft :size="17" />
            Précédent
          </button>

          <button
            v-if="currentStepId !== 'review'"
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            :disabled="saving"
            @click="goNext"
          >
            Suivant
            <IconChevronRight :size="17" />
          </button>

          <button
            v-else
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            :disabled="saving || loadingTemplates"
            @click="save"
          >
            <IconLoader2 v-if="saving" :size="17" class="animate-spin" />
            <IconDeviceFloppy v-else :size="17" />
            {{ saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les règles' : 'Créer la configuration' }}
          </button>
        </div>
      </div>
    </footer>

    <UnsavedChangesDialog
      :open="showDiscardDialog"
      @cancel="cancelDiscard"
      @confirm="confirmDiscard"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'
import {
  IconArrowLeft,
  IconBeach,
  IconCalendarPause,
  IconCheck,
  IconChecklist,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconCpu2,
  IconDeviceFloppy,
  IconLoader2,
  IconMoonStars,
} from '@tabler/icons-vue'

import SessionTemplateService from '@/service/SessionTemplate'
import PlanningSuggestionConfigService from '@/service/PlanningSuggestionConfigService'
import { useUserStore } from '@/stores/userStore'
import { useFormDirty } from '@/views/planning/composables/useFormDirty'
import { useUnsavedChanges } from '@/views/planning/composables/useUnsavedChanges'
import UnsavedChangesDialog from '@/views/planning/components/ui/UnsavedChangesDialog.vue'

import PlanningToggle from '../components/PlanningToggle.vue'
import NumberField from '../components/NumberField.vue'
import PlanningConfigStepNavigation from './PlanningConfigStepNavigation.vue'
import PlanningConfigSummary from './PlanningConfigSummary.vue'
import {
  PLANNING_CONFIG_STEPS,
  type PlanningConfigStepId,
} from './planningConfig.steps'
import {
  DAY_LABELS,
  DAY_ORDER,
  responseError,
} from '../planningSuggestion.helpers'
import { DEFAULT_WEEKLY_LEAVE_DAYS } from '../teamWeeklyLeave.helpers'
import type {
  GuardMemberServiceAccess,
  GuardPoolRelation,
  GuardTeamMode,
  GuardTeamSelectionMode,
  MembershipBalanceMode,
  PlanningDayKey,
  PlanningServiceType,
  PlanningSolverType,
  PlanningSuggestionConfig,
  PlanningSuggestionConfigPayload,
  PlanningTemplateMini,
  PolicyPlanningMode,
  ServiceScopeMode,
  WeeklyLeaveCountMode,
  WeeklyLeaveMode,
} from '../planningSuggestion.type'

const props = withDefaults(
  defineProps<{
    config?: PlanningSuggestionConfig | null
  }>(),
  { config: null },
)

const emit = defineEmits<{
  cancel: []
  saved: [config: PlanningSuggestionConfig]
}>()

interface FormState {
  name: string
  active: boolean
  weekly_leave_mode: WeeklyLeaveMode
  weekly_leave_employees_per_week: number
  weekly_leave_allowed_days: PlanningDayKey[]
  weekly_leave_rotation_anchor_date: string
  weekly_leave_complete_weeks_only: boolean
  post_guard_rest_counts_as_weekly_leave: boolean
  weekly_leave_selector_planning_modes: PolicyPlanningMode[]
  weekly_leave_selector_guard_pool_relation: GuardPoolRelation
  weekly_leave_days_per_employee: number
  weekly_leave_count_mode: WeeklyLeaveCountMode
  weekly_leave_require_work_on_other_days: boolean
  weekly_leave_service_scope_mode: ServiceScopeMode
  weekly_leave_service_types: PlanningServiceType[]
  weekly_leave_template_guids: string[]
  weekly_leave_service_scope_exclusive: boolean
  guard_team_mode: GuardTeamMode
  guard_team_employees_per_week: number
  guard_team_selection_mode: GuardTeamSelectionMode
  guard_team_rotation_anchor_date: string
  guard_team_complete_weeks_only: boolean
  guard_team_require_participation: boolean
  guard_team_eligible_planning_modes: PolicyPlanningMode[]
  guard_team_member_service_access: GuardMemberServiceAccess
  guard_team_balance_mode: MembershipBalanceMode
  min_rest_days_per_week: number
  max_consecutive_guards: number
  rest_after_guard_required: boolean
  post_guard_rest_days: number
  fairness_window_weeks: number
  strict_coverage: boolean
  solver_type: PlanningSolverType
  solver_timeout_seconds: number
  fallback_to_greedy: boolean
}

const userStore = useUserStore()
const saving = ref(false)
const loadingTemplates = ref(false)
const globalError = ref('')
const errors = reactive<Record<string, string>>({})
const templates = ref<PlanningTemplateMini[]>([])

const minRestHours = ref<number | string>(11)
const maxWeeklyHours = ref<number | string>('')
const maxRestingInput = ref<number | string>('')
const maxConsecutiveEnabled = ref(true)
const maxConsecutiveDays = ref<number | string>(6)
const weeklyLeaveMaxPerDayInput = ref<number | string>('')
const guardMembershipSpreadInput = ref<number | string>('')
const guardConsecutiveWeeksInput = ref<number | string>('')
const requirementGuidsInput = ref('')

const form = reactive<FormState>({
  name: '',
  active: false,
  weekly_leave_mode: 'PER_EMPLOYEE',
  weekly_leave_employees_per_week: 1,
  weekly_leave_allowed_days: [...DEFAULT_WEEKLY_LEAVE_DAYS],
  weekly_leave_rotation_anchor_date: '',
  weekly_leave_complete_weeks_only: true,
  post_guard_rest_counts_as_weekly_leave: false,
  weekly_leave_selector_planning_modes: ['ROTATING'],
  weekly_leave_selector_guard_pool_relation: 'ANY',
  weekly_leave_days_per_employee: 1,
  weekly_leave_count_mode: 'EXACT',
  weekly_leave_require_work_on_other_days: false,
  weekly_leave_service_scope_mode: 'ANY',
  weekly_leave_service_types: [],
  weekly_leave_template_guids: [],
  weekly_leave_service_scope_exclusive: false,
  guard_team_mode: 'DAILY_FLEXIBLE',
  guard_team_employees_per_week: 1,
  guard_team_selection_mode: 'ROTATION_ORDER',
  guard_team_rotation_anchor_date: '',
  guard_team_complete_weeks_only: true,
  guard_team_require_participation: true,
  guard_team_eligible_planning_modes: ['ROTATING'],
  guard_team_member_service_access: 'ANY_SERVICE',
  guard_team_balance_mode: 'NONE',
  min_rest_days_per_week: 1,
  max_consecutive_guards: 1,
  rest_after_guard_required: true,
  post_guard_rest_days: 0,
  fairness_window_weeks: 8,
  strict_coverage: true,
  solver_type: 'ORTOOLS',
  solver_timeout_seconds: 30,
  fallback_to_greedy: false,
})

const { isDirty, markPristine } = useFormDirty(
    () => ({
      ...form,
      min_rest_hours: minRestHours.value,
      max_weekly_hours: maxWeeklyHours.value,
      max_resting_employees: maxRestingInput.value,
      max_consecutive_enabled: maxConsecutiveEnabled.value,
      max_consecutive_days: maxConsecutiveDays.value,
      weekly_leave_max_per_day: weeklyLeaveMaxPerDayInput.value,
      guard_membership_spread: guardMembershipSpreadInput.value,
      guard_consecutive_weeks: guardConsecutiveWeeksInput.value,
      requirement_guids: requirementGuidsInput.value,
    }),
    true,
)

const {
  showDiscardDialog,
  requestAction,
  confirmDiscard,
  cancelDiscard,
} = useUnsavedChanges({
  dirty: isDirty,
  saving,
  routeGuard: true,
})

const isEdit = computed(() => Boolean(props.config?.guid))
const isTeamRotation = computed(() => form.weekly_leave_mode === 'TEAM_ROTATION')
const isLegacyPerEmployee = computed(() => form.weekly_leave_mode === 'PER_EMPLOYEE')
const isPerEligibleEmployee = computed(
    () => form.weekly_leave_mode === 'PER_ELIGIBLE_EMPLOYEE',
)
const isWeeklyGuardPool = computed(() => form.guard_team_mode === 'WEEKLY_POOL')
const requiresOrTools = computed(
    () =>
        isTeamRotation.value ||
        isPerEligibleEmployee.value ||
        isWeeklyGuardPool.value,
)


const steps = PLANNING_CONFIG_STEPS
const editableSteps = computed(() => steps.filter((step) => step.id !== 'review'))
const currentStepId = ref<PlanningConfigStepId>('general')
const currentStepIndex = computed(() =>
  Math.max(0, steps.findIndex((step) => step.id === currentStepId.value)),
)
const progressPercent = computed(() =>
  Math.round(((currentStepIndex.value + 1) / steps.length) * 100),
)
const completedStepIds = computed<PlanningConfigStepId[]>(() =>
  steps
    .filter((step) => step.number < currentStepIndex.value + 1)
    .map((step) => step.id),
)
const stepErrorCounts = computed<Partial<Record<PlanningConfigStepId, number>>>(() => {
  const result: Partial<Record<PlanningConfigStepId, number>> = {}

  for (const step of steps) {
    const count = step.errorKeys.filter((key) => Boolean(errors[key])).length
    if (count > 0) result[step.id] = count
  }

  if (globalError.value) {
    result.solver = (result.solver ?? 0) + 1
  }

  return result
})
const totalErrorCount = computed(() =>
  Object.values(stepErrorCounts.value).reduce((total, value) => total + (value ?? 0), 0),
)

const weeklyLeaveModeLabel = computed(() => {
  switch (form.weekly_leave_mode) {
    case 'TEAM_ROTATION':
      return `${form.weekly_leave_employees_per_week} bénéficiaire(s) par semaine`
    case 'PER_ELIGIBLE_EMPLOYEE':
      return `${form.weekly_leave_days_per_employee} repos par employé éligible`
    case 'PER_EMPLOYEE':
      return `${form.min_rest_days_per_week} repos minimum par collaborateur`
    default:
      return 'Aucun repos automatique'
  }
})

const guardModeLabel = computed(() =>
  form.guard_team_mode === 'WEEKLY_POOL'
    ? `Pool hebdomadaire de ${form.guard_team_employees_per_week} employé(s)`
    : 'Affectation quotidienne flexible',
)

const summaryItems = computed(() => [
  {
    label: 'Repos hebdomadaires',
    value: weeklyLeaveModeLabel.value,
  },
  {
    label: 'Charge maximale',
    value: maxWeeklyHours.value === ''
      ? 'Aucune limite générale'
      : `${maxWeeklyHours.value} heure(s) par semaine`,
  },
  {
    label: 'Gardes',
    value: guardModeLabel.value,
  },
  {
    label: 'Repos après garde',
    value: form.rest_after_guard_required
      ? `${form.post_guard_rest_days} jour(s) complet(s) supplémentaire(s)`
      : 'Non obligatoire',
  },
  {
    label: 'Méthode de génération',
    value: form.solver_type === 'ORTOOLS' ? 'Optimisation OR-Tools' : 'Méthode rapide Greedy',
  },
  {
    label: 'Couverture',
    value: form.strict_coverage ? 'Minimums obligatoires' : 'Minimums préférentiels',
  },
])

const policyPlanningModeOptions: Array<{
  value: PolicyPlanningMode
  label: string
  description: string
}> = [
  {
    value: 'FIXED',
    label: 'Profils fixes',
    description: 'Collaborateurs pilotés par un template fixe.',
  },
  {
    value: 'ROTATING',
    label: 'Profils rotatifs',
    description: 'Collaborateurs affectés dynamiquement par le solveur.',
  },
]

const policyOptions = [
  {
    value: 'NONE' as const,
    label: 'Aucune règle automatique',
    description: 'Le moteur n’attribue aucun repos hebdomadaire métier.',
    activeClass: 'border-slate-400 bg-slate-100 ring-2 ring-slate-100',
  },
  {
    value: 'PER_EMPLOYEE' as const,
    label: 'Minimum global par collaborateur',
    description: 'Mode historique appliqué à tous les employés inclus.',
    activeClass: 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100',
  },
  {
    value: 'TEAM_ROTATION' as const,
    label: 'Quota tournant pour l’équipe',
    description: 'Un nombre global de bénéficiaires est sélectionné par semaine.',
    activeClass: 'border-rose-300 bg-rose-50 ring-2 ring-rose-100',
  },
  {
    value: 'PER_ELIGIBLE_EMPLOYEE' as const,
    label: 'Politique avancée ciblée',
    description: 'Repos par employé selon population, pool et service.',
    activeClass: 'border-blue-300 bg-blue-50 ring-2 ring-blue-100',
  },
]

const serviceScopeOptions = [
  {
    value: 'ANY' as const,
    label: 'Tous les services',
    description: 'Toute affectation compatible satisfait la journée travaillée.',
  },
  {
    value: 'SERVICE_TYPE' as const,
    label: 'Par type de service',
    description: 'Cible STANDARD, GUARD ou les deux.',
  },
  {
    value: 'TEMPLATE' as const,
    label: 'Par Session Template',
    description: 'Cible un ou plusieurs horaires précis.',
  },
  {
    value: 'REQUIREMENT' as const,
    label: 'Par besoin de couverture',
    description: 'Cible des règles de couverture par GUID.',
  },
]

watch(
  () => props.config,
  () => {
    reset()
  },
  { immediate: true },
)

onMounted(() => {
  void loadTemplates()
})

watch(
    () => form.solver_type,
    (solver) => {
      if (solver === 'GREEDY') form.fallback_to_greedy = false
    },
)

watch(requiresOrTools, (required) => {
  if (!required) return
  form.solver_type = 'ORTOOLS'
  form.fallback_to_greedy = false
})

function requestCancel(): void {
  requestAction(() => emit('cancel'))
}

function goPrevious(): void {
  const previous = steps[currentStepIndex.value - 1]
  if (previous) currentStepId.value = previous.id
}

function goNext(): void {
  const next = steps[currentStepIndex.value + 1]
  if (next) currentStepId.value = next.id
}

function firstInvalidStepId(): PlanningConfigStepId {
  for (const step of steps) {
    if (step.errorKeys.some((key) => Boolean(errors[key]))) return step.id
  }

  return globalError.value ? 'solver' : 'review'
}

async function loadTemplates(): Promise<void> {
  loadingTemplates.value = true
  try {
    const response = await SessionTemplateService.list({
      current: true,
      active: true,
      limit: 250,
    })
    templates.value =
        response?.data?.templates?.items ??
        response?.data?.session_templates?.items ??
        []
  } catch (error: any) {
    globalError.value = responseError(
        error,
        'Impossible de charger les Session Templates.',
    )
  } finally {
    loadingTemplates.value = false
  }
}

function reset(): void {
  Object.keys(errors).forEach((key) => delete errors[key])
  globalError.value = ''
  currentStepId.value = 'general'

  const config = props.config
  const policy = config?.rules.weekly_leave_policy
  const guardPolicy = config?.rules.guard_team_policy

  form.name = config?.name ?? ''
  form.active = config?.active ?? false

  form.weekly_leave_mode = policy?.mode ?? 'PER_EMPLOYEE'
  form.weekly_leave_employees_per_week = policy?.employees_per_week ?? 1
  form.weekly_leave_allowed_days = [
    ...(policy?.allowed_days ?? DEFAULT_WEEKLY_LEAVE_DAYS),
  ]
  form.weekly_leave_rotation_anchor_date = policy?.rotation_anchor_date ?? ''
  form.weekly_leave_complete_weeks_only = policy?.complete_weeks_only ?? true
  form.post_guard_rest_counts_as_weekly_leave =
      policy?.post_guard_rest_counts_as_leave ?? false
  form.weekly_leave_selector_planning_modes = [
    ...(policy?.selector?.planning_modes ?? ['ROTATING']),
  ]
  form.weekly_leave_selector_guard_pool_relation =
      policy?.selector?.guard_pool_relation ?? 'ANY'
  form.weekly_leave_days_per_employee = policy?.days_per_employee ?? 1
  form.weekly_leave_count_mode = policy?.count_mode ?? 'EXACT'
  weeklyLeaveMaxPerDayInput.value = policy?.max_employees_per_day ?? ''
  form.weekly_leave_require_work_on_other_days =
      policy?.require_work_on_other_days ?? false
  form.weekly_leave_service_scope_mode = policy?.service_scope?.mode ?? 'ANY'
  form.weekly_leave_service_types = [
    ...(policy?.service_scope?.service_types ?? []),
  ]
  form.weekly_leave_template_guids = [
    ...(policy?.service_scope?.template_guids ?? []),
  ]
  requirementGuidsInput.value = (
      policy?.service_scope?.requirement_guids ?? []
  ).join('\n')
  form.weekly_leave_service_scope_exclusive =
      policy?.service_scope?.exclusive ?? false

  form.guard_team_mode = guardPolicy?.mode ?? 'DAILY_FLEXIBLE'
  form.guard_team_employees_per_week = guardPolicy?.employees_per_week ?? 1
  form.guard_team_selection_mode = guardPolicy?.selection_mode ?? 'ROTATION_ORDER'
  form.guard_team_rotation_anchor_date = guardPolicy?.rotation_anchor_date ?? ''
  form.guard_team_complete_weeks_only = guardPolicy?.complete_weeks_only ?? true
  form.guard_team_require_participation = guardPolicy?.require_participation ?? true
  form.guard_team_eligible_planning_modes = [
    ...(guardPolicy?.eligible_planning_modes ?? ['ROTATING']),
  ]
  form.guard_team_member_service_access =
      guardPolicy?.member_service_access ?? 'ANY_SERVICE'
  form.guard_team_balance_mode = guardPolicy?.balance?.mode ?? 'NONE'
  guardMembershipSpreadInput.value =
      guardPolicy?.balance?.max_membership_spread ?? ''
  guardConsecutiveWeeksInput.value =
      guardPolicy?.balance?.max_consecutive_membership_weeks ?? ''

  form.min_rest_days_per_week = config?.rules.min_rest_days_per_week ?? 1
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
  maxRestingInput.value = config?.rules.max_resting_employees_per_day ?? ''
  form.max_consecutive_guards = config?.rules.max_consecutive_guards ?? 1
  form.rest_after_guard_required = config?.rules.rest_after_guard_required ?? true
  form.post_guard_rest_days = config?.rules.post_guard_rest_days ?? 0
  form.fairness_window_weeks = config?.rules.fairness_window_weeks ?? 8
  form.strict_coverage = config?.rules.strict_coverage ?? true
  form.solver_type = config?.solver.type ?? 'ORTOOLS'
  form.solver_timeout_seconds = config?.solver.timeout_seconds ?? 30
  form.fallback_to_greedy = config?.solver.fallback_to_greedy ?? false

  void nextTick(markPristine)
}

function selectPolicy(mode: WeeklyLeaveMode): void {
  form.weekly_leave_mode = mode

  if (mode === 'NONE') {
    form.min_rest_days_per_week = 0
  }

  if (mode === 'TEAM_ROTATION' || mode === 'PER_ELIGIBLE_EMPLOYEE') {
    form.min_rest_days_per_week = 0
    form.solver_type = 'ORTOOLS'
    form.fallback_to_greedy = false
  }
}

function selectGuardTeamMode(mode: GuardTeamMode): void {
  form.guard_team_mode = mode
  if (mode === 'WEEKLY_POOL') {
    form.solver_type = 'ORTOOLS'
    form.fallback_to_greedy = false
  }
}

function toggleAllowedDay(day: PlanningDayKey): void {
  form.weekly_leave_allowed_days = form.weekly_leave_allowed_days.includes(day)
      ? form.weekly_leave_allowed_days.filter((value) => value !== day)
      : [...form.weekly_leave_allowed_days, day]
}

function setAllowedDays(days: PlanningDayKey[]): void {
  form.weekly_leave_allowed_days = [...days]
}

function toggleWeeklyLeavePlanningMode(mode: PolicyPlanningMode): void {
  form.weekly_leave_selector_planning_modes =
      form.weekly_leave_selector_planning_modes.includes(mode)
          ? form.weekly_leave_selector_planning_modes.filter((value) => value !== mode)
          : [...form.weekly_leave_selector_planning_modes, mode]
}

function toggleGuardEligiblePlanningMode(mode: PolicyPlanningMode): void {
  form.guard_team_eligible_planning_modes =
      form.guard_team_eligible_planning_modes.includes(mode)
          ? form.guard_team_eligible_planning_modes.filter((value) => value !== mode)
          : [...form.guard_team_eligible_planning_modes, mode]
}

function toggleWeeklyLeaveServiceType(type: PlanningServiceType): void {
  form.weekly_leave_service_types = form.weekly_leave_service_types.includes(type)
      ? form.weekly_leave_service_types.filter((value) => value !== type)
      : [...form.weekly_leave_service_types, type]
}

function parsedRequirementGuids(): string[] {
  return [...new Set(
      requirementGuidsInput.value
          .split(/[\n,;]+/)
          .map((value) => value.trim())
          .filter(Boolean),
  )]
}

function validateServiceScope(): void {
  if (form.weekly_leave_service_scope_mode === 'SERVICE_TYPE') {
    if (!form.weekly_leave_service_types.length) {
      errors.weekly_leave_service_scope = 'Sélectionnez au moins un type de service.'
    }
  }

  if (
      form.weekly_leave_service_scope_mode === 'TEMPLATE' &&
      !form.weekly_leave_template_guids.length
  ) {
    errors.weekly_leave_service_scope = 'Sélectionnez au moins un Session Template.'
  }

  if (
      form.weekly_leave_service_scope_mode === 'REQUIREMENT' &&
      !parsedRequirementGuids().length
  ) {
    errors.weekly_leave_service_scope = 'Renseignez au moins un GUID de besoin.'
  }
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key])
  globalError.value = ''

  if (form.name.trim().length < 2) {
    errors.name = 'Saisissez un nom d’au moins deux caractères.'
  }

  if (isTeamRotation.value) {
    if (Number(form.weekly_leave_employees_per_week) < 1) {
      errors.weekly_leave_employees_per_week =
          'Le nombre de bénéficiaires doit être supérieur à zéro.'
    }
    if (!form.weekly_leave_rotation_anchor_date) {
      errors.weekly_leave_rotation_anchor_date =
          'Renseignez la date de démarrage du cycle.'
    }
  }

  if (isTeamRotation.value || isPerEligibleEmployee.value) {
    if (!form.weekly_leave_allowed_days.length) {
      errors.weekly_leave_allowed_days = 'Sélectionnez au moins un jour autorisé.'
    }
  }

  if (isPerEligibleEmployee.value) {
    if (!form.weekly_leave_selector_planning_modes.length) {
      errors.weekly_leave_selector_planning_modes =
          'Sélectionnez au moins un mode de planning.'
    }
    if (Number(form.weekly_leave_days_per_employee) < 1) {
      errors.weekly_leave_days_per_employee =
          'Le nombre de repos doit être supérieur à zéro.'
    }
    if (
        form.weekly_leave_count_mode === 'EXACT' &&
        Number(form.weekly_leave_days_per_employee) >
        form.weekly_leave_allowed_days.length
    ) {
      errors.weekly_leave_days_per_employee =
          'Le nombre exact de repos dépasse le nombre de jours autorisés.'
    }
    validateServiceScope()
  }

  if (isWeeklyGuardPool.value) {
    if (Number(form.guard_team_employees_per_week) < 1) {
      errors.guard_team_employees_per_week =
          'Le pool doit contenir au moins un collaborateur.'
    }
    if (!form.guard_team_eligible_planning_modes.includes('ROTATING')) {
      errors.guard_team_eligible_planning_modes =
          'Le moteur actuel exige les profils ROTATING pour constituer un pool.'
    }
    if (
        form.guard_team_selection_mode === 'ROTATION_ORDER' &&
        !form.guard_team_rotation_anchor_date
    ) {
      errors.guard_team_rotation_anchor_date =
          'Renseignez la date de démarrage de la rotation des gardes.'
    }
    if (
        form.guard_team_balance_mode === 'STRICT' &&
        guardMembershipSpreadInput.value === ''
    ) {
      errors.guard_team_max_membership_spread =
          'Renseignez l’écart maximum pour l’équilibrage strict.'
    }
  }

  if (maxConsecutiveEnabled.value && Number(maxConsecutiveDays.value) < 1) {
    errors.max_consecutive_work_days = 'La limite doit être supérieure à zéro.'
  }

  if (requiresOrTools.value && form.solver_type !== 'ORTOOLS') {
    globalError.value = 'Cette configuration exige le solveur OR-Tools.'
  }
  if (requiresOrTools.value && form.fallback_to_greedy) {
    globalError.value = 'Le fallback Greedy doit être désactivé pour ces politiques.'
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
    min_rest_minutes_between_shifts: Math.round(Number(minRestHours.value) * 60),
    max_consecutive_guards: Number(form.max_consecutive_guards),
    rest_after_guard_required: form.rest_after_guard_required,
    post_guard_rest_days: form.rest_after_guard_required
        ? Number(form.post_guard_rest_days)
        : 0,
    max_resting_employees_per_day:
        maxRestingInput.value === '' ? null : Number(maxRestingInput.value),
    fairness_window_weeks: Number(form.fairness_window_weeks),
    strict_coverage: form.strict_coverage,

    weekly_leave_mode: form.weekly_leave_mode,
    weekly_leave_employees_per_week: Number(form.weekly_leave_employees_per_week),
    weekly_leave_allowed_days: [...form.weekly_leave_allowed_days],
    weekly_leave_rotation_anchor_date:
        form.weekly_leave_rotation_anchor_date || null,
    weekly_leave_complete_weeks_only: form.weekly_leave_complete_weeks_only,
    post_guard_rest_counts_as_weekly_leave:
    form.post_guard_rest_counts_as_weekly_leave,
    weekly_leave_selector: {
      planning_modes: [...form.weekly_leave_selector_planning_modes],
      guard_pool_relation: form.weekly_leave_selector_guard_pool_relation,
    },
    weekly_leave_days_per_employee: Number(form.weekly_leave_days_per_employee),
    weekly_leave_count_mode: form.weekly_leave_count_mode,
    weekly_leave_max_employees_per_day:
        weeklyLeaveMaxPerDayInput.value === ''
            ? null
            : Number(weeklyLeaveMaxPerDayInput.value),
    weekly_leave_require_work_on_other_days:
    form.weekly_leave_require_work_on_other_days,
    weekly_leave_service_scope: {
      mode: form.weekly_leave_service_scope_mode,
      service_types: [...form.weekly_leave_service_types],
      template_guids: [...form.weekly_leave_template_guids],
      requirement_guids: parsedRequirementGuids(),
      exclusive: form.weekly_leave_service_scope_exclusive,
    },

    guard_team_mode: form.guard_team_mode,
    guard_team_employees_per_week: Number(form.guard_team_employees_per_week),
    guard_team_selection_mode: form.guard_team_selection_mode,
    guard_team_rotation_anchor_date: form.guard_team_rotation_anchor_date || null,
    guard_team_complete_weeks_only: form.guard_team_complete_weeks_only,
    guard_team_require_participation: form.guard_team_require_participation,
    guard_team_eligible_planning_modes: [
      ...form.guard_team_eligible_planning_modes,
    ],
    guard_team_member_service_access: form.guard_team_member_service_access,
    guard_team_balance_mode: form.guard_team_balance_mode,
    guard_team_max_membership_spread:
        guardMembershipSpreadInput.value === ''
            ? null
            : Number(guardMembershipSpreadInput.value),
    guard_team_max_consecutive_membership_weeks:
        guardConsecutiveWeeksInput.value === ''
            ? null
            : Number(guardConsecutiveWeeksInput.value),

    solver_type: form.solver_type,
    solver_timeout_seconds: Number(form.solver_timeout_seconds),
    fallback_to_greedy:
        form.solver_type === 'ORTOOLS' ? form.fallback_to_greedy : false,
  }
}

async function save(): Promise<void> {
  if (!validate()) {
    currentStepId.value = firstInvalidStepId()
    return
  }

  saving.value = true
  globalError.value = ''

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
    markPristine()
    emit('saved', response.data.planning_suggestion_config)
  } catch (error: any) {
    globalError.value = responseError(
        error,
        'Impossible d’enregistrer cette configuration.',
    )
  } finally {
    saving.value = false
  }
}

const PolicyModeCheckbox = defineComponent({
  inheritAttrs: false,
  props: {
    checked: Boolean,
    label: { type: String, required: true },
    description: { type: String, required: true },
  },
  emits: ['toggle'],
  setup(props, { emit, attrs }) {
    return () =>
        h(
            'button',
            {
              ...attrs,
              type: 'button',
              class: [
                attrs.class,
                'flex w-full items-start gap-3 rounded-xl border bg-white p-3 text-left',
                props.checked ? 'border-blue-300' : 'border-slate-200',
              ],
              onClick: () => emit('toggle'),
            },
            [
              h(
                  'span',
                  {
                    class: [
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                      props.checked
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-slate-300 text-transparent',
                    ],
                  },
                  [h(IconCheck, { size: 13 })],
              ),
              h('span', {}, [
                h('span', { class: 'block text-xs font-bold text-slate-800' }, props.label),
                h('span', { class: 'mt-1 block text-xs leading-4 text-slate-500' }, props.description),
              ]),
            ],
        )
  },
})

const AllowedDaysEditor = defineComponent({
  props: {
    days: { type: Array as () => PlanningDayKey[], required: true },
    error: { type: String, default: '' },
  },
  emits: ['toggle', 'set'],
  setup(props, { emit }) {
    const workdays: PlanningDayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    return () =>
        h('div', {}, [
          h('div', { class: 'flex flex-wrap items-center justify-between gap-2' }, [
            h('div', {}, [
              h('p', { class: 'text-xs font-bold text-slate-700' }, 'Jours autorisés'),
              h('p', { class: 'mt-1 text-xs text-slate-500' }, 'Le moteur choisit uniquement parmi ces jours.'),
            ]),
            h('div', { class: 'flex gap-2' }, [
              h('button', { type: 'button', class: 'mini-action', onClick: () => emit('set', [...DAY_ORDER]) }, 'Tous'),
              h('button', { type: 'button', class: 'mini-action', onClick: () => emit('set', workdays) }, 'Lun–Ven'),
              h('button', { type: 'button', class: 'mini-action', onClick: () => emit('set', []) }, 'Effacer'),
            ]),
          ]),
          h(
              'div',
              { class: 'mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4' },
              DAY_ORDER.map((day) =>
                  h(
                      'button',
                      {
                        type: 'button',
                        class: [
                          'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold',
                          props.days.includes(day)
                              ? 'border-rose-300 bg-rose-50 text-rose-800'
                              : 'border-slate-200 bg-white text-slate-500',
                        ],
                        onClick: () => emit('toggle', day),
                      },
                      [
                        h('span', {
                          class: [
                            'h-2 w-2 rounded-full',
                            props.days.includes(day) ? 'bg-rose-500' : 'bg-slate-300',
                          ],
                        }),
                        DAY_LABELS[day],
                      ],
                  ),
              ),
          ),
          props.error
              ? h('p', { class: 'field-error-text' }, props.error)
              : null,
        ])
  },
})

const CommonLeaveToggles = defineComponent({
  props: {
    completeWeeksOnly: { type: Boolean, required: true },
    postGuardCounts: { type: Boolean, required: true },
  },
  emits: ['update:completeWeeksOnly', 'update:postGuardCounts'],
  setup(props, { emit }) {
    return () =>
        h('div', { class: 'space-y-3' }, [
          h('div', { class: 'flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4' }, [
            h('div', {}, [
              h('p', { class: 'text-xs font-bold text-slate-800' }, 'Semaines complètes uniquement'),
              h('p', { class: 'mt-1 text-xs text-slate-500' }, 'Les périodes partielles ne forcent pas cette politique.'),
            ]),
            h(PlanningToggle, {
              modelValue: props.completeWeeksOnly,
              'onUpdate:modelValue': (value: boolean) => emit('update:completeWeeksOnly', value),
            }),
          ]),
          h('div', { class: 'flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4' }, [
            h('div', {}, [
              h('p', { class: 'text-xs font-bold text-slate-800' }, 'Récupération post-garde comptée comme repos'),
              h('p', { class: 'mt-1 text-xs text-slate-500' }, 'Désactivé : le repos métier reste distinct de la récupération.'),
            ]),
            h(PlanningToggle, {
              modelValue: props.postGuardCounts,
              'onUpdate:modelValue': (value: boolean) => emit('update:postGuardCounts', value),
            }),
          ]),
        ])
  },
})
</script>

<style scoped>
.field-control {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.7rem 0.8rem;
  font-size: 0.875rem;
  color: #334155;
  outline: none;
  transition: 0.16s;
}

.field-control:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px #dbeafe;
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
  font-size: 0.75rem;
  color: #dc2626;
}

.field-help {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  line-height: 1rem;
  color: #94a3b8;
}

.mini-action {
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.3rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
}
</style>
