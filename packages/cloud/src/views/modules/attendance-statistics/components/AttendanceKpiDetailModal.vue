<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useAccessibleDialog } from '../composables/useAccessibleDialog.js';
import type {
  AttendanceEmployeeDayOverview,
  AttendanceOverview,
  AttendanceStatus,
} from '../types/attendance-statistics.types.js';
import type {
  AttendanceDecisionKpiId,
  AttendanceDecisionKpiSegment,
} from '../utils/attendance-kpis.js';
import { formatBusinessDate } from '../utils/business-date.js';
import { formatBusinessTime } from '../utils/business-time.js';
import { formatDelayMinutes } from '../utils/duration.js';
import { formatPercentage } from '../utils/percentage.js';

interface Selection {
  id: AttendanceDecisionKpiId;
  segment: AttendanceDecisionKpiSegment;
}

interface Props {
  open: boolean;
  overview: AttendanceOverview;
  selection: Selection | null;
}

interface DetailRow {
  key: string;
  employeeGuid: string;
  employeeName: string;
  day: AttendanceEmployeeDayOverview;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  openEmployee: [payload: { employeeGuid: string; date: string }];
}>();

const dialogRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLElement | null>(null);
const page = ref(1);
const pageSize = 8;

watch(() => props.selection, () => { page.value = 1; });

useAccessibleDialog({
  open: computed(() => props.open),
  dialogRef,
  initialFocusRef: closeButtonRef,
  close: () => emit('close'),
});

function matchesSelection(status: AttendanceStatus, rateEligible: boolean): boolean {
  if (!props.selection || !rateEligible) return false;

  if (props.selection.id === 'attendance_rate') {
    return props.selection.segment === 'primary'
      ? status === 'PRESENT' || status === 'LATE'
      : status === 'ABSENT';
  }

  if (props.selection.id === 'punctuality_rate') {
    return props.selection.segment === 'primary' ? status === 'PRESENT' : status === 'LATE';
  }

  return false;
}

const rows = computed<DetailRow[]>(() => {
  if (!props.selection || props.selection.id === 'adoption_rate') return [];

  const result: DetailRow[] = [];
  for (const employee of props.overview.employees) {
    for (const day of employee.days) {
      if (!matchesSelection(day.status, day.rateEligible)) continue;
      result.push({
        key: `${employee.employeeGuid}:${day.date}`,
        employeeGuid: employee.employeeGuid,
        employeeName: employee.employeeName,
        day,
      });
    }
  }

  return result.sort((a, b) => a.day.date.localeCompare(b.day.date) || a.employeeName.localeCompare(b.employeeName));
});

const pageCount = computed(() => Math.max(1, Math.ceil(rows.value.length / pageSize)));
const pagedRows = computed(() => {
  if (page.value > pageCount.value) page.value = pageCount.value;
  const start = (page.value - 1) * pageSize;
  return rows.value.slice(start, start + pageSize);
});

const title = computed(() => {
  if (!props.selection) return '';
  if (props.selection.id === 'attendance_rate') {
    return props.selection.segment === 'primary'
      ? 'Détail des rotations couvertes'
      : 'Détail des rotations non couvertes';
  }
  if (props.selection.id === 'punctuality_rate') {
    return props.selection.segment === 'primary'
      ? 'Détail des rotations à l’heure'
      : 'Détail des rotations en retard';
  }
  return 'Adoption du pointage';
});

const summary = computed(() => {
  if (!props.selection) return '';
  const rates = props.overview.summary.rates;

  if (props.selection.id === 'attendance_rate') {
    if (props.selection.segment === 'primary') {
      return `${rates.attendedWorkingDays} rotations couvertes sur ${rates.employeeWorkingDaysExpected} attendues (${formatPercentage(rates.attendanceRate)}).`;
    }
    return `${rates.absentWorkingDays} rotations non couvertes sur ${rates.employeeWorkingDaysExpected} attendues (${formatPercentage(rates.absenceRate)}).`;
  }

  if (props.selection.id === 'punctuality_rate') {
    if (props.selection.segment === 'primary') {
      return `${rates.onTimeWorkingDays} rotations à l’heure sur ${rates.attendedWorkingDays} couvertes (${formatPercentage(rates.punctualityRate)}).`;
    }
    return `${rates.lateWorkingDays} rotations en retard sur ${rates.attendedWorkingDays} couvertes (${formatPercentage(rates.lateRate)}).`;
  }

  return 'La règle métier et les données nécessaires au calcul de l’adoption ne sont pas encore disponibles.';
});

const statusLabel = computed(() => {
  if (!props.selection) return '';
  if (props.selection.id === 'attendance_rate') return props.selection.segment === 'primary' ? 'Couverte' : 'Non couverte';
  if (props.selection.id === 'punctuality_rate') return props.selection.segment === 'primary' ? 'À l’heure' : 'En retard';
  return 'N/D';
});

const statusClass = computed(() => {
  if (!props.selection) return 'bg-slate-100 text-slate-700';

  if (props.selection.id === 'attendance_rate') {
    return props.selection.segment === 'primary'
      ? 'bg-blue-50 text-blue-700'
      : 'bg-red-50 text-red-700';
  }

  return props.selection.segment === 'primary'
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-orange-50 text-orange-700';
});

const statusDotClass = computed(() => {
  if (!props.selection) return 'bg-slate-400';

  if (props.selection.id === 'attendance_rate') {
    return props.selection.segment === 'primary' ? 'bg-blue-600' : 'bg-red-500';
  }

  return props.selection.segment === 'primary' ? 'bg-emerald-500' : 'bg-orange-500';
});

const iconClass = computed(() => {
  if (!props.selection) return 'bg-slate-500';

  if (props.selection.id === 'attendance_rate') {
    return props.selection.segment === 'primary' ? 'bg-blue-600' : 'bg-red-500';
  }

  if (props.selection.id === 'adoption_rate') return 'bg-indigo-500';

  return props.selection.segment === 'primary' ? 'bg-emerald-500' : 'bg-orange-500';
});

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function previousPage(): void {
  page.value = Math.max(1, page.value - 1);
}

function nextPage(): void {
  page.value = Math.min(pageCount.value, page.value + 1);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open && selection" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="presentation">
      <div class="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" aria-hidden="true" />

      <section
        ref="dialogRef"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-kpi-modal-title"
        class="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl outline-none"
      >
        <header class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
          <div class="flex min-w-0 gap-4">
            <span class="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-black text-white" :class="iconClass" aria-hidden="true">
              {{ selection.segment === 'primary' ? '✓' : selection.id === 'adoption_rate' ? 'i' : '!' }}
            </span>
            <div class="min-w-0">
              <h2 id="attendance-kpi-modal-title" class="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">{{ title }}</h2>
              <p class="mt-1 text-sm leading-5 text-slate-500">{{ summary }}</p>
            </div>
          </div>
          <button ref="closeButtonRef" type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Fermer" @click="emit('close')">×</button>
        </header>

        <div v-if="selection.id === 'adoption_rate'" class="overflow-y-auto p-6 sm:p-8">
          <div class="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
            <p class="font-bold text-indigo-950">Données backend en attente</p>
            <p class="mt-2 text-sm leading-6 text-indigo-900/80">
              Aucun taux n’est affiché tant que les événements de pointage obligatoires, le traitement des pauses et celui des sessions incomplètes ne sont pas validés côté métier et exposés par l’API.
            </p>
          </div>
        </div>

        <div v-else class="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7">
          <div v-if="rows.length === 0" class="py-12 text-center text-sm text-slate-500">Aucune rotation ne correspond à ce détail.</div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="bg-slate-50 text-left text-xs font-bold text-slate-500">
                  <th class="rounded-l-xl px-3 py-3">Collaborateur</th>
                  <th class="px-3 py-3">Date</th>
                  <th class="px-3 py-3">Entrée</th>
                  <th class="px-3 py-3">Retard réel</th>
                  <th class="rounded-r-xl px-3 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in pagedRows" :key="row.key" class="border-b border-slate-100 last:border-0">
                  <td class="px-3 py-3">
                    <button type="button" class="flex items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @click="emit('openEmployee', { employeeGuid: row.employeeGuid, date: row.day.date })">
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-extrabold text-indigo-700">{{ initials(row.employeeName) }}</span>
                      <span class="font-semibold text-slate-900 hover:text-indigo-700">{{ row.employeeName }}</span>
                    </button>
                  </td>
                  <td class="whitespace-nowrap px-3 py-3 text-slate-600">{{ formatBusinessDate(row.day.date) }}</td>
                  <td class="whitespace-nowrap px-3 py-3 font-medium text-slate-700">{{ formatBusinessTime(row.day.firstClockIn) }}</td>
                  <td class="whitespace-nowrap px-3 py-3 text-slate-600">{{ formatDelayMinutes(row.day.delayMinutes) }}</td>
                  <td class="px-3 py-3">
                    <span class="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold" :class="statusClass">
                      <span class="h-2 w-2 rounded-full" :class="statusDotClass" />
                      {{ statusLabel }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <footer v-if="selection.id !== 'adoption_rate' && rows.length > 0" class="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p class="text-sm text-slate-500">Affichage de {{ pagedRows.length }} résultat{{ pagedRows.length > 1 ? 's' : '' }} sur {{ rows.length }}</p>
          <div class="flex items-center gap-2">
            <button type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-40" :disabled="page <= 1" @click="previousPage">‹</button>
            <span class="min-w-20 text-center text-sm font-semibold text-slate-600">{{ page }} / {{ pageCount }}</span>
            <button type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-40" :disabled="page >= pageCount" @click="nextPage">›</button>
            <button type="button" class="ml-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50" @click="emit('close')">Fermer</button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
