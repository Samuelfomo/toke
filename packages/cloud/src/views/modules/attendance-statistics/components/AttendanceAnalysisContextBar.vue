<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceAnalysisContext } from '../utils/attendance-analysis-context.js';
import { getAttendanceAnalysisSourceLabel, getAttendanceRateEligibilityLabel } from '../utils/attendance-analysis-context.js';
import { ATTENDANCE_ISSUE_PRESENTATION, ATTENDANCE_STATUS_PRESENTATION } from '../utils/attendance-status.js';
import { formatBusinessDate } from '../utils/business-date.js';

interface Props {
  context: AttendanceAnalysisContext | null;
  employeeCount: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  clear: [];
  clearDate: [];
  clearStatus: [];
  clearEligibility: [];
  export: [];
}>();

const statusLabel = computed(() =>
  props.context?.status ? ATTENDANCE_STATUS_PRESENTATION[props.context.status].label : null,
);
const issueLabel = computed(() =>
  props.context?.issue ? ATTENDANCE_ISSUE_PRESENTATION[props.context.issue].label : null,
);
</script>

<template>
  <aside
    v-if="context"
    id="attendance-analysis-context"
    class="rounded-lg border border-indigo-200 bg-indigo-50/70 px-4 py-3 shadow-sm sm:px-5"
    aria-labelledby="attendance-analysis-context-title"
  >
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <p id="attendance-analysis-context-title" class="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
            Contexte d’analyse
          </p>
          <span class="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
            {{ getAttendanceAnalysisSourceLabel(context.source) }}
          </span>
          <span class="rounded-full bg-indigo-700 px-2.5 py-1 text-xs font-bold text-white">
            {{ employeeCount }} employé{{ employeeCount > 1 ? 's' : '' }} concerné{{ employeeCount > 1 ? 's' : '' }}
          </span>
        </div>
        <p class="mt-1.5 text-sm font-semibold text-slate-900">{{ context.label }}</p>

        <div class="mt-2 flex flex-wrap gap-2 text-xs">
          <button
            v-if="context.date"
            type="button"
            class="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200 hover:ring-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            @click="emit('clearDate')"
          >
            {{ formatBusinessDate(context.date) }} · Retirer la date ×
          </button>
          <button
            v-if="statusLabel"
            type="button"
            class="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200 hover:ring-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            @click="emit('clearStatus')"
          >
            {{ statusLabel }} · Retirer le statut ×
          </button>
          <button
            v-if="context.rateEligible !== null"
            type="button"
            class="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200 hover:ring-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            @click="emit('clearEligibility')"
          >
            {{ getAttendanceRateEligibilityLabel(context.rateEligible) }} · Retirer ×
          </button>
          <span v-if="issueLabel" class="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200">
            {{ issueLabel }}
          </span>
          <span v-if="context.employeeName" class="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200">
            {{ context.employeeName }}
          </span>
        </div>
      </div>

      <div class="flex shrink-0 flex-wrap gap-2 self-start lg:self-center">
        <button
          type="button"
          class="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          @click="emit('export')"
        >
          Exporter cette analyse
        </button>
        <button
          type="button"
          class="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          @click="emit('clear')"
        >
          Réinitialiser l’analyse
        </button>
      </div>
    </div>
  </aside>
</template>
