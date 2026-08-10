<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceDataQuality } from '@/views/modules/attendance-statistics';
import { buildAttendanceDataQualityPresentation } from '@/views/modules/attendance-statistics';

interface Props {
  quality: AttendanceDataQuality;
}

const props = defineProps<Props>();
const presentation = computed(() => buildAttendanceDataQualityPresentation(props.quality));
</script>

<template>
  <section
    aria-labelledby="attendance-data-quality-title"
    class="rounded-2xl border p-5 shadow-sm sm:p-6"
    :class="{
      'border-emerald-200 bg-emerald-50/70': presentation.level === 'reliable',
      'border-amber-200 bg-amber-50/80': presentation.level === 'warning',
      'border-rose-200 bg-rose-50/80': presentation.level === 'unreliable',
    }"
    role="status"
  >
    <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div class="flex min-w-0 gap-3.5">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          :class="{
            'bg-emerald-100 text-emerald-700': presentation.level === 'reliable',
            'bg-amber-100 text-amber-700': presentation.level === 'warning',
            'bg-rose-100 text-rose-700': presentation.level === 'unreliable',
          }"
          aria-hidden="true"
        >
          <svg v-if="presentation.level === 'reliable'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
            <path d="m5 12 4 4L19 6" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
        </div>

        <div class="min-w-0">
          <p
            class="text-xs font-bold uppercase tracking-[0.14em]"
            :class="{
              'text-emerald-700': presentation.level === 'reliable',
              'text-amber-700': presentation.level === 'warning',
              'text-rose-700': presentation.level === 'unreliable',
            }"
          >
            {{ presentation.eyebrow }}
          </p>
          <h2 id="attendance-data-quality-title" class="mt-1.5 text-lg font-bold text-slate-950">
            {{ presentation.title }}
          </h2>
          <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
            {{ presentation.message }}
          </p>
        </div>
      </div>

      <div class="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <div
          v-for="metric in presentation.metrics"
          :key="metric.id"
          class="min-w-[118px] rounded-xl border bg-white/80 px-3 py-2.5"
          :class="metric.value > 0 ? 'border-slate-300' : 'border-white/90'"
          :title="metric.description"
        >
          <p class="text-[11px] font-medium leading-4 text-slate-500">{{ metric.label }}</p>
          <p
            class="mt-1 text-lg font-bold"
            :class="metric.value > 0 ? 'text-slate-950' : 'text-slate-400'"
          >
            {{ metric.value }}
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="presentation.notes.length > 0"
      class="mt-4 border-t border-slate-900/10 pt-4"
    >
      <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Notes de l’API</p>
      <ul class="mt-2 space-y-1.5 text-sm leading-5 text-slate-700">
        <li v-for="note in presentation.notes" :key="note" class="flex gap-2">
          <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
          <span>{{ note }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>
