<template>
  <div class="min-h-[116px] rounded-xl border p-2.5 transition" :class="cellClass">
    <div v-if="requirements.length" class="space-y-2">
      <button
        v-for="requirement in requirements"
        :key="requirement.guid"
        type="button"
        class="block w-full rounded-lg border p-2 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-300"
        :class="requirementClass(requirement)"
        :title="requirementTitle(requirement)"
        @click="$emit('edit', requirement)"
      >
        <div class="flex items-start justify-between gap-2">
          <span class="text-xs font-bold leading-4 text-slate-800">
            {{ employeeSummary(requirement) }}
          </span>
          <span
            v-if="duplicateGuids.includes(requirement.guid)"
            class="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-bold uppercase text-red-700"
          >
            Doublon
          </span>
          <span
            v-else-if="!requirement.active"
            class="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-bold uppercase text-slate-600"
          >
            Inactif
          </span>
        </div>

        <p class="mt-1 text-xs font-semibold text-slate-500">
          {{ ALLOCATION_LABELS[requirement.allocation_mode] }}
        </p>
        <p class="mt-1 truncate text-xs text-slate-400">
          {{ requirementTimeSummary(requirement, day) }}
        </p>
      </button>
    </div>

    <button
      type="button"
      class="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 px-2 py-2 text-xs font-bold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
      :class="requirements.length ? '' : 'min-h-[88px]'"
      :aria-label="`Ajouter un besoin pour ${DAY_LABELS[day]}`"
      @click="$emit('create')"
    >
      <IconPlus :size="13" />
      {{ requirements.length ? 'Ajouter une règle' : 'Définir le besoin' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconPlus } from '@tabler/icons-vue'

import { ALLOCATION_LABELS, DAY_LABELS } from '../planningSuggestion.helpers'
import type { PlanningDayKey, PlanningRequirement } from '../planningSuggestion.type'
import { requirementTimeSummary } from './requirementMatrix.helpers'

const props = withDefaults(
  defineProps<{
    day: PlanningDayKey
    requirements: PlanningRequirement[]
    duplicateGuids?: string[]
  }>(),
  {
    duplicateGuids: () => [],
  },
)

defineEmits<{
  edit: [requirement: PlanningRequirement]
  create: []
}>()

const cellClass = computed(() => {
  if (!props.requirements.length) {
    return 'border-dashed border-amber-200 bg-amber-50/30'
  }
  if (
    props.requirements.some((requirement) =>
      props.duplicateGuids.includes(requirement.guid),
    )
  ) {
    return 'border-red-200 bg-red-50/30'
  }
  return 'border-slate-200 bg-slate-50/40'
})

function employeeSummary(requirement: PlanningRequirement): string {
  if (requirement.allocation_mode === 'FILL_REMAINING') {
    return 'Tous les disponibles'
  }
  if (requirement.allocation_mode === 'EXACT') {
    return `${requirement.target_employees} employé${requirement.target_employees > 1 ? 's' : ''}`
  }

  const maximum = requirement.max_employees ?? '∞'
  return `${requirement.min_employees} / ${requirement.target_employees} / ${maximum}`
}

function requirementClass(requirement: PlanningRequirement): string {
  if (props.duplicateGuids.includes(requirement.guid)) {
    return 'border-red-200 bg-white hover:border-red-300'
  }
  if (!requirement.active) {
    return 'border-slate-200 bg-slate-100 opacity-70 hover:opacity-100'
  }
  if (requirement.service_type === 'GUARD') {
    return 'border-violet-100 bg-violet-50/70 hover:border-violet-300'
  }
  return 'border-slate-200 bg-white hover:border-blue-300'
}

function requirementTitle(requirement: PlanningRequirement): string {
  const values = employeeSummary(requirement)
  return `${ALLOCATION_LABELS[requirement.allocation_mode]} · ${values} · Cliquer pour modifier`
}
</script>
