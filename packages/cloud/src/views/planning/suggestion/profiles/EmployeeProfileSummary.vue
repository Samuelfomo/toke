<template>
  <section class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          Résumé avant enregistrement
        </p>
        <h3 class="mt-1 text-sm font-bold text-slate-900">
          {{ employeeName || 'Collaborateur à sélectionner' }}
        </h3>
      </div>
      <span
        class="rounded-full px-2.5 py-1 text-xs font-bold"
        :class="active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'"
      >
        {{ active ? 'Actif' : 'Désactivé' }}
      </span>
    </div>

    <dl class="mt-4 grid gap-3 sm:grid-cols-2">
      <div class="rounded-xl bg-white px-3 py-3">
        <dt class="text-xs font-bold uppercase tracking-wide text-slate-400">Mode</dt>
        <dd class="mt-1 text-xs font-semibold text-slate-700">{{ modeLabel }}</dd>
      </div>
      <div class="rounded-xl bg-white px-3 py-3">
        <dt class="text-xs font-bold uppercase tracking-wide text-slate-400">Horaire</dt>
        <dd class="mt-1 text-xs font-semibold text-slate-700">{{ templateName }}</dd>
      </div>
      <div class="rounded-xl bg-white px-3 py-3">
        <dt class="text-xs font-bold uppercase tracking-wide text-slate-400">Ordre</dt>
        <dd class="mt-1 text-xs font-semibold text-slate-700">{{ rotationOrderLabel }}</dd>
      </div>
      <div class="rounded-xl bg-white px-3 py-3">
        <dt class="text-xs font-bold uppercase tracking-wide text-slate-400">Limite hebdomadaire</dt>
        <dd class="mt-1 text-xs font-semibold text-slate-700">{{ weeklyLimitLabel }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MODE_LABELS } from '../planningSuggestion.helpers'
import type { PlanningMode } from '../planningSuggestion.type'

const props = defineProps<{
  employeeName: string
  planningMode: PlanningMode
  templateName: string
  rotationOrder: number | null
  maxWeeklyHours: string
  active: boolean
}>()

const modeLabel = computed(() => MODE_LABELS[props.planningMode])
const rotationOrderLabel = computed(() =>
  props.planningMode === 'EXCLUDED'
    ? 'Non applicable'
    : props.rotationOrder ?? 'Non défini',
)
const weeklyLimitLabel = computed(() =>
  props.maxWeeklyHours
    ? `${props.maxWeeklyHours} heure(s)`
    : 'Règle générale',
)
</script>
