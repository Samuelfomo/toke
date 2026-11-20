<script setup lang="ts">
import { computed } from 'vue';
import { IconCalendarClock, IconCalendarWeek, IconEdit, IconUsers } from '@tabler/icons-vue';

import type {
  AttendanceIssue,
  AttendanceOverview,
  AttendanceStatus,
  BusinessDate,
} from '../types/attendance-statistics.types.js';
import { buildAttendanceTodayOperationalModel } from '../utils/attendance-today.js';

interface Props {
  overview: AttendanceOverview;
  businessToday: BusinessDate;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  exploreStatus: [status: Extract<AttendanceStatus, 'PENDING' | 'LATE' | 'ABSENT'>];
  exploreIssue: [issue: Extract<AttendanceIssue, 'PRESENCE_ON_REST_DAY' | 'OPEN_SESSION'>];
  exploreIssues: [];
}>();

const model = computed(() => buildAttendanceTodayOperationalModel(props.overview, props.businessToday));

const observedAmongScheduledLabel = computed(() => {
  if (!model.value) return '';
  const { scheduledEmployeesWithActivity, scheduledWorkingEmployees } = model.value;
  if (scheduledWorkingEmployees === 0) return 'Aucun collaborateur planifié en travail aujourd’hui.';
  return `${scheduledEmployeesWithActivity} sur ${scheduledWorkingEmployees} collaborateur${scheduledWorkingEmployees > 1 ? 's' : ''} prévu${scheduledWorkingEmployees > 1 ? 's' : ''} ont déjà pointé.`;
});
</script>

<template>
  <section
    v-if="model"
    id="attendance-today-operational"
    class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    aria-labelledby="attendance-today-operational-title"
  >
    <div class="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Situation du jour</p>
        <h2 id="attendance-today-operational-title" class="mt-1 text-lg font-bold text-slate-950 sm:text-xl">
          Ce qui se passe aujourd’hui
        </h2>
        <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Lecture opérationnelle de la journée en cours. Les taux de présence et de ponctualité restent consolidés séparément lorsque les journées deviennent finalisées.
        </p>
      </div>

      <span class="self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 lg:self-auto">
        {{ model.teamSize }} collaborateur{{ model.teamSize > 1 ? 's' : '' }} dans l’équipe
      </span>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <article class="min-w-0 rounded-lg border border-indigo-200 bg-white p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-500">Prévus en journée de travail</p>
            <p class="mt-2 text-2xl font-bold tabular-nums text-slate-950">{{ model.scheduledWorkingEmployees }}</p>
          </div>
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <IconUsers :size="19" aria-hidden="true" />
          </span>
        </div>
        <p class="mt-3 text-xs leading-5 text-slate-500">{{ observedAmongScheduledLabel }}</p>
      </article>

      <article class="min-w-0 rounded-lg border border-emerald-200 bg-white p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-500">Ont pointé aujourd’hui</p>
            <p class="mt-2 text-2xl font-bold tabular-nums text-slate-950">{{ model.employeesWithRecordedActivity }}</p>
          </div>
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <IconCalendarClock :size="19" aria-hidden="true" />
          </span>
        </div>
        <p class="mt-3 text-xs leading-5 text-slate-500">
          {{ model.scheduledEmployeesWithActivity }} prévu{{ model.scheduledEmployeesWithActivity > 1 ? 's' : '' }} en travail ·
          {{ model.restDayWithPresenceEmployees }} présence{{ model.restDayWithPresenceEmployees > 1 ? 's' : '' }} pendant un repos.
        </p>
      </article>

      <button
        type="button"
        class="min-w-0 rounded-lg border border-sky-200 bg-white p-4 text-left transition hover:border-sky-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-default disabled:opacity-60 disabled:hover:border-sky-200 disabled:hover:shadow-none"
        :disabled="model.notSeenScheduledEmployees === 0"
        @click="emit('exploreStatus', 'PENDING')"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-500">Attendus non encore vus</p>
            <p class="mt-2 text-2xl font-bold tabular-nums text-slate-950">{{ model.notSeenScheduledEmployees }}</p>
          </div>
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
            <IconCalendarClock :size="19" aria-hidden="true" />
          </span>
        </div>
        <p class="mt-3 text-xs leading-5 text-slate-500">Aucun pointage enregistré à cet instant. Voir les collaborateurs concernés →</p>
      </button>

      <button
        type="button"
        class="min-w-0 rounded-lg border border-amber-200 bg-white p-4 text-left transition hover:border-amber-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-default disabled:opacity-60 disabled:hover:border-amber-200 disabled:hover:shadow-none"
        :disabled="model.lateObserved === 0"
        @click="emit('exploreStatus', 'LATE')"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-500">Retards observés</p>
            <p class="mt-2 text-2xl font-bold tabular-nums text-slate-950">{{ model.lateObserved }}</p>
          </div>
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <IconCalendarClock :size="19" aria-hidden="true" />
          </span>
        </div>
        <p class="mt-3 text-xs leading-5 text-slate-500">
          {{ model.onTimeObserved }} à l’heure · {{ model.lateObserved }} en retard. Voir les retards du jour →
        </p>
      </button>

      <button
        type="button"
        class="min-w-0 rounded-lg border border-rose-200 bg-white p-4 text-left transition hover:border-rose-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-default disabled:opacity-60 disabled:hover:border-rose-200 disabled:hover:shadow-none"
        :disabled="model.confirmedAbsent === 0"
        @click="emit('exploreStatus', 'ABSENT')"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-500">Absences confirmées</p>
            <p class="mt-2 text-2xl font-bold tabular-nums text-slate-950">{{ model.confirmedAbsent }}</p>
          </div>
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
            <IconUsers :size="19" aria-hidden="true" />
          </span>
        </div>
        <p class="mt-3 text-xs leading-5 text-slate-500">
          Une absence n’est confirmée qu’après la fin de la journée de travail applicable.
        </p>
      </button>
    </div>

    <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <div class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm">
        <span class="inline-flex min-w-0 items-center gap-2 text-slate-600"><IconCalendarWeek :size="17" class="shrink-0 text-slate-500" aria-hidden="true" /> En repos</span>
        <strong class="tabular-nums text-slate-950">{{ model.restDayEmployees }}</strong>
      </div>

      <button
        type="button"
        class="flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50/40 px-3 py-2.5 text-left text-sm transition hover:border-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-default disabled:opacity-60 disabled:hover:border-orange-200"
        :disabled="model.restDayWithPresenceEmployees === 0"
        @click="emit('exploreIssue', 'PRESENCE_ON_REST_DAY')"
      >
        <span class="inline-flex min-w-0 items-center gap-2 text-orange-800"><IconCalendarWeek :size="17" class="shrink-0" aria-hidden="true" /> Présence pendant un repos</span>
        <strong class="tabular-nums text-orange-950">{{ model.restDayWithPresenceEmployees }}</strong>
      </button>

      <button
        type="button"
        class="flex items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2.5 text-left text-sm transition hover:border-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-default disabled:opacity-60 disabled:hover:border-sky-200"
        :disabled="model.openSessionEmployees === 0"
        @click="emit('exploreIssue', 'OPEN_SESSION')"
      >
        <span class="inline-flex min-w-0 items-center gap-2 text-sky-800"><IconCalendarClock :size="17" class="shrink-0" aria-hidden="true" /> Sessions ouvertes</span>
        <strong class="tabular-nums text-sky-950">{{ model.openSessionEmployees }}</strong>
      </button>

      <button
        type="button"
        class="flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50/40 px-3 py-2.5 text-left text-sm transition hover:border-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-default disabled:opacity-60 disabled:hover:border-orange-200"
        :disabled="model.issueCount === 0"
        @click="emit('exploreIssues')"
      >
        <span class="inline-flex min-w-0 items-center gap-2 text-orange-800"><IconEdit :size="17" class="shrink-0" aria-hidden="true" /> Éléments à examiner</span>
        <strong class="tabular-nums text-orange-950">{{ model.issueCount }}</strong>
      </button>
    </div>

    <p v-if="model.undeterminedEmployees > 0" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
      {{ model.undeterminedEmployees }} situation{{ model.undeterminedEmployees > 1 ? 's' : '' }} reste{{ model.undeterminedEmployees > 1 ? 'nt' : '' }} indéterminée{{ model.undeterminedEmployees > 1 ? 's' : '' }} aujourd’hui.
    </p>
  </section>
</template>
