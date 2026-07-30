<template>
  <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
    <div class="max-w-3xl">
      <div v-if="eyebrow"
           class="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-700">
        <span class="h-1.5 w-1.5 rounded-full bg-indigo-500"/>
        {{ eyebrow }}
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{{ title }}</h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions"/>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ eyebrow?: string; title: string; description: string }>()
</script>
