<script setup lang="ts">
import type { AttendanceOverview } from '@/views/modules/attendance-statistics';
import { describeAttendancePeriod } from '../utils/attendance-period.js';

interface Props {
  overview: AttendanceOverview;
}

defineProps<Props>();
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Périmètre chargé</p>
        <h2 class="mt-2 text-lg font-bold text-slate-950">
          {{ describeAttendancePeriod(overview.period.startDate, overview.period.endDate) }}
        </h2>
        <p class="mt-1 text-sm text-slate-600">
          {{ overview.period.dayCount }} jour{{ overview.period.dayCount > 1 ? 's' : '' }} analysé{{ overview.period.dayCount > 1 ? 's' : '' }}
          · {{ overview.scope.teamSize }} collaborateur{{ overview.scope.teamSize > 1 ? 's' : '' }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-slate-50 px-4 py-3">
          <p class="text-xs font-medium text-slate-500">Site</p>
          <p class="mt-1 text-sm font-bold text-slate-900">
            {{ overview.scope.siteGuid ? 'Filtré' : 'Tous les sites' }}
          </p>
        </div>
        <div class="rounded-xl bg-slate-50 px-4 py-3">
          <p class="text-xs font-medium text-slate-500">Journées</p>
          <p class="mt-1 text-sm font-bold text-slate-900">{{ overview.period.dayCount }}</p>
        </div>
        <div class="col-span-2 rounded-xl bg-slate-50 px-4 py-3 sm:col-span-1">
          <p class="text-xs font-medium text-slate-500">Anomalies</p>
          <p class="mt-1 text-sm font-bold text-slate-900">{{ overview.summary.issueCount }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
