<template>
  <div class="flex min-h-screen flex-col bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7] text-slate-900">
    <Header />

    <main class="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <button
        type="button"
        class="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-3.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AAD]/40"
        @click="goBack"
      >
        <IconArrowLeft :size="17" />
        Retour au collaborateur
      </button>

      <div v-if="loading" class="space-y-5" aria-busy="true" aria-live="polite">
        <section class="animate-pulse rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
          <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div class="h-24 w-24 shrink-0 rounded-2xl bg-slate-200 sm:h-28 sm:w-28"></div>
            <div class="min-w-0 flex-1 space-y-3">
              <div class="h-7 w-64 max-w-full rounded-lg bg-slate-200"></div>
              <div class="h-4 w-44 max-w-full rounded bg-slate-200"></div>
              <div class="flex flex-wrap gap-2">
                <div class="h-7 w-24 rounded-full bg-slate-200"></div>
                <div class="h-7 w-32 rounded-full bg-slate-200"></div>
              </div>
            </div>
          </div>
        </section>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div v-for="index in 4" :key="index" class="h-28 animate-pulse rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
            <div class="h-3 w-24 rounded bg-slate-200"></div>
            <div class="mt-4 h-7 w-16 rounded bg-slate-200"></div>
          </div>
        </div>

        <div class="grid gap-5 lg:grid-cols-3">
          <div class="h-80 animate-pulse rounded-2xl border border-white/70 bg-white/80 lg:col-span-2"></div>
          <div class="h-80 animate-pulse rounded-2xl border border-white/70 bg-white/80"></div>
        </div>
      </div>

      <section
        v-else-if="pageError || !employee"
        class="rounded-2xl border border-rose-200 bg-white/90 px-5 py-14 text-center shadow-sm backdrop-blur-sm"
      >
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <IconAlertTriangle :size="27" />
        </div>
        <h1 class="mt-4 text-lg font-bold text-slate-900">Impossible d’afficher ce collaborateur</h1>
        <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          {{ pageError || 'Les informations du collaborateur ne sont pas disponibles.' }}
        </p>
        <div class="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#004AAD] px-4 text-sm font-bold text-white transition hover:bg-[#003a8c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AAD]/40"
            @click="loadEmployeePage"
          >
            <IconRefresh :size="16" />
            Réessayer
          </button>
          <button
            type="button"
            class="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            @click="goToTeam"
          >
            Retour à l’équipe
          </button>
        </div>
      </section>

      <template v-else>
        <section class="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-sm backdrop-blur-sm">
          <div class="p-5 sm:p-6">
            <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <div class="relative shrink-0">
                  <img
                    v-if="employee.avatar"
                    :src="employee.avatar"
                    :alt="employee.name"
                    class="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-sm sm:h-28 sm:w-28"
                  />
                  <div
                    v-else
                    class="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-[#004AAD] text-2xl font-bold text-white shadow-sm sm:h-28 sm:w-28"
                    aria-hidden="true"
                  >
                    {{ employee.initials }}
                  </div>
                  <span
                    class="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white"
                    :class="employee.isActive ? 'bg-emerald-500' : 'bg-slate-400'"
                    :title="employee.isActive ? 'Compte actif' : 'Compte inactif'"
                  ></span>
                </div>

                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h1 class="break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                      {{ employee.name }}
                    </h1>
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold"
                      :class="employee.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-100 text-slate-600'"
                    >
                      <span class="h-1.5 w-1.5 rounded-full" :class="employee.isActive ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                      {{ employee.isActive ? 'Actif' : 'Inactif' }}
                    </span>
                  </div>

                  <p class="mt-1 text-sm font-semibold text-slate-600 sm:text-base">
                    {{ employee.position }}
                  </p>

                  <div class="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                    <span v-if="hasValue(employee.department)" class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5">
                      <IconBuilding :size="14" class="text-slate-400" />
                      {{ employee.department }}
                    </span>
                    <span v-if="hasValue(employee.employeeCode)" class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5">
                      <IconId :size="14" class="text-slate-400" />
                      {{ employee.employeeCode }}
                    </span>
                    <span v-if="employee.isManager" class="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-indigo-700">
                      <IconUsersGroup :size="14" />
                      Manager
                    </span>
                  </div>
                </div>
              </div>

              <div class="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-2">
                <button
                  type="button"
                  class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#004AAD] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#003a8c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AAD]/40"
                  @click="editEmployee"
                >
                  <IconEdit :size="16" />
                  Modifier
                </button>
                <button
                  type="button"
                  class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AAD]/30"
                  @click="openMemo"
                >
                  <IconMessage :size="16" />
                  Envoyer un mémo
                </button>
              </div>
            </div>
          </div>

          <div class="grid border-t border-slate-100 sm:grid-cols-3">
            <button
              type="button"
              class="group flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 px-5 text-left transition hover:bg-slate-50 sm:border-b-0 sm:border-r"
              @click="openSchedules"
            >
              <span class="inline-flex items-center gap-2.5 text-sm font-semibold text-slate-700">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <IconCalendarTime :size="17" />
                </span>
                Planning
              </span>
              <IconChevronRight :size="16" class="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
            </button>
            <button
              type="button"
              class="group flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 px-5 text-left transition hover:bg-slate-50 sm:border-b-0 sm:border-r"
              @click="openPunches"
            >
              <span class="inline-flex items-center gap-2.5 text-sm font-semibold text-slate-700">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <IconClock :size="17" />
                </span>
                Pointages
              </span>
              <IconChevronRight :size="16" class="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
            </button>
            <button
              type="button"
              class="group flex min-h-14 items-center justify-between gap-3 px-5 text-left transition hover:bg-slate-50"
              @click="openMemos"
            >
              <span class="inline-flex items-center gap-2.5 text-sm font-semibold text-slate-700">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <IconMessage :size="17" />
                </span>
                Historique des mémos
              </span>
              <IconChevronRight :size="16" class="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
            </button>
          </div>
        </section>

        <div v-if="secondaryLoadWarnings.length" class="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs leading-5 text-amber-900">
          Certaines informations complémentaires ne sont pas disponibles pour le moment. La fiche principale reste utilisable.
        </div>

        <section class="mt-5 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#004AAD]">Présence sur la période</p>
              <h2 class="mt-1 text-lg font-bold text-slate-950">Vue synthétique</h2>
              <p class="mt-1 text-sm text-slate-500">Indicateurs calculés à partir des journées exploitables disponibles.</p>
            </div>
            <label class="block w-full sm:w-56">
              <span class="sr-only">Période analysée</span>
              <select
                v-model="selectedPeriod"
                class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/20"
              >
                <option v-for="option in periodOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>

          <div v-if="entriesLoading" class="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div v-for="index in 4" :key="index" class="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100"></div>
          </div>

          <div v-else class="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <article class="rounded-xl border border-slate-200 bg-white p-4">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Présence</p>
              <p class="mt-2 text-2xl font-bold tabular-nums text-slate-950">{{ attendanceSummary.attendanceRate }}%</p>
              <p class="mt-1 text-xs text-slate-500">{{ attendanceSummary.attended }} journée(s) suivie(s)</p>
            </article>
            <article class="rounded-xl border border-slate-200 bg-white p-4">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ponctualité</p>
              <p class="mt-2 text-2xl font-bold tabular-nums text-slate-950">{{ attendanceSummary.punctualityRate }}%</p>
              <p class="mt-1 text-xs text-slate-500">{{ attendanceSummary.present }} arrivée(s) à l’heure</p>
            </article>
            <article class="rounded-xl border border-amber-200 bg-white p-4">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Retards</p>
              <p class="mt-2 text-2xl font-bold tabular-nums text-amber-700">{{ attendanceSummary.late }}</p>
              <p class="mt-1 text-xs text-slate-500">sur {{ attendanceSummary.attended }} journée(s) avec présence</p>
            </article>
            <article class="rounded-xl border border-rose-200 bg-white p-4">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Absences</p>
              <p class="mt-2 text-2xl font-bold tabular-nums text-rose-700">{{ attendanceSummary.absent }}</p>
              <p class="mt-1 text-xs text-slate-500">absence(s) reconnue(s) sur la période</p>
            </article>
          </div>

          <p v-if="!entriesLoading && attendanceSummary.expected === 0" class="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Aucune journée exploitable n’est disponible pour cette période.
          </p>
        </section>

        <div class="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          <div class="min-w-0 space-y-5">
            <section class="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#004AAD]">Situation du jour</p>
                    <span
                      v-if="currentSessionActive"
                      class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
                    >
                      <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
                      {{ currentSessionLabel }}
                    </span>
                  </div>
                  <h2 class="mt-1 text-lg font-bold text-slate-950">Journée et pointages</h2>
                  <p class="mt-1 text-sm text-slate-500">Consultez une journée précise sans quitter la fiche du collaborateur.</p>
                </div>

                <div class="flex w-full gap-2 sm:w-auto">
                  <input
                    v-model="selectedDate"
                    type="date"
                    :max="today"
                    class="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/20 sm:w-40"
                    @change="loadDailyDetails"
                  />
                  <button
                    type="button"
                    class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-50"
                    :disabled="dailyLoading"
                    aria-label="Actualiser la journée"
                    @click="loadDailyDetails"
                  >
                    <IconRefresh :size="16" :class="dailyLoading ? 'animate-spin' : ''" />
                  </button>
                </div>
              </div>

              <div v-if="currentSessionActive" class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                  <p class="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Session en cours</p>
                  <p class="mt-1.5 text-sm font-bold text-slate-900">Depuis {{ formatTime(activeTodaySession?.started_at) }}</p>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Temps net</p>
                  <p class="mt-1.5 text-sm font-bold text-slate-900">{{ formatDecimalHours(todayDetails?.work_hours?.net_work_hours) }}</p>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Pauses</p>
                  <p class="mt-1.5 text-sm font-bold text-slate-900">{{ formatPauseMinutes(todayDetails?.work_hours?.total_pause_minutes) }}</p>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Site</p>
                  <p class="mt-1.5 truncate text-sm font-bold text-slate-900">{{ activeTodaySession?.site?.name ?? 'Non renseigné' }}</p>
                </div>
              </div>

              <div v-if="dailyLoading" class="mt-5 grid animate-pulse gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div v-for="index in 4" :key="index" class="h-20 rounded-xl bg-slate-100"></div>
              </div>

              <div v-else-if="dailyDetails" class="mt-5">
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div class="rounded-xl border p-4" :class="dailyStatusClasses(dailyDetails.daily_status?.status)">
                    <p class="text-[10px] font-bold uppercase tracking-wide opacity-70">Statut</p>
                    <p class="mt-1.5 text-base font-bold">{{ dailyStatusLabel(dailyDetails.daily_status?.status) }}</p>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-white p-4">
                    <p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Heure prévue</p>
                    <p class="mt-1.5 text-base font-bold text-slate-900">{{ dailyDetails.daily_status?.scheduled_start ?? 'Non prévue' }}</p>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-white p-4">
                    <p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Arrivée enregistrée</p>
                    <p class="mt-1.5 text-base font-bold text-slate-900">{{ dailyDetails.daily_status?.actual_start ?? 'Non enregistrée' }}</p>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-white p-4">
                    <p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Temps net</p>
                    <p class="mt-1.5 text-base font-bold text-slate-900">{{ formatDecimalHours(dailyDetails.work_hours?.net_work_hours) }}</p>
                  </div>
                </div>

                <div v-if="dailyDetails.daily_status?.delay_minutes !== null && dailyDetails.daily_status?.delay_minutes !== undefined" class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Arrivée enregistrée avec <strong>{{ Math.max(0, Number(dailyDetails.daily_status.delay_minutes)) }} minute(s)</strong> d’écart par rapport à l’heure prévue.
                </div>

                <div v-if="dailyDetails.anomalies?.length" class="mt-4 rounded-xl border border-orange-200 bg-orange-50/70 p-4">
                  <div class="flex items-center gap-2 text-sm font-bold text-orange-900">
                    <IconAlertCircle :size="17" />
                    Éléments à examiner
                  </div>
                  <ul class="mt-2 space-y-1.5 text-sm leading-5 text-orange-900/80">
                    <li v-for="(item, index) in dailyDetails.anomalies" :key="`${item.type ?? 'item'}-${index}`" class="flex gap-2">
                      <span aria-hidden="true">•</span>
                      <span>{{ item.description ?? 'Une situation nécessite une vérification.' }}</span>
                    </li>
                  </ul>
                </div>

                <div class="mt-5 border-t border-slate-100 pt-5">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h3 class="text-sm font-bold text-slate-900">Chronologie des pointages</h3>
                      <p class="mt-0.5 text-xs text-slate-500">Événements enregistrés pour la journée sélectionnée.</p>
                    </div>
                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {{ dailyDetails.punch_history?.length ?? 0 }} événement(s)
                    </span>
                  </div>

                  <div v-if="dailyDetails.punch_history?.length" class="mt-4 space-y-2">
                    <article
                      v-for="(event, index) in dailyDetails.punch_history"
                      :key="`${event.timestamp ?? index}-${event.punch_type ?? index}`"
                      class="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                    >
                      <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <IconClock :size="16" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <p class="text-sm font-bold text-slate-800">{{ punchTypeLabel(event.punch_type) }}</p>
                          <time class="text-xs font-semibold tabular-nums text-slate-500">{{ formatDateTime(event.timestamp) }}</time>
                        </div>
                        <p v-if="event.location?.name && event.location.name !== 'Unknown'" class="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                          <IconMapPin :size="13" class="shrink-0" />
                          <span class="truncate">{{ event.location.name }}</span>
                        </p>
                      </div>
                    </article>
                  </div>
                  <p v-else class="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                    Aucun pointage détaillé n’est disponible pour cette journée.
                  </p>
                </div>
              </div>

              <p v-else class="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                Les détails de cette journée ne sont pas disponibles.
              </p>
            </section>

            <section class="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#004AAD]">Activité récente</p>
                  <h2 class="mt-1 text-lg font-bold text-slate-950">Derniers enregistrements</h2>
                  <p class="mt-1 text-sm text-slate-500">Aperçu rapide des dernières informations disponibles.</p>
                </div>
                <button
                  type="button"
                  class="hidden min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:inline-flex"
                  @click="openPunches"
                >
                  Tout voir
                  <IconChevronRight :size="14" />
                </button>
              </div>

              <div v-if="entriesLoading" class="mt-4 space-y-3 animate-pulse">
                <div v-for="index in 4" :key="index" class="flex items-center gap-3">
                  <div class="h-9 w-9 rounded-xl bg-slate-100"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-3 w-36 rounded bg-slate-100"></div>
                    <div class="h-3 w-56 max-w-full rounded bg-slate-100"></div>
                  </div>
                </div>
              </div>

              <div v-else-if="recentEntries.length" class="mt-4 divide-y divide-slate-100">
                <article v-for="(entry, index) in recentEntries" :key="entry.guid ?? entry.id ?? index" class="flex min-w-0 items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" :class="entryToneClasses(entry)">
                    <IconActivity :size="17" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <p class="text-sm font-bold text-slate-800">{{ entryStatusLabel(entry) }}</p>
                      <time class="text-xs font-medium text-slate-400">{{ formatDateTime(entryDateValue(entry)) }}</time>
                    </div>
                    <p class="mt-0.5 truncate text-xs text-slate-500">{{ entryDescription(entry) }}</p>
                  </div>
                </article>
              </div>
              <p v-else class="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Aucun enregistrement récent disponible.
              </p>
            </section>
          </div>

          <aside class="min-w-0 space-y-5">
            <section class="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#004AAD]">Organisation du travail</p>
                  <h2 class="mt-1 text-base font-bold text-slate-950">Profil de planning</h2>
                </div>
                <button
                  type="button"
                  class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                  aria-label="Ouvrir le planning"
                  @click="openSchedules"
                >
                  <IconChevronRight :size="16" />
                </button>
              </div>

              <div v-if="planningLoading" class="mt-4 space-y-3 animate-pulse">
                <div class="h-14 rounded-xl bg-slate-100"></div>
                <div class="h-14 rounded-xl bg-slate-100"></div>
              </div>

              <div v-else-if="planningProfile" class="mt-4 space-y-3">
                <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                  <span class="text-xs font-semibold text-slate-500">Mode</span>
                  <span class="rounded-full px-2.5 py-1 text-[11px] font-bold" :class="planningModeClasses(planningProfile.planning_mode)">
                    {{ planningModeLabel(planningProfile.planning_mode) }}
                  </span>
                </div>
                <div v-if="planningProfile.fixed_session_template?.name" class="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                  <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Horaire fixe</p>
                  <p class="mt-1 text-sm font-bold text-slate-800">{{ planningProfile.fixed_session_template.name }}</p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="rounded-xl border border-slate-200 bg-white p-3">
                    <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Ordre rotation</p>
                    <p class="mt-1 text-sm font-bold text-slate-800">{{ planningProfile.rotation_order ?? '—' }}</p>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-white p-3">
                    <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Limite hebdo.</p>
                    <p class="mt-1 text-sm font-bold text-slate-800">{{ formatWeeklyMinutes(planningProfile.max_weekly_minutes) }}</p>
                  </div>
                </div>
                <p class="flex items-center gap-2 text-xs font-semibold" :class="planningProfile.active ? 'text-emerald-700' : 'text-slate-500'">
                  <span class="h-2 w-2 rounded-full" :class="planningProfile.active ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                  {{ planningProfile.active ? 'Profil actif' : 'Profil désactivé' }}
                </p>
              </div>

              <div v-else class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p class="text-sm font-bold text-amber-900">Profil à configurer</p>
                <p class="mt-1 text-xs leading-5 text-amber-800/80">Aucun profil de planning n’est actuellement associé à ce collaborateur.</p>
                <button type="button" class="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:underline" @click="openSchedules">
                  Gérer le planning
                  <IconChevronRight :size="14" />
                </button>
              </div>
            </section>

            <section class="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
              <div class="flex items-center gap-2.5">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <IconBriefcase :size="18" />
                </div>
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Informations</p>
                  <h2 class="text-sm font-bold text-slate-900">Professionnelles</h2>
                </div>
              </div>

              <dl class="mt-4 divide-y divide-slate-100">
                <div class="flex items-start justify-between gap-4 py-2.5 first:pt-0">
                  <dt class="text-xs text-slate-500">Poste</dt>
                  <dd class="max-w-[65%] text-right text-xs font-bold text-slate-800">{{ employee.position }}</dd>
                </div>
                <div class="flex items-start justify-between gap-4 py-2.5">
                  <dt class="text-xs text-slate-500">Département</dt>
                  <dd class="max-w-[65%] text-right text-xs font-bold text-slate-800">{{ employee.department }}</dd>
                </div>
                <div class="flex items-start justify-between gap-4 py-2.5">
                  <dt class="text-xs text-slate-500">Matricule</dt>
                  <dd class="max-w-[65%] break-all text-right text-xs font-bold text-slate-800">{{ employee.employeeCode }}</dd>
                </div>
                <div class="flex items-start justify-between gap-4 py-2.5 last:pb-0">
                  <dt class="text-xs text-slate-500">Date d’embauche</dt>
                  <dd class="max-w-[65%] text-right text-xs font-bold text-slate-800">{{ formatDate(employee.hireDate) }}</dd>
                </div>
              </dl>
            </section>

            <section class="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
              <div class="flex items-center gap-2.5">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <IconUser :size="18" />
                </div>
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Coordonnées</p>
                  <h2 class="text-sm font-bold text-slate-900">Contact</h2>
                </div>
              </div>

              <div class="mt-4 space-y-2">
                <a
                  v-if="hasValue(employee.email)"
                  :href="`mailto:${employee.email}`"
                  class="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-sky-200 hover:bg-sky-50/40"
                >
                  <IconMail :size="17" class="shrink-0 text-slate-400 group-hover:text-sky-600" />
                  <span class="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{{ employee.email }}</span>
                  <IconChevronRight :size="14" class="shrink-0 text-slate-300" />
                </a>
                <a
                  v-if="hasValue(employee.phone)"
                  :href="`tel:${employee.phone}`"
                  class="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <IconPhone :size="17" class="shrink-0 text-slate-400 group-hover:text-emerald-600" />
                  <span class="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{{ employee.phone }}</span>
                  <IconChevronRight :size="14" class="shrink-0 text-slate-300" />
                </a>
                <div v-if="hasValue(employee.country)" class="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <IconWorld :size="17" class="shrink-0 text-slate-400" />
                  <span class="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{{ employee.country }}</span>
                </div>
              </div>
            </section>

            <section v-if="employee.roles.length" class="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
              <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Accès</p>
              <h2 class="mt-0.5 text-sm font-bold text-slate-900">Rôles attribués</h2>
              <div class="mt-3 flex flex-wrap gap-2">
                <span v-for="(role, index) in employee.roles" :key="role.guid ?? role.id ?? index" class="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                  {{ roleLabel(role) }}
                </span>
              </div>
            </section>
          </aside>
        </div>
      </template>
    </main>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconActivity,
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowLeft,
  IconBriefcase,
  IconBuilding,
  IconCalendarTime,
  IconChevronRight,
  IconClock,
  IconEdit,
  IconId,
  IconMail,
  IconMapPin,
  IconMessage,
  IconPhone,
  IconRefresh,
  IconUser,
  IconUsersGroup,
  IconWorld,
} from '@tabler/icons-vue'

import Header from '@/views/components/header.vue'
import Footer from '@/views/components/footer.vue'
import HeadBuilder from '@/utils/HeadBuilder'
import EntriesService from '@/service/EntriesService'
import EmployeeDetailsService from '@/service/EmployeeDetailsService'
import { useTeamStore } from '@/stores/teamStore'
import { useUserStore } from '@/stores/userStore'

type PeriodKey = 'current_month' | 'previous_month' | 'last_30_days' | 'all'

interface EmployeeViewModel {
  guid: string
  name: string
  email: string
  position: string
  department: string
  employeeCode: string
  hireDate: string | null
  country: string
  phone: string
  avatar: string | null
  initials: string
  isActive: boolean
  isManager: boolean
  roles: any[]
}

interface PlanningProfile {
  guid?: string
  planning_mode?: 'FIXED' | 'ROTATING' | 'EXCLUDED' | string
  fixed_session_template?: { guid?: string; name?: string } | null
  rotation_order?: number | null
  max_weekly_minutes?: number | null
  active?: boolean
}

const route = useRoute()
const router = useRouter()
const teamStore = useTeamStore()
const userStore = useUserStore()

const loading = ref(true)
const pageError = ref('')
const employee = ref<EmployeeViewModel | null>(null)
const entriesData = ref<any[]>([])
const entriesLoading = ref(false)
const todayDetails = ref<any | null>(null)
const dailyDetails = ref<any | null>(null)
const planningProfile = ref<PlanningProfile | null>(null)

const dailyLoading = ref(false)
const planningLoading = ref(false)
const secondaryLoadWarnings = ref<string[]>([])

const now = new Date()
const today = toDateKey(now)
const selectedDate = ref(today)
const selectedPeriod = ref<PeriodKey>('current_month')

const periodOptions: Array<{ value: PeriodKey; label: string }> = [
  { value: 'current_month', label: 'Ce mois' },
  { value: 'previous_month', label: 'Mois précédent' },
  { value: 'last_30_days', label: '30 derniers jours' },
  { value: 'all', label: 'Toutes les données' },
]

const employeeGuid = computed(() => String(route.params.id ?? ''))
const managerGuid = computed(() => userStore.user?.guid ?? '')

function hasValue(value: unknown): boolean {
  return Boolean(value && String(value).trim() && String(value).trim() !== 'N/A')
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDate(value: unknown): Date | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value: unknown): string {
  const date = parseDate(value)
  if (!date) return 'Non renseignée'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value: unknown): string {
  const date = parseDate(value)
  if (!date) return 'Date non disponible'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatTime(value: unknown): string {
  const date = parseDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDecimalHours(value: unknown): string {
  const hours = Number(value)
  if (!Number.isFinite(hours) || hours < 0) return 'Non disponible'
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  return `${wholeHours}h ${String(minutes).padStart(2, '0')}m`
}

function formatPauseMinutes(value: unknown): string {
  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes < 0) return 'Non disponible'
  const hours = Math.floor(minutes / 60)
  const remainder = Math.round(minutes % 60)
  return hours ? `${hours}h ${String(remainder).padStart(2, '0')}m` : `${remainder} min`
}

function formatWeeklyMinutes(value: unknown): string {
  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Règle générale'
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

function responsePayload(response: any): any {
  return response?.data?.data ?? response?.data ?? response ?? null
}

function employeeInitials(firstName: string, lastName: string, fullName: string): string {
  if (firstName || lastName) {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?'
  }
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?'
}

function mapEmployee(foundEmployee: any): EmployeeViewModel {
  const firstName = foundEmployee.firstName ?? foundEmployee.first_name ?? ''
  const lastName = foundEmployee.lastName ?? foundEmployee.last_name ?? ''
  const fullName = foundEmployee.name ?? (`${firstName} ${lastName}`.trim() || 'Collaborateur')
  const roles = Array.isArray(foundEmployee.roles) ? foundEmployee.roles : []

  return {
    guid: foundEmployee.guid,
    name: fullName,
    email: foundEmployee.email ?? '',
    position:
      foundEmployee.position ??
      foundEmployee.jobTitle ??
      foundEmployee.job_title ??
      roles[0]?.role ??
      roles[0]?.name ??
      'Poste non renseigné',
    department: foundEmployee.department ?? 'Non renseigné',
    employeeCode: foundEmployee.employeeCode ?? foundEmployee.employee_code ?? 'Non renseigné',
    hireDate: foundEmployee.hireDate ?? foundEmployee.hire_date ?? null,
    country: foundEmployee.country ?? 'Non renseigné',
    phone: foundEmployee.phoneNumber ?? foundEmployee.phone_number ?? foundEmployee.phone ?? '',
    avatar: foundEmployee.avatar ?? foundEmployee.avatar_url ?? null,
    initials: foundEmployee.initials ?? employeeInitials(firstName, lastName, fullName),
    isActive: foundEmployee.isActive ?? foundEmployee.active ?? true,
    isManager: Boolean(foundEmployee.isManager ?? roles.some((role: any) => {
      const label = String(role?.code ?? role?.name ?? role?.role ?? '').toLowerCase()
      return label.includes('manager') || label.includes('responsable')
    })),
    roles,
  }
}

function entryDateValue(entry: any): unknown {
  return (
    entry?.check_in_time ??
    entry?.clocked_at ??
    entry?.session_start_at ??
    entry?.business_date ??
    entry?.date ??
    entry?.created_at
  )
}

function normalizeEntryStatus(entry: any): string {
  const raw = String(
    entry?.status ??
    entry?.daily_status?.status ??
    entry?.attendance_status ??
    '',
  ).toUpperCase()

  if (raw === 'ON_TIME') return 'PRESENT'
  if (raw === 'OFF_DUTY') return 'REST_DAY'
  return raw
}

function periodBounds(period: PeriodKey): { start: Date | null; end: Date | null } {
  const reference = new Date()
  reference.setHours(23, 59, 59, 999)

  if (period === 'all') return { start: null, end: null }

  if (period === 'last_30_days') {
    const start = new Date(reference)
    start.setDate(start.getDate() - 29)
    start.setHours(0, 0, 0, 0)
    return { start, end: reference }
  }

  const year = reference.getFullYear()
  const month = reference.getMonth()

  if (period === 'previous_month') {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59, 999)
    return { start, end }
  }

  return {
    start: new Date(year, month, 1),
    end: reference,
  }
}

const filteredEntries = computed(() => {
  const { start, end } = periodBounds(selectedPeriod.value)
  return entriesData.value.filter((entry) => {
    const date = parseDate(entryDateValue(entry))
    if (!date) return false
    if (start && date < start) return false
    if (end && date > end) return false
    return true
  })
})

const attendanceSummary = computed(() => {
  const byDate = new Map<string, string>()

  filteredEntries.value
    .slice()
    .sort((a, b) => {
      const aDate = parseDate(entryDateValue(a))?.getTime() ?? 0
      const bDate = parseDate(entryDateValue(b))?.getTime() ?? 0
      return aDate - bDate
    })
    .forEach((entry) => {
      const date = parseDate(entryDateValue(entry))
      const status = normalizeEntryStatus(entry)
      if (!date || !['PRESENT', 'LATE', 'ABSENT'].includes(status)) return
      byDate.set(toDateKey(date), status)
    })

  const statuses = [...byDate.values()]
  const present = statuses.filter((status) => status === 'PRESENT').length
  const late = statuses.filter((status) => status === 'LATE').length
  const absent = statuses.filter((status) => status === 'ABSENT').length
  const attended = present + late
  const expected = attended + absent

  return {
    present,
    late,
    absent,
    attended,
    expected,
    attendanceRate: expected ? Math.round((attended / expected) * 100) : 0,
    punctualityRate: attended ? Math.round((present / attended) * 100) : 0,
  }
})

const recentEntries = computed(() =>
  entriesData.value
    .slice()
    .sort((a, b) => {
      const aDate = parseDate(entryDateValue(a))?.getTime() ?? 0
      const bDate = parseDate(entryDateValue(b))?.getTime() ?? 0
      return bDate - aDate
    })
    .slice(0, 6),
)

const activeTodaySession = computed(() =>
  todayDetails.value?.sessions?.find((session: any) => session?.is_active) ?? null,
)

const currentSessionActive = computed(() => Boolean(activeTodaySession.value))

const currentSessionLabel = computed(() => {
  if (!activeTodaySession.value) return 'Aucune session active'
  if (activeTodaySession.value?.is_on_pause) return 'En pause'
  if (todayDetails.value?.daily_status?.is_currently_working) return 'En poste'
  return 'Session active'
})

function dailyStatusLabel(status: unknown): string {
  return {
    PRESENT: 'Présent',
    LATE: 'En retard',
    ABSENT: 'Absent',
    OFF_DUTY: 'Repos',
    REST_DAY: 'Repos',
    PENDING: 'En attente',
  }[String(status ?? '').toUpperCase()] ?? 'Non déterminé'
}

function dailyStatusClasses(status: unknown): string {
  return {
    PRESENT: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    LATE: 'border-amber-200 bg-amber-50 text-amber-800',
    ABSENT: 'border-rose-200 bg-rose-50 text-rose-800',
    OFF_DUTY: 'border-slate-200 bg-slate-50 text-slate-700',
    REST_DAY: 'border-slate-200 bg-slate-50 text-slate-700',
    PENDING: 'border-sky-200 bg-sky-50 text-sky-800',
  }[String(status ?? '').toUpperCase()] ?? 'border-slate-200 bg-slate-50 text-slate-700'
}

function punchTypeLabel(type: unknown): string {
  return {
    CLOCK_IN: 'Arrivée',
    CLOCK_OUT: 'Départ',
    PAUSE_START: 'Début de pause',
    PAUSE_END: 'Fin de pause',
    EXTERNAL_MISSION: 'Mission extérieure',
  }[String(type ?? '').toUpperCase()] ?? 'Pointage'
}

function entryStatusLabel(entry: any): string {
  const status = normalizeEntryStatus(entry)
  return {
    PRESENT: 'Présence enregistrée',
    LATE: 'Arrivée en retard',
    ABSENT: 'Absence enregistrée',
    REST_DAY: 'Journée de repos',
    PENDING: 'Journée en attente',
  }[status] ?? punchTypeLabel(entry?.pointage_type ?? entry?.punch_type)
}

function entryToneClasses(entry: any): string {
  const status = normalizeEntryStatus(entry)
  if (status === 'LATE') return 'bg-amber-50 text-amber-600'
  if (status === 'ABSENT') return 'bg-rose-50 text-rose-600'
  if (status === 'PRESENT') return 'bg-emerald-50 text-emerald-600'
  return 'bg-slate-100 text-slate-500'
}

function entryDescription(entry: any): string {
  const site = entry?.site?.name ?? entry?.site_name ?? entry?.location_name
  const start = entry?.check_in_time ?? entry?.session_start_at
  const end = entry?.check_out_time ?? entry?.session_end_at

  if (start && end) return `${formatTime(start)} → ${formatTime(end)}${site ? ` · ${site}` : ''}`
  if (start) return `À partir de ${formatTime(start)}${site ? ` · ${site}` : ''}`
  if (site) return site
  return 'Détail disponible dans les pointages.'
}

function planningModeLabel(mode: unknown): string {
  return {
    FIXED: 'Horaire fixe',
    ROTATING: 'Rotation',
    EXCLUDED: 'Hors planification',
  }[String(mode ?? '').toUpperCase()] ?? 'Non défini'
}

function planningModeClasses(mode: unknown): string {
  return {
    FIXED: 'bg-indigo-50 text-indigo-700',
    ROTATING: 'bg-emerald-50 text-emerald-700',
    EXCLUDED: 'bg-slate-100 text-slate-600',
  }[String(mode ?? '').toUpperCase()] ?? 'bg-slate-100 text-slate-600'
}

function roleLabel(role: any): string {
  return role?.name ?? role?.role ?? role?.code ?? 'Rôle'
}

async function ensureEmployeeInStore(guid: string): Promise<any | null> {
  let found = teamStore.getEmployeeById(guid)
  if (found) return found

  if (managerGuid.value) {
    try {
      await teamStore.loadTeam(managerGuid.value, true)
      found = teamStore.getEmployeeById(guid)
    } catch (error) {
      console.warn('Impossible de recharger l’équipe', error)
    }
  }

  return found ?? null
}

async function loadEntries(): Promise<void> {
  entriesLoading.value = true
  try {
    const response = await EntriesService.listEntries(employeeGuid.value)
    const payload = responsePayload(response)
    const values = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(response?.data)
          ? response.data
          : []
    entriesData.value = values
  } catch (error) {
    console.warn('Impossible de charger l’historique des entrées', error)
    entriesData.value = []
    secondaryLoadWarnings.value.push('entries')
  } finally {
    entriesLoading.value = false
  }
}

async function loadPlanningProfile(): Promise<void> {
  planningLoading.value = true
  try {
    const response = await EmployeeDetailsService.planningProfile(employeeGuid.value)
    const payload = responsePayload(response)
    planningProfile.value =
      payload?.employee_planning_profile ??
      payload?.data?.employee_planning_profile ??
      null
  } catch (error) {
    console.warn('Impossible de charger le profil de planning', error)
    planningProfile.value = null
    secondaryLoadWarnings.value.push('planning-profile')
  } finally {
    planningLoading.value = false
  }
}

async function loadDailyDetails(): Promise<void> {
  if (!managerGuid.value || !employeeGuid.value || !selectedDate.value) return

  dailyLoading.value = true
  try {
    const response = await EmployeeDetailsService.daily(
      employeeGuid.value,
      managerGuid.value,
      selectedDate.value,
    )
    const payload = responsePayload(response)
    dailyDetails.value = payload?.employees?.[0] ?? payload?.data?.employees?.[0] ?? null
    if (selectedDate.value === today) todayDetails.value = dailyDetails.value
  } catch (error) {
    console.warn('Impossible de charger la journée détaillée', error)
    dailyDetails.value = null
    if (!secondaryLoadWarnings.value.includes('daily-details')) {
      secondaryLoadWarnings.value.push('daily-details')
    }
  } finally {
    dailyLoading.value = false
  }
}

async function loadEmployeePage(): Promise<void> {
  loading.value = true
  pageError.value = ''
  secondaryLoadWarnings.value = []

  try {
    if (!employeeGuid.value) throw new Error('Identifiant du collaborateur manquant.')

    const foundEmployee = await ensureEmployeeInStore(employeeGuid.value)
    if (!foundEmployee) throw new Error('Ce collaborateur n’est pas disponible dans votre équipe.')

    employee.value = mapEmployee(foundEmployee)

    HeadBuilder.apply({
      title: `${employee.value.name} — Toké`,
      meta: { viewport: 'width=device-width, initial-scale=1.0' },
    })

    // La fiche principale s'affiche immédiatement. Les données complémentaires
    // se chargent ensuite dans leurs propres sections sans bloquer toute la page.
    loading.value = false
    void Promise.allSettled([
      loadEntries(),
      loadPlanningProfile(),
      loadDailyDetails(),
    ])
  } catch (error: any) {
    employee.value = null
    pageError.value = error?.message ?? 'Impossible de charger cette fiche.'
  } finally {
    loading.value = false
  }
}

function goBack(): void {
  if (employeeGuid.value) {
    router.push({ name: 'profileCard', params: { id: employeeGuid.value } })
    return
  }
  router.push({ name: 'equipe' })
}

function goToTeam(): void {
  router.push({ name: 'equipe' })
}

function editEmployee(): void {
  if (!employeeGuid.value) return
  router.push({ name: 'employeeEdit', params: { id: employeeGuid.value } })
}

function openSchedules(): void {
  if (!employeeGuid.value) return
  router.push({ name: 'employeeSchedulesView', params: { id: employeeGuid.value } })
}

function openPunches(): void {
  if (!employeeGuid.value) return
  router.push({ name: 'employeeAttendanceView', params: { id: employeeGuid.value } })
}

function openMemos(): void {
  if (!employeeGuid.value) return
  router.push({ name: 'employeeMemosView', params: { id: employeeGuid.value } })
}

function openMemo(): void {
  if (!employee.value) return
  router.push({
    name: 'memoList',
    query: {
      action: 'create',
      employeeGuid: employee.value.guid,
      employeeName: employee.value.name,
    },
  })
}

onMounted(loadEmployeePage)
</script>
