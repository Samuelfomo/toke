<template>
  <div class="relative overflow-hidden rounded-2xl border p-5" :class="classes.wrapper">
    <div class="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-60" :class="classes.orb"/>
    <div class="relative flex gap-4">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" :class="classes.icon">
        <component :is="icon" :size="20" stroke-width="1.8"/>
      </div>
      <div class="min-w-0">
        <p class="text-sm font-bold" :class="classes.title">{{ title }}</p>
        <p class="mt-1 text-xs leading-5" :class="classes.text">{{ description }}</p>
        <div v-if="important" class="mt-3 rounded-xl border bg-white/70 px-3 py-2.5 text-xs font-medium leading-5"
             :class="classes.important">
          {{ important }}
        </div>
        <ul v-if="examples?.length" class="mt-3 space-y-1.5">
          <li v-for="example in examples" :key="example" class="flex gap-2 text-xs leading-5" :class="classes.text">
            <span class="mt-2 h-1 w-1 shrink-0 rounded-full" :class="classes.dot"/>
            <span>{{ example }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, type Component} from 'vue'
import {IconAlertTriangle, IconCircleCheck, IconInfoCircle} from '@tabler/icons-vue'

const props = withDefaults(defineProps<{
  title: string
  description: string
  important?: string
  examples?: string[]
  tone?: 'info' | 'warning' | 'success'
}>(), {tone: 'info', examples: () => []})

const icons: Record<string, Component> = {
  info: IconInfoCircle,
  warning: IconAlertTriangle,
  success: IconCircleCheck,
}
const icon = computed(() => icons[props.tone])
const classes = computed(() => {
  if (props.tone === 'success') return {
    wrapper: 'border-emerald-200 bg-emerald-50/70',
    orb: 'bg-emerald-100',
    icon: 'bg-emerald-100 text-emerald-700',
    title: 'text-emerald-950',
    text: 'text-emerald-800/80',
    important: 'border-emerald-200 text-emerald-900',
    dot: 'bg-emerald-500',
  }
  if (props.tone === 'warning') return {
    wrapper: 'border-amber-200 bg-amber-50/70',
    orb: 'bg-amber-100',
    icon: 'bg-amber-100 text-amber-700',
    title: 'text-amber-950',
    text: 'text-amber-800/80',
    important: 'border-amber-200 text-amber-900',
    dot: 'bg-amber-500',
  }
  return {
    wrapper: 'border-indigo-200 bg-indigo-50/60',
    orb: 'bg-indigo-100',
    icon: 'bg-indigo-100 text-indigo-700',
    title: 'text-indigo-950',
    text: 'text-indigo-800/80',
    important: 'border-indigo-200 text-indigo-900',
    dot: 'bg-indigo-500',
  }
})
</script>
