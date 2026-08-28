<script setup lang="ts">
import { computed, ref } from 'vue';

import type { AttendanceDailyOverview, BusinessDate } from '../types/attendance-statistics.types.js';
import {
  buildAttendanceDailyChartModel,
  buildAttendanceDailyTrendInteraction,
  type AttendanceDailyTrendInteraction,
  type AttendanceDailyTrendPoint,
  type AttendanceDailyTrendSeries,
} from '../utils/attendance-visualizations.js';
import { buildAttendanceDateNavigationWindow } from '../utils/attendance-volume.js';
import { formatPercentage } from '../utils/percentage.js';

interface Props {
  daily: readonly AttendanceDailyOverview[];
  selectedDate: BusinessDate | null;
}

interface TooltipState {
  point: AttendanceDailyTrendPoint;
  series: AttendanceDailyTrendSeries;
  value: number;
  left: number;
  top: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  select: [date: BusinessDate];
  explore: [interaction: AttendanceDailyTrendInteraction];
}>();

const chart = computed(() => buildAttendanceDailyChartModel(props.daily));
const tooltip = ref<TooltipState | null>(null);
const visibleNavigationPoints = computed(() =>
  buildAttendanceDateNavigationWindow({
    points: chart.value.points,
    selectedDate: props.selectedDate,
    maxVisible: 15,
  }),
);

function strokeClass(tone: 'slate' | 'indigo' | 'rose' | 'amber'): string {
  return {
    slate: 'stroke-slate-500',
    indigo: 'stroke-indigo-600',
    rose: 'stroke-rose-500',
    amber: 'stroke-amber-500',
  }[tone];
}

function fillClass(tone: 'slate' | 'indigo' | 'rose' | 'amber'): string {
  return {
    slate: 'fill-slate-500',
    indigo: 'fill-indigo-600',
    rose: 'fill-rose-500',
    amber: 'fill-amber-500',
  }[tone];
}

function selectFromNativeInput(event: Event): void {
  emit('select', (event.target as HTMLSelectElement).value as BusinessDate);
}

function getFullPoint(date: BusinessDate): AttendanceDailyTrendPoint | null {
  return chart.value.points.find((point) => point.date === date) ?? null;
}

function showTooltip(
  series: AttendanceDailyTrendSeries,
  value: AttendanceDailyTrendSeries['values'][number],
  event: MouseEvent | FocusEvent,
): void {
  const point = getFullPoint(value.date as BusinessDate);
  if (!point) return;

  const position = getTooltipPosition(event);
  tooltip.value = {
    point,
    series,
    value: value.value,
    left: position.left,
    top: position.top,
  };
}

function moveTooltip(event: MouseEvent): void {
  if (!tooltip.value) return;
  const position = getTooltipPosition(event);
  tooltip.value = { ...tooltip.value, ...position };
}

function hideTooltip(): void {
  tooltip.value = null;
}

function activatePoint(seriesId: AttendanceDailyTrendSeries['id'], date: BusinessDate): void {
  emit('select', date);
  emit('explore', buildAttendanceDailyTrendInteraction(date, seriesId));
}

function getTooltipPosition(event: MouseEvent | FocusEvent): { left: number; top: number } {
  let x: number;
  let y: number;

  if ('clientX' in event && event.clientX > 0) {
    x = event.clientX + 14;
    y = event.clientY + 14;
  } else {
    const target = event.currentTarget as Element | null;
    const rect = target?.getBoundingClientRect();
    x = (rect?.right ?? 24) + 12;
    y = (rect?.top ?? 24) + 12;
  }

  if (typeof window !== 'undefined') {
    x = Math.min(x, Math.max(12, window.innerWidth - 318));
    y = Math.min(y, Math.max(12, window.innerHeight - 278));
  }

  return { left: Math.max(12, x), top: Math.max(12, y) };
}

function interactionHint(seriesId: AttendanceDailyTrendSeries['id'], date: BusinessDate): string {
  return buildAttendanceDailyTrendInteraction(date, seriesId).label;
}
</script>

<template>
  <section
    class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    aria-labelledby="attendance-trend-title"
  >
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Évolution quotidienne</p>
        <h2 id="attendance-trend-title" class="mt-1 text-lg font-bold sm:font-semibold text-slate-950 sm:text-xl">
          Journées attendues et statuts observés
        </h2>
        <p class="mt-1 text-sm leading-6 font-light text-slate-600">
          Survolez ou focalisez un point pour comprendre la journée. Cliquez sur une absence ou un retard pour afficher directement les employés concernés ce jour-là.
        </p>
      </div>

      <div class="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-600" aria-label="Légende du graphique">
        <span v-for="series in chart.series" :key="series.id" class="inline-flex items-center gap-2">
          <span
            class="h-0.5 w-5"
            :class="{
              'bg-slate-500': series.tone === 'slate',
              'bg-indigo-600': series.tone === 'indigo',
              'bg-rose-500': series.tone === 'rose',
              'bg-amber-500': series.tone === 'amber',
            }"
            aria-hidden="true"
          />
          {{ series.label }}
        </span>
      </div>
    </div>

    <div v-if="chart.points.length === 0" class="mt-6 rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
      Aucune donnée quotidienne disponible sur cette période.
    </div>

    <template v-else>
      <div class="mt-6 overscroll-x-contain overflow-x-auto pb-2" tabindex="0" aria-label="Graphique défilable horizontalement">
        <svg
          :viewBox="`0 0 ${chart.width} ${chart.height}`"
          :width="chart.width"
          :height="chart.height"
          class="block max-w-none"
          role="img"
          aria-labelledby="attendance-trend-svg-title attendance-trend-svg-description"
        >
          <title id="attendance-trend-svg-title">Évolution quotidienne des statistiques de présence</title>
          <desc id="attendance-trend-svg-description">
            Séries des journées attendues, suivies, absentes et en retard pour chaque date de la période.
            Chaque point peut être focalisé au clavier et activé pour explorer la journée. Un tableau de données accessible est disponible après le graphique.
          </desc>

          <g v-for="tick in chart.yTicks" :key="tick.value">
            <line
              :x1="chart.plotLeft"
              :x2="chart.plotRight"
              :y1="tick.y"
              :y2="tick.y"
              class="stroke-slate-200"
              stroke-width="1"
            />
            <text :x="chart.plotLeft - 10" :y="tick.y + 4" text-anchor="end" class="fill-slate-500 text-[11px]">
              {{ tick.value }}
            </text>
          </g>

          <line
            :x1="chart.plotLeft"
            :x2="chart.plotRight"
            :y1="chart.plotBottom"
            :y2="chart.plotBottom"
            class="stroke-slate-300"
            stroke-width="1"
          />

          <polyline
            v-for="series in chart.series"
            :key="series.id"
            :points="series.points"
            fill="none"
            :class="strokeClass(series.tone)"
            :stroke-dasharray="series.dashed ? '6 5' : undefined"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.4"
          />

          <g v-for="series in chart.series" :key="`${series.id}-points`">
            <g
              v-for="point in series.values"
              :key="`${series.id}-${point.date}`"
              role="button"
              tabindex="0"
              class="cursor-pointer outline-none"
              :aria-label="`${series.label}, ${point.date}, ${point.value}. ${interactionHint(series.id, point.date as BusinessDate)}`"
              @mouseenter="showTooltip(series, point, $event)"
              @mousemove="moveTooltip"
              @mouseleave="hideTooltip"
              @focus="showTooltip(series, point, $event)"
              @blur="hideTooltip"
              @click="activatePoint(series.id, point.date as BusinessDate)"
              @keydown.enter.prevent="activatePoint(series.id, point.date as BusinessDate)"
              @keydown.space.prevent="activatePoint(series.id, point.date as BusinessDate)"
            >
              <circle :cx="point.x" :cy="point.y" r="10" fill="transparent" stroke="transparent" />
              <circle
                :cx="point.x"
                :cy="point.y"
                :r="point.date === selectedDate ? 5 : 3.1"
                :class="fillClass(series.tone)"
                class="transition-[r] duration-150 group-focus-visible:stroke-slate-950"
                :stroke="point.date === selectedDate ? 'white' : 'transparent'"
                :stroke-width="point.date === selectedDate ? 2 : 0"
                aria-hidden="true"
              />
            </g>
          </g>

          <g v-for="label in chart.xLabels" :key="label.date">
            <line
              :x1="label.x"
              :x2="label.x"
              :y1="chart.plotBottom"
              :y2="chart.plotBottom + 5"
              class="stroke-slate-300"
            />
            <text
              :x="label.x"
              :y="chart.plotBottom + 20"
              text-anchor="middle"
              class="fill-slate-500 text-[10px]"
            >
              {{ label.label }}
            </text>
          </g>
        </svg>
      </div>

      <div
        v-if="tooltip"
        role="tooltip"
        class="pointer-events-none fixed z-[80] w-[300px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
        :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">{{ tooltip.point.dateLabel }}</p>
            <p class="mt-1 text-sm font-bold text-slate-950">{{ tooltip.series.label }}</p>
          </div>
          <span class="rounded-full bg-slate-950 px-2.5 py-1 text-sm font-bold tabular-nums text-white">{{ tooltip.value }}</span>
        </div>

        <dl class="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div class="rounded-lg bg-slate-50 p-2">
            <dt class="text-slate-500">Attendues</dt>
            <dd class="mt-0.5 font-bold tabular-nums text-slate-900">{{ tooltip.point.expected }}</dd>
          </div>
          <div class="rounded-lg bg-indigo-50 p-2">
            <dt class="text-indigo-600">Suivies</dt>
            <dd class="mt-0.5 font-bold tabular-nums text-indigo-950">{{ tooltip.point.attended }}</dd>
          </div>
          <div class="rounded-lg bg-rose-50 p-2">
            <dt class="text-rose-600">Absences</dt>
            <dd class="mt-0.5 font-bold tabular-nums text-rose-950">{{ tooltip.point.absent }}</dd>
          </div>
          <div class="rounded-lg bg-amber-50 p-2">
            <dt class="text-amber-700">Retards</dt>
            <dd class="mt-0.5 font-bold tabular-nums text-amber-950">{{ tooltip.point.late }}</dd>
          </div>
          <div class="rounded-lg bg-sky-50 p-2">
            <dt class="text-sky-700">Présence</dt>
            <dd class="mt-0.5 font-bold text-sky-950">{{ formatPercentage(tooltip.point.attendanceRate) }}</dd>
          </div>
          <div class="rounded-lg bg-orange-50 p-2">
            <dt class="text-orange-700">À examiner</dt>
            <dd class="mt-0.5 font-bold tabular-nums text-orange-950">{{ tooltip.point.issues }}</dd>
          </div>
        </dl>

        <p class="mt-3 border-t border-slate-100 pt-3 text-xs font-semibold leading-5 text-slate-600">
          {{ interactionHint(tooltip.series.id, tooltip.point.date) }} →
        </p>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-[minmax(220px,320px)_1fr] md:items-end">
        <label class="block">
          <span class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Journée détaillée
          </span>
          <select
            :value="selectedDate ?? ''"
            class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-300"
            @change="selectFromNativeInput"
          >
            <option v-for="point in chart.points" :key="point.date" :value="point.date">
              {{ point.dateLabel }} — {{ point.date }}
            </option>
          </select>
        </label>

        <div class="flex gap-2 overflow-x-auto pb-1" aria-label="Dates proches de la journée sélectionnée">
          <button
            v-for="point in visibleNavigationPoints"
            :key="point.date"
            type="button"
            class="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            :class="point.date === selectedDate
              ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700'"
            :aria-pressed="point.date === selectedDate"
            @click="emit('select', point.date)"
          >
            {{ point.dateLabel }}
          </button>
        </div>
      </div>

      <details class="mt-5 rounded-lg border border-slate-200 bg-slate-50/70">
        <summary class="cursor-pointer px-4 py-3 text-sm font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          Consulter les données du graphique sous forme de tableau
        </summary>
        <div class="overflow-x-auto border-t border-slate-200">
          <table class="min-w-full text-sm">
            <caption class="sr-only">Données quotidiennes utilisées dans le graphique d’évolution</caption>
            <thead class="bg-white text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" class="px-3 py-3 text-left">Date</th>
                <th scope="col" class="px-3 py-3 text-right">Attendues</th>
                <th scope="col" class="px-3 py-3 text-right">Suivies</th>
                <th scope="col" class="px-3 py-3 text-right">Absences</th>
                <th scope="col" class="px-3 py-3 text-right">Retards</th>
                <th scope="col" class="px-3 py-3 text-right">Anomalies</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="point in chart.points" :key="point.date" class="border-t border-slate-200">
                <th scope="row" class="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-800">{{ point.date }}</th>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ point.expected }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ point.attended }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ point.absent }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ point.late }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ point.issues }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </template>
  </section>
</template>
