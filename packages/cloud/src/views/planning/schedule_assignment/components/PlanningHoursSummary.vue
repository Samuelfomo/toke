<template>
  <section id="schedule-hours-summary" aria-label="Synthèse horaire"
           :aria-busy="loading"
           class="border border-slate-100 bg-white px-3 py-3 sm:px-4">
    <p v-if="loading" role="status" class="text-sm text-slate-600">Chargement des heures planifiées…</p>
    <p v-else-if="unavailable" role="status" class="text-sm text-amber-800">
      Impossible de calculer la synthèse horaire avec les données chargées.
    </p>
    <template v-else>
      <div class="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600" aria-live="polite">
        <span>Du <time :datetime="from">{{ dateLabel(from) }}</time> au <time :datetime="to">{{ dateLabel(to) }}</time></span>
        <span>{{ members.length }} {{ members.length === 1 ? 'collaborateur' : 'collaborateurs' }}</span>
        <strong class="text-sm text-slate-900">{{ formatDurationMinutes(total) }} planifiées</strong>
      </div>
      <p v-if="!members.length" class="mt-2 text-xs text-slate-500">Aucun collaborateur sur cette période avec les filtres appliqués.</p>
      <ul v-else class="mt-2 grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-2">
        <li v-for="member in members" :key="member.guid"
            class="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5">
          <OptimizedEmployeeAvatar :code="codes.get(member.guid) ?? ''" :color="member.employeeColor"/>
          <span class="min-w-0 flex-1 break-words text-xs font-medium text-slate-700">{{ member.name }}</span>
          <strong class="shrink-0 whitespace-nowrap text-xs tabular-nums text-slate-900">
            {{ formatDurationMinutes(member.minutes) }}
          </strong>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { buildEmployeeCodes } from '@/utils/exports/scheduleAssignment.optimized.export'
import { formatDurationMinutes } from '@/views/modules/attendance-statistics/utils/duration'
import type { SchedulePlanningMember } from './views/schedulePlanningView.types'
import OptimizedEmployeeAvatar from './views/OptimizedEmployeeAvatar.vue'

const props = defineProps<{
  from: string
  to: string
  loading: boolean
  unavailable: boolean
  members: (SchedulePlanningMember & { minutes: number })[]
}>()

const total = computed(() => props.members.reduce((sum, member) => sum + member.minutes, 0))
const codes = computed(() => buildEmployeeCodes(props.members))
const dateFormat = new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium', timeZone: 'UTC'})
const dateLabel = (iso: string) => dateFormat.format(new Date(iso))
</script>
