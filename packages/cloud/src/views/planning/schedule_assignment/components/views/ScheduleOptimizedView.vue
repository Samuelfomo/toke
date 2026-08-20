<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-sm font-bold text-indigo-800">Vue optimisée longue période</p>
          <span
              class="rounded-full border px-2 py-0.5 text-[10px] font-bold"
              :class="visualMode === 'personalized'
                ? 'border-indigo-200 bg-white text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600'"
          >
            {{ visualMode === 'personalized' ? 'Personnalisé' : 'Généralisé · services' }}
          </span>
        </div>
        <p class="mt-0.5 text-xs text-indigo-700/80">
          <template v-if="visualMode === 'personalized'">
            Jusqu'à 6 mois par bloc. La couleur du mini-avatar identifie l'employé ; le repère horaire identifie le service.
          </template>
          <template v-else>
            Jusqu'à 6 mois par bloc. La couleur du mini-avatar représente le service ; les employés restent identifiés par leurs initiales.
          </template>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600">
        <LegendItem label="08h00" kind="morning" />
        <LegendItem label="10h30" kind="mid" />
        <LegendItem label="16h00 / garde" kind="guard" />
        <LegendItem label="Repos" kind="rest" />
        <LegendItem label="Autre horaire" kind="other" />
      </div>
    </div>

    <section
        v-for="(page, pageIndex) in pages"
        :key="`${page.from}-${page.to}`"
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Planning optimisé</p>
          <p class="text-sm font-bold text-slate-800">{{ formatRange(page.from, page.to) }}</p>
        </div>
        <span class="text-xs text-slate-400">Bloc {{ pageIndex + 1 }} · {{ page.months.length }} mois</span>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
            v-for="month in page.months"
            :key="month.key"
            class="overflow-hidden rounded-xl border border-slate-200"
        >
          <div class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-700">
            {{ formatMonthTitle(month) }}
          </div>

          <div class="grid grid-cols-7 border-b border-slate-100 bg-white text-center text-[9px] font-bold uppercase text-slate-400">
            <span v-for="day in DAY_HEADERS" :key="day" class="px-1 py-1.5">{{ day }}</span>
          </div>

          <div class="grid grid-cols-7 gap-px bg-slate-100">
            <div
                v-for="(cell, index) in monthCells(month)"
                :key="`${month.key}-${index}`"
                class="min-h-[76px] bg-white p-1"
                :class="cell?.inPeriod === false ? 'opacity-40' : ''"
            >
              <template v-if="cell">
                <div class="mb-1 flex items-center justify-between">
                  <span class="text-[9px] font-bold text-slate-500">{{ cell.day }}</span>
                  <span v-if="cell.isToday" class="h-1.5 w-1.5 rounded-full bg-blue-500" />
                </div>

                <div class="space-y-[3px]">
                  <div
                      v-for="line in cell.lines"
                      :key="`${cell.iso}-${line.kind}-${line.label}`"
                      class="flex min-w-0 items-start gap-1"
                  >
                    <span
                        class="mt-[3px] w-[18px] flex-none text-[7px] font-extrabold leading-none"
                        :class="kindTextClass(line.kind)"
                        :title="shiftTitle(line.kind, line.label)"
                    >
                      {{ line.label }}
                    </span>

                    <div class="flex min-w-0 flex-wrap gap-[2px]">
                      <OptimizedEmployeeAvatar
                          v-for="employee in line.employees"
                          :key="`${cell.iso}-${line.kind}-${employee.guid}`"
                          :code="employee.code"
                          :color="employee.employeeColor"
                          :mode="visualMode"
                          :kind="line.kind"
                          :title="employeeTitle(employee.code, line.kind, line.label)"
                      />
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </article>
      </div>

      <div class="mt-4 border-t border-slate-100 pt-3">
        <p class="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Légende employés</p>
        <div class="flex flex-wrap gap-2">
          <span
              v-for="employee in employeeLegend"
              :key="employee.guid"
              class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600"
          >
            <OptimizedEmployeeAvatar
                :code="employee.code"
                :color="employee.employeeColor"
                :mode="visualMode"
                :neutral="visualMode === 'generalized'"
                :title="employee.name"
            />
            <span>{{ employee.name }}</span>
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, type PropType } from 'vue'
import {
  buildEmployeeCodes,
  buildOptimizedDays,
  formatEmployeeLegendName,
  formatMonthTitle,
  splitPeriodIntoMonthPages,
  type OptimizedMonth,
  type OptimizedPdfMode,
  type OptimizedShiftKind,
} from '@/utils/exports/scheduleAssignment.optimized.export'
import OptimizedEmployeeAvatar from './OptimizedEmployeeAvatar.vue'
import type { SchedulePlanningMember } from './schedulePlanningView.types'

const props = withDefaults(defineProps<{
  members: SchedulePlanningMember[]
  periodFrom: string
  periodTo: string
  visualMode?: OptimizedPdfMode
}>(), {
  visualMode: 'personalized',
})

const DAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const

const LegendItem = defineComponent({
  props: {
    label: { type: String, required: true },
    kind: { type: String as PropType<OptimizedShiftKind>, required: true },
  },
  setup(componentProps) {
    return () => h('span', { class: 'inline-flex items-center gap-1.5' }, [
      h('span', { class: `h-1.5 w-3 rounded-sm ${legendDotClass(componentProps.kind)}` }),
      h('span', componentProps.label),
    ])
  },
})

const codesByGuid = computed(() => buildEmployeeCodes(props.members))
const daysByIso = computed(() => buildOptimizedDays(
    props.members,
    props.periodFrom,
    props.periodTo,
    codesByGuid.value,
))
const pages = computed(() => splitPeriodIntoMonthPages(props.periodFrom, props.periodTo))

const employeeLegend = computed(() =>
    [...props.members]
        .map((member) => ({
          guid: member.guid,
          code: codesByGuid.value.get(member.guid) ?? '—',
          name: formatEmployeeLegendName(member),
          employeeColor: member.employeeColor,
        }))
        .sort((a, b) => a.code.localeCompare(b.code, 'fr')),
)

const employeeByCode = computed(() =>
    new Map(employeeLegend.value.map((employee) => [employee.code, employee.name] as const)),
)

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthCells(month: OptimizedMonth) {
  const first = new Date(Date.UTC(month.year, month.month, 1))
  const lastDay = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate()
  const mondayFirstOffset = (first.getUTCDay() + 6) % 7
  const cells: Array<null | {
    day: number
    iso: string
    inPeriod: boolean
    isToday: boolean
    lines: Array<{
      kind: OptimizedShiftKind
      label: string
      codes: string[]
      employees: Array<{ guid: string; code: string; employeeColor: string | null }>
    }>
  }> = Array.from({ length: mondayFirstOffset }, () => null)
  const todayIso = new Date().toISOString().slice(0, 10)

  for (let day = 1; day <= lastDay; day++) {
    const iso = toIso(month.year, month.month, day)
    cells.push({
      day,
      iso,
      inPeriod: iso >= props.periodFrom && iso <= props.periodTo,
      isToday: iso === todayIso,
      lines: daysByIso.value.get(iso)?.lines ?? [],
    })
  }

  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function kindTextClass(kind: OptimizedShiftKind): string {
  switch (kind) {
    case 'morning': return 'text-blue-700'
    case 'mid': return 'text-amber-700'
    case 'guard': return 'text-rose-700'
    case 'rest': return 'text-slate-500'
    default: return 'text-violet-700'
  }
}

function legendDotClass(kind: OptimizedShiftKind): string {
  switch (kind) {
    case 'morning': return 'bg-blue-500'
    case 'mid': return 'bg-amber-500'
    case 'guard': return 'bg-rose-500'
    case 'rest': return 'bg-slate-400'
    default: return 'bg-violet-500'
  }
}

function shiftTitle(kind: OptimizedShiftKind, label: string): string {
  switch (kind) {
    case 'morning': return 'Prise de service à 08h00'
    case 'mid': return 'Prise de service à 10h30'
    case 'guard': return 'Garde à partir de 16h00'
    case 'rest': return 'Repos planifié'
    default: return `Prise de service : ${label}`
  }
}

function employeeTitle(code: string, kind: OptimizedShiftKind, label: string): string {
  const name = employeeByCode.value.get(code) ?? code
  return `${name} · ${shiftTitle(kind, label)}`
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatRange(from: string, to: string): string {
  return `${formatDate(from)} → ${formatDate(to)}`
}
</script>


<!--<template>-->
<!--  <div class="space-y-6">-->
<!--    <div class="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">-->
<!--      <div>-->
<!--        <p class="text-sm font-bold text-indigo-800">Vue optimisée longue période</p>-->
<!--        <p class="mt-0.5 text-xs text-indigo-700/80">-->
<!--          Jusqu'à 6 mois par bloc. La couleur du mini-avatar identifie l'employé ; la couleur du repère horaire identifie le service.-->
<!--        </p>-->
<!--      </div>-->

<!--      <div class="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600">-->
<!--        <LegendItem label="08h00" kind="morning" />-->
<!--        <LegendItem label="10h30" kind="mid" />-->
<!--        <LegendItem label="16h00 / garde" kind="guard" />-->
<!--        <LegendItem label="Repos" kind="rest" />-->
<!--        <LegendItem label="Autre horaire" kind="other" />-->
<!--      </div>-->
<!--    </div>-->

<!--    <section-->
<!--        v-for="(page, pageIndex) in pages"-->
<!--        :key="`${page.from}-${page.to}`"-->
<!--        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"-->
<!--    >-->
<!--      <div class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">-->
<!--        <div>-->
<!--          <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Planning optimisé</p>-->
<!--          <p class="text-sm font-bold text-slate-800">{{ formatRange(page.from, page.to) }}</p>-->
<!--        </div>-->
<!--        <span class="text-xs text-slate-400">Bloc {{ pageIndex + 1 }} · {{ page.months.length }} mois</span>-->
<!--      </div>-->

<!--      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">-->
<!--        <article-->
<!--            v-for="month in page.months"-->
<!--            :key="month.key"-->
<!--            class="overflow-hidden rounded-xl border border-slate-200"-->
<!--        >-->
<!--          <div class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-700">-->
<!--            {{ formatMonthTitle(month) }}-->
<!--          </div>-->

<!--          <div class="grid grid-cols-7 border-b border-slate-100 bg-white text-center text-[9px] font-bold uppercase text-slate-400">-->
<!--            <span v-for="day in DAY_HEADERS" :key="day" class="px-1 py-1.5">{{ day }}</span>-->
<!--          </div>-->

<!--          <div class="grid grid-cols-7 gap-px bg-slate-100">-->
<!--            <div-->
<!--                v-for="(cell, index) in monthCells(month)"-->
<!--                :key="`${month.key}-${index}`"-->
<!--                class="min-h-[76px] bg-white p-1"-->
<!--                :class="cell?.inPeriod === false ? 'opacity-40' : ''"-->
<!--            >-->
<!--              <template v-if="cell">-->
<!--                <div class="mb-1 flex items-center justify-between">-->
<!--                  <span class="text-[9px] font-bold text-slate-500">{{ cell.day }}</span>-->
<!--                  <span v-if="cell.isToday" class="h-1.5 w-1.5 rounded-full bg-blue-500" />-->
<!--                </div>-->

<!--                <div class="space-y-[3px]">-->
<!--                  <div-->
<!--                      v-for="line in cell.lines"-->
<!--                      :key="`${cell.iso}-${line.kind}-${line.label}`"-->
<!--                      class="flex min-w-0 items-start gap-1"-->
<!--                  >-->
<!--                    <span-->
<!--                        class="mt-[3px] w-[18px] flex-none text-[7px] font-extrabold leading-none"-->
<!--                        :class="kindTextClass(line.kind)"-->
<!--                        :title="shiftTitle(line.kind, line.label)"-->
<!--                    >-->
<!--                      {{ line.label }}-->
<!--                    </span>-->

<!--                    <div class="flex min-w-0 flex-wrap gap-[2px]">-->
<!--                      <OptimizedEmployeeAvatar-->
<!--                          v-for="employee in line.employees"-->
<!--                          :key="`${cell.iso}-${line.kind}-${employee.guid}`"-->
<!--                          :code="employee.code"-->
<!--                          :color="employee.employeeColor"-->
<!--                          :title="employeeTitle(employee.code, line.kind, line.label)"-->
<!--                      />-->
<!--                    </div>-->
<!--                  </div>-->
<!--                </div>-->
<!--              </template>-->
<!--            </div>-->
<!--          </div>-->
<!--        </article>-->
<!--      </div>-->

<!--      <div class="mt-4 border-t border-slate-100 pt-3">-->
<!--        <p class="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Légende employés</p>-->
<!--        <div class="flex flex-wrap gap-2">-->
<!--          <span-->
<!--              v-for="employee in employeeLegend"-->
<!--              :key="employee.guid"-->
<!--              class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600"-->
<!--          >-->
<!--            <OptimizedEmployeeAvatar-->
<!--                :code="employee.code"-->
<!--                :color="employee.employeeColor"-->
<!--                :title="employee.name"-->
<!--            />-->
<!--            <span>{{ employee.name }}</span>-->
<!--          </span>-->
<!--        </div>-->
<!--      </div>-->
<!--    </section>-->
<!--  </div>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { computed, defineComponent, h, type PropType } from 'vue'-->
<!--import {-->
<!--  buildEmployeeCodes,-->
<!--  buildOptimizedDays,-->
<!--  formatEmployeeLegendName,-->
<!--  formatMonthTitle,-->
<!--  splitPeriodIntoMonthPages,-->
<!--  type OptimizedMonth,-->
<!--  type OptimizedShiftKind,-->
<!--} from '@/utils/exports/scheduleAssignment.optimized.export'-->
<!--import OptimizedEmployeeAvatar from './OptimizedEmployeeAvatar.vue'-->
<!--import type { SchedulePlanningMember } from './schedulePlanningView.types'-->

<!--const props = defineProps<{-->
<!--  members: SchedulePlanningMember[]-->
<!--  periodFrom: string-->
<!--  periodTo: string-->
<!--}>()-->

<!--const DAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const-->

<!--const LegendItem = defineComponent({-->
<!--  props: {-->
<!--    label: { type: String, required: true },-->
<!--    kind: { type: String as PropType<OptimizedShiftKind>, required: true },-->
<!--  },-->
<!--  setup(componentProps) {-->
<!--    return () => h('span', { class: 'inline-flex items-center gap-1.5' }, [-->
<!--      h('span', { class: `h-1.5 w-3 rounded-sm ${legendDotClass(componentProps.kind)}` }),-->
<!--      h('span', componentProps.label),-->
<!--    ])-->
<!--  },-->
<!--})-->

<!--const codesByGuid = computed(() => buildEmployeeCodes(props.members))-->
<!--const daysByIso = computed(() => buildOptimizedDays(-->
<!--    props.members,-->
<!--    props.periodFrom,-->
<!--    props.periodTo,-->
<!--    codesByGuid.value,-->
<!--))-->
<!--const pages = computed(() => splitPeriodIntoMonthPages(props.periodFrom, props.periodTo))-->

<!--const employeeLegend = computed(() =>-->
<!--    [...props.members]-->
<!--        .map((member) => ({-->
<!--          guid: member.guid,-->
<!--          code: codesByGuid.value.get(member.guid) ?? '—',-->
<!--          name: formatEmployeeLegendName(member),-->
<!--          employeeColor: member.employeeColor,-->
<!--        }))-->
<!--        .sort((a, b) => a.code.localeCompare(b.code, 'fr')),-->
<!--)-->

<!--const employeeByCode = computed(() =>-->
<!--    new Map(employeeLegend.value.map((employee) => [employee.code, employee.name] as const)),-->
<!--)-->

<!--function toIso(year: number, month: number, day: number): string {-->
<!--  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`-->
<!--}-->

<!--function monthCells(month: OptimizedMonth) {-->
<!--  const first = new Date(Date.UTC(month.year, month.month, 1))-->
<!--  const lastDay = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate()-->
<!--  const mondayFirstOffset = (first.getUTCDay() + 6) % 7-->
<!--  const cells: Array<null | {-->
<!--    day: number-->
<!--    iso: string-->
<!--    inPeriod: boolean-->
<!--    isToday: boolean-->
<!--    lines: Array<{-->
<!--      kind: OptimizedShiftKind-->
<!--      label: string-->
<!--      codes: string[]-->
<!--      employees: Array<{ guid: string; code: string; employeeColor: string | null }>-->
<!--    }>-->
<!--  }> = Array.from({ length: mondayFirstOffset }, () => null)-->
<!--  const todayIso = new Date().toISOString().slice(0, 10)-->

<!--  for (let day = 1; day <= lastDay; day++) {-->
<!--    const iso = toIso(month.year, month.month, day)-->
<!--    cells.push({-->
<!--      day,-->
<!--      iso,-->
<!--      inPeriod: iso >= props.periodFrom && iso <= props.periodTo,-->
<!--      isToday: iso === todayIso,-->
<!--      lines: daysByIso.value.get(iso)?.lines ?? [],-->
<!--    })-->
<!--  }-->

<!--  while (cells.length % 7 !== 0) cells.push(null)-->
<!--  return cells-->
<!--}-->

<!--function kindTextClass(kind: OptimizedShiftKind): string {-->
<!--  switch (kind) {-->
<!--    case 'morning': return 'text-blue-700'-->
<!--    case 'mid': return 'text-amber-700'-->
<!--    case 'guard': return 'text-rose-700'-->
<!--    case 'rest': return 'text-slate-500'-->
<!--    default: return 'text-violet-700'-->
<!--  }-->
<!--}-->

<!--function legendDotClass(kind: OptimizedShiftKind): string {-->
<!--  switch (kind) {-->
<!--    case 'morning': return 'bg-blue-500'-->
<!--    case 'mid': return 'bg-amber-500'-->
<!--    case 'guard': return 'bg-rose-500'-->
<!--    case 'rest': return 'bg-slate-400'-->
<!--    default: return 'bg-violet-500'-->
<!--  }-->
<!--}-->

<!--function shiftTitle(kind: OptimizedShiftKind, label: string): string {-->
<!--  switch (kind) {-->
<!--    case 'morning': return 'Prise de service à 08h00'-->
<!--    case 'mid': return 'Prise de service à 10h30'-->
<!--    case 'guard': return 'Garde à partir de 16h00'-->
<!--    case 'rest': return 'Repos planifié'-->
<!--    default: return `Prise de service : ${label}`-->
<!--  }-->
<!--}-->

<!--function employeeTitle(code: string, kind: OptimizedShiftKind, label: string): string {-->
<!--  const name = employeeByCode.value.get(code) ?? code-->
<!--  return `${name} · ${shiftTitle(kind, label)}`-->
<!--}-->

<!--function formatDate(iso: string): string {-->
<!--  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', {-->
<!--    day: '2-digit', month: '2-digit', year: 'numeric',-->
<!--  })-->
<!--}-->

<!--function formatRange(from: string, to: string): string {-->
<!--  return `${formatDate(from)} → ${formatDate(to)}`-->
<!--}-->
<!--</script>-->
