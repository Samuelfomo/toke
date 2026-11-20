<template>
  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div class="border-b border-slate-200 bg-blue-50 px-4 py-3">
      <p class="text-sm font-bold text-blue-900">{{ template.name }}</p>
      <p v-if="template.description" class="mt-1 text-xs text-slate-600">{{ template.description }}</p>
      <p class="mt-1 text-xs text-slate-500">Horaires de chaque journée, pauses et tolérances</p>
    </div>
    <dl class="divide-y divide-slate-100">
      <div v-for="day in DAYS" :key="day.key" class="grid grid-cols-[90px_1fr] gap-3 px-4 py-3">
        <dt class="text-xs font-bold text-slate-700">{{ day.label }}</dt>
        <dd class="min-w-0 space-y-3 text-xs">
          <template v-if="template.definition?.[day.key]?.length">
            <div v-for="(block, index) in template.definition[day.key]" :key="index" class="space-y-1">
              <p class="font-semibold text-slate-800">
                {{ block.work[0] }} – {{ block.work[1] }}
                <span v-if="endDayOffset(block)" class="text-blue-700">({{ endDayOffset(block) === 1 ? 'fin le lendemain' : `fin à J+${endDayOffset(block)}` }})</span>
              </p>
              <p class="text-slate-600">{{ block.pause ? `Pause : ${block.pause[0]} – ${block.pause[1]}` : 'Sans pause prévue' }}</p>
              <p class="text-slate-600">Tolérance : {{ block.tolerance }} min</p>
            </div>
          </template>
          <p v-else class="text-slate-500">{{ emptyDayLabel(day.key) }}</p>
        </dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
import type {IDayBlock, ISessionTemplate} from '../../session_template/type'

const props = defineProps<{template: ISessionTemplate}>()
const DAYS = [
  {key: 'Mon', label: 'Lundi'}, {key: 'Tue', label: 'Mardi'},
  {key: 'Wed', label: 'Mercredi'}, {key: 'Thu', label: 'Jeudi'},
  {key: 'Fri', label: 'Vendredi'}, {key: 'Sat', label: 'Samedi'},
  {key: 'Sun', label: 'Dimanche'},
]

function emptyDayLabel(day: string): string {
  const value = props.template.definition?.[day]
  if (Array.isArray(value)) return 'Repos'
  if (value === null) return 'Fermé'
  return 'Non configuré'
}

function endDayOffset(block: IDayBlock): number {
  return block.end_day_offset ?? (block.work[1] < block.work[0] ? 1 : 0)
}
</script>
