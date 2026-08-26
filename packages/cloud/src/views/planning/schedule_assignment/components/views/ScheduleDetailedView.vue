<template>
  <div class="space-y-6">
    <div
        v-if="hiddenCount > 0"
        class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700"
    >
      <IconChevronDown :size="14" />
      {{ hiddenCount }} employé(s) supplémentaire(s) non affiché(s). Augmentez la limite d'affichage pour les voir.
    </div>

    <div class="flex flex-wrap items-center gap-4 px-1 text-xs text-slate-400">
      <div class="flex items-center gap-1.5">
        <div class="flex h-5 w-5 items-center justify-center rounded-md border border-green-200 bg-green-100">
          <div class="h-1.5 w-1.5 rounded-full bg-green-500" />
        </div>
        <span>Présent</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="flex h-5 w-5 items-center justify-center rounded-md border border-amber-200 bg-amber-50">
          <div class="h-1.5 w-1.5 rounded-full bg-amber-500" />
        </div>
        <span>Pause</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-slate-100">
          <span class="text-sm font-medium text-slate-400">—</span>
        </div>
        <span>Absent / repos</span>
      </div>
    </div>

    <div
        v-for="section in daySections"
        :key="section.day.iso"
        class="overflow-hidden rounded-xl border bg-white shadow-sm"
        :class="section.day.isToday ? 'border-blue-300' : 'border-slate-200'"
    >
      <div
          class="flex items-center justify-between border-b px-4 py-3"
          :class="section.day.isToday
          ? 'border-blue-200 bg-blue-50'
          : section.day.isWeekend
            ? 'border-slate-100 bg-slate-50'
            : 'border-slate-100 bg-white'"
      >
        <div class="flex items-center gap-2">
          <span
              class="text-xs font-bold uppercase tracking-wide"
              :class="section.day.isToday ? 'text-blue-600' : 'text-slate-500'"
          >
            {{ section.day.dayLabel }}
          </span>
          <span
              class="text-sm font-bold"
              :class="section.day.isToday ? 'text-blue-700' : 'text-slate-800'"
          >
            {{ section.day.dayNum }}/{{ section.day.monthNum }}
          </span>
          <span
              v-if="section.day.isToday"
              class="rounded-full bg-blue-500 px-1.5 py-0.5 text-xs font-bold text-white"
          >
            Aujourd'hui
          </span>
          <span v-if="section.day.isWeekend && !section.day.isToday" class="text-xs italic text-slate-400">
            Week-end
          </span>
        </div>
        <span v-if="section.blocks.length === 0" class="text-xs italic text-slate-400">Jour de repos</span>
        <span v-else class="text-xs text-slate-400">{{ section.blocks.length }} bloc(s) horaire(s)</span>
      </div>

      <div v-if="section.blocks.length > 0" class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
          <tr class="border-b border-slate-100 bg-slate-50">
            <th class="sticky left-0 z-10 w-48 border-r border-slate-100 bg-slate-50 px-4 py-2.5 text-left text-xs font-bold text-slate-500">
              Employé
            </th>
            <th
                v-for="block in section.blocks"
                :key="block.label"
                class="min-w-[90px] border-l border-slate-100 px-3 py-2.5 text-center text-xs font-bold text-slate-500"
            >
              {{ block.label }}
            </th>
          </tr>
          </thead>
          <tbody>
          <tr
              v-for="member in members"
              :key="member.guid"
              class="border-b border-slate-100 bg-white transition last:border-0 hover:bg-slate-50/40"
          >
            <td class="sticky left-0 z-10 border-r border-slate-100 bg-inherit px-4 py-2.5">
              <button
                  type="button"
                  class="group flex w-full items-center gap-2.5 rounded-lg text-left transition"
                  :class="canAdjust(section.day.iso)
                    ? 'cursor-pointer hover:bg-blue-50/80 focus:outline-none focus:ring-2 focus:ring-blue-100'
                    : 'cursor-default'"
                  :disabled="!canAdjust(section.day.iso)"
                  :title="canAdjust(section.day.iso) ? 'Ajuster le service de cette journée' : 'Les jours passés ne sont pas modifiables'"
                  @click="requestAdjustment(member, section.day.iso)"
              >
                <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {{ initials(member.name) }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="max-w-[120px] truncate text-xs font-semibold leading-tight text-slate-800">{{ member.name }}</p>
<!--                  <p v-if="member.code" class="text-xs text-slate-400">{{ member.code }}</p>-->
                </div>
                <span
                    v-if="canAdjust(section.day.iso)"
                    class="opacity-0 text-[10px] font-bold text-blue-500 transition group-hover:opacity-100"
                >
                  Ajuster
                </span>
              </button>
            </td>
            <td
                v-for="block in section.blocks"
                :key="block.label"
                class="border-l border-slate-100 px-2 py-2 text-center"
            >
              <BlockCell :status="section.matrix[member.guid]?.[block.label] ?? 'absent'" />
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="px-4 py-3">
        <p class="text-xs italic text-slate-400">Aucun bloc horaire planifié ce jour.</p>
        <div v-if="canAdjust(section.day.iso)" class="mt-3 flex flex-wrap gap-2">
          <button
              v-for="member in members"
              :key="`${section.day.iso}-${member.guid}`"
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              @click="requestAdjustment(member, section.day.iso)"
          >
            {{ member.name }} · Ajuster
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import { IconChevronDown } from '@tabler/icons-vue'
import type {
  ScheduleCalendarDay,
  ScheduleDayAdjustmentTarget,
  SchedulePlanningMember,
} from './schedulePlanningView.types'

const props = withDefaults(
    defineProps<{
      members: SchedulePlanningMember[]
      days: ScheduleCalendarDay[]
      hiddenCount?: number
    }>(),
    {
      hiddenCount: 0,
    },
)

const emit = defineEmits<{
  adjust: [target: ScheduleDayAdjustmentTarget]
}>()

const todayIso = new Date().toISOString().slice(0, 10)

function canAdjust(iso: string): boolean {
  return iso >= todayIso
}

function requestAdjustment(member: SchedulePlanningMember, date: string): void {
  if (!canAdjust(date)) return
  emit('adjust', {member, date})
}

type BlockStatus = 'work' | 'pause' | 'absent'

const BlockCell = defineComponent({
  props: {
    status: {
      type: String as () => BlockStatus,
      default: 'absent',
    },
  },
  setup(componentProps) {
    return () => {
      if (componentProps.status === 'work') {
        return h('div', {
          class: 'w-full px-3 py-1.5 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center gap-1.5',
        }, [
          h('div', { class: 'w-2 h-2 rounded-full bg-green-500 flex-shrink-0' }),
          h('span', { class: 'text-xs font-semibold text-green-700' }, 'Présent'),
        ])
      }

      if (componentProps.status === 'pause') {
        return h('div', {
          class: 'w-full px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center gap-1.5',
        }, [
          h('div', { class: 'w-2 h-2 rounded-full bg-amber-400 flex-shrink-0' }),
          h('span', { class: 'text-xs font-semibold text-amber-600' }, 'Pause'),
        ])
      }

      return h('span', { class: 'text-slate-300 text-sm font-medium' }, '—')
    }
  },
})

interface TimeBlock {
  start: string
  end: string
  label: string
}

interface DaySection {
  day: ScheduleCalendarDay
  blocks: TimeBlock[]
  matrix: Record<string, Record<string, BlockStatus>>
}

function timeToMin(value: string): number {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + (minute ?? 0)
}

function minToTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

function computeDayBlocks(iso: string): TimeBlock[] {
  const points = new Set<number>()

  for (const member of props.members) {
    for (const slot of member.scheduleByDate[iso] ?? []) {
      points.add(timeToMin(slot.work[0]))
      points.add(timeToMin(slot.work[1]))
      if (slot.pause) {
        points.add(timeToMin(slot.pause[0]))
        points.add(timeToMin(slot.pause[1]))
      }
    }
  }

  const sorted = Array.from(points).sort((a, b) => a - b)
  return sorted.slice(0, -1).map((point, index) => {
    const start = minToTime(point)
    const end = minToTime(sorted[index + 1])
    return { start, end, label: `${start} – ${end}` }
  })
}

function getMemberBlockStatus(
    member: SchedulePlanningMember,
    iso: string,
    block: TimeBlock,
): BlockStatus {
  const slots = member.scheduleByDate[iso]
  if (!slots) return 'absent'

  const blockStart = timeToMin(block.start)
  const blockEnd = timeToMin(block.end)

  for (const slot of slots) {
    const workStart = timeToMin(slot.work[0])
    const workEnd = timeToMin(slot.work[1])

    if (workStart < blockEnd && workEnd > blockStart) {
      if (slot.pause) {
        const pauseStart = timeToMin(slot.pause[0])
        const pauseEnd = timeToMin(slot.pause[1])
        if (pauseStart < blockEnd && pauseEnd > blockStart) return 'pause'
      }
      return 'work'
    }
  }

  return 'absent'
}

const daySections = computed<DaySection[]>(() =>
    props.days.map((day) => {
      const blocks = computeDayBlocks(day.iso)
      const matrix: DaySection['matrix'] = {}

      for (const member of props.members) {
        matrix[member.guid] = {}
        for (const block of blocks) {
          matrix[member.guid][block.label] = getMemberBlockStatus(member, day.iso, block)
        }
      }

      return { day, blocks, matrix }
    }),
)

function initials(name: string): string {
  return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toLocaleUpperCase('fr-FR')
}
</script>