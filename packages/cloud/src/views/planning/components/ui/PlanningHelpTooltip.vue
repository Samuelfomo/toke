<template>
  <span class="group relative inline-flex">
    <button
      type="button"
      class="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      :aria-label="label"
      :aria-describedby="tooltipId"
    >
      <IconHelpCircle :size="18" />
    </button>
    <span
      :id="tooltipId"
      role="tooltip"
      class="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-xs leading-5 text-white shadow-xl group-hover:block group-focus-within:block"
    >
      {{ text }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { IconHelpCircle } from '@tabler/icons-vue'

withDefaults(defineProps<{
  text: string
  label?: string
}>(), {
  label: 'Afficher l’aide',
})

const tooltipId = `planning-tooltip-${Math.random().toString(36).slice(2, 9)}`
</script>
