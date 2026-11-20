<template>
  <div
      class="rounded-2xl border border-slate-200 bg-white overflow-hidden"
      role="status"
      aria-live="polite"
      :aria-label="refreshing ? 'Actualisation du planning' : 'Chargement du planning'"
  >
    <div class="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
          <IconLoader2 :size="18" class="animate-spin text-blue-500"/>
        </div>
        <div>
          <p class="text-sm font-bold text-slate-700">
            {{ refreshing ? 'Actualisation du planning…' : 'Chargement du planning…' }}
          </p>
          <p class="mt-0.5 text-xs text-slate-400">
            {{ loadingDescription }}
          </p>
        </div>
      </div>

      <span class="hidden sm:inline-flex rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {{ modeLabel }}
      </span>
    </div>

    <div v-if="mode === 'detailed'" class="p-5 animate-pulse">
      <div class="mb-4 flex gap-4">
        <div class="h-3 w-20 rounded bg-slate-100"/>
        <div class="h-3 w-16 rounded bg-slate-100"/>
        <div class="h-3 w-24 rounded bg-slate-100"/>
      </div>

      <div class="space-y-4">
        <div v-for="index in 4" :key="index" class="overflow-hidden rounded-xl border border-slate-100">
          <div class="flex items-center justify-between bg-slate-50 px-4 py-3">
            <div class="h-3 w-24 rounded bg-slate-200"/>
            <div class="h-3 w-16 rounded bg-slate-200"/>
          </div>
          <div class="grid grid-cols-4 gap-3 p-4">
            <div v-for="cell in 8" :key="cell" class="h-7 rounded-lg bg-slate-100"/>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="mode === 'simple'" class="p-5 animate-pulse">
      <div class="overflow-hidden rounded-xl border border-slate-100">
        <div class="grid grid-cols-5 gap-px bg-slate-100">
          <div v-for="cell in 5" :key="`head-${cell}`" class="h-9 bg-slate-50 p-3">
            <div class="h-2.5 w-2/3 rounded bg-slate-200"/>
          </div>
        </div>
        <div v-for="row in 6" :key="row" class="grid grid-cols-5 gap-px border-t border-slate-100">
          <div v-for="cell in 5" :key="cell" class="h-14 bg-white p-3">
            <div class="mb-2 h-2.5 rounded bg-slate-100" :class="cell === 1 ? 'w-3/4' : 'w-1/2'"/>
            <div v-if="cell > 1" class="h-2 w-2/3 rounded bg-slate-50"/>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="p-5 animate-pulse">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="month in 6" :key="month" class="rounded-xl border border-slate-100 p-3">
          <div class="mx-auto mb-3 h-3 w-24 rounded bg-slate-200"/>
          <div class="mb-2 grid grid-cols-7 gap-1">
            <div v-for="day in 7" :key="day" class="h-2 rounded bg-slate-100"/>
          </div>
          <div class="grid grid-cols-7 gap-1">
            <div v-for="day in 35" :key="day" class="aspect-square rounded bg-slate-50"/>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {IconLoader2} from '@tabler/icons-vue'
import type {PlanningDisplayMode} from '../views/schedulePlanningView.types'

const props = defineProps<{
  mode: PlanningDisplayMode
  refreshing?: boolean
}>()

const modeLabel = computed(() => {
  if (props.mode === 'simple') return 'Vue simplifiée'
  if (props.mode === 'optimized') return 'Vue optimisée'
  return 'Vue détaillée'
})

const loadingDescription = computed(() => {
  if (props.refreshing) return 'Mise à jour des affectations et des modèles horaires.'
  return 'Récupération des affectations et des modèles horaires.'
})
</script>
