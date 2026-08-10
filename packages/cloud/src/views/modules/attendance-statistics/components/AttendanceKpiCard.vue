<script setup lang="ts">
import type { AttendanceKpiViewModel } from '../utils/attendance-kpis.js';

interface Props {
  card: AttendanceKpiViewModel;
}

defineProps<Props>();
</script>

<template>
  <article
    class="group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    :class="{
      'border-indigo-200': card.tone === 'indigo',
      'border-sky-200': card.tone === 'sky',
      'border-rose-200': card.tone === 'rose',
      'border-amber-200': card.tone === 'amber',
      'border-orange-200': card.tone === 'orange',
      'border-slate-200': card.tone === 'slate',
    }"
  >
    <div
      class="absolute inset-x-0 top-0 h-1"
      :class="{
        'bg-indigo-500': card.tone === 'indigo',
        'bg-sky-500': card.tone === 'sky',
        'bg-rose-500': card.tone === 'rose',
        'bg-amber-500': card.tone === 'amber',
        'bg-orange-500': card.tone === 'orange',
        'bg-slate-500': card.tone === 'slate',
      }"
      aria-hidden="true"
    />

    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-slate-600">{{ card.label }}</p>
        <p
          class="mt-3 break-words text-3xl font-bold tracking-tight sm:text-[2rem]"
          :class="card.available ? 'text-slate-950' : 'text-slate-500'"
        >
          {{ card.value }}
        </p>
      </div>

      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        :class="{
          'bg-indigo-50 text-indigo-700': card.tone === 'indigo',
          'bg-sky-50 text-sky-700': card.tone === 'sky',
          'bg-rose-50 text-rose-700': card.tone === 'rose',
          'bg-amber-50 text-amber-700': card.tone === 'amber',
          'bg-orange-50 text-orange-700': card.tone === 'orange',
          'bg-slate-100 text-slate-700': card.tone === 'slate',
        }"
        aria-hidden="true"
      >
        <svg v-if="card.icon === 'attendance'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5">
          <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
        </svg>
        <svg v-else-if="card.icon === 'punctuality'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <svg v-else-if="card.icon === 'absence'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5">
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0M17 9l5 5M22 9l-5 5" />
        </svg>
        <svg v-else-if="card.icon === 'late'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5">
          <path d="M12 8v5l3 2" />
          <path d="M5.5 5.5A9 9 0 1 0 18.5 5.5" />
          <path d="M3 3v5h5" />
        </svg>
        <svg v-else-if="card.icon === 'issue'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5">
          <path d="M12 3 2.8 19h18.4L12 3Z" />
          <path d="M12 9v4M12 16h.01" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5h4" />
        </svg>
      </div>
    </div>

    <p class="mt-4 text-sm font-medium leading-5 text-slate-700">{{ card.helper }}</p>
    <p class="mt-2 text-xs leading-5 text-slate-500">{{ card.detail }}</p>
  </article>
</template>
