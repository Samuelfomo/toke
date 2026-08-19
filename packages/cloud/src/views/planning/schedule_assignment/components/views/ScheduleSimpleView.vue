<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
      <div>
        <p class="text-sm font-bold text-emerald-800">Vue simplifiée</p>
        <p class="text-xs text-emerald-700/80">Prises de service + repos. Les fins d'horaire, pauses et la continuité technique de 00h00 sont masquées.</p>
      </div>
      <span class="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
        {{ members.length }} employé(s)
      </span>
    </div>

    <section v-for="week in weekViews" :key="week.from" class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Programme simplifié</p>
          <p class="text-sm font-semibold text-slate-800">{{ formatWeekLabel(week.from, week.to) }}</p>
        </div>
        <span class="text-xs text-slate-400">{{ week.dates.length }} jour(s)</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
          <tr class="border-b border-slate-100 bg-white">
            <th class="sticky left-0 z-10 min-w-[170px] border-r border-slate-100 bg-white px-4 py-2.5 text-left text-xs font-bold text-slate-500">Date</th>
            <th v-if="week.showGroupColumn" class="min-w-[130px] border-r border-slate-100 px-3 py-2.5 text-left text-xs font-bold text-slate-500">Groupe</th>
            <th
                v-for="start in week.startTimes"
                :key="start"
                class="min-w-[150px] border-r border-slate-100 px-3 py-2.5 text-left text-xs font-bold text-slate-500"
            >
              {{ formatCompactTime(start) }}
            </th>
            <th class="min-w-[150px] bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-500">Repos</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="row in week.rows" :key="`${row.iso}-${row.groupName ?? 'all'}`" class="border-b border-slate-100 last:border-0">
            <td class="sticky left-0 z-10 border-r border-slate-100 bg-white px-4 py-3 align-top">
              <p class="text-xs font-semibold text-slate-800">{{ row.dateLabel }}</p>
            </td>
            <td v-if="week.showGroupColumn" class="border-r border-slate-100 px-3 py-3 align-top text-xs text-slate-600">
              {{ row.groupName ?? 'Sans groupe' }}
            </td>
            <td v-for="start in week.startTimes" :key="start" class="border-r border-slate-100 px-3 py-3 align-top">
              <div v-if="row.namesByStart[start]?.length" class="flex flex-wrap gap-1.5">
                  <span
                      v-for="name in row.namesByStart[start]"
                      :key="name"
                      class="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700"
                  >
                    {{ name }}
                  </span>
              </div>
              <span v-else class="text-xs text-slate-300">—</span>
            </td>
            <td class="bg-slate-50/60 px-3 py-3 align-top">
              <div v-if="row.restNames.length" class="flex flex-wrap gap-1.5">
                  <span
                      v-for="name in row.restNames"
                      :key="name"
                      class="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"
                  >
                    {{ name }}
                  </span>
              </div>
              <span v-else class="text-xs text-slate-300">—</span>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  buildSimplifiedRows,
  collectStartTimes,
  formatCompactTime,
  splitPeriodIntoWeeks,
} from '@/utils/exports/scheduleAssignment.simple.export'
import type { SchedulePlanningMember } from './schedulePlanningView.types'

const props = defineProps<{
  members: SchedulePlanningMember[]
  periodFrom: string
  periodTo: string
}>()

function normalizeTime(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return value.trim()
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

const weekViews = computed(() =>
    splitPeriodIntoWeeks(props.periodFrom, props.periodTo).map((week) => {
      const startTimes = collectStartTimes(props.members, week.dates)
          .filter((start) => normalizeTime(start) !== '00:00')

      const grid = buildSimplifiedRows(props.members, week.dates, startTimes)

      return {
        ...week,
        startTimes,
        ...grid,
      }
    }),
)

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatWeekLabel(from: string, to: string): string {
  return `${formatDate(from)} → ${formatDate(to)}`
}
</script>
