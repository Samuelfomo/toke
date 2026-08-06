<template>
  <RouterLink
    :to="{ name: item.routeName }"
    class="group relative flex min-h-[212px] flex-col overflow-hidden rounded-2xl border bg-white p-5 no-underline shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:p-6"
    :class="item.featured ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'"
    :aria-label="`Ouvrir ${item.title}`"
  >
    <div
      v-if="item.featured"
      class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-blue-600"
      aria-hidden="true"
    />

    <div class="mb-5 flex items-start justify-between gap-4">
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors"
        :class="item.featured
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
          : 'bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700'"
      >
        <component :is="item.icon" :size="23" stroke-width="1.8" />
      </div>

      <span
        v-if="item.badge"
        class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
      >
        {{ item.badge }}
      </span>
    </div>

    <div class="flex-1">
      <h3 class="text-base font-bold text-slate-900 sm:text-lg">
        {{ item.title }}
      </h3>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        {{ item.description }}
      </p>
    </div>

    <div class="mt-5 flex min-h-11 items-center gap-2 text-sm font-bold text-blue-700">
      <span>Ouvrir</span>
      <span
        aria-hidden="true"
        class="transition-transform duration-200 group-hover:translate-x-1"
      >
        →
      </span>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import type { PlanningMenuItem } from './planningMenu.type'

defineProps<{
  item: PlanningMenuItem
}>()
</script>
