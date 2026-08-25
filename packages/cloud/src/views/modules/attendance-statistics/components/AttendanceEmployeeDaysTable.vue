<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import type {
  AttendanceEmployeeOverview,
  AttendanceStatus,
  BusinessDate,
} from '../types/attendance-statistics.types.js';
import { ATTENDANCE_STATUSES } from '../types/attendance-statistics.types.js';
import { ATTENDANCE_ISSUE_PRESENTATION, ATTENDANCE_STATUS_PRESENTATION } from '../utils/attendance-status.js';
import { filterEmployeeDays } from '../utils/attendance-employees.js';
import {
  ATTENDANCE_EMPLOYEE_DAY_PAGE_SIZES,
  buildAttendanceEmployeeDayPage,
  findAttendanceEmployeeDayPage,
} from '../utils/attendance-volume.js';
import { formatBusinessDate } from '../utils/business-date.js';
import { formatBusinessTime } from '../utils/business-time.js';
import { formatDelayMinutes, formatDurationMinutes } from '../utils/duration.js';
import AttendanceCompactPagination from './AttendanceCompactPagination.vue';

interface Props {
  employee: AttendanceEmployeeOverview;
  focusDate?: BusinessDate | null;
}

const props = defineProps<Props>();
const sectionRef = ref<HTMLElement | null>(null);
const statusFilter = ref<'ALL' | AttendanceStatus>('ALL');
const issuesOnly = ref(false);
const page = ref(1);
const pageSize = ref(31);

const filteredDays = computed(() =>
  filterEmployeeDays(props.employee.days, statusFilter.value, issuesOnly.value),
);
const pageModel = computed(() =>
  buildAttendanceEmployeeDayPage({
    days: filteredDays.value,
    page: page.value,
    pageSize: pageSize.value,
  }),
);

watch(statusFilter, () => { page.value = 1; });
watch(issuesOnly, () => { page.value = 1; });
watch(
  () => props.employee.employeeGuid,
  () => {
    statusFilter.value = 'ALL';
    issuesOnly.value = false;
    page.value = 1;
  },
);
watch(
  () => props.focusDate,
  async (focusDate) => {
    if (!focusDate) return;
    statusFilter.value = 'ALL';
    issuesOnly.value = false;
    page.value = findAttendanceEmployeeDayPage(props.employee.days, focusDate, pageSize.value);
    await nextTick();
    focusVisibleDate(focusDate);
  },
  { immediate: true },
);

function focusVisibleDate(date: BusinessDate): void {
  const visible = Array.from(
      sectionRef.value?.querySelectorAll<HTMLElement>(
          `[data-attendance-date="${date}"]`,
      ) ?? [],
  ).find((element) => element.offsetParent !== null);

  visible?.focus();
}

function updatePageSize(event: Event): void {
  pageSize.value = Number((event.target as HTMLSelectElement).value);
  page.value = props.focusDate
    ? findAttendanceEmployeeDayPage(filteredDays.value, props.focusDate, pageSize.value)
    : 1;
}

function statusClasses(status: AttendanceStatus): string {
  const tone = ATTENDANCE_STATUS_PRESENTATION[status].tone;
  if (tone === 'positive') return 'bg-emerald-100 text-emerald-800';
  if (tone === 'warning') return 'bg-amber-100 text-amber-800';
  if (tone === 'danger') return 'bg-rose-100 text-rose-800';
  if (tone === 'info') return 'bg-sky-100 text-sky-800';
  return 'bg-slate-100 text-slate-700';
}
</script>

<template>
  <section ref="sectionRef" class="mt-6" aria-labelledby="attendance-employee-days-title">
    <div class="flex flex-col gap-3 border-y border-slate-200 py-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h3 id="attendance-employee-days-title" class="text-base font-bold text-slate-900">Détail journalier</h3>
        <p class="mt-1 text-sm text-slate-500">Heures et durées affichées telles que retournées par l’API tenant.</p>
      </div>

      <div class="grid gap-3 sm:grid-cols-3 sm:items-end">
        <label class="block">
          <span class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Statut</span>
          <select
            v-model="statusFilter"
            class="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <option value="ALL">Tous</option>
            <option v-for="status in ATTENDANCE_STATUSES" :key="status" :value="status">
              {{ ATTENDANCE_STATUS_PRESENTATION[status].label }}
            </option>
          </select>
        </label>

        <label class="block">
          <span class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Jours par page</span>
          <select
            :value="pageSize"
            class="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            @change="updatePageSize"
          >
            <option v-for="size in ATTENDANCE_EMPLOYEE_DAY_PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
          </select>
        </label>

        <label class="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700">
          <input v-model="issuesOnly" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Avec anomalie uniquement
        </label>
      </div>
    </div>

    <div
      v-if="focusDate"
      class="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900"
      role="status"
    >
      Journée ciblée depuis le panneau des anomalies : <strong>{{ formatBusinessDate(focusDate) }}</strong>.
    </div>

    <p class="mt-3 text-xs text-slate-500" aria-live="polite">
      {{ pageModel.total }} journée{{ pageModel.total > 1 ? 's' : '' }} après filtrage.
      Le rendu est limité à {{ pageModel.pageSize }} lignes par page.
    </p>

    <div v-if="pageModel.rows.length === 0" class="py-10 text-center text-sm text-slate-500">
      Aucune journée ne correspond aux filtres sélectionnés.
    </div>

    <template v-else>
      <div class="hidden overscroll-x-contain overflow-x-auto md:block" tabindex="0" aria-label="Tableau journalier défilable horizontalement">
        <table class="min-w-full text-sm">
          <caption class="sr-only">Détail quotidien de présence de {{ employee.employeeName }}</caption>
          <thead>
            <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" class="px-3 py-3 text-left font-bold">Date</th>
              <th scope="col" class="px-3 py-3 text-left font-bold">Statut</th>
              <th scope="col" class="px-3 py-3 text-center font-bold">Taux</th>
              <th scope="col" class="px-3 py-3 text-right font-bold">Entrée</th>
              <th scope="col" class="px-3 py-3 text-right font-bold">Sortie</th>
              <th scope="col" class="px-3 py-3 text-right font-bold">Retard</th>
              <th scope="col" class="px-3 py-3 text-right font-bold">Brut</th>
              <th scope="col" class="px-3 py-3 text-right font-bold">Pause</th>
              <th scope="col" class="px-3 py-3 text-right font-bold">Net</th>
              <th scope="col" class="px-3 py-3 text-left font-bold">Anomalies</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="day in pageModel.rows"
              :key="day.date"
              :data-attendance-date="day.date"
              tabindex="-1"
              class="border-t border-slate-100 align-top outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              :class="day.date === focusDate ? 'bg-indigo-50/80 ring-1 ring-inset ring-indigo-200' : ''"
            >
              <th scope="row" class="whitespace-nowrap px-3 py-3 text-left font-semibold text-slate-900">{{ formatBusinessDate(day.date) }}</th>
              <td class="px-3 py-3">
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold" :class="statusClasses(day.status)">
                  {{ ATTENDANCE_STATUS_PRESENTATION[day.status].label }}
                </span>
              </td>
              <td class="px-3 py-3 text-center">
                <span :class="day.rateEligible ? 'text-emerald-700' : 'text-slate-500'">
                  {{ day.rateEligible ? 'Éligible' : 'Exclu' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-3 text-right text-slate-700">{{ formatBusinessTime(day.firstClockIn) }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-right text-slate-700">{{ formatBusinessTime(day.lastClockOut) }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-right text-slate-700">{{ formatDelayMinutes(day.delayMinutes) }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-right text-slate-700">{{ formatDurationMinutes(day.grossMinutes) }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-right text-slate-700">{{ formatDurationMinutes(day.pauseMinutes) }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900">{{ formatDurationMinutes(day.netMinutes) }}</td>
              <td class="min-w-[190px] px-3 py-3">
                <span v-if="day.issues.length === 0" class="text-slate-500">Aucune</span>
                <div v-else class="flex flex-wrap gap-1.5">
                  <span v-for="issue in day.issues" :key="issue" class="rounded-md bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
                    {{ ATTENDANCE_ISSUE_PRESENTATION[issue].label }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="space-y-3 py-4 md:hidden">
        <article
          v-for="day in pageModel.rows"
          :key="day.date"
          :data-attendance-date="day.date"
          tabindex="-1"
          class="rounded-xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-indigo-500"
          :class="day.date === focusDate ? 'border-indigo-300 bg-indigo-50/70 ring-1 ring-indigo-200' : ''"
        >
          <div class="flex items-start justify-between gap-3">
            <h4 class="font-bold text-slate-900">{{ formatBusinessDate(day.date) }}</h4>
            <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="statusClasses(day.status)">
              {{ ATTENDANCE_STATUS_PRESENTATION[day.status].label }}
            </span>
          </div>
          <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt class="text-xs text-slate-500">Entrée</dt><dd class="font-semibold text-slate-800">{{ formatBusinessTime(day.firstClockIn) }}</dd></div>
            <div><dt class="text-xs text-slate-500">Sortie</dt><dd class="font-semibold text-slate-800">{{ formatBusinessTime(day.lastClockOut) }}</dd></div>
            <div><dt class="text-xs text-slate-500">Retard</dt><dd class="font-semibold text-slate-800">{{ formatDelayMinutes(day.delayMinutes) }}</dd></div>
            <div><dt class="text-xs text-slate-500">Durée nette</dt><dd class="font-semibold text-slate-800">{{ formatDurationMinutes(day.netMinutes) }}</dd></div>
          </dl>
          <div v-if="day.issues.length > 0" class="mt-4 flex flex-wrap gap-1.5">
            <span v-for="issue in day.issues" :key="issue" class="rounded-md bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
              {{ ATTENDANCE_ISSUE_PRESENTATION[issue].label }}
            </span>
          </div>
        </article>
      </div>

      <AttendanceCompactPagination
        :page="pageModel.page"
        :page-count="pageModel.pageCount"
        :from="pageModel.from"
        :to="pageModel.to"
        :total="pageModel.total"
        label="Pagination des journées de l’employé"
        @update:page="page = $event"
      />
    </template>
  </section>
</template>
