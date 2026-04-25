<template>
  <section class="flex flex-col gap-6 py-5">

    <!-- ═══════════════════════ HEADER + FILTRES ═══════════════════════ -->
    <div class="flex items-center gap-4 bg-white shadow-md rounded-md
            px-5 py-3.5">

      <!-- Logo + titre + badge -->
      <div class="flex items-center gap-3 shrink-0">
        <div class="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="blue" class="w-5 h-5">
            <rect x="2" y="12" width="4" height="10" rx="1"/><rect x="9" y="7" width="4" height="15" rx="1"/>
            <rect x="16" y="2" width="4" height="20" rx="1"/>
          </svg>
        </div>
        <span class="text-xl font-bold text-slate-900 tracking-tight">Tableau de Bord</span>
        <span class="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100
                 px-2.5 py-1 rounded-full">
      {{ employeeCount }} employés
    </span>
      </div>

      <!-- Séparateur -->
      <div class="hidden md:block w-px h-8 bg-slate-200 shrink-0"></div>

      <div class="flex items-center gap-2">

        <!-- JOUR -->
        <button
            @click="selectPreset('day')"
            :class="chipClass('day')"
        >
          📅 Jour
        </button>

        <!-- SEMAINE -->
        <button
            @click="selectPreset('week')"
            :class="chipClass('week')"
        >
          📊 Semaine
        </button>

        <!-- PERSONNALISÉ -->
        <button
            @click="selectPreset('custom')"
            :class="chipClass('custom')"
        >
          🗓️ Période
        </button>

      </div>
      <div class="justify-between items-center gap-2">

        <!-- Date range -->
        <div
            v-if="selectedPreset === 'custom'"
            class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl
                      px-3.5 py-2 focus-within:border-blue-400
                      focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <div class="flex flex-col gap-0.5">
            <label class="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Début</label>
            <input
                type="date"
                v-model="customStartDate"
                :max="customEndDate || today"
                class="border-none bg-transparent text-sm font-semibold text-slate-900
                       outline-none cursor-pointer w-32"
            />
          </div>
          <span class="text-slate-300 font-bold">→</span>
          <div class="flex flex-col gap-0.5">
            <label class="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Fin</label>
            <input
                type="date"
                v-model="customEndDate"
                :min="customStartDate"
                :max="today"
                :disabled="!customStartDate"
                :class="[
                  'border-none bg-transparent text-sm font-semibold text-slate-900 outline-none cursor-pointer w-32',
                  !customStartDate ? 'opacity-40 cursor-not-allowed' : '',
                  customStartDate && !customEndDate ? 'animate-pulse' : ''
                ]"
                @change="onEndDateChange"
            />
          </div>
          <!-- Loader inline -->
          <div v-if="isLoading" class="flex items-center gap-1 pl-1">
              <span v-for="i in 3" :key="i"
                    class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                    :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
              />
          </div>
        </div>
      </div>

      <!-- Picker dates (dropdown inline) -->
      <transition name="slide-fade">
        <div
            v-if="showPeriodPicker"
            class="absolute top-full mt-2 left-0 z-50 bg-white border border-slate-200
             rounded-2xl shadow-xl p-4 flex flex-col gap-3 min-w-[280px]"
        >
          <!-- Bouton Aujourd'hui -->
          <button
              class="w-full text-left text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
              :class="!isAnalyticsMode
          ? 'bg-blue-600 text-white'
          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'"
              @click="switchToNormal"
          >
            📋 Aujourd'hui
          </button>
          <!-- Inputs dates -->
          <div class="flex items-center gap-2">
            <div class="flex flex-col gap-0.5 flex-1">
              <label class="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Début</label>
              <input type="date" v-model="customStartDate" :max="customEndDate || today"
                     class="border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold
                        text-slate-800 outline-none focus:border-blue-400 w-full" />
            </div>
            <span class="text-slate-300 font-bold mt-4">→</span>
            <div class="flex flex-col gap-0.5 flex-1">
              <label class="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Fin</label>
              <input type="date" v-model="customEndDate" :min="customStartDate" :max="today"
                     :disabled="!customStartDate"
                     class="border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold
                        text-slate-800 outline-none focus:border-blue-400 w-full
                        disabled:opacity-40 disabled:cursor-not-allowed"
                     @change="onEndDateChange" />
            </div>
          </div>
          <!-- Loader -->
          <div v-if="isLoading" class="flex justify-center gap-1 py-1">
        <span v-for="i in 3" :key="i"
              class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
              :style="{ animationDelay: `${(i-1)*0.15}s` }" />
          </div>
        </div>
      </transition>

      <!-- Séparateur -->
      <div class="hidden md:block w-px h-8 bg-slate-200 shrink-0"></div>

      <!-- Sélecteur SITES -->
      <div class="flex items-center gap-2.5 border border-slate-200 rounded-xl px-4 py-2.5
              hover:border-blue-300 transition-colors cursor-pointer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             class="w-4 h-4 text-slate-400 shrink-0">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <div class="flex flex-col min-w-0">
          <span class="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Sites</span>
          <span class="text-sm font-semibold text-slate-800">Tous les sites</span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             class="w-4 h-4 text-slate-400 shrink-0">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Bouton Exporter -->
      <button
          class="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5
           text-sm font-semibold text-white bg-blue-600 transition-colors shrink-0"
          @click="$emit('export')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             class="w-4 h-4 text-slate-100"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
          <path d="M11.5 21h-4.5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v5m-5 6h7m-3 -3l3 3l-3 3" />
        </svg>
        Exporter le rapport
      </button>

    </div>

    <!-- ═══════════════════════ KPI CARDS (6) ═══════════════════════ -->
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">

      <!-- 1 · Taux de présence -->
      <div class="relative flex flex-col gap-3 bg-[#F5FCF8] border border-slate-200 rounded-md p-4
              shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span class="text-sm font-semibold text-slate-600">Taux de présence</span>
          </div>
          <button class="text-slate-600 hover:text-slate-900 transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/>
              <circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>
        <p class="text-3xl font-extrabold text-slate-900 tracking-tight leading-none text-center">
          {{ attendanceRate }}<span class="text-xl">%</span>
        </p>
        <div class="flex items-center gap-1.5">
      <span
          class="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md"
          :class="attendanceRate >= 80
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-600'"
      >
        {{ attendanceRate >= 80 ? '↑' : '↓' }} {{ Math.abs(attendanceRate - 80) }}%
      </span>
          <span class="text-xs text-slate-400">vs période précédente</span>
        </div>
      </div>

      <!-- 2 · Ponctualité -->
      <div class="relative flex flex-col gap-3 bg-[#FFFEFC] border border-slate-200 rounded-md p-4
              shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <span class="text-sm font-semibold text-slate-600">Ponctualité</span>
          </div>
          <button class="text-slate-600 hover:text-slate-900 transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/>
              <circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>
        <p class="text-3xl font-extrabold text-slate-900 tracking-tight leading-none text-center">
          {{ punctualityRate }}<span class="text-xl">%</span>
        </p>
        <div class="flex items-center gap-1.5">
      <span class="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md
                   bg-red-50 text-red-600">
        ↓ {{ Math.round(summary.average_delay_minutes) }} min
      </span>
          <span class="text-xs text-slate-400">retard moyen</span>
        </div>
      </div>

      <!-- 3 · Absences -->
      <div
          class="relative flex flex-col gap-3 bg-[linear-gradient(90deg,_rgba(245,245,245,1)_0%,_rgba(242,242,242,1)_87%,_rgba(245,245,245,1)_100%)] rounded-md p-4 shadow-sm
           hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          :class="summary.total_absences > 0
      ? 'border border-red-200'
      : 'border border-slate-200'"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                :class="summary.total_absences > 0 ? 'bg-red-100 text-red-500' : 'bg-slate-50 text-slate-400'"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <span class="text-sm font-semibold text-slate-600">Absences</span>
          </div>
          <button class="text-slate-600 hover:text-slate-900 transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/>
              <circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>
        <p class="text-3xl font-extrabold tracking-tight leading-none text-center"
           :class="summary.total_absences > 0 ? 'text-red-600' : 'text-slate-900'">
          {{ summary.total_absences }}
        </p>
        <div class="flex items-center gap-1.5">
      <span
          v-if="summary.total_absences > 0"
          class="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md
               bg-red-50 text-red-600"
      >
        ↓ {{ summary.justification_status?.without_memo ?? 0 }} sans mémo
      </span>
          <span v-else class="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md
                          bg-emerald-50 text-emerald-700">
        ✓ Équipe complète
      </span>
        </div>
      </div>
      <!-- 4 · Présences hors planning -->
      <div
          class="relative flex flex-col gap-3 bg-[#FAFAFA] rounded-md p-4 shadow-sm
           hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          :class="summary.total_anomaly_off_days > 0
      ? 'ring-1 ring-orange-200'
      : ''"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                :class="summary.total_anomaly_off_days > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-200 text-slate-400'"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <span class="text-sm font-semibold text-slate-600">Hors planning</span>
          </div>
          <button class="text-slate-600 hover:text-slate-900 transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/>
              <circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>
        <div class="flex items-center gap-1.5 justify-center">
          <p class="text-3xl font-extrabold tracking-tight leading-none"
             :class="summary.total_anomaly_off_days > 0 ? 'text-warning' : 'text-slate-500'">
            {{ summary.total_anomaly_off_days }}
          </p>
          <p class="text-xs text-slate-400">Anomalies détectées</p>
        </div>
        <div
            class="text-xs font-semibold px-2 py-1 rounded-lg"
            :class="(summary.total_anomaly_off_days ?? 0) > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'"
        >
          {{ summary.unexpected_presence?.employees_concerned ?? 0 }} employé(s)
        </div>
      </div>

      <!-- 5 · Couverture équipe -->
      <div class="relative flex flex-col gap-3 bg-[radial-gradient(circle,_rgba(215,230,245,1)_100%,_rgba(252,252,252,1)_100%,_rgba(215,230,245,1)_100%)] border border-slate-200 rounded-md p-4
              shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span class="text-sm font-semibold text-slate-600">Couverture équipe</span>
          </div>
          <button class="text-slate-600 hover:text-slate-900 transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/>
              <circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>
        <p class="text-3xl font-extrabold text-slate-900 tracking-tight leading-none text-center">
          {{ coverageRate }}<span class="text-xl">%</span>
        </p>
        <div class="flex items-center gap-1.5">
      <span
          class="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md"
          :class="(summary.team_coverage?.missing_count ?? 0) > 0
          ? 'bg-red-50 text-red-600'
          : 'bg-emerald-50 text-emerald-700'"
      >
        {{ (summary.team_coverage?.missing_count ?? 0) > 0 ? '↓' : '✓' }}
        {{ summary.team_coverage?.missing_count ?? 0 }} manquant(s)
      </span>
        </div>
      </div>

      <!-- 6 · Heures travaillées -->
      <div class="relative flex flex-col gap-3 bg-[radial-gradient(circle,_rgba(248,245,250,1)_100%,_rgba(252,252,252,1)_100%,_rgba(248,245,250,1)_100%)] border border-slate-200 rounded-md p-4
              shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-violet-100 text-violet-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <span class="text-sm font-semibold text-slate-600">Heures travaillées</span>
          </div>
          <button class="text-slate-600 hover:text-slate-900 transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/>
              <circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>
        <p class="text-3xl font-extrabold text-slate-900 tracking-tight leading-none text-center">
          {{ formattedWorkHours }}
        </p>
        <span class="text-xs text-slate-400">
      Moy. {{ summary.average_work_hours_per_day?.toFixed(1) ?? '0.0' }}h/jour
    </span>
      </div>

    </div>

    <!-- ═══════════════════════ BANNIÈRE ANOMALIE ═══════════════════════ -->
    <transition name="slide-fade">
      <div
          v-if="showAnomalyBanner"
          class="flex flex-col sm:flex-row sm:items-center gap-4
               bg-red-50 border border-red-200 rounded-2xl px-5 py-4"
      >
        <!-- Icône + texte -->
        <div class="flex items-center gap-3 shrink-0">
          <div class="w-9 h-9 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-bold text-red-800">Anomalies détectées</p>
            <p class="text-xs text-red-600">
              {{ summary.total_anomaly_off_days }} présence(s) hors planning sur la période
            </p>
          </div>
        </div>

        <!-- Avatars des employés concernés -->
        <div class="flex items-center gap-2 flex-wrap">
          <div
              v-for="occ in (summary.unexpected_presence?.occurrences ?? []).slice(0, 3)"
              :key="occ.employee_guid + occ.date"
              class="w-8 h-8 rounded-full bg-red-200 text-red-800 text-xs font-bold
                   flex items-center justify-center border-2 border-white shadow-sm"
              :title="occ.employee_name"
          >
            {{ occ.employee_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) }}
          </div>
          <span
              v-if="(summary.unexpected_presence?.occurrences?.length ?? 0) > 3"
              class="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full"
          >
            +{{ (summary.unexpected_presence?.occurrences?.length ?? 0) - 3 }}
          </span>
        </div>

        <!-- Dernière anomalie -->
        <div
            v-if="summary.unexpected_presence?.occurrences?.[0]"
            class="flex items-center gap-2 flex-wrap text-xs"
        >
          <span class="text-slate-400">Dernière anomalie :</span>
          <span class="font-semibold text-slate-800">
            {{ summary.unexpected_presence.occurrences[0].employee_name }}
          </span>
          <span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
            Jour OFF
          </span>
          <span class="text-slate-500 flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {{ formatAnomalyDate(summary.unexpected_presence.occurrences[0].date) }}
            à {{ summary.unexpected_presence.occurrences[0].clock_in_time?.slice(0, 5) ?? '—' }}
          </span>
          <span class="text-orange-600 font-semibold">Présence non prévue</span>
        </div>

        <!-- CTA -->
        <a
            :href="summary.unexpected_presence?.action?.deep_link ?? '#'"
            class="ml-auto shrink-0 flex items-center gap-1.5 text-sm font-semibold
                 text-red-700 bg-white border border-red-200 px-4 py-2 rounded-xl
                 hover:bg-red-700 hover:text-white transition-all"
        >
          Voir toutes les anomalies
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </a>
      </div>
    </transition>

  </section>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import type {Summary} from '@/utils/interfaces/stat.interface'

interface Employee {
  id: number | string
  name: string
}

interface Props {
  summary: Summary
  date: string
  employees: Employee[]
  activeStartDate?: string
  activeEndDate?: string
  activeViewMode?: 'normal' | 'analytics'
}

const props = defineProps<Props>()
const emit = defineEmits(['filter-change', 'export'])

const today = new Date().toISOString().split('T')[0]
const selectedEmployee = ref('')
const customStartDate  = ref('')
const customEndDate    = ref('')
const isLoading        = ref(false)
const showPeriodPicker = ref(false)
const togglePeriodPicker = () => { showPeriodPicker.value = !showPeriodPicker.value }

const selectedPreset = ref<'day' | 'week' | 'custom'>('day')

const chipClass = (type: string) => {
  return [
    'px-3 py-1.5 rounded-xl text-sm font-semibold transition-all border',
    selectedPreset.value === type
        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
  ]
}

// ─── KPI Computeds ────────────────────────────────────────────────────────────
const attendanceRate = computed(() => {
  const expected = props.summary?.total_expected_workdays ?? 0
  if (expected === 0) return 0
  const present = (props.summary?.total_present_on_time ?? 0) + (props.summary?.total_late_arrivals ?? 0)
  return Math.round((present / expected) * 100)
})

const punctualityRate = computed(() => {
  const total = (props.summary?.total_present_on_time ?? 0) + (props.summary?.total_late_arrivals ?? 0)
  if (total === 0) return 0
  return Math.round(((props.summary?.total_present_on_time ?? 0) / total) * 100)
})

const periodLabel = computed(() => {
  const start = customStartDate.value
  const end = customEndDate.value

  if (!start && !end) return 'Jour'

  if (start && end) {
    return start === end ? 'Jour' : 'Période'
  }

  return 'Période'
})

const coverageRate = computed(() => props.summary?.team_coverage?.coverage_rate ?? 0)

const employeeCount = computed(() => props.summary?.total_team_members ?? 0)

/** Heures : affichage "156h 30m" */
const formattedWorkHours = computed(() => {
  const total = props.summary?.total_work_hours ?? 0
  const h = Math.floor(total)
  const m = Math.round((total - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
})

const showAnomalyBanner = computed(() =>
    (props.summary?.unexpected_presence?.status === 'critical' ||
        props.summary?.unexpected_presence?.status === 'warning') &&
    (props.summary?.total_anomaly_off_days ?? 0) > 0
)

// ─── Mode analytique ──────────────────────────────────────────────────────────
const isAnalyticsMode = computed(
    () => props.activeViewMode === 'analytics'
        || !!(customStartDate.value && customEndDate.value && customStartDate.value <= customEndDate.value)
)

// ─── Formatage ────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    })

const formatAnomalyDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    })

const displayedRange = computed(() => {
  const start = props.activeStartDate || customStartDate.value
  const end   = props.activeEndDate   || customEndDate.value
  if (props.activeViewMode === 'analytics' && start && end) {
    return `${fmtDate(start)} → ${fmtDate(end)}`
  }
  if (customStartDate.value && customEndDate.value) {
    return `${fmtDate(customStartDate.value)} → ${fmtDate(customEndDate.value)}`
  }
  return fmtDate(today)
})

// ─── Emit principal ───────────────────────────────────────────────────────────
const emitFilters = () => {
  const startDate = isAnalyticsMode.value
      ? (customStartDate.value || props.activeStartDate || today)
      : today
  const endDate = isAnalyticsMode.value
      ? (customEndDate.value || props.activeEndDate || today)
      : today

  emit('filter-change', {
    startDate,
    endDate,
    employeeId: selectedEmployee.value,
    period:     isAnalyticsMode.value ? 'custom' : 'day',
    viewMode:   isAnalyticsMode.value ? 'analytics' : 'normal',
  })
}

const onEndDateChange = async () => {
  if (!customStartDate.value || !customEndDate.value) return
  if (customEndDate.value < customStartDate.value) return
  isLoading.value = true
  await new Promise(r => setTimeout(r, 120))
  emitFilters()
  isLoading.value = false
}

const switchToNormal = () => {
  customStartDate.value = ''
  customEndDate.value   = ''
  isLoading.value       = false
  emit('filter-change', {
    startDate:  today,
    endDate:    today,
    employeeId: selectedEmployee.value,
    period:     'day',
    viewMode:   'normal',
  })
}

const selectPreset = (preset: 'day' | 'week' | 'custom') => {
  selectedPreset.value = preset

  const todayDate = new Date().toISOString().split('T')[0]

  if (preset === 'day') {
    customStartDate.value = todayDate
    customEndDate.value = todayDate
    emitFilters()
  }

  if (preset === 'week') {
    const now = new Date()
    const start = new Date()
    start.setDate(now.getDate() - 7)

    customStartDate.value = start.toISOString().split('T')[0]
    customEndDate.value = todayDate

    emitFilters()
  }

  if (preset === 'custom') {
    // ne déclenche rien tant que l'utilisateur ne choisit pas les dates
  }
}

const detectPresetFromDates = (start?: string, end?: string) => {
  if (!start || !end) return 'day'

  const todayDate = new Date().toISOString().split('T')[0]

  // Jour
  if (start === todayDate && end === todayDate) {
    return 'day'
  }

  // Semaine (7 derniers jours)
  const now = new Date()
  const weekStart = new Date()
  weekStart.setDate(now.getDate() - 7)

  const startStr = weekStart.toISOString().split('T')[0]

  if (start === startStr && end === todayDate) {
    return 'week'
  }

  // Sinon → custom
  return 'custom'
}

watch(
    () => [props.activeStartDate, props.activeEndDate],
    ([start, end]) => {
      selectedPreset.value = detectPresetFromDates(start, end)
    },
    { immediate: true }
)

watch(() => props.activeStartDate, (val) => {
  if (val !== undefined) customStartDate.value = val || ''
})

watch(() => props.activeEndDate, (val) => {
  if (val !== undefined) customEndDate.value = val || ''
})

watch(() => props.activeViewMode, (val) => {
  if (val === 'normal' && !props.activeStartDate && !props.activeEndDate) {
    customStartDate.value = ''
    customEndDate.value   = ''
  }
})

</script>