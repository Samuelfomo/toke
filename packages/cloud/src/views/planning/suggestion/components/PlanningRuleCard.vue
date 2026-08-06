<template>
  <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex items-start justify-between gap-4">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl" :class="accentClass">
        <component :is="icon" :size="20" stroke-width="1.8"/>
      </div>
      <p class="text-lg font-bold text-slate-900">{{ value }}</p>
    </div>
    <h3 class="mt-4 text-sm font-bold text-slate-900">{{ title }}</h3>
    <p class="mt-1.5 text-xs leading-5 text-slate-500">{{ description }}</p>
    <div class="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs leading-4 text-slate-600">
      <strong class="text-slate-700">Exemple : </strong>{{ example }}
    </div>
  </article>
</template>
<script setup lang="ts">
import {computed, type Component} from 'vue'

const props = withDefaults(defineProps<{
  title: string;
  value: string;
  description: string;
  example: string;
  icon: Component;
  accent?: 'indigo' | 'emerald' | 'violet' | 'amber'
}>(), {accent: 'indigo'})
const accentClass = computed(() => ({
  indigo: 'bg-blue-50 text-blue-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  violet: 'bg-violet-50 text-violet-700',
  amber: 'bg-amber-50 text-amber-700',
}[props.accent]))
</script>
