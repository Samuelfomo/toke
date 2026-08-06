<template>
  <button
    type="button"
    class="group rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    :class="selected ? selectedClass : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'"
    :aria-pressed="selected"
    @click="$emit('select')"
  >
    <div class="flex items-start justify-between gap-3">
      <div
        class="flex h-10 w-10 items-center justify-center rounded-xl"
        :class="selected ? iconSelectedClass : 'bg-slate-100 text-slate-500 group-hover:bg-white'"
      >
        <component :is="icon" :size="20" />
      </div>
      <span
        v-if="selected"
        class="rounded-full bg-white/80 px-2 py-1 text-xs font-bold uppercase tracking-wide"
      >
        Sélectionné
      </span>
    </div>

    <p class="mt-4 text-sm font-bold">
      {{ label }}
    </p>
    <p class="mt-1 text-xs leading-5 opacity-75">
      {{ description }}
    </p>

    <div class="mt-4 rounded-xl border border-current/10 bg-white/60 px-3 py-2.5">
      <p class="text-xs font-bold uppercase tracking-[0.1em] opacity-60">
        Conséquence
      </p>
      <p class="mt-1 text-xs font-medium leading-5">
        {{ consequence }}
      </p>
    </div>
  </button>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    label: string
    description: string
    consequence: string
    icon: Component
    selected?: boolean
    selectedClass: string
    iconSelectedClass: string
  }>(),
  {
    selected: false,
  },
)

defineEmits<{ select: [] }>()
</script>
