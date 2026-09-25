<script setup lang="ts">
import { computed } from 'vue';

import type {
  AttendanceDecisionKpiSegment,
  AttendanceDecisionKpiViewModel,
} from '../utils/attendance-kpis.js';
import { formatPercentage } from '../utils/percentage.js';

interface Props {
  card: AttendanceDecisionKpiViewModel;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  detail: [payload: { id: AttendanceDecisionKpiViewModel['id']; segment: AttendanceDecisionKpiSegment }];
}>();

const primaryValue = computed(() => formatPercentage(props.card.primaryRate));
const secondaryValue = computed(() => formatPercentage(props.card.secondaryRate));
const maxTrendTotal = computed(() => Math.max(1, ...props.card.trend.map((item) => item.primary + item.secondary)));

const palette = computed(() => {
  if (props.card.id === 'attendance_rate') {
    return {
      primaryFill: 'fill-blue-600',
      secondaryFill: 'fill-red-500',
      primaryBar: 'bg-blue-600',
      secondaryBar: 'bg-red-500',
      attention: 'bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-500',
    } as const;
  }

  return {
    primaryFill: 'fill-emerald-500',
    secondaryFill: 'fill-orange-400',
    primaryBar: 'bg-emerald-500',
    secondaryBar: 'bg-orange-400',
    attention: 'bg-orange-50 text-orange-700 hover:bg-orange-100 focus-visible:ring-orange-500',
  } as const;
});

function trendPrimaryLabel(value: number): string {
  if (props.card.id === 'attendance_rate') {
    return `${value} rotation${value > 1 ? 's' : ''} couverte${value > 1 ? 's' : ''}`;
  }

  return `${value} rotation${value > 1 ? 's' : ''} à l’heure`;
}

function trendSecondaryLabel(value: number): string {
  if (props.card.id === 'attendance_rate') {
    return `${value} rotation${value > 1 ? 's' : ''} non couverte${value > 1 ? 's' : ''}`;
  }

  return `${value} retard${value > 1 ? 's' : ''}`;
}

function pointOnCircle(angle: number, radius = 52): { x: number; y: number } {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: 60 + radius * Math.cos(radians), y: 60 + radius * Math.sin(radians) };
}

function sectorPath(startAngle: number, endAngle: number): string {
  if (endAngle - startAngle >= 359.999) {
    return 'M 60 8 A 52 52 0 1 1 59.999 8 Z';
  }

  const start = pointOnCircle(startAngle);
  const end = pointOnCircle(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M 60 60 L ${start.x.toFixed(3)} ${start.y.toFixed(3)} A 52 52 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z`;
}

const primaryAngle = computed(() => Math.max(0, Math.min(360, (props.card.primaryRate ?? 0) * 3.6)));
const primaryPath = computed(() => sectorPath(0, primaryAngle.value));
const secondaryPath = computed(() => sectorPath(primaryAngle.value, 360));

function labelRadius(angleSize: number): number {
  // Un secteur étroit bénéficie d'un libellé légèrement plus proche du centre.
  return angleSize < 72 ? 24 : 31;
}

const primaryLabelPoint = computed(() =>
  pointOnCircle(Math.max(1, primaryAngle.value / 2), labelRadius(primaryAngle.value)),
);
const secondaryAngleSize = computed(() => Math.max(0, 360 - primaryAngle.value));
const secondaryLabelPoint = computed(() =>
  pointOnCircle(
    primaryAngle.value + Math.max(1, secondaryAngleSize.value / 2),
    labelRadius(secondaryAngleSize.value),
  ),
);

const primaryCompactLabel = computed(() => primaryAngle.value < 72);
const secondaryCompactLabel = computed(() => secondaryAngleSize.value < 72);

function trendHeight(value: number): string {
  return `${Math.max(value > 0 ? 7 : 0, Math.round((value / maxTrendTotal.value) * 42))}px`;
}

function openDetail(segment: AttendanceDecisionKpiSegment): void {
  emit('detail', { id: props.card.id, segment });
}
</script>

<template>
  <article class="flex min-h-[455px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">{{ card.eyebrow }}</p>
        <h3 class="mt-1.5 text-xl font-extrabold tracking-normal text-slate-950">{{ card.title }}</h3>
      </div>
      <p class="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
        Base&nbsp;: {{ card.denominatorCount }}
      </p>
    </div>

    <div class="mt-4 grid flex-1 items-center gap-5 lg:grid-cols-[minmax(220px,0.95fr)_minmax(220px,1.05fr)]">
      <div class="relative mx-auto aspect-square w-full max-w-[280px]">
        <svg
          viewBox="0 0 120 120"
          class="h-full w-full drop-shadow-sm"
          role="img"
          :aria-label="`${card.title}. ${card.primaryLabel} ${primaryValue}, ${card.secondaryLabel} ${secondaryValue}.`"
        >
          <path
            :d="secondaryPath"
            :class="['cursor-pointer transition hover:opacity-90 focus:outline-none', palette.secondaryFill]"
            tabindex="0"
            role="button"
            :aria-label="`${card.secondaryLabel} ${secondaryValue}. ${card.secondaryCount} occurrence(s). Voir le détail.`"
            @click="openDetail('secondary')"
            @keydown.enter.prevent="openDetail('secondary')"
            @keydown.space.prevent="openDetail('secondary')"
          />
          <path
            :d="primaryPath"
            :class="['cursor-pointer transition hover:opacity-90 focus:outline-none', palette.primaryFill]"
            tabindex="0"
            role="button"
            :aria-label="`${card.primaryLabel} ${primaryValue}. ${card.primaryCount} occurrence(s). Voir le détail.`"
            @click="openDetail('primary')"
            @keydown.enter.prevent="openDetail('primary')"
            @keydown.space.prevent="openDetail('primary')"
          />
          <circle cx="60" cy="60" r="52" fill="none" stroke="white" stroke-width="1.2" pointer-events="none" />
        </svg>

        <button
          type="button"
          class="absolute -translate-x-1/2 -translate-y-1/2 text-center text-white drop-shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          :class="primaryCompactLabel ? 'w-[72px]' : 'w-[100px]'"
          :style="{ left: `${(primaryLabelPoint.x / 120) * 100}%`, top: `${(primaryLabelPoint.y / 120) * 100}%` }"
          @click="openDetail('primary')"
        >
          <span :class="['block font-bold leading-tight', primaryCompactLabel ? 'text-[10px]' : 'text-xs']">{{ card.primaryLabel }}</span>
          <span :class="['mt-0.5 block font-extrabold leading-none', primaryCompactLabel ? 'text-base' : 'text-2xl']">{{ primaryValue }}</span>
          <span :class="['mt-1 block font-semibold leading-none opacity-95', primaryCompactLabel ? 'text-[9px]' : 'text-[11px]']">
            {{ card.primaryCount }} rotation{{ card.primaryCount === 1 ? '' : 's' }}
          </span>
        </button>

        <button
          type="button"
          class="absolute -translate-x-1/2 -translate-y-1/2 text-center text-white drop-shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          :class="secondaryCompactLabel ? 'w-[72px]' : 'w-[100px]'"
          :style="{ left: `${(secondaryLabelPoint.x / 120) * 100}%`, top: `${(secondaryLabelPoint.y / 120) * 100}%` }"
          @click="openDetail('secondary')"
        >
          <span :class="['block font-bold leading-tight', secondaryCompactLabel ? 'text-[10px]' : 'text-xs']">{{ card.secondaryLabel }}</span>
          <span :class="['mt-0.5 block font-extrabold leading-none', secondaryCompactLabel ? 'text-base' : 'text-2xl']">{{ secondaryValue }}</span>
          <span :class="['mt-1 block font-semibold leading-none opacity-95', secondaryCompactLabel ? 'text-[9px]' : 'text-[11px]']">
            {{ card.secondaryCount }} rotation{{ card.secondaryCount === 1 ? '' : 's' }}
          </span>
        </button>
      </div>

      <div class="min-w-0">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-slate-800">Évolution de la période</p>
            <p class="mt-0.5 text-xs text-slate-500">Chaque bande représente une journée analysée.</p>
          </div>
          <button
            type="button"
            class="shrink-0 text-xs font-extrabold text-indigo-700 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            @click="openDetail('primary')"
          >
            Détail →
          </button>
        </div>

        <div v-if="card.trend.length > 0" class="mt-4">
          <div class="flex h-12 items-end gap-1">
            <div
              v-for="point in card.trend"
              :key="point.date"
              class="group relative flex min-w-[5px] flex-1 flex-col justify-end overflow-hidden rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              tabindex="0"
              :aria-label="`${point.date} : ${trendPrimaryLabel(point.primary)}, ${trendSecondaryLabel(point.secondary)}.`"
            >
              <div
                class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden min-w-max -translate-x-1/2 rounded-lg bg-slate-950 px-2.5 py-2 text-[10px] font-semibold leading-4 text-white shadow-lg group-hover:block group-focus:block"
                role="tooltip"
              >
                <span class="block text-slate-300">{{ point.date }}</span>
                <span class="block">{{ trendPrimaryLabel(point.primary) }}</span>
                <span class="block">{{ trendSecondaryLabel(point.secondary) }}</span>
              </div>
              <span class="block" :class="palette.secondaryBar" :style="{ height: trendHeight(point.secondary) }" />
              <span class="block" :class="palette.primaryBar" :style="{ height: trendHeight(point.primary) }" />
            </div>
          </div>
          <div class="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>{{ card.trend[0]?.date }}</span>
            <span>{{ card.trend[card.trend.length - 1]?.date }}</span>
          </div>
        </div>

        <p class="mt-4 text-xs leading-5 text-slate-500">
          Dénominateur : {{ card.denominatorCount }} {{ card.denominatorLabel }}.
        </p>

        <button
          type="button"
          :class="['mt-4 w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2', palette.attention]"
          @click="openDetail('secondary')"
        >
          {{ card.attention ?? 'Aucun élément particulier à examiner.' }}
        </button>
      </div>
    </div>
  </article>
</template>
