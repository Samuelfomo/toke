<template>
  <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Couverture</p>
      <p class="mt-2 text-2xl font-bold text-slate-900">{{ summary.coveredDays.length }}/7</p>
      <p class="mt-1 text-xs text-slate-500">jours avec au moins une règle active</p>
    </article>

    <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Règles actives</p>
      <p class="mt-2 text-2xl font-bold text-slate-900">{{ summary.activeCount }}</p>
      <p class="mt-1 text-xs text-slate-500">sur {{ summary.totalCount }} règle(s) enregistrée(s)</p>
    </article>

    <article class="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 shadow-sm">
      <p class="text-xs font-bold uppercase tracking-wide text-violet-500">Gardes</p>
      <p class="mt-2 text-2xl font-bold text-violet-900">{{ summary.guardCount }}</p>
      <p class="mt-1 text-xs text-violet-700">règle(s) de garde active(s)</p>
    </article>

    <article
      class="rounded-2xl border p-4 shadow-sm"
      :class="summary.duplicateGroupCount
        ? 'border-red-200 bg-red-50/60'
        : 'border-emerald-100 bg-emerald-50/50'"
    >
      <p
        class="text-xs font-bold uppercase tracking-wide"
        :class="summary.duplicateGroupCount ? 'text-red-500' : 'text-emerald-600'"
      >
        Doublons
      </p>
      <p
        class="mt-2 text-2xl font-bold"
        :class="summary.duplicateGroupCount ? 'text-red-900' : 'text-emerald-900'"
      >
        {{ summary.duplicateGroupCount }}
      </p>
      <p
        class="mt-1 text-xs"
        :class="summary.duplicateGroupCount ? 'text-red-700' : 'text-emerald-700'"
      >
        {{ summary.duplicateGroupCount ? `${summary.duplicateRequirementCount} règle(s) concernée(s)` : 'aucun doublon exact détecté' }}
      </p>
    </article>

    <article
      class="rounded-2xl border p-4 shadow-sm"
      :class="summary.uncoveredDays.length
        ? 'border-amber-200 bg-amber-50/60'
        : 'border-emerald-100 bg-emerald-50/50'"
    >
      <p
        class="text-xs font-bold uppercase tracking-wide"
        :class="summary.uncoveredDays.length ? 'text-amber-600' : 'text-emerald-600'"
      >
        Jours à compléter
      </p>
      <p
        class="mt-2 text-2xl font-bold"
        :class="summary.uncoveredDays.length ? 'text-amber-900' : 'text-emerald-900'"
      >
        {{ summary.uncoveredDays.length }}
      </p>
      <p
        class="mt-1 line-clamp-2 text-xs"
        :class="summary.uncoveredDays.length ? 'text-amber-700' : 'text-emerald-700'"
      >
        {{ uncoveredLabel }}
      </p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { DAY_LABELS } from '../planningSuggestion.helpers'
import type { RequirementCoverageSummaryData } from './requirementMatrix.helpers'

const props = defineProps<{
  summary: RequirementCoverageSummaryData
}>()

const uncoveredLabel = computed(() => {
  if (!props.summary.uncoveredDays.length) return 'semaine entièrement couverte'
  return props.summary.uncoveredDays.map((day) => DAY_LABELS[day]).join(', ')
})
</script>
