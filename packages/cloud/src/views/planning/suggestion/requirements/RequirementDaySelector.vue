<template>
  <section>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <label class="text-xs font-bold text-slate-700">
          Jours concernés <span class="text-red-500">*</span>
        </label>
        <p class="mt-1 text-xs leading-4 text-slate-400">
          Appliquez la même règle à un ou plusieurs jours de la semaine.
        </p>
      </div>

      <div v-if="!disabled" class="flex flex-wrap gap-1.5">
        <button
          v-for="preset in presets"
          :key="preset.label"
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          @click="applyPreset(preset.days)"
        >
          {{ preset.label }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          @click="applyPreset([])"
        >
          Effacer
        </button>
      </div>
    </div>

    <div class="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
      <button
        v-for="day in DAY_ORDER"
        :key="day"
        type="button"
        class="relative rounded-xl border px-2 py-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-300"
        :class="buttonClass(day)"
        :disabled="disabled"
        :aria-pressed="modelValue.includes(day)"
        @click="toggleDay(day)"
      >
        {{ DAY_LABELS[day].slice(0, 3) }}
        <span
          v-if="conflictDays.includes(day)"
          class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-xs text-white"
          title="Une règle identique existe déjà"
        >
          !
        </span>
      </button>
    </div>

    <p v-if="error" class="mt-2 text-xs font-medium text-red-600">
      {{ error }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { DAY_LABELS, DAY_ORDER } from '../planningSuggestion.helpers'
import type { PlanningDayKey } from '../planningSuggestion.type'

const props = withDefaults(
  defineProps<{
    modelValue: PlanningDayKey[]
    disabled?: boolean
    conflictDays?: PlanningDayKey[]
    error?: string
  }>(),
  {
    disabled: false,
    conflictDays: () => [],
    error: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [days: PlanningDayKey[]]
}>()

const presets: Array<{ label: string; days: PlanningDayKey[] }> = [
  { label: 'Jours ouvrés', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { label: 'Week-end', days: ['Sat', 'Sun'] },
  { label: 'Toute la semaine', days: [...DAY_ORDER] },
]

function toggleDay(day: PlanningDayKey): void {
  if (props.disabled) return

  const next = props.modelValue.includes(day)
    ? props.modelValue.filter((value) => value !== day)
    : [...props.modelValue, day]

  emit('update:modelValue', DAY_ORDER.filter((value) => next.includes(value)))
}

function applyPreset(days: PlanningDayKey[]): void {
  if (props.disabled) return
  emit('update:modelValue', [...days])
}

function buttonClass(day: PlanningDayKey): string {
  const selected = props.modelValue.includes(day)
  const conflict = props.conflictDays.includes(day)

  if (selected && conflict) {
    return 'border-red-300 bg-red-50 text-red-700 ring-2 ring-red-100'
  }
  if (selected) {
    return 'border-blue-300 bg-blue-50 text-blue-700 ring-2 ring-blue-100'
  }
  return 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
}
</script>
