<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceDailyOverview, BusinessDate } from '../types/attendance-statistics.types.js';
import { buildAttendanceDailyChartModel } from '../utils/attendance-visualizations.js';
import { buildAttendanceDateNavigationWindow } from '../utils/attendance-volume.js';

interface Props {
  daily: readonly AttendanceDailyOverview[];
  selectedDate: BusinessDate | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ select: [date: BusinessDate] }>();
const chart = computed(() => buildAttendanceDailyChartModel(props.daily));
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
</script>

<template>
  <section
    class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    aria-labelledby="attendance-trend-title"
  >
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Évolution quotidienne</p>
        <h2 id="attendance-trend-title" class="mt-2 text-lg font-bold text-slate-950 sm:text-xl">
          Journées attendues et statuts observés
        </h2>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Chaque point correspond exactement au résumé quotidien retourné par l’API.
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
            Un tableau de données accessible est disponible après le graphique.
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
            <circle
              v-for="point in series.values"
              :key="`${series.id}-${point.date}`"
              :cx="point.x"
              :cy="point.y"
              :r="point.date === selectedDate ? 4.5 : 2.8"
              :class="fillClass(series.tone)"
            >
              <title>{{ series.label }} — {{ point.date }} : {{ point.value }}</title>
            </circle>
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

      <div class="mt-4 grid gap-3 md:grid-cols-[minmax(220px,320px)_1fr] md:items-end">
        <label class="block">
          <span class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Journée détaillée
          </span>
          <select
            :value="selectedDate ?? ''"
            class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500"
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

      <details class="mt-5 rounded-xl border border-slate-200 bg-slate-50/70">
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
