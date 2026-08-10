<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceOverview } from '@/views/modules/attendance-statistics';
import { buildAttendanceStatusDistribution } from '@/views/modules/attendance-statistics';

interface Props {
  overview: AttendanceOverview;
}

const props = defineProps<Props>();
const groups = computed(() => buildAttendanceStatusDistribution(props.overview));
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="attendance-status-title">
    <div class="max-w-3xl">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Lecture des statuts</p>
      <h2 id="attendance-status-title" class="mt-2 text-lg font-bold text-slate-950 sm:text-xl">
        Répartition des journées-employés
      </h2>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        Les journées qui participent au taux sont volontairement séparées des journées exclues du calcul.
      </p>
    </div>

    <div class="mt-6 grid gap-5 xl:grid-cols-2">
      <article
        v-for="group in groups"
        :key="group.id"
        class="rounded-2xl border p-4 sm:p-5"
        :class="group.id === 'rate_eligible' ? 'border-indigo-100 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/70'"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="font-bold text-slate-900">{{ group.label }}</h3>
            <p class="mt-1 text-xs leading-5 text-slate-600">{{ group.description }}</p>
          </div>
          <span class="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-800 shadow-sm">
            {{ group.total }}
          </span>
        </div>

        <div class="mt-5 space-y-4">
          <div v-for="item in group.items" :key="item.status">
            <div class="flex items-center justify-between gap-3 text-sm">
              <div class="flex min-w-0 items-center gap-2">
                <span
                  class="h-2.5 w-2.5 shrink-0 rounded-full"
                  :class="{
                    'bg-emerald-500': item.tone === 'positive',
                    'bg-amber-500': item.tone === 'warning',
                    'bg-rose-500': item.tone === 'danger',
                    'bg-slate-400': item.tone === 'neutral',
                    'bg-sky-500': item.tone === 'info',
                  }"
                  aria-hidden="true"
                />
                <span class="truncate font-semibold text-slate-800">{{ item.label }}</span>
              </div>
              <span class="font-bold tabular-nums text-slate-950">{{ item.count }}</span>
            </div>
            <div class="mt-2 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200/70">
              <div
                class="h-full rounded-full transition-[width] duration-300"
                :class="{
                  'bg-emerald-500': item.tone === 'positive',
                  'bg-amber-500': item.tone === 'warning',
                  'bg-rose-500': item.tone === 'danger',
                  'bg-slate-400': item.tone === 'neutral',
                  'bg-sky-500': item.tone === 'info',
                }"
                :style="{ width: `${item.visualSharePercent}%` }"
                aria-hidden="true"
              />
            </div>
            <p class="mt-1.5 text-xs leading-5 text-slate-500">{{ item.description }}</p>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
