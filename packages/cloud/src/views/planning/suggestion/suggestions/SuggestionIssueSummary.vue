<template>
  <section class="rounded-2xl border bg-white p-5 shadow-sm" :class="summaryTone.border">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="flex items-start gap-3">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" :class="summaryTone.icon">
          <IconCircleCheck v-if="hardCount === 0 && belowMinimumCount === 0" :size="22" />
          <IconAlertTriangle v-else :size="22" />
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Priorité de contrôle</p>
          <h2 class="mt-1 text-base font-bold text-slate-900">{{ title }}</h2>
          <p class="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{{ description }}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" class="metric" @click="$emit('open', 'issues')">
          <span class="metric-value text-red-700">{{ hardCount }}</span>
          <span class="metric-label">Violations dures</span>
        </button>
        <button type="button" class="metric" @click="$emit('open', 'coverage')">
          <span class="metric-value text-amber-700">{{ belowMinimumCount }}</span>
          <span class="metric-label">Sous minimum</span>
        </button>
        <button type="button" class="metric" @click="$emit('filter-manual')">
          <span class="metric-value text-orange-700">{{ manualCount }}</span>
          <span class="metric-label">Modifications</span>
        </button>
        <button type="button" class="metric" @click="$emit('filter-unassigned')">
          <span class="metric-value text-slate-700">{{ unassignedCount }}</span>
          <span class="metric-label">Non affectés</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-vue'

const props = defineProps<{
  hardCount: number
  belowMinimumCount: number
  warningCount: number
  manualCount: number
  unassignedCount: number
}>()

defineEmits<{
  open: [tab: 'coverage' | 'issues']
  'filter-manual': []
  'filter-unassigned': []
}>()

const title = computed(() => {
  if (props.hardCount > 0) return `${props.hardCount} violation(s) dure(s) à corriger`
  if (props.belowMinimumCount > 0) return `${props.belowMinimumCount} minimum(s) de couverture non atteint(s)`
  if (props.warningCount > 0) return `Proposition publiable avec ${props.warningCount} avertissement(s)`
  return 'Aucun blocage majeur détecté'
})

const description = computed(() => {
  if (props.hardCount > 0 || props.belowMinimumCount > 0) {
    return 'La publication est désactivée jusqu’à la correction des points bloquants. Consultez les alertes et la couverture avant de modifier la grille.'
  }
  return 'Les contrôles bloquants sont validés. Vérifiez encore les modifications manuelles, les gardes et les repos avant publication.'
})

const summaryTone = computed(() =>
  props.hardCount > 0 || props.belowMinimumCount > 0
    ? { border: 'border-red-200', icon: 'bg-red-50 text-red-700' }
    : props.warningCount > 0
      ? { border: 'border-amber-200', icon: 'bg-amber-50 text-amber-700' }
      : { border: 'border-emerald-200', icon: 'bg-emerald-50 text-emerald-700' },
)
</script>

<style scoped>
.metric {
  min-width: 104px;
  border-radius: 0.85rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0.65rem 0.75rem;
  text-align: left;
  transition: 0.15s;
}
.metric:hover { background: #f1f5f9; }
.metric-value { display: block; font-size: 1.1rem; font-weight: 800; }
.metric-label { margin-top: 0.2rem; display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; }
</style>
