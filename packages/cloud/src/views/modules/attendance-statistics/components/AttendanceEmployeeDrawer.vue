<script setup lang="ts">
import { computed, ref } from 'vue';

import { useAccessibleDialog } from '../composables/useAccessibleDialog.js';
import type { AttendanceEmployeeOverview, BusinessDate } from '../types/attendance-statistics.types.js';
import { formatDurationMinutes } from '../utils/duration.js';
import { formatPercentage } from '../utils/percentage.js';
import AttendanceEmployeeDaysTable from './AttendanceEmployeeDaysTable.vue';

interface Props {
  open: boolean;
  employee: AttendanceEmployeeOverview | null;
  focusDate?: BusinessDate | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();
const dialogRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLElement | null>(null);
const isOpen = computed(() => props.open && props.employee !== null);

useAccessibleDialog({
  open: isOpen,
  dialogRef,
  initialFocusRef: closeButtonRef,
  close: () => emit('close'),
});

const netDuration = computed(() => {
  if (!props.employee || props.employee.durations.daysWithKnownNetDuration === 0) {
    return 'Non disponible';
  }
  return formatDurationMinutes(props.employee.durations.netMinutes);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open && employee" class="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        aria-label="Fermer le détail de l’employé"
        tabindex="-1"
        @click="emit('close')"
      />

      <aside
        ref="dialogRef"
        class="absolute inset-y-0 right-0 flex w-full max-w-5xl flex-col bg-white shadow-2xl outline-none sm:w-[min(100%,64rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-employee-drawer-title"
        aria-describedby="attendance-employee-drawer-description"
        tabindex="-1"
      >
        <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">Détail employé</p>
            <h2 id="attendance-employee-drawer-title" class="mt-1 truncate text-xl font-bold text-slate-950 sm:text-2xl">
              {{ employee.employeeName }}
            </h2>
            <p class="mt-1 truncate text-sm text-slate-500">{{ employee.employeeGuid }}</p>
          </div>
          <button
            ref="closeButtonRef"
            type="button"
            class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xl text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            aria-label="Fermer le détail"
            @click="emit('close')"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div class="flex-1 overscroll-contain overflow-y-auto px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
          <p
            id="attendance-employee-drawer-description"
            class="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-900"
          >
            Cette vue décrit les données de présence de la période. Elle ne constitue pas une évaluation globale de la performance de l’employé.
          </p>

          <dl class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-slate-200 p-4">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Taux de présence</dt>
              <dd class="mt-2 text-2xl font-bold text-slate-950">{{ formatPercentage(employee.rates.attendanceRate) }}</dd>
              <p class="mt-1 text-xs text-slate-500">{{ employee.rates.attendedWorkingDays }} suivies sur {{ employee.rates.employeeWorkingDaysExpected }} attendues</p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Ponctualité</dt>
              <dd class="mt-2 text-2xl font-bold text-slate-950">{{ formatPercentage(employee.rates.punctualityRate) }}</dd>
              <p class="mt-1 text-xs text-slate-500">{{ employee.statusTotals.LATE }} retard{{ employee.statusTotals.LATE > 1 ? 's' : '' }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Absences finalisées</dt>
              <dd class="mt-2 text-2xl font-bold text-rose-700">{{ employee.statusTotals.ABSENT }}</dd>
              <p class="mt-1 text-xs text-slate-500">PENDING exclu des absences</p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Durée nette</dt>
              <dd class="mt-2 text-2xl font-bold text-slate-950">{{ netDuration }}</dd>
              <p class="mt-1 text-xs text-slate-500">{{ employee.durations.daysWithMissingDuration }} journée{{ employee.durations.daysWithMissingDuration > 1 ? 's' : '' }} avec durée manquante</p>
            </div>
          </dl>

          <div class="mt-4 flex flex-wrap gap-2 text-sm" aria-label="Résumé des statuts de l’employé">
            <span class="rounded-full bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-800">{{ employee.statusTotals.PRESENT }} à l’heure</span>
            <span class="rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-800">{{ employee.statusTotals.LATE }} en retard</span>
            <span class="rounded-full bg-rose-100 px-3 py-1.5 font-semibold text-rose-800">{{ employee.statusTotals.ABSENT }} absent</span>
            <span class="rounded-full bg-sky-100 px-3 py-1.5 font-semibold text-sky-800">{{ employee.statusTotals.PENDING }} en attente</span>
            <span class="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">{{ employee.statusTotals.REST_DAY }} repos</span>
            <span class="rounded-full bg-orange-100 px-3 py-1.5 font-semibold text-orange-800">{{ employee.issueCount }} élément{{ employee.issueCount > 1 ? 's' : '' }} à examiner</span>
          </div>

          <AttendanceEmployeeDaysTable :employee="employee" :focus-date="focusDate" />
        </div>
      </aside>
    </div>
  </Teleport>
</template>
