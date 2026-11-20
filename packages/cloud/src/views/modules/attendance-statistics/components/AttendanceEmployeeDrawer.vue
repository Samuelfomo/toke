<script setup lang="ts">
import { computed, ref } from 'vue';

import { useAccessibleDialog } from '../composables/useAccessibleDialog.js';
import type { AttendanceEmployeeOverview, AttendanceIssue, BusinessDate } from '../types/attendance-statistics.types.js';
import { formatDurationMinutes, formatSignedDurationMinutes } from '../utils/duration.js';
import { formatPercentage } from '../utils/percentage.js';
import { ATTENDANCE_ISSUE_PRESENTATION } from '../utils/attendance-status.js';
import type { AttendancePointageSourceTarget } from '../utils/attendance-pointage-source.js';
import AttendanceEmployeeDaysTable from './AttendanceEmployeeDaysTable.vue';

interface Props {
  open: boolean;
  employee: AttendanceEmployeeOverview | null;
  focusDate?: BusinessDate | null;
  focusIssue?: AttendanceIssue | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  exportEmployee: [employeeGuid: string];
  viewSource: [target: AttendancePointageSourceTarget];
}>();
const dialogRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLElement | null>(null);
const isOpen = computed(() => props.open && props.employee !== null);

useAccessibleDialog({
  open: isOpen,
  dialogRef,
  initialFocusRef: closeButtonRef,
  close: () => emit('close'),
});

const knownAttributedOccurrencesLabel = computed(() => {
  if (!props.employee) return 'Aucune occurrence comparable';
  const count = props.employee.durations.occurrencesWithKnownAttributedWorkDuration;
  return `${count} occurrence${count > 1 ? 's' : ''} comparable${count > 1 ? 's' : ''}`;
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open && employee" class="fixed inset-0 z-[120]" role="presentation">
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        aria-hidden="true"
      />
      <aside
        ref="dialogRef"
        class="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl outline-none lg:w-[58vw] lg:max-w-[1500px]"
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
          <div class="flex shrink-0 items-center gap-2">
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-700 px-3 text-sm font-bold text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              @click="emit('exportEmployee', employee.employeeGuid)"
            >
              Exporter cette fiche
            </button>
            <button
              ref="closeButtonRef"
              type="button"
              class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xl text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              aria-label="Fermer le détail"
              @click="emit('close')"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </header>

        <div class="flex-1 overscroll-contain overflow-y-auto px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
          <p
            id="attendance-employee-drawer-description"
            class="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-900"
          >
            Cette vue présente les informations de présence et les durées enregistrées pour la période sélectionnée. Les écarts de durée sont calculés uniquement sur les occurrences que le backend a pu rattacher au planning attendu.
          </p>

          <div
            v-if="focusDate && focusIssue"
            class="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950"
            role="status"
          >
            <p class="font-bold">Occurrence ouverte depuis « Éléments à examiner »</p>
            <p class="mt-1 leading-5">
              {{ ATTENDANCE_ISSUE_PRESENTATION[focusIssue].label }} · {{ focusDate }}.
              Action suggérée : <strong>{{ ATTENDANCE_ISSUE_PRESENTATION[focusIssue].actionLabel }}</strong>.
            </p>
          </div>

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
              <p class="mt-1 text-xs text-slate-500">Journées en attente non comptées</p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Durée enregistrée</dt>
              <dd class="mt-2 text-2xl font-bold text-slate-950">{{ formatDurationMinutes(employee.durations.netMinutes) }}</dd>
              <p class="mt-1 text-xs text-slate-500">{{ employee.durations.daysWithKnownNetDuration }} journée{{ employee.durations.daysWithKnownNetDuration > 1 ? 's' : '' }} avec durée calculable</p>
            </div>
          </dl>

          <section class="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4" aria-labelledby="attendance-employee-duration-analysis-title">
            <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Analyse des durées</p>
                <h3 id="attendance-employee-duration-analysis-title" class="mt-1 text-base font-bold text-slate-950">Comparaison planning ↔ activité attribuée</h3>
              </div>
              <p class="text-xs text-slate-500">{{ knownAttributedOccurrencesLabel }}</p>
            </div>

            <dl class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div class="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <dt class="text-xs font-semibold text-slate-500">Durée attribuée</dt>
                <dd class="mt-1 text-lg font-bold text-slate-950">{{ formatDurationMinutes(employee.durations.attributedWorkMinutes) }}</dd>
                <p class="mt-1 text-[11px] leading-4 text-slate-500">Portion de l’activité rattachée aux occurrences comparables.</p>
              </div>
              <div class="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <dt class="text-xs font-semibold text-slate-500">Écart net</dt>
                <dd class="mt-1 text-lg font-bold text-slate-950">{{ formatSignedDurationMinutes(employee.durations.rawDeltaMinutes) }}</dd>
                <p class="mt-1 text-[11px] leading-4 text-slate-500">Somme signée des écarts occurrence par occurrence.</p>
              </div>
              <div class="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <dt class="text-xs font-semibold text-slate-500">E+ retenu</dt>
                <dd class="mt-1 text-lg font-bold text-emerald-700">{{ formatDurationMinutes(employee.durations.creditedExtraMinutes) }}</dd>
                <p class="mt-1 text-[11px] leading-4 text-slate-500">Supplément reconnu après application du plafond de l’occurrence.</p>
              </div>
              <div class="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <dt class="text-xs font-semibold text-slate-500">Surplus hors E+ / déficit</dt>
                <dd class="mt-1 text-sm font-bold text-slate-950">
                  {{ formatDurationMinutes(employee.durations.excessBeyondExtraMinutes) }} / {{ formatDurationMinutes(employee.durations.deficitMinutes) }}
                </dd>
                <p class="mt-1 text-[11px] leading-4 text-slate-500">Le surplus non retenu reste visible et n’est pas supprimé de la durée réelle.</p>
              </div>
            </dl>
          </section>

          <div class="mt-4 flex flex-wrap gap-2 text-sm" aria-label="Résumé des statuts de l’employé">
            <span class="rounded-full bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-800">{{ employee.statusTotals.PRESENT }} à l’heure</span>
            <span class="rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-800">{{ employee.statusTotals.LATE }} en retard</span>
            <span class="rounded-full bg-rose-100 px-3 py-1.5 font-semibold text-rose-800">{{ employee.statusTotals.ABSENT }} absent</span>
            <span class="rounded-full bg-sky-100 px-3 py-1.5 font-semibold text-sky-800">{{ employee.statusTotals.PENDING }} en attente</span>
            <span class="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">{{ employee.statusTotals.REST_DAY }} repos</span>
            <span class="rounded-full bg-orange-100 px-3 py-1.5 font-semibold text-orange-800">{{ employee.issueCount }} élément{{ employee.issueCount > 1 ? 's' : '' }} à examiner</span>
          </div>

          <AttendanceEmployeeDaysTable
            :employee="employee"
            :focus-date="focusDate"
            :focus-issue="focusIssue"
            @view-source="emit('viewSource', $event)"
          />
        </div>
      </aside>
    </div>
  </Teleport>
</template>
