<template>
  <button type="button"
          class="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm shadow-slate-200/40 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          @click="$emit('open')">
    <div class="flex items-start justify-between gap-4">
      <div class="flex h-11 w-11 items-center justify-center rounded-2xl" :class="accentClasses.icon">
        <component :is="icon" :size="22" stroke-width="1.8"/>
      </div>
      <span class="rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide"
            :class="statusReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
                {{ statusReady ? 'Prêt' : 'À compléter' }}
            </span>
    </div>
    <div class="mt-5 flex items-end justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{{ label }}</p>
        <p class="mt-1 text-2xl font-bold tracking-tight text-slate-900">{{ value }}</p>
      </div>
      <IconArrowUpRight :size="18"
                        class="text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-600"/>
    </div>
    <p class="mt-3 min-h-[40px] text-xs leading-5 text-slate-500">{{ description }}</p>
    <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div class="h-full rounded-full transition-all duration-500" :class="accentClasses.bar"
           :style="{ width: `${Math.max(0, Math.min(100, progress))}%` }"/>
    </div>
  </button>
</template>

<script setup lang="ts">
import {computed, type Component} from 'vue'
import {IconArrowUpRight} from '@tabler/icons-vue'

const props = withDefaults(defineProps<{
  label: string;
  value: string;
  description: string;
  progress: number;
  statusReady: boolean;
  icon: Component;
  accent?: 'indigo' | 'emerald' | 'amber' | 'violet'
}>(), {accent: 'indigo'})
defineEmits<{ open: [] }>()
const accentClasses = computed(() => ({
  indigo: {icon: 'bg-blue-50 text-blue-700', bar: 'bg-blue-500'},
  emerald: {icon: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500'},
  amber: {icon: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500'},
  violet: {icon: 'bg-violet-50 text-violet-700', bar: 'bg-violet-500'},
}[props.accent]))
</script>
