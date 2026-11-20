<template>
  <nav aria-label="Étapes de configuration" class="space-y-2">
    <button
      v-for="step in steps"
      :key="step.id"
      type="button"
      class="group flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition"
      :class="stepClass(step.id)"
      :aria-current="currentStepId === step.id ? 'step' : undefined"
      @click="$emit('select', step.id)"
    >
      <span
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition"
        :class="numberClass(step.id)"
      >
        <component v-if="completedStepIds.includes(step.id)" :is="IconCheck" :size="17" />
        <span v-else>{{ step.number }}</span>
      </span>

      <span class="min-w-0 flex-1">
        <span class="flex items-center justify-between gap-2">
          <span class="text-sm font-bold text-slate-900">{{ step.label }}</span>
          <span
            v-if="errorCounts[step.id]"
            class="inline-flex min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700"
          >
            {{ errorCounts[step.id] }}
          </span>
        </span>
        <span class="mt-1 block text-xs leading-5 text-slate-500">
          {{ step.description }}
        </span>
      </span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { IconCheck } from '@tabler/icons-vue'
import type { PlanningConfigStep, PlanningConfigStepId } from './planningConfig.steps'

const props = withDefaults(
  defineProps<{
    steps: PlanningConfigStep[]
    currentStepId: PlanningConfigStepId
    completedStepIds?: PlanningConfigStepId[]
    errorCounts?: Partial<Record<PlanningConfigStepId, number>>
  }>(),
  {
    completedStepIds: () => [],
    errorCounts: () => ({}),
  },
)

defineEmits<{
  select: [stepId: PlanningConfigStepId]
}>()

function stepClass(stepId: PlanningConfigStepId): string {
  if (props.currentStepId === stepId) {
    return 'border-blue-200 bg-blue-50 shadow-sm shadow-blue-100/60'
  }

  if (props.errorCounts[stepId]) {
    return 'border-red-200 bg-red-50/60 hover:border-red-300'
  }

  return 'border-transparent bg-transparent hover:border-slate-200 hover:bg-white'
}

function numberClass(stepId: PlanningConfigStepId): string {
  if (props.currentStepId === stepId) return 'bg-blue-600 text-white'
  if (props.errorCounts[stepId]) return 'bg-red-100 text-red-700'
  if (props.completedStepIds.includes(stepId)) return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
}
</script>
