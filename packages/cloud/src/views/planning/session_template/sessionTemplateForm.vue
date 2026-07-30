<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6">
      <button
          type="button"
          class="absolute inset-0 bg-black/35 backdrop-blur-sm"
          aria-label="Fermer"
          @click="requestClose"
      />

      <section
          class="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[94dvh] sm:max-w-6xl sm:rounded-2xl sm:border sm:border-slate-200"
      >
        <header class="flex-shrink-0 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex min-w-0 items-center gap-3">
              <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <IconCalendarEvent :size="18" class="text-blue-600"/>
              </div>
              <div class="min-w-0">
                <h2 class="truncate text-base font-semibold text-slate-800">
                  {{ formTitle }}
                </h2>
                <p class="text-xs text-slate-400">Configuration d’un modèle d’horaires réutilisable</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span
                  v-if="draftStatus"
                  class="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 sm:inline-flex"
              >
                {{ draftStatus }}
              </span>
              <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  @click="requestClose"
              >
                <IconX :size="17"/>
              </button>
            </div>
          </div>

          <nav class="mt-4 grid grid-cols-3 gap-2" aria-label="Étapes du formulaire">
            <button
                v-for="step in STEPS"
                :key="step.value"
                type="button"
                class="flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition"
                :class="activeStep === step.value
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : activeStep > step.value
                  ? 'border-emerald-100 bg-emerald-50/60 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'"
                @click="navigateToStep(step.value)"
            >
              <span
                  class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  :class="activeStep === step.value
                  ? 'bg-blue-600 text-white'
                  : activeStep > step.value
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-500'"
              >
                <IconCheck v-if="activeStep > step.value" :size="13"/>
                <span v-else>{{ step.value }}</span>
              </span>
              <span class="min-w-0">
                <span class="block truncate text-xs font-semibold">{{ step.label }}</span>
                <span class="hidden truncate text-[10px] opacity-70 lg:block">{{ step.description }}</span>
              </span>
            </button>
          </nav>
        </header>

        <main class="min-h-0 flex-1 overflow-y-auto bg-slate-50/60">
          <!-- Étape 1 : informations -->
          <div v-if="activeStep === 1" class="mx-auto grid max-w-5xl gap-5 p-4 sm:p-6 lg:grid-cols-[1.15fr_.85fr]">
            <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div class="mb-5">
                <h3 class="text-sm font-semibold text-slate-800">Informations générales</h3>
                <p class="mt-1 text-xs text-slate-400">Identifiez clairement le modèle et son usage.</p>
              </div>

              <div class="space-y-4">
                <div class="field-group">
                  <label class="field-label">Nom du modèle <span class="text-red-500">*</span></label>
                  <input
                      v-model="form.name"
                      type="text"
                      placeholder="Ex. Horaire standard du lundi au vendredi"
                      class="field"
                      :class="{ 'field-error': errors.name }"
                  />
                  <p v-if="errors.name" class="err">{{ errors.name }}</p>
                </div>

                <div class="field-group">
                  <label class="field-label">Norme associée <span class="text-red-500">*</span></label>
                  <select
                      v-model="form.session_model"
                      class="field cursor-pointer"
                      :class="{ 'field-error': errors.session_model }"
                      @change="onModelChange"
                  >
                    <option value="">Sélectionner une norme…</option>
                    <option v-for="sm in sessionModels" :key="sm.guid" :value="sm.guid">
                      {{ sm.name }}
                    </option>
                  </select>
                  <p v-if="errors.session_model" class="err">{{ errors.session_model }}</p>
                </div>

                <div class="field-group">
                  <label class="field-label">Description</label>
                  <textarea
                      v-model="form.description"
                      rows="4"
                      placeholder="Décrivez le contexte d’utilisation de ce modèle…"
                      class="field resize-none"
                  />
                </div>

                <div class="grid gap-3 sm:grid-cols-3">
                  <article class="option-card">
                    <div>
                      <p class="text-xs font-semibold text-slate-700">Rotation</p>
                      <p class="mt-0.5 text-[11px] leading-4 text-slate-400">Disponible pour les plannings rotatifs.</p>
                    </div>
                    <FormToggle
                        v-model="form.for_rotation"
                        :disabled="!selectedModel?.rotation_allowed"
                        color="violet"
                    />
                  </article>

                  <article class="option-card">
                    <div>
                      <p class="text-xs font-semibold text-slate-700">Par défaut</p>
                      <p class="mt-0.5 text-[11px] leading-4 text-slate-400">Proposé automatiquement aux managers.</p>
                    </div>
                    <FormToggle v-model="form.is_default" color="blue"/>
                  </article>

                  <article class="option-card">
                    <div>
                      <p class="text-xs font-semibold text-slate-700">Actif</p>
                      <p class="mt-0.5 text-[11px] leading-4 text-slate-400">Utilisable dans les affectations
                        courantes.</p>
                    </div>
                    <FormToggle v-model="form.current" color="emerald"/>
                  </article>
                </div>
              </div>
            </section>

            <aside class="space-y-4">
              <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div class="mb-4 flex items-center gap-2">
                  <IconShieldCheck :size="17" class="text-blue-600"/>
                  <h3 class="text-sm font-semibold text-slate-800">Règles de la norme</h3>
                </div>

                <div v-if="!selectedModel"
                     class="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">
                  Sélectionnez une norme pour afficher ses contraintes.
                </div>

                <div v-else class="space-y-3">
                  <div class="rule-row">
                    <span>Jours autorisés</span>
                    <div class="flex flex-wrap justify-end gap-1">
                      <span
                          v-for="day in selectedModel.workday"
                          :key="day"
                          class="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600"
                      >
                        {{ DAY_FR_SHORT[day] ?? day }}
                      </span>
                    </div>
                  </div>
                  <div class="rule-row">
                    <span>Pauses</span>
                    <strong>{{ selectedModel.pause_allowed ? 'Autorisées' : 'Non autorisées' }}</strong>
                  </div>
                  <div class="rule-row">
                    <span>Rotation</span>
                    <strong>{{ selectedModel.rotation_allowed ? 'Autorisée' : 'Non autorisée' }}</strong>
                  </div>
                  <div v-if="modelRuleValue('min_session_minutes')" class="rule-row">
                    <span>Durée minimale</span>
                    <strong>{{ formatMinutes(Number(modelRuleValue('min_session_minutes'))) }}</strong>
                  </div>
                  <div v-if="modelRuleValue('max_session_minutes')" class="rule-row">
                    <span>Durée maximale</span>
                    <strong>{{ formatMinutes(Number(modelRuleValue('max_session_minutes'))) }}</strong>
                  </div>
                  <div v-if="modelRuleValue('max_daily_minutes')" class="rule-row">
                    <span>Maximum quotidien</span>
                    <strong>{{ formatMinutes(Number(modelRuleValue('max_daily_minutes'))) }}</strong>
                  </div>
                  <div v-if="modelRuleValue('default_tolerance') !== undefined" class="rule-row">
                    <span>Tolérance proposée</span>
                    <strong>{{ Number(modelRuleValue('default_tolerance')) }} min</strong>
                  </div>
                </div>
              </section>

              <section
                  v-if="draftRestored"
                  class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700"
              >
                <div class="flex items-start gap-2">
                  <IconDeviceFloppy :size="16" class="mt-0.5 flex-shrink-0"/>
                  <div>
                    <p class="font-semibold">Brouillon restauré</p>
                    <p class="mt-1 leading-5 text-emerald-600">
                      Les dernières modifications non enregistrées ont été récupérées automatiquement.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <!-- Étape 2 : horaires -->
          <div v-else-if="activeStep === 2" class="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
            <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h3 class="text-sm font-semibold text-slate-800">Configuration hebdomadaire</h3>
                  <p class="mt-1 text-xs text-slate-400">Utilisez les raccourcis pour éviter les saisies
                    répétitives.</p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button type="button" class="shortcut-btn" @click="applyWeekdayShortcut">
                    <IconCalendarWeek :size="14"/>
                    Lun–Ven travaillés
                  </button>
                  <button type="button" class="shortcut-btn" @click="applyWeekendRest">
                    <IconBeach :size="14"/>
                    Week-end en repos
                  </button>
                  <button type="button" class="shortcut-btn" @click="applyAllAllowedWork">
                    <IconCheck :size="14"/>
                    Tous autorisés
                  </button>
                  <button type="button" class="shortcut-btn" @click="openBulkCopy()">
                    <IconCopy :size="14"/>
                    Appliquer à plusieurs jours
                  </button>
                  <button type="button" class="shortcut-btn text-red-500 hover:border-red-200 hover:bg-red-50"
                          @click="resetSchedule">
                    <IconRefresh :size="14"/>
                    Réinitialiser
                  </button>
                </div>
              </div>
            </section>

            <section class="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div class="space-y-3">
                <article
                    v-for="day in ALL_DAYS"
                    :id="`day-${day.value}`"
                    :key="day.value"
                    class="rounded-2xl border bg-white shadow-sm transition"
                    :class="[
                    isDayAllowed(day.value) ? 'border-slate-200' : 'border-slate-100 opacity-55',
                    dayErrors[day.value]?.length ? 'ring-2 ring-red-100 border-red-300' : '',
                  ]"
                >
                  <div class="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
                    <div class="flex w-20 items-center gap-2">
                      <span
                          class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                        {{ day.label }}
                      </span>
                    </div>

                    <div class="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                      <button
                          v-for="opt in DAY_STATES"
                          :key="opt.value"
                          type="button"
                          :disabled="!isDayAllowed(day.value)"
                          class="rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed"
                          :class="getDayState(day.value) === opt.value
                          ? 'bg-white text-slate-700 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'"
                          @click="setDayState(day.value, opt.value)"
                      >
                        {{ opt.label }}
                      </button>
                    </div>

                    <span
                        v-if="getDayState(day.value) === 'work'"
                        class="text-xs text-slate-500"
                    >
                      {{ blocksSummary(day.value) }}
                    </span>

                    <div class="flex-1"/>

                    <button
                        v-if="getDayState(day.value) === 'work'"
                        type="button"
                        class="day-action-btn"
                        @click="openBulkCopy(day.value)"
                    >
                      <IconCopy :size="13"/>
                      Copier ce jour
                    </button>
                    <button
                        v-if="getDayState(day.value) === 'work'"
                        type="button"
                        class="day-action-btn text-blue-600"
                        @click="addBlock(day.value)"
                    >
                      <IconPlus :size="13"/>
                      Ajouter un bloc
                    </button>
                  </div>

                  <div v-if="getDayState(day.value) === 'work'" class="space-y-3 p-4">
                    <div
                        v-for="(block, bi) in (definition[day.value] as IDayBlock[])"
                        :key="`${day.value}-${bi}`"
                        class="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_130px_40px]">
                        <div class="field-group">
                          <label class="field-label">Travail</label>
                          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                            <input v-model="block.work[0]" type="time" class="time-field"/>
                            <span class="text-slate-300">–</span>
                            <input v-model="block.work[1]" type="time" class="time-field"/>
                          </div>
                        </div>

                        <div v-if="selectedModel?.pause_allowed" class="field-group">
                          <label class="field-label">Pause</label>
                          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                            <input
                                type="time"
                                class="time-field"
                                :value="block.pause?.[0] ?? ''"
                                @input="setPauseStart(day.value, bi, ($event.target as HTMLInputElement).value)"
                            />
                            <span class="text-slate-300">–</span>
                            <input
                                type="time"
                                class="time-field"
                                :value="block.pause?.[1] ?? ''"
                                @input="setPauseEnd(day.value, bi, ($event.target as HTMLInputElement).value)"
                            />
                          </div>
                        </div>

                        <div class="field-group">
                          <label class="field-label">Tolérance</label>
                          <div class="relative">
                            <input
                                v-model.number="block.tolerance"
                                type="number"
                                min="0"
                                max="60"
                                class="time-field w-full pr-10"
                            />
                            <span
                                class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">min</span>
                          </div>
                        </div>

                        <div class="flex items-end justify-end">
                          <button
                              type="button"
                              class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                              title="Supprimer ce bloc"
                              @click="removeBlock(day.value, bi)"
                          >
                            <IconTrash :size="15"/>
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                        v-if="(definition[day.value] as IDayBlock[]).length === 0"
                        type="button"
                        class="w-full rounded-xl border border-dashed border-slate-300 py-3 text-xs font-medium text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                        @click="addBlock(day.value)"
                    >
                      Ajouter le premier bloc de travail
                    </button>
                  </div>

                  <div
                      v-if="dayErrors[day.value]?.length"
                      class="border-t border-red-100 bg-red-50 px-4 py-3"
                  >
                    <p
                        v-for="message in dayErrors[day.value]"
                        :key="message"
                        class="flex items-start gap-2 text-xs text-red-600"
                    >
                      <IconAlertTriangle :size="13" class="mt-0.5 flex-shrink-0"/>
                      {{ message }}
                    </p>
                  </div>
                </article>
              </div>

              <aside class="space-y-4 lg:sticky lg:top-4 lg:self-start">
                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 class="text-sm font-semibold text-slate-800">Résumé permanent</h3>
                  <div class="mt-4 grid grid-cols-2 gap-2">
                    <div class="summary-stat">
                      <span>Jours travaillés</span>
                      <strong>{{ scheduleSummary.workedDays }}</strong>
                    </div>
                    <div class="summary-stat">
                      <span>Jours de repos</span>
                      <strong>{{ scheduleSummary.restDays }}</strong>
                    </div>
                    <div class="summary-stat">
                      <span>Blocs</span>
                      <strong>{{ scheduleSummary.blocks }}</strong>
                    </div>
                    <div class="summary-stat">
                      <span>Durée totale</span>
                      <strong>{{ formatMinutes(scheduleSummary.totalMinutes) }}</strong>
                    </div>
                  </div>
                </section>

                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 class="text-sm font-semibold text-slate-800">Aperçu de la semaine</h3>
                  <div class="mt-4 space-y-2">
                    <div
                        v-for="day in ALL_DAYS"
                        :key="`preview-${day.value}`"
                        class="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2"
                    >
                      <span class="w-8 text-[11px] font-bold text-slate-500">{{ day.label }}</span>
                      <span
                          class="h-2 w-2 flex-shrink-0 rounded-full"
                          :class="previewDotClass(day.value)"
                      />
                      <span class="min-w-0 flex-1 truncate text-xs text-slate-600">
                        {{ dayPreview(day.value) }}
                      </span>
                    </div>
                  </div>
                </section>
              </aside>
            </section>
          </div>

          <!-- Étape 3 : vérification -->
          <div v-else class="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
            <section
                class="rounded-2xl border p-4 shadow-sm sm:p-5"
                :class="reviewValid ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'"
            >
              <div class="flex items-start gap-3">
                <div
                    class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    :class="reviewValid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
                >
                  <IconCircleCheck v-if="reviewValid" :size="21"/>
                  <IconAlertTriangle v-else :size="21"/>
                </div>
                <div>
                  <h3 class="text-sm font-semibold" :class="reviewValid ? 'text-emerald-800' : 'text-red-800'">
                    {{
                      reviewValid ? 'Le modèle est prêt à être enregistré' : `${reviewErrorCount} correction${reviewErrorCount > 1 ? 's' : ''} requise${reviewErrorCount > 1 ? 's' : ''}`
                    }}
                  </h3>
                  <p class="mt-1 text-xs leading-5" :class="reviewValid ? 'text-emerald-700' : 'text-red-700'">
                    {{
                      reviewValid
                          ? 'Vérifiez une dernière fois les informations ci-dessous avant de confirmer.'
                          : 'Ouvrez les éléments signalés et corrigez-les avant l’enregistrement.'
                    }}
                  </p>
                </div>
              </div>
            </section>

            <div class="grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
              <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-sm font-semibold text-slate-800">Informations générales</h3>
                  <button type="button" class="text-xs font-medium text-blue-600" @click="activeStep = 1">Modifier
                  </button>
                </div>
                <dl class="mt-4 space-y-3 text-xs">
                  <div class="review-row">
                    <dt>Nom</dt>
                    <dd>{{ form.name || 'Non renseigné' }}</dd>
                  </div>
                  <div class="review-row">
                    <dt>Norme</dt>
                    <dd>{{ selectedModel?.name || 'Non renseignée' }}</dd>
                  </div>
                  <div class="review-row">
                    <dt>Rotation</dt>
                    <dd>{{ form.for_rotation ? 'Oui' : 'Non' }}</dd>
                  </div>
                  <div class="review-row">
                    <dt>Par défaut</dt>
                    <dd>{{ form.is_default ? 'Oui' : 'Non' }}</dd>
                  </div>
                  <div class="review-row">
                    <dt>Statut</dt>
                    <dd>{{ form.current ? 'Actif' : 'Inactif' }}</dd>
                  </div>
                </dl>

                <div v-if="errors.name || errors.session_model" class="mt-4 space-y-2 rounded-xl bg-red-50 p-3">
                  <button v-if="errors.name" type="button" class="review-error" @click="activeStep = 1">
                    <IconAlertTriangle :size="13"/>
                    Nom : {{ errors.name }}
                  </button>
                  <button v-if="errors.session_model" type="button" class="review-error" @click="activeStep = 1">
                    <IconAlertTriangle :size="13"/>
                    Norme : {{ errors.session_model }}
                  </button>
                </div>
              </section>

              <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-sm font-semibold text-slate-800">Aperçu hebdomadaire</h3>
                  <button type="button" class="text-xs font-medium text-blue-600" @click="activeStep = 2">Modifier
                  </button>
                </div>

                <div class="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                      v-for="day in ALL_DAYS"
                      :key="`review-${day.value}`"
                      type="button"
                      class="flex items-start gap-3 rounded-xl border p-3 text-left transition"
                      :class="dayErrors[day.value]?.length
                      ? 'border-red-200 bg-red-50 hover:bg-red-100'
                      : 'border-slate-100 bg-slate-50 hover:border-blue-200'"
                      @click="goToDay(day.value)"
                  >
                    <span class="w-8 text-xs font-bold text-slate-600">{{ day.label }}</span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-xs font-medium text-slate-700">{{ dayPreview(day.value) }}</span>
                      <span v-if="dayErrors[day.value]?.length" class="mt-1 block text-[11px] text-red-600">
                        {{ dayErrors[day.value].length }} erreur{{ dayErrors[day.value].length > 1 ? 's' : '' }}
                      </span>
                    </span>
                  </button>
                </div>

                <div v-if="globalError"
                     class="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600">
                  <IconAlertTriangle :size="14" class="mt-0.5 flex-shrink-0"/>
                  {{ globalError }}
                </div>
              </section>
            </div>

            <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 class="text-sm font-semibold text-slate-800">Synthèse</h3>
              <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div class="summary-stat"><span>Jours travaillés</span><strong>{{ scheduleSummary.workedDays }}</strong>
                </div>
                <div class="summary-stat"><span>Jours de repos</span><strong>{{ scheduleSummary.restDays }}</strong>
                </div>
                <div class="summary-stat"><span>Blocs horaires</span><strong>{{ scheduleSummary.blocks }}</strong></div>
                <div class="summary-stat">
                  <span>Durée hebdomadaire</span><strong>{{ formatMinutes(scheduleSummary.totalMinutes) }}</strong>
                </div>
              </div>
            </section>
          </div>
        </main>

        <footer
            class="flex flex-shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
          <button
              type="button"
              class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              @click="requestClose"
          >
            Fermer
          </button>

          <div class="flex items-center gap-2">
            <button
                v-if="activeStep > 1"
                type="button"
                class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                @click="activeStep--"
            >
              Précédent
            </button>

            <button
                v-if="activeStep < 3"
                type="button"
                class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                @click="goNext"
            >
              {{ activeStep === 2 ? 'Vérifier le modèle' : 'Configurer les horaires' }}
              <IconArrowRight :size="15"/>
            </button>

            <button
                v-else
                type="button"
                class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="saving || !reviewValid"
                @click="submit"
            >
              <IconLoader2 v-if="saving" :size="15" class="animate-spin"/>
              <IconDeviceFloppy v-else :size="15"/>
              {{ saving ? 'Enregistrement…' : 'Enregistrer le modèle' }}
            </button>
          </div>
        </footer>
      </section>
    </div>

    <!-- Copier / appliquer à plusieurs jours -->
    <div v-if="bulkCopyOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" class="absolute inset-0 bg-black/30" aria-label="Fermer" @click="bulkCopyOpen = false"/>
      <section class="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-sm font-semibold text-slate-800">Appliquer un jour à plusieurs jours</h3>
            <p class="mt-1 text-xs text-slate-400">Les horaires, pauses et tolérances seront copiés.</p>
          </div>
          <button type="button" class="text-slate-400 hover:text-slate-700" @click="bulkCopyOpen = false">
            <IconX :size="17"/>
          </button>
        </div>

        <div class="mt-5 space-y-4">
          <div class="field-group">
            <label class="field-label">Jour source</label>
            <select v-model="bulkSourceDay" class="field cursor-pointer">
              <option value="">Sélectionner un jour…</option>
              <option
                  v-for="day in ALL_DAYS.filter((d) => getDayState(d.value) !== 'absent')"
                  :key="day.value"
                  :value="day.value"
              >
                {{ DAY_FR[day.value] }} — {{ dayPreview(day.value) }}
              </option>
            </select>
          </div>

          <div>
            <p class="field-label mb-2">Jours de destination</p>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <label
                  v-for="day in ALL_DAYS"
                  :key="`target-${day.value}`"
                  class="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition"
                  :class="bulkTargetDays.includes(day.value)
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'"
              >
                <input
                    v-model="bulkTargetDays"
                    type="checkbox"
                    class="rounded border-slate-300 text-blue-600"
                    :value="day.value"
                    :disabled="day.value === bulkSourceDay || !isDayAllowed(day.value)"
                />
                {{ DAY_FR_SHORT[day.value] }}
              </label>
            </div>
          </div>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600"
                  @click="bulkCopyOpen = false">
            Annuler
          </button>
          <button
              type="button"
              class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              :disabled="!bulkSourceDay || bulkTargetDays.length === 0"
              @click="applyBulkCopy"
          >
            Appliquer
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue'
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBeach,
  IconCalendarEvent,
  IconCalendarWeek,
  IconCheck,
  IconCircleCheck,
  IconCopy,
  IconDeviceFloppy,
  IconLoader2,
  IconPlus,
  IconRefresh,
  IconShieldCheck,
  IconTrash,
  IconX,
} from '@tabler/icons-vue'
import SessionTemplateService from '@/service/SessionTemplate'
import type {IDayBlock, IDefinition, ISessionTemplate} from './type'

type FormMode = 'create' | 'edit' | 'duplicate'
type DayState = 'work' | 'rest' | 'off' | 'absent'
type SessionModelOption = {
  guid: string
  name: string
  workday: string[]
  pause_allowed: boolean
  rotation_allowed: boolean
  min_session_minutes?: number | null
  max_session_minutes?: number | null
  max_daily_minutes?: number | null
  default_tolerance?: number | null
  [key: string]: unknown
}

const props = withDefaults(defineProps<{
  template?: ISessionTemplate | null
  sessionModels: SessionModelOption[]
  mode?: FormMode
}>(), {
  template: null,
  mode: 'create',
})

const emit = defineEmits<{ close: []; saved: [] }>()

const STEPS = [
  {value: 1, label: 'Informations', description: 'Nom, norme et options'},
  {value: 2, label: 'Horaires', description: 'Configuration hebdomadaire'},
  {value: 3, label: 'Vérification', description: 'Contrôle avant enregistrement'},
] as const

const DAY_FR: Record<string, string> = {
  Mon: 'Lundi', Tue: 'Mardi', Wed: 'Mercredi', Thu: 'Jeudi', Fri: 'Vendredi', Sat: 'Samedi', Sun: 'Dimanche',
}
const DAY_FR_SHORT: Record<string, string> = {
  Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Jeu', Fri: 'Ven', Sat: 'Sam', Sun: 'Dim',
}
const ALL_DAYS = [
  {value: 'Mon', label: 'Lun'}, {value: 'Tue', label: 'Mar'},
  {value: 'Wed', label: 'Mer'}, {value: 'Thu', label: 'Jeu'},
  {value: 'Fri', label: 'Ven'}, {value: 'Sat', label: 'Sam'},
  {value: 'Sun', label: 'Dim'},
]
const DAY_STATES = [
  {value: 'work', label: 'Travaillé'},
  {value: 'rest', label: 'Repos'},
  {value: 'off', label: 'Fermé'},
]

const FormToggle = {
  props: {
    modelValue: Boolean,
    color: {type: String, default: 'blue'},
    disabled: {type: Boolean, default: false},
  },
  emits: ['update:modelValue'],
  template: `
    <button
        type="button"
        :disabled="disabled"
        class="relative h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200"
        :class="[modelValue ? activeClass : 'bg-slate-200', disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer']"
        @click="!disabled && $emit('update:modelValue', !modelValue)"
    >
      <span
          class="absolute left-[2px] top-[2px] h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
          :class="modelValue ? 'translate-x-4' : 'translate-x-0'"
      />
    </button>
  `,
  computed: {
    activeClass() {
      const map: Record<string, string> = {
        blue: 'bg-blue-500', violet: 'bg-violet-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
      }
      return map[(this as any).color] ?? 'bg-blue-500'
    },
  },
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function templateModelGuid(template?: ISessionTemplate | null): string {
  if (!template?.session_model) return ''
  return typeof template.session_model === 'string'
      ? template.session_model
      : template.session_model.guid
}

const isEdit = computed(() => props.mode === 'edit' && !!props.template?.guid)
const formTitle = computed(() => {
  if (props.mode === 'duplicate') return 'Dupliquer le modèle'
  return isEdit.value ? 'Modifier le modèle' : 'Créer un modèle d’horaires'
})

const form = reactive({
  name: props.mode === 'duplicate' && props.template?.name
      ? `Copie de ${props.template.name}`
      : props.template?.name ?? '',
  session_model: templateModelGuid(props.template),
  description: props.template?.description ?? '',
  for_rotation: props.template?.for_rotation ?? false,
  is_default: props.mode === 'duplicate' ? false : (props.template?.default ?? props.template?.is_default ?? false),
  current: props.mode === 'duplicate' ? true : (props.template?.current ?? props.template?.is_current ?? true),
})

const definition = reactive<IDefinition>(clone(props.template?.definition ?? {}))
const initialSnapshot = JSON.stringify({form: clone(form), definition: clone(definition)})
const activeStep = ref<1 | 2 | 3>(1)
const errors = reactive<Record<string, string>>({})
const dayErrors = reactive<Record<string, string[]>>({})
const globalError = ref('')
const saving = ref(false)
const reviewValid = ref(false)
const draftRestored = ref(false)
const draftStatus = ref('')
const bulkCopyOpen = ref(false)
const bulkSourceDay = ref('')
const bulkTargetDays = ref<string[]>([])
let draftTimer: ReturnType<typeof setTimeout> | null = null
let statusTimer: ReturnType<typeof setTimeout> | null = null
let previousModelGuid = form.session_model

const draftKey = computed(() => {
  if (props.mode === 'edit') return `session-template:draft:edit:${props.template?.guid ?? 'unknown'}`
  if (props.mode === 'duplicate') return `session-template:draft:duplicate:${props.template?.guid ?? 'unknown'}`
  return 'session-template:draft:create'
})

const selectedModel = computed(() =>
    props.sessionModels.find((sm) => sm.guid === form.session_model) ?? null,
)

const scheduleSummary = computed(() => {
  let workedDays = 0
  let restDays = 0
  let blocks = 0
  let totalMinutes = 0

  for (const day of ALL_DAYS) {
    const value = definition[day.value]
    if (Array.isArray(value) && value.length > 0) {
      workedDays++
      blocks += value.length
      for (const block of value as IDayBlock[]) totalMinutes += netBlockMinutes(block)
    } else if (Array.isArray(value) && value.length === 0) {
      restDays++
    }
  }

  return {workedDays, restDays, blocks, totalMinutes}
})

const reviewErrorCount = computed(() => {
  const fieldCount = Object.keys(errors).length
  const daysCount = Object.values(dayErrors).reduce((sum, messages) => sum + messages.length, 0)
  return fieldCount + daysCount + (globalError.value ? 1 : 0)
})

function modelRuleValue(key: string): unknown {
  return selectedModel.value?.[key]
}

function isDayAllowed(day: string): boolean {
  return selectedModel.value?.workday?.includes(day) ?? false
}

function getDayState(day: string): DayState {
  if (!(day in definition)) return 'absent'
  const value = definition[day]
  if (value === null) return 'off'
  if (Array.isArray(value) && value.length === 0) return 'rest'
  if (Array.isArray(value) && value.length > 0) return 'work'
  return 'absent'
}

function defaultBlock(): IDayBlock {
  for (const day of ALL_DAYS) {
    const value = definition[day.value]
    if (Array.isArray(value) && value.length > 0) return clone(value[0] as IDayBlock)
  }

  return {
    work: ['08:00', '17:00'],
    pause: null,
    tolerance: Number(selectedModel.value?.default_tolerance ?? 0),
  }
}

function setDayState(day: string, state: string) {
  if (!isDayAllowed(day)) return

  if (state === 'work') {
    if (getDayState(day) !== 'work') definition[day] = [defaultBlock()]
  } else if (state === 'rest') {
    definition[day] = []
  } else if (state === 'off') {
    definition[day] = null
  }

  delete dayErrors[day]
}

function hasScheduleData(): boolean {
  return Object.keys(definition).some((day) => definition[day] !== undefined)
}

function onModelChange() {
  const nextGuid = form.session_model
  if (previousModelGuid && previousModelGuid !== nextGuid && hasScheduleData()) {
    const accepted = window.confirm(
        'Le changement de norme réinitialisera les horaires déjà configurés. Continuer ?',
    )
    if (!accepted) {
      form.session_model = previousModelGuid
      return
    }
  }

  Object.keys(definition).forEach((key) => delete definition[key])
  form.for_rotation = false
  previousModelGuid = nextGuid
}

function addBlock(day: string) {
  if (!Array.isArray(definition[day])) definition[day] = []
  ;
  (definition[day] as IDayBlock[]).push(defaultBlock())
}

function removeBlock(day: string, index: number) {
  const blocks = definition[day] as IDayBlock[]
  blocks.splice(index, 1)
  if (blocks.length === 0) definition[day] = []
}

function setPauseStart(day: string, blockIndex: number, value: string) {
  const block = (definition[day] as IDayBlock[])[blockIndex]
  if (!block.pause) block.pause = ['', '']
  block.pause[0] = value
  if (!block.pause[0] && !block.pause[1]) block.pause = null
}

function setPauseEnd(day: string, blockIndex: number, value: string) {
  const block = (definition[day] as IDayBlock[])[blockIndex]
  if (!block.pause) block.pause = ['', '']
  block.pause[1] = value
  if (!block.pause[0] && !block.pause[1]) block.pause = null
}

function openBulkCopy(sourceDay = '') {
  bulkSourceDay.value = sourceDay
  bulkTargetDays.value = []
  bulkCopyOpen.value = true
}

function applyBulkCopy() {
  if (!bulkSourceDay.value || bulkTargetDays.value.length === 0) return
  const source = clone(definition[bulkSourceDay.value])
  for (const target of bulkTargetDays.value) {
    if (target !== bulkSourceDay.value && isDayAllowed(target)) definition[target] = clone(source)
  }
  bulkCopyOpen.value = false
}

function applyWeekdayShortcut() {
  const block = defaultBlock()
  for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) {
    if (isDayAllowed(day)) definition[day] = [clone(block)]
  }
}

function applyWeekendRest() {
  for (const day of ['Sat', 'Sun']) {
    if (isDayAllowed(day)) definition[day] = []
  }
}

function applyAllAllowedWork() {
  const block = defaultBlock()
  for (const day of ALL_DAYS) {
    if (isDayAllowed(day.value)) definition[day.value] = [clone(block)]
  }
}

function resetSchedule() {
  if (!hasScheduleData()) return
  const accepted = window.confirm('Réinitialiser toute la configuration hebdomadaire ?')
  if (!accepted) return
  Object.keys(definition).forEach((key) => delete definition[key])
  Object.keys(dayErrors).forEach((key) => delete dayErrors[key])
}

function blocksSummary(day: string): string {
  const blocks = definition[day] as IDayBlock[]
  if (!Array.isArray(blocks) || blocks.length === 0) return 'Aucun bloc'
  return blocks.map((block) => `${block.work[0] || '--:--'}–${block.work[1] || '--:--'}`).join(', ')
}

function dayPreview(day: string): string {
  const state = getDayState(day)
  if (!isDayAllowed(day)) return 'Non autorisé par la norme'
  if (state === 'rest') return 'Repos'
  if (state === 'off') return 'Fermé'
  if (state === 'work') return blocksSummary(day)
  return 'Non configuré'
}

function previewDotClass(day: string): string {
  const state = getDayState(day)
  if (!isDayAllowed(day)) return 'bg-slate-300'
  if (state === 'work') return 'bg-blue-500'
  if (state === 'rest') return 'bg-amber-400'
  if (state === 'off') return 'bg-slate-500'
  return 'bg-red-300'
}

function toMinutes(time: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return null
  const [hours, minutes] = time.split(':').map(Number)
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function netBlockMinutes(block: IDayBlock): number {
  const start = toMinutes(block.work[0])
  const end = toMinutes(block.work[1])
  if (start === null || end === null || end <= start) return 0

  let result = end - start
  if (block.pause?.[0] && block.pause?.[1]) {
    const pauseStart = toMinutes(block.pause[0])
    const pauseEnd = toMinutes(block.pause[1])
    if (pauseStart !== null && pauseEnd !== null && pauseEnd > pauseStart) result -= pauseEnd - pauseStart
  }
  return Math.max(0, result)
}

function formatMinutes(total: number): string {
  const safe = Number.isFinite(total) ? Math.max(0, total) : 0
  const hours = Math.floor(safe / 60)
  const minutes = safe % 60
  if (hours === 0) return `${minutes} min`
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, '0')}`
}

function validateDay(day: string): string[] {
  const messages: string[] = []
  const value = definition[day]

  if (!isDayAllowed(day)) return messages
  if (!Array.isArray(value) || value.length === 0) return messages

  const intervals: Array<{ start: number; end: number; index: number }> = []

  value.forEach((block, index) => {
    const start = toMinutes(block.work[0])
    const end = toMinutes(block.work[1])
    const prefix = `Bloc ${index + 1}`

    if (start === null || end === null) {
      messages.push(`${prefix} : renseignez une heure de début et une heure de fin valides.`)
      return
    }
    if (end <= start) {
      messages.push(`${prefix} : l’heure de fin doit être postérieure à l’heure de début.`)
      return
    }

    intervals.push({start, end, index})

    if (block.pause && (block.pause[0] || block.pause[1])) {
      const pauseStart = toMinutes(block.pause[0])
      const pauseEnd = toMinutes(block.pause[1])
      if (pauseStart === null || pauseEnd === null) {
        messages.push(`${prefix} : renseignez les deux heures de pause ou supprimez la pause.`)
      } else if (pauseEnd <= pauseStart) {
        messages.push(`${prefix} : la fin de pause doit être postérieure au début.`)
      } else if (pauseStart < start || pauseEnd > end) {
        messages.push(`${prefix} : la pause doit être comprise dans la plage de travail.`)
      }
    }

    if (block.tolerance < 0 || block.tolerance > 60) {
      messages.push(`${prefix} : la tolérance doit être comprise entre 0 et 60 minutes.`)
    }
  })

  intervals.sort((a, b) => a.start - b.start)
  for (let index = 1; index < intervals.length; index++) {
    if (intervals[index].start < intervals[index - 1].end) {
      messages.push(`Les blocs ${intervals[index - 1].index + 1} et ${intervals[index].index + 1} se chevauchent.`)
    }
  }

  return messages
}

function validateAll(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key])
  Object.keys(dayErrors).forEach((key) => delete dayErrors[key])
  globalError.value = ''

  if (!form.name.trim()) errors.name = 'Le nom du modèle est requis.'
  if (!form.session_model) errors.session_model = 'La norme associée est requise.'

  for (const day of ALL_DAYS) {
    const messages = validateDay(day.value)
    if (messages.length) dayErrors[day.value] = messages
  }

  const hasWork = Object.values(definition).some((value) => Array.isArray(value) && value.length > 0)
  if (!hasWork) globalError.value = 'Définissez au moins un jour travaillé.'

  reviewValid.value = Object.keys(errors).length === 0
      && Object.keys(dayErrors).length === 0
      && !globalError.value

  return reviewValid.value
}

function navigateToStep(step: 1 | 2 | 3) {
  if (step === 3) validateAll()
  activeStep.value = step
}

function goNext() {
  if (activeStep.value === 1) {
    Object.keys(errors).forEach((key) => delete errors[key])
    if (!form.name.trim()) errors.name = 'Le nom du modèle est requis.'
    if (!form.session_model) errors.session_model = 'La norme associée est requise.'
    if (Object.keys(errors).length) return
    activeStep.value = 2
    return
  }

  validateAll()
  activeStep.value = 3
}

async function goToDay(day: string) {
  activeStep.value = 2
  await nextTick()
  document.getElementById(`day-${day}`)?.scrollIntoView({behavior: 'smooth', block: 'center'})
}

function currentSnapshot(): string {
  return JSON.stringify({form: clone(form), definition: clone(definition)})
}

function hasUnsavedChanges(): boolean {
  return currentSnapshot() !== initialSnapshot
}

function draftPayload() {
  return {
    savedAt: new Date().toISOString(),
    form: clone(form),
    definition: clone(definition),
  }
}

function replaceDefinition(value: IDefinition) {
  Object.keys(definition).forEach((key) => delete definition[key])
  Object.assign(definition, clone(value))
}

function restoreDraft() {
  if (typeof window === 'undefined') return
  const raw = window.localStorage.getItem(draftKey.value)
  if (!raw) return

  try {
    const draft = JSON.parse(raw)
    if (draft?.form) Object.assign(form, draft.form)
    if (draft?.definition) replaceDefinition(draft.definition)
    previousModelGuid = form.session_model
    draftRestored.value = true
  } catch (error) {
    console.warn('Unable to restore session template draft', error)
  }
}

function saveDraftNow() {
  if (typeof window === 'undefined') return
  if (!hasUnsavedChanges()) {
    clearDraft()
    draftStatus.value = ''
    return
  }
  window.localStorage.setItem(draftKey.value, JSON.stringify(draftPayload()))
  draftStatus.value = 'Brouillon enregistré'
  if (statusTimer) clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    draftStatus.value = ''
  }, 1800)
}

function scheduleDraftSave() {
  if (typeof window === 'undefined') return
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(saveDraftNow, 500)
}

function clearDraft() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(draftKey.value)
}

function requestClose() {
  if (draftTimer) clearTimeout(draftTimer)
  saveDraftNow()
  emit('close')
}

type SessionTemplatePayload = {
  name: string
  session_model: string
  definition: Record<string, any>
  description?: string
  for_rotation?: boolean
  default?: boolean
  current?: boolean
}

async function submit() {
  if (!validateAll()) return
  saving.value = true
  globalError.value = ''

  const payload: SessionTemplatePayload = {
    name: form.name.trim(),
    session_model: form.session_model,
    definition: clone(definition),
    for_rotation: form.for_rotation,
    default: form.is_default,
    current: form.current,
  }
  if (form.description.trim()) payload.description = form.description.trim()

  try {
    const response = isEdit.value
        ? await SessionTemplateService.update(props.template!.guid, payload)
        : await SessionTemplateService.create(payload)

    if (response?.success === false || response?.error) {
      globalError.value = response?.error?.message ?? 'L’enregistrement du modèle a échoué.'
      reviewValid.value = false
      return
    }

    clearDraft()
    emit('saved')
  } catch (error: any) {
    globalError.value = error?.message ?? 'Une erreur inattendue est survenue.'
    reviewValid.value = false
  } finally {
    saving.value = false
  }
}

watch(
    () => ({form: clone(form), definition: clone(definition)}),
    () => {
      scheduleDraftSave()
      for (const day of ALL_DAYS) {
        if (!dayErrors[day.value]?.length) continue
        const messages = validateDay(day.value)
        if (messages.length) dayErrors[day.value] = messages
        else delete dayErrors[day.value]
      }
      if (globalError.value && Object.values(definition).some((value) => Array.isArray(value) && value.length > 0)) {
        globalError.value = ''
      }
      reviewValid.value = false
    },
    {deep: true},
)

watch(() => form.name, (value) => {
  if (value.trim()) delete errors.name
  reviewValid.value = false
})

watch(() => form.session_model, (value) => {
  if (value) delete errors.session_model
  reviewValid.value = false
})

watch(selectedModel, (model) => {
  if (!model?.rotation_allowed) form.for_rotation = false
})

onMounted(restoreDraft)
onBeforeUnmount(() => {
  if (draftTimer) clearTimeout(draftTimer)
  if (statusTimer) clearTimeout(statusTimer)
})
</script>

<style scoped>
.field-group {
  @apply flex flex-col gap-1.5;
}

.field-label {
  @apply text-[10.5px] font-bold uppercase tracking-wide text-slate-500;
}

.field {
  @apply w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800
  placeholder-slate-300 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100;
}

.field-error {
  @apply border-red-400 focus:border-red-400 focus:ring-red-100;
}

.err {
  @apply text-[11px] text-red-500;
}

.time-field {
  @apply min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700
  transition focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100;
}

.option-card {
  @apply flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3;
}

.rule-row {
  @apply flex items-center justify-between gap-4 border-b border-slate-100 pb-3 text-xs text-slate-500 last:border-0 last:pb-0;
}

.rule-row strong {
  @apply text-right font-semibold text-slate-700;
}

.shortcut-btn {
  @apply inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600;
}

.day-action-btn {
  @apply inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700;
}

.summary-stat {
  @apply flex flex-col rounded-xl border border-slate-100 bg-slate-50 p-3;
}

.summary-stat span {
  @apply text-[10px] font-medium uppercase tracking-wide text-slate-400;
}

.summary-stat strong {
  @apply mt-1 text-sm font-semibold text-slate-800;
}

.review-row {
  @apply flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0;
}

.review-row dt {
  @apply text-slate-400;
}

.review-row dd {
  @apply text-right font-semibold text-slate-700;
}

.review-error {
  @apply flex w-full items-start gap-2 text-left text-xs text-red-600;
}
</style>